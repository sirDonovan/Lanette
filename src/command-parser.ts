import fs = require('fs');
import path = require('path');
import { BattleEliminationPage } from './html-pages/activity-pages/battle-elimination';
import { CardHighLowPage } from './html-pages/activity-pages/card-high-low';
import { CardMatchingPage } from './html-pages/activity-pages/card-matching';
import { GameHostControlPanel } from './html-pages/game-host-control-panel';

import type { HtmlPageBase } from './html-pages/html-page-base';
import type { Room } from "./rooms";
import type { Player } from "./room-activity";
import type {
	BaseCommandDefinitions, CommandDefinitions, CommandErrorArray, ICommandFile, ICommandGuide, IHtmlPageFile, LoadedCommands
} from "./types/command-parser";
import type { User } from "./users";
import { ActivityPageBase } from './html-pages/activity-pages/activity-page-base';

interface IGameHtmlPages {
	cardMatching: typeof CardMatchingPage;
	cardHighLow: typeof CardHighLowPage;
	battleElimination: typeof BattleEliminationPage;
	gameHostControlPanel: typeof GameHostControlPanel;
}

export class CommandContext {
	runningMultipleTargets: boolean | null = null;

	readonly originalCommand: string;
	readonly pm: boolean;
	readonly room: Room | User;
	readonly target: string;
	readonly timestamp: number;
	readonly user: User;

	constructor(originalCommand: string, target: string, room: Room | User, user: User, timestamp: number) {
		this.originalCommand = originalCommand;
		this.target = target;
		this.room = room;
		this.user = user;
		this.timestamp = timestamp;

		this.pm = room === user;
	}

	destroy(): void {
		Tools.unrefProperties(this);
	}

	say(message: string, dontPrepare?: boolean, dontCheckFilter?: boolean): void {
		this.room.say(message, {dontPrepare, dontCheckFilter});
	}

	sayCode(message: string): void {
		this.room.sayCode(message);
	}

	sayHtml(html: string, pmHtmlRoom: Room): void {
		if (this.isPm(this.room)) {
			pmHtmlRoom.pmHtml(this.user, html);
		} else {
			this.room.sayHtml(html);
		}
	}

	sayUhtml(uhtmlName: string, html: string, pmHtmlRoom: Room): void {
		if (this.isPm(this.room)) {
			pmHtmlRoom.pmUhtml(this.user, uhtmlName, html);
		} else {
			this.room.sayUhtml(uhtmlName, html);
		}
	}

	sayUhtmlChange(uhtmlName: string, html: string, pmHtmlRoom: Room): void {
		if (this.isPm(this.room)) {
			pmHtmlRoom.pmUhtmlChange(this.user, uhtmlName, html);
		} else {
			this.room.sayUhtmlChange(uhtmlName, html);
		}
	}

	sayError(error: CommandErrorArray): void {
		this.say(global.CommandParser.getErrorText(error));
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	run(newCommand?: string, newTarget?: string): any {
		let command = this.originalCommand;
		if (newCommand) {
			command = Tools.toId(newCommand);
			if (!(command in Commands)) throw new Error(this.originalCommand + " ran non-existent command '" + newCommand + '"');
		}
		if (Commands[command].developerOnly && !this.user.isDeveloper() && this.user !== Users.self) return;
		if (this.pm) {
			if (Commands[command].chatOnly) return;
		} else {
			if (Commands[command].pmOnly) return;
		}
		const target = newTarget !== undefined ? newTarget : this.target;

		return Commands[command].command.call(this, target, this.room, this.user, command, this.timestamp);
	}

	runMultipleTargets(delimiter: string, command: string): void {
		if (!delimiter) return;
		const parts = this.target.split(delimiter);
		const lastMultipleTarget = parts.length - 1;
		this.runningMultipleTargets = true;
		for (let i = 0; i < parts.length; i++) {
			if (i === lastMultipleTarget) this.runningMultipleTargets = false;
			this.run(command, parts[i].trim());
		}
	}

	isPm(room: Room | User): room is User {
		return this.pm;
	}

	sanitizeResponse(response: string, allowedCommands?: string[]): string {
		response = response.trim();

		const serverCommand = response.startsWith('!');
		while (response.startsWith('/') || response.startsWith('!')) {
			response = response.substr(1).trim();
		}

		if (serverCommand && allowedCommands && allowedCommands.includes(Tools.toId(response.split(" ")[0]))) {
			return '!' + response;
		}
		return response;
	}
}

export class CommandParser {
	private activityHtmlPages: Dict<Map<Player, ActivityPageBase>> = {};
	private commandGuides: Dict<Dict<ICommandGuide>> = {};
	private commandModules: ICommandFile[] = [];
	private htmlPages: Dict<Dict<HtmlPageBase>> = {};
	private htmlPageModules: Dict<IHtmlPageFile> = {};
	private htmlPagesDir: string = path.join(Tools.srcBuildFolder, 'html-pages');
	private readonly gameHtmlPages: IGameHtmlPages = {
		cardMatching: CardMatchingPage,
		cardHighLow: CardHighLowPage,
		battleElimination: BattleEliminationPage,
		gameHostControlPanel: GameHostControlPanel,
	};

	private commandsDir: string;
	private privateCommandsDir: string;
	private privateHtmlPagesDir: string;

	constructor() {
		this.commandsDir = path.join(Tools.srcBuildFolder, 'commands');
		this.privateCommandsDir = path.join(this.commandsDir, 'private');
		this.privateHtmlPagesDir = path.join(this.htmlPagesDir, 'private');
	}

	getGameHtmlPages(): IGameHtmlPages {
		return this.gameHtmlPages;
	}

	loadCommandDefinitions<ThisContext, ReturnType>(definitions: CommandDefinitions<ThisContext, ReturnType>):
		LoadedCommands<ThisContext, ReturnType> {
		const dict: LoadedCommands<ThisContext, ReturnType> = {};
		const allAliases: LoadedCommands<ThisContext, ReturnType> = {};
		for (const i in definitions) {
			const commandId = Tools.toId(i);
			if (commandId in dict) throw new Error("Command '" + i + "' is defined in more than 1 location");

			const command = Tools.deepClone(definitions[i]);
			if (command.chatOnly && command.pmOnly) throw new Error("Command '" + i + "' cannot be both chat-only and pm-only");
			if (command.chatOnly && command.pmGameCommand) {
				throw new Error("Command '" + i + "' cannot be both chat-only and a pm game command");
			}
			if (command.aliases) {
				const aliases = command.aliases.slice();
				delete command.aliases;
				for (const alias of aliases) {
					const aliasId = Tools.toId(alias);
					if (aliasId in dict) throw new Error("Command " + i + "'s alias '" + alias + "' is already a command");
					if (aliasId in allAliases) throw new Error("Command " + i + "'s alias '" + alias + "' is an alias for another command");
					allAliases[aliasId] = command;
				}
			}

			dict[commandId] = command;
		}

		for (const i in allAliases) {
			dict[i] = allAliases[i];
		}

		return dict;
	}

	loadBaseCommands(): void {
		const baseCommands: BaseCommandDefinitions = {};

		this.loadCommandsDirectory(this.commandsDir, baseCommands);
		this.loadCommandsDirectory(this.privateCommandsDir, baseCommands, true);

		this.loadHtmlPagesDirectory(this.htmlPagesDir, baseCommands);
		this.loadHtmlPagesDirectory(this.privateHtmlPagesDir, baseCommands, true);

		global.Commands = this.loadCommandDefinitions(baseCommands);
		global.BaseCommands = Tools.deepClone(global.Commands);
	}

	getCommandGuide(category: string): Dict<ICommandGuide> | undefined {
		return this.commandGuides[category];
	}

	isCommandMessage(message: string): boolean {
		return Config.commandCharacter ? message.startsWith(Config.commandCharacter) : false;
	}

	/**Returns `true` if a command was detected and ran successfully */
	parse(room: Room | User, user: User, message: string, timestamp: number): boolean {
		if (user.locked || !this.isCommandMessage(message)) return false;

		message = message.substr(1);
		let command: string;
		let target: string;
		const spaceIndex = message.indexOf(' ');
		if (spaceIndex === -1) {
			command = message;
			target = '';
		} else {
			command = message.substr(0, spaceIndex);
			target = message.substr(spaceIndex + 1).trim();
		}

		command = Tools.toId(command);
		if (!(command in Commands)) return false;

		if (Config.roomIgnoredCommands && room.id in Config.roomIgnoredCommands &&
			Config.roomIgnoredCommands[room.id].includes(command)) return false;

		let commandContext: CommandContext | undefined;
		let result = true;
		try {
			commandContext = new CommandContext(command, target, room, user, timestamp);
			commandContext.run();
		} catch (e) {
			console.log(e);
			Tools.logException(e as NodeJS.ErrnoException, "Crash in command: " + Config.commandCharacter + command + " " + target +
				" (room = " + room.id + "; " + "user = " + user.id + ")");
			result = false;
		}

		if (commandContext) commandContext.destroy();

		return result;
	}

	onRenameUser(user: User, oldId: string): void {
		for (const i in this.htmlPages) {
			if (oldId in this.htmlPages[i]) {
				this.htmlPages[i][oldId].onRenameUser(user, oldId);
			}
		}
	}

	onDestroyUser(id: string): void {
		for (const i in this.htmlPages) {
			if (id in this.htmlPages[i]) {
				this.htmlPages[i][id].destroy();
			}
		}

		for (const pageId in this.activityHtmlPages) {
			this.activityHtmlPages[pageId].forEach((page, player) => {
				if (player.id === id) page.onUserLeaveRoom();
			})
		}
	}

	onCreateActivityPage(page: ActivityPageBase, player: Player): void {
		if (!(page.pageId in this.activityHtmlPages)) this.activityHtmlPages[page.pageId] = new Map();
		if (!this.activityHtmlPages[page.pageId].has(player)) {
			this.activityHtmlPages[page.pageId].set(player, page);
		}
	}

	onDestroyPlayer(player: Player): void {
		const pageIds = Object.keys(this.activityHtmlPages);
		for (const pageId of pageIds) {
			const page = this.activityHtmlPages[pageId].get(player);
			if (page) {
				// the page may be destroyed already by onDestroyUser or the activity
				if (!page.destroyed) page.destroy();

				this.activityHtmlPages[pageId].delete(player);
				if (!this.activityHtmlPages[pageId].size) delete this.activityHtmlPages[pageId];
			}
		}
	}

	getErrorText(error: CommandErrorArray): string {
		if (error[0] === 'invalidBotRoom') {
			if (error[1]) return "'" + error[1].trim() + "' is not one of " + Users.self.name + "'s rooms.";
			return "You must specify one of " + Users.self.name + "'s rooms.";
		} else if (error[0] === 'invalidAbility') {
			if (error[1]) return "'" + error[1].trim() + "' is not a valid ability.";
			return "You must specify a valid ability.";
		} else if (error[0] === 'invalidFormat') {
			if (error[1]) return "'" + error[1].trim() + "' is not a valid format.";
			return "You must specify a valid format.";
		} else if (error[0] === 'invalidGameFormat') {
			if (error[1]) return "'" + error[1].trim() + "' is not a valid game format.";
			return "You must specify a valid game format.";
		} else if (error[0] === 'invalidItem') {
			if (error[1]) return "'" + error[1].trim() + "' is not a valid item.";
			return "You must specify a valid item.";
		} else if (error[0] === 'invalidMove') {
			if (error[1]) return "'" + error[1].trim() + "' is not a valid move.";
			return "You must specify a valid move.";
		} else if (error[0] === 'invalidPokemon') {
			if (error[1]) return "'" + error[1].trim() + "' is not a valid Pokemon.";
			return "You must specify a valid Pokemon.";
		} else if (error[0] === 'invalidRule') {
			if (error[1]) return "'" + error[1].trim() + "' is not a valid rule.";
			return "You must specify a valid rule.";
		} else if (error[0] === 'invalidType') {
			if (error[1]) return "'" + error[1].trim() + "' is not a valid type.";
			return "You must specify a valid type.";
		} else if (error[0] === 'invalidEggGroup') {
			if (error[1]) return "'" + error[1].trim() + "' is not a valid egg group.";
			return "You must specify a valid type.";
		} else if (error[0] === 'invalidTournamentFormat') {
			if (error[1]) return "'" + error[1].trim() + "' is not a valid tournament format.";
			return "You must specify a valid tournament format.";
		} else if (error[0] === 'invalidUserHostedGameFormat') {
			if (error[1]) return "'" + error[1].trim() + "' is not a valid user-hosted game format.";
			return "You must specify a valid user-hosted game format.";
		} else if (error[0] === 'invalidGameOption') {
			return "'" + error[1].trim() + "' is not a valid game variant or option.";
		} else if (error[0] === 'tooManyGameModes') {
			return "You must specify only 1 game mode.";
		} else if (error[0] === 'tooManyGameVariants') {
			return "You must specify only 1 game variant.";
		} else if (error[0] === 'emptyUserHostedGameQueue') {
			return "The host queue is empty.";
		} else if (error[0] === 'noPmHtmlRoom') {
			return "You must be in " + error[1].trim() + " to use this command in PMs.";
		} else if (error[0] === 'noBotRankRoom') {
			return "You must be in a room where " + Users.self.name + " is Bot rank to use this command.";
		} else if (error[0] === 'missingBotRankForFeatures') {
			return Users.self.name + " requires Bot rank (*) to use " + error[1].trim() + " features.";
		} else if (error[0] === 'disabledTournamentFeatures') {
			return "Tournament features are not enabled for " + error[1].trim() + ".";
		} else if (error[0] === 'disabledGameFeatures') {
			return "Scripted game features are not enabled for " + error[1].trim() + ".";
		} else if (error[0] === 'disabledTournamentGameFeatures') {
			return "Scripted tournament game features are not enabled for " + error[1].trim() + ".";
		} else if (error[0] === 'disabledSearchChallengeFeatures') {
			return "Scripted search challenge features are not enabled for " + error[1].trim() + ".";
		} else if (error[0] === 'disabledUserHostedGameFeatures') {
			return "User-hosted game features are not enabled for " + error[1].trim() + ".";
		} else if (error[0] === 'disabledUserHostedTournamentFeatures') {
			return "User-hosted tournament features are not enabled for " + error[1].trim() + ".";
		} else if (error[0] === 'noRoomEventInformation') {
			return error[1].trim() + " does not currently have any event information stored.";
		} else if (error[0] === 'invalidRoomEvent') {
			return "You must specify one of " + error[1].trim() + "'s events.";
		} else if (error[0] === 'disabledGameFormat') {
			return error[1].trim() + " is currently disabled.";
		} else if (error[0] === 'gameOptionRequiresFreejoin') {
			return error[1].trim() + " must be played as freejoin.";
		} else if (error[0] === 'invalidUserInRoom') {
			return "You must specify a user currently in the room.";
		} else if (error[0] === 'invalidUsernameLength') {
			return "You must specify a valid username (between 1 and " + Tools.maxUsernameLength + " characters).";
		} else if (error[0] === 'reloadInProgress') {
			return Users.self.name + " is preparing to update. Please try again soon!";
		} else if (error[0] === 'invalidHttpsLink') {
			return "You must specify a valid HTTPS link.";
		} else if (error[0] === 'noPmGameRoom') { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			return "You must be in a room that has enabled scripted games and where " + Users.self.name + " has Bot rank (*).";
		}

		return "";
	}

	private onReload(previous: CommandParser): void {
		for (const i in previous.commandGuides) {
			Tools.unrefProperties(previous.commandGuides[i]);
		}

		for (const i in previous.htmlPages) {
			for (const user in previous.htmlPages[i]) {
				previous.htmlPages[i][user].expire();
			}

			Tools.unrefProperties(previous.htmlPages[i]);
		}

		for (const i in previous.htmlPageModules) {
			Tools.unrefProperties(previous.htmlPageModules[i]);
		}

		for (const commandModule of previous.commandModules) {
			Tools.unrefProperties(commandModule);
		}

		Tools.unrefProperties(previous);
		Tools.unrefProperties(global.Commands);
		Tools.unrefProperties(global.BaseCommands);

		this.loadBaseCommands();
	}

	private loadCommandsDirectory(directory: string, allCommands: BaseCommandDefinitions, privateDirectory?: boolean): void {
		let commandFiles: string[] = [];
		try {
			commandFiles = fs.readdirSync(directory);
		} catch (e) {
			if ((e as NodeJS.ErrnoException).code === 'ENOENT' && privateDirectory) return;
			throw e;
		}

		for (const fileName of commandFiles) {
			if (!fileName.endsWith('.js')) continue;

			const commandFilePath = path.join(directory, fileName);

			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const commandFile = require(commandFilePath) as ICommandFile;
			this.commandModules.push(commandFile);

			if (commandFile.commands) {
				const commandCategory = fileName.substr(0, fileName.length - 3);
				for (const i in commandFile.commands) {
					if (!privateDirectory && i in allCommands) {
						throw new Error("Command '" + i + "' is defined in more than 1 location.");
					}

					if (commandFile.commands[i].description && commandFile.commands[i].description.length) {
						if (!(commandCategory in this.commandGuides)) this.commandGuides[commandCategory] = {};

						this.commandGuides[commandCategory][i] = {
							aliases: commandFile.commands[i].aliases,
							chatOnly: commandFile.commands[i].chatOnly,
							description: commandFile.commands[i].description,
							developerOnly: commandFile.commands[i].developerOnly,
							pmOnly: commandFile.commands[i].pmOnly,
							pmSyntax: commandFile.commands[i].pmSyntax,
							syntax: commandFile.commands[i].syntax,
						};
					}
				}

				Object.assign(allCommands, commandFile.commands);
			}
		}
	}

	private loadHtmlPagesDirectory(directory: string, allCommands: BaseCommandDefinitions, privateDirectory?: boolean): void {
		let htmlPageFiles: string[] = [];
		try {
			htmlPageFiles = fs.readdirSync(directory);
		} catch (e) {
			if ((e as NodeJS.ErrnoException).code === 'ENOENT' && privateDirectory) return;
			throw e;
		}

		for (const fileName of htmlPageFiles) {
			if (!fileName.endsWith('.js') || fileName === 'html-page-base.js') continue;
			const htmlPagePath = path.join(directory, fileName);

			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const htmlPage = require(htmlPagePath) as IHtmlPageFile;
			if (htmlPage.pageId in this.htmlPages) throw new Error("Html page id '" + htmlPage.pageId + "' is used for more than 1 page.");

			this.htmlPageModules[htmlPage.pageId] = htmlPage;
			this.htmlPages[htmlPage.pageId] = htmlPage.pages;

			if (htmlPage.commands) {
				for (const i in htmlPage.commands) {
					if (i in allCommands) {
						throw new Error("Html page command '" + i + "' is defined in more than 1 location.");
					}
				}

				Object.assign(allCommands, htmlPage.commands);
			}
		}
	}
}

export const instantiate = (): void => {
	let oldCommandParser = global.CommandParser as CommandParser | undefined;

	global.CommandParser = new CommandParser();

	if (oldCommandParser) {
		// @ts-expect-error
		global.CommandParser.onReload(oldCommandParser);
		oldCommandParser = undefined;
	}
};
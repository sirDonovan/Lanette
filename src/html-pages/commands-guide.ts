import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { User } from "../users";
import { Pagination } from "./components/pagination";
import type { IPageElement } from "./components/pagination";
import { HtmlPageBase } from "./html-page-base";

const baseCommand = 'commandsguide';
const chooseDeveloper = 'choosedeveloper';
const chooseInfo = 'chooseinfo';
const chooseScriptedGame = 'choosescriptedgame';
const chooseStorage = 'choosestorage';
const chooseTournament = 'choosetournament';
const chooseUserHostedGame = 'chooseuserhostedgame';
const chooseUtil = 'chooseutil';
const commandPageCommand = 'commandspage';
const closeCommand = 'close';

const pages: Dict<CommandsGuide> = {};

class CommandsGuide extends HtmlPageBase {
	pageId = 'commands-guide';
	currentView: 'developer' | 'info' | 'scripted-game' | 'storage' | 'tournament' | 'user-hosted-game' | 'util' = 'info';

	showDeveloperCommands: boolean;
	commandsPagination!: Pagination;

	constructor(room: Room, user: User) {
		super(room, user, baseCommand);

		this.commandPrefix = Config.commandCharacter + baseCommand;

		this.showDeveloperCommands = user.isDeveloper();
		this.commandsPagination = new Pagination(this.room, this.commandPrefix, commandPageCommand, {
			elements: [],
			elementsPerRow: 1,
			rowsPerPage: 20,
			pagesLabel: "Commands",
			noElementsLabel: "No commands in this category have a description.",
			hideSinglePageNavigation: true,
			onSelectPage: () => this.send(),
			reRender: () => this.send(),
		});

		this.components = [this.commandsPagination];

		this.setCommandGuide(true);

		pages[this.userId] = this;
	}

	chooseDeveloper(): void {
		if (this.currentView === 'developer') return;

		this.currentView = 'developer';
		this.setCommandGuide();

		this.send();
	}

	chooseInfo(): void {
		if (this.currentView === 'info') return;

		this.currentView = 'info';
		this.setCommandGuide();

		this.send();
	}

	chooseScriptedGame(): void {
		if (this.currentView === 'scripted-game') return;

		this.currentView = 'scripted-game';
		this.setCommandGuide();

		this.send();
	}

	chooseStorage(): void {
		if (this.currentView === 'storage') return;

		this.currentView = 'storage';
		this.setCommandGuide();

		this.send();
	}

	chooseTournament(): void {
		if (this.currentView === 'tournament') return;

		this.currentView = 'tournament';
		this.setCommandGuide();

		this.send();
	}

	chooseUserHostedGame(): void {
		if (this.currentView === 'user-hosted-game') return;

		this.currentView = 'user-hosted-game';
		this.setCommandGuide();

		this.send();
	}

	chooseUtil(): void {
		if (this.currentView === 'util') return;

		this.currentView = 'util';
		this.setCommandGuide();

		this.send();
	}

	onClose(): void {
		delete pages[this.userId];
	}

	setCommandGuide(onOpen?: boolean): void {
		const commandGuide = CommandParser.getCommandGuide(this.currentView);
		if (!commandGuide) return;

		const commandsHtml: Dict<string> = {};

		for (const key in commandGuide) {
			const guide = commandGuide[key];
			if (guide.developerOnly && !this.showDeveloperCommands) continue;

			let html = "<code>" + Config.commandCharacter;
			let alias = key;
			if (guide.aliases) {
				alias = guide.aliases[0];
			}

			html += alias + "</code>";
			if (guide.chatOnly) {
				html += " (room only)";
			} else if (guide.pmOnly) {
				html += " (PMs only)";
			}

			html += " - " + guide.description!.join("<br />");
			if (guide.syntax && guide.syntax.length) {
				html += "<br /><b>Syntax</b>: " + guide.syntax.map(x => "<code>" + Config.commandCharacter + alias + " " + x + "</code>")
					.join(" or ");
			}

			if (guide.pmSyntax && guide.pmSyntax.length) {
				html += "<br /><b>Syntax in PMs</b>: " + guide.pmSyntax.map(x => "<code>" + Config.commandCharacter + alias + " " + x +
					"</code>").join(" or ");
			}

			html += "<br />";

			commandsHtml[alias] = html;
		}

		const elements: IPageElement[] = [];
		const keys = Object.keys(commandsHtml).sort();
		for (const key of keys) {
			elements.push({html: commandsHtml[key]});
		}

		this.commandsPagination.updateElements(elements, onOpen);
	}

	render(): string {
		let html = "<div class='chat' style='margin-top: 4px;margin-left: 4px'><center><b>" + Users.self.name + " Commands Guide</b>";
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + closeCommand, "Close");
		html += "<br /><br />";

		const developerView = this.currentView === 'developer';
		const infoView = this.currentView === 'info';
		const scriptedGameView = this.currentView === 'scripted-game';
		const storageView = this.currentView === 'storage';
		const tournamentView = this.currentView === 'tournament';
		const userHostedGameView = this.currentView === 'user-hosted-game';
		const utilView = this.currentView === 'util';

		html += "<b>Options</b>:";
		if (this.showDeveloperCommands) {
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseDeveloper, "Development", developerView);
		}

		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseInfo, "Informational", infoView);
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseScriptedGame, "Scripted Game", scriptedGameView);
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseStorage, "Storage", storageView);
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseTournament, "Tournament", tournamentView);
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseUserHostedGame, "User Hosted Game", userHostedGameView);
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseUtil, "Utility", utilView);
		html += "</center>";

		html += this.commandsPagination.render();

		html += "</div>";
		return html;
	}
}

export const commands: BaseCommandDefinitions = {
	[baseCommand]: {
		command(target, room, user) {
			if (!this.isPm(room)) return;
			const targets = target.split(",");
			const botRoom = user.getBotRoom();
			if (!botRoom) return this.say(CommandParser.getErrorText(['noBotRankRoom']));

			const cmd = Tools.toId(targets[0]);
			targets.shift();

			if (!cmd) {
				new CommandsGuide(botRoom, user).open();
			} else if (cmd === chooseDeveloper) {
				if (!(user.id in pages)) new CommandsGuide(botRoom, user);
				pages[user.id].chooseDeveloper();
			} else if (cmd === chooseInfo) {
				if (!(user.id in pages)) new CommandsGuide(botRoom, user);
				pages[user.id].chooseInfo();
			} else if (cmd === chooseScriptedGame) {
				if (!(user.id in pages)) new CommandsGuide(botRoom, user);
				pages[user.id].chooseScriptedGame();
			} else if (cmd === chooseStorage) {
				if (!(user.id in pages)) new CommandsGuide(botRoom, user);
				pages[user.id].chooseStorage();
			} else if (cmd === chooseTournament) {
				if (!(user.id in pages)) new CommandsGuide(botRoom, user);
				pages[user.id].chooseTournament();
			} else if (cmd === chooseUserHostedGame) {
				if (!(user.id in pages)) new CommandsGuide(botRoom, user);
				pages[user.id].chooseUserHostedGame();
			} else if (cmd === chooseUtil) {
				if (!(user.id in pages)) new CommandsGuide(botRoom, user);
				pages[user.id].chooseUtil();
			} else if (cmd === closeCommand) {
				if (!(user.id in pages)) new CommandsGuide(botRoom, user);
				pages[user.id].close();
				delete pages[user.id];
			} else {
				if (!(user.id in pages)) new CommandsGuide(botRoom, user);
				const error = pages[user.id].checkComponentCommands(cmd, targets);
				if (error) this.say(error);
			}
		},
		aliases: ['commands', 'help', 'guide'],
	},
};
import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { IGameFormat } from "../types/games";
import type { IPokemon } from "../types/pokemon-showdown";
import type { HexCode } from "../types/tools";
import type { User } from "../users";
import { ColorPicker } from "./components/color-picker";
import { HtmlPageBase } from "./html-page-base";

const iconLimit = 1 as number;

const baseCommand = 'gamescriptedbox';
const setGameFormatCommand = 'setgameformat';
const setGameFormatSeparateCommand = 'gsbformat';
const setPokemonCommand = 'setpokemon';
const setPokemonSeparateCommand = 'gsbpokemon';
const chooseBackgroundColorPicker = 'choosebackgroundcolorpicker';
const chooseButtonColorPicker = 'choosebuttoncolorpicker';
const setBackgroundColorCommand = 'setbackgroundcolor';
const setButtonColorCommand = 'setbuttonscolor';
const closeCommand = 'close';

const pages: Dict<GameScriptedBox> = {};

class GameScriptedBox extends HtmlPageBase {
	pageId = 'game-scripted-box';

	gameFormat: string = 'pmp';

	backgroundColorPicker: ColorPicker;
	buttonColorPicker: ColorPicker;
	currentPicker: 'background' | 'buttons' = 'background';

	constructor(room: Room, user: User) {
		super(room, user, baseCommand);

		const database = Storage.getDatabase(this.room);
		let currentBackgroundColor: HexCode | undefined;
		let currentButtonColor: HexCode | undefined;
		if (database.gameScriptedBoxes && this.userId in database.gameScriptedBoxes) {
			currentBackgroundColor = database.gameScriptedBoxes[this.userId].background;
			currentButtonColor = database.gameScriptedBoxes[this.userId].buttons;
		}

		this.backgroundColorPicker = new ColorPicker(this.commandPrefix, setBackgroundColorCommand, {
			currentColor: currentBackgroundColor,
			onClearColor: () => this.clearBackgroundColor(),
			onSelectColor: color => this.setBackgroundColor(color),
			onUpdateView: () => this.send(),
		});

		this.buttonColorPicker = new ColorPicker(this.commandPrefix, setButtonColorCommand, {
			currentColor: currentButtonColor,
			onClearColor: () => this.clearButtonsColor(),
			onSelectColor: color => this.setButtonsColor(color),
			onUpdateView: () => this.send(),
		});
		this.buttonColorPicker.active = false;

		this.components = [this.backgroundColorPicker, this.buttonColorPicker];

		pages[this.userId] = this;
	}

	onClose(): void {
		delete pages[this.userId];
	}

	chooseBackgroundColorPicker(): void {
		if (this.currentPicker === 'background') return;

		this.backgroundColorPicker.active = true;
		this.buttonColorPicker.active = false;
		this.currentPicker = 'background';

		this.send();
	}

	chooseButtonColorPicker(): void {
		if (this.currentPicker === 'buttons') return;

		this.backgroundColorPicker.active = false;
		this.buttonColorPicker.active = true;
		this.currentPicker = 'buttons';

		this.send();
	}

	clearBackgroundColor(): void {
		const database = Storage.getDatabase(this.room);
		Storage.createGameScriptedBox(database, this.userId);
		delete database.gameScriptedBoxes![this.userId].background;

		this.send();
	}

	setBackgroundColor(color: HexCode): void {
		const database = Storage.getDatabase(this.room);
		Storage.createGameScriptedBox(database, this.userId);
		database.gameScriptedBoxes![this.userId].background = color;

		this.send();
	}

	clearButtonsColor(): void {
		const database = Storage.getDatabase(this.room);
		Storage.createGameScriptedBox(database, this.userId);
		delete database.gameScriptedBoxes![this.userId].buttons;

		this.send();
	}

	setButtonsColor(color: HexCode): void {
		const database = Storage.getDatabase(this.room);
		Storage.createGameScriptedBox(database, this.userId);
		database.gameScriptedBoxes![this.userId].buttons = color;

		this.send();
	}

	setGameFormat(format: IGameFormat): void {
		if (this.gameFormat === format.inputTarget) return;

		this.gameFormat = format.inputTarget;

		this.send();
	}

	render(): string {
		let name = this.userId;
		const user = Users.get(this.userId);
		if (user) name = user.name;

		let html = "<div class='chat' style='margin-top: 4px;margin-left: 4px'><center><b>" + this.room.title + ": Game Scripted Box</b>";
		html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + closeCommand, "Close");

		const format = Games.getExistingFormat(this.gameFormat);
		let mascot: IPokemon | undefined;
		if (format.mascot) {
			mascot = Dex.getExistingPokemon(format.mascot);
		} else if (format.mascots) {
			mascot = Dex.getExistingPokemon(Tools.sampleOne(format.mascots));
		}

		html += "<br /><div class='infobox'>";
		html += Games.getScriptedBoxHtml(this.room, format.name, name, format.description, mascot);
		html += "</div></center><br /><br />";

		html += "<b>Game preview</b><br />";
		html += "Choose a game to preview by PMing " + Users.self.name + " <code>" + Config.commandCharacter +
			setGameFormatSeparateCommand + " " + this.room.title + ", [format]</code>";
		html += "<br /><br />";

		html += "<b>Pokemon icon</b><br />";
		html += "Choose your icon by PMing " + Users.self.name + " <code>" + Config.commandCharacter + setPokemonSeparateCommand + " " +
			this.room.title + ", [Pokemon]</code>";
		html += "<br /><br />";

		html += Client.getPmSelfButton(this.commandPrefix + ", " + chooseBackgroundColorPicker, "Choose background",
			this.currentPicker === 'background');
		html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + chooseButtonColorPicker, "Choose buttons",
			this.currentPicker === 'buttons');
		html += "<br /><br />";

		if (this.currentPicker === 'background') {
			html += "<b>Background color</b><br />";
			html += this.backgroundColorPicker.render();
			html += "<br /><br />";
		} else {
			html += "<b>Buttons background color</b><br />";
			html += this.buttonColorPicker.render();
		}

		html += "</div>";
		return html;
	}
}

export const commands: BaseCommandDefinitions = {
	[baseCommand]: {
		command(target, room, user) {
			if (!this.isPm(room)) return;
			const targets = target.split(",");
			const targetRoom = Rooms.search(targets[0]);
			if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
			targets.shift();

			if (!Config.gameScriptedBoxRequirements || !(targetRoom.id in Config.gameScriptedBoxRequirements)) {
				return this.say("Game scripted boxes are not enabled for " + targetRoom.title + ".");
			}

			const checkBits = !user.hasRank(targetRoom, 'voice');
			const database = Storage.getDatabase(targetRoom);
			const annualBits = Storage.getAnnualPoints(targetRoom, Storage.gameLeaderboard, user.name);
			if (checkBits && Config.gameScriptedBoxRequirements[targetRoom.id] > 0) {
				if (annualBits < Config.gameScriptedBoxRequirements[targetRoom.id]) {
					return this.say("You need to earn at least " + Config.gameScriptedBoxRequirements[targetRoom.id] + " annual " +
						"bits before you can use this command.");
				}
			}

			if (!database.gameScriptedBoxes) database.gameScriptedBoxes = {};

			const cmd = Tools.toId(targets[0]);
			targets.shift();

			if (!cmd) {
				if (!(user.id in pages)) {
					new GameScriptedBox(targetRoom, user).open();
				} else {
					pages[user.id].send();
				}
			} else if (cmd === setGameFormatCommand || cmd === 'setgame') {
				const format = Games.getFormat(targets.join(','));
				if (Array.isArray(format)) return this.sayError(format);

				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].setGameFormat(format);
			} else if (cmd === setPokemonCommand || cmd === 'seticons' || cmd === 'seticon') {
				if (targets.length > iconLimit) {
					return this.say("You can only specify " + iconLimit + " icon" + (iconLimit > 1 ? "s" : "") + ".");
				}

				const selectedPokemon: string[] = [];
				for (let i = 0; i < iconLimit; i++) {
					if (!targets[i]) break;
					const pokemon = Dex.getPokemon(targets[i]);
					if (!pokemon) return this.sayError(['invalidPokemon', targets[i]]);
					if (!Dex.getPokemonIcon(pokemon)) {
						return this.say(pokemon.name + " does not have an icon! Please choose a different Pokemon.");
					}
					if (pokemon.forme && pokemon.baseSpecies === 'Unown') {
						return this.say("You can only use a regular Unown icon.");
					}
					selectedPokemon.push(pokemon.name);
				}

				const selectedPokemonLength = selectedPokemon.length;
				if (!selectedPokemonLength) return this.say("You must specify " + (iconLimit === 1 ? "a" : "at least 1") + " Pokemon.");

				Storage.createGameScriptedBox(database, user.name);
				database.gameScriptedBoxes[user.id].pokemon = selectedPokemon;

				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].send();
			} else if (cmd === chooseBackgroundColorPicker) {
				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].chooseBackgroundColorPicker();
			} else if (cmd === chooseButtonColorPicker) {
				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].chooseButtonColorPicker();
			} else if (cmd === closeCommand) {
				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].close();
				delete pages[user.id];
			} else {
				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				const error = pages[user.id].checkComponentCommands(cmd, targets);
				if (error) this.say(error);
			}
		},
		aliases: ['gsb'],
	},
	[setGameFormatSeparateCommand]: {
		command(target) {
			const targets = target.split(',');
			this.run(baseCommand, targets[0] + "," + setGameFormatCommand + "," + targets.slice(1).join(","));
		},
	},
	[setPokemonSeparateCommand]: {
		command(target) {
			const targets = target.split(',');
			this.run(baseCommand, targets[0] + "," + setPokemonCommand + "," + targets.slice(1).join(","));
		},
	},
};
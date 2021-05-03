import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { IGameFormat } from "../types/games";
import type { IPokemon } from "../types/pokemon-showdown";
import type { IDatabase } from "../types/storage";
import type { HexCode } from "../types/tools";
import type { User } from "../users";
import type { IColorPick } from "./components/color-picker";
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
const chooseSignupsBackgroundColorPicker = 'choosesignupsbackgroundcolorpicker';
const chooseSignupsButtonColorPicker = 'choosesignupsbuttoncolorpicker';
const setBackgroundColorCommand = 'setbackgroundcolor';
const setButtonColorCommand = 'setbuttonscolor';
const setSignupsBackgroundColorCommand = 'setsignupsbackgroundcolor';
const setSignupsButtonColorCommand = 'setsignupsbuttonscolor';
const closeCommand = 'close';

const pages: Dict<GameScriptedBox> = {};

class GameScriptedBox extends HtmlPageBase {
	pageId = 'game-scripted-box';

	gameFormat: string;

	backgroundColorPicker: ColorPicker;
	buttonColorPicker: ColorPicker;
	signupsBackgroundColorPicker: ColorPicker;
	signupsButtonColorPicker: ColorPicker;
	currentPicker: 'background' | 'buttons' | 'signups-background' | 'signups-buttons' = 'background';

	constructor(room: Room, user: User) {
		super(room, user, baseCommand);

		const database = Storage.getDatabase(this.room);
		let currentBackgroundColor: HexCode | undefined;
		let currentButtonColor: HexCode | undefined;
		let currentSignupsBackgroundColor: HexCode | undefined;
		let currentSignupsButtonColor: HexCode | undefined;
		let previewFormat: string | undefined;
		if (database.gameScriptedBoxes && this.userId in database.gameScriptedBoxes) {
			currentBackgroundColor = database.gameScriptedBoxes[this.userId].background;
			currentButtonColor = database.gameScriptedBoxes[this.userId].buttons;
			currentSignupsBackgroundColor = database.gameScriptedBoxes[this.userId].signupsBackground;
			currentSignupsButtonColor = database.gameScriptedBoxes[this.userId].signupsButtons;
			previewFormat = database.gameScriptedBoxes[this.userId].previewFormat;
		}

		this.gameFormat = previewFormat || "pmp";

		this.backgroundColorPicker = new ColorPicker(room, this.commandPrefix, setBackgroundColorCommand, {
			currentPick: currentBackgroundColor,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickBackgroundHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickBackgroundLightness(dontRender),
			onClear: (index, dontRender) => this.clearBackgroundColor(dontRender),
			onPick: (index, color, dontRender) => this.setBackgroundColor(color, dontRender),
			reRender: () => this.send(),
		});

		this.buttonColorPicker = new ColorPicker(room, this.commandPrefix, setButtonColorCommand, {
			currentPick: currentButtonColor,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickButtonHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickButtonLightness(dontRender),
			onClear: (index, dontRender) => this.clearButtonsColor(dontRender),
			onPick: (index, color, dontRender) => this.setButtonsColor(color, dontRender),
			reRender: () => this.send(),
		});
		this.buttonColorPicker.active = false;

		this.signupsBackgroundColorPicker = new ColorPicker(room, this.commandPrefix, setSignupsBackgroundColorCommand, {
			currentPick: currentSignupsBackgroundColor,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickBackgroundHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickBackgroundLightness(dontRender),
			onClear: (index, dontRender) => this.clearSignupsBackgroundColor(dontRender),
			onPick: (index, color, dontRender) => this.setSignupsBackgroundColor(color, dontRender),
			reRender: () => this.send(),
		});
		this.signupsBackgroundColorPicker.active = false;

		this.signupsButtonColorPicker = new ColorPicker(room, this.commandPrefix, setSignupsButtonColorCommand, {
			currentPick: currentSignupsButtonColor,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickButtonHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickButtonLightness(dontRender),
			onClear: (index, dontRender) => this.clearSignupsButtonsColor(dontRender),
			onPick: (index, color, dontRender) => this.setSignupsButtonsColor(color, dontRender),
			reRender: () => this.send(),
		});
		this.signupsButtonColorPicker.active = false;

		this.components = [this.backgroundColorPicker, this.buttonColorPicker, this.signupsBackgroundColorPicker,
			this.signupsButtonColorPicker];

		pages[this.userId] = this;
	}

	onClose(): void {
		delete pages[this.userId];
	}

	getDatabase(): IDatabase {
		const database = Storage.getDatabase(this.room);
		Storage.createGameScriptedBox(database, this.userId);

		return database;
	}

	chooseBackgroundColorPicker(): void {
		if (this.currentPicker === 'background') return;

		this.backgroundColorPicker.active = true;
		this.buttonColorPicker.active = false;
		this.signupsBackgroundColorPicker.active = false;
		this.signupsButtonColorPicker.active = false;
		this.currentPicker = 'background';

		this.send();
	}

	chooseButtonColorPicker(): void {
		if (this.currentPicker === 'buttons') return;

		this.buttonColorPicker.active = true;
		this.backgroundColorPicker.active = false;
		this.signupsBackgroundColorPicker.active = false;
		this.signupsButtonColorPicker.active = false;
		this.currentPicker = 'buttons';

		this.send();
	}

	chooseSignupsBackgroundColorPicker(): void {
		if (this.currentPicker === 'signups-background') return;

		this.signupsBackgroundColorPicker.active = true;
		this.backgroundColorPicker.active = false;
		this.buttonColorPicker.active = false;
		this.signupsButtonColorPicker.active = false;
		this.currentPicker = 'signups-background';

		this.send();
	}

	chooseSignupsButtonColorPicker(): void {
		if (this.currentPicker === 'signups-buttons') return;

		this.signupsButtonColorPicker.active = true;
		this.backgroundColorPicker.active = false;
		this.buttonColorPicker.active = false;
		this.signupsBackgroundColorPicker.active = false;
		this.currentPicker = 'signups-buttons';

		this.send();
	}

	pickBackgroundHueVariation(dontRender?: boolean): void {
		if (!dontRender) this.send();
	}

	pickBackgroundLightness(dontRender?: boolean): void {
		if (!dontRender) this.send();
	}

	clearBackgroundColor(dontRender?: boolean): void {
		const database = this.getDatabase();
		delete database.gameScriptedBoxes![this.userId].background;

		if (!dontRender) this.send();
	}

	setBackgroundColor(color: IColorPick, dontRender?: boolean): void {
		const database = this.getDatabase();
		database.gameScriptedBoxes![this.userId].background = color.hexCode;

		if (!dontRender) this.send();
	}

	clearSignupsBackgroundColor(dontRender?: boolean): void {
		const database = this.getDatabase();
		delete database.gameScriptedBoxes![this.userId].signupsBackground;

		if (!dontRender) this.send();
	}

	setSignupsBackgroundColor(color: IColorPick, dontRender?: boolean): void {
		const database = this.getDatabase();
		database.gameScriptedBoxes![this.userId].signupsBackground = color.hexCode;

		if (!dontRender) this.send();
	}

	pickButtonHueVariation(dontRender?: boolean): void {
		if (!dontRender) this.send();
	}

	pickButtonLightness(dontRender?: boolean): void {
		if (!dontRender) this.send();
	}

	clearButtonsColor(dontRender?: boolean): void {
		const database = this.getDatabase();
		delete database.gameScriptedBoxes![this.userId].buttons;

		if (!dontRender) this.send();
	}

	setButtonsColor(color: IColorPick, dontRender?: boolean): void {
		const database = this.getDatabase();
		database.gameScriptedBoxes![this.userId].buttons = color.hexCode;

		if (!dontRender) this.send();
	}

	clearSignupsButtonsColor(dontRender?: boolean): void {
		const database = this.getDatabase();
		delete database.gameScriptedBoxes![this.userId].signupsButtons;

		if (!dontRender) this.send();
	}

	setSignupsButtonsColor(color: IColorPick, dontRender?: boolean): void {
		const database = this.getDatabase();
		database.gameScriptedBoxes![this.userId].signupsButtons = color.hexCode;

		if (!dontRender) this.send();
	}

	setGameFormat(format: IGameFormat): void {
		if (this.gameFormat === format.inputTarget) return;

		const database = this.getDatabase();
		database.gameScriptedBoxes![this.userId].previewFormat = format.inputTarget;

		this.gameFormat = format.inputTarget;

		this.send();
	}

	render(): string {
		let name = this.userId;
		const user = Users.get(this.userId);
		if (user) name = user.name;

		let html = "<div class='chat' style='margin-top: 4px;margin-left: 4px'><center><b>" + this.room.title + ": Game Scripted Box</b>";
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + closeCommand, "Close");

		const format = Games.getExistingFormat(this.gameFormat);
		let mascot: IPokemon | undefined;
		if (format.mascot) {
			mascot = Dex.getExistingPokemon(format.mascot);
		} else if (format.mascots) {
			mascot = Dex.getExistingPokemon(Tools.sampleOne(format.mascots));
		}

		html += "<br /><div class='infobox'>";
		html += Games.getScriptedBoxHtml(this.room, format.name, name, format.description, mascot);
		html += "</div></center><br />";

		const database = Storage.getDatabase(this.room);
		let signupsBackgroundColor: string | undefined;
		let signupsButtonColor: string | undefined;
		if (database.gameScriptedBoxes && this.userId in database.gameScriptedBoxes) {
			const box = database.gameScriptedBoxes[this.userId];
			signupsBackgroundColor = box.signupsBackground || box.background;
			signupsButtonColor = box.signupsButtons || box.buttons;
		}

		html += Games.getSignupsPlayersHtml(signupsBackgroundColor, (mascot ? Dex.getPokemonIcon(mascot) : '') + "<b>" +
			format.nameWithOptions + " - signups</b>", 1, "<username>" + this.userName + "</username>");
		html += "<br />";
		html += Games.getJoinLeaveHtml(signupsButtonColor, false, this.room);
		html += "<br />";

		html += "<b>Game preview</b><br />";
		html += "Choose a game to preview by PMing " + Users.self.name + " <code>" + Config.commandCharacter +
			setGameFormatSeparateCommand + " " + this.room.title + ", [format]</code>";
		html += "<br /><br />";

		html += "<b>Pokemon icon</b><br />";
		html += "Choose your icon by PMing " + Users.self.name + " <code>" + Config.commandCharacter + setPokemonSeparateCommand + " " +
			this.room.title + ", [Pokemon]</code>";
		html += "<br /><br />";

		const background = this.currentPicker === 'background';
		const buttons = this.currentPicker === 'buttons';
		const signupsBackground = this.currentPicker === 'signups-background';
		const signupsButtons = this.currentPicker === 'signups-buttons';

		html += this.getQuietPmButton(this.commandPrefix + ", " + chooseBackgroundColorPicker, "Choose background",
			background);
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseButtonColorPicker, "Choose buttons",
			buttons);
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseSignupsBackgroundColorPicker,
			"Choose signups background", signupsBackground);
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseSignupsButtonColorPicker, "Choose signups buttons",
			signupsButtons);
		html += "<br /><br />";

		if (background) {
			html += "<b>Background color</b><br />";
			html += this.backgroundColorPicker.render();
			html += "<br /><br />";
		} else if (buttons) {
			html += "<b>Buttons background color</b><br />";
			html += this.buttonColorPicker.render();
		} else if (signupsBackground) {
			html += "<b>Signups background color</b><br />";
			html += this.signupsBackgroundColorPicker.render();
		} else {
			html += "<b>Signups buttons background color</b><br />";
			html += this.signupsButtonColorPicker.render();
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
				new GameScriptedBox(targetRoom, user).open();
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
			} else if (cmd === chooseSignupsBackgroundColorPicker) {
				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].chooseSignupsBackgroundColorPicker();
			} else if (cmd === chooseSignupsButtonColorPicker) {
				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].chooseSignupsButtonColorPicker();
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
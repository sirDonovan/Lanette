import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { IGameFormat } from "../types/games";
import type { IPokemon } from "../types/pokemon-showdown";
import type { IGameScriptedBox } from "../types/storage";
import type { HexCode } from "../types/tools";
import type { User } from "../users";
import { HtmlPageBase } from "./html-page-base";

const iconLimit = 1 as number;
const backgroundColorsPerRow = 15;
const buttonColorsPerRow = 15;

const noBackground = 'None';
const baseCommand = 'gamescriptedbox';
const setGameFormatCommand = 'setgameformat';
const setGameFormatSeparateCommand = 'gsbformat';
const setPokemonCommand = 'setpokemon';
const setPokemonSeparateCommand = 'gsbpokemon';
const setBackgroundColorCommand = 'setbackgroundcolor';
const setButtonColorCommand = 'setbuttonscolor';
const standardBackgroundColorsCommand = 'standardbackgroundcolors';
const lighterBackgroundColorsCommand = 'lighterbackgroundcolors';
const darkerBackgroundColorsCommand = 'darkerbackgroundcolors';
const standardButtonColorsCommand = 'standardbuttoncolors';
const lighterButtonColorsCommand = 'lighterbuttoncolors';
const darkerButtonColorsCommand = 'darkerbuttoncolors';
const closeCommand = 'close';

const pages: Dict<GameScriptedBox> = {};

class GameScriptedBox extends HtmlPageBase {
	static standardBackgroundColors: HexCode[] = [];
	static standardBackgroundColorsLength: number = 0;
	static lighterBackgroundColors: HexCode[] = [];
	static lighterBackgroundColorsLength: number = 0;
	static darkerBackgroundColors: HexCode[] = [];
	static darkerBackgroundColorsLength: number = 0;
	static standardButtonColors: HexCode[] = [];
	static standardButtonColorsLength: number = 0;
	static lighterButtonColors: HexCode[] = [];
	static lighterButtonColorsLength: number = 0;
	static darkerButtonColors: HexCode[] = [];
	static darkerButtonColorsLength: number = 0;
	static loadedData: boolean = false;

	backgroundColorType: 'standard' | 'lighter' | 'darker' = 'standard';
	buttonColorType: 'standard' | 'lighter' | 'darker' = 'standard';
	gameFormat: string = 'pmp';
	pageId = 'game-scripted-box';

	constructor(room: Room, user: User) {
		super(room, user);

		GameScriptedBox.loadData();
		pages[this.userId] = this;
	}

	static loadData(): void {
		if (this.loadedData) return;

		const colors = Object.keys(Tools.hexCodes) as HexCode[];
		for (const color of colors) {
			if (Tools.hexCodes[color].category === 'light') {
				this.lighterBackgroundColors.push(color);
				this.lighterButtonColors.push(color);
			} else if (Tools.hexCodes[color].category === 'dark') {
				this.darkerBackgroundColors.push(color);
				this.darkerButtonColors.push(color);
			} else {
				this.standardBackgroundColors.push(color);
				this.standardButtonColors.push(color);
			}
		}

		this.standardBackgroundColorsLength = this.standardBackgroundColors.length;
		this.lighterBackgroundColorsLength = this.lighterBackgroundColors.length;
		this.darkerBackgroundColorsLength = this.darkerBackgroundColors.length;

		this.standardButtonColorsLength = this.standardButtonColors.length;
		this.lighterButtonColorsLength = this.lighterButtonColors.length;
		this.darkerButtonColorsLength = this.darkerButtonColors.length;

		this.loadedData = true;
	}

	close(): void {
		delete pages[this.userId];

		const user = Users.get(this.userId);
		if (user) this.room.closeHtmlPage(user, this.pageId);
	}

	setGameFormat(format: IGameFormat): void {
		this.gameFormat = format.inputTarget;

		this.send();
	}

	standardBackgroundColors(): void {
		this.backgroundColorType = 'standard';

		this.send();
	}

	lighterBackgroundColors(): void {
		this.backgroundColorType = 'lighter';

		this.send();
	}

	darkerBackgroundColors(): void {
		this.backgroundColorType = 'darker';

		this.send();
	}

	standardButtonColors(): void {
		this.buttonColorType = 'standard';

		this.send();
	}

	lighterButtonColors(): void {
		this.buttonColorType = 'lighter';

		this.send();
	}

	darkerButtonColors(): void {
		this.buttonColorType = 'darker';

		this.send();
	}

	render(): string {
		const database = Storage.getDatabase(this.room);
		let scriptedBox: IGameScriptedBox | undefined;
		if (database.gameScriptedBoxes && this.userId in database.gameScriptedBoxes) scriptedBox = database.gameScriptedBoxes[this.userId];

		let name = this.userId;
		const user = Users.get(this.userId);
		if (user) name = user.name;

		let html = "<div class='chat' style='margin-top: 4px;margin-left: 4px'><center><b>" + this.room.title + ": Game Scripted Box</b>";
		html += "&nbsp;" + Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " + closeCommand,
			"Close");

		const format = Games.getExistingFormat(this.gameFormat);
		let mascot: IPokemon | undefined;
		if (format.mascot) {
			mascot = Dex.getExistingPokemon(format.mascot);
		} else if (format.mascots) {
			mascot = Dex.getExistingPokemon(Tools.sampleOne(format.mascots));
		}

		html += "<br /><br /><div class='infobox'>";
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

		const standardBackgroundColors = this.backgroundColorType === 'standard';
		const lighterBackgroundColors = this.backgroundColorType === 'lighter';
		const darkerBackgroundColors = this.backgroundColorType === 'darker';

		html += "<b>Background color</b><br />";
		html += "Type:&nbsp;";
		html += "&nbsp;";
		html += Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " +
			standardBackgroundColorsCommand, "Standard", standardBackgroundColors);
		html += "&nbsp;";
		html += Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " +
			lighterBackgroundColorsCommand, "Lighter", lighterBackgroundColors);
		html += "&nbsp;";
		html += Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " +
			darkerBackgroundColorsCommand, "Darker", darkerBackgroundColors);
		html += "<br /><br />";

		let backgroundColors: HexCode[];
		let totalBackgroundColors = 0;
		if (standardBackgroundColors) {
			backgroundColors = GameScriptedBox.standardBackgroundColors;
			totalBackgroundColors = GameScriptedBox.standardBackgroundColorsLength;
		} else if (lighterBackgroundColors) {
			backgroundColors = GameScriptedBox.lighterBackgroundColors;
			totalBackgroundColors = GameScriptedBox.lighterBackgroundColorsLength;
		} else {
			backgroundColors = GameScriptedBox.darkerBackgroundColors;
			totalBackgroundColors = GameScriptedBox.darkerBackgroundColorsLength;
		}

		html += Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " +
				setBackgroundColorCommand + "," + noBackground, "None", !scriptedBox || !scriptedBox.background);

		let backgroundColorsRowCount = 1;
		for (let i = 0; i < totalBackgroundColors; i++) {
			const color = backgroundColors[i];
			const colorDiv = "<div style='background: " + Tools.hexCodes[color].gradient + ";height: 15px;width: 15px'>&nbsp;</div>";

			if (backgroundColorsRowCount || i === 0) html += "&nbsp;";
			html += Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " +
				setBackgroundColorCommand + "," + color, colorDiv, scriptedBox && scriptedBox.background === color);

			backgroundColorsRowCount++;
			if (backgroundColorsRowCount === backgroundColorsPerRow) {
				html += "<br />";
				backgroundColorsRowCount = 0;
			}
		}
		html += "<br /><br />";

		const standardButtonColors = this.buttonColorType === 'standard';
		const lighterButtonColors = this.buttonColorType === 'lighter';
		const darkerButtonColors = this.buttonColorType === 'darker';

		html += "<b>Buttons background color</b><br />";
		html += "Type:&nbsp;";
		html += "&nbsp;";
		html += Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " +
			standardButtonColorsCommand, "Standard", standardButtonColors);
		html += "&nbsp;";
		html += Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " +
			lighterButtonColorsCommand, "Lighter", lighterButtonColors);
		html += "&nbsp;";
		html += Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " +
			darkerButtonColorsCommand, "Darker", darkerButtonColors);
		html += "<br /><br />";

		let buttonColors: HexCode[];
		let totalButtonColors = 0;
		if (standardButtonColors) {
			buttonColors = GameScriptedBox.standardButtonColors;
			totalButtonColors = GameScriptedBox.standardButtonColorsLength;
		} else if (lighterButtonColors) {
			buttonColors = GameScriptedBox.lighterButtonColors;
			totalButtonColors = GameScriptedBox.lighterButtonColorsLength;
		} else {
			buttonColors = GameScriptedBox.darkerButtonColors;
			totalButtonColors = GameScriptedBox.darkerButtonColorsLength;
		}

		html += Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " +
			setButtonColorCommand + "," + noBackground, "None", !scriptedBox || !scriptedBox.buttons);

		let buttonColorsRowCount = 1;
		for (let i = 0; i < totalButtonColors; i++) {
			const color = buttonColors[i];
			const colorDiv = "<div style='background: " + Tools.hexCodes[color].color + ";height: 15px;width: 15px'>&nbsp;</div>";

			if (buttonColorsRowCount || i === 0) html += "&nbsp;";
			html += Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " +
				setButtonColorCommand + "," + color, colorDiv, scriptedBox && scriptedBox.buttons === color);

			buttonColorsRowCount++;
			if (buttonColorsRowCount === buttonColorsPerRow) {
				html += "<br />";
				buttonColorsRowCount = 0;
			}
		}

		html += "</div>";
		return html;
	}

	send(): void {
		const user = Users.get(this.userId);
		if (user) this.room.sendHtmlPage(user, this.pageId, this.render());
	}
}

export const commands: BaseCommandDefinitions = {
	[baseCommand]: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
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

			if (!cmd || cmd === 'edit' || cmd === 'page') {
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
			} else if (cmd === setBackgroundColorCommand || cmd === 'setbgcolor' || cmd === 'setbackground') {
				const color = targets[0].trim();
				const clear = color === noBackground;
				if (!clear && !(color in Tools.hexCodes)) {
					return this.say("'" + color + "' is not a valid background color.");
				}

				Storage.createGameScriptedBox(database, user.name);
				if (clear) {
					delete database.gameScriptedBoxes[user.id].background;
				} else {
					database.gameScriptedBoxes[user.id].background = color as HexCode;
				}

				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].send();
			} else if (cmd === setButtonColorCommand || cmd === 'setbuttoncolor' || cmd === 'setbuttons' || cmd === 'setbutton') {
				const color = targets[0].trim();
				const clear = color === noBackground;
				if (!clear && !(color in Tools.hexCodes)) {
					return this.say("'" + color + "' is not a valid button color.");
				}

				Storage.createGameScriptedBox(database, user.name);
				if (clear) {
					delete database.gameScriptedBoxes[user.id].buttons;
				} else {
					database.gameScriptedBoxes[user.id].buttons = color as HexCode;
				}

				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].send();
			} else if (cmd === standardBackgroundColorsCommand) {
				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].standardBackgroundColors();
			} else if (cmd === lighterBackgroundColorsCommand) {
				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].lighterBackgroundColors();
			} else if (cmd === darkerBackgroundColorsCommand) {
				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].darkerBackgroundColors();
			}  else if (cmd === standardButtonColorsCommand) {
				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].standardButtonColors();
			} else if (cmd === lighterButtonColorsCommand) {
				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].lighterButtonColors();
			} else if (cmd === darkerButtonColorsCommand) {
				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].darkerButtonColors();
			} else if (cmd === closeCommand) {
				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].close();
			} else {
				this.say("Unknown sub-command '" + cmd + "'.");
			}
		},
		aliases: ['gsb'],
	},
	[setGameFormatSeparateCommand]: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target) {
			const targets = target.split(',');
			this.run(baseCommand, targets[0] + "," + setGameFormatCommand + "," + targets.slice(1).join(","));
		},
	},
	[setPokemonSeparateCommand]: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target) {
			const targets = target.split(',');
			this.run(baseCommand, targets[0] + "," + setPokemonCommand + "," + targets.slice(1).join(","));
		},
	},
};
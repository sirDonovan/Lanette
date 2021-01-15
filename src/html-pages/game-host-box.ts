import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { IPokemon } from "../types/pokemon-showdown";
import type { IGameHostBox } from "../types/storage";
import type { HexCode } from "../types/tools";
import type { User } from "../users";
import { HtmlPageBase } from "./html-page-base";

const backgroundColorsPerRow = 15;
const buttonColorsPerRow = 15;

const noBackground = 'None';
const baseCommand = 'gamehostbox';
const setPokemonCommand = 'setpokemon';
const setPokemonSeparateCommand = 'ghbpokemon';
const setBackgroundColorCommand = 'setbackgroundcolor';
const setButtonColorCommand = 'setbuttonscolor';
const standardBackgroundColorsCommand = 'standardbackgroundcolors';
const lighterBackgroundColorsCommand = 'lighterbackgroundcolors';
const darkerBackgroundColorsCommand = 'darkerbackgroundcolors';
const standardButtonColorsCommand = 'standardbuttoncolors';
const lighterButtonColorsCommand = 'lighterbuttoncolors';
const darkerButtonColorsCommand = 'darkerbuttoncolors';
const closeCommand = 'close';

const pages: Dict<GameHostBox> = {};

class GameHostBox extends HtmlPageBase {
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
	pageId = 'game-host-box';

	constructor(room: Room, user: User) {
		super(room, user);

		GameHostBox.loadData();
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
		let hostBox: IGameHostBox | undefined;
		if (database.gameHostBoxes && this.userId in database.gameHostBoxes) hostBox = database.gameHostBoxes[this.userId];

		let name = this.userId;
		const user = Users.get(this.userId);
		if (user) name = user.name;

		let html = "<div class='chat' style='margin-top: 4px;margin-left: 4px'><center><b>" + this.room.title + ": Game Host Box</b>";
		html += "&nbsp;" + Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " + closeCommand,
			"Close");

		html += "<br /><br /><div class='infobox'>";
		html += Games.getHostBoxHtml(this.room, name, name + "'s Game");
		html += "</div></center><br /><br />";

		html += "<b>Pokemon GIFs</b><br />";
		html += "Choose your GIFs by PMing " + Users.self.name + " <code>" + Config.commandCharacter + setPokemonSeparateCommand + " " +
			this.room.title + ", [Pokemon], [Pokemon], [...]</code>";
		html += "<br /><br />You can make any GIF shiny by adding <code>shiny</code> before or after the Pokemon's name.";
		html += "<br /><br />";

		const standardBackgroundColors = this.backgroundColorType === 'standard';
		const lighterBackgroundColors = this.backgroundColorType === 'lighter';
		const darkerBackgroundColors = this.backgroundColorType === 'darker';

		html += "<b>GIFs background color</b><br />";
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
			backgroundColors = GameHostBox.standardBackgroundColors;
			totalBackgroundColors = GameHostBox.standardBackgroundColorsLength;
		} else if (lighterBackgroundColors) {
			backgroundColors = GameHostBox.lighterBackgroundColors;
			totalBackgroundColors = GameHostBox.lighterBackgroundColorsLength;
		} else {
			backgroundColors = GameHostBox.darkerBackgroundColors;
			totalBackgroundColors = GameHostBox.darkerBackgroundColorsLength;
		}

		html += Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " +
				setBackgroundColorCommand + "," + noBackground, "None", !hostBox || !hostBox.background);

		let backgroundColorsRowCount = 1;
		for (let i = 0; i < totalBackgroundColors; i++) {
			const color = backgroundColors[i];
			const colorDiv = "<div style='background: " + Tools.hexCodes[color].gradient + ";height: 15px;width: 15px'>&nbsp;</div>";

			if (backgroundColorsRowCount || i === 0) html += "&nbsp;";
			html += Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " +
				setBackgroundColorCommand + "," + color, colorDiv, hostBox && hostBox.background === color);

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
			buttonColors = GameHostBox.standardButtonColors;
			totalButtonColors = GameHostBox.standardButtonColorsLength;
		} else if (lighterButtonColors) {
			buttonColors = GameHostBox.lighterButtonColors;
			totalButtonColors = GameHostBox.lighterButtonColorsLength;
		} else {
			buttonColors = GameHostBox.darkerButtonColors;
			totalButtonColors = GameHostBox.darkerButtonColorsLength;
		}

		html += Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " +
			setButtonColorCommand + "," + noBackground, "None", !hostBox || !hostBox.buttons);

		let buttonColorsRowCount = 1;
		for (let i = 0; i < totalButtonColors; i++) {
			const color = buttonColors[i];
			const colorDiv = "<div style='background: " + Tools.hexCodes[color].color + ";height: 15px;width: 15px'>&nbsp;</div>";

			if (buttonColorsRowCount || i === 0) html += "&nbsp;";
			html += Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " +
				setButtonColorCommand + "," + color, colorDiv, hostBox && hostBox.buttons === color);

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

			if (!Config.gameHostBoxRequirements || !(targetRoom.id in Config.gameHostBoxRequirements)) {
				return this.say("Game host boxes are not enabled for " + targetRoom.title + ".");
			}

			const checkBits = !user.hasRank(targetRoom, 'voice');
			const database = Storage.getDatabase(targetRoom);
			const annualBits = Storage.getAnnualPoints(targetRoom, Storage.gameLeaderboard, user.name);
			if (checkBits && Config.gameHostBoxRequirements[targetRoom.id].background > 0) {
				if (annualBits < Config.gameHostBoxRequirements[targetRoom.id].background) {
					return this.say("You need to earn at least " + Config.gameHostBoxRequirements[targetRoom.id].background + " annual " +
						"bits before you can use this command.");
				}
			}

			if (!database.gameHostBoxes) database.gameHostBoxes = {};

			const cmd = Tools.toId(targets[0]);
			targets.shift();

			if (!cmd || cmd === 'edit' || cmd === 'page') {
				new GameHostBox(targetRoom, user).open();
			} else if (cmd === setPokemonCommand || cmd === 'setgifs' || cmd === 'setgif') {
				if (checkBits && Config.gameHostBoxRequirements[targetRoom.id].pokemon.one > 0 &&
					annualBits < Config.gameHostBoxRequirements[targetRoom.id].pokemon.one) {
					return this.say("You need at least " + Config.gameHostBoxRequirements[targetRoom.id].pokemon.one + " annual " +
						"bits to add a Pokemon icon to your game host box.");
				}

				const selectedPokemon: string[] = [];
				const shinies: boolean[] = [];
				for (let i = 0; i < 3; i++) {
					if (!targets[i]) break;
					const parts = targets[i].split(" ");
					let shiny = false;
					let pokemon: IPokemon | undefined;
					for (const part of parts) {
						if (Tools.toId(part) === 'shiny') {
							shiny = true;
						} else {
							pokemon = Dex.getPokemon(part);
						}
					}
					if (!pokemon && !shiny) pokemon = Dex.getPokemon(targets[i]);
					if (!pokemon) return this.sayError(['invalidPokemon', targets[i]]);

					if (pokemon.forme && pokemon.baseSpecies === 'Unown') {
						return this.say("You can only use a regular Unown GIF.");
					}

					if (!Dex.hasGifData(pokemon)) {
						return this.say(pokemon.name + " does not have a GIF! Please choose a different Pokemon.");
					}

					selectedPokemon.push(pokemon.name);
					shinies.push(shiny);
				}

				const selectedPokemonLength = selectedPokemon.length;
				if (!selectedPokemonLength) return this.say("You must specify at least 1 Pokemon.");

				if (checkBits) {
					let requirement: 'two' | 'three' | undefined;
					if (selectedPokemonLength === 2) {
						requirement = 'two';
					} else if (selectedPokemonLength === 3) {
						requirement = 'three';
					}

					if (requirement) {
						const requiredBits = Config.gameHostBoxRequirements[targetRoom.id].pokemon[requirement];
						if (requiredBits > 0 && annualBits < requiredBits) {
							return this.say("You need at least " + requiredBits + " annual bits to add " + selectedPokemonLength + " " +
								"Pokemon GIFs to your game host box.");
						}
					}
				}

				Storage.createGameHostBox(database, user.name);
				database.gameHostBoxes[user.id].pokemon = selectedPokemon;
				database.gameHostBoxes[user.id].shinyPokemon = shinies;

				if (!(user.id in pages)) new GameHostBox(targetRoom, user);
				pages[user.id].send();
			} else if (cmd === setBackgroundColorCommand || cmd === 'setbgcolor' || cmd === 'setbackground') {
				const color = targets[0].trim();
				const clear = color === noBackground;
				if (!clear && !(color in Tools.hexCodes)) {
					return this.say("'" + color + "' is not a valid background color.");
				}

				Storage.createGameHostBox(database, user.name);
				if (clear) {
					delete database.gameHostBoxes[user.id].background;
				} else {
					database.gameHostBoxes[user.id].background = color as HexCode;
				}

				if (!(user.id in pages)) new GameHostBox(targetRoom, user);
				pages[user.id].send();
			} else if (cmd === setButtonColorCommand || cmd === 'setbuttoncolor' || cmd === 'setbuttons' || cmd === 'setbutton') {
				const color = targets[0].trim();
				const clear = color === noBackground;
				if (!clear && !(color in Tools.hexCodes)) {
					return this.say("'" + color + "' is not a valid button color.");
				}

				Storage.createGameHostBox(database, user.name);
				if (clear) {
					delete database.gameHostBoxes[user.id].buttons;
				} else {
					database.gameHostBoxes[user.id].buttons = color as HexCode;
				}

				if (!(user.id in pages)) new GameHostBox(targetRoom, user);
				pages[user.id].send();
			} else if (cmd === standardBackgroundColorsCommand) {
				if (!(user.id in pages)) new GameHostBox(targetRoom, user);
				pages[user.id].standardBackgroundColors();
			} else if (cmd === lighterBackgroundColorsCommand) {
				if (!(user.id in pages)) new GameHostBox(targetRoom, user);
				pages[user.id].lighterBackgroundColors();
			} else if (cmd === darkerBackgroundColorsCommand) {
				if (!(user.id in pages)) new GameHostBox(targetRoom, user);
				pages[user.id].darkerBackgroundColors();
			}  else if (cmd === standardButtonColorsCommand) {
				if (!(user.id in pages)) new GameHostBox(targetRoom, user);
				pages[user.id].standardButtonColors();
			} else if (cmd === lighterButtonColorsCommand) {
				if (!(user.id in pages)) new GameHostBox(targetRoom, user);
				pages[user.id].lighterButtonColors();
			} else if (cmd === darkerButtonColorsCommand) {
				if (!(user.id in pages)) new GameHostBox(targetRoom, user);
				pages[user.id].darkerButtonColors();
			} else if (cmd === closeCommand) {
				if (!(user.id in pages)) new GameHostBox(targetRoom, user);
				pages[user.id].close();
			} else {
				this.say("Unknown sub-command '" + cmd + "'.");
			}
		},
		aliases: ['ghb'],
	},
	[setPokemonSeparateCommand]: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target) {
			const targets = target.split(',');
			this.run(baseCommand, targets[0] + "," + setPokemonCommand + "," + targets.slice(1).join(","));
		},
	},
};
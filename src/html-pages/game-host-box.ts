import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { IPokemon } from "../types/pokemon-showdown";
import type { IDatabase } from "../types/storage";
import type { HexCode } from "../types/tools";
import type { User } from "../users";
import type { IColorPick } from "./components/color-picker";
import { ColorPicker } from "./components/color-picker";
import { HtmlPageBase } from "./html-page-base";

const baseCommand = 'gamehostbox';
const setPokemonCommand = 'setpokemon';
const setPokemonSeparateCommand = 'ghbpokemon';
const chooseBackgroundColorPicker = 'choosebackgroundcolorpicker';
const chooseButtonColorPicker = 'choosebuttoncolorpicker';
const chooseSignupsBackgroundColorPicker = 'choosesignupsbackgroundcolorpicker';
const chooseSignupsButtonColorPicker = 'choosesignupsbuttoncolorpicker';
const setBackgroundColorCommand = 'setbackgroundcolor';
const setButtonColorCommand = 'setbuttonscolor';
const setSignupsBackgroundColorCommand = 'setsignupsbackgroundcolor';
const setSignupsButtonColorCommand = 'setsignupsbuttonscolor';
const closeCommand = 'close';

const pages: Dict<GameHostBox> = {};

class GameHostBox extends HtmlPageBase {
	pageId = 'game-host-box';

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
		if (database.gameHostBoxes && this.userId in database.gameHostBoxes) {
			currentBackgroundColor = database.gameHostBoxes[this.userId].background;
			currentButtonColor = database.gameHostBoxes[this.userId].buttons;
			currentSignupsBackgroundColor = database.gameHostBoxes[this.userId].signupsBackground;
			currentSignupsButtonColor = database.gameHostBoxes[this.userId].signupsButtons;
		}

		this.backgroundColorPicker = new ColorPicker(this.commandPrefix, setBackgroundColorCommand, {
			currentPick: currentBackgroundColor,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickBackgroundHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickBackgroundLightness(dontRender),
			onClear: (index, dontRender) => this.clearBackgroundColor(dontRender),
			onPick: (index, color, dontRender) => this.setBackgroundColor(color, dontRender),
			reRender: () => this.send(),
		});

		this.buttonColorPicker = new ColorPicker(this.commandPrefix, setButtonColorCommand, {
			currentPick: currentButtonColor,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickButtonHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickButtonLightness(dontRender),
			onClear: (index, dontRender) => this.clearButtonsColor(dontRender),
			onPick: (index, color, dontRender) => this.setButtonsColor(color, dontRender),
			reRender: () => this.send(),
		});
		this.buttonColorPicker.active = false;

		this.signupsBackgroundColorPicker = new ColorPicker(this.commandPrefix, setSignupsBackgroundColorCommand, {
			currentPick: currentSignupsBackgroundColor,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickBackgroundHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickBackgroundLightness(dontRender),
			onClear: (index, dontRender) => this.clearSignupsBackgroundColor(dontRender),
			onPick: (index, color, dontRender) => this.setSignupsBackgroundColor(color, dontRender),
			reRender: () => this.send(),
		});
		this.signupsBackgroundColorPicker.active = false;

		this.signupsButtonColorPicker = new ColorPicker(this.commandPrefix, setSignupsButtonColorCommand, {
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
		Storage.createGameHostBox(database, this.userId);

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
		delete database.gameHostBoxes![this.userId].background;

		if (!dontRender) this.send();
	}

	setBackgroundColor(color: IColorPick, dontRender?: boolean): void {
		const database = this.getDatabase();
		database.gameHostBoxes![this.userId].background = color.hexCode;

		if (!dontRender) this.send();
	}

	clearSignupsBackgroundColor(dontRender?: boolean): void {
		const database = this.getDatabase();
		delete database.gameHostBoxes![this.userId].signupsBackground;

		if (!dontRender) this.send();
	}

	setSignupsBackgroundColor(color: IColorPick, dontRender?: boolean): void {
		const database = this.getDatabase();
		database.gameHostBoxes![this.userId].signupsBackground = color.hexCode;

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
		delete database.gameHostBoxes![this.userId].buttons;

		if (!dontRender) this.send();
	}

	setButtonsColor(color: IColorPick, dontRender?: boolean): void {
		const database = this.getDatabase();
		database.gameHostBoxes![this.userId].buttons = color.hexCode;

		if (!dontRender) this.send();
	}

	clearSignupsButtonsColor(dontRender?: boolean): void {
		const database = this.getDatabase();
		delete database.gameHostBoxes![this.userId].signupsButtons;

		if (!dontRender) this.send();
	}

	setSignupsButtonsColor(color: IColorPick, dontRender?: boolean): void {
		const database = this.getDatabase();
		database.gameHostBoxes![this.userId].signupsButtons = color.hexCode;

		if (!dontRender) this.send();
	}

	render(): string {
		let name = this.userId;
		const user = Users.get(this.userId);
		if (user) name = user.name;

		let html = "<div class='chat' style='margin-top: 4px;margin-left: 4px'><center><b>" + this.room.title + ": Game Host Box</b>";
		html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + closeCommand, "Close");

		html += "<br /><div class='infobox'>";
		html += Games.getHostBoxHtml(this.room, name, name + "'s Game");
		html += "</div></center><br />";

		const database = Storage.getDatabase(this.room);
		let mascots: string[] = [];
		let signupsBackgroundColor: string | undefined;
		let signupsButtonColor: string | undefined;
		if (database.gameHostBoxes && this.userId in database.gameHostBoxes) {
			const box = database.gameHostBoxes[this.userId];
			mascots = box.pokemon;
			signupsBackgroundColor = box.signupsBackground || box.background;
			signupsButtonColor = box.signupsButtons || box.buttons;
		}

		html += Games.getSignupsPlayersHtml(signupsBackgroundColor,
			mascots.map(x => Dex.getPokemonIcon(Dex.getExistingPokemon(x))).join("") + "<b>" + this.userName + "'s Game - signups</b>",
			0, "");
		html += "<br />";
		html += Games.getJoinLeaveHtml(signupsButtonColor, false, this.room);
		html += "<br />";

		html += "<b>Pokemon GIFs</b><br />";
		html += "Choose your GIFs by PMing " + Users.self.name + " <code>" + Config.commandCharacter + setPokemonSeparateCommand + " " +
			this.room.title + ", [Pokemon], [Pokemon], [...]</code>";
		html += "<br /><br />You can make any GIF shiny by adding <code>shiny</code> before or after the Pokemon's name.";
		html += "<br /><br />";

		const background = this.currentPicker === 'background';
		const buttons = this.currentPicker === 'buttons';
		const signupsBackground = this.currentPicker === 'signups-background';
		const signupsButtons = this.currentPicker === 'signups-buttons';

		html += Client.getPmSelfButton(this.commandPrefix + ", " + chooseBackgroundColorPicker, "Choose background",
			background);
		html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + chooseButtonColorPicker, "Choose buttons",
			buttons);
		html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + chooseSignupsBackgroundColorPicker,
			"Choose signups background", signupsBackground);
		html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + chooseSignupsButtonColorPicker, "Choose signups buttons",
			signupsButtons);
		html += "<br /><br />";

		if (background) {
			html += "<b>GIFs background color</b><br />";
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

			if (!cmd) {
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

					if (!Dex.hasModelData(pokemon)) {
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
			} else if (cmd === chooseBackgroundColorPicker) {
				if (!(user.id in pages)) new GameHostBox(targetRoom, user);
				pages[user.id].chooseBackgroundColorPicker();
			} else if (cmd === chooseButtonColorPicker) {
				if (!(user.id in pages)) new GameHostBox(targetRoom, user);
				pages[user.id].chooseButtonColorPicker();
			} else if (cmd === chooseSignupsBackgroundColorPicker) {
				if (!(user.id in pages)) new GameHostBox(targetRoom, user);
				pages[user.id].chooseSignupsBackgroundColorPicker();
			} else if (cmd === chooseSignupsButtonColorPicker) {
				if (!(user.id in pages)) new GameHostBox(targetRoom, user);
				pages[user.id].chooseSignupsButtonColorPicker();
			} else if (cmd === closeCommand) {
				if (!(user.id in pages)) new GameHostBox(targetRoom, user);
				pages[user.id].close();
				delete pages[user.id];
			} else {
				if (!(user.id in pages)) new GameHostBox(targetRoom, user);
				const error = pages[user.id].checkComponentCommands(cmd, targets);
				if (error) this.say(error);
			}
		},
		aliases: ['ghb'],
	},
	[setPokemonSeparateCommand]: {
		command(target) {
			const targets = target.split(',');
			this.run(baseCommand, targets[0] + "," + setPokemonCommand + "," + targets.slice(1).join(","));
		},
	},
};
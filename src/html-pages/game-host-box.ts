import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { IPokemon } from "../types/pokemon-showdown";
import type { HexCode } from "../types/tools";
import type { User } from "../users";
import { ColorPicker } from "./components/color-picker";
import { HtmlPageBase } from "./html-page-base";

const baseCommand = 'gamehostbox';
const setPokemonCommand = 'setpokemon';
const setPokemonSeparateCommand = 'ghbpokemon';
const chooseBackgroundColorPicker = 'choosebackgroundcolorpicker';
const chooseButtonColorPicker = 'choosebuttoncolorpicker';
const setBackgroundColorCommand = 'setbackgroundcolor';
const setButtonColorCommand = 'setbuttonscolor';
const closeCommand = 'close';

const pages: Dict<GameHostBox> = {};

class GameHostBox extends HtmlPageBase {
	pageId = 'game-host-box';

	backgroundColorPicker: ColorPicker;
	buttonColorPicker: ColorPicker;
	currentPicker: 'background' | 'buttons' = 'background';

	constructor(room: Room, user: User) {
		super(room, user, baseCommand);

		const database = Storage.getDatabase(this.room);
		let currentBackgroundColor: HexCode | undefined;
		let currentButtonColor: HexCode | undefined;
		if (database.gameHostBoxes && this.userId in database.gameHostBoxes) {
			currentBackgroundColor = database.gameHostBoxes[this.userId].background;
			currentButtonColor = database.gameHostBoxes[this.userId].buttons;
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
		Storage.createGameHostBox(database, this.userId);
		delete database.gameHostBoxes![this.userId].background;

		this.send();
	}

	setBackgroundColor(color: HexCode): void {
		const database = Storage.getDatabase(this.room);
		Storage.createGameHostBox(database, this.userId);
		database.gameHostBoxes![this.userId].background = color;

		this.send();
	}

	clearButtonsColor(): void {
		const database = Storage.getDatabase(this.room);
		Storage.createGameHostBox(database, this.userId);
		delete database.gameHostBoxes![this.userId].buttons;

		this.send();
	}

	setButtonsColor(color: HexCode): void {
		const database = Storage.getDatabase(this.room);
		Storage.createGameHostBox(database, this.userId);
		database.gameHostBoxes![this.userId].buttons = color;

		this.send();
	}

	render(): string {
		let name = this.userId;
		const user = Users.get(this.userId);
		if (user) name = user.name;

		let html = "<div class='chat' style='margin-top: 4px;margin-left: 4px'><center><b>" + this.room.title + ": Game Host Box</b>";
		html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + closeCommand, "Close");

		html += "<br /><div class='infobox'>";
		html += Games.getHostBoxHtml(this.room, name, name + "'s Game");
		html += "</div></center><br /><br />";

		html += "<b>Pokemon GIFs</b><br />";
		html += "Choose your GIFs by PMing " + Users.self.name + " <code>" + Config.commandCharacter + setPokemonSeparateCommand + " " +
			this.room.title + ", [Pokemon], [Pokemon], [...]</code>";
		html += "<br /><br />You can make any GIF shiny by adding <code>shiny</code> before or after the Pokemon's name.";
		html += "<br /><br />";

		html += Client.getPmSelfButton(this.commandPrefix + ", " + chooseBackgroundColorPicker, "Choose background",
			this.currentPicker === 'background');
		html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + chooseButtonColorPicker, "Choose buttons",
			this.currentPicker === 'buttons');
		html += "<br /><br />";

		if (this.currentPicker === 'background') {
			html += "<b>GIFs background color</b><br />";
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
			} else if (cmd === chooseBackgroundColorPicker) {
				if (!(user.id in pages)) new GameHostBox(targetRoom, user);
				pages[user.id].chooseBackgroundColorPicker();
			} else if (cmd === chooseButtonColorPicker) {
				if (!(user.id in pages)) new GameHostBox(targetRoom, user);
				pages[user.id].chooseButtonColorPicker();
			} else if (cmd === closeCommand) {
				if (!(user.id in pages)) new GameHostBox(targetRoom, user);
				pages[user.id].close();
			} else {
				if (!(user.id in pages)) new GameHostBox(targetRoom, user);
				const error = pages[user.id].checkComponentCommands(cmd, targets);
				if (error) this.say(error);
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
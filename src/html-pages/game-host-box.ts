import type { CommandContext } from "../command-parser";
import type { Room } from "../rooms";
import type { CommandDefinitions } from "../types/command-parser";
import type { IPokemon } from "../types/pokemon-showdown";
import type { IGameHostBox } from "../types/storage";
import type { HexColor } from "../types/tools";
import type { User } from "../users";
import { HtmlPageBase } from "./html-page-base";

const noBackground = 'None';
const baseCommand = 'gamehostbox';
const setPokemonCommand = 'setpokemon';
const setPokemonSeparateCommand = 'ghbpokemon';
const setBackgroundColorCommand = 'setbackgroundcolor';
const setButtonColorCommand = 'setbuttonscolor';
const closeCommand = 'close';

const pages: Dict<GameHostBox> = {};

class GameHostBox extends HtmlPageBase {
	pageId = 'game-host-box';

	constructor(room: Room, user: User) {
		super(room, user);

		pages[this.userId] = this;
	}

	close(): void {
		delete pages[this.userId];

		const user = Users.get(this.userId);
		if (user) this.room.closeHtmlPage(user, this.pageId);
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
		html += "<br /><br />";

		html += "<b>GIFs background color</b><br />";
		html += Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " +
				setBackgroundColorCommand + "," + noBackground, "None", !hostBox || !hostBox.background);

		const colors = Object.keys(Tools.hexColorCodes) as HexColor[];
		for (const color of colors) {
			const colorDiv = "<div style='background: " + Tools.hexColorCodes[color].background + ";height: 15px;width: 15px'>&nbsp;</div>";
			html += "&nbsp;" + Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " +
				setBackgroundColorCommand + "," + color, colorDiv, hostBox && hostBox.background === color);
		}

		html += "<br /><br />";
		html += "<b>Buttons background color</b><br />";
		html += Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " +
				setButtonColorCommand + "," + noBackground, "None", !hostBox || !hostBox.background);

		for (const color of colors) {
			if (!color.startsWith('Light-') && !color.startsWith('Dark-')) continue;
			const colorDiv = "<div style='background: " + Tools.hexColorCodes[color]['background-color'] + ";height: 15px;width: 15px'>" +
				"&nbsp;</div>";
			html += "&nbsp;" + Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " +
				setButtonColorCommand + "," + color, colorDiv, hostBox && hostBox.buttons === color);
		}

		html += "</div>";
		return html;
	}

	send(): void {
		const user = Users.get(this.userId);
		if (user) this.room.sendHtmlPage(user, this.pageId, this.render());
	}
}

export const commands: CommandDefinitions<CommandContext> = {
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
				if (checkBits && Config.gameHostBoxRequirements[targetRoom.id].onePokemon > 0 &&
					annualBits < Config.gameHostBoxRequirements[targetRoom.id].onePokemon) {
					return this.say("You need at least " + Config.gameHostBoxRequirements[targetRoom.id].onePokemon + " annual " +
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

					if (!Dex.hasGifData(pokemon)) {
						return this.say(pokemon.name + " does not have a GIF! Please choose a different Pokemon.");
					}

					selectedPokemon.push(pokemon.name);
					shinies.push(shiny);
				}

				if (!selectedPokemon.length) return this.say("You must specify at least 1 Pokemon.");

				if (checkBits) {
					if (selectedPokemon.length === 2) {
						if (Config.gameHostBoxRequirements[targetRoom.id].twoPokemon > 0 &&
							annualBits < Config.gameHostBoxRequirements[targetRoom.id].twoPokemon) {
							return this.say("You need at least " + Config.gameHostBoxRequirements[targetRoom.id].twoPokemon + " " +
								"annual bits to add 2 Pokemon GIFs to your game host box.");
						}
					} else if (selectedPokemon.length === 3) {
						if (Config.gameHostBoxRequirements[targetRoom.id].threePokemon > 0 &&
							annualBits < Config.gameHostBoxRequirements[targetRoom.id].threePokemon) {
							return this.say("You need at least " + Config.gameHostBoxRequirements[targetRoom.id].threePokemon + " " +
								"annual bits to add 3 Pokemon GIFs to your game host box.");
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
				if (!clear && !(color in Tools.hexColorCodes)) {
					return this.say("'" + color + "' is not a valid background color.");
				}

				Storage.createGameHostBox(database, user.name);
				if (clear) {
					delete database.gameHostBoxes[user.id].background;
				} else {
					database.gameHostBoxes[user.id].background = color as HexColor;
				}

				if (!(user.id in pages)) new GameHostBox(targetRoom, user);
				pages[user.id].send();
			} else if (cmd === setButtonColorCommand || cmd === 'setbuttoncolor' || cmd === 'setbuttons' || cmd === 'setbutton') {
				const color = targets[0].trim();
				const clear = color === noBackground;
				if (!clear && (!(color in Tools.hexColorCodes) || (!color.startsWith('Light-') && !color.startsWith('Dark-')))) {
					return this.say("'" + color + "' is not a valid button color.");
				}

				Storage.createGameHostBox(database, user.name);
				if (clear) {
					delete database.gameHostBoxes[user.id].buttons;
				} else {
					database.gameHostBoxes[user.id].buttons = color as HexColor;
				}

				if (!(user.id in pages)) new GameHostBox(targetRoom, user);
				pages[user.id].send();
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
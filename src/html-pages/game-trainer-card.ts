import type { CommandContext } from "../command-parser";
import type { Room } from "../rooms";
import type { CommandDefinitions } from "../types/command-parser";
import type { IGameTrainerCard } from "../types/storage";
import type { HexColor } from "../types/tools";
import type { User } from "../users";
import { HtmlPageBase } from "./html-page-base";

const trainerIdsIndexIncrement = 18;
const noBackground = 'None';
const baseCommand = 'gametrainercard';
const setPokemonCommand = 'setpokemon';
const previewCommand = 'preview';
const setPokemonSeparateCommand = 'gtcpokemon';
const setBackgroundColorCommand = 'setbackgroundcolor';
const setTrainerCommand = 'settrainer';
const newerTrainersCommand = 'newertrainers';
const olderTrainersCommand = 'oldertrainers';
const goToTrainerPageCommand = 'gototrainerspage';
const closeCommand = 'close';

const pages: Dict<GameTrainerCard> = {};

class GameTrainerCard extends HtmlPageBase {
	static trainerSprites: Dict<string> = {};
	static newerTrainerIds: string[] = [];
	static newerTrainerIdsLength: number = 0;
	static newerTrainerIdsPages: number = 0;
	static olderTrainerIds: string[] = [];
	static olderTrainerIdsLength: number = 0;
	static olderTrainerIdsPages: number = 0;
	static loadedData: boolean = false;

	trainerIdsPage: number = 0;
	trainerType: 'newer' | 'older' = 'newer';
	pageId = 'game-trainer-card';

	constructor(room: Room, user: User) {
		super(room, user);

		GameTrainerCard.loadData();
		pages[this.userId] = this;
	}

	static loadData(): void {
		if (this.loadedData) return;

		for (const i in Dex.data.trainerSprites) {
			this.trainerSprites[i] = Dex.getTrainerSprite(Dex.data.trainerSprites[i]);
			if (Dex.data.trainerSprites[i].includes("-gen")) {
				this.olderTrainerIds.push(i);
			} else {
				this.newerTrainerIds.push(i);
			}
		}

		this.newerTrainerIdsLength = this.newerTrainerIds.length;
		this.olderTrainerIdsLength = this.olderTrainerIds.length;

		this.newerTrainerIdsPages = Math.ceil(this.newerTrainerIdsLength / trainerIdsIndexIncrement);
		this.olderTrainerIdsPages = Math.ceil(this.olderTrainerIdsLength / trainerIdsIndexIncrement);

		this.loadedData = true;
	}

	close(): void {
		delete pages[this.userId];

		const user = Users.get(this.userId);
		if (user) this.room.closeHtmlPage(user, this.pageId);
	}

	goToTrainersPage(page: number): void {
		this.trainerIdsPage = page;

		this.send();
	}

	newerTrainers(): void {
		this.trainerType = 'newer';
		this.trainerIdsPage = 0;

		this.send();
	}

	olderTrainers(): void {
		this.trainerType = 'older';
		this.trainerIdsPage = 0;

		this.send();
	}

	render(): string {
		const database = Storage.getDatabase(this.room);
		let trainerCard: IGameTrainerCard | undefined;
		if (database.gameTrainerCards && this.userId in database.gameTrainerCards) trainerCard = database.gameTrainerCards[this.userId];

		let name = this.userId;
		const user = Users.get(this.userId);
		if (user) name = user.name;

		let html = "<div class='chat' style='margin-top: 5px;margin-left: 10px'><center><b>" + this.room.title + ": Game Trainer Card</b>";
		html += "&nbsp;" + Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " + closeCommand,
			"Close");

		const currentCard = Games.getTrainerCardHtml(this.room, name);
		if (currentCard) {
			html += "<br /><br />" + currentCard + "<br />";
		}
		html += "</center>";

		html += "<b>Pokemon icons</b><br />";
		html += "Choose your Pokemon with the command <code>" + Config.commandCharacter + setPokemonSeparateCommand + " " +
			this.room.title + ", [Pokemon]</code>!";
		html += "<br /><br />";

		html += "<b>Background color</b><br />";
		html += Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " +
				setBackgroundColorCommand + "," + noBackground, "None", !trainerCard || !trainerCard.background);

		const colors = Object.keys(Tools.hexColorCodes) as HexColor[];
		for (const color of colors) {
			if (color.startsWith("Light-") || color.startsWith("Dark-")) continue;
			const colorDiv = "<div style='background: " + Tools.hexColorCodes[color].background + ";height: 15px;width: 15px'>&nbsp;</div>";
			html += Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " +
				setBackgroundColorCommand + "," + color, colorDiv, trainerCard && trainerCard.background === color);
		}
		html += "<br /><br />";

		const newerTrainers = this.trainerType === 'newer';
		const olderTrainers = this.trainerType === 'older';

		html += "<b>Trainer sprite</b><br />";
		html += "Type:&nbsp;";
		html += "&nbsp;";
		html += Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " + newerTrainersCommand,
			"Newer gen", newerTrainers);
		html += "&nbsp;";
		html += Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " + olderTrainersCommand,
			"Older gen", olderTrainers);
		html += "<br />";

		const trainerIdsStartIndex = this.trainerIdsPage * trainerIdsIndexIncrement;
		let trainerIdsEndIndex = (this.trainerIdsPage + 1) * trainerIdsIndexIncrement;
		let totalTrainers = 0;
		let totalPages = 0;
		if (newerTrainers) {
			totalTrainers = GameTrainerCard.newerTrainerIdsLength;
			totalPages = GameTrainerCard.newerTrainerIdsPages;
			if (trainerIdsEndIndex > GameTrainerCard.newerTrainerIdsLength) trainerIdsEndIndex = GameTrainerCard.newerTrainerIdsLength;
		} else if (olderTrainers) {
			totalTrainers = GameTrainerCard.olderTrainerIdsLength;
			totalPages = GameTrainerCard.olderTrainerIdsPages;
			if (trainerIdsEndIndex > GameTrainerCard.olderTrainerIdsLength) trainerIdsEndIndex = GameTrainerCard.olderTrainerIdsLength;
		}

		html += "Trainers (" + (trainerIdsStartIndex + 1) + "-" + trainerIdsEndIndex + "/" + totalTrainers + "):&nbsp;";

		for (let i = 0; i < totalPages; i++) {
			const page = "" + (i + 1);
			html += Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " + goToTrainerPageCommand +
				", " + page, page, this.trainerIdsPage === i);
		}

		html += "<br /><br />";

		for (let i = trainerIdsStartIndex; i < trainerIdsEndIndex; i++) {
			let id: string;
			if (newerTrainers) {
				id = GameTrainerCard.newerTrainerIds[i];
			} else {
				id = GameTrainerCard.olderTrainerIds[i];
			}

			html += Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " + setTrainerCommand +
				"," + id, GameTrainerCard.trainerSprites[id], trainerCard && trainerCard.avatar === id);
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

			if (!Config.gameTrainerCardRequirements || !(targetRoom.id in Config.gameTrainerCardRequirements)) {
				return this.say("Game trainer cards are not enabled for " + targetRoom.title + ".");
			}

			const checkBits = !user.hasRank(targetRoom, 'voice');
			const database = Storage.getDatabase(targetRoom);
			const annualBits = Storage.getAnnualPoints(targetRoom, Storage.gameLeaderboard, user.name);
			if (checkBits && Config.gameTrainerCardRequirements[targetRoom.id].trainer > 0) {
				if (annualBits < Config.gameTrainerCardRequirements[targetRoom.id].trainer) {
					return this.say("You need to earn at least " + Config.gameTrainerCardRequirements[targetRoom.id].trainer + " annual " +
						"bits before you can use this command.");
				}
			}

			if (!database.gameTrainerCards) database.gameTrainerCards = {};

			const cmd = Tools.toId(targets[0]);
			targets.shift();

			if (!cmd || cmd === 'edit' || cmd === 'page') {
				new GameTrainerCard(targetRoom, user).open();
			} else if (cmd === 'view' || cmd === 'show' || cmd === previewCommand) {
				const trainerCard = Games.getTrainerCardHtml(targetRoom, user.name);
				if (!trainerCard) return this.say("You do not have a game trainer card.");
				targetRoom.pmUhtml(user, targetRoom.id + "-game-trainer-card", trainerCard);
			} else if (cmd === setPokemonCommand || cmd === 'seticon' || cmd === 'seticons') {
				if (checkBits && Config.gameTrainerCardRequirements[targetRoom.id].onePokemon > 0 &&
					annualBits < Config.gameTrainerCardRequirements[targetRoom.id].onePokemon) {
					return this.say("You need at least " + Config.gameTrainerCardRequirements[targetRoom.id].onePokemon + " annual " +
						"bits to add a Pokemon icon to your game trainer card.");
				}

				const selectedPokemon: string[] = [];
				for (let i = 0; i < 6; i++) {
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

				if (!selectedPokemon.length) return this.say("You must specify at least 1 Pokemon.");

				if (checkBits) {
					if (selectedPokemon.length === 2) {
						if (Config.gameTrainerCardRequirements[targetRoom.id].twoPokemon > 0 &&
							annualBits < Config.gameTrainerCardRequirements[targetRoom.id].twoPokemon) {
							return this.say("You need at least " + Config.gameTrainerCardRequirements[targetRoom.id].twoPokemon + " " +
								"annual bits to add 2 Pokemon icons to your game trainer card.");
						}
					} else if (selectedPokemon.length >= 3) {
						if (Config.gameTrainerCardRequirements[targetRoom.id].manyPokemon > 0 &&
							annualBits < Config.gameTrainerCardRequirements[targetRoom.id].manyPokemon) {
							return this.say("You need at least " + Config.gameTrainerCardRequirements[targetRoom.id].manyPokemon + " " +
								"annual bits to add 3 or more Pokemon icons to your game trainer card.");
						}
					}
				}

				Storage.createGameTrainerCard(database, user.name);
				database.gameTrainerCards[user.id].pokemon = selectedPokemon;

				if (user.id in pages) {
					pages[user.id].send();
				} else {
					this.run(baseCommand, targetRoom.id + ", " + previewCommand);
				}
			} else if (cmd === setTrainerCommand || cmd === 'setavatar') {
				const id = Tools.toId(targets[0]);
				if (!(id in Dex.data.trainerSprites)) {
					return this.say("'" + targets[0].trim() + "' is not a valid trainer sprite.");
				}

				Storage.createGameTrainerCard(database, user.name);
				database.gameTrainerCards[user.id].avatar = id;

				if (user.id in pages) {
					pages[user.id].send();
				} else {
					this.run(baseCommand, targetRoom.id + ", " + previewCommand);
				}
			} else if (cmd === setBackgroundColorCommand || cmd === 'setbgcolor' || cmd === 'setbackground') {
				const color = targets[0].trim();
				const clear = color === noBackground;
				if (!clear && !(color in Tools.hexColorCodes)) {
					return this.say("'" + color + "' is not a valid background color.");
				}

				Storage.createGameTrainerCard(database, user.name);
				if (clear) {
					delete database.gameTrainerCards[user.id].background;
				} else {
					database.gameTrainerCards[user.id].background = color as HexColor;
				}

				if (user.id in pages) {
					pages[user.id].send();
				} else {
					this.run(baseCommand, targetRoom.id + ", " + previewCommand);
				}
			} else if (cmd === goToTrainerPageCommand) {
				let page = 0;
				if (targets.length) {
					page = parseInt(targets[0].trim());
				}
				if (isNaN(page) || page <= 0) return this.say("You must specify a valid page number.");
				if (user.id in pages) pages[user.id].goToTrainersPage(page - 1);
			} else if (cmd === newerTrainersCommand) {
				if (user.id in pages) pages[user.id].newerTrainers();
			} else if (cmd === olderTrainersCommand) {
				if (user.id in pages) pages[user.id].olderTrainers();
			} else if (cmd === closeCommand) {
				if (!(user.id in pages)) new GameTrainerCard(targetRoom, user);
				pages[user.id].close();
			} else {
				this.say("Unknown sub-command '" + cmd + "'.");
			}
		},
		aliases: ['gtc'],
	},
	[setPokemonSeparateCommand]: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target) {
			const targets = target.split(',');
			this.run(baseCommand, targets[0] + "," + setPokemonCommand + "," + targets.slice(1).join(","));
		},
	},
};
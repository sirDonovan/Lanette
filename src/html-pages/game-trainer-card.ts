import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { IGameTrainerCard } from "../types/storage";
import type { HexCode } from "../types/tools";
import type { User } from "../users";
import { HtmlPageBase } from "./html-page-base";

const backgroundColorsPerRow = 15;
const newerTrainerIdsIncrement = 25;
const olderTrainerIdsIncrement = 24;

const noBackground = 'None';
const baseCommand = 'gametrainercard';
const setPokemonCommand = 'setpokemon';
const previewCommand = 'preview';
const setPokemonSeparateCommand = 'gtcpokemon';
const setBackgroundColorCommand = 'setbackgroundcolor';
const standardBackgroundColorsCommand = 'standardbackgroundcolors';
const lighterBackgroundColorsCommand = 'lighterbackgroundcolors';
const darkerBackgroundColorsCommand = 'darkerbackgroundcolors';
const setTrainerCommand = 'settrainer';
const newerTrainersCommand = 'newertrainers';
const olderTrainersCommand = 'oldertrainers';
const goToTrainerPageCommand = 'gototrainerspage';
const closeCommand = 'close';

const pages: Dict<GameTrainerCard> = {};

class GameTrainerCard extends HtmlPageBase {
	static trainerSprites: Dict<string> = {};
	static standardBackgroundColors: HexCode[] = [];
	static standardBackgroundColorsLength: number = 0;
	static lighterBackgroundColors: HexCode[] = [];
	static lighterBackgroundColorsLength: number = 0;
	static darkerBackgroundColors: HexCode[] = [];
	static darkerBackgroundColorsLength: number = 0;
	static newerTrainerIds: string[] = [];
	static newerTrainerIdsLength: number = 0;
	static newerTrainerIdsPages: number = 0;
	static olderTrainerIds: string[] = [];
	static olderTrainerIdsLength: number = 0;
	static olderTrainerIdsPages: number = 0;
	static loadedData: boolean = false;

	backgroundColorType: 'standard' | 'lighter' | 'darker' = 'standard';
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

		const colors = Object.keys(Tools.hexCodes) as HexCode[];
		for (const color of colors) {
			if (Tools.hexCodes[color].category === 'light') {
				this.lighterBackgroundColors.push(color);
			} else if (Tools.hexCodes[color].category === 'dark') {
				this.darkerBackgroundColors.push(color);
			} else {
				this.standardBackgroundColors.push(color);
			}
		}

		this.newerTrainerIdsLength = this.newerTrainerIds.length;
		this.olderTrainerIdsLength = this.olderTrainerIds.length;

		this.newerTrainerIdsPages = Math.ceil(this.newerTrainerIdsLength / newerTrainerIdsIncrement);
		this.olderTrainerIdsPages = Math.ceil(this.olderTrainerIdsLength / olderTrainerIdsIncrement);

		this.standardBackgroundColorsLength = this.standardBackgroundColors.length;
		this.lighterBackgroundColorsLength = this.lighterBackgroundColors.length;
		this.darkerBackgroundColorsLength = this.darkerBackgroundColors.length;

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

		let html = "<div class='chat' style='margin-top: 4px;margin-left: 4px'><center><b>" + this.room.title + ": Game Trainer Card</b>";
		html += "&nbsp;" + Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " + closeCommand,
			"Close");

		const currentCard = Games.getTrainerCardHtml(this.room, name);
		if (currentCard) {
			html += "<br /><br />" + currentCard + "<br />";
		}
		html += "</center>";

		html += "<b>Pokemon icons</b><br />";
		html += "Choose your icons by PMing " + Users.self.name + " <code>" + Config.commandCharacter + setPokemonSeparateCommand + " " +
			this.room.title + ", [Pokemon], [Pokemon], [...]</code>";
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
			backgroundColors = GameTrainerCard.standardBackgroundColors;
			totalBackgroundColors = GameTrainerCard.standardBackgroundColorsLength;
		} else if (lighterBackgroundColors) {
			backgroundColors = GameTrainerCard.lighterBackgroundColors;
			totalBackgroundColors = GameTrainerCard.lighterBackgroundColorsLength;
		} else {
			backgroundColors = GameTrainerCard.darkerBackgroundColors;
			totalBackgroundColors = GameTrainerCard.darkerBackgroundColorsLength;
		}

		html += Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " +
				setBackgroundColorCommand + "," + noBackground, "None", !trainerCard || !trainerCard.background);

		let backgroundColorsRowCount = 1;
		for (let i = 0; i < totalBackgroundColors; i++) {
			const color = backgroundColors[i];
			const colorDiv = "<div style='background: " + Tools.hexCodes[color].gradient + ";height: 15px;width: 15px'>&nbsp;</div>";

			if (backgroundColorsRowCount || i === 0) html += "&nbsp;";
			html += Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " +
				setBackgroundColorCommand + "," + color, colorDiv, trainerCard && trainerCard.background === color);

			backgroundColorsRowCount++;
			if (backgroundColorsRowCount === backgroundColorsPerRow) {
				html += "<br />";
				backgroundColorsRowCount = 0;
			}
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

		let totalTrainers = 0;
		let totalPages = 0;
		let trainersPerRow = 0;
		let trainerIdsStartIndex = 0;
		let trainerIdsEndIndex = 0;
		if (newerTrainers) {
			totalTrainers = GameTrainerCard.newerTrainerIdsLength;
			totalPages = GameTrainerCard.newerTrainerIdsPages;
			trainersPerRow = 5;
			trainerIdsStartIndex = this.trainerIdsPage * newerTrainerIdsIncrement;
			trainerIdsEndIndex = (this.trainerIdsPage + 1) * newerTrainerIdsIncrement;
			if (trainerIdsEndIndex > GameTrainerCard.newerTrainerIdsLength) trainerIdsEndIndex = GameTrainerCard.newerTrainerIdsLength;
		} else if (olderTrainers) {
			totalTrainers = GameTrainerCard.olderTrainerIdsLength;
			totalPages = GameTrainerCard.olderTrainerIdsPages;
			trainersPerRow = 4;
			trainerIdsStartIndex = this.trainerIdsPage * olderTrainerIdsIncrement;
			trainerIdsEndIndex = (this.trainerIdsPage + 1) * olderTrainerIdsIncrement;
			if (trainerIdsEndIndex > GameTrainerCard.olderTrainerIdsLength) trainerIdsEndIndex = GameTrainerCard.olderTrainerIdsLength;
		}

		html += "<br />Trainers (" + (trainerIdsStartIndex + 1) + "-" + trainerIdsEndIndex + "/" + totalTrainers + "):&nbsp;";

		for (let i = 0; i < totalPages; i++) {
			const page = "" + (i + 1);
			html += Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " + goToTrainerPageCommand +
				", " + page, page, this.trainerIdsPage === i) + "&nbsp;";
		}

		html += "<br /><br />";

		let trainersRowCount = 0;
		for (let i = trainerIdsStartIndex; i < trainerIdsEndIndex; i++) {
			let id: string;
			if (newerTrainers) {
				id = GameTrainerCard.newerTrainerIds[i];
			} else {
				id = GameTrainerCard.olderTrainerIds[i];
			}

			const trainer = GameTrainerCard.trainerSprites[id] + "<br />" + Dex.data.trainerSprites[id];
			html += Client.getPmSelfButton(Config.commandCharacter + baseCommand + " " + this.room.title + ", " + setTrainerCommand +
				"," + id, trainer, trainerCard && trainerCard.avatar === id);

			trainersRowCount++;
			if (trainersRowCount === trainersPerRow) {
				html += "<br />";
				trainersRowCount = 0;
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
				if (checkBits && Config.gameTrainerCardRequirements[targetRoom.id].pokemon.one > 0 &&
					annualBits < Config.gameTrainerCardRequirements[targetRoom.id].pokemon.one) {
					return this.say("You need at least " + Config.gameTrainerCardRequirements[targetRoom.id].pokemon.one + " annual " +
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

				const selectedPokemonLength = selectedPokemon.length;
				if (!selectedPokemonLength) return this.say("You must specify at least 1 Pokemon.");

				if (checkBits) {
					let requirement: 'two' | 'three' | 'four' | 'five' | 'six' | undefined;
					if (selectedPokemonLength === 2) {
						requirement = 'two';
					} else if (selectedPokemonLength === 3) {
						requirement = 'three';
					} else if (selectedPokemonLength === 4) {
						requirement = 'four';
					} else if (selectedPokemonLength === 5) {
						requirement = 'five';
					} else if (selectedPokemonLength === 6) {
						requirement = 'six';
					}

					if (requirement) {
						const requiredBits = Config.gameTrainerCardRequirements[targetRoom.id].pokemon[requirement];
						if (requiredBits > 0 && annualBits < requiredBits) {
							return this.say("You need at least " + requiredBits + " annual bits to add " + selectedPokemonLength + " " +
								"Pokemon icons to your game trainer card.");
						}
					}
				}

				Storage.createGameTrainerCard(database, user.name);
				database.gameTrainerCards[user.id].pokemon = selectedPokemon;

				if (!(user.id in pages)) new GameTrainerCard(targetRoom, user);
				pages[user.id].send();
			} else if (cmd === setTrainerCommand || cmd === 'setavatar') {
				const id = Tools.toId(targets[0]);
				if (!(id in Dex.data.trainerSprites)) {
					return this.say("'" + targets[0].trim() + "' is not a valid trainer sprite.");
				}

				Storage.createGameTrainerCard(database, user.name);
				database.gameTrainerCards[user.id].avatar = id;

				if (!(user.id in pages)) new GameTrainerCard(targetRoom, user);
				pages[user.id].send();
			} else if (cmd === setBackgroundColorCommand || cmd === 'setbgcolor' || cmd === 'setbackground') {
				const color = targets[0].trim();
				const clear = color === noBackground;
				if (!clear && !(color in Tools.hexCodes)) {
					return this.say("'" + color + "' is not a valid background color.");
				}

				Storage.createGameTrainerCard(database, user.name);
				if (clear) {
					delete database.gameTrainerCards[user.id].background;
				} else {
					database.gameTrainerCards[user.id].background = color as HexCode;
				}

				if (!(user.id in pages)) new GameTrainerCard(targetRoom, user);
				pages[user.id].send();
			} else if (cmd === standardBackgroundColorsCommand) {
				if (!(user.id in pages)) new GameTrainerCard(targetRoom, user);
				pages[user.id].standardBackgroundColors();
			} else if (cmd === lighterBackgroundColorsCommand) {
				if (!(user.id in pages)) new GameTrainerCard(targetRoom, user);
				pages[user.id].lighterBackgroundColors();
			} else if (cmd === darkerBackgroundColorsCommand) {
				if (!(user.id in pages)) new GameTrainerCard(targetRoom, user);
				pages[user.id].darkerBackgroundColors();
			} else if (cmd === goToTrainerPageCommand) {
				let page = 0;
				if (targets.length) {
					page = parseInt(targets[0].trim());
				}
				if (isNaN(page) || page <= 0) return this.say("You must specify a valid page number.");

				if (!(user.id in pages)) new GameTrainerCard(targetRoom, user);
				pages[user.id].goToTrainersPage(page - 1);
			} else if (cmd === newerTrainersCommand) {
				if (!(user.id in pages)) new GameTrainerCard(targetRoom, user);
				pages[user.id].newerTrainers();
			} else if (cmd === olderTrainersCommand) {
				if (!(user.id in pages)) new GameTrainerCard(targetRoom, user);
				pages[user.id].olderTrainers();
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
import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { TrainerSpriteId } from "../types/dex";
import type { IGameTrainerCard } from "../types/storage";
import type { HexCode } from "../types/tools";
import type { User } from "../users";
import { ColorPicker } from "./components/color-picker";
import type { IPageElement } from "./components/pagination";
import { Pagination } from "./components/pagination";
import { HtmlPageBase } from "./html-page-base";

const pagesLabel = "Trainers";

const baseCommand = 'gametrainercard';
const setPokemonCommand = 'setpokemon';
const previewCommand = 'preview';
const setPokemonSeparateCommand = 'gtcpokemon';
const chooseBackgroundColorPicker = 'choosebackgroundcolorpicker';
const chooseTrainerPicker = 'choosetrainerpicker';
const setBackgroundColorCommand = 'setbackgroundcolor';
const setTrainerCommand = 'settrainer';
const newerTrainersCommand = 'newertrainers';
const olderTrainersCommand = 'oldertrainers';
const trainersListCommand = 'trainerslist';
const noTrainer = "None";
const closeCommand = 'close';

const pages: Dict<GameTrainerCard> = {};

class GameTrainerCard extends HtmlPageBase {
	static trainerSprites: Dict<string> = {};
	static trainerNames: Dict<string> = {};
	static newerTrainerIds: string[] = [];
	static olderTrainerIds: string[] = [];
	static loadedData: boolean = false;

	pageId = 'game-trainer-card';

	currentPicker: 'background' | 'trainer' = 'background';
	trainerType: 'newer' | 'older';

	backgroundColorPicker: ColorPicker;
	currentTrainerId: TrainerSpriteId | undefined;
	newerTrainersPagination: Pagination;
	olderTrainersPagination: Pagination;
	trainerElements: Dict<IPageElement> = {};
	noTrainerElement: IPageElement = {html: ""};

	constructor(room: Room, user: User) {
		super(room, user, baseCommand);

		GameTrainerCard.loadData();

		const database = Storage.getDatabase(this.room);
		let trainerCard: IGameTrainerCard | undefined;
		if (database.gameTrainerCards && this.userId in database.gameTrainerCards) trainerCard = database.gameTrainerCards[this.userId];

		this.currentTrainerId = trainerCard ? trainerCard.avatar : undefined;
		this.trainerType = this.currentTrainerId && GameTrainerCard.olderTrainerIds.includes(this.currentTrainerId) ? 'older' : 'newer';
		this.noTrainerElement.selected = !this.currentTrainerId;
		this.noTrainerElement.html = this.renderNoTrainerElement();

		this.backgroundColorPicker = new ColorPicker(this.commandPrefix, setBackgroundColorCommand, {
			currentColor: trainerCard ? trainerCard.background : undefined,
			onClearColor: () => this.clearBackgroundColor(),
			onSelectColor: color => this.setBackgroundColor(color),
			onUpdateView: () => this.send(),
		});

		for (const i in GameTrainerCard.trainerNames) {
			this.trainerElements[i] = {html: this.renderTrainerElement(i), selected: i === this.currentTrainerId};
		}

		this.newerTrainersPagination = new Pagination(this.commandPrefix, trainersListCommand, {
			elements: [this.noTrainerElement].concat(GameTrainerCard.newerTrainerIds.map(x => this.trainerElements[x])),
			elementsPerRow: 5,
			rowsPerPage: 3,
			pagesLabel,
			onSelectPage: () => this.selectTrainersPage(),
		});
		this.newerTrainersPagination.active = false;

		this.olderTrainersPagination = new Pagination(this.commandPrefix, trainersListCommand, {
			elements: [this.noTrainerElement].concat(GameTrainerCard.olderTrainerIds.map(x => this.trainerElements[x])),
			elementsPerRow: 4,
			rowsPerPage: 3,
			pagesLabel,
			onSelectPage: () => this.selectTrainersPage(),
		});
		this.olderTrainersPagination.active = false;

		this.components = [this.backgroundColorPicker, this.newerTrainersPagination, this.olderTrainersPagination];

		pages[this.userId] = this;
	}

	static loadData(): void {
		if (this.loadedData) return;

		const trainerSprites = Dex.getData().trainerSprites;
		for (const i in trainerSprites) {
			this.trainerSprites[i] = Dex.getTrainerSprite(trainerSprites[i]);
			this.trainerNames[i] = trainerSprites[i];
			if (trainerSprites[i].includes("-gen")) {
				this.olderTrainerIds.push(i);
			} else {
				this.newerTrainerIds.push(i);
			}
		}

		this.loadedData = true;
	}

	onClose(): void {
		delete pages[this.userId];
	}

	chooseBackgroundColorPicker(): void {
		if (this.currentPicker === 'background') return;

		this.backgroundColorPicker.active = true;
		this.newerTrainersPagination.active = false;
		this.olderTrainersPagination.active = false;
		this.currentPicker = 'background';

		this.send();
	}

	chooseTrainerPicker(): void {
		if (this.currentPicker === 'trainer') return;

		this.backgroundColorPicker.active = false;
		if (this.trainerType === 'newer') {
			this.newerTrainersPagination.active = true;
		} else {
			this.olderTrainersPagination.active = true;
		}
		this.currentPicker = 'trainer';

		this.send();
	}

	renderTrainerElement(trainerId: string): string {
		const currentTrainer = this.currentTrainerId === trainerId;
		const trainer = GameTrainerCard.trainerSprites[trainerId] + "<br />" + GameTrainerCard.trainerNames[trainerId];
		return Client.getPmSelfButton(this.commandPrefix + ", " + setTrainerCommand + "," + trainerId, trainer,
			currentTrainer);
	}

	renderNoTrainerElement(): string {
		return Client.getPmSelfButton(this.commandPrefix + ", " + setTrainerCommand + ", " + noTrainer, "None",
			!this.currentTrainerId);
	}

	selectTrainersPage(): void {
		this.send();
	}

	clearBackgroundColor(): void {
		const database = Storage.getDatabase(this.room);
		Storage.createGameTrainerCard(database, this.userId);
		delete database.gameTrainerCards![this.userId].background;

		this.send();
	}

	setBackgroundColor(color: HexCode): void {
		const database = Storage.getDatabase(this.room);
		Storage.createGameTrainerCard(database, this.userId);
		database.gameTrainerCards![this.userId].background = color;

		this.send();
	}

	newerTrainers(): void {
		if (this.trainerType === 'newer') return;

		this.trainerType = 'newer';
		this.newerTrainersPagination.active = true;
		this.olderTrainersPagination.active = false;

		this.send();
	}

	olderTrainers(): void {
		if (this.trainerType === 'older') return;

		this.trainerType = 'older';
		this.olderTrainersPagination.active = true;
		this.newerTrainersPagination.active = false;

		this.send();
	}

	clearTrainer(): void {
		const previousTrainer = this.currentTrainerId;
		this.currentTrainerId = undefined;
		if (previousTrainer) {
			this.trainerElements[previousTrainer].html = this.renderTrainerElement(previousTrainer);
			this.trainerElements[previousTrainer].selected = false;
		}
		this.noTrainerElement.html = this.renderNoTrainerElement();
		this.noTrainerElement.selected = true;

		const database = Storage.getDatabase(this.room);
		Storage.createGameTrainerCard(database, this.userId);
		delete database.gameTrainerCards![this.userId].avatar;

		this.send();
	}

	selectTrainer(trainer: TrainerSpriteId): void {
		const previousTrainer = this.currentTrainerId;
		this.currentTrainerId = trainer;
		if (previousTrainer) {
			this.trainerElements[previousTrainer].html = this.renderTrainerElement(previousTrainer);
			this.trainerElements[previousTrainer].selected = false;
		} else {
			this.noTrainerElement.html = this.renderNoTrainerElement();
			this.noTrainerElement.selected = false;
		}
		this.trainerElements[this.currentTrainerId].html = this.renderTrainerElement(this.currentTrainerId);
		this.trainerElements[this.currentTrainerId].selected = true;

		const database = Storage.getDatabase(this.room);
		Storage.createGameTrainerCard(database, this.userId);
		database.gameTrainerCards![this.userId].avatar = trainer;

		this.send();
	}

	render(): string {
		let name = this.userId;
		const user = Users.get(this.userId);
		if (user) name = user.name;

		let html = "<div class='chat' style='margin-top: 4px;margin-left: 4px'><center><b>" + this.room.title + ": Game Trainer Card</b>";
		html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + closeCommand, "Close");

		html += "<br />";
		const currentCard = Games.getTrainerCardHtml(this.room, name);
		if (currentCard) {
			html += currentCard;
		} else {
			html += "<br /><b>Select a Pokemon or trainer to see your preview</b>!";
		}
		html += "<br />";
		html += "</center>";

		html += "<b>Pokemon icons</b><br />";
		html += "Choose your icons by PMing " + Users.self.name + " <code>" + Config.commandCharacter + setPokemonSeparateCommand + " " +
			this.room.title + ", [Pokemon], [Pokemon], [...]</code>";
		html += "<br /><br />";

		html += Client.getPmSelfButton(this.commandPrefix + ", " + chooseBackgroundColorPicker, "Choose background",
			this.currentPicker === 'background');
		html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + chooseTrainerPicker, "Choose trainer",
			this.currentPicker === 'trainer');
		html += "<br /><br />";

		if (this.currentPicker === 'background') {
			html += "<b>Background color</b><br />";
			html += this.backgroundColorPicker.render();
		} else {
			const newerTrainers = this.trainerType === 'newer';
			const olderTrainers = this.trainerType === 'older';

			html += "<b>Trainer sprite</b><br />";
			html += "Type:&nbsp;";
			html += "&nbsp;";
			html += Client.getPmSelfButton(this.commandPrefix + ", " + newerTrainersCommand, "Newer gen", newerTrainers);
			html += "&nbsp;";
			html += Client.getPmSelfButton(this.commandPrefix + ", " + olderTrainersCommand, "Older gen", olderTrainers);
			html += "<br />";

			html += "<br />";
			if (newerTrainers) {
				html += this.newerTrainersPagination.render();
			} else {
				html += this.olderTrainersPagination.render();
			}
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
				const trainer = targets[0].trim();
				const cleared = trainer === noTrainer;
				if (!cleared && !(trainer in Dex.getData().trainerSprites)) {
					return this.say("'" + targets[0].trim() + "' is not a valid trainer sprite.");
				}

				if (!(user.id in pages)) new GameTrainerCard(targetRoom, user);

				if (cleared) {
					pages[user.id].clearTrainer();
				} else {
					pages[user.id].selectTrainer(trainer as TrainerSpriteId);
				}
			} else if (cmd === newerTrainersCommand) {
				if (!(user.id in pages)) new GameTrainerCard(targetRoom, user);
				pages[user.id].newerTrainers();
			} else if (cmd === olderTrainersCommand) {
				if (!(user.id in pages)) new GameTrainerCard(targetRoom, user);
				pages[user.id].olderTrainers();
			} else if (cmd === chooseBackgroundColorPicker) {
				if (!(user.id in pages)) new GameTrainerCard(targetRoom, user);
				pages[user.id].chooseBackgroundColorPicker();
			} else if (cmd === chooseTrainerPicker) {
				if (!(user.id in pages)) new GameTrainerCard(targetRoom, user);
				pages[user.id].chooseTrainerPicker();
			} else if (cmd === closeCommand) {
				if (!(user.id in pages)) new GameTrainerCard(targetRoom, user);
				pages[user.id].close();
			} else {
				if (!(user.id in pages)) new GameTrainerCard(targetRoom, user);
				const error = pages[user.id].checkComponentCommands(cmd, targets);
				if (error) this.say(error);
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
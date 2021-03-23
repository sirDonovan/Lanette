import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { IGameTrainerCard } from "../types/storage";
import type { HexCode } from "../types/tools";
import type { User } from "../users";
import { ColorPicker } from "./components/color-picker";
import { TrainerPicker } from "./components/trainer-picker";
import type { ITrainerChoice } from "./game-host-control-panel";
import { HtmlPageBase } from "./html-page-base";

const baseCommand = 'gametrainercard';
const setPokemonCommand = 'setpokemon';
const previewCommand = 'preview';
const setPokemonSeparateCommand = 'gtcpokemon';
const chooseBackgroundColorPicker = 'choosebackgroundcolorpicker';
const chooseTrainerPicker = 'choosetrainerpicker';
const setBackgroundColorCommand = 'setbackgroundcolor';
const setTrainerCommand = 'settrainer';
const closeCommand = 'close';

const pages: Dict<GameTrainerCard> = {};

class GameTrainerCard extends HtmlPageBase {

	pageId = 'game-trainer-card';

	currentPicker: 'background' | 'trainer' = 'background';

	backgroundColorPicker: ColorPicker;
	trainerPicker: TrainerPicker;

	constructor(room: Room, user: User) {
		super(room, user, baseCommand);

		const database = Storage.getDatabase(this.room);
		let trainerCard: IGameTrainerCard | undefined;
		if (database.gameTrainerCards && this.userId in database.gameTrainerCards) trainerCard = database.gameTrainerCards[this.userId];

		this.backgroundColorPicker = new ColorPicker(this.commandPrefix, setBackgroundColorCommand, {
			currentColor: trainerCard ? trainerCard.background : undefined,
			onClearColor: () => this.clearBackgroundColor(),
			onSelectColor: color => this.setBackgroundColor(color),
			onUpdateView: () => this.send(),
		});

		this.trainerPicker = new TrainerPicker(this.commandPrefix, setTrainerCommand, {
			currentTrainer: trainerCard ? trainerCard.avatar : undefined,
			onSetTrainerGen: () => this.send(),
			onClearTrainer: () => this.clearTrainer(),
			onSelectTrainer: (index, trainer) => this.selectTrainer(trainer),
			onUpdateView: () => this.send(),
		});
		this.trainerPicker.active = false;

		this.components = [this.backgroundColorPicker, this.trainerPicker];

		pages[this.userId] = this;
	}

	onClose(): void {
		delete pages[this.userId];
	}

	chooseBackgroundColorPicker(): void {
		if (this.currentPicker === 'background') return;

		this.backgroundColorPicker.active = true;
		this.trainerPicker.active = false;
		this.currentPicker = 'background';

		this.send();
	}

	chooseTrainerPicker(): void {
		if (this.currentPicker === 'trainer') return;

		this.trainerPicker.active = true;
		this.backgroundColorPicker.active = false;
		this.currentPicker = 'trainer';

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

	clearTrainer(): void {
		const database = Storage.getDatabase(this.room);
		Storage.createGameTrainerCard(database, this.userId);
		delete database.gameTrainerCards![this.userId].avatar;

		this.send();
	}

	selectTrainer(trainer: ITrainerChoice): void {
		const database = Storage.getDatabase(this.room);
		Storage.createGameTrainerCard(database, this.userId);
		database.gameTrainerCards![this.userId].avatar = trainer.trainer;

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
			html += this.trainerPicker.render();
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

			if (!cmd) {
				if (!(user.id in pages)) {
					new GameTrainerCard(targetRoom, user).open();
				} else {
					pages[user.id].send();
				}
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
			} else if (cmd === chooseBackgroundColorPicker) {
				if (!(user.id in pages)) new GameTrainerCard(targetRoom, user);
				pages[user.id].chooseBackgroundColorPicker();
			} else if (cmd === chooseTrainerPicker) {
				if (!(user.id in pages)) new GameTrainerCard(targetRoom, user);
				pages[user.id].chooseTrainerPicker();
			} else if (cmd === closeCommand) {
				if (!(user.id in pages)) new GameTrainerCard(targetRoom, user);
				pages[user.id].close();
				delete pages[user.id];
			} else {
				if (!(user.id in pages)) new GameTrainerCard(targetRoom, user);
				const error = pages[user.id].checkComponentCommands(cmd, targets);
				if (error) this.say(error);
			}
		},
		aliases: ['gtc'],
	},
	[setPokemonSeparateCommand]: {
		command(target) {
			const targets = target.split(',');
			this.run(baseCommand, targets[0] + "," + setPokemonCommand + "," + targets.slice(1).join(","));
		},
	},
};
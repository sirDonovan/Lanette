import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { IDatabase, IGameTrainerCard } from "../types/storage";
import type { User } from "../users";
import type { IColorPick } from "./components/color-picker";
import { ColorPicker } from "./components/color-picker";
import { PokemonChoices, PokemonPickerBase } from "./components/pokemon-picker-base";
import { TrainerPicker } from "./components/trainer-picker";
import type { ITrainerPick } from "./components/trainer-picker";
import { CLOSE_COMMAND, HtmlPageBase } from "./html-page-base";
import { PokemonTextInput } from "./components/pokemon-text-input";

const baseCommand = 'gametrainercard';
const previewCommand = 'preview';
const chooseBackgroundColorPicker = 'choosebackgroundcolorpicker';
const chooseTrainerPicker = 'choosetrainerpicker';
const choosePokemonPicker = 'choosepokemonpicker';
const setBackgroundColorCommand = 'setbackgroundcolor';
const setPokemonCommand = 'setpokemon';
const setTrainerCommand = 'settrainer';

export const pageId = 'game-trainer-card';
export const pages: Dict<GameTrainerCard> = {};

class GameTrainerCard extends HtmlPageBase {
	pageId = pageId;

	currentPicker: 'background' | 'trainer' | 'pokemon' = 'background';
	currentPokemon: PokemonChoices = [];

	backgroundColorPicker: ColorPicker;
	trainerPicker: TrainerPicker;
	pokemonPicker: PokemonTextInput;
	maxIcons: number;

	constructor(room: Room, user: User, maxIcons: number) {
		super(room, user, baseCommand, pages);

		this.setCloseButtonHtml();

		const database = Storage.getDatabase(this.room);
		let trainerCard: IGameTrainerCard | undefined;
		if (database.gameTrainerCards && this.userId in database.gameTrainerCards) trainerCard = database.gameTrainerCards[this.userId];

		this.backgroundColorPicker = new ColorPicker(this, this.commandPrefix, setBackgroundColorCommand, {
			name: "Background",
			currentPick: trainerCard && typeof trainerCard.background === 'string' ? trainerCard.background : undefined,
			currentPickObject: trainerCard && trainerCard.background && typeof trainerCard.background !== 'string' ?
				trainerCard.background : undefined,
			pokemon: trainerCard && trainerCard.pokemon.length ? trainerCard.pokemon[0] : undefined,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickBackgroundHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickBackgroundLightness(dontRender),
			onClear: (index, dontRender) => this.clearBackgroundColor(dontRender),
			onPick: (index, color, dontRender) => this.setBackgroundColor(color, dontRender),
			reRender: () => this.send(),
		});

		this.trainerPicker = new TrainerPicker(this, this.commandPrefix, setTrainerCommand, {
			currentPick: trainerCard ? trainerCard.avatar : undefined,
			userId: this.userId,
			onSetTrainerGen: (index, trainerGen, dontRender) => this.setTrainerGen(dontRender),
			onClear: (index, dontRender) => this.clearTrainer(dontRender),
			onPick: (index, trainer, dontRender) => this.selectTrainer(trainer, dontRender),
			reRender: () => this.send(),
		});
		this.trainerPicker.active = false;

		PokemonPickerBase.loadData();

		this.pokemonPicker = new PokemonTextInput(this, this.commandPrefix, setPokemonCommand, {
			currentInput: trainerCard ? trainerCard.pokemon.join(", ") : "",
			inputWidth: Tools.minRoomWidth,
			minPokemon: 1,
			maxPokemon: maxIcons,
			name: "Pokemon",
			placeholder: "Enter all Pokemon",
			clearText: "Clear all",
			submitText: "Update all",
			onClear: () => this.clearPokemonInput(),
			onSubmit: (output) => this.submitAllPokemonInput(output),
			reRender: () => this.send(),
		});
		this.pokemonPicker.active = false;

		this.components = [this.backgroundColorPicker, this.trainerPicker, this.pokemonPicker];

		this.maxIcons = maxIcons;
	}

	getDatabase(): IDatabase {
		const database = Storage.getDatabase(this.room);
		Storage.createGameTrainerCard(database, this.userId);

		return database;
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

	choosePokemonPicker(): void {
		if (this.currentPicker === 'pokemon') return;

		this.pokemonPicker.active = true;
		this.backgroundColorPicker.active = false;
		this.trainerPicker.active = false;
		this.currentPicker = 'pokemon';

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
		delete database.gameTrainerCards![this.userId].background;

		if (!dontRender) this.send();
	}

	setBackgroundColor(color: IColorPick, dontRender?: boolean): void {
		const database = this.getDatabase();
		database.gameTrainerCards![this.userId].background = Tools.colorPickToStorage(color);

		if (!dontRender) this.send();
	}

	setTrainerGen(dontRender?: boolean): void {
		if (!dontRender) this.send();
	}

	clearTrainer(dontRender?: boolean): void {
		const database = this.getDatabase();
		delete database.gameTrainerCards![this.userId].avatar;
		delete database.gameTrainerCards![this.userId].customAvatar;

		if (!dontRender) this.send();
	}

	selectTrainer(trainer: ITrainerPick, dontRender?: boolean): void {
		const database = this.getDatabase();
		database.gameTrainerCards![this.userId].avatar = trainer.trainer;
		database.gameTrainerCards![this.userId].customAvatar = !!trainer.customAvatar;

		if (!dontRender) this.send();
	}

	clearPokemonInput(): void {
		this.currentPokemon = [];

		this.storePokemon();

		this.send();
	}

	submitAllPokemonInput(output: PokemonChoices): void {
		this.currentPokemon = output;

		this.storePokemon();

		this.send();
	}

	storePokemon(): void {
		const database = this.getDatabase();
		database.gameTrainerCards![this.userId].pokemon = this.currentPokemon.filter(x => x !== undefined).map(x => x.pokemon);
	}

	render(): string {
		let name = this.userId;
		const user = Users.get(this.userId);
		if (user) name = user.name;

		let html = "<div class='chat' style='margin-top: 4px;margin-left: 4px'><center><b>" + this.room.title + ": Game Trainer Card</b>";
		html += "&nbsp;" + this.closeButtonHtml;

		html += "<br />";
		const currentCard = Games.getTrainerCardHtml(this.room, name);
		if (currentCard) {
			html += currentCard;
		} else {
			html += "<br /><b>Select a Pokemon or trainer to see your preview</b>!";
		}
		html += "<br />";
		html += "</center>";

		const background = this.currentPicker === 'background';
		const trainer = this.currentPicker === 'trainer';
		const pokemon = this.currentPicker === 'pokemon';

		html += this.getQuietPmButton(this.commandPrefix + ", " + chooseBackgroundColorPicker, "Background",
			{selectedAndDisabled: background});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseTrainerPicker, "Trainer",
			{selectedAndDisabled: trainer});
		if (this.maxIcons) {
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + choosePokemonPicker, "Pokemon",
				{selectedAndDisabled: pokemon});
		}
		html += "<br /><br />";

		if (background) {
			html += "<b>Background color</b><br />";
			html += this.backgroundColorPicker.render();
		} else if (trainer) {
			html += this.trainerPicker.render();
		} else {
			html += "<b>Pokemon icon</b><br />";
			html += this.pokemonPicker.render();
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

			let maxIcons = checkBits ? 0 : 6;
			if (checkBits && (!cmd || !(user.id in pages))) {
				for (let i = 6; i >= 1; i--) {
					let requirement: 'one' | 'two' | 'three' | 'four' | 'five' | 'six';
					if (i === 6) {
						requirement = 'six';
					} else if (i === 5) {
						requirement = 'five';
					} else if (i === 4) {
						requirement = 'four';
					} else if (i === 3) {
						requirement = 'three';
					} else if (i === 2) {
						requirement = 'two';
					} else {
						requirement = 'one';
					}

					const requiredBits = Config.gameTrainerCardRequirements[targetRoom.id].pokemon[requirement];
					if (requiredBits > 0 && annualBits >= requiredBits) {
						maxIcons = i;
						break;
					}
				}
			}

			if (!cmd) {
				new GameTrainerCard(targetRoom, user, maxIcons).open();
				return;
			}

			if (cmd === 'view' || cmd === 'show' || cmd === previewCommand) {
				const trainerCard = Games.getTrainerCardHtml(targetRoom, user.name);
				if (!trainerCard) return this.say("You do not have a game trainer card.");
				targetRoom.pmUhtml(user, targetRoom.id + "-game-trainer-card", trainerCard);
				return;
			}

			if (!(user.id in pages) && cmd !== CLOSE_COMMAND) new GameTrainerCard(targetRoom, user, maxIcons);

			if (cmd === chooseBackgroundColorPicker) {
				pages[user.id].chooseBackgroundColorPicker();
			} else if (cmd === chooseTrainerPicker) {
				pages[user.id].chooseTrainerPicker();
			} else if (cmd === choosePokemonPicker) {
				pages[user.id].choosePokemonPicker();
			} else if (cmd === CLOSE_COMMAND) {
				if (user.id in pages) pages[user.id].close();
			} else {
				const error = pages[user.id].checkComponentCommands(cmd, targets);
				if (error) this.say(error);
			}
		},
		aliases: ['gtc'],
	},
};
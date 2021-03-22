import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { GifGeneration, TrainerSpriteId } from "../types/dex";
import type { IRandomGameAnswer } from "../types/games";
import type { HexCode } from "../types/tools";
import type { User } from "../users";
import type { HueVariation, Lightness } from "./components/color-picker";
import { CustomHostDisplay } from "./components/custom-host-display";
import { RandomHostDisplay } from "./components/random-host-display";
import type { TrainerGen } from "./components/trainer-picker";
import { HtmlPageBase } from "./html-page-base";

export interface IPokemonChoice {
	pokemon: string;
	shiny?: boolean;
}

export interface ITrainerChoice {
	trainer: TrainerSpriteId;
	gen: TrainerGen;
}

export type PokemonChoices = (IPokemonChoice | undefined)[];
export type TrainerChoices = (ITrainerChoice | undefined)[];
export type GifIcon = 'gif' | 'icon';

const excludedHintGames: string[] = ['hypnoshunches', 'mareaniesmarquees', 'pikachusmysterypokemon', 'smearglesmysterymoves',
'zygardesorders'];

const baseCommand = 'gamehostcontrolpanel';
const refreshTimeCommand = 'refreshtime';
const chooseCustomDisplay = 'choosecustomdisplay';
const chooseRandomDisplay = 'chooserandomdisplay';
const chooseGenerateHints = 'choosegeneratehints';
const customHostDisplayCommand = 'customhostdisplay';
const randomHostDisplayCommand = 'randomhostdisplay';
const generateHintCommand = 'generatehint';
const sendDisplayCommand = 'senddisplay';

const closeCommand = 'close';

const maxGifs = 6;
const maxIcons = 30;
const maxTrainers = 6;

const pages: Dict<GameHostControlPanel> = {};

class GameHostControlPanel extends HtmlPageBase {
	static compatibleHintGames: string[] = [];
	static GameHostControlPanelLoaded: boolean = false;

	pageId = 'game-host-control-panel';

	currentView: 'customdisplay' | 'randomdisplay' | 'generatehints' = 'customdisplay';
	currentBackgroundColor: HexCode | undefined = undefined;
	currentPokemon: PokemonChoices = [];
	currentTrainers: TrainerChoices = [];
	generateHintsGameHtml: string = '';
	generatedAnswer: IRandomGameAnswer | undefined = undefined;
	gifOrIcon: GifIcon = 'gif';
	pokemonGeneration: GifGeneration = 'xy';

	customHostDisplay: CustomHostDisplay;
	randomHostDisplay: RandomHostDisplay;

	constructor(room: Room, user: User) {
		super(room, user, baseCommand);

		GameHostControlPanel.loadData();

		const hostDisplayProps = {
			maxGifs,
			maxIcons,
			maxTrainers,
			clearBackgroundColor: () => this.clearBackgroundColor(),
			setBackgroundColor: (color: HexCode) => this.setBackgroundColor(color),
			randomizeBackgroundColor: (hueVariation: HueVariation, lightness: Lightness, color: HexCode) => {
				this.randomizeBackgroundColor(hueVariation, lightness, color);
			},
			clearPokemon: (index: number) => this.clearPokemon(index),
			selectPokemon: (index: number, pokemon: IPokemonChoice) => this.selectPokemon(index, pokemon),
			randomizePokemon: (pokemon: PokemonChoices) => this.randomizePokemon(pokemon),
			clearTrainer: (index: number) => this.clearTrainer(index),
			selectTrainer: (index: number, trainer: ITrainerChoice) => this.selectTrainer(index, trainer),
			randomizeTrainers: (trainers: TrainerChoices) => this.randomizeTrainers(trainers),
			setGifOrIcon: (gifOrIcon: GifIcon, currentPokemon: PokemonChoices) => this.setGifOrIcon(gifOrIcon, currentPokemon),
			onUpdateView: () => this.send(),
		};

		this.customHostDisplay = new CustomHostDisplay(this.commandPrefix, customHostDisplayCommand, hostDisplayProps);

		this.randomHostDisplay = new RandomHostDisplay(this.commandPrefix, randomHostDisplayCommand,
			Object.assign({random: true}, hostDisplayProps));
		this.randomHostDisplay.active = false;

		this.components = [this.customHostDisplay, this.randomHostDisplay];

		pages[this.userId] = this;
	}

	static loadData(): void {
		if (this.GameHostControlPanelLoaded) return;

		for (const format of Games.getFormatList()) {
			if (format.canGetRandomAnswer && format.minigameCommand && !excludedHintGames.includes(format.id)) {
				this.compatibleHintGames.push(format.name);
			}
		}

		this.GameHostControlPanelLoaded = true;
	}

	onClose(): void {
		delete pages[this.userId];
	}

	chooseCustomDisplay(): void {
		if (this.currentView === 'customdisplay') return;

		this.customHostDisplay.active = true;
		this.randomHostDisplay.active = false;
		this.currentView = 'customdisplay';

		this.send();
	}

	chooseRandomDisplay(): void {
		if (this.currentView === 'randomdisplay') return;

		this.randomHostDisplay.active = true;
		this.customHostDisplay.active = false;
		this.currentView = 'randomdisplay';

		this.send();
	}

	chooseGenerateHints(): void {
		if (this.currentView === 'generatehints') return;

		this.randomHostDisplay.active = false;
		this.customHostDisplay.active = false;
		this.currentView = 'generatehints';

		this.send();
	}

	clearBackgroundColor(): void {
		this.currentBackgroundColor = undefined;

		this.send();
	}

	setBackgroundColor(color: HexCode): void {
		this.currentBackgroundColor = color;

		this.send();
	}

	randomizeBackgroundColor(hueVariation: HueVariation, lightness: Lightness, color: HexCode): void {
		this.currentBackgroundColor = color;
		this.customHostDisplay.setRandomizedBackgroundColor(hueVariation, lightness, color);

		this.send();
	}

	clearPokemon(index: number): void {
		this.currentPokemon[index] = undefined;

		this.send();
	}

	selectPokemon(index: number, pokemon: IPokemonChoice): void {
		this.currentPokemon[index] = pokemon;

		this.send();
	}

	randomizePokemon(pokemon: PokemonChoices): void {
		this.customHostDisplay.setRandomizedPokemon(pokemon);
		this.currentPokemon = pokemon;

		this.send();
	}

	clearTrainer(index: number): void {
		this.currentTrainers[index] = undefined;

		this.send();
	}

	selectTrainer(index: number, trainer: ITrainerChoice): void {
		this.currentTrainers[index] = trainer;

		this.send();
	}

	randomizeTrainers(trainers: TrainerChoices): void {
		this.customHostDisplay.setRandomizedTrainers(trainers);
		this.currentTrainers = trainers;

		this.send();
	}

	setGifOrIcon(gifOrIcon: GifIcon, currentPokemon: PokemonChoices): void {
		this.gifOrIcon = gifOrIcon;

		if (this.currentView === 'customdisplay') {
			this.randomHostDisplay.setGifOrIcon(gifOrIcon, true);
		} else {
			this.customHostDisplay.setGifOrIcon(gifOrIcon, true);
		}

		this.currentPokemon = currentPokemon;

		this.send();
	}

	generateHint(user: User, name: string): boolean {
		if (!GameHostControlPanel.compatibleHintGames.includes(name)) return false;

		const format = Games.getFormat(name);
		if (Array.isArray(format) || !format.canGetRandomAnswer) return false;

		if (user.game) user.game.deallocate(true);

		const game = Games.createGame(user, format, this.room, true);
		this.generateHintsGameHtml = game.getMascotAndNameHtml(undefined, true);
		this.generatedAnswer = game.getRandomAnswer!();
		game.deallocate(true);

		this.send();

		return true;
	}

	getTrainers(): TrainerSpriteId[] {
		return this.currentTrainers.filter(x => x !== undefined).map(x => x!.trainer);
	}

	getPokemon(): string[] {
		return this.currentPokemon.filter(x => x !== undefined).map(x => x!.pokemon + (x!.shiny ? "|shiny" : ""));
	}

	getHostDisplay(): string {
		return Games.getHostCustomDisplay(this.currentBackgroundColor, this.getTrainers(), this.getPokemon(),
			this.gifOrIcon === 'icon', this.pokemonGeneration);
	}

	render(): string {
		let html = "<div class='chat' style='margin-top: 4px;margin-left: 4px'><center><b>" + this.room.title + ": Hosting Control " +
			"Panel</b>";
		html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + closeCommand, "Close");
		html += "<br /><br />";

		if (this.room.userHostedGame) {
			const user = Users.get(this.userId);
			if (user && this.room.userHostedGame.isHost(user)) {
				html += "<b>Remaining time</b>: " + Tools.toDurationString(this.room.userHostedGame.endTime - Date.now());
				html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + refreshTimeCommand, "Refresh");
				html += "<br /><br />";
			}
		}

		html += "Options:";
		html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + chooseCustomDisplay, "Custom Display",
			this.currentView === 'customdisplay');
		html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + chooseRandomDisplay, "Random Display",
			this.currentView === 'randomdisplay');
		html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + chooseGenerateHints, "Generate Hints",
			this.currentView === 'generatehints');
		html += "</center>";

		if (this.currentView === 'customdisplay' || this.currentView === 'randomdisplay') {
			html += this.getHostDisplay();

			const user = Users.get(this.userId);
			html += "<center>" + Client.getPmSelfButton(this.commandPrefix + ", " + sendDisplayCommand, "Send to " + this.room.title,
				!this.room.userHostedGame || !user || !this.room.userHostedGame.isHost(user)) + "</center>";

			html += "<br /><br />";
			if (this.currentView === 'customdisplay') {
				html += this.customHostDisplay.render();
			} else {
				html += this.randomHostDisplay.render();
			}
		} else {
			if (this.generatedAnswer) {
				html += "<div class='infobox'>" + this.generateHintsGameHtml;
				html += "<br /><br />";
				html += this.generatedAnswer.hint;
				html += "<br /><br />";
				html += "<b>Answer" + (this.generatedAnswer.answers.length > 1 ? "s" : "") + "</b>: " +
					this.generatedAnswer.answers.join(", ") + "</div>";
			} else {
				html += "<br />";
				html += "<center><b>Click on a game's name to generate a hint and see the answer</b>!</center>";
			}
			html += "<br />";

			for (let i = 0; i < GameHostControlPanel.compatibleHintGames.length; i++) {
				const format = Games.getFormat(GameHostControlPanel.compatibleHintGames[i]);
				if (Array.isArray(format) || !format.canGetRandomAnswer) continue;

				if (i > 0) html += "&nbsp;";
				html += Client.getPmSelfButton(this.commandPrefix + ", " + generateHintCommand + ", " + format.name, format.name);
			}
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

			const cmd = Tools.toId(targets[0]);
			targets.shift();

			if (!cmd) {
				new GameHostControlPanel(targetRoom, user).open();
			} else if (cmd === chooseCustomDisplay) {
				if (!(user.id in pages)) new GameHostControlPanel(targetRoom, user);
				pages[user.id].chooseCustomDisplay();
			} else if (cmd === chooseRandomDisplay) {
				if (!(user.id in pages)) new GameHostControlPanel(targetRoom, user);
				pages[user.id].chooseRandomDisplay();
			} else if (cmd === chooseGenerateHints) {
				if (!(user.id in pages)) new GameHostControlPanel(targetRoom, user);
				pages[user.id].chooseGenerateHints();
			} else if (cmd === refreshTimeCommand) {
				if (!(user.id in pages)) new GameHostControlPanel(targetRoom, user);
				pages[user.id].send();
			} else if (cmd === generateHintCommand) {
				const name = targets[0].trim();
				if (!(user.id in pages)) new GameHostControlPanel(targetRoom, user);

				if (!pages[user.id].generateHint(user, name)) this.say("'" + name + "' is not a valid game for generating hints.");
			} else if (cmd === sendDisplayCommand) {
				if (!(user.id in pages) || !targetRoom.userHostedGame || !targetRoom.userHostedGame.isHost(user)) return;

				const page = pages[user.id];
				targetRoom.userHostedGame.sayHostDisplayUhtml(user, page.currentBackgroundColor, page.getTrainers(), page.getPokemon(),
					page.gifOrIcon === 'icon', page.pokemonGeneration);
			} else if (cmd === closeCommand) {
				if (!(user.id in pages)) new GameHostControlPanel(targetRoom, user);
				pages[user.id].close();
				delete pages[user.id];
			} else {
				if (!(user.id in pages)) new GameHostControlPanel(targetRoom, user);
				const error = pages[user.id].checkComponentCommands(cmd, targets);
				if (error) this.say(error);
			}
		},
		aliases: ['ghcp'],
	},
};
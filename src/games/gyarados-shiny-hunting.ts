import type { Player } from "../room-activity";
import type { IGameFile } from "../types/games";
import type { IPokemon } from "../types/pokemon-showdown";
import { game as questionAndAnswerGame, QuestionAndAnswer } from "./templates/question-and-answer";

const MAX_WIDTH = 80;
const MAX_HEIGHT = 80;
const BASE_HORIZONTAL = 4;
const BASE_VERTICAL = 4;
const MAX_HORIZONTAL = 7;
const MAX_VERTICAL = 7;
const MAX_TOTAL_WIDTH = MAX_WIDTH * BASE_HORIZONTAL;
const MAX_TOTAL_HEIGHT = MAX_HEIGHT * BASE_VERTICAL;
const SPRITE_GENERATION = 'bw';

const letters = Tools.letters.toUpperCase().split("");
const data: {pokemon: string[]} = {
	pokemon: [],
};

class GyaradosShinyHunting extends QuestionAndAnswer {
	answerCommands: string[] = ['hunt'];
	canHunt: boolean = false;
	cooldownBetweenRounds: number = 5 * 1000;
	currentPokemon: string = '';
	inactiveRoundLimit: number = 5;
	lastPokemon: string = '';
	lastShinyCoordinates: [number, number][] = [];
	points = new Map<Player, number>();
	roundGridSize: [number, number] = [0, 0];
	roundHorizontalCount: number = 0;
	roundVerticalCount: number = 0;
	shinyCoordinates: [number, number][] | null = null;

	static loadData(): void {
		data.pokemon = Games.getPokemonList(x => {
			if (x.forme || x.gen > 5) return false;
			const gifData = Dex.getGifData(x, SPRITE_GENERATION);
			return !!gifData && gifData.w <= MAX_WIDTH && gifData.h <= MAX_HEIGHT;
		}).map(x => x.name);
	}

	onSignups(): void {
		if (this.format.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
	}

	onStart(): void {
		this.nextRound();
	}

	checkLastShinyCoordinates(newCoordinates: [number, number]): boolean {
		for (const lastShinyCoordinates of this.lastShinyCoordinates) {
			if (newCoordinates[0] === lastShinyCoordinates[0] || newCoordinates[1] === lastShinyCoordinates[1]) return true;
		}

		return false;
	}

	validateShinyCoordinates(x: number, y: number): boolean {
		if (this.shinyCoordinates) {
			for (const shinyCoordinates of this.shinyCoordinates) {
				if (x === shinyCoordinates[0] && y === shinyCoordinates[1]) return true;
			}
		}

		return false;
	}

	getCurrentGif(pokemon: IPokemon): string {
		return Dex.getPokemonGif(pokemon, SPRITE_GENERATION);
	}

	getShinyCurrentGif(pokemon: IPokemon): string {
		return Dex.getPokemonGif(pokemon, SPRITE_GENERATION, undefined, true);
	}

	generateAnswer(): void {
		if (this.shinyCoordinates) {
			this.inactiveRounds++;
			if (this.inactiveRounds === this.inactiveRoundLimit) {
				this.inactivityEnd();
				return;
			}
		} else {
			if (this.inactiveRounds) this.inactiveRounds = 0;
		}

		let species = this.sampleOne(data.pokemon);
		while (species === this.lastPokemon) {
			species = this.sampleOne(data.pokemon);
		}
		this.lastPokemon = species;

		const pokemon = Dex.getExistingPokemon(species);
		this.currentPokemon = pokemon.name;

		const gifData = Dex.getGifData(pokemon, SPRITE_GENERATION)!;
		let horizontalCount = BASE_HORIZONTAL;
		while ((horizontalCount + 1) * gifData.w < MAX_TOTAL_WIDTH) {
			horizontalCount++;
			if (horizontalCount === MAX_HORIZONTAL) break;
		}
		this.roundHorizontalCount = horizontalCount;

		let verticalCount = BASE_VERTICAL;
		while ((verticalCount + 1) * gifData.h < MAX_TOTAL_HEIGHT) {
			verticalCount++;
			if (verticalCount === MAX_VERTICAL) break;
		}
		this.roundVerticalCount = verticalCount;

		this.shinyCoordinates = [];
		const maxShinyCoordinates = this.maxCorrectPlayersPerRound === Infinity ? 1 : this.maxCorrectPlayersPerRound;
		for (let i = 0; i < maxShinyCoordinates; i++) {
			let shinyCoordinates = [this.random(horizontalCount), this.random(verticalCount) + 1] as [number, number];
			let attempts = 0;
			while ((this.checkLastShinyCoordinates(shinyCoordinates) ||
				this.validateShinyCoordinates(shinyCoordinates[0], shinyCoordinates[1])) && attempts < 50) {
				shinyCoordinates = [this.random(horizontalCount), this.random(verticalCount) + 1] as [number, number];
				attempts++;
			}

			this.shinyCoordinates.push(shinyCoordinates);
		}

		this.lastShinyCoordinates = this.shinyCoordinates;
		this.roundGridSize = [horizontalCount - 1, verticalCount];

		this.sayUhtml(this.uhtmlBaseName + '-preview', "<center>Find the shiny <b>" + this.currentPokemon + "</b>!<br />" +
			this.getCurrentGif(pokemon) + "&nbsp;" + this.getShinyCurrentGif(pokemon) + "</center>");

		this.answers = this.shinyCoordinates.map(x => Tools.toId(letters[x[0]] + x[1]));
	}

	getHintHtml(): string {
		const pokemon = Dex.getExistingPokemon(this.currentPokemon);
		const gifData = Dex.getGifData(pokemon, SPRITE_GENERATION)!;
		const tableWidth = (this.roundHorizontalCount + 1) * (gifData.w + 2);
		const rowHeight = gifData.h + 2;
		const lightGray = Tools.getNamedHexCode('Light-Gray');

		let gridHtml = '<table align="center" border="1" ' +
			'style="color: black;font-weight: bold;text-align: center;table-layout: fixed;width: ' +
			tableWidth + 'px"><tr style="height:' + rowHeight + 'px"><td>&nbsp;</td>';
		for (let i = 0; i < this.roundHorizontalCount; i++) {
			gridHtml += '<td style="background: ' + lightGray.gradient + '">' + letters[i] + '</td>';
		}
		gridHtml += '</tr></table>';

		gridHtml += '<table align="center" border="1" ' +
			'style="color: black;font-weight: bold;text-align: center;table-layout: fixed;width: ' + tableWidth + 'px">';

		const gif = this.getCurrentGif(pokemon);
		const shinyGif = this.getShinyCurrentGif(pokemon);
		for (let y = 1; y <= this.roundVerticalCount; y++) {
			gridHtml += '<tr style="height:' + rowHeight + 'px">';
			gridHtml += '<td style="background: ' + lightGray.gradient + '">' + y + '</td>';
			for (let x = 0; x < this.roundHorizontalCount; x++) {
				gridHtml += '<td>';
				if (this.validateShinyCoordinates(x, y)) {
					gridHtml += shinyGif;
				} else {
					gridHtml += gif;
				}
				gridHtml += '</td>';
			}
			gridHtml += '</tr>';
		}
		gridHtml += '</table>';

		return gridHtml;
	}

	beforeNextRound(): boolean {
		if (!this.answers.length) {
			this.sayUhtml(this.uhtmlBaseName + '-round-html', this.getRoundHtml(() => this.getPlayerPoints()));
		}
		return true;
	}

	onEnd(): void {
		this.convertPointsToBits();
		this.announceWinners();
	}

	filterGuess(target: string, player: Player): boolean {
		const targets = Tools.toId(target).split("");
		if (targets.length !== 2) {
			player.say("You must specify a letter and number corresponding to the grid.");
			return true;
		}

		const letter = targets[0].trim().toUpperCase();
		const letterIndex = letters.indexOf(letter);
		if (letterIndex === -1 || letterIndex > this.roundGridSize[0]) {
			player.say("You must specify a letter between " + letters[0] + " and " + letters[this.roundGridSize[0]] + "!");
			return true;
		}

		const number = parseInt(targets[1].trim());
		if (isNaN(number) || number < 1 || number > this.roundGridSize[1]) {
			player.say("You must specify a row between 1 and " + this.roundGridSize[1] + "!");
			return true;
		}

		if (!this.validateShinyCoordinates(letterIndex, number)) {
			player.say("The shiny " + this.currentPokemon + " is not at " + letter + number + "!");
			return true;
		}

		return false;
	}

	getAnswers(): string {
		return "";
	}
}

const commands = Tools.deepClone(questionAndAnswerGame.commands!);
if (!commands.guess.aliases) commands.guess.aliases = [];
commands.guess.aliases.push('hunt');

export const game: IGameFile<GyaradosShinyHunting> = {
	aliases: ["gyarados", "shinyhunting", "gsh"],
	category: 'visual',
	commandDescriptions: [Config.commandCharacter + "hunt [coordinates]"],
	commands,
	class: GyaradosShinyHunting,
	customizableOptions: {
		points: {min: 10, base: 10, max: 10},
	},
	description: "Each round players try to be the first to hunt the shiny Pokemon in the grid!",
	freejoin: true,
	name: "Gyarados' Shiny Hunting",
	mascot: "Gyarados",
	modes: ['multianswer', 'team', 'survival', 'timeattack'],
};

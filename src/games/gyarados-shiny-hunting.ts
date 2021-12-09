import type { Player } from "../room-activity";
import type { ModelGeneration, IGifDirectionData } from "../types/dex";
import type { IGameFile } from "../types/games";
import type { IPokemon } from "../types/pokemon-showdown";
import { game as questionAndAnswerGame, QuestionAndAnswer } from "./templates/question-and-answer";

const BASE_POKEMON_PER_ROW = 4;
const BASE_ROWS_PER_GRID = BASE_POKEMON_PER_ROW;
const MAX_POKEMON_PER_ROW = 7;
const MAX_ROWS_PER_GRID = MAX_POKEMON_PER_ROW;

const BORDER_SPACING = 1;
const MAX_TABLE_WIDTH = Tools.getMaxTableWidth(BORDER_SPACING);
const MAX_TABLE_HEIGHT = Tools.getMaxTableHeight(BORDER_SPACING);
const ADDITIONAL_WIDTH = Tools.getTableCellAdditionalWidth(BORDER_SPACING);
const ADDITIONAL_HEIGHT = Tools.getTableCellAdditionalHeight(BORDER_SPACING, true);
const MAX_POKEMON_WIDTH = Tools.getMaxTableCellWidth(MAX_TABLE_WIDTH, BORDER_SPACING, BASE_POKEMON_PER_ROW);
const MAX_POKEMON_HEIGHT = Tools.getMaxTableCellHeight(MAX_TABLE_HEIGHT, BORDER_SPACING, BASE_ROWS_PER_GRID, true);

const SPRITE_GENERATION: ModelGeneration = 'bw';
const ANSWER_COMMAND = 'hunt';
const LETTERS = Tools.letters.toUpperCase().split("");

class GyaradosShinyHunting extends QuestionAndAnswer {
	static gifData: Dict<IGifDirectionData> = {};
	static gifDataKeys: string[] = [];

	answerCommands: string[] = [ANSWER_COMMAND];
	cooldownBetweenRounds: number = 5 * 1000;
	currentPokemon: string = '';
	inactiveRoundLimit: number = 5;
	lastPokemon: string = '';
	lastShinyCoordinates: [number, number][] = [];
	roundPokemonPerRow: number = 0;
	roundLastLetterIndex: number = 0;
	roundRows: number = 0;
	shinyCoordinates: [number, number][] | null = null;

	static loadData(): void {
		for (const pokemon of Games.getPokemonList()) {
			if (pokemon.forme || pokemon.gen > 5) continue;
			const gifData = Dex.getModelData(pokemon, SPRITE_GENERATION);
			if (gifData && gifData.w && gifData.h && gifData.w <= MAX_POKEMON_WIDTH && gifData.h <= MAX_POKEMON_HEIGHT) {
				this.gifData[pokemon.name] = gifData;
				this.gifDataKeys.push(pokemon.name);
			}
		}
	}

	onSignups(): void {
		if (this.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
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
		return Dex.getPokemonModel(pokemon, SPRITE_GENERATION);
	}

	getShinyCurrentGif(pokemon: IPokemon): string {
		return Dex.getPokemonModel(pokemon, SPRITE_GENERATION, undefined, true);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async customGenerateHint(): Promise<string> {
		let species = this.sampleOne(GyaradosShinyHunting.gifDataKeys);
		while (species === this.lastPokemon) {
			species = this.sampleOne(GyaradosShinyHunting.gifDataKeys);
		}
		this.lastPokemon = species;
		this.currentPokemon = species;

		let pokemonInRow = BASE_POKEMON_PER_ROW;
		while (((pokemonInRow + 1) * (GyaradosShinyHunting.gifData[species].w + ADDITIONAL_WIDTH)) < MAX_TABLE_WIDTH) {
			pokemonInRow++;
			if (pokemonInRow === MAX_POKEMON_PER_ROW) break;
		}

		let rowsInGrid = BASE_ROWS_PER_GRID;
		while (rowsInGrid < pokemonInRow &&
			((rowsInGrid + 1) * (GyaradosShinyHunting.gifData[species].h + ADDITIONAL_HEIGHT)) < MAX_TABLE_HEIGHT) {
			rowsInGrid++;
			if (rowsInGrid === MAX_ROWS_PER_GRID) break;
		}
		this.roundRows = rowsInGrid;

		if (pokemonInRow > rowsInGrid) pokemonInRow = rowsInGrid;
		this.roundPokemonPerRow = pokemonInRow;

		this.shinyCoordinates = [];
		const maxShinyCoordinates = this.maxCorrectPlayersPerRound || 1;
		for (let i = 0; i < maxShinyCoordinates; i++) {
			let shinyCoordinates = this.generateShinyCoordinates(pokemonInRow, rowsInGrid);
			let attempts = 0;
			while ((this.checkLastShinyCoordinates(shinyCoordinates) ||
				this.validateShinyCoordinates(shinyCoordinates[0], shinyCoordinates[1])) && attempts < 50) {
				shinyCoordinates = this.generateShinyCoordinates(pokemonInRow, rowsInGrid);
				attempts++;
			}

			this.shinyCoordinates.push(shinyCoordinates);
		}

		this.lastShinyCoordinates = this.shinyCoordinates;
		this.roundLastLetterIndex = pokemonInRow - 1;

		const pokemon = Dex.getExistingPokemon(species);
		this.sayUhtml(this.uhtmlBaseName + '-preview', "<center>Find the shiny <b>" + this.currentPokemon + "</b>!<br />" +
			this.getCurrentGif(pokemon) + "&nbsp;" + this.getShinyCurrentGif(pokemon) + "</center>");

		this.answers = this.shinyCoordinates.map(x => Tools.toId(LETTERS[x[0]] + x[1]));
		return "";
	}

	generateShinyCoordinates(pokemonInRow: number, rowsInGrid: number): [number, number] {
		return [this.random(pokemonInRow), this.random(rowsInGrid) + 1];
	}

	getHintHtml(): string {
		const tableWidth = this.roundPokemonPerRow * (GyaradosShinyHunting.gifData[this.currentPokemon].w + ADDITIONAL_WIDTH);
		const rowHeight = GyaradosShinyHunting.gifData[this.currentPokemon].h + ADDITIONAL_HEIGHT;
		const backgroundColor = Tools.getNamedHexCode('White');

		let gridHtml = '<table align="center" border="1" ' +
			'style="color: black;font-weight: bold;text-align: center;table-layout: fixed;border-spacing: ' + BORDER_SPACING + 'px;' +
				'width: ' + tableWidth + 'px;">';

		const pokemon = Dex.getExistingPokemon(this.currentPokemon);
		const gif = this.getCurrentGif(pokemon);
		const shinyGif = this.getShinyCurrentGif(pokemon);
		for (let y = 1; y <= this.roundRows; y++) {
			gridHtml += '<tr style="height:' + rowHeight + 'px">';
			for (let x = 0; x < this.roundPokemonPerRow; x++) {
				gridHtml += '<td style="background: ' + backgroundColor.gradient + '">';
				if (this.validateShinyCoordinates(x, y)) {
					gridHtml += shinyGif;
				} else {
					gridHtml += gif;
				}

				gridHtml += "<br />" + LETTERS[x] + y;
				gridHtml += '</td>';
			}
			gridHtml += '</tr>';
		}
		gridHtml += '</table>';

		return gridHtml;
	}

	beforeNextRound(newAnswer: boolean): boolean {
		if (newAnswer) {
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
		const letterIndex = LETTERS.indexOf(letter);
		if (letterIndex === -1 || letterIndex > this.roundLastLetterIndex) {
			player.say("You must specify a letter between " + LETTERS[0] + " and " + LETTERS[this.roundLastLetterIndex] + "!");
			return true;
		}

		const number = parseInt(targets[1].trim());
		if (isNaN(number) || number < 1 || number > this.roundRows) {
			player.say("You must specify a row between 1 and " + this.roundRows + "!");
			return true;
		}

		return !this.validateShinyCoordinates(letterIndex, number);
	}

	getAnswers(): string[] {
		return [];
	}
}

const commands = Tools.deepClone(questionAndAnswerGame.commands!);
if (!commands.guess.aliases) commands.guess.aliases = [];
commands.guess.aliases.push(ANSWER_COMMAND);

export const game: IGameFile<GyaradosShinyHunting> = {
	aliases: ["gyarados", "shinyhunting", "gsh"],
	category: 'speed',
	challengeSettings: {
		onevsone: {
			enabled: true,
		},
	},
	commandDescriptions: [Config.commandCharacter + ANSWER_COMMAND + " [coordinates]"],
	commands,
	class: GyaradosShinyHunting,
	customizableNumberOptions: {
		points: {min: 10, base: 10, max: 10},
	},
	description: "Each round players try to be the first to hunt the shiny Pokemon in the grid!",
	freejoin: true,
	name: "Gyarados' Shiny Hunting",
	mascot: "Gyarados",
	modes: ["collectiveteam", "multianswer", "pmtimeattack", "spotlightteam", "survival", "timeattack"],
	modeProperties: {
		'survival': {
			roundTime: 5 * 1000,
		},
	},
	scriptedOnly: true,
};

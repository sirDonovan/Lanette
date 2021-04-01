import type { Player } from "../room-activity";
import type { GifGeneration, IGifDirectionData } from "../types/dex";
import type { IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from "./templates/question-and-answer";

const POKEMON_PER_GRID_ROW = 4;
const POKEMON_PER_TABLE_ROW = POKEMON_PER_GRID_ROW * 2;
const ROWS_PER_GRID = POKEMON_PER_GRID_ROW;
const FINAL_LETTER_INDEX = POKEMON_PER_TABLE_ROW - 1;

const BORDER_SPACING = 1;
const MAX_TABLE_WIDTH = Tools.getMaxTableWidth(BORDER_SPACING);
const MAX_TABLE_HEIGHT = Tools.getMaxTableHeight(BORDER_SPACING);
const MAX_GRID_WIDTH = MAX_TABLE_WIDTH / 2;
const ADDITIONAL_WIDTH = Tools.getTableCellAdditionalWidth(BORDER_SPACING);
const ADDITIONAL_HEIGHT = Tools.getTableCellAdditionalHeight(BORDER_SPACING, true);
const MAX_POKEMON_WIDTH = Tools.getMaxTableCellWidth(MAX_TABLE_WIDTH, BORDER_SPACING, POKEMON_PER_TABLE_ROW);
const MAX_POKEMON_HEIGHT = Tools.getMaxTableCellHeight(MAX_TABLE_HEIGHT, BORDER_SPACING, ROWS_PER_GRID, true);

const SPRITE_GENERATION: GifGeneration = 'bw';
const answerCommand = 'spot';

const letters = Tools.letters.toUpperCase().split("");
const data: {pokemon: string[], gifData: Dict<IGifDirectionData>} = {
	pokemon: [],
	gifData: {},
};

class DeoxysDifferences extends QuestionAndAnswer {
	answerCommands: string[] = [answerCommand];
	cooldownBetweenRounds: number = 5 * 1000;
	differenceCoordinates: [number, number] | null = null;
	differencePokemon: string = '';
	inactiveRoundLimit: number = 5;
	lastDifferenceCoordinates: [number, number] | null = null;
	roundPokemon: string[][] = [];
	roundTime: number = 30 * 1000;

	static loadData(): void {
		for (const pokemon of Games.getPokemonList()) {
			if (pokemon.forme || pokemon.gen > 5) continue;
			const gifData = Dex.getGifData(pokemon, SPRITE_GENERATION);
			if (gifData && gifData.w && gifData.h && gifData.w <= MAX_POKEMON_WIDTH && gifData.h <= MAX_POKEMON_HEIGHT) {
				data.gifData[pokemon.name] = gifData;
				data.pokemon.push(pokemon.name);
			}
		}
	}

	onSignups(): void {
		if (this.format.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
	}

	onStart(): void {
		this.nextRound();
	}

	checkLastDifferenceCoordinates(newCoordinates: [number, number]): boolean {
		if (this.lastDifferenceCoordinates && newCoordinates[0] === this.lastDifferenceCoordinates[0] &&
			newCoordinates[1] === this.lastDifferenceCoordinates[1]) return true;

		return false;
	}

	validateDifferenceCoordinates(x: number, y: number): boolean {
		if (this.differenceCoordinates && x === this.differenceCoordinates[0] && y === this.differenceCoordinates[1]) return true;

		return false;
	}

	getRowWidth(row: string[]): number {
		return row.map(x => data.gifData[x].w + ADDITIONAL_WIDTH).reduce((total, w) => total += w);
	}

	getCellHeight(pokemon: string): number {
		return data.gifData[pokemon].h + ADDITIONAL_HEIGHT;
	}

	generateAnswer(): void {
		const list = this.shuffle(data.pokemon);
		const rows: string[][] = [];
		let usedPokemon: string[] = [];

		for (let i = 0; i < ROWS_PER_GRID; i++) {
			if (list.length < POKEMON_PER_GRID_ROW) {
				this.generateAnswer();
				return;
			}

			let row = list.slice(0, POKEMON_PER_GRID_ROW);
			while (this.getRowWidth(row) > MAX_GRID_WIDTH) {
				list.shift();
				if (!list.length || list.length < POKEMON_PER_GRID_ROW) {
					this.generateAnswer();
					return;
				}

				row = list.slice(0, POKEMON_PER_GRID_ROW);
			}

			rows.push(row);
			usedPokemon = usedPokemon.concat(row);

			for (let j = 0; j < POKEMON_PER_GRID_ROW; j++) {
				list.shift();
			}
		}

		let differenceCoordinates = this.generateDifferenceCoordinates();
		while (this.checkLastDifferenceCoordinates(differenceCoordinates)) {
			differenceCoordinates = this.generateDifferenceCoordinates();
		}

		const differenceList = this.shuffle(data.pokemon.filter(x => !usedPokemon.includes(x)));
		const differenceRowIndex = differenceCoordinates[0];
		const differenceRow = rows[differenceCoordinates[1] - 1].slice();

		let differencePokemon = differenceList.shift()!;
		differenceRow.splice(differenceRowIndex, 1, differencePokemon);
		while (this.getRowWidth(differenceRow) > MAX_GRID_WIDTH) {
			if (!differenceList.length) {
				this.generateAnswer();
				return;
			}

			differencePokemon = differenceList.shift()!;
			differenceRow.splice(differenceRowIndex, 1, differencePokemon);
		}

		this.lastDifferenceCoordinates = differenceCoordinates;
		this.differenceCoordinates = differenceCoordinates;
		this.differencePokemon = differencePokemon;
		this.roundPokemon = rows;

		const gifs = this.shuffle([differencePokemon].concat(usedPokemon)).map(x => Dex.getPokemonGif(Dex.getExistingPokemon(x),
			SPRITE_GENERATION));

		this.sayUhtml(this.uhtmlBaseName + '-preview', "<center>Spot the difference among the following Pokemon:<br />" +
			gifs.join("") + "</center>");

		this.answers = [Tools.toId(letters[differenceCoordinates[0]] + differenceCoordinates[1]),
			Tools.toId(letters[differenceCoordinates[0] + POKEMON_PER_GRID_ROW] + differenceCoordinates[1])];
	}

	generateDifferenceCoordinates(): [number, number] {
		return [this.random(POKEMON_PER_GRID_ROW), this.random(ROWS_PER_GRID) + 1];
	}

	getHintHtml(): string {
		let largestRowWidth = 0;
		let largestRowHeight = this.getCellHeight(this.differencePokemon);

		const differenceRowIndex = this.differenceCoordinates![1] - 1;
		for (let i = 0; i < this.roundPokemon.length; i++) {
			const row = this.roundPokemon[i];
			for (const pokemon of row) {
				const height = this.getCellHeight(pokemon);
				if (height > largestRowHeight) largestRowHeight = height;
			}

			let rowWidth: number;
			if (i === differenceRowIndex) {
				const differenceRow = row.slice();
				differenceRow.splice(this.differenceCoordinates![0], 1, this.differencePokemon);
				rowWidth = this.getRowWidth(row) + this.getRowWidth(differenceRow);
			} else {
				rowWidth = this.getRowWidth(row) * 2;
			}

			if (rowWidth > largestRowWidth) largestRowWidth = rowWidth;
		}

		const lightOrange = Tools.getNamedHexCode('Light-Orange');
		const lightCyan = Tools.getNamedHexCode('Light-Cyan');

		let gridHtml = '<table align="center" border="1" ' +
			'style="color: black;font-weight: bold;text-align: center;table-layout: fixed;border-spacing: ' + BORDER_SPACING + 'px;' +
				'width: ' + largestRowWidth + 'px;">';

		let renderedDifference = false;
		for (let y = 1; y <= ROWS_PER_GRID; y++) {
			const row = this.roundPokemon[y - 1];
			gridHtml += '<tr style="height:' + largestRowHeight + 'px">';

			const gifs: Dict<string> = {};

			// left grid
			for (let x = 0; x < POKEMON_PER_GRID_ROW; x++) {
				gifs[row[x]] = Dex.getPokemonGif(Dex.getExistingPokemon(row[x]), SPRITE_GENERATION);

				gridHtml += '<td style="position: relative;background: ' + lightOrange.gradient + '">' + gifs[row[x]];
				gridHtml += "<br /><div style='position: absolute;bottom: 0px'>" + letters[x] + y + "</div>";
				gridHtml += '</td>';
			}

			// right grid
			for (let x = 0; x < POKEMON_PER_GRID_ROW; x++) {
				let gif: string;
				if (!renderedDifference && this.validateDifferenceCoordinates(x, y)) {
					renderedDifference = true;
					gif = Dex.getPokemonGif(Dex.getExistingPokemon(this.differencePokemon), SPRITE_GENERATION);
				} else {
					gif = gifs[row[x]];
				}

				gridHtml += '<td style="position: relative;background: ' + lightCyan.gradient + '">' + gif;
				gridHtml += "<br /><div style='position: absolute;bottom: 0px'>" + letters[x + POKEMON_PER_GRID_ROW] + y + "</div>";
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
			player.say("You must specify a letter and number corresponding to the second grid.");
			return true;
		}

		const letter = targets[0].trim().toUpperCase();
		const letterIndex = letters.indexOf(letter);
		if (letterIndex === -1 || letterIndex > FINAL_LETTER_INDEX) {
			player.say("You must specify a letter between " + letters[0] + " and " + letters[FINAL_LETTER_INDEX] + "!");
			return true;
		}

		const number = parseInt(targets[1].trim());
		if (isNaN(number) || number < 1 || number > ROWS_PER_GRID) {
			player.say("You must specify a row between 1 and " + ROWS_PER_GRID + "!");
			return true;
		}

		return !this.validateDifferenceCoordinates(letterIndex >= POKEMON_PER_GRID_ROW ? letterIndex - POKEMON_PER_GRID_ROW : letterIndex,
			number);
	}

	getAnswers(): string[] {
		return [];
	}
}

const commands = Tools.deepClone(questionAndAnswerGame.commands!);
if (!commands.guess.aliases) commands.guess.aliases = [];
commands.guess.aliases.push(answerCommand);

export const game: IGameFile<DeoxysDifferences> = {
	aliases: ["deoxys", "dd"],
	category: 'visual',
	commandDescriptions: [Config.commandCharacter + answerCommand + " [coordinates]"],
	commands,
	class: DeoxysDifferences,
	customizableOptions: {
		points: {min: 10, base: 10, max: 10},
	},
	description: "Each round players try to be the first to spot the different Pokemon between the grids!",
	freejoin: true,
	name: "Deoxys' Differences",
	mascots: ['Deoxys', 'Deoxys-Attack', 'Deoxys-Defense', 'Deoxys-Speed'],
	mascotPrefix: "Deoxys'",
	modes: ['team', 'survival', 'timeattack'],
	modeProperties: {
		'survival': {
			roundTime: 15 * 1000,
		},
	},
	scriptedOnly: true,
};

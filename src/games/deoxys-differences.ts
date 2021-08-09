import type { Player } from "../room-activity";
import type { ModelGeneration, IGifDirectionData } from "../types/dex";
import type { IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from "./templates/question-and-answer";

const MIN_POKEMON = 3;
const MAX_POKEMON = 4;

const BORDER_SPACING = 1;
const MAX_TABLE_WIDTH = Tools.getMaxTableWidth(BORDER_SPACING);
const MAX_TABLE_HEIGHT = Tools.getMaxTableHeight(BORDER_SPACING);
const MAX_GRID_WIDTH = MAX_TABLE_WIDTH / 2;
const ADDITIONAL_WIDTH = Tools.getTableCellAdditionalWidth(BORDER_SPACING);
const ADDITIONAL_HEIGHT = Tools.getTableCellAdditionalHeight(BORDER_SPACING, true);

const SPRITE_GENERATION: ModelGeneration = 'bw';
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
	roundPokemonPerGridRow: number = 0;
	roundRowsPerGrid: number = 0;
	roundTime: number = 30 * 1000;

	static loadData(): void {
		const maxPokemonWidth = Tools.getMaxTableCellWidth(MAX_TABLE_WIDTH, BORDER_SPACING, MIN_POKEMON);
		const maxPokemonHeight = Tools.getMaxTableCellHeight(MAX_TABLE_HEIGHT, BORDER_SPACING, MIN_POKEMON, true);

		for (const pokemon of Games.getPokemonList()) {
			if (pokemon.forme || pokemon.gen > 5) continue;
			const gifData = Dex.getModelData(pokemon, SPRITE_GENERATION);
			if (gifData && gifData.w && gifData.h && gifData.w <= maxPokemonWidth && gifData.h <= maxPokemonHeight) {
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

	async customGenerateHint(): Promise<void> {
		const pokemonPerGridRow = MIN_POKEMON + this.random((1 + MAX_POKEMON) - MIN_POKEMON);
		const rowsPerGrid = MIN_POKEMON + this.random((1 + MAX_POKEMON) - MIN_POKEMON);

		this.roundPokemonPerGridRow = pokemonPerGridRow;
		this.roundRowsPerGrid = rowsPerGrid;

		const list = this.shuffle(data.pokemon);
		const rows: string[][] = [];
		let usedPokemon: string[] = [];

		for (let i = 0; i < rowsPerGrid; i++) {
			if (list.length < pokemonPerGridRow) {
				await this.customGenerateHint();
				return;
			}

			let row = list.slice(0, pokemonPerGridRow);
			while (this.getRowWidth(row) > MAX_GRID_WIDTH) {
				list.shift();
				if (!list.length || list.length < pokemonPerGridRow) {
					await this.customGenerateHint();
					return;
				}

				row = list.slice(0, pokemonPerGridRow);
			}

			rows.push(row);
			usedPokemon = usedPokemon.concat(row);

			for (let j = 0; j < pokemonPerGridRow; j++) {
				list.shift();
			}
		}

		let differenceCoordinates = this.generateDifferenceCoordinates(pokemonPerGridRow, rowsPerGrid);
		while (this.checkLastDifferenceCoordinates(differenceCoordinates)) {
			differenceCoordinates = this.generateDifferenceCoordinates(pokemonPerGridRow, rowsPerGrid);
		}

		const differenceList = this.shuffle(data.pokemon.filter(x => !usedPokemon.includes(x)));
		const differenceRowIndex = differenceCoordinates[0];
		const differenceRow = rows[differenceCoordinates[1] - 1].slice();

		let differencePokemon = differenceList.shift()!;
		differenceRow.splice(differenceRowIndex, 1, differencePokemon);
		while (this.getRowWidth(differenceRow) > MAX_GRID_WIDTH) {
			if (!differenceList.length) {
				await this.customGenerateHint();
				return;
			}

			differencePokemon = differenceList.shift()!;
			differenceRow.splice(differenceRowIndex, 1, differencePokemon);
		}

		this.lastDifferenceCoordinates = differenceCoordinates;
		this.differenceCoordinates = differenceCoordinates;
		this.differencePokemon = differencePokemon;
		this.roundPokemon = rows;

		const gifs = this.shuffle([differencePokemon].concat(usedPokemon)).map(x => Dex.getPokemonModel(Dex.getExistingPokemon(x),
			SPRITE_GENERATION));

		this.sayUhtml(this.uhtmlBaseName + '-preview', "<center>Spot the difference among the following Pokemon:<br />" +
			gifs.join("") + "</center>");

		this.answers = [Tools.toId(letters[differenceCoordinates[0]] + differenceCoordinates[1]),
			Tools.toId(letters[differenceCoordinates[0] + pokemonPerGridRow] + differenceCoordinates[1])];
	}

	generateDifferenceCoordinates(pokemonPerGridRow: number, rowsPerGrid: number): [number, number] {
		return [this.random(pokemonPerGridRow), this.random(rowsPerGrid) + 1];
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
		for (let y = 1; y <= this.roundRowsPerGrid; y++) {
			const row = this.roundPokemon[y - 1];
			gridHtml += '<tr style="height:' + largestRowHeight + 'px">';

			const gifs: Dict<string> = {};

			// left grid
			for (let x = 0; x < this.roundPokemonPerGridRow; x++) {
				gifs[row[x]] = Dex.getPokemonModel(Dex.getExistingPokemon(row[x]), SPRITE_GENERATION);

				gridHtml += '<td style="position: relative;background: ' + lightOrange.gradient + '">' + gifs[row[x]];
				gridHtml += "<br /><div style='position: absolute;bottom: 0px'>" + letters[x] + y + "</div>";
				gridHtml += '</td>';
			}

			// right grid
			for (let x = 0; x < this.roundPokemonPerGridRow; x++) {
				let gif: string;
				if (!renderedDifference && this.validateDifferenceCoordinates(x, y)) {
					renderedDifference = true;
					gif = Dex.getPokemonModel(Dex.getExistingPokemon(this.differencePokemon), SPRITE_GENERATION);
				} else {
					gif = gifs[row[x]];
				}

				gridHtml += '<td style="position: relative;background: ' + lightCyan.gradient + '">' + gif;
				gridHtml += "<br /><div style='position: absolute;bottom: 0px'>" + letters[x + this.roundPokemonPerGridRow] + y + "</div>";
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
			player.say("You must specify a letter and number corresponding to the second grid.");
			return true;
		}

		const letter = targets[0].trim().toUpperCase();
		const letterIndex = letters.indexOf(letter);
		const finalLetterIndex = (this.roundPokemonPerGridRow * 2) - 1;
		if (letterIndex === -1 || letterIndex > finalLetterIndex) {
			player.say("You must specify a letter between " + letters[0] + " and " + letters[finalLetterIndex] + "!");
			return true;
		}

		const number = parseInt(targets[1].trim());
		if (isNaN(number) || number < 1 || number > this.roundRowsPerGrid) {
			player.say("You must specify a row between 1 and " + this.roundRowsPerGrid + "!");
			return true;
		}

		return !this.validateDifferenceCoordinates(letterIndex >= this.roundPokemonPerGridRow ? letterIndex - this.roundPokemonPerGridRow :
			letterIndex, number);
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
	category: 'speed',
	challengeSettings: {
		onevsone: {
			enabled: true,
		},
	},
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
	modes: ["collectiveteam", "pmtimeattack", "spotlightteam", "survival", "timeattack"],
	modeProperties: {
		'survival': {
			roundTime: 15 * 1000,
		},
		'timeattack': {
			roundTime: 15 * 1000,
		},
		'pmtimeattack': {
			roundTime: 15 * 1000,
		},
	},
	scriptedOnly: true,
};

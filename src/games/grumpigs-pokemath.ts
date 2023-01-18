import { assertStrictEqual } from "../test/test-tools";
import type { GameFileTests, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

type Operation = 'add' | 'subtract' | 'multiply' | 'divide';

const BASE_OPERANDS = 2;
const OPERATIONS: Operation[] = ['add', 'subtract', 'multiply', 'divide'];
const OPERATION_SYMBOLS: KeyedDict<Operation, string> = {
	'add': '+',
	'subtract': '-',
	'multiply': '*',
	'divide': '/',
};

class GrumpigsPokemath extends QuestionAndAnswer {
	static pokemonByNumber: Dict<string[]> = {};
	static highestPokedexNumber: number = 0;

	lastOperation: Operation = 'divide';
	lastResult: number = 0;
	roundTime = 30 * 1000;

	roundOperands?: number;

	static loadData(): void {
		for (const pokemon of Games.getPokemonList()) {
			if (!(pokemon.num in this.pokemonByNumber)) this.pokemonByNumber[pokemon.num] = [];
			this.pokemonByNumber[pokemon.num].push(pokemon.name);
		}

		this.highestPokedexNumber = Object.keys(this.pokemonByNumber).map(x => parseInt(x)).sort((a, b) => b - a)[0];
	}

	getOperand(): number {
		return this.random(GrumpigsPokemath.highestPokedexNumber) + 1;
	}

	generateOperands(operation: Operation, amount: number): number[] {
		const multiplyOrDivide = operation === 'multiply' || operation === 'divide';
		if (multiplyOrDivide && amount > 3) amount = 3;

		const operands: number[] = [];
		for (let i = 0; i < amount; i++) {
			let operand = this.getOperand();
			while (multiplyOrDivide && operand === 1) {
				operand = this.getOperand();
			}
			operands.push(operand);
		}

		if (multiplyOrDivide && amount === 2) {
			while (operands[0] === operands[1]) {
				operands[1] = this.getOperand();
			}
		}

		return operands;
	}

	getOperandsAndResult(operation: Operation, amount: number): {operands: number[], result: number} {
		let operands = this.generateOperands(operation, amount);
		let result = this.calculateResult(operation, operands);
		while (result === this.lastResult || !(result in GrumpigsPokemath.pokemonByNumber)) {
			operands = this.generateOperands(operation, amount);
			result = this.calculateResult(operation, operands);
		}

		return {operands, result};
	}

	calculateResult(operation: Operation, operands: number[]): number {
		let result: number;
		if (operation === 'add') {
			result = 0;
			operands.forEach(x => result += x);
		} else if (operation === 'subtract') {
			result = operands[0];
			operands.slice(1).forEach(x => result -= x);
		} else if (operation === 'multiply') {
			result = 1;
			operands.forEach(x => result *= x);
		} else {
			result = operands[0];
			operands.slice(1).forEach(x => result /= x);
		}

		return result;
	}

	async customGenerateHint(): Promise<void> {
		let operation = this.sampleOne(OPERATIONS);
		while (operation === this.lastOperation) {
			operation = this.sampleOne(OPERATIONS);
		}
		this.lastOperation = operation;

		let operandsCount: number;
		if (this.roundOperands) {
			operandsCount = this.roundOperands;
		} else if (this.format.inputOptions.operands) {
			operandsCount = this.options.operands!;
		} else {
			operandsCount = BASE_OPERANDS;
			if ('operands' in this.format.customizableNumberOptions && operation !== 'multiply' && operation !== 'divide') {
				operandsCount += this.random(this.format.customizableNumberOptions.operands.max - BASE_OPERANDS + 1);
			}
		}

		const operandsAndResult = this.getOperandsAndResult(operation, operandsCount);
		if (this.pokemonGifHints) {
			for (const pokemon of operandsAndResult.operands) {
				if (!this.getHintKeyGif(GrumpigsPokemath.pokemonByNumber[pokemon][0])) {
					await this.generateHint();
					return;
				}
			}
		}

		this.lastResult = operandsAndResult.result;

		this.answers = GrumpigsPokemath.pokemonByNumber[operandsAndResult.result];

		let hint = "<b>";
		if (this.pokemonGifHints) hint += "<center>";

		hint += operandsAndResult.operands
			.map(x => this.getHintKeyGif(GrumpigsPokemath.pokemonByNumber[x][0]) || GrumpigsPokemath.pokemonByNumber[x][0]).join(" " +
			OPERATION_SYMBOLS[operation] + " ") + " = ?";

		if (this.pokemonGifHints) hint += "</center>";
		hint += "</b>";

		this.hint = hint;
	}

	increaseDifficulty(): void {
		this.roundTime = Math.max(6000, this.roundTime - 1.5 * 1000);
	}
}

const tests: GameFileTests<GrumpigsPokemath> = {
	'should calculate results correctly': {
		test(game): void {
			assertStrictEqual(game.calculateResult('add', [1, 2]), 3);
			assertStrictEqual(game.calculateResult('add', [3, 4, 5]), 12);
			assertStrictEqual(game.calculateResult('subtract', [3, 2]), 1);
			assertStrictEqual(game.calculateResult('subtract', [12, 5, 4]), 3);
			assertStrictEqual(game.calculateResult('multiply', [2, 3]), 6);
			assertStrictEqual(game.calculateResult('multiply', [4, 5, 6]), 120);
			assertStrictEqual(game.calculateResult('divide', [6, 3]), 2);
			assertStrictEqual(game.calculateResult('divide', [120, 6, 5]), 4);
		},
	},
};

export const game: IGameFile<GrumpigsPokemath> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['grumpigs', 'pokemath'],
	category: 'knowledge-3',
	class: GrumpigsPokemath,
	commandDescriptions: [Config.commandCharacter + "g [Pokemon]"],
	customizableNumberOptions: {
		operands: {min: 2, base: BASE_OPERANDS, max: 4},
	},
	defaultOptions: ['points'],
	description: "Players guess Pokemon whose dex numbers match the answers to the given math problems!",
	freejoin: true,
	name: "Grumpig's Pokemath",
	mascot: "Grumpig",
	minigameCommand: 'pokemath',
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess the Pokemon whose dex number matches the answer to " +
		"the math problem!",
	modes: ["collectiveteam", "pmtimeattack", "spotlightteam", "survival", "timeattack"],
	modeProperties: {
		'survival': {
			roundTime: 23.5 * 1000,
			roundOperands: BASE_OPERANDS,
		},
		'timeattack': {
			roundTime: 15 * 1000,
		},
		'pmtimeattack': {
			roundTime: 15 * 1000,
		},
	},
	tests: Object.assign({}, questionAndAnswerGame.tests, tests),
	variants: [
		{
			name: "Grumpig's Pokemath (GIFs)",
			variantAliases: ["gif", "gifs"],
			pokemonGifHints: true,
		},
	],
});

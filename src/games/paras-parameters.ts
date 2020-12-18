import type { PRNGSeed } from "../lib/prng";
import { PRNG } from "../lib/prng";
import { assert, assertStrictEqual } from "../test/test-tools";
import type { GameFileTests, IGameAchievement, IGameFile } from "../types/games";
import type { IParam, IParametersResponse, ParamType } from '../workers/parameters';
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

type AchievementNames = "dexsearchhero";

const BASE_NUMBER_OF_PARAMS = 2;
const MIN_GEN = 1;
const MAX_GEN = 8;

const allParamTypes: ParamType[] = ['move', 'tier', 'color', 'type', 'resistance', 'weakness', 'egggroup', 'ability', 'gen'];
const modeParamTypes: ParamType[] = ['tier', 'color', 'type', 'egggroup', 'ability', 'gen'];

export class ParasParameters extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		'dexsearchhero': {name: 'Dexsearch Hero', type: 'first', bits: 250, minigame: true,
			description: "be the first to successfully answer in a minigame"},
	};

	currentNumberOfParams: number = 0;
	customParamTypes: ParamType[] | null = null;
	minimumResults: number = 3;
	maximumResults: number = 50;
	params: IParam[] = [];
	paramTypes: ParamType[] = allParamTypes;
	pokemon: string[] = [];
	roundTime: number = 5 * 60 * 1000;
	usesWorkers: boolean = true;

	noIncorrectAnswersMinigameAchievement = ParasParameters.achievements.dexsearchhero;

	static loadData(): void {
		Games.workers.parameters.init();
	}

	getMinigameDescription(): string {
		const dexsearchCommand = "<code>/" + (this.format.options.gen === 8 ? "nds" : "ds" + this.format.options.gen) + "</code>";
		return "Use " + dexsearchCommand + " to search for and then <code>" + Config.commandCharacter + "g</code> to guess " +
			dexsearchCommand + " parameters that give the following Pokemon!";
	}

	getDescription(): string {
		if (this.format.options.gen === 8) return this.description;
		return "Players search for possible <code>/ds" + this.format.options.gen + "</code> parameters that result in the given " +
			"Pokemon list!";
	}

	getParamNames(params: IParam[]): string[] {
		const names = [];
		for (const param of params) {
			if (param.type === 'type') {
				names.push(param.param + ' type');
			} else if (param.type === 'resistance') {
				names.push('Resists ' + param.param + ' type');
			} else if (param.type === 'weakness') {
				names.push('Weak to ' + param.param + ' type');
			} else if (param.type === 'gen') {
				names.push("Gen " + param.param);
			} else if (param.type === 'egggroup') {
				names.push(param.param + " Group");
			} else {
				names.push(param.param);
			}
		}
		return names.sort();
	}

	async generateAnswer(): Promise<void> {
		let numberOfParams: number;
		if (this.customParamTypes) {
			numberOfParams = this.customParamTypes.length;
		} else if (this.format.inputOptions.params) {
			numberOfParams = this.format.options.params;
		} else {
			numberOfParams = BASE_NUMBER_OF_PARAMS;
			if ('params' in this.format.customizableOptions) {
				numberOfParams += this.random(this.format.customizableOptions.params.max - BASE_NUMBER_OF_PARAMS + 1);
			}
		}
		this.currentNumberOfParams = numberOfParams;
		const result = await Games.workers.parameters.search({
			customParamTypes: this.customParamTypes,
			minimumResults: this.minimumResults,
			maximumResults: this.maximumResults,
			mod: 'gen' + this.format.options.gen,
			numberOfParams,
			paramTypes: this.paramTypes,
			prngSeed: this.prng.seed.slice() as PRNGSeed,
			searchType: 'pokemon',
		});

		if (this.ended) return;

		if (result === null) {
			this.say("An error occurred while generating parameters.");
			this.deallocate(true);
			return;
		}

		if (!result.pokemon.length) {
			this.say("Invalid params specified.");
			this.deallocate(true);
		} else {
			this.params = result.params;
			this.pokemon = result.pokemon;
			this.prng = new PRNG(result.prngSeed);

			this.answers = [this.getParamNames(result.params).join(',')];
			let oldGen = '';
			if (this.format.options.gen && this.format.options.gen !== Dex.gen) oldGen = " (Generation " + this.format.options.gen + ")";
			this.additionalHintHeader = "- " + this.params.length + " params" + oldGen + ":";

			const pokemonIcons: string[] = [];
			for (const name of result.pokemon) {
				const pokemon = Dex.getExistingPokemon(name);
				pokemonIcons.push(Dex.getPSPokemonIcon(pokemon) + pokemon.name);
			}
			this.hint = "<div class='infobox'>" + pokemonIcons.join(", ") + "</div>";
		}
	}

	getAnswers(givenAnswer: string): string {
		if (!givenAnswer) givenAnswer = Tools.joinList(this.answers[0].split(','));
		return "A possible set of parameters was __" + givenAnswer + "__.";
	}

	intersect(parts: string[]): IParametersResponse | null {
		const params: IParam[] = [];
		const mod = 'gen' + this.format.options.gen;
		const paramTypePools = Games.workers.parameters.workerData!.pokemon.gens[mod].paramTypePools;
		for (const part of parts) {
			const id = Tools.toId(part);
			let param: IParam | undefined;
			for (const paramType of allParamTypes) {
				if (id in paramTypePools[paramType]) {
					param = paramTypePools[paramType][id];
					break;
				}
			}

			if (param && !params.includes(param)) params.push(param);
		}

		if (params.length === 1 || params.length !== parts.length) return {params: [], pokemon: []};

		return Games.workers.parameters.intersect({
			mod,
			params,
			paramTypes: allParamTypes,
			searchType: 'pokemon',
		});
	}

	checkAnswer(guess: string): string {
		const parts = guess.split(',');
		if (parts.length === this.currentNumberOfParams) {
			const intersection = this.intersect(parts);
			if (!this.ended) {
				if (intersection === null) {
					this.say("An error occurred while intersecting parameters.");
					this.deallocate(true);
				} else {
					if (intersection.pokemon.join(',') === this.pokemon.join(',')) {
						return Tools.joinList(this.getParamNames(intersection.params));
					}
				}
			}
		}
		return "";
	}
}

const tests: GameFileTests<ParasParameters> = {
	'should return proper values from Parameters worker': {
		config: {
			async: true,
		},
		async test(game, format): Promise<void> {
			this.timeout(15000);
			const parametersData = Games.workers.parameters.loadData();

			for (const gen in parametersData.pokemon.gens) {
				const types = Object.keys(parametersData.pokemon.gens[gen].paramTypeDexes) as ParamType[];
				for (const type of types) {
					const keys = Object.keys(parametersData.pokemon.gens[gen].paramTypeDexes[type]);
					const checkTier = type === 'tier';
					for (const key of keys) {
						const id = Tools.toId(key);
						assert(id in parametersData.pokemon.gens[gen].paramTypePools[type], id + ' in ' + type);
						if (checkTier) assert(!key.startsWith('('));
					}
				}
			}

			for (let i = MIN_GEN; i <= MAX_GEN; i++) {
				const gen = i;
				for (let j = format.customizableOptions.params.min; j <= format.customizableOptions.params.max; j++) {
					format.inputOptions.params = j;
					game.format.options.params = j;
					format.inputOptions.gen = gen;
					game.format.options.gen = gen;
					game.answers = [];
					await game.onNextRound();
					assert(game.params.length);
					assert(game.pokemon.length);
				}
			}
			delete format.inputOptions.params;
			delete game.format.options.params;

			game.format.options.gen = 8;
			game.customParamTypes = ['move', 'egggroup'];
			game.answers = [];
			await game.onNextRound();
			assert(game.params.length);
			assert(game.pokemon.length);
			assertStrictEqual(game.params[0].type, 'move');
			assertStrictEqual(game.params[1].type, 'egggroup');
			game.customParamTypes = null;

			let intersection = game.intersect(['steeltype']);
			assert(intersection);
			assertStrictEqual(intersection.params.length, 0);
			assertStrictEqual(intersection.pokemon.length, 0);

			intersection = game.intersect(['steeltype', 'steeltype']);
			assert(intersection);
			assertStrictEqual(intersection.params.length, 0);
			assertStrictEqual(intersection.pokemon.length, 0);

			intersection = game.intersect(['steeltype', 'rockclimb', 'steeltype']);
			assert(intersection);
			assertStrictEqual(intersection.params.length, 0);
			assertStrictEqual(intersection.pokemon.length, 0);

			intersection = game.intersect(['poisontype', 'poisontype', 'powerwhip']);
			assert(intersection);
			assertStrictEqual(intersection.params.length, 0);
			assertStrictEqual(intersection.pokemon.length, 0);

			intersection = game.intersect(['steeltype', 'rockclimb']);
			assert(intersection);
			assertStrictEqual(intersection.params.length, 2);
			assertStrictEqual(intersection.pokemon.join(","), "arceussteel,durant,empoleon,excadrill,ferroseed,ferrothorn,steelix");

			intersection = game.intersect(['rockclimb', 'fly']);
			assert(intersection);
			assertStrictEqual(intersection.params.length, 2);
			assertStrictEqual(intersection.pokemon.join(","), "arceus,smeargle");

			// past gen

			game.format.options.gen = 7;

			intersection = game.intersect(['steeltype', 'rockclimb']);
			assert(intersection);
			assertStrictEqual(intersection.params.length, 2);
			assertStrictEqual(intersection.pokemon.join(","), "durant,excadrill,ferroseed,ferrothorn,steelix");
		},
	},
	'should use proper paramTypes for modes': {
		config: {
			inputTargets: ['params, survival', 'params, team'],
		},
		test(game): void {
			assertStrictEqual(game.paramTypes.join(','), 'tier,color,type,egggroup,ability,gen');
		},
	},
};

export const game: IGameFile<ParasParameters> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['paras', 'params'],
	canGetRandomAnswer: false,
	category: 'puzzle',
	challengePoints: {
		onevsone: 5,
	},
	class: ParasParameters,
	customizableOptions: {
		gen: {min: MIN_GEN, base: MAX_GEN, max: MAX_GEN},
		params: {min: 2, base: BASE_NUMBER_OF_PARAMS, max: 4},
		points: {min: 5, base: 5, max: 10},
		teamPoints: {min: 10, base: 10, max: 10},
	},
	description: "Players search for possible <code>/nds</code> parameters that result in the given Pokemon list!",
	formerNames: ["Parameters"],
	freejoin: true,
	name: "Paras' Parameters",
	mascot: "Paras",
	minigameCommand: 'parameter',
	minigameCommandAliases: ['param'],
	modes: ['survival', 'team'],
	modeProperties: {
		'survival': {
			paramTypes: modeParamTypes,
			roundTime: 15 * 1000,
		},
		'team': {
			paramTypes: modeParamTypes,
			roundTime: 60 * 1000,
		},
	},
	nonTrivialLoadData: true,
	tests: Object.assign({}, questionAndAnswerGame.tests, tests),
});

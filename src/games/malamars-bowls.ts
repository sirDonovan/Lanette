import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';
import type { IGameFile } from "../types/games";
import type { IParam, IParametersWorkerData } from './../workers/parameters';
import type { Player } from '../room-activity';

const parameterCount = 2;
const minimumPokmeon = 5;
const gameGen = 8;
const genString = 'gen' + gameGen;

type ParamType = 'color' | 'letter' | 'tier' | 'type';
const paramTypes: ParamType[] = ['color', 'letter', 'tier', 'type'];
const paramTypeDexesKeys: Dict<Dict<KeyedDict<ParamType, string[]>>> = {};

const searchTypes: (keyof IParametersWorkerData)[] = ['pokemon'];

class MalamarsBowls extends QuestionAndAnswer {
	bowlsRound: number = 0;
	hintUpdates: number = 0;
	multiRoundHints = true;
	roundGuesses = new Map<Player, boolean>();
	roundParameters: IParam[] = [];
	roundParameterNames: string[] = [];
	roundPokemon: string[] = [];
	roundTime = 45 * 1000;
	updateHintTime = 5000;
	usesWorkers: boolean = true;

	static loadData(): void {
		const parametersData = Games.getWorkers().parameters.getData();

		for (const searchType of searchTypes) {
			paramTypeDexesKeys[searchType] = {};
			for (const gen in parametersData[searchType].gens) {
				paramTypeDexesKeys[searchType][gen] = {
					'color': [],
					'letter': [],
					'tier': [],
					'type': [],
				};
				for (const paramType of paramTypes) {
					paramTypeDexesKeys[searchType][gen][paramType] =
						Object.keys(parametersData[searchType].gens[gen].paramTypeDexes[paramType]);
				}
			}
		}
	}

	generateBowls(): void {
		const workers = Games.getWorkers();
		const roundParamTypes = this.sampleMany(paramTypes, parameterCount);
		let attempts = 0;
		let len = 0;
		let params: IParam[] = [];
		let mons: string[] = [];
		while (len < minimumPokmeon && attempts < 10) {
			params = [];
			attempts++;
			for (const paramType of roundParamTypes) {
				const name = this.sampleOne(paramTypeDexesKeys.pokemon[genString][paramType]);
				params.push(workers.parameters.getData().pokemon.gens[genString].paramTypePools[paramType][Tools.toId(name)]);
			}

			const intersection = workers.parameters.intersect({
				mod: genString,
				params,
				paramTypes,
				searchType: 'pokemon',
			});

			if (intersection === null) {
				this.say("An error occurred while generating parameters.");
				this.deallocate(true);
				return;
			}

			mons = intersection.pokemon;
			len = mons.length;
		}
		if (len < minimumPokmeon) {
			this.generateBowls();
			return;
		}

		this.roundPokemon = this.shuffle(mons);
		this.roundParameters = params;
		this.roundParameterNames = params.map(x => this.getParamName(x)).sort();
	}

	getAnswers(): string[] {
		return [this.roundParameters.map(x => this.getParamName(x)).join(" & ")];
	}

	getParamName(param: IParam): string {
		if (param.type === 'letter') {
			return "Starts with " + param.param;
		} else if (param.type === 'type') {
			return param.param + " type";
		} else {
			return param.param;
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async customGenerateHint(): Promise<void> {
		this.generateBowls();

		this.hint = "<b>" + Users.self.name + " grabbed</b>: " + (this.pokemonGifHints ? "<br />" : "");

		this.hintUpdates = 0;
		this.answers = [this.roundParameters.map(x => x.param).join(",")];
	}

	updateHint(): void {
		while (this.pokemonGifHints && !this.getHintKeyGif(this.roundPokemon[0])) {
			this.roundPokemon.shift();
			if (!this.roundPokemon.length) break;
		}

		if (this.roundPokemon.length) {
			const nextPokemon = Dex.getExistingPokemon(this.roundPokemon[0]).name;
			this.roundPokemon.shift();
			const nextHint = this.getHintKeyGif(nextPokemon) || nextPokemon;

			this.hintUpdates++;
			if (this.hintUpdates === 1) {
				this.bowlsRound++;
				this.hint += nextHint;
			} else {
				this.hint += ", " + nextHint;
			}

			this.roundGuesses.clear();
		}
	}

	onHintHtml(): void {
		if (this.timeout) clearTimeout(this.timeout);

		this.setTimeout(() => {
			if (!this.roundPokemon.length) {
				this.canGuess = false;
				const text = "All Pokemon have been revealed!";
				this.on(text, () => {
					this.displayAnswers();
					this.answers = [];
					if (this.isMiniGame) {
						this.end();
						return;
					}
					this.setTimeout(() => this.nextRound(), 5000);
				});
				this.say(text);
			} else {
				this.nextRound();
			}
		}, this.updateHintTime);
	}

	getDisplayedRoundNumber(): number {
		return this.bowlsRound;
	}

	checkAnswer(guess: string): string {
		const parts = guess.split(',');
		if (parts.length === parameterCount) {
			const workers = Games.getWorkers();
			const params: IParam[] = [];
			const paramTypePools = workers.parameters.workerData!.pokemon.gens[genString].paramTypePools;
			for (const part of parts) {
				const id = Tools.toId(part);
				let param: IParam | undefined;
				for (const paramType of paramTypes) {
					if (id in paramTypePools[paramType]) {
						param = paramTypePools[paramType][id];
						break;
					}
				}

				if (param && !params.includes(param)) params.push(param);
			}

			const paramNames = params.map(x => this.getParamName(x)).sort();
			if (Tools.compareArrays(this.roundParameterNames, paramNames)) {
				return params.join(" & ");
			}
		}

		return "";
	}
}

export const game: IGameFile<MalamarsBowls> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['malamars', 'bowls'],
	challengeSettings: Object.assign({}, questionAndAnswerGame.challengeSettings, {
		botchallenge: {
			enabled: false,
		},
	}),
	category: 'knowledge-3',
	class: MalamarsBowls,
	commandDescriptions: [Config.commandCharacter + "g [parameter 1], [parameter 2]"],
	defaultOptions: ['points'],
	description: "Players guess two specific parameters that fit the grabbed Pokemon!",
	freejoin: true,
	name: "Malamar's Bowls",
	mascot: "Malamar",
	nonTrivialLoadData: true,
	variants: [
		{
			name: "Malamar's Bowls (GIFs)",
			variantAliases: ["gif", "gifs"],
			pokemonGifHints: true,
		},
	],
});

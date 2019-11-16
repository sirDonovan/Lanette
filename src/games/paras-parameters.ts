import assert = require('assert');

import { PRNG, PRNGSeed } from "../prng";
import { Room } from "../rooms";
import { GameFileTests, IGameFile, IGameFormat } from "../types/games";
import * as ParametersWorker from './../workers/parameters';
import { game as guessingGame, Guessing } from './templates/guessing';

const BASE_NUMBER_OF_PARAMS = 2;
const name = "Paras' Parameters";
let loadedData = false;

export class ParasParameters extends Guessing {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		ParametersWorker.init();

		loadedData = true;
	}

	currentNumberOfParams: number = 0;
	customParamTypes: ParametersWorker.ParamType[] | null = null;
	htmlHint = true;
	minimumResults: number = 3;
	maximumResults: number = 50;
	params: ParametersWorker.IParam[] = [];
	paramTypes: ParametersWorker.ParamType[] = ['move', 'tier', 'color', 'type', 'resistance', 'weakness', 'egggroup', 'ability', 'gen'];
	pokemon: string[] = [];
	roundTime: number = 5 * 60 * 1000;

	getParamNames(params: ParametersWorker.IParam[]): string {
		const names = [];
		for (let i = 0; i < params.length; i++) {
			if (params[i].type === 'type') {
				names.push(params[i].param + ' type');
			} else if (params[i].type === 'resistance') {
				names.push('Resists ' + params[i].param + ' type');
			} else if (params[i].type === 'weakness') {
				names.push('Weak to ' + params[i].param + ' type');
			} else if (params[i].type === 'gen') {
				names.push("Gen " + params[i].param);
			} else if (params[i].type === 'egggroup') {
				names.push(params[i].param + " Group");
			} else {
				names.push(params[i].param);
			}
		}
		return Tools.joinList(names.sort());
	}

	async setAnswers() {
		let numberOfParams: number;
		if (this.customParamTypes) {
			numberOfParams = this.customParamTypes.length;
		} else if (this.format.inputOptions.params) {
			numberOfParams = this.format.options.params;
		} else {
			numberOfParams = BASE_NUMBER_OF_PARAMS;
			if ((this.format as IGameFormat).customizableOptions.params) numberOfParams += this.random((this.format as IGameFormat).customizableOptions.params.max - BASE_NUMBER_OF_PARAMS + 1);
		}
		this.currentNumberOfParams = numberOfParams;
		const result = await ParametersWorker.search({
			customParamTypes: this.customParamTypes,
			minimumResults: this.minimumResults,
			maximumResults: this.maximumResults,
			mod: Dex.currentGenString,
			numberOfParams,
			paramTypes: this.paramTypes,
			prngSeed: this.prng.seed.slice() as PRNGSeed,
			searchType: 'pokemon',
		});

		if (this.ended) return;

		if (!result.pokemon.length) {
			this.say("Invalid params specified.");
			this.deallocate(true);
		} else {
			this.answers = [this.getParamNames(result.params)];
			this.params = result.params;
			this.pokemon = result.pokemon;
			this.hint = this.getParamsHtml(this.params, this.pokemon);
			this.prng = new PRNG(result.prngSeed);
		}
	}

	getParamsHtml(params: ParametersWorker.IParam[], pokemon: string[]) {
		let oldGen = '';
		if (this.format.options.gen && this.format.options.gen !== Dex.gen) oldGen = " (Generation " + this.format.options.gen + ")";
		let html = "<div class='infobox'><span style='color: #999999'>" + params.length + " params" + oldGen + ":</span><br />";
		const pokemonIcons: string[] = [];
		for (let i = 0; i < pokemon.length; i++) {
			pokemonIcons.push('<psicon pokemon="' + pokemon[i] + '" style="vertical-align: -7px;margin: -2px" />' + Dex.getExistingPokemon(pokemon[i]).species);
		}
		html += pokemonIcons.join(", ") + "</div>";
		return html;
	}

	getAnswers(givenAnswer: string, finalAnswer?: boolean): string {
		if (!givenAnswer) givenAnswer = this.answers[0];
		return "A possible set of parameters was __" + givenAnswer + "__.";
	}

	async intersect(params: string[]): Promise<ParametersWorker.IParameterIntersectResult> {
		return ParametersWorker.intersect({
			mod: Dex.currentGenString,
			paramTypes: this.paramTypes,
			searchType: 'pokemon',
		}, params);
	}

	async checkAnswer(guess: string): Promise<string> {
		const parts = guess.split(',');
		if (parts.length === this.currentNumberOfParams) {
			const intersection = await this.intersect(parts);
			if (intersection.pokemon.join(',') === this.pokemon.join(',')) return Promise.resolve(this.getParamNames(intersection.params));
		}
		return Promise.resolve("");
	}
}

const tests: GameFileTests<ParasParameters> = {
	'should return proper values from Portmanteaus worker': {
		attributes: {
			async: true,
		},
		async test(game, format) {
			this.timeout(15000);
			ParametersWorker.init();
			for (const gen in ParametersWorker.data.pokemon.gens) {
				const types = Object.keys(ParametersWorker.data.pokemon.gens[gen].paramTypeDexes) as ParametersWorker.ParamType[];
				for (let i = 0; i < types.length; i++) {
					const type = types[i];
					const keys = Object.keys(ParametersWorker.data.pokemon.gens[gen].paramTypeDexes[type]);
					const checkTier = type === 'tier';
					for (let i = 0; i < keys.length; i++) {
						const key = Tools.toId(keys[i]);
						assert(key in ParametersWorker.data.pokemon.gens[gen].paramTypePools[type], key + ' in ' + type);
						if (checkTier) assert(keys[i].charAt(0) !== '(');
					}
				}
			}

			for (let i = format.customizableOptions.params.min; i <= format.customizableOptions.params.max; i++) {
				format.inputOptions.params = i;
				game.format.options.params = i;
				await game.onNextRound();
				assert(game.params.length);
				assert(game.pokemon.length);
			}
			delete format.inputOptions.params;
			delete game.format.options.params;

			game.customParamTypes = ['move', 'egggroup'];
			await game.onNextRound();
			assert(game.params.length);
			assert(game.pokemon.length);
			assert(game.params[0].type === 'move');
			assert(game.params[1].type === 'egggroup');
			game.customParamTypes = null;

			let intersection = await game.intersect(['rockclimb', 'steeltype']);
			assert.strictEqual(intersection.pokemon.join(","), "durant,excadrill,ferroseed,ferrothorn,steelix");
			intersection = await game.intersect(['poisontype', 'powerwhip']);
			assert.strictEqual(intersection.pokemon.join(","), "bellsprout,bulbasaur,ivysaur,roselia,roserade,venusaur,victreebel,weepinbell");
			intersection = await game.intersect(['gen1', 'psychic', 'psychictype']);
			assert.strictEqual(intersection.pokemon.join(","), "abra,alakazam,drowzee,exeggcute,exeggutor,hypno,jynx,kadabra,mew,mewtwo,mrmime,slowbro,slowpoke,starmie");
			intersection = await game.intersect(['firetype', 'thunder']);
			assert.strictEqual(intersection.pokemon.join(","), "arceusfire,castformsunny,groudonprimal,hooh,marowakalola,marowakalolatotem,rotomheat,victini");
			intersection = await game.intersect(['darktype', 'refresh']);
			assert.strictEqual(intersection.pokemon.join(","), "arceusdark,carvanha,nuzleaf,sharpedo,shiftry,umbreon");
			intersection = await game.intersect(['monstergroup', 'rockhead']);
			assert.strictEqual(intersection.pokemon.join(","), "aggron,aron,cubone,lairon,marowak,marowakalola,rhydon,rhyhorn,tyrantrum");
			// game.options.gen = 6;
			// game.format.options.gen = 6;
			// intersection = await game.intersect(['Weak to Rock Type', 'Earthquake']);
			// assert.strictEqual(intersection.pokemon.join(","), "abomasnow,aerodactyl,altaria,arceusbug,arceusfire,arceusflying,arceusice,archen,archeops,armaldo,aurorus,avalugg,charizard,crustle,darmanitan,dragonite,dwebble,glalie,gyarados,hooh,lugia,magcargo,magmortar,mantine,mantyke,pineco,pinsir,rayquaza,regice,salamence,scolipede,sealeo,shuckle,spheal,torkoal,tropius,typhlosion,volcanion,walrein");
			// intersection = await game.intersect(['Psycho Cut', 'Resists Fighting Type']);
			// assert.strictEqual(intersection.pokemon.join(","), "alakazam,cresselia,drowzee,gallade,hypno,kadabra,medicham,meditite,mewtwo");
			// delete game.options.gen;
			// delete game.format.options.gen;
		},
	},
};

export const game: IGameFile<ParasParameters> = Games.copyTemplateProperties(guessingGame, {
	aliases: ['paras', 'params'],
	class: ParasParameters,
	customizableOptions: {
		params: {min: 2, base: BASE_NUMBER_OF_PARAMS, max: 4},
		points: {min: 5, base: 5, max: 10},
	},
	description: "Players search for possible <code>/dexsearch</code> parameters that result in the given Pokemon list!",
	formerNames: ["Parameters"],
	freejoin: true,
	name,
	mascot: "Paras",
	minigameCommand: 'parameter',
	minigameCommandAliases: ['param'],
	minigameDescription: "Use ``/ds`` to verify and then ``" + Config.commandCharacter + "g`` to guess ``/ds`` parameters that give the following Pokemon!",
	tests,
	variants: [
		{
			name: "Paras' Parameters Survival",
			paramTypes: ['tier', 'color', 'type', 'egggroup', 'ability', 'gen'],
			mode: 'survival',
			variant: "survival",
		},
	],
	workers: [ParametersWorker],
});

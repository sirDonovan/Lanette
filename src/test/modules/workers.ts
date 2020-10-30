import { PRNG } from '../../prng';
import type { IParametersIntersectOptions, ParamType } from '../../workers/parameters';
import { assert, assertStrictEqual } from './../test-tools';

const allParamTypes: ParamType[] = ['move', 'tier', 'color', 'type', 'resistance', 'weakness', 'egggroup', 'ability', 'gen'];

/* eslint-env mocha */

describe("Parameters Worker", () => {
	it('should properly intersect parameters', async() => {
		let mod = 'gen8';
		let paramTypePools = Games.workers.parameters.workerData!.pokemon.gens[mod].paramTypePools;
		let baseOptions: IParametersIntersectOptions = {
			mod,
			params: [],
			paramTypes: allParamTypes,
			searchType: 'pokemon',
		};

		let intersection = await Games.workers.parameters.intersect(Object.assign(baseOptions,
			{params: [paramTypePools.type.steeltype, paramTypePools.move.rockclimb]}));
		assert(intersection);
		assertStrictEqual(intersection.params.length, 2);
		assertStrictEqual(intersection.pokemon.join(","), "arceussteel,durant,empoleon,excadrill,ferroseed,ferrothorn,steelix");

		intersection = await Games.workers.parameters.intersect(Object.assign(baseOptions,
			{params: [paramTypePools.type.poisontype, paramTypePools.move.powerwhip]}));
		assert(intersection);
		assertStrictEqual(intersection.params.length, 2);
		assertStrictEqual(intersection.pokemon.join(","), "bellsprout,bulbasaur,ivysaur,roselia,roserade,venusaur,victreebel," +
			"weepinbell");

		intersection = await Games.workers.parameters.intersect(Object.assign(baseOptions,
			{params: [paramTypePools.gen['gen1'], paramTypePools.move.psychic, paramTypePools.type.psychictype]}));
		assert(intersection);
		assertStrictEqual(intersection.pokemon.join(","), "abra,alakazam,drowzee,exeggcute,exeggutor,hypno,jynx,kadabra,mew,mewtwo," +
			"mrmime,slowbro,slowpoke,starmie");

		intersection = await Games.workers.parameters.intersect(Object.assign(baseOptions,
			{params: [paramTypePools.type.firetype, paramTypePools.move.thunder]}));
		assert(intersection);
		assertStrictEqual(intersection.pokemon.join(","), "arceusfire,castformsunny,groudonprimal,hooh,marowakalola," +
			"marowakalolatotem,rotomheat,victini");

		intersection = await Games.workers.parameters.intersect(Object.assign(baseOptions,
			{params: [paramTypePools.type.darktype, paramTypePools.move.refresh]}));
		assert(intersection);
		assertStrictEqual(intersection.pokemon.join(","), "arceusdark,carvanha,nuzleaf,sharpedo,shiftry,umbreon");

		intersection = await Games.workers.parameters.intersect(Object.assign(baseOptions,
			{params: [paramTypePools.egggroup.monstergroup, paramTypePools.ability.rockhead]}));
		assert(intersection);
		assertStrictEqual(intersection.pokemon.join(","), "aggron,aron,cubone,lairon,marowak,marowakalola,rhydon,rhyhorn,tyrantrum");

		intersection = await Games.workers.parameters.intersect(Object.assign(baseOptions,
			{params: [paramTypePools.gen['gen6'], paramTypePools.resistance.resistsice, paramTypePools.move.destinybond]}));
		assert(intersection);
		assertStrictEqual(intersection.pokemon.join(","), "aegislash,doublade,honedge,houndoommega,sharpedomega");

		intersection = await Games.workers.parameters.intersect(Object.assign(baseOptions,
			{params: [paramTypePools.weakness.weaktorock, paramTypePools.move.earthquake]}));
		assert(intersection);
		assertStrictEqual(intersection.pokemon.join(","), "abomasnow,aerodactyl,altaria,arceusbug,arceusfire,arceusflying,arceusice," +
			"archen,archeops,armaldo,aurorus,avalugg,charizard,coalossal,crustle,darmanitan,dragonite,dwebble,glalie,gyarados,hooh," +
			"incineroar,lugia,magcargo,magmortar,mantine,mantyke,marowakalola,marowakalolatotem,minior,pineco,pinsir,rayquaza," +
			"regice,salamence,scolipede,sealeo,shuckle,spheal,torkoal,tropius,turtonator,typhlosion,volcanion,walrein");

		intersection = await Games.workers.parameters.intersect(Object.assign(baseOptions,
			{params: [paramTypePools.move.psychocut, paramTypePools.resistance.resistsfighting]}));
		assert(intersection);
		assertStrictEqual(intersection.pokemon.join(","), "aegislash,alakazam,articunogalar,azelf,calyrexshadow,celebi,cresselia," +
			"decidueye,doublade,drowzee,exeggutor,gallade,hatterene,honedge,hypno,kadabra,latias,latios,lunala,medicham,meditite," +
			"mesprit,mew,mewtwo,necrozma,orbeetle,rapidashgalar,scyther,sigilyph,spectrier,starmie,swoobat,tapulele,uxie,woobat,zacian");

		mod = 'gen7';
		paramTypePools = Games.workers.parameters.workerData!.pokemon.gens[mod].paramTypePools;
		baseOptions = {
			mod,
			params: [],
			paramTypes: allParamTypes,
			searchType: 'pokemon',
		};

		intersection = await Games.workers.parameters.intersect(Object.assign(baseOptions,
			{params: [paramTypePools.type.steeltype, paramTypePools.move.rockclimb]}));
		assert(intersection);
		assertStrictEqual(intersection.params.length, 2);
		assertStrictEqual(intersection.pokemon.join(","), "durant,excadrill,ferroseed,ferrothorn,steelix");

		mod = 'gen6';
		paramTypePools = Games.workers.parameters.workerData!.pokemon.gens[mod].paramTypePools;
		baseOptions = {
			mod,
			params: [],
			paramTypes: allParamTypes,
			searchType: 'pokemon',
		};

		intersection = await Games.workers.parameters.intersect(Object.assign(baseOptions,
			{params: [paramTypePools.weakness.weaktorock, paramTypePools.move.earthquake]}));
		assert(intersection);
		assertStrictEqual(intersection.pokemon.join(","), "abomasnow,aerodactyl,altaria,arceusbug,arceusfire,arceusflying,arceusice," +
			"archen,archeops,armaldo,aurorus,avalugg,charizard,crustle,darmanitan,dragonite,dwebble,glalie,gyarados,hooh,lugia," +
			"magcargo,magmortar,mantine,mantyke,pineco,pinsir,rayquaza,regice,salamence,scolipede,sealeo,shuckle,spheal,torkoal," +
			"tropius,typhlosion,volcanion,walrein");

		intersection = await Games.workers.parameters.intersect(Object.assign(baseOptions,
			{params: [paramTypePools.move.psychocut, paramTypePools.resistance.resistsfighting]}));
		assert(intersection);
		assertStrictEqual(intersection.pokemon.join(","), "alakazam,cresselia,drowzee,gallade,hypno,kadabra,medicham,meditite,mewtwo");

		mod = 'gen1';
		paramTypePools = Games.workers.parameters.workerData!.pokemon.gens[mod].paramTypePools;
		baseOptions = {
			mod,
			params: [],
			paramTypes: allParamTypes,
			searchType: 'pokemon',
		};

		intersection = await Games.workers.parameters.intersect(Object.assign(baseOptions,
			{params: [paramTypePools.resistance.resistsghost, paramTypePools.type.normal]}));
		assert(intersection);
		assertStrictEqual(intersection.pokemon.join(","), "chansey,clefable,clefairy,ditto,dodrio,doduo,eevee,farfetchd,fearow," +
			"jigglypuff,kangaskhan,lickitung,meowth,persian,pidgeot,pidgeotto,pidgey,porygon,raticate,rattata,snorlax,spearow," +
			"tauros,wigglytuff");
	});
});

describe("Portmanteaus Worker", () => {
	it('should properly filter pools', () => {
		const tiers = Object.keys(Games.workers.portmanteaus.workerData!.pool['Pokemon']['tier']);
		assert(tiers.length);
		for (const tier of tiers) {
			assert(!tier.startsWith('('));
		}
	});
	it('should properly list portmanteaus', async() => {
		let result = await Games.workers.portmanteaus.search({
			customPortTypes: ['Pokemon', 'Move'],
			customPortCategories: ['egggroup', 'type'],
			customPortDetails: ['Flying', 'Fire'],
			numberOfPorts: 2,
			minLetters: 2,
			maxLetters: 4,
			prngSeed: new PRNG().initialSeed,
		});

		assert(result);
		assert(result.answers.length);
		assert(result.ports.length);
		assertStrictEqual(result.answers.join(','), 'pelipperuption,swablueflare,pidoverheat,fletchinderuption,oricoriosensunnyday');
		for (const answer of result.answers) {
			assert(answer in result.answerParts);
		}

		result = await Games.workers.portmanteaus.search({
			customPortTypes: ['Pokemon', 'Pokemon'],
			customPortCategories: ['color', 'type'],
			customPortDetails: ['Brown', 'Ground'],
			numberOfPorts: 2,
			minLetters: 2,
			maxLetters: 4,
			prngSeed: new PRNG().initialSeed,
		});

		assert(result);
		assert(result.answers.length);
		assert(result.ports.length);
		assert(result.answers.includes('teddiursandaconda'));
		assert(!result.answers.includes('teddiursandacondagmax'));
	});
});
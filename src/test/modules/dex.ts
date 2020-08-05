import { assert, assertStrictEqual } from './../test-tools';

/* eslint-env mocha */

describe("Dex", () => {
	it('should properly load data', () => {
		assert(Dex.data.abilityKeys.length > 1);
		assert(Dex.data.formatKeys.length > 1);
		assert(Dex.data.itemKeys.length > 1);
		assert(Dex.data.learnsetDataKeys.length > 1);
		assert(Dex.data.moveKeys.length > 1);
		assert(Dex.data.pokemonKeys.length > 1);
		assert(Dex.data.typeKeys.length > 1);

		assert(Dex.data.badges.length > 1);
		assert(Dex.data.characters.length > 1);
		assert(Dex.data.locations.length > 1);
		assert(Dex.data.trainerClasses.length > 1);

		assert(Object.keys(Dex.data.aliases).length > 1);
		assert(Object.keys(Dex.data.categories).length > 1);
		assert(Object.keys(Dex.data.colors).length > 1);
		assert(Object.keys(Dex.data.eggGroups).length > 1);
		assert(Object.keys(Dex.data.gifData).length > 1);
		assert(Object.keys(Dex.data.gifDataBW).length > 1);
		assert(Object.keys(Dex.data.natures).length > 1);

		// aliases
		assert(Dex.abilityCache.size > Dex.data.abilityKeys.length);
		assert(Dex.formatCache.size > Dex.data.formatKeys.length);
		assert(Dex.itemCache.size > Dex.data.itemKeys.length);
		assert(Dex.moveCache.size > Dex.data.moveKeys.length);
		assert(Dex.pokemonCache.size > Dex.data.pokemonKeys.length);

		// allPossibleMoves
		let pokemon = Dex.getExistingPokemon('Charizard');
		let allPossibleMoves = Dex.getAllPossibleMoves(pokemon);
		assert(allPossibleMoves.length > 1);
		let learnsetData = Dex.getLearnsetData(pokemon.id);
		assert(learnsetData && learnsetData.learnset && Object.keys(learnsetData.learnset).length > 1);
		assert(allPossibleMoves.length > Object.keys(learnsetData.learnset).length, pokemon.name);

		pokemon = Dex.getExistingPokemon('Lycanroc-Dusk');
		allPossibleMoves = Dex.getAllPossibleMoves(pokemon);
		assert(allPossibleMoves.length > 1);
		learnsetData = Dex.getLearnsetData(pokemon.id);
		assert(learnsetData && learnsetData.learnset && Object.keys(learnsetData.learnset).length > 1);
		assert(allPossibleMoves.length > Object.keys(learnsetData.learnset).length, pokemon.name);

		pokemon = Dex.getExistingPokemon('Rotom-Frost');
		allPossibleMoves = Dex.getAllPossibleMoves(pokemon);
		assert(allPossibleMoves.length > 1);
		learnsetData = Dex.getLearnsetData(pokemon.id);
		assert(learnsetData && learnsetData.learnset);
		assert(allPossibleMoves.length > Object.keys(learnsetData.learnset).length, pokemon.name);

		pokemon = Dex.getExistingPokemon('Pikachu-Gmax');
		allPossibleMoves = Dex.getAllPossibleMoves(pokemon);
		assert(allPossibleMoves.length > 1);

		const houndour = Dex.getExistingPokemon('Houndour');
		const houndoomMega = Dex.getExistingPokemon('Houndoom-Mega');
		const allPossibleMovesHoundour = Dex.getAllPossibleMoves(houndour);
		const allPossibleMovesHoundoomMega = Dex.getAllPossibleMoves(houndoomMega);
		for (const move of allPossibleMovesHoundour) {
			assert(allPossibleMovesHoundoomMega.includes(move));
		}

		const rattataAlola = Dex.getExistingPokemon('Rattata-Alola');
		const raticateAlola = Dex.getExistingPokemon('Raticate-Alola');
		const allPossibleMovesRattataAlola = Dex.getAllPossibleMoves(rattataAlola);
		const allPossibleMovesRaticateAlola = Dex.getAllPossibleMoves(raticateAlola);
		for (const move of allPossibleMovesRattataAlola) {
			assert(allPossibleMovesRaticateAlola.includes(move));
		}

		// other in-game data
		for (let i = 0; i < Dex.data.badges.length; i++) {
			assert(Dex.data.badges.indexOf(Dex.data.badges[i]) === i, "Duplicate badge " + Dex.data.badges[i]);
		}

		for (let i = 0; i < Dex.data.characters.length; i++) {
			assert(Dex.data.characters.indexOf(Dex.data.characters[i]) === i, "Duplicate character " + Dex.data.characters[i]);
		}

		const categoryKeys = Object.keys(Dex.data.categories);
		for (let i = Dex.gen; i >= 1; i--) {
			assertStrictEqual(Dex.getDex('gen' + i).getExistingPokemon('Pikachu').category, 'Mouse');
		}

		for (let i = 0; i < categoryKeys.length; i++) {
			assert(Tools.toId(categoryKeys[i]) === categoryKeys[i], categoryKeys[i] + " should be an ID in categories.js");
			assert(categoryKeys.indexOf(categoryKeys[i]) === i, "Duplicate category for " + categoryKeys[i]);
		}
	});
	it('should return data based on ids', () => {
		const ability = Dex.getAbility("Air Lock");
		assert(ability);
		let variants: string[] = ["airlock", "air lock", "Air lock", "air Lock", "AIRLOCK", "AIR LOCK"];
		for (const variant of variants) {
			assertStrictEqual(Dex.getAbility(variant), ability);
		}

		const format = Dex.getFormat("[Gen " + Dex.gen + "] OU");
		assert(format);
		variants = ["gen" + Dex.gen + "ou", "gen" + Dex.gen + " ou", "Gen" + Dex.gen + "ou", "Gen" + Dex.gen + " ou"];
		for (const variant of variants) {
			assertStrictEqual(Dex.getFormat(variant)!.name, format.name);
		}

		const item = Dex.getItem("Burn Drive");
		assert(item);
		variants = ["burndrive", "burn drive", "Burn drive", "burn Drive", "BURNDRIVE", "BURN DRIVE"];
		for (const variant of variants) {
			assertStrictEqual(Dex.getItem(variant), item);
		}

		const move = Dex.getMove("Acid Armor");
		assert(move);
		variants = ["acidarmor", "acid armor", "Acid armor", "acid Armor", "ACIDARMOR", "ACID ARMOR"];
		for (const variant of variants) {
			assertStrictEqual(Dex.getMove(variant), move);
		}

		const pokemon = Dex.getPokemon("Mr. Mime");
		assert(pokemon);
		variants = ["mrmime", "mr mime", "Mr mime", "mr Mime", "MRMIME", "MR MIME", "mr.mime", "mr. mime", "Mr. mime", "mr. Mime",
			"MR.MIME", "MR. MIME"];
		for (const variant of variants) {
			assertStrictEqual(Dex.getPokemon(variant), pokemon);
		}

		const learnsetData = Dex.getLearnsetData("Mr. Mime");
		assert(learnsetData);
		for (const variant of variants) {
			assertStrictEqual(Dex.getLearnsetData(variant), learnsetData);
		}
	});
	it('should support OMoTM# aliases', () => {
		assert(Dex.getFormat('omotm'));
		if (Dex.omotms.length > 1) assert(Dex.getFormat('omotm2'));
	});
	it('should set custom attributes for formats', () => {
		for (const i of Dex.data.formatKeys) {
			const format = Dex.getExistingFormat(i);
			assertStrictEqual(typeof format.quickFormat, 'boolean');
			assertStrictEqual(typeof format.tournamentPlayable, 'boolean');
			assertStrictEqual(typeof format.unranked, 'boolean');
		}
	});
	it('should return proper values from isImmune()', () => {
		assertStrictEqual(Dex.isImmune('Normal', 'Ghost'), true);
		assertStrictEqual(Dex.isImmune('Normal', ['Ghost']), true);
		assertStrictEqual(Dex.isImmune('Normal', Dex.getExistingPokemon('Duskull')), true);
		assertStrictEqual(Dex.isImmune(Dex.getExistingMove('Tackle'), 'Ghost'), true);
		assertStrictEqual(Dex.isImmune(Dex.getExistingMove('Tackle'), ['Ghost']), true);
		assertStrictEqual(Dex.isImmune(Dex.getExistingMove('Tackle'), Dex.getExistingPokemon('Duskull')), true);

		assertStrictEqual(Dex.isImmune('Water', 'Fire'), false);
		assertStrictEqual(Dex.isImmune('Water', ['Fire']), false);
		assertStrictEqual(Dex.isImmune('Water', Dex.getExistingPokemon("Charmander")), false);
		assertStrictEqual(Dex.isImmune(Dex.getExistingMove("Surf"), 'Fire'), false);
		assertStrictEqual(Dex.isImmune(Dex.getExistingMove("Surf"), ['Fire']), false);
		assertStrictEqual(Dex.isImmune(Dex.getExistingMove("Surf"), Dex.getExistingPokemon("Charmander")), false);
	});
	it('should return proper values from getEffectiveness()', () => {
		assertStrictEqual(Dex.getEffectiveness('Water', 'Fire'), 1);
		assertStrictEqual(Dex.getEffectiveness('Water', ['Fire']), 1);
		assertStrictEqual(Dex.getEffectiveness('Water', Dex.getExistingPokemon('Charmander')), 1);
		assertStrictEqual(Dex.getEffectiveness(Dex.getExistingMove('Surf'), 'Fire'), 1);
		assertStrictEqual(Dex.getEffectiveness(Dex.getExistingMove('Surf'), ['Fire']), 1);
		assertStrictEqual(Dex.getEffectiveness(Dex.getExistingMove('Surf'), Dex.getExistingPokemon('Charmander')), 1);

		assertStrictEqual(Dex.getEffectiveness('Fire', 'Water'), -1);
		assertStrictEqual(Dex.getEffectiveness('Fire', ['Water']), -1);
		assertStrictEqual(Dex.getEffectiveness('Fire', Dex.getExistingPokemon('Squirtle')), -1);
		assertStrictEqual(Dex.getEffectiveness(Dex.getExistingMove('Ember'), 'Water'), -1);
		assertStrictEqual(Dex.getEffectiveness(Dex.getExistingMove('Ember'), ['Water']), -1);
		assertStrictEqual(Dex.getEffectiveness(Dex.getExistingMove('Ember'), Dex.getExistingPokemon('Squirtle')), -1);

		assertStrictEqual(Dex.getEffectiveness('Normal', 'Ghost'), 0);
		assertStrictEqual(Dex.getEffectiveness('Normal', ['Ghost']), 0);
		assertStrictEqual(Dex.getEffectiveness('Normal', Dex.getExistingPokemon('Duskull')), 0);
		assertStrictEqual(Dex.getEffectiveness(Dex.getExistingMove('Tackle'), 'Ghost'), 0);
		assertStrictEqual(Dex.getEffectiveness(Dex.getExistingMove('Tackle'), ['Ghost']), 0);
		assertStrictEqual(Dex.getEffectiveness(Dex.getExistingMove('Tackle'), Dex.getExistingPokemon('Duskull')), 0);
	});
	it('should return proper values from getEvolutionLines()', () => {
		const pokemonList = ['Charmander', 'Charmeleon', 'Charizard'];
		for (const pokemon of pokemonList) {
			const evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon(pokemon));
			assertStrictEqual(evolutionLines.length, 1);
			assertStrictEqual(evolutionLines[0].join(","), 'Charmander,Charmeleon,Charizard');
		}

		let evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon('Ditto'));
		assertStrictEqual(evolutionLines.length, 1);
		assertStrictEqual(evolutionLines[0].join(','), 'Ditto');

		evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon('Gloom'));
		assertStrictEqual(evolutionLines.length, 2);
		assertStrictEqual(evolutionLines[0].join(","), 'Oddish,Gloom,Vileplume');
		assertStrictEqual(evolutionLines[1].join(","), 'Oddish,Gloom,Bellossom');
		evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon('Vileplume'));
		assertStrictEqual(evolutionLines.length, 1);
		assertStrictEqual(evolutionLines[0].join(","), 'Oddish,Gloom,Vileplume');
		evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon('Bellossom'));
		assertStrictEqual(evolutionLines.length, 1);
		assertStrictEqual(evolutionLines[0].join(","), 'Oddish,Gloom,Bellossom');

		evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon('Tyrogue'));
		assertStrictEqual(evolutionLines.length, 3);
		assertStrictEqual(evolutionLines[0].join(","), 'Tyrogue,Hitmonlee');
		assertStrictEqual(evolutionLines[1].join(","), 'Tyrogue,Hitmonchan');
		assertStrictEqual(evolutionLines[2].join(","), 'Tyrogue,Hitmontop');

		evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon('Zigzagoon'));
		assertStrictEqual(evolutionLines.length, 1);
		assertStrictEqual(evolutionLines[0].join(","), 'Zigzagoon,Linoone');
		evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon('Linoone'));
		assertStrictEqual(evolutionLines.length, 1);
		assertStrictEqual(evolutionLines[0].join(","), 'Zigzagoon,Linoone');
		evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon('Zigzagoon'), ['Zigzagoon-Galar']);
		assertStrictEqual(evolutionLines.length, 2);
		assertStrictEqual(evolutionLines[0].join(","), 'Zigzagoon,Linoone');
		assertStrictEqual(evolutionLines[1].join(","), 'Zigzagoon-Galar,Linoone-Galar,Obstagoon');
		evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon('Zigzagoon-Galar'));
		assertStrictEqual(evolutionLines.length, 1);
		assertStrictEqual(evolutionLines[0].join(","), 'Zigzagoon-Galar,Linoone-Galar,Obstagoon');
		evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon('Linoone-Galar'));
		assertStrictEqual(evolutionLines.length, 1);
		assertStrictEqual(evolutionLines[0].join(","), 'Zigzagoon-Galar,Linoone-Galar,Obstagoon');
		evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon('Obstagoon'));
		assertStrictEqual(evolutionLines.length, 1);
		assertStrictEqual(evolutionLines[0].join(","), 'Zigzagoon-Galar,Linoone-Galar,Obstagoon');
	});
	it('should return proper values from isEvolutionFamily()', () => {
		assert(Dex.isEvolutionFamily(['Charmander', 'Charmeleon', 'Charizard']));
		assert(Dex.isEvolutionFamily(['Charmander', 'Charmeleon']));
		assert(Dex.isEvolutionFamily(['Charmeleon', 'Charizard']));
		assert(Dex.isEvolutionFamily(['Charmander', 'Charizard']));
		assert(Dex.isEvolutionFamily(['Charmander']));
		assert(Dex.isEvolutionFamily(['Charmeleon']));
		assert(Dex.isEvolutionFamily(['Charizard']));
		assert(!Dex.isEvolutionFamily(['Bulbasaur', 'Charmeleon', 'Charizard']));
		assert(Dex.isEvolutionFamily(['Tyrogue', 'Hitmonlee']));
		assert(Dex.isEvolutionFamily(['Tyrogue', 'Hitmonchan']));
		assert(Dex.isEvolutionFamily(['Tyrogue', 'Hitmontop']));
		assert(!Dex.isEvolutionFamily(['Tyrogue', 'Hitmonlee', 'Hitmonchan']));
		assert(Dex.isEvolutionFamily(['Oddish', 'Gloom', 'Vileplume']));
		assert(Dex.isEvolutionFamily(['Oddish', 'Gloom', 'Bellossom']));
		assert(Dex.isEvolutionFamily(['Oddish', 'Vileplume']));
		assert(Dex.isEvolutionFamily(['Oddish', 'Bellossom']));
	});
	it('should return proper values from includesPokemon()', () => {
		assert(Dex.includesPokemon(['Pikachu'], ['Pikachu']));
		assert(Dex.includesPokemon(['Pikachu', 'Charmander'], ['Pikachu']));
		assert(Dex.includesPokemon([Dex.getExistingPokemon('Pikachu')], ['Pikachu']));
		assert(Dex.includesPokemon([Dex.getExistingPokemon('Pikachu'), Dex.getExistingPokemon('Charmander')], ['Pikachu']));

		assert(!Dex.includesPokemon(['Pikachu'], ['Pikachu', 'Charmander']));
		assert(!Dex.includesPokemon(['Pikachu'], ['Charmander']));
		assert(!Dex.includesPokemon([Dex.getExistingPokemon('Pikachu')], ['Pikachu', 'Charmander']));
		assert(!Dex.includesPokemon([Dex.getExistingPokemon('Pikachu')], ['Charmander']));
	});
	it('should return proper values from isPossibleTeam()', () => {
		let teams = [[Dex.getExistingPokemon('Charmander'), Dex.getExistingPokemon('Squirtle')]];
		assert(Dex.isPossibleTeam(['Charmander', 'Squirtle'], teams));
		assert(!Dex.isPossibleTeam(['Charmander'], teams));
		assert(!Dex.isPossibleTeam(['Squirtle'], teams));

		teams = [[Dex.getExistingPokemon('Squirtle'), Dex.getExistingPokemon('Charmander')]];
		assert(Dex.isPossibleTeam(['Charmander', 'Squirtle'], teams));
		assert(!Dex.isPossibleTeam(['Charmander'], teams));
		assert(!Dex.isPossibleTeam(['Squirtle'], teams));
	});
	it('should return proper values from getPossibleTeams()', () => {
		// catch and evolve

		// 1 optional addition and 1 optional evolution
		let possibleTeams = Dex.getPossibleTeams([[Dex.getExistingPokemon("Pikachu")]], ["Charmander"], 1, 1)
			.map(x => x.map(y => y.name).join(','));
		assert(possibleTeams.includes('Pikachu'));
		assert(possibleTeams.includes('Raichu'));
		assert(possibleTeams.includes('Charmander,Pikachu'));
		assert(possibleTeams.includes('Charmeleon,Pikachu'));
		assert(possibleTeams.includes('Charmander,Raichu'));
		assert(!possibleTeams.includes('Charmeleon,Raichu'));

		// 1 required addition and 1 optional evolution
		possibleTeams = Dex.getPossibleTeams([[Dex.getExistingPokemon("Pikachu")]], ["Charmander"], 1, 1, true)
			.map(x => x.map(y => y.name).join(','));
		assert(!possibleTeams.includes('Pikachu'));
		assert(!possibleTeams.includes('Raichu'));
		assert(possibleTeams.includes('Charmander,Pikachu'));
		assert(possibleTeams.includes('Charmeleon,Pikachu'));
		assert(possibleTeams.includes('Charmander,Raichu'));
		assert(!possibleTeams.includes('Charmeleon,Raichu'));

		// 1 required addition and 1 required evolution
		possibleTeams = Dex.getPossibleTeams([[Dex.getExistingPokemon("Pikachu")]], ["Charmander"], 1, 1, true, true)
			.map(x => x.map(y => y.name).join(','));
		assert(!possibleTeams.includes('Pikachu'));
		assert(!possibleTeams.includes('Raichu'));
		assert(!possibleTeams.includes('Charmander,Pikachu'));
		assert(possibleTeams.includes('Charmeleon,Pikachu'));
		assert(possibleTeams.includes('Charmander,Raichu'));
		assert(!possibleTeams.includes('Charmeleon,Raichu'));

		// 1 optional addition and 1 required evolution
		possibleTeams = Dex.getPossibleTeams([[Dex.getExistingPokemon("Pikachu")]], ["Charmander"], 1, 1, false, true)
			.map(x => x.map(y => y.name).join(','));
		assert(!possibleTeams.includes('Pikachu'));
		assert(possibleTeams.includes('Raichu'));
		assert(!possibleTeams.includes('Charmander,Pikachu'));
		assert(possibleTeams.includes('Charmeleon,Pikachu'));
		assert(possibleTeams.includes('Charmander,Raichu'));
		assert(!possibleTeams.includes('Charmeleon,Raichu'));


		// catch and de-volve

		// 1 optional addition and 1 optional de-volution
		possibleTeams = Dex.getPossibleTeams([[Dex.getExistingPokemon("Raichu")]], ["Charizard"], 1, -1)
			.map(x => x.map(y => y.name).join(','));
		assert(possibleTeams.includes('Raichu'));
		assert(possibleTeams.includes('Pikachu'));
		assert(possibleTeams.includes('Charizard,Raichu'));
		assert(possibleTeams.includes('Charizard,Pikachu'));
		assert(possibleTeams.includes('Charmeleon,Raichu'));
		assert(!possibleTeams.includes('Charmeleon,Pikachu'));

		// 1 required addition and 1 optional de-volution
		possibleTeams = Dex.getPossibleTeams([[Dex.getExistingPokemon("Raichu")]], ["Charizard"], 1, -1, true)
			.map(x => x.map(y => y.name).join(','));
		assert(!possibleTeams.includes('Raichu'));
		assert(!possibleTeams.includes('Pikachu'));
		assert(possibleTeams.includes('Charizard,Raichu'));
		assert(possibleTeams.includes('Charizard,Pikachu'));
		assert(possibleTeams.includes('Charmeleon,Raichu'));
		assert(!possibleTeams.includes('Charmeleon,Pikachu'));

		// 1 required addition and 1 required de-volution
		possibleTeams = Dex.getPossibleTeams([[Dex.getExistingPokemon("Raichu")]], ["Charizard"], 1, -1, true, true)
			.map(x => x.map(y => y.name).join(','));
		assert(!possibleTeams.includes('Raichu'));
		assert(!possibleTeams.includes('Pikachu'));
		assert(!possibleTeams.includes('Charizard,Raichu'));
		assert(possibleTeams.includes('Charizard,Pikachu'));
		assert(possibleTeams.includes('Charmeleon,Raichu'));
		assert(!possibleTeams.includes('Charmeleon,Pikachu'));

		// 1 optional addition and 1 required de-volution
		possibleTeams = Dex.getPossibleTeams([[Dex.getExistingPokemon("Raichu")]], ["Charizard"], 1, -1, false, true)
			.map(x => x.map(y => y.name).join(','));
		assert(!possibleTeams.includes('Raichu'));
		assert(possibleTeams.includes('Pikachu'));
		assert(!possibleTeams.includes('Charizard,Raichu'));
		assert(possibleTeams.includes('Charizard,Pikachu'));
		assert(possibleTeams.includes('Charmeleon,Raichu'));
		assert(!possibleTeams.includes('Charmeleon,Pikachu'));

		// no evolutions left
		let initialTeams = Dex.getPossibleTeams([[Dex.getExistingPokemon("Pikachu")]], ["Charizard"], 1, 1, false, true);
		initialTeams = Dex.getPossibleTeams(initialTeams, ["Blastoise"], 1, 1, false, true);
		possibleTeams = Dex.getPossibleTeams(initialTeams, ["Venusaur"], 1, 1, false, true).map(x => x.map(y => y.name).join(','));
		assert(possibleTeams.includes('Raichu'));
		assert(possibleTeams.includes('Charizard,Raichu'));
		assert(possibleTeams.includes('Charizard,Blastoise,Raichu'));
		assert(possibleTeams.includes('Venusaur,Charizard,Blastoise,Raichu'));

		assert(!possibleTeams.includes('Pikachu'));
		assert(!possibleTeams.includes('Charizard,Pikachu'));
		assert(!possibleTeams.includes('Charizard,Blastoise,Pikachu'));
		assert(!possibleTeams.includes('Venusaur,Charizard,Blastoise,Pikachu'));

		// no de-volutions are left
		initialTeams = Dex.getPossibleTeams([[Dex.getExistingPokemon("Pikachu")]], ["Charmander"], 1, -1, false, true);
		initialTeams = Dex.getPossibleTeams(initialTeams, ["Squirtle"], 1, -1, false, true);
		possibleTeams = Dex.getPossibleTeams(initialTeams, ["Bulbasaur"], 1, -1, false, true)
			.map(x => x.map(y => y.name).join(','));
		assert(possibleTeams.includes('Pichu'));
		assert(possibleTeams.includes('Charmander,Pichu'));
		assert(possibleTeams.includes('Charmander,Squirtle,Pichu'));
		assert(possibleTeams.includes('Bulbasaur,Charmander,Squirtle,Pichu'));

		assert(!possibleTeams.includes('Pikachu'));
		assert(!possibleTeams.includes('Charmander,Pikachu'));
		assert(!possibleTeams.includes('Charmander,Squirtle,Pikachu'));
		assert(!possibleTeams.includes('Bulbasaur,Charmander,Squirtle,Pikachu'));

		// split evolutions
		possibleTeams = Dex.getPossibleTeams([[Dex.getExistingPokemon("Gloom")]], ["Charmander"], 1, 1)
			.map(x => x.map(y => y.name).join(','));
		assert(possibleTeams.includes('Charmander,Vileplume'));
		assert(possibleTeams.includes('Charmander,Bellossom'));
	});
	it('should return proper values from getList methods', () => {
		const abilities = Dex.getAbilitiesList().map(x => x.name);
		const items = Dex.getItemsList().map(x => x.name);
		const moves = Dex.getMovesList().map(x => x.name);
		const pokemon = Dex.getPokemonList().map(x => x.name);

		assert(abilities.length);
		assert(items.length);
		assert(moves.length);
		assert(pokemon.length);

		assert(!abilities.includes(Dex.getExistingAbility('No Ability').name));

		// LGPE/CAP/Glitch/Pokestar
		assert(!abilities.includes(Dex.getExistingAbility('Mountaineer').name));
		assert(!items.includes(Dex.getExistingItem('Crucibellite').name));
		assert(!moves.includes(Dex.getExistingMove('Baddy Bad').name));
		assert(!moves.includes(Dex.getExistingMove('Paleo Wave').name));
		assert(!pokemon.includes(Dex.getExistingPokemon('Pikachu-Starter').name));
		assert(!pokemon.includes(Dex.getExistingPokemon('Voodoom').name));
		assert(!pokemon.includes(Dex.getExistingPokemon('Missingno.').name));
		assert(!pokemon.includes(Dex.getExistingPokemon('Pokestar Smeargle').name));

		assert(abilities.includes(Dex.getExistingAbility('Intimidate').name));

		assert(items.includes(Dex.getExistingItem('Abomasite').name));
		assert(items.includes(Dex.getExistingItem('Choice Scarf').name));
		assert(items.includes(Dex.getExistingItem('Custap Berry').name));

		assert(moves.includes(Dex.getExistingMove('Aeroblast').name));
		assert(moves.includes(Dex.getExistingMove('Tackle').name));
		assert(moves.includes(Dex.getExistingMove('Thousand Arrows').name));

		assert(pokemon.includes(Dex.getExistingPokemon('Bulbasaur').name));
		assert(pokemon.includes(Dex.getExistingPokemon('Charmander').name));
		assert(pokemon.includes(Dex.getExistingPokemon('Slowpoke').name));
	});
	it('should have entries in Tools.pokemonColorHexColors for all Pokemon and moves', () => {
		for (const i of Dex.data.pokemonKeys) {
			const pokemon = Dex.getExistingPokemon(i);
			assert(pokemon.color in Tools.pokemonColorHexColors, pokemon.name + "'s color " + pokemon.color);
			for (const type of pokemon.types) {
				assert(type in Tools.typeHexColors, pokemon.name + "'s type " + type);
			}
		}

		for (const i of Dex.data.moveKeys) {
			const move = Dex.getExistingMove(i);
			assert(move.type in Tools.typeHexColors, move.name);
		}
	});
});

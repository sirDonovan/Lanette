import { assert, assertStrictEqual } from './../test-tools';

describe("Dex", () => {
	it('should compute all data types properly', () => {
		for (const i in Dex.data.abilities) {
			assert(Dex.getExistingAbility(i), i);
		}
		for (const i in Dex.data.formats) {
			assert(Dex.getExistingFormat(i), i);
		}
		for (const i in Dex.data.items) {
			assert(Dex.getExistingItem(i), i);
		}
		for (const i in Dex.data.moves) {
			assert(Dex.getExistingMove(i), i);
		}
		for (const i in Dex.data.pokedex) {
			assert(Dex.getExistingPokemon(i), i);
		}

		// abilities
		assertStrictEqual(Dex.getDex('gen2').getExistingAbility('Intimidate').isNonstandard, 'Future');
		assert(!Dex.getDex('gen3').getExistingAbility('Intimidate').isNonstandard);

		// items
		assertStrictEqual(Dex.getDex('gen1').getExistingItem('Gold Berry').isNonstandard, 'Future');
		assert(!Dex.getDex('gen2').getExistingItem('Gold Berry').isNonstandard);
		assertStrictEqual(Dex.getDex('gen3').getExistingItem('Gold Berry').isNonstandard, 'Past');

		// pokemon
		assertStrictEqual(Dex.getDex('gen1').getExistingPokemon('Togepi').isNonstandard, 'Future');
		assert(!Dex.getDex('gen2').getExistingPokemon('Togepi').isNonstandard);
		assert(!Dex.getDex('gen4').getExistingPokemon('Pichu-Spiky-Eared').isNonstandard);
		assertStrictEqual(Dex.getDex('gen5').getExistingPokemon('Pichu=Spiky-Eared').isNonstandard, 'Past');

		assertStrictEqual(Dex.getExistingPokemon("Darmanitan").gen, 5);
		assertStrictEqual(Dex.getExistingPokemon("Darmanitan-Zen").gen, 5);
		assertStrictEqual(Dex.getExistingPokemon("Darmanitan-Galar").gen, 8);
		assertStrictEqual(Dex.getExistingPokemon("Darmanitan-Galar-Zen").gen, 8);
		assertStrictEqual(Dex.getExistingPokemon("Greninja").gen, 6);
		assertStrictEqual(Dex.getExistingPokemon("Ash Greninja").gen, 7);

		let pokemon = Dex.getExistingPokemon('Charizard');
		assert(pokemon.allPossibleMoves.length > Object.keys(pokemon.learnset!).length, pokemon.species);
		pokemon = Dex.getExistingPokemon('Lycanroc-Dusk');
		assert(pokemon.allPossibleMoves.length > Object.keys(pokemon.learnset!).length, pokemon.species);
		pokemon = Dex.getExistingPokemon('Rotom-Frost');
		assert(pokemon.allPossibleMoves.length > Object.keys(pokemon.learnset!).length, pokemon.species);
		pokemon = Dex.getExistingPokemon('Pikachu-Gmax');
		assert(pokemon.allPossibleMoves.length > Object.keys(pokemon.learnset!).length, pokemon.species);

		const houndour = Dex.getExistingPokemon('Houndour');
		const houndoomMega = Dex.getExistingPokemon('Houndoom-Mega');
		for (let i = 0; i < houndour.allPossibleMoves.length; i++) {
			assert(houndoomMega.allPossibleMoves.includes(houndour.allPossibleMoves[i]));
		}

		const rattataAlola = Dex.getExistingPokemon('Rattata-Alola');
		const raticateAlola = Dex.getExistingPokemon('Raticate-Alola');
		for (let i = 0; i < rattataAlola.allPossibleMoves.length; i++) {
			assert(raticateAlola.allPossibleMoves.includes(rattataAlola.allPossibleMoves[i]));
		}

		/*
		assertStrictEqual(Dex.getExistingPokemon('Arceus').tier, 'Uber');
		assertStrictEqual(Dex.getExistingPokemon('Arceus-Bug').tier, 'Uber');
		assertStrictEqual(Dex.getExistingPokemon('Lurantis').tier, 'PU');
		assertStrictEqual(Dex.getExistingPokemon('Lurantis-Totem').tier, 'PU');
		*/
		assertStrictEqual(Dex.getDex('gen1').getExistingPokemon('Togetic').tier, 'Illegal');

		// moves
		assertStrictEqual(Dex.getDex('gen6').getExistingMove('Baddy Bad').isNonstandard, 'Future');
		assertStrictEqual(Dex.getDex('gen7').getExistingMove('Baddy Bad').isNonstandard, 'LGPE');

		// other in-game data
		for (let i = 0; i < Dex.data.badges.length; i++) {
			assert(Dex.data.badges.indexOf(Dex.data.badges[i]) === i, "Duplicate badge " + Dex.data.badges[i]);
		}

		for (let i = 0; i < Dex.data.characters.length; i++) {
			assert(Dex.data.characters.indexOf(Dex.data.characters[i]) === i, "Duplicate character " + Dex.data.characters[i]);
		}

		const categoryKeys = Object.keys(Dex.data.categories);
		for (let i = 0; i < categoryKeys.length; i++) {
			assert(Tools.toId(categoryKeys[i]) === categoryKeys[i], categoryKeys[i] + " should be an ID in categories.js");
			assert(categoryKeys.indexOf(categoryKeys[i]) === i, "Duplicate category for " + categoryKeys[i]);
		}
	});
	it('should support OMoTM# aliases', () => {
		assert(Dex.getFormat('omotm'));
		if (Dex.omotms.length > 1) assert(Dex.getFormat('omotm2'));
	});
	it('should return proper values from getEvolutionLines()', () => {
		const pokemon = ['Charmander', 'Charmeleon', 'Charizard'];
		for (let i = 0; i < pokemon.length; i++) {
			const evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon(pokemon[i]));
			assert(evolutionLines.length === 1);
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
	});
	it('should return proper values from getList methods', () => {
		const abilities = Dex.getAbilitiesList().map(x => x.name);
		const items = Dex.getItemsList().map(x => x.name);
		const moves = Dex.getMovesList().map(x => x.name);
		const pokemon = Dex.getPokemonList().map(x => x.species);

		assert(!abilities.includes(Dex.getExistingAbility('No Ability').name));

		// LGPE/CAP/Glitch/Pokestar
		assert(!abilities.includes(Dex.getExistingAbility('Mountaineer').name));
		assert(!items.includes(Dex.getExistingItem('Crucibellite').name));
		assert(!moves.includes(Dex.getExistingMove('Baddy Bad').name));
		assert(!moves.includes(Dex.getExistingMove('Paleo Wave').name));
		assert(!pokemon.includes(Dex.getExistingPokemon('Pikachu-Starter').species));
		assert(!pokemon.includes(Dex.getExistingPokemon('Voodoom').species));
		assert(!pokemon.includes(Dex.getExistingPokemon('Missingno.').species));
		assert(!pokemon.includes(Dex.getExistingPokemon('Pokestar Smeargle').species));

		// not available in Sword/Shield
		assert(items.includes(Dex.getExistingItem('Abomasite').name));
		assert(moves.includes(Dex.getExistingMove('Aeroblast').name));
		assert(pokemon.includes(Dex.getExistingPokemon('Bulbasaur').species));

		// available in Sword/Shield
		assert(abilities.includes(Dex.getExistingAbility('Intimidate').name));
		assert(items.includes(Dex.getExistingItem('Choice Scarf').name));
		assert(moves.includes(Dex.getExistingMove('Tackle').name));
		assert(pokemon.includes(Dex.getExistingPokemon('Charmander').species));
	});
});

import { assert } from './../test-tools';

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
		assert(Dex.getDex('gen2').getExistingAbility('Intimidate').isNonstandard === 'Future');
		assert(!Dex.getDex('gen3').getExistingAbility('Intimidate').isNonstandard);

		// items
		assert(Dex.getDex('gen1').getExistingItem('Gold Berry').isNonstandard === 'Future');
		assert(!Dex.getDex('gen2').getExistingItem('Gold Berry').isNonstandard);
		assert(Dex.getDex('gen3').getExistingItem('Gold Berry').isNonstandard === 'Past');

		// pokemon
		assert(Dex.getDex('gen1').getExistingPokemon('Togepi').isNonstandard === 'Future');
		assert(!Dex.getDex('gen2').getExistingPokemon('Togepi').isNonstandard);
		assert(!Dex.getDex('gen4').getExistingPokemon('Pichu-Spiky-Eared').isNonstandard);
		assert(Dex.getDex('gen5').getExistingPokemon('Pichu=Spiky-Eared').isNonstandard === 'Past');

		let pokemon = Dex.getExistingPokemon('Charizard');
		assert(pokemon.allPossibleMoves.length > Object.keys(pokemon.learnset!).length, pokemon.species);
		pokemon = Dex.getExistingPokemon('Lycanroc-Dusk');
		assert(pokemon.allPossibleMoves.length > Object.keys(pokemon.learnset!).length, pokemon.species);
		pokemon = Dex.getExistingPokemon('Rotom-Frost');
		assert(pokemon.allPossibleMoves.length > Object.keys(pokemon.learnset!).length, pokemon.species);
		pokemon = Dex.getExistingPokemon('Pikachu-Gmax');
		assert(pokemon.allPossibleMoves.length > Object.keys(pokemon.learnset!).length, pokemon.species);

		/*
		assert(Dex.getExistingPokemon('Arceus').tier === 'Uber');
		assert(Dex.getExistingPokemon('Arceus-Bug').tier === 'Uber');
		assert(Dex.getExistingPokemon('Lurantis').tier === 'PU');
		assert(Dex.getExistingPokemon('Lurantis-Totem').tier === 'PU');
		*/
		assert(Dex.getDex('gen1').getExistingPokemon('Togetic').tier === 'Illegal');

		// moves
		assert(Dex.getDex('gen6').getExistingMove('Baddy Bad').isNonstandard === 'Future');
		assert(Dex.getDex('gen7').getExistingMove('Baddy Bad').isNonstandard === 'LGPE');
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
			assert(evolutionLines[0].join(",") === 'Charmander,Charmeleon,Charizard');
		}

		let evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon('Ditto'));
		assert(evolutionLines.length === 1);
		assert(evolutionLines[0].join(',') === 'Ditto');

		evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon('Gloom'));
		assert(evolutionLines.length === 2);
		assert(evolutionLines[0].join(",") === 'Oddish,Gloom,Vileplume');
		assert(evolutionLines[1].join(",") === 'Oddish,Gloom,Bellossom');
		evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon('Vileplume'));
		assert(evolutionLines.length === 1);
		assert(evolutionLines[0].join(",") === 'Oddish,Gloom,Vileplume');
		evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon('Bellossom'));
		assert(evolutionLines.length === 1);
		assert(evolutionLines[0].join(",") === 'Oddish,Gloom,Bellossom');

		evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon('Tyrogue'));
		assert(evolutionLines.length === 3);
		assert(evolutionLines[0].join(",") === 'Tyrogue,Hitmonlee');
		assert(evolutionLines[1].join(",") === 'Tyrogue,Hitmonchan');
		assert(evolutionLines[2].join(",") === 'Tyrogue,Hitmontop');
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

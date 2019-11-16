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
	});
	it('should support OMoTM# aliases', () => {
		assert(Dex.getFormat('omotm'));
		if (Dex.omotms.length > 1) assert(Dex.getFormat('omotm2'));
	});
	it('should compute Pokemon properties properly', () => {
		// allPossibleMoves
		let pokemon = Dex.getExistingPokemon('Charizard');
		assert(pokemon.allPossibleMoves.length > Object.keys(pokemon.learnset!).length, pokemon.species);
		pokemon = Dex.getExistingPokemon('Lycanroc-Dusk');
		assert(pokemon.allPossibleMoves.length > Object.keys(pokemon.learnset!).length, pokemon.species);
		pokemon = Dex.getExistingPokemon('Rotom-Frost');
		assert(pokemon.allPossibleMoves.length > Object.keys(pokemon.learnset!).length, pokemon.species);

		// tiers
		assert(Dex.getExistingPokemon('Arceus').tier === 'Uber');
		assert(Dex.getExistingPokemon('Arceus-Bug').tier === 'Uber');
		assert(Dex.getExistingPokemon('Lurantis').tier === 'PU');
		assert(Dex.getExistingPokemon('Lurantis-Totem').tier === 'PU');
		assert(Dex.getDex('gen1').getExistingPokemon('Togetic').tier === 'Illegal');
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
});

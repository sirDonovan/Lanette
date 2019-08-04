import assert = require('assert');

describe("Dex", () => {
	it('should support OMoTM# aliases', () => {
		assert(Dex.getFormat('omotm'));
		assert(Dex.getFormat('omotm2'));
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

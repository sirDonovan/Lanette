import { assert, assertStrictEqual } from "../test-tools";

const second = 1000;
const minute = 60 * second;
const hour = 60 * minute;
const day = 24 * hour;
const month = 31 * day;
const year = 365 * day;

describe("Tools", () => {
	it('should return proper values from deepClone()', () => {
		const array = ['a'];
		const arrayClone = Tools.deepClone(array);
		assertStrictEqual(arrayClone.length, 1);
		assert(array !== arrayClone);
		arrayClone[0] = 'b';
		assertStrictEqual(array[0], 'a');

		const object = {letter: 'a'};
		const objectClone = Tools.deepClone(object);
		assert(object !== objectClone);
		objectClone.letter = 'b';
		assertStrictEqual(object.letter, 'a');

		const arrayObject = [{letter: 'a'}];
		const arrayObjectClone = Tools.deepClone(arrayObject);
		assertStrictEqual(arrayObjectClone.length, 1);
		assert(arrayObject !== arrayObjectClone);
		arrayObjectClone[0].letter = 'b';
		assertStrictEqual(arrayObject[0].letter, 'a');

		const objectArray = {letters: ['a']};
		const objectArrayClone = Tools.deepClone(objectArray);
		assertStrictEqual(objectArrayClone.letters.length, 1);
		assert(objectArray !== objectArrayClone);
		objectArrayClone.letters[0] = 'b';
		assertStrictEqual(objectArray.letters[0], 'a');
	});
	it('should return proper values from isInteger()', () => {
		assert(Tools.isInteger('0'));
		assert(Tools.isInteger('1'));
		assert(Tools.isInteger('01'));
		assert(Tools.isInteger('10'));
		assert(Tools.isInteger('-1'));
		assert(!Tools.isInteger('0.1'));
		assert(!Tools.isInteger('-0.1'));
		assert(!Tools.isInteger('a'));
		assert(!Tools.isInteger('-a'));
		assert(!Tools.isInteger('0a'));
		assert(!Tools.isInteger('-0a'));
		assert(!Tools.isInteger('a0'));
		assert(!Tools.isInteger('-a0'));
		assert(!Tools.isInteger(''));
		assert(!Tools.isInteger(' '));
		assert(!Tools.isInteger('-'));
	});
	it('should return proper values from isFloat()', () => {
		assert(Tools.isFloat('0'));
		assert(Tools.isFloat('1'));
		assert(Tools.isFloat('01'));
		assert(Tools.isFloat('10'));
		assert(Tools.isFloat('-1'));
		assert(Tools.isFloat('0.1'));
		assert(Tools.isFloat('-0.1'));
		assert(!Tools.isFloat('a'));
		assert(!Tools.isFloat('-a'));
		assert(!Tools.isFloat('0a'));
		assert(!Tools.isFloat('-0a'));
		assert(!Tools.isFloat('a0'));
		assert(!Tools.isFloat('-a0'));
		assert(!Tools.isFloat(''));
		assert(!Tools.isFloat(' '));
		assert(!Tools.isFloat('-'));
	});
	it('should return proper values from toDurationString()', () => {
		assertStrictEqual(Tools.toDurationString(second), '1 second');
		assertStrictEqual(Tools.toDurationString(2 * second), '2 seconds');
		assertStrictEqual(Tools.toDurationString(minute), '1 minute');
		assertStrictEqual(Tools.toDurationString(2 * minute), '2 minutes');
		assertStrictEqual(Tools.toDurationString(hour), '1 hour');
		assertStrictEqual(Tools.toDurationString(2 * hour), '2 hours');
		assertStrictEqual(Tools.toDurationString(day), '1 day');
		assertStrictEqual(Tools.toDurationString(2 * day), '2 days');
		assertStrictEqual(Tools.toDurationString(month), '1 month');
		assertStrictEqual(Tools.toDurationString(month + (28 * day)), '2 months');
		assertStrictEqual(Tools.toDurationString(year), '1 year');
		assertStrictEqual(Tools.toDurationString(2 * year), '2 years');
		assertStrictEqual(Tools.toDurationString(minute + second), '1 minute and 1 second');
		assertStrictEqual(Tools.toDurationString(hour + minute + second), '1 hour, 1 minute, and 1 second');
	});
	it('should return proper values from deepSortArray()', () => {
		assertStrictEqual(Tools.deepSortArray(['c', 'a', 'b']).join(''), 'abc');
		assertStrictEqual(Tools.deepSortArray([2, 0, 1]).join(''), '012');
		assertStrictEqual(Tools.deepSortArray([['c'], ['a'], ['b']]).map(x => x[0]).join(''), 'abc');
		assertStrictEqual(Tools.deepSortArray([[2], [0], [1]]).map(x => x[0]).join(''), '012');

		assertStrictEqual(Tools.deepSortArray([['b'], ['a'], ['b']]).map(x => x[0]).join(''), 'abb');
		assertStrictEqual(Tools.deepSortArray([['c'], ['a'], ['b'], ['a', 'a'], ['b', 'a']]).map(x => x.join('')).join(','), 'a,b,c,aa,ab');
		assertStrictEqual(Tools.deepSortArray([[1], [0], [1]]).map(x => x[0]).join(''), '011');
		assertStrictEqual(Tools.deepSortArray([[2], [0], [1], [0, 0], [1, 0]]).map(x => x.join('')).join(','), '0,1,2,00,01');
	});
	it('should return proper values from compareArrays()', () => {
		assert(Tools.compareArrays([], []));
		assert(!Tools.compareArrays([0], []));
		assert(!Tools.compareArrays([], [0]));

		assert(Tools.compareArrays([0], [0]));
		assert(!Tools.compareArrays([0], [1]));
		assert(Tools.compareArrays([0, 1], [0, 1]));
		assert(Tools.compareArrays([0, 1], [1, 0]));
		assert(Tools.compareArrays([1, 0], [0, 1]));
		assert(Tools.compareArrays([1, 0], [1, 0]));
		assert(!Tools.compareArrays([0, 1], [0, 0]));
		assert(!Tools.compareArrays([0, 1], [0]));

		assert(Tools.compareArrays([[0]], [[0]]));
		assert(!Tools.compareArrays([[0]], [[1]]));
		assert(Tools.compareArrays([[0, 1]], [[0, 1]]));
		assert(Tools.compareArrays([[0, 1]], [[1, 0]]));
		assert(Tools.compareArrays([[1, 0]], [[0, 1]]));
		assert(Tools.compareArrays([[1, 0]], [[1, 0]]));
		assert(!Tools.compareArrays([[0, 1]], [[0, 0]]));
		assert(!Tools.compareArrays([[0], [1]], [[0]]));

		assert(Tools.compareArrays(['a'], ['a']));
		assert(!Tools.compareArrays(['a'], ['b']));
		assert(Tools.compareArrays(['a', 'b'], ['a', 'b']));
		assert(Tools.compareArrays(['a', 'b'], ['b', 'a']));
		assert(Tools.compareArrays(['b', 'a'], ['a', 'b']));
		assert(Tools.compareArrays(['b', 'a'], ['b', 'a']));
		assert(!Tools.compareArrays(['a', 'b'], ['a', 'a']));
		assert(!Tools.compareArrays(['a', 'b'], ['a']));

		assert(Tools.compareArrays([[0], [1]], [[0], [1]]));
		assert(Tools.compareArrays([[0], [1]], [[1], [0]]));
		assert(Tools.compareArrays([[0], [0, 1]], [[0], [0, 1]]));
		assert(Tools.compareArrays([[0], [1, 0]], [[0], [0, 1]]));
		assert(Tools.compareArrays([[0], [0, 1]], [[0, 1], [0]]));
		assert(Tools.compareArrays([[0], [0, 1]], [[1, 0], [0]]));
		assert(!Tools.compareArrays([[0], [0, 1]], [[0]]));
		assert(!Tools.compareArrays([[0], [0, 1]], [[0, 1]]));
		assert(!Tools.compareArrays([[0, 1]], [[0, 1], [0]]));
		assert(!Tools.compareArrays([[0, 1]], [[0], [0, 1]]));
	});
	it('should return proper values from getChallongeUrl()', () => {
		assert(!Tools.getChallongeUrl('https://challonge.com'));
		assert(!Tools.getChallongeUrl('https://challonge.com/'));

		const links = ['https://challonge.com/mocha', 'http://challonge.com/mocha', 'https://challonge.com/tournament/signup/mocha', 'http://challonge.com/tournament/signup/mocha'];
		for (const link of links) {
			const expectedLink = link.startsWith('http://') ? 'https://' + link.substr(7) : link;
			assertStrictEqual(Tools.getChallongeUrl(link), expectedLink);
			assertStrictEqual(Tools.getChallongeUrl(" **" + link + "**"), expectedLink);
			assertStrictEqual(Tools.getChallongeUrl(" __" + link + "__"), expectedLink);
			assertStrictEqual(Tools.getChallongeUrl(" __" + link + "__!"), expectedLink);
			assertStrictEqual(Tools.getChallongeUrl(" ``" + link + "``"), expectedLink);
			assertStrictEqual(Tools.getChallongeUrl(" ``" + link + "``!"), expectedLink);
			assertStrictEqual(Tools.getChallongeUrl(" **" + link + "**!"), expectedLink);
			assertStrictEqual(Tools.getChallongeUrl(" **" + link + "**."), expectedLink);
			assertStrictEqual(Tools.getChallongeUrl(" **" + link + "**'"), expectedLink);
			assertStrictEqual(Tools.getChallongeUrl(" **" + link + "**\""), expectedLink);
			assertStrictEqual(Tools.getChallongeUrl(" **" + link + "**\\"), expectedLink);
			assertStrictEqual(Tools.getChallongeUrl(" " + link + "!"), expectedLink);
			assertStrictEqual(Tools.getChallongeUrl(" " + link + "."), expectedLink);
			assertStrictEqual(Tools.getChallongeUrl(" " + link + "'"), expectedLink);
			assertStrictEqual(Tools.getChallongeUrl(" " + link + "\""), expectedLink);
			assertStrictEqual(Tools.getChallongeUrl(" " + link + "\\"), expectedLink);
		}
	});
	it('should have proper typeHexColors and pokemonColorHexColors lists', () => {
		for (const i in Tools.typeHexColors) {
			assert(Tools.typeHexColors[i] in Tools.hexColorCodes, i);
		}

		for (const i in Tools.pokemonColorHexColors) {
			assert(Tools.pokemonColorHexColors[i] in Tools.hexColorCodes, i);
		}

		for (const i in Dex.data.pokedex) {
			const pokemon = Dex.getExistingPokemon(i);
			assert(pokemon.color in Tools.pokemonColorHexColors, pokemon.species + "'s color " + pokemon.color);
			for (const type of pokemon.types) {
				assert(type in Tools.typeHexColors, pokemon.species + "'s type " + type);
			}
		}

		for (const i in Dex.data.moves) {
			const move = Dex.getExistingMove(i);
			assert(move.type in Tools.typeHexColors, move.name);
		}
	});
});

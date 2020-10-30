import { assert, assertStrictEqual } from "../test-tools";

/* eslint-env mocha */

const second = 1000;
const minute = 60 * second;
const hour = 60 * minute;
const day = 24 * hour;
const month = 31 * day;
const year = 365 * day;

describe("Tools", () => {
	it('should export the correct constant values', () => {
		assertStrictEqual(Tools.mainServer, "play.pokemonshowdown.com");
		assertStrictEqual(Tools.letters, "abcdefghijklmnopqrstuvwxyz");
	});
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

		const links = ['https://challonge.com/mocha', 'http://challonge.com/mocha', 'https://challonge.com/tournament/signup/mocha',
			'http://challonge.com/tournament/signup/mocha',
		];
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
	});
	it('should properly generate permutations', () => {
		let permutations = Tools.getPermutations([]) as number[][];
		assertStrictEqual(permutations.length, 1);
		assertStrictEqual(JSON.stringify(permutations), '[[]]');

		permutations = Tools.getPermutations([1]);
		assertStrictEqual(permutations.length, 1);
		assertStrictEqual(JSON.stringify(permutations), '[[1]]');

		permutations = Tools.getPermutations([1, 2]);
		assertStrictEqual(permutations.length, 2);
		assertStrictEqual(JSON.stringify(permutations), '[[1,2],[2,1]]');

		permutations = Tools.getPermutations([1, 2, 3]);
		assertStrictEqual(permutations.length, 6);
		assertStrictEqual(JSON.stringify(permutations), '[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]');

		permutations = Tools.getPermutations([1, 2, 3, 4]);
		assertStrictEqual(permutations.length, 24);
		assertStrictEqual(JSON.stringify(permutations), '[[1,2,3,4],[1,2,4,3],[1,3,2,4],[1,3,4,2],[1,4,2,3],[1,4,3,2],[2,1,3,4],' +
			'[2,1,4,3],[2,3,1,4],[2,3,4,1],[2,4,1,3],[2,4,3,1],[3,1,2,4],[3,1,4,2],[3,2,1,4],[3,2,4,1],[3,4,1,2],[3,4,2,1],[4,1,2,3],' +
			'[4,1,3,2],[4,2,1,3],[4,2,3,1],[4,3,1,2],[4,3,2,1]]');

		permutations = Tools.getPermutations([1, 2, 3], 0);
		assertStrictEqual(permutations.length, 16);
		assertStrictEqual(JSON.stringify(permutations), '[[],[1],[1,2],[1,2,3],[1,3],[1,3,2],[2],[2,1],[2,1,3],[2,3],[2,3,1],[3],[3,1],' +
			'[3,1,2],[3,2],[3,2,1]]');

		permutations = Tools.getPermutations([1, 2, 3], 1);
		assertStrictEqual(permutations.length, 15);
		assertStrictEqual(JSON.stringify(permutations), '[[1],[1,2],[1,2,3],[1,3],[1,3,2],[2],[2,1],[2,1,3],[2,3],[2,3,1],[3],[3,1],' +
			'[3,1,2],[3,2],[3,2,1]]');

		permutations = Tools.getPermutations([1, 2, 3], 1, 2);
		assertStrictEqual(permutations.length, 9);
		assertStrictEqual(JSON.stringify(permutations), '[[1],[1,2],[1,3],[2],[2,1],[2,3],[3],[3,1],[3,2]]');
	});
	it('should properly generate combinations', () => {
		let combinations = Tools.getCombinations();
		assertStrictEqual(combinations.length, 0);
		assertStrictEqual(JSON.stringify(combinations), '[]');

		combinations = Tools.getCombinations([1]);
		assertStrictEqual(combinations.length, 1);
		assertStrictEqual(JSON.stringify(combinations), '[[1]]');

		combinations = Tools.getCombinations([1], [2]);
		assertStrictEqual(combinations.length, 1);
		assertStrictEqual(JSON.stringify(combinations), '[[1,2]]');

		combinations = Tools.getCombinations([1], [2], [3]);
		assertStrictEqual(combinations.length, 1);
		assertStrictEqual(JSON.stringify(combinations), '[[1,2,3]]');

		combinations = Tools.getCombinations([1, 2], [3]);
		assertStrictEqual(combinations.length, 2);
		assertStrictEqual(JSON.stringify(combinations), '[[1,3],[2,3]]');

		combinations = Tools.getCombinations([1, 2, 3], [4, 5], [6]);
		assertStrictEqual(combinations.length, 6);
		assertStrictEqual(JSON.stringify(combinations), '[[1,4,6],[1,5,6],[2,4,6],[2,5,6],[3,4,6],[3,5,6]]');
	});
	it('should return proper values from parseFormatThread()', () => {
		let parsedThread = Tools.parseFormatThread("");
		assertStrictEqual(parsedThread.description, '');
		assertStrictEqual(parsedThread.id, '');

		const threadId = '123';
		const description = "OU Sample Teams";
		parsedThread = Tools.parseFormatThread('&bullet; <a href="' + Tools.smogonForumPrefix + threadId + '">' + description + '</a>');
		assertStrictEqual(parsedThread.description, description);
		assertStrictEqual(parsedThread.id, threadId);

		parsedThread = Tools.parseFormatThread('&bullet; <a href="' + Tools.smogonForumPrefix + threadId + '/">' + description + '</a>');
		assertStrictEqual(parsedThread.description, description);
		assertStrictEqual(parsedThread.id, threadId);

		const postId = Tools.smogonForumPostPrefix + '456';
		parsedThread = Tools.parseFormatThread('&bullet; <a href="' +
			Tools.smogonForumPrefix + threadId + '/' + postId + '">' + description + '</a>');
		assertStrictEqual(parsedThread.description, description);
		assertStrictEqual(parsedThread.id, threadId + '/' + postId);

		parsedThread = Tools.parseFormatThread('&bullet; <a href="' +
			Tools.smogonForumPrefix + threadId + '/' + postId + '/">' + description + '</a>');
		assertStrictEqual(parsedThread.description, description);
		assertStrictEqual(parsedThread.id, threadId + '/' + postId);
	});
	it('should return proper values from getNewerForumThread()', () => {
		const oldThreadId = "123";
		const newThreadId = "456";
		const postId = Tools.smogonForumPostPrefix + "789";
		const newThreadIdPost = newThreadId + "/" + postId;
		const newThread = Tools.smogonForumPrefix + newThreadId;
		const newThreadPost = Tools.smogonForumPrefix + newThreadIdPost;

		let newerThread = Tools.getNewerForumThread("");
		assertStrictEqual(newerThread, "");

		newerThread = Tools.getNewerForumThread(oldThreadId, newThreadId);
		assertStrictEqual(newerThread, newThread);

		newerThread = Tools.getNewerForumThread(newThreadId, oldThreadId);
		assertStrictEqual(newerThread, newThread);

		newerThread = Tools.getNewerForumThread(oldThreadId, newThreadIdPost);
		assertStrictEqual(newerThread, newThreadPost);

		newerThread = Tools.getNewerForumThread(newThreadIdPost, oldThreadId);
		assertStrictEqual(newerThread, newThreadPost);

		newerThread = Tools.getNewerForumThread(oldThreadId + "/" + postId, newThreadIdPost);
		assertStrictEqual(newerThread, newThreadPost);
	});
});

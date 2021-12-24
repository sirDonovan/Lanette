import type { NamedHexCode } from "../../types/tools";
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
		assertStrictEqual(Tools.vowels, "aeiou");
	});
	it('should return proper values from stripHtmlCharacters()', () => {
		const testString = "test";
		const left = testString.substr(0, 2);
		const right = testString.substr(2);
		assertStrictEqual(Tools.stripHtmlCharacters("< " + left + "<" + right + " <"), testString);
		assertStrictEqual(Tools.stripHtmlCharacters("> " + left + ">" + right + " >"), testString);
		assertStrictEqual(Tools.stripHtmlCharacters("/ " + left + "/" + right + " /"), testString);
		assertStrictEqual(Tools.stripHtmlCharacters("\\ " + left + "\\" + right + " \\"), testString);
		assertStrictEqual(Tools.stripHtmlCharacters("' " + left + "'" + right + " '"), testString);
		assertStrictEqual(Tools.stripHtmlCharacters('" ' + left + '"' + right + ' "'), testString);
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

		const arrayObject = [object];
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

		const map = new Map<string, string>();
		map.set('letter', 'a');
		const mapClone = Tools.deepClone(map);
		assert(map !== mapClone);
		mapClone.set('letter', 'b');
		assertStrictEqual(map.get('letter'), 'a');

		const mapObject = new Map();
		mapObject.set('letter', object);
		const mapObjectClone = Tools.deepClone(mapObject);
		assert(mapObject !== mapObjectClone);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		mapObjectClone.get('letter').letter = 'b';
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		assertStrictEqual(mapObject.get('letter').letter, 'a');

		const mapObjectArray = new Map();
		mapObjectArray.set('letter', [object]);
		const mapObjectArrayClone = Tools.deepClone(mapObjectArray);
		assert(mapObjectArray !== mapObjectArrayClone);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		mapObjectArrayClone.get('letter')[0].letter = 'b';
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		assertStrictEqual(mapObjectArray.get('letter')[0].letter, 'a');

		const set = new Set<string>();
		set.add('a');
		const setClone = Tools.deepClone(set);
		assert(set !== setClone);
		setClone.add('b');
		assert(!set.has('b'));
	});
	it('should return proper values from containsInteger()', () => {
		assert(Tools.containsInteger('0'));
		assert(Tools.containsInteger('1'));
		assert(Tools.containsInteger('01'));
		assert(Tools.containsInteger('10'));
		assert(Tools.containsInteger('-1'));
		assert(Tools.containsInteger('0.1'));
		assert(Tools.containsInteger('-0.1'));
		assert(!Tools.containsInteger('a'));
		assert(!Tools.containsInteger('-a'));
		assert(Tools.containsInteger('0a'));
		assert(Tools.containsInteger('-0a'));
		assert(Tools.containsInteger('a0'));
		assert(Tools.containsInteger('-a0'));
		assert(!Tools.containsInteger(''));
		assert(!Tools.containsInteger(' '));
		assert(!Tools.containsInteger('-'));
		assert(!Tools.containsInteger('@'));
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
		assert(!Tools.isInteger('@'));
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
		assert(!Tools.isFloat('@'));
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
		assertStrictEqual(Tools.toDurationString(1), '');
		assertStrictEqual(Tools.toDurationString(1, {milliseconds: true}), '1 millisecond');
		assertStrictEqual(Tools.toDurationString(2, {milliseconds: true}), '2 milliseconds');
		assertStrictEqual(Tools.toDurationString(second + 1, {milliseconds: true}), '1 second and 1 millisecond');
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
	it('should have proper hex code lists', () => {
		for (const i in Tools.eggGroupHexCodes) {
			assert(Tools.eggGroupHexCodes[i] in Tools.hexCodes, i);
		}

		const namedHexCodes = Object.keys(Tools.namedHexCodes) as NamedHexCode[];
		for (const name of namedHexCodes) {
			assert(Tools.namedHexCodes[name] in Tools.hexCodes, name);
		}

		for (const i in Tools.pokemonColorHexCodes) {
			assert(Tools.pokemonColorHexCodes[i] in Tools.hexCodes, i);
		}

		for (const i in Tools.typeHexCodes) {
			assert(Tools.typeHexCodes[i] in Tools.hexCodes, i);
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

		permutations = Tools.getPermutations([1, 2, 3, 1], 1, 2);
		assertStrictEqual(permutations.length, 16);
		assertStrictEqual(JSON.stringify(permutations),
			'[[1],[1,2],[1,3],[1,1],[2],[2,1],[2,3],[2,1],[3],[3,1],[3,2],[3,1],[1],[1,1],[1,2],[1,3]]');

		permutations = Tools.getPermutations([1, 2, 3], 1, 2, true);
		assertStrictEqual(permutations.length, 6);
		assertStrictEqual(JSON.stringify(permutations), '[[1],[1,2],[1,3],[2],[2,3],[3]]');

		permutations = Tools.getPermutations([1, 2, 3, 1], 1, 2, true);
		assertStrictEqual(permutations.length, 10);
		assertStrictEqual(JSON.stringify(permutations), '[[1],[1,2],[1,3],[1,1],[2],[2,3],[2,1],[3],[3,1],[1]]');
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
	it('should return proper values from parseSmogonLink()', () => {
		let parsedThread = Tools.parseSmogonLink("");
		assert(!parsedThread);

		parsedThread = Tools.parseSmogonLink('&bullet; <a href="https://www.smogon.com/mocha"></a>');
		assert(!parsedThread);

		const threadId = '123';
		const description = "OU Sample Teams";
		let smogonLink = Tools.smogonThreadsPrefix + threadId;
		let links: string[] = ['&bullet; <a href="' + smogonLink + '">' + description + '</a>',
			'&bullet; <a href="' + smogonLink + '/">' + description + '</a>'];
		for (const link of links) {
			parsedThread = Tools.parseSmogonLink(link);
			assert(parsedThread);
			assertStrictEqual(parsedThread.description, description);
			assertStrictEqual(parsedThread.threadId, threadId);
			assertStrictEqual(parsedThread.link, smogonLink);
			assert(!parsedThread.dexPage);
			assert(!parsedThread.pageNumber);
			assert(!parsedThread.postId);
		}

		links = [smogonLink, smogonLink + '/'];
		for (const link of links) {
			parsedThread = Tools.parseSmogonLink(link);
			assert(parsedThread);
			assertStrictEqual(parsedThread.threadId, threadId);
			assertStrictEqual(parsedThread.link, smogonLink);
			assert(!parsedThread.description);
			assert(!parsedThread.dexPage);
			assert(!parsedThread.pageNumber);
			assert(!parsedThread.postId);
		}

		const postPermaId = '456';
		smogonLink = Tools.smogonThreadsPrefix + threadId + '/' + Tools.smogonPermalinkPostPrefix + postPermaId;
		links = ['&bullet; <a href="' + smogonLink + '">' + description + '</a>',
			'&bullet; <a href="' + smogonLink + '/">' + description + '</a>'];
		for (const link of links) {
			parsedThread = Tools.parseSmogonLink(link);
			assert(parsedThread);
			assertStrictEqual(parsedThread.description, description);
			assertStrictEqual(parsedThread.threadId, threadId);
			assertStrictEqual(parsedThread.postId, postPermaId);
			assertStrictEqual(parsedThread.link, smogonLink);
			assert(!parsedThread.dexPage);
			assert(!parsedThread.pageNumber);
		}

		links = [smogonLink, smogonLink + '/'];
		for (const link of links) {
			parsedThread = Tools.parseSmogonLink(link);
			assert(parsedThread);
			assertStrictEqual(parsedThread.threadId, threadId);
			assertStrictEqual(parsedThread.postId, postPermaId);
			assertStrictEqual(parsedThread.link, smogonLink);
			assert(!parsedThread.description);
			assert(!parsedThread.dexPage);
			assert(!parsedThread.pageNumber);
		}

		smogonLink = Tools.smogonThreadsPrefix + threadId + '/#' + Tools.smogonPermalinkPostPrefix + postPermaId;
		links = ['&bullet; <a href="' + smogonLink + '">' + description + '</a>',
			'&bullet; <a href="' + smogonLink + '/">' + description + '</a>'];
		for (const link of links) {
			parsedThread = Tools.parseSmogonLink(link);
			assert(parsedThread);
			assertStrictEqual(parsedThread.description, description);
			assertStrictEqual(parsedThread.threadId, threadId);
			assertStrictEqual(parsedThread.postId, postPermaId);
			assertStrictEqual(parsedThread.link, smogonLink);
			assert(!parsedThread.dexPage);
			assert(!parsedThread.pageNumber);
		}

		links = [smogonLink, smogonLink + '/'];
		for (const link of links) {
			parsedThread = Tools.parseSmogonLink(link);
			assert(parsedThread);
			assertStrictEqual(parsedThread.threadId, threadId);
			assertStrictEqual(parsedThread.postId, postPermaId);
			assertStrictEqual(parsedThread.link, smogonLink);
			assert(!parsedThread.description);
			assert(!parsedThread.dexPage);
			assert(!parsedThread.pageNumber);
		}

		const postId = '789';
		smogonLink = Tools.smogonPostsPrefix + postId;
		links = ['&bullet; <a href="' + smogonLink + '">' + description + '</a>',
			'&bullet; <a href="' + smogonLink + '/">' + description + '</a>'];
		for (const link of links) {
			parsedThread = Tools.parseSmogonLink(link);
			assert(parsedThread);
			assertStrictEqual(parsedThread.description, description);
			assertStrictEqual(parsedThread.postId, postId);
			assertStrictEqual(parsedThread.link, smogonLink);
			assert(!parsedThread.dexPage);
			assert(!parsedThread.pageNumber);
			assert(!parsedThread.threadId);
		}

		links = [smogonLink, smogonLink + '/'];
		for (const link of links) {
			parsedThread = Tools.parseSmogonLink(link);
			assert(parsedThread);
			assertStrictEqual(parsedThread.postId, postId);
			assertStrictEqual(parsedThread.link, smogonLink);
			assert(!parsedThread.description);
			assert(!parsedThread.dexPage);
			assert(!parsedThread.pageNumber);
			assert(!parsedThread.threadId);
		}

		const pageNumber = '2';
		smogonLink = Tools.smogonThreadsPrefix + threadId + '/' + Tools.smogonPermalinkPagePrefix + pageNumber +
			'#' + Tools.smogonPermalinkPostPrefix + postPermaId;
		links = ['&bullet; <a href="' + smogonLink + '">' + description + '</a>',
			'&bullet; <a href="' + smogonLink + '/">' + description + '</a>'];
		for (const link of links) {
			parsedThread = Tools.parseSmogonLink(link);
			assert(parsedThread);
			assertStrictEqual(parsedThread.description, description);
			assertStrictEqual(parsedThread.threadId, threadId);
			assertStrictEqual(parsedThread.pageNumber, pageNumber);
			assertStrictEqual(parsedThread.postId, postPermaId);
			assertStrictEqual(parsedThread.link, smogonLink);
			assert(!parsedThread.dexPage);
		}

		links = [smogonLink, smogonLink + '/'];
		for (const link of links) {
			parsedThread = Tools.parseSmogonLink(link);
			assert(parsedThread);
			assertStrictEqual(parsedThread.threadId, threadId);
			assertStrictEqual(parsedThread.pageNumber, pageNumber);
			assertStrictEqual(parsedThread.postId, postPermaId);
			assertStrictEqual(parsedThread.link, smogonLink);
			assert(!parsedThread.description);
			assert(!parsedThread.dexPage);
		}

		smogonLink = Tools.smogonDexPrefix + 'ss/formats/ou';
		links = ['&bullet; <a href="' + smogonLink + '">' + description + '</a>',
			'&bullet; <a href="' + smogonLink + '/">' + description + '</a>'];
		for (const link of links) {
			parsedThread = Tools.parseSmogonLink(link);
			assert(parsedThread);
			assertStrictEqual(parsedThread.description, description);
			assertStrictEqual(parsedThread.dexPage, smogonLink);
			assert(!parsedThread.postId);
			assert(!parsedThread.threadId);
		}

		links = [smogonLink, smogonLink + '/'];
		for (const link of links) {
			parsedThread = Tools.parseSmogonLink(link);
			assert(parsedThread);
			assertStrictEqual(parsedThread.dexPage, smogonLink);
			assert(!parsedThread.description);
			assert(!parsedThread.postId);
			assert(!parsedThread.threadId);
		}
	});
	it('should return proper values from getNewerForumLink()', () => {
		// old vs new thread
		const oldThreadId = "123";
		const newThreadId = "456";
		const oldThread = Tools.parseSmogonLink(Tools.smogonThreadsPrefix + oldThreadId)!;
		const newThread = Tools.parseSmogonLink(Tools.smogonThreadsPrefix + newThreadId)!;

		let newerForumLink = Tools.getNewerForumLink(oldThread, newThread);
		assertStrictEqual(newerForumLink, newThread);

		newerForumLink = Tools.getNewerForumLink(newThread, oldThread);
		assertStrictEqual(newerForumLink, newThread);

		// old vs new thread post
		let oldPostId = Tools.smogonPermalinkPostPrefix + "123";
		let newPostId = Tools.smogonPermalinkPostPrefix + "456";
		let oldThreadPost = Tools.parseSmogonLink(Tools.smogonThreadsPrefix + oldThreadId + '/' + oldPostId)!;
		let newThreadPost = Tools.parseSmogonLink(Tools.smogonThreadsPrefix + oldThreadId + '/' + newPostId)!;

		newerForumLink = Tools.getNewerForumLink(oldThreadPost, newThreadPost);
		assertStrictEqual(newerForumLink, newThreadPost);

		newerForumLink = Tools.getNewerForumLink(newThreadPost, oldThreadPost);
		assertStrictEqual(newerForumLink, newThreadPost);

		// old vs new alternate thread post
		oldPostId = '#' + Tools.smogonPermalinkPostPrefix + "123";
		newPostId = '#' + Tools.smogonPermalinkPostPrefix + "456";
		oldThreadPost = Tools.parseSmogonLink(Tools.smogonThreadsPrefix + oldThreadId + '/' + oldPostId)!;
		newThreadPost = Tools.parseSmogonLink(Tools.smogonThreadsPrefix + oldThreadId + '/' + newPostId)!;

		newerForumLink = Tools.getNewerForumLink(oldThreadPost, newThreadPost);
		assertStrictEqual(newerForumLink, newThreadPost);

		newerForumLink = Tools.getNewerForumLink(newThreadPost, oldThreadPost);
		assertStrictEqual(newerForumLink, newThreadPost);

		// post link vs thread link
		const oldPostLink = Tools.parseSmogonLink(Tools.smogonPostsPrefix + "123")!;

		newerForumLink = Tools.getNewerForumLink(oldThreadPost, oldPostLink);
		assertStrictEqual(newerForumLink, oldPostLink);

		newerForumLink = Tools.getNewerForumLink(oldPostLink, oldThreadPost);
		assertStrictEqual(newerForumLink, oldPostLink);

		// old post link vs new post link
		const newPostLink = Tools.parseSmogonLink(Tools.smogonPostsPrefix + "456")!;

		newerForumLink = Tools.getNewerForumLink(newPostLink, oldPostLink);
		assertStrictEqual(newerForumLink, newPostLink);

		newerForumLink = Tools.getNewerForumLink(oldPostLink, newPostLink);
		assertStrictEqual(newerForumLink, newPostLink);
	});
});

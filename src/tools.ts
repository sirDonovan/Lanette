import fs = require('fs');
import https = require('https');
import path = require('path');
import url = require('url');

import type { PRNG } from './lib/prng';
import type { HexColor, IParsedSmogonLink } from './types/tools';
import type { IParam } from './workers/parameters';

const ALPHA_NUMERIC_REGEX = /[^a-zA-Z0-9 ]/g;
const ID_REGEX = /[^a-z0-9]/g;
const INTEGER_REGEX = /^[0-9]*$/g;
const FLOAT_REGEX = /^[.0-9]*$/g;
const SPACE_REGEX = /\s/g;
const APOSTROPHE_REGEX = /[/']/g;
const HTML_CHARACTER_REGEX = /[<>/'"]/g;
const UNSAFE_API_CHARACTER_REGEX = /[^A-Za-z0-9 ,.%&'"!?()[\]`_<>/|:;=+-@]/g;

const BATTLE_ROOM_PREFIX = 'battle-';
const GROUPCHAT_PREFIX = 'groupchat-';
const SMOGON_DEX_PREFIX = 'https://www.smogon.com/dex/';
const SMOGON_THREADS_PREFIX = 'https://www.smogon.com/forums/threads/';
const SMOGON_POSTS_PREFIX = 'https://www.smogon.com/forums/posts/';
const SMOGON_POST_PERMALINK_PREFIX = "post-";
const maxMessageLength = 300;
const maxUsernameLength = 18;
const githubApiThrottle = 2 * 1000;
const rootFolder = path.resolve(__dirname, '..');

// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-empty-function
const TimeoutConstructor = setTimeout(() => {}, 1).constructor;

const hexColorCodes: KeyedDict<HexColor, {'background-color': string; 'background': string; 'border-color': string}> = {
	"Red": {'background-color': '#eb4747', 'background': 'linear-gradient(#eb4747,#b81414)', 'border-color': '#8a0f0f'},
	"Red-Orange": {'background-color': '#eb7047', 'background': 'linear-gradient(#eb7047,#b83d14)', 'border-color': '#8a2e0f'},
	"Orange": {'background-color': '#eb9947', 'background': 'linear-gradient(#eb9947,#b86614)', 'border-color': '#8a4d0f'},
	"Yellow-Orange": {'background-color': '#ebb447', 'background': 'linear-gradient(#ebb447,#b88114)', 'border-color': '#8a610f'},
	"Yellow": {'background-color': '#e6e619', 'background': 'linear-gradient(#e6e619,#b8b814)', 'border-color': '#a1a112'},
	"Yellow-Green": {'background-color': '#99eb47', 'background': 'linear-gradient(#99eb47,#66b814)', 'border-color': '#4d8a0f'},
	"Green": {'background-color': '#47eb47', 'background': 'linear-gradient(#47eb47,#14b814)', 'border-color': '#0f8a0f'},
	"Blue-Green": {'background-color': '#47ebb4', 'background': 'linear-gradient(#47ebb4,#14b8b8)', 'border-color': '#0f8a61'},
	"Cyan": {'background-color': '#47ebeb', 'background': 'linear-gradient(#47ebeb,#14b8b8)', 'border-color': '#0f8a8a'},
	"Blue": {'background-color': '#4799eb', 'background': 'linear-gradient(#4799eb,#1466b8)', 'border-color': '#0f4c8a'},
	"Blue-Violet": {'background-color': '#4747eb', 'background': 'linear-gradient(#4747eb,#1414b8)', 'border-color': '#0f0f8a'},
	"Violet": {'background-color': '#9947eb', 'background': 'linear-gradient(#9947eb,#6614b8)', 'border-color': '#4c0f8a'},
	"Pink": {'background-color': '#eb47eb', 'background': 'linear-gradient(#eb47eb,#b814b8)', 'border-color': '#8a0f8a'},
	"Red-Violet": {'background-color': '#eb4799', 'background': 'linear-gradient(#eb4799,#b81466)', 'border-color': '#8a0f4d'},
	"Brown": {'background-color': '#c68353', 'background': 'linear-gradient(#c68353,#995e33)', 'border-color': '#734626'},
	"Black": {'background-color': '#262626', 'background': 'linear-gradient(#262626,#1a1a1a)', 'border-color': '#0d0d0d'},
	"White": {'background-color': '#e6e6e6', 'background': 'linear-gradient(#e6e6e6,#d9d9d9)', 'border-color': '#cccccc'},
	"Gray": {'background-color': '#999999', 'background': 'linear-gradient(#999999,#666666)', 'border-color': '#4d4d4d'},

	"Light-Red": {'background-color': '#ed9292', 'background': 'linear-gradient(#ed9292,#e25050)', 'border-color': '#db2424'},
	"Light-Red-Orange": {'background-color': '#eca993', 'background': 'linear-gradient(#eca993,#e07652)', 'border-color': '#d95326'},
	"Light-Orange": {'background-color': '#ecbf93', 'background': 'linear-gradient(#ecbf93,#e09952)', 'border-color': '#d97f26'},
	"Light-Yellow-Orange": {'background-color': '#ecce93', 'background': 'linear-gradient(#ecce93,#e0b152)', 'border-color': '#d99d26'},
	"Light-Yellow": {'background-color': '#eded92', 'background': 'linear-gradient(#eded92,#e9e97c)', 'border-color': '#e1e151'},
	"Light-Yellow-Green": {'background-color': '#bfec93', 'background': 'linear-gradient(#bfec93,#99e052)', 'border-color': '#80d926'},
	"Light-Green": {'background-color': '#93ec93', 'background': 'linear-gradient(#93ec93,#52e052)', 'border-color': '#26d926'},
	"Light-Blue-Green": {'background-color': '#93ecce', 'background': 'linear-gradient(#93ecce,#52e0b1)', 'border-color': '#26d99d'},
	"Light-Cyan": {'background-color': '#93ecec', 'background': 'linear-gradient(#93ecec,#52e0e0)', 'border-color': '#26d9d9'},
	"Light-Blue": {'background-color': '#93bfec', 'background': 'linear-gradient(#93bfec,#5299e0)', 'border-color': '#267fd9'},
	"Light-Blue-Violet": {'background-color': '#9393ec', 'background': 'linear-gradient(#9393ec,#5252e0)', 'border-color': '#2626d9'},
	"Light-Violet": {'background-color': '#bf93ec', 'background': 'linear-gradient(#bf93ec,#9952e0)', 'border-color': '#7f26d9'},
	"Light-Pink": {'background-color': '#ec93ec', 'background': 'linear-gradient(#ec93ec,#e052e0)', 'border-color': '#d926d9'},
	"Light-Red-Violet": {'background-color': '#ec93bf', 'background': 'linear-gradient(#ec93bf,#e05299)', 'border-color': '#d92680'},
	"Light-Brown": {'background-color': '#e6c8b3', 'background': 'linear-gradient(#e6c8b3,#d29e79)', 'border-color': '#c68353'},
	"Light-Gray": {'background-color': '#bfbfbf', 'background': 'linear-gradient(#bfbfbf,#a6a6a6)', 'border-color': '#999999'},

	"Dark-Red": {'background-color': '#c20a0a', 'background': 'linear-gradient(#c20a0a,#790606)', 'border-color': '#610505'},
	"Dark-Red-Orange": {'background-color': '#c2380a', 'background': 'linear-gradient(#c2380a,#792306)', 'border-color': '#611c05'},
	"Dark-Yellow": {'background-color': '#c2c20a', 'background': 'linear-gradient(#c2c20a,#919108)', 'border-color': '#797906'},
	"Dark-Yellow-Green": {'background-color': '#66c20a', 'background': 'linear-gradient(#66c20a,#407906)', 'border-color': '#336105'},
	"Dark-Green": {'background-color': '#0ac20a', 'background': 'linear-gradient(#0ac20a,#067906)', 'border-color': '#056105'},
	"Dark-Blue-Green": {'background-color': '#0ac285', 'background': 'linear-gradient(#0ac285,#067953)', 'border-color': '#056142'},
	"Dark-Cyan": {'background-color': '#0ac2c2', 'background': 'linear-gradient(#0ac2c2,#067979)', 'border-color': '#056161'},
	"Dark-Blue": {'background-color': '#0a66c2', 'background': 'linear-gradient(#0a66c2,#064079)', 'border-color': '#053361'},
	"Dark-Blue-Violet": {'background-color': '#0a0ac2', 'background': 'linear-gradient(#0a0ac2,#060679)', 'border-color': '#050561'},
	"Dark-Violet": {'background-color': '#660ac2', 'background': 'linear-gradient(#660ac2,#400679)', 'border-color': '#330561'},
	"Dark-Pink": {'background-color': '#c20ac2', 'background': 'linear-gradient(#c20ac2,#790679)', 'border-color': '#610561'},
	"Dark-Red-Violet": {'background-color': '#c20a66', 'background': 'linear-gradient(#c20a66,#790640)', 'border-color': '#610533'},
	"Dark-Brown": {'background-color': '#995c33', 'background': 'linear-gradient(#995c33,#603920)', 'border-color': '#4d2d19'},
	"Dark-Gray": {'background-color': '#595959', 'background': 'linear-gradient(#595959,#404040)', 'border-color': '#333333'},
};

const typeHexColors: Dict<HexColor> = {
	"Normal": "White",
	"Fire": "Red-Orange",
	"Water": "Blue",
	"Electric": "Yellow",
	"Fairy": "Light-Red-Violet",
	"Grass": "Green",
	"Ice": "Light-Cyan",
	"Fighting": "Dark-Red",
	"Poison": "Violet",
	"Ground": "Light-Brown",
	"Flying": "Light-Gray",
	"Psychic": "Pink",
	"Bug": "Yellow-Green",
	"Rock": "Brown",
	"Ghost": "Dark-Violet",
	"Dragon": "Blue-Violet",
	"Steel": "Gray",
	"Dark": "Black",
	"???": "White",
	"Bird": "White",
};

const pokemonColorHexColors: Dict<HexColor> = {
	"Green": "Green",
	"Red": "Red",
	"Black": "Black",
	"Blue": "Blue",
	"White": "White",
	"Brown": "Brown",
	"Yellow": "Yellow",
	"Purple": "Violet",
	"Pink": "Pink",
	"Gray": "Gray",
};

export class Tools {
	// exported constants
	readonly hexColorCodes: typeof hexColorCodes = hexColorCodes;
	readonly typeHexColors: typeof typeHexColors = typeHexColors;
	readonly pokemonColorHexColors: typeof pokemonColorHexColors = pokemonColorHexColors;
	readonly mainServer: string = 'play.pokemonshowdown.com';
	readonly maxMessageLength: typeof maxMessageLength = maxMessageLength;
	readonly maxUsernameLength: typeof maxUsernameLength = maxUsernameLength;
	readonly rootFolder: typeof rootFolder = rootFolder;
	readonly pokemonShowdownFolder: string = path.join(rootFolder, 'pokemon-showdown');
	readonly letters: string = "abcdefghijklmnopqrstuvwxyz";
	readonly unsafeApiCharacterRegex: RegExp = UNSAFE_API_CHARACTER_REGEX;
	readonly battleRoomPrefix: string = BATTLE_ROOM_PREFIX;
	readonly groupchatPrefix: string = GROUPCHAT_PREFIX;
	readonly smogonDexPrefix: string = SMOGON_DEX_PREFIX;
	readonly smogonThreadsPrefix: string = SMOGON_THREADS_PREFIX;
	readonly smogonPostsPrefix: string = SMOGON_POSTS_PREFIX;
	readonly smogonPostPermalinkPrefix: string = SMOGON_POST_PERMALINK_PREFIX;

	lastGithubApiCall: number = 0;

	onReload(previous: Partial<Tools>): void {
		if (previous.lastGithubApiCall) this.lastGithubApiCall = previous.lastGithubApiCall;

		for (const i in previous) {
			// @ts-expect-error
			delete previous[i];
		}
	}

	random(limit?: number, prng?: PRNG): number {
		if (!limit) limit = 2;
		if (prng) return prng.next(limit);
		return Math.floor(Math.random() * limit);
	}

	sampleMany<T>(array: readonly T[], amount: string | number, prng?: PRNG): T[] {
		const len = array.length;
		if (!len) throw new Error("Tools.sampleMany() does not accept empty arrays");
		if (len === 1) return array.slice();
		if (typeof amount === 'string') amount = parseInt(amount);
		if (!amount || isNaN(amount)) throw new Error("Invalid amount in Tools.sampleMany()");
		if (amount > len) amount = len;
		return this.shuffle(array, prng).splice(0, amount);
	}

	sampleOne<T>(array: readonly T[], prng?: PRNG): T {
		const len = array.length;
		if (!len) throw new Error("Tools.sampleOne() does not accept empty arrays");
		if (len === 1) return array.slice()[0];
		return this.shuffle(array, prng)[0];
	}

	shuffle<T>(array: readonly T[], prng?: PRNG): T[] {
		const shuffled = array.slice();

		// Fisher-Yates shuffle algorithm
		let currentIndex = shuffled.length;
		let randomIndex = 0;
		let temporaryValue;

		// While there remain elements to shuffle...
		while (currentIndex !== 0) {
			// Pick a remaining element...
			randomIndex = this.random(currentIndex, prng);
			currentIndex -= 1;

			// And swap it with the current element.
			temporaryValue = shuffled[currentIndex];
			shuffled[currentIndex] = shuffled[randomIndex];
			shuffled[randomIndex] = temporaryValue;
		}
		return shuffled;
	}

	deepSortArray<T>(unsortedArray: readonly T[]): T[] {
		const copy = unsortedArray.slice();
		const arrayType = typeof copy[0];
		if (arrayType === 'number' || arrayType === 'bigint') {
			copy.sort((a, b) => ((a as unknown) as number) - ((b as unknown) as number));
		} else if (Array.isArray(copy[0])) {
			for (let i = 0; i < copy.length; i++) {
				// @ts-expect-error
				copy[i] = this.deepSortArray(copy[i]);
			}

			copy.sort((a, b) => {
				const subArrayA = (a as unknown) as T[];
				const subArrayB = (b as unknown) as T[];
				const subArrayALen = subArrayA.length;
				const subArrayBLen = subArrayB.length;
				if (subArrayALen === subArrayBLen) {
					const subArrayType = typeof subArrayA[0];
					const isInteger = subArrayType === 'number' || subArrayType === 'bigint';
					for (let i = 0; i < subArrayALen; i++) {
						if (subArrayA[i] === subArrayB[i]) continue;
						if (isInteger) return ((subArrayA[i] as unknown) as number) - ((subArrayB[i] as unknown) as number);
						return subArrayA[i] > subArrayB[i] ? 1 : -1;
					}

					return 0;
				} else {
					return subArrayALen - subArrayBLen;
				}
			});
		} else {
			copy.sort();
		}

		return copy;
	}

	compareArrays<T>(arrayA: readonly T[], arrayB: readonly T[]): boolean {
		const arrayALen = arrayA.length;
		if (arrayALen !== arrayB.length) return false;
		if (arrayALen === 0) return true;

		arrayA = this.deepSortArray(arrayA);
		arrayB = this.deepSortArray(arrayB);

		const isSubArrayA = Array.isArray(arrayA[0]);
		const isSubArrayB = Array.isArray(arrayB[0]);
		for (let i = 0; i < arrayALen; i++) {
			if (isSubArrayA && isSubArrayB) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				if (!this.compareArrays((arrayA[i] as unknown) as any[], (arrayB[i] as unknown) as any[])) return false;
			} else {
				if (arrayA[i] !== arrayB[i]) return false;
			}
		}

		return true;
	}

	arraysContainArray<T>(input: T[], arrays: T[][]): boolean {
		for (const array of arrays) {
			if (this.compareArrays(input, array)) return true;
		}

		return false;
	}

	intersectArrays<T>(arrayA: readonly T[], arrayB: readonly T[]): T[] {
		const temp: T[] = [];
		const arrayALen = arrayA.length;
		const arrayBLen = arrayB.length;
		if (arrayALen < arrayBLen) {
			for (let i = 0; i < arrayALen; i++) {
				if (arrayB.includes(arrayA[i])) temp.push(arrayA[i]);
			}
		} else {
			for (let i = 0; i < arrayBLen; i++) {
				if (arrayA.includes(arrayB[i])) temp.push(arrayB[i]);
			}
		}

		return temp;
	}

	intersectParams(params: IParam[], dexes: Dict<Dict<readonly string[]>>): string[] {
		let intersection: string[] = dexes[params[0].type][params[0].param].slice();
		for (let i = 1; i < params.length; i++) {
			intersection = this.intersectArrays(intersection, dexes[params[i].type][params[i].param]);
			if (!intersection.length) break;
		}
		return intersection;
	}

	toId(input: string | number | {id: string} | undefined): string {
		if (input === undefined) return '';
		if (typeof input !== 'string') {
			if (typeof input === 'number') {
				input = '' + input;
			} else {
				input = input.id;
			}
		}
		return input.toLowerCase().replace(ID_REGEX, '');
	}

	toRoomId(name: string): string {
		const id = name.trim().toLowerCase();
		if (id.startsWith(BATTLE_ROOM_PREFIX) || id.startsWith(GROUPCHAT_PREFIX)) return id.replace(SPACE_REGEX, '');
		return this.toId(name);
	}

	toAlphaNumeric(input: string | number | undefined): string {
		if (input === undefined) return '';
		if (typeof input === 'number') input = '' + input;
		return input.replace(ALPHA_NUMERIC_REGEX, '').trim();
	}

	toString(input: string | number | boolean | undefined | null | {activityType?: string; effectType?: string; name?: string; id?: string;
		toString?: () => string;}): string {
		if (input === undefined) return 'undefined';
		if (input === null) return 'null';
		if (typeof input === 'string') return input;
		if (typeof input === 'number' || typeof input === 'boolean') return '' + input;
		if (Array.isArray(input)) return '[' + input.map(x => this.toString(x)).join(', ') + ']';
		if (input instanceof TimeoutConstructor) return '[Timeout]';

		for (const i in global) {
			// @ts-expect-error
			if (input === global[i]) return '[global ' + i + ']';
		}

		if (input.effectType && typeof input.effectType === 'string') {
			return '[' + input.effectType.toLowerCase() + ' ' + (input.name || input.id) + ']';
		} else if (input.activityType && typeof input.activityType === 'string') {
			return '[' + input.activityType + ' ' + (input.name || input.id) + ']';
		} else {
			const properties: string[] = [];
			for (const i in input) {
				// @ts-expect-error
				properties.push(i + ": " + this.toString(input[i]));
			}
			return "{" + properties.join(", ") + "}";
		}
	}

	toNumberOrderString(input: number): string {
		const numberString = "" + input;
		if (numberString.endsWith('11') || numberString.endsWith('12') || numberString.endsWith('13')) return numberString + "th";
		if (numberString.endsWith('1')) return numberString + "st";
		if (numberString.endsWith('2')) return numberString + "nd";
		if (numberString.endsWith('3')) return numberString + "rd";
		return numberString + "th";
	}

	toMarkdownAnchor(name: string, linkPrefix?: string): string {
		return "[" + name + "](#" + (linkPrefix ? linkPrefix : "") + name.toLowerCase().replace(APOSTROPHE_REGEX, "")
			.replace(SPACE_REGEX, "-") + ")";
	}

	unescapeHTML(input: string): string {
		if (!input) return '';
		return input
			.replace(/&amp;/g, '&').replace(/&#38;/g, '&')
			.replace(/&lt;/g, '<').replace(/&#60;/g, '<')
			.replace(/&gt;/g, '>').replace(/&#62;/g, '>')
			.replace(/&quot;/g, '"').replace(/&#34;/g, '"')
			.replace(/&apos;/g, "'").replace(/&#39;/g, "'")
			.replace(/&#x2f;/g, '/').replace(/&#47;/g, '/')
			.replace(/&#92;/g, '\\');
	}

	stripHtmlCharacters(input: string): string {
		return input.replace(HTML_CHARACTER_REGEX, '');
	}

	joinList(list: string[], preFormatting?: string | null, postFormatting?: string | null, conjunction?: string): string {
		let len = list.length;
		if (!len) return "";
		if (!preFormatting) preFormatting = "";
		if (!postFormatting) postFormatting = preFormatting;
		if (!conjunction) conjunction = "and";
		if (len === 1) {
			return preFormatting + list[0] + postFormatting;
		} else if (len === 2) {
			return preFormatting + list[0] + postFormatting + " " + conjunction + " " + preFormatting + list[1] + postFormatting;
		} else {
			len--;
			return preFormatting + list.slice(0, len).join(postFormatting + ", " + preFormatting) + postFormatting + ", " + conjunction +
				" " + preFormatting + list[len] + postFormatting;
		}
	}

	prepareMessage(message: string): string {
		message = this.toString(message);
		if (message.length > maxMessageLength) message = message.substr(0, maxMessageLength - 3) + "...";
		return message;
	}

	/**
	 * Returns a timestamp in the form {yyyy}-{MM}-{dd} {hh}:{mm}:{ss}.
	 *
	 * options.human = true will reports hours human-readable
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	toTimestampString(date: Date, options?: Dict<any>): string {
		const human: boolean = options && options.human ? true : false;
		let parts: (number | string)[] = [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(),
			date.getSeconds()];
		if (human) {
			parts.push(parts[3] >= 12 ? 'pm' : 'am');
			parts[3] = (parts[3] as number) % 12 || 12;
		}
		parts = parts.map(val => val < 10 ? '0' + val : '' + val);
		return parts.slice(0, 3).join("-") + " " + parts.slice(3, human ? 5 : 6).join(":") + (human ? "" + parts[6] : "");
	}

	toDurationString(input: number, options?: {precision?: number; hhmmss?: boolean}): string {
		const date = new Date(input);
		const parts = [date.getUTCFullYear() - 1970, date.getUTCMonth(), date.getUTCDate() - 1, date.getUTCHours(), date.getUTCMinutes(),
			date.getUTCSeconds()];
		const roundingBoundaries = [6, 15, 12, 30, 30];
		const unitNames = ["year", "month", "day", "hour", "minute", "second"];
		const positiveIndex = parts.findIndex(elem => elem > 0);
		const precision = options && options.precision ? options.precision : parts.length;
		if (options && options.hhmmss) {
			const joined = parts.slice(positiveIndex).map(value => value < 10 ? "0" + value : "" + value).join(":");
			return joined.length === 2 ? "00:" + joined : joined;
		}
		// round least significant displayed unit
		if (positiveIndex + precision < parts.length && precision > 0 && positiveIndex >= 0) {
			if (parts[positiveIndex + precision] >= roundingBoundaries[positiveIndex + precision - 1]) {
				parts[positiveIndex + precision - 1]++;
			}
		}

		const durationString: string[] = [];
		for (let i = positiveIndex; i < parts.length; i++) {
			if (parts[i]) durationString.push(parts[i] + " " + unitNames[i] + (parts[i] > 1 ? "s" : ""));
		}
		return this.joinList(durationString);
	}

	getLastDayOfMonth(date: Date): number {
		const month = date.getMonth() + 1;
		if (month === 2) {
			if (date.getFullYear() % 4 === 0) return 29;
			return 28;
		}
		if ([4, 6, 9, 11].includes(month)) return 30;
		return 31;
	}

	/**
	 * Returns 2 numbers for month/day or 3 for year/month/day
	 */
	toDateArray(input: string, pastDate?: boolean): number[] | null {
		const parts = input.split('/');
		const extracted: number[] = [];
		let hasYear = false;
		for (const part of parts) {
			const partNumber = parseInt(part);
			if (isNaN(partNumber)) return null;
			if (partNumber > 31) {
				if (hasYear) return null;
				hasYear = true;
				extracted.unshift(partNumber);
			} else {
				extracted.push(partNumber);
			}
		}
		if (hasYear && extracted.length === 2) extracted.push(pastDate ? 1 : new Date().getDate());
		return extracted;
	}

	isInteger(text: string): boolean {
		text = text.trim();
		if (text.startsWith('-')) text = text.substr(1);
		if (text === '') return false;
		return !!text.match(INTEGER_REGEX);
	}

	isFloat(text: string): boolean {
		text = text.trim();
		if (text.startsWith('-')) text = text.substr(1);
		if (text === '') return false;
		return !!text.match(FLOAT_REGEX);
	}

	isUsernameLength(name: string): boolean {
		const id = this.toId(name);
		return id && id.length <= maxUsernameLength ? true : false;
	}

	deepClone<T>(obj: T): DeepMutable<T> {
		if (obj === null || obj === undefined || typeof obj !== 'object') return obj as DeepMutable<T>;
		if (Array.isArray(obj)) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const clone = obj.slice() as DeepMutable<T & any[]>;
			for (let i = 0; i < obj.length; i++) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				clone[i] = this.deepClone(obj[i]);
			}
			return clone;
		}

		const clone = Object.create(Object.getPrototypeOf(obj)) as DeepMutable<T>;
		const keys = Object.keys(obj) as (keyof T)[];
		for (const key of keys) {
			// @ts-expect-error
			clone[key] = this.deepClone(obj[key]);
		}
		return clone;
	}

	uncacheTree(root: string): void {
		const filepaths = [require.resolve(root)];
		while (filepaths.length) {
			const filepath = filepaths[0];
			filepaths.shift();
			if (filepath in require.cache) {
				const cachedModule = require.cache[filepath]!;
				for (const child of cachedModule.children) {
					if (!child.id.endsWith('.node')) filepaths.push(child.filename);
				}

				cachedModule.exports = {};
				cachedModule.children = [];
				if (cachedModule.parent) {
					const index = cachedModule.parent.children.indexOf(cachedModule);
					if (index !== -1) cachedModule.parent.children.splice(index, 1);
				}

				delete require.cache[filepath];
			}
		}
	}

	getPermutations<T>(elements: T[], minimumLength?: number, maximumLength?: number): T[][] {
		const length = elements.length;

		if (minimumLength === undefined) {
			minimumLength = length;
		} else if (minimumLength < 0) {
			throw new Error("Invalid minimum length");
		}

		if (maximumLength === undefined) {
			maximumLength = length;
		} else if (maximumLength > length) {
			throw new Error("Invalid maximum length");
		}

		const permutations: T[][] = [];
		const elementsInUse = new Set<T>();
		const depthFirstSearch = (currentPermutation?: T[]) => {
			if (!currentPermutation) currentPermutation = [];
			const currentLength = currentPermutation.length;
			if (currentLength >= minimumLength!) {
				permutations.push(currentPermutation);
				if (currentLength === maximumLength) return;
			}

			for (let i = 0; i < length; i++){
				if (!elementsInUse.has(elements[i])) {
					elementsInUse.add(elements[i]);
					depthFirstSearch(currentPermutation.concat(elements[i]));
					elementsInUse.delete(elements[i]);
				}
			}
		};

		depthFirstSearch();

		return permutations;
	}

	getCombinations<T>(...input: T[][]): T[][] {
		const combinations: T[][] = [];
		const maxIndex = input.length - 1;

		function combine(current: T[], index: number) {
			for (let i = 0, j = input[index].length; i < j; i++) {
				const clone = current.slice();
				clone.push(input[index][i]);

				if (index === maxIndex) {
					combinations.push(clone);
				} else {
					combine(clone, index + 1);
				}
			}
		}

		if (input.length) combine([], 0);

		return combinations;
	}

	async fetchUrl(urlToFetch: string): Promise<string | Error> {
		return new Promise(resolve => {
			let data = '';
			const request = https.get(urlToFetch, res => {
				res.setEncoding('utf8');
				res.on('data', chunk => data += chunk);
				res.on('end', () => {
					resolve(data);
				});
			});

			request.on('error', error => {
				resolve(error);
			});
		});
	}

	parseUsernameText(usernameText: string): {away: boolean; status: string; username: string} {
		let away = false;
		let status = '';
		let username = '';
		const atIndex = usernameText.indexOf('@');
		if (atIndex !== -1) {
			username = usernameText.substr(0, atIndex);
			status = usernameText.substr(atIndex + 1);
			away = status.startsWith('!');
		} else {
			username = usernameText;
		}

		return {away, status, username};
	}

	parseSmogonLink(thread: string): IParsedSmogonLink | null {
		const parsedThread: IParsedSmogonLink = {description: '', link: ''};
		if (thread.startsWith('&bullet;') && thread.includes('<a href="')) {
			parsedThread.description = thread.split('</a>')[0].split('">')[1].trim();

			let id = thread.split('<a href="')[1].split('">')[0].trim();
			if (id.endsWith('/')) id = id.substr(0, id.length - 1);
			parsedThread.link = id;
			const parts = id.split('/');
			const lastPart = parts[parts.length - 1];
			if (id.startsWith(SMOGON_DEX_PREFIX)) {
				parsedThread.dexPage = id;
				return parsedThread;
			} else if (id.startsWith(SMOGON_POSTS_PREFIX)) {
				parsedThread.postId = lastPart;
				return parsedThread;
			} else if (id.startsWith(SMOGON_THREADS_PREFIX)) {
				if (lastPart.startsWith(SMOGON_POST_PERMALINK_PREFIX) || lastPart.startsWith("#" + SMOGON_POST_PERMALINK_PREFIX)) {
					parsedThread.threadId = parts[parts.length - 2] + '/' + lastPart;
				} else {
					parsedThread.threadId = lastPart;
				}
				return parsedThread;
			}
		}

		return null;
	}

	getNewerForumThread(baseLink: string, officialLink?: string): string {
		if (!baseLink) return "";

		const baseNumber = parseInt(baseLink.split("/")[0]);
		if (isNaN(baseNumber)) {
			return "";
		}

		if (officialLink) {
			const officialNum = parseInt(officialLink.split("/")[0]);
			if (!isNaN(officialNum) && officialNum > baseNumber) return SMOGON_THREADS_PREFIX + officialLink;
		}

		return SMOGON_THREADS_PREFIX + baseLink;
	}

	extractBattleId(message: string, replayServerAddress: string, serverAddress: string, serverId: string): string | null {
		message = message.trim();
		if (!message) return null;

		const replayServerLink = replayServerAddress + (replayServerAddress.endsWith("/") ? "" : "/");
		const replayServerLinkIndex = message.indexOf(replayServerLink);
		if (replayServerLinkIndex !== -1) {
			message = message.substr(replayServerLinkIndex + replayServerLink.length).trim();
			if (message) {
				if (serverId !== 'showdown' && message.startsWith(serverId + "-")) message = message.substr(serverId.length + 1);
				return message.startsWith(BATTLE_ROOM_PREFIX) ? message : BATTLE_ROOM_PREFIX + message;
			}
			return null;
		}

		const serverLink = serverAddress + (serverAddress.endsWith("/") ? "" : "/");
		const serverLinkIndex = message.indexOf(serverLink);
		if (serverLinkIndex !== -1) {
			message = message.substr(serverLinkIndex + serverLink.length).trim();
			if (message.startsWith(BATTLE_ROOM_PREFIX)) return message;
			return null;
		}

		if (message.startsWith(BATTLE_ROOM_PREFIX)) return message;

		return null;
	}

	getChallongeUrl(input: string): string | undefined {
		if (!input) return;
		const index = input.indexOf('challonge.com/');
		if (index === -1) return;
		let challongeLink = input.substr(index).trim();
		const spaceIndex = challongeLink.indexOf(' ');
		if (spaceIndex !== -1) challongeLink = challongeLink.substr(0, spaceIndex);
		if (challongeLink.length < 15) return;
		const httpIndex = challongeLink.indexOf('http://');
		if (httpIndex !== -1) {
			challongeLink = 'https://' + challongeLink.substr(httpIndex + 1);
		} else {
			const httpsIndex = challongeLink.indexOf('https://');
			if (httpsIndex === -1) challongeLink = 'https://' + challongeLink;
		}

		const formatting: string[] = ["**", "__", "``"];
		for (const format of formatting) {
			const formatIndex = challongeLink.lastIndexOf(format);
			if (formatIndex !== -1) challongeLink = challongeLink.substr(0, formatIndex);
		}

		while (challongeLink.endsWith('!') || challongeLink.endsWith('.') || challongeLink.endsWith("'") || challongeLink.endsWith('"') ||
			challongeLink.endsWith("\\")) {
			challongeLink = challongeLink.substr(0, challongeLink.length - 1);
		}
		return challongeLink;
	}

	editGist(username: string, token: string, gistId: string, description: string, files: Dict<{filename: string; content: string}>): void {
		if (this.lastGithubApiCall && (Date.now() - this.lastGithubApiCall) < githubApiThrottle) return;

		const patchData = JSON.stringify({
			description,
			files,
		});

		const gistAPi = url.parse('https://api.github.com/gists/' + gistId);
		if (!gistAPi.hostname || !gistAPi.pathname) {
			console.log("Failed to parse gist API URL");
			return;
		}

		const options = {
			hostname: gistAPi.hostname,
			path: gistAPi.pathname,
			method: "PATCH",
			headers: {
				'Accept': 'application/vnd.github.v3+json',
				'Content-Type': 'application/json; charset=utf-8',
				'Content-Length': patchData.length,
				'User-Agent': username,
				'Authorization': 'token ' + token,
			},
		};

		const request = https.request(options, response => {
			response.setEncoding('utf8');
			let data = '';
			response.on('data', chunk => {
				data += chunk;
			});
			response.on('end', () => {
				if (response.statusCode !== 200) {
					console.log(response.statusCode + ": " + response.statusMessage);
					console.log(data);
				}
			});
		});

		request.on('error', error => {
			console.log("Error updating gist " + gistId + ": " + error.stack);
		});

		request.write(patchData);
		request.end();

		this.lastGithubApiCall = Date.now();
	}

	async safeWriteFile(filepath: string, data: string): Promise<void> {
		const tempFilepath = filepath + '.temp';
		return new Promise(resolve => {
			fs.writeFile(tempFilepath, data, () => {
				fs.rename(tempFilepath, filepath, () => {
					resolve();
				});
			});
		});
	}

	safeWriteFileSync(filepath: string, data: string): void {
		const tempFilepath = filepath + '.temp';
		fs.writeFileSync(tempFilepath, data);
		fs.renameSync(tempFilepath, filepath);
	}
}

export const instantiate = (): void => {
	const oldTools = global.Tools as Tools | undefined;

	global.Tools = new Tools();

	if (oldTools) {
		global.Tools.onReload(oldTools);
	}
};
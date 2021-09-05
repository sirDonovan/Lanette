import fs = require('fs');
import https = require('https');
import path = require('path');
import url = require('url');

import type { PRNG } from './lib/prng';
import { eggGroupHexCodes, hexCodes, namedHexCodes, pokemonColorHexCodes, moveCategoryHexCodes, typeHexCodes } from './tools-hex-codes';
import type { BorderType, IExtractedBattleId, IHexCodeData, IParsedSmogonLink, NamedHexCode, TimeZone } from './types/tools';
import type { IParam, IParametersGenData, ParametersSearchType } from './workers/parameters';

const TABLE_PADDING_SIZE = 2;
const TABLE_TEXT_SIZE = 18;

const ALPHA_NUMERIC_REGEX = /[^a-zA-Z0-9 ]/g;
const ID_REGEX = /[^a-z0-9]/g;
const CONTAINS_INTEGER_REGEX = /.*[0-9]+.*/g;
const INTEGER_REGEX = /^[0-9]+$/g;
const FLOAT_REGEX = /^[.0-9]+$/g;
const SPACE_REGEX = /\s/g;
const APOSTROPHE_REGEX = /[/']/g;
const HTML_CHARACTER_REGEX = /[<>/\\'"]/g;
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

export class Tools {
	// exported constants
	readonly battleRoomPrefix: string = BATTLE_ROOM_PREFIX;
	readonly builtFolder: string = path.join(rootFolder, 'built');
	readonly eggGroupHexCodes: typeof eggGroupHexCodes = eggGroupHexCodes;
	readonly groupchatPrefix: string = GROUPCHAT_PREFIX;
	readonly hexCodes: typeof hexCodes = hexCodes;
	readonly letters: string = "abcdefghijklmnopqrstuvwxyz";
	readonly mainServer: string = 'play.pokemonshowdown.com';
	readonly maxMessageLength: typeof maxMessageLength = maxMessageLength;
	readonly maxUsernameLength: typeof maxUsernameLength = maxUsernameLength;
	readonly minRoomHeight: number = 500;
	readonly minRoomWidth: number = 350;
	readonly namedHexCodes: typeof namedHexCodes = namedHexCodes;
	readonly pokemonColorHexCodes: typeof pokemonColorHexCodes = pokemonColorHexCodes;
	readonly moveCategoryHexCodes: typeof moveCategoryHexCodes = moveCategoryHexCodes;
	readonly pokemonShowdownFolder: string = path.join(rootFolder, 'pokemon-showdown');
	readonly rootFolder: typeof rootFolder = rootFolder;
	readonly smogonDexPrefix: string = SMOGON_DEX_PREFIX;
	readonly smogonPostPermalinkPrefix: string = SMOGON_POST_PERMALINK_PREFIX;
	readonly smogonPostsPrefix: string = SMOGON_POSTS_PREFIX;
	readonly smogonThreadsPrefix: string = SMOGON_THREADS_PREFIX;
	readonly timezones: TimeZone[] = ['GMT-12:00', 'GMT-11:00', 'GMT-10:00', 'GMT-09:30', 'GMT-09:00', 'GMT-08:00', 'GMT-07:00',
		'GMT-06:00', 'GMT-05:00', 'GMT-04:00', 'GMT-03:30', 'GMT-03:00', 'GMT-02:00', 'GMT-01:00', 'GMT+00:00', 'GMT+01:00', 'GMT+02:00',
		'GMT+03:00', 'GMT+03:30', 'GMT+04:00', 'GMT+04:30', 'GMT+05:00', 'GMT+05:30', 'GMT+05:45', 'GMT+06:00', 'GMT+06:30', 'GMT+07:00',
		'GMT+08:00', 'GMT+08:45', 'GMT+09:00', 'GMT+09:30', 'GMT+10:00', 'GMT+10:30', 'GMT+11:00', 'GMT+12:00', 'GMT+12:45', 'GMT+13:00',
		'GMT+14:00',
	];
	readonly typeHexCodes: typeof typeHexCodes = typeHexCodes;
	readonly unsafeApiCharacterRegex: RegExp = UNSAFE_API_CHARACTER_REGEX;
	readonly vowels: string = "aeiou";

	lastGithubApiCall: number = 0;

	onReload(previous: Partial<Tools>): void {
		if (previous.lastGithubApiCall) this.lastGithubApiCall = previous.lastGithubApiCall;

		for (const i in previous) {
			// @ts-expect-error
			delete previous[i];
		}
	}

	getMaxTableWidth(borderSpacing: number): number {
		return this.minRoomWidth - (borderSpacing * 2);
	}

	getMaxTableHeight(borderSpacing: number): number {
		return this.minRoomHeight - (borderSpacing * 2);
	}

	getTableCellAdditionalWidth(borderSpacing: number): number {
		return (borderSpacing * 2) + TABLE_PADDING_SIZE;
	}

	getTableCellAdditionalHeight(borderSpacing: number, cellText?: boolean): number {
		let additionalHeight = (borderSpacing * 2) + TABLE_PADDING_SIZE;
		if (cellText) additionalHeight += TABLE_TEXT_SIZE;

		return additionalHeight;
	}

	getMaxTableCellWidth(maxTableWidth: number, borderSpacing: number, cellsPerRow: number): number {
		return Math.floor((maxTableWidth - (this.getTableCellAdditionalWidth(borderSpacing) * cellsPerRow)) / cellsPerRow);
	}

	getMaxTableCellHeight(maxTableHeight: number, borderSpacing: number, rowsInTable: number, cellText?: boolean): number {
		return Math.floor((maxTableHeight - (this.getTableCellAdditionalHeight(borderSpacing, cellText) * rowsInTable)) / rowsInTable);
	}

	getNamedHexCode(name: NamedHexCode): IHexCodeData {
		return hexCodes[namedHexCodes[name]]!;
	}

	getEggGroupHexCode(eggGroup: string): IHexCodeData | undefined {
		return hexCodes[eggGroupHexCodes[eggGroup]];
	}

	getPokemonColorHexCode(color: string): IHexCodeData | undefined {
		return hexCodes[pokemonColorHexCodes[color]];
	}

	getMoveCategoryHexCode(category: string): IHexCodeData | undefined {
		return hexCodes[moveCategoryHexCodes[category]];
	}

	getTypeHexCode(type: string): IHexCodeData | undefined {
		return hexCodes[typeHexCodes[type]];
	}

	getBorderTypes(): BorderType[] {
		return ['solid', 'dotted', 'dashed', 'double', 'inset', 'outset'];
	}

	getHexLabel(color: IHexCodeData, label: string, width?: 'auto' | number): string {
		return '<div style="display: inline-block;background: ' + color.gradient + ';border: 1px solid #68a;border-radius: 5px;' +
			'width: ' + (width || 75) + 'px;padding: 1px;color: #ffffff;text-shadow: 1px 1px 1px #333;' +
			'text-align: center"><b>' + label + '</b></div>';
	}

	getHexSpan(backgroundColor: string | undefined, borderColor?: string, borderRadiusValue?: number, borderSize?: number,
		borderType?: BorderType): string {
		let background: string | undefined;
		let textColor: string | undefined;
		let border: string | undefined;
		let borderStyle: string | undefined;
		let borderRadius: string | undefined;

		if (backgroundColor && backgroundColor in this.hexCodes) {
			if (this.hexCodes[backgroundColor]!.textColor) {
				textColor = 'color: ' + this.hexCodes[backgroundColor]!.textColor + ';';
			} else {
				textColor = 'color: #000000;';
			}
			background = "background: " + this.hexCodes[backgroundColor]!.gradient + ";";
		}

		if (borderColor || borderSize) {
			if (!borderSize) borderSize = 1;
			border = "border: " + borderSize + "px solid ";
			if (borderColor && borderColor in this.hexCodes) {
				border += this.hexCodes[borderColor]!.color;
			} else {
				border += "#000000";
			}
			border += ";";
		}

		if (borderType) {
			borderStyle = "border-style: " + borderType + ";";
		}

		if (borderRadiusValue) {
			borderRadius = "border-radius: " + borderRadiusValue + "px;";
		}

		if (background || textColor || border || borderStyle || borderRadius) {
			let span = "<span style='display: block;";

			if (background) span += background;
			if (textColor) span += textColor;
			if (border) span += border;
			if (borderStyle) span += borderStyle;
			if (borderRadius) span += borderRadius;

			span += "'>";
			return span;
		}

		return "";
	}

	getCustomButtonStyle(backgroundColor: string | undefined, borderColor?: string, borderRadius?: number, borderSize?: number,
		borderType?: BorderType): string {
		let buttonStyle = '';
		if (backgroundColor && backgroundColor in this.hexCodes) {
			if (this.hexCodes[backgroundColor]!.textColor) {
				buttonStyle += "color: " + this.hexCodes[backgroundColor]!.textColor + ";";
			} else {
				buttonStyle += "color: #000000;";
			}

			buttonStyle += "background: " + this.hexCodes[backgroundColor]!.color + ';';
			buttonStyle += "text-shadow: none;";
		}

		if (borderColor || borderSize) {
			if (!borderSize) borderSize = 1;
			buttonStyle += "border: " + borderSize + "px solid ";
			if (borderColor && borderColor in this.hexCodes) {
				buttonStyle += this.hexCodes[borderColor]!.color;
			} else {
				buttonStyle += "#000000";
			}
			buttonStyle += ";";
		}

		if (borderType) {
			buttonStyle += "border-style: " + borderType + ";";
		}

		if (borderRadius) {
			buttonStyle += "border-radius: " + borderRadius + 'px;';
		}

		return buttonStyle;
	}

	logError(error: NodeJS.ErrnoException, message?: string): void {
		this.logMessage((message ? message + "\n" : "") + (error.stack || error.message));
	}

	logMessage(message: string): void {
		const date = new Date();
		const month = date.getMonth() + 1;
		const day = date.getDate();
		const year = date.getFullYear();
		const filepath = year + '-' + month + '-' + day + '.txt';

		fs.appendFileSync(path.join(rootFolder, 'errors', filepath), "\n" + date.toUTCString() + " " + date.toTimeString() + "\n" +
			message + "\n");
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

	intersectParams(paramsType: ParametersSearchType, params: IParam[], parametersData: DeepImmutableObject<IParametersGenData>): string[] {
		let tierSearch = false;
		for (const param of params) {
			if (!(param.type in parametersData.paramTypeDexes) || !(param.param in parametersData.paramTypeDexes[param.type])) return [];
			if (!tierSearch && param.type === 'tier') {
				tierSearch = true;
			}
		}

		let intersection: string[] = parametersData.paramTypeDexes[params[0].type][params[0].param].slice();
		for (let i = 1; i < params.length; i++) {
			intersection = this.intersectArrays(intersection, parametersData.paramTypeDexes[params[i].type][params[i].param]);
			if (!intersection.length) break;
		}

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (paramsType === 'pokemon') {
			const filtered: string[] = [];
			for (const slice of intersection) {
				const id = this.toId(slice);
				const isRegionalForm = (parametersData.formes[id] === 'Galar' || parametersData.formes[id] === 'Alola') &&
					slice !== "Pikachu-Alola";
				if (!isRegionalForm && id in parametersData.otherFormes &&
					intersection.includes(parametersData.otherFormes[id])) continue;
				if (parametersData.gigantamax.includes(slice) && !tierSearch) continue;
				filtered.push(id);
			}

			intersection = filtered;
		}

		return intersection.sort();
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

	escapeHTML(input: string): string {
		if (!input) return '';
		return input
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, "&apos;")
			.replace(/\//g, '&#x2f;')
			.replace(/\\/g, '&#92;')
			.replace(/é/g, '&eacute;')
			.replace(/•/g, '&bull;');
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
			.replace(/&#92;/g, '\\').replace(/&eacute;/g, 'é')
			.replace(/&bull;/g, '•').replace(/&nbsp;/g, ' ')
			.replace(/&#8209;/g, '-');
	}

	stripHtmlCharacters(input: string): string {
		return input.replace(HTML_CHARACTER_REGEX, '').trim();
	}

	joinList(list: readonly string[], preFormatting?: string | null, postFormatting?: string | null, conjunction?: string): string {
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

	toDurationString(input: number, options?: {precision?: number; hhmmss?: boolean, milliseconds?: boolean}): string {
		const date = new Date(input);
		const parts = [date.getUTCFullYear() - 1970, date.getUTCMonth(), date.getUTCDate() - 1, date.getUTCHours(), date.getUTCMinutes(),
			date.getUTCSeconds()];
		const roundingBoundaries = [6, 15, 12, 30, 30];
		const unitNames = ["year", "month", "day", "hour", "minute", "second"];
		if (options && options.milliseconds) {
			parts.push(date.getUTCMilliseconds());
			roundingBoundaries.push(500);
			unitNames.push("millisecond");
		}
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

	containsInteger(text: string): boolean {
		text = text.trim();
		if (text.startsWith('-')) text = text.substr(1);
		if (text === '') return false;
		return !!text.match(CONTAINS_INTEGER_REGEX);
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

	getPermutations<T>(elements: readonly T[], minimumLength?: number, maximumLength?: number, ordered?: boolean): T[][] {
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
		const indicesInUse = new Set<number>();
		const depthFirstSearch = (currentPermutation?: T[], startingIndex?: number) => {
			if (!currentPermutation) currentPermutation = [];
			const currentLength = currentPermutation.length;
			if (currentLength >= minimumLength!) {
				permutations.push(currentPermutation);
				if (currentLength === maximumLength) return;
			}

			for (let i = startingIndex || 0; i < length; i++){
				if (!indicesInUse.has(i)) {
					indicesInUse.add(i);
					depthFirstSearch(currentPermutation.concat(elements[i]), ordered ? i + 1 : undefined);
					indicesInUse.delete(i);
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

	parseUsernameText(usernameText: string): {status: string; username: string} {
		let status = '';
		let username = '';
		const atIndex = usernameText.indexOf('@');
		if (atIndex !== -1) {
			username = usernameText.substr(0, atIndex);
			status = usernameText.substr(atIndex + 1);
		} else {
			username = usernameText;
		}

		return {status, username};
	}

	parseSmogonLink(thread: string): IParsedSmogonLink | null {
		const parsedThread: IParsedSmogonLink = {description: '', link: ''};
		let id = thread;
		if (thread.startsWith('&bullet;') && thread.includes('<a href="')) {
			parsedThread.description = thread.split('</a>')[0].split('">')[1].trim();
			id = thread.split('<a href="')[1].split('">')[0].trim();
		}

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
			if (lastPart.startsWith(SMOGON_POST_PERMALINK_PREFIX)) {
				parsedThread.postId = lastPart.substr(SMOGON_POST_PERMALINK_PREFIX.length);
				parsedThread.threadId = parts[parts.length - 2];
			} else if (lastPart.startsWith("#" + SMOGON_POST_PERMALINK_PREFIX)) {
				parsedThread.postId = lastPart.substr(SMOGON_POST_PERMALINK_PREFIX.length + 1);
				parsedThread.threadId = parts[parts.length - 2];
			} else {
				parsedThread.threadId = lastPart;
			}
			return parsedThread;
		}

		return null;
	}

	getNewerForumLink(linkA: IParsedSmogonLink, linkB: IParsedSmogonLink): IParsedSmogonLink {
		const linkAPost = linkA.postId && !linkA.threadId;
		const linkBPost = linkB.postId && !linkB.threadId;
		if (linkAPost && linkBPost) {
			const linkAPostNumber = parseInt(linkA.postId!);
			const linkBPostNumber = parseInt(linkB.postId!);

			if (linkAPostNumber >= linkBPostNumber) return linkA;
			return linkB;
		} else {
			if (linkAPost) return linkA;
			if (linkBPost) return linkB;
		}

		if (linkA.threadId && !linkB.threadId) return linkA;
		if (linkB.threadId && !linkA.threadId) return linkB;

		const linkANumber = parseInt(linkA.threadId!);
		const linkBNumber = parseInt(linkB.threadId!);

		if (linkANumber === linkBNumber) {
			if (linkA.postId && !linkB.postId) return linkA;
			if (linkB.postId && !linkA.postId) return linkB;

			const postANumber = parseInt(linkA.postId!);
			const postBNumber = parseInt(linkB.postId!);

			if (postANumber >= postBNumber) return linkA;
			return linkB;
		}

		if (linkANumber >= linkBNumber) return linkA;
		return linkB;
	}

	extractBattleId(message: string, replayServerAddress: string, serverAddress: string, serverId: string): IExtractedBattleId | null {
		message = message.trim();
		if (!message) return null;

		let fullBattleId = "";
		const replayServerLink = replayServerAddress + (replayServerAddress.endsWith("/") ? "" : "/");
		const replayServerLinkIndex = message.indexOf(replayServerLink);
		if (replayServerLinkIndex !== -1) {
			message = message.substr(replayServerLinkIndex + replayServerLink.length).trim();
			if (message) {
				if (serverId !== 'showdown' && message.startsWith(serverId + "-")) message = message.substr(serverId.length + 1);
				fullBattleId = message.startsWith(BATTLE_ROOM_PREFIX) ? message : BATTLE_ROOM_PREFIX + message;
			} else {
				return null;
			}
		}

		if (!fullBattleId) {
			const serverLink = serverAddress + (serverAddress.endsWith("/") ? "" : "/");
			const serverLinkIndex = message.indexOf(serverLink);
			if (serverLinkIndex !== -1) {
				message = message.substr(serverLinkIndex + serverLink.length).trim();
				if (message.startsWith(BATTLE_ROOM_PREFIX)) {
					fullBattleId = message;
				} else {
					return null;
				}
			}

			if (!fullBattleId && message.startsWith(BATTLE_ROOM_PREFIX)) fullBattleId = message;
		}

		if (!fullBattleId) return null;

		const parts = fullBattleId.split("-");

		return {
			format: parts[1],
			fullId: fullBattleId,
			publicId: parts.slice(0, 3).join("-"),
			password: parts.slice(3).join("-"),
		};
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

		const gistAPi = new url.URL('https://api.github.com/gists/' + gistId);
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
import fs = require('fs');
import https = require('https');
import path = require('path');
import url = require('url');

import type { PRNG } from './lib/prng';
import type { HexCode, IExtractedBattleId, IHexCodeData, IParsedSmogonLink, NamedHexCode } from './types/tools';
import type { IParam, IParametersGenData, ParametersSearchType } from './workers/parameters';

const ALPHA_NUMERIC_REGEX = /[^a-zA-Z0-9 ]/g;
const ID_REGEX = /[^a-z0-9]/g;
const CONTAINS_INTEGER_REGEX = /.*[0-9]+.*/g;
const INTEGER_REGEX = /^[0-9]+$/g;
const FLOAT_REGEX = /^[.0-9]+$/g;
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

const hexColorCodes: KeyedDict<HexCode, IHexCodeData> = {
	"#262626": {'color': '#262626', 'gradient': 'linear-gradient(#262626,#1a1a1a)', 'textColor': '#ffffff'},
	"#999999": {'color': '#999999', 'gradient': 'linear-gradient(#999999,#666666)'},
	"#db7070": {'color': '#db7070', 'gradient': 'linear-gradient(#db7070,#b82e2e)'},
	"#db8b70": {'color': '#db8b70', 'gradient': 'linear-gradient(#db8b70,#b8502e)'},
	"#dba670": {'color': '#dba670', 'gradient': 'linear-gradient(#dba670,#b8732e)'},
	"#dbc170": {'color': '#dbc170', 'gradient': 'linear-gradient(#dbc170,#b8952e)'},
	"#dbdb70": {'color': '#dbdb70', 'gradient': 'linear-gradient(#dbdb70,#b8b82e)'},
	"#c1db70": {'color': '#c1db70', 'gradient': 'linear-gradient(#c1db70,#95b82e)'},
	"#a6db70": {'color': '#a6db70', 'gradient': 'linear-gradient(#a6db70,#73b82e)'},
	"#8bdb70": {'color': '#8bdb70', 'gradient': 'linear-gradient(#8bdb70,#50b82e)'},
	"#70db70": {'color': '#70db70', 'gradient': 'linear-gradient(#70db70,#2eb82e)'},
	"#70db8b": {'color': '#70db8b', 'gradient': 'linear-gradient(#70db8b,#2eb850)'},
	"#70dba6": {'color': '#70dba6', 'gradient': 'linear-gradient(#70dba6,#2eb873)'},
	"#70dbc1": {'color': '#70dbc1', 'gradient': 'linear-gradient(#70dbc1,#2eb895)'},
	"#70dbdb": {'color': '#70dbdb', 'gradient': 'linear-gradient(#70dbdb,#2eb8b8)'},
	"#70c1db": {'color': '#70c1db', 'gradient': 'linear-gradient(#70c1db,#2e95b8)'},
	"#70a6db": {'color': '#70a6db', 'gradient': 'linear-gradient(#70a6db,#2e73b8)'},
	"#708bdb": {'color': '#708bdb', 'gradient': 'linear-gradient(#708bdb,#2e50b8)', 'textColor': '#ffffff'},
	"#7070db": {'color': '#7070db', 'gradient': 'linear-gradient(#7070db,#2e2eb8)', 'textColor': '#ffffff'},
	"#8b70db": {'color': '#8b70db', 'gradient': 'linear-gradient(#8b70db,#502eb8)', 'textColor': '#ffffff'},
	"#a670db": {'color': '#a670db', 'gradient': 'linear-gradient(#a670db,#732eb8)', 'textColor': '#ffffff'},
	"#c170db": {'color': '#c170db', 'gradient': 'linear-gradient(#c170db,#952eb8)', 'textColor': '#ffffff'},
	"#db70db": {'color': '#db70db', 'gradient': 'linear-gradient(#db70db,#b82eb8)', 'textColor': '#ffffff'},
	"#db70c1": {'color': '#db70c1', 'gradient': 'linear-gradient(#db70c1,#b82e95)', 'textColor': '#ffffff'},
	"#db70a6": {'color': '#db70a6', 'gradient': 'linear-gradient(#db70a6,#b82e73)', 'textColor': '#ffffff'},
	"#db708b": {'color': '#db708b', 'gradient': 'linear-gradient(#db708b,#b82e50)', 'textColor': '#ffffff'},
	"#e6e6e6": {'color': '#e6e6e6', 'gradient': 'linear-gradient(#e6e6e6,#d9d9d9)', 'textColor': '#000000'},
	"#c68353": {'color': '#c68353', 'gradient': 'linear-gradient(#c68353,#995e33)'},
	"#ec9393": {'color': '#ec9393', 'gradient': 'linear-gradient(#ec9393,#e05252)', 'textColor': '#000000', 'category': 'light'},
	"#eca993": {'color': '#eca993', 'gradient': 'linear-gradient(#eca993,#e07552)', 'textColor': '#000000', 'category': 'light'},
	"#ecbf93": {'color': '#ecbf93', 'gradient': 'linear-gradient(#ecbf93,#e09952)', 'textColor': '#000000', 'category': 'light'},
	"#ecd693": {'color': '#ecd693', 'gradient': 'linear-gradient(#ecd693,#e0bd52)', 'textColor': '#000000', 'category': 'light'},
	"#ecec93": {'color': '#ecec93', 'gradient': 'linear-gradient(#ecec93,#e0e052)', 'textColor': '#000000', 'category': 'light'},
	"#d6ec93": {'color': '#d6ec93', 'gradient': 'linear-gradient(#d6ec93,#bde052)', 'textColor': '#000000', 'category': 'light'},
	"#bfec93": {'color': '#bfec93', 'gradient': 'linear-gradient(#bfec93,#99e052)', 'textColor': '#000000', 'category': 'light'},
	"#a9ec93": {'color': '#a9ec93', 'gradient': 'linear-gradient(#a9ec93,#75e052)', 'textColor': '#000000', 'category': 'light'},
	"#93ec93": {'color': '#93ec93', 'gradient': 'linear-gradient(#93ec93,#52e052)', 'textColor': '#000000', 'category': 'light'},
	"#93eca9": {'color': '#93eca9', 'gradient': 'linear-gradient(#93eca9,#52e075)', 'textColor': '#000000', 'category': 'light'},
	"#93ecbf": {'color': '#93ecbf', 'gradient': 'linear-gradient(#93ecbf,#52e099)', 'textColor': '#000000', 'category': 'light'},
	"#93ecd6": {'color': '#93ecd6', 'gradient': 'linear-gradient(#93ecd6,#52e0bd)', 'textColor': '#000000', 'category': 'light'},
	"#93ecec": {'color': '#93ecec', 'gradient': 'linear-gradient(#93ecec,#52e0e0)', 'textColor': '#000000', 'category': 'light'},
	"#93d6ec": {'color': '#93d6ec', 'gradient': 'linear-gradient(#93d6ec,#52bde0)', 'textColor': '#000000', 'category': 'light'},
	"#93bfec": {'color': '#93bfec', 'gradient': 'linear-gradient(#93bfec,#5299e0)', 'textColor': '#000000', 'category': 'light'},
	"#93a9ec": {'color': '#93a9ec', 'gradient': 'linear-gradient(#93a9ec,#5275e0)', 'textColor': '#000000', 'category': 'light'},
	"#9393ec": {'color': '#9393ec', 'gradient': 'linear-gradient(#9393ec,#5252e0)', 'textColor': '#ffffff', 'category': 'light'},
	"#a993ec": {'color': '#a993ec', 'gradient': 'linear-gradient(#a993ec,#7552e0)', 'textColor': '#ffffff', 'category': 'light'},
	"#bf93ec": {'color': '#bf93ec', 'gradient': 'linear-gradient(#bf93ec,#9952e0)', 'textColor': '#ffffff', 'category': 'light'},
	"#d693ec": {'color': '#d693ec', 'gradient': 'linear-gradient(#d693ec,#bd52e0)', 'textColor': '#ffffff', 'category': 'light'},
	"#ec93ec": {'color': '#ec93ec', 'gradient': 'linear-gradient(#ec93ec,#e052e0)', 'textColor': '#ffffff', 'category': 'light'},
	"#ec93d6": {'color': '#ec93d6', 'gradient': 'linear-gradient(#ec93d6,#e052bd)', 'textColor': '#ffffff', 'category': 'light'},
	"#ec93bf": {'color': '#ec93bf', 'gradient': 'linear-gradient(#ec93bf,#e05299)', 'textColor': '#ffffff', 'category': 'light'},
	"#ec93a9": {'color': '#ec93a9', 'gradient': 'linear-gradient(#ec93a9,#e05275)', 'textColor': '#ffffff', 'category': 'light'},
	"#bfbfbf": {'color': '#bfbfbf', 'gradient': 'linear-gradient(#bfbfbf,#a6a6a6)', 'textColor': '#000000', 'category': 'light'},
	"#e6c8b3": {'color': '#e6c8b3', 'gradient': 'linear-gradient(#e6c8b3,#d29e79)', 'textColor': '#000000', 'category': 'light'},
	"#595959": {'color': '#595959', 'gradient': 'linear-gradient(#595959,#404040)', 'textColor': '#ffffff', 'category': 'dark'},
	"#ac3939": {'color': '#ac3939', 'gradient': 'linear-gradient(#ac3939,#732626)', 'textColor': '#ffffff', 'category': 'dark'},
	"#ac5639": {'color': '#ac5639', 'gradient': 'linear-gradient(#ac5639,#733926)', 'textColor': '#ffffff', 'category': 'dark'},
	"#ac7339": {'color': '#ac7339', 'gradient': 'linear-gradient(#ac7339,#734d26)', 'textColor': '#ffffff', 'category': 'dark'},
	"#ac8f39": {'color': '#ac8f39', 'gradient': 'linear-gradient(#ac8f39,#736026)', 'textColor': '#ffffff', 'category': 'dark'},
	"#acac39": {'color': '#acac39', 'gradient': 'linear-gradient(#acac39,#737326)', 'textColor': '#ffffff', 'category': 'dark'},
	"#8fac39": {'color': '#8fac39', 'gradient': 'linear-gradient(#8fac39,#607326)', 'textColor': '#ffffff', 'category': 'dark'},
	"#73ac39": {'color': '#73ac39', 'gradient': 'linear-gradient(#73ac39,#4d7326)', 'textColor': '#ffffff', 'category': 'dark'},
	"#56ac39": {'color': '#56ac39', 'gradient': 'linear-gradient(#56ac39,#397326)', 'textColor': '#ffffff', 'category': 'dark'},
	"#39ac39": {'color': '#39ac39', 'gradient': 'linear-gradient(#39ac39,#267326)', 'textColor': '#ffffff', 'category': 'dark'},
	"#39ac56": {'color': '#39ac56', 'gradient': 'linear-gradient(#39ac56,#267339)', 'textColor': '#ffffff', 'category': 'dark'},
	"#39ac73": {'color': '#39ac73', 'gradient': 'linear-gradient(#39ac73,#26734d)', 'textColor': '#ffffff', 'category': 'dark'},
	"#39ac8f": {'color': '#39ac8f', 'gradient': 'linear-gradient(#39ac8f,#267360)', 'textColor': '#ffffff', 'category': 'dark'},
	"#39acac": {'color': '#39acac', 'gradient': 'linear-gradient(#39acac,#267373)', 'textColor': '#ffffff', 'category': 'dark'},
	"#398fac": {'color': '#398fac', 'gradient': 'linear-gradient(#398fac,#266073)', 'textColor': '#ffffff', 'category': 'dark'},
	"#3973ac": {'color': '#3973ac', 'gradient': 'linear-gradient(#3973ac,#264d73)', 'textColor': '#ffffff', 'category': 'dark'},
	"#3956ac": {'color': '#3956ac', 'gradient': 'linear-gradient(#3956ac,#263973)', 'textColor': '#ffffff', 'category': 'dark'},
	"#3939ac": {'color': '#3939ac', 'gradient': 'linear-gradient(#3939ac,#262673)', 'textColor': '#ffffff', 'category': 'dark'},
	"#5639ac": {'color': '#5639ac', 'gradient': 'linear-gradient(#5639ac,#392673)', 'textColor': '#ffffff', 'category': 'dark'},
	"#7339ac": {'color': '#7339ac', 'gradient': 'linear-gradient(#7339ac,#4d2673)', 'textColor': '#ffffff', 'category': 'dark'},
	"#8f39ac": {'color': '#8f39ac', 'gradient': 'linear-gradient(#8f39ac,#602673)', 'textColor': '#ffffff', 'category': 'dark'},
	"#ac39ac": {'color': '#ac39ac', 'gradient': 'linear-gradient(#ac39ac,#732673)', 'textColor': '#ffffff', 'category': 'dark'},
	"#ac398f": {'color': '#ac398f', 'gradient': 'linear-gradient(#ac398f,#732660)', 'textColor': '#ffffff', 'category': 'dark'},
	"#ac3973": {'color': '#ac3973', 'gradient': 'linear-gradient(#ac3973,#73264d)', 'textColor': '#ffffff', 'category': 'dark'},
	"#ac3956": {'color': '#ac3956', 'gradient': 'linear-gradient(#ac3956,#732639)', 'textColor': '#ffffff', 'category': 'dark'},
	"#995c33": {'color': '#995c33', 'gradient': 'linear-gradient(#995c33,#603920)', 'textColor': '#ffffff', 'category': 'dark'},
};

const namedHexColors: KeyedDict<NamedHexCode, HexCode> = {
	"Red": "#db7070",
	"Dark-Red": "#ac3939",
	"Light-Red": "#ec9393",
	"Red-Orange": "#db8b70",
	"Dark-Red-Orange": "#ac5639",
	"Light-Red-Orange": "#eca993",
	"Orange": "#dba670",
	"Dark-Orange": "#ac7339",
	"Light-Orange": "#ecbf93",
	"Yellow-Orange": "#dbc170",
	"Dark-Yellow-Orange": "#ac8f39",
	"Light-Yellow-Orange": "#ecd693",
	"Yellow": "#dbdb70",
	"Dark-Yellow": "#acac39",
	"Light-Yellow": "#ecec93",
	"Yellow-Green": "#c1db70",
	"Dark-Yellow-Green": "#8fac39",
	"Light-Yellow-Green": "#d6ec93",
	"Green": "#70db70",
	"Dark-Green": "#39ac39",
	"Light-Green": "#93ec93",
	"Cyan": "#70dbdb",
	"Dark-Cyan": "#39acac",
	"Light-Cyan": "#93ecec",
	"Blue": "#70a6db",
	"Dark-Blue": "#3973ac",
	"Light-Blue": "#93bfec",
	"Blue-Violet": "#7070db",
	"Dark-Blue-Violet": "#3939ac",
	"Light-Blue-Violet": "#9393ec",
	"Violet": "#a670db",
	"Dark-Violet": "#7339ac",
	"Light-Violet": "#bf93ec",
	"Pink": "#db70db",
	"Dark-Pink": "#ac39ac",
	"Light-Pink": "#ec93ec",
	"Red-Violet": "#db70a6",
	"Dark-Red-Violet": "#ac3973",
	"Light-Red-Violet": "#ec93bf",
	"White": "#e6e6e6",
	"Gray": "#999999",
	"Dark-Gray": "#595959",
	"Light-Gray": "#bfbfbf",
	"Black": "#262626",
	"Brown": "#c68353",
	"Dark-Brown": "#995c33",
	"Light-Brown": "#e6c8b3",
};

const typeHexColors: Dict<HexCode> = {
	"Normal": namedHexColors["White"],
	"Fire": namedHexColors["Red-Orange"],
	"Water": namedHexColors["Blue"],
	"Electric": namedHexColors["Yellow"],
	"Fairy": namedHexColors["Light-Red-Violet"],
	"Grass": namedHexColors["Green"],
	"Ice": namedHexColors["Light-Cyan"],
	"Fighting": namedHexColors["Dark-Red"],
	"Poison": namedHexColors["Violet"],
	"Ground": namedHexColors["Light-Brown"],
	"Flying": namedHexColors["Light-Gray"],
	"Psychic": namedHexColors["Pink"],
	"Bug": namedHexColors["Yellow-Green"],
	"Rock": namedHexColors["Brown"],
	"Ghost": namedHexColors["Dark-Violet"],
	"Dragon": namedHexColors["Blue-Violet"],
	"Steel": namedHexColors["Gray"],
	"Dark": namedHexColors["Black"],
	"???": namedHexColors["White"],
	"Bird": namedHexColors["White"],
};

const pokemonColorHexColors: Dict<HexCode> = {
	"Green": namedHexColors["Green"],
	"Red": namedHexColors["Red"],
	"Black": namedHexColors["Black"],
	"Blue": namedHexColors["Blue"],
	"White": namedHexColors["White"],
	"Brown": namedHexColors["Brown"],
	"Yellow": namedHexColors["Yellow"],
	"Purple": namedHexColors["Violet"],
	"Pink": namedHexColors["Pink"],
	"Gray": namedHexColors["Gray"],
};

const eggGroupHexColors: Dict<HexCode> = {
	"Monster": namedHexColors["Red"],
	"Grass": namedHexColors["Green"],
	"Dragon": namedHexColors["Blue-Violet"],
	"Water 1": namedHexColors["Light-Blue"],
	"Water 2": namedHexColors["Blue"],
	"Water 3": namedHexColors["Dark-Blue"],
	"Bug": namedHexColors["Yellow-Green"],
	"Flying": namedHexColors["Light-Violet"],
	"Field": namedHexColors["Light-Yellow-Orange"],
	"Fairy": namedHexColors["Light-Red-Violet"],
	"Undiscovered": namedHexColors["Black"],
	"Human-Like": namedHexColors["Light-Brown"],
	"Mineral": namedHexColors["Dark-Brown"],
	"Amorphous": namedHexColors["Gray"],
	"Ditto": namedHexColors["Pink"],
};

export class Tools {
	// exported constants
	readonly battleRoomPrefix: string = BATTLE_ROOM_PREFIX;
	readonly builtFolder: string = path.join(rootFolder, 'built');
	readonly eggGroupHexColors: typeof eggGroupHexColors = eggGroupHexColors;
	readonly groupchatPrefix: string = GROUPCHAT_PREFIX;
	readonly hexColorCodes: typeof hexColorCodes = hexColorCodes;
	readonly letters: string = "abcdefghijklmnopqrstuvwxyz";
	readonly mainServer: string = 'play.pokemonshowdown.com';
	readonly maxMessageLength: typeof maxMessageLength = maxMessageLength;
	readonly maxUsernameLength: typeof maxUsernameLength = maxUsernameLength;
	readonly pokemonColorHexColors: typeof pokemonColorHexColors = pokemonColorHexColors;
	readonly pokemonShowdownFolder: string = path.join(rootFolder, 'pokemon-showdown');
	readonly rootFolder: typeof rootFolder = rootFolder;
	readonly smogonDexPrefix: string = SMOGON_DEX_PREFIX;
	readonly smogonPostPermalinkPrefix: string = SMOGON_POST_PERMALINK_PREFIX;
	readonly smogonPostsPrefix: string = SMOGON_POSTS_PREFIX;
	readonly smogonThreadsPrefix: string = SMOGON_THREADS_PREFIX;
	readonly typeHexColors: typeof typeHexColors = typeHexColors;
	readonly unsafeApiCharacterRegex: RegExp = UNSAFE_API_CHARACTER_REGEX;

	lastGithubApiCall: number = 0;

	onReload(previous: Partial<Tools>): void {
		if (previous.lastGithubApiCall) this.lastGithubApiCall = previous.lastGithubApiCall;

		for (const i in previous) {
			// @ts-expect-error
			delete previous[i];
		}
	}

	getNamedHexCode(name: NamedHexCode): IHexCodeData {
		return hexColorCodes[namedHexColors[name]];
	}

	logError(error: string | Error, message?: string): void {
		const date = new Date();
		const month = date.getMonth() + 1;
		const day = date.getDate();
		const year = date.getFullYear();
		const filepath = year + '-' + month + '-' + day + '.txt';

		let log = message || '';
		// eslint-disable-next-line @typescript-eslint/no-extra-parens
		log += typeof error === 'string' ? error : (error.stack || error.message);

		fs.appendFileSync(path.join(rootFolder, 'errors', filepath), date.toUTCString() + " " + date.toTimeString() + "\n" +
			log + "\n");
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
			if (param.type === 'tier') {
				tierSearch = true;
				break;
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

	getPermutations<T>(elements: readonly T[], minimumLength?: number, maximumLength?: number): T[][] {
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
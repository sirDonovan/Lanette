import https = require('https');
import { IAbility, IAbilityCopy, IItem, IItemCopy, IMove, IMoveCopy, IPokemon, IPokemonCopy } from './types/in-game-data-types';

const MAX_MESSAGE_LENGTH = 300;
const ALPHA_NUMERIC_REGEX = /[^a-zA-Z0-9 ]/g;
const ID_REGEX = /[^a-z0-9]/g;
const NUMBER_REGEX = /^[ .0-9]*$/g;
const SPACE_REGEX = /[ ]*/g;

export class Tools {
	random(limit?: number) {
		if (!limit) limit = 2;
		return Math.floor(Math.random() * limit);
	}

	sampleMany<T>(array: T[], amount: string | number): T[] {
		const len = array.length;
		if (!len) throw new Error("Tools.sampleMany() does not accept empty arrays");
		if (len === 1) return array.slice();
		if (typeof amount === 'string') amount = parseInt(amount);
		if (!amount || isNaN(amount)) throw new Error("Invalid amount in Tools.sampleMany()");
		if (amount > len) amount = len;
		return this.shuffle(array).splice(0, amount);
	}

	sampleOne<T>(array: T[]): T {
		const len = array.length;
		if (!len) throw new Error("Tools.sampleOne() does not accept empty arrays");
		if (len === 1) return array.slice()[0];
		return this.shuffle(array)[0];
	}

	shuffle<T>(array: T[]): T[] {
		array = array.slice();

		// Fisher-Yates shuffle algorithm
		let currentIndex = array.length;
		let randomIndex = 0;
		let temporaryValue;

		// While there remain elements to shuffle...
		while (currentIndex !== 0) {
			// Pick a remaining element...
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex -= 1;

			// And swap it with the current element.
			temporaryValue = array[currentIndex];
			array[currentIndex] = array[randomIndex];
			array[randomIndex] = temporaryValue;
		}
		return array;
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
		if (id.startsWith('groupchat-')) return id.replace(SPACE_REGEX, '');
		return this.toId(name);
	}

	toAlphaNumeric(input: string | number | undefined): string {
		if (input === undefined) return '';
		if (typeof input === 'number') input = '' + input;
		return input.replace(ALPHA_NUMERIC_REGEX, '').trim();
	}

	toString(input: string | number | undefined | null | {activityType?: string, effectType?: string, name?: string, toString?(): string}): string {
		if (input === undefined) return 'undefined';
		if (input === null) return 'null';
		if (typeof input === 'number') return '' + input;
		if (typeof input === 'string') return input;
		for (const i in global) {
			// @ts-ignore
			if (input === global[i]) return '[global ' + i + ']';
		}
		if (input.effectType && typeof input.effectType === 'string') {
			return '[' + input.effectType.toLowerCase() + ' ' + input.name + ']';
		} else if (input.activityType && typeof input.activityType === 'string') {
			return '[' + input.activityType + ' ' + input.name + ']';
		} else {
			if (input.toString) {
				return input.toString();
			} else {
				return '[object UnknownType]';
			}
		}
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
			return preFormatting + list.slice(0, len).join(postFormatting + ", " + preFormatting) + postFormatting + ", " + conjunction + " " + preFormatting + list[len] + postFormatting;
		}
	}

	prepareMessage(message: string): string {
		message = this.toString(message);
		if (message.length > MAX_MESSAGE_LENGTH) message = message.substr(0, MAX_MESSAGE_LENGTH - 3) + "...";
		return message;
	}

	/**
	 * Returns a timestamp in the form {yyyy}-{MM}-{dd} {hh}:{mm}:{ss}.
	 *
	 * options.human = true will reports hours human-readable
	 */
	toTimestampString(date: Date, options?: Dict<any>): string {
		const human = options && options.human;
		let parts: any[] = [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()];
		if (human) {
			parts.push(parts[3] >= 12 ? 'pm' : 'am');
			parts[3] = parts[3] % 12 || 12;
		}
		parts = parts.map(val => val < 10 ? '0' + val : '' + val);
		return parts.slice(0, 3).join("-") + " " + parts.slice(3, human ? 5 : 6).join(":") + (human ? "" + parts[6] : "");
	}

	toDurationString(input: number, options?: {precision?: number, hhmmss?: boolean}): string {
		const date = new Date(+input);
		const parts = [date.getUTCFullYear() - 1970, date.getUTCMonth(), date.getUTCDate() - 1, date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()];
		const roundingBoundaries = [6, 15, 12, 30, 30];
		const unitNames = ["second", "minute", "hour", "day", "month", "year"];
		const positiveIndex = parts.findIndex(elem => elem > 0);
		const precision = (options && options.precision ? options.precision : parts.length);
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
		return parts.slice(positiveIndex).reverse().map((value, index) => value ? value + " " + unitNames[index] + (value > 1 ? "s" : "") : "").reverse().slice(0, precision).join(" ").trim();
	}

	isNumber(text: string): boolean {
		text = text.trim();
		if (text.charAt(0) === '-') text = text.substr(1);
		const match = text.match(NUMBER_REGEX);
		if (match && match.length) return true;
		return false;
	}

	deepClone<T>(obj: T): T extends IAbility ? IAbilityCopy : T extends IItem ? IItemCopy : T extends IMove ? IMoveCopy : T extends IPokemon ? IPokemonCopy : T {
		// @ts-ignore
		if (obj === null || typeof obj !== 'object') return obj;
		// @ts-ignore
		if (Array.isArray(obj)) return obj.map(prop => this.deepClone(prop));
		const clone = Object.create(Object.getPrototypeOf(obj));
		for (const key of Object.keys(obj)) {
			// @ts-ignore
			clone[key] = this.deepClone(obj[key]);
		}
		return clone;
	}

	uncacheTree(root: string) {
		let uncache = [require.resolve(root)];
		do {
			const newuncache: string[] = [];
			for (const target of uncache) {
				if (require.cache[target]) {
					// @ts-ignore
					newuncache.push.apply(newuncache, require.cache[target].children.filter(cachedModule => !cachedModule.id.endsWith('.node')).map(cachedModule => cachedModule.id));
					delete require.cache[target];
				}
			}
			uncache = newuncache;
		} while (uncache.length > 0);
	}

	async fetchUrl(url: string): Promise<string> {
		return new Promise((resolve, reject) => {
			let data = '';
			const request = https.get(url, res => {
				res.setEncoding('utf8');
				res.on('data', chunk => data += chunk);
				res.on('end', () => {
					resolve(data);
				});
			});

			request.on('error', () => reject());
		});
	}
}

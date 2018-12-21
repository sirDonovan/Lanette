import fs = require('fs');
import https = require('https');
import path = require('path');

const dataDir = path.resolve(__dirname, './../data');

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

	toId(input: string | number | {id: string}): string {
		if (typeof input !== 'string') {
			if (typeof input === 'number') {
				input = '' + input;
			} else {
				input = input.id;
			}
		}
		return input.toLowerCase().replace(/[^a-z0-9]/g, '');
	}

	deepClone<T>(obj: T): T {
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

	async fetchClientData() {
		const files = ['pokedex-mini.js'];
		for (let i = 0; i < files.length; i++) {
			const file = await this.fetchUrl('https://play.pokemonshowdown.com/data/' + files[i]);
			if (file) fs.writeFileSync(dataDir + "/" + files[i], file);
		}
	}
}

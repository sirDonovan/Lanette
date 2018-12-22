import fs = require('fs');
import path = require('path');
import { IAbility, IAbilityComputed, IAbilityData, IFormat, IFormatData, IItem, IItemComputed, IItemData, ILearnset, IMoveData, INature, ITemplateData, ITemplateFormatsData, ITypeChart } from './types/in-game-data-types';

const PokemonShowdown =  path.resolve(__dirname, './../Pokemon-Showdown');
const dataDir = path.join(PokemonShowdown, 'data');
const modsDir = path.join(PokemonShowdown, 'mods');
const lanetteDataDir = path.resolve(__dirname, './../data');
const currentGen = 'gen7';

const dataFiles: Dict<string> = {
	'Pokedex': 'pokedex',
	'Movedex': 'moves',
	'Statuses': 'statuses',
	'TypeChart': 'typechart',
	'Scripts': 'scripts',
	'Items': 'items',
	'Abilities': 'abilities',
	'FormatsData': 'formats-data',
	'Learnsets': 'learnsets',
	'Aliases': 'aliases',
	'Formats': 'rulesets',
};
const dataTypes = ['Pokedex', 'FormatsData', 'Learnsets', 'Movedex', 'Statuses', 'TypeChart', 'Scripts', 'Items', 'Abilities', 'Formats'];

const lanetteDataFiles: Dict<string> = {
	'Badges': 'badges',
	'Characters': 'characters',
	'FormatLinks': 'format-links',
	'PokemonSprites': 'pokedex-mini',
	'TrainerClasses': 'trainer-classes',
};
const lanetteDataTypes = Object.keys(lanetteDataFiles);

const natures: Dict<INature> = {
	adamant: {name: "Adamant", plus: 'atk', minus: 'spa'},
	bashful: {name: "Bashful"},
	bold: {name: "Bold", plus: 'def', minus: 'atk'},
	brave: {name: "Brave", plus: 'atk', minus: 'spe'},
	calm: {name: "Calm", plus: 'spd', minus: 'atk'},
	careful: {name: "Careful", plus: 'spd', minus: 'spa'},
	docile: {name: "Docile"},
	gentle: {name: "Gentle", plus: 'spd', minus: 'def'},
	hardy: {name: "Hardy"},
	hasty: {name: "Hasty", plus: 'spe', minus: 'def'},
	impish: {name: "Impish", plus: 'def', minus: 'spa'},
	jolly: {name: "Jolly", plus: 'spe', minus: 'spa'},
	lax: {name: "Lax", plus: 'def', minus: 'spd'},
	lonely: {name: "Lonely", plus: 'atk', minus: 'def'},
	mild: {name: "Mild", plus: 'spa', minus: 'def'},
	modest: {name: "Modest", plus: 'spa', minus: 'atk'},
	naive: {name: "Naive", plus: 'spe', minus: 'spd'},
	naughty: {name: "Naughty", plus: 'atk', minus: 'spd'},
	quiet: {name: "Quiet", plus: 'spa', minus: 'spe'},
	quirky: {name: "Quirky"},
	rash: {name: "Rash", plus: 'spa', minus: 'spd'},
	relaxed: {name: "Relaxed", plus: 'def', minus: 'spe'},
	sassy: {name: "Sassy", plus: 'spd', minus: 'spe'},
	serious: {name: "Serious"},
	timid: {name: "Timid", plus: 'spe', minus: 'atk'},
};

interface IDataTable {
	readonly abilities: Dict<IAbilityData>;
	readonly aliases: Dict<string>;
	readonly badges: string[];
	readonly characters: string[];
	readonly formats: Dict<IFormat>;
	readonly formatsData: Dict<ITemplateFormatsData>;
	readonly gifData: Dict<{back?: {h: number, w: number}, front?: {h: number, w: number}}>;
	readonly items: Dict<IItemData>;
	readonly learnsets: Dict<ILearnset>;
	readonly moves: Dict<IMoveData>;
	readonly natures: Dict<INature>;
	readonly pokedex: Dict<ITemplateData>;
	readonly trainerClasses: string[];
	readonly typeChart: Dict<ITypeChart>;
	readonly types: Dict<string>;
}

const dexes: Dict<Dex> = {};

export class Dex {
	abilityCache = new Map<string, IAbility>();
	gen = 0;
	itemCache = new Map<string, IItem>();
	loadedData = false;
	loadedMods = false;
	parentMod = '';

	currentMod: string;
	dataCache: IDataTable;
	dataDir: string;
	isBase: boolean;

	constructor(mod: string) {
		const isBase = mod === 'base';
		if (isBase) {
			dexes['base'] = this;
			dexes[currentGen] = this;
		}
		this.currentMod = mod;
		this.isBase = isBase;
		this.dataDir = isBase ? dataDir : modsDir + "/" + mod;
		this.dataCache = {
			abilities: {},
			aliases: {},
			gifData: {},
			badges: [],
			characters: [],
			formats: {},
			formatsData: {},
			items: {},
			learnsets: {},
			moves: {},
			natures: {},
			pokedex: {},
			trainerClasses: [],
			typeChart: {},
			types: {},
		};
	}

	get data(): IDataTable {
		return this.loadData();
	}

	includeMods(): Dex {
		if (!this.isBase) throw new Error(`This must be called on the base Dex`);
		if (this.loadedMods) return this;

		for (const mod of fs.readdirSync(modsDir)) {
			dexes[mod] = new Dex(mod);
		}
		this.loadedMods = true;

		return this;
	}

	loadDataFile(basePath: string, dataFiles: Dict<string>, dataType: string): Dict<any> {
		try {
			const filePath = basePath + dataFiles[dataType];
			const dataObject = require(filePath);
			const key = `Battle${dataType}`;
			if (!dataObject || typeof dataObject !== 'object') return new TypeError(`${filePath}, if it exists, must export a non-null object`);
			if (!dataObject[key] || typeof dataObject[key] !== 'object') return new TypeError(`${filePath}, if it exists, must export an object whose '${key}' property is a non-null object`);
			return dataObject[key];
		} catch (e) {
			if (e.code !== 'MODULE_NOT_FOUND' && e.code !== 'ENOENT') {
				throw e;
			}
		}
		return {};
	}

	includeFormats() {
		let formatsList: IFormatData[] = [];
		try {
			const dataObject = require(path.join(PokemonShowdown, 'config/formats.js'));
			formatsList = dataObject.Formats;
		} catch (e) {
			if (e.code !== 'MODULE_NOT_FOUND' && e.code !== 'ENOENT') {
				throw e;
			}
		}

		let section = '';
		let column = 1;
		for (let i = 0; i < formatsList.length; i++) {
			const format = formatsList[i];
			const id = Tools.toId(format.name);
			if (format.section) section = format.section;
			if (format.column) column = format.column;
			if (!format.name && format.section) continue;
			if (!id) throw new RangeError(`Format #${i + 1} must have a name with alphanumeric characters, not '${format.name}'`);
			if (!format.section) format.section = section;
			if (!format.column) format.column = column;
			if (format.challengeShow === undefined) format.challengeShow = true;
			if (format.searchShow === undefined) format.searchShow = true;
			if (format.tournamentShow === undefined) format.tournamentShow = true;
			if (format.mod === undefined) format.mod = currentGen;
		}

		let formats: Dict<IFormat> = {};
		try {
			const dataObject = require(lanetteDataDir + '/format-links.js');
			formats = dataObject.BattleFormatLinks;
		} catch (e) {
			if (e.code !== 'MODULE_NOT_FOUND' && e.code !== 'ENOENT') {
				throw e;
			}
		}

		for (let i = 0; i < formatsList.length; i++) {
			const formatData = formatsList[i];
			const id = Tools.toId(formatData.name);
			if (!id) continue;
			const format: IFormat = Object.assign({
				id,
				tournamentPlayable: !!(formatData.searchShow || formatData.challengeShow || formatData.tournamentShow),
			}, formatData);
			let viability = '';
			let info = '';
			let np = '';
			if (format.threads) {
				const threads = format.threads.slice();
				for (let i = 0, len = threads.length; i < len; i++) {
					const line = threads[i].trim();
					if (line.startsWith('&bullet;')) {
						const text = line.split('</a>')[0].split('">')[1];
						if (!text) continue;
						if (text.includes('Viability Ranking')) {
							const link = line.split('<a href="');
							if (link[1]) {
								viability = link[1].split('/">')[0].split('/').pop()!;
							}
						} else if (text.startsWith("np:") || text.includes(format.name + " Stage")) {
							const link = line.split('<a href="');
							if (link[1]) {
								np = link[1].split('/">')[0].split('/').pop()!;
							}
						} else if (Tools.toId(text) === id) {
							const link = line.split('<a href="');
							if (link[1]) {
								info = link[1].split('/">')[0].split('/').pop()!;
							}
						}
					}
				}
			}
			if (id in formats) {
				Object.assign(formats[id], format);
				if (viability) formats[id]['viability-official'] = viability;
				if (info) formats[id]['info-official'] = info;
				if (np) formats[id]['np-official'] = np;
			} else {
				if (viability) format.viability = viability;
				if (info) format.info = info;
				if (np) format.np = np;
				formats[id] = format;
			}
		}

		for (const id in formats) {
			const format = formats[id];
			const links: ('info' | 'np' | 'viability')[] = ['info', 'np', 'viability'];
			for (let i = 0; i < links.length; i++) {
				const link = format[links[i]];
				let num = 0;
				if (link) num = parseInt(link.split("/")[0]);
				if (isNaN(num)) continue;
				// @ts-ignore
				if (format[links[i] + '-official']) {
					// @ts-ignore
					const officialNum = parseInt(format[links[i] + '-official']);
					if (!isNaN(officialNum) && officialNum > num) num = officialNum;
				}
				format[links[i]] = 'http://www.smogon.com/forums/threads/' + num;
			}
		}

		// @ts-ignore
		Object.assign(this.dataCache.Formats, formats);
		Object.assign(this.dataCache.formats, formats);
	}

	loadData(): IDataTable {
		if (this.loadedData) return this.dataCache;
		dexes['base'].includeMods();

		const basePath = this.dataDir + '/';
		const lanetteBasePath = lanetteDataDir + '/';
		const BattleScripts = this.loadDataFile(basePath, dataFiles, 'Scripts');

		this.parentMod = this.isBase ? '' : (BattleScripts.inherit || 'base');

		let parentDex;
		if (this.parentMod) {
			parentDex = dexes[this.parentMod];
			if (!parentDex || parentDex === this) throw new Error("Unable to load " + this.currentMod + ". `inherit` should specify a parent mod from which to inherit data, or must be not specified.");
		}

		const dataTypesToLoad = dataTypes.concat(['Aliases', 'Natures']);
		for (const dataType of dataTypesToLoad) {
			if (dataType === 'Natures' && this.isBase) {
				// @ts-ignore
				this.dataCache[dataType] = natures;
				continue;
			}
			const BattleData = this.loadDataFile(basePath, dataFiles, dataType);
			if (!BattleData || typeof BattleData !== 'object') throw new TypeError("Exported property `Battle" + dataType + "`from `" + this.dataDir + '/' + dataFiles[dataType] + "` must be an object except `null`.");
			// @ts-ignore
			if (BattleData !== this.dataCache[dataType]) this.dataCache[dataType] = Object.assign(BattleData, this.dataCache[dataType]);
		}

		for (const dataType of lanetteDataTypes) {
			const BattleData = this.loadDataFile(lanetteBasePath, lanetteDataFiles, dataType);
			if (!BattleData || typeof BattleData !== 'object') throw new TypeError("Exported property `Battle" + dataType + "`from `" + this.dataDir + '/' + dataFiles[dataType] + "` must be an object except `null`.");
			// @ts-ignore
			this.dataCache[dataType] = Object.assign(BattleData, this.dataCache[dataType]);
		}

		if (!parentDex) {
			// Formats are inherited by mods
			this.includeFormats();
		} else {
			for (let i = 0, len = dataTypes.length; i < len; i++) {
				const dataType = dataTypes[i];
				// @ts-ignore
				const parentTypedData = parentDex.data[dataType];
				// @ts-ignore
				const childTypedData = this.dataCache[dataType] || (this.dataCache[dataType] = {});
				for (const entryId in parentTypedData) {
					if (childTypedData[entryId] === null) {
						// null means don't inherit
						delete childTypedData[entryId];
					} else if (!(entryId in childTypedData)) {
						// If it doesn't exist it's inherited from the parent data
						if (dataType === 'Pokedex') {
							// Pokedex entries can be modified too many different ways
							// e.g. inheriting different formats-data/learnsets
							childTypedData[entryId] = Tools.deepClone(parentTypedData[entryId]);
						} else {
							childTypedData[entryId] = parentTypedData[entryId];
						}
					} else if (childTypedData[entryId] && childTypedData[entryId].inherit) {
						// {inherit: true} can be used to modify only parts of the parent data,
						// instead of overwriting entirely
						delete childTypedData[entryId].inherit;

						// Merge parent into children entry, preserving existing childs' properties.
						for (const key in parentTypedData[entryId]) {
							if (key in childTypedData[entryId]) continue;
							childTypedData[entryId][key] = parentTypedData[entryId][key];
						}
					}
				}
			}
			// @ts-ignore
			this.dataCache['Aliases'] = parentDex.data['Aliases'];
		}

		const allDataTypes = dataTypesToLoad.concat(lanetteDataTypes);
		// alias data types
		for (let i = 0, len = allDataTypes.length; i < len; i++) {
			let dataType = allDataTypes[i];
			if (dataType === 'FormatsData') {
				dataType = 'formatsData';
			} else if (dataType === 'FormatLinks') {
				dataType = 'formatLinks';
			} else if (dataType === 'Movedex') {
				dataType = 'moves';
			} else if (dataType === 'PokemonSprites') {
				dataType = 'gifData';
			} else if (dataType === 'TrainerClasses') {
				dataType = 'trainerClasses';
			} else if (dataType === 'TypeChart') {
				dataType = 'typeChart';
			} else {
				dataType = Tools.toId(dataType);
			}
			// @ts-ignore
			this.dataCache[dataType] = this.dataCache[allDataTypes[i]];
		}

		for (const i in this.dataCache.typeChart) {
			this.dataCache.types[Tools.toId(i)] = i;
		}

		this.gen = BattleScripts.gen || 7;

		this.loadedData = true;

		// Execute initialization script.
		if (BattleScripts.init) BattleScripts.init.call(this);

		return this.dataCache;
	}

	async fetchClientData() {
		const files = ['pokedex-mini.js'];
		for (let i = 0; i < files.length; i++) {
			const file = await Tools.fetchUrl('https://play.pokemonshowdown.com/data/' + files[i]);
			if (file) fs.writeFileSync(lanetteDataDir + "/" + files[i], file);
		}
	}

	getAbility(name: string): IAbility | null {
		let id = Tools.toId(name);
		if (!id) return null;
		if (id in this.data.aliases) id = this.data.aliases[id];
		if (!(id in this.data.abilities)) return null;
		const cached = this.abilityCache.get(id);
		if (cached) return cached;
		const abilityData = this.data.abilities[id];
		let gen = 0;
		if (abilityData.num >= 192) {
			gen = 7;
		} else if (abilityData.num >= 165) {
			gen = 6;
		} else if (abilityData.num >= 124) {
			gen = 5;
		} else if (abilityData.num >= 77) {
			gen = 4;
		} else if (abilityData.num >= 1) {
			gen = 3;
		}

		const abilityComputed: IAbilityComputed = {
			gen,
			id: Tools.toId(abilityData.name),
		};
		const ability: IAbility = Object.assign(abilityData, abilityComputed);
		this.abilityCache.set(id, ability);
		return ability;
	}

	getExistingAbility(name: string): IAbility {
		const ability = this.getAbility(name);
		if (!ability) throw new Error("No ability returned for '" + name + "'");
		return ability;
	}

	getItem(name: string): IItem | null {
		let id = Tools.toId(name);
		if (!id) return null;
		if (id in this.data.aliases) id = this.data.aliases[id];
		if (!(id in this.data.items)) return null;
		const cached = this.itemCache.get(id);
		if (cached) return cached;
		const itemData = this.data.items[id];
		let gen = 0;
		if (!itemData.gen) {
			if (itemData.num >= 689) {
				gen = 7;
			} else if (itemData.num >= 577) {
				gen = 6;
			} else if (itemData.num >= 537) {
				gen = 5;
			} else if (itemData.num >= 377) {
				gen = 4;
			} else {
				gen = 3;
			}
			// Due to difference in gen 2 item numbering, gen 2 items must be
			// specified manually
		}

		let fling;
		if (itemData.isBerry) fling = {basePower: 10};
		if (itemData.id.endsWith('plate')) fling = {basePower: 90};
		if (itemData.onDrive) fling = {basePower: 70};
		if (itemData.megaStone) fling = {basePower: 80};
		if (itemData.onMemory) fling = {basePower: 50};

		const itemComputed: IItemComputed = {
			gen,
			id: Tools.toId(itemData.name),
			fling,
		};
		const item: IItem = Object.assign(itemData, itemComputed);
		this.itemCache.set(id, item);
		return item;
	}

	getExistingItem(name: string): IItem {
		const item = this.getItem(name);
		if (!item) throw new Error("No item returned for '" + name + "'");
		return item;
	}

	getFormat(name: string): IFormat | null {
		let id = Tools.toId(name);
		if (!id) return null;
		if (id in this.data.aliases) id = this.data.aliases[id];
		if (!(id in this.data.formats)) return null;
		return Object.assign({}, this.data.formats[id]);
	}
}

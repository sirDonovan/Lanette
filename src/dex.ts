import fs = require('fs');
import path = require('path');
import { IAbilityData, IItemData, ILearnset, IMoveData, INature, ITemplateData, ITemplateFormatsData, ITypeChart } from './types/in-game-data-types';

const dataDir = path.resolve(__dirname, './../Pokemon-Showdown/data');
const modsDir = path.resolve(__dirname, './../Pokemon-Showdown/mods');
const lanetteDataDir = path.resolve(__dirname, './../data');

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
	gen = 0;
	loadedData = false;
	loadedMods = false;
	parentMod = '';

	currentMod: string;
	dataCache: IDataTable;
	dataDir: string;
	isBase: boolean;

	constructor(mod: string) {
		if (mod === 'base') dexes['base'] = this;
		this.currentMod = mod;
		this.isBase = mod === 'base';
		this.dataDir = this.isBase ? dataDir : modsDir + "/" + mod;
		this.dataCache = {
			abilities: {},
			aliases: {},
			gifData: {},
			badges: [],
			characters: [],
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
			if (BattleData !== this.dataCache[dataType]) this.dataCache[dataType] = Object.assign(BattleData, this.dataCache[dataType]);
		}

		if (!parentDex) {
			// Formats are inherited by mods
			// this.includeFormats();
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
}

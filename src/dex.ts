import fs = require('fs');
import path = require('path');
import { IAbilityData, IFlingData, IFormatData, IItemData, ILearnset, IMoveData, IMoveFlags, INature, ITemplateData, ITemplateFormatsData, ITypeChart } from './types/in-game-data-types';

interface IAbilityComputed {
	gen: number;
	id: string;
}

export interface IAbility extends IAbilityData, IAbilityComputed {}

interface IFormatComputed {
	banlist: NonNullable<IFormatData["banlist"]>;
	customRules: string[] | null;
	defaultLevel: number;
	id: string;
	info?: string;
	'info-official'?: string;
	maxLevel: number;
	np?: string;
	'np-official'?: string;
	ruleset: NonNullable<IFormatData["ruleset"]>;
	ruleTable: RuleTable | null;
	tournamentPlayable: boolean;
	unbanlist: NonNullable<IFormatData["unbanlist"]>;
	viability?: string;
	'viability-official'?: string;
}

export interface IFormat extends IFormatData, IFormatComputed {
	banlist: NonNullable<IFormatData["banlist"]>;
	defaultLevel: number;
	maxLevel: number;
	ruleset: NonNullable<IFormatData["ruleset"]>;
	unbanlist: NonNullable<IFormatData["unbanlist"]>;
}

interface IItemComputed {
	fling?: IFlingData;
	gen: number;
	id: string;
}

export interface IItem extends IItemData, IItemComputed {}

interface IMoveComputed {
	baseMoveType: string;
	gen: number;
	ignoreImmunity: IMoveData["ignoreImmunity"];
}

export interface IMove extends IMoveData, IMoveComputed {
	baseMoveType: string;
	ignoreImmunity: IMoveData["ignoreImmunity"];
}

interface IPokemonComputed {
	baseSpecies: string;
	battleOnly?: boolean;
	evos: string[];
	forme: string;
	gen: number;
	genderRatio: NonNullable<ITemplateData["genderRatio"]>;
	id: string;
	isMega: boolean;
	isPrimal: boolean;
	name: string;
	nfe: boolean;
	speciesId: string;
	spriteId: string;
}

export interface IPokemon extends ITemplateData, Partial<ILearnset>, ITemplateFormatsData, IPokemonComputed {
	baseSpecies: string;
	evos: string[];
	forme: string;
	gen: number;
	genderRatio: NonNullable<ITemplateData["genderRatio"]>;
}

/**
 * A RuleTable keeps track of the rules that a format has. The key can be:
 * - '[ruleid]' the ID of a rule in effect
 * - '-[thing]' or '-[category]:[thing]' ban a thing
 * - '+[thing]' or '+[category]:[thing]' allow a thing (override a ban)
 * [category] is one of: item, move, ability, species, basespecies
 */
export class RuleTable extends Map<string, string> {
	/** rule, source, limit, bans */
	complexBans = [] as [string, string, number, string[]][];
	/** rule, source, limit, bans */
	complexTeamBans = [] as [string, string, number, string[]][];
	checkLearnset = null as [(...args: any) => void, string] | null;

	check(thing: string, setHas?: Dict<true>): string {
		if (setHas) setHas[thing] = true;
		return this.getReason('-' + thing);
	}

	getReason(key: string): string {
		const source = this.get(key);
		if (source === undefined) return '';
		return source ? `banned by ${source}` : `banned`;
	}

	getComplexBanIndex(complexBans: [string, string, number, string[]][], rule: string): number {
		const ruleId = Tools.toId(rule);
		let complexBanIndex = -1;
		for (let i = 0; i < complexBans.length; i++) {
			if (Tools.toId(complexBans[i][0]) === ruleId) {
				complexBanIndex = i;
				break;
			}
		}
		return complexBanIndex;
	}

	addComplexBan(rule: string, source: string, limit: number, bans: string[]) {
		const complexBanIndex = this.getComplexBanIndex(this.complexBans, rule);
		if (complexBanIndex !== -1) {
			if (this.complexBans[complexBanIndex][2] === Infinity) return;
			this.complexBans[complexBanIndex] = [rule, source, limit, bans];
		} else {
			this.complexBans.push([rule, source, limit, bans]);
		}
	}

	addComplexTeamBan(rule: string, source: string, limit: number, bans: string[]) {
		const complexBanTeamIndex = this.getComplexBanIndex(this.complexTeamBans, rule);
		if (complexBanTeamIndex !== -1) {
			if (this.complexTeamBans[complexBanTeamIndex][2] === Infinity) return;
			this.complexTeamBans[complexBanTeamIndex] = [rule, source, limit, bans];
		} else {
			this.complexTeamBans.push([rule, source, limit, bans]);
		}
	}
}

interface IDataTable {
	readonly abilities: Dict<IAbilityData | undefined>;
	readonly aliases: Dict<string | undefined>;
	readonly badges: string[];
	readonly characters: string[];
	readonly formats: Dict<IFormat | undefined>;
	readonly formatsData: Dict<ITemplateFormatsData | undefined>;
	readonly gifData: Dict<{back?: {h: number, w: number}, front?: {h: number, w: number}} | undefined>;
	readonly items: Dict<IItemData | undefined>;
	readonly learnsets: Dict<ILearnset | undefined>;
	readonly moves: Dict<IMoveData | undefined>;
	readonly natures: Dict<INature | undefined>;
	readonly pokedex: Dict<ITemplateData | undefined>;
	readonly trainerClasses: string[];
	readonly typeChart: Dict<ITypeChart | undefined>;
	readonly types: Dict<string | undefined>;
}

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

const dexes: Dict<Dex> = {};

export class Dex {
	abilityCache = new Map<string, IAbility>();
	gen = 0;
	itemCache = new Map<string, IItem>();
	loadedData = false;
	loadedMods = false;
	moveCache = new Map<string, IMove>();
	parentMod = '';
	pokemonCache = new Map<string, IPokemon>();

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
			const maxLevel = formatData.maxLevel || 100;
			if (!formatData.defaultLevel) formatData.defaultLevel = formatData.maxLevel;
			const formatComputed: IFormatComputed = {
				banlist: formatData.banlist || [],
				customRules: null,
				defaultLevel: formatData.defaultLevel || maxLevel,
				id,
				maxLevel,
				ruleset: formatData.ruleset || [],
				ruleTable: null,
				tournamentPlayable: !!(formatData.searchShow || formatData.challengeShow || formatData.tournamentShow),
				unbanlist: formatData.unbanlist || [],
			};
			let viability = '';
			let info = '';
			let np = '';
			if (formatData.threads) {
				const threads = formatData.threads.slice();
				for (let i = 0; i < threads.length; i++) {
					const line = threads[i].trim();
					if (line.startsWith('&bullet;')) {
						const text = line.split('</a>')[0].split('">')[1];
						if (!text) continue;
						if (text.includes('Viability Ranking')) {
							const link = line.split('<a href="');
							if (link[1]) {
								viability = link[1].split('/">')[0].split('/').pop()!;
							}
						} else if (text.startsWith("np:") || text.includes(formatData.name + " Stage")) {
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
				if (viability) formatComputed['viability-official'] = viability;
				if (info) formatComputed['info-official'] = info;
				if (np) formatComputed['np-official'] = np;
				Object.assign(formats[id], formatData, formatComputed);
			} else {
				if (viability) formatComputed.viability = viability;
				if (info) formatComputed.info = info;
				if (np) formatComputed.np = np;
				formats[id] = Object.assign(formatData, formatComputed);
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
			for (let i = 0; i < dataTypes.length; i++) {
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
		for (let i = 0; i < allDataTypes.length; i++) {
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
		if (this.data.aliases.hasOwnProperty(id)) id = this.data.aliases[id]!;
		if (!this.data.abilities.hasOwnProperty(id)) return null;

		const cached = this.abilityCache.get(id);
		if (cached) return cached;
		const abilityData = this.data.abilities[id]!;
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
		if (this.data.aliases.hasOwnProperty(id)) id = this.data.aliases[id]!;
		if (!this.data.items.hasOwnProperty(id)) return null;

		const cached = this.itemCache.get(id);
		if (cached) return cached;
		const itemData = this.data.items[id]!;
		let gen = itemData.gen || 0;
		if (!gen) {
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

	getMove(name: string): IMove | null {
		let id = Tools.toId(name);
		if (!id) return null;
		if (this.data.aliases.hasOwnProperty(id)) id = this.data.aliases[id]!;
		if (!this.data.moves.hasOwnProperty(id)) return null;

		const cached = this.moveCache.get(id);
		if (cached) return cached;
		const moveData = this.data.moves[id]!;
		// Hidden Power
		if (!moveData.id) moveData.id = Tools.toId(moveData.name);
		if (!moveData.flags) moveData.flags = {};
		moveData.critRatio = Number(moveData.critRatio) || 1;
		moveData.priority = Number(moveData.priority) || 0;
		let gen = 0;
		if (moveData.num >= 622) {
			gen = 7;
		} else if (moveData.num >= 560) {
			gen = 6;
		} else if (moveData.num >= 468) {
			gen = 5;
		} else if (moveData.num >= 355) {
			gen = 4;
		} else if (moveData.num >= 252) {
			gen = 3;
		} else if (moveData.num >= 166) {
			gen = 2;
		} else if (moveData.num >= 1) {
			gen = 1;
		}

		const moveComputed: IMoveComputed = {
			baseMoveType: moveData.baseMoveType || moveData.type,
			gen,
			ignoreImmunity: moveData.ignoreImmunity !== undefined ? moveData.ignoreImmunity : moveData.category === 'Status',
		};
		const move: IMove = Object.assign(moveData, moveComputed);
		this.moveCache.set(id, move);
		return move;
	}

	getExistingMove(name: string): IMove {
		const move = this.getMove(name);
		if (!move) throw new Error("No move returned for '" + name + "'");
		return move;
	}

	getPokemon(name: string): IPokemon | null {
		let id = Tools.toId(name);
		if (!id) return null;
		if (this.data.aliases.hasOwnProperty(id)) id = this.data.aliases[id]!;
		if (!this.data.pokedex.hasOwnProperty(id)) return null;

		const cached = this.pokemonCache.get(id);
		if (cached) return cached;
		const templateData = this.data.pokedex[id]!;
		const templateFormatsData = this.data.formatsData[id] || {};

		if (!templateData.eggGroups) templateData.eggGroups = [];
		if (!templateFormatsData.requiredItems && templateFormatsData.requiredItem) templateFormatsData.requiredItems = [templateFormatsData.requiredItem];
		let battleOnly = templateFormatsData.battleOnly;
		let isMega = false;
		let isPrimal = false;
		let gen = templateFormatsData.gen || 0;
		if (!gen) {
			if (templateData.num >= 722 || (templateData.forme && templateData.forme.startsWith('Alola'))) {
				gen = 7;
			} else if (templateData.forme && ['Mega', 'Mega-X', 'Mega-Y'].includes(templateData.forme)) {
				gen = 6;
				isMega = true;
				battleOnly = true;
			} else if (templateData.forme === 'Primal') {
				gen = 6;
				isPrimal = true;
				battleOnly = true;
			} else if (templateData.num >= 650) {
				gen = 6;
			} else if (templateData.num >= 494) {
				gen = 5;
			} else if (templateData.num >= 387) {
				gen = 4;
			} else if (templateData.num >= 252) {
				gen = 3;
			} else if (templateData.num >= 152) {
				gen = 2;
			} else if (templateData.num >= 1) {
				gen = 1;
			}
		}

		const baseSpecies = templateData.baseSpecies || templateData.species;
		const evos = templateData.evos || [];
		const speciesId = Tools.toId(templateData.species);
		const pokemonComputed: IPokemonComputed = {
			baseSpecies,
			battleOnly,
			gen,
			genderRatio: templateData.genderRatio || (templateData.gender === 'M' ? {M: 1, F: 0} :
				templateData.gender === 'F' ? {M: 0, F: 1} :
				templateData.gender === 'N' ? {M: 0, F: 0} :
				{M: 0.5, F: 0.5}),
			evos,
			forme: templateData.forme || '',
			id: speciesId,
			isMega,
			isPrimal,
			name: templateData.species,
			nfe: !!evos.length,
			speciesId,
			spriteId: Tools.toId(baseSpecies) + (baseSpecies !== templateData.species ? '-' + Tools.toId(templateData.forme) : ''),
		};
		const pokemon: IPokemon = Object.assign(templateData, templateFormatsData, this.data.learnsets[id] || {}, pokemonComputed);
		this.pokemonCache.set(id, pokemon);
		return pokemon;
	}

	getTemplate(name: string): IPokemon | null {
		return this.getPokemon(name);
	}

	getExistingPokemon(name: string): IPokemon {
		const pokemon = this.getPokemon(name);
		if (!pokemon) throw new Error("No pokemon returned for '" + name + "'");
		return pokemon;
	}

	getFormat(name: string): IFormat | null {
		let id = Tools.toId(name);
		if (!id) return null;
		if (this.data.aliases.hasOwnProperty(id)) id = this.data.aliases[id]!;
		if (!this.data.formats.hasOwnProperty(id)) return null;
		// data computed in includeFormats();
		return Object.assign({}, this.data.formats[id]);
	}

	getExistingFormat(name: string): IFormat {
		const format = this.getFormat(name);
		if (!format) throw new Error("No format returned for '" + name + "'");
		return format;
	}

	getRuleTable(format: IFormat, depth = 0): RuleTable {
		if (format.ruleTable) return format.ruleTable;

		const ruleTable = new RuleTable();
		const ruleset = format.ruleset.slice();
		for (const ban of format.banlist) {
			ruleset.push('-' + ban);
		}
		for (const ban of format.unbanlist) {
			ruleset.push('+' + ban);
		}
		if (format.customRules) {
			for (const rule of format.customRules) {
				if (rule.startsWith('!')) {
					ruleset.unshift(rule);
				} else {
					ruleset.push(rule);
				}
			}
		}
		if (format.checkLearnset) {
			ruleTable.checkLearnset = [format.checkLearnset, format.name];
		}

		for (const rule of ruleset) {
			const ruleSpec = this.validateRule(rule, format);
			if (typeof ruleSpec !== 'string') {
				if (ruleSpec[0] === 'complexTeamBan') {
					const complexTeamBan = ruleSpec.slice(1) as [string, string, number, string[]];
					ruleTable.addComplexTeamBan(complexTeamBan[0], complexTeamBan[1], complexTeamBan[2], complexTeamBan[3]);
				} else if (ruleSpec[0] === 'complexBan') {
					const complexBan = ruleSpec.slice(1) as [string, string, number, string[]];
					ruleTable.addComplexBan(complexBan[0], complexBan[1], complexBan[2], complexBan[3]);
				} else {
					throw new Error(`Unrecognized rule spec ${ruleSpec}`);
				}
				continue;
			}
			if ("!+-".includes(ruleSpec.charAt(0))) {
				if (ruleSpec.charAt(0) === '+' && ruleTable.has('-' + ruleSpec.slice(1))) {
					ruleTable.delete('-' + ruleSpec.slice(1));
				}
				ruleTable.set(ruleSpec, '');
				continue;
			}
			const subformat = this.getFormat(ruleSpec);
			if (!subformat) continue;
			if (ruleTable.has('!' + subformat.id)) continue;
			ruleTable.set(subformat.id, '');
			if (depth > 16) {
				throw new Error(`Excessive ruleTable recursion in ${format.name}: ${ruleSpec} of ${format.ruleset}`);
			}
			const subRuleTable = this.getRuleTable(subformat, depth + 1);
			for (const [k, v] of subRuleTable) {
				if (!ruleTable.has('!' + k)) ruleTable.set(k, v || subformat.name);
			}
			for (const [rule, source, limit, bans] of subRuleTable.complexBans) {
				ruleTable.addComplexBan(rule, source || subformat.name, limit, bans);
			}
			for (const [rule, source, limit, bans] of subRuleTable.complexTeamBans) {
				ruleTable.addComplexTeamBan(rule, source || subformat.name, limit, bans);
			}
			if (subRuleTable.checkLearnset) {
				if (ruleTable.checkLearnset) {
					throw new Error(`"${format.name}" has conflicting move validation rules from "${ruleTable.checkLearnset[1]}" and "${subRuleTable.checkLearnset[1]}"`);
				}
				ruleTable.checkLearnset = subRuleTable.checkLearnset;
			}
		}

		format.ruleTable = ruleTable;
		return ruleTable;
	}

	validateRule(rule: string, format?: IFormat) {
		switch (rule.charAt(0)) {
		case '-':
		case '+':
			if (format && format.team) throw new Error(`We don't currently support bans in generated teams`);
			if (rule.slice(1).includes('>') || rule.slice(1).includes('+')) {
				let buf = rule.slice(1);
				const gtIndex = buf.lastIndexOf('>');
				let limit = rule.charAt(0) === '+' ? Infinity : 0;
				if (gtIndex >= 0 && /^[0-9]+$/.test(buf.slice(gtIndex + 1).trim())) {
					if (limit === 0) limit = parseInt(buf.slice(gtIndex + 1));
					buf = buf.slice(0, gtIndex);
				}
				let checkTeam = buf.includes('++');
				const banNames = buf.split(checkTeam ? '++' : '+').map(v => v.trim());
				if (banNames.length === 1 && limit > 0) checkTeam = true;
				const innerRule = banNames.join(checkTeam ? ' ++ ' : ' + ');
				const bans = banNames.map(v => this.validateBanRule(v));

				if (checkTeam) {
					return ['complexTeamBan', innerRule, '', limit, bans];
				}
				if (bans.length > 1 || limit > 0) {
					return ['complexBan', innerRule, '', limit, bans];
				}
				throw new Error(`Confusing rule ${rule}`);
			}
			return rule.charAt(0) + this.validateBanRule(rule.slice(1));
		default:
			const id = Tools.toId(rule);
			if (!this.data.formats.hasOwnProperty(id)) {
				throw new Error(`Unrecognized rule "${rule}"`);
			}
			if (rule.charAt(0) === '!') return '!' + id;
			return id;
		}
	}

	validateBanRule(rule: string) {
		let id = Tools.toId(rule);
		if (id === 'unreleased') return 'unreleased';
		if (id === 'illegal') return 'illegal';
		const matches = [];
		let matchTypes = ['pokemon', 'move', 'ability', 'item', 'pokemontag'];
		for (const matchType of matchTypes) {
			if (rule.slice(0, 1 + matchType.length) === matchType + ':') {
				matchTypes = [matchType];
				id = id.slice(matchType.length);
				break;
			}
		}
		const ruleid = id;
		if (this.data.aliases.hasOwnProperty(id)) id = Tools.toId(this.data.aliases[id]);
		for (const matchType of matchTypes) {
			let table;
			switch (matchType) {
			case 'pokemon': table = this.data.pokedex; break;
			case 'move': table = this.data.moves; break;
			case 'item': table = this.data.items; break;
			case 'ability': table = this.data.abilities; break;
			case 'pokemontag':
				// valid pokemontags
				const validTags = [
					// singles tiers
					'uber', 'ou', 'uubl', 'uu', 'rubl', 'ru', 'nubl', 'nu', 'publ', 'pu', 'zu', 'nfe', 'lcuber', 'lc', 'cap', 'caplc', 'capnfe',
					// doubles tiers
					'duber', 'dou', 'dbl', 'duu',
					// custom tags
					'mega',
				];
				if (validTags.includes(ruleid)) matches.push('pokemontag:' + ruleid);
				continue;
			default:
				throw new Error(`Unrecognized match type.`);
			}
			if (table.hasOwnProperty(id)) {
				if (matchType === 'pokemon') {
					const template = table[id];
					// @ts-ignore
					if (template.otherFormes) {
						matches.push('basepokemon:' + id);
						continue;
					}
				}
				matches.push(matchType + ':' + id);
			} else if (matchType === 'pokemon' && id.slice(-4) === 'base') {
				id = id.slice(0, -4);
				if (table.hasOwnProperty(id)) {
					matches.push('pokemon:' + id);
				}
			}
		}
		if (matches.length > 1) {
			throw new Error(`More than one thing matches "${rule}"; please use something like "-item:metronome" to disambiguate`);
		}
		if (matches.length < 1) {
			throw new Error(`Nothing matches "${rule}"`);
		}
		return matches[0];
	}
}

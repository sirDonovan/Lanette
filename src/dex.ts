import fs = require('fs');
import path = require('path');
import { Room } from './rooms';
import { rootFolder } from './tools';
import { IAbility, IAbilityComputed, IAbilityCopy, IDataTable, IFormat, IFormatComputed, IFormatData, IFormatLinks, IItem, IItemComputed, IItemCopy, IMove, IMoveComputed, IMoveCopy, INature, IPokemon, IPokemonComputed, IPokemonCopy, ISeparatedCustomRules } from './types/in-game-data-types';

interface IDataSearchResult {
	name: string;
	searchType: string;
	isInexact?: boolean;
}

export const PokemonShowdown = path.join(rootFolder, 'Pokemon-Showdown');
export const dataDir = path.join(PokemonShowdown, 'data');
export const modsDir = path.join(dataDir, 'mods');
export const formatsPath = path.join(PokemonShowdown, 'config', 'formats.js');
const lanetteDataDir = path.join(rootFolder, 'data');
const currentGen = 7;
const currentGenString = 'gen7';
const omotmSection = 'OM of the Month';

// tslint:disable-next-line no-var-requires
const alternateIconNumbers: {right: Dict<number>, left: Dict<number>} = require(path.join(lanetteDataDir, 'alternate-icon-numbers.js'));

export const dataFiles: Dict<string> = {
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
const dataSearchFunctions: Dict<string> = {pokedex: 'getPokemon', moves: 'getMove', abilities: 'getAbility', items: 'getItem', natures: 'getNature'};
const dataSearchTypes: Dict<string> = {pokedex: 'pokemon', moves: 'move', abilities: 'ability', items: 'item', natures: 'nature'};

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

export const tagNames: Dict<string> = {
	'mega': 'Mega',
	'uber': 'Uber',
	'ou': 'OU',
	'uubl': 'UUBL',
	'uu': 'UU',
	'rubl': 'RUBL',
	'ru': 'RU',
	'nubl': 'NUBL',
	'nu': 'NU',
	'publ': 'PUBL',
	'pu': 'PU',
	'nfe': 'NFE',
	'lcuber': 'LC Uber',
	'lc': 'LC',
	'cap': 'Cap',
	'caplc': 'Cap LC',
	'capnfe': 'Cap NFE',
};

const clauseNicknames: Dict<string> = {
	'Same Type Clause': 'Monotype',
	'STABmons Move Legality': 'STABmons',
	'Inverse Mod': 'Inverse',
	'Allow One Sketch': 'Sketchmons',
	'Allow CAP': 'CAP',
	'Allow Tradeback': 'Tradeback',
	'Ignore Illegal Abilities': 'Almost Any Ability',
};

const customRuleFormats: Dict<string> = {
	'gen7nfe': 'gen7nu@@@-NU,-PU,-PUBL,-ZU,-Vigoroth,-Drought,+Clefairy,+Ferroseed,+Haunter,+Roselia,+Tangela',
};

const dexes: Dict<Dex> = {};
const omotms: string[] = [];

/**
 * A RuleTable keeps track of the rules that a format has. The key can be:
 * - '[ruleid]' the ID of a rule in effect
 * - '-[thing]' or '-[category]:[thing]' ban a thing
 * - '+[thing]' or '+[category]:[thing]' allow a thing (override a ban)
 * [category] is one of: item, move, ability, species, basespecies
 */
export class RuleTable extends Map<string, string> {
	/** rule, source, limit, bans */
	readonly complexBans: [string, string, number, string[]][] = [];
	/** rule, source, limit, bans */
	readonly complexTeamBans: [string, string, number, string[]][] = [];
	checkLearnset: [(...args: any) => void, string] | null = null;

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

export class Dex {
	readonly abilityCache = new Map<string, IAbility>();
	gen: number = 0;
	readonly itemCache = new Map<string, IItem>();
	loadedData: boolean = false;
	loadedMods: boolean = false;
	readonly moveCache = new Map<string, IMove>();
	parentMod: string = '';
	readonly pokemonCache = new Map<string, IPokemon>();

	readonly currentMod: string;
	readonly dataCache: IDataTable;
	readonly dataDir: string;
	readonly isBase: boolean;

	constructor(mod?: string) {
		if (!mod) mod = 'base';
		const isBase = mod === 'base';
		if (isBase) {
			dexes['base'] = this;
			dexes[currentGenString] = this;
		}
		this.currentMod = mod;
		this.isBase = isBase;
		this.dataDir = isBase ? dataDir : path.join(modsDir, mod);
		this.dataCache = {
			abilities: {},
			aliases: {},
			badges: [],
			characters: [],
			colors: {},
			eggGroups: {},
			formats: {},
			formatsData: {},
			gifData: {},
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
		if (!this.loadedData) this.loadData();
		return this.dataCache;
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
			const filePath = path.join(basePath, dataFiles[dataType]);
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
			const dataObject = require(formatsPath);
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
			if (format.mod === undefined) format.mod = currentGenString;

			if (format.section === omotmSection) omotms.push(id);
		}

		let formats: Dict<IFormatData & IFormatLinks> = {};
		try {
			const dataObject = require(path.join(lanetteDataDir, 'format-links.js'));
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
				Object.assign(formats[id], formatData, {
					'info-official': info,
					'np-official': np,
					'viability-official': viability,
				});
			} else {
				formats[id] = Object.assign(formatData, {
					info,
					np,
					viability,
				});
			}
		}

		for (const id in formats) {
			const format = formats[id];
			const links: ('info' | 'np' | 'roleCompendium' | 'teams' | 'viability')[] = ['info', 'np', 'roleCompendium', 'teams', 'viability'];
			for (let i = 0; i < links.length; i++) {
				const link = format[links[i]];
				if (!link) continue;
				let num = parseInt(link.split("/")[0]);
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

	loadData() {
		if (this.loadedData) return;

		dexes['base'].includeMods();

		const BattleScripts = this.loadDataFile(this.dataDir, dataFiles, 'Scripts');

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
			const BattleData = this.loadDataFile(this.dataDir, dataFiles, dataType);
			if (!BattleData || typeof BattleData !== 'object') throw new TypeError("Exported property `Battle" + dataType + "`from `" + this.dataDir + '/' + dataFiles[dataType] + "` must be an object except `null`.");
			// @ts-ignore
			if (BattleData !== this.dataCache[dataType]) this.dataCache[dataType] = Object.assign(BattleData, this.dataCache[dataType]);
		}

		for (const dataType of lanetteDataTypes) {
			const BattleData = this.loadDataFile(lanetteDataDir, lanetteDataFiles, dataType);
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

		for (const i in this.dataCache.formats) {
			const formatid = i;
			const format = this.dataCache.formats[i];
			if (format && format.aliases) {
				for (let i = 0; i < format.aliases.length; i++) {
					const alias = Tools.toId(format.aliases[i]);
					if (!this.dataCache.aliases.hasOwnProperty(alias)) this.dataCache.aliases[alias] = formatid;
				}
			}
		}

		this.gen = BattleScripts.gen || currentGen;

		this.loadedData = true;

		// Execute initialization script.
		if (BattleScripts.init) BattleScripts.init.call(this);

		for (const i in this.data.pokedex) {
			const pokemon = this.getExistingPokemon(i);
			if (pokemon.color) {
				const id = Tools.toId(pokemon.color);
				if (!(id in this.dataCache.colors)) this.dataCache.colors[id] = pokemon.color;
			}
			if (pokemon.tier) {
				const id = Tools.toId(pokemon.tier);
				if (!(id in tagNames)) tagNames[id] = pokemon.tier;
			}
			if (pokemon.eggGroups) {
				for (let i = 0; i < pokemon.eggGroups.length; i++) {
					const id = Tools.toId(pokemon.eggGroups[i]);
					if (!(id in this.dataCache.eggGroups)) this.dataCache.eggGroups[id] = pokemon.eggGroups[i];
				}
			}
		}

		return this.dataCache;
	}

	async fetchClientData() {
		const files = ['pokedex-mini.js'];
		for (let i = 0; i < files.length; i++) {
			const file = await Tools.fetchUrl('https://play.pokemonshowdown.com/data/' + files[i]);
			if (file) await Tools.safeWriteFile(path.join(lanetteDataDir, files[i]), file);
		}
	}

	getAbility(name: string): IAbility | null {
		let id = Tools.toId(name);
		if (!id) return null;
		if (this.data.aliases.hasOwnProperty(id)) id = Tools.toId(this.data.aliases[id]);
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
			effectType: "Ability",
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

	getAbilityCopy(name: string): IAbilityCopy {
		const ability = this.getExistingAbility(name);
		return Tools.deepClone(ability);
	}

	/** Returns a list of standard abilities
	 *
	 * filterAbility: Return `true` to filter `ability` out of the list
	 */
	getAbilitiesList(filterAbility?: (ability: IAbility) => boolean): IAbility[] {
		const abilities: IAbility[] = [];
		for (const i in this.data.abilities) {
			const ability = this.getExistingAbility(i);
			if (!ability.name || ability.isNonstandard || (filterAbility && filterAbility(ability))) continue;
			abilities.push(ability);
		}
		return abilities;
	}

	getItem(name: string): IItem | null {
		let id = Tools.toId(name);
		if (!id) return null;
		if (this.data.aliases.hasOwnProperty(id)) id = Tools.toId(this.data.aliases[id]);
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
			effectType: "Item",
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

	getItemCopy(name: string): IItemCopy {
		const item = this.getExistingItem(name);
		return Tools.deepClone(item);
	}

	/** Returns a list of standard items
	 *
	 * filterItem: Return `true` to filter `item` out of the list
	 */
	getItemsList(filterItem?: (item: IItem) => boolean): IItem[] {
		const items: IItem[] = [];
		for (const i in this.data.items) {
			const item = this.getExistingItem(i);
			if (!item.name || item.isNonstandard || (filterItem && filterItem(item))) continue;
			items.push(item);
		}
		return items;
	}

	getMove(name: string): IMove | null {
		let id = Tools.toId(name);
		if (!id) return null;
		if (this.data.aliases.hasOwnProperty(id)) id = Tools.toId(this.data.aliases[id]);
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
			effectType: "Move",
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

	getMoveCopy(name: string): IMoveCopy {
		const move = this.getExistingMove(name);
		return Tools.deepClone(move);
	}

	/** Returns a list of standard moves
	 *
	 * filterMove: Return `true` to filter `move` out of the list
	 */
	getMovesList(filterMove?: (move: IMove) => boolean): IMove[] {
		const moves: IMove[] = [];
		for (const i in this.data.moves) {
			const move = this.getExistingMove(i);
			if (!move.name || move.isNonstandard || (filterMove && filterMove(move))) continue;
			moves.push(move);
		}
		return moves;
	}

	getPokemon(name: string): IPokemon | null {
		let id = Tools.toId(name);
		if (!id) return null;
		if (this.data.aliases.hasOwnProperty(id)) id = Tools.toId(this.data.aliases[id]);
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
			effectType: "Pokemon",
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
			shiny: false,
			speciesId,
			spriteId: Tools.toId(baseSpecies) + (baseSpecies !== templateData.species ? '-' + Tools.toId(templateData.forme) : ''),
			tier: templateFormatsData.tier || 'Illegal',
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

	getPokemonCopy(name: string): IPokemonCopy {
		const pokemon = this.getExistingPokemon(name);
		return Tools.deepClone(pokemon);
	}

	/** Returns a list of standard Pokemon
	 *
	 * filterPokemon: Return `true` to filter `pokemon` out of the list
	 */
	getPokemonList(filterPokemon?: (pokemon: IPokemon) => boolean): IPokemon[] {
		const pokedex: IPokemon[] = [];
		for (const i in this.data.pokedex) {
			const pokemon = this.getExistingPokemon(i);
			if (!pokemon.species || pokemon.isNonstandard || (filterPokemon && filterPokemon(pokemon))) continue;
			pokedex.push(pokemon);
		}
		return pokedex;
	}

	/** Returns a list of standard, copied Pokemon
	 *
	 * filterPokemon: Return `true` to filter `pokemon` out of the list
	 */
	getPokemonCopyList(filterPokemon?: (pokemon: IPokemon) => boolean): IPokemonCopy[] {
		const pokedex = this.getPokemonList(filterPokemon);
		const copiedPokedex: IPokemonCopy[] = [];
		for (let i = 0; i < pokedex.length; i++) {
			copiedPokedex.push(this.getPokemonCopy(pokedex[i].species));
		}
		return copiedPokedex;
	}

	/**
	 * Returns true if target is immune to source
	 */
	isImmune(source: IMove | string, target: IPokemon | string | string[]): boolean {
		const sourceType = (typeof source === 'string' ? source : source.type);
		let targetType: string | readonly string[];
		if (typeof target === 'string') {
			const pokemon = this.getPokemon(target);
			if (pokemon) {
				targetType = pokemon.types;
			} else {
				targetType = target;
			}
		} else if (target instanceof Array) {
			targetType = target;
		} else {
			targetType = target.types;
		}
		if (targetType instanceof Array) {
			for (let i = 0; i < targetType.length; i++) {
				if (this.isImmune(sourceType, targetType[i])) return true;
			}
			return false;
		} else {
			targetType = targetType as string;
			const typeData = this.data.typeChart[targetType];
			if (typeData && typeData.damageTaken[sourceType] === 3) return true;
		}
		return false;
	}

	/**
	 * >=1: super-effective; <=1: not very effective
	 */
	getEffectiveness(source: IMove | string, target: IPokemon | string | string[]): number {
		const sourceType = (typeof source === 'string' ? source : source.type);
		let targetType;
		if (typeof target === 'string') {
			const pokemon = this.getPokemon(target);
			if (pokemon) {
				targetType = pokemon.types;
			} else {
				targetType = target;
			}
		} else if (target instanceof Array) {
			targetType = target;
		} else {
			targetType = target.types;
		}
		if (targetType instanceof Array) {
			let totalTypeMod = 0;
			for (let i = 0; i < targetType.length; i++) {
				totalTypeMod += this.getEffectiveness(sourceType, targetType[i]);
			}
			return totalTypeMod;
		} else {
			targetType = targetType as string;
			const typeData = this.data.typeChart[targetType];
			if (!typeData) return 0;
			switch (typeData.damageTaken[sourceType]) {
			case 1: return 1; // super-effective
			case 2: return -1; // resist
			// in case of weird situations like Gravity, immunity is
			// handled elsewhere
			default: return 0;
			}
		}
	}

	getWeaknesses(pokemon: IPokemon): string[] {
		const weaknesses = [];
		const types = Object.keys(this.data.typeChart);
		for (let i = 0; i < types.length; i++) {
			const isImmune = this.isImmune(types[i], pokemon);
			const effectiveness = this.getEffectiveness(types[i], pokemon);
			if (!isImmune && effectiveness >= 1) weaknesses.push(types[i]);
		}
		return weaknesses;
	}

	getFormat(name: string, isTrusted?: boolean): IFormat | null {
		let id = Tools.toId(name);
		if (!id) return null;

		let supplementaryAttributes: {customRules?: string[], searchShow?: boolean} = {};
		if (name.includes('@@@')) {
			if (!isTrusted) {
				try {
					name = this.validateFormat(name);
					isTrusted = true;
				// tslint:disable-next-line
				} catch (e) {}
			}
			const [newName, customRulesString] = name.split('@@@', 2);
			name = newName;
			id = Tools.toId(name);
			if (isTrusted && customRulesString) {
				supplementaryAttributes = {
					customRules: customRulesString.split(','),
					searchShow: false,
				};
			}
		}

		if (this.data.aliases.hasOwnProperty(id)) {
			id = Tools.toId(this.data.aliases[id]);
		} else if (id.startsWith('omotm')) {
			let index: number;
			if (id === 'omotm') {
				index = 1;
			} else {
				index = parseInt(id.substr(5));
			}
			if (!isNaN(index) && index <= omotms.length) id = omotms[index - 1];
		}
		if (!this.data.formats.hasOwnProperty(id)) {
			const currentGenId = currentGenString + id;
			if (this.data.formats.hasOwnProperty(currentGenId)) return this.getFormat(currentGenId, isTrusted);
			if (customRuleFormats.hasOwnProperty(id)) return this.getFormat(customRuleFormats[id], true);
			if (customRuleFormats.hasOwnProperty(currentGenId)) return this.getFormat(customRuleFormats[currentGenId], true);
			return null;
		}

		const formatData = this.data.formats[id]!;
		const maxLevel = formatData.maxLevel || 100;
		const formatComputed: IFormatComputed = {
			customRules: null,
			banlist: formatData.banlist || [],
			defaultLevel: formatData.defaultLevel || maxLevel,
			effectType: formatData.effectType || "Format",
			id,
			maxLevel,
			ruleset: formatData.ruleset || [],
			ruleTable: null,
			tournamentPlayable: !!(formatData.searchShow || formatData.challengeShow || formatData.tournamentShow),
			separatedCustomRules: null,
			unbanlist: formatData.unbanlist || [],
			unranked: formatData.rated === false || id.includes('challengecup') || id.includes('hackmonscup') || (formatData.team && (id.includes('1v1') || id.includes('monotype'))) ||
				formatData.mod === 'seasonal' || formatData.mod === 'ssb',
		};
		return Object.assign({}, formatData, formatComputed, supplementaryAttributes);
	}

	getExistingFormat(name: string, isTrusted?: boolean): IFormat {
		const format = this.getFormat(name, isTrusted);
		if (!format) throw new Error("No format returned for '" + name + "'");
		return format;
	}

	getFormatInfoDisplay(format: IFormat): string {
		let html = '';
		if (format.desc) {
			html += '<br>&nbsp; - ' + format.desc;
			if (format.info && !format.team) {
				html += ' More info ';
				if (format.userHosted) {
					html += 'on the <a href="' + format.info + '">official page</a>';
				} else if (format.info.startsWith('https://www.smogon.com/dex/')) {
					html += 'on the  <a href="' + format.info + '">dex page</a>';
				} else {
					html += 'in the  <a href="' + format.info + '">discussion thread</a>';
				}
			}
		} else if (format.info) {
			if (format.userHosted) {
				html += '<br>&nbsp; - Description and more info on the <a href="' + format.info + '">official page</a>.';
				if (format.generator) html += '<br>&nbsp; - Use our <a href="' + format.generator + '">random generator</a> to ease the hosting process.';
			} else {
				html += '<br>&nbsp; - Description and more info ' + (format.info.startsWith('https://www.smogon.com/dex/') ? 'on the  <a href="' + format.info + '">dex page' : 'in the  <a href="' + format.info + '">discussion thread') + '</a>.';
			}
		}
		if (format.teams) html += '<br>&nbsp; - Need to borrow a team? Check out the <a href="' + format.teams + '">sample teams thread</a>.';
		if (format.viability) html += '<br>&nbsp; - See how viable each Pokemon is in the <a href="' + format.viability + '">viability rankings thread</a>.';
		if (format.roleCompendium) html += '<br>&nbsp; - Check the common role that each Pokemon plays in the <a href="' + format.roleCompendium + '">role compendium thread</a>.';
		return html;
	}

	/**
	 * Returns a sanitized format ID if valid, or throws if invalid
	 */
	validateFormat(name: string) {
		const [formatName, customRulesString] = name.split('@@@', 2);
		const format = this.getFormat(formatName);
		if (!format) throw new Error(`Unrecognized format "${formatName}"`);
		if (!customRulesString) return format.id;
		const ruleTable = this.getRuleTable(format);
		const customRules = customRulesString.split(',').map(rule => {
			const ruleSpec = this.validateRule(rule);
			if (typeof ruleSpec === 'string' && ruleTable.has(ruleSpec)) return null;
			return rule.replace(/[\r\n|]*/g, '').trim();
		}).filter(rule => rule);
		if (!customRules.length) throw new Error(`The format already has your custom rules`);
		const validatedFormatid = format.id + '@@@' + customRules.join(',');
		const moddedFormat = this.getFormat(validatedFormatid, true)!;
		this.getRuleTable(moddedFormat);
		return validatedFormatid;
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

	getValidatedRuleName(rule: string): string {
		if (rule === 'unreleased') return 'Unreleased';
		if (rule === 'illegal') return 'Illegal';
		const type = rule.charAt(0);
		let ruleName: string;
		if (type === '+' || type === '-' || type === '!') {
			ruleName = rule.substr(1);
		} else {
			ruleName = rule;
		}
		const index = ruleName.indexOf(':');
		const tag = ruleName.substr(0, index);
		ruleName = ruleName.substr(index + 1);
		if (tag === 'ability') {
			ruleName = this.getExistingAbility(ruleName).name;
		} else if (tag === 'item') {
			ruleName = this.getExistingItem(ruleName).name;
		} else if (tag === 'move') {
			ruleName = this.getExistingMove(ruleName).name;
		} else if (tag === 'pokemon' || tag === 'basepokemon') {
			ruleName = this.getExistingPokemon(ruleName).species;
		} else if (tag === 'pokemontag') {
			ruleName = tagNames[ruleName];
		} else {
			const format = this.getFormat(ruleName);
			if (format) ruleName = format.name;
		}

		return ruleName;
	}

	combineCustomRules(separatedCustomRules: ISeparatedCustomRules): string[] {
		const customRules: string[] = [];
		for (let i = 0; i < separatedCustomRules.bans.length; i++) {
			customRules.push('-' + separatedCustomRules.bans[i]);
		}
		for (let i = 0; i < separatedCustomRules.unbans.length; i++) {
			customRules.push('+' + separatedCustomRules.unbans[i]);
		}
		for (let i = 0; i < separatedCustomRules.addedrules.length; i++) {
			customRules.push(separatedCustomRules.addedrules[i]);
		}
		for (let i = 0; i < separatedCustomRules.removedrules.length; i++) {
			customRules.push('!' + separatedCustomRules.removedrules[i]);
		}

		return customRules;
	}

	separateCustomRules(customRules: string[]): ISeparatedCustomRules {
		const bans: string[] = [];
		const unbans: string[] = [];
		const addedrules: string[] = [];
		const removedrules: string[] = [];
		for (let i = 0; i < customRules.length; i++) {
			const rule = this.validateRule(customRules[i]);
			if (typeof rule === 'string') {
				const type = rule.charAt(0);
				const ruleName = this.getValidatedRuleName(rule);

				if (type === '+') {
					unbans.push(ruleName);
				} else if (type === '-') {
					bans.push(ruleName);
				} else if (type === '!') {
					removedrules.push(ruleName);
				} else {
					addedrules.push(ruleName);
				}
			} else {
				const complexBans = (rule[4] as string[]).map(x => this.getValidatedRuleName(x));
				if (rule[0] === 'complexTeamBan') {
					bans.push(complexBans.join(' ++ '));
				} else {
					bans.push(complexBans.join(' + '));
				}
			}
		}

		return {bans, unbans, addedrules, removedrules};
	}

	getCustomFormatName(room: Room, format: IFormat, showAll?: boolean): string {
		if (!format.customRules || !format.customRules.length) return format.name;
		if (!format.separatedCustomRules) format.separatedCustomRules = this.separateCustomRules(format.customRules);
		const defaultCustomRules: Partial<ISeparatedCustomRules> = Tournaments.defaultCustomRules[room.id] || {};
		const bansLength = format.separatedCustomRules.bans.length;
		const unbansLength = format.separatedCustomRules.unbans.length;
		const addedRulesLength = format.separatedCustomRules.addedrules.length;
		const removedRulesLength = format.separatedCustomRules.removedrules.length;

		const prefixesAdded: string[] = [];
		let prefixesRemoved: string[] = [];
		let suffixes: string[] = [];

		if (showAll || (bansLength <= 2 && unbansLength <= 2 && addedRulesLength <= 2 && removedRulesLength <= 2)) {
			if (bansLength && (!defaultCustomRules.bans || format.separatedCustomRules.bans.join(",") !== defaultCustomRules.bans.join(","))) {
				prefixesRemoved = prefixesRemoved.concat(format.separatedCustomRules.bans);
			}
			if (unbansLength && (!defaultCustomRules.unbans || format.separatedCustomRules.unbans.join(",") !== defaultCustomRules.unbans.join(","))) {
				suffixes = suffixes.concat(format.separatedCustomRules.unbans);
			}
			if (addedRulesLength && (!defaultCustomRules.addedrules || format.separatedCustomRules.addedrules.join(",") !== defaultCustomRules.addedrules.join(","))) {
				for (let i = 0; i < format.separatedCustomRules.addedrules.length; i++) {
					let addedRule = format.separatedCustomRules.addedrules[i];
					const subFormat = this.getFormat(format.separatedCustomRules.addedrules[i]);
					if (subFormat && subFormat.effectType === 'Format' && subFormat.name.startsWith('[Gen')) {
						addedRule = subFormat.name.substr(subFormat.name.indexOf(']') + 2);
					} else if (addedRule in clauseNicknames) {
						addedRule = clauseNicknames[addedRule];
					}
					prefixesAdded.push(addedRule);
				}
			}
			if (removedRulesLength && (!defaultCustomRules.removedrules || format.separatedCustomRules.removedrules.join(",") !== defaultCustomRules.removedrules.join(","))) {
				prefixesRemoved = prefixesRemoved.concat(format.separatedCustomRules.removedrules.map(x => clauseNicknames[x] || x));
			}

			let name = '';
			if (prefixesRemoved.length) name += "(No " + Tools.joinList(prefixesRemoved, null, null, "or") + ") ";
			if (prefixesAdded.length) name += prefixesAdded.join("-") + " ";
			name += format.name;
			if (suffixes.length) name += " (Plus " + Tools.joinList(suffixes) + ")";
			return name;
		} else {
			return format.name;
		}
	}

	getCustomRulesHtml(format: IFormat): string {
		if (!format.separatedCustomRules) format.separatedCustomRules = this.separateCustomRules(format.customRules!);
		const html: string[] = [];
		if (format.separatedCustomRules.bans.length) html.push("&nbsp;&nbsp;&nbsp;&nbsp;<b>Bans</b>: " + format.separatedCustomRules.bans.join(", "));
		if (format.separatedCustomRules.unbans.length) html.push("&nbsp;&nbsp;&nbsp;&nbsp;<b>Unbans</b>: " + format.separatedCustomRules.unbans.join(", "));
		if (format.separatedCustomRules.addedrules.length) html.push("&nbsp;&nbsp;&nbsp;&nbsp;<b>Added rules</b>: " + format.separatedCustomRules.addedrules.join(", "));
		if (format.separatedCustomRules.removedrules.length) html.push("&nbsp;&nbsp;&nbsp;&nbsp;<b>Removed rules</b>: " + format.separatedCustomRules.removedrules.join(", "));
		return html.join("<br />");
	}

	hasGifData(pokemon: IPokemon, direction?: 'front' | 'back'): boolean {
		if (!direction) direction = 'front';
		if (this.data.gifData.hasOwnProperty(pokemon.speciesId) && this.data.gifData[pokemon.speciesId]![direction]) return true;
		return false;
	}

	getPokemonGif(pokemon: IPokemon, direction?: 'front' | 'back', width?: number, height?: number): string {
		if (!direction) direction = 'front';
		let prefix = '';
		if (direction === 'front') {
			if (pokemon.shiny) {
				prefix = "//play.pokemonshowdown.com/sprites/xyani-shiny/";
			} else {
				prefix = "//play.pokemonshowdown.com/sprites/xyani/";
			}
		} else {
			if (pokemon.shiny) {
				prefix = "//play.pokemonshowdown.com/sprites/xyani-back-shiny/";
			} else {
				prefix = "//play.pokemonshowdown.com/sprites/xyani-back/";
			}
		}
		let gif = '<img src="' + prefix + pokemon.spriteId + '.gif" ';
		if (width && height) {
			gif += 'width="' + width + '" height="' + height + '"';
		} else if (this.data.gifData.hasOwnProperty(pokemon.speciesId) && this.data.gifData[pokemon.speciesId]![direction]) {
			const data = this.data.gifData[pokemon.speciesId]![direction]!;
			gif += 'width="' + data.w + '" height="' + data.h + '"';
		}
		gif += ' />';
		return gif;
	}

	getPokemonIcon(pokemon: IPokemon, facingLeft?: boolean): string {
		let num = pokemon.num;
		if (num < 0) {
			num = 0;
		} else if (num > 809) {
			num = 0;
		}

		if (facingLeft) {
			if (alternateIconNumbers.left[pokemon.id]) num = alternateIconNumbers.left[pokemon.id];
		} else if (pokemon.gender === 'F') {
			if (pokemon.id === 'unfezant' || pokemon.id === 'frillish' || pokemon.id === 'jellicent' || pokemon.id === 'meowstic' || pokemon.id === 'pyroar') {
				num = alternateIconNumbers.right[pokemon.id + 'f'];
			}
		} else {
			if (alternateIconNumbers.right[pokemon.id]) num = alternateIconNumbers.right[pokemon.id];
		}

		const top = Math.floor(num / 12) * 30;
		const left = (num % 12) * 40;
		const facingLeftStyle = facingLeft ? "transform:scaleX(-1);webkit-transform:scaleX(-1);" : "";
		return '<span style="display: inline-block;width: 40px;height: 30px;background:transparent url(https://play.pokemonshowdown.com/sprites/smicons-sheet.png?a5) no-repeat scroll -' + left + 'px -' + top + 'px;' + facingLeftStyle + '"></span>';
	}

	dataSearch(target: string, searchIn?: string[] | null, isInexact?: boolean): IDataSearchResult[] | false {
		if (!target) return false;
		if (!searchIn) searchIn = ['pokedex', 'moves', 'abilities', 'items', 'natures'];
		let searchResults: IDataSearchResult[] | false = [];
		for (let i = 0; i < searchIn.length; i++) {
			// @ts-ignore
			const res = this[dataSearchFunctions[searchIn[i]]](target);
			if (res && res.gen <= this.gen) {
				searchResults.push({
					isInexact,
					searchType: dataSearchTypes[searchIn[i]],
					name: res.name,
				});
			}
		}

		if (searchResults.length) return searchResults;

		// prevent an infinite loop
		if (isInexact) return false;

		const cmpTarget = Tools.toId(target);
		let maxLd = 3;
		if (cmpTarget.length <= 1) {
			return false;
		} else if (cmpTarget.length <= 4) {
			maxLd = 1;
		} else if (cmpTarget.length <= 6) {
			maxLd = 2;
		}
		searchResults = false;
		for (let i = 0; i <= searchIn.length; i++) {
			// @ts-ignore
			const searchObj = this.data[searchIn[i] || 'aliases'];
			if (!searchObj) {
				continue;
			}

			for (const j in searchObj) {
				const ld = Tools.levenshtein(cmpTarget, j, maxLd);
				if (ld <= maxLd) {
					const word = searchObj[j].name || searchObj[j].species || j;
					const results = this.dataSearch(word, searchIn, word);
					if (results) {
						searchResults = results;
						maxLd = ld;
					}
				}
			}
		}

		return searchResults;
	}
}

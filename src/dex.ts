import fs = require('fs');
import path = require('path');

import { Room } from './rooms';
import { TeamValidator } from './team-validator';
import { IAbility, IAbilityComputed, IAbilityCopy, IDataTable, IFormat, IFormatComputed, IFormatData, IFormatLinks, IGifData, IItem, IItemComputed, IItemCopy, IMove, IMoveComputed, IMoveCopy, INature, IPokemon, IPokemonComputed, IPokemonCopy, ISeparatedCustomRules, ISpeciesData, ILearnsetData, FormatEffectType } from './types/in-game-data-types';

const currentGen = 8;
const currentGenString = 'gen' + currentGen;
const defaultNewTier = 'OU';
const omotmSection = 'OM of the Month';
const dataDir = path.join(Tools.pokemonShowdownFolder, 'data');
const modsDir = path.join(dataDir, 'mods');
const formatsPath = path.join(Tools.pokemonShowdownFolder, 'config', 'formats.js');
const lanetteDataDir = path.join(Tools.rootFolder, 'data');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const alternateIconNumbers: {right: Dict<number>; left: Dict<number>} = require(path.join(lanetteDataDir, 'alternate-icon-numbers.js'));

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
	'Categories': 'categories',
	'Characters': 'characters',
	'FormatLinks': 'format-links',
	'Locations': 'locations',
	'PokemonSprites': 'pokedex-mini',
	'PokemonSpritesBW': 'pokedex-mini-bw',
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

const formeNames: Dict<string[]> = {
	alola: ['a', 'alola', 'alolan'],
	galar: ['g', 'galar', 'galarian'],
	gmax: ['gigantamax', 'gmax'],
	mega: ['m', 'mega'],
	primal: ['p', 'primal'],
};

const tagNames: Dict<string> = {
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
	'zu': 'ZU',
	'nfe': 'NFE',
	'lcuber': 'LC Uber',
	'lc': 'LC',
	'cap': 'Cap',
	'caplc': 'Cap LC',
	'capnfe': 'Cap NFE',
	'ag': 'Anything Goes',
	'duber': 'DUber',
	'dou': 'DOU',
	'dbl': 'DBL',
	'duu': 'DUU',
	'dnu': 'DNU',
	'mega': 'Mega',
	'glitch': 'Glitch',
	'past': 'Past',
	'future': 'Future',
	'lgpe': 'LGPE',
	'unobtainable': 'Unobtainable',
	'custom': 'Custom',
	'allpokemon': 'All Pokemon',
	'allitems': 'All Items',
	'allmoves': 'All Moves',
	'allabilities': 'All Abilities',
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

const gen2Items: string[] = ['berserkgene', 'berry', 'bitterberry', 'burntberry', 'goldberry', 'iceberry', 'mintberry', 'miracleberry', 'mysteryberry', 'pinkbow', 'polkadotbow',
	'przcureberry', 'psncureberry'];

const customRuleFormats: Dict<string> = {};
const dexes: Dict<Dex> = {};

/** rule, source, limit, bans */
export type ComplexBan = [string, string, number, string[]];
export type ComplexTeamBan = ComplexBan;

/**
 * A RuleTable keeps track of the rules that a format has. The key can be:
 * - '[ruleid]' the ID of a rule in effect
 * - '-[thing]' or '-[category]:[thing]' ban a thing
 * - '+[thing]' or '+[category]:[thing]' allow a thing (override a ban)
 * [category] is one of: item, move, ability, species, basespecies
 *
 * The value is the name of the parent rule (blank for the active format).
 */
export class RuleTable extends Map<string, string> {
	complexBans: ComplexBan[];
	complexTeamBans: ComplexTeamBan[];
	checkLearnset: [Function, string] | null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	timer: [any, string] | null;
	minSourceGen: [number, string] | null;

	constructor() {
		super();
		this.complexBans = [];
		this.complexTeamBans = [];
		this.checkLearnset = null;
		this.timer = null;
		this.minSourceGen = null;
	}

	isBanned(thing: string): boolean {
		if (this.has(`+${thing}`)) return false;
		return this.has(`-${thing}`);
	}

	check(thing: string, setHas: {[id: string]: true} | null = null): string | null {
		if (this.has(`+${thing}`)) return '';
		if (setHas) setHas[thing] = true;
		return this.getReason(`-${thing}`);
	}

	getReason(key: string): string | null {
		const source = this.get(key);
		if (source === undefined) return null;
		if (key === '-nonexistent' || key.startsWith('obtainable')) {
			return 'not obtainable';
		}
		return source ? `banned by ${source}` : `banned`;
	}

	getComplexBanIndex(complexBans: ComplexBan[], rule: string): number {
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

	addComplexBan(rule: string, source: string, limit: number, bans: string[]): void {
		const complexBanIndex = this.getComplexBanIndex(this.complexBans, rule);
		if (complexBanIndex !== -1) {
			if (this.complexBans[complexBanIndex][2] === Infinity) return;
			this.complexBans[complexBanIndex] = [rule, source, limit, bans];
		} else {
			this.complexBans.push([rule, source, limit, bans]);
		}
	}

	addComplexTeamBan(rule: string, source: string, limit: number, bans: string[]): void {
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
	// exported constants
	readonly currentGenString: typeof currentGenString = currentGenString;
	readonly dataDir: typeof dataDir = dataDir;
	readonly dataFiles: typeof dataFiles = dataFiles;
	readonly formatsPath: typeof formatsPath = formatsPath;
	readonly modsDir: typeof modsDir = modsDir;
	readonly omotms: string[] = [];
	readonly tagNames: typeof tagNames = tagNames;

	readonly abilityCache = new Map<string, IAbility>();
	readonly allPossibleMovesCache = new Map<string, string[]>();
	gen: number = currentGen;
	readonly itemCache = new Map<string, IItem>();
	loadedData: boolean = false;
	loadedMods: boolean = false;
	readonly moveCache = new Map<string, IMove>();
	parentMod: string = '';
	readonly pokemonCache = new Map<string, IPokemon>();

	readonly currentMod: string;
	readonly dataCache: IDataTable;
	readonly modDataDir: string;
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
		this.modDataDir = isBase ? dataDir : path.join(modsDir, mod);
		this.dataCache = {
			abilities: {},
			aliases: {},
			badges: [],
			categories: {},
			characters: [],
			colors: {},
			eggGroups: {},
			formats: {},
			formatsData: {},
			gifData: {},
			gifDataBW: {},
			items: {},
			learnsets: {},
			locations: [],
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

	getDex(mod?: string): Dex {
		dexes['base'].loadData();
		if (!mod) mod = currentGenString;
		return dexes[mod];
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	modData(dataType: string, id: string): any {
		/* eslint-disable @typescript-eslint/no-unsafe-return */
		// @ts-ignore
		if (this.isBase) return this.data[dataType][id];
		// @ts-ignore
		if (this.data[dataType][id] !== dexes[this.parentMod].data[dataType][id]) return this.data[dataType][id];
		// @ts-ignore
		this.data[dataType][id] = Tools.deepClone(this.data[dataType][id]);
		// @ts-ignore
		return this.data[dataType][id];
		/* eslint-enable */
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	loadDataFile(basePath: string, dataFiles: Dict<string>, dataType: string): Dict<any> {
		try {
			const filePath = path.join(basePath, dataFiles[dataType]);
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const dataObject = require(filePath);
			const key = `Battle${dataType}`;
			if (!dataObject || typeof dataObject !== 'object') {
				throw new TypeError(`${filePath}, if it exists, must export a non-null object`);
			}
			if (!dataObject[key] || typeof dataObject[key] !== 'object') {
				throw new TypeError(`${filePath}, if it exists, must export an object whose '${key}' property is a non-null object`);
			}
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return dataObject[key];
		} catch (e) {
			if (e.code !== 'MODULE_NOT_FOUND' && e.code !== 'ENOENT') {
				throw e;
			}
		}
		return {};
	}

	includeFormats(): void {
		let formatsList: IFormatData[] = [];
		try {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
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

			if (format.section === omotmSection) this.omotms.push(id);
		}

		let formats: Dict<IFormatData & IFormatLinks> = {};
		try {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const dataObject = require(path.join(lanetteDataDir, 'format-links.js'));
			formats = dataObject.BattleFormatLinks;
		} catch (e) {
			if (e.code !== 'MODULE_NOT_FOUND' && e.code !== 'ENOENT') {
				throw e;
			}
		}

		for (const formatData of formatsList) {
			const id = Tools.toId(formatData.name);
			if (!id) continue;
			let viability = '';
			let info = '';
			let np = '';
			if (formatData.threads) {
				const threads = formatData.threads.slice();
				for (let line of threads) {
					line = line.trim();
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
			for (const id of links) {
				const link = format[id];
				if (!link) continue;
				let num = parseInt(link.split("/")[0]);
				if (isNaN(num)) continue;
				// @ts-ignore
				if (format[id + '-official']) {
					// @ts-ignore
					const officialNum = parseInt(format[id + '-official']);
					if (!isNaN(officialNum) && officialNum > num) num = officialNum;
				}
				format[id] = 'http://www.smogon.com/forums/threads/' + num;
			}
		}

		// @ts-ignore
		Object.assign(this.dataCache.Formats, formats);
		Object.assign(this.dataCache.formats, formats);
	}

	loadData(): void {
		if (this.loadedData) return;

		dexes['base'].includeMods();

		const battleScripts = this.loadDataFile(this.modDataDir, dataFiles, 'Scripts');

		this.parentMod = this.isBase ? '' : (battleScripts.inherit || 'base');

		let parentDex;
		if (this.parentMod) {
			parentDex = dexes[this.parentMod];
			if (!parentDex || parentDex === this) {
				throw new Error("Unable to load " + this.currentMod + ". `inherit` should specify a parent mod from which to inherit data, or must be not specified.");
			}
		}

		const dataTypesToLoad = dataTypes.concat(['Aliases', 'Natures']);
		for (const dataType of dataTypesToLoad) {
			if (dataType === 'Natures') {
				// @ts-ignore
				if (this.isBase) this.dataCache[dataType] = natures;
				continue;
			}
			const battleData = this.loadDataFile(this.modDataDir, dataFiles, dataType);
			// @ts-ignore
			if (battleData !== this.dataCache[dataType]) this.dataCache[dataType] = Object.assign(battleData, this.dataCache[dataType]);
		}

		for (const dataType of lanetteDataTypes) {
			const battleData = this.loadDataFile(lanetteDataDir, lanetteDataFiles, dataType);
			if (!battleData || typeof battleData !== 'object') {
				throw new TypeError("Exported property `Battle" + dataType + "`from `" + this.modDataDir + '/' + dataFiles[dataType] + "` must be an object except `null`.");
			}
			// @ts-ignore
			this.dataCache[dataType] = Object.assign(battleData, this.dataCache[dataType]);
		}

		if (!parentDex) {
			// Formats are inherited by mods
			this.includeFormats();
		} else {
			for (const dataType of dataTypes) {
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
		for (const dataType of allDataTypes) {
			let id = dataType;
			if (dataType === 'FormatsData') {
				id = 'formatsData';
			} else if (dataType === 'FormatLinks') {
				id = 'formatLinks';
			} else if (dataType === 'Movedex') {
				id = 'moves';
			} else if (dataType === 'PokemonSprites') {
				id = 'gifData';
			} else if (dataType === 'PokemonSpritesBW') {
				id = 'gifDataBW';
			} else if (dataType === 'TrainerClasses') {
				id = 'trainerClasses';
			} else if (dataType === 'TypeChart') {
				id = 'typeChart';
			} else {
				id = Tools.toId(dataType);
			}
			// @ts-ignore
			this.dataCache[id] = this.dataCache[dataType];
		}

		for (const i in this.dataCache.typeChart) {
			this.dataCache.types[Tools.toId(i)] = i;
		}

		for (const i in this.dataCache.formats) {
			const formatid = i;
			const format = this.dataCache.formats[i];
			if (format && format.aliases) {
				for (const alias of format.aliases) {
					const id = Tools.toId(alias);
					if (!this.dataCache.aliases.hasOwnProperty(id)) this.dataCache.aliases[id] = formatid;
				}
			}
		}

		this.gen = battleScripts.gen;
		if (!this.gen) throw new Error(`Mod ${this.currentMod} needs a generation number in scripts.js`);

		this.loadedData = true;

		// Execute initialization script.
		if (battleScripts.init) battleScripts.init.call(this);

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
				for (const eggGroup of pokemon.eggGroups) {
					const id = Tools.toId(eggGroup);
					if (!(id in this.dataCache.eggGroups)) this.dataCache.eggGroups[id] = eggGroup;
				}
			}
		}
	}

	async fetchClientData(): Promise<void> {
		const files = ['pokedex-mini.js', 'pokedex-mini-bw.js'];
		for (const fileName of files) {
			const file = await Tools.fetchUrl('https://' + Tools.mainServer + '/data/' + fileName);
			if (typeof file !== 'string') {
				console.log(file);
			} else if (file) {
				await Tools.safeWriteFile(path.join(lanetteDataDir, fileName), file);
			}
		}
	}

	/*
		Abilities
	*/

	getAbility(name: string): IAbility | null {
		let id = Tools.toId(name);
		if (!id) return null;
		if (this.data.aliases.hasOwnProperty(id)) id = Tools.toId(this.data.aliases[id]);
		if (!this.data.abilities.hasOwnProperty(id)) return null;

		const cached = this.abilityCache.get(id);
		if (cached) return cached;
		const abilityData = this.data.abilities[id]!;
		id = Tools.toId(abilityData.name);

		let gen = 0;
		if (abilityData.num >= 234) {
			gen = 8;
		} else if (abilityData.num >= 192) {
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

		let isNonstandard = abilityData.isNonstandard;
		if (gen > this.gen) isNonstandard = 'Future';
		if (this.currentMod === 'letsgo' && id !== 'noability') {
			isNonstandard = 'Past';
		}
		if ((this.currentMod === 'letsgo' || this.gen <= 2) && id === 'noability') {
			isNonstandard = null;
		}

		const abilityComputed: IAbilityComputed = {
			effectType: "Ability",
			gen,
			id,
			isNonstandard: isNonstandard || null,
		};
		const ability: IAbility = Object.assign({}, abilityData, abilityComputed);
		this.abilityCache.set(id, ability);
		return ability;
	}

	getExistingAbility(name: string): IAbility {
		const ability = this.getAbility(name);
		if (!ability) throw new Error("No ability returned for '" + name + "'");
		return ability;
	}

	getAbilityCopy(name: string): IAbilityCopy {
		return Tools.deepClone(this.getExistingAbility(name)) as IAbilityCopy;
	}

	/** Returns a list of existing abilities
	 *
	 * filterAbility: Return `false` to filter `ability` out of the list
	 */
	getAbilitiesList(filter?: (ability: IAbility) => boolean): IAbility[] {
		const abilities: IAbility[] = [];
		for (const i in this.data.abilities) {
			const ability = this.getExistingAbility(i);
			if (ability.isNonstandard === 'CAP' || ability.isNonstandard === 'LGPE' || ability.isNonstandard === 'Custom' || ability.id === 'noability' || ability.gen > this.gen ||
				(filter && !filter(ability))) continue;
			abilities.push(ability);
		}
		return abilities;
	}

	/** Returns a list of existing, copied abilities
	 *
	 * filterMove: Return `false` to filter `ability` out of the list
	 */
	getAbilitiesCopyList(filter?: (ability: IAbility) => boolean): IAbilityCopy[] {
		const abilities = this.getAbilitiesList(filter);
		const copiedAbilities: IAbilityCopy[] = [];
		for (const ability of abilities) {
			copiedAbilities.push(this.getAbilityCopy(ability.name));
		}
		return copiedAbilities;
	}

	/*
		Items
	*/

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

		let isNonstandard = itemData.isNonstandard;
		if (gen > this.gen) isNonstandard = 'Future';
		// hack for allowing mega evolution in LGPE
		if (this.currentMod === 'letsgo' && !isNonstandard && !itemData.megaStone) {
			isNonstandard = 'Past';
		}

		let fling = itemData.fling;
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
			isNonstandard: isNonstandard || null,
		};
		const item: IItem = Object.assign({}, itemData, itemComputed);
		this.itemCache.set(id, item);
		return item;
	}

	getExistingItem(name: string): IItem {
		const item = this.getItem(name);
		if (!item) throw new Error("No item returned for '" + name + "'");
		return item;
	}

	getItemCopy(name: string): IItemCopy {
		return Tools.deepClone(this.getExistingItem(name)) as IItemCopy;
	}

	/** Returns a list of existing items
	 *
	 * filterItem: Return `false` to filter `item` out of the list
	 */
	getItemsList(filter?: (item: IItem) => boolean): IItem[] {
		const items: IItem[] = [];
		for (const i in this.data.items) {
			const item = this.getExistingItem(i);
			if (item.isNonstandard === 'CAP' || item.isNonstandard === 'LGPE' || item.isNonstandard === 'Custom' || item.gen > this.gen ||
				(this.gen !== 2 && gen2Items.includes(item.id)) || (filter && !filter(item))) continue;
			items.push(item);
		}
		return items;
	}

	/** Returns a list of existing, copied items
	 *
	 * filterMove: Return `false` to filter `item` out of the list
	 */
	getItemsCopyList(filter?: (item: IItem) => boolean): IItemCopy[] {
		const items = this.getItemsList(filter);
		const copiedItems: IItemCopy[] = [];
		for (const item of items) {
			copiedItems.push(this.getItemCopy(item.name));
		}
		return copiedItems;
	}

	/*
		Moves
	*/

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

		let gmaxPower = moveData.gmaxPower;
		if (moveData.category !== 'Status' && !gmaxPower) {
			if (!moveData.basePower) {
				gmaxPower = 100;
			} else if (['Fighting', 'Poison'].includes(moveData.type)) {
				if (moveData.basePower >= 150) {
					gmaxPower = 100;
				} else if (moveData.basePower >= 110) {
					gmaxPower = 95;
				} else if (moveData.basePower >= 75) {
					gmaxPower = 90;
				} else if (moveData.basePower >= 65) {
					gmaxPower = 85;
				} else if (moveData.basePower >= 55) {
					gmaxPower = 80;
				} else if (moveData.basePower >= 45) {
					gmaxPower = 75;
				} else  {
					gmaxPower = 70;
				}
			} else {
				if (moveData.basePower >= 150) {
					gmaxPower = 150;
				} else if (moveData.basePower >= 110) {
					gmaxPower = 140;
				} else if (moveData.basePower >= 75) {
					gmaxPower = 130;
				} else if (moveData.basePower >= 65) {
					gmaxPower = 120;
				} else if (moveData.basePower >= 55) {
					gmaxPower = 110;
				} else if (moveData.basePower >= 45) {
					gmaxPower = 100;
				} else  {
					gmaxPower = 90;
				}
			}
		}

		let zMovePower = moveData.zMovePower;
		if (moveData.category !== 'Status' && !zMovePower) {
			let basePower = moveData.basePower;
			if (Array.isArray(moveData.multihit)) basePower *= 3;

			if (!basePower) {
				zMovePower = 100;
			} else if (basePower >= 140) {
				zMovePower = 200;
			} else if (basePower >= 130) {
				zMovePower = 195;
			} else if (basePower >= 120) {
				zMovePower = 190;
			} else if (basePower >= 110) {
				zMovePower = 185;
			} else if (basePower >= 100) {
				zMovePower = 180;
			} else if (basePower >= 90) {
				zMovePower = 175;
			} else if (basePower >= 80) {
				zMovePower = 160;
			} else if (basePower >= 70) {
				zMovePower = 140;
			} else if (basePower >= 60) {
				zMovePower = 120;
			} else  {
				zMovePower = 100;
			}
		}

		let gen = 0;
		if (moveData.num >= 743) {
			gen = 8;
		} else if (moveData.num >= 622) {
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

		let isNonstandard = moveData.isNonstandard;
		if (gen > this.gen) isNonstandard = 'Future';

		const moveComputed: IMoveComputed = {
			baseMoveType: moveData.baseMoveType || moveData.type,
			effectType: "Move",
			gen,
			gmaxPower,
			ignoreImmunity: moveData.ignoreImmunity !== undefined ? moveData.ignoreImmunity : moveData.category === 'Status',
			isNonstandard: isNonstandard || null,
			zMovePower,
		};
		const move: IMove = Object.assign({}, moveData, moveComputed);
		this.moveCache.set(id, move);
		return move;
	}

	getExistingMove(name: string): IMove {
		const move = this.getMove(name);
		if (!move) throw new Error("No move returned for '" + name + "'");
		return move;
	}

	getMoveCopy(name: string): IMoveCopy {
		return Tools.deepClone(this.getExistingMove(name)) as IMoveCopy;
	}

	/** Returns a list of existing moves
	 *
	 * filterMove: Return `false` to filter `move` out of the list
	 */
	getMovesList(filter?: (move: IMove) => boolean): IMove[] {
		const moves: IMove[] = [];
		for (const i in this.data.moves) {
			const move = this.getExistingMove(i);
			if (move.isNonstandard === 'CAP' || move.isNonstandard === 'LGPE' || move.isNonstandard === 'Custom' || move.gen > this.gen || (filter && !filter(move))) continue;
			moves.push(move);
		}
		return moves;
	}

	/** Returns a list of existing, copied moves
	 *
	 * filterMove: Return `false` to filter `move` out of the list
	 */
	getMovesCopyList(filter?: (move: IMove) => boolean): IMoveCopy[] {
		const moves = this.getMovesList(filter);
		const copiedMoves: IMoveCopy[] = [];
		for (const move of moves) {
			copiedMoves.push(this.getMoveCopy(move.name));
		}
		return copiedMoves;
	}

	getMoveAvailability(move: IMove, pokedex?: IPokemon[]): number {
		if (!pokedex) pokedex = this.getPokemonList();
		const availability: string[] = [];
		for (const pokemon of pokedex) {
			if (this.getAllPossibleMoves(pokemon).includes(move.id) && !(pokemon.baseSpecies !== pokemon.name && availability.includes(pokemon.baseSpecies))) {
				availability.push(pokemon.name);
			}
		}

		return availability.length;
	}

	/*
		Pokemon
	*/

	getPokemon(name: string): IPokemon | null {
		let id = Tools.toId(name);
		if (!id) return null;
		if (id === 'nidoran') {
			if (name.endsWith('♀')) {
				id = 'nidoranf';
			} else if (name.endsWith('♂')) {
				id = 'nidoranm';
			}
		}
		if (this.data.aliases.hasOwnProperty(id)) id = Tools.toId(this.data.aliases[id]);
		if (!this.data.pokedex.hasOwnProperty(id)) {
			let formeId = '';
			for (const forme in formeNames) {
				let pokemonName = '';
				for (const formeName of formeNames[forme]) {
					if (id.startsWith(formeName)) {
						pokemonName = id.slice(formeName.length);
					} else if (id.endsWith(formeName)) {
						pokemonName = id.slice(0, -formeName.length);
					}
				}
				if (this.data.aliases.hasOwnProperty(pokemonName)) pokemonName = Tools.toId(this.data.aliases[pokemonName]);
				if (this.data.pokedex.hasOwnProperty(pokemonName + forme)) {
					formeId = pokemonName + forme;
					break;
				}
			}
			if (!formeId) return null;
			id = formeId;
		}

		const cached = this.pokemonCache.get(id);
		if (cached) return cached;
		const templateData = this.data.pokedex[id]!;
		const templateFormatsData = this.data.formatsData[id] || {};

		if (!templateData.eggGroups) templateData.eggGroups = [];
		if (!templateData.requiredItems && templateData.requiredItem) templateData.requiredItems = [templateData.requiredItem];
		const baseSpecies = templateData.baseSpecies || templateData.name;
		const isForme = baseSpecies !== templateData.name;

		const forme = templateData.forme || '';
		const isMega = ['Mega', 'Mega-X', 'Mega-Y'].includes(forme) ? true : false;
		const isGigantamax = templateData.isGigantamax;
		let battleOnly = templateData.battleOnly || (isMega || isGigantamax ? baseSpecies : undefined);
		let isPrimal = false;
		let gen = templateData.gen || 0;
		if (!gen && templateData.num >= 1) {
			if (templateData.num >= 810 || ['Galar', 'Galar-Zen'].includes(forme) || forme === 'Gmax') {
				gen = 8;
			} else if (templateData.num >= 722 || forme.startsWith('Alola') || forme === 'Starter') {
				gen = 7;
			} else if (forme === 'Primal') {
				gen = 6;
				isPrimal = true;
				battleOnly = baseSpecies;
			} else if (templateData.num >= 650 || isMega) {
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

		const evos = templateData.evos || [];
		const speciesId = Tools.toId(templateData.name);
		let tier: string | undefined;
		let doublesTier: string | undefined;
		let isNonstandard = templateFormatsData.isNonstandard;
		if (gen > this.gen) {
			tier = 'Illegal';
			doublesTier = 'Illegal';
			isNonstandard = 'Future';
		} else {
			tier = templateFormatsData.tier;
			doublesTier = templateFormatsData.doublesTier;
			if (!tier && !doublesTier && baseSpecies !== templateData.name) {
				let baseSpeciesId: string;
				if (templateData.baseSpecies === 'Mimikyu') {
					baseSpeciesId = Tools.toId(templateData.baseSpecies);
				} else if (speciesId.endsWith('totem')) {
					baseSpeciesId = speciesId.slice(0, -5);
				} else if (battleOnly) {
					baseSpeciesId = typeof battleOnly === 'string' ? Tools.toId(battleOnly) : Tools.toId(battleOnly[0]);
				} else {
					baseSpeciesId = Tools.toId(baseSpecies);
				}
				tier = this.data.formatsData[baseSpeciesId]!.tier;
				doublesTier = this.data.formatsData[baseSpeciesId]!.doublesTier;
			}
			if (!tier) {
				tier = 'Illegal';
			} else if (tier === 'New') {
				tier = defaultNewTier;
			} else if (tier === '(PU)') {
				tier = 'ZU';
			}
			if (!doublesTier) doublesTier = tier;

			if (this.currentMod === 'letsgo' && !isNonstandard && !((templateData.num <= 151 || ['Meltan', 'Melmetal'].includes(templateData.name)) &&
				['Alola', 'Mega', 'Mega-X', 'Mega-Y'].includes(forme))) {
				isNonstandard = 'Past';
			}
		}

		const pokemonComputed: IPokemonComputed = {
			baseForme: templateData.baseForme || '',
			baseSpecies,
			battleOnly,
			category: this.data.categories[speciesId] || '',
			effectType: "Pokemon",
			gen,
			genderRatio: templateData.genderRatio || (templateData.gender === 'M' ? {M: 1, F: 0} :
				templateData.gender === 'F' ? {M: 0, F: 1} :
				templateData.gender === 'N' ? {M: 0, F: 0} :
				{M: 0.5, F: 0.5}),
			evos,
			forme,
			id: speciesId,
			inheritsFrom: templateData.inheritsFrom || (isGigantamax ? Tools.toId(baseSpecies) : undefined),
			isForme,
			isMega,
			isNonstandard: isNonstandard || null,
			isPrimal,
			name: templateData.name,
			nfe: !!evos.length,
			requiredItems: templateData.requiredItems || (templateData.requiredItem ? [templateData.requiredItem] : undefined),
			shiny: false,
			speciesid: speciesId,
			spriteId: Tools.toId(baseSpecies) + (baseSpecies !== templateData.name ? '-' + Tools.toId(forme) : ''),
			tier,
		};
		const pokemon: IPokemon = Object.assign({}, templateData, templateFormatsData, pokemonComputed);
		this.pokemonCache.set(id, pokemon);
		return pokemon;
	}

	getAllPossibleMoves(pokemon: IPokemon): string[] {
		const cached = this.allPossibleMovesCache.get(pokemon.id);
		if (cached) return cached;

		const allPossibleMoves: string[] = [];
		let firstLearnsetParent = pokemon;
		const learnsetData = this.getLearnsetData(pokemon.id);
		if (learnsetData && learnsetData.learnset) {
			for (const i in this.data.learnsets[pokemon.id]!.learnset) {
				allPossibleMoves.push(i);
			}
		} else if (pokemon.baseSpecies !== pokemon.name) {
			const basePokemon = this.getExistingPokemon(pokemon.baseSpecies);
			firstLearnsetParent = basePokemon;
			const baseLearnsetData = this.getLearnsetData(basePokemon.id);
			if (baseLearnsetData && baseLearnsetData.learnset) {
				for (const i in baseLearnsetData.learnset) {
					allPossibleMoves.push(i);
				}
			}
		}

		const validator = this.getValidator("ou");
		let learnsetParent = validator.learnsetParent(firstLearnsetParent);
		while (learnsetParent) {
			const parentAllPossibleMoves = this.getAllPossibleMoves(learnsetParent);
			for (const move of parentAllPossibleMoves) {
				if (!allPossibleMoves.includes(move)) allPossibleMoves.push(move);
			}
			learnsetParent = validator.learnsetParent(learnsetParent);
		}

		this.allPossibleMovesCache.set(pokemon.id, allPossibleMoves);
		return allPossibleMoves;
	}

	getLearnsetData(id: string): ILearnsetData | null {
		if (!this.data.learnsets.hasOwnProperty(id)) return null;
		return this.data.learnsets[id]!;
	}

	getExistingPokemon(name: string): IPokemon {
		const pokemon = this.getPokemon(name);
		if (!pokemon) throw new Error("No pokemon returned for '" + name + "'");
		return pokemon;
	}

	getPokemonCopy(name: string): IPokemonCopy {
		return Tools.deepClone(this.getExistingPokemon(name)) as IPokemonCopy;
	}

	/** Returns a list of existing Pokemon
	 *
	 * filterPokemon: Return `false` to filter `pokemon` out of the list
	 */
	getPokemonList(filter?: (pokemon: IPokemon) => boolean): IPokemon[] {
		const pokedex: IPokemon[] = [];
		for (const i in this.data.pokedex) {
			const pokemon = this.getExistingPokemon(i);
			if (pokemon.isNonstandard === 'CAP' || pokemon.isNonstandard === 'LGPE' || pokemon.isNonstandard === 'Custom' || pokemon.gen > this.gen ||
				(filter && !filter(pokemon))) continue;
			pokedex.push(pokemon);
		}
		return pokedex;
	}

	/** Returns a list of existing, copied Pokemon
	 *
	 * filterPokemon: Return `false` to filter `pokemon` out of the list
	 */
	getPokemonCopyList(filter?: (pokemon: IPokemon) => boolean): IPokemonCopy[] {
		const pokedex = this.getPokemonList(filter);
		const copiedPokedex: IPokemonCopy[] = [];
		for (const pokemon of pokedex) {
			copiedPokedex.push(this.getPokemonCopy(pokemon.name));
		}
		return copiedPokedex;
	}

	getEvolutionLines(pokemon: IPokemon): string[][] {
		const allEvolutionLines = this.getAllEvolutionLines(pokemon);
		const evolutionLines: string[][] = [];
		for (const line of allEvolutionLines) {
			if (line.includes(pokemon.name)) evolutionLines.push(line);
		}
		return evolutionLines;
	}

	isEvolutionFamily(speciesList: string[]): boolean {
		if (speciesList.length < 2) return true;

		const evolutionLines: string[][][] = [];

		for (const species of speciesList) {
			const pokemon = this.getPokemon(species);
			if (!pokemon) return false;
			evolutionLines.push(this.getEvolutionLines(pokemon));
		}

		evolutionLines.sort((a, b) => a.length - b.length);

		for (let i = 0; i < evolutionLines.length - 1; i++) {
			let sharedEvolutionLine = false;
			const currentLine = evolutionLines[i];
			const nextLine = evolutionLines[i + 1];

			outer:
			for (const current of currentLine) {
				for (const next of nextLine) {
					if (Tools.compareArrays(current, next)) {
						sharedEvolutionLine = true;
						break outer;
					}
				}
			}

			if (!sharedEvolutionLine) return false;
		}

		return true;
	}

	/**
	 * Returns true if target is immune to source
	 */
	isImmune(source: IMove | string, target: IPokemon | string | readonly string[]): boolean {
		const sourceType = (typeof source === 'string' ? source : source.type);
		let targetType: string | readonly string[];
		if (typeof target === 'string') {
			const pokemon = this.getPokemon(target);
			if (pokemon) {
				targetType = pokemon.types;
			} else {
				targetType = target;
			}
		} else if (Array.isArray(target)) {
			targetType = target;
		} else {
			// @ts-ignore
			targetType = target.types;
		}
		if (Array.isArray(targetType)) {
			for (const type of targetType) {
				if (this.isImmune(sourceType, type)) return true;
			}
			return false;
		} else {
			targetType = targetType as string;
			const typeData = this.data.typeChart[targetType];
			if (typeData && typeData.damageTaken[sourceType] === 3) return true;
		}
		return false;
	}

	isPseudoLCPokemon(pokemon: IPokemon): boolean {
		// LC handling, checks for LC Pokemon in higher tiers that need to be handled separately,
		// as well as event-only Pokemon that are not eligible for LC despite being the first stage
		if (pokemon.tier === 'LC' || pokemon.prevo) return false;

		const lcFormat = this.getFormat('lc');
		if (lcFormat && (lcFormat.banlist.includes(pokemon.name) || lcFormat.banlist.includes(pokemon.name + "-Base"))) return false;

		let invalidEvent = true;
		const learnsetData = this.getLearnsetData(pokemon.id);
		if (learnsetData && learnsetData.eventData && learnsetData.eventOnly) {
			for (const event of learnsetData.eventData) {
				if (event.level && event.level <= 5)  {
					invalidEvent = false;
					break;
				}
			}
		}

		let nfe = false;
		if (!invalidEvent && pokemon.evos) {
			for (const evo of pokemon.evos) {
				const evolution = this.getPokemon(evo);
				if (evolution && evolution.gen <= this.gen) {
					nfe = true;
					break;
				}
			}
		}

		return !invalidEvent && nfe;
	}

	/**
	 * Returns >=1 if super-effective, <=1 if not very effective
	 */
	getEffectiveness(source: IMove | string, target: IPokemon | string | readonly string[]): number {
		const sourceType = (typeof source === 'string' ? source : source.type);
		let targetType;
		if (typeof target === 'string') {
			const pokemon = this.getPokemon(target);
			if (pokemon) {
				targetType = pokemon.types;
			} else {
				targetType = target;
			}
		} else if (Array.isArray(target)) {
			targetType = target;
		} else {
			// @ts-ignore
			targetType = target.types;
		}
		if (Array.isArray(targetType)) {
			let totalTypeMod = 0;
			for (const type of targetType) {
				totalTypeMod += this.getEffectiveness(sourceType, type);
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
		for (const type of types) {
			const isImmune = this.isImmune(type, pokemon);
			const effectiveness = this.getEffectiveness(type, pokemon);
			if (!isImmune && effectiveness >= 1) weaknesses.push(type);
		}
		return weaknesses;
	}

	hasGifData(pokemon: IPokemon, generation?: 'xy' | 'bw', direction?: 'front' | 'back'): boolean {
		if (!generation) generation = 'xy';
		if (!direction) direction = 'front';
		if (generation === 'bw') {
			if (this.data.gifDataBW.hasOwnProperty(pokemon.id) && this.data.gifDataBW[pokemon.id]![direction]) return true;
		} else {
			if (this.data.gifData.hasOwnProperty(pokemon.id) && this.data.gifData[pokemon.id]![direction]) return true;
		}
		return false;
	}

	getPokemonGif(pokemon: IPokemon, generation?: 'xy' | 'bw', direction?: 'front' | 'back', width?: number, height?: number): string {
		if (!generation) generation = 'xy';
		const bw = generation === 'bw';
		if (bw && pokemon.gen > 5) return '';
		let prefix = '//' + Tools.mainServer + '/sprites/' + generation + 'ani';
		if (!direction) direction = 'front';
		if (direction === 'front') {
			if (pokemon.shiny) {
				prefix += "-shiny";
			}
		} else {
			if (pokemon.shiny) {
				prefix += "-back-shiny";
			} else {
				prefix += "-back";
			}
		}
		let gif = '<img src="' + prefix + '/' + pokemon.spriteId + '.gif" ';
		if (!width || !height) {
			let gifData: IGifData | undefined;
			if (bw) {
				if (this.data.gifDataBW.hasOwnProperty(pokemon.id)) gifData = this.data.gifDataBW[pokemon.id]!;
			} else {
				if (this.data.gifData.hasOwnProperty(pokemon.id)) gifData = this.data.gifData[pokemon.id]!;
			}
			if (gifData && gifData[direction]) {
				if (!width) width = gifData[direction]!.w;
				if (!height) height = gifData[direction]!.h;
			} else if (bw) {
				if (!width) width = 96;
				if (!height) height = 96;
			}
		}
		gif += 'width="' + width + '" height="' + height + '" />';
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
		return '<span style="display: inline-block;width: 40px;height: 30px;image-rendering: pixelated;background:transparent url(https://' + Tools.mainServer +
			'/sprites/pokemonicons-sheet.png?g8) no-repeat scroll -' + left + 'px -' + top + 'px;' + facingLeftStyle + '"></span>';
	}

	getPSPokemonIcon(pokemon: IPokemon): string {
		return '<psicon pokemon="' + pokemon.id + '" style="vertical-align: -7px;margin: -2px" />';
	}

	/*
		Formats
	*/

	getFormat(name: string, isTrusted?: boolean): IFormat | null {
		let id = Tools.toId(name);
		if (!id) return null;
		const inputTarget = name;

		let supplementaryAttributes: {customRules?: string[]; searchShow?: boolean} = {};
		if (name.includes('@@@')) {
			if (!isTrusted) {
				try {
					name = this.validateFormat(name);
					isTrusted = true;
				// eslint-disable-next-line no-empty
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
			if (!isNaN(index) && index <= this.omotms.length) id = this.omotms[index - 1];
		}
		if (!this.data.formats.hasOwnProperty(id)) {
			for (let i = currentGen; i >= 1; i--) {
				const genId = 'gen' + i + id;
				if (this.data.formats.hasOwnProperty(genId)) return this.getFormat(genId, isTrusted);
				if (customRuleFormats.hasOwnProperty(id)) return this.getFormat(customRuleFormats[id], true);
				if (customRuleFormats.hasOwnProperty(genId)) return this.getFormat(customRuleFormats[genId], true);
			}
			return null;
		}

		const formatData = Tools.deepClone(this.data.formats[id]!);
		const maxLevel = formatData.maxLevel || 100;
		const formatComputed: IFormatComputed = {
			customRules: null,
			banlist: formatData.banlist || [],
			baseRuleset: formatData.baseRuleset || [],
			defaultLevel: formatData.defaultLevel || maxLevel,
			effectType: formatData.effectType || "Format",
			gameType: formatData.gameType || "singles",
			gen: formatData.mod ? this.mod(formatData.mod).gen : this.gen,
			id,
			inputTarget,
			maxLevel,
			mod: formatData.mod || currentGenString,
			num: 0,
			quickFormat: formatData.teamLength && formatData.teamLength.battle && formatData.teamLength.battle <= 2 ? true : false,
			ruleset: formatData.ruleset || [],
			ruleTable: null,
			separatedCustomRules: null,
			tournamentPlayable: !!(formatData.searchShow || formatData.challengeShow || formatData.tournamentShow),
			unbanlist: formatData.unbanlist || [],
			unranked: formatData.rated === false || id.includes('customgame') || id.includes('challengecup') || id.includes('hackmonscup') ||
				(formatData.team && (id.includes('1v1') || id.includes('monotype'))) || formatData.mod === 'seasonal' || formatData.mod === 'ssb',
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
				html += '<br>&nbsp; - Description and more info ' + (format.info.startsWith('https://www.smogon.com/dex/') ? 'on the  <a href="' + format.info + '">dex page' :
					'in the  <a href="' + format.info + '">discussion thread') + '</a>.';
			}
		}
		if (format.teams) html += '<br>&nbsp; - Need to borrow a team? Check out the <a href="' + format.teams + '">sample teams thread</a>.';
		if (format.viability) html += '<br>&nbsp; - See how viable each Pokemon is in the <a href="' + format.viability + '">viability rankings thread</a>.';
		if (format.roleCompendium) html += '<br>&nbsp; - Check the common role that each Pokemon plays in the <a href="' + format.roleCompendium + '">role compendium thread</a>.';
		return html;
	}

	/**
	 * Returns a sanitized format ID if valid, or throws if invalid.
	 */
	validateFormat(name: string): string {
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

	getRuleTable(format: IFormat, depth: number = 1, repeals?: Map<string, number>): RuleTable {
		if (format.ruleTable && !repeals) return format.ruleTable;
		if (depth === 1 && dexes[format.mod || 'base'] !== this) {
			return this.mod(format.mod).getRuleTable(format, depth + 1);
		}
		const ruleTable = new RuleTable();

		const ruleset = format.ruleset.slice();
		for (const ban of format.banlist) {
			ruleset.push('-' + ban);
		}
		for (const ban of format.unbanlist) {
			ruleset.push('+' + ban);
		}
		if (format.customRules) {
			ruleset.push(...format.customRules);
		}
		if (format.checkLearnset) {
			ruleTable.checkLearnset = [format.checkLearnset, format.name];
		}
		if (format.timer) {
			ruleTable.timer = [format.timer, format.name];
		}
		if (format.minSourceGen) {
			ruleTable.minSourceGen = [format.minSourceGen, format.name];
		}

		// apply rule repeals before other rules
		// repeals is a ruleid:depth map
		for (const rule of ruleset) {
			if (rule.startsWith('!')) {
				const ruleSpec = this.validateRule(rule, format) as string;
				if (!repeals) repeals = new Map();
				repeals.set(ruleSpec.slice(1), depth);
			}
		}

		for (const rule of ruleset) {
			const ruleSpec = this.validateRule(rule, format);

			if (typeof ruleSpec !== 'string') {
				if (ruleSpec[0] === 'complexTeamBan') {
					const complexTeamBan: ComplexTeamBan = ruleSpec.slice(1) as ComplexTeamBan;
					ruleTable.addComplexTeamBan(complexTeamBan[0], complexTeamBan[1], complexTeamBan[2], complexTeamBan[3]);
				} else if (ruleSpec[0] === 'complexBan') {
					const complexBan: ComplexBan = ruleSpec.slice(1) as ComplexBan;
					ruleTable.addComplexBan(complexBan[0], complexBan[1], complexBan[2], complexBan[3]);
				} else {
					throw new Error(`Unrecognized rule spec ${ruleSpec}`);
				}
				continue;
			}

			if (rule.startsWith('!')) {
				const repealDepth = repeals!.get(ruleSpec.slice(1));
				if (repealDepth === undefined) throw new Error(`Multiple "${rule}" rules in ${format.name}`);
				if (repealDepth === depth) throw new Error(`Rule "${rule}" did nothing because "${rule.slice(1)}" is not in effect`);
				if (repealDepth === -depth) repeals!.delete(ruleSpec.slice(1));
				continue;
			}

			if ("+-".includes(ruleSpec.charAt(0))) {
				if (ruleSpec.startsWith('+')) ruleTable.delete('-' + ruleSpec.slice(1));
				if (ruleSpec.startsWith('-')) ruleTable.delete('+' + ruleSpec.slice(1));
				if (ruleTable.has(ruleSpec)) {
					throw new Error(`Rule "${rule}" was added by "${format.name}" but already exists in "${ruleTable.get(ruleSpec) || format.name}"`);
				}
				ruleTable.set(ruleSpec, '');
				continue;
			}
			const subformat = this.getFormat(ruleSpec);
			const subformatId = subformat ? subformat.id : Tools.toId(ruleSpec);
			if (repeals && repeals.has(subformatId)) {
				repeals.set(subformatId, -Math.abs(repeals.get(subformatId)!));
				continue;
			}
			if (ruleTable.has(subformatId)) {
				throw new Error(`Rule "${rule}" was added by "${format.name}" but already exists in "${ruleTable.get(subformatId) || format.name}"`);
			}
			ruleTable.set(subformatId, '');
			if (!subformat) continue;
			if (depth > 16) {
				throw new Error(`Excessive ruleTable recursion in ${format.name}: ${ruleSpec} of ${format.ruleset}`);
			}
			const subRuleTable = this.getRuleTable(subformat, depth + 1, repeals);
			for (const [k, v] of subRuleTable) {
				// don't check for "already exists" here; multiple inheritance is allowed
				if (!repeals || !repeals.has(k)) {
					ruleTable.set(k, v || subformat.name);
				}
			}
			for (const [rule, source, limit, bans] of subRuleTable.complexBans) {
				ruleTable.addComplexBan(rule, source || subformat.name, limit, bans);
			}
			for (const [rule, source, limit, bans] of subRuleTable.complexTeamBans) {
				ruleTable.addComplexTeamBan(rule, source || subformat.name, limit, bans);
			}
			if (subRuleTable.checkLearnset) {
				if (ruleTable.checkLearnset) {
					throw new Error(
						`"${format.name}" has conflicting move validation rules from ` +
						`"${ruleTable.checkLearnset[1]}" and "${subRuleTable.checkLearnset[1]}"`);
				}
				ruleTable.checkLearnset = subRuleTable.checkLearnset;
			}
			if (subRuleTable.timer) {
				if (ruleTable.timer) {
					throw new Error(
						`"${format.name}" has conflicting timer validation rules from ` +
						`"${ruleTable.timer[1]}" and "${subRuleTable.timer[1]}"`);
				}
				ruleTable.timer = subRuleTable.timer;
			}
			// minSourceGen is automatically ignored if higher than current gen
			// this helps the common situation where Standard has a minSourceGen in the
			// latest gen but not in any past gens
			if (subRuleTable.minSourceGen && subRuleTable.minSourceGen[0] <= this.gen) {
				if (ruleTable.minSourceGen) {
					throw new Error(
						`"${format.name}" has conflicting minSourceGen from ` +
						`"${ruleTable.minSourceGen[1]}" and "${subRuleTable.minSourceGen[1]}"`);
				}
				ruleTable.minSourceGen = subRuleTable.minSourceGen;
			}
		}

		format.ruleTable = ruleTable;
		return ruleTable;
	}

	validateRule(rule: string, format: IFormat | null = null): string | ['complexTeamBan' | 'complexBan', string, string, number, string[]] {
		switch (rule.charAt(0)) {
		case '-':
		case '+':
			if (format && format.team) throw new Error(`We don't currently support bans in generated teams`);
			if (rule.slice(1).includes('>') || rule.slice(1).includes('+')) {
				let buf = rule.slice(1);
				const gtIndex = buf.lastIndexOf('>');
				let limit = rule.startsWith('+') ? Infinity : 0;
				if (gtIndex >= 0 && /^[0-9]+$/.test(buf.slice(gtIndex + 1).trim())) {
					if (limit === 0) limit = parseInt(buf.slice(gtIndex + 1), 10);
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
		default: {
			const id = Tools.toId(rule);
			if (!this.data.formats.hasOwnProperty(id)) {
				throw new Error(`Unrecognized rule "${rule}"`);
			}
			if (rule.startsWith('!')) return `!${id}`;
			return id;
		}
		}
	}

	validateBanRule(rule: string): string {
		let id = Tools.toId(rule);
		if (id === 'unreleased') return 'unreleased';
		if (id === 'nonexistent') return 'nonexistent';
		const matches = [];
		let matchTypes = ['pokemon', 'move', 'ability', 'item', 'pokemontag'];
		for (const matchType of matchTypes) {
			if (rule.startsWith(matchType + ':')) {
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
			case 'pokemontag': {
				// valid pokemontags
				const validTags = [
					// singles tiers
					'uber', 'ou', 'uubl', 'uu', 'rubl', 'ru', 'nubl', 'nu', 'publ', 'pu', 'zu', 'nfe', 'lcuber', 'lc', 'cap', 'caplc', 'capnfe', 'ag',
					// doubles tiers
					'duber', 'dou', 'dbl', 'duu', 'dnu',
					// custom tags
					'mega',
					// illegal/nonstandard reasons
					'past', 'future', 'unobtainable', 'lgpe', 'custom',
					// all
					'allpokemon', 'allitems', 'allmoves', 'allabilities',
				];
				if (validTags.includes(ruleid)) matches.push('pokemontag:' + ruleid);
				continue;
			}
			default:
				throw new Error(`Unrecognized match type.`);
			}
			if (table.hasOwnProperty(id)) {
				if (matchType === 'pokemon') {
					const template: IPokemon = (table[id] as unknown) as IPokemon;
					if (template.otherFormes && ruleid !== template.id + Tools.toId(template.baseForme)) {
						matches.push('basepokemon:' + id);
						continue;
					}
				}
				matches.push(matchType + ':' + id);
			} else if (matchType === 'pokemon' && id.endsWith('base')) {
				id = id.slice(0, -4);
				if (table.hasOwnProperty(id)) {
					matches.push('pokemon:' + id);
				}
			}
		}
		if (matches.length > 1) {
			throw new Error(`More than one thing matches "${rule}"; please specify one of: ` + matches.join(', '));
		}
		if (matches.length < 1) {
			throw new Error(`Nothing matches "${rule}"`);
		}
		return matches[0];
	}

	getValidatedRuleName(rule: string): string {
		if (rule === 'unreleased') return 'Unreleased';
		if (rule === 'illegal') return 'Illegal';
		if (rule === 'nonexistent') return 'Non-existent';
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
			ruleName = this.getExistingPokemon(ruleName).name;
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
		for (const ban of separatedCustomRules.bans) {
			customRules.push('-' + ban);
		}
		for (const unban of separatedCustomRules.unbans) {
			customRules.push('+' + unban);
		}
		for (const addedRule of separatedCustomRules.addedrules) {
			customRules.push(addedRule);
		}
		for (const removedRule of separatedCustomRules.removedrules) {
			customRules.push('!' + removedRule);
		}

		return customRules;
	}

	separateCustomRules(customRules: string[]): ISeparatedCustomRules {
		const bans: string[] = [];
		const unbans: string[] = [];
		const addedrules: string[] = [];
		const removedrules: string[] = [];
		for (const ruleString of customRules) {
			const rule = this.validateRule(ruleString);
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
				const complexBans = rule[4].map(x => this.getValidatedRuleName(x));
				if (rule[0] === 'complexTeamBan') {
					bans.push(complexBans.join(' ++ '));
				} else {
					bans.push(complexBans.join(' + '));
				}
			}
		}

		return {bans, unbans, addedrules, removedrules};
	}

	getCustomFormatName(format: IFormat, room?: Room, showAll?: boolean): string {
		if (!format.customRules || !format.customRules.length) return format.name;
		if (!format.separatedCustomRules) format.separatedCustomRules = this.separateCustomRules(format.customRules);
		const defaultCustomRules: Partial<ISeparatedCustomRules> = room && room.id in Tournaments.defaultCustomRules ? Tournaments.defaultCustomRules[room.id] : {};
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
				for (const addedRule of format.separatedCustomRules.addedrules) {
					let rule = addedRule;
					const subFormat = this.getFormat(rule);
					if (subFormat && subFormat.effectType === 'Format' && subFormat.name.startsWith('[Gen')) {
						rule = subFormat.name.substr(subFormat.name.indexOf(']') + 2);
					} else if (rule in clauseNicknames) {
						rule = clauseNicknames[rule];
					}
					prefixesAdded.push(rule);
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

	getValidator(formatid?: string | IFormat): TeamValidator {
		let format;
		if (formatid) {
			format = typeof formatid === 'string' ? this.getExistingFormat(formatid) : formatid;
		} else {
			format = this.getExistingFormat('gen' + this.gen + 'ou');
		}
		return TeamValidator.get(format);
	}

	/*
		pokemon-showdown compatibility
	*/

	forFormat(formatid: string | IFormat): Dex {
		const format = typeof formatid === 'string' ? this.getExistingFormat(formatid) : formatid;
		dexes['base'].loadData();
		const dex = dexes[format.mod || 'base'];
		if (dex !== dexes['base']) dex.loadData();
		return dex;
	}

	mod(mod: string | undefined): Dex {
		if (!dexes['base'].loadedMods) dexes['base'].includeMods();
		return dexes[mod || 'base'];
	}

	getSpecies(name: string | IPokemon): IPokemon | null {
		return this.getPokemon(typeof name === 'string' ? name : name.name);
	}

	private getAllEvolutionLines(pokemon: IPokemon, prevoList?: string[], evolutionLines?: string[][]): string[][] {
		if (!prevoList || !evolutionLines) {
			let firstStage = pokemon;
			while (firstStage.prevo) {
				firstStage = this.getExistingPokemon(firstStage.prevo);
			}
			return this.getAllEvolutionLines(firstStage, [], []);
		}

		prevoList = prevoList.slice();
		prevoList.push(pokemon.name);
		if (!pokemon.evos.length) {
			evolutionLines.push(prevoList);
		} else {
			for (const evo of pokemon.evos) {
				this.getAllEvolutionLines(this.getExistingPokemon(evo), prevoList, evolutionLines);
			}
		}
		return evolutionLines;
	}
}

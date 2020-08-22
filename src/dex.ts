import path = require('path');

import type { Room } from './rooms';
import type {
	ComplexBan, ComplexTeamBan, IAbility, IAbilityCopy, IDataTable, IDexWorkers, IFormat, IFormatLinks, IGifData, IItem, IItemCopy,
	ILearnsetData, IMove, IMoveCopy, INature, IPokemon, IPokemonCopy, ISeparatedCustomRules, ITypeData
} from './types/dex';
import { PokemonShowdownWorker } from './workers/pokemon-showdown';

const currentGen = 8;
const currentGenString = 'gen' + currentGen;
const omotmSection = 'OM of the Month';

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

const gen2Items: string[] = ['berserkgene', 'berry', 'bitterberry', 'burntberry', 'goldberry', 'iceberry', 'mintberry', 'miracleberry',
	'mysteryberry', 'pinkbow', 'polkadotbow', 'przcureberry', 'psncureberry'];

const customRuleFormats: Dict<string> = {
	uubl: 'UU@@@+UUBL',
	rubl: 'RU@@@+RUBL',
	nubl: 'NU@@@+NUBL',
	publ: 'PU@@@+PUBL',
};

const customRuleAliases: Dict<string[]> = {
	uu: ['-All pokemon', '+LC', '+LC Uber', '+NFE', '+ZU', '+PU', '+PUBL', '+NU', '+NUBL', '+RU', '+RUBL', '+UU'],
	ru: ['-All pokemon', '+LC', '+LC Uber', '+NFE', '+ZU', '+PU', '+PUBL', '+NU', '+NUBL', '+RU'],
	nu: ['-All pokemon', '+LC', '+LC Uber', '+NFE', '+ZU', '+PU', '+PUBL', '+NU'],
	pu: ['-All pokemon', '+LC', '+LC Uber', '+NFE', '+ZU', '+PU'],
	cap: ['+CAP', '+CAP NFE', '+CAP LC'],
	monotype: ['Same Type Clause'],
	aaa: ['!Obtainable Abilities', '-Wonder Guard', '-Shadow Tag'],
	stabmons: ['STABmons Move Legality'],
	camomons: ['[Gen 8] Camomons'],
	inverse: ['Inverse Mod'],
	'350cup': ['350 Cup Mod'],
	flipped: ['Flipped Mod'],
	scalemons: ['Scalemons Mod'],
};

const dexes: Dict<Dex> = {};

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
	checkLearnset: [boolean, string] | null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	timer: [Partial<any>, string] | null;
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

	isBannedPokemon(pokemon: IPokemon): boolean {
		if (this.has(`+pokemon:${pokemon.id}`)) return false;
		if (this.has(`-pokemon:${pokemon.id}`)) return true;
		if (this.has(`+basepokemon:${Tools.toId(pokemon.baseSpecies)}`)) return false;
		if (this.has(`-basepokemon:${Tools.toId(pokemon.baseSpecies)}`)) return true;
		const tier = pokemon.tier === '(PU)' ? 'ZU' : pokemon.tier === '(NU)' ? 'PU' : pokemon.tier;
		if (this.has(`+pokemontag:${Tools.toId(tier)}`)) return false;
		if (this.has(`-pokemontag:${Tools.toId(tier)}`)) return true;
		const doublesTier = pokemon.doublesTier === '(DUU)' ? 'DNU' : pokemon.doublesTier;
		if (this.has(`+pokemontag:${Tools.toId(doublesTier)}`)) return false;
		if (this.has(`-pokemontag:${Tools.toId(doublesTier)}`)) return true;
		return this.has(`-pokemontag:allpokemon`);
	}

	isRestricted(thing: string): boolean {
		if (this.has(`+${thing}`)) return false;
		return this.has(`*${thing}`);
	}

	isRestrictedPokemon(pokemon: IPokemon): boolean {
		if (this.has(`+pokemon:${pokemon.id}`)) return false;
		if (this.has(`*pokemon:${pokemon.id}`)) return true;
		if (this.has(`+basepokemon:${Tools.toId(pokemon.baseSpecies)}`)) return false;
		if (this.has(`*basepokemon:${Tools.toId(pokemon.baseSpecies)}`)) return true;
		const tier = pokemon.tier === '(PU)' ? 'ZU' : pokemon.tier === '(NU)' ? 'PU' : pokemon.tier;
		if (this.has(`+pokemontag:${Tools.toId(tier)}`)) return false;
		if (this.has(`*pokemontag:${Tools.toId(tier)}`)) return true;
		const doublesTier = pokemon.doublesTier === '(DUU)' ? 'DNU' : pokemon.doublesTier;
		if (this.has(`+pokemontag:${Tools.toId(doublesTier)}`)) return false;
		if (this.has(`*pokemontag:${Tools.toId(doublesTier)}`)) return true;
		return this.has(`*pokemontag:allpokemon`);
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
	dexes: Dict<Dex> = dexes;
	readonly omotms: string[] = [];
	readonly tagNames: typeof tagNames = tagNames;

	readonly abilityCache = new Map<string, IAbility>();
	readonly allPossibleMovesCache = new Map<string, string[]>();
	readonly formatCache = new Map<string, IFormat>();
	readonly itemCache = new Map<string, IItem>();
	readonly learnsetDataCache = new Map<string, ILearnsetData>();
	loadedData: boolean = false;
	readonly moveCache = new Map<string, IMove>();
	readonly pokemonCache = new Map<string, IPokemon>();
	readonly typeCache = new Map<string, ITypeData>();

	readonly currentMod: string;
	readonly data: IDataTable;
	readonly gen: number;
	readonly isBase: boolean;
	workers: IDexWorkers;

	constructor(gen?: number, mod?: string) {
		if (!gen) gen = currentGen;
		if (!mod) mod = 'base';
		const isBase = mod === 'base';
		if (isBase) {
			dexes['base'] = this;
			dexes[currentGenString] = this;
		}
		this.currentMod = mod;
		this.gen = gen;
		this.isBase = isBase;
		this.data = {
			abilityKeys: [],
			aliases: {},
			alternateIconNumbers: {
				left: {},
				right: {},
			},
			badges: [],
			categories: {},
			characters: [],
			colors: {},
			eggGroups: {},
			formatKeys: [],
			gifData: {},
			gifDataBW: {},
			itemKeys: [],
			learnsetDataKeys: [],
			locations: [],
			moveKeys: [],
			natures,
			pokemonKeys: [],
			trainerClasses: [],
			typeKeys: [],
		};
		this.workers = {
			pokemonShowdown: isBase ? new PokemonShowdownWorker() : dexes['base'].workers.pokemonShowdown,
		};
	}

	async onReload(previous: Partial<Dex>): Promise<void> {
		await this.loadAllData();

		for (const mod in previous.dexes) {
			if (previous.dexes[mod] === previous) continue;
			const dex = previous.dexes[mod];
			for (const i in dex) {
				// @ts-expect-error
				delete dex[i];
			}
		}

		for (const i in previous) {
			// @ts-expect-error
			delete previous[i];
		}
	}

	unrefWorkers(): void {
		const workers = Object.keys(this.workers) as (keyof IDexWorkers)[];
		for (const worker of workers) {
			this.workers[worker].unref();
			// @ts-expect-error
			delete this.workers[worker];
		}
	}

	getDex(mod?: string): Dex {
		if (!mod) mod = currentGenString;
		return dexes[mod];
	}

	async loadAllData(): Promise<void> {
		if (this.loadedData || !this.isBase) return;
		console.log("Loading dex data...");

		const lanetteDataDir = path.join(Tools.rootFolder, 'data');

		/* eslint-disable @typescript-eslint/no-var-requires */
		// @ts-expect-error
		this.data.alternateIconNumbers = require(path.join(lanetteDataDir, 'alternate-icon-numbers.js')) as
			{right: Dict<number>; left: Dict<number>};
		// @ts-expect-error
		this.data.badges = require(path.join(lanetteDataDir, 'badges.js')) as string[];
		// @ts-expect-error
		this.data.categories = require(path.join(lanetteDataDir, 'categories.js')) as Dict<string>;
		// @ts-expect-error
		this.data.characters = require(path.join(lanetteDataDir, 'characters.js')) as string[];
		// @ts-expect-error
		this.data.locations = require(path.join(lanetteDataDir, 'locations.js')) as string[];
		// @ts-expect-error
		this.data.gifData = require(path.join(lanetteDataDir, 'pokedex-mini.js')).BattlePokemonSprites as Dict<IGifData | undefined>; // eslint-disable-line @typescript-eslint/no-unsafe-member-access
		// @ts-expect-error
		this.data.gifDataBW = require(path.join(lanetteDataDir, 'pokedex-mini-bw.js')).BattlePokemonSpritesBW as Dict<IGifData | undefined>; // eslint-disable-line @typescript-eslint/no-unsafe-member-access
		// @ts-expect-error
		this.data.trainerClasses = require(path.join(lanetteDataDir, 'trainer-classes.js')) as string[];
		/* eslint-enable */

		const speciesList = Object.keys(this.data.categories);
		for (const species of speciesList) {
			const id = Tools.toId(species);
			if (id === species) continue;
			// @ts-expect-error
			this.data.categories[id] = this.data.categories[species];
			// @ts-expect-error
			delete this.data.categories[species];
		}

		// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
		const promises: Promise<void[]>[] = [this.loadData()];
		for (let i = this.gen - 1; i >= 1; i--) {
			const mod = 'gen' + i;
			dexes[mod] = new Dex(i, mod);

			// @ts-expect-error
			dexes[mod].data.alternateIconNumbers = this.data.alternateIconNumbers;
			// @ts-expect-error
			dexes[mod].data.badges = this.data.badges;
			// @ts-expect-error
			dexes[mod].data.categories = this.data.categories;
			// @ts-expect-error
			dexes[mod].data.characters = this.data.characters;
			// @ts-expect-error
			dexes[mod].data.locations = this.data.locations;
			// @ts-expect-error
			dexes[mod].data.gifData = this.data.gifData;
			// @ts-expect-error
			dexes[mod].data.gifDataBW = this.data.gifDataBW;
			// @ts-expect-error
			dexes[mod].data.trainerClasses = this.data.trainerClasses;

			promises.push(dexes[mod].loadData());
		}

		await Promise.all(promises);

		for (let i = this.gen - 1; i >= 1; i--) {
			const mod = 'gen' + i;
			// @ts-expect-error
			dexes[mod].data.aliases = this.data.aliases;
			// @ts-expect-error
			dexes[mod].formatCache = new Map(this.formatCache);
			// @ts-expect-error
			dexes[mod].data.formatKeys = this.data.formatKeys.slice();

			const workers = Object.keys(dexes[mod].workers) as (keyof IDexWorkers)[];
			for (const worker of workers) {
				// @ts-expect-error
				delete dexes[mod].workers[worker];
			}
		}

		// @ts-expect-error
		dexes['gen1'].abilityCache = new Map(dexes['gen2'].abilityCache);
		// @ts-expect-error
		dexes['gen1'].data.abilityKeys = dexes['gen2'].data.abilityKeys.slice();

		console.log("Loaded all dex data");

		this.unrefWorkers();
	}

	// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
	async loadData(): Promise<void[]> {
		if (this.loadedData) return Promise.resolve([]);
		this.loadedData = true;

		const mod = 'gen' + this.gen;

		const loadPromises: Promise<void>[] = [];

		// aliases
		if (this.isBase) {
			loadPromises.push(this.workers.pokemonShowdown.getAliases(mod).then(response => {
				if (response === null) throw new Error("An error occurred while getting aliases");
				// @ts-expect-error
				this.data.aliases = JSON.parse(response.data) as Dict<string>;
			}));
		}

		// abilities
		if (this.gen > 1) {
			loadPromises.push(this.workers.pokemonShowdown.getAbilities(mod).then(response => {
				if (response === null) throw new Error("An error occurred while getting abilities");
				for (const ability of response.abilities) {
					if (ability.id) {
						this.abilityCache.set(ability.id, ability);
						(this.data.abilityKeys as string[]).push(ability.id);
					}
				}

				for (const key in response.aliases) {
					const id = Tools.toId(key);
					if (!id) continue;
					const ability = this.abilityCache.get(response.aliases[key]);
					if (ability) this.abilityCache.set(id, ability);
				}
			}));
		}

		// formats
		if (this.isBase) {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const formatLinks = require(path.join(Tools.rootFolder, 'data', 'format-links.js')) as Dict<IFormatLinks | undefined>;

			const links: ('info' | 'np' | 'roleCompendium' | 'teams' | 'viability')[] = ['info', 'np', 'roleCompendium', 'teams',
					'viability'];
			loadPromises.push(this.workers.pokemonShowdown.getFormats(mod).then(response => {
				if (response === null) throw new Error("An error occurred while getting formats");
				for (let format of response.formats) {
					let viability: string | undefined;
					let np: string | undefined;
					let info: string | undefined;
					if (format.threads) {
						const threads = format.threads.slice();
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
								} else if (text.startsWith("np:") || text.includes(format.name + " Stage")) {
									const link = line.split('<a href="');
									if (link[1]) {
										np = link[1].split('/">')[0].split('/').pop()!;
									}
								} else if (Tools.toId(text) === format.id) {
									const link = line.split('<a href="');
									if (link[1]) {
										info = link[1].split('/">')[0].split('/').pop()!;
									}
								}
							}
						}

						if (format.id in formatLinks) {
							format = Object.assign(formatLinks[format.id], format, {
								'info-official': info,
								'np-official': np,
								'viability-official': viability,
							});
						} else {
							format.info = info;
							format.np = np;
							format.viability = viability;
						}

						for (const id of links) {
							const link = format[id];
							if (!link) continue;
							let num = parseInt(link.split("/")[0]);
							if (isNaN(num)) continue;
							// @ts-expect-error
							if (format[id + '-official']) {
								// @ts-expect-error
								const officialNum = parseInt(format[id + '-official']);
								if (!isNaN(officialNum) && officialNum > num) num = officialNum;
							}
							format[id] = 'http://www.smogon.com/forums/threads/' + num;
						}
					}

					format.quickFormat = format.teamLength && format.teamLength.battle && format.teamLength.battle <= 2 ? true : false;
					format.tournamentPlayable = !!(format.searchShow || format.challengeShow || format.tournamentShow);
					format.unranked = format.rated === false || format.id.includes('customgame') || format.id.includes('hackmonscup') ||
						format.id.includes('challengecup') || format.id.includes('metronomebattle') ||
						(format.team && (format.id.includes('1v1') || format.id.includes('monotype'))) || format.mod === 'seasonal' ||
						format.mod === 'ssb' ? true : false;

					if (format.section === omotmSection) this.omotms.push(format.id);

					if (format.id) {
						this.formatCache.set(format.id, format);
						(this.data.formatKeys as string[]).push(format.id);
					}

					if (format.aliases) {
						for (const alias of format.aliases) {
							const id = Tools.toId(alias);
							if (id) this.formatCache.set(id, format);
						}
					}
				}

				for (const key in response.aliases) {
					const id = Tools.toId(key);
					if (!id) continue;
					const format = this.formatCache.get(response.aliases[key]);
					if (format) this.formatCache.set(id, format);
				}
			}));
		}

		// items
		loadPromises.push(this.workers.pokemonShowdown.getItems(mod).then(response => {
			if (response === null) throw new Error("An error occurred while getting items");
			for (const item of response.items) {
				if (item.id) {
					this.itemCache.set(item.id, item);
					(this.data.itemKeys as string[]).push(item.id);
				}
			}

			for (const key in response.aliases) {
				const id = Tools.toId(key);
				if (!id) continue;
				const item = this.itemCache.get(response.aliases[key]);
				if (item) this.itemCache.set(id, item);
			}
		}));

		// learnsets
		loadPromises.push(this.workers.pokemonShowdown.getLearnsetData(mod).then(learnsetData => {
			if (learnsetData === null) throw new Error("An error occurred while getting learnset data");
			for (const key in learnsetData) {
				const id = Tools.toId(key);
				if (!id) continue;
				this.learnsetDataCache.set(id, learnsetData[key]);
				(this.data.learnsetDataKeys as string[]).push(id);
			}
		}));

		// moves
		loadPromises.push(this.workers.pokemonShowdown.getMoves(mod).then(response => {
			if (response === null) throw new Error("An error occurred while getting moves");
			for (const move of response.moves) {
				const id = move.realMove ? Tools.toId(move.name) : move.id;
				if (id) {
					this.moveCache.set(id, move);
					(this.data.moveKeys as string[]).push(id);
				}
			}

			for (const key in response.aliases) {
				const id = Tools.toId(key);
				if (!id) continue;
				const move = this.moveCache.get(response.aliases[key]);
				if (move) this.moveCache.set(id, move);
			}
		}));

		// pokemon
		const formeNames: Dict<string[]> = {
			alola: ['a', 'alola', 'alolan'],
			galar: ['g', 'galar', 'galarian'],
			gmax: ['gigantamax', 'gmax'],
			mega: ['m', 'mega'],
			primal: ['p', 'primal'],
		};

		loadPromises.push(this.workers.pokemonShowdown.getSpecies(mod).then(response => {
			if (response === null) throw new Error("An error occurred while getting pokemon");
			for (const pokemon of response.pokemon) {
				if (!pokemon.id) continue;

				if (pokemon.color) {
					const id = Tools.toId(pokemon.color);
					if (!(id in this.data.colors)) {
						// @ts-expect-error
						this.data.colors[id] = pokemon.color;
					}
				}

				if (pokemon.tier) {
					const id = Tools.toId(pokemon.tier);
					if (!(id in tagNames)) tagNames[id] = pokemon.tier;
				}

				if (pokemon.eggGroups) {
					for (const eggGroup of pokemon.eggGroups) {
						const id = Tools.toId(eggGroup);
						if (!(id in this.data.eggGroups)) {
							// @ts-expect-error
							this.data.eggGroups[id] = eggGroup;
						}
					}
				}

				if (pokemon.id in this.data.categories) {
					// @ts-expect-error
					pokemon.category = this.data.categories[pokemon.id];
				}

				this.pokemonCache.set(pokemon.id, pokemon);
				(this.data.pokemonKeys as string[]).push(pokemon.id);

				const formeId = Tools.toId(pokemon.forme);
				if (formeId && formeId in formeNames) {
					for (const alias of formeNames[formeId]) {
						this.pokemonCache.set(pokemon.id + alias, pokemon);
						this.pokemonCache.set(alias + pokemon.id, pokemon);
					}
				}
			}

			for (const key in response.aliases) {
				const id = Tools.toId(key);
				if (!id) continue;
				const pokemon = this.pokemonCache.get(response.aliases[key]);
				if (pokemon) this.pokemonCache.set(id, pokemon);
			}
		}));

		// all possible moves
		loadPromises.push(this.workers.pokemonShowdown.getAllPossibleMoves(mod).then(allPossibleMoves => {
			if (allPossibleMoves === null) throw new Error("An error occurred while getting all possible moves");
			for (const id in allPossibleMoves) {
				this.allPossibleMovesCache.set(id, allPossibleMoves[id]);
			}
		}));

		// types
		loadPromises.push(this.workers.pokemonShowdown.getTypes(mod).then(types => {
			if (types === null) throw new Error("An error occurred while getting types");
			for (const type of types) {
				if (type.id) {
					this.typeCache.set(type.id, type);
					(this.data.typeKeys as string[]).push(type.id);
				}
			}
		}));

		return Promise.all(loadPromises);
	}

	async fetchClientData(): Promise<void> {
		const files = ['pokedex-mini.js', 'pokedex-mini-bw.js'];
		for (const fileName of files) {
			const file = await Tools.fetchUrl('https://' + Tools.mainServer + '/data/' + fileName);
			if (typeof file !== 'string') {
				console.log(file);
			} else if (file) {
				await Tools.safeWriteFile(path.join(Tools.rootFolder, 'data', fileName), file);
			}
		}
	}

	/*
		Abilities
	*/

	getAbility(name: string): IAbility | undefined {
		return this.abilityCache.get(Tools.toId(name));
	}

	getExistingAbility(name: string): IAbility {
		const ability = this.getAbility(name);
		if (!ability) throw new Error("No ability returned for '" + name + "'");
		return ability;
	}

	getAbilityCopy(name: string | IAbility): IAbilityCopy {
		return Tools.deepClone(typeof name === 'string' ? this.getExistingAbility(name) : name);
	}

	/** Returns a list of existing abilities
	 *
	 * filterAbility: Return `false` to filter `ability` out of the list
	 */
	getAbilitiesList(filter?: (ability: IAbility) => boolean): IAbility[] {
		const abilities: IAbility[] = [];
		for (const i of this.data.abilityKeys) {
			const ability = this.getExistingAbility(i);
			if (ability.isNonstandard === 'CAP' || ability.isNonstandard === 'LGPE' || ability.isNonstandard === 'Custom' ||
				ability.id === 'noability' || ability.gen > this.gen || (filter && !filter(ability))) continue;
			abilities.push(ability);
		}
		return abilities;
	}

	/** Returns a list of existing, copied abilities
	 *
	 * filterMove: Return `false` to filter `ability` out of the list
	 */
	getAbilitiesCopyList(filter?: (ability: IAbility) => boolean): IAbilityCopy[] {
		return this.getAbilitiesList(filter).map(x => this.getAbilityCopy(x));
	}

	/*
		Items
	*/

	getItem(name: string): IItem | undefined {
		return this.itemCache.get(Tools.toId(name));
	}

	getExistingItem(name: string): IItem {
		const item = this.getItem(name);
		if (!item) throw new Error("No item returned for '" + name + "'");
		return item;
	}

	getItemCopy(name: string | IItem): IItemCopy {
		return Tools.deepClone(typeof name === 'string' ? this.getExistingItem(name) : name);
	}

	/** Returns a list of existing items
	 *
	 * filterItem: Return `false` to filter `item` out of the list
	 */
	getItemsList(filter?: (item: IItem) => boolean): IItem[] {
		const items: IItem[] = [];
		for (const i of this.data.itemKeys) {
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
		return this.getItemsList(filter).map(x => this.getItemCopy(x));
	}

	getLearnsetData(name: string): ILearnsetData | undefined {
		return this.learnsetDataCache.get(Tools.toId(name));
	}

	/*
		Moves
	*/

	getMove(name: string): IMove | undefined {
		return this.moveCache.get(Tools.toId(name));
	}

	getExistingMove(name: string): IMove {
		const move = this.getMove(name);
		if (!move) throw new Error("No move returned for '" + name + "'");
		return move;
	}

	getMoveCopy(name: string | IMove): IMoveCopy {
		return Tools.deepClone(typeof name === 'string' ? this.getExistingMove(name) : name) as IMoveCopy;
	}

	/** Returns a list of existing moves
	 *
	 * filterMove: Return `false` to filter `move` out of the list
	 */
	getMovesList(filter?: (move: IMove) => boolean): IMove[] {
		const moves: IMove[] = [];
		for (const i of this.data.moveKeys) {
			const move = this.getExistingMove(i);
			if (move.isNonstandard === 'CAP' || move.isNonstandard === 'LGPE' || move.isNonstandard === 'Custom' || move.gen > this.gen ||
				(filter && !filter(move))) continue;
			moves.push(move);
		}
		return moves;
	}

	/** Returns a list of existing, copied moves
	 *
	 * filterMove: Return `false` to filter `move` out of the list
	 */
	getMovesCopyList(filter?: (move: IMove) => boolean): IMoveCopy[] {
		return this.getMovesList(filter).map(x => this.getMoveCopy(x));
	}

	getMoveAvailability(move: IMove, pokedex?: IPokemon[]): number {
		if (!pokedex) pokedex = this.getPokemonList();

		let availability = 0;
		for (const pokemon of pokedex) {
			const learnsetData = this.getLearnsetData(pokemon.name);
			if (learnsetData && this.getAllPossibleMoves(pokemon).includes(move.id)) {
				availability++;
			}
		}

		return availability;
	}

	/*
		Pokemon
	*/

	getPokemon(name: string): IPokemon | undefined {
		let id = Tools.toId(name);
		if (id === 'nidoran') {
			if (name.endsWith('♀')) {
				id = 'nidoranf';
			} else if (name.endsWith('♂')) {
				id = 'nidoranm';
			}
		}

		return this.pokemonCache.get(id);
	}

	getAllPossibleMoves(pokemon: IPokemon): string[] {
		return this.allPossibleMovesCache.get(pokemon.id) || [];
	}

	getExistingPokemon(name: string): IPokemon {
		const pokemon = this.getPokemon(name);
		if (!pokemon) throw new Error("No Pokemon returned for '" + name + "'");
		return pokemon;
	}

	getPokemonCopy(name: string | IPokemon): IPokemonCopy {
		return Tools.deepClone(typeof name === 'string' ? this.getExistingPokemon(name) : name) as IPokemonCopy;
	}

	/** Returns a list of existing Pokemon
	 *
	 * filterPokemon: Return `false` to filter `pokemon` out of the list
	 */
	getPokemonList(filter?: (pokemon: IPokemon) => boolean): IPokemon[] {
		const pokedex: IPokemon[] = [];
		for (const i of this.data.pokemonKeys) {
			const pokemon = this.getExistingPokemon(i);
			if (pokemon.isNonstandard === 'CAP' || pokemon.isNonstandard === 'LGPE' || pokemon.isNonstandard === 'Custom' ||
				pokemon.gen > this.gen || (filter && !filter(pokemon))) continue;
			pokedex.push(pokemon);
		}
		return pokedex;
	}

	/** Returns a list of existing, copied Pokemon
	 *
	 * filterPokemon: Return `false` to filter `pokemon` out of the list
	 */
	getPokemonCopyList(filter?: (pokemon: IPokemon) => boolean): IPokemonCopy[] {
		return this.getPokemonList(filter).map(x => this.getPokemonCopy(x));
	}

	getEvolutionLines(pokemon: IPokemon, includedFormes?: string[]): string[][] {
		const potentialEvolutionLines: string[][] = this.getAllEvolutionLines(pokemon);
		const formesToCheck: string[] = [pokemon.name];
		if (includedFormes) {
			for (const includedForme of includedFormes) {
				const forme = this.getExistingPokemon(includedForme);
				const formeEvolutionLines = this.getAllEvolutionLines(forme);
				for (const line of formeEvolutionLines) {
					if (!Tools.arraysContainArray(line, potentialEvolutionLines)) {
						potentialEvolutionLines.push(line);
					}
				}

				formesToCheck.push(forme.name);
			}
		}

		const matchingEvolutionLines: string[][] = [];
		for (const line of potentialEvolutionLines) {
			for (const forme of formesToCheck) {
				if (line.includes(forme)) {
					matchingEvolutionLines.push(line);
					break;
				}
			}
		}
		return matchingEvolutionLines;
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

	getType(name: string): ITypeData | undefined {
		return this.typeCache.get(Tools.toId(name));
	}

	getExistingType(name: string): ITypeData {
		const type = this.getType(name);
		if (!type) throw new Error("No type returned for '" + name + "'");
		return type;
	}

	/**
	 * Returns true if target is immune to source
	 */
	isImmune(source: IMove | string, target: string | readonly string[] | IPokemon): boolean {
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
			// @ts-expect-error
			targetType = target.types as string[];
		}
		if (Array.isArray(targetType)) {
			for (const type of targetType) {
				if (this.isImmune(sourceType, type)) return true;
			}
			return false;
		} else {
			targetType = targetType as string;
			const typeData = this.getType(targetType);
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
		if (!invalidEvent && pokemon.evos.length) {
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
			// @ts-expect-error
			targetType = target.types as string[];
		}
		if (Array.isArray(targetType)) {
			let totalTypeMod = 0;
			for (const type of targetType) {
				totalTypeMod += this.getEffectiveness(sourceType, type);
			}
			return totalTypeMod;
		} else {
			targetType = targetType as string;
			const typeData = this.getType(targetType);
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
		const weaknesses: string[] = [];
		for (const key of this.data.typeKeys) {
			const type = this.getExistingType(key);
			const isImmune = this.isImmune(type.name, pokemon);
			const effectiveness = this.getEffectiveness(type.name, pokemon);
			if (!isImmune && effectiveness >= 1) weaknesses.push(type.name);
		}
		return weaknesses;
	}

	hasGifData(pokemon: IPokemon, generation?: 'xy' | 'bw', direction?: 'front' | 'back'): boolean {
		if (!generation) generation = 'xy';
		if (!direction) direction = 'front';
		if (generation === 'bw') {
			if (Object.prototype.hasOwnProperty.call(this.data.gifDataBW, pokemon.id) && this.data.gifDataBW[pokemon.id]![direction]) {
				return true;
			}
		} else {
			if (Object.prototype.hasOwnProperty.call(this.data.gifData, pokemon.id) && this.data.gifData[pokemon.id]![direction]) {
				return true;
			}
		}
		return false;
	}

	getPokemonGif(pokemon: IPokemon, generation?: 'xy' | 'bw', direction?: 'front' | 'back', shiny?: boolean): string {
		if (!generation) generation = 'xy';
		const bw = generation === 'bw';
		if (bw && pokemon.gen > 5) return '';

		let prefix = '//' + Tools.mainServer + '/sprites/' + generation + 'ani';
		if (!direction) direction = 'front';
		if (direction === 'front') {
			if (shiny) {
				prefix += "-shiny";
			}
		} else {
			if (shiny) {
				prefix += "-back-shiny";
			} else {
				prefix += "-back";
			}
		}

		let gifData: IGifData | undefined;
		if (bw) {
			if (Object.prototype.hasOwnProperty.call(this.data.gifDataBW, pokemon.id)) gifData = this.data.gifDataBW[pokemon.id]!;
		} else {
			if (Object.prototype.hasOwnProperty.call(this.data.gifData, pokemon.id)) gifData = this.data.gifData[pokemon.id]!;
		}

		let width: number;
		let height: number;
		if (gifData && gifData[direction]) {
			width = gifData[direction]!.w;
			height = gifData[direction]!.h;
		} else {
			width = 96;
			height = 96;
		}

		return '<img src="' + prefix + '/' + pokemon.spriteid + '.gif" width="' + width + '" height="' + height + '" />';
	}

	getPokemonIcon(pokemon: IPokemon, facingLeft?: boolean): string {
		let num = pokemon.num;
		if (num < 0) {
			num = 0;
		} else if (num > 809) {
			num = 0;
		}

		if (facingLeft) {
			if (this.data.alternateIconNumbers.left[pokemon.id]) num = this.data.alternateIconNumbers.left[pokemon.id]!;
		} else if (pokemon.gender === 'F') {
			if (pokemon.id === 'unfezant' || pokemon.id === 'frillish' || pokemon.id === 'jellicent' || pokemon.id === 'meowstic' ||
				pokemon.id === 'pyroar') {
				num = this.data.alternateIconNumbers.right[pokemon.id + 'f']!;
			}
		} else {
			if (this.data.alternateIconNumbers.right[pokemon.id]) num = this.data.alternateIconNumbers.right[pokemon.id]!;
		}

		const top = Math.floor(num / 12) * 30;
		const left = (num % 12) * 40;
		const facingLeftStyle = facingLeft ? "transform:scaleX(-1);webkit-transform:scaleX(-1);" : "";
		return '<span style="display: inline-block;width: 40px;height: 30px;image-rendering: pixelated;' +
			'background:transparent url(https://' + Tools.mainServer + '/sprites/pokemonicons-sheet.png?g8) no-repeat scroll -' + left +
			'px -' + top + 'px;' + facingLeftStyle + '"></span>';
	}

	getPSPokemonIcon(pokemon: IPokemon): string {
		return '<psicon pokemon="' + pokemon.id + '" style="vertical-align: -7px;margin: -2px" />';
	}

	getPokemonColorHtml(pokemon: IPokemon, width?: number): string {
		if (!width) width = 75;

		const colorData = Tools.hexColorCodes[Tools.pokemonColorHexColors[pokemon.color]];
		return '<div style="display:inline-block;background-color:' + colorData['background-color'] + ';background:' +
			colorData['background'] + ';border-color:' + colorData['border-color'] + ';border: 1px solid #a99890;border-radius:3px;' +
			'width:' + width + 'px;padding:1px;color:#fff;text-shadow:1px 1px 1px #333;text-transform: uppercase;' +
			'font-size:8pt;text-align:center"><b>' + pokemon.color + '</b></div>';
	}

	getTypeHtml(type: ITypeData, width?: number): string {
		if (!width) width = 75;

		const colorData = Tools.hexColorCodes[Tools.typeHexColors[type.name]];
		return '<div style="display:inline-block;background-color:' + colorData['background-color'] + ';background:' +
			colorData['background'] + ';border-color:' + colorData['border-color'] + ';border: 1px solid #a99890;border-radius:3px;' +
			'width:' + width + 'px;padding:1px;color:#fff;text-shadow:1px 1px 1px #333;text-transform: uppercase;' +
			'font-size:8pt;text-align:center"><b>' + type.name + '</b></div>';
	}

	/*
		Formats
	*/

	getFormat(name: string, isValidated?: boolean): IFormat | undefined {
		let id = Tools.toId(name);
		if (!id) return;

		const inputTarget = name;
		let customRules: string[] | undefined;
		if (!this.formatCache.has(id)) {
			if (id in customRuleFormats) {
				name = customRuleFormats[id];
			} else {
				const aliasedCustomRules: string[] = [];
				const [formatAlias, customRulesString] = name.split('@@@', 2);
				const parts = formatAlias.split(" ");
				let formatNameIndex = parts.length - 1;
				for (let i = 0; i < parts.length - 1; i++) {
					const id = Tools.toId(parts[i]);
					if (id in customRuleAliases) {
						for (const rule of customRuleAliases[id]) {
							if (!aliasedCustomRules.includes(rule)) aliasedCustomRules.push(rule);
						}
					} else {
						formatNameIndex = i;
						break;
					}
				}

				if (aliasedCustomRules.length) {
					customRules = (customRules || []).concat(aliasedCustomRules);
					name = parts.slice(formatNameIndex).join(" ") + (customRulesString ? "@@@" + customRulesString : "");
					id = Tools.toId(name);
				}
			}
		}

		if (name.includes('@@@')) {
			if (!isValidated) {
				try {
					name = this.validateFormat(name);
					isValidated = true;
				// eslint-disable-next-line no-empty
				} catch (e) {}
			}
			const [newName, customRulesString] = name.split('@@@', 2);
			name = newName;
			id = Tools.toId(name);
			if (isValidated && customRulesString) {
				if (!customRules) customRules = [];
				const rules = customRulesString.split(',');
				for (const rule of rules) {
					if (!customRules.includes(rule)) customRules.push(rule);
				}
			}
		}

		if (id.startsWith('omotm')) {
			let index: number;
			if (id === 'omotm') {
				index = 1;
			} else {
				index = parseInt(id.substr(5));
			}
			if (!isNaN(index) && index <= this.omotms.length) id = this.omotms[index - 1];
		}

		if (!this.formatCache.has(id)) {
			for (let i = currentGen; i >= 1; i--) {
				const genId = 'gen' + i + id;
				if (this.formatCache.has(genId)) {
					id = genId;
					break;
				}
			}
		}

		const format = this.formatCache.get(id);

		return format ? Object.assign(Tools.deepClone(format), {customRules}, {inputTarget}) as IFormat : undefined;
	}

	getExistingFormat(name: string, isTrusted?: boolean): IFormat {
		const format = this.getFormat(name, isTrusted);
		if (!format) throw new Error("No format returned for '" + name + "'");
		return format;
	}

	getFormatInfoDisplay(format: IFormat): string {
		let html = '';
		if (format.desc) {
			html += '<br />&nbsp; - ' + format.desc;
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
				html += '<br />&nbsp; - Description and more info on the <a href="' + format.info + '">official page</a>.';
				if (format.generator) {
					html += '<br />&nbsp; - Use our <a href="' + format.generator + '">random generator</a> to ease the hosting process.';
				}
			} else {
				html += '<br />&nbsp; - Description and more info ' + (format.info.startsWith('https://www.smogon.com/dex/') ? 'on the ' +
					'<a href="' + format.info + '">dex page' : 'in the  <a href="' + format.info + '">discussion thread') + '</a>.';
			}
		}
		if (format.teams) {
			html += '<br />&nbsp; - Need to borrow a team? Check out the <a href="' + format.teams + '">sample teams thread</a>.';
		}
		if (format.viability) {
			html += '<br />&nbsp; - See how viable each Pokemon is in the <a href="' + format.viability + '">viability rankings ' +
				'thread</a>.';
		}
		if (format.roleCompendium) {
			html += '<br />&nbsp; - Check the common role that each Pokemon plays in the <a href="' + format.roleCompendium + '">role ' +
				'compendium thread</a>.';
		}
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

	getRuleTable(format: IFormat, depth = 1, repeals?: Map<string, number>): RuleTable {
		if (format.ruleTable && !repeals) return format.ruleTable;
		if (depth === 1 && dexes[format.mod || 'base'] !== this) {
			// throw new Error(`${format.mod} ${this.currentMod}`);
			return this.getDex(format.mod).getRuleTable(format, depth + 1);
		}
		const ruleTable = new RuleTable();

		const ruleset = format.ruleset.slice();
		for (const ban of format.banlist) {
			ruleset.push('-' + ban);
		}
		for (const ban of format.restricted) {
			ruleset.push('*' + ban);
		}
		for (const ban of format.unbanlist) {
			ruleset.push('+' + ban);
		}
		if (format.customRules) {
			ruleset.push(...format.customRules);
		}
		if (format.hasCheckLearnset) {
			ruleTable.checkLearnset = [true, format.name];
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
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					throw new Error(`Unrecognized rule spec ${ruleSpec}`);
				}
				continue;
			}

			if (rule.startsWith('!')) {
				const repealDepth = repeals!.get(ruleSpec.slice(1));
				if (repealDepth === undefined) throw new Error(`Multiple "${rule}" rules in ${format.name}`);
				if (repealDepth === depth) {
					throw new Error(`Rule "${rule}" did nothing because "${rule.slice(1)}" is not in effect`);
				}
				if (repealDepth === -depth) repeals!.delete(ruleSpec.slice(1));
				continue;
			}

			if ("+*-".includes(ruleSpec.charAt(0))) {
				if (ruleTable.has(ruleSpec)) {
					throw new Error(`Rule "${rule}" was added by "${format.name}" but already exists in "${ruleTable.get(ruleSpec) ||
						format.name}"`);
				}
				for (const prefix of "-*+") ruleTable.delete(prefix + ruleSpec.slice(1));
				ruleTable.set(ruleSpec, '');
				continue;
			}
			const subformat = this.getFormat(ruleSpec);
			const subFormatId = subformat ? subformat.id: Tools.toId(ruleSpec);
			if (repeals && repeals.has(subFormatId)) {
				repeals.set(subFormatId, -Math.abs(repeals.get(subFormatId)!));
				continue;
			}
			if (ruleTable.has(subFormatId)) {
				throw new Error(`Rule "${rule}" was added by "${format.name}" but already exists in "${ruleTable.get(subFormatId) ||
					format.name}"`);
			}
			ruleTable.set(subFormatId, '');
			if (!subformat) continue;
			if (depth > 16) {
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				throw new Error(`Excessive ruleTable recursion in ${format.name}: ${ruleSpec} of ${format.ruleset}`);
			}
			const subRuleTable = this.getRuleTable(subformat, depth + 1, repeals);
			for (const [k, v] of subRuleTable) {
				// don't check for "already exists" here; multiple inheritance is allowed
				if (!repeals || !repeals.has(k)) {
					ruleTable.set(k, v || subformat.name);
				}
			}
			for (const [subRule, source, limit, bans] of subRuleTable.complexBans) {
				ruleTable.addComplexBan(subRule, source || subformat.name, limit, bans);
			}
			for (const [subRule, source, limit, bans] of subRuleTable.complexTeamBans) {
				ruleTable.addComplexTeamBan(subRule, source || subformat.name, limit, bans);
			}
			if (subRuleTable.checkLearnset) {
				if (ruleTable.checkLearnset) {
					throw new Error(
						`"${format.name}" has conflicting move validation rules from ` +
						`"${ruleTable.checkLearnset[1]}" and "${subRuleTable.checkLearnset[1]}"`
					);
				}
				ruleTable.checkLearnset = subRuleTable.checkLearnset;
			}
			if (subRuleTable.timer) {
				if (ruleTable.timer) {
					throw new Error(`"${format.name}" has conflicting timer validation rules from "${ruleTable.timer[1]}" and ` +
						`"${subRuleTable.timer[1]}"`);
				}
				ruleTable.timer = subRuleTable.timer;
			}
			// minSourceGen is automatically ignored if higher than current gen
			// this helps the common situation where Standard has a minSourceGen in the
			// latest gen but not in any past gens
			if (subRuleTable.minSourceGen && subRuleTable.minSourceGen[0] <= this.gen) {
				if (ruleTable.minSourceGen) {
					throw new Error(`"${format.name}" has conflicting minSourceGen from "${ruleTable.minSourceGen[1]}" and ` +
						`"${subRuleTable.minSourceGen[1]}"`);
				}
				ruleTable.minSourceGen = subRuleTable.minSourceGen;
			}
		}

		format.ruleTable = ruleTable;
		return ruleTable;
	}

	validateRule(rule: string, format: IFormat | null = null): [string, string, string, number, string[]] | string {
		switch (rule.charAt(0)) {
		case '-':
		case '*':
		case '+': {
			if (format && format.team) throw new Error(`We don't currently support bans in generated teams`);
			if (rule.slice(1).includes('>') || rule.slice(1).includes('+')) {
				let buf = rule.slice(1);
				const gtIndex = buf.lastIndexOf('>');
				let limit = rule.startsWith('+') ? Infinity : 0;
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
		}
		default: {
			const id = Tools.toId(rule);
			if (!this.data.formatKeys.includes(id)) {
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
		if (Object.prototype.hasOwnProperty.call(dexes['base'].data.aliases, id)) id = Tools.toId(dexes['base'].data.aliases[id]);
		for (const matchType of matchTypes) {
			let table: readonly string[];
			switch (matchType) {
			case 'pokemon': table = dexes['base'].data.pokemonKeys; break;
			case 'move': table = dexes['base'].data.moveKeys; break;
			case 'item': table = dexes['base'].data.itemKeys; break;
			case 'ability': table = dexes['base'].data.abilityKeys; break;
			case 'pokemontag': {
				// valid pokemontags
				const validTags = [
					// singles tiers
					'uber', 'ou', 'uubl', 'uu', 'rubl', 'ru', 'nubl', 'nu', 'publ', 'pu', 'zu', 'nfe', 'lcuber', 'lc', 'cap', 'caplc',
					'capnfe', 'ag',
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
			if (table.includes(id)) {
				if (matchType === 'pokemon') {
					const species = dexes['base'].pokemonCache.get(id) as IPokemon;
					if (species.otherFormes && ruleid !== species.id + Tools.toId(species.baseForme)) {
						matches.push('basepokemon:' + id);
						continue;
					}
				}
				matches.push(matchType + ':' + id);
			} else if (matchType === 'pokemon' && id.endsWith('base')) {
				id = id.slice(0, -4);
				if (table.includes(id)) {
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
			ruleName = dexes['base'].getExistingAbility(ruleName).name;
		} else if (tag === 'item') {
			ruleName = dexes['base'].getExistingItem(ruleName).name;
		} else if (tag === 'move') {
			ruleName = dexes['base'].getExistingMove(ruleName).name;
		} else if (tag === 'pokemon' || tag === 'basepokemon') {
			ruleName = dexes['base'].getExistingPokemon(ruleName).name;
		} else if (tag === 'pokemontag') {
			ruleName = tagNames[ruleName];
		} else {
			const format = this.getFormat(ruleName);
			if (format) ruleName = format.name;
		}

		return ruleName;
	}

	ruleTableBansSpecies(ruleTable: RuleTable, species: IPokemon): string | null {
		const setHas: Dict<true> = {};

		setHas['pokemon:' + species.id] = true;
		setHas['basepokemon:' + Tools.toId(species.baseSpecies)] = true;

		const tier = species.tier === '(PU)' ? 'ZU' : species.tier === '(NU)' ? 'PU' : species.tier;
		const tierTag = 'pokemontag:' + Tools.toId(tier);
		setHas[tierTag] = true;

		const doublesTier = species.doublesTier === '(DUU)' ? 'DNU' : species.doublesTier;
		const doublesTierTag = 'pokemontag:' + Tools.toId(doublesTier);
		setHas[doublesTierTag] = true;

		let banReason = ruleTable.check('pokemon:' + species.id);
		if (banReason) {
			return `${species.name} is ${banReason}.`;
		}
		if (banReason === '') return null;

		banReason = ruleTable.check('basepokemon:' + Tools.toId(species.baseSpecies));
		if (banReason) {
			return `${species.name} is ${banReason}.`;
		}
		if (banReason === '') {
			// don't allow nonstandard speciess when whitelisting standard base species
			// i.e. unbanning Pichu doesn't mean allowing Pichu-Spiky-Eared outside of Gen 4
			const baseSpecies = this.getExistingPokemon(species.baseSpecies);
			if (baseSpecies.isNonstandard === species.isNonstandard) {
				return null;
			}
		}

		banReason = ruleTable.check(tierTag) || (tier === 'AG' ? ruleTable.check('pokemontag:uber') : null);
		if (banReason) {
			return `${species.name} is in ${tier}, which is ${banReason}.`;
		}
		if (banReason === '') return null;

		banReason = ruleTable.check(doublesTierTag);
		if (banReason) {
			return `${species.name} is in ${doublesTier}, which is ${banReason}.`;
		}
		if (banReason === '') return null;

		banReason = ruleTable.check('pokemontag:allpokemon');
		if (banReason) {
			return `${species.name} is not in the list of allowed pokemon.`;
		}

		// obtainability
		if (species.isNonstandard) {
			banReason = ruleTable.check('pokemontag:' + Tools.toId(species.isNonstandard));
			if (banReason) {
				if (species.isNonstandard === 'Unobtainable') {
					return `${species.name} is not obtainable without hacking or glitches.`;
				}
				return `${species.name} is tagged ${species.isNonstandard}, which is ${banReason}.`;
			}
			if (banReason === '') return null;
		}

		if (species.isNonstandard && species.isNonstandard !== 'Unobtainable') {
			banReason = ruleTable.check('nonexistent', setHas);
			if (banReason) {
				if (['Past', 'Future'].includes(species.isNonstandard)) {
					return `${species.name} does not exist in Gen ${this.gen}.`;
				}
				return `${species.name} does not exist in this game.`;
			}
			if (banReason === '') return null;
		}

		return null;
	}

	getUsablePokemon(format: IFormat): string[] {
		if (format.usablePokemon) return format.usablePokemon;
		if (!format.ruleTable) format.ruleTable = this.getRuleTable(format);

		const formatGen = format.mod in dexes ? dexes[format.mod].gen : this.gen;
		const littleCup = format.ruleTable.has("littlecup");
		const usablePokemon: string[] = [];
		for (const i of this.data.pokemonKeys) {
			const pokemon = this.getExistingPokemon(i);
			if (pokemon.requiredAbility || pokemon.requiredItem || pokemon.requiredItems || pokemon.requiredMove ||
				this.ruleTableBansSpecies(format.ruleTable, pokemon)) continue;
			if (littleCup) {
				if ((pokemon.prevo && this.getExistingPokemon(pokemon.prevo).gen <= formatGen) || !pokemon.nfe) continue;
			}

			usablePokemon.push(pokemon.name);
		}

		format.usablePokemon = usablePokemon;
		return usablePokemon;
	}

	combineCustomRules(separatedCustomRules: ISeparatedCustomRules): string[] {
		const customRules: string[] = [];
		for (const ban of separatedCustomRules.addedbans) {
			customRules.push('-' + ban);
		}
		for (const unban of separatedCustomRules.removedbans) {
			customRules.push('+' + unban);
		}
		for (const restriction of separatedCustomRules.addedrestrictions) {
			customRules.push('*' + restriction);
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
		const addedbans: string[] = [];
		const removedbans: string[] = [];
		const addedrestrictions: string[] = [];
		const addedrules: string[] = [];
		const removedrules: string[] = [];
		for (const ruleString of customRules) {
			const rule = this.validateRule(ruleString);
			if (typeof rule === 'string') {
				const type = rule.charAt(0);
				const ruleName = this.getValidatedRuleName(rule);

				if (type === '+') {
					addedbans.push(ruleName);
				} else if (type === '-') {
					removedbans.push(ruleName);
				} else if (type === '*') {
					addedrestrictions.push(ruleName);
				} else if (type === '!') {
					removedrules.push(ruleName);
				} else {
					addedrules.push(ruleName);
				}
			} else {
				const complexBans = rule[4].map(x => this.getValidatedRuleName(x));
				if (rule[0] === 'complexTeamBan') {
					addedbans.push(complexBans.join(' ++ '));
				} else {
					addedbans.push(complexBans.join(' + '));
				}
			}
		}

		return {addedbans, removedbans, addedrestrictions, addedrules, removedrules};
	}

	getCustomFormatName(format: IFormat, room?: Room, showAll?: boolean): string {
		if (!format.customRules || !format.customRules.length) return format.name;
		if (!format.separatedCustomRules) format.separatedCustomRules = this.separateCustomRules(format.customRules);
		const defaultCustomRules: Partial<ISeparatedCustomRules> = room && room.id in Tournaments.defaultCustomRules ?
			Tournaments.defaultCustomRules[room.id] : {};
		const bansLength = format.separatedCustomRules.addedbans.length;
		const unbansLength = format.separatedCustomRules.removedbans.length;
		const restrictionsLength = format.separatedCustomRules.addedrestrictions.length;
		const addedRulesLength = format.separatedCustomRules.addedrules.length;
		const removedRulesLength = format.separatedCustomRules.removedrules.length;

		const prefixesAdded: string[] = [];
		let prefixesRemoved: string[] = [];
		let suffixes: string[] = [];

		if (showAll || (bansLength <= 2 && unbansLength <= 2 && addedRulesLength <= 2 && removedRulesLength <= 2)) {
			if (bansLength && (!defaultCustomRules.addedbans ||
				format.separatedCustomRules.addedbans.join(",") !== defaultCustomRules.addedbans.join(","))) {
				prefixesRemoved = prefixesRemoved.concat(format.separatedCustomRules.addedbans);
			}
			if (unbansLength && (!defaultCustomRules.removedbans ||
				format.separatedCustomRules.removedbans.join(",") !== defaultCustomRules.removedbans.join(","))) {
				suffixes = suffixes.concat(format.separatedCustomRules.removedbans);
			}
			if (restrictionsLength && (!defaultCustomRules.addedrestrictions ||
				format.separatedCustomRules.addedrestrictions.join(",") !== defaultCustomRules.addedrestrictions.join(","))) {
				suffixes = suffixes.concat(format.separatedCustomRules.addedrestrictions);
			}
			if (addedRulesLength && (!defaultCustomRules.addedrules ||
				format.separatedCustomRules.addedrules.join(",") !== defaultCustomRules.addedrules.join(","))) {
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
			if (removedRulesLength && (!defaultCustomRules.removedrules ||
				format.separatedCustomRules.removedrules.join(",") !== defaultCustomRules.removedrules.join(","))) {
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
		if (format.separatedCustomRules.addedbans.length) {
			html.push("&nbsp;&nbsp;&nbsp;&nbsp;<b>Added bans</b>: " + format.separatedCustomRules.addedbans.join(", "));
		}
		if (format.separatedCustomRules.removedbans.length) {
			html.push("&nbsp;&nbsp;&nbsp;&nbsp;<b>Removed bans</b>: " + format.separatedCustomRules.removedbans.join(", "));
		}
		if (format.separatedCustomRules.addedrestrictions.length) {
			html.push("&nbsp;&nbsp;&nbsp;&nbsp;<b>Added restrictions</b>: " + format.separatedCustomRules.addedrestrictions.join(", "));
		}
		if (format.separatedCustomRules.addedrules.length) {
			html.push("&nbsp;&nbsp;&nbsp;&nbsp;<b>Added rules</b>: " + format.separatedCustomRules.addedrules.join(", "));
		}
		if (format.separatedCustomRules.removedrules.length) {
			html.push("&nbsp;&nbsp;&nbsp;&nbsp;<b>Removed rules</b>: " + format.separatedCustomRules.removedrules.join(", "));
		}
		return html.join("<br />");
	}

	getPossibleTeams(previousTeams: string[][], pool: IPokemon[] | string[], additions?: number, evolutions?: number,
		requiredAddition?: boolean, requiredEvolution?: boolean): string[][] {
		if (!additions) additions = 0;
		if (!evolutions) evolutions = 0;

		const newPokemon: string[] = [];
		for (const name of pool) {
			const pokemon = typeof name === 'string' ? this.getPokemon(name) : name;
			if (!pokemon) continue;
			newPokemon.push(pokemon.name);
		}

		if (additions > newPokemon.length) additions = newPokemon.length;
		const permutations = Tools.getPermutations(newPokemon, 1);
		const possiblePokemon: string[][] = [];
		for (const permutation of permutations) {
			if (permutation.length <= additions) possiblePokemon.push(permutation);
		}

		let baseTeams: string[][];
		if (requiredAddition) {
			baseTeams = [];
		} else {
			// not adding Pokemon
			baseTeams = previousTeams.slice();
		}

		for (const pokemon of possiblePokemon) {
			for (const previousTeam of previousTeams) {
				let team = previousTeam.slice();
				team = team.concat(pokemon);
				if (team.length > 6) continue;
				baseTeams.push(team);
			}
		}

		let finalTeams: string[][];
		if (requiredEvolution) {
			finalTeams = [];
		} else {
			// not evolving Pokemon
			finalTeams = baseTeams.slice();
		}

		let currentTeams = baseTeams.slice();
		const nextTeams: string[][] = [];
		if (evolutions > 0) {
			while (evolutions > 0) {
				for (const team of currentTeams) {
					let availableEvolutions = false;
					for (let i = 0; i < team.length; i++) {
						const pokemon = this.getExistingPokemon(team[i]);
						if (!pokemon.nfe) continue;
						const pokemonSlot = i;
						for (const evo of pokemon.evos) {
							const evolution = this.getExistingPokemon(evo);
							availableEvolutions = true;
							const newTeam = team.slice();
							newTeam[pokemonSlot] = evolution.name;
							finalTeams.push(newTeam);
							nextTeams.push(newTeam);
						}
					}
					if (!availableEvolutions) finalTeams.push(team);
				}
				currentTeams = nextTeams;
				evolutions--;
			}
		} else if (evolutions < 0) {
			// check that there are evolutions left
			while (evolutions < 0) {
				for (const team of currentTeams) {
					let availableEvolutions = false;
					for (let i = 0; i < team.length; i++) {
						const pokemon = this.getExistingPokemon(team[i]);
						if (!pokemon.prevo) continue;
						const pokemonSlot = i;
						const prevo = this.getExistingPokemon(pokemon.prevo);
						availableEvolutions = true;
						const newTeam = team.slice();
						newTeam[pokemonSlot] = prevo.name;
						finalTeams.push(newTeam);
						nextTeams.push(newTeam);
					}
					if (!availableEvolutions) finalTeams.push(team);
				}
				currentTeams = nextTeams;
				evolutions++;
			}
		}

		for (const team of finalTeams) {
			team.sort();
		}

		finalTeams.sort((a, b) => a.length - b.length);

		return finalTeams;
	}

	includesPokemon(team: IPokemon[] | string[], requiredPokemon: string[]): boolean {
		const pokemonList: string[] = [];
		for (const pokemon of team) {
			pokemonList.push(typeof pokemon === 'string' ? this.getExistingPokemon(pokemon).name : pokemon.name);
		}

		let includes = true;
		for (const pokemon of requiredPokemon) {
			if (!pokemonList.includes(this.getExistingPokemon(pokemon).name)) {
				includes = false;
				break;
			}
		}

		return includes;
	}

	isPossibleTeam(team: IPokemon[] | string[], possibleTeams: DeepImmutable<string[][]>): boolean {
		const names: string[] = [];
		for (const pokemon of team) {
			names.push(typeof pokemon === 'string' ? this.getExistingPokemon(pokemon).name : pokemon.name);
		}

		names.sort();
		possibleTeams = possibleTeams.slice().sort((a, b) => b.length - a.length);

		let isPossible = false;
		for (const possibleTeam of possibleTeams) {
			const team = possibleTeam.slice();
			team.sort();
			if (Tools.compareArrays(team, names)) {
				isPossible = true;
				break;
			}
		}

		return isPossible;
	}

	private getAllEvolutionLines(pokemon: IPokemon, prevoList?: string[], evolutionLines?: string[][]): string[][] {
		if (!prevoList || !evolutionLines) {
			let firstStage = pokemon;
			while (firstStage.prevo) {
				const prevo = this.getPokemon(firstStage.prevo);
				if (prevo) firstStage = prevo;
			}
			return this.getAllEvolutionLines(firstStage, [], []);
		}

		prevoList = prevoList.slice();
		prevoList.push(pokemon.name);
		if (!pokemon.evos.length) {
			evolutionLines.push(prevoList);
		} else {
			for (const name of pokemon.evos) {
				const evolution = this.getPokemon(name);
				if (evolution) this.getAllEvolutionLines(evolution, prevoList, evolutionLines);
			}
		}
		return evolutionLines;
	}
}

export const instantiate = async(): Promise<void> => {
	const oldDex: Dex | undefined = global.Dex;

	global.Dex = new Dex();

	if (oldDex) {
		await global.Dex.onReload(oldDex);
		Tools.updateNodeModule(__filename, module);
	}
};
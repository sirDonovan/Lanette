/**
 * Some types imported from:
 * Pokemon Showdown - https://github.com/smogon/pokemon-showdown
 */

import type { RuleTable } from "../dex";
import type { PokemonShowdownWorker } from '../workers/pokemon-showdown';

export interface IDexWorkers {
	pokemonShowdown: PokemonShowdownWorker;
}

/** rule, source, limit, bans */
export type ComplexBan = [string, string, number, string[]];
export type ComplexTeamBan = ComplexBan;

type GenderName = 'M' | 'F' | 'N' | '';
type StatNameExceptHP = 'atk' | 'def' | 'spa' | 'spd' | 'spe';
type StatName = 'hp' | StatNameExceptHP;
type StatsExceptHPTable = {[stat in StatNameExceptHP]: number};
export type StatsTable = {[stat in StatName]: number };
type SparseStatsTable = Partial<StatsTable>;
type BoostName = StatNameExceptHP | 'accuracy' | 'evasion';
type BoostsTable = {[boost in BoostName]: number };
type SparseBoostsTable = Partial<BoostsTable>;
type Nonstandard = 'Past' | 'Future' | 'Unobtainable' | 'CAP' | 'LGPE' | 'Custom';

/**
 * Describes the acceptable target(s) of a move.
 * adjacentAlly - Only relevant to Doubles or Triples, the move only targets an ally of the user.
 * adjacentAllyOrSelf - The move can target the user or its ally.
 * adjacentFoe - The move can target a foe, but not (in Triples) a distant foe.
 * all - The move targets the field or all Pokémon at once.
 * allAdjacent - The move is a spread move that also hits the user's ally.
 * allAdjacentFoes - The move is a spread move.
 * allies - The move affects all active Pokémon on the user's team.
 * allySide - The move adds a side condition on the user's side.
 * allyTeam - The move affects all unfainted Pokémon on the user's team.
 * any - The move can hit any other active Pokémon, not just those adjacent.
 * foeSide - The move adds a side condition on the foe's side.
 * normal - The move can hit one adjacent Pokémon of your choice.
 * randomNormal - The move targets an adjacent foe at random.
 * scripted - The move targets the foe that damaged the user.
 * self - The move affects the user of the move.
 */
type MoveTarget = 'adjacentAlly' | 'adjacentAllyOrSelf' | 'adjacentFoe' | 'all' | 'allAdjacent' | 'allAdjacentFoes' | 'allies' |
	'allySide' | 'allyTeam' | 'any' | 'foeSide' | 'normal' | 'randomNormal' | 'scripted' | 'self';

interface IPokemonSet {
	name: string;
	species: string;
	item: string;
	ability: string;
	moves: string[];
	nature: string;
	gender: string;
	evs: StatsTable;
	ivs: StatsTable;
	level: number;
	shiny?: boolean;
	happiness?: number;
	pokeball?: string;
	hpType?: string;
}

/**
 * Describes a possible way to get a move onto a pokemon.
 *
 * First character is a generation number, 1-7.
 * Second character is a source ID, one of:
 *
 * - L = start or level-up, 3rd char+ is the level
 * - M = TM/HM
 * - T = tutor
 * - R = restricted (special moves like Rotom moves)
 * - E = egg
 * - S = event, 3rd char+ is the index in .eventData
 * - D = Dream World, only 5D is valid
 * - V = Virtual Console or Let's Go transfer, only 7V/8V is valid
 * - C = NOT A REAL SOURCE, see note, only 3C/4C is valid
 *
 * C marks certain moves learned by a pokemon's prevo. It's used to
 * work around the chainbreeding checker's shortcuts for performance;
 * it lets the pokemon be a valid father for teaching the move, but
 * is otherwise ignored by the learnset checker (which will actually
 * check prevos for compatibility).
 */
type MoveSource = string;

interface IEventInfo {
	generation: number;
	level?: number;
	/** true: always shiny, 1: sometimes shiny, false | undefined: never shiny */
	shiny?: boolean | 1;
	gender?: GenderName;
	nature?: string;
	ivs?: SparseStatsTable;
	perfectIVs?: number;
	/** true: has hidden ability, false | undefined: never has hidden ability */
	isHidden?: boolean;
	abilities?: string[];
	maxEggMoves?: number;
	moves?: string[];
	pokeball?: string;
	from?: string;
}

type EffectType = 'Effect' | 'Pokemon' | 'Move' | 'Item' | 'Ability' | 'Format' | 'Ruleset' | 'Weather' | 'Status' | 'Rule' |
	'ValidatorRule';

interface IBasicEffect {
	desc: string;
	effectType: EffectType;
	gen: number;
	id: string;
	shortDesc: string;
}

interface IAbilityCopy extends IBasicEffect {
	name: string;
	effectType: "Ability";
	fullname: string;
	gen: number;
	id: string;
	isNonstandard: Nonstandard | null;
	rating: number;
	isUnbreakable?: boolean;
	suppressWeather?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IAbility extends DeepReadonly<IAbilityCopy> {}

interface IFlingData {
	basePower: number;
	status?: string;
	volatileStatus?: string;
}

export interface IItemCopy extends IBasicEffect {
	name: string;
	effectType: "Item";
	fling?: IFlingData;
	fullname: string;
	gen: number;
	id: string;
	isNonstandard: Nonstandard | null;
	/** just controls location on the item spritesheet */
	num?: number;
	forcedForme?: string;
	ignoreKlutz?: boolean;
	isBerry?: boolean;
	isChoice?: boolean;
	isGem?: boolean;
	isPokeball?: boolean;
	megaStone?: string;
	megaEvolves?: string;
	naturalGift?: {basePower: number; type: string};
	onDrive?: string;
	onMemory?: string;
	onPlate?: string;
	spritenum?: number;
	zMove?: string | true;
	zMoveFrom?: string;
	zMoveType?: string;
	itemUser?: string[];
	boosts?: SparseBoostsTable | false;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IItem extends DeepReadonly<IItemCopy> {}

interface IHitEffect {
	// set pokemon conditions
	boosts?: SparseBoostsTable | null;
	status?: string;
	volatileStatus?: string;

	// set side/slot conditions
	sideCondition?: string;
	slotCondition?: string;

	// set field conditions
	pseudoWeather?: string;
	terrain?: string;
	weather?: string;
}

interface ISecondaryEffect extends IHitEffect {
	chance?: number;
	/** Used to flag a secondary effect as added by Poison Touch */
	ability?: IAbility;
	/**
	 * Applies to Sparkling Aria's secondary effect: Affected by
	 * Sheer Force but not Shield Dust.
	 */
	dustproof?: boolean;
	/**
	 * Gen 2 specific mechanics: Bypasses Substitute only on Twineedle,
	 * and allows it to flinch sleeping/frozen targets
	 */
	kingsrock?: boolean;
	self?: IHitEffect;
}

export interface IMoveCopy extends IBasicEffect {
	name: string;
	baseMoveType: string;
	critRatio: number;
	effectType: "Move";
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	flags: Dict<any>;
	fullname: string;
	gen: number;
	id: string;
	ignoreImmunity: boolean | Dict<boolean>;
	isNonstandard: Nonstandard | null;
	nonGhostTarget: string;
	pressureTarget: string;
	secondaries: ISecondaryEffect[] | null;
	zMovePower?: number;
	/** move index number, used for Metronome rolls */
	num?: number;
	basePower: number;
	accuracy: true | number;
	pp: number;
	category: 'Physical' | 'Special' | 'Status';
	type: string;
	priority: number;
	target: MoveTarget;
	/** Hidden Power */
	realMove?: string;

	damage?: number | 'level' | false | null;
	contestType?: string;
	isViable?: boolean;
	noPPBoosts?: boolean;

	// Z-move data
	// -----------
	/**
	 * `true` for generic Z-moves like Gigavolt Havoc.
	 * Also `true` for Z-powered status moves like Z-Encore.
	 * Move ID of the base move, for specific Z-moves like Stoked
	 * Sparksurfer.
	 */
	isZ?: boolean | string;
	zMove?: {
		basePower?: number;
		effect?: string;
		boost?: SparseBoostsTable;
	};

	// Max move data
	// -------------
	/**
	 * `true` for Max moves like Max Airstream. If its a G-Max moves, this is
	 * the species ID of the Gigantamax Pokemon that can use this G-Max move.
	 */
	isMax?: boolean | string;
	maxMove?: {
		basePower: number;
	};

	// Hit effects
	// -----------
	ohko?: boolean | string;
	thawsTarget?: boolean;
	heal?: number[] | null;
	forceSwitch?: boolean;
	selfSwitch?: string | boolean;
	selfBoost?: {boosts?: SparseBoostsTable};
	selfdestruct?: string | boolean;
	breaksProtect?: boolean;
	/**
	 * Note that this is only "true" recoil. Other self-damage, like Struggle,
	 * crash (High Jump Kick), Mind Blown, Life Orb, and even Substitute and
	 * Healing Wish, are sometimes called "recoil" by the community, but don't
	 * count as "real" recoil.
	 */
	recoil?: [number, number];
	drain?: [number, number];
	mindBlownRecoil?: boolean;
	stealsBoosts?: boolean;
	struggleRecoil?: boolean;
	secondary?: ISecondaryEffect | null;
	self?: IHitEffect | null;

	// Hit effect modifiers
	// --------------------
	alwaysHit?: boolean; // currently unused
	basePowerModifier?: number;
	critModifier?: number;
	defensiveCategory?: 'Physical' | 'Special' | 'Status';
	forceSTAB?: boolean;
	ignoreAbility?: boolean;
	ignoreAccuracy?: boolean;
	ignoreDefensive?: boolean;
	ignoreEvasion?: boolean;
	ignoreNegativeOffensive?: boolean;
	ignoreOffensive?: boolean;
	ignorePositiveDefensive?: boolean;
	ignorePositiveEvasion?: boolean;
	multiaccuracy?: boolean;
	multihit?: number | number[];
	multihitType?: string;
	noDamageVariance?: boolean;
	/** False Swipe */
	noFaint?: boolean;
	spreadModifier?: number;
	sleepUsable?: boolean;
	/**
	 * Will change target if current target is unavailable. (Dragon Darts)
	 */
	smartTarget?: boolean;
	/**
	 * Tracks the original target through Ally Switch and other switch-out-and-back-in
	 * situations, rather than just targeting a slot. (Stalwart, Snipe Shot)
	 */
	tracksTarget?: boolean;
	useTargetOffensive?: boolean;
	useSourceDefensiveAsOffensive?: boolean;
	willCrit?: boolean;

	// Mechanics flags
	// ---------------
	hasCrashDamage?: boolean;
	isConfusionSelfHit?: boolean;
	isFutureMove?: boolean;
	noMetronome?: string[];
	noSketch?: boolean;
	stallingMove?: boolean;
	baseMove?: string;

	hasBasePowerCallback?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IMove extends DeepReadonly<IMoveCopy> {}

interface ISpeciesAbility {
	0: string;
	1?: string;
	H?: string;
	S?: string;
}

interface IGen2RandomSet {
	chance: number;
	item?: string[];
	baseMove1?: string;
	baseMove2?: string;
	baseMove3?: string;
	baseMove4?: string;
	fillerMoves1?: string[];
	fillerMoves2?: string[];
	fillerMoves3?: string[];
	fillerMoves4?: string[];
}

export interface ISpeciesFormatsData {
	comboMoves?: readonly string[];
	doublesTier?: string;
	essentialMove?: string;
	exclusiveMoves?: readonly string[];
	isNonstandard?: Nonstandard | null;
	maleOnlyHidden?: boolean;
	randomBattleMoves?: readonly string[];
	randomDoubleBattleMoves?: readonly string[];
	randomSets?: readonly IGen2RandomSet[];
	tier?: string;
	unreleasedHidden?: boolean | 'Past';
}

interface IPokemonCopy extends ISpeciesFormatsData {
	name: string;
	/** National Dex number */
	num: number;
	baseForme: string;
	baseSpecies: string;
	battleOnly?: string | string[];
	category: string;
	changesFrom?: string;
	color: string;
	doublesTier: string;
	effectType: "Pokemon";
	evos: string[];
	forme: string;
	fullname: string;
	gen: number;
	gender: GenderName;
	genderRatio: Dict<number>;
	heightm: number;
	id: string;
	isMega: boolean;
	isNonstandard: Nonstandard | null;
	isPrimal: boolean;
	nfe: boolean;
	prevo: string;
	requiredItems: string[] | undefined;
	shiny: boolean;
	speciesid: string;
	spriteid: string;
	tier: string;
	weightkg: number;
	weighthg: number;
	abilities: ISpeciesAbility;
	baseStats: StatsTable;
	eggGroups: string[];
	types: string[];

	canHatch?: boolean;
	evoLevel?: number;
	evoMove?: string;
	evoCondition?: string;
	evoItem?: string;
	evoType?: 'trade' | 'useItem' | 'levelMove' | 'levelExtra' | 'levelFriendship' | 'levelHold' | 'other';
	maxHP?: number;
	cosmeticFormes?: string[];
	otherFormes?: string[];
	requiredAbility?: string;
	requiredItem?: string;
	requiredMove?: string;
	isGigantamax?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IPokemon extends DeepReadonly<IPokemonCopy> {}

interface ILearnsetData {
	id: string;
	learnset?: Dict<MoveSource[]>;
	eventData?: IEventInfo[];
	eventOnly?: boolean;
	encounters?: IEventInfo[];
}

export type FormatEffectType = 'Format' | 'Ruleset' | 'Rule' | 'ValidatorRule';
type GameType = 'singles' | 'doubles' | 'triples' | 'rotation' | 'multi' | 'free-for-all';
type SideID = 'p1' | 'p2' | 'p3' | 'p4';

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface IFormatData {
	name: string;
	banlist: string[];
	customRules: string[] | null;
	defaultLevel: number;
	fullname: string;
	gameType: GameType;
	gen: number;
	id: string;
	maxLevel: number;
	mod: string;
	num: number;
	quickFormat: boolean;
	ruleset: string[];
	separatedCustomRules: ISeparatedCustomRules | null;
	tournamentPlayable: boolean;
	unbanlist: string[];
	unranked: boolean;
	battle?: any;
	pokemon?: any;
	// queue?: ModdedBattleQueue;
	field?: any;
	cannotMega?: string[];
	challengeShow?: boolean;
	debug?: boolean;
	desc?: string;
	forcedLevel?: number;
	maxForcedLevel?: number;
	rated?: boolean;
	minSourceGen?: number;
	restricted?: string[];
	searchShow?: boolean;
	team?: string;
	teamLength?: {validate?: [number, number]; battle?: number};
	threads?: string[];
	timer?: Partial<any>;
	tournamentShow?: boolean;
	section?: string;
	column?: number;
	hasCheckLearnset?: boolean;
}
/* eslint-enable */

export interface IFormatLinks {
	aliases?: string[];
	desc?: string;
	generator?: string;
	info?: string;
	'info-official'?: string;
	np?: string;
	'np-official'?: string;
	roleCompendium?: string;
	teams?: string;
	userHosted?: boolean;
	viability?: string;
	'viability-official'?: string;
}

export interface ISeparatedCustomRules {
	bans: string[];
	unbans: string[];
	addedrules: string[];
	removedrules: string[];
}

export interface IFormat extends IBasicEffect, IFormatData, IFormatLinks {
	desc: string;
	inputTarget: string;
	ruleTable?: RuleTable;
}

interface ITypeData {
	damageTaken: {[attackingTypeNameOrEffectid: string]: number};
	gen: number;
	HPdvs: SparseStatsTable;
	HPivs: SparseStatsTable;
	id: string;
	name: string;
}

export interface INature {
	name: string;
	plus?: string;
	minus?: string;
}

export interface IGifData {
	back?: {h: number; w: number};
	front?: {h: number; w: number};
}

export interface IDataTable {
	readonly abilityKeys: readonly string[];
	readonly aliases: Readonly<Dict<string | undefined>>;
	readonly alternateIconNumbers: Readonly<{left: Dict<number | undefined>, right: Dict<number | undefined>}>;
	readonly badges: readonly string[];
	readonly categories: Readonly<Dict<string | undefined>>;
	readonly characters: readonly string[];
	readonly colors: Readonly<Dict<string>>;
	readonly eggGroups: Readonly<Dict<string>>;
	readonly formatKeys: readonly string[];
	readonly gifData: Readonly<Dict<IGifData | undefined>>;
	readonly gifDataBW: Readonly<Dict<IGifData | undefined>>;
	readonly itemKeys: readonly string[];
	readonly learnsetDataKeys: readonly string[];
	readonly locations: readonly string[];
	readonly moveKeys: readonly string[];
	readonly natures: Readonly<Dict<INature | undefined>>;
	readonly pokemonKeys: readonly string[];
	readonly trainerClasses: readonly string[];
	readonly typeKeys: readonly string[];
}

import { RuleTable } from "../dex";

/**
 * Some types imported from:
 * Pokemon Showdown - https://github.com/smogon/pokemon-showdown
 */

type GenderName = 'M' | 'F' | 'N' | '';
type StatNameExceptHP = 'atk' | 'def' | 'spa' | 'spd' | 'spe';
type StatName = 'hp' | StatNameExceptHP;
type StatsExceptHPTable = {[stat in StatNameExceptHP]: number};
type StatsTable = {[stat in StatName]: number };
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
type MoveTarget = 'adjacentAlly' | 'adjacentAllyOrSelf' | 'adjacentFoe' | 'all' | 'allAdjacent' | 'allAdjacentFoes' | 'allies' | 'allySide' | 'allyTeam' | 'any' | 'foeSide' | 'normal' |
	'randomNormal' | 'scripted' | 'self';

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

interface ISelfEffect {
	boosts?: SparseBoostsTable;
	chance?: number;
	pseudoWeather?: string;
	sideCondition?: string;
	slotCondition?: string;
	terrain?: string;
	volatileStatus?: string;
	weather?: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onHit?: () => any;
}

interface ISecondaryEffect {
	chance?: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	ability?: any;
	boosts?: SparseBoostsTable;
	dustproof?: boolean;
	kingsrock?: boolean;
	self?: ISelfEffect;
	status?: string;
	volatileStatus?: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onHit?: () => any;
}

interface IEffectData {
	id: string;
	name: string;
	num: number;
	affectsFainted?: boolean;
	counterMax?: number;
	desc?: string;
	drain?: [number, number];
	duration?: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	effect?: any;
	effectType?: string;
	infiltrates?: boolean;
	isNonstandard?: Nonstandard | null;
	/**
	 * `true` for generic Z-moves like Gigavolt Havoc.
	 * Also `true` for Z-powered status moves like Z-Encore.
	 * Move ID of the base move, for specific Z-moves like Stoked
	 * Sparksurfer.
	 */
	isZ?: boolean | string;
	/**
	 * `true` for Max moves like Max Airstream. If its a G-Max moves, this is
	 * the species ID of the Gigantamax Pokemon that can use this G-Max move.
	 */
	isMax?: boolean | string;
	noCopy?: boolean;
	recoil?: [number, number];
	secondary?: ISecondaryEffect | null;
	secondaries?: ISecondaryEffect[] | null;
	self?: ISelfEffect | null;
	shortDesc?: string;
	status?: string;
	weather?: string;
}

type EffectType = 'Effect' | 'Pokemon' | 'Move' | 'Item' | 'Ability' | 'Format' | 'Ruleset' | 'Weather' | 'Status' | 'Rule' | 'ValidatorRule';

interface IBasicEffect extends IEffectData {
	id: string;
	weather?: string;
	status?: string;
	effectType: EffectType;
	gen: number;
}

interface IAbilityData extends IEffectData {
	rating: number;
	isUnbreakable?: boolean;
	suppressWeather?: boolean;
}

export interface IAbilityComputed {
	effectType: "Ability";
	gen: number;
	id: string;
	isNonstandard: Nonstandard | null;
}

interface IAbilityCopy extends IBasicEffect, IAbilityData, IAbilityComputed {
	readonly effectType: 'Ability';
	isNonstandard: Nonstandard | null;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IAbility extends DeepReadonly<IAbilityCopy> {}

export type FormatEffectType = 'Format' | 'Ruleset' | 'Rule' | 'ValidatorRule';
type GameType = 'singles' | 'doubles' | 'triples' | 'rotation' | 'multi' | 'free-for-all';
type SideID = 'p1' | 'p2' | 'p3' | 'p4';

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface IFormatData {
	name: string;
	banlist?: string[];
	baseRuleset?: string[];
	battle?: any;
	pokemon?: any;
	cannotMega?: string[];
	challengeShow?: boolean;
	debug?: boolean;
	defaultLevel?: number;
	desc?: string;
	effectType?: FormatEffectType;
	forcedLevel?: number;
	gameType?: GameType;
	maxForcedLevel?: number;
	maxLevel?: number;
	mod?: string;
	onBasePowerPriority?: number;
	onModifyMovePriority?: number;
	onModifyTypePriority?: number;
	onSwitchInPriority?: number;
	rated?: boolean;
	minSourceGen?: number;
	restricted?: string[];
	ruleset?: string[];
	searchShow?: boolean;
	team?: string;
	teamLength?: {validate?: [number, number]; battle?: number};
	threads?: string[];
	timer?: Dict<any>;
	tournamentShow?: boolean;
	unbanlist?: string[];
	checkLearnset?: (
		this: any, move: any, species: any, setSources: any, set: any
	) => {type: string; [any: string]: any} | null;
	onAfterMega?: (this: any, pokemon: any) => void;
	onBegin?: (this: any) => void;
	onChangeSet?: (
		this: any, set: any, format: any, setHas?: any, teamHas?: any
	) => string[] | void;
	onModifySpecies?: (
		this: any, species: any, target?: any, source?: any, effect?: any
	) => any | void;
	onStart?: (this: any) => void;
	onTeamPreview?: (this: any) => void;
	onValidateSet?: (
		this: any, set: any, format: any, setHas: any, teamHas: any
	) => string[] | void;
	onValidateTeam?: (this: any, team: any[], format: any, teamHas: any) => string[] | void;
	validateSet?: (this: any, set: any, teamHas: any) => string[] | null;
	validateTeam?: (this: any, team: any[], options?: {
		removeNicknames?: boolean; skipSets?: {[name: string]: {[key: string]: boolean}};}) => string[] | void;
	trunc?: (n: number) => number;
	section?: string;
	column?: number;
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

export interface IFormatComputed {
	banlist: NonNullable<IFormatData["banlist"]>;
	baseRuleset: string[];
	customRules: string[] | null;
	defaultLevel: number;
	effectType: FormatEffectType;
	gameType: GameType;
	gen: number;
	id: string;
	inputTarget: string;
	maxLevel: number;
	mod: string;
	num: number;
	quickFormat: boolean;
	ruleset: NonNullable<IFormatData["ruleset"]>;
	ruleTable: RuleTable | null;
	separatedCustomRules: ISeparatedCustomRules | null;
	tournamentPlayable: boolean;
	unbanlist: NonNullable<IFormatData["unbanlist"]>;
	unranked: boolean;
}

export interface IFormat extends IBasicEffect, IFormatData, IFormatLinks, IFormatComputed {
	readonly effectType: FormatEffectType;
	baseRuleset: string[];
	banlist: string[];
	customRules: string[] | null;
	defaultLevel: number;
	gameType: GameType;
	maxLevel: number;
	mod: string;
	ruleset: string[];
	unbanlist: string[];
}

interface IFlingData {
	basePower: number;
	status?: string;
	volatileStatus?: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	effect?: () => any;
}

export interface IItemData extends IEffectData {
	gen: number;
	fling?: IFlingData;
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

export interface IItemComputed {
	effectType: "Item";
	fling?: IFlingData;
	gen: number;
	id: string;
	isNonstandard: Nonstandard | null;
}

export interface IItemCopy extends IBasicEffect, IItemData, IItemComputed {
	readonly effectType: 'Item';
	isNonstandard: Nonstandard | null;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IItem extends DeepReadonly<IItemCopy> {}

export interface IMoveData extends IEffectData {
	accuracy: true | number;
	basePower: number;
	category: 'Physical' | 'Special' | 'Status';
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	flags: Dict<any>;
	pp: number;
	priority: number;
	target: MoveTarget;
	type: string;
	alwaysHit?: boolean;
	baseMoveType?: string;
	basePowerModifier?: number;
	boosts?: SparseBoostsTable | false;
	breaksProtect?: boolean;
	contestType?: string;
	critModifier?: number;
	critRatio?: number;
	damage?: number | 'level' | false | null;
	defensiveCategory?: 'Physical' | 'Special' | 'Status';
	forceSwitch?: boolean;
	hasCustomRecoil?: boolean;
	heal?: number[] | null;
	ignoreAbility?: boolean;
	ignoreAccuracy?: boolean;
	ignoreDefensive?: boolean;
	ignoreEvasion?: boolean;
	ignoreImmunity?: boolean | {[k: string]: boolean};
	ignoreNegativeOffensive?: boolean;
	ignoreOffensive?: boolean;
	ignorePositiveDefensive?: boolean;
	ignorePositiveEvasion?: boolean;
	isSelfHit?: boolean;
	isFutureMove?: boolean;
	isViable?: boolean;
	isMax?: boolean | string;
	mindBlownRecoil?: boolean;
	multiaccuracy?: boolean;
	multihit?: number | number[];
	multihitType?: string;
	noDamageVariance?: boolean;
	noFaint?: boolean;
	noMetronome?: string[];
	nonGhostTarget?: string;
	noPPBoosts?: boolean;
	noSketch?: boolean;
	ohko?: boolean | string;
	pressureTarget?: string;
	pseudoWeather?: string;
	selfBoost?: {boosts?: SparseBoostsTable};
	selfdestruct?: string | boolean;
	selfSwitch?: string | boolean;
	sideCondition?: string;
	sleepUsable?: boolean;
	slotCondition?: string;
	spreadModifier?: number;
	stallingMove?: boolean;
	stealsBoosts?: boolean;
	struggleRecoil?: boolean;
	terrain?: string;
	thawsTarget?: boolean;
	/**
	 * Tracks the original target through Ally Switch and other switch-out-and-back-in
	 * situations, rather than just targeting a slot. (Stalwart, Snipe Shot)
	 */
	tracksTarget?: boolean;
	/**
	 * Will change target if current target is unavailable. (Dragon Darts)
	 */
	smartTarget?: boolean;
	useTargetOffensive?: boolean;
	useSourceDefensiveAsOffensive?: boolean;
	volatileStatus?: string;
	weather?: string;
	willCrit?: boolean;
	forceSTAB?: boolean;
	zMovePower?: number;
	zMoveEffect?: string;
	zMoveBoost?: SparseBoostsTable;
	gmaxPower?: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	basePowerCallback?: (this: any, pokemon: any, target: any, move: any) => number | false | null;
	baseMove?: string;
	/**
	 * Has this move been boosted by a Z-crystal? Usually the same as
	 * `isZ`, but hacked moves will have this be `false` and `isZ` be
	 * truthy.
	 */
	isZPowered?: boolean;
	/**
	 * Same idea has `isZPowered`. Hacked Max moves will have this be
	 * `false` and `isMax` be truthy.
	 */
	maxPowered?: boolean;
}

export interface IMoveComputed {
	baseMoveType: string;
	effectType: "Move";
	gen: number;
	gmaxPower?: number;
	ignoreImmunity: IMoveData["ignoreImmunity"];
	isNonstandard: Nonstandard | null;
	zMovePower?: number;
}

export interface IMoveCopy extends IBasicEffect, IMoveData, IMoveComputed {
	readonly effectType: "Move";
	baseMoveType: string;
	ignoreImmunity: IMoveData["ignoreImmunity"];
	isNonstandard: Nonstandard | null;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IMove extends DeepReadonly<IMoveCopy> {}

interface ISpeciesAbility {
	0: string;
	1?: string;
	H?: string;
	S?: string;
}

export interface ISpeciesData {
	abilities: ISpeciesAbility;
	baseStats: StatsTable;
	canHatch?: boolean;
	color: string;
	eggGroups: string[];
	heightm: number;
	num: number;
	name: string;
	types: string[];
	weightkg: number;
	baseForme?: string;
	baseSpecies?: string;
	evoLevel?: number;
	evoMove?: string;
	evoCondition?: string;
	evoItem?: string;
	evos?: string[];
	evoType?: 'trade' | 'useItem' | 'levelMove' | 'levelExtra' | 'levelFriendship' | 'levelHold' | 'other';
	forme?: string;
	gender?: GenderName;
	genderRatio?: {[k: string]: number};
	maxHP?: number;
	cosmeticFormes?: string[];
	otherFormes?: string[];
	prevo?: string;
	gen?: number;
	requiredAbility?: string;
	requiredItem?: string;
	requiredItems?: string[];
	requiredMove?: string;
	battleOnly?: string | string[];
	isGigantamax?: string;
	inheritsFrom?: string;
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

interface ILearnsetData {
	learnset?: Dict<MoveSource[]>;
	eventData?: IEventInfo[];
	eventOnly?: boolean;
	encounters?: IEventInfo[];
}

export interface IPokemonComputed {
	baseForme: string;
	baseSpecies: string;
	battleOnly?: string | string[];
	category: string;
	effectType: "Pokemon";
	evos: string[];
	forme: string;
	gen: number;
	genderRatio: NonNullable<ISpeciesData["genderRatio"]>;
	id: string;
	inheritsFrom?: string;
	isForme: boolean;
	isMega: boolean;
	isNonstandard: Nonstandard | null;
	isPrimal: boolean;
	name: string;
	nfe: boolean;
	requiredItems: string[] | undefined;
	shiny: boolean;
	speciesid: string;
	spriteId: string;
	tier: string;
}

export interface IPokemonCopy extends IBasicEffect, ISpeciesData, ISpeciesFormatsData, IPokemonComputed {
	readonly effectType: "Pokemon";
	baseForme: string;
	baseSpecies: string;
	evos: string[];
	forme: string;
	gen: number;
	genderRatio: NonNullable<ISpeciesData["genderRatio"]>;
	isNonstandard: Nonstandard | null;
	requiredItems: string[] | undefined;
	tier: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IPokemon extends DeepReadonly<IPokemonCopy> {}

interface ITypeData {
	damageTaken: {[attackingTypeNameOrEffectid: string]: number};
	HPdvs?: SparseStatsTable;
	HPivs?: SparseStatsTable;
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
	readonly abilities: Dict<IAbilityData | undefined>;
	readonly aliases: Dict<string | undefined>;
	readonly badges: string[];
	readonly categories: Dict<string | undefined>;
	readonly characters: string[];
	readonly colors: Dict<string>;
	readonly eggGroups: Dict<string>;
	readonly formats: Dict<(IFormatData & IFormatLinks) | undefined>;
	readonly formatsData: Dict<ISpeciesFormatsData | undefined>;
	readonly gifData: Dict<IGifData | undefined>;
	readonly gifDataBW: Dict<IGifData | undefined>;
	readonly items: Dict<IItemData | undefined>;
	readonly learnsets: Dict<ILearnsetData | undefined>;
	readonly locations: string[];
	readonly moves: Dict<IMoveData | undefined>;
	readonly natures: Dict<INature | undefined>;
	readonly pokedex: Dict<ISpeciesData | undefined>;
	readonly trainerClasses: string[];
	readonly typeChart: Dict<ITypeData | undefined>;
	readonly types: Dict<string>;
}

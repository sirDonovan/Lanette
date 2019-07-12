import { RuleTable } from "../dex";

/**
 * Some types imported from:
 * Pokemon Showdown - https://github.com/Zarel/Pokemon-Showdown
 */

// tslint:disable-next-line interface-over-type-literal
type StatsTable = {hp: number, atk: number, def: number, spa: number, spd: number, spe: number};
type SparseStatsTable = Partial<StatsTable>;
// tslint:disable-next-line interface-over-type-literal
type BoostsTable = {atk: number, def: number, spa: number, spd: number, spe: number, accuracy: number, evasion: number};
type SparseBoostsTable = Partial<BoostsTable>;

interface IEventMethods {
	/** Return true to stop the move from being used */
	beforeMoveCallback?: (this: any, pokemon: any, target: any | null, move: any) => boolean | void;
	beforeTurnCallback?: (this: any, pokemon: any, target: any) => void;
	damageCallback?: (this: any, pokemon: any, target: any) => number | false;
	durationCallback?: (this: any, target: any, source: any, effect: any | null) => number;
	onAfterDamage?: (this: any, damage: number, target: any, soruce: any, move: any) => void;
	onAfterEachBoost?: (this: any, boost: SparseBoostsTable, target: any, source: any) => void;
	onAfterHit?: (this: any, source: any, target: any, move: any) => void;
	onAfterSetStatus?: (this: any, status: any, target: any, source: any, effect: any) => void;
	onAfterSubDamage?: (this: any, damage: any, target: any, source: any, move: any) => void;
	onAfterSwitchInSelf?: (this: any, pokemon: any) => void;
	onAfterUseItem?: (this: any, item: any, pokemon: any) => void;
	onAfterBoost?: (this: any, boost: SparseBoostsTable, target: any, source: any, effect: any) => void;
	onAfterMoveSecondarySelf?: (this: any, source: any, target: any, move: any) => void;
	onAfterMoveSecondary?: (this: any, target: any, source: any, move: any) => void;
	onAfterMove?: (this: any, pokemon: any, target: any, move: any) => void;
	onAfterMoveSelf?: (this: any, pokemon: any) => void;
	onAllyTryAddVolatile?: (this: any, status: any, target: any, source: any, effect: any) => void;
	onAllyBasePower?: (this: any, basePower: number, attacker: any, defender: any, move: any) => void;
	onAllyModifyAtk?: (this: any, atk: number) => void;
	onAllyModifySpD?: (this: any, spd: number) => void;
	onAllyBoost?: (this: any, boost: SparseBoostsTable, target: any, source: any, effect: any) => void;
	onAllySetStatus?: (this: any, status: any, target: any, source: any, effect: any) => void;
	onAllyTryHitSide?: (this: any, target: any, source: any, move: any) => void;
	onAllyFaint?: (this: any, target: any) => void;
	onAllyAfterUseItem?: (this: any, item: any, pokemon: any) => void;
	onAllyModifyMove?: (this: any, move: any) => void;
	onAnyTryPrimaryHit?: (this: any, target: any, source: any, move: any) => void;
	onAnyTryMove?: (this: any, target: any, source: any, move: any) => void;
	onAnyDamage?: (this: any, damage: number, target: any, source: any, effect: any) => void;
	onAnyBasePower?: (this: any, basePower: number, source: any, target: any, move: any) => void;
	onAnySetWeather?: (this: any, target: any, source: any, weather: any) => void;
	onAnyModifyDamage?: (this: any, damage: number, source: any, target: any, move: any) => void;
	onAnyRedirectTarget?: (this: any, target: any, source: any, source2: any, move: any) => void;
	onAnyAccuracy?: (this: any, accuracy: number, target: any, source: any, move: any) => void;
	onAnyTryImmunity?: (this: any, target: any, source: any, move: any) => void;
	onAnyFaint?: (this: any) => void;
	onAnyModifyBoost?: (this: any, boosts: SparseBoostsTable, target: any) => void;
	onAnyDragOut?: (this: any, pokemon: any) => void;
	onAnySetStatus?: (this: any, status: any, pokemon: any) => void;
	onAttract?: (this: any, target: any, source: any, effect: any) => void;
	onAccuracy?: (this: any, accuracy: number, target: any, source: any, move: any) => number | boolean | null | void;
	onBasePower?: (this: any, basePower: number, pokemon: any, target: any, move: any) => void;
	onTryImmunity?: (this: any, target: any, source: any, move: any) => void;
	onBeforeFaint?: (this: any, pokemon: any) => void;
	onBeforeMove?: (this: any, attacker: any, defender: any, move: any) => void;
	onBeforeSwitchIn?: (this: any, pokemon: any) => void;
	onBeforeSwitchOut?: (this: any, pokemon: any) => void;
	onBeforeTurn?: (this: any, pokemon: any) => void;
	onBoost?: (this: any, boost: SparseBoostsTable, target: any, source: any, effect: any) => void;
	onChargeMove?: (this: any, pokemon: any, target: any, move: any) => void;
	onCheckShow?: (this: any, pokemon: any) => void;
	onCopy?: (this: any, pokemon: any) => void;
	onDamage?: (this: any, damage: number, target: any, source: any, effect: any) => void;
	onDeductPP?: (this: any, target: any, source: any) => number | void;
	onDisableMove?: (this: any, pokemon: any) => void;
	onDragOut?: (this: any, pokemon: any) => void;
	onEat?: ((this: any, pokemon: any) => void) | false;
	onEatItem?: (this: any, item: any, pokemon: any) => void;
	onEffectiveness?: (this: any, typeMod: number, target: any | null, type: string, move: any) => void;
	onEnd?: (this: any, pokemon: any) => void;
	onFaint?: (this: any, target: any, source: any, effect: any) => void;
	onFlinch?: ((this: any, pokemon: any) => void) | boolean;
	onFoeAfterDamage?: (this: any, damage: number, target: any) => void;
	onFoeBasePower?: (this: any, basePower: number, attacker: any, defender: any, move: any) => void;
	onFoeBeforeMove?: (this: any, attacker: any, defender: any, move: any) => void;
	onFoeDisableMove?: (this: any, pokemon: any) => void;
	onFoeMaybeTrapPokemon?: (this: any, pokemon: any, source: any) => void;
	onFoeModifyDef?: (this: any, def: number, pokemon: any) => number;
	onFoeRedirectTarget?: (this: any, target: any, source: any, source2: any, move: any) => void;
	onFoeSwitchOut?: (this: any, pokemon: any) => void;
	onFoeTrapPokemon?: (this: any, pokemon: any) => void;
	onFoeTryMove?: (this: any, target: any, source: any, move: any) => void;
	onHit?: (this: any, target: any, source: any, move: any) => void;
	onHitField?: (this: any, target: any, source: any, move: any) => boolean | void;
	onHitSide?: (this: any, side: any, source: any, move: any) => void;
	onImmunity?: (this: any, type: string, pokemon: any) => void;
	onLockMove?: string | ((this: any, pokemon: any) => void);
	onLockMoveTarget?: (this: any) => number;
	onModifyAccuracy?: (this: any, accuracy: number, target: any, source: any, move: any) => number | void;
	onModifyAtk?: (this: any, atk: number, attacker: any, defender: any, move: any) => number | void;
	onModifyBoost?: (this: any, boosts: SparseBoostsTable) => void;
	onModifyCritRatio?: (this: any, critRatio: number, source: any, target: any) => number | void;
	onModifyDamage?: (this: any, damage: number, source: any, target: any, move: any) => number | void;
	onModifyDef?: (this: any, def: number, pokemon: any) => number | void;
	onModifyMove?: (this: any, move: any, pokemon: any, target: any) => void;
	onModifyPriority?: (this: any, priority: number, pokemon: any, target: any, move: any) => number | void;
	onModifySecondaries?: (this: any, secondaries: any[], target: any, source: any, move: any) => void;
	onModifySpA?: (this: any, atk: number, attacker: any, defender: any, move: any) => number | void;
	onModifySpD?: (this: any, spd: number, pokemon: any) => number | void;
	onModifySpe?: (this: any, spe: number, pokemon: any) => number | void;
	onModifyWeight?: (this: any, weight: number, pokemon: any) => number | void;
	onMoveAborted?: (this: any, pokemon: any, target: any, move: any) => void;
	onMoveFail?: (this: any, target: any, source: any, move: any) => void;
	onNegateImmunity?: ((this: any, pokemon: any, type: string) => void) | boolean;
	onOverrideAction?: (this: any, pokemon: any, target: any, move: any) => void;
	onPrepareHit?: (this: any, source: any, target: any, move: any) => void;
	onPreStart?: (this: any, pokemon: any) => void;
	onPrimal?: (this: any, pokemon: any) => void;
	onRedirectTarget?: (this: any, target: any, source: any, source2: any) => void;
	onResidual?: (this: any, target: any, source: any, effect: any) => void;
	onRestart?: (this: any, pokemon: any, source: any) => void;
	onSetAbility?: (this: any, ability: string, target: any, source: any, effect: any) => void;
	onSetStatus?: (this: any, status: any, target: any, source: any, effect: any) => void;
	onSourceAccuracy?: (this: any, accuracy: number, target: any, source: any, move: any) => void;
	onSourceBasePower?: (this: any, basePower: number, attacker: any, defender: any, move: any) => void;
	onSourceFaint?: (this: any, target: any, source: any, effect: any) => void;
	onSourceHit?: (this: any, target: any, source: any, move: any) => void;
	onSourceModifyAccuracy?: (this: any, accuracy: number, target: any, source: any) => number | void;
	onSourceModifyAtk?: (this: any, atk: number, attacker: any, defender: any, move: any) => number | void;
	onSourceModifyDamage?: (this: any, damage: number, source: any, target: any, move: any) => number | void;
	onSourceModifySecondaries?: (this: any, secondaries: any[], target: any, source: any, move: any) => void;
	onSourceModifySpA?: (this: any, atk: number, attacker: any, defender: any, move: any) => number | void;
	onSourceTryHeal?: (this: any, damage: number, target: any, source: any, effect: any) => void;
	onSourceTryPrimaryHit?: (this: any, target: any, source: any, move: any) => void;
	onStallMove?: (this: any, pokemon: any) => void;
	onStart?: (this: any, target: any, source: any, effect: any, move: any) => void;
	onSwitchIn?: (this: any, pokemon: any) => void;
	onSwitchOut?: (this: any, pokemon: any) => void;
	onTakeItem?: ((this: any, item: any, pokemon: any, source: any) => void) | false;
	onTerrain?: (this: any, pokemon: any) => void;
	onTrapPokemon?: (this: any, pokemon: any) => void;
	onTry?: (this: any, attacker: any, defender: any, move: any) => void;
	onTryAddVolatile?: (this: any, status: any, target: any, source: any, effect: any) => void;
	onTryEatItem?: (this: any, item: any, pokemon: any) => void;
	onTryHeal?: ((this: any, damage: number, target: any, source: any, effect: any) => void) | boolean;
	onTryHit?: ((this: any, pokemon: any, target: any, move: any) => void) | boolean;
	onTryHitField?: (this: any, target: any, source: any) => boolean | void;
	onTryHitSide?: (this: any, side: any, source: any) => void;
	onTryMove?: (this: any, pokemon: any, target: any, move: any) => void;
	onTryPrimaryHit?: (this: any, target: any, source: any, move: any) => void;
	onType?: (this: any, types: string[], pokemon: any) => void;
	onUpdate?: (this: any, pokemon: any) => void;
	onUseMoveMessage?: (this: any, pokemon: any, target: any, move: any) => void;
	onWeather?: (this: any, target: any, source: any, effect: any) => void;
	onWeatherModifyDamage?: (this: any, damage: number, attacker: any, defender: any, move: any) => number | void;
	onAnyModifyDamagePhase1?: (this: any, damage: number, source: any, target: any, move: any) => number | void;
	onAnyModifyDamagePhase2?: IEventMethods["onAnyModifyDamagePhase1"];
	onModifyDamagePhase1?: IEventMethods["onAnyModifyDamagePhase1"];
	onModifyDamagePhase2?: IEventMethods["onAnyModifyDamagePhase1"];
}

interface ISecondaryEffect {
	status?: string;
	volatileStatus?: string;
}

interface IEffectData extends IEventMethods {
	id: string;
	name: string;
	num: number;
	affectsFainted?: boolean;
	counterMax?: number;
	desc?: string;
	drain?: number[];
	duration?: number;
	effect?: Partial<IEffectData>;
	effectType?: string;
	infiltrates?: boolean;
	isNonstandard?: boolean | string;
	isUnreleased?: boolean;
	/**
	 * `true` for generic Z-moves like Gigavolt Havoc.
	 * Also `true` for Z-powered status moves like Z-Encore.
	 * Move ID of the base move, for specific Z-moves like Stoked
	 * Sparksurfer.
	 */
	isZ?: boolean | string;
	noCopy?: boolean;
	onAccuracyPriority?: number;
	onAfterDamageOrder?: number;
	onAfterMoveSecondaryPriority?: number;
	onAfterMoveSecondarySelfPriority?: number;
	onAfterMoveSelfPriority?: number;
	onAnyFaintPriority?: number;
	onAttractPriority?: number;
	onBasePowerPriority?: number;
	onBeforeMovePriority?: number;
	onBeforeSwitchOutPriority?: number;
	onBoostPriority?: number;
	onCriticalHit?: boolean;
	onDamagePriority?: number;
	onDragOutPriority?: number;
	onFoeBeforeMovePriority?: number;
	onFoeModifyDefPriority?: number;
	onFoeRedirectTargetPriority?: number;
	onFoeTrapPokemonPriority?: number;
	onFoeTryEatItem?: boolean;
	onHitPriority?: number;
	onModifyAccuracyPriority?: number;
	onModifyAtkPriority?: number;
	onModifyCritRatioPriority?: number;
	onModifyDefPriority?: number;
	onModifyMovePriority?: number;
	onModifyPriorityPriority?: number;
	onModifySpAPriority?: number;
	onModifySpDPriority?: number;
	onModifyWeightPriority?: number;
	onRedirectTargetPriority?: number;
	onResidualOrder?: number;
	onResidualPriority?: number;
	onResidualSubOrder?: number;
	onSwitchInPriority?: number;
	onTrapPokemonPriority?: number;
	onTryHealPriority?: number;
	onTryHitPriority?: number;
	onTryMovePriority?: number;
	onTryPrimaryHitPriority?: number;
	onTypePriority?: number;
	recoil?: [number, number];
	secondary?: ISecondaryEffect | null;
	shortDesc?: string;
	status?: string;
	weather?: string;
}

export interface IAbilityData extends IEffectData {
	effectType: 'Ability';
	rating: number;
	isUnbreakable?: boolean;
	suppressWeather?: boolean;
}

export interface IAbilityComputed {
	effectType: "Ability";
	gen: number;
	id: string;
}

export interface IAbilityCopy extends IAbilityData, IAbilityComputed {}
export interface IAbility extends DeepReadonly<IAbilityCopy> {}

export interface IFormatData extends IEventMethods {
	effectType: "Format" | "Ruleset" | "Rule" | "ValidatorRule";
	name: string;
	banlist?: string[];
	cannotMega?: string[];
	canUseRandomTeam?: boolean;
	challengeShow?: boolean;
	debug?: boolean;
	defaultLevel?: number;
	desc?: string;
	forcedLevel?: number;
	gameType?: 'singles' | 'doubles' | 'triples' | 'rotation';
	maxForcedLevel?: number;
	maxLevel?: number;
	mod?: string;
	noChangeAbility?: boolean;
	noChangeForme?: boolean;
	onBasePowerPriority?: number;
	onModifyMovePriority?: number;
	onStartPriority?: number;
	onSwitchInPriority?: number;
	rated?: boolean;
	requirePentagon?: boolean;
	requirePlus?: boolean;
	restrictedAbilities?: string[];
	restrictedMoves?: string[];
	restrictedStones?: string[];
	ruleset?: string[];
	searchShow?: boolean;
	team?: string;
	teamLength?: {validate?: [number, number], battle?: number};
	threads?: string[];
	timer?: {starting?: number, perTurn?: number, maxPerTurn?: number, maxFirstTurn?: number, timeoutAutoChoose?: boolean, accelerate?: boolean};
	tournamentShow?: boolean;
	unbanlist?: string[];
	checkLearnset?: (this: any, move: any, template: any, lsetData: any, set: any) => {type: string, [k: string]: any} | null;
	onAfterMega?: (this: any, pokemon: any) => void;
	onBegin?: (this: any) => void;
	onChangeSet?: (this: any, set: any, format: any, setHas?: any, teamHas?: any) => string[] | void;
	onModifyTemplate?: (this: any, template: any, target: any, source: any) => any | void;
	onTeamPreview?: (this: any) => void;
	onValidateSet?: (this: any, set: any, format: any, setHas: any, teamHas: any) => string[] | void;
	onValidateTeam?: (this: any, team: any[], format: any, teamHas: any) => string[] | void;
	validateSet?: (this: any, set: any, teamHas: any) => string[] | void;
	validateTeam?: (this: any, team: any[], removeNicknames: boolean) => string[] | void;
	section?: string;
	column?: number;
}

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
	customRules: string[] | null;
	defaultLevel: number;
	effectType: "Format" | "Ruleset" | "Rule" | "ValidatorRule";
	id: string;
	maxLevel: number;
	ruleset: NonNullable<IFormatData["ruleset"]>;
	ruleTable: RuleTable | null;
	tournamentPlayable: boolean;
	separatedCustomRules: ISeparatedCustomRules | null;
	unbanlist: NonNullable<IFormatData["unbanlist"]>;
	unranked: boolean;
}

export interface IFormat extends IFormatData, IFormatLinks, IFormatComputed {
	banlist: NonNullable<IFormatData["banlist"]>;
	defaultLevel: number;
	maxLevel: number;
	ruleset: NonNullable<IFormatData["ruleset"]>;
	unbanlist: NonNullable<IFormatData["unbanlist"]>;
}

export interface IFlingData {
	basePower: number;
	status?: string;
	volatileStatus?: string;
}

export interface IItemData extends IEffectData {
	effectType: 'Item';
	gen: number;
	fling?: IFlingData;
	forcedForme?: string;
	ignoreKlutz?: boolean;
	isBerry?: boolean;
	isChoice?: boolean;
	isGem?: boolean;
	megaStone?: string;
	megaEvolves?: string;
	naturalGift?: {basePower: number, type: string};
	onDrive?: string;
	onMemory?: string;
	onPlate?: string;
	spritenum?: number;
	zMove?: string | true;
	zMoveFrom?: string;
	zMoveType?: string;
	zMoveUser?: string[];
}

export interface IItemComputed {
	effectType: "Item";
	fling?: IFlingData;
	gen: number;
	id: string;
}

export interface IItemCopy extends IItemData, IItemComputed {}
export interface IItem extends DeepReadonly<IItemCopy> {}

export interface IMoveFlags {
	/** Ignores a target's substitute. */
	authentic?: 1;
	/** Power is multiplied by 1.5 when used by a Pokemon with the Ability Strong Jaw. */
	bite?: 1;
	/** Has no effect on Pokemon with the Ability Bulletproof. */
	bullet?: 1;
	/** The user is unable to make a move between turns. */
	charge?: 1;
	/** Makes contact. */
	contact?: 1;
	/** When used by a Pokemon, other Pokemon with the Ability Dancer can attempt to execute the same move. */
	dance?: 1;
	/** Thaws the user if executed successfully while the user is frozen. */
	defrost?: 1;
	/** Can target a Pokemon positioned anywhere in a Triple Battle. */
	distance?: 1;
	/** Prevented from being executed or selected during Gravity's effect. */
	gravity?: 1;
	/** Prevented from being executed or selected during Heal Block's effect. */
	heal?: 1;
	/** Can be copied by Mirror Move. */
	mirror?: 1;
	/** Unknown effect. */
	mystery?: 1;
	/** Prevented from being executed or selected in a Sky Battle. */
	nonsky?: 1;
	/** Has no effect on Grass */
	powder?: 1;
	/** Blocked by Detect, Protect, Spiky Shield, and if not a Status move, King's Shield. */
	protect?: 1;
	/** Power is multiplied by 1.5 when used by a Pokemon with the Ability Mega Launcher. */
	pulse?: 1;
	/** Power is multiplied by 1.2 when used by a Pokemon with the Ability Iron Fist. */
	punch?: 1;
	/** If this move is successful, the user must recharge on the following turn and cannot make a move. */
	recharge?: 1;
	/** Bounced back to the original user by Magic Coat or the Ability Magic Bounce. */
	reflectable?: 1;
	/** Can be stolen from the original user and instead used by another Pokemon using Snatch. */
	snatch?: 1;
	/** Has no effect on Pokemon with the Ability Soundproof. */
	sound?: 1;
}

export interface IMoveData extends IEffectData {
	effectType: 'Move';
	accuracy: true | number;
	basePower: number;
	category: 'Physical' | 'Special' | 'Status';
	flags: IMoveFlags;
	pp: number;
	priority: number;
	target: string;
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
	spreadModifier?: number;
	stallingMove?: boolean;
	stealsBoosts?: boolean;
	struggleRecoil?: boolean;
	terrain?: string;
	thawsTarget?: boolean;
	useTargetOffensive?: boolean;
	useSourceDefensive?: boolean;
	volatileStatus?: string;
	weather?: string;
	willCrit?: boolean;
	forceSTAB?: boolean;
	zMovePower?: number;
	zMoveEffect?: string;
	zMoveBoost?: SparseBoostsTable;
}

export interface IMoveComputed {
	baseMoveType: string;
	effectType: "Move";
	gen: number;
	ignoreImmunity: IMoveData["ignoreImmunity"];
}

export interface IMoveCopy extends IMoveData, IMoveComputed {
	baseMoveType: string;
	ignoreImmunity: IMoveData["ignoreImmunity"];
}
export interface IMove extends DeepReadonly<IMoveCopy> {}

// tslint:disable-next-line interface-over-type-literal
type TemplateAbility = {0: string, 1?: string, H?: string, S?: string};

export interface ITemplateData {
	effectType: 'Pokemon';
	abilities: TemplateAbility;
	baseStats: StatsTable;
	color: string;
	eggGroups: string[];
	heightm: number;
	num: number;
	species: string;
	types: string[];
	weightkg: number;
	baseForme?: string;
	baseSpecies?: string;
	evoLevel?: number;
	evoMove?: string;
	evos?: string[];
	forme?: string;
	formeLetter?: string;
	gender?: 'M' | 'F' | 'N' | '';
	genderRatio?: {[k: string]: number};
	maxHP?: number;
	otherForms?: string[];
	otherFormes?: string[];
	prevo?: string;
}

export interface ILearnset {
	learnset: Dict<string[]>;
}

type GenderName = 'M' | 'F' | 'N' | '';

interface IStatsTable {
	hp: number;
	atk: number;
	def: number;
	spa: number;
	spd: number;
	spe: number;
}

interface ISparseStatsTable extends Partial<IStatsTable> {}

interface IEventInfo {
	generation: number;
	level?: number;
	shiny?: true | 1;
	gender?: GenderName;
	nature?: string;
	ivs?: ISparseStatsTable;
	perfectIVs?: number;
	isHidden?: boolean;
	abilities?: string[];
	moves?: string[];
	pokeball?: string;
	from?: string;
}

export interface ITemplateFormatsData {
	battleOnly?: boolean;
	comboMoves?: string[];
	doublesTier?: string;
	essentialMove?: string;
	eventOnly?: boolean;
	eventPokemon?: IEventInfo[];
	exclusiveMoves?: string[];
	gen?: number;
	isNonstandard?: boolean | string;
	isUnreleased?: boolean;
	maleOnlyHidden?: boolean;
	randomBattleMoves?: string[];
	randomDoubleBattleMoves?: string[];
	requiredAbility?: string;
	requiredItem?: string;
	requiredItems?: string[];
	requiredMove?: string;
	tier?: string;
	unreleasedHidden?: boolean;
}

export interface IPokemonComputed {
	baseSpecies: string;
	battleOnly?: boolean;
	effectType: "Pokemon";
	evos: string[];
	forme: string;
	gen: number;
	genderRatio: NonNullable<ITemplateData["genderRatio"]>;
	id: string;
	isMega: boolean;
	isPrimal: boolean;
	name: string;
	nfe: boolean;
	shiny: boolean;
	speciesId: string;
	spriteId: string;
}

export interface IPokemonCopy extends ITemplateData, Partial<ILearnset>, ITemplateFormatsData, IPokemonComputed {
	baseSpecies: string;
	evos: string[];
	forme: string;
	gen: number;
	genderRatio: NonNullable<ITemplateData["genderRatio"]>;
}
export interface IPokemon extends DeepReadonly<IPokemonCopy> {}

export interface ITypeChart {
	damageTaken: Dict<number>;
	HPivs?: Dict<number>;
	HPdvs?: Dict<number>;
}

export interface INature {
	name: string;
	plus?: string;
	minus?: string;
}

export interface IDataTable {
	readonly abilities: Dict<IAbilityData | undefined>;
	readonly aliases: Dict<string | undefined>;
	readonly badges: string[];
	readonly characters: string[];
	readonly colors: Dict<string>;
	readonly eggGroups: Dict<string>;
	readonly formats: Dict<(IFormatData & IFormatLinks) | undefined>;
	readonly formatsData: Dict<ITemplateFormatsData | undefined>;
	readonly gifData: Dict<{back?: {h: number, w: number}, front?: {h: number, w: number}} | undefined>;
	readonly items: Dict<IItemData | undefined>;
	readonly learnsets: Dict<ILearnset | undefined>;
	readonly moves: Dict<IMoveData | undefined>;
	readonly natures: Dict<INature | undefined>;
	readonly pokedex: Dict<ITemplateData | undefined>;
	readonly trainerClasses: string[];
	readonly typeChart: Dict<ITypeChart | undefined>;
	readonly types: Dict<string>;
}

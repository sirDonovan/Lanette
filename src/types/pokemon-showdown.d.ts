/**
 * Types imported from:
 * Pokemon Showdown - https://github.com/smogon/pokemon-showdown
 */

import type { IFormatDataLinks, ISeparatedCustomRules } from "./dex";

/** rule, source, limit, bans */
export type ComplexBan = [string, string, number, string[]];
export type ComplexTeamBan = ComplexBan;
export type ValidatedRule = string | [type: 'complexTeamBan' | 'complexBan', rule: string, source: string, limit: number, bans: string[]];

type GenderName = 'M' | 'F' | 'N' | '';
type StatIDExceptHP = 'atk' | 'def' | 'spa' | 'spd' | 'spe';
type StatID = 'hp' | StatIDExceptHP;
type StatsExceptHPTable = {[stat in StatIDExceptHP]: number};
type StatsTable = {[stat in StatID]: number};
type SparseStatsTable = Partial<StatsTable>;
type BoostID = StatIDExceptHP | 'accuracy' | 'evasion';
type BoostsTable = {[boost in BoostID]: number };
type SparseBoostsTable = Partial<BoostsTable>;
type Nonstandard = 'Past' | 'Future' | 'Unobtainable' | 'CAP' | 'LGPE' | 'Custom' | 'Gigantamax';

type Singles = "AG" | "Uber" | "(Uber)" | "OU" | "(OU)" | "UUBL" | "UU" | "RUBL" | "RU" | "NUBL" | "NU" |
"(NU)" | "PUBL" | "PU" | "(PU)" | "ZU" | "NFE" | "LC";
type Doubles = "DUber" | "(DUber)" | "DOU" | "(DOU)" | "DBL" | "DUU" | "(DUU)" | "DNU" | "NFE" | "LC";
type Other = "Unreleased" | "Illegal" | "CAP" | "CAP NFE" | "CAP LC";

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
type MoveTarget = 'adjacentAlly' | 'adjacentAllyOrSelf' | 'adjacentFoe' | 'all' | 'allAdjacent' | 'allAdjacentFoes' |
	'allies' | 'allySide' | 'allyTeam' | 'any' | 'foeSide' | 'normal' | 'randomNormal' | 'scripted' | 'self';

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
	/** Japan-only events can't be transferred to international games in Gen 1 */
	japan?: boolean;
}

type EffectType = 'Condition' | 'Pokemon' | 'Move' | 'Item' | 'Ability' | 'Format' | 'Nature' | 'Ruleset' | 'Weather' | 'Status' |
	'Rule' | 'ValidatorRule';

interface IBasicEffect {
	/**
	 * ID. This will be a lowercase version of the name with all the
	 * non-alphanumeric characters removed. So, for instance, "Mr. Mime"
	 * becomes "mrmime", and "Basculin-Blue-Striped" becomes
	 * "basculinbluestriped".
	 */
	id: string;
	/**
	  * Name. Currently does not support Unicode letters, so "Flabébé"
	  * is "Flabebe" and "Nidoran♀" is "Nidoran-F".
	  */
	name: string;
	/**
	  * Full name. Prefixes the name with the effect type. For instance,
	  * Leftovers would be "item: Leftovers", confusion the status
	  * condition would be "confusion", etc.
	  */
	fullname: string;
	/** Effect type. */
	effectType: EffectType;
	/**
	  * Does it exist? For historical reasons, when you use an accessor
	  * for an effect that doesn't exist, you get a dummy effect that
	  * doesn't do anything, and this field set to false.
	  */
	exists: boolean;
	/**
	  * Dex number? For a Pokemon, this is the National Dex number. For
	  * other effects, this is often an internal ID (e.g. a move
	  * number). Not all effects have numbers, this will be 0 if it
	  * doesn't. Nonstandard effects (e.g. CAP effects) will have
	  * negative numbers.
	  */
	num: number;
	/**
	  * The generation of Pokemon game this was INTRODUCED (NOT
	  * necessarily the current gen being simulated.) Not all effects
	  * track generation; this will be 0 if not known.
	  */
	gen: number;
	/**
	  * A shortened form of the description of this effect.
	  * Not all effects have this.
	  */
	shortDesc: string;
	/** The full description for this effect. */
	desc: string;
	/**
	  * Is this item/move/ability/pokemon nonstandard? Specified for effects
	  * that have no use in standard formats: made-up pokemon (CAP),
	  * glitches (MissingNo etc), Pokestar pokemon, etc.
	  */
	isNonstandard?: Nonstandard | null;
	/** The duration of the condition - only for pure conditions. */
	duration?: number;
	/** Whether or not the condition is ignored by Baton Pass - only for pure conditions. */
	noCopy: boolean;
	/** Whether or not the condition affects fainted Pokemon. */
	affectsFainted: boolean;
	/** Moves only: what status does it set? */
	status?: string;
	/** Moves only: what weather does it set? */
	weather?: string;
	/** ??? */
	sourceEffect: string;
}

interface IConditionData extends IBasicEffect {
	readonly effectType: 'Condition' | 'Weather' | 'Status';
	readonly counterMax?: number;
}

interface IAbilityDefinition extends IBasicEffect {
	effectType: "Ability";
	/** Rating from -1 Detrimental to +5 Essential; see `data/abilities.ts` for details. */
	readonly rating: number;
	readonly suppressWeather: boolean;
	readonly condition?: Partial<IConditionData>;
	readonly isPermanent?: boolean;
	readonly isBreakable?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IAbilityCopy extends DeepMutable<IAbilityDefinition> {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IAbility extends DeepImmutable<IAbilityCopy> {}

interface IFlingData {
	basePower: number;
	status?: string;
	volatileStatus?: string;
}

interface IItemDefinition extends IBasicEffect {
	readonly effectType: 'Item';

	/** just controls location on the item spritesheet */
	readonly num: number;

	/**
	 * A Move-like object depicting what happens when Fling is used on
	 * this item.
	 */
	readonly fling?: IFlingData;
	/**
	 * If this is a Drive: The type it turns Techno Blast into.
	 * undefined, if not a Drive.
	 */
	readonly onDrive?: string;
	/**
	 * If this is a Memory: The type it turns Multi-Attack into.
	 * undefined, if not a Memory.
	 */
	readonly onMemory?: string;
	/**
	 * If this is a mega stone: The name (e.g. Charizard-Mega-X) of the
	 * forme this allows transformation into.
	 * undefined, if not a mega stone.
	 */
	readonly megaStone?: string;
	/**
	 * If this is a mega stone: The name (e.g. Charizard) of the
	 * forme this allows transformation from.
	 * undefined, if not a mega stone.
	 */
	readonly megaEvolves?: string;
	/**
	 * If this is a Z crystal: true if the Z Crystal is generic
	 * (e.g. Firium Z). If species-specific, the name
	 * (e.g. Inferno Overdrive) of the Z Move this crystal allows
	 * the use of.
	 * undefined, if not a Z crystal.
	 */
	readonly zMove?: true | string;
	/**
	 * If this is a generic Z crystal: The type (e.g. Fire) of the
	 * Z Move this crystal allows the use of (e.g. Fire)
	 * undefined, if not a generic Z crystal
	 */
	readonly zMoveType?: string;
	/**
	 * If this is a species-specific Z crystal: The name
	 * (e.g. Play Rough) of the move this crystal requires its
	 * holder to know to use its Z move.
	 * undefined, if not a species-specific Z crystal
	 */
	readonly zMoveFrom?: string;
	/**
	 * If this is a species-specific Z crystal: An array of the
	 * species of Pokemon that can use this crystal's Z move.
	 * Note that these are the full names, e.g. 'Mimikyu-Busted'
	 * undefined, if not a species-specific Z crystal
	 */
	readonly itemUser?: string[];
	/** Is this item a Berry? */
	readonly isBerry: boolean;
	/** Whether or not this item ignores the Klutz ability. */
	readonly ignoreKlutz: boolean;
	/** The type the holder will change into if it is an Arceus. */
	readonly onPlate?: string;
	/** Is this item a Gem? */
	readonly isGem: boolean;
	/** Is this item a Pokeball? */
	readonly isPokeball: boolean;

	readonly condition?: Partial<IConditionData>;
	readonly forcedForme?: string;
	readonly isChoice?: boolean;
	readonly naturalGift?: {basePower: number, type: string};
	readonly spritenum?: number;
	readonly boosts?: SparseBoostsTable | false;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IItemCopy extends DeepMutable<IItemDefinition> {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IItem extends DeepImmutable<IItemCopy> {}

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

/** Possible move flags. */
interface IMoveFlags {
	authentic?: 1; // Ignores a target's substitute.
	bite?: 1; // Power is multiplied by 1.5 when used by a Pokemon with the Ability Strong Jaw.
	bullet?: 1; // Has no effect on Pokemon with the Ability Bulletproof.
	charge?: 1; // The user is unable to make a move between turns.
	contact?: 1; // Makes contact.
	dance?: 1; // When used by a Pokemon, other Pokemon with the Ability Dancer can attempt to execute the same move.
	defrost?: 1; // Thaws the user if executed successfully while the user is frozen.
	distance?: 1; // Can target a Pokemon positioned anywhere in a Triple Battle.
	gravity?: 1; // Prevented from being executed or selected during Gravity's effect.
	heal?: 1; // Prevented from being executed or selected during Heal Block's effect.
	mirror?: 1; // Can be copied by Mirror Move.
	mystery?: 1; // Unknown effect.
	nonsky?: 1; // Prevented from being executed or selected in a Sky Battle.
	powder?: 1; // Has no effect on Pokemon which are Grass-type, have the Ability Overcoat, or hold Safety Goggles.
	protect?: 1; // Blocked by Detect, Protect, Spiky Shield, and if not a Status move, King's Shield.
	pulse?: 1; // Power is multiplied by 1.5 when used by a Pokemon with the Ability Mega Launcher.
	punch?: 1; // Power is multiplied by 1.2 when used by a Pokemon with the Ability Iron Fist.
	recharge?: 1; // If this move is successful, the user must recharge on the following turn and cannot make a move.
	reflectable?: 1; // Bounced back to the original user by Magic Coat or the Ability Magic Bounce.
	snatch?: 1; // Can be stolen from the original user and instead used by another Pokemon using Snatch.
	sound?: 1; // Has no effect on Pokemon with the Ability Soundproof.
}

type MoveCategory = 'Physical' | 'Special' | 'Status';

export interface IMoveDefinition extends IBasicEffect {
	/** Hidden Power */
	realMove?: string;
	readonly effectType: 'Move';
	/** Move type. */
	readonly type: string;
	/** Move target. */
	readonly target: MoveTarget;
	/** Move base power. */
	readonly basePower: number;
	/** Move base accuracy. True denotes a move that always hits. */
	readonly accuracy: true | number;
	/** Critical hit ratio. Defaults to 1. */
	readonly critRatio: number;
	/** Will this move always or never be a critical hit? */
	readonly willCrit?: boolean;
	/** Can this move OHKO foes? */
	readonly ohko?: boolean | string;
	/**
	 * Base move type. This is the move type as specified by the games,
	 * tracked because it often differs from the real move type.
	 */
	readonly baseMoveType: string;
	/**
	 * Secondary effect. You usually don't want to access this
	 * directly; but through the secondaries array.
	 */
	readonly secondary: ISecondaryEffect | null;
	/**
	 * Secondary effects. An array because there can be more than one
	 * (for instance, Fire Fang has both a burn and a flinch
	 * secondary).
	 */
	readonly secondaries: ISecondaryEffect[] | null;
	/**
	 * Move priority. Higher priorities go before lower priorities,
	 * trumping the Speed stat.
	 */
	readonly priority: number;
	/** Move category. */
	readonly category: MoveCategory;
	/**
	 * Category that changes which defense to use when calculating
	 * move damage.
	 */
	readonly defensiveCategory?: MoveCategory;
	/** Uses the target's Atk/SpA as the attacking stat, instead of the user's. */
	readonly useTargetOffensive: boolean;
	/** Use the user's Def/SpD as the attacking stat, instead of Atk/SpA. */
	readonly useSourceDefensiveAsOffensive: boolean;
	/** Whether or not this move ignores negative attack boosts. */
	readonly ignoreNegativeOffensive: boolean;
	/** Whether or not this move ignores positive defense boosts. */
	readonly ignorePositiveDefensive: boolean;
	/** Whether or not this move ignores attack boosts. */
	readonly ignoreOffensive: boolean;
	/** Whether or not this move ignores defense boosts. */
	readonly ignoreDefensive: boolean;
	/**
	 * Whether or not this move ignores type immunities. Defaults to
	 * true for Status moves and false for Physical/Special moves.
	 */
	readonly ignoreImmunity: Dict<any> | boolean; // eslint-disable-line @typescript-eslint/no-explicit-any
	/** Base move PP. */
	readonly pp: number;
	/** Whether or not this move can receive PP boosts. */
	readonly noPPBoosts: boolean;
	/** How many times does this move hit? */
	readonly multihit?: number | number[];
	/** Is this move a Z-Move? */
	readonly isZ: boolean | string;
	/* Z-Move fields */
	readonly zMove?: {
		basePower?: number,
		effect?: string,
		boost?: SparseBoostsTable,
	};
	/** Is this move a Max move? */
	readonly isMax: boolean | string;
	/** Max/G-Max move fields */
	readonly maxMove?: {
		basePower: number,
	};
	readonly flags: IMoveFlags;
	/** Whether or not the user must switch after using this move. */
	readonly selfSwitch?: string | boolean;
	/** Move target only used by Pressure. */
	readonly pressureTarget: string;
	/** Move target used if the user is not a Ghost type (for Curse). */
	readonly nonGhostTarget: string;
	/** Whether or not the move ignores abilities. */
	readonly ignoreAbility: boolean;
	/**
	 * Move damage against the current target
	 * false = move will always fail with "But it failed!"
	 * null = move will always silently fail
	 * undefined = move does not deal fixed damage
	 */
	readonly damage: number | 'level' | false | null;
	/** Whether or not this move hit multiple targets. */
	readonly spreadHit: boolean;
	/** Modifier that affects damage when multiple targets are hit. */
	readonly spreadModifier?: number;
	/**  Modifier that affects damage when this move is a critical hit. */
	readonly critModifier?: number;
	/** Forces the move to get STAB even if the type doesn't match. */
	readonly forceSTAB: boolean;
	/** True if it can't be copied with Sketch. */
	readonly noSketch: boolean;
	/** STAB multiplier (can be modified by other effects) (default 1.5). */
	readonly stab?: number;

	readonly volatileStatus?: string;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	basePowerCallback?: (this: any, pokemon: any, target: any, move: any) => number | false | null;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IMoveCopy extends DeepMutable<IMoveDefinition> {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IMove extends DeepImmutable<IMoveCopy> {}

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
	doublesTier?: Doubles | Other;
	essentialMove?: string;
	exclusiveMoves?: readonly string[];
	gmaxUnreleased?: boolean;
	isNonstandard?: Nonstandard | null;
	randomBattleMoves?: readonly string[];
	randomBattleLevel?: number;
	randomDoubleBattleMoves?: readonly string[];
	randomDoubleBattleLevel?: number;
	randomBattleNoDynamaxMoves?: readonly string[];
	tier?: Singles | Other;
}

interface IPokemonDefinition extends IBasicEffect, ISpeciesFormatsData {
	readonly effectType: 'Pokemon';
	/**
	 * Species ID. Identical to ID. Note that this is the full ID, e.g.
	 * 'basculinbluestriped'. To get the base species ID, you need to
	 * manually read toID(species.baseSpecies).
	 */
	readonly id: string;
	/**
	 * Name. Note that this is the full name with forme,
	 * e.g. 'Basculin-Blue-Striped'. To get the name without forme, see
	 * `species.baseSpecies`.
	 */
	readonly name: string;
	/**
	 * Base species. Species, but without the forme name.
	 *
	 * DO NOT ASSUME A POKEMON CAN TRANSFORM FROM `baseSpecies` TO
	 * `species`. USE `changesFrom` FOR THAT.
	 */
	readonly baseSpecies: string;
	/**
	 * Forme name. If the forme exists,
	 * `species.name === species.baseSpecies + '-' + species.forme`
	 *
	 * The games make a distinction between Forme (foorumu) (legendary Pokémon)
	 * and Form (sugata) (non-legendary Pokémon). PS does not use the same
	 * distinction – they're all "Forme" to PS, reflecting current community
	 * use of the term.
	 *
	 * This property only tracks non-cosmetic formes, and will be `''` for
	 * cosmetic formes.
	 */
	readonly forme: string;
	/**
	 * Base forme name (e.g. 'Altered' for Giratina).
	 */
	readonly baseForme: string;
	/**
	 * Other forms. List of names of cosmetic forms. These should have
	 * `aliases.js` aliases to this entry, but not have their own
	 * entry in `pokedex.js`.
	 */
	readonly cosmeticFormes?: string[];
	/**
	 * Other formes. List of names of formes, appears only on the base
	 * forme. Unlike forms, these have their own entry in `pokedex.js`.
	 */
	readonly otherFormes?: string[];
	/**
	 * List of forme speciesNames in the order they appear in the game data -
	 * the union of baseSpecies, otherFormes and cosmeticFormes. Appears only on
	 * the base species forme.
	 *
	 * A species's alternate formeindex may change from generation to generation -
	 * the forme with index N in Gen A is not guaranteed to be the same forme as the
	 * forme with index in Gen B.
	 *
	 * Gigantamaxes are not considered formes by the game (see data/FORMES.md - PS
	 * labels them as such for convenience) - Gigantamax "formes" are instead included at
	 * the end of the formeOrder list so as not to interfere with the correct index numbers.
	 */
	readonly formeOrder?: string[];
	/**
	 * Sprite ID. Basically the same as ID, but with a dash between
	 * species and forme.
	 */
	readonly spriteid: string;
	/** Abilities. */
	readonly abilities: ISpeciesAbility;
	/** Types. */
	readonly types: string[];
	/** Added type (used in OMs). */
	readonly addedType?: string;
	/** Pre-evolution. '' if nothing evolves into this Pokemon. */
	readonly prevo: string;
	/** Evolutions. Array because many Pokemon have multiple evolutions. */
	readonly evos: string[];
	readonly evoType?: 'trade' | 'useItem' | 'levelMove' | 'levelExtra' | 'levelFriendship' | 'levelHold' | 'other';
	/** Evolution condition. falsy if doesn't evolve. */
	readonly evoCondition?: string;
	/** Evolution item. falsy if doesn't evolve. */
	readonly evoItem?: string;
	/** Evolution move. falsy if doesn't evolve. */
	readonly evoMove?: string;
	/** Evolution level. falsy if doesn't evolve. */
	readonly evoLevel?: number;
	/** Is NFE? True if this Pokemon can evolve (Mega evolution doesn't count). */
	readonly nfe: boolean;
	/** Egg groups. */
	readonly eggGroups: string[];
	/** True if this species can hatch from an Egg. */
	readonly canHatch: boolean;
	/**
	 * Gender. M = always male, F = always female, N = always
	 * genderless, '' = sometimes male sometimes female.
	 */
	readonly gender: GenderName;
	/** Gender ratio. Should add up to 1 unless genderless. */
	readonly genderRatio: {M: number, F: number};
	/** Base stats. */
	readonly baseStats: StatsTable;
	/** Max HP. Overrides usual HP calculations (for Shedinja). */
	readonly maxHP?: number;
	/** A Pokemon's Base Stat Total */
	readonly bst: number;
	/** Weight (in kg). Not valid for OMs; use weighthg / 10 instead. */
	readonly weightkg: number;
	/** Weight (in integer multiples of 0.1kg). */
	readonly weighthg: number;
	/** Height (in m). */
	readonly heightm: number;
	/** Color. */
	readonly color: string;
	/** Does this Pokemon have an unreleased hidden ability? */
	readonly unreleasedHidden: boolean | 'Past';
	/**
	 * Is it only possible to get the hidden ability on a male pokemon?
	 * This is mainly relevant to Gen 5.
	 */
	readonly maleOnlyHidden: boolean;
	/** True if a pokemon is mega. */
	readonly isMega?: boolean;
	/** True if a pokemon is primal. */
	readonly isPrimal?: boolean;
	/** Name of its Gigantamax move, if a pokemon is capable of gigantamaxing. */
	readonly canGigantamax?: string;
	/** If this Pokemon can gigantamax, is its gigantamax released? */
	readonly gmaxUnreleased?: boolean;
	/** True if a Pokemon species is incapable of dynamaxing */
	readonly cannotDynamax?: boolean;
	/** What it transforms from, if a pokemon is a forme that is only accessible in battle. */
	readonly battleOnly?: string | string[];
	/** Required item. Do not use this directly; see requiredItems. */
	readonly requiredItem?: string;
	/** Required move. Move required to use this forme in-battle. */
	readonly requiredMove?: string;
	/** Required ability. Ability required to use this forme in-battle. */
	readonly requiredAbility?: string;
	/**
	 * Required items. Items required to be in this forme, e.g. a mega
	 * stone, or Griseous Orb. Array because Arceus formes can hold
	 * either a Plate or a Z-Crystal.
	 */
	readonly requiredItems?: string[];

	/**
	 * Formes that can transform into this Pokemon, to inherit learnsets
	 * from. (Like `prevo`, but for transformations that aren't
	 * technically evolution. Includes in-battle transformations like
	 * Zen Mode and out-of-battle transformations like Rotom.)
	 *
	 * Not filled out for megas/primals - fall back to baseSpecies
	 * for in-battle formes.
	 */
	readonly changesFrom?: string;

	/**
	 * Singles Tier. The Pokemon's location in the Smogon tier system.
	 */
	readonly tier: Singles | Other;
	/**
	 * Doubles Tier. The Pokemon's location in the Smogon doubles tier system.
	 */
	readonly doublesTier: Doubles | Other;
	/**
	 * National Dex Tier. The Pokemon's location in the Smogon National Dex tier system.
	 */
	readonly natDexTier: Singles | Other;
	readonly randomBattleMoves?: readonly string[];
	readonly randomBattleLevel?: number;
	readonly randomDoubleBattleMoves?: readonly string[];
	readonly randomDoubleBattleLevel?: number;
	readonly randomBattleNoDynamaxMoves?: readonly string[];
	readonly exclusiveMoves?: readonly string[];
	readonly comboMoves?: readonly string[];
	readonly essentialMove?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IPokemonCopy extends DeepMutable<IPokemonDefinition> {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IPokemon extends DeepImmutable<IPokemonCopy> {}

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
	/** Japan-only events can't be transferred to international games in Gen 1 */
	japan?: boolean;
}

interface ILearnsetData {
	learnset?: Dict<MoveSource[]>;
	eventData?: IEventInfo[];
	eventOnly?: boolean;
	encounters?: IEventInfo[];
	exists?: boolean;
}

export interface INatureCopy extends IBasicEffect {
	gen: number;
	name: string;
	plus?: StatIDExceptHP;
	minus?: StatIDExceptHP;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface INature extends DeepImmutable<INatureCopy> {}

export type FormatEffectType = 'Format' | 'Ruleset' | 'Rule' | 'ValidatorRule';
export type GameType = 'singles' | 'doubles' | 'triples' | 'rotation' | 'multi' | 'freeforall';
type SideID = 'p1' | 'p2' | 'p3' | 'p4';

interface IGameTimerSettings {
	dcTimer: boolean;
	dcTimerBank: boolean;
	starting: number;
	grace: number;
	addPerTurn: number;
	maxPerTurn: number;
	maxFirstTurn: number;
	timeoutAutoChoose: boolean;
	accelerate: boolean;
}

export interface IFormatDefinition extends IBasicEffect {
	readonly mod: string;
	/**
	 * Name of the team generator algorithm, if this format uses
	 * random/fixed teams. null if players can bring teams.
	 */
	readonly team?: string;
	readonly effectType: FormatEffectType;
	readonly debug: boolean;
	/**
	 * Whether or not a format will update ladder points if searched
	 * for using the "Battle!" button.
	 * (Challenge and tournament games will never update ladder points.)
	 * (Defaults to `true`.)
	 */
	readonly rated: boolean | string;
	/** Game type. */
	readonly gameType: GameType;
	/** List of rule names. */
	readonly ruleset: string[];
	/**
	 * Base list of rule names as specified in "./config/formats.ts".
	 * Used in a custom format to correctly display the altered ruleset.
	 */
	readonly baseRuleset: string[];
	/** List of banned effects. */
	readonly banlist: string[];
	/** List of effects that aren't completely banned. */
	readonly restricted: string[];
	/** List of inherited banned effects to override. */
	readonly unbanlist: string[];
	/** List of ruleset and banlist changes in a custom format. */
	readonly customRules: string[] | null;
	/** Table of rule names and banned effects. */
	ruleTable?: RuleTable;
	/** Pokemon must be obtained from this generation or later. */
	readonly minSourceGen?: number;
	/**
	 * Maximum possible level pokemon you can bring. Note that this is
	 * still 100 in VGC, because you can bring level 100 pokemon,
	 * they'll just be set to level 50. Can be above 100 in special
	 * formats.
	 */
	readonly maxLevel: number;
	/**
	 * Default level of a pokemon without level specified. Mainly
	 * relevant to Custom Game where the default level is still 100
	 * even though higher level pokemon can be brought.
	 */
	readonly defaultLevel: number;
	/**
	 * Forces all pokemon brought in to this level. Certain Game Freak
	 * formats will change level 1 and level 100 pokemon to level 50,
	 * which is what this does.
	 *
	 * You usually want maxForcedLevel instead, which will bring level
	 * 100 pokemon down, but not level 1 pokemon up.
	 */
	readonly forcedLevel?: number;
	/**
	 * Forces all pokemon above this level down to this level. This
	 * will allow e.g. level 50 Hydreigon in Gen 5, which is not
	 * normally legal because Hydreigon doesn't evolve until level
	 * 64.
	 */
	readonly maxForcedLevel?: number;
	readonly noLog: boolean;

	readonly cannotMega?: string[];
	readonly challengeShow?: boolean;
	readonly searchShow?: boolean;
	readonly threads?: string[];
	readonly timer?: Partial<IGameTimerSettings>;
	readonly tournamentShow?: boolean;
	readonly section?: string;
	readonly column?: number;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface RuleTable {
	complexBans: ComplexBan[];
	complexTeamBans: ComplexTeamBan[];
	tagRules: string[];
	valueRules: Map<string, string>;

	minTeamSize: number;
	maxTeamSize: number;
	pickedTeamSize: number | null;
	maxTotalLevel: number | null;
	maxMoveCount: number;
	minSourceGen: number;
	minLevel: number;
	maxLevel: number;
	defaultLevel: number;
	adjustLevel: number | null;
	adjustLevelDown: number | null;

	has: (key: string) => boolean;

	blame: (key: string) => string;
	isBanned: (thing: string) => boolean;
	isBannedSpecies: (species: IPokemon) => boolean;
	isRestricted: (thing: string) => boolean;
	isRestrictedSpecies: (species: IPokemon) => boolean;
	check: (thing: string, setHas?: {[id: string]: true} | null) => string | null;
	getReason: (key: string) => string | null;
	getTagRules: () => string[];
	getComplexBanIndex: (complexBans: ComplexBan[], rule: string) => number;
	addComplexBan: (rule: string, source: string, limit: number, bans: string[]) => void;
	addComplexTeamBan: (rule: string, source: string, limit: number, bans: string[]) => void;
}

export interface IFormat extends DeepMutable<IFormatDefinition>, IFormatDataLinks {
	desc: string;
	inputTarget: string;
	nameWithoutGen: string;
	quickFormat: boolean;
	tournamentPlayable: boolean;
	unranked: boolean;
	customFormatName?: string;
	hasValue?: boolean | 'positive-integer' | 'integer';
	tournamentName?: string;
	usableAbilities?: string[];
	usableItems?: string[];
	usableMoves?: string[];
	usablePokemon?: string[];
	usablePokemonTags?: string[];
	separatedCustomRules?: ISeparatedCustomRules;
}

type TypeInfoEffectType = 'Type' | 'EffectType';

interface ITypeData {
	/**
	 * ID. This will be a lowercase version of the name with all the
	 * non-alphanumeric characters removed. e.g. 'flying'
	 */
	readonly id: string;
	/** Name. e.g. 'Flying' */
	readonly name: string;
	/** Effect type. */
	readonly effectType: TypeInfoEffectType;
	/**
	  * Does it exist? For historical reasons, when you use an accessor
	  * for an effect that doesn't exist, you get a dummy effect that
	  * doesn't do anything, and this field set to false.
	  */
	readonly exists: boolean;
	/**
	  * The generation of Pokemon game this was INTRODUCED (NOT
	  * necessarily the current gen being simulated.) Not all effects
	  * track generation; this will be 0 if not known.
	  */
	readonly gen: number;
	/**
	  * Set to 'Future' for types before they're released (like Fairy
	  * in Gen 5 or Dark in Gen 1).
	  */
	readonly isNonstandard: Nonstandard | null;
	/**
	  * Type chart, attackingTypeName:result, effectid:result
	  * result is: 0 = normal, 1 = weakness, 2 = resistance, 3 = immunity
	  */
	readonly damageTaken: {[attackingTypeNameOrEffectid: string]: number};
	/** The IVs to get this Type Hidden Power (in gen 3 and later) */
	readonly HPivs: SparseStatsTable;
	/** The DVs to get this Type Hidden Power (in gen 2). */
	readonly HPdvs: SparseStatsTable;
}

export interface IPSAbility extends IAbility {
	exists: boolean;
}

export interface IPSFormat extends IFormat {
	exists: boolean;
}

export interface IPSItem extends IItem {
	exists: boolean;
}

export interface IPSLearnsetData extends ILearnsetData {
	exists: boolean;
}

export interface IPSMove extends IMove {
	exists: boolean;
}

export interface IPSNature extends INature {
	exists: boolean;
}

export interface IPSPokemon extends IPokemon {
	exists: boolean;
}

export interface IPSTypeData extends ITypeData {
	exists: boolean;
}

export interface IPokemonShowdownDexModule {
	Dex: IPokemonShowdownDex;
}

export interface IPokemonShowdownTagsModule {
	Tags: Dict<ITagData>;
}

export interface ITagData {
	name: string;
	desc?: string;
	speciesFilter?: (species: IPSPokemon) => boolean;
	moveFilter?: (move: IPSMove) => boolean;
	genericFilter?: (thing: IPSPokemon | IPSMove | IPSItem | IPSAbility) => boolean;
	speciesNumCol?: (species: IPSPokemon) => number;
	moveNumCol?: (move: IPSMove) => number;
	genericNumCol?: (thing: IPSPokemon | IPSMove | IPSItem | IPSAbility) => number;
}

export interface IPokemonShowdownDex {
	data: {
		Abilities: Dict<unknown>;
		Aliases: Dict<unknown>;
		Items: Dict<unknown>;
		Learnsets: Dict<unknown>;
		Moves: Dict<unknown>;
		Natures: Dict<unknown>;
		Pokedex: Dict<unknown>;
		Rulesets: Dict<unknown>;
		TypeChart: Dict<unknown>;
	}
	gen: number;
	abilities: {
		get: (name: string | IPSAbility) => IPSAbility;
		getByID: (id: string) => IPSAbility;
		all: () => readonly IPSAbility[];
	}
	formats: {
		get: (name: string | IPSFormat, isValidated?: boolean) => IPSFormat;
		all: () => readonly IPSFormat[];
		getRuleTable: (format: IFormat) => RuleTable;
		validate: (name: string) => string;
		validateRule: (rule: string) => ValidatedRule;
	}
	items: {
		get: (name: string | IPSItem) => IPSItem;
		getByID: (id: string) => IPSItem;
		all: () => readonly IPSItem[];
	}
	moves: {
		get: (name: string | IPSMove) => IPSMove;
		getByID: (id: string) => IPSMove;
		all: () => readonly IPSMove[];
	}
	natures: {
		get: (name: string | IPSNature) => IPSNature;
		getByID: (id: string) => IPSNature;
		all: () => readonly IPSNature[];
	}
	species: {
		get: (name: string | IPSPokemon) => IPSPokemon;
		getByID: (id: string) => IPSPokemon;
		all: () => readonly IPSPokemon[];
		getLearnsetData: (id: string) => ILearnsetData;
	}
	types: {
		get: (name: string | IPSTypeData) => IPSTypeData;
		getByID: (id: string) => IPSTypeData;
		all: () => readonly IPSTypeData[];
		names: () => readonly string[];
	}
	forFormat: (format: IFormat) => IPokemonShowdownDex;
	includeMods: () => void;
	includeModData: () => void;
	mod: (mod: string) => IPokemonShowdownDex;
}

export interface IPokemonShowdownValidatorModule {
	TeamValidator: IPokemonShowdownValidator;
}

export interface IPokemonShowdownValidator {
	// eslint-disable-next-line @typescript-eslint/no-misused-new
	new(format: string | IFormat, dex: IPokemonShowdownDex): IPokemonShowdownValidator;
	checkCanLearn: (move: IMove, pokemon: IPokemon) => boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	checkAbility: (set: Dict<any>, ability: IAbility, setHas: Dict<boolean>) => string | null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	checkItem: (set: Dict<any>, item: IItem, setHas: Dict<boolean>) => string | null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	checkMove: (set: Dict<any>, move: IMove, setHas: Dict<boolean>) => string | null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	checkSpecies: (set: Dict<any>, pokemon: IPokemon, tierPokemon: IPokemon, setHas: Dict<boolean>) => string | null;
	learnsetParent: (pokemon: IPokemon) => IPokemon | null;
}

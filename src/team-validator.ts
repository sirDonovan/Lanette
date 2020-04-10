import { RuleTable } from './dex';
import { IFormat, IMove, IPokemon, ISpeciesData } from './types/in-game-data-types';

type Move = IMove;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObject = Dict<any>;
type ID = string;

/**
 * Team Validator
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * Handles team validation, and specifically learnset checking.
 *
 * @license MIT
 */

/**
 * Describes a possible way to get a pokemon. Is not exhaustive!
 * sourcesBefore covers all sources that do not have exclusive
 * moves (like catching wild pokemon).
 *
 * First character is a generation number, 1-7.
 * Second character is a source ID, one of:
 *
 * - E = egg, 3rd char+ is the father in gen 2-5, empty in gen 6-7
 *   because egg moves aren't restricted to fathers anymore
 * - S = event, 3rd char+ is the index in .eventPokemon
 * - D = Dream World, only 5D is valid
 * - V = Virtual Console transfer, only 7V is valid
 *
 * Designed to match MoveSource where possible.
 */
export type PokemonSource = string;

/**
 * Represents a set of possible ways to get a Pokémon with a given
 * set.
 *
 * `new PokemonSources()` creates an empty set;
 * `new PokemonSources(dex.gen)` allows all Pokemon.
 *
 * The set mainly stored as an Array `sources`, but for sets that
 * could be sourced from anywhere (for instance, TM moves), we
 * instead just set `sourcesBefore` to a number meaning "any
 * source at or before this gen is possible."
 *
 * In other words, this variable represents the set of all
 * sources in `sources`, union all sources at or before
 * gen `sourcesBefore`.
 */
export class PokemonSources {
	/**
	 * A set of specific possible PokemonSources; implemented as
	 * an Array rather than a Set for perf reasons.
	 */
	sources: PokemonSource[];
	/**
	 * if nonzero: the set also contains all possible sources from
	 * this gen and earlier.
	 */
	sourcesBefore: number;
	/**
	 * the set requires sources from this gen or later
	 * this should be unchanged from the format's minimum past gen
	 * (3 in modern games, 6 if pentagon is required, etc)
	 */
	sourcesAfter: number;
	isHidden: boolean | null;
	/**
	 * `limitedEggMoves` is a list of moves that can only be obtained from an
	 * egg with another father in gen 2-5. If there are multiple such moves,
	 * potential fathers need to be checked to see if they can actually
	 * learn the move combination in question.
	 *
	 * `null` = the current move is definitely not a limited egg move
	 *
	 * `undefined` = the current move may or may not be a limited egg move
	 */
	limitedEggMoves?: ID[] | null;
	/**
	 * Some Pokemon evolve by having a move in their learnset (like Piloswine
	 * with Ancient Power). These can only carry three other moves from their
	 * prevo, because the fourth move must be the evo move. This restriction
	 * doesn't apply to gen 6+ eggs, which can get around the restriction with
	 * the relearner.
	 */
	moveEvoCarryCount: number;

	babyOnly?: string;
	sketchMove?: string;
	hm?: string;
	restrictiveMoves?: string[];
	/** Obscure learn methods */
	restrictedMove?: ID;

	constructor(sourcesBefore = 0, sourcesAfter = 0) {
		this.sources = [];
		this.sourcesBefore = sourcesBefore;
		this.sourcesAfter = sourcesAfter;
		this.isHidden = null;
		this.limitedEggMoves = undefined;
		this.moveEvoCarryCount = 0;
	}

	size(): number {
		if (this.sourcesBefore) return Infinity;
		return this.sources.length;
	}

	add(source: PokemonSource, limitedEggMove?: ID | null): void {
		if (this.sources[this.sources.length - 1] !== source) this.sources.push(source);
		if (limitedEggMove && this.limitedEggMoves !== null) {
			this.limitedEggMoves = [limitedEggMove];
		} else if (limitedEggMove === null) {
			this.limitedEggMoves = null;
		}
	}

	addGen(sourceGen: number): void {
		this.sourcesBefore = Math.max(this.sourcesBefore, sourceGen);
		this.limitedEggMoves = null;
	}

	minSourceGen(): number {
		if (this.sourcesBefore) return this.sourcesAfter || 1;
		let min = 10;
		for (const source of this.sources) {
			const sourceGen = parseInt(source.charAt(0));
			if (sourceGen < min) min = sourceGen;
		}
		if (min === 10) return 0;
		return min;
	}

	maxSourceGen(): number {
		let max = this.sourcesBefore;
		for (const source of this.sources) {
			const sourceGen = parseInt(source.charAt(0));
			if (sourceGen > max) max = sourceGen;
		}
		return max;
	}

	intersectWith(other: PokemonSources): void {
		if (other.sourcesBefore || this.sourcesBefore) {
			// having sourcesBefore is the equivalent of having everything before that gen
			// in sources, so we fill the other array in preparation for intersection
			if (other.sourcesBefore > this.sourcesBefore) {
				for (const source of this.sources) {
					const sourceGen = parseInt(source.charAt(0), 10);
					if (sourceGen <= other.sourcesBefore) {
						other.sources.push(source);
					}
				}
			} else if (this.sourcesBefore > other.sourcesBefore) {
				for (const source of other.sources) {
					const sourceGen = parseInt(source.charAt(0), 10);
					if (sourceGen <= this.sourcesBefore) {
						this.sources.push(source);
					}
				}
			}
			this.sourcesBefore = Math.min(other.sourcesBefore, this.sourcesBefore);
		}
		if (this.sources.length) {
			if (other.sources.length) {
				const sourcesSet = new Set(other.sources);
				const intersectSources = this.sources.filter(source => sourcesSet.has(source));
				this.sources = intersectSources;
			} else {
				this.sources = [];
			}
		}

		if (other.restrictedMove && other.restrictedMove !== this.restrictedMove) {
			if (this.restrictedMove) {
				// incompatible
				this.sources = [];
				this.sourcesBefore = 0;
			} else {
				this.restrictedMove = other.restrictedMove;
			}
		}
		if (other.limitedEggMoves) {
			if (!this.limitedEggMoves) {
				this.limitedEggMoves = other.limitedEggMoves;
			} else {
				this.limitedEggMoves.push(...other.limitedEggMoves);
			}
		}
		this.moveEvoCarryCount += other.moveEvoCarryCount;
		if (other.sourcesAfter > this.sourcesAfter) this.sourcesAfter = other.sourcesAfter;
		if (other.isHidden) this.isHidden = true;
	}
}

export class TeamValidator {
	readonly format: IFormat;
	readonly dex: typeof Dex;
	readonly gen: number;
	readonly minSourceGen: number;
	readonly ruleTable: RuleTable;

	constructor(formatid: string | IFormat) {
		this.format = typeof formatid === 'string' ? Dex.getExistingFormat(formatid) : formatid;
		this.dex = Dex.forFormat(this.format);
		this.gen = this.dex.gen;
		this.ruleTable = this.dex.getRuleTable(this.format);

		this.minSourceGen = this.ruleTable.minSourceGen ?
			this.ruleTable.minSourceGen[0] : 1;
	}

	static get(format: string | IFormat): TeamValidator {
		return new TeamValidator(format);
	}

	allSources(template?: IPokemon): PokemonSources {
		let minSourceGen = this.minSourceGen;
		if (this.dex.gen >= 3 && minSourceGen < 3) minSourceGen = 3;
		if (template) minSourceGen = Math.max(minSourceGen, template.gen);
		const maxSourceGen = this.ruleTable.has('allowtradeback') ? 2 : this.dex.gen;
		return new PokemonSources(maxSourceGen, minSourceGen);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	checkLearnset(move: Move, s: IPokemon, setSources = this.allSources(s), set: AnyObject = {}): {type: string; [key: string]: any} | null {
		const dex = this.dex;
		if (!setSources.size()) throw new Error(`Bad sources passed to checkLearnset`);

		const moveid = toID(move);
		move = dex.getMove(moveid)!;
		const baseSpecies = dex.getSpecies(s)!;
		let species: IPokemon | null = baseSpecies;

		const format = this.format;
		const ruleTable = dex.getRuleTable(format);
		const alreadyChecked: {[k: string]: boolean} = {};
		const level = set.level || 100;

		let incompatibleAbility = false;

		let limit1 = true;
		let sketch = false;
		let blockedHM = false;

		let sometimesPossible = false; // is this move in the learnset at all?

		let babyOnly = '';

		// This is a pretty complicated algorithm

		// Abstractly, what it does is construct the union of sets of all
		// possible ways this pokemon could be obtained, and then intersect
		// it with a the pokemon's existing set of all possible ways it could
		// be obtained. If this intersection is non-empty, the move is legal.

		// set of possible sources of a pokemon with this move
		const moveSources = new PokemonSources();

		/**
		 * The format doesn't allow Pokemon traded from the future
		 * (This is everything except in Gen 1 Tradeback)
		 */
		const noFutureGen = !ruleTable.has('allowtradeback');

		let tradebackEligible = false;
		while (species && species.name && !alreadyChecked[species.id]) {
			alreadyChecked[species.id] = true;
			if (dex.gen <= 2 && species.gen === 1) tradebackEligible = true;
			const lsetData = dex.getLearnsetData(species.id);
			if (!lsetData || !lsetData.learnset) {
				if (species.baseSpecies !== species.name) {
					// forme without its own learnset
					species = dex.getSpecies(species.baseSpecies);
					// warning: formes with their own learnset, like Wormadam, should NOT
					// inherit from their base forme unless they're freely switchable
					continue;
				}
				// should never happen
				break;
			}
			const checkingPrevo = species.baseSpecies !== s.baseSpecies;
			if (checkingPrevo && !moveSources.size()) {
				if (!setSources.babyOnly || !species.prevo) {
					babyOnly = species.id;
				}
			}

			if (lsetData.learnset[moveid] || lsetData.learnset['sketch']) {
				sometimesPossible = true;
				let lset = lsetData.learnset[moveid];
				if (moveid === 'sketch' || !lset || species.id === 'smeargle') {
					if (move.noSketch || move.isZ) return {type: 'invalid'};
					lset = lsetData.learnset['sketch'];
					sketch = true;
				}
				if (typeof lset === 'string') lset = [lset];

				for (let learned of lset) {
					// Every `learned` represents a single way a pokemon might
					// learn a move. This can be handled one of several ways:
					// `continue`
					//   means we can't learn it
					// `return false`
					//   means we can learn it with no restrictions
					//   (there's a way to just teach any pokemon of this species
					//   the move in the current gen, like a TM.)
					// `moveSources.add(source)`
					//   means we can learn it only if obtained that exact way described
					//   in source
					// `moveSources.addGen(learnedGen)`
					//   means we can learn it only if obtained at or before learnedGen
					//   (i.e. get the pokemon however you want, transfer to that gen,
					//   teach it, and transfer it to the current gen.)

					const learnedGen = parseInt(learned.charAt(0));
					if (learnedGen < this.minSourceGen) continue;
					if (noFutureGen && learnedGen > dex.gen) continue;

					// redundant
					if (learnedGen <= moveSources.sourcesBefore) continue;

					if (
						learnedGen < 7 && setSources.isHidden &&
						!dex.mod('gen' + learnedGen).getSpecies(baseSpecies.name)!.abilities['H']
					) {
						// check if the Pokemon's hidden ability was available
						incompatibleAbility = true;
						continue;
					}
					if (!species.isNonstandard) {
						// HMs can't be transferred
						if (dex.gen >= 4 && learnedGen <= 3 &&
							['cut', 'fly', 'surf', 'strength', 'flash', 'rocksmash', 'waterfall', 'dive'].includes(moveid)) continue;
						if (dex.gen >= 5 && learnedGen <= 4 &&
							['cut', 'fly', 'surf', 'strength', 'rocksmash', 'waterfall', 'rockclimb'].includes(moveid)) continue;
						// Defog and Whirlpool can't be transferred together
						if (dex.gen >= 5 && ['defog', 'whirlpool'].includes(moveid) && learnedGen <= 4) blockedHM = true;
					}

					if (learned.charAt(1) === 'L') {
						// special checking for level-up moves
						if (level >= parseInt(learned.substr(2)) || learnedGen === 7) {
							// we're past the required level to learn it
							// (gen 7 level-up moves can be relearnered at any level)
							// falls through to LMT check below
						} else if (level >= 5 && learnedGen === 3 && species.eggGroups && species.eggGroups[0] !== 'Undiscovered') {
							// Pomeg Glitch
						} else if ((!species.gender || species.gender === 'F') && learnedGen >= 2) {
							// available as egg move
							learned = learnedGen + 'Eany';
							// falls through to E check below
						} else {
							// this move is unavailable, skip it
							continue;
						}
					}

					// Gen 8 egg moves can be taught to any pokemon from any source
					if (learned === '8E') learned = '8T';

					if ('LMTR'.includes(learned.charAt(1))) {
						if (learnedGen === dex.gen && learned.charAt(1) !== 'R') {
							// current-gen level-up, TM or tutor moves:
							//   always available
							if (babyOnly) setSources.babyOnly = babyOnly;
							if (!moveSources.moveEvoCarryCount) return null;
						}
						// past-gen level-up, TM, or tutor moves:
						//   available as long as the source gen was or was before this gen
						if (learned.charAt(1) === 'R') {
							if (baseSpecies.name === 'Pikachu-Gmax') {
								// Volt Tackle is weird (from egg, but not an egg move), and Pikachu-Gmax can't learn it
								continue;
							}
							moveSources.restrictedMove = moveid;
						}
						limit1 = false;
						moveSources.addGen(learnedGen);
					} else if (learned.charAt(1) === 'E') {
						// egg moves:
						//   only if hatched from an egg
						let limitedEggMove: ID | null | undefined = undefined;
						// eslint-disable-next-line @typescript-eslint/prefer-string-starts-ends-with
						if (learned.slice(1) === 'Eany') {
							limitedEggMove = null;
						} else if (learnedGen < 6) {
							limitedEggMove = move.id;
						}
						learned = learnedGen + 'E' + (species.prevo ? species.id : '');
						if (tradebackEligible && learnedGen === 2 && move.gen <= 1) {
							// can tradeback
							moveSources.add('1ET' + learned.slice(2));
						}
						moveSources.add(learned, limitedEggMove);
					} else if (learned.charAt(1) === 'S') {
						// event moves:
						//   only if that was the source
						// Event Pokémon:
						// 	Available as long as the past gen can get the Pokémon and then trade it back.
						if (tradebackEligible && learnedGen === 2 && move.gen <= 1) {
							// can tradeback
							moveSources.add('1ST' + learned.slice(2) + ' ' + species.id);
						}
						moveSources.add(learned + ' ' + species.id);
					} else if (learned.charAt(1) === 'D') {
						// DW moves:
						//   only if that was the source
						moveSources.add(learned + species.id);
					} else if (learned.charAt(1) === 'V' && this.minSourceGen < learnedGen) {
						// Virtual Console or Let's Go transfer moves:
						//   only if that was the source
						moveSources.add(learned);
					}
				}
			}
			if (ruleTable.has('mimicglitch') && species.gen < 5) {
				// include the Mimic Glitch when checking this mon's learnset
				const glitchMoves = ['metronome', 'copycat', 'transform', 'mimic', 'assist'];
				let getGlitch = false;
				for (const i of glitchMoves) {
					if (lsetData.learnset[i]) {
						if (!(i === 'mimic' && dex.getAbility(set.ability)!.gen === 4 && !species.prevo)) {
							getGlitch = true;
							break;
						}
					}
				}
				if (getGlitch) {
					moveSources.addGen(4);
					if (move.gen < 5) {
						limit1 = false;
					}
				}
			}

			if (!moveSources.size()) {
				if (
					(species.evoType === 'levelMove' && species.evoMove !== move.name) ||
					(species.id === 'sylveon' && move.type !== 'Fairy')
				) {
					moveSources.moveEvoCarryCount = 1;
				}
			}

			// also check to see if the mon's prevo or freely switchable formes can learn this move
			species = this.learnsetParent(species);
		}

		if (limit1 && sketch) {
			// limit 1 sketch move
			if (setSources.sketchMove) {
				return {type: 'oversketched', maxSketches: 1};
			}
			setSources.sketchMove = moveid;
		}

		if (blockedHM) {
			// Limit one of Defog/Whirlpool to be transferred
			if (setSources.hm) return {type: 'incompatible'};
			setSources.hm = moveid;
		}

		if (!setSources.restrictiveMoves) {
			setSources.restrictiveMoves = [];
		}
		setSources.restrictiveMoves.push(move.name);

		// Now that we have our list of possible sources, intersect it with the current list
		if (!moveSources.size()) {
			if (this.minSourceGen > 1 && sometimesPossible) return {type: 'pastgen', gen: this.minSourceGen};
			if (incompatibleAbility) return {type: 'incompatibleAbility'};
			return {type: 'invalid'};
		}
		setSources.intersectWith(moveSources);
		if (!setSources.size()) {
			return {type: 'incompatible'};
		}

		if (babyOnly) setSources.babyOnly = babyOnly;
		return null;
	}

	learnsetParent(species: IPokemon): IPokemon | null {
		// Own Tempo Rockruff and Battle Bond Greninja are special event formes
		// that are visually indistinguishable from their base forme but have
		// different learnsets. To prevent a leak, we make them show up as their
		// base forme, but hardcode their learnsets into Rockruff-Dusk and
		// Greninja-Ash
		if (species.name === 'Lycanroc-Dusk') {
			return this.dex.getSpecies('Rockruff-Dusk');
		} else if (species.name === 'Greninja-Ash') {
			return null;
		} else if (species.prevo) {
			// there used to be a check for Hidden Ability here, but apparently it's unnecessary
			// Shed Skin Pupitar can definitely evolve into Unnerve Tyranitar
			const prevo = this.dex.getSpecies(species.prevo)!;
			if (prevo.gen > Math.max(2, this.dex.gen)) return null;
			return prevo;
		} else if (species.inheritsFrom) {
			// For Pokemon like Rotom, Necrozma, and Gmax formes whose movesets are extensions are their base formes
			return this.dex.getSpecies(species.inheritsFrom);
		}
		return null;
	}
}

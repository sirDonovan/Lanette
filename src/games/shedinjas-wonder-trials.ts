import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { GameCommandDefinitions, IGameAchievement, IGameFile } from "../types/games";
import type { IPokemon } from "../types/pokemon-showdown";

type AchievementNames = "wonderguardwarrior";

const data: {moves: string[]; pokedex: string[]} = {
	moves: [],
	pokedex: [],
};

class ShedinjasWonderTrials extends ScriptedGame {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		'wonderguardwarrior': {name: "Wonder Guard Warrior", type: 'special', bits: 1000, description: "use a move first every round " +
			"that is super-effective"},
	};

	canUseMove: boolean = false;
	currentPokemon: IPokemon | null = null;
	firstMove: Player | false | undefined;
	inactiveRoundLimit: number = 5;
	inverseTypes: boolean = false;
	lastTyping: string = '';
	maxPoints: number = 1500;
	points = new Map<Player, number>();
	roundMoves = new Map<Player, string>();
	usedMoves: string[] = [];

	static loadData(): void {
		data.moves = Games.getMovesList(x => x.id !== 'hiddenpower' && x.category !== 'Status' && !x.isMax).map(x => x.id);
		data.pokedex = Games.getPokemonList(x => x.baseSpecies === x.name).map(x => x.name);
	}

	onSignups(): void {
		if (this.format.options.freejoin) {
			this.timeout = setTimeout(() => this.nextRound(), 10 * 1000);
		}
	}

	generatePokemon(): void {
		let pokemon = Dex.getExistingPokemon(this.sampleOne(data.pokedex));
		let typing = pokemon.types.join("/");
		while ((this.currentPokemon && this.currentPokemon.id === pokemon.id) || typing === this.lastTyping) {
			pokemon = Dex.getExistingPokemon(this.sampleOne(data.pokedex));
			typing = pokemon.types.join("/");
		}
		this.currentPokemon = pokemon;
		this.lastTyping = typing;
		this.usedMoves = [];
		this.roundMoves.clear();

		const summonText = "Shedinja summoned **" + this.currentPokemon.name + "**!";
		this.on(summonText, () => {
			this.canUseMove = true;
			this.timeout = setTimeout(() => {
				const fledText = this.currentPokemon!.name + " fled!";
				this.on(fledText, () => this.nextRound());
				this.say(fledText);
			}, 5 * 1000);
		});
		this.say(summonText);
	}

	onNextRound(): void {
		this.canUseMove = false;
		if (this.round > 1) {
			let highestPoints = 0;
			if (this.roundMoves.size) {
				if (this.inactiveRounds) this.inactiveRounds = 0;

				const effectivenessScale: Dict<string> = {'1': '2x', '2': '4x', '-1': '0.5x', '-2': '0.25x', 'immune': '0x', '0': '1x'};
				this.roundMoves.forEach((effectiveness, player) => {
					const wonderGuardWarrior = effectiveness === '1' || effectiveness === '2';
					if (this.firstMove === undefined) {
						if (wonderGuardWarrior) {
							this.firstMove = player;
						} else {
							this.firstMove = false;
						}
					} else {
						if (this.firstMove && (this.firstMove !== player || !wonderGuardWarrior)) this.firstMove = false;
					}

					let points = this.points.get(player) || 0;
					const originalPoints = points;
					if (effectiveness === '1') {
						points += 100;
					} else if (effectiveness === '2') {
						points += 200;
					} else if (effectiveness === '-1') {
						points -= 100;
					} else if (effectiveness === '-2') {
						points -= 200;
					} else if (effectiveness === 'immune') {
						points = 0;
					}
					if (points < 0) points = 0;
					if (points > highestPoints) highestPoints = points;
					this.points.set(player, points);
					player.say("Your move was **" + effectivenessScale[effectiveness] + "** effective!" + (points !== originalPoints ?
						" Your total score is now " + points + "." : ""));
				});
			} else {
				this.inactiveRounds++;
				if (this.inactiveRounds === this.inactiveRoundLimit) {
					this.inactivityEnd();
					return;
				}
			}

			if (highestPoints >= this.maxPoints) {
				this.timeout = setTimeout(() => this.end(), 3000);
				return;
			}

			if (this.round > 20) {
				this.timeout = setTimeout(() => {
					this.say("We've reached the end of the game!");
					this.maxPoints = highestPoints;
				}, 3000);
				this.timeout = setTimeout(() => this.end(), 6000);
				return;
			}
		}
		const html = this.getRoundHtml(players => this.getPlayerPoints(players));
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			this.timeout = setTimeout(() => this.generatePokemon(), 5 * 1000);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd(): void {
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			const points = this.points.get(player);
			if (points && points >= this.maxPoints) {
				this.winners.set(player, 1);
				this.addBits(player, 500);
				if (this.firstMove === player) this.unlockAchievement(player, ShedinjasWonderTrials.achievements.wonderguardwarrior);
			}
		}

		this.announceWinners();
	}
}

const commands: GameCommandDefinitions<ShedinjasWonderTrials> = {
	use: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (!this.canUseMove || !this.currentPokemon) return false;
			const player = this.createPlayer(user) || this.players[user.id];
			if (this.roundMoves.has(player)) return false;
			const move = Dex.getMove(target);
			if (!move) {
				user.say(CommandParser.getErrorText(['invalidMove', target]));
				return false;
			}
			if (move.id !== Tools.toId(target)) {
				user.say("You must type the full name of the move.");
				return false;
			}
			if (!data.moves.includes(move.id)) {
				user.say(move.name + " cannot be used in this game.");
				return false;
			}
			if (this.usedMoves.includes(move.name)) {
				user.say("Another player has already used " + move.name + " this round.");
				return false;
			}
			this.usedMoves.push(move.name);
			let effectiveness: number;
			if (move.id === 'flyingpress') {
				if (Dex.isImmune('Fighting', this.currentPokemon) || Dex.isImmune('Flying', this.currentPokemon)) {
					effectiveness = Infinity;
				} else {
					effectiveness = Dex.getEffectiveness('Fighting', this.currentPokemon) +
						Dex.getEffectiveness('Flying', this.currentPokemon);
				}
			} else if (move.id === 'freezedry') {
				const waterIndex = this.currentPokemon.types.indexOf('Water');
				if (waterIndex !== -1) {
					const otherTypes = this.currentPokemon.types.slice();
					otherTypes.splice(waterIndex, 1);
					if (otherTypes.length) {
						effectiveness = 1 + Dex.getEffectiveness(move.type, otherTypes);
					} else {
						effectiveness = 1;
					}
				} else {
					effectiveness = Dex.getEffectiveness(move.type, this.currentPokemon);
				}
			} else if (move.id === 'thousandarrows' && this.currentPokemon.types.includes('Flying')) {
				effectiveness = 0;
			} else {
				if (Dex.isImmune(move.type, this.currentPokemon)) {
					effectiveness = Infinity;
				} else {
					effectiveness = Dex.getEffectiveness(move.type, this.currentPokemon);
				}
			}

			if (this.inverseTypes) {
				if (effectiveness === Infinity) {
					effectiveness = 1;
				} else {
					effectiveness = -effectiveness;
				}
			}

			if (effectiveness !== Infinity) {
				if (effectiveness > 2) {
					effectiveness = 2;
				} else if (effectiveness < -2) {
					effectiveness = -2;
				}
			}

			this.roundMoves.set(player, effectiveness === Infinity ? 'immune' : '' + effectiveness);
			return true;
		},
	},
};

export const game: IGameFile<ShedinjasWonderTrials> = {
	aliases: ["shedinjas", "swt", "wondertrials"],
	category: 'knowledge',
	commandDescriptions: [Config.commandCharacter + "use [move]"],
	commands,
	class: ShedinjasWonderTrials,
	description: "Players must use damaging moves that are super-effective against each Pokemon that Shedinja summons " +
		"(no repeats in a round)!",
	formerNames: ["Wonder Guard Wipeout"],
	freejoin: true,
	name: "Shedinja's Wonder Trials",
	mascot: "Shedinja",
	variants: [
		{
			name: "Shedinja's Inverse Wonder Trials",
			description: "Using an inverted type chart, Players must use damaging moves that are super-effective against each Pokemon " +
				"that Shedinja summons (no repeats in a round)!",
			inverseTypes: true,
			variantAliases: ["inverse"],
		},
	],
};

import { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { Game } from "../room-game";
import { Room } from "../rooms";
import { IGameFile, AchievementsDict } from "../types/games";
import { IPokemon } from "../types/in-game-data-types";

const name = "Shedinja's Wonder Trials";
const data: {moves: string[], pokedex: string[]} = {
	moves: [],
	pokedex: [],
};
let loadedData = false;

const achievements: AchievementsDict = {
	'wonderguardwarrior': {name: "Wonder Guard Warrior", type: 'special', bits: 1000, description: "use a move first every round that is super-effective"},
};

class ShedinjasWonderTrials extends Game {
	static loadData(room: Room) {
		if (loadedData) return;

		room.say("Loading data for " + name + "...");
		const movesList = Games.getMovesList(x => x.id !== 'hiddenpower' && x.category !== 'Status');
		for (let i = 0; i < movesList.length; i++) {
			data.moves.push(movesList[i].name);
		}
		const pokemonList = Games.getPokemonList(x => !x.isForme);
		for (let i = 0; i < pokemonList.length; i++) {
			data.pokedex.push(pokemonList[i].species);
		}

		loadedData = true;
	}

	canUseMove: boolean = false;
	currentPokemon: IPokemon | null = null;
	firstMove: Player | false | undefined;
	lastTyping: string = '';
	maxPoints: number = 1500;
	points = new Map<Player, number>();
	roundMoves = new Map<Player, string>();
	usedMoves: string[] = [];

	onSignups() {
		if (this.format.options.freejoin) {
			this.timeout = setTimeout(() => this.nextRound(), 10 * 1000);
		}
	}

	generatePokemon() {
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

		const text = "Shedinja summoned **" + this.currentPokemon.species + "**!";
		this.on(text, () => {
			this.canUseMove = true;
			this.timeout = setTimeout(() => {
				const text = this.currentPokemon!.species + " fled!";
				this.on(text, () => this.nextRound());
				this.say(text);
			}, 5 * 1000);
		});
		this.say(text);
	}

	onNextRound() {
		this.canUseMove = false;
		if (this.round > 1) {
			const effectivenessScale: Dict<string> = {'1': '2x', '2': '4x', '-1': '0.5x', '-2': '0.25x', 'immune': '0x', '0': '1x'};
			let highestPoints = 0;
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
				player.say("Your move was **" + effectivenessScale[effectiveness] + "** effective!" + (points !== originalPoints ? " Your total score is now " + points + "." : ""));
			});
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
		const html = this.getRoundHtml(this.getPlayerPoints);
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			this.timeout = setTimeout(() => this.generatePokemon(), 5 * 1000);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd() {
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			const points = this.points.get(player);
			if (points && points >= this.maxPoints) {
				this.winners.set(player, 1);
				this.addBits(player, 500);
				if (this.firstMove === player) this.unlockAchievement(player, achievements.wonderguardwarrior!);
			}
		}

		this.announceWinners();
	}
}

const commands: Dict<ICommandDefinition<ShedinjasWonderTrials>> = {
	use: {
		command(target, room, user) {
			if (!this.canUseMove || !this.currentPokemon || (this.players[user.id] && this.players[user.id].eliminated)) return false;
			const player = this.createPlayer(user) || this.players[user.id];
			if (this.roundMoves.has(player)) return false;
			const move = Dex.getMove(target);
			if (!move) {
				user.say("You must specify a valid move.");
				return false;
			}
			if (!data.moves.includes(move.name)) {
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
					effectiveness = Dex.getEffectiveness('Fighting', this.currentPokemon) + Dex.getEffectiveness('Flying', this.currentPokemon);
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

			if (this.variant === 'inverse') {
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
	achievements,
	aliases: ["shedinjas", "swt", "wondertrials"],
	category: 'knowledge',
	commandDescriptions: [Config.commandCharacter + "use [move]"],
	commands,
	class: ShedinjasWonderTrials,
	description: "Players must use damaging moves that are super-effective against each Pokemon that Shedinja summons (no repeats in a round)!",
	formerNames: ["Wonder Guard Wipeout"],
	freejoin: true,
	name,
	mascot: "Shedinja",
	variants: [
		{
			name: "Shedinja's Inverse Wonder Trials",
			description: "Using an inverted type chart, Players must use damaging moves that are super-effective against each Pokemon that Shedinja summons (no repeats in a round)!",
			variant: "inverse",
		},
	],
};

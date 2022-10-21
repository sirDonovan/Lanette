import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { GameCommandDefinitions, IGameAchievement, IGameFile } from "../types/games";

type AchievementNames = "sunkentreasure";

const data: {baseStatTotals: Dict<number>; pokedex: string[]} = {
	baseStatTotals: {},
	pokedex: [],
};

class WishiwashisStatFishing extends ScriptedGame {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"sunkentreasure": {name: "Sunken Treasure", type: 'shiny', bits: 1000, repeatBits: 250, description: 'reel in a shiny Pokemon'},
	};

	canReel: boolean = false;
	consecutiveReels = new Map<Player, number>();
	// firstReel: Player | null;
	inactiveRoundLimit: number = 5;
	lastSpecies: string = '';
	maxPoints: number = 2000;
	maxRound: number = 20;
	points = new Map<Player, number>();
	queue: Player[] = [];
	roundReels = new Map<Player, boolean>();
	statNames: Dict<string> = {hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe', bst: 'BST'};
	stats: string[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe', 'bst'];

	static loadData(): void {
		for (const pokemon of Games.getPokemonList()) {
			if (!pokemon.types.includes("Water") || !Dex.hasModelData(pokemon)) continue;

			let bst = 0;
			for (const i in pokemon.baseStats) {
				// @ts-expect-error
				bst += pokemon.baseStats[i];
			}
			data.baseStatTotals[pokemon.id] = bst;
			data.pokedex.push(pokemon.name);
		}
	}

	onSignups(): void {
		if (this.options.freejoin) {
			this.setTimeout(() => this.nextRound(), 10 * 1000);
		}
	}

	scoreRound(): void {
		this.canReel = false;
		let firstPlayer: Player | null = null;
		for (let i = 0, len = this.queue.length; i < len; i++) {
			if (this.queue[i].eliminated) continue;
			const player = this.queue[i];
			if (!firstPlayer) {
				firstPlayer = player;
				// this.markFirstAction(player, 'firstReel');
			}
			const consecutiveReels = this.consecutiveReels.get(player) || 0;
			this.consecutiveReels.set(player, consecutiveReels + 1);
		}

		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			if (!this.queue.includes(this.players[i])) this.consecutiveReels.delete(this.players[i]);
		}

		if (!firstPlayer) {
			this.inactiveRounds++;
			if (this.inactiveRounds === this.inactiveRoundLimit) {
				this.inactivityEnd();
			} else {
				const text = "No one reeled in!";
				this.on(text, () => this.nextRound());
				this.setTimeout(() => this.say(text), 5000);
			}
			return;
		}

		if (this.inactiveRounds) this.inactiveRounds = 0;

		const consecutiveReels = this.consecutiveReels.get(firstPlayer);
		const extraChance = consecutiveReels ? consecutiveReels * 5 : 0;
		const shinyPokemon = this.rollForShinyPokemon(extraChance);
		const negative = !this.random(4);
		const stat = this.sampleOne(this.stats);

		let species = this.sampleOne(data.pokedex);
		while (species === this.lastSpecies) {
			species = this.sampleOne(data.pokedex);
		}
		this.lastSpecies = species;
		const pokemon = Dex.getPokemonCopy(species);

		let statPoints: number;
		if (stat === 'bst') {
			statPoints = data.baseStatTotals[pokemon.id];
		} else {
			// @ts-expect-error
			statPoints = pokemon.baseStats[stat] as number;
		}
		if (negative) statPoints *= -1;

		const points = this.points.get(firstPlayer) || 0;
		this.points.set(firstPlayer, points + statPoints);

		const uhtmlName = this.uhtmlBaseName + '-round' + this.round;
		const html = this.getCustomBoxDiv("<center>" + Dex.getPokemonModel(pokemon, undefined, undefined, shinyPokemon) + "<br />" +
			firstPlayer.name + " reeled in a <b>" + pokemon.name + (shinyPokemon ? ' \u2605' : '') + "</b> and " + (negative ? "lost" :
			"earned") + " its " + this.statNames[stat] + " (" + statPoints + ")!</center>");
		this.onUhtml(uhtmlName, html, () => {
			if (points >= this.maxPoints) {
				this.setTimeout(() => this.end(), 5000);
			} else {
				this.setTimeout(() => this.nextRound(), 5000);
			}
		});
		this.sayUhtml(uhtmlName, html);

		if (shinyPokemon) this.unlockAchievement(firstPlayer, WishiwashisStatFishing.achievements.sunkentreasure);
	}

	onNextRound(): void {
		this.roundReels.clear();
		this.queue = [];
		const roundHtml = this.getRoundHtml(players => this.getPlayerPoints(players));
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, roundHtml, () => {
			const reelHtml = "<div class='infobox'><center><blink><b>[&nbsp;!&nbsp;]</b></blink></center></div>";
			const reelUhtmlName = this.uhtmlBaseName + '-reel';
			this.onUhtml(reelUhtmlName, reelHtml, () => {
				this.canReel = true;
				this.setTimeout(() => this.scoreRound(), 5 * 1000);
			});
			const time = this.sampleOne([7000, 8000, 9000, 10000, 11000]);
			this.setTimeout(() => this.sayUhtml(reelUhtmlName, reelHtml), time);
		});
		this.sayUhtml(uhtmlName, roundHtml);
	}

	onEnd(): void {
		let highestPoints = 0;
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			const points = this.points.get(player);
			if (!points) continue;
			if (points > highestPoints) {
				this.winners.clear();
				highestPoints = points;
			}
			if (points === highestPoints) this.winners.set(player, points);
		}

		this.winners.forEach((value, player) => this.addBits(player, 500));

		this.announceWinners();
	}

	destroyPlayers(): void {
		super.destroyPlayers();

		this.consecutiveReels.clear();
		this.roundReels.clear();
	}
}

const commands: GameCommandDefinitions<WishiwashisStatFishing> = {
	reel: {
		command(target, room, user) {
			if (this.roundReels.has(this.players[user.id])) return false;
			const player = this.createPlayer(user) || this.players[user.id];
			this.roundReels.set(player, true);
			if (!this.canReel) return false;
			this.queue.push(player);
			return true;
		},
	},
};

export const game: IGameFile<WishiwashisStatFishing> = {
	aliases: ["wishiwashis", "wsf", "sf"],
	category: 'reaction',
	challengeSettings: {
		onevsone: {
			enabled: true,
		},
	},
	commandDescriptions: [Config.commandCharacter + "reel"],
	commands,
	class: WishiwashisStatFishing,
	description: "Players await the [ ! ] signal to reel in Pokemon and earn points based on their stats!",
	formerNames: ["Stat Fishing"],
	freejoin: true,
	name: "Wishiwashi's Stat Fishing",
	mascot: "Wishiwashi",
};

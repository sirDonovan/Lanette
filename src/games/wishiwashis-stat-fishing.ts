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
		const pokemonList = Games.getPokemonList(x => x.types.includes("Water") && Dex.hasGifData(x));
		for (const pokemon of pokemonList) {
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
		if (this.format.options.freejoin) {
			this.timeout = setTimeout(() => this.nextRound(), 10 * 1000);
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
				this.timeout = setTimeout(() => this.say(text), 5000);
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

		const html = "<center>" + Dex.getPokemonGif(pokemon, undefined, undefined, shinyPokemon) + "<br />" + firstPlayer.name + " " +
			"reeled in a <b>" + pokemon.name + (shinyPokemon ? ' \u2605' : '') + "</b> and " + (negative ? "lost" : "earned") + " its " +
			this.statNames[stat] + " (" + statPoints + ")!</center>";
		this.onHtml(html, () => {
			if (points >= this.maxPoints) {
				this.timeout = setTimeout(() => this.end(), 5000);
			} else {
				this.timeout = setTimeout(() => this.nextRound(), 5000);
			}
		});
		this.sayHtml(html);
		if (shinyPokemon) this.unlockAchievement(firstPlayer, WishiwashisStatFishing.achievements.sunkentreasure);
	}

	onNextRound(): void {
		this.roundReels.clear();
		this.queue = [];
		const roundHtml = this.getRoundHtml(players => this.getPlayerPoints(players));
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, roundHtml, () => {
			const reelHtml = "<center><blink><font size='3'><b>[ ! ]</b></font></blink></center>";
			this.onHtml(reelHtml, () => {
				this.canReel = true;
				this.timeout = setTimeout(() => this.scoreRound(), 5 * 1000);
			});
			const time = this.sampleOne([7000, 8000, 9000, 10000, 11000]);
			this.timeout = setTimeout(() => this.sayHtml(reelHtml), time);
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
			if (points === highestPoints) this.winners.set(player, 1);
		}

		this.winners.forEach((value, player) => this.addBits(player, 500));

		this.announceWinners();
	}
}

const commands: GameCommandDefinitions<WishiwashisStatFishing> = {
	reel: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
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
	commandDescriptions: [Config.commandCharacter + "reel"],
	commands,
	class: WishiwashisStatFishing,
	description: "Players await the [ ! ] signal to reel in Pokemon and earn points based on their stats!",
	formerNames: ["Stat Fishing"],
	freejoin: true,
	name: "Wishiwashi's Stat Fishing",
	mascot: "Wishiwashi",
};

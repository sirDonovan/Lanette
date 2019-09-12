import { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { Game } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";

const name = "Wishiwashi's Stat Fishing";
const data: {baseStatTotals: Dict<number>, pokedex: string[]} = {
	baseStatTotals: {},
	pokedex: [],
};
let loadedData = false;

class WishiwashisStatFishing extends Game {
	static loadData(room: Room) {
		if (loadedData) return;

		room.say("Loading data for " + name + "...");

		const pokemonList = Dex.getPokemonList(x => x.types.includes("Water") && Dex.hasGifData(x));
		for (let i = 0; i < pokemonList.length; i++) {
			const pokemon = pokemonList[i];
			let bst = 0;
			for (const i in pokemon.baseStats) {
				// @ts-ignore
				bst += pokemon.baseStats[i];
			}
			data.baseStatTotals[pokemon.id] = bst;
			data.pokedex.push(pokemon.species);
		}
		loadedData = true;
	}

	canReel: boolean = false;
	consecutiveReels = new Map<Player, number>();
	// firstReel: Player | null;
	lastSpecies: string = '';
	maxPoints: number = 2000;
	points = new Map<Player, number>();
	queue: Player[] = [];
	roundLimit: number = 20;
	roundReels = new Map<Player, boolean>();
	statNames: Dict<string> = {hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe', bst: 'BST'};
	stats: string[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe', 'bst'];

	onSignups() {
		if (this.options.freejoin) {
			this.timeout = setTimeout(() => this.nextRound(), 10 * 1000);
		}
	}

	scoreRound() {
		this.canReel = false;
		let player: Player | null = null;
		for (let i = 0, len = this.queue.length; i < len; i++) {
			if (this.queue[i].eliminated) continue;
			if (!player) {
				player = this.queue[i];
				// this.markFirstAction(player, 'firstReel');
			}
			const consecutiveReels = this.consecutiveReels.get(this.queue[i]) || 0;
			this.consecutiveReels.set(this.queue[i], consecutiveReels + 1);
		}

		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			if (!this.queue.includes(this.players[i])) this.consecutiveReels.delete(this.players[i]);
		}

		if (!player) {
			const text = "No one reeled in!";
			this.on(text, () => this.nextRound());
			this.timeout = setTimeout(() => this.say(text), 5000);
			return;
		}

		let species = this.sampleOne(data.pokedex);
		while (species === this.lastSpecies) {
			species = this.sampleOne(data.pokedex);
		}
		const pokemon = Dex.getPokemonCopy(species)!;
		const consecutiveReels = this.consecutiveReels.get(player);
		const extraChance = consecutiveReels ? (consecutiveReels * 5) : 0;
		if (this.rollForShinyPokemon(extraChance)) {
			pokemon.shiny = true;
		}
		const negative = !this.random(4);
		const stat = this.sampleOne(this.stats);
		let statPoints: number;
		if (stat === 'bst') {
			statPoints = data.baseStatTotals[pokemon.id];
		} else {
			// @ts-ignore
			statPoints = pokemon.baseStats[stat];
		}
		if (negative) statPoints *= -1;

		const points = this.points.get(player) || 0;
		this.points.set(player, points + statPoints);

		const html = "<center>" + Dex.getPokemonGif(pokemon) + "<br>" + player.name + " reeled in a <b>" + pokemon.species + (pokemon.shiny ? ' \u2605' : '') + "</b> and " + (negative ? "lost" : "earned") + " its " + this.statNames[stat] + " (" + statPoints + ")!</center>";
		this.onHtml(html, () => {
			if (points >= this.maxPoints) {
				this.timeout = setTimeout(() => this.end(), 5000);
			} else {
				this.timeout = setTimeout(() => this.nextRound(), 5000);
			}
		});
		this.sayHtml(html);
		// if (pokemon.shiny) Games.unlockAchievement(this.room, player.name, 'Sunken Treasure', this);
	}

	onNextRound() {
		if (this.round > this.roundLimit) return this.end();
		this.roundReels = new Map();
		this.queue = [];
		const html = this.getRoundHtml(this.getPlayerPoints);
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			const html = "<center><blink><font size='3'><b>[ ! ]</b></font></blink></center>";
			this.onHtml(html, () => {
				this.canReel = true;
				this.timeout = setTimeout(() => this.scoreRound(), 5 * 1000);
			});
			const time = this.sampleOne([7000, 8000, 9000, 10000, 11000]);
			this.timeout = setTimeout(() => this.sayHtml(html), time);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd() {
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
		this.say("**Winner" + (this.winners.size > 1 ? "s" : "") + "**: " + this.getPlayerNames(this.winners));
		this.winners.forEach((value, user) => {
			this.addBits(user, 500);
		});
	}
}

const commands: Dict<ICommandDefinition<WishiwashisStatFishing>> = {
	reel: {
		command(target, room, user) {
			const player = this.createPlayer(user) || this.players[user.id];
			if (this.roundReels.has(player) || player.eliminated) return;
			this.roundReels.set(player, true);
			if (!this.canReel) return;
			this.queue.push(player);
		},
	},
};

export const game: IGameFile<WishiwashisStatFishing> = {
	aliases: ["wishiwashis", "wsf", "sf"],
	battleFrontierCategory: 'Reaction',
	commandDescriptions: [Config.commandCharacter + "reel"],
	commands,
	class: WishiwashisStatFishing,
	description: "Players await the [ ! ] signal to reel in Pokemon and earn points based on their stats!",
	formerNames: ["Stat Fishing"],
	freejoin: true,
	name,
	mascot: "Wishiwashi",
};

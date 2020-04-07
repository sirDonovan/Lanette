import { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { Game } from "../room-game";
import { Room } from "../rooms";
import { IGameFile, AchievementsDict, GameCommandReturnType } from "../types/games";

interface ICaughtPokemon {
	points: number;
	species: string;
}

const name = "Tauros' Safari Zone";
const data: {baseStatTotals: Dict<number>; pokedex: string[]} = {
	baseStatTotals: {},
	pokedex: [],
};
let loadedData = false;

const achievements: AchievementsDict = {
	"pokemonranger": {name: "Pokemon Ranger", type: 'first', bits: 1000, description: 'catch first in every round'},
};

class TaurosSafariZone extends Game {
	canCatch: boolean = false;
	caughtPokemon = new Map<Player, number>();
	firstCatch: Player | false | undefined;
	highestBST: string = '';
	highestCatch: Player | null = null;
	maxPoints: number = 1000;
	points = new Map<Player, number>();
	revealTime: number = 10 * 1000;
	roundCatches = new Map<Player, ICaughtPokemon>();
	roundLimit: number = 20;
	roundPokemon = new Map<string, ICaughtPokemon>();
	roundTime: number = 5 * 1000;
	winners = new Map<Player, number>();

	static loadData(room: Room): void {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const pokemonList = Games.getPokemonList(pokemon => Dex.hasGifData(pokemon) && pokemon.id !== 'voltorb' && pokemon.id !== 'electrode');
		const copy = pokemonList.slice();
		for (const pokemon of copy) {
			if (pokemon.otherFormes) {
				const formes = pokemon.otherFormes;
				for (const name of formes) {
					const forme = Dex.getExistingPokemon(name);
					if (Dex.hasGifData(forme)) pokemonList.push(forme);
				}
			}
		}

		for (const pokemon of pokemonList) {
			data.pokedex.push(pokemon.id);
			let bst = 0;
			for (const stat in pokemon.baseStats) {
				// @ts-ignore
				bst += pokemon.baseStats[stat];
			}
			data.baseStatTotals[pokemon.id] = bst;
		}

		loadedData = true;
	}

	onSignups(): void {
		if (this.format.options.freejoin) {
			this.timeout = setTimeout(() => {
				this.nextRound();
			}, 5000);
		}
	}

	generatePokemon(): void {
		const pokemonList = this.sampleMany(data.pokedex, 3).map(x => Dex.getExistingPokemon(x));
		let hasVoltorb = false;
		let hasElectrode = false;
		const baseStatTotals: {pokemon: string; bst: number}[] = [];
		for (let i = 0; i < pokemonList.length; i++) {
			let currentPokemon = pokemonList[i];
			const chance = this.random(100);
			if (chance < 25 && !hasVoltorb && !hasElectrode) {
				if (chance < 10 && !hasElectrode) {
					hasElectrode = true;
					currentPokemon = Dex.getExistingPokemon('electrode');
					pokemonList[i] = currentPokemon;
					this.roundPokemon.set(Tools.toId(currentPokemon.species), {species: currentPokemon.species, points: -250});
				} else {
					hasVoltorb = true;
					currentPokemon = Dex.getExistingPokemon('voltorb');
					pokemonList[i] = currentPokemon;
					this.roundPokemon.set(Tools.toId(currentPokemon.species), {species: currentPokemon.species, points: -100});
				}
			} else {
				baseStatTotals.push({pokemon: currentPokemon.species, bst: data.baseStatTotals[currentPokemon.id]});
				const points = 100 + Math.round((data.baseStatTotals[pokemonList[i].id] / 12));
				this.roundPokemon.set(Tools.toId(currentPokemon.species), {species: currentPokemon.species, points});
			}
		}
		baseStatTotals.sort((a, b) => b.bst - a.bst);
		this.highestBST = baseStatTotals[0].pokemon;
		let html = "<div class='infobox'><center>";
		for (const pokemon of pokemonList) {
			html += Dex.getPokemonGif(pokemon);
		}
		html += "<br />Wild <b>" + pokemonList.map(x => x.species).join(", ") + "</b> appeared!</center></div>";
		const uhtmlName = this.uhtmlBaseName + '-pokemon';
		this.onUhtml(uhtmlName, html, () => {
			this.canCatch = true;
			this.timeout = setTimeout(() => this.nextRound(), this.roundTime);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onNextRound(): void {
		this.canCatch = false;
		if (this.round > 1) {
			const catchQueue: {player: Player; pokemon: string; points: number}[] = [];
			let firstCatch = true;
			this.roundCatches.forEach((pokemon, player) => {
				if (player.eliminated) return;
				if (firstCatch && pokemon.points > 0) {
					if (this.firstCatch === undefined) {
						this.firstCatch = player;
					} else {
						if (this.firstCatch && this.firstCatch !== player) this.firstCatch = false;
					}
					firstCatch = false;
				}
				catchQueue.push({player, pokemon: pokemon.species, points: pokemon.points});
				let caughtPokemon = this.caughtPokemon.get(player) || 0;
				caughtPokemon++;
				this.caughtPokemon.set(player, caughtPokemon);
			});
			catchQueue.sort((a, b) => b.points - a.points);
			let highestPoints = 0;
			for (const slot of catchQueue) {
				const player = slot.player;
				let points = this.points.get(player) || 0;
				points += slot.points;
				this.points.set(player, points);
				player.say(slot.pokemon + " was worth " + slot.points + " points! Your total score is now: " + points + ".");
				if (points > highestPoints) highestPoints = points;
				// if (slot.pokemon === this.highestBST) this.markFirstAction(player, 'highestCatch');
			}
			this.roundCatches.clear();
			this.roundPokemon.clear();
			if (highestPoints >= this.maxPoints) {
				this.timeout = setTimeout(() => this.end(), 3000);
				return;
			}
			if (this.round > this.roundLimit) {
				this.timeout = setTimeout(() => {
					this.say("We've reached the end of the game!");
					this.maxPoints = highestPoints;
					this.timeout = setTimeout(() => this.end(), 3000);
				}, 3000);
				return;
			}
		}
		const html = this.getRoundHtml(this.getPlayerPoints);
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			this.timeout = setTimeout(() => this.generatePokemon(), this.revealTime);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd(): void {
		const totalRounds = this.round - 1;
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			const points = this.points.get(player);
			if (points && points >= this.maxPoints) this.winners.set(player, 1);
			if (this.firstCatch && player === this.firstCatch) this.unlockAchievement(player, achievements.pokemonranger!);
		}

		this.convertPointsToBits(0.5, 0.1);
		this.announceWinners();
	}
}

const commands: Dict<ICommandDefinition<TaurosSafariZone>> = {
	catch: {
		command(target, room, user): GameCommandReturnType {
			if (!this.canCatch || (user.id in this.players && this.players[user.id].eliminated)) return false;
			const player = this.createPlayer(user) || this.players[user.id];
			if (this.roundCatches.has(player)) return false;
			target = Tools.toId(target);
			if (!target) return false;
			const pokemon = this.roundPokemon.get(target);
			if (!pokemon) return false;
			this.roundCatches.set(player, pokemon);
			this.roundPokemon.delete(target);
			return true;
		},
	},
};

export const game: IGameFile<TaurosSafariZone> = {
	aliases: ["tauros", "tsz", "ctp", "safarizone"],
	category: 'speed',
	commandDescriptions: [Config.commandCharacter + "catch [Pokemon]"],
	commands,
	class: TaurosSafariZone,
	description: "Players try to catch Pokemon each round before others while avoiding Voltorb and Electrode! Points are determined by base stats.",
	formerNames: ["Catch That Pokemon"],
	freejoin: true,
	name,
	mascot: "Tauros",
};

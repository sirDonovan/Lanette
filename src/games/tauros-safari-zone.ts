import { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { Game } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";

interface ICaughtPokemon {
	points: number;
	species: string;
}

const name = "Tauros' Safari Zone";
const data: {baseStatTotals: Dict<number>, pokedex: string[]} = {
	baseStatTotals: {},
	pokedex: [],
};
let loadedData = false;

class TaurosSafariZone extends Game {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const pokemonList = Games.getPokemonList(pokemon => Dex.hasGifData(pokemon) && pokemon.id !== 'voltorb' && pokemon.id !== 'electrode');
		const copy = pokemonList.slice();
		for (let i = 0; i < copy.length; i++) {
			if (copy[i].otherFormes) {
				const formes = copy[i].otherFormes!;
				for (let i = 0; i < formes.length; i++) {
					const forme = Dex.getExistingPokemon(formes[i]);
					if (Dex.hasGifData(forme)) pokemonList.push(forme);
				}
			}
		}

		for (let i = 0; i < pokemonList.length; i++) {
			data.pokedex.push(pokemonList[i].id);
			let bst = 0;
			for (const stat in pokemonList[i].baseStats) {
				// @ts-ignore
				bst += pokemonList[i].baseStats[stat];
			}
			data.baseStatTotals[pokemonList[i].id] = bst;
		}

		loadedData = true;
	}

	canCatch: boolean = false;
	caughtPokemon = new Map<Player, number>();
	firstCatch: Player | null = null;
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

	onSignups() {
		if (this.format.options.freejoin) {
			this.timeout = setTimeout(() => {
				this.nextRound();
			}, 5000);
		}
	}

	generatePokemon() {
		const pokemon = this.sampleMany(data.pokedex, 3).map(x => Dex.getExistingPokemon(x));
		let hasVoltorb = false;
		let hasElectrode = false;
		const baseStatTotals: {pokemon: string, bst: number}[] = [];
		for (let i = 0; i < pokemon.length; i++) {
			let currentPokemon = pokemon[i];
			const chance = this.random(100);
			if (chance < 25 && !hasVoltorb && !hasElectrode) {
				if (chance < 10 && !hasElectrode) {
					hasElectrode = true;
					currentPokemon = Dex.getExistingPokemon('electrode');
					pokemon[i] = currentPokemon;
					this.roundPokemon.set(Tools.toId(currentPokemon.species), {species: currentPokemon.species, points: -250});
				} else {
					hasVoltorb = true;
					currentPokemon = Dex.getExistingPokemon('voltorb');
					pokemon[i] = currentPokemon;
					this.roundPokemon.set(Tools.toId(currentPokemon.species), {species: currentPokemon.species, points: -100});
				}
			} else {
				baseStatTotals.push({pokemon: currentPokemon.species, bst: data.baseStatTotals[currentPokemon.id]});
				const points = 100 + Math.round((data.baseStatTotals[pokemon[i].id] / 12));
				this.roundPokemon.set(Tools.toId(currentPokemon.species), {species: currentPokemon.species, points});
			}
		}
		baseStatTotals.sort((a, b) => b.bst - a.bst);
		this.highestBST = baseStatTotals[0].pokemon;
		let html = "<div class='infobox'><center>";
		for (let i = 0; i < pokemon.length; i++) {
			html += Dex.getPokemonGif(pokemon[i]);
		}
		html += "<br />Wild <b>" + pokemon.map(x => x.species).join(", ") + "</b> appeared!</center></div>";
		const uhtmlName = this.uhtmlBaseName + '-pokemon';
		this.onUhtml(uhtmlName, html, () => {
			this.canCatch = true;
			this.timeout = setTimeout(() => this.nextRound(), this.roundTime);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onNextRound() {
		this.canCatch = false;
		if (this.round > 1) {
			const catches: {player: Player, pokemon: string, points: number}[] = [];
			// let actions = 0;
			this.roundCatches.forEach((pokemon, user) => {
				if (this.players[user.id].eliminated) return;
				const player = this.players[user.id];
				if (pokemon.points > 0) {
					// if (actions === 0) this.markFirstAction(player, 'firstCatch');
					// actions++;
				}
				catches.push({player, pokemon: pokemon.species, points: pokemon.points});
				let caughtPokemon = this.caughtPokemon.get(player) || 0;
				caughtPokemon++;
				this.caughtPokemon.set(player, caughtPokemon);
			});
			catches.sort((a, b) => b.points - a.points);
			let highestPoints = 0;
			for (let i = 0; i < catches.length; i++) {
				const player = catches[i].player;
				let points = this.points.get(player) || 0;
				points += catches[i].points;
				this.points.set(player, points);
				player.say(catches[i].pokemon + " was worth " + catches[i].points + " points! Your total score is now: " + points + ".");
				if (points > highestPoints) highestPoints = points;
				// if (catches[i].pokemon === this.highestBST) this.markFirstAction(player, 'highestCatch');
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

	onEnd() {
		const totalRounds = this.round - 1;
		const achievement = [];
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			const points = this.points.get(player);
			if (points && points >= this.maxPoints) this.winners.set(player, 1);
			const caughtPokemon = this.caughtPokemon.get(player);
			if (caughtPokemon && caughtPokemon === totalRounds) achievement.push(player);
		}

		/*
		if (achievement.length) {
			let multiple = achievement.length > 1;
			for (let i = 0; i < achievement.length; i++) {
				Games.unlockAchievement(this.room, achievement[i], "Gotta Catch 'em All", this, multiple);
			}
		}

		this.winners.forEach((value, user) => {
			if (user === this.firstCatch) Games.unlockAchievement(this.room, user, "Pokemon Ranger", this);
			if (this.highestCatch === user) Games.unlockAchievement(this.room, user, "Legendary Collector", this);
		});
		*/

		this.convertPointsToBits(0.5, 0.1);
		this.announceWinners();
	}
}

const commands: Dict<ICommandDefinition<TaurosSafariZone>> = {
	catch: {
		command(target, room, user) {
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

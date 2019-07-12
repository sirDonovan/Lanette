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
const pokedex: string[] = [];
let loadedData = false;

class TaurosSafariZone extends Game {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const pokemonList = Dex.getPokemonList(pokemon => !Dex.hasGifData(pokemon));
		for (let i = 0; i < pokemonList.length; i++) {
			pokedex.push(pokemonList[i].species);
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
		if (this.parentGame && this.parentGame.id === 'battlefrontier') {
			this.revealTime = 5000;
			this.roundTime = 3000;
		}
		if (this.options.freejoin) {
			this.timeout = setTimeout(() => {
				this.nextRound();
			}, 5000);
		}
	}

	generatePokemon() {
		const pokemon = Tools.sampleMany(pokedex, 3).map(x => Dex.getExistingPokemon(x));
		let hasVoltorb = false;
		let hasElectrode = false;
		const baseStatTotals: {pokemon: string, bst: number}[] = [];
		for (let i = 0; i < pokemon.length; i++) {
			let currentPokemon = pokemon[i];
			const chance = Tools.random(100);
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
				if (currentPokemon.otherFormes && chance < 85) {
					currentPokemon = Dex.getExistingPokemon(Tools.sampleOne(currentPokemon.otherFormes));
					pokemon[i] = currentPokemon;
				}
				let bst = 0;
				for (const stat in currentPokemon.baseStats) {
					// @ts-ignore
					bst += currentPokemon.baseStats[stat];
				}
				baseStatTotals.push({pokemon: currentPokemon.species, bst});
				const points = 100 + Math.round((bst / 12));
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
		this.onUhtml(html, uhtmlName, () => {
			this.canCatch = true;
			this.timeout = setTimeout(() => this.nextRound(), this.roundTime);
		});
		this.sayUhtml(html, uhtmlName);
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
		this.onUhtml(html, uhtmlName, () => {
			this.timeout = setTimeout(() => this.generatePokemon(), this.revealTime);
		});
		this.sayUhtml(html, uhtmlName);
	}

	onEnd() {
		if (this.parentGame && this.parentGame.id === 'battlefrontier') {
			let highestPoints = 0;
			const winners = new Map<Player, number>();
			for (const i in this.players) {
				const player = this.players[i];
				if (player.eliminated) continue;
				const points = this.points.get(player) || 0;
				if (points > highestPoints) {
					winners.clear();
					winners.set(player, 1);
					highestPoints = points;
				} else if (points === highestPoints) {
					winners.set(player, 1);
				}
			}
			this.winners = winners;
		} else {
			const totalRounds = this.round - 1;
			const achievement = [];
			for (const i in this.players) {
				const player = this.players[i];
				if (player.eliminated) continue;
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
			*/
		}
		const names = this.getPlayerNames(this.winners);
		this.say("**Winner" + (this.winners.size > 1 ? "s" : "") + "**: " + names);
		this.convertPointsToBits(0.5, 0.1);
		/*
		this.winners.forEach((value, user) => {
			if (user === this.firstCatch) Games.unlockAchievement(this.room, user, "Pokemon Ranger", this);
			if (this.highestCatch === user) Games.unlockAchievement(this.room, user, "Legendary Collector", this);
		});
		*/
	}
}

const commands: Dict<ICommandDefinition<TaurosSafariZone>> = {
	catch: {
		command(target, room, user) {
			if (!this.canCatch || (user.id in this.players && this.players[user.id].eliminated)) return;
			const player = this.createPlayer(user) || this.players[user.id];
			if (this.roundCatches.has(player)) return;
			target = Tools.toId(target);
			if (!target) return;
			const pokemon = this.roundPokemon.get(target);
			if (!pokemon) return;
			this.roundCatches.set(player, pokemon);
			this.roundPokemon.delete(target);
		},
	},
};

export const game: IGameFile<TaurosSafariZone> = {
	aliases: ["tauros", "ctp", "safarizone"],
	battleFrontierCategory: 'Speed',
	commandDescriptions: [Config.commandCharacter + "catch [Pokemon]"],
	commands,
	class: TaurosSafariZone,
	description: "Players try to catch Pokemon each round before others while avoiding Voltorb and Electrode! Points are determined by base stats.",
	formerNames: ["Catch That Pokemon"],
	freejoin: true,
	name,
	mascot: "Tauros",
};

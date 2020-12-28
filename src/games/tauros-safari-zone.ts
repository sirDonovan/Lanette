import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { GameCommandDefinitions, IGameAchievement, IGameFile } from "../types/games";

type AchievementNames = "pokemonranger";

interface ICaughtPokemon {
	points: number;
	species: string;
}

const data: {baseStatTotals: Dict<number>; pokedex: string[]} = {
	baseStatTotals: {},
	pokedex: [],
};

class TaurosSafariZone extends ScriptedGame {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"pokemonranger": {name: "Pokemon Ranger", type: 'first', bits: 1000, description: 'catch first in every round'},
	};

	canCatch: boolean = false;
	caughtPokemon = new Map<Player, number>();
	firstCatch: Player | false | undefined;
	highestBST: string = '';
	highestCatch: Player | null = null;
	inactiveRoundLimit: number = 5;
	maxPoints: number = 1000;
	points = new Map<Player, number>();
	revealTime: number = 10 * 1000;
	roundCatches = new Map<Player, ICaughtPokemon>();
	roundLimit: number = 20;
	roundPokemon = new Map<string, ICaughtPokemon>();
	roundTime: number = 5 * 1000;
	winners = new Map<Player, number>();

	static loadData(): void {
		const pokemonList = Games.getPokemonList(pokemon => Dex.hasGifData(pokemon) && pokemon.id !== 'voltorb' &&
			pokemon.id !== 'electrode');
		const listWithFormes = pokemonList.slice();
		for (const pokemon of pokemonList) {
			if (pokemon.otherFormes) {
				for (const name of pokemon.otherFormes) {
					const forme = Dex.getExistingPokemon(name);
					if (Dex.hasGifData(forme)) listWithFormes.push(forme);
				}
			}
		}

		for (const pokemon of listWithFormes) {
			data.pokedex.push(pokemon.id);
			let bst = 0;
			for (const stat in pokemon.baseStats) {
				// @ts-expect-error
				bst += pokemon.baseStats[stat];
			}
			data.baseStatTotals[pokemon.id] = bst;
		}
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
		let hasVoltorb: boolean | undefined;
		let hasElectrode: boolean | undefined;
		const baseStatTotals: {pokemon: string; bst: number}[] = [];
		for (let i = 0; i < pokemonList.length; i++) {
			let currentPokemon = pokemonList[i];
			const chance = this.random(100);
			if (chance < 25 && !hasVoltorb && !hasElectrode) {
				if (chance < 10) {
					hasElectrode = true;
					currentPokemon = Dex.getExistingPokemon('electrode');
					pokemonList[i] = currentPokemon;
					this.roundPokemon.set(Tools.toId(currentPokemon.name), {species: currentPokemon.name, points: -250});
				} else {
					hasVoltorb = true;
					currentPokemon = Dex.getExistingPokemon('voltorb');
					pokemonList[i] = currentPokemon;
					this.roundPokemon.set(Tools.toId(currentPokemon.name), {species: currentPokemon.name, points: -100});
				}
			} else {
				baseStatTotals.push({pokemon: currentPokemon.name, bst: data.baseStatTotals[currentPokemon.id]});
				const points = 100 + Math.round(data.baseStatTotals[pokemonList[i].id] / 12);
				this.roundPokemon.set(Tools.toId(currentPokemon.name), {species: currentPokemon.name, points});
			}
		}
		baseStatTotals.sort((a, b) => b.bst - a.bst);
		this.highestBST = baseStatTotals[0].pokemon;
		let html = "<div class='infobox'><center>";
		for (const pokemon of pokemonList) {
			html += Dex.getPokemonGif(pokemon);
		}
		html += "<br />Wild <b>" + pokemonList.map(x => x.name).join(", ") + "</b> appeared!</center></div>";
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
			let highestPoints = 0;
			if (this.roundCatches.size) {
				if (this.inactiveRounds) this.inactiveRounds = 0;

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
				for (const slot of catchQueue) {
					const player = slot.player;
					let points = this.points.get(player) || 0;
					points += slot.points;
					this.points.set(player, points);
					player.say(slot.pokemon + " was worth " + slot.points + " points! Your total score is now: " + points + ".");
					if (points > highestPoints) highestPoints = points;
					// if (slot.pokemon === this.highestBST) this.markFirstAction(player, 'highestCatch');
				}
			} else {
				this.inactiveRounds++;
				if (this.inactiveRounds === this.inactiveRoundLimit) {
					this.inactivityEnd();
					return;
				}
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
		const html = this.getRoundHtml(players => this.getPlayerPoints(players));
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			this.timeout = setTimeout(() => this.generatePokemon(), this.revealTime);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd(): void {
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			const points = this.points.get(player);
			if (points && points >= this.maxPoints) this.winners.set(player, 1);
			if (this.firstCatch && player === this.firstCatch) this.unlockAchievement(player, TaurosSafariZone.achievements.pokemonranger);
		}

		this.convertPointsToBits(0.5, 0.1);
		this.announceWinners();
	}
}

const commands: GameCommandDefinitions<TaurosSafariZone> = {
	catch: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (!this.canCatch) return false;
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
	description: "Players try to catch Pokemon each round before others while avoiding Voltorb and Electrode! Points are determined by " +
		"base stats.",
	formerNames: ["Catch That Pokemon"],
	freejoin: true,
	name: "Tauros' Safari Zone",
	mascot: "Tauros",
};

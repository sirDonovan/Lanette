import type { Player } from "../room-activity";
import type { Room } from "../rooms";
import { Game } from '../room-game';
import type { User } from "../users";
import type { GameCommandDefinitions, IGameFile } from "../types/games";
import type { IPokemon } from "../types/dex";

const data: {pokemon: Dict<readonly string[]>} = {
	pokemon: {},
};

const banlist = ['giratina'];

class MachopsMatchups extends Game {
	canAttack: boolean = false;
	canLateJoin = true;
	maxPoints: number = 10;
	playerPokemon = new Map<Player, IPokemon>();
	points = new Map<Player, number>();
	roundActions = new Set<Player>();
	usedPokemon: string[] = [];

	// set once the game starts
	currentPokemon!: IPokemon;

	static loadData(room: Room | User): void {
		const pokemonList = Games.getPokemonList(x => !x.forme && !banlist.includes(x.id) && Dex.hasGifData(x) && x.types.length > 1 &&
			!x.types.includes('Steel') && !x.types.includes('Normal'));

		for (const pokemon of pokemonList) {
			data.pokemon[pokemon.name] = pokemon.types;
		}
	}

	onAddPlayer(player: Player, lateJoin?: boolean): boolean {
		if (lateJoin) {
			const pokedex = this.shuffle(Object.keys(data.pokemon));
			while (this.usedPokemon.includes(pokedex[0]) && pokedex.length) {
				pokedex.shift();
			}
			if (this.usedPokemon.includes(pokedex[0])) return false;
			this.playerPokemon.set(player, Dex.getExistingPokemon(pokedex[0]));
			this.usedPokemon.push(pokedex[0]);
			player.say("You have been randomly assigned " + pokedex[0] + "!");
		}

		return true;
	}

	onStart(): void {
		this.say("Now PMing Pokemon!");

		const pokedex = this.shuffle(Object.keys(data.pokemon));
		for (const id in this.players) {
			const player = this.players[id];
			const pokemon = pokedex[0];
			pokedex.shift();
			this.playerPokemon.set(player, Dex.getExistingPokemon(pokemon));
			this.usedPokemon.push(pokemon);
			player.say("You have been randomly assigned " + pokemon + "!");
		}

		this.nextRound();
	}

	onNextRound(): void {
		this.canAttack = false;
		if (this.winners.size) {
			this.end();
			return;
		}

		this.currentPokemon = Dex.getExistingPokemon(this.sampleOne(Object.keys(data.pokemon)));
		this.roundActions.clear();
		const html = this.getRoundHtml(this.getPlayerPoints);
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			this.timeout = setTimeout(() => {
				const html = "<center>" + Dex.getPokemonGif(this.currentPokemon) + "<br /><b>" + this.currentPokemon.name + "</b><br />" +
					Dex.getTypeHtml(Dex.getExistingType(this.currentPokemon.types[0])) + "&nbsp;/&nbsp;" +
					Dex.getTypeHtml(Dex.getExistingType(this.currentPokemon.types[1])) + "</center>";
				const uhtmlName = this.uhtmlBaseName + '-pokemon';
				this.onUhtml(uhtmlName, html, () => {
					this.canAttack = true;
					this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
				});
				this.sayUhtml(uhtmlName, html);
			}, 5 * 1000);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd(): void {
		this.winners.forEach((value, player) => {
			this.addBits(player, 250);
		});

		this.announceWinners();
	}

	getCombinedEffectiveness(attacker: IPokemon, defender: IPokemon): number {
		let combinedEffectiveness = 1;
		for (const type of attacker.types) {
			if (Dex.isImmune(type, defender)) {
				combinedEffectiveness = 0.001;
				break;
			}

			const effectiveness = Dex.getEffectiveness(type, defender);
			if (effectiveness === -2) {
				combinedEffectiveness *= 0.25;
			} else if (effectiveness === -1) {
				combinedEffectiveness *= 0.5;
			} else if (effectiveness === 1) {
				combinedEffectiveness *= 2;
			} else if (effectiveness === 2) {
				combinedEffectiveness *= 4;
			}
		}

		return combinedEffectiveness;
	}
}

const commands: GameCommandDefinitions<MachopsMatchups> = {
	attack: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (!this.canAttack || this.roundActions.has(this.players[user.id])) return false;
			const player = this.players[user.id];
			this.roundActions.add(player);
			const pokemon = this.playerPokemon.get(player)!;

			const outcome = this.getCombinedEffectiveness(pokemon, this.currentPokemon) /
				this.getCombinedEffectiveness(this.currentPokemon, pokemon);

			if (outcome > 1) {
				let points = this.points.get(player) || 0;
				points += 1;
				this.points.set(player, points);
				player.say("Your Pokemon defeated " + this.currentPokemon.name + " and earned you 1 point! Your total is now " +
					points + ".");
				if (points >= this.maxPoints) {
					this.winners.set(player, points);
				}
			} else if (outcome < 1) {
				let points = this.points.get(player) || 0;
				points -= 1;
				this.points.set(player, points);
				player.say(this.currentPokemon.name + " defeated your Pokemon and took 1 point! Your total is now " +
					points + ".");
			} else {
				player.say("It was a tie between your Pokemon and " + this.currentPokemon.name + "!");
			}

			return true;
		},
		aliases: ['fight'],
	},
};

export const game: IGameFile<MachopsMatchups> = {
	aliases: ["machops", "matchups"],
	class: MachopsMatchups,
	commands,
	commandDescriptions: [Config.commandCharacter + 'attack'],
	description: "Players are randomly assigned a Pokemon to go against other randomly chosen Pokemon and earn points based on type " +
		"matchups!",
	name: "Machop's Matchups",
	mascot: "Machop",
};

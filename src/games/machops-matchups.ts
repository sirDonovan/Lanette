import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import { addPlayers, assertStrictEqual, startGame } from "../test/test-tools";
import type { GameCommandDefinitions, GameFileTests, IGameFile } from "../types/games";
import type { IPokemon } from "../types/pokemon-showdown";

const data: {keys: string[], pokemon: Dict<readonly string[]>, pokemonByType: Dict<string[]>} = {
	keys: [],
	pokemon: {},
	pokemonByType: {},
};

const banlist = ['giratina'];

class MachopsMatchups extends ScriptedGame {
	canAttack: boolean = false;
	canLateJoin = true;
	inverseTypes: boolean = false;
	maxPoints: number = 10;
	playerPokemon = new Map<Player, IPokemon>();
	points = new Map<Player, number>();
	roundActions = new Set<Player>();
	usedPokemon: string[] = [];
	sharedType: string | null = null;

	// set once the game starts
	currentPokemon!: IPokemon;

	static loadData(): void {
		for (const pokemon of Games.getPokemonList()) {
			if (pokemon.forme || banlist.includes(pokemon.id) || !Dex.hasModelData(pokemon) || pokemon.types.length < 2 ||
				pokemon.types.includes('Steel') || pokemon.types.includes('Normal')) continue;

			data.keys.push(pokemon.name);
			data.pokemon[pokemon.name] = pokemon.types;

			for (const type of pokemon.types) {
				if (!(type in data.pokemonByType)) data.pokemonByType[type] = [];
				data.pokemonByType[type].push(pokemon.name);
			}
		}
	}

	getPokemonChoices(): string[] {
		return this.sharedType ? data.pokemonByType[this.sharedType] : data.keys;
	}

	onAddPlayer(player: Player, lateJoin?: boolean): boolean {
		if (lateJoin) {
			const pokedex = this.shuffle(this.getPokemonChoices());
			while (this.usedPokemon.includes(pokedex[0]) && pokedex.length) {
				pokedex.shift();
			}

			if (this.usedPokemon.includes(pokedex[0])) {
				this.canLateJoin = false;
				return false;
			}

			this.assignPokemon(player, pokedex[0]);
			pokedex.shift();
		}

		return true;
	}

	onSignups(): void {
		if (this.sharedType) {
			this.say("All assigned Pokemon will be part-" + this.sharedType + "!");
			const availablePokemon = data.pokemonByType[this.sharedType].length;
			if (!this.playerCap || this.playerCap > availablePokemon) this.playerCap = availablePokemon;
		}
	}

	onStart(): void {
		this.say("Now PMing Pokemon!");

		const pokedex = this.shuffle(this.getPokemonChoices());
		for (const id in this.players) {
			this.assignPokemon(this.players[id], pokedex[0]);
			pokedex.shift();
		}

		this.nextRound();
	}

	assignPokemon(player: Player, species: string): void {
		this.usedPokemon.push(species);

		const pokemon = Dex.getExistingPokemon(species);
		this.playerPokemon.set(player, pokemon);
		player.say("You have been randomly assigned:");
		player.sayHtml(this.getPokemonHtml(pokemon));
	}

	getPokemonHtml(pokemon: IPokemon): string {
		return "<center>" + Dex.getPokemonModel(pokemon) + "<br /><b>" + pokemon.name +
			"</b><br />" + pokemon.types.map(x => Dex.getTypeHtml(Dex.getExistingType(x))).join("&nbsp;/&nbsp;") + "</center>";
	}

	onNextRound(): void {
		this.canAttack = false;
		if (this.winners.size) {
			this.end();
			return;
		}

		this.currentPokemon = Dex.getExistingPokemon(this.sampleOne(data.keys));
		this.roundActions.clear();

		const roundHtml = this.getRoundHtml(players => this.getPlayerPoints(players));
		const roundUhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(roundUhtmlName, roundHtml, () => {
			this.setTimeout(() => {
				const pokemonHtml = this.getPokemonHtml(this.currentPokemon);
				const pokemonUhtmlName = this.uhtmlBaseName + '-pokemon';
				this.onUhtml(pokemonUhtmlName, pokemonHtml, () => {
					this.canAttack = true;
					this.setTimeout(() => this.nextRound(), 5 * 1000);
				});
				this.sayUhtml(pokemonUhtmlName, pokemonHtml);
			}, 5 * 1000);
		});
		this.sayUhtml(roundUhtmlName, roundHtml);
	}

	onEnd(): void {
		this.winners.forEach((value, player) => {
			this.addBits(player, 250);
		});

		this.announceWinners();
	}

	destroyPlayers(): void {
		super.destroyPlayers();

		this.playerPokemon.clear();
		this.roundActions.clear();
	}
}

const commands: GameCommandDefinitions<MachopsMatchups> = {
	attack: {
		command(target, room, user) {
			if (!this.canAttack || this.roundActions.has(this.players[user.id])) return false;
			const player = this.players[user.id];
			this.roundActions.add(player);
			const pokemon = this.playerPokemon.get(player)!;

			const winner = Games.getMatchupWinner(pokemon, this.currentPokemon, this.inverseTypes);

			if (winner === pokemon) {
				let points = this.points.get(player) || 0;
				points += 1;
				this.points.set(player, points);
				player.say("Your Pokemon defeated " + this.currentPokemon.name + " and earned you 1 point! Your total is now " +
					points + ".");
				if (points >= this.maxPoints) {
					this.winners.set(player, points);
				}
			} else if (winner === this.currentPokemon) {
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

const tests: GameFileTests<MachopsMatchups> = {
	'should assign Pokemon': {
		test(game): void {
			addPlayers(game, 4);
			startGame(game);
			assertStrictEqual(game.playerPokemon.size, 4);
		},
	},
};

export const game: IGameFile<MachopsMatchups> = {
	aliases: ["machops", "matchups"],
	category: 'luck',
	class: MachopsMatchups,
	commands,
	commandDescriptions: [Config.commandCharacter + 'attack'],
	description: "Players are randomly assigned a Pokemon to go against other randomly chosen Pokemon and earn points based on type " +
		"matchups!",
	name: "Machop's Matchups",
	mascot: "Machop",
	scriptedOnly: true,
	tests,
	variants: [
		{
			name: "Machop's Inverse Matchups",
			variantAliases: ['inverse'],
			inverseTypes: true,
		},
		{
			name: "Machop's Bug Matchups",
			variantAliases: ['bug'],
			sharedType: 'Bug',
		},
		{
			name: "Machop's Dark Matchups",
			variantAliases: ['dark'],
			sharedType: 'Dark',
		},
		{
			name: "Machop's Dragon Matchups",
			variantAliases: ['dragon'],
			sharedType: 'Dragon',
		},
		{
			name: "Machop's Electric Matchups",
			variantAliases: ['electric'],
			sharedType: 'Electric',
		},
		{
			name: "Machop's Fairy Matchups",
			variantAliases: ['fairy'],
			sharedType: 'Fairy',
		},
		{
			name: "Machop's Fighting Matchups",
			variantAliases: ['fighting'],
			sharedType: 'Fighting',
		},
		{
			name: "Machop's Fire Matchups",
			variantAliases: ['fire'],
			sharedType: 'Fire',
		},
		{
			name: "Machop's Flying Matchups",
			variantAliases: ['flying'],
			sharedType: 'Flying',
		},
		{
			name: "Machop's Ghost Matchups",
			variantAliases: ['ghost'],
			sharedType: 'Ghost',
		},
		{
			name: "Machop's Grass Matchups",
			variantAliases: ['grass'],
			sharedType: 'Grass',
		},
		{
			name: "Machop's Ground Matchups",
			variantAliases: ['ground'],
			sharedType: 'Ground',
		},
		{
			name: "Machop's Ice Matchups",
			variantAliases: ['ice'],
			sharedType: 'Ice',
		},
		{
			name: "Machop's Poison Matchups",
			variantAliases: ['poison'],
			sharedType: 'Poison',
		},
		{
			name: "Machop's Psychic Matchups",
			variantAliases: ['psychic'],
			sharedType: 'Psychic',
		},
		{
			name: "Machop's Rock Matchups",
			variantAliases: ['rock'],
			sharedType: 'Rock',
		},
		{
			name: "Machop's Water Matchups",
			variantAliases: ['water'],
			sharedType: 'Water',
		},
	],
};

import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { GameCommandDefinitions, IGameAchievement, IGameFile } from "../types/games";

type AchievementNames = "criminalmind" | "truedetective";

const data: {colors: Dict<string[]>; eggGroups: Dict<string[]>; moves: Dict<string[]>; pokemon: string[]; types: Dict<string[]>} = {
	colors: {},
	eggGroups: {},
	moves: {},
	pokemon: [],
	types: {},
};
type Category = Exclude<keyof typeof data, 'pokemon'>;
const dataKeys: {colors: string[]; eggGroups: string[]; moves: string[]; types: string[]} = {
	colors: [],
	eggGroups: [],
	moves: [],
	types: [],
};
const categories: Category[] = ["colors", "eggGroups", "moves", "types"];

class MismagiusFoulPlay extends ScriptedGame {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"criminalmind": {name: "Criminal Mind", type: 'special', bits: 1000, description: "win as the only criminal remaining"},
		"truedetective": {name: "True Detective", type: 'special', bits: 1000, description: "win as the only detective remaining"},
	};

	chosenPokemon = new Map<Player, string>();
	criminalCount: number = 0;
	criminals: Player[] = [];
	decoyPokemon: string[] = [];
	detectiveCount: number = 0;
	detectives: Player[] = [];
	identifications = new Map<Player, number>();
	kidnaps = new Map<Player, number>();
	lastCategory: Category | null = null;
	previousParams: string[] = [];
	roundGuesses = new Map<Player, boolean>();

	static loadData(): void {
		const pokemonList = Games.getPokemonList(x => x.baseSpecies === x.name);
		for (const pokemon of pokemonList) {
			const learnsetData = Dex.getLearnsetData(pokemon.id);
			if (!learnsetData || !learnsetData.learnset) continue;
			data.pokemon.push(pokemon.name);
			if (!(pokemon.color in data.colors)) {
				data.colors[pokemon.color] = [];
				dataKeys.colors.push(pokemon.color);
			}
			data.colors[pokemon.color].push(pokemon.name);
			for (const eggGroup of pokemon.eggGroups) {
				const name = eggGroup + " group";
				if (!(name in data.eggGroups)) {
					data.eggGroups[name] = [];
					dataKeys.eggGroups.push(name);
				}
				data.eggGroups[name].push(pokemon.name);
			}
			for (const type of pokemon.types) {
				const name = type + " type";
				if (!(name in data.types)) {
					data.types[name] = [];
					dataKeys.types.push(name);
				}
				data.types[name].push(pokemon.name);
			}

			for (const i in learnsetData.learnset) {
				const move = Dex.getExistingMove(i);
				if (!(move.name in data.moves)) {
					data.moves[move.name] = [];
					dataKeys.moves.push(move.name);
				}
				data.moves[move.name].push(pokemon.name);
			}
		}
	}

	onRemovePlayer(player: Player): void {
		if (this.criminals.includes(player)) {
			this.criminalCount--;
		} else if (this.detectives.includes(player)) {
			this.detectiveCount--;
		}
	}

	onStart(): void {
		this.say("Now requesting Pokemon!");
		for (const i in this.players) {
			this.players[i].say("Please select a Pokemon to play as with ``.select``!");
		}
		this.timeout = setTimeout(() => this.chooseCriminals(), 30 * 1000);
	}

	chooseCriminals(): void {
		const keys = this.shuffle(data.pokemon);
		this.chosenPokemon.forEach((species) => {
			keys.splice(keys.indexOf(species), 1);
		});
		for (const i in this.players) {
			if (this.players[i].eliminated || this.chosenPokemon.has(this.players[i])) continue;
			const player = this.players[i];
			const pokemon = keys[0];
			keys.shift();
			player.say("You did not select a Pokemon so you were randomly assigned " + pokemon + ".");
			this.chosenPokemon.set(player, pokemon);
		}

		const remainingPlayerCount = this.getRemainingPlayerCount();
		let fakeCount = Math.floor(remainingPlayerCount / 3);
		if (fakeCount < 1) fakeCount = 1;
		for (let i = 0; i < fakeCount; i++) {
			this.decoyPokemon.push(keys[0]);
			keys.shift();
		}

		this.criminalCount = Math.ceil(remainingPlayerCount / 3);
		this.detectiveCount = remainingPlayerCount - this.criminalCount;
		const players = this.shuffle(Object.keys(this.players));
		let count = 0;
		const criminalNames: string[] = [];
		for (const id of players) {
			if (this.players[id].eliminated) continue;
			const player = this.players[id];
			if (count < this.criminalCount) {
				this.criminals.push(player);
				criminalNames.push(player.name + " (" + this.chosenPokemon.get(player) + ")");
				player.say("You have been assigned the role of criminal for this game!");
				count++;
			} else {
				this.detectives.push(player);
				player.say("You have been assigned the role of detective for this game!");
			}
		}
		for (const player of this.criminals) {
			player.say("Criminal list: " + criminalNames.join(", "));
		}

		this.say("Use Mismagius' hints each round to deduce who is a criminal and who is a detective!");
		this.nextRound();
	}

	onNextRound(): void {
		if (!this.getRemainingPlayerCount(this.criminals) || !this.getRemainingPlayerCount(this.detectives)) return this.end();
		let pokemonList: string[] = [];
		this.chosenPokemon.forEach((species, player) => {
			if (player.eliminated) return;
			pokemonList.push(species);
		});
		const roundCategories = this.shuffle(categories);
		if (this.lastCategory) roundCategories.splice(roundCategories.indexOf(this.lastCategory), 1);
		let category: Category;
		let param: string = '';
		while (!param && roundCategories.length) {
			category = roundCategories[0];
			roundCategories.shift();
			const keys = this.shuffle(dataKeys[category]);
			for (const key of keys) {
				if (this.previousParams.includes(key)) continue;
				let matchingPokemon = 0;
				const list = data[category][key];
				for (const pokemon of pokemonList) {
					if (list.includes(pokemon)) matchingPokemon++;
				}
				if (matchingPokemon && matchingPokemon < pokemonList.length) {
					param = key;
					break;
				}
			}
		}
		if (!param) {
			this.say("Mismagius is out of hints!");
			return this.end();
		}

		this.previousParams.push(param);
		const players: string[] = [];
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			let text = player.name + ": ";
			const chosenPokemon = this.chosenPokemon.get(player)!;
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
			const hasParam = data[category!][param].includes(chosenPokemon);
			const isCriminal = this.criminals.includes(player);
			if ((hasParam && !isCriminal) || (!hasParam && isCriminal)) {
				text += "T";
			} else {
				text += "F";
			}
			players.push(text);
		}
		pokemonList = pokemonList.concat(this.decoyPokemon).sort();
		this.roundGuesses.clear();
		const html = "<center><b>Param " + this.round + "</b>: " + param + "<br /><br /><b>Pokemon</b>: " + pokemonList.join(", ") +
			"<br /><br /><b>Players</b>: " + players.join(", ") + "</center>";
		this.onHtml(html, () => {
			this.timeout = setTimeout(() => this.nextRound(), 45 * 1000);
		});
		this.sayHtml(html);
	}

	onEnd(): void {
		const detectiveWin = this.criminalCount === 0;
		for (const player of this.detectives) {
			const identifications = this.identifications.get(player);
			let bits = 0;
			if (detectiveWin) {
				bits = 300;
				if (identifications) bits += 100 * identifications;
				if (!player.eliminated) this.winners.set(player, 1);
			} else {
				if (identifications) bits += 50 * identifications;
			}
			if (bits) this.addBits(player, bits);
		}

		for (const player of this.criminals) {
			const kidnaps = this.kidnaps.get(player);
			let bits = 0;
			if (!detectiveWin) {
				bits = 300;
				if (kidnaps) bits += 150 * kidnaps;
				if (!player.eliminated) this.winners.set(player, 1);
			} else {
				if (kidnaps) bits += 75 * kidnaps;
			}
			this.addBits(player, bits);
		}

		if (this.winners.size === 1) {
			this.unlockAchievement(this.getFinalPlayer()!, detectiveWin ? MismagiusFoulPlay.achievements.truedetective :
				MismagiusFoulPlay.achievements.criminalmind);
		}

		this.announceWinners();
	}

	getPlayerSummary(player: Player): void {
		if (!this.criminals.length) return player.say("The roles have not been distributed yet.");
		if (this.criminals.includes(player)) {
			const criminals: string[] = [];
			for (const otherPlayer of this.criminals) {
				if (otherPlayer.name !== player.name) criminals.push(otherPlayer.name);
			}
			player.say("You are a criminal (" + this.chosenPokemon.get(player) + "). Your fellow criminals are " +
				Tools.joinList(criminals));
		} else {
			player.say("You " + (player.eliminated ? "were" : "are") + " a detective (" + this.chosenPokemon.get(player) + ").");
		}
	}
}

const commands: GameCommandDefinitions<MismagiusFoulPlay> = {
	select: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			const player = this.players[user.id];
			if (this.chosenPokemon.has(player)) {
				user.say("You already have an assigned Pokemon.");
				return false;
			}
			const pokemon = Dex.getPokemon(target);
			if (!pokemon) {
				user.say("You must specify a valid Pokemon.");
				return false;
			}
			if (!data.pokemon.includes(pokemon.name)) {
				user.say(pokemon.name + " cannot be used in this game.");
				return false;
			}

			let chosen: boolean | undefined;
			this.chosenPokemon.forEach((species) => {
				if (species === pokemon.name) chosen = true;
			});
			if (chosen) {
				user.say(pokemon.name + " is already assigned to another player.");
				return false;
			}

			user.say("You have chosen " + pokemon.name + "!");
			this.chosenPokemon.set(player, pokemon.name);
			return true;
		},
		pmOnly: true,
	},
	suspect: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			const player = this.players[user.id];
			if (this.roundGuesses.has(player)) {
				player.say("You have already suspected a player this round!");
				return false;
			}

			const targets = target.split(",");
			if (targets.length !== 2) {
				player.say("You must specify the player and the Pokemon.");
				return false;
			}

			const targetId = Tools.toId(targets[0]);
			if (!(targetId in this.players)) {
				player.say("You must specify a player in the game.");
				return false;
			}
			if (this.players[targetId].eliminated) {
				player.say(this.players[targetId].name + " has already been eliminated.");
				return false;
			}

			const pokemon = Dex.getPokemon(targets[1]);
			if (!pokemon) {
				player.say("You must specify a valid Pokemon.");
				return false;
			}

			const targetPlayer = this.players[targetId];
			const playerCriminal = this.criminals.includes(player);
			const targetCriminal = this.criminals.includes(targetPlayer);
			if (playerCriminal && targetCriminal) {
				player.say("You cannot suspect a fellow criminal!");
				return false;
			}
			this.roundGuesses.set(player, true);
			if ((playerCriminal || targetCriminal) && this.chosenPokemon.get(targetPlayer) === pokemon.name) {
				let action: string;
				if (playerCriminal) {
					action = "kidnapped";
					const kidnaps = this.kidnaps.get(player) || 0;
					this.kidnaps.set(player, kidnaps + 1);
				} else {
					action = "identified";
					const identifications = this.identifications.get(player) || 0;
					this.identifications.set(player, identifications + 1);
				}

				player.say("You " + action + " " + targetPlayer.name + "!");
				this.eliminatePlayer(targetPlayer, "You were " + action + "!");

				if (targetCriminal) {
					this.criminalCount--;
					if (this.criminalCount === 0) {
						this.say("All criminals have been " + action + "!");
						this.end();
						return true;
					}
				} else {
					this.detectiveCount--;
					if (this.detectiveCount === 0) {
						this.say("All detectives have been " + action + "!");
						this.end();
						return true;
					}
				}
			} else {
				player.say("You failed to " + (playerCriminal ? "kidnap" : "identify") + " " + targetPlayer.name + ".");
			}
			return true;
		},
		pmOnly: true,
	},
};

commands.summary = Tools.deepClone(Games.sharedCommands.summary);
commands.summary.aliases = ['role'];

export const game: IGameFile<MismagiusFoulPlay> = {
	aliases: ['mismagius', 'mfp'],
	category: 'strategy',
	class: MismagiusFoulPlay,
	commandDescriptions: [Config.commandCharacter + "select [Pokemon]", Config.commandCharacter + "suspect [player], [Pokemon]"],
	commands,
	description: "<a href='https://docs.google.com/document/d/1Zx72KwQjQyKE4yWsM83yimglxa5qOnM-YTudCJ89fKM/edit'>Guide</a> | Detectives " +
		"try to help Mismagius identify the criminals in this murder mystery team game (one guess per round)! Parameters will be given " +
		"as hints but they will be opposite for criminals.",
	name: "Mismagius' Foul Play",
	mascot: "Mismagius",
	noOneVsOne: true,
	nonTrivialLoadData: true,
	scriptedOnly: true,
};

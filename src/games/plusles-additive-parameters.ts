import { Player } from "../room-activity";
import type { IGameFile } from "../types/games";
import { Room } from "../rooms";
import { Game } from "../room-game";
import type { ICommandDefinition } from "../command-parser";
import type { IParam, ParamType } from "../workers/parameters";
import { PRNGSeed, PRNG } from "../prng";

const GEN = 7;
const GEN_STRING = 'gen' + GEN;
const name = "Plusle's Additive Parameters";
const paramTypes: ParamType[] = ['move', 'tier', 'color', 'type', 'egggroup', 'ability', 'gen'];
let loadedData = false;

class PluslesAdditiveParameters extends Game {
	static loadData(room: Room) {
		if (loadedData) return;

		room.say("Loading data for " + name + "...");

		Games.workers.parameters.loadData();

		loadedData = true;
	}

	canAdd: boolean = false;
	currentPlayer: Player | null = null;
	maxPlayers: number = 20;
	minimumResults: number = 30;
	maximumResults: number = 50;
	parametersRound: number = 0;
	params: IParam[] = [];
	playerList: Player[] = [];
	playerOrder: Player[] = [];
	pokemon: string[] = [];
	roundTime: number = 15 * 1000;

	onStart() {
		this.nextRound();
	}

	async onNextRound() {
		this.canAdd = false;
		this.offCommands(['add']);

		if (this.currentPlayer) {
			this.eliminatePlayer(this.currentPlayer);
			this.currentPlayer = null;
		}
		if (this.getRemainingPlayerCount() < 2 || this.parametersRound >= 20) {
			this.end();
			return;
		}

		if (!this.pokemon.length || this.params.length >= 25) {
			this.parametersRound++;
			this.playerOrder = this.shufflePlayers(this.getRemainingPlayers());
			this.playerList = this.playerOrder.slice();
			const html = this.getRoundHtml(this.getPlayerNames, this.playerOrder, "Round " + this.parametersRound);
			const uhtmlName = this.uhtmlBaseName + "-round";
			const result = await Games.workers.parameters.search({
				customParamTypes: null,
				minimumResults: this.minimumResults,
				maximumResults: this.maximumResults,
				mod: GEN_STRING,
				numberOfParams: 2,
				paramTypes,
				prngSeed: this.prng.seed.slice() as PRNGSeed,
				searchType: 'pokemon',
			});
			this.params = result.params;
			this.pokemon = result.pokemon;
			this.prng = new PRNG(result.prngSeed);

			this.onUhtml(uhtmlName, html, () => {
				this.timeout = setTimeout(() => this.nextRound(), 5000);
			});
			this.sayUhtml(uhtmlName, html);
			return;
		}

		if (!this.playerList.length) this.playerList = this.playerOrder.slice();
		let currentPlayer = this.playerList.shift();
		while (currentPlayer && currentPlayer.eliminated) {
			currentPlayer = this.playerList.shift();
		}

		if (!currentPlayer || currentPlayer.eliminated) {
			this.onNextRound();
			return;
		}

		const pokemonIcons: string[] = [];
		for (let i = 0; i < this.pokemon.length; i++) {
			const pokemon = Dex.getExistingPokemon(this.pokemon[i]);
			pokemonIcons.push(Dex.getPSPokemonIcon(pokemon) + pokemon.species);
		}

		const html = "<div class='infobox'><span style='color: #999999'>" + this.params.length + " parameters (Generation " + GEN + ")</span><br /><br />" + pokemonIcons.join(", ") + "</div>";
		const uhtmlName = this.uhtmlBaseName + "-params";
		this.onUhtml(uhtmlName, html, () => {
			const text = currentPlayer!.name + " you are up!";
			this.on(text, () => {
				this.canAdd = true;
				this.onCommands(['add'], {max: 1}, () => this.nextRound());
				this.currentPlayer = currentPlayer!;
				this.timeout = setTimeout(() => {
					this.say("Time is up!");
					this.nextRound();
				}, this.roundTime);
			});
			this.say(text);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd() {
		for (const i in this.players) {
			const player = this.players[i];
			if (player.eliminated) continue;
			this.winners.set(player, 1);
			this.addBits(player, 500);
		}

		this.announceWinners();
	}

	getParam(input: string): IParam[] {
		input = Tools.toId(input);
		const params: IParam[] = [];

		for (let i = 0; i < paramTypes.length; i++) {
			const pool = Games.workers.parameters.workerData!.pokemon.gens[GEN_STRING].paramTypePools[paramTypes[i]];
			for (const i in pool) {
				if (i === input) {
					params.push(pool[i]);
					break;
				}
			}
		}

		return params;
	}
}

const commands: Dict<ICommandDefinition<PluslesAdditiveParameters>> = {
	add: {
		async asyncCommand(target, room, user) {
			if (!this.canAdd || !target || this.players[user.id] !== this.currentPlayer) return false;
			const params = this.getParam(target);
			if (!params.length) {
				user.say("You must specify a valid parameter.");
				return false;
			}
			if (params.length > 1) {
				user.say("The specified parameter does not have a unique name so you must include the type (e.g. ``" + Config.commandCharacter + "add Psychic move`` vs. ``" + Config.commandCharacter + "add Psychic type``).");
				return false;
			}

			const param = params[0];
			if (param.type === 'move' && Games.workers.parameters.workerData!.pokemon.gens[GEN_STRING].paramTypeDexes.move[param.param].length >= Games.maxMoveAvailability) {
				user.say("You cannot add a move learned by " + Games.maxMoveAvailability + " or more Pokemon.");
				return false;
			}

			for (let i = 0; i < this.params.length; i++) {
				if (this.params[i].type === param.type && this.params[i].param === param.param) {
					user.say("``" + param.param + "`` is already in the parameters list!");
					return false;
				}
			}

			const testParams: IParam[] = this.params.slice();
			testParams.push(param);

			const result = await Games.workers.parameters.intersect({
				mod: GEN_STRING,
				params: testParams,
				paramTypes,
				searchType: 'pokemon',
			});

			let eliminationReason = '';
			if (result.pokemon.length <= 1) {
				const pokemon = Dex.getPokemon(result.pokemon[0]);
				eliminationReason = "The parameters resulted in too few Pokemon (" + (pokemon ? pokemon.species : "none") + ")!";
			} else if (Dex.isEvolutionFamily(result.pokemon)) {
				const species: string[] = [];
				for (let i = 0; i < result.pokemon.length; i++) {
					species.push(Dex.getExistingPokemon(result.pokemon[i]).species);
				}
				eliminationReason = "The parameters resulted in a single evolution line (" + Tools.joinList(species) + ")!";
			}

			if (eliminationReason) {
				this.say(eliminationReason + " **" + user.name + "** has been eliminated from the game.");
				this.pokemon = [];
			} else {
				this.params = testParams;
				this.pokemon = result.pokemon;
				this.currentPlayer = null;
			}

			return true;
		},
	},
};

export const game: IGameFile<PluslesAdditiveParameters> = {
	aliases: ['plusles', 'additiveparameters', 'additiveparams', 'pluslesadditiveparams'],
	category: 'puzzle',
	class: PluslesAdditiveParameters,
	commands,
	description: "Players add <code>/ds" + GEN + "</code> parameters that result in at least 2 Pokemon of different evolution lines in the given list!",
	formerNames: ["Pumpkaboo's Parameters"],
	name,
	mascot: "Plusle",
};

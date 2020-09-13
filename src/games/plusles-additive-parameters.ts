import { PRNG } from "../prng";
import type { PRNGSeed } from "../prng";
import type { Player } from "../room-activity";
import { Game } from "../room-game";
import type { Room } from "../rooms";
import type { GameCommandDefinitions, GameCommandReturnType, IGameFile } from "../types/games";
import type { User } from "../users";
import type { IParam, ParamType } from "../workers/parameters";

const GEN = 8;
const GEN_STRING = 'gen' + GEN;

const paramTypes: ParamType[] = ['move', 'tier', 'color', 'type', 'egggroup', 'ability', 'gen'];

class PluslesAdditiveParameters extends Game {
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

	static loadData(room: Room | User): void {
		Games.workers.parameters.init();
	}

	onStart(): void {
		this.nextRound();
	}

	async onNextRound(): Promise<void> {
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

			if (this.ended) return;

			if (result === null) {
				this.say("An error occurred while generating parameters.");
				this.deallocate(true);
				return;
			}

			this.params = result.params;
			this.pokemon = result.pokemon;
			this.prng = new PRNG(result.prngSeed);

			this.onUhtml(uhtmlName, html, () => {
				this.timeout = setTimeout(() => this.nextRound(), 5000);
			});
			this.sayUhtmlAuto(uhtmlName, html);
			return;
		}

		if (!this.playerList.length) this.playerList = this.playerOrder.slice();
		let currentPlayer = this.playerList.shift();
		while (currentPlayer && currentPlayer.eliminated) {
			currentPlayer = this.playerList.shift();
		}

		if (!currentPlayer || currentPlayer.eliminated) {
			await this.onNextRound();
			return;
		}

		const pokemonIcons: string[] = [];
		for (const name of this.pokemon) {
			const pokemon = Dex.getExistingPokemon(name);
			pokemonIcons.push(Dex.getPSPokemonIcon(pokemon) + pokemon.name);
		}

		const html = "<div class='infobox'><span style='color: #999999'>" + this.params.length + " parameters (Generation " +
			GEN + ")</span><br /><br />" + pokemonIcons.join(", ") + "</div>";
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

	onEnd(): void {
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

		for (const paramType of paramTypes) {
			const pool = Games.workers.parameters.workerData!.pokemon.gens[GEN_STRING].paramTypePools[paramType];
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

const commands: GameCommandDefinitions<PluslesAdditiveParameters> = {
	add: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		async asyncCommand(target, room, user): Promise<GameCommandReturnType> {
			if (!this.canAdd || !target || this.players[user.id] !== this.currentPlayer) return false;
			const params = this.getParam(target);
			if (!params.length) {
				user.say("You must specify a valid parameter.");
				return false;
			}
			if (params.length > 1) {
				user.say("The specified parameter does not have a unique name so you must include the type (e.g. ``" +
					Config.commandCharacter + "add Psychic move`` vs. ``" + Config.commandCharacter + "add Psychic type``).");
				return false;
			}

			const inputParam = params[0];
			if (inputParam.type === 'move' &&
				Games.workers.parameters.workerData!.pokemon.gens[GEN_STRING].paramTypeDexes.move[inputParam.param].length >=
				Games.maxMoveAvailability) {
				user.say("You cannot add a move learned by " + Games.maxMoveAvailability + " or more Pokemon.");
				return false;
			}

			for (const existingParam of this.params) {
				if (inputParam.type === existingParam.type && inputParam.param === existingParam.param) {
					user.say("``" + inputParam.param + "`` is already in the parameters list!");
					return false;
				}
			}

			const testParams: IParam[] = this.params.slice();
			testParams.push(inputParam);

			const result = await Games.workers.parameters.intersect({
				mod: GEN_STRING,
				params: testParams,
				paramTypes,
				searchType: 'pokemon',
			});

			if (this.ended) return false;

			if (result === null) {
				this.say("An error occurred while intersecting parameters.");
				this.deallocate(true);
				return false;
			}

			let eliminationReason = '';
			if (result.pokemon.length <= 1) {
				const pokemon = Dex.getPokemon(result.pokemon[0]);
				eliminationReason = "The parameters resulted in too few Pokemon (" + (pokemon ? pokemon.name : "none") + ")!";
			} else if (Dex.isEvolutionFamily(result.pokemon)) {
				const species: string[] = [];
				for (const name of result.pokemon) {
					species.push(Dex.getExistingPokemon(name).name);
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
	commandDescriptions: [Config.commandCharacter + "add [parameter]"],
	commands,
	description: "Players add <code>/nds</code> parameters (no weaknesses or resistances) that result in at least 2 Pokemon of " +
		"different evolution lines in the given list!",
	disabled: true,
	formerNames: ["Pumpkaboo's Parameters"],
	name: "Plusle's Additive Parameters",
	mascot: "Plusle",
	nonTrivialLoadData: true,
};

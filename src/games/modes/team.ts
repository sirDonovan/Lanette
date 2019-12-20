import { CommandsDict } from "../../command-parser";
import { Player, PlayerTeam } from "../../room-activity";
import { DefaultGameOption, Game } from "../../room-game";
import { GameCommandReturnType, IGameFormat, IGameModeFile } from "../../types/games";
import { Guessing } from "../templates/guessing";

const BASE_POINTS = 10;

const name = 'Team';
const description = 'Players will be split into teams once the game starts!';
const removedOptions: string[] = ['points', 'freejoin'];

const teamNameLists: Dict<string[][]> = {
	'2': [["Red", "Blue"], ["Gold", "Silver"], ["Ruby", "Sapphire"], ["Diamond", "Pearl"], ["Black", "White"], ["X", "Y"], ["Sun", "Moon"], ["Sword", "Shield"], ["Land", "Sea"],
		["Time", "Space"], ["Yin", "Yang"], ["Life", "Destruction"], ["Sunne", "Moone"]],
	'3': [["Red", "Blue", "Yellow"], ["Gold", "Silver", "Crystal"], ["Ruby", "Sapphire", "Emerald"], ["Diamond", "Pearl", "Platinum"], ["Land", "Sea", "Sky"],
		["Time", "Space", "Antimatter"], ["Yin", "Yang", "Wuji"], ["Life", "Destruction", "Order"], ["Sunne", "Moone", "Prism"]],
	'4': [["Red", "Blue", "Yellow", "Green"], ["Fall", "Winter", "Spring", "Summer"], ["Water", "Fire", "Earth", "Air"], ["Clubs", "Spades", "Hearts", "Diamonds"]],
};

type TeamThis = Guessing & Team;

class Team {
	static setOptions<T extends Game>(format: IGameFormat<T>, namePrefixes: string[], nameSuffixes: string[]) {
		if (!format.name.includes(name)) namePrefixes.unshift(name);
		format.description += ' ' + description;

		if (!format.defaultOptions.includes('teams')) format.defaultOptions.push('teams');

		for (let i = 0; i < removedOptions.length; i++) {
			const index = format.defaultOptions.indexOf(removedOptions[i] as DefaultGameOption);
			if (index !== -1) format.defaultOptions.splice(index, 1);

			delete format.customizableOptions[removedOptions[i]];
		}

		if (!format.customizableOptions.teamPoints) {
			format.customizableOptions.teamPoints = {
				min: BASE_POINTS,
				base: BASE_POINTS,
				max: BASE_POINTS,
			};
		}
	}

	teams: Dict<PlayerTeam> = {};
	teamPoints: Dict<number> = {};
	currentPlayers: Dict<Player> = {};
	playerOrders: Dict<Player[]> = {};
	playerLists: Dict<Player[]> = {};
	minPlayers: number = 4;

	setTeams(this: TeamThis) {
		const teamNames = this.sampleOne(teamNameLists['' + this.format.options.teams]);
		const players = this.shufflePlayers();
		while (players.length) {
			for (let i = 0; i < teamNames.length; i++) {
				const player = players.shift();
				if (!player) break;
				const name = teamNames[i];
				const id = Tools.toId(name);
				if (!(id in this.teams)) {
					const team = new PlayerTeam(name);
					this.teams[id] = team;
					this.playerOrders[id] = [];
					this.playerLists[id] = [];
				}
				this.teams[id].players.push(player);
				player.team = this.teams[id];
			}
		}

		for (const i in this.players) {
			const player = this.players[i];
			if (player.eliminated) continue;
			this.playerOrders[player.team!.id].push(player);
		}
		for (const team in this.playerOrders) {
			this.playerOrders[team] = this.shuffle(this.playerOrders[team]);
		}
		for (const team in this.teams) {
			this.say("**Team " + this.teams[team].name + "**: " + this.teams[team].getPlayerNames().join(", "));
		}
	}

	onStart(this: TeamThis) {
		this.setTeams();
		this.timeout = setTimeout(() => this.nextRound(), 10000);
	}

	async onNextRound(this: TeamThis) {
		this.canGuess = false;

		let emptyTeams = 0;
		for (const team in this.teams) {
			if (!this.getRemainingPlayerCount(this.playerOrders[team])) {
				delete this.currentPlayers[team];
				emptyTeams++;
			} else {
				let player = this.playerLists[team].shift();
				while (!player || player.eliminated) {
					if (!this.playerLists[team].length) this.playerLists[team] = this.shuffle(this.playerOrders[team]);
					player = this.playerLists[team].shift();
				}
				this.currentPlayers[team] = player;
			}
		}

		if (emptyTeams >= this.format.options.teams - 1) {
			this.say("Only one team remains!");
			for (const team in this.teams) {
				if (this.getRemainingPlayerCount(this.playerOrders[team])) {
					for (let i = 0; i < this.teams[team].players.length; i++) {
						this.winners.set(this.teams[team].players[i], 1);
					}
					break;
				}
			}

			this.timeout = setTimeout(() => this.end(), 5000);
			return;
		}

		await this.setAnswers();
		const text = Tools.joinList(Object.values(this.currentPlayers).map(x => x.name)) + ", you are up!";
		this.on(text, () => {
			this.timeout = setTimeout(() => {
				const onHint = () => {
					this.canGuess = true;
					this.timeout = setTimeout(() => {
						if (this.answers.length) {
							this.say("Time is up! " + this.getAnswers(''));
							this.answers = [];
						}
						this.nextRound();
					}, this.roundTime);
				};
				if (this.htmlHint) {
					const uhtmlName = this.uhtmlBaseName + '-hint';
					this.onUhtml(uhtmlName, this.hint, onHint);
					this.sayUhtml(uhtmlName, this.hint);
				} else {
					this.on(this.hint, onHint);
					this.say(this.hint);
				}
			}, 5 * 1000);
		});
		this.say(text);
	}

	onEnd(this: TeamThis) {
		this.convertPointsToBits();
		this.announceWinners();
	}
}

const commands: CommandsDict<Team & Guessing, GameCommandReturnType> = {
	guess: {
		async asyncCommand(target, room, user) {
			if (!this.canGuess || !this.answers.length || !(user.id in this.players)) return false;
			const player = this.players[user.id];
			let currentPlayer = false;
			for (const team in this.currentPlayers) {
				if (this.currentPlayers[team] === player) {
					currentPlayer = true;
				}
			}
			if (!currentPlayer) return false;

			if (!player.active) player.active = true;
			const answer = await this.guessAnswer(player, target);
			if (!answer) return false;

			if (this.timeout) clearTimeout(this.timeout);

			if (this.onCorrectGuess) this.onCorrectGuess(player, answer);

			const awardedPoints = this.getPointsForAnswer ? this.getPointsForAnswer(answer) : 1;
			let points = this.points.get(player) || 0;
			points += awardedPoints;
			this.points.set(player, points);
			player.team!.points += awardedPoints;

			if (player.team!.points >= this.format.options.teamPoints) {
				let text = '**' + player.name + '** wins' + (this.parentGame ? '' : ' the game') + ' for Team ' + player.team!.name + '!';
				const answers = ' ' + this.getAnswers(answer, true);
				if (text.length + answers.length <= Tools.maxMessageLength) {
					text += answers;
				} else {
					text += ' A possible answer was __' + answer + '__.';
				}
				this.say(text);

				for (let i = 0; i < player.team!.players.length; i++) {
					this.winners.set(player.team!.players[i], 1);
				}
				this.end();
				return true;
			} else {
				if (this.hint) this.off(this.hint);
				let text = '**' + player.name + '** advances Team ' + player.team!.name + ' to **' + player.team!.points + '** point' + (player.team!.points > 1 ? 's' : '') + '!';
				const answers = ' ' + this.getAnswers(answer);
				if (text.length + answers.length <= Tools.maxMessageLength) {
					text += answers;
				} else {
					text += ' A possible answer was __' + answer + '__.';
				}
				this.say(text);
			}

			this.answers = [];
			this.timeout = setTimeout(() => this.nextRound(), 5000);
			return true;
		},
	},
};
commands.g = {
	asyncCommand: commands.guess.asyncCommand,
};

const initialize = (game: Game) => {
	const mode = new Team();
	const propertiesToOverride = Object.getOwnPropertyNames(mode).concat(Object.getOwnPropertyNames(Team.prototype)) as (keyof Team)[];
	for (let i = 0; i < propertiesToOverride.length; i++) {
		// @ts-ignore
		game[propertiesToOverride[i]] = mode[propertiesToOverride[i]];
	}

	for (const command in commands) {
		if (command in game.commands) {
			for (const i in game.commands) {
				if ((game.commands[command].asyncCommand && game.commands[i].asyncCommand === game.commands[command].asyncCommand) ||
					(game.commands[command].command && game.commands[i].command === game.commands[command].command)) {
					// @ts-ignore
					game.commands[i] = commands[command];
				}
			}
		} else {
			// @ts-ignore
			game.commands[command] = commands[command];
		}
	}
};

export const mode: IGameModeFile<Team, Guessing> = {
	aliases: ['teams'],
	class: Team,
	commands,
	description,
	initialize,
	name,
	naming: 'prefix',
	removedOptions,
};

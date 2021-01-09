import type { Player, PlayerTeam } from "../../room-activity";
import type { ScriptedGame } from "../../room-game-scripted";
import { addPlayers, assert, assertStrictEqual, runCommand } from "../../test/test-tools";
import type {
	DefaultGameOption, GameCommandDefinitions, GameCommandReturnType, GameFileTests, IGameFormat, IGameModeFile
} from "../../types/games";
import type { QuestionAndAnswer } from "../templates/question-and-answer";

const BASE_POINTS = 20;

const name = 'Team';
const description = 'One player from each team will be able to answer each round!';
const removedOptions: string[] = ['points', 'freejoin'];

type TeamThis = QuestionAndAnswer & Team;

class Team {
	canLateJoin: boolean = true;
	currentPlayers: Dict<Player> = {};
	firstAnswers: Dict<Player | false> = {};
	lateJoinQueueSize: number = 0;
	minPlayers: number = 4;
	playerOrders: Dict<Player[]> = {};
	queueLateJoins: boolean = true;
	teamRound: number = 0;
	teams: Dict<PlayerTeam> = {};

	// set in onStart()
	largestTeam!: PlayerTeam;

	static setOptions<T extends ScriptedGame>(format: IGameFormat<T>, namePrefixes: string[]): void {
		if (!format.name.includes(name)) namePrefixes.unshift(name);
		format.description += ' ' + description;

		if (!format.defaultOptions.includes('teams')) format.defaultOptions.push('teams');

		for (const option of removedOptions) {
			const index = format.defaultOptions.indexOf(option as DefaultGameOption);
			if (index !== -1) format.defaultOptions.splice(index, 1);

			delete format.customizableOptions[option];
		}

		if (!('teamPoints' in format.customizableOptions)) {
			format.customizableOptions.teamPoints = {
				min: BASE_POINTS,
				base: BASE_POINTS,
				max: BASE_POINTS,
			};
		}
	}

	onAddLateJoinQueuedPlayers(this: TeamThis, queuedPlayers: Player[]): void {
		const teams = Object.keys(this.teams);
		for (const queuedPlayer of queuedPlayers) {
			queuedPlayer.frozen = false;

			const team = this.teams[teams[0]];
			teams.shift();

			team.addPlayer(queuedPlayer);
			this.playerOrders[team.id].push(queuedPlayer);
			queuedPlayer.say("You are on **Team " + team.name + "** with: " +
				Tools.joinList(team.getTeammateNames(queuedPlayer)));
		}
	}

	setTeams(this: TeamThis): void {
		this.lateJoinQueueSize = this.format.options.teams;
		this.teams = this.generateTeams(this.format.options.teams);
		this.setLargestTeam();

		for (const id in this.teams) {
			const team = this.teams[id];
			this.playerOrders[team.id] = [];
			this.say("**Team " + team.name + "**: " + Tools.joinList(team.getPlayerNames()));
		}
	}

	onRemovePlayer(this: TeamThis, player: Player): void {
		if (!this.started) return;

		const playerOrderIndex = this.playerOrders[player.team!.id].indexOf(player);
		if (playerOrderIndex !== -1) this.playerOrders[player.team!.id].splice(playerOrderIndex, 1);

		this.setLargestTeam();
	}

	onStart(this: TeamThis): void {
		this.setTeams();
		this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
	}

	beforeNextRound(this: TeamThis): boolean | string {
		const emptyTeams = this.getEmptyTeams();
		for (const team of emptyTeams) {
			delete this.teams[team.id];
			delete this.currentPlayers[team.id];
		}

		if (emptyTeams.length >= this.format.options.teams - 1) {
			this.say("There are not enough teams left!");
			const winningTeam = this.getFinalTeam()!;
			for (const player of winningTeam.players) {
				this.winners.set(player, 1);
			}

			this.timeout = setTimeout(() => this.end(), 5000);
			return false;
		}

		if (!this.playerOrders[this.largestTeam.id].length) {
			for (const id in this.teams) {
				const team = this.teams[id];
				this.setTeamPlayerOrder(team);
				this.currentPlayers[team.id] = this.playerOrders[team.id].shift()!;
			}

			this.teamRound++;
			const html = this.getRoundHtml(() => this.getTeamPoints(), undefined, 'Round ' + this.teamRound, "Team standings");
			this.sayUhtml(this.uhtmlBaseName + '-round-html', html);
		} else {
			for (const id in this.teams) {
				const team = this.teams[id];
				let player = this.playerOrders[team.id].shift();
				if (!player) {
					this.setTeamPlayerOrder(team);
					player = this.playerOrders[team.id].shift()!;
				}
				this.currentPlayers[team.id] = player;
			}
		}

		return Tools.joinList(Object.values(this.currentPlayers).map(x => x.name), "**", "**") + ", you are up!";
	}

	getTeamPoints(): string {
		const points: string[] = [];
		for (const i in this.teams) {
			points.push("<b>" + this.teams[i].name + "</b>: " + this.teams[i].points);
		}

		return points.join(" | ");
	}

	onEnd(this: TeamThis): void {
		this.winners.forEach((value, player) => {
			const points = this.points.get(player);
			let earnings = 250;
			if (points) {
				earnings += 50 * points;
			}
			this.addBits(player, earnings);
		});

		this.convertPointsToBits(0);
		this.announceWinners();
	}

	canGuessAnswer(this: TeamThis, player: Player): boolean {
		if (this.ended || !this.canGuess || !this.answers.length) return false;
		let currentPlayer = false;
		for (const team in this.currentPlayers) {
			if (this.currentPlayers[team] === player) {
				currentPlayer = true;
			}
		}
		if (!currentPlayer) return false;
		return true;
	}
}

const commandDefinitions: GameCommandDefinitions<TeamThis> = {
	guess: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user, cmd, timestamp): GameCommandReturnType {
			if (this.answerCommands && !this.answerCommands.includes(cmd)) return false;
			if (!this.canGuessAnswer(this.players[user.id])) return false;

			const player = this.players[user.id];
			const answer = this.guessAnswer(player, target);
			if (!answer || !this.canGuessAnswer(player)) return false;

			if (this.timeout) clearTimeout(this.timeout);

			if (this.onCorrectGuess) this.onCorrectGuess(player, answer);

			const awardedPoints = this.getPointsForAnswer ? this.getPointsForAnswer(answer, timestamp) : 1;
			this.addPoints(player, awardedPoints);

			if (this.allAnswersTeamAchievement) {
				if (player.team!.id in this.firstAnswers) {
					if (this.firstAnswers[player.team!.id] && this.firstAnswers[player.team!.id] !== player) {
						this.firstAnswers[player.team!.id] = false;
					}
				} else {
					this.firstAnswers[player.team!.id] = player;
				}
			}

			if (player.team!.points >= this.format.options.teamPoints) {
				let text = '**' + player.name + '** wins' + (this.parentGame ? '' : ' the game') + ' for Team ' + player.team!.name + '!';
				const answers = ' ' + this.getAnswers(answer, true);
				if (text.length + answers.length <= Tools.maxMessageLength) {
					text += answers;
				} else {
					text += ' A possible answer was __' + answer + '__.';
				}
				this.say(text);

				if (this.allAnswersTeamAchievement && this.firstAnswers[player.team!.id] === player) {
					this.unlockAchievement(player, this.allAnswersTeamAchievement);
				}

				for (const teamMember of player.team!.players) {
					if (!teamMember.eliminated) this.winners.set(teamMember, 1);
				}
				this.end();
				return true;
			} else {
				if (this.hint) this.off(this.hint);
				let text = '**' + player.name + '** advances Team ' + player.team!.name + ' to **' + player.team!.points + '** point' +
					(player.team!.points > 1 ? 's' : '') + '!';
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
		aliases: ['g'],
	},
};

const commands = CommandParser.loadCommandDefinitions(commandDefinitions);

const initialize = (game: QuestionAndAnswer): void => {
	const mode = new Team();
	const propertiesToOverride = Object.getOwnPropertyNames(mode).concat(Object.getOwnPropertyNames(Team.prototype)) as (keyof Team)[];
	for (const property of propertiesToOverride) {
		// @ts-expect-error
		game[property] = mode[property];
	}

	game.loadModeCommands(commands);
};

const tests: GameFileTests<TeamThis> = {
	'it should award points for correct answers': {
		config: {
			async: true,
			commands: [['guess'], ['g']],
		},
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		async test(game, format, attributes): Promise<void> {
			this.timeout(15000);

			const players = addPlayers(game);
			game.start();
			if (game.timeout) clearTimeout(game.timeout);
			await game.onNextRound();
			assert(game.answers.length);
			const team = players[0].team!;
			const currentPlayer = game.currentPlayers[team.id];
			assert(currentPlayer);
			game.canGuess = true;
			const expectedPoints = game.getPointsForAnswer ? game.getPointsForAnswer(game.answers[0], Date.now()) : 1;
			runCommand(game.answerCommands ? game.answerCommands[0] : attributes.commands![0], game.answers[0], game.room,
				currentPlayer.name);
			assertStrictEqual(game.points.get(currentPlayer), expectedPoints);
			assertStrictEqual(team.points, expectedPoints);
		},
	},
};

export const mode: IGameModeFile<Team, QuestionAndAnswer, TeamThis> = {
	aliases: ['teams'],
	class: Team,
	commands,
	description,
	initialize,
	name,
	naming: 'prefix',
	removedOptions,
	tests,
};

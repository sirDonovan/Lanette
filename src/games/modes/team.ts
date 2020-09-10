import type { Player, PlayerTeam } from "../../room-activity";
import type { Game } from "../../room-game";
import { addPlayers, assert, assertStrictEqual, runCommand } from "../../test/test-tools";
import type {
	DefaultGameOption, GameCommandDefinitions, GameCommandReturnType, GameFileTests, IGameFormat,
	IGameModeFile
} from "../../types/games";
import type { Guessing } from "../templates/guessing";

const BASE_POINTS = 20;

const name = 'Team';
const description = 'One player from each team will be able to answer each round!';
const removedOptions: string[] = ['points', 'freejoin'];

type TeamThis = Guessing & Team;

class Team {
	currentPlayers: Dict<Player> = {};
	firstAnswers: Dict<Player | false> = {};
	minPlayers: number = 4;
	playerOrders: Dict<Player[]> = {};
	teamRound: number = 0;
	teams: Dict<PlayerTeam> = {};

	// set in onStart()
	largestTeam!: PlayerTeam;

	static setOptions<T extends Game>(format: IGameFormat<T>, namePrefixes: string[], nameSuffixes: string[]): void {
		if (!format.name.includes(name)) namePrefixes.unshift(name);
		format.description += ' ' + description;

		if (!format.defaultOptions.includes('teams')) format.defaultOptions.push('teams');

		for (const option of removedOptions) {
			const index = format.defaultOptions.indexOf(option as DefaultGameOption);
			if (index !== -1) format.defaultOptions.splice(index, 1);

			delete format.customizableOptions[option];
		}

		if (!format.customizableOptions.teamPoints) {
			format.customizableOptions.teamPoints = {
				min: BASE_POINTS,
				base: BASE_POINTS,
				max: BASE_POINTS,
			};
		}
	}

	setTeams(this: TeamThis): void {
		this.teams = this.generateTeams(this.format.options.teams);
		this.setLargestTeam();

		for (const id in this.teams) {
			const team = this.teams[id];
			this.playerOrders[team.id] = [];
			this.say("**Team " + team.name + "**: " + Tools.joinList(team.getPlayerNames()));
		}
	}

	setLargestTeam(this: TeamThis): void {
		const teamIds = Object.keys(this.teams);
		this.largestTeam = this.teams[teamIds[0]];

		for (let i = 1; i < teamIds.length; i++) {
			const team = this.teams[teamIds[i]];
			if (team.players.length > this.largestTeam.players.length) this.largestTeam = team;
		}
	}

	setTeamPlayerOrder(this: TeamThis, team: PlayerTeam): void {
		this.playerOrders[team.id] = [];
		for (const player of team.players) {
			if (!player.eliminated) this.playerOrders[team.id].push(player);
		}

		this.playerOrders[team.id] = this.shuffle(this.playerOrders[team.id]);
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
		let emptyTeams = 0;
		const teamIds = Object.keys(this.teams);
		for (const id of teamIds) {
			const team = this.teams[id];
			if (!this.getRemainingPlayerCount(team.players)) {
				delete this.teams[id];
				delete this.currentPlayers[team.id];
				emptyTeams++;
			}
		}

		if (emptyTeams >= this.format.options.teams - 1) {
			this.say("There are not enough teams left!");
			for (const id in this.teams) {
				const team = this.teams[id];
				for (const player of team.players) {
					this.winners.set(player, 1);
				}
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
			const html = this.getRoundHtml(this.getTeamPoints, undefined, 'Round ' + this.teamRound, "Team standings");
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
				earnings += (50 * points);
			}
			this.addBits(player, earnings);
		});

		this.convertPointsToBits(0);
		this.announceWinners();
	}
}

const commandDefinitions: GameCommandDefinitions<TeamThis> = {
	guess: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		async asyncCommand(target, room, user): Promise<GameCommandReturnType> {
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

const commands = CommandParser.loadCommands(commandDefinitions);

const initialize = (game: Game): void => {
	const mode = new Team();
	const propertiesToOverride = Object.getOwnPropertyNames(mode).concat(Object.getOwnPropertyNames(Team.prototype)) as (keyof Team)[];
	for (const property of propertiesToOverride) {
		// @ts-expect-error
		game[property] = mode[property];
	}

	game.loadModeCommands(commands);
};

const tests: GameFileTests<TeamThis> = {
	'it should advance players who answer correctly': {
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
			const expectedPoints = game.getPointsForAnswer ? game.getPointsForAnswer(game.answers[0]) : 1;
			await runCommand(attributes.commands![0], game.answers[0], game.room, currentPlayer.name);
			assertStrictEqual(game.points.get(currentPlayer), expectedPoints);
			assertStrictEqual(team.points, expectedPoints);
		},
	},
};

export const mode: IGameModeFile<Team, Guessing, TeamThis> = {
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

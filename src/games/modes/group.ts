import type { Player, PlayerTeam } from "../../room-activity";
import type { ScriptedGame } from "../../room-game-scripted";
import type {
	DefaultGameOption, GameCommandDefinitions, GameCommandReturnType, IGameFormat, IGameModeFile
} from "../../types/games";
import type { QuestionAndAnswer } from "../templates/question-and-answer";

const BASE_POINTS = 20;

const name = 'Group';
const description = 'Players will be split into teams but everyone can answer each round!';
const removedOptions: string[] = ['points', 'freejoin'];

type GroupThis = QuestionAndAnswer & Group;

class Group {
	firstAnswers: Dict<Player | false> = {};
	minPlayers: number = 4;
	playerOrders: Dict<Player[]> = {};
	teamPoints: Dict<number> = {};
	teamRound: number = 0;
	teams: Dict<PlayerTeam> = {};

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

	setTeams(this: GroupThis): void {
		this.teams = this.generateTeams(this.format.options.teams);

		const teamIds = Object.keys(this.teams);

		for (const teamId of teamIds) {
			const team = this.teams[teamId];
			this.playerOrders[team.id] = [];
		}

		for (const i in this.players) {
			const player = this.players[i];
			if (player.eliminated) continue;
			this.playerOrders[player.team!.id].push(player);
		}

		for (const team in this.teams) {
			this.say("**Team " + this.teams[team].name + "**: " + Tools.joinList(this.teams[team].getPlayerNames()));
		}
	}

	onStart(this: GroupThis): void {
		this.setTeams();
		this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
	}

	getTeamPoints(): string {
		const points: string[] = [];
		for (const i in this.teams) {
			points.push("<b>" + this.teams[i].name + "</b>: " + this.teams[i].points);
		}

		return points.join(" | ");
	}

	beforeNextRound(this: GroupThis): boolean {
		const emptyTeams = this.getEmptyTeams();
		for (const team of emptyTeams) {
			delete this.teams[team.id];
		}

		if (emptyTeams.length >= this.format.options.teams - 1) {
			this.say("Only one team remains!");
			const winningTeam = this.getFinalTeam()!;
			for (const player of winningTeam.players) {
				this.winners.set(player, 1);
			}

			this.timeout = setTimeout(() => this.end(), 5000);
			return false;
		} else {
			return true;
		}
	}

	onEnd(this: GroupThis): void {
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
}

const commandDefinitions: GameCommandDefinitions<GroupThis> = {
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
			let points = this.points.get(player) || 0;
			points += awardedPoints;
			this.points.set(player, points);
			player.team!.points += awardedPoints;

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
	const mode = new Group();
	const propertiesToOverride = Object.getOwnPropertyNames(mode).concat(Object.getOwnPropertyNames(Group.prototype)) as (keyof Group)[];
	for (const property of propertiesToOverride) {
		// @ts-expect-error
		game[property] = mode[property];
	}

	game.loadModeCommands(commands);
};

export const mode: IGameModeFile<Group, QuestionAndAnswer, GroupThis> = {
	aliases: ['groups'],
	class: Group,
	commands,
	description,
	initialize,
	name,
	naming: 'prefix',
	removedOptions,
};

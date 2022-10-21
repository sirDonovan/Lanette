import type { Player } from "../../room-activity";
import { addPlayers, assert, assertStrictEqual, runCommand } from "../../test/test-tools";
import type { GameFileTests, IGameModeFile } from "../../types/games";
import type { QuestionAndAnswer } from "../templates/question-and-answer";
import { CollectiveTeam, commands, initialize as baseInitialize } from "./collective-team";

const name = 'Spotlight Team';
const description = 'One player from each team will be able to answer each round!';
const removedOptions: string[] = ['points', 'freejoin'];

type SpotlightTeamThis = QuestionAndAnswer & CollectiveTeam & SpotlightTeam;

class SpotlightTeam extends CollectiveTeam {
	static modeDescription: string = description;
	static modeName: string = name;

	currentPlayers: Dict<Player> = {};

	beforeNextRound(this: SpotlightTeamThis, newAnswer: boolean): boolean | string {
		if (!newAnswer) return true;

		const emptyTeams = this.getEmptyTeams();
		for (const team of emptyTeams) {
			delete this.teams[team.id];
			delete this.currentPlayers[team.id];
		}

		if (emptyTeams.length >= this.options.teams! - 1) {
			this.say("There are not enough teams left!");
			const winningTeam = this.getFinalTeam()!;
			for (const player of winningTeam.players) {
				this.winners.set(player, 1);
			}

			this.setTimeout(() => this.end(), 5000);
			return false;
		}

		if (this.canLateJoin) {
			const cutOff = this.options.teamPoints! / 2;
			for (const i in this.teams) {
				if (this.teams[i].points >= cutOff) {
					this.canLateJoin = false;
					break;
				}
			}
		}

		if (!this.playerOrders[this.largestTeam.id].length) {
			for (const id in this.teams) {
				const team = this.teams[id];
				this.setTeamPlayerOrder(team);
				this.currentPlayers[team.id] = this.playerOrders[team.id].shift()!;
			}

			this.teamRound++;
			const html = this.getRoundHtml(() => this.getTeamPoints(), undefined, undefined, "Team standings");
			this.sayUhtml(this.uhtmlBaseName + '-round-html', html);
		} else {
			for (const id in this.teams) {
				const team = this.teams[id];
				let player = this.playerOrders[team.id].shift();
				if (!player) {
					this.setTeamPlayerOrder(team);
					player = this.playerOrders[team.id].shift();
				}
				this.currentPlayers[team.id] = player!;
			}
		}

		return Tools.joinList(Object.values(this.currentPlayers).map(x => x.name), "**", "**") + ", you are up!";
	}

	canGuessAnswer(this: SpotlightTeamThis, player: Player | undefined): boolean {
		if (!player || this.ended || !this.canGuess || !this.answers.length) return false;

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

const initialize = (game: QuestionAndAnswer): void => {
	baseInitialize(game);

	const mode = new SpotlightTeam();
	const propertiesToOverride = Object.getOwnPropertyNames(mode)
		.concat(Object.getOwnPropertyNames(SpotlightTeam.prototype)) as (keyof SpotlightTeam)[];

	for (const property of propertiesToOverride) {
		// @ts-expect-error
		game[property] = mode[property];
	}

	game.loadModeCommands(commands);
};

const tests: GameFileTests<SpotlightTeamThis> = {
	'it should award points for correct answers': {
		config: {
			async: true,
			commands: [['guess'], ['g']],
		},
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

export const mode: IGameModeFile<SpotlightTeam, QuestionAndAnswer, SpotlightTeamThis> = {
	aliases: ['st', 'team', 'spotlight'],
	class: SpotlightTeam,
	commands,
	cooldownId: 'collectiveteam',
	cooldownName: "Team",
	description,
	initialize,
	name,
	naming: 'prefix',
	removedOptions,
	tests,
};

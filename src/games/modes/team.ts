import { CommandsDict } from "../../command-parser";
import { Player, PlayerTeam } from "../../room-activity";
import { DefaultGameOption, Game } from "../../room-game";
import { addPlayers, assert, assertStrictEqual, runCommand } from "../../test/test-tools";
import { GameCommandReturnType, GameFileTests, IGameFormat, IGameModeFile } from "../../types/games";
import { Guessing } from "../templates/guessing";

const BASE_POINTS = 20;

const name = 'Team';
const description = 'Players will be split into teams once the game starts!';
const removedOptions: string[] = ['points', 'freejoin'];

type TeamThis = Guessing & Team;

class Team {
	static setOptions<T extends Game>(format: IGameFormat<T>, namePrefixes: string[], nameSuffixes: string[]): void {
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

	currentPlayers: Dict<Player> = {};
	firstAnswers: Dict<Player | false> = {};
	minPlayers: number = 4;
	playerOrders: Dict<Player[]> = {};
	playerLists: Dict<Player[]> = {};
	teamPoints: Dict<number> = {};
	teamRound: number = 0;
	teams: Dict<PlayerTeam> = {};

	// set in onStart()
	largestTeam!: PlayerTeam;

	setTeams(this: TeamThis): void {
		this.teams = this.generateTeams(this.format.options.teams);

		const teamIds = Object.keys(this.teams);
		this.largestTeam = this.teams[teamIds[0]];

		for (let i = 0; i < teamIds.length; i++) {
			const team = this.teams[teamIds[i]];
			if (team.players.length > this.largestTeam.players.length) this.largestTeam = team;
			this.playerOrders[team.id] = [];
			this.playerLists[team.id] = [];
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
			this.say("**Team " + this.teams[team].name + "**: " + Tools.joinList(this.teams[team].getPlayerNames()));
		}
	}

	onStart(this: TeamThis): void {
		this.setTeams();
		this.timeout = setTimeout(() => this.nextRound(), 10000);
	}

	async onNextRound(this: TeamThis): Promise<void> {
		this.canGuess = false;

		let largestTeamPlayersCycled = false;
		let emptyTeams = 0;
		for (const id in this.teams) {
			const team = this.teams[id];
			if (!this.getRemainingPlayerCount(this.playerOrders[team.id])) {
				delete this.currentPlayers[team.id];
				emptyTeams++;
			} else {
				let player = this.playerLists[team.id].shift();
				while (!player || player.eliminated) {
					if (!this.playerLists[team.id].length) {
						if (team === this.largestTeam) largestTeamPlayersCycled = true;
						this.playerLists[team.id] = this.shuffle(this.playerOrders[team.id]);
					}
					player = this.playerLists[team.id].shift();
				}
				this.currentPlayers[team.id] = player;
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
		if (this.ended) return;

		const text = Tools.joinList(Object.values(this.currentPlayers).map(x => x.name)) + ", you are up!";
		this.on(text, () => {
			this.timeout = setTimeout(() => {
				const html = this.getHintHtml();
				const uhtmlName = this.uhtmlBaseName + '-hint-' + this.round;
				this.onUhtml(uhtmlName, html, () => {
					this.canGuess = true;
					this.timeout = setTimeout(() => {
						if (this.answers.length) {
							this.say("Time is up! " + this.getAnswers(''));
							this.answers = [];
						}
						this.nextRound();
					}, this.roundTime);
				});
				this.sayUhtml(uhtmlName, html);
			}, 5 * 1000);
		});

		if (largestTeamPlayersCycled) {
			this.teamRound++;
			const html = this.getRoundHtml(this.getTeamPoints, undefined, 'Round ' + this.teamRound, "Team standings");
			const uhtmlName = this.uhtmlBaseName + '-round-html';
			this.onUhtml(uhtmlName, html, () => {
				this.timeout = setTimeout(() => this.say(text), 5 * 1000);
			});
			this.sayUhtml(uhtmlName, html);
		} else {
			this.say(text);
		}
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
				if (earnings > this.maxBits) earnings = this.maxBits;
			}
			this.addBits(player, earnings);
		});

		this.convertPointsToBits(0);
		this.announceWinners();
	}
}

const commands: CommandsDict<Team & Guessing, GameCommandReturnType> = {
	guess: {
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
			let points = this.points.get(player) || 0;
			points += awardedPoints;
			this.points.set(player, points);
			player.team!.points += awardedPoints;

			if (this.allAnswersTeamAchievement) {
				if (player.team!.id in this.firstAnswers) {
					if (this.firstAnswers[player.team!.id] && this.firstAnswers[player.team!.id] !== player) this.firstAnswers[player.team!.id] = false;
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

				for (let i = 0; i < player.team!.players.length; i++) {
					if (!player.team!.players[i].eliminated) this.winners.set(player.team!.players[i], 1);
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

const initialize = (game: Game): void => {
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

const tests: GameFileTests<TeamThis> = {
	'it should advance players who answer correctly': {
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

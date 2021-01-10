import type { Player } from '../../room-activity';
import { ScriptedGame } from '../../room-game-scripted';
import type { Room } from '../../rooms';
import { assert, assertStrictEqual, getBasePlayerName, runCommand } from '../../test/test-tools';
import type {
	GameCommandDefinitions, GameCommandReturnType, GameFileTests, IGameAchievement, IGameFormat, IGameTemplateFile,
	IRandomGameAnswer
} from '../../types/games';

export abstract class QuestionAndAnswer extends ScriptedGame {
	additionalHintHeader: string = '';
	allowRepeatCorrectAnswers: boolean = false;
	answers: readonly string[] = [];
	answerTimeout: NodeJS.Timer | undefined;
	beforeNextRoundTime: number = 5 * 1000;
	cooldownBetweenRounds: number = 0;
	canGuess: boolean = false;
	checkScoreCapBeforeRound: boolean = false;
	correctPlayers: Player[] = [];
	firstAnswer: Player | false | undefined;
	guessedAnswers: string[] = [];
	hint: string = '';
	hintTimestamp: number = 0;
	hintUhtmlName: string = '';
	inactiveRoundLimit: number = 10;
	incorrectAnswers: number = 0;
	lastHintHtml: string = '';
	maxCorrectPlayersPerRound: number = 1;
	minimumAnswersPerHint: number = 0;
	multiRoundHints: boolean = false;
	readonly points = new Map<Player, number>();
	previousHint: string = '';
	questionAndAnswerRound: number = 0;
	roundTime: number = 10 * 1000;
	roundAnswersCount: number = 0;

	allAnswersAchievement?: IGameAchievement;
	allAnswersTeamAchievement?: IGameAchievement;
	answerCommands?: string[];
	noIncorrectAnswersMinigameAchievement?: IGameAchievement;
	roundCategory?: string;
	readonly roundGuesses?: Map<Player, boolean>;
	updateHintTime?: number;

	abstract generateAnswer(): Promise<void> | void;

	onInitialize(format: IGameFormat): void {
		super.onInitialize(format);

		if (!format.options.points && !(format.mode && format.mode.removedOptions && format.mode.removedOptions.includes('points'))) {
			throw new Error("Question and Answer games must include default or customizable points options");
		}
	}

	cleanupTimers(): void {
		if (this.answerTimeout) {
			clearTimeout(this.answerTimeout);
			delete this.answerTimeout;
		}
	}

	onSignups(): void {
		if (!this.isMiniGame) {
			if (this.format.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5000);
		}
	}

	getHintHtml(): string {
		return "<div style='padding-bottom:5px'>" + this.getMascotAndNameHtml(this.additionalHintHeader ? " " + this.additionalHintHeader :
			"") + "<br /><br />" + this.hint + "</div>";
	}

	repostInformation(): void {
		if (!this.answers.length) return;

		this.sayUhtml(this.hintUhtmlName, this.getHintHtml());
	}

	onAnswerTimeLimit(): void {
		if (this.answers.length) {
			this.say("Time is up! " + this.getAnswers(''));
			this.answers = [];
			if (this.isMiniGame) {
				this.end();
				return;
			}
		}

		if (!this.correctPlayers.length) {
			this.inactiveRounds++;
			if (this.inactiveRounds === this.inactiveRoundLimit) {
				this.inactivityEnd();
				return;
			}
		}

		this.nextRound();
	}

	async tryGenerateAnswer(): Promise<void> {
		try {
			await this.generateAnswer();
		} catch (e) {
			console.log(e);
			Tools.logError(e, this.format.name + " generateAnswer()");
			this.errorEnd();
		}
	}

	async setNextAnswer(): Promise<void> {
		await this.tryGenerateAnswer();
		if (this.ended) return;

		while (this.minimumAnswersPerHint && this.answers.length < this.minimumAnswersPerHint) {
			await this.tryGenerateAnswer();
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (this.ended) return;
		}

		if (this.roundGuesses) this.roundGuesses.clear();
		this.guessedAnswers = [];
		this.correctPlayers = [];
		this.incorrectAnswers = 0;
		this.roundAnswersCount = this.answers.length;
		this.hintTimestamp = 0;
		this.questionAndAnswerRound++;
	}

	removeAnswer(answer: string): void {
		const index = this.answers.indexOf(answer);
		if (index !== -1) {
			const answers = this.answers.slice();
			answers.splice(index, 1);
			this.answers = answers;
			this.guessedAnswers.push(answer);
		}
	}

	async onNextRound(): Promise<void> {
		if (this.checkScoreCapBeforeRound) {
			let reachedCap = false;
			this.points.forEach((points, player) => {
				if (points >= this.format.options.points) {
					this.winners.set(player, points);
					if (!reachedCap) reachedCap = true;
				}
			});
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (reachedCap) {
				this.end();
				return;
			}
		}

		let roundText: boolean | string | undefined;
		if (this.beforeNextRound) {
			roundText = this.beforeNextRound();
			if (roundText === false) return;
		}

		this.previousHint = this.hint;

		let newAnswer = false;
		if (!this.answers.length) {
			newAnswer = true;
			if (this.answerTimeout) clearTimeout(this.answerTimeout);
			this.canGuess = false;
			await this.setNextAnswer();
			if (this.ended) return;
		}

		if (this.updateHint) {
			this.updateHint();
			if (this.ended) return;
		}

		const sayHint = () => {
			const onHintHtml = (timestamp: number) => {
				if (this.ended) return;
				if (!this.canGuess) this.canGuess = true;
				if (newAnswer) {
					this.hintTimestamp = timestamp;
					if (this.roundTime) {
						if (this.answerTimeout) clearTimeout(this.answerTimeout);
						this.answerTimeout = setTimeout(() => this.onAnswerTimeLimit(), this.roundTime);
					}
				}
				if (this.onHintHtml) this.onHintHtml();
			};

			if (!newAnswer && this.previousHint && this.previousHint === this.hint) {
				onHintHtml(Date.now());
			} else {
				this.hintUhtmlName = this.uhtmlBaseName + '-hint-round' + this.questionAndAnswerRound;
				const html = this.getHintHtml();
				this.lastHintHtml = html;
				this.onUhtml(this.hintUhtmlName, html, onHintHtml);

				if (newAnswer) {
					this.sayUhtml(this.hintUhtmlName, html);
				} else {
					this.sayUhtmlAuto(this.hintUhtmlName, html);
				}
			}
		};

		if (typeof roundText === 'string') {
			this.on(roundText, () => {
				this.timeout = setTimeout(() => sayHint(), this.beforeNextRoundTime);
			});
			this.say(roundText);
		} else if (this.cooldownBetweenRounds) {
			this.timeout = setTimeout(() => sayHint(), this.cooldownBetweenRounds);
		} else {
			sayHint();
		}
	}

	increaseDifficulty(): void {
		if (!this.roundTime) throw new Error("increaseDifficulty() needs to be implemented in the child class");
		this.roundTime = Math.max(2000, this.roundTime - 1000);
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	canGuessAnswer(player: Player): boolean {
		if (this.ended || !this.canGuess || !this.answers.length || this.correctPlayers.includes(player)) return false;
		return true;
	}

	guessAnswer(player: Player, guess: string): string | false {
		if (!Tools.toId(guess) || (this.filterGuess && this.filterGuess(guess, player))) return false;

		if (this.roundGuesses) {
			if (this.roundGuesses.has(player)) return false;
			this.roundGuesses.set(player, true);
		}

		let answer = this.checkAnswer(guess);

		if (!answer) {
			this.incorrectAnswers++;
			if (!this.onIncorrectGuess) return false;
			answer = this.onIncorrectGuess(player, guess);
			if (!answer) return false;
		}

		if (this.maxCorrectPlayersPerRound === 1) {
			if (this.answerTimeout) {
				clearTimeout(this.answerTimeout);
				delete this.answerTimeout;
			}
		}

		this.offUhtml(this.hintUhtmlName, this.lastHintHtml);
		this.inactiveRounds = 0;

		return answer;
	}

	checkAnswer(guess: string, answers?: readonly string[]): string {
		guess = Tools.toId(guess);
		if (!answers) answers = this.answers;
		let match = '';
		const guessMega = guess.substr(0, 4) === 'mega' ? guess.substr(4) + 'mega' : '';
		const guessPrimal = guess.substr(0, 6) === 'primal' ? guess.substr(6) + 'primal' : '';
		for (const answer of answers) {
			const id = Tools.toId(answer);
			if (id === guess || (guessMega && id === guessMega) || (guessPrimal && id === guessPrimal)) {
				match = answer;
				break;
			}
		}

		return match;
	}

	/** Return an empty string to not display answers */
	getAnswers(givenAnswer: string, finalAnswer?: boolean): string {
		return "The" + (finalAnswer ? " final " : "") + " answer" + (this.answers.length > 1 ? "s were" : " was") + " __" +
			Tools.joinList(this.answers) + "__.";
	}

	getRandomAnswer(): IRandomGameAnswer {
		// formats with async generateAnswer should not have canGetRandomAnswer set to `true`
		void this.generateAnswer();
		if (this.updateHint) this.updateHint();
		return {answers: this.answers, hint: this.hint};
	}

	getForceEndMessage(): string {
		if (!this.answers.length || !this.canGuess) return "";
		return this.getAnswers("", !this.isMiniGame);
	}

	onTimeLimit(): boolean {
		const winners = new Map<Player, number>();
		let mostPoints = 0;
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			const points = this.points.get(player);
			if (!points) continue;
			if (points > mostPoints) {
				winners.clear();
				winners.set(player, points);
				mostPoints = points;
			} else if (points === mostPoints) {
				winners.set(player, points);
			}
		}

		winners.forEach((points, player) => {
			this.winners.set(player, points);
		});

		return true;
	}

	onEnd(): void {
		if (this.isMiniGame) return;
		this.convertPointsToBits();
		this.announceWinners();
	}

	beforeNextRound?(): boolean | string;
	filterGuess?(guess: string, player?: Player): boolean;
	getPointsForAnswer?(answer: string, timestamp: number): number;
	onCorrectGuess?(player: Player, guess: string): void;
	onHintHtml?(): void;
	onIncorrectGuess?(player: Player, guess: string): string;
	updateHint?(): void;
}

const commands: GameCommandDefinitions<QuestionAndAnswer> = {
	guess: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user, cmd, timestamp): GameCommandReturnType {
			if (this.answerCommands && !this.answerCommands.includes(cmd)) return false;

			const player = this.createPlayer(user) || this.players[user.id];
			if (!this.canGuessAnswer(player)) return false;

			const answer = this.guessAnswer(player, target);
			if (!answer || !this.canGuessAnswer(player)) return false;

			if (this.timeout) clearTimeout(this.timeout);

			if (this.isMiniGame) {
				this.say((this.pm ? "You are" : "**" + user.name + "** is") + " correct! " + this.getAnswers(answer));
				this.addBits(user, Games.minigameBits);
				if (this.noIncorrectAnswersMinigameAchievement && !this.incorrectAnswers) {
					this.unlockAchievement(player, this.noIncorrectAnswersMinigameAchievement);
				}
				this.end();
				return true;
			}

			if (this.onCorrectGuess) this.onCorrectGuess(player, answer);

			const awardedPoints = this.getPointsForAnswer ? this.getPointsForAnswer(answer, timestamp) : 1;
			const points = this.addPoints(player, awardedPoints);

			this.correctPlayers.push(player);

			const singleCorrectPlayer = this.maxCorrectPlayersPerRound === 1;
			if (this.allAnswersAchievement && singleCorrectPlayer) {
				if (this.firstAnswer === undefined) {
					this.firstAnswer = player;
				} else {
					if (this.firstAnswer && this.firstAnswer !== player) this.firstAnswer = false;
				}
			}

			const reachedMaxPoints = points >= this.format.options.points;
			if (singleCorrectPlayer || (reachedMaxPoints && !this.checkScoreCapBeforeRound)) {
				if (this.hint) this.off(this.hint);
				let text = '**' + player.name + '** advances to **' + this.getPointsDisplay(points, reachedMaxPoints ? 0 : undefined) +
					'** point' + (points > 1 ? 's' : '') + '!';
				const answers = this.getAnswers(answer);
				if (answers) {
					if ((text + " " + answers).length <= Tools.maxMessageLength) {
						text += " " + answers;
					} else {
						text += ' A possible answer was __' + answer + '__.';
					}
				}
				this.say(text);

				if (reachedMaxPoints) {
					if (this.allAnswersAchievement && this.firstAnswer === player && !this.parentGame) {
						this.unlockAchievement(player, this.allAnswersAchievement);
					}
					this.winners.set(player, points);
					this.end();
					return true;
				} else {
					this.answers = [];
					this.timeout = setTimeout(() => this.nextRound(), 5000);
				}
			} else {
				if (this.allowRepeatCorrectAnswers) {
					if (awardedPoints) {
						player.say("You are correct! You earned " + this.getPointsDisplay(awardedPoints) + " point" +
							(awardedPoints > 1 ? "s" : "") + ".");
					}
				} else {
					this.say(player.name + " is the **" + Tools.toNumberOrderString(this.correctPlayers.length) + "** correct player!");
				}

				if (this.maxCorrectPlayersPerRound !== Infinity && this.correctPlayers.length === this.maxCorrectPlayersPerRound) {
					this.answers = [];
				} else {
					if (!this.allowRepeatCorrectAnswers) this.removeAnswer(answer);
				}

				if (!this.answers.length) this.timeout = setTimeout(() => this.nextRound(), 5000);
			}

			return true;
		},
		aliases: ['g'],
	},
};

const tests: GameFileTests<QuestionAndAnswer> = {
	'it should properly set answers and award points': {
		config: {
			async: true,
		},
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		async test(game): Promise<void> {
			this.timeout(15000);

			assert(!game.canGuess);
			const name = getBasePlayerName() + " 1";
			const id = Tools.toId(name);

			await game.onNextRound();
			assert(game.answers.length);
			assert(game.hint);
			const expectedPoints = game.getPointsForAnswer ? game.getPointsForAnswer(game.answers[0], Date.now()) : 1;
			game.canGuess = true;
			runCommand('guess', game.answers[0], game.room, name);
			assert(id in game.players);
			assertStrictEqual(game.points.get(game.players[id]), expectedPoints);
			assert(!game.answers.length);
		},
	},
	'it should give enough time each round for full hints': {
		config: {
			async: true,
		},
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		async test(game): Promise<void> {
			this.timeout(15000);

			await game.onNextRound();
			const previousAnswers = game.answers;
			const previousHint = game.hint;
			game.canGuess = true;
			const name = getBasePlayerName() + " 1";
			runCommand('guess', "a", game.room, name);

			await game.onNextRound();
			assertStrictEqual(game.answers, previousAnswers);
			if (game.hint !== previousHint) {
				assert(game.updateHintTime);
				if (game.roundTime) assert(game.updateHintTime < game.roundTime);
			}
		},
	},
	'it should clear the answer timeout after guessing correctly': {
		config: {
			async: true,
		},
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		async test(game): Promise<void> {
			this.timeout(15000);

			if (game.roundTime) {
				const name = getBasePlayerName() + " 1";
				const id = Tools.toId(name);
				await game.onNextRound();
				game.answerTimeout = setTimeout(() => game.onAnswerTimeLimit(), game.roundTime);
				game.canGuess = true;
				runCommand('guess', game.answers[0], game.room, name);
				assert(id in game.players);
				assert(game.points.has(game.players[id]));
				assert(!game.answerTimeout);
			}
		},
	},
	'it should clear the answer timeout when the game ends': {
		config: {
			async: true,
		},
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		async test(game): Promise<void> {
			this.timeout(15000);

			if (game.roundTime) {
				await game.onNextRound();
				game.answerTimeout = setTimeout(() => game.onAnswerTimeLimit(), game.roundTime);
				game.end();
				assert(!game.answerTimeout);
			}
		},
	},
	'it should clear the answer timeout when the game is force-ended': {
		config: {
			async: true,
		},
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		async test(game): Promise<void> {
			this.timeout(15000);

			if (game.roundTime) {
				await game.onNextRound();
				game.answerTimeout = setTimeout(() => game.onAnswerTimeLimit(), game.roundTime);
				game.forceEnd(Users.self);
				assert(!game.answerTimeout);
			}
		},
	},
	'it should end the game when the maximum points are reached': {
		config: {
			async: true,
		},
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		async test(game): Promise<void> {
			this.timeout(15000);

			const name = getBasePlayerName() + " 1";
			const id = Tools.toId(name);
			game.format.options.points = 3;

			for (let i = 0; i < 3; i++) {
				if (game.timeout) clearTimeout(game.timeout);
				await game.onNextRound();
				assert(game.answers.length);
				let expectedPoints = game.getPointsForAnswer ? game.getPointsForAnswer(game.answers[0], Date.now()) : 1;
				const points = game.points.get(game.players[id]);
				if (points) expectedPoints += points;
				game.canGuess = true;
				runCommand('guess', game.answers[0], game.room, name);
				assertStrictEqual(game.points.get(game.players[id]), expectedPoints);
				if (game.ended) break;
			}

			assert(game.ended);
		},
	},
	'it should end after 1 question as a minigame': {
		config: {
			async: true,
		},
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		async test(game, format): Promise<void> {
			if (!format.minigameCommand) return;
			this.timeout(15000);
			game.deallocate(true);

			const minigame = Games.createGame(game.room,
				(format as unknown) as IGameFormat, game.room as Room, true) as QuestionAndAnswer;
			minigame.signups();
			if (minigame.timeout) clearTimeout(minigame.timeout);
			await minigame.onNextRound();
			assert(minigame.answers.length);
			minigame.canGuess = true;
			runCommand('guess', minigame.answers[0], minigame.room, getBasePlayerName());
			assert(minigame.ended);

			minigame.deallocate(true);
		},
	},
	'it should properly work in PMs as a minigame': {
		config: {
			async: true,
		},
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		async test(game, format): Promise<void> {
			if (!format.minigameCommand) return;
			this.timeout(15000);
			game.deallocate(true);

			const name = getBasePlayerName() + " 1";
			const id = Tools.toId(name);
			const user = Users.add(name, id);
			const pmMinigame = Games.createGame(user,
				(format as unknown) as IGameFormat, game.room as Room, true) as QuestionAndAnswer;

			pmMinigame.signups();
			if (pmMinigame.timeout) clearTimeout(pmMinigame.timeout);
			await pmMinigame.onNextRound();
			assert(pmMinigame.answers.length);
			pmMinigame.canGuess = true;
			runCommand('guess', pmMinigame.answers[0], user, name);
			assert(pmMinigame.ended);

			pmMinigame.deallocate(true);
			Users.remove(user);
		},
	},
};

export const game: IGameTemplateFile<QuestionAndAnswer> = {
	canGetRandomAnswer: true,
	commandDescriptions: [Config.commandCharacter + 'g [answer]'],
	commands,
	tests,
};

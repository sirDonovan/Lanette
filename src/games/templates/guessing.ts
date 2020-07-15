import type { Player } from '../../room-activity';
import { Game } from '../../room-game';
import type { Room } from '../../rooms';
import { assert, assertStrictEqual, getBasePlayerName, runCommand } from '../../test/test-tools';
import type {
	GameCommandDefinitions, GameCommandReturnType, GameFileTests, IGameAchievement, IGameFormat, IGameTemplateFile,
	IRandomGameAnswer
} from '../../types/games';

const MINIGAME_BITS = 25;

export abstract class Guessing extends Game {
	additionalHintHeader: string = '';
	answers: string[] = [];
	answerTimeout: NodeJS.Timer | undefined;
	beforeNextRoundTime: number = 5 * 1000;
	canGuess: boolean = false;
	firstAnswer: Player | false | undefined;
	guessingRound: number = 0;
	hint: string = '';
	readonly points = new Map<Player, number>();
	roundTime: number = 10 * 1000;

	allAnswersAchievement?: IGameAchievement;
	allAnswersTeamAchievement?: IGameAchievement;
	roundCategory?: string;
	readonly roundGuesses?: Map<Player, boolean>;

	// set in intialize()
	hintUhtmlName!: string;

	abstract async setAnswers(): Promise<void>;

	onInitialize(): void {
		super.onInitialize();

		this.hintUhtmlName = this.uhtmlBaseName + '-hint';
		const format = (this.format as IGameFormat);
		if (!format.options.points && !(format.mode && format.mode.removedOptions && format.mode.removedOptions.includes('points'))) {
			throw new Error("Guessing games must include default or customizable points options");
		}
	}

	onSignups(): void {
		if (!this.isMiniGame) {
			if (this.format.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5000);
		}
	}

	getHintHtml(): string {
		return "<div style='padding-bottom:8px'>" + this.getNameSpan((this.isMiniGame ? " (minigame)" : "") +
			(this.additionalHintHeader ? " " + this.additionalHintHeader : "")) + "<br /><br />" + this.hint + "</div>";
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
		this.nextRound();
	}

	async onNextRound(): Promise<void> {
		let roundText: boolean | string | undefined;
		if (this.beforeNextRound) {
			roundText = this.beforeNextRound();
			if (roundText === false) return;
		}

		let newAnswer = false;
		if (!this.answers.length) {
			newAnswer = true;
			this.canGuess = false;
			await this.setAnswers();
			if (this.ended) return;
			if (this.roundGuesses) this.roundGuesses.clear();
			this.guessingRound++;
		}

		if (this.updateHint) {
			this.updateHint();
			if (this.ended) return;
		}

		const hintUhtmlName = this.hintUhtmlName + '-round' + this.guessingRound;
		const html = this.getHintHtml();
		this.onUhtml(hintUhtmlName, html, () => {
			if (this.ended) return;
			if (!this.canGuess) this.canGuess = true;
			if (this.answerTimeout) clearTimeout(this.answerTimeout);
			this.answerTimeout = setTimeout(() => this.onAnswerTimeLimit(), this.roundTime);
			if (this.onHintHtml) this.onHintHtml();
		});

		const sayHint = () => {
			if (newAnswer) {
				this.sayUhtml(hintUhtmlName, html);
			} else {
				this.sayUhtmlAuto(hintUhtmlName, html);
			}
		};

		if (typeof roundText === 'string') {
			this.on(roundText, () => {
				this.timeout = setTimeout(() => sayHint(), this.beforeNextRoundTime);
			});
			this.say(roundText);
		} else {
			sayHint();
		}
	}

	async guessAnswer(player: Player, guess: string): Promise<string | false> {
		if (!Tools.toId(guess) || this.filterGuess && this.filterGuess(guess)) return false;

		if (this.roundGuesses) {
			if (this.roundGuesses.has(player)) return false;
			this.roundGuesses.set(player, true);
		}

		if (!this.answers.length) return false;

		let answer = await this.checkAnswer(guess);
		if (this.ended) return false;

		if (!answer) {
			if (!this.onIncorrectGuess) return false;
			answer = this.onIncorrectGuess(player, guess);
			if (!answer) return false;
		}

		return answer;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async checkAnswer(guess: string): Promise<string> {
		guess = Tools.toId(guess);
		let match = '';
		const guessMega = (guess.substr(0, 4) === 'mega' ? guess.substr(4) + 'mega' : '');
		const guessPrimal = (guess.substr(0, 6) === 'primal' ? guess.substr(6) + 'primal' : '');
		for (const answer of this.answers) {
			const id = Tools.toId(answer);
			if (id === guess || (guessMega && id === guessMega) || (guessPrimal && id === guessPrimal)) {
				match = answer;
				break;
			}
		}
		return match;
	}

	getAnswers(givenAnswer: string, finalAnswer?: boolean): string {
		return "The" + (finalAnswer ? " final " : "") + " answer" + (this.answers.length > 1 ? "s were" : " was") + " __" +
			Tools.joinList(this.answers) + "__.";
	}

	async getRandomAnswer(): Promise<IRandomGameAnswer> {
		await this.setAnswers();
		if (this.updateHint) this.updateHint();
		return {answers: this.answers, hint: this.hint};
	}

	getForceEndMessage(): string {
		if (!this.answers.length) return "";
		return this.getAnswers("", !this.isMiniGame);
	}

	beforeNextRound?(): boolean | string;
	filterGuess?(guess: string): boolean;
	getPointsForAnswer?(answer: string): number;
	onCorrectGuess?(player: Player, guess: string): void;
	onHintHtml?(): void;
	onIncorrectGuess?(player: Player, guess: string): string;
	updateHint?(): void;
}

const commands: GameCommandDefinitions<Guessing> = {
	guess: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		async asyncCommand(target, room, user): Promise<GameCommandReturnType> {
			if (!this.canGuess || !this.answers.length) return false;
			const player = this.createPlayer(user) || this.players[user.id];
			if (!player.active) player.active = true;

			const answer = await this.guessAnswer(player, target);
			if (!answer) return false;

			if (this.timeout) clearTimeout(this.timeout);

			if (this.isMiniGame) {
				this.say((this.pm ? "You are" : "**" + user.name + "** is") + " correct! " + this.getAnswers(answer));
				this.addBits(user, MINIGAME_BITS);
				this.end();
				return true;
			}

			if (this.onCorrectGuess) this.onCorrectGuess(player, answer);

			const awardedPoints = this.getPointsForAnswer ? this.getPointsForAnswer(answer) : 1;
			let points = this.points.get(player) || 0;
			points += awardedPoints;
			this.points.set(player, points);

			if (this.allAnswersAchievement) {
				if (this.firstAnswer === undefined) {
					this.firstAnswer = player;
				} else {
					if (this.firstAnswer && this.firstAnswer !== player) this.firstAnswer = false;
				}
			}

			if (points >= this.format.options.points) {
				let text = '**' + player.name + '** wins' + (this.parentGame ? '' : ' the game') + '!';
				const answers = ' ' + this.getAnswers(answer, true);
				if (text.length + answers.length <= Tools.maxMessageLength) {
					text += answers;
				} else {
					text += ' A possible answer was __' + answer + '__.';
				}
				this.say(text);
				if (this.allAnswersAchievement && this.firstAnswer === player && !this.parentGame) {
					this.unlockAchievement(player, this.allAnswersAchievement);
				}
				this.winners.set(player, 1);
				this.convertPointsToBits();
				this.end();
				return true;
			} else {
				if (this.hint) this.off(this.hint);
				let text = '**' + player.name + '** advances to **' + points + '** point' + (points > 1 ? 's' : '') + '!';
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

const tests: GameFileTests<Guessing> = {
	/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
	'it should properly set answers and award points': {
		config: {
			async: true,
		},
		async test(game, format): Promise<void> {
			this.timeout(15000);

			assert(!game.canGuess);
			const name = getBasePlayerName() + " 1";
			const id = Tools.toId(name);
			await runCommand('guess', "test", game.room, name);
			assert(!(id in game.players));

			await game.onNextRound();
			assert(game.answers.length);
			const expectedPoints = game.getPointsForAnswer ? game.getPointsForAnswer(game.answers[0]) : 1;
			game.canGuess = true;
			await runCommand('guess', game.answers[0], game.room, name);
			assert(id in game.players);
			assertStrictEqual(game.points.get(game.players[id]), expectedPoints);
		},
	},
	'it should end the game when the maximum points are reached': {
		config: {
			async: true,
		},
		async test(game, format): Promise<void> {
			this.timeout(15000);

			const name = getBasePlayerName() + " 1";
			const id = Tools.toId(name);
			game.format.options.points = 3;

			for (let i = 0; i < 3; i++) {
				if (game.timeout) clearTimeout(game.timeout);
				await game.onNextRound();
				assert(game.answers.length);
				let expectedPoints = game.getPointsForAnswer ? game.getPointsForAnswer(game.answers[0]) : 1;
				const points = game.points.get(game.players[id]);
				if (points) expectedPoints += points;
				game.canGuess = true;
				await runCommand('guess', game.answers[0], game.room, name);
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
		async test(game, format): Promise<void> {
			if (!format.minigameCommand) return;
			this.timeout(15000);
			game.deallocate(true);

			const minigame = Games.createGame(game.room, (format as unknown) as IGameFormat<Game>, game.room as Room, true) as Guessing;
			minigame.signups();
			if (minigame.timeout) clearTimeout(minigame.timeout);
			await minigame.onNextRound();
			assert(minigame.answers.length);
			minigame.canGuess = true;
			await runCommand('guess', minigame.answers[0], minigame.room, getBasePlayerName());
			assert(minigame.ended);

			minigame.deallocate(true);
		},
	},
	'it should properly work in PMs as a minigame': {
		config: {
			async: true,
		},
		async test(game, format): Promise<void> {
			if (!format.minigameCommand) return;
			this.timeout(15000);
			game.deallocate(true);

			const name = getBasePlayerName() + " 1";
			const id = Tools.toId(name);
			const user = Users.add(name, id);
			const pmMinigame = Games.createGame(user, (format as unknown) as IGameFormat<Game>, game.room as Room, true) as Guessing;

			pmMinigame.signups();
			if (pmMinigame.timeout) clearTimeout(pmMinigame.timeout);
			await pmMinigame.onNextRound();
			assert(pmMinigame.answers.length);
			pmMinigame.canGuess = true;
			await runCommand('guess', pmMinigame.answers[0], user, name);
			assert(pmMinigame.ended);

			pmMinigame.deallocate(true);
			Users.remove(user);
		},
	}
	/* eslint-enable */
};

export const game: IGameTemplateFile<Guessing> = {
	canGetRandomAnswer: true,
	commandDescriptions: [Config.commandCharacter + 'g [answer]'],
	commands,
	tests,
};

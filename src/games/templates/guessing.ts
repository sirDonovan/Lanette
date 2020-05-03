import { ICommandDefinition } from '../../command-parser';
import { Player } from '../../room-activity';
import { Game } from '../../room-game';
import { assert, assertStrictEqual, getBasePlayerName, runCommand } from '../../test/test-tools';
import { GameFileTests, IGameFormat, IGameTemplateFile, IGameAchievement, GameCommandReturnType } from '../../types/games';

const MINIGAME_BITS = 25;

export abstract class Guessing extends Game {
	additionalHintHeader: string = '';
	answers: string[] = [];
	canGuess: boolean = false;
	firstAnswer: Player | false | undefined;
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

		this.hintUhtmlName = this.uhtmlBaseName + '-hint-' + this.round;
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
		return "<div style='padding-bottom:8px'><span style='color: #999999'>" + this.name + (this.isMiniGame ? " (minigame)" : "") +
			(this.additionalHintHeader ? " " + this.additionalHintHeader : "") + "</span><br /><br />" + this.hint + "</div>";
	}

	repostInformation(): void {
		if (!this.answers.length) return;

		this.sayUhtml(this.hintUhtmlName, this.getHintHtml());
	}

	async onNextRound(): Promise<void> {
		this.canGuess = false;
		await this.setAnswers();
		if (this.ended) return;

		const html = this.getHintHtml();
		this.onUhtml(this.hintUhtmlName, html, () => {
			this.canGuess = true;
			this.timeout = setTimeout(() => {
				if (this.answers.length) {
					this.say("Time is up! " + this.getAnswers(''));
					this.answers = [];
					if (this.isMiniGame) {
						this.end();
						return;
					}
				}
				this.nextRound();
			}, this.roundTime);
		});
		this.sayUhtml(this.hintUhtmlName, html);
	}

	async guessAnswer(player: Player, guess: string): Promise<string | false> {
		if (!Tools.toId(guess)) return false;
		if (this.filterGuess && this.filterGuess(guess)) return false;
		if (this.roundGuesses) {
			if (this.roundGuesses.has(player)) return false;
			this.roundGuesses.set(player, true);
		}
		let answer = await this.checkAnswer(guess);
		if (this.ended || !this.answers.length) return false;
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
		let len = this.answers.length;
		let answers = "The" + (finalAnswer ? " final " : "") + " answer" + (len > 1 ? "s were" : " was") + " __";
		if (len >= 3) {
			len -= 1;
			answers += this.answers.slice(0, len).join(", ") + " and " + this.answers[len];
		} else if (len === 2) {
			answers += this.answers.join(" and ");
		} else {
			answers += this.answers[0];
		}
		answers += "__.";
		return answers;
	}

	filterGuess?(guess: string): boolean;
	getPointsForAnswer?(answer: string): number;
	onCorrectGuess?(player: Player, guess: string): void;
	onIncorrectGuess?(player: Player, guess: string): string;
}

const commands: Dict<ICommandDefinition<Guessing>> = {
	guess: {
		async asyncCommand(target, room, user): Promise<GameCommandReturnType> {
			if (!this.canGuess || !this.answers.length || (this.players[user.id] && this.players[user.id].eliminated) ||
				(this.parentGame && (!this.players[user.id] || this.players[user.id].eliminated))) return false;
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
};

export const game: IGameTemplateFile<Guessing> = {
	commandDescriptions: [Config.commandCharacter + 'g [answer]'],
	commands,
	tests,
};

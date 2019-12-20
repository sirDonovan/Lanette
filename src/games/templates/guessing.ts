import { ICommandDefinition } from '../../command-parser';
import { Player } from '../../room-activity';
import { Game } from '../../room-game';
import { assert, assertStrictEqual, getBasePlayerName, runCommand } from '../../test/test-tools';
import { GameFileTests, IGameFormat, IGameTemplateFile } from '../../types/games';

const MINIGAME_BITS = 25;

export abstract class Guessing extends Game {
	answers: string[] = [];
	canGuess: boolean = false;
	hint: string = '';
	htmlHint: boolean | null = null;
	readonly points: Map<Player, number> = new Map();
	roundTime: number = 10 * 1000;

	roundCategory?: string;
	readonly roundGuesses?: Map<Player, boolean>;

	abstract async setAnswers(): Promise<void>;

	onInitialize() {
		super.onInitialize();

		const format = (this.format as IGameFormat);
		if (!format.options.points && !(format.mode && format.mode.removedOptions && format.mode.removedOptions.includes('points'))) {
			throw new Error("Guessing games must include default or customizable points options");
		}
	}

	onSignups() {
		if (!this.isMiniGame) {
			if (this.format.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5000);
		}
	}

	async onNextRound() {
		this.canGuess = false;
		await this.setAnswers();
		if (this.ended) return;

		const onHint = () => {
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
		};

		if (this.htmlHint) {
			const uhtmlName = this.uhtmlBaseName + '-hint';
			this.onUhtml(uhtmlName, this.hint, onHint);
			this.sayUhtml(uhtmlName, this.hint);
		} else {
			this.on(this.hint, onHint);
			this.say(this.hint);
		}
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

	async checkAnswer(guess: string): Promise<string> {
		guess = Tools.toId(guess);
		let match = '';
		const guessMega = (guess.substr(0, 4) === 'mega' ? guess.substr(4) + 'mega' : '');
		const guessPrimal = (guess.substr(0, 6) === 'primal' ? guess.substr(6) + 'primal' : '');
		for (let i = 0; i < this.answers.length; i++) {
			const answer = Tools.toId(this.answers[i]);
			if (answer === guess || (guessMega && answer === guessMega) || (guessPrimal && answer === guessPrimal)) {
				match = this.answers[i];
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
		async asyncCommand(target, room, user) {
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

			// this.markFirstAction(player);
			if (points >= this.format.options.points) {
				let text = '**' + player.name + '** wins' + (this.parentGame ? '' : ' the game') + '!';
				const answers = ' ' + this.getAnswers(answer, true);
				if (text.length + answers.length <= Tools.maxMessageLength) {
					text += answers;
				} else {
					text += ' A possible answer was __' + answer + '__.';
				}
				this.say(text);
				/*
				if (this.firstAnswer === player && !this.parentGame) {
					if (this.format.options.points >= 5) {
						if (this.id === 'metangsanagrams') {
							Games.unlockAchievement(this.room, player, "wordmaster", this);
						} else if (this.id === 'slowkingstrivia') {
							Games.unlockAchievement(this.room, player, "pokenerd", this);
						} else if (this.id === 'greninjastypings') {
							Games.unlockAchievement(this.room, player, "Dexter", this);
						} else if (this.id === 'magcargosweakspot') {
							Games.unlockAchievement(this.room, player, "Achilles Heel", this);
						} else if (this.id === 'abrasabilityswitch') {
							Games.unlockAchievement(this.room, player, 'Skill Swapper', this);
						}
					}
					if (this.format.options.points >= 3) {
						if (this.id === 'whosthatpokemon') {
							Games.unlockAchievement(this.room, player, "Pokemon Researcher", this);
						} else if (this.id === 'whatsthatmove') {
							Games.unlockAchievement(this.room, player, "Move Relearner", this);
						}
					}
				}
				*/
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
		attributes: {
			async: true,
		},
		async test(game, format) {
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
		attributes: {
			async: true,
		},
		async test(game, format) {
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

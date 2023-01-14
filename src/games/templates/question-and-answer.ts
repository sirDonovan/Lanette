import type { Player } from '../../room-activity';
import { ScriptedGame } from '../../room-game-scripted';
import type { Room } from '../../rooms';
import { assert, assertStrictEqual, getBasePlayerName, runCommand } from '../../test/test-tools';
import type {
	GameCommandDefinitions, GameCommandReturnType, GameFileTests, IGameAchievement, IGameFormat, IGameTemplateFile, IRandomGameAnswer
} from '../../types/games';

const TEST_TIMEOUT = 30000;

export abstract class QuestionAndAnswer extends ScriptedGame {
	additionalHintHeader: string = '';
	allowRepeatCorrectAnswers: boolean = false;
	answers: readonly string[] = [];
	answerTimeout: NodeJS.Timer | undefined;
	answerUhtmlName: string = '';
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
	inverse: boolean = false;
	lastHintKey: string = '';
	lastHintHtml: string = '';
	maxCorrectPlayersPerRound: number = 1;
	minimumAnswersPerHint: number = 0;
	multiRoundHints: boolean = false;
	readonly points = new Map<Player, number>();
	pokemonGifHints: boolean = false;
	previousHint: string = '';
	questionAndAnswerRound: number = 0;
	roundTime: number = 10 * 1000;
	roundAnswersCount: number = 0;

	allAnswersAchievement?: IGameAchievement;
	allAnswersTeamAchievement?: IGameAchievement;
	answerCommands?: string[];
	currentCategory?: string;
	hintPrefix?: string;
	longestAnswersOnly?: boolean;
	maxHintKeyLength?: number;
	minHintKeyLength?: number;
	oneGuessPerHint?: boolean;
	noIncorrectAnswersMinigameAchievement?: IGameAchievement;
	pmGuessing?: boolean;
	roundCategory?: string;
	readonly roundGuesses?: Map<Player, boolean>;
	shortestAnswersOnly?: boolean;
	updateHintTime?: number;
    allowMisType?: boolean;

	afterInitialize(): void {
		if (!this.isMiniGame && !this.options.points && !(this.format.mode && this.format.mode.removedOptions &&
			this.format.mode.removedOptions.includes('points'))) {
			throw new Error("Question and Answer games must include default or customizable points options");
		}
	}

	destroyPlayers(): void {
		super.destroyPlayers();

		if (this.roundGuesses) this.roundGuesses.clear();
	}

	cleanupTimers(): void {
		super.cleanupTimers();

		if (this.answerTimeout) {
			clearTimeout(this.answerTimeout);
			this.answerTimeout = undefined;
		}
	}

	onSignups(): void {
		if (!this.isMiniGame) {
			if (this.options.freejoin) this.setTimeout(() => this.nextRound(), 5000);
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
			this.say("Time is up!");
			this.displayAnswers();
			this.answers = [];
			if (this.isMiniGame) {
				this.end();
				return;
			}
		}

		if (!this.correctPlayers.length && !this.format.mode) {
			this.inactiveRounds++;
			if (this.inactiveRounds === this.inactiveRoundLimit) {
				this.inactivityEnd();
				return;
			}
		}

		this.nextRound();
	}

	async generateHint(): Promise<string> {
		try {
			if (this.format.class.cachedData) {
				let categories: readonly string[] | undefined;
				if (this.inverse && this.format.class.cachedData.inverseCategories) {
					categories = this.format.class.cachedData.inverseCategories;
				} else if (this.format.class.cachedData.categories) {
					categories = this.format.class.cachedData.categories;
				}

				let categoryHintKeys: Dict<readonly string[]> | undefined;
				if (this.inverse && this.format.class.cachedData.inverseCategoryHintKeys) {
					categoryHintKeys = this.format.class.cachedData.inverseCategoryHintKeys;
				} else if (this.format.class.cachedData.categoryHintKeys) {
					categoryHintKeys = this.format.class.cachedData.categoryHintKeys;
				}

				if (categories && categoryHintKeys) {
					const category = this.roundCategory || this.sampleOne(categories);
					this.currentCategory = category;

					let hintKey = this.sampleOne(categoryHintKeys[category]);
					while (hintKey === this.lastHintKey || (this.maxHintKeyLength && hintKey.length > this.maxHintKeyLength) ||
						(this.minHintKeyLength && hintKey.length < this.minHintKeyLength)) {
						hintKey = this.sampleOne(categoryHintKeys[category]);
					}
					this.lastHintKey = hintKey;

					let categoryHintAnswers: Dict<Dict<readonly string[]>> | undefined;
					if (this.inverse && this.format.class.cachedData.inverseCategoryHintAnswers) {
						categoryHintAnswers = this.format.class.cachedData.inverseCategoryHintAnswers;
					} else if (this.format.class.cachedData.categoryHintAnswers) {
						categoryHintAnswers = this.format.class.cachedData.categoryHintAnswers;
					}

					return await this.setGeneratedHint(hintKey, categoryHintAnswers ? categoryHintAnswers[category] : undefined);
				} else {
					let hintKeys: readonly string[] | undefined;
					if (this.inverse && this.format.class.cachedData.inverseHintKeys) {
						hintKeys = this.format.class.cachedData.inverseHintKeys;
					} else if (this.format.class.cachedData.hintKeys) {
						hintKeys = this.format.class.cachedData.hintKeys;
					}

					if (!hintKeys) throw new Error("No hint keys cached");

					let hintKey = this.sampleOne(hintKeys);
					while (hintKey === this.lastHintKey || (this.maxHintKeyLength && hintKey.length > this.maxHintKeyLength) ||
						(this.minHintKeyLength && hintKey.length < this.minHintKeyLength)) {
						hintKey = this.sampleOne(hintKeys);
					}
					this.lastHintKey = hintKey;

					let hintAnswers: Dict<readonly string[]> | undefined;
					if (this.inverse && this.format.class.cachedData.inverseHintAnswers) {
						hintAnswers = this.format.class.cachedData.inverseHintAnswers;
					} else if (this.format.class.cachedData.hintAnswers) {
						hintAnswers = this.format.class.cachedData.hintAnswers;
					}

					return await this.setGeneratedHint(hintKey, hintAnswers);
				}
			} else {
				if (!this.customGenerateHint) throw new Error("No customGenerateHint() method defined");
				await this.customGenerateHint();

				if (!this.hint && !this.ended) throw new Error("No hint set");
				return this.hint;
			}
		} catch (e) {
			console.log(e);
			Tools.logError(e as NodeJS.ErrnoException, this.format.name + " generateHint()");
			this.errorEnd();
			return "";
		}
	}

	getHintKeyGif(hintKey: string): string | undefined {
		if (this.pokemonGifHints) {
			const pokemon = Dex.getPokemon(hintKey);
			if (pokemon && Dex.hasModelData(pokemon)) return Dex.getPokemonModel(pokemon);
		}
	}

	async setGeneratedHint(hintKey: string, hintAnswers?: Dict<readonly string[]>): Promise<string> {
		if (hintAnswers) {
			this.answers = hintKey in hintAnswers ? hintAnswers[hintKey] : [];

			const hintPrefix = this.hintPrefix || this.currentCategory;
			const hintKeyGif = this.getHintKeyGif(hintKey);

			let hint = "";
			if (hintPrefix) {
				hint += "<b>" + hintPrefix + "</b>:";
				if (hintKeyGif) {
					hint += "<br />";
				} else {
					hint += " <i>";
				}
			}

			if (hintKeyGif) {
				hint += "<center>" + hintKeyGif + "</center>";
			} else {
				hint += hintKey;
				if (hintPrefix) hint += "</i>";
			}

			this.hint = hint;
		} else {
			if (!this.onSetGeneratedHint) throw new Error("No onSetGeneratedHint() method defined");
			this.answers = [hintKey];
		}

		if (this.onSetGeneratedHint) {
			await this.onSetGeneratedHint(hintKey, hintAnswers);
		} else {
			if (this.pokemonGifHints && !this.getHintKeyGif(hintKey)) {
				return await this.generateHint();
			}
		}

		if (!this.hint && !this.ended) throw new Error("No hint set");
		return this.hint;
	}

	async setNextAnswer(): Promise<void> {
		let hintKey = await this.generateHint();
		if (this.ended) return;

		while ((hintKey && Client.checkFilters(hintKey, !this.isPmActivity(this.room) ? this.room : undefined)) ||
			(this.minimumAnswersPerHint && this.answers.length < this.minimumAnswersPerHint) ||
			this.exceedsMessageSizeLimit(this.getAnswersHtml(this.answers), true, this.hintUhtmlName)) {
			hintKey = await this.generateHint();
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (this.ended) return;
		}

		let roundAnswersCount = this.answers.length;
		if (this.longestAnswersOnly && roundAnswersCount > 1) {
			let longestLength = 0;
			let longestAnswers: string[] = [];
			for (const answer of this.answers) {
				const answerLength = Tools.toId(answer).length;
				if (answerLength > longestLength) {
					longestLength = answerLength;
					longestAnswers = [answer];
				} else if (answerLength === longestLength) {
					longestAnswers.push(answer);
				}
			}

			if (longestAnswers.length === roundAnswersCount && roundAnswersCount >= 3) {
				await this.setNextAnswer();
				return;
			}

			this.answers = longestAnswers;
			roundAnswersCount = this.answers.length;
		} else if (this.shortestAnswersOnly && roundAnswersCount > 1) {
			let shortestLength = Tools.toId(this.answers[0]).length;
			let shortestAnswers: string[] = [this.answers[0]];
			for (let i = 1; i < this.answers.length; i++) {
				const answer = this.answers[i];
				const answerLength = Tools.toId(answer).length;
				if (answerLength < shortestLength) {
					shortestLength = answerLength;
					shortestAnswers = [answer];
				} else if (answerLength === shortestLength) {
					shortestAnswers.push(answer);
				}
			}

			if (shortestAnswers.length === roundAnswersCount && roundAnswersCount >= 3) {
				await this.setNextAnswer();
				return;
			}

			this.answers = shortestAnswers;
			roundAnswersCount = this.answers.length;
		}

		if (this.roundGuesses) this.roundGuesses.clear();
		this.guessedAnswers = [];
		this.correctPlayers = [];
		this.incorrectAnswers = 0;
		this.roundAnswersCount = roundAnswersCount;
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
				if (points >= this.options.points!) {
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

		let roundText: boolean | string | undefined;
		if (this.beforeNextRound) {
			roundText = this.beforeNextRound(newAnswer);
			if (roundText === false) return;
		}

		const sayHint = () => {
			const onHintHtml = (timestamp: number) => {
				if (this.ended) return;
				if (!this.canGuess) this.canGuess = true;
				if (newAnswer) {
					this.hintTimestamp = timestamp;
					const roundTime = this.getRoundTime();
					if (roundTime) {
						if (this.answerTimeout) clearTimeout(this.answerTimeout);
						this.answerTimeout = setTimeout(() => this.onAnswerTimeLimit(), roundTime);
					}
				}
				if (this.onHintHtml) this.onHintHtml();
				if (this.parentGame && this.parentGame.onChildHint) this.parentGame.onChildHint(this.hint, this.answers, newAnswer);
			};

			if (!newAnswer && this.previousHint && this.previousHint === this.hint) {
				onHintHtml(Date.now());
			} else {
				this.answerUhtmlName = this.uhtmlBaseName + '-answer-round' + this.questionAndAnswerRound;
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
				this.setTimeout(() => sayHint(), this.beforeNextRoundTime);
			});
			this.say(roundText);
		} else if (this.cooldownBetweenRounds) {
			this.setTimeout(() => sayHint(), this.cooldownBetweenRounds);
		} else {
			sayHint();
		}
	}

	increaseDifficulty(): void {
		if (!this.roundTime) throw new Error("increaseDifficulty() needs to be implemented in the child class");
		this.roundTime = Math.max(2000, this.roundTime - 1000);
	}

	canGuessAnswer(player: Player | undefined): boolean {
		if (!player || player.frozen || this.ended || !this.canGuess || !this.answers.length ||
			this.correctPlayers.includes(player)) return false;
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
			if (this.onIncorrectGuess) answer = this.onIncorrectGuess(player, guess);
			if (!answer) {
				if (this.oneGuessPerHint && this.roundGuesses && this.inheritedPlayers && this.roundGuesses.size === this.playerCount) {
					this.say("All players have used up their guess!");
					this.displayAnswers();
					this.answers = [];
					if (this.answerTimeout) clearTimeout(this.answerTimeout);
					this.setTimeout(() => this.nextRound(), 5000);
				}
				return false;
			}
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

	/** Return an empty array to not display answers */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	getAnswers(givenAnswer?: string, finalAnswer?: boolean): readonly string[] {
		return this.answers;
	}

	getAnswersHtml(answers: readonly string[]): string {
		return "<div class='infobox-limited' style='max-height: 60px'><b>Answer" +
			(answers.length > 1 ? "s" : "") + "</b>: <i>" + Tools.joinList(answers) + "</i></div>";
	}

	displayAnswers(givenAnswer?: string, finalAnswer?: boolean): void {
		const answers = this.getAnswers(givenAnswer, finalAnswer);
		if (answers.length) {
			this.sayUhtml(this.answerUhtmlName, this.getAnswersHtml(answers));
		}
	}

	getRandomAnswer(): IRandomGameAnswer {
		// formats with async generateHint should not have canGetRandomAnswer set to `true`
		void this.generateHint();
		if (this.updateHint) this.updateHint();
		return {answers: this.getAnswers(), hint: this.hint};
	}

	onForceEnd(): void {
		if (!this.canGuess) return;
		this.displayAnswers();
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

	botChallengeTurn(botPlayer: Player, newAnswer: boolean): void {
		if (!newAnswer) return;

		this.setBotTurnTimeout(() => {
			const command = this.answerCommands ? this.answerCommands[0] : "g";
			let answer = this.sampleOne(this.answers);
			let text = Config.commandCharacter + command + " " + answer.toLowerCase();
			this.on(text, () => {
				if (!this.canGuess || !this.answers.length) return;

				if (!this.answers.includes(answer)) {
					answer = this.sampleOne(this.answers);
					text = Config.commandCharacter + command + " " + answer.toLowerCase();
					this.on(text, () => {
						if (this.canGuess) botPlayer.useCommand(command, answer);
					});
					this.say(text);
				} else {
					botPlayer.useCommand(command, answer);
				}
			});
			this.say(text);
		}, this.sampleOne(this.botChallengeSpeeds!));
	}

	beforeNextRound?(newAnswer: boolean): boolean | string;
	filterGuess?(guess: string, player?: Player): boolean;
	customGenerateHint?(): Promise<void>;
	getPointsForAnswer?(answer: string, timestamp: number): number;
	onCorrectGuess?(player: Player, guess: string): void;
	onHintHtml?(): void;
	onIncorrectGuess?(player: Player, guess: string): string;
	onSetGeneratedHint?(hintKey: string, hintAnswers?: Dict<readonly string[]>): Promise<void>;
	updateHint?(): void;
}

const commands: GameCommandDefinitions<QuestionAndAnswer> = {
	guess: {
		command(target, room, user, cmd, timestamp): GameCommandReturnType {
			if (this.answerCommands && !this.answerCommands.includes(cmd)) return false;

			if (this.pmGuessing) {
				if (!this.isPm(room, user)) return false;
			} else {
				if (this.isPm(room, user) && !this.pm) return false;
			}

			const player = this.createPlayer(user) || this.players[user.id];
			if (!this.canGuessAnswer(player)) return false;

			const answer = this.guessAnswer(player, target);
			if (!answer || !this.canGuessAnswer(player)) return false;

			if (this.botTurnTimeout) clearTimeout(this.botTurnTimeout);
			if (this.timeout) clearTimeout(this.timeout);

			if (this.isMiniGame) {
				this.say((this.pm ? "You are" : "**" + user.name + "** is") + " correct!");
				this.displayAnswers(answer);
				this.addBits(user, Games.getMinigameBits());
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

			if (this.allAnswersAchievement) {
				if (this.firstAnswer === undefined) {
					this.firstAnswer = player;
				} else {
					if (this.firstAnswer && this.firstAnswer !== player) this.firstAnswer = false;
				}
			}

			const reachedMaxPoints = points >= this.options.points!;
			if (this.maxCorrectPlayersPerRound === 1 || (reachedMaxPoints && !this.checkScoreCapBeforeRound)) {
				this.say("**" + player.name + "** advances to **" + this.getPointsDisplay(points, reachedMaxPoints ? 0 : undefined) +
					"** point" + (points > 1 ? 's' : '') + "!");
				this.displayAnswers(answer);

				if (reachedMaxPoints) {
					if (this.allAnswersAchievement && this.firstAnswer === player && !this.parentGame) {
						this.unlockAchievement(player, this.allAnswersAchievement);
					}
					this.winners.set(player, points);
					this.end();
					return true;
				} else {
					this.answers = [];
					this.setTimeout(() => this.nextRound(), 5000);
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

				if (this.maxCorrectPlayersPerRound && this.correctPlayers.length === this.maxCorrectPlayersPerRound) {
					this.answers = [];
				} else {
					if (!this.allowRepeatCorrectAnswers) this.removeAnswer(answer);
				}

				if (!this.answers.length) this.setTimeout(() => this.nextRound(), 5000);
			}

			return true;
		},
		aliases: ['g'],
		pmGameCommand: true,
	},
};

const tests: GameFileTests<QuestionAndAnswer> = {
	'it should properly set answers and award points': {
		config: {
			async: true,
		},
		async test(game): Promise<void> {
			this.timeout(TEST_TIMEOUT);

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
    'it should properly set answers and be guessable after guessing with typo': {
		config: {
			async: true,
		},
		async test(game): Promise<void> {
            if (!game.allowMisType || !game.filterGuess) return;
			this.timeout(TEST_TIMEOUT);

			assert(!game.canGuess);
			const name = getBasePlayerName() + " 1";
			const id = Tools.toId(name);

			await game.onNextRound();
			assert(game.answers.length);
			assert(game.hint);
			const expectedPoints = game.getPointsForAnswer ? game.getPointsForAnswer(game.answers[0], Date.now()) : 1;
			game.canGuess = true;
            runCommand('guess', 'a', game.room, name);
            assert(game.canGuess);
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
		async test(game): Promise<void> {
			this.timeout(TEST_TIMEOUT);

			await game.onNextRound();
			const previousAnswers = game.answers;
			const previousHint = game.hint;
			game.canGuess = true;
			const name = getBasePlayerName() + " 1";
			runCommand('guess', 'a', game.room, name);

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
		async test(game): Promise<void> {
			this.timeout(TEST_TIMEOUT);

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
		async test(game): Promise<void> {
			this.timeout(TEST_TIMEOUT);

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
		async test(game): Promise<void> {
			this.timeout(TEST_TIMEOUT);

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
		async test(game): Promise<void> {
			if (game.usesWorkers) return;

			this.timeout(TEST_TIMEOUT);

			const name = getBasePlayerName() + " 1";
			const id = Tools.toId(name);
			game.options.points = 3;

			for (let i = 0; i < 3; i++) {
				if (game.timeout) clearTimeout(game.timeout);
				await game.onNextRound();
				assert(game.answers.length);
				let expectedPoints = game.getPointsForAnswer ? game.getPointsForAnswer(game.answers[0], Date.now()) : 1;
				const points = game.points.get(game.players[id]);
				if (points) expectedPoints += points;
				game.canGuess = true;
				runCommand('guess', game.answers[0], game.room, name);
				if (game.ended) break;
				assertStrictEqual(game.points.get(game.players[id]), expectedPoints);
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
			this.timeout(TEST_TIMEOUT);
			const room = game.room;
			game.deallocate(true);

			const minigame = Games.createGame(room, (format as unknown) as IGameFormat,
				{pmRoom: room as Room, minigame: true}) as QuestionAndAnswer;
			minigame.signups();
			if (minigame.timeout) clearTimeout(minigame.timeout);
			await minigame.onNextRound();
			assert(minigame.answers.length);
			minigame.canGuess = true;
			runCommand('guess', minigame.answers[0], minigame.room, getBasePlayerName());
			assert(minigame.ended);
		},
	},
	'it should not accept answers in PMs as a room minigame': {
		config: {
			async: true,
		},
		async test(game, format): Promise<void> {
			if (!format.minigameCommand) return;
			this.timeout(TEST_TIMEOUT);
			const room = game.room as Room;
			game.deallocate(true);

			const minigame = Games.createGame(room, (format as unknown) as IGameFormat,
				{pmRoom: room, minigame: true}) as QuestionAndAnswer;
			minigame.signups();
			if (minigame.timeout) clearTimeout(minigame.timeout);
			await minigame.onNextRound();
			assert(minigame.answers.length);
			minigame.canGuess = true;

			const name = getBasePlayerName();
			const user = Users.add(name, Tools.toId(name));
			room.onUserJoin(user, " ");
			runCommand('guess', minigame.answers[0], user, user);
			assert(!minigame.ended);
		},
	},
	'it should properly work in PMs as a minigame': {
		config: {
			async: true,
		},
		async test(game, format): Promise<void> {
			if (!format.minigameCommand) return;
			this.timeout(TEST_TIMEOUT);
			const room = game.room;
			game.deallocate(true);

			const name = getBasePlayerName() + " 1";
			const id = Tools.toId(name);
			const user = Users.add(name, id);
			const pmMinigame = Games.createGame(user, (format as unknown) as IGameFormat,
				{pmRoom: room as Room, minigame: true}) as QuestionAndAnswer;

			pmMinigame.signups();
			if (pmMinigame.timeout) clearTimeout(pmMinigame.timeout);
			await pmMinigame.onNextRound();
			assert(pmMinigame.answers.length);
			pmMinigame.canGuess = true;
			runCommand('guess', pmMinigame.answers[0], user, name);
			assert(pmMinigame.ended);

			Users.remove(user);
		},
	},
};

export const game: IGameTemplateFile<QuestionAndAnswer> = {
	challengeSettings: {
		botchallenge: {
			enabled: true,
			options: ['speed'],
		},
		onevsone: {
			enabled: true,
			options: ['speed'],
		},
	},
	canGetRandomAnswer: true,
	commandDescriptions: [Config.commandCharacter + 'g [answer]'],
	commands,
	tests,
};

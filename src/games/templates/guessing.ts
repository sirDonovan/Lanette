import { ICommandDefinition } from '../../command-parser';
import { Player } from '../../room-activity';
import { Game } from '../../room-game';

export class Guessing extends Game {
	answers: string[] = [];
	canGuess: boolean = false;
	hint: string = '';
	points: Map<Player, number> = new Map();

	roundCategory?: string;
	roundGuesses?: Map<Player, boolean>;

	checkAnswer(guess: string): string {
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

	getAnswers(finalAnswer?: boolean): string {
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
	getPointsPerAnswer?(answer: string): number;
	onGuess?(guess: string, player?: Player): void;
}

export abstract class GuessingAbstract {
	abstract setAnswers(): void;
}

export const commands: Dict<ICommandDefinition<Guessing>> = {
	guess: {
		command(target, room, user) {
			if (!this.started || !this.canGuess || (this.players[user.id] && this.players[user.id].eliminated) ||
				(this.parentGame && (!this.players[user.id] || this.players[user.id].eliminated))) return;
			const player = this.createPlayer(user) || this.players[user.id];
			if (!player.active) player.active = true;
			const guess = Tools.toId(target);
			if (!guess) return;
			if (this.filterGuess && this.filterGuess(guess)) return;
			if (this.roundGuesses) {
				if (this.roundGuesses.has(player)) return;
				this.roundGuesses.set(player, true);
			}
			const answer = this.checkAnswer(guess);
			if (!answer) {
				if (this.onGuess) this.onGuess(guess);
				return;
			}
			if (this.timeout) clearTimeout(this.timeout);
			const awardedPoints = this.getPointsPerAnswer ? this.getPointsPerAnswer(answer) : 1;
			let points = this.points.get(player) || 0;
			points += awardedPoints;
			this.points.set(player, points);
			if (this.isMiniGame) {
				this.say("**" + user.name + "** guessed " + (this.answers.length > 1 ? 'an' : 'the') + " answer __(" + this.answers.join(", ") + ")__!");
				this.end();
				return;
			} else {
				// this.markFirstAction(player);
				// if (this.id === 'zygardesorders' && this.revealedLetters === 1) Games.unlockAchievement(this.room, player, "Tall Order", this);
				if (points >= this.options.points) {
					let text = '**' + player.name + '** wins' + (this.parentGame ? '' : ' the game') + '! ' + this.getAnswers(true);
					if (text.length > 300) {
						text = '**' + player.name + '** wins' + (this.parentGame ? '' : ' the game') + '! A possible answer was __' + answer + '__.';
					}
					this.say(text);
					/*
					if (this.firstAnswer === player && !this.parentGame) {
						if (this.options.points >= 5) {
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
						if (this.options.points >= 3) {
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
					return;
				} else {
					let text = '**' + player.name + '** advances to **' + points + '** point' + (points > 1 ? 's' : '') + '! ' + this.getAnswers();
					if (text.length > 300) {
						text = '**' + player.name + '** advances to **' + points + '** point' + (points > 1 ? 's' : '') + '! A possible answer was __' + answer + '__.';
					}
					this.say(text);
				}
			}

			this.answers = [];
			this.timeout = setTimeout(() => this.nextRound(), 5000);
		},
		aliases: ['g'],
	},
};

export let commandDescriptions = [Config.commandCharacter + 'g [answer]'];
export let disabled = false;

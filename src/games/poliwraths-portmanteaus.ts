import { PRNG, PRNGSeed } from "../prng";
import { DefaultGameOption, IGameOptionValues } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import * as PortmanteausWorker from './../workers/portmanteaus';
import { commandDescriptions, commands as templateCommands, Guessing } from './templates/guessing';

const name = "Poliwrath's Portmanteaus";
let loadedData = false;

export class PoliwrathsPortmanteaus extends Guessing {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		PortmanteausWorker.init();

		loadedData = true;
	}

	answerParts: Dict<string[]> = {};
	baseNumberOfPorts: number = 2;
	customizableOptions: Dict<IGameOptionValues> = {
		ports: {min: 2, base: 2, max: 4},
	};
	customPortCategories: string[] | null = null;
	customPortDetails: string[] | null = null;
	customPortTypes: PortmanteausWorker.PoolType[] | null = null;
	defaultOptions: DefaultGameOption[] = ['points'];
	minLetters: number = 2;
	maxLetters: number = 4;
	ports: string[] = [];
	roundTime: number = 5 * 60 * 1000;

	async setAnswers() {
		const numberOfPorts = this.customPortTypes ? this.customPortTypes.length : this.inputOptions.ports ? this.options.ports : this.baseNumberOfPorts + this.random(3);
		const result = await PortmanteausWorker.search({
			customPortCategories: this.customPortCategories,
			customPortDetails: this.customPortDetails,
			customPortTypes: this.customPortTypes,
			numberOfPorts,
			minLetters: this.minLetters,
			maxLetters: this.maxLetters,
			prngSeed: this.prng.seed.slice() as PRNGSeed,
		});

		if (this.ended) return;

		if (!result.answers.length) {
			this.say("Invalid ports specified.");
			this.deallocate(true);
		} else {
			this.answers = result.answers;
			this.answerParts = result.answerParts;
			this.ports = result.ports;
			this.hint = "**" + result.ports.join(" ") + "**";
			this.prng = new PRNG(result.prngSeed);
		}
	}

	async onNextRound() {
		this.canGuess = false;
		await this.setAnswers();
		if (this.ended) return;

		this.on(this.hint, () => {
			this.canGuess = true;
			this.timeout = setTimeout(() => {
				if (this.answers.length) {
					this.say("Time's up! " + this.getAnswers(''));
					this.answers = [];
					if (this.isMiniGame) {
						this.end();
						return;
					}
				}
				this.nextRound();
			}, this.roundTime);
		});
		this.say(this.hint);
	}

	getAnswers(givenAnswer: string, finalAnswer?: boolean): string {
		if (!givenAnswer) givenAnswer = this.answers[0];
		return "A possible portmanteau was __" + givenAnswer.charAt(0).toUpperCase() + givenAnswer.substr(1) + "__ (" + this.answerParts[givenAnswer].join(" + ") + ").";
	}

	async checkAnswer(guess: string): Promise<string> {
		let sanitizedGuess;
		let guessParts;
		if (guess.includes(',')) {
			guessParts = guess.split(',');
		} else if (guess.includes('+')) {
			guessParts = guess.split('+');
		}
		if (guessParts) {
			if (guessParts.length === this.ports.length) {
				let base = Tools.toId(guessParts[0]);
				guessParts.shift();
				for (let i = 0; i < guessParts.length; i++) {
					const current = Tools.toId(guessParts[i]);
					for (let l = this.maxLetters; l >= this.minLetters; l--) {
						if (l > base.length || l > current.length) continue;
						if (base.substr(-l) === current.substr(0, l)) {
							base += current.substr(l);
							break;
						}
					}
				}
				sanitizedGuess = base;
			}
		}
		if (!sanitizedGuess) sanitizedGuess = Tools.toId(guess);
		let match = '';
		for (let i = 0; i < this.answers.length; i++) {
			if (sanitizedGuess === this.answers[i]) {
				match = this.answers[i];
				break;
			}
		}
		return Promise.resolve(match);
	}
}

export const game: IGameFile<PoliwrathsPortmanteaus> = {
	aliases: ['poliwraths', 'ports'],
	class: PoliwrathsPortmanteaus,
	commandDescriptions,
	commands: Object.assign({}, templateCommands),
	description: "Players think of portmanteaus that share 2-4 letters and fit the given parameters!",
	formerNames: ["Portmanteaus"],
	freejoin: true,
	name,
	mascot: "Poliwrath",
	minigameCommand: 'portmanteau',
	minigameCommandAliases: ['port'],
	minigameDescription: "Use ``" + Config.commandCharacter + "g`` to guess a portmanteau (sharing 2-4 letters) that fits the given parameters!",
	workers: [PortmanteausWorker],
};

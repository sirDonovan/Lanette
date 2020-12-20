import type { IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

const data: {'Pokemon': string[]; 'Pokemon Abilities': string[]; 'Pokemon Items': string[]; 'Pokemon Moves': string[]} = {
	"Pokemon": [],
	"Pokemon Abilities": [],
	"Pokemon Items": [],
	"Pokemon Moves": [],
};
type DataKey = keyof typeof data;
const categories = Object.keys(data) as DataKey[];

const LETTERS_TO_REVEAL = 4;

class MareaniesMarquee extends QuestionAndAnswer {
	currentCategory: string = '';
	currentIndex: number = -1;
	hintUpdates: number = 0;
	hintUpdateLimit: number = 0;
	hintUpdateLimitMultiplier: number = 2;
	lastAnswer: string = '';
	letters: string[] = [];
	multiRoundHints = true;
	roundTime = 0;
	updateHintTime = 1500;

	static loadData(): void {
		data["Pokemon"] = Games.getPokemonList().map(x => x.name).filter(x => x.length > LETTERS_TO_REVEAL);
		data["Pokemon Abilities"] = Games.getAbilitiesList().map(x => x.name).filter(x => x.length > LETTERS_TO_REVEAL);
		data["Pokemon Items"] = Games.getItemsList().map(x => x.name).filter(x => x.length > LETTERS_TO_REVEAL);
		data["Pokemon Moves"] = Games.getMovesList().map(x => x.name).filter(x => x.length > LETTERS_TO_REVEAL);
	}

	generateAnswer(): void {
		const category = (this.roundCategory || this.sampleOne(categories)) as DataKey;
		this.currentCategory = category;
		let answer = '';
		let letters: string[] = [];
		let willBeFiltered = false;
		while (!answer || answer === this.lastAnswer || willBeFiltered) {
			answer = this.sampleOne(data[category]);
			letters = answer.replace(" ", "").split("");
			willBeFiltered = false;

			for (let i = 0; i < letters.length; i++) {
				let part = letters.slice(i, i + LETTERS_TO_REVEAL);
				if (part.length < LETTERS_TO_REVEAL) part = part.concat(letters.slice(0, LETTERS_TO_REVEAL - part.length));
				if (Client.checkFilters(part.join(''), !this.isPm(this.room) ? this.room : undefined)) {
					willBeFiltered = true;
					break;
				}
			}
		}
		this.answers = [answer];
		this.letters = letters;
		this.currentIndex = -1;
		this.hintUpdates = 0;
		this.hintUpdateLimit = letters.length * this.hintUpdateLimitMultiplier;
		this.updateHint();
	}

	updateHint(): void {
		this.hintUpdates++;

		if (this.currentIndex === -1) {
			let index = this.random(this.letters.length);
			while (index === 0) {
				index = this.random(this.letters.length);
			}
			this.currentIndex = index;
		}

		let index = this.currentIndex;
		let hint = '';
		const lastIndex = this.letters.length - 1;
		for (let i = 0; i < LETTERS_TO_REVEAL; i++) {
			hint += this.letters[index];
			index++;
			if (index > lastIndex) index = 0;
		}
		this.currentIndex++;
		if (this.currentIndex > lastIndex) this.currentIndex = 0;

		this.hint = "<center><b>" + this.currentCategory + "</b><br /><br />" + hint + "</center>";
	}

	onHintHtml(): void {
		if (this.timeout) clearTimeout(this.timeout);

		if (this.hintUpdates >= this.hintUpdateLimit) {
			this.say("Time is up! " + this.getAnswers(''));
			this.answers = [];
			if (this.isMiniGame) {
				this.end();
				return;
			}
			this.nextRound();
			return;
		}

		this.timeout = setTimeout(() => this.nextRound(), this.updateHintTime);
	}

	increaseDifficulty(): void {
		this.updateHintTime = Math.max(400, this.updateHintTime - 100);
	}
}

export const game: IGameFile<MareaniesMarquee> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['mareanies', 'marquees'],
	category: 'identification',
	class: MareaniesMarquee,
	defaultOptions: ['points'],
	description: "Players guess the answers as letters are cycled through 1 at a time!",
	freejoin: true,
	name: "Mareanie's Marquees",
	mascot: "Mareanie",
	minigameCommand: 'mmarquee',
	minigameDescription: 'Use <code>' + Config.commandCharacter + 'g</code> to guess the answer as letters are cycled through 1 at a time!',
	modes: ['survival', 'group'],
	modeProperties: {
		'survival': {
			hintUpdateLimitMultiplier: 1,
			updateHintTime: 1000,
		},
	},
	variants: [
		{
			name: "Mareanie's Ability Marquees",
			roundCategory: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities', 'pokemon abilities'],
		},
		{
			name: "Mareanie's Item Marquees",
			roundCategory: "Pokemon Items",
			variantAliases: ['item', 'items', 'pokemon items'],
		},
		{
			name: "Mareanie's Move Marquees",
			roundCategory: "Pokemon Moves",
			variantAliases: ['move', 'moves', 'pokemon moves'],
		},
		{
			name: "Mareanie's Pokemon Marquees",
			roundCategory: "Pokemon",
			variantAliases: ['pokemon'],
		},
	],
});

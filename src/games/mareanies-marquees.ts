import type { IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

const LETTERS_TO_REVEAL = 4;

class MareaniesMarquees extends QuestionAndAnswer {
	static cachedData: IGameCachedData = {};

	currentCategory: string = '';
	currentIndex: number = -1;
	hintUpdates: number = 0;
	hintUpdateLimit: number = 0;
	hintUpdateLimitMultiplier: number = 2;
	letters: string[] = [];
	marqueesRound: number = 0;
	multiRoundHints = true;
	roundTime = 0;
	updateHintTime = 1500;

	static loadData(): void {
		this.cachedData.categories = ["Pokemon", "Pokemon Abilities", "Pokemon Items", "Pokemon Moves"];
		this.cachedData.categoryHintKeys = {
			"Pokemon": Games.getPokemonList().map(x => x.name).filter(x => x.length > LETTERS_TO_REVEAL),
			"Pokemon Abilities": Games.getAbilitiesList().map(x => x.name).filter(x => x.length > LETTERS_TO_REVEAL),
			"Pokemon Items": Games.getItemsList().map(x => x.name).filter(x => x.length > LETTERS_TO_REVEAL),
			"Pokemon Moves": Games.getMovesList().map(x => x.name).filter(x => x.length > LETTERS_TO_REVEAL),
		};
	}

	async onSetGeneratedHint(hintKey: string): Promise<void> {
		const letters = hintKey.replace(" ", "").split("");
		for (let i = 0; i < letters.length; i++) {
			let part = letters.slice(i, i + LETTERS_TO_REVEAL);
			if (part.length < LETTERS_TO_REVEAL) part = part.concat(letters.slice(0, LETTERS_TO_REVEAL - part.length));
			if (Client.checkFilters(part.join(''), !this.isPmActivity(this.room) ? this.room : undefined)) {
				await this.generateHint();
				return;
			}
		}

		this.letters = letters;
		this.currentIndex = -1;
		this.hintUpdates = 0;
		this.hintUpdateLimit = letters.length * this.hintUpdateLimitMultiplier;
		this.updateHint();
	}

	updateHint(): void {
		this.hintUpdates++;
		if (this.hintUpdates === 1) {
			this.marqueesRound++;
		}

		if (this.currentIndex === -1) {
			let index = this.random(this.letters.length);
			// this.letters.length is always > 1 due to LETTERS_TO_REVEAL
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
			this.say("Time is up!");
			this.displayAnswers();
			this.answers = [];
			if (this.isMiniGame) {
				this.end();
				return;
			}
			this.nextRound();
			return;
		}

		this.setTimeout(() => this.nextRound(), this.updateHintTime);
	}

	increaseDifficulty(): void {
		this.updateHintTime = Math.max(400, this.updateHintTime - 100);
	}

	getDisplayedRoundNumber(): number {
		return this.marqueesRound;
	}
}

export const game: IGameFile<MareaniesMarquees> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['mareanies', 'marquees'],
	challengeSettings: Object.assign({}, questionAndAnswerGame.challengeSettings, {
		botchallenge: {
			enabled: false,
		},
		onevsone: {
			enabled: true,
		},
	}),
	category: 'identification-2',
	class: MareaniesMarquees,
	defaultOptions: ['points'],
	description: "Players guess the answers as letters are cycled through 1 at a time!",
	freejoin: true,
	name: "Mareanie's Marquees",
	mascot: "Mareanie",
	minigameCommand: 'mmarquee',
	minigameDescription: 'Use <code>' + Config.commandCharacter + 'g</code> to guess the answer as letters are cycled through 1 at a time!',
	modes: ['collectiveteam', 'survival'],
	modeProperties: {
		'survival': {
			hintUpdateLimitMultiplier: 1,
			updateHintTime: 1000,
		},
	},
	scriptedOnly: true,
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

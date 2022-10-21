import type { Player } from "../room-activity";
import type { IGameCachedData, IGameFile } from "../types/games";
import type { IHexCodeData } from "../types/tools";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

const BANNED_CHARACTERS: string[] = ['.', '-', '(', ')'];
const LETTERS_TO_REVEAL = 3;
const MINIMUM_LENGTH = LETTERS_TO_REVEAL * 2;

class LanturnsIlluminatedLetters extends QuestionAndAnswer {
	static cachedData: IGameCachedData = {};

	currentCategory: string = '';
	currentIndicies: number[] = [];
	hiddenColor: IHexCodeData = Tools.getNamedHexCode("Black");
	hintUpdates: number = 0;
	hintUpdateLimit: number = 0;
	hintUpdateLimitMultiplier: number = 2;
	lastIlluminatedletters: string = '';
	letters: string[] = [];
	lettersRound: number = 0;
	multiRoundHints = true;
	oneGuessPerHint = true;
	revealedColor: IHexCodeData = Tools.getNamedHexCode("White");
	readonly roundGuesses = new Map<Player, boolean>();
	roundTime = 0;
	updateHintTime = 3000;

	static loadData(): void {
		this.cachedData.categories = ["Pokemon", "Pokemon Abilities", "Pokemon Items", "Pokemon Moves"];

		const categoryHintKeys: Dict<string[]> = {};
		categoryHintKeys["Pokemon"] = Games.getPokemonList().map(x => x.name).filter(x => {
			if (x.length < MINIMUM_LENGTH) return false;
			for (const character of BANNED_CHARACTERS) {
				if (x.includes(character)) return false;
			}

			return true;
		});

		categoryHintKeys["Pokemon Abilities"] = Games.getAbilitiesList().map(x => x.name).filter(x => {
			if (x.length < MINIMUM_LENGTH) return false;
			for (const character of BANNED_CHARACTERS) {
				if (x.includes(character)) return false;
			}

			return true;
		});

		categoryHintKeys["Pokemon Items"] = Games.getItemsList().map(x => x.name).filter(x => {
			if (x.length < MINIMUM_LENGTH) return false;
			for (const character of BANNED_CHARACTERS) {
				if (x.includes(character)) return false;
			}

			return true;
		});

		categoryHintKeys["Pokemon Moves"] = Games.getMovesList().map(x => x.name).filter(x => {
			if (x.length < MINIMUM_LENGTH) return false;
			for (const character of BANNED_CHARACTERS) {
				if (x.includes(character)) return false;
			}

			return true;
		});

		this.cachedData.categoryHintKeys = categoryHintKeys;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async onSetGeneratedHint(hintKey: string): Promise<void> {
		this.letters = hintKey.split("");

		const indices: number[] = [];
		for (let i = 0; i < hintKey.length; i++) {
			indices.push(i);
		}

		this.currentIndicies = indices;
		this.hintUpdates = 0;
		this.lastIlluminatedletters = '';
		this.hintUpdateLimit = hintKey.length * this.hintUpdateLimitMultiplier;
		this.updateHint();
	}

	updateHint(): void {
		this.hintUpdates++;
		if (this.hintUpdates === 1) {
			this.lettersRound++;
		}

		let illuminatedLetters = '';
		let hint: string[] = [];
		let attempts = 0;
		while ((!hint.length || illuminatedLetters === this.lastIlluminatedletters ||
			Client.checkFilters(illuminatedLetters, !this.isPmActivity(this.room) ? this.room : undefined)) && attempts < 50) {
			attempts++;
			illuminatedLetters = '';
			hint = [];

			const chosenIndices = this.sampleMany(this.currentIndicies, LETTERS_TO_REVEAL);
			for (let i = 0; i < this.letters.length; i++) {
				let cell = "<td style='background: ";
				if (chosenIndices.includes(i)) {
					illuminatedLetters += this.letters[i];
					cell += this.revealedColor.gradient + (this.revealedColor.textColor ? ";color: " + this.revealedColor.textColor : "") +
					"'>" + this.letters[i];
				} else {
					cell += this.hiddenColor.gradient + "'>&nbsp;";
				}
				cell += "</td>";
				hint.push(cell);
			}
		}

		this.lastIlluminatedletters = illuminatedLetters;

		this.hint = "<center><b>" + this.currentCategory + "</b><br /><br />" +
			"<table border='1' style='font-weight: bold;text-align: center;table-layout: fixed;width: " +
			this.letters.length * 20 + "px'><tr>" + hint.join("") + "</tr></table></center>";
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

	getDisplayedRoundNumber(): number {
		return this.lettersRound;
	}
}

export const game: IGameFile<LanturnsIlluminatedLetters> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['lanturns', 'illuminatedletters', 'iletters', 'lil'],
	challengeSettings: Object.assign({}, questionAndAnswerGame.challengeSettings, {
		botchallenge: {
			enabled: false,
		},
		onevsone: {
			enabled: true,
		},
	}),
	category: 'identification-2',
	class: LanturnsIlluminatedLetters,
	defaultOptions: ['points'],
	description: "Players guess the answers as letters are revealed and hidden!",
	freejoin: true,
	name: "Lanturn's Illuminated Letters",
	mascot: "Lanturn",
	minigameCommand: 'iletter',
	minigameDescription: 'Use <code>' + Config.commandCharacter + 'g</code> to guess the answer as letters are revealed and hidden!',
	modes: ['collectiveteam'],
	scriptedOnly: true,
	variants: [
		{
			name: "Lanturn's Ability Illuminated Letters",
			roundCategory: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities', 'pokemon abilities'],
		},
		{
			name: "Lanturn's Item Illuminated Letters",
			roundCategory: "Pokemon Items",
			variantAliases: ['item', 'items', 'pokemon items'],
		},
		{
			name: "Lanturn's Move Illuminated Letters",
			roundCategory: "Pokemon Moves",
			variantAliases: ['move', 'moves', 'pokemon moves'],
		},
		{
			name: "Lanturn's Pokemon Illuminated Letters",
			roundCategory: "Pokemon",
			variantAliases: ['pokemon'],
		},
	],
});

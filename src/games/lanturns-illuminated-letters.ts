import type { Player } from "../room-activity";
import type { IGameFile } from "../types/games";
import type { IHexCodeData } from "../types/tools";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

const data: {'Pokemon': string[]; 'Pokemon Abilities': string[]; 'Pokemon Items': string[]; 'Pokemon Moves': string[]} = {
	"Pokemon": [],
	"Pokemon Abilities": [],
	"Pokemon Items": [],
	"Pokemon Moves": [],
};
type DataKey = keyof typeof data;
const categories = Object.keys(data) as DataKey[];

const BANNED_CHARACTERS: string[] = ['.', '-', '(', ')'];
const LETTERS_TO_REVEAL = 3;
const MINIMUM_LENGTH = LETTERS_TO_REVEAL * 2;

class LanturnsIlluminatedLetters extends QuestionAndAnswer {
	currentCategory: string = '';
	currentIndicies: number[] = [];
	hiddenColor: IHexCodeData = Tools.getNamedHexCode("Black");
	hintUpdates: number = 0;
	hintUpdateLimit: number = 0;
	hintUpdateLimitMultiplier: number = 2;
	lastAnswer: string = '';
	lastIlluminatedletters: string = '';
	letters: string[] = [];
	multiRoundHints = true;
	oneGuessPerHint = true;
	revealedColor: IHexCodeData = Tools.getNamedHexCode("White");
	readonly roundGuesses = new Map<Player, boolean>();
	roundTime = 0;
	updateHintTime = 3000;

	static loadData(): void {
		data["Pokemon"] = Games.getPokemonList().map(x => x.name).filter(x => {
			if (x.length < MINIMUM_LENGTH) return false;
			for (const character of BANNED_CHARACTERS) {
				if (x.includes(character)) return false;
			}

			return true;
		});

		data["Pokemon Abilities"] = Games.getAbilitiesList().map(x => x.name).filter(x => {
			if (x.length < MINIMUM_LENGTH) return false;
			for (const character of BANNED_CHARACTERS) {
				if (x.includes(character)) return false;
			}

			return true;
		});

		data["Pokemon Items"] = Games.getItemsList().map(x => x.name).filter(x => {
			if (x.length < MINIMUM_LENGTH) return false;
			for (const character of BANNED_CHARACTERS) {
				if (x.includes(character)) return false;
			}

			return true;
		});

		data["Pokemon Moves"] = Games.getMovesList().map(x => x.name).filter(x => {
			if (x.length < MINIMUM_LENGTH) return false;
			for (const character of BANNED_CHARACTERS) {
				if (x.includes(character)) return false;
			}

			return true;
		});
	}

	generateAnswer(): void {
		const category = (this.roundCategory || this.sampleOne(categories)) as DataKey;
		this.currentCategory = category;

		let answer = this.sampleOne(data[category]);
		while (answer === this.lastAnswer) {
			answer = this.sampleOne(data[category]);
		}
		this.lastAnswer = answer;
		this.answers = [answer];
		this.letters = answer.split("");

		const indices: number[] = [];
		for (let i = 0; i < answer.length; i++) {
			indices.push(i);
		}

		this.currentIndicies = indices;
		this.hintUpdates = 0;
		this.lastIlluminatedletters = '';
		this.hintUpdateLimit = answer.length * this.hintUpdateLimitMultiplier;
		this.updateHint();
	}

	updateHint(): void {
		this.hintUpdates++;

		let illuminatedLetters = '';
		let hint: string[] = [];
		while (!hint.length || illuminatedLetters === this.lastIlluminatedletters ||
			Client.checkFilters(illuminatedLetters, !this.isPmActivity(this.room) ? this.room : undefined)) {
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

		this.timeout = setTimeout(() => this.nextRound(), this.updateHintTime);
	}
}

export const game: IGameFile<LanturnsIlluminatedLetters> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['lanturns', 'illuminatedletters', 'iletters', 'lil'],
	botChallenge: {
		enabled: false,
	},
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

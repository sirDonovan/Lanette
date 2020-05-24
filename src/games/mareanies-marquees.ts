import type { Room } from "../rooms";
import type { IGameFile } from "../types/games";
import type { User } from "../users";
import { game as guessingGame, Guessing } from './templates/guessing';

const data: {'Pokemon': string[]; 'Pokemon Abilities': string[]; 'Pokemon Items': string[]; 'Pokemon Moves': string[]} = {
	"Pokemon": [],
	"Pokemon Abilities": [],
	"Pokemon Items": [],
	"Pokemon Moves": [],
};
type DataKey = keyof typeof data;
const categories = Object.keys(data) as DataKey[];

class MareaniesMarquee extends Guessing {
	lastAnswer: string = '';
	letters: string[] = [];
	currentIndex: number = -1;
	hintUpdates: number = 0;
	hintLimit: number = 0;
	lettersToReveal: number = 4;
	currentCategory: string = '';

	static loadData(room: Room | User): void {
		data["Pokemon"] = Games.getPokemonList().map(x => x.name);
		data["Pokemon Abilities"] = Games.getAbilitiesList().map(x => x.name);
		data["Pokemon Items"] = Games.getItemsList().map(x => x.name);
		data["Pokemon Moves"] = Games.getMovesList().map(x => x.name);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async setAnswers(): Promise<void> {
		const category = (this.roundCategory || this.variant || this.sampleOne(categories)) as DataKey;
		this.currentCategory = category;
		let answer = '';
		let letters: string[] = [];
		let willBeFiltered = false;
		while (!answer || answer === this.lastAnswer || willBeFiltered) {
			answer = this.sampleOne(data[category]);
			letters = answer.replace(" ", "").split("");
			for (let i = 0; i < letters.length; i++) {
				let part = letters.slice(i, i + this.lettersToReveal);
				if (part.length < this.lettersToReveal) part = part.concat(letters.slice(0, this.lettersToReveal - part.length));
				if (Client.willBeFiltered(part.join(''), !this.isPm(this.room) ? this.room : undefined)) {
					willBeFiltered = true;
					break;
				}
			}
		}
		this.answers = [answer];
		this.letters = letters;
		this.currentIndex = -1;
		this.hintUpdates = 0;
		this.hintLimit = letters.length * 2;
		this.updateHint();
	}

	updateHint(): void {
		this.hintUpdates++;
		if (this.hintUpdates >= this.hintLimit) {
			this.say("Time is up! " + this.getAnswers(''));
			this.answers = [];
			if (this.isMiniGame) {
				this.end();
				return;
			}
			this.nextRound();
			return;
		}

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
		for (let i = 0; i < this.lettersToReveal; i++) {
			hint += this.letters[index];
			index++;
			if (index > lastIndex) index = 0;
		}
		this.currentIndex++;
		if (this.currentIndex > lastIndex) this.currentIndex = 0;

		this.hint = "<center><b>" + this.currentCategory + "</b><br /><br />" + hint + "</center>";
	}

	onHintHtml(): void {
		if (!this.canGuess) this.canGuess = true;
		this.timeout = setTimeout(() => this.nextRound(), 1500);
	}
}

export const game: IGameFile<MareaniesMarquee> = Games.copyTemplateProperties(guessingGame, {
	aliases: ['mareanies', 'marquees'],
	category: 'identification',
	class: MareaniesMarquee,
	defaultOptions: ['points'],
	description: "Players guess the answers as letters are cycled through 1 at a time!",
	freejoin: true,
	name: "Mareanie's Marquees",
	mascot: "Mareanie",
	minigameCommand: 'mmarquee',
	minigameDescription: 'Use ``' + Config.commandCharacter + 'g`` to guess the answer as letters are cycled through 1 at a time!',
	variants: [
		{
			name: "Mareanie's Pokemon Marquees",
			variant: "Pokemon",
		},
		{
			name: "Mareanie's Ability Marquees",
			variant: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities'],
		},
		{
			name: "Mareanie's Item Marquees",
			variant: "Pokemon Items",
			variantAliases: ['item', 'items'],
		},
		{
			name: "Mareanie's Move Marquees",
			variant: "Pokemon Moves",
			variantAliases: ['move', 'moves'],
		},
	],
});

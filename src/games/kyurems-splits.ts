import type { Room } from "../rooms";
import type { AchievementsDict, IGameFile } from "../types/games";
import type { User } from "../users";
import { game as guessingGame, Guessing } from './templates/guessing';

const achievements: AchievementsDict = {
	'splittersplatter': {name: "Splitter Splatter", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
};

const data: {'Characters': string[]; 'Locations': string[]; 'Pokemon': string[]; 'Pokemon Abilities': string[];
	'Pokemon Items': string[]; 'Pokemon Moves': string[];} = {
	"Characters": [],
	"Locations": [],
	"Pokemon": [],
	"Pokemon Abilities": [],
	"Pokemon Items": [],
	"Pokemon Moves": [],
};
type DataKey = keyof typeof data;
const categories = Object.keys(data) as DataKey[];

class KyuremsSplits extends Guessing {
	allAnswersAchievement = achievements.splittersplatter;

	static loadData(room: Room | User): void {
		data["Characters"] = Dex.data.characters.slice();
		data["Locations"] = Dex.data.locations.slice();

		data["Pokemon"] = Games.getPokemonList().map(x => x.name);
		data["Pokemon Abilities"] = Games.getAbilitiesList().map(x => x.name);
		data["Pokemon Items"] = Games.getItemsList().map(x => x.name);
		data["Pokemon Moves"] = Games.getMovesList().map(x => x.name);
	}

	isValid(answer: string, hint: string): boolean {
		while (hint.length > 0) {
			const index = answer.indexOf(hint[0]);
			if (index === -1) return false;
			answer = answer.substr(index + 1);
			hint = hint.substr(1);
		}
		return true;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async setAnswers(): Promise<void> {
		const category = (this.roundCategory || this.variant || this.sampleOne(categories)) as DataKey;
		let hint = '';
		while (!this.answers.length || this.answers.length > 15 || Client.willBeFiltered(hint)) {
			const answer = Tools.toId(this.sampleOne(data[category]));
			const validIndices: number[] = [];
			for (let i = 1; i < answer.length; i++) {
				validIndices.push(i);
			}
			const numberOfLetters = Math.min(5, Math.max(2, Math.floor(validIndices.length * (Math.random() * 0.4 + 0.3))));
			const chosenIndices = this.sampleMany(validIndices, numberOfLetters);
			hint = '';
			for (const index of chosenIndices) {
				hint += answer[index];
			}
			this.answers = [];
			for (const answer of data[category]) {
				if (this.isValid(Tools.toId(answer), hint)) {
					this.answers.push(answer);
				}
			}
		}
		this.hint = "<b>" + category + "</b>: <i>" + hint.toUpperCase() + "</i>";
	}
}

export const game: IGameFile<KyuremsSplits> = Games.copyTemplateProperties(guessingGame, {
	aliases: ['kyurems'],
	category: 'identification',
	class: KyuremsSplits,
	defaultOptions: ['points'],
	description: "Players guess answers that have all of the given letters in order!",
	formerNames: ["Splits"],
	freejoin: true,
	name: "Kyurem's Splits",
	mascot: "Kyurem",
	minigameCommand: 'split',
	minigameDescription: "Use ``" + Config.commandCharacter + "g`` to guess an answer with all of the given letters in that order!",
	modes: ["survival", "team"],
	variants: [
		{
			name: "Kyurem's Ability Splits",
			variant: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities'],
		},
		{
			name: "Kyurem's Character Splits",
			variant: "Characters",
			variantAliases: ['character'],
		},
		{
			name: "Kyurem's Item Splits",
			variant: "Pokemon Items",
			variantAliases: ['item', 'items'],
		},
		{
			name: "Kyurem's Location Splits",
			variant: "Locations",
			variantAliases: ['location'],
		},
		{
			name: "Kyurem's Move Splits",
			variant: "Pokemon Moves",
			variantAliases: ['move', 'moves'],
		},
		{
			name: "Kyurem's Pokemon Splits",
			variant: "Pokemon",
		},
	],
});

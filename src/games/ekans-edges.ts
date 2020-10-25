import type { Room } from "../rooms";
import type { IGameAchievement, IGameFile } from "../types/games";
import type { User } from "../users";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

type AchievementNames = "livingontheedge";

interface IEkansEdgesData {
	'Characters': Dict<string[]>;
	'Locations': Dict<string[]>;
	'Pokemon': Dict<string[]>;
	'Pokemon Abilities': Dict<string[]>;
	'Pokemon Items': Dict<string[]>;
	'Pokemon Moves': Dict<string[]>;
}

const data: IEkansEdgesData = {
	"Characters": {},
	"Locations": {},
	"Pokemon": {},
	"Pokemon Abilities": {},
	"Pokemon Items": {},
	"Pokemon Moves": {},
};
type DataKey = keyof IEkansEdgesData;
const categories = Object.keys(data) as DataKey[];
const dataKeys: KeyedDict<DataKey, string[]> = {
	"Characters": [],
	"Locations": [],
	"Pokemon": [],
	"Pokemon Abilities": [],
	"Pokemon Items": [],
	"Pokemon Moves": [],
};

class EkansEdges extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		'livingontheedge': {name: "Living on the Edge", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
	};

	allAnswersAchievement = EkansEdges.achievements.livingontheedge;
	lastEdge: string = '';

	static loadData(room: Room | User): void {
		for (const i in Dex.data.characters) {
			for (const character of Dex.data.characters[i]) {
				const edge = character.charAt(0) + " - " + character.substr(-1);
				if (!data["Characters"][edge]) data["Characters"][edge] = [];
				data["Characters"][edge].push(character);
			}
		}

		for (const i in Dex.data.locations) {
			for (const location of Dex.data.locations[i]) {
				const edge = location.charAt(0) + " - " + location.substr(-1);
				if (!data["Locations"][edge]) data["Locations"][edge] = [];
				data["Locations"][edge].push(location);
			}
		}

		for (const pokemon of Games.getPokemonList()) {
			const edge = pokemon.name.charAt(0) + " - " + pokemon.name.substr(-1);
			if (!data["Pokemon"][edge]) data["Pokemon"][edge] = [];
			data["Pokemon"][edge].push(pokemon.name);
		}

		for (const ability of Games.getAbilitiesList()) {
			const edge = ability.name.charAt(0) + " - " + ability.name.substr(-1);
			if (!data["Pokemon Abilities"][edge]) data["Pokemon Abilities"][edge] = [];
			data["Pokemon Abilities"][edge].push(ability.name);
		}

		for (const item of Games.getItemsList()) {
			const edge = item.name.charAt(0) + " - " + item.name.substr(-1);
			if (!data["Pokemon Items"][edge]) data["Pokemon Items"][edge] = [];
			data["Pokemon Items"][edge].push(item.name);
		}

		for (const move of Games.getMovesList()) {
			const edge = move.name.charAt(0) + " - " + move.name.substr(-1);
			if (!data["Pokemon Moves"][edge]) data["Pokemon Moves"][edge] = [];
			data["Pokemon Moves"][edge].push(move.name);
		}

		const keys = Object.keys(data) as DataKey[];
		for (const key of keys) {
			dataKeys[key] = Object.keys(data[key]);
		}
	}

	onSignups(): void {
		if (!this.isMiniGame) {
			if (this.format.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5000);
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async setAnswers(): Promise<void> {
		const category = (this.roundCategory || this.variant || this.sampleOne(categories)) as DataKey;
		let edge = this.sampleOne(dataKeys[category]);
		while (edge === this.lastEdge) {
			edge = this.sampleOne(dataKeys[category]);
		}
		this.answers = data[category][edge];
		this.hint = "<b>" + category + "</b>: <i>" + edge + "</i>";
	}
}

export const game: IGameFile<EkansEdges> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['ekans', 'ee'],
	category: 'identification',
	class: EkansEdges,
	defaultOptions: ['points'],
	description: "Players guess answers that have the given starting and ending letters!",
	formerNames: ["Edges"],
	freejoin: true,
	name: "Ekans' Edges",
	mascot: "Ekans",
	minigameCommand: 'edge',
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess an answer with the given starting and ending letters!",
	modes: ["survival", "team"],
	variants: [
		{
			name: "Ekans' Ability Edges",
			variant: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities'],
		},
		{
			name: "Ekans' Character Edges",
			variant: "Characters",
			variantAliases: ['character'],
		},
		{
			name: "Ekans' Item Edges",
			variant: "Pokemon Items",
			variantAliases: ['item', 'items'],
		},
		{
			name: "Ekans' Location Edges",
			variant: "Locations",
			variantAliases: ['location'],
		},
		{
			name: "Ekans' Move Edges",
			variant: "Pokemon Moves",
			variantAliases: ['move', 'moves'],
		},
		{
			name: "Ekans' Pokemon Edges",
			variant: "Pokemon",
		},
	],
});

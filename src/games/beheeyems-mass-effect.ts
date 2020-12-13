import type { IGameAchievement, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from "./templates/question-and-answer";

type AchievementNames = "cognitivecerebrum";

const data: {types: Dict<string[]>} = {
	types: {},
};
const effectivenessLists: Dict<string[]> = {};
const effectivenessListsKeys: string[] = [];

class BeheeyemsMassEffect extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		'cognitivecerebrum': {name: "Cognitive Cerebrum", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
	};

	allAnswersAchievement = BeheeyemsMassEffect.achievements.cognitivecerebrum;
	lastEffectiveness: string = '';
	roundTime: number = 20 * 1000;

	static loadData(): void {
		for (const pokemon of Games.getPokemonList()) {
			const typing = pokemon.types.slice().sort().join('/');
			if (!(typing in data.types)) data.types[typing] = [];
			data.types[typing].push(pokemon.name);
		}

		for (const typing in data.types) {
			const immunities: string[] = [];
			const resistances: string[] = [];
			const weaknesses: string[] = [];
			const typingArray = typing.split('/');
			for (const key of Dex.data.typeKeys) {
				const type = Dex.getExistingType(key).name;
				if (Dex.isImmune(type, typingArray)) {
					immunities.push(type);
				} else {
					const effectiveness = Dex.getEffectiveness(type, typingArray);
					if (effectiveness <= -2) {
						resistances.push("<b>" + type + "</b>");
					} else if (effectiveness === -1) {
						resistances.push(type);
					} else if (effectiveness === 1) {
						weaknesses.push(type);
					} else if (effectiveness >= 2) {
						weaknesses.push("<b>" + type + "</b>");
					}
				}
			}
			const text: string[] = [];
			if (weaknesses.length) text.push("Weak to " + Tools.joinList(weaknesses));
			if (resistances.length) text.push("Resists " + Tools.joinList(resistances));
			if (immunities.length) text.push("Immune to " + Tools.joinList(immunities));
			const effectiveness = text.join(" | ");
			if (!(effectiveness in effectivenessLists)) {
				effectivenessLists[effectiveness] = [];
				effectivenessListsKeys.push(effectiveness);
			}

			for (const pokemon of  data.types[typing]) {
				if (!effectivenessLists[effectiveness].includes(pokemon)) effectivenessLists[effectiveness].push(pokemon);
			}
		}
	}

	onSignups(): void {
		if (this.format.options.freejoin) {
			this.timeout = setTimeout(() => this.nextRound(), 10 * 1000);
		}
	}

	generateAnswer(): void {
		let effectiveness = this.sampleOne(effectivenessListsKeys);
		while (effectiveness === this.lastEffectiveness) {
			effectiveness = this.sampleOne(effectivenessListsKeys);
		}
		this.lastEffectiveness = effectiveness;
		this.answers = effectivenessLists[effectiveness];
		this.hint = "<b>Randomly generated effectiveness</b>: <i>" + effectiveness + "</i>";
	}
}

export const game: IGameFile<BeheeyemsMassEffect> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ["Beheeyems", "bme"],
	category: 'knowledge',
	class: BeheeyemsMassEffect,
	defaultOptions: ['points'],
	description: "Each round, players find a Pokemon whose type effectiveness matches the given parameters.",
	formerNames: ["Mass Effect"],
	freejoin: true,
	name: "Beheeyem's Mass Effect",
	mascot: "Beheeyem",
	minigameCommand: 'masseffect',
	minigameCommandAliases: ['meffect'],
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess a Pokemon whose type effectiveness matches the " +
		"given parameters.",
	modeProperties: {
		'timeattack': {
			roundTime: 10 * 1000,
		},
	},
	modes: ['multianswer', 'survival', 'team', 'timeattack'],
	nonTrivialLoadData: true,
});

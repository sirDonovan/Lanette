import type { IGameAchievement, IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from "./templates/question-and-answer";

type AchievementNames = "cognitivecerebrum";

class BeheeyemsMassEffect extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		'cognitivecerebrum': {name: "Cognitive Cerebrum", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
	};
	static cachedData: IGameCachedData = {};

	allAnswersAchievement = BeheeyemsMassEffect.achievements.cognitivecerebrum;
	hintPrefix: string = "Randomly generated effectiveness";
	roundTime: number = 20 * 1000;

	// eslint-disable-next-line @typescript-eslint/require-await
	static async loadData(): Promise<void> {
		const types: Dict<string[]> = {};
		for (const pokemon of Games.getPokemonList()) {
			const typing = pokemon.types.slice().sort().join('/');
			if (!(typing in types)) types[typing] = [];
			types[typing].push(pokemon.name);
		}

		const typeNames: Dict<string> = {};
		const typeKeys = Dex.getTypeKeys();
		for (const key of typeKeys) {
			typeNames[key] = Dex.getExistingType(key).name;
		}

		const hints: Dict<string[]> = {};
		const hintKeys: string[] = [];

		for (const typing in types) {
			const immunities: string[] = [];
			const resistances: string[] = [];
			const weaknesses: string[] = [];
			const typingArray = typing.split('/');
			for (const key of typeKeys) {
				const type = typeNames[key];
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
			if (!(effectiveness in hints)) {
				hints[effectiveness] = [];
				hintKeys.push(effectiveness);
			}

			for (const pokemon of types[typing]) {
				if (!hints[effectiveness].includes(pokemon)) hints[effectiveness].push(pokemon);
			}
		}

		this.cachedData.hintAnswers = hints;
		this.cachedData.hintKeys = hintKeys;
	}
}

export const game: IGameFile<BeheeyemsMassEffect> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ["Beheeyems", "bme"],
	category: 'knowledge-1',
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
		'pmtimeattack': {
			roundTime: 10 * 1000,
		},
	},
	modes: ["abridged", "collectiveteam", "multianswer", "pmtimeattack", "prolix", "spotlightteam", "survival", "timeattack"],
});

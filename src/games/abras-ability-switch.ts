import type { IGameAchievement, IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

type AchievementNames = "skillswapper" | "captainskillswapper";

class AbrasAbilitySwitch extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"skillswapper": {name: "Skill Swapper", type: 'all-answers', bits: 1000, description: 'get every answer in one game'},
		"captainskillswapper": {name: "Captain Skill Swapper", type: 'all-answers-team', bits: 1000, mode: 'collectiveteam',
			description: 'get every answer for your team and win the game'},
	};
	static cachedData: IGameCachedData = {};

	allAnswersAchievement = AbrasAbilitySwitch.achievements.skillswapper;
	allAnswersTeamAchievement = AbrasAbilitySwitch.achievements.captainskillswapper;
	hintPrefix: string = "Abra wants the ability";

	static loadData(): void {
		const abilities: Dict<string[]> = {};
		for (const pokemon of Games.getPokemonList()) {
			for (const i in pokemon.abilities) {
				// @ts-expect-error
				const ability = Dex.getExistingAbility(pokemon.abilities[i] as string);
				if (!(ability.name in abilities)) abilities[ability.name] = [];
				abilities[ability.name].push(pokemon.name);
			}
		}

		this.cachedData.hintAnswers = {};
		const hintKeys: string[] = [];

		for (const ability in abilities) {
			if (abilities[ability].length === 1) continue;
			this.cachedData.hintAnswers[ability] = abilities[ability];
			hintKeys.push(ability);
		}

		this.cachedData.hintKeys = hintKeys;
	}
}

const commands = Tools.deepClone(questionAndAnswerGame.commands!);
if (!commands.guess.aliases) commands.guess.aliases = [];
commands.guess.aliases.push('switch');

export const game: IGameFile<AbrasAbilitySwitch> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['aas', 'abras'],
	category: 'knowledge-1',
	class: AbrasAbilitySwitch,
	commandDescriptions: [Config.commandCharacter + "switch [Pokemon]"],
	commands,
	defaultOptions: ['points'],
	description: "Players switch to Pokemon that have the chosen abilities for Abra to Role Play!",
	freejoin: true,
	name: "Abra's Ability Switch",
	mascot: "Abra",
	minigameCommand: 'abilityswitch',
	minigameCommandAliases: ['aswitch'],
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess a Pokemon with the chosen ability!",
	modes: ["abridged", "collectiveteam", "multianswer", "pmtimeattack", "prolix", "spotlightteam", "survival", "timeattack"],
	modeProperties: {
		'survival': {
			roundTime: 8 * 1000,
		},
	},
});

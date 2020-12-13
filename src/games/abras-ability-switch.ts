import type { IGameAchievement, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

type AchievementNames = "skillswapper" | "captainskillswapper";

const data: {abilities: Dict<string[]>; pokedex: string[]} = {
	"abilities": {},
	"pokedex": [],
};

class AbrasAbilitySwitch extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"skillswapper": {name: "Skill Swapper", type: 'all-answers', bits: 1000, description: 'get every answer in one game'},
		"captainskillswapper": {name: "Captain Skill Swapper", type: 'all-answers-team', bits: 1000, description: 'get every answer for ' +
			'your team and win the game'},
	};

	allAnswersAchievement = AbrasAbilitySwitch.achievements.skillswapper;
	allAnswersTeamAchievement = AbrasAbilitySwitch.achievements.captainskillswapper;
	lastAbility: string = '';
	lastPokemon: string = '';

	static loadData(): void {
		const pokedex = Games.getPokemonList();
		for (const pokemon of pokedex) {
			const abilities: string[] = [];
			for (const i in pokemon.abilities) {
				// @ts-expect-error
				abilities.push(pokemon.abilities[i]);
			}
			data.abilities[pokemon.id] = abilities;
			data.pokedex.push(pokemon.name);
		}
	}

	generateAnswer(): void {
		let pokemon = this.sampleOne(data.pokedex);
		while (pokemon === this.lastPokemon) {
			pokemon = this.sampleOne(data.pokedex);
		}
		this.lastPokemon = pokemon;

		const id = Tools.toId(pokemon);
		let ability = this.sampleOne(data.abilities[id]);
		while (ability === this.lastAbility) {
			if (data.abilities[id].length === 1) {
				this.generateAnswer();
				return;
			}
			ability = this.sampleOne(data.abilities[id]);
		}
		this.lastAbility = ability;

		const answers: string[] = [];
		for (const name of data.pokedex) {
			if (data.abilities[Tools.toId(name)].includes(ability)) {
				answers.push(name);
			}
		}
		this.answers = answers;
		this.hint = "<b>Abra wants the ability</b>: <i>" + ability + "</i>";
	}
}

const commands = Tools.deepClone(questionAndAnswerGame.commands!);
if (!commands.guess.aliases) commands.guess.aliases = [];
commands.guess.aliases.push('switch');

export const game: IGameFile<AbrasAbilitySwitch> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['aas', 'abras'],
	category: 'knowledge',
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
	modes: ["multianswer", "survival", "team", "timeattack"],
	modeProperties: {
		'survival': {
			roundTime: 8 * 1000,
		},
	},
});

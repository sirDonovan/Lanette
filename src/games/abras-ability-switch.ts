import { Room } from "../rooms";
import { IGameFile, AchievementsDict } from "../types/games";
import { game as guessingGame, Guessing } from './templates/guessing';

const name = "Abra's Ability Switch";
const data: {abilities: Dict<string[]>; pokedex: string[]} = {
	"abilities": {},
	"pokedex": [],
};
let loadedData = false;

const achievements: AchievementsDict = {
	"skillswapper": {name: "Skill Swapper", type: 'all-answers', bits: 1000, description: 'get every answer in one game'},
	"captainskillswapper": {name: "Captain Skill Swapper", type: 'all-answers-team', bits: 1000, description: 'get every answer for your team and win the game'},
};

class AbrasAbilitySwitch extends Guessing {
	allAnswersAchievement = achievements.skillswapper;
	allAnswersTeamAchievement = achievements.captainskillswapper;

	lastAbility: string = '';
	lastPokemon: string = '';

	static loadData(room: Room): void {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

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

		loadedData  = true;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async setAnswers(): Promise<void> {
		let pokemon = this.sampleOne(data.pokedex);
		while (pokemon === this.lastPokemon) {
			pokemon = this.sampleOne(data.pokedex);
		}
		this.lastPokemon = pokemon;

		const id = Tools.toId(pokemon);
		let ability = this.sampleOne(data.abilities[id]);
		while (ability === this.lastAbility) {
			if (data.abilities[id].length === 1) {
				await this.setAnswers();
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

const commands = Tools.deepClone(guessingGame.commands!);
if (!commands.guess.aliases) commands.guess.aliases = [];
commands.guess.aliases.push('switch');

export const game: IGameFile<AbrasAbilitySwitch> = Games.copyTemplateProperties(guessingGame, {
	achievements,
	aliases: ['aas', 'abras'],
	category: 'knowledge',
	class: AbrasAbilitySwitch,
	commandDescriptions: [Config.commandCharacter + "switch [Pokemon]"],
	commands,
	defaultOptions: ['points'],
	description: "Players switch to Pokemon that have the chosen abilities for Abra to Role Play!",
	freejoin: true,
	name,
	mascot: "Abra",
	modes: ["survival", "team"],
});

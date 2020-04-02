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
	"captainskillswapper": {name: "Captain Skill Swapper", type: 'all-answers-team', bits: 1000, description: 'get every answer in one game'},
};

class AbrasAbilitySwitch extends Guessing {
	static loadData(room: Room): void {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const pokedex = Games.getPokemonList();
		for (let i = 0; i < pokedex.length; i++) {
			const pokemon = pokedex[i];
			const abilities: string[] = [];
			for (const i in pokemon.abilities) {
				// @ts-ignore
				abilities.push(pokemon.abilities[i]);
			}
			data.abilities[pokemon.id] = abilities;
			data.pokedex.push(pokedex[i].species);
		}

		loadedData  = true;
	}

	allAnswersAchievement = achievements.skillswapper;
	allAnswersTeamAchievement = achievements.captainskillswapper;

	lastAbility: string = '';
	lastPokemon: string = '';

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
				this.setAnswers();
				return;
			}
			ability = this.sampleOne(data.abilities[id]);
		}
		this.lastAbility = ability;

		const answers: string[] = [];
		for (let i = 0; i < data.pokedex.length; i++) {
			if (data.abilities[Tools.toId(data.pokedex[i])].includes(ability)) {
				answers.push(data.pokedex[i]);
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

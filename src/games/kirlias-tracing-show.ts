import type { IGameAchievement, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from './templates/question-and-answer';

type AchievementNames = "thegreatestshowman";

const data: {abilities: Dict<string>; pokedex: string[]} = {
	abilities: {},
	pokedex: [],
};

class KirliasTracingShow extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		'thegreatestshowman': {name: "The Greatest Showman", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
	};

	allAnswersAchievement = KirliasTracingShow.achievements.thegreatestshowman;
	lastAbilities: string = '';
	lastPokemon: string = '';

	static loadData(): void {
		const pokemonList = Games.getPokemonList();
		for (const pokemon of pokemonList) {
			const abilities: string[] = [];
			for (const ability in pokemon.abilities) {
				// @ts-expect-error
				abilities.push(pokemon.abilities[ability]);
			}
			data.abilities[pokemon.id] = abilities.join(",");
			data.pokedex.push(pokemon.id);
		}
	}

	onSignups(): void {
		if (this.format.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
	}

	generateAnswer(): void {
		let pokemon = this.sampleOne(data.pokedex);
		let abilities = data.abilities[pokemon];
		while (pokemon === this.lastPokemon || abilities === this.lastAbilities) {
			pokemon = this.sampleOne(data.pokedex);
			abilities = data.abilities[pokemon];
		}
		this.lastPokemon = pokemon;
		this.lastAbilities = abilities;
		this.answers = abilities.split(',');
		this.hint = "<b>Kirlia traced</b>: <i>" + Dex.getExistingPokemon(pokemon).name + "</i>";
	}
}

const commands = Tools.deepClone(questionAndAnswerGame.commands!);
if (!commands.guess.aliases) commands.guess.aliases = [];
commands.guess.aliases.push('trace');

export const game: IGameFile<KirliasTracingShow> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ['kirlias', 'kts'],
	category: 'knowledge',
	class: KirliasTracingShow,
	commandDescriptions: [Config.commandCharacter + "trace [ability]"],
	commands,
	defaultOptions: ['points'],
	description: "Players guess abilities that the chosen Pokemon have!",
	freejoin: true,
	name: "Kirlia's Tracing Show",
	mascot: "Kirlia",
	minigameCommand: 'kirliatrace',
	minigameCommandAliases: ['ktrace'],
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess an ability that the given Pokemon has!",
	modes: ['survival', 'team', 'timeattack'],
});

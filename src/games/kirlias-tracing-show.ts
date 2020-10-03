import type { Room } from "../rooms";
import type { AchievementsDict, IGameFile } from "../types/games";
import type { User } from "../users";
import { game as guessingGame, Guessing } from './templates/guessing';

const achievements: AchievementsDict = {
	'thegreatestshowman': {name: "The Greatest Showman", type: 'all-answers', bits: 1000, description: "get every answer in one game"},
};

const data: {abilities: Dict<string>; pokedex: string[]} = {
	abilities: {},
	pokedex: [],
};

class KirliasTracingShow extends Guessing {
	allAnswersAchievement = achievements.thegreatestshowman;
	lastAbilities: string = '';
	lastPokemon: string = '';

	static loadData(room: Room | User): void {
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

	// eslint-disable-next-line @typescript-eslint/require-await
	async setAnswers(): Promise<void> {
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

const commands = Tools.deepClone(guessingGame.commands!);
if (!commands.guess.aliases) commands.guess.aliases = [];
commands.guess.aliases.push('trace');

export const game: IGameFile<KirliasTracingShow> = Games.copyTemplateProperties(guessingGame, {
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
	minigameDescription: "Use ``" + Config.commandCharacter + "g`` to guess an ability that the given Pokemon has!",
	modes: ['survival', 'team'],
});

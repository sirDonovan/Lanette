import type { Player } from "../room-activity";
import type { IGameAchievement, IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from "./templates/question-and-answer";

type AchievementNames = "pokemonprofessor";

class PikachusMysteryPokemon extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"pokemonprofessor": {name: "Pokemon Professor", type: 'all-answers', bits: 1000, description: 'get every answer in one game'},
	};
	static cachedData: IGameCachedData = {};

	allAnswersAchievement = PikachusMysteryPokemon.achievements.pokemonprofessor;
	canGuess: boolean = false;
	hints: string[] = [];
	multiRoundHints = true;
	mysteryRound: number = -1;
	pokemonRound: number = 0;
	roundGuesses: Map<Player, boolean> | undefined = new Map();
	roundTime = 0;
	updateHintTime = 5 * 1000;

	static async loadData(): Promise<void> { // eslint-disable-line @typescript-eslint/require-await
		const hints: Dict<string[]> = {};
		const hintKeys: string[] = [];

		for (const pokemon of Games.getPokemonList()) {
			if (pokemon.forme) continue;

			const pokemonHints: string[] = [];
			pokemonHints.push("<b>Type" + (pokemon.types.length > 1 ? "s" : "") + "</b>: " + pokemon.types.join("/"));
			pokemonHints.push("<b>Color</b>: " + pokemon.color);
			pokemonHints.push("<b>Egg group" + (pokemon.eggGroups.length > 1 ? "s" : "") + "</b>: " + pokemon.eggGroups.join(", "));
			pokemonHints.push("<b>Generation</b>: " + pokemon.gen);

			hints[pokemon.name] = pokemonHints;
			hintKeys.push(pokemon.name);
		}

		this.cachedData.hintAnswers = hints;
		this.cachedData.hintKeys = hintKeys;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async onSetGeneratedHint(hintKey: string, hintAnswers: Dict<readonly string[]>): Promise<void> {
		this.hints = this.shuffle(hintAnswers[hintKey]);
		this.answers = [hintKey];
		this.mysteryRound = -1;

		this.setHintHtml();
	}

	updateHint(): void {
		this.mysteryRound++;
		if (this.mysteryRound === 0) {
			this.pokemonRound++;
		}

		if (this.roundGuesses) this.roundGuesses.clear();

		this.setHintHtml();
	}

	setHintHtml(): void {
		const pastHints = this.hints.slice(0, this.mysteryRound);
		this.hint = (pastHints.length ? pastHints.join("<br />") + "<br />" : "") + (this.hints[this.mysteryRound] ?
			"<i>" + this.hints[this.mysteryRound] + "</i>" : "");
	}

	onHintHtml(): void {
		if (this.timeout) clearTimeout(this.timeout);

		if (!this.hints[this.mysteryRound]) {
			this.canGuess = false;
			const text = "All hints have been revealed!";
			this.on(text, () => {
				this.displayAnswers();
				this.answers = [];
				if (this.isMiniGame) {
					this.end();
					return;
				}
				this.setTimeout(() => void this.nextRound(), 5000);
			});
			this.say(text);
			return;
		} else {
			this.setTimeout(() => void this.nextRound(), this.updateHintTime);
		}
	}

	getDisplayedRoundNumber(): number {
		return this.pokemonRound;
	}
}

export const game: IGameFile<PikachusMysteryPokemon> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ["pikachus", "mysterypokemon", "pmp", "wtp"],
	challengeSettings: Object.assign({}, questionAndAnswerGame.challengeSettings, {
		botchallenge: {
			enabled: false,
		},
		onevsone: {
			enabled: true,
		},
	}),
	category: 'knowledge-3',
	commandDescriptions: [Config.commandCharacter + "g [Pokemon]"],
	class: PikachusMysteryPokemon,
	defaultOptions: ['points'],
	description: "Players guess Pokemon based on the given hints (one guess per hint)!",
	formerNames: ["Who's That Pokemon"],
	freejoin: true,
	name: "Pikachu's Mystery Pokemon",
	mascot: "Pikachu",
	minigameCommand: "mysterypokemon",
	minigameCommandAliases: ["mpokemon"],
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess a Pokemon as hints are revealed (one chance to " +
		"guess correctly)!",
	modes: ['collectiveteam'],
	variants: [
		{
			name: "Pikachu's Mystery Pokemon Unlimited",
			description: "Players guess Pokemon based on the given hints (unlimited guesses)!",
			variantAliases: ["unlimited", "unlimited guess", "unlimited guesses"],
			roundGuesses: undefined,
		},
	],
});

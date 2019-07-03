import { DefaultGameOptions } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { commandDescriptions, commands as templateCommands, Guessing, GuessingAbstract } from './templates/guessing';

const data: Dict<string[]> = {};
let dataKeys: string[] = [];
let loadedData = false;

class ChimechosStatSchool extends Guessing implements GuessingAbstract {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading game-specific data...");

		const pokemon = Dex.getPokemonList();
		for (let i = 0; i < pokemon.length; i++) {
			const stats = Object.values(pokemon[i].baseStats).join(" / ");
			if (!(stats in data)) data[stats] = [];
			data[stats].push(pokemon[i].species);
		}
		dataKeys = Object.keys(data);

		loadedData = true;
	}

	defaultOptions: DefaultGameOptions[] = ['points'];

	onSignups() {
		if (this.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5000);
	}

	setAnswers() {
		const stats = Tools.sampleOne(dataKeys);
		this.answers = data[stats];
		this.hint = "**Base stats**: " + stats;
	}

	onNextRound() {
		this.canGuess = false;
		this.setAnswers();
		this.on(this.hint, () => {
			this.canGuess = true;
			this.timeout = setTimeout(() => {
				if (this.answers.length) {
					this.say("Time's up! " + this.getAnswers());
					this.answers = [];
				}
				this.nextRound();
			}, 10 * 1000);
		});
		this.say(this.hint);
	}
}

export const game: IGameFile<ChimechosStatSchool> = {
	aliases: ['chimechos', 'css', 'statschool'],
	battleFrontierCategory: 'Knowledge',
	class: ChimechosStatSchool,
	commandDescriptions,
	commands: Object.assign({}, templateCommands),
	description: "Players guess Pokémon with the given base stat distributions!",
	freejoin: true,
	name: "Chimecho's Stat School",
	mascot: "Chimecho",
	modes: ["survival"],
};

import { DefaultGameOptions } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { commandDescriptions, commands as templateCommands, Guessing, GuessingAbstract } from './templates/guessing';

const data: Dict<Dict<string[]>> = {
	"Pokemon Abilities": {},
	"Pokemon Items": {},
	"Pokemon Moves": {},
};
const categories = Object.keys(data);
const questions: Dict<string[]> = {};
let loadedData = false;

class SlowkingsTrivia extends Guessing implements GuessingAbstract {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading game-specific data...");

		const abilities = Dex.getAbilitiesList();
		for (let i = 0; i < abilities.length; i++) {
			const ability = abilities[i];
			const desc = ability.desc || ability.shortDesc;
			if (!desc) continue;
			if (!(desc in data["Pokemon Abilities"])) data["Pokemon Abilities"][desc] = [];
			data["Pokemon Abilities"][desc].push(ability.name);
		}

		const items = Dex.getItemsList();
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			const desc = item.desc || item.shortDesc;
			if (!desc) continue;
			if (!(desc in data["Pokemon Items"])) data["Pokemon Items"][desc] = [];
			data["Pokemon Items"][desc].push(item.name);
		}

		const moves = Dex.getMovesList();
		for (let i = 0; i < moves.length; i++) {
			const move = moves[i];
			const desc = move.desc || move.shortDesc;
			if (!desc) continue;
			if (!(desc in data["Pokemon Moves"])) data["Pokemon Moves"][desc] = [];
			data["Pokemon Moves"][desc].push(move.name);
		}

		for (let i = 0; i < categories.length; i++) {
			questions[categories[i]] = Object.keys(data[categories[i]]);
		}

		loadedData = true;
	}

	defaultOptions: DefaultGameOptions[] = ['points'];

	onSignups() {
		if (this.isMiniGame) {
			this.nextRound();
		} else {
			if (this.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5000);
		}
	}

	setAnswers() {
		const category = this.roundCategory || this.variant || Tools.sampleOne(categories);
		const question = Tools.sampleOne(questions[category]);
		this.answers = data[category][question];
		this.hint = "**" + category + "**: " + question;
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
					if (this.isMiniGame) {
						this.end();
						return;
					}
				}
				this.nextRound();
			}, 10 * 1000);
		});
		this.say(this.hint);
	}
}

export const game: IGameFile<SlowkingsTrivia> = {
	aliases: ['slowkings', 'triv'],
	battleFrontierCategory: 'Knowledge',
	class: SlowkingsTrivia,
	commandDescriptions,
	commands: Object.assign({}, templateCommands),
	description: "Players use the given descriptions (Pokemon related) to guess the answers!",
	formerNames: ["Trivia"],
	freejoin: true,
	name: "Slowking's Trivia",
	mascot: "Slowking",
	minigameCommand: 'trivium',
	minigameDescription: "Use ``.g`` to guess an answer based on the description!",
	modes: ["survival"],
	variants: [
		{
			name: "Slowking's Ability Trivia",
			variant: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities'],
		},
		{
			name: "Slowking's Item Trivia",
			variant: "Pokemon Items",
			variantAliases: ['item', 'items'],
		},
		{
			name: "Slowking's Move Trivia",
			variant: "Pokemon Moves",
			variantAliases: ['move', 'moves'],
		},
	],
};

import { DefaultGameOptions } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { commandDescriptions, commands as templateCommands, Guessing, GuessingAbstract } from './templates/guessing';

const data: Dict<Dict<string[]>> = {
	"Pokemon Abilities": {},
	"Pokemon Items": {},
	"Pokemon Moves": {},
};
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

		loadedData = true;
	}

	categories: string[] = Object.keys(data);
	defaultOptions: DefaultGameOptions[] = ['points'];
	questions: Dict<string[]> = {};

	constructor(room: Room) {
		super(room);

		for (let i = 0; i < this.categories.length; i++) {
			this.questions[this.categories[i]] = Object.keys(data[this.categories[i]]);
		}
	}

	onSignups() {
		if (this.options.points === 1) {
			this.nextRound();
		} else {
			if (this.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5000);
		}
	}

	setAnswers() {
		const category = this.roundCategory || this.variant || Tools.sampleOne(this.categories);
		const question = Tools.sampleOne(this.questions[category]);
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
					if (this.options.points === 1) {
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
	class: SlowkingsTrivia,
	commandDescriptions,
	commands: Object.assign({}, templateCommands),
	description: "Players use the given descriptions (Pokemon related) to guess the answers!",
	freejoin: true,
	formerNames: ["Trivia"],
	name: "Slowking's Trivia",
	mascot: "Slowking",
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

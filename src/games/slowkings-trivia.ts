import { IGameFile } from "../games";
import { DefaultGameOptions } from "../room-game";
import { Room } from "../rooms";
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

		for (const i in Dex.data.abilities) {
			const ability = Dex.getExistingAbility(i);
			if (!ability.name) continue;
			const desc = ability.desc || ability.shortDesc;
			if (!desc) continue;
			if (!(desc in data["Pokemon Abilities"])) data["Pokemon Abilities"][desc] = [];
			data["Pokemon Abilities"][desc].push(ability.name);
		}

		for (const i in Dex.data.items) {
			const item = Dex.getExistingItem(i);
			if (!item.name) continue;
			const desc = item.desc || item.shortDesc;
			if (!desc) continue;
			if (!(desc in data["Pokemon Items"])) data["Pokemon Items"][desc] = [];
			data["Pokemon Items"][desc].push(item.name);
		}

		for (const i in Dex.data.moves) {
			const move = Dex.getExistingMove(i);
			if (!move.name) continue;
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

import { DefaultGameOption } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { commandDescriptions, commands as templateCommands, Guessing } from './templates/guessing';

const name = "Slowking's Trivia";
const data: Dict<Dict<string[]>> = {
	"Pokemon Abilities": {},
	"Pokemon Items": {},
	"Pokemon Moves": {},
};
const categories = Object.keys(data);
const questions: Dict<string[]> = {};
let loadedData = false;

class SlowkingsTrivia extends Guessing {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

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

	defaultOptions: DefaultGameOption[] = ['points'];

	setAnswers() {
		const category = this.roundCategory || this.variant || this.sampleOne(categories);
		const question = this.sampleOne(questions[category]);
		this.answers = data[category][question];
		this.hint = "[**" + category + "**] " + question;
	}
}

export const game: IGameFile<SlowkingsTrivia> = {
	aliases: ['slowkings', 'triv', 'st'],
	battleFrontierCategory: 'Knowledge',
	class: SlowkingsTrivia,
	commandDescriptions,
	commands: Object.assign({}, templateCommands),
	description: "Players use the given descriptions (Pokemon related) to guess the answers!",
	formerNames: ["Trivia"],
	freejoin: true,
	name,
	mascot: "Slowking",
	minigameCommand: 'trivium',
	minigameDescription: "Use ``" + Config.commandCharacter + "g`` to guess an answer based on the description!",
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

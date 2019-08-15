import { DefaultGameOption } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { commands as templateCommands, Guessing } from './templates/guessing';

const name = "Greninja's Typings";
const keys: string[] = [];
let loadedData = false;

class GreninjasTypings extends Guessing {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const pokedex = Dex.getPokemonList(x => x.species.startsWith('Arcues-') || x.species.startsWith('Silvally-'));
		for (let i = 0; i < pokedex.length; i++) {
			keys.push(pokedex[i].species);
		}

		loadedData = true;
	}

	defaultOptions: DefaultGameOption[] = ['points'];
	lastPokemon: string = '';
	lastTyping: string = '';

	onSignups() {
		if (this.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5000);
	}

	setAnswers() {
		const noOrder = this.variant === 'noorder';
		let typing = Dex.getExistingPokemon(this.sampleOne(keys)).types;
		let typingString = typing.join(',');
		while (typing.length === 1 || typingString === this.lastTyping || (noOrder && typing.slice().reverse().join(',') === this.lastTyping)) {
			typing = Dex.getExistingPokemon(this.sampleOne(keys)).types;
			typingString = typing.join(',');
		}
		const reverseTypingString = noOrder ? typing.slice().reverse().join(',') : '';
		const pokemon: string[] = [];
		for (let i = 0; i < keys.length; i++) {
			const typing = Dex.getExistingPokemon(keys[i]).types.join(',');
			if (typing === typingString || (reverseTypingString && typing === reverseTypingString)) {
				pokemon.push(keys[i]);
			}
		}
		this.lastTyping = typingString;
		this.answers = pokemon;
		this.hint = "Randomly generated typing: **" + typing.join("/") + "**";
	}
}

export const game: IGameFile<GreninjasTypings> = {
	aliases: ['greninjas'],
	battleFrontierCategory: 'Knowledge',
	class: GreninjasTypings,
	commandDescriptions: [Config.commandCharacter + "g [Pokemon]"],
	commands: Object.assign({}, templateCommands),
	description: "Players guess Pokemon that match the given typing!",
	freejoin: true,
	formerNames: ['Typings'],
	name: "Greninja's Typings",
	mascot: "Greninja",
	modes: ["survival"],
	variants: [
		{
			name: "Greninja's No Order Typings",
			description: "Players guess Pokemon that match the given typing (order not important)!",
			variant: "noorder",
		},
	],
};

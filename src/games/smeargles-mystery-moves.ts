import { Player } from "../room-activity";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { game as guessingGame, Guessing } from "./templates/guessing";

const name = "Smeargle's Mystery Moves";
const data: {moves: string[]} = {
	moves: [],
};
let loadedData = false;

class SmearglesMysteryMoves extends Guessing {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const movesList = Dex.getMovesList();
		for (let i = 0; i < movesList.length; i++) {
			data.moves.push(movesList[i].name);
		}

		loadedData = true;
	}

	answers: string[] = [];
	canGuess: boolean = false;
	hints: string[] = [];
	hintsIndex: number = 0;
	lastMove: string = '';
	points = new Map<Player, number>();

	onSignups() {
		if (this.options.freejoin) {
			this.timeout = setTimeout(() => this.nextRound(), 10 * 1000);
		}
	}

	async setAnswers() {
		this.hintsIndex = 0;
		let name = this.sampleOne(data.moves);
		while (this.lastMove === name) {
			name = this.sampleOne(data.moves);
		}
		this.lastMove = name;
		const move = Dex.getExistingMove(name);
		const hints: string[] = [];
		hints.push("**Type**: " + move.type);
		hints.push("**Base PP**: " + move.pp);
		hints.push("**Category**: " + move.category);
		hints.push("**Accuracy**: " + (move.accuracy === true ? "does not check" : move.accuracy + "%"));
		if (move.category !== 'Status') hints.push("**Base power**: " + move.basePower);
		hints.push("**Description**: " + move.shortDesc);
		this.hints = this.shuffle(hints);
		this.answers = [move.name];
	}

	async onNextRound() {
		if (!this.answers.length) {
			this.canGuess = false;
			await this.setAnswers();
		}
		if (!this.hints[this.hintsIndex]) {
			const text = "All hints have been revealed! " + this.getAnswers('');
			this.answers = [];
			this.on(text, () => {
				this.timeout = setTimeout(() => this.nextRound(), 5000);
			});
			this.say(text);
			return;
		}
		const text = "``[hint " + (this.hintsIndex + 1) + "]`` " + this.hints[this.hintsIndex];
		this.hintsIndex++;
		this.on(text, () => {
			if (!this.answers.length) return;
			if (!this.canGuess) this.canGuess = true;
			this.timeout = setTimeout(() => this.nextRound(), 10000);
		});
		this.say(text);
	}
}

export const game: IGameFile<SmearglesMysteryMoves> = Games.copyTemplateProperties(guessingGame, {
	aliases: ["smeargles", "mysterymoves", "smm", "wtm"],
	commandDescriptions: [Config.commandCharacter + "g [move]"],
	class: SmearglesMysteryMoves,
	defaultOptions: ['points'],
	description: "Players guess moves based on the given hints!",
	formerNames: ["What's That Move"],
	freejoin: true,
	name,
	mascot: "Smeargle",
});

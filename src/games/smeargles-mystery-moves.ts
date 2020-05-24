import type { Player } from "../room-activity";
import type { Room } from "../rooms";
import type { AchievementsDict, IGameFile } from "../types/games";
import type { User } from "../users";
import { game as guessingGame, Guessing } from "./templates/guessing";

const data: {moves: string[]} = {
	moves: [],
};

const achievements: AchievementsDict = {
	"moverelearner": {name: "Move Relearner", type: 'all-answers', bits: 1000, description: 'get every answer in one game'},
};

class SmearglesMysteryMoves extends Guessing {
	allAnswersAchievement = achievements.moverelearner;
	answers: string[] = [];
	canGuess: boolean = false;
	hints: string[] = [];
	hintsIndex: number = 0;
	lastMove: string = '';
	points = new Map<Player, number>();

	static loadData(room: Room | User): void {
		const movesList = Games.getMovesList();
		for (const move of movesList) {
			data.moves.push(move.name);
		}
	}

	onSignups(): void {
		if (this.format.options.freejoin) {
			this.timeout = setTimeout(() => this.nextRound(), 10 * 1000);
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async setAnswers(): Promise<void> {
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

	async onNextRound(): Promise<void> {
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
	achievements,
	aliases: ["smeargles", "mysterymoves", "smm", "wtm"],
	category: 'knowledge',
	commandDescriptions: [Config.commandCharacter + "g [move]"],
	class: SmearglesMysteryMoves,
	defaultOptions: ['points'],
	description: "Players guess moves based on the given hints!",
	formerNames: ["What's That Move"],
	freejoin: true,
	name: "Smeargle's Mystery Moves",
	mascot: "Smeargle",
});

import type { Player } from "../room-activity";
import type { IGameAchievement, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from "./templates/question-and-answer";

type AchievementNames = "moverelearner";

const data: {moves: string[]} = {
	moves: [],
};

class SmearglesMysteryMoves extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"moverelearner": {name: "Move Relearner", type: 'all-answers', bits: 1000, description: 'get every answer in one game'},
	};

	allAnswersAchievement = SmearglesMysteryMoves.achievements.moverelearner;
	answers: string[] = [];
	canGuess: boolean = false;
	hints: string[] = [];
	lastMove: string = '';
	multiRoundHints = true;
	mysteryRound: number = -1;
	points = new Map<Player, number>();
	roundGuesses: Map<Player, boolean> | undefined = new Map();
	roundTime = 0;
	updateHintTime = 5 * 1000;

	static loadData(): void {
		data.moves = Games.getMovesList(x => !!x.shortDesc).map(x => x.name);
	}

	generateAnswer(): void {
		this.mysteryRound = -1;
		let name = this.sampleOne(data.moves);
		while (this.lastMove === name) {
			name = this.sampleOne(data.moves);
		}
		this.lastMove = name;
		const move = Dex.getExistingMove(name);
		const hints: string[] = [];
		hints.push("<b>Type</b>: " + move.type);
		hints.push("<b>Base PP</b>: " + move.pp);
		hints.push("<b>Category</b>: " + move.category);
		hints.push("<b>Accuracy</b>: " + (move.accuracy === true ? "does not check" : move.accuracy + "%"));
		if (move.category !== 'Status') hints.push("<b>Base power</b>: " + move.basePower);
		hints.push("<b>Description</b>: " + move.shortDesc);
		this.hints = this.shuffle(hints);
		this.answers = [move.name];
	}

	updateHint(): void {
		this.mysteryRound++;
		if (this.roundGuesses) this.roundGuesses.clear();
		const pastHints = this.hints.slice(0, this.mysteryRound);
		this.hint = (pastHints.length ? pastHints.join("<br />") + "<br />" : "") + (this.hints[this.mysteryRound] ?
			"<i>" + this.hints[this.mysteryRound] + "</i>" : "");
	}

	onHintHtml(): void {
		if (!this.hints[this.mysteryRound]) {
			const text = "All hints have been revealed! " + this.getAnswers('');
			this.on(text, () => {
				this.answers = [];
				if (this.isMiniGame) {
					this.end();
					return;
				}
				this.timeout = setTimeout(() => this.nextRound(), 5000);
			});
			this.say(text);
			return;
		} else {
			this.timeout = setTimeout(() => this.nextRound(), this.updateHintTime);
		}
	}
}

export const game: IGameFile<SmearglesMysteryMoves> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ["smeargles", "mysterymoves", "smm", "wtm"],
	category: 'knowledge',
	commandDescriptions: [Config.commandCharacter + "g [move]"],
	class: SmearglesMysteryMoves,
	defaultOptions: ['points'],
	description: "Players guess moves based on the given hints (one guess per hint)!",
	formerNames: ["What's That Move"],
	freejoin: true,
	name: "Smeargle's Mystery Moves",
	mascot: "Smeargle",
	minigameCommand: "mysterymove",
	minigameCommandAliases: ["mmove"],
	minigameDescription: "Use <code>" + Config.commandCharacter + "g</code> to guess a move as hints are revealed!",
	modes: ['group'],
	variants: [
		{
			name: "Smeargle's Mystery Moves Unlimited",
			description: "Players guess moves based on the given hints (unlimited guesses)!",
			variantAliases: ["unlimited", "unlimited guess", "unlimited guesses"],
			roundGuesses: undefined,
		},
	],
});

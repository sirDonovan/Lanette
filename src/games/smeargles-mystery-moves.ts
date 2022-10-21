import type { Player } from "../room-activity";
import type { IGameAchievement, IGameCachedData, IGameFile } from "../types/games";
import { game as questionAndAnswerGame, QuestionAndAnswer } from "./templates/question-and-answer";

type AchievementNames = "moverelearner";

class SmearglesMysteryMoves extends QuestionAndAnswer {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"moverelearner": {name: "Move Relearner", type: 'all-answers', bits: 1000, description: 'get every answer in one game'},
	};
	static cachedData: IGameCachedData = {};

	allAnswersAchievement = SmearglesMysteryMoves.achievements.moverelearner;
	canGuess: boolean = false;
	hints: string[] = [];
	movesRound: number = 0;
	multiRoundHints = true;
	mysteryRound: number = -1;
	roundGuesses: Map<Player, boolean> | undefined = new Map();
	roundTime = 0;
	updateHintTime = 5 * 1000;

	static loadData(): void {
		const hints: Dict<string[]> = {};
		const hintKeys: string[] = [];

		for (const move of Games.getMovesList()) {
			if (!move.shortDesc) continue;

			const moveHints: string[] = [];
			moveHints.push("<b>Type</b>: " + move.type);
			moveHints.push("<b>Base PP</b>: " + move.pp);
			moveHints.push("<b>Category</b>: " + move.category);
			moveHints.push("<b>Accuracy</b>: " + (move.accuracy === true ? "does not check" : move.accuracy + "%"));
			if (move.category !== 'Status') moveHints.push("<b>Base power</b>: " + move.basePower);
			moveHints.push("<b>Description</b>: " + move.shortDesc);

			hints[move.name] = moveHints;
			hintKeys.push(move.name);
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
			this.movesRound++;
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
				this.setTimeout(() => this.nextRound(), 5000);
			});
			this.say(text);
			return;
		} else {
			this.setTimeout(() => this.nextRound(), this.updateHintTime);
		}
	}

	getDisplayedRoundNumber(): number {
		return this.movesRound;
	}
}

export const game: IGameFile<SmearglesMysteryMoves> = Games.copyTemplateProperties(questionAndAnswerGame, {
	aliases: ["smeargles", "mysterymoves", "smm", "wtm"],
	challengeSettings: Object.assign({}, questionAndAnswerGame.challengeSettings, {
		botchallenge: {
			enabled: false,
		},
		onevsone: {
			enabled: true,
		},
	}),
	category: 'knowledge-3',
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
	modes: ['collectiveteam'],
	variants: [
		{
			name: "Smeargle's Mystery Moves Unlimited",
			description: "Players guess moves based on the given hints (unlimited guesses)!",
			variantAliases: ["unlimited", "unlimited guess", "unlimited guesses"],
			roundGuesses: undefined,
		},
	],
});

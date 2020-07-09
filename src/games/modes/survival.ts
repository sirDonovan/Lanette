import type { Player } from "../../room-activity";
import type { Game } from "../../room-game";
import { addPlayers, assert, runCommand } from "../../test/test-tools";
import type {
	DefaultGameOption, GameCommandDefinitions, GameCommandReturnType, GameFileTests, IGameFormat,
	IGameModeFile
} from "../../types/games";
import type { Guessing } from "../templates/guessing";

const name = 'Survival';
const description = 'Answer within the time limit to survive each round!';
const removedOptions: string[] = ['points', 'freejoin'];

type SurvivalThis = Guessing & Survival;

class Survival {
	currentPlayer: Player | null = null;
	readonly maxPlayers: number = 20;
	playerList: Player[] = [];
	readonly playerRounds = new Map<Player, number>();
	survivalRound: number = 0;

	roundTime: number;

	constructor(game: Game) {
		if (game.id === 'abrasabilityswitch') {
			this.roundTime = 7 * 1000;
		} else if (game.id === 'parasparameters' || game.id === 'magnetonsmashups') {
			this.roundTime = 15 * 1000;
		} else {
			this.roundTime = 9 * 1000;
		}
	}

	static setOptions<T extends Game>(format: IGameFormat<T>, namePrefixes: string[], nameSuffixes: string[]): void {
		if (!format.name.includes(name)) nameSuffixes.unshift(name);
		format.description += ' ' + description;

		for (const option of removedOptions) {
			const index = format.defaultOptions.indexOf(option as DefaultGameOption);
			if (index !== -1) format.defaultOptions.splice(index, 1);

			delete format.customizableOptions[option];
		}

		if (format.id === 'parasparameters') {
			delete format.customizableOptions.params;
		} else if (format.id === 'magnetonsmashups') {
			delete format.customizableOptions.names;
		}
	}

	onStart(this: SurvivalThis): void {
		this.nextRound();
	}

	async onNextRound(this: SurvivalThis): Promise<void> {
		this.canGuess = false;
		if (this.currentPlayer) {
			this.say("Time is up! " + this.getAnswers(''));
			this.eliminatePlayer(this.currentPlayer, "You did not guess the answer in time!");
			this.playerRounds.set(this.currentPlayer, this.survivalRound);
			this.currentPlayer = null;
		}

		if (!this.playerList.length) {
			if (this.getRemainingPlayerCount() < 2) {
				this.end();
				return;
			}
			this.survivalRound++;
			this.sayUhtml(this.uhtmlBaseName + '-round-html', this.getRoundHtml(this.getPlayerNames, null, "Round " + this.survivalRound));
			this.playerList = this.shufflePlayers();
			if (this.survivalRound > 1 && this.roundTime > 1000) this.roundTime -= 500;
		}
		let currentPlayer = this.playerList.shift();
		while (currentPlayer && currentPlayer.eliminated) {
			currentPlayer = this.playerList.shift();
		}
		if (!currentPlayer || currentPlayer.eliminated) {
			await this.onNextRound();
			return;
		}

		await this.setAnswers();
		if (this.ended) return;

		this.currentPlayer = currentPlayer;
		const text = "**" + this.currentPlayer.name + "** you are up!";
		this.on(text, () => {
			this.timeout = setTimeout(() => {
				const html = this.getHintHtml();
				const uhtmlName = this.uhtmlBaseName + '-hint-' + this.round;
				this.onUhtml(uhtmlName, html, () => {
					this.canGuess = true;
					this.timeout = setTimeout(() => this.nextRound(), this.roundTime);
				});
				this.sayUhtml(uhtmlName, html);
			}, 5 * 1000);
		});
		this.say(text);
	}

	onEnd(this: SurvivalThis): void {
		for (const i in this.players) {
			const player = this.players[i];
			if (player.eliminated) {
				const round = this.playerRounds.get(player);
				if (!round) continue;
				this.addBits(player, round * 10);
				continue;
			}
			this.winners.set(player, 1);
			this.addBits(player, 500);
		}

		this.announceWinners();
	}
}

const commandDefinitions: GameCommandDefinitions<SurvivalThis> = {
	guess: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		async asyncCommand(target, room, user): Promise<GameCommandReturnType> {
			if (!this.canGuess || this.players[user.id] !== this.currentPlayer) return false;
			const answer = await this.guessAnswer(this.players[user.id], target);
			if (!answer) return false;
			if (this.timeout) clearTimeout(this.timeout);
			this.currentPlayer = null;
			if (this.getRemainingPlayerCount() === 1) {
				this.end();
				return true;
			}
			this.say('**' + user.name + '** advances to the next round! ' + this.getAnswers(answer));
			this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
			return true;
		},
		aliases: ['g'],
	},
};

const commands = CommandParser.loadCommands(commandDefinitions);

const initialize = (game: Game): void => {
	const mode = new Survival(game);
	const propertiesToOverride = Object.getOwnPropertyNames(mode)
		.concat(Object.getOwnPropertyNames(Survival.prototype)) as (keyof Survival)[];
	for (const property of propertiesToOverride) {
		// @ts-expect-error
		game[property] = mode[property];
	}

	game.loadModeCommands(commands);
};

const tests: GameFileTests<SurvivalThis> = {
	/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
	'it should advance players who answer correctly': {
		config: {
			async: true,
			commands: [['guess'], ['g']],
		},
		async test(game, format, attributes): Promise<void> {
			this.timeout(15000);

			addPlayers(game);
			game.start();
			await game.onNextRound();
			assert(game.answers.length);
			const currentPlayer = game.currentPlayer;
			assert(currentPlayer);
			game.canGuess = true;
			await runCommand(attributes.commands![0], game.answers[0], game.room, currentPlayer.name);
			assert(!currentPlayer.eliminated);
			await game.onNextRound();
			assert(game.currentPlayer !== currentPlayer);
		},
	},
	'it should eliminate players who do not answer correctly': {
		config: {
			async: true,
			commands: [['guess'], ['g']],
		},
		async test(game, format, attributes): Promise<void> {
			this.timeout(15000);

			addPlayers(game);
			game.start();
			await game.onNextRound();
			assert(game.answers.length);
			const currentPlayer = game.currentPlayer;
			assert(currentPlayer);
			game.canGuess = true;
			await runCommand(attributes.commands![0], 'mocha', game.room, currentPlayer.name);
			await game.onNextRound();
			assert(currentPlayer.eliminated);
		},
	},
	/* eslint-enable */
};

export const mode: IGameModeFile<Survival, Guessing, SurvivalThis> = {
	aliases: ['surv'],
	class: Survival,
	commands,
	description,
	initialize,
	name,
	naming: 'suffix',
	removedOptions,
	tests,
};

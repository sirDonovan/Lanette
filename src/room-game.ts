import { ICommandDefinition } from "./command-parser";
import { IPokemonCopy } from "./dex";
import { IGameFormat } from "./games";
import { Activity, Player } from "./room-activity";
import { User } from "./users";

type DefaultGameOptions = 'points' | 'teams' | 'cards' | 'freejoin';

// base of 0 defaults option to 'off'
const defaultOptionValues: Dict<{min?: number, base?: number, max?: number}> = {
	points: {min: 3, base: 5, max: 10},
	teams: {min: 2, base: 2, max: 4},
	cards: {min: 4, base: 5, max: 6},
	freejoin: {min: 1, base: 0, max: 1},
};

const baseCommands: Dict<ICommandDefinition<Game>> = {
	summary: {
		command(target, room, user) {
			if (!(user.id in this.players)) return;
			const player = this.players[user.id];
			if (this.getPlayerSummary) {
				this.getPlayerSummary(this.players[user.id]);
			} else {
				let summary = '';
				if (this.points) summary += "Your points: " + (this.points.get(player) || 0) + "<br />";
				if (summary) player.sayHtml(summary);
			}
		},
		globalGameCommand: true,
		pmOnly: true,
	},
};

export const commands = CommandParser.loadCommands(baseCommands);

const globalGameCommands: Dict<ICommandDefinition<Game>> = {};
for (const i in commands) {
	if (commands[i].globalGameCommand) globalGameCommands[i] = commands[i];
}

export class Game extends Activity {
	activityType = 'game';
	commands = Object.assign(Object.create(null), globalGameCommands);
	customizableOptions: Dict<{min: number, base: number, max: number}> = Object.create(null);
	nameBeforeOptions = '';
	options: Dict<number> = Object.create(null);
	parentGame: Game | null = null;
	round = 0;
	winners = new Map<Player, number>();

	// set immediately in initialize()
	format!: IGameFormat;
	inputOptions!: Dict<number>;

	defaultOptions?: DefaultGameOptions[];
	isMiniGame?: boolean;
	mascot?: IPokemonCopy;
	points?: Map<Player, number>;

	initialize(format: IGameFormat) {
		this.format = format;
		this.inputOptions = this.format.inputOptions;
		this.name = format.name;
		this.id = format.id;

		if (format.commands) Object.assign(this.commands, format.commands);
		if (format.mascot) {
			this.mascot = Dex.getPokemonCopy(format.mascot);
		} else if (format.mascots) {
			this.mascot = Dex.getPokemonCopy(Tools.sampleOne(format.mascots));
		}

		this.setOptions();
	setOptions() {
		if (this.defaultOptions) {
			for (let i = 0; i < this.defaultOptions.length; i++) {
				const defaultOption = this.defaultOptions[i];
				if (defaultOption in this.customizableOptions) continue;
				let base: number;
				if (defaultOptionValues[defaultOption].base === 0) {
					base = 0;
				} else {
					base = defaultOptionValues[defaultOption].base || 5;
				}
				this.customizableOptions[defaultOption] = {
					min: defaultOptionValues[defaultOption].min || 1,
					base,
					max: defaultOptionValues[defaultOption].max || 10,
				};
			}
		}
		for (const i in this.customizableOptions) {
			this.options[i] = this.customizableOptions[i].base;
		}
		for (const i in this.inputOptions) {
			if (!(i in this.customizableOptions) || (i === 'points' && this.isMiniGame) || this.inputOptions[i] === this.options[i]) {
				delete this.inputOptions[i];
				continue;
			}
			if (this.inputOptions[i] < this.customizableOptions[i].min) {
				this.inputOptions[i] = this.customizableOptions[i].min;
			} else if (this.inputOptions[i] > this.customizableOptions[i].max) {
				this.inputOptions[i] = this.customizableOptions[i].max;
			}
			this.options[i] = this.inputOptions[i];
		}
		if (!this.nameBeforeOptions) {
			this.nameBeforeOptions = this.name;
		} else {
			this.name = this.nameBeforeOptions;
		}
		if (this.inputOptions.points) this.name += " (first to " + this.options.points + ")";
		if (this.inputOptions.teams) this.name = this.options.teams + ' ' + this.name;
		if (this.inputOptions.cards) this.name = this.inputOptions.cards + "-card " + this.name;
		if (this.inputOptions.gen) this.name = 'Gen ' + this.options.gen + " " + this.name;
	}

	deallocate() {
		this.room.game = null;
	}

	forceEnd(user: User) {
		if (this.timeout) clearTimeout(this.timeout);
		this.say("The " + this.name + " " + this.activityType + " was forcibly ended.");
		if (this.onForceEnd) this.onForceEnd(user);
		this.deallocate();
	}

	nextRound() {
		if (this.timeout) clearTimeout(this.timeout);
		this.round++;
		if (this.onNextRound) this.onNextRound();
	}

	end() {
		if (this.timeout) clearTimeout(this.timeout);
		if (this.onEnd) this.onEnd();
		this.deallocate();
	}

	getPlayerSummary?(player: Player): void;
	onNextRound?(): void;
}

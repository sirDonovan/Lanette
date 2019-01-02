import { ICommandDefinition } from "./command-parser";
import { IPokemonCopy } from "./dex";
import { IGameFormat } from "./games";
import { Activity, Player } from "./room-activity";
import { User } from "./users";

export type DefaultGameOptions = 'points' | 'teams' | 'cards' | 'freejoin';

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
	signupsTime = 0;
	winners = new Map<Player, number>();

	// set immediately in initialize()
	format!: IGameFormat;
	inputOptions!: Dict<number>;

	defaultOptions?: DefaultGameOptions[];
	isMiniGame?: boolean;
	mascot?: IPokemonCopy;
	points?: Map<Player, number>;
	shinyMascot?: boolean;
	variation?: string;

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
		if (format.freejoin) this.options.freejoin = 1;
	}

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

	signups() {
		// TODO: check internal/userhosted/custom signups
		this.showSignupsHtml = true;
		this.sayUhtml(this.getSignupsHtml(), "signups");
		this.signupsTime = Date.now();
		if (this.onSignups) this.onSignups();
		if (this.options.freejoin) {
			this.started = true;
			this.startTime = Date.now();
		}
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

	getSignupsHtml(): string {
		let html = "<div class='infobox'><center>";
		if (this.mascot) {
			if (this.shinyMascot === undefined) {
				if (this.rollForShinyPokemon()) {
					this.mascot.shiny = true;
					this.shinyMascot = true;
				} else {
					this.shinyMascot = false;
				}
			}
			const gif = Dex.getPokemonGif(this.mascot);
			if (gif) html += gif + "&nbsp;&nbsp;&nbsp;";
		}
		html += "<b><font size='3'>" + this.name + "</font></b><br />" + this.format.description;
		let commandDescriptions: string[] = [];
		if (this.getPlayerSummary) commandDescriptions.push(Config.commandCharacter + "summary");
		if (this.format.commandDescriptions) commandDescriptions = commandDescriptions.concat(this.format.commandDescriptions);
		if (commandDescriptions.length) {
			html += "<br /><b>Command" + (commandDescriptions.length > 1 ? "s" : "") + "</b>: " + commandDescriptions.map(x => "<code>" + x + "</code>").join(", ");
		}
		if (this.options.freejoin) {
			html += "<br /><br /><b>This game is free-join!</b>";
		} else {
			html += "<br /><br /><b>Players (" + this.playerCount + ")</b>: " + this.getPlayerNames();
			if (this.started) {
				html += "<br /><br /><b>The game has started!</b>";
			} else {
				html += "<br /><button class='button' name='send' value='/pm " + Users.self.name + ", .joingame " + this.room.id + "'>Join</button>";
			}
		}
		html += "</center></div>";
		return html;
	}

	rollForShinyPokemon(extraChance?: number): boolean {
		let chance = 150;
		if (extraChance) chance -= extraChance;
		return !Tools.random(chance);
	}

	getPlayerSummary?(player: Player): void;
	onNextRound?(): void;
	onSignups?(): void;
}

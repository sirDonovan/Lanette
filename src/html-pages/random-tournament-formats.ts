import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { User } from "../users";
import { FormatTextInput } from "./components/format-text-input";
import { CLOSE_COMMAND, HtmlPageBase } from "./html-page-base";

const baseCommand = 'randomtournamentformats';
const baseCommandAlias = 'rtf';
const formatsInputCommand = 'formatsinput';
const removeFormatCommand = 'removeformat';

export const pageId = 'random-tournament-formats';
export const pages: Dict<RandomTournamentFormats> = {};

class RandomTournamentFormats extends HtmlPageBase {
	pageId = pageId;

	formatInput: FormatTextInput;

	constructor(room: Room, user: User) {
		super(room, user, baseCommandAlias, pages);

		this.setCloseButton();

		this.formatInput = new FormatTextInput(this, this.commandPrefix, formatsInputCommand, {
			label: "",
			submitText: "Add format(s)",
			hideClearButton: true,
			textArea: true,
			textAreaConfiguration: {rows: 3, cols: 60},
			onClear: () => this.send(),
			onErrors: () => this.send(),
			onSubmit: (output) => this.addFormats(output),
			reRender: () => this.send(),
		});

		this.components = [this.formatInput];
	}

	addFormats(output: string): void {
		const database = Storage.getDatabase(this.room);
		if (!database.randomTournamentFormats) database.randomTournamentFormats = [];

		const formats = output.split(',');
		for (const format of formats) {
			const id = Tools.toId(format);
			if (!database.randomTournamentFormats.includes(id)) database.randomTournamentFormats.push(id);
		}

		this.send();
	}

	removeFormat(format: string): void {
		const database = Storage.getDatabase(this.room);
		if (!database.randomTournamentFormats) database.randomTournamentFormats = [];

		const id = Tools.toId(format);
		const index = database.randomTournamentFormats.indexOf(id);
		if (index !== -1) database.randomTournamentFormats.splice(index, 1);

		this.send();
	}

	render(): string {
		let html = "<div class='chat' style='margin-top: 4px;margin-left: 4px'><center><b>" +
			this.room.title + " Random Tournament Formats</b>";
		html += "&nbsp;" + this.closeButtonHtml;
		html += "</center>";
		html += "<br /><br />";

		html += "Add and remove formats below to control the list that " + Users.self.name + " chooses from when automatically " +
			"creating tournaments!";
		html += "<br /><br />";

		const database = Storage.getDatabase(this.room);
		if (!database.randomTournamentFormats) database.randomTournamentFormats = [];

		html += "<b>Current list</b>:";
		html += "<br />";

		const formats: string[] = [];
		for (const id of database.randomTournamentFormats) {
			const format = Tournaments.getFormat(id, this.room);
			if (format) formats.push(format.customFormatName || format.name);
		}

		if (formats.length) {
			html += "<ul>";
			for (const name of formats) {
				html += "<li>" + name + "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + removeFormatCommand + ", " + name,
					"remove") + "</li>";
			}
			html += "</ul>";
		} else {
			html += "No formats have been added.";
		}

		html += "<br /><br />";
		html += this.formatInput.render();

		html += "</div>";
		return html;
	}
}

export const commands: BaseCommandDefinitions = {
	[baseCommand]: {
		command(target, room, user) {
			if (!this.isPm(room)) return;
			const targets = target.split(",");
			const targetRoom = Rooms.search(targets[0]);
			if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
			targets.shift();

			if (!user.hasRank(targetRoom, 'driver')) return;

			const cmd = Tools.toId(targets[0]);
			targets.shift();

			if (!cmd) {
				new RandomTournamentFormats(targetRoom, user).open();
				return;
			}

			if (!(user.id in pages) && cmd !== CLOSE_COMMAND) new RandomTournamentFormats(targetRoom, user);

			if (cmd === removeFormatCommand) {
				if (user.id in pages) pages[user.id].removeFormat(targets[0]);
			} else if (cmd === CLOSE_COMMAND) {
				if (user.id in pages) pages[user.id].close();
			} else {
				const error = pages[user.id].checkComponentCommands(cmd, targets);
				if (error) this.say(error);
			}
		},
		aliases: [baseCommandAlias],
	},
};
import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { IDatabase } from "../types/storage";
import type { User } from "../users";
import { TrainerCardPrize } from "./components/trainer-card-prize";
import { CLOSE_COMMAND, HtmlPageBase } from "./html-page-base";

const baseCommand = 'tournamentprizemanager';
const baseCommandAlias = 'tpm';
const chooseBadgesCommand = 'choosebadges';
const chooseRibbonsCommand = 'chooseribbons';
const startAddBadgeCommand = 'startaddbadge';
const saveBadgeCommand = 'savebadge';
const startBadgeUpdateCommand = 'startbadgeupdate';
const cancelBadgeUpdateCommand = 'cancelbadgeupdate';
const saveBadgeUpdateCommand = 'savebadgeupdate';
const startAddRibbonCommand = 'startaddribbon';
const saveRibbonCommand = 'saveribbon';
const startRibbonUpdateCommand = 'startribbonupdate';
const cancelRibbonUpdateCommand = 'cancelribbonupdate';
const saveRibbonUpdateCommand = 'saveribbonupdate';
const newBadgeCommand = 'newbadge';
const updateBadgeCommand = 'updatebadge';
const newRibbonCommand = 'newribbon';
const updateRibbonCommand = 'updateribbon';

const DEFAULT_DIMENSIONS = 24;

export const pageId = 'tournament-card-prizes';
export const pages: Dict<TournamentPrizeManager> = {};

class TournamentPrizeManager extends HtmlPageBase {
	pageId = pageId;

	currentPicker: 'badges' | 'ribbons' = 'badges';
	newBadgeName: string = '';
	newBadgeSource: string = '';
	newBadgeWidth: number = 0;
	newBadgeHeight: number = 0;
	updatedBadgeName: string = '';
	updatedBadgeSource: string = '';
	updatedBadgeWidth: number = 0;
	updatedBadgeHeight: number = 0;

	newRibbonName: string = '';
	newRibbonSource: string = '';
	newRibbonWidth: number = 0;
	newRibbonHeight: number = 0;
	updatedRibbonName: string = '';
	updatedRibbonSource: string = '';
	updatedRibbonWidth: number = 0;
	updatedRibbonHeight: number = 0;

	addingBadge: boolean = false;
	addingRibbon: boolean = false;
	addBadgeError: string = '';
	addRibbonError: string = '';
	updatingBadgeId: string = '';
	updatingRibbonId: string = '';

	newBadgeInput: TrainerCardPrize;
	updatedBadgeInput: TrainerCardPrize;
	newRibbonInput: TrainerCardPrize;
	updatedRibbonInput: TrainerCardPrize;
	trainerCardRoom: Room;

	constructor(room: Room, user: User) {
		super(room, user, baseCommandAlias, pages);

		this.setCloseButton();

		const trainerCardRoom = Tournaments.getTrainerCardRoom(room);
		if (!trainerCardRoom) throw new Error("No trainer card room for " + room.title);
		this.trainerCardRoom = trainerCardRoom;

		this.newBadgeInput = new TrainerCardPrize(this, this.commandPrefix, newBadgeCommand, {
			onUpdateName: (output) => this.setNewBadgeName(output),
			onUpdateSource: (output) => this.setNewBadgeSource(output),
			onUpdateWidth: (output) => this.setNewBadgeWidth(output),
			onUpdateHeight: (output) => this.setNewBadgeHeight(output),
			reRender: () => this.send(),
		});

		this.updatedBadgeInput = new TrainerCardPrize(this, this.commandPrefix, updateBadgeCommand, {
			updating: true,
			onUpdateName: () => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			onUpdateSource: (output) => this.updateBadgeSource(output),
			onUpdateWidth: (output) => this.updateBadgeWidth(output),
			onUpdateHeight: (output) => this.updateBadgeHeight(output),
			reRender: () => this.send(),
		});

		this.newRibbonInput = new TrainerCardPrize(this, this.commandPrefix, newRibbonCommand, {
			onUpdateName: (output) => this.setNewRibbonName(output),
			onUpdateSource: (output) => this.setNewRibbonSource(output),
			onUpdateWidth: (output) => this.setNewRibbonWidth(output),
			onUpdateHeight: (output) => this.setNewRibbonHeight(output),
			reRender: () => this.send(),
		});

		this.updatedRibbonInput = new TrainerCardPrize(this, this.commandPrefix, updateRibbonCommand, {
			updating: true,
			onUpdateName: () => {}, // eslint-disable-line @typescript-eslint/no-empty-function
			onUpdateSource: (output) => this.updateRibbonSource(output),
			onUpdateWidth: (output) => this.updateRibbonWidth(output),
			onUpdateHeight: (output) => this.updateRibbonHeight(output),
			reRender: () => this.send(),
		});

		this.components = [this.newBadgeInput, this.updatedBadgeInput, this.newRibbonInput, this.updatedRibbonInput];
	}

	getDatabase(): IDatabase {
		return Storage.getDatabase(this.trainerCardRoom);
	}

	chooseBadges(): void {
		if (this.currentPicker === 'badges') return;

		this.currentPicker = 'badges';
		this.send();
	}

	chooseRibbons(): void {
		if (this.currentPicker === 'ribbons') return;

		this.currentPicker = 'ribbons';
		this.send();
	}

	setNewBadgeName(output: string): void {
		this.newBadgeName = output;
		this.send();
	}

	setNewBadgeSource(output: string): void {
		this.newBadgeSource = output;
		this.send();
	}

	setNewBadgeWidth(output: number): void {
		this.newBadgeWidth = output;
		this.send();
	}

	setNewBadgeHeight(output: number): void {
		this.newBadgeHeight = output;
		this.send();
	}

	setNewRibbonName(output: string): void {
		this.newRibbonName = output;
		this.send();
	}

	setNewRibbonSource(output: string): void {
		this.newRibbonSource = output;
		this.send();
	}

	setNewRibbonWidth(output: number): void {
		this.newRibbonWidth = output;
		this.send();
	}

	setNewRibbonHeight(output: number): void {
		this.newRibbonHeight = output;
		this.send();
	}

	updateBadgeSource(source: string): void {
		this.updatedBadgeSource = source;
		this.send();
	}

	updateBadgeWidth(output: number): void {
		this.updatedBadgeWidth = output;
		this.send();
	}

	updateBadgeHeight(output: number): void {
		this.updatedBadgeHeight = output;
		this.send();
	}

	updateRibbonSource(source: string): void {
		this.updatedRibbonSource = source;
		this.send();
	}

	updateRibbonWidth(output: number): void {
		this.updatedRibbonWidth = output;
		this.send();
	}

	updateRibbonHeight(output: number): void {
		this.updatedRibbonHeight = output;
		this.send();
	}

	startAddBadge(): void {
		if (this.currentPicker !== 'badges' || this.addingBadge) return;

		this.addingBadge = true;
		this.addBadgeError = "";

		this.newBadgeName = "";
		this.newBadgeSource = "";
		this.newBadgeWidth = DEFAULT_DIMENSIONS;
		this.newBadgeHeight = DEFAULT_DIMENSIONS;

		this.newBadgeInput.parentSetName("");
		this.newBadgeInput.parentSetSource("");
		this.newBadgeInput.parentSetWidth(DEFAULT_DIMENSIONS);
		this.newBadgeInput.parentSetHeight(DEFAULT_DIMENSIONS);

		this.send();
	}

	saveBadge(): void {
		if (this.currentPicker !== 'badges' || !this.addingBadge || !this.newBadgeName || !this.newBadgeSource || !this.newBadgeWidth ||
			!this.newBadgeHeight) return;

		const database = this.getDatabase();
		if (!database.tournamentTrainerCardBadges) database.tournamentTrainerCardBadges = {};

		const id = Tools.toId(this.newBadgeName);
		if (!id) {
			this.addBadgeError = "Badge names must have at least 1 alphanumeric character.";
			this.send();
			return;
		}

		if (id in database.tournamentTrainerCardBadges) {
			this.addBadgeError = "A badge with the name '" + database.tournamentTrainerCardBadges[id].name + "' already exists.";
			this.send();
			return;
		}

		this.addingBadge = false;
		this.addBadgeError = "";

		database.tournamentTrainerCardBadges[id] = {
			name: this.newBadgeName,
			source: this.newBadgeSource,
			width: this.newBadgeWidth,
			height: this.newBadgeHeight,
		};

		this.room.modnote(this.userName + " added a new badge with the source " + this.newBadgeSource);

		this.send();
	}

	startBadgeUpdate(id: string): void {
		if (this.currentPicker !== 'badges' || this.addingBadge || id === this.updatingBadgeId) return;

		const database = this.getDatabase();
		if (!database.tournamentTrainerCardBadges || !(id in database.tournamentTrainerCardBadges)) return;

		this.updatingBadgeId = id;

		const badge = database.tournamentTrainerCardBadges[id];
		this.updatedBadgeSource = badge.source;
		this.updatedBadgeWidth = badge.width;
		this.updatedBadgeHeight = badge.height;

		this.updatedBadgeInput.parentSetName(badge.name);
		this.updatedBadgeInput.parentSetSource(badge.source);
		this.updatedBadgeInput.parentSetWidth(badge.width);
		this.updatedBadgeInput.parentSetHeight(badge.height);

		this.send();
	}

	saveBadgeUpdate(): void {
		if (this.currentPicker !== 'badges' || !this.updatingBadgeId) return;

		const database = this.getDatabase();
		if (this.updatedBadgeSource !== database.tournamentTrainerCardBadges![this.updatingBadgeId].source) {
			this.room.modnote(this.userName + " updated the " + database.tournamentTrainerCardBadges![this.updatingBadgeId].name +
				" badge's source to " + this.updatedBadgeSource);
		}

		database.tournamentTrainerCardBadges![this.updatingBadgeId].source = this.updatedBadgeSource;
		database.tournamentTrainerCardBadges![this.updatingBadgeId].width = this.updatedBadgeWidth;
		database.tournamentTrainerCardBadges![this.updatingBadgeId].height = this.updatedBadgeHeight;

		this.updatingBadgeId = "";
		this.send();
	}

	cancelBadgeUpdate(): void {
		if (this.currentPicker !== 'badges' || !this.updatingBadgeId) return;

		this.updatingBadgeId = "";
		this.send();
	}

	startAddRibbon(): void {
		if (this.currentPicker !== 'ribbons' || this.addingRibbon) return;

		this.addingRibbon = true;
		this.addRibbonError = "";

		this.newRibbonName = "";
		this.newRibbonSource = "";
		this.newRibbonWidth = DEFAULT_DIMENSIONS;
		this.newRibbonHeight = DEFAULT_DIMENSIONS;

		this.newRibbonInput.parentSetName("");
		this.newRibbonInput.parentSetSource("");
		this.newRibbonInput.parentSetWidth(DEFAULT_DIMENSIONS);
		this.newRibbonInput.parentSetHeight(DEFAULT_DIMENSIONS);

		this.send();
	}

	saveRibbon(): void {
		if (this.currentPicker !== 'ribbons' || !this.addingRibbon || !this.newRibbonName || !this.newRibbonSource ||
			!this.newRibbonWidth || !this.newRibbonHeight) return;

		const database = this.getDatabase();
		if (!database.tournamentTrainerCardRibbons) database.tournamentTrainerCardRibbons = {};

		const id = Tools.toId(this.newRibbonName);
		if (!id) {
			this.addRibbonError = "Ribbon names must have at least 1 alphanumeric character.";
			this.send();
			return;
		}

		if (id in database.tournamentTrainerCardRibbons) {
			this.addRibbonError = "A ribbon with the name '" + database.tournamentTrainerCardRibbons[id].name + "' already exists.";
			this.send();
			return;
		}

		this.addingRibbon = false;
		this.addRibbonError = "";

		database.tournamentTrainerCardRibbons[id] = {
			name: this.newRibbonName,
			source: this.newRibbonSource,
			width: this.newRibbonWidth,
			height: this.newRibbonHeight,
		};

		this.room.modnote(this.userName + " added the " + this.newRibbonName + " ribbon with the source " + this.newRibbonSource);

		this.send();
	}

	startRibbonUpdate(id: string): void {
		if (this.currentPicker !== 'ribbons' || this.addingRibbon || id === this.updatingRibbonId) return;

		const database = this.getDatabase();
		if (!database.tournamentTrainerCardRibbons || !(id in database.tournamentTrainerCardRibbons)) return;

		this.updatingRibbonId = id;

		const ribbon = database.tournamentTrainerCardRibbons[id];
		this.updatedRibbonSource = ribbon.source;
		this.updatedRibbonWidth = ribbon.width;
		this.updatedRibbonHeight = ribbon.height;

		this.updatedRibbonInput.parentSetName(ribbon.name);
		this.updatedRibbonInput.parentSetSource(ribbon.source);
		this.updatedRibbonInput.parentSetWidth(ribbon.width);
		this.updatedRibbonInput.parentSetHeight(ribbon.height);

		this.send();
	}

	saveRibbonUpdate(): void {
		if (this.currentPicker !== 'ribbons' || !this.updatingRibbonId) return;

		const database = this.getDatabase();
		if (this.updatedRibbonSource !== database.tournamentTrainerCardRibbons![this.updatingRibbonId].source) {
			this.room.modnote(this.userName + " updated the " + database.tournamentTrainerCardRibbons![this.updatingRibbonId].name +
				" ribbon's source to " + this.updatedRibbonSource);
		}

		database.tournamentTrainerCardRibbons![this.updatingRibbonId].source = this.updatedRibbonSource;
		database.tournamentTrainerCardRibbons![this.updatingRibbonId].width = this.updatedRibbonWidth;
		database.tournamentTrainerCardRibbons![this.updatingRibbonId].height = this.updatedRibbonHeight;

		this.updatingRibbonId = "";
		this.send();
	}

	cancelRibbonUpdate(): void {
		if (this.currentPicker !== 'ribbons' || !this.updatingRibbonId) return;

		this.updatingRibbonId = "";
		this.send();
	}

	render(): string {
		let html = "<div class='chat' style='margin-top: 4px;margin-left: 4px'><center><b>" +
			this.room.title + " Tournament Trainer Card Prizes</b>";
		html += "&nbsp;" + this.closeButtonHtml;
		html += "</center>";
		html += "<br /><br />";
		html += this.getQuietPmButton(this.commandPrefix + ", " + chooseBadgesCommand,
			"Badges", {disabled: this.currentPicker === 'badges'});
		html += "&nbsp;|&nbsp;";
		html += this.getQuietPmButton(this.commandPrefix + ", " + chooseRibbonsCommand,
			"Ribbons", {disabled: this.currentPicker === 'ribbons'});
		html += "<br /><br />";

		const database = this.getDatabase();

		if (this.currentPicker === 'badges') {
			html += "<b>Badges</b>:";
			html += "<br /><br />";

			if (database.tournamentTrainerCardBadges) {
				for (const i in database.tournamentTrainerCardBadges) {
					html += database.tournamentTrainerCardBadges[i].name + ":&nbsp;" + Tournaments.getBadgeHtml(database, i);
					html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + startBadgeUpdateCommand + "," + i,
						"Edit", {disabled: i === this.updatingBadgeId});
					html += "<br />";
				}

				html += "<br /><br />";
			}

			if (this.addingBadge) {
				html += "<b>New badge</b>:";
				html += "<br />";
				html += this.newBadgeInput.render();

				if (this.newBadgeSource) {
					html += "<br />";
					html += "Preview:";
					html += "<img src='" + this.newBadgeSource + "' width=" + this.newBadgeWidth + "px height=" +
						this.newBadgeHeight + "px />";
					html += "<br /><br />";
				}

				html += this.getQuietPmButton(this.commandPrefix + ", " + saveBadgeCommand,
						"Save", {disabled: !this.newBadgeName || !this.newBadgeSource || !this.newBadgeWidth || !this.newBadgeHeight});
			} else if (this.updatingBadgeId) {
				html += "<b>Update " + database.tournamentTrainerCardBadges![this.updatingBadgeId].name + " badge</b>:";
				html += "<br />";
				html += this.updatedBadgeInput.render();
				html += "<br />";

				if (this.updatedBadgeSource) {
					html += "Preview:";
					html += "<img src='" + this.updatedBadgeSource + "' width=" + this.updatedBadgeWidth + "px height=" +
						this.updatedBadgeHeight + "px />";
					html += "<br /><br />";
				}

				html += this.getQuietPmButton(this.commandPrefix + ", " + cancelBadgeUpdateCommand, "Cancel");
				html += "&nbsp;|&nbsp;";
				html += this.getQuietPmButton(this.commandPrefix + ", " + saveBadgeUpdateCommand,
					"Save", {disabled: !this.updatedBadgeSource || !this.updatedBadgeWidth || !this.updatedBadgeHeight});
			} else {
				html += this.getQuietPmButton(this.commandPrefix + ", " + startAddBadgeCommand, "Add new badge");
			}
		} else if (this.currentPicker === 'ribbons') { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			html += "<b>Ribbons</b>:";
			html += "<br /><br />";

			if (database.tournamentTrainerCardRibbons) {
				for (const i in database.tournamentTrainerCardRibbons) {
					html += database.tournamentTrainerCardRibbons[i].name + ":&nbsp;" +
						Tournaments.getRibbonHtml(this.trainerCardRoom, database, i);
					html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + startRibbonUpdateCommand + "," + i,
						"Edit", {disabled: i === this.updatingRibbonId});
					html += "<br />";
				}

				html += "<br /><br />";
			}

			if (this.addingRibbon) {
				html += "<b>New ribbon</b>:";
				html += "<br />";
				html += this.newRibbonInput.render();

				if (this.newRibbonSource) {
					html += "<br />";
					html += "Preview:";
					html += "<img src='" + this.newRibbonSource + "' width=" + this.newRibbonWidth + "px height=" +
						this.newRibbonHeight + "px />";
					html += "<br /><br />";
				}

				html += this.getQuietPmButton(this.commandPrefix + ", " + saveRibbonCommand,
						"Save", {disabled: !this.newRibbonName || !this.newRibbonSource || !this.newRibbonWidth || !this.newRibbonHeight});
			} else if (this.updatingRibbonId) {
				html += "<b>Update " + database.tournamentTrainerCardRibbons![this.updatingRibbonId].name + " ribbon</b>:";
				html += "<br />";
				html += this.updatedRibbonInput.render();
				html += "<br />";

				if (this.updatedRibbonSource) {
					html += "Preview:";
					html += "<img src='" + this.updatedRibbonSource + "' width=" + this.updatedRibbonWidth + "px height=" +
						this.updatedRibbonHeight + "px />";
					html += "<br /><br />";
				}

				html += this.getQuietPmButton(this.commandPrefix + ", " + cancelRibbonUpdateCommand, "Cancel");
				html += "&nbsp;|&nbsp;";
				html += this.getQuietPmButton(this.commandPrefix + ", " + saveRibbonUpdateCommand,
					"Save", {disabled: !this.updatedRibbonSource || !this.updatedRibbonWidth || !this.updatedRibbonHeight});
			} else {
				html += this.getQuietPmButton(this.commandPrefix + ", " + startAddRibbonCommand, "Add new ribbon");
			}
		}

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

			if (!user.hasRank(targetRoom, 'driver') && !user.isDeveloper()) return;

			const cmd = Tools.toId(targets[0]);
			targets.shift();

			if (!cmd) {
				new TournamentPrizeManager(targetRoom, user).open();
				return;
			}

			if (!(user.id in pages) && cmd !== CLOSE_COMMAND) new TournamentPrizeManager(targetRoom, user);

			if (cmd === chooseBadgesCommand) {
				pages[user.id].chooseBadges();
			} else if (cmd === chooseRibbonsCommand) {
				pages[user.id].chooseRibbons();
			} else if (cmd === startAddBadgeCommand) {
				pages[user.id].startAddBadge();
			} else if (cmd === saveBadgeCommand) {
				pages[user.id].saveBadge();
			} else if (cmd === startBadgeUpdateCommand) {
				pages[user.id].startBadgeUpdate(targets[0]);
			} else if (cmd === cancelBadgeUpdateCommand) {
				pages[user.id].cancelBadgeUpdate();
			} else if (cmd === saveBadgeUpdateCommand) {
				pages[user.id].saveBadgeUpdate();
			} else if (cmd === startAddRibbonCommand) {
				pages[user.id].startAddRibbon();
			} else if (cmd === saveRibbonCommand) {
				pages[user.id].saveRibbon();
			} else if (cmd === startRibbonUpdateCommand) {
				pages[user.id].startRibbonUpdate(targets[0]);
			} else if (cmd === cancelRibbonUpdateCommand) {
				pages[user.id].cancelRibbonUpdate();
			} else if (cmd === saveRibbonUpdateCommand) {
				pages[user.id].saveRibbonUpdate();
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
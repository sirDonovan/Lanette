import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { IDatabase, ITournamentTrainerCard } from "../types/storage";
import type { User } from "../users";
import { TrainerPicker } from "./components/trainer-picker";
import type { ITrainerPick } from "./components/trainer-picker";
import { HtmlPageBase } from "./html-page-base";
import { FormatTextInput } from "./components/format-text-input";
import type { IFormat } from "../types/pokemon-showdown";
import { TrainerCardBadgePicker } from "./components/trainer-card-badge-picker";
import { TextInput } from "./components/text-input";

const baseCommand = 'tournamenttrainercard';
const baseCommandAlias = 'ttc';
const staffEditCommand = 'staffedit';

const previewCommand = 'preview';
const chooseTrainerPicker = 'choosetrainerpicker';
const chooseFormatPicker = 'chooseformatpicker';
const chooseBadgesView = 'choosebadgesview';
const chooseBioView = 'choosebioview';
const setFormatCommand = 'setformat';
const setTrainerCommand = 'settrainer';
const setBadgesCommand = 'setbadges';
const setBioCommand = 'setbio';
const closeCommand = 'close';

const pageId = 'tournament-trainer-card';

export const id = pageId;
export const pages: Dict<TournamentTrainerCard> = {};

class TournamentTrainerCard extends HtmlPageBase {
	pageId = pageId;

	currentPicker: 'badges' | 'bio' | 'format' | 'trainer' = 'trainer';

	bioInput: TextInput;
	formatPicker: FormatTextInput;
	trainerPicker: TrainerPicker;
	trainerCardBadgePicker: TrainerCardBadgePicker;
	targetUserId: string;

	constructor(room: Room, user: User, targetUserId?: string) {
		super(room, user, baseCommand);

		this.targetUserId = targetUserId || this.userId;

		const database = Storage.getDatabase(this.room);
		let trainerCard: ITournamentTrainerCard | undefined;
		if (database.tournamentTrainerCards && this.targetUserId in database.tournamentTrainerCards) {
			trainerCard = database.tournamentTrainerCards[this.targetUserId];
		}

		this.trainerPicker = new TrainerPicker(room, this.commandPrefix, setTrainerCommand, {
			currentPick: trainerCard ? trainerCard.avatar : undefined,
			onSetTrainerGen: (index, trainerGen, dontRender) => this.setTrainerGen(dontRender),
			onClear: (index, dontRender) => this.clearTrainer(dontRender),
			onPick: (index, trainer, dontRender) => this.selectTrainer(trainer, dontRender),
			reRender: () => this.send(),
		});
		this.trainerPicker.active = true;

		let format: IFormat | undefined;
		if (trainerCard && trainerCard.favoriteFormat) {
			format = Dex.getFormat(trainerCard.favoriteFormat);
		}

		this.formatPicker = new FormatTextInput(room, this.commandPrefix, setFormatCommand, {
			currentInput: format ? format.nameWithoutGen : "",
			inputWidth: Tools.minRoomWidth,
			placeholder: "Enter a format",
			maxFormats: 1,
			nameWithoutGen: true,
			onClear: () => this.clearFormatInput(),
			onErrors: () => this.send(),
			onSubmit: (output) => this.submitFormatInput(output),
			reRender: () => this.send(),
		});
		this.formatPicker.active = false;

		this.trainerCardBadgePicker = new TrainerCardBadgePicker(room, this.commandPrefix, setBadgesCommand, {
			currentPicks: trainerCard ? trainerCard.badges : undefined,
			maxPicks: 0,
			onClear: (index, dontRender) => this.clearBadges(dontRender),
			onPick: (index, badge, dontRender) => this.addBadge(badge, dontRender),
			onUnPick: (index, badge, dontRender) => this.removeBadge(badge, dontRender),
			reRender: () => this.send(),
		});
		this.trainerCardBadgePicker.active = false;

		this.bioInput = new TextInput(room, this.commandPrefix, setBioCommand, {
			placeholder: "Enter bio",
			stripHtmlCharacters: true,
			onClear: () => this.clearBio(),
			onErrors: () => this.send(),
			onSubmit: (output) => this.setBio(output),
			reRender: () => this.send(),
		});
		this.bioInput.active = false;

		this.components = [this.trainerPicker, this.formatPicker, this.trainerCardBadgePicker, this.bioInput];

		pages[this.userId] = this;
	}

	onClose(): void {
		delete pages[this.userId];
	}

	getDatabase(): IDatabase {
		let targetRoom = this.room;
		if (Config.sharedTournamentTrainerCards && this.room.id in Config.sharedTournamentTrainerCards) {
			targetRoom = Rooms.get(Config.sharedTournamentTrainerCards[this.room.id])!;
		}

		const database = Storage.getDatabase(targetRoom);
		Storage.createTournamentTrainerCard(database, this.targetUserId);

		return database;
	}

	chooseTrainerPicker(): void {
		if (this.currentPicker === 'trainer') return;

		this.trainerPicker.active = true;
		this.formatPicker.active = false;
		this.trainerCardBadgePicker.active = false;
		this.bioInput.active = false;
		this.currentPicker = 'trainer';

		this.send();
	}

	chooseFormatPicker(): void {
		if (this.currentPicker === 'format') return;

		this.formatPicker.active = true;
		this.trainerPicker.active = false;
		this.trainerCardBadgePicker.active = false;
		this.bioInput.active = false;
		this.currentPicker = 'format';

		this.send();
	}

	chooseBadgesView(): void {
		if (!this.isRoomStaff || this.currentPicker === 'badges') return;

		this.trainerCardBadgePicker.active = true;
		this.formatPicker.active = false;
		this.trainerPicker.active = false;
		this.bioInput.active = false;
		this.currentPicker = 'badges';

		this.send();
	}

	chooseBioView(): void {
		if (!this.isRoomStaff || this.currentPicker === 'bio') return;

		this.bioInput.active = true;
		this.formatPicker.active = false;
		this.trainerPicker.active = false;
		this.trainerCardBadgePicker.active = false;
		this.currentPicker = 'bio';

		this.send();
	}

	setTrainerGen(dontRender?: boolean): void {
		if (!dontRender) this.send();
	}

	clearTrainer(dontRender?: boolean): void {
		const database = this.getDatabase();
		delete database.tournamentTrainerCards![this.targetUserId].avatar;

		if (!dontRender) this.send();
	}

	selectTrainer(trainer: ITrainerPick, dontRender?: boolean): void {
		const database = this.getDatabase();
		database.tournamentTrainerCards![this.targetUserId].avatar = trainer.trainer;

		if (!dontRender) this.send();
	}

	clearFormatInput(): void {
		const database = this.getDatabase();
		delete database.tournamentTrainerCards![this.targetUserId].favoriteFormat;

		this.send();
	}

	submitFormatInput(output: string): void {
		const database = this.getDatabase();
		database.tournamentTrainerCards![this.targetUserId].favoriteFormat = output;

		this.send();
	}

	clearBadges(dontRender?: boolean): void {
		const database = this.getDatabase();
		delete database.tournamentTrainerCards![this.targetUserId].badges;

		if (!dontRender) this.send();
	}

	addBadge(badge: string, dontRender?: boolean): void {
		const database = this.getDatabase();
		if (!database.tournamentTrainerCards![this.targetUserId].badges) database.tournamentTrainerCards![this.targetUserId].badges = [];
		if (!database.tournamentTrainerCards![this.targetUserId].badges!.includes(badge)) {
			database.tournamentTrainerCards![this.targetUserId].badges!.push(badge);
		}

		if (!dontRender) this.send();
	}

	removeBadge(badge: string, dontRender?: boolean): void {
		const database = this.getDatabase();
		if (database.tournamentTrainerCards![this.targetUserId].badges) {
			const index = database.tournamentTrainerCards![this.targetUserId].badges!.indexOf(badge);
			if (index !== -1) database.tournamentTrainerCards![this.targetUserId].badges!.splice(index, 1);
		}

		if (!dontRender) this.send();
	}

	clearBio(): void {
		const database = this.getDatabase();
		delete database.tournamentTrainerCards![this.targetUserId].bio;

		this.send();
	}

	setBio(bio: string): void {
		const database = this.getDatabase();
		database.tournamentTrainerCards![this.targetUserId].bio = bio;

		this.room.modnote(this.userName + " set " + (this.userId === this.targetUserId ? "their" : this.targetUserId + "'s") +
			" tournament trainer card bio to '" + bio + "'");

		this.send();
	}

	render(): string {
		let name = this.targetUserId;
		const user = Users.get(this.targetUserId);
		if (user) name = user.name;

		let html = "<div class='chat' style='margin-top: 4px;margin-left: 4px'><center><b>" + this.room.title + ": Tournament Trainer " +
			"Card</b>";
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + closeCommand, "Close");

		html += "<br />";
		const currentCard = Tournaments.getTrainerCardHtml(this.room, name);
		if (currentCard) {
			html += currentCard;
		} else {
			html += "<br /><b>Select a format or trainer to see your preview</b>!";
		}
		html += "<br />";
		html += "</center>";

		const trainer = this.currentPicker === 'trainer';
		const format = this.currentPicker === 'format';
		const badges = this.currentPicker === 'badges';
		const bio = this.currentPicker === 'bio';

		html += "<b>Options</b>:<br />";
		html += this.getQuietPmButton(this.commandPrefix + ", " + chooseTrainerPicker, "Trainer", trainer);
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseFormatPicker, "Format", format);
		if (this.isRoomStaff) {
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseBadgesView, "Badges", badges);
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseBioView, "Bio", bio);
		}
		html += "<br /><br />";

		if (trainer) {
			html += this.trainerPicker.render();
		} else if (format) {
			html += this.formatPicker.render();
		} else if (badges) {
			html += this.trainerCardBadgePicker.render();
		} else if (bio) {
			html += this.bioInput.render();
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

			if (!Config.showTournamentTrainerCards || !Config.showTournamentTrainerCards.includes(targetRoom.id)) {
				return this.say("Tournament trainer cards are not enabled for " + targetRoom.title + ".");
			}

			if (Config.sharedTournamentTrainerCards && targetRoom.id in Config.sharedTournamentTrainerCards &&
				!Rooms.get(Config.sharedTournamentTrainerCards[targetRoom.id])) {
				return this.say("Tournament trainer cards cannot currently be viewed for " + targetRoom.title + ".");
			}

			const cmd = Tools.toId(targets[0]);
			targets.shift();

			if (!cmd) {
				new TournamentTrainerCard(targetRoom, user).open();
			} else if (cmd === 'view' || cmd === 'show' || cmd === previewCommand) {
				const trainerCard = Tournaments.getTrainerCardHtml(targetRoom, user.name);
				if (!trainerCard) return this.say("You do not have a tournament trainer card.");
				targetRoom.pmUhtml(user, targetRoom.id + "-tournament-trainer-card", trainerCard);
			} else if (cmd === chooseTrainerPicker) {
				if (!(user.id in pages)) new TournamentTrainerCard(targetRoom, user);
				pages[user.id].chooseTrainerPicker();
			} else if (cmd === chooseFormatPicker) {
				if (!(user.id in pages)) new TournamentTrainerCard(targetRoom, user);
				pages[user.id].chooseFormatPicker();
			} else if (cmd === chooseBadgesView) {
				if (!user.hasRank(targetRoom, 'driver') && !user.isDeveloper()) return;

				if (!(user.id in pages)) {
					return this.say("You must first use ``" + Config.commandCharacter + baseCommandAlias + " " + staffEditCommand +
						", [user]`` to open the panel.");
				}
				pages[user.id].chooseBadgesView();
			} else if (cmd === chooseBioView) {
				if (!user.hasRank(targetRoom, 'driver') && !user.isDeveloper()) return;

				if (!(user.id in pages)) {
					return this.say("You must first use ``" + Config.commandCharacter + baseCommandAlias + " " + staffEditCommand +
						", [user]`` to open the panel.");
				}
				pages[user.id].chooseBioView();
			} else if (cmd === closeCommand) {
				if (!(user.id in pages)) new TournamentTrainerCard(targetRoom, user);
				pages[user.id].close();
				delete pages[user.id];
			} else if (cmd === staffEditCommand) {
				if (!user.hasRank(targetRoom, 'driver') && !user.isDeveloper()) return;

				const targetUserId = Tools.toId(targets[0]);
				if (!Tools.isUsernameLength(targetUserId)) return this.say(CommandParser.getErrorText(['invalidUsernameLength']));
				new TournamentTrainerCard(targetRoom, user, targetUserId).open();
			} else {
				if (!(user.id in pages)) new TournamentTrainerCard(targetRoom, user);
				const error = pages[user.id].checkComponentCommands(cmd, targets);
				if (error) this.say(error);
			}
		},
		aliases: [baseCommandAlias],
	},
};
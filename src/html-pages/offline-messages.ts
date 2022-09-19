import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { IOfflineMessage } from "../types/storage";
import type { TimeZone } from "../types/tools";
import type { User } from "../users";
import { CLOSE_COMMAND, HtmlPageBase } from "./html-page-base";

const EXPIRATION_DAYS = 30;
const MESSAGE_EXPIRATION_TIME = EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

const baseCommand = 'offlinemessages';
const reReadCommand = 'readmail';
const newMessagesCommand = 'newmessages';
const oldMessagesCommand = 'oldmessages';
const discardedMessagesCommand = 'discardedmessages';
const timezoneCommand = 'timezone';
const dateCommand = 'date';
const discardCommand = 'discard';
const undoDiscardCommand = 'undodiscard';

export const pageId = 'offline-messages';
export const pages: Dict<OfflineMessages> = {};

class OfflineMessages extends HtmlPageBase {
	pageId = pageId;

	allMessages: readonly IOfflineMessage[] = [];
	dateOptions: string[] = [];
	discardedMessages: IOfflineMessage[] = [];
	displayedMessagesByDate: Dict<string> = {};
	globalRoomPage = true;
	hoursOffset: number = 0;
	oldMessages: IOfflineMessage[] = [];
	messagesPage: number = 0;
	messageType: 'new' | 'old' | 'discarded' = 'new';
	minutesOffset: number = 0;
	newMessages: IOfflineMessage[] = [];
	selectedDate: string = '';

	timezone: TimeZone;

	constructor(room: Room, user: User) {
		super(room, user, baseCommand, pages);

		this.commandPrefix = Config.commandCharacter + baseCommand;
		this.setCloseButton();

		const database = Storage.getGlobalDatabase();
		const timezone = database.offlineMessages![this.userId].timezone;
		if (timezone && Tools.timezones.includes(timezone)) {
			this.timezone = timezone;
		} else {
			this.timezone = this.getSelfTimezone();
		}

		this.calculateTimezoneOffsets();
		this.sortMessages(true);
	}

	sortMessages(onOpen?: boolean): void {
		const database = Storage.getGlobalDatabase();

		this.newMessages = [];
		this.oldMessages = [];
		this.discardedMessages = [];

		const expiredMessages: IOfflineMessage[] = [];
		const now = Date.now();
		const expiredTime = now - MESSAGE_EXPIRATION_TIME;
		for (const message of database.offlineMessages![this.userId].messages) {
			let newMessage = false;
			if (!message.readTime) {
				newMessage = true;
				message.readTime = now;
			}

			if (message.readTime <= expiredTime) {
				expiredMessages.push(message);
				continue;
			}

			if (Client.checkFilters(message.message)) continue;

			if (newMessage) {
				this.newMessages.unshift(message);
			} else if (message.discarded) {
				this.discardedMessages.unshift(message);
			} else {
				this.oldMessages.unshift(message);
			}
		}

		for (const message of expiredMessages) {
			database.offlineMessages![this.userId].messages.splice(database.offlineMessages![this.userId].messages.indexOf(message), 1);
		}

		this.allMessages = database.offlineMessages![this.userId].messages;

		if (onOpen) this.messageType = this.newMessages.length ? 'new' : 'old';

		this.preRenderMessages();
	}

	discardOrUndoDiscard(): void {
		this.sortMessages();
		this.send();
	}

	selectNewMessages(): void {
		if (this.messageType === 'new') return;

		this.messageType = 'new';
		this.selectedDate = '';
		this.preRenderMessages();
		this.send();
	}

	selectOldMessages(): void {
		if (this.messageType === 'old') return;

		this.messageType = 'old';
		this.selectedDate = '';
		this.preRenderMessages();
		this.send();
	}

	selectDiscardedMessages(): void {
		if (this.messageType === 'discarded') return;

		this.messageType = 'discarded';
		this.selectedDate = '';
		this.preRenderMessages();
		this.send();
	}

	getSelfTimezone(): TimeZone {
		const dateString = new Date().toString();
		const getSelfTimezone = dateString.substr(dateString.indexOf("GMT"), 8);
		return getSelfTimezone.substr(0, getSelfTimezone.length - 2) + ":" + getSelfTimezone.substr(-2) as TimeZone;
	}

	calculateTimezoneOffsets(): void {
		this.hoursOffset = 0;
		this.minutesOffset = 0;

		const selfTimezone = this.getSelfTimezone();
		if (selfTimezone !== this.timezone) {
			let selfTimezoneOffset = new Date().getTimezoneOffset();
			const selfPositive = selfTimezoneOffset >= 0;
			while (selfTimezoneOffset && selfTimezoneOffset % 60 === 0) {
				this.hoursOffset += selfPositive ? 1 : -1;
				selfTimezoneOffset += selfPositive ? -60 : 60;
			}
			this.minutesOffset = selfTimezoneOffset;

			const positive = this.timezone.charAt(3) === '+';
			const hours = parseInt(this.timezone.substr(4, 2));
			const minutes = parseInt(this.timezone.substr(7, 2));

			this.hoursOffset += positive ? hours : -hours;
			this.minutesOffset += positive ? minutes : -minutes;
		}
	}

	setTimezone(timezone: TimeZone): void {
		const database = Storage.getGlobalDatabase();
		if (database.offlineMessages![this.userId].timezone === timezone && this.timezone === timezone) return;

		database.offlineMessages![this.userId].timezone = timezone;
		this.timezone = timezone;

		this.calculateTimezoneOffsets();
		this.preRenderMessages();
		this.send();
	}

	setDate(date: string): boolean {
		if (!this.dateOptions.includes(date)) return false;

		if (this.selectedDate !== date) {
			this.selectedDate = date;
			this.send();
		}

		return true;
	}

	preRenderMessages(): void {
		const oldMessages = this.messageType === 'old';
		const discardMessages = this.messageType === 'discarded';

		const names: Dict<string> = {};
		const messagesByDateAndUser: Dict<Dict<IOfflineMessage[]>> = {};
		const messagesHtml = new Map<IOfflineMessage, string>();

		let displayedMessages: IOfflineMessage[];
		if (this.messageType === 'new') {
			displayedMessages = this.newMessages;
		} else if (this.messageType === 'old') {
			displayedMessages = this.oldMessages;
		} else {
			displayedMessages = this.discardedMessages;
		}

		const sortedMessages = displayedMessages.slice();
		sortedMessages.sort((a, b) => b.sentTime - a.sentTime);

		for (const message of sortedMessages) {
			const date = new Date(message.sentTime);
			if (this.hoursOffset) date.setUTCHours(date.getUTCHours() + this.hoursOffset);
			if (this.minutesOffset) date.setUTCMinutes(date.getUTCMinutes() + this.minutesOffset);

			let timeString = date.toTimeString();
			timeString = timeString.substr(0, timeString.indexOf(' ')).trim();

			const senderId = Tools.toId(message.sender);
			if (!(senderId in names)) names[senderId] = message.sender;

			let html = '<div class="chat">';
			if (oldMessages) {
				html += this.getQuietPmButton(this.commandPrefix + " " + discardCommand + ", " +
					this.allMessages.indexOf(message), '<i class="fa fa-trash"></i>') + '&nbsp;';
			} else if (discardMessages) {
				html += this.getQuietPmButton(this.commandPrefix + " " + undoDiscardCommand + ", " +
					this.allMessages.indexOf(message), '<i class="fa fa-undo"></i>') + '&nbsp;';
			}
			html += '<small>[' + timeString + '] </small><username>' + names[senderId] + ':</username> <em>' +
				Tools.escapeHTML(message.message) + '</em></div>';

			messagesHtml.set(message, html);

			const dateString = date.toDateString();
			if (!(dateString in messagesByDateAndUser)) messagesByDateAndUser[dateString] = {};

			if (!(senderId in messagesByDateAndUser[dateString])) messagesByDateAndUser[dateString][senderId] = [];
			messagesByDateAndUser[dateString][senderId].push(message);
		}

		const messagesByDate: Dict<string> = {};
		for (const date in messagesByDateAndUser) {
			let html = '<h3>' + date + '</h3>';
			const users = messagesByDateAndUser[date];
			for (const user in users) {
				html += '<div class="pm-window"><div class="pm-log">' +
					'<div class="inner">';
				for (const message of users[user]) {
					html += messagesHtml.get(message);
				}
				html += '</div></div></div>';
			}

			messagesByDate[date] = html;
		}

		this.displayedMessagesByDate = messagesByDate;
		this.dateOptions = Object.keys(this.displayedMessagesByDate);

		if (!this.selectedDate) {
			this.selectedDate = this.dateOptions[0];
		} else if (!this.dateOptions.includes(this.selectedDate)) {
			this.selectedDate = this.dateOptions[this.dateOptions.length - 1];
		}
	}

	render(): string {
		const database = Storage.getGlobalDatabase();

		let html = "<div class='chat' style='margin-top: 4px;margin-left: 4px'><center><b>Your Offline Messages</b>";
		html += "&nbsp;" + this.closeButtonHtml;
		html += "<br />Re-read them at any time by PMing " + Users.self.name + " the command <code>" + Config.commandCharacter +
			reReadCommand + "</code>";
		html += "<br />(messages are permanently deleted <b>" + EXPIRATION_DAYS + " days</b> after you receive them)</center>";
		html += "<br /><br />";

		if (!database.offlineMessages![this.userId].messages.length) {
			html += "<b>You have no messages!</b>";
		} else {
			const showingNew = this.messageType === 'new';
			const showingOld = this.messageType === 'old';
			const showingDiscarded = this.messageType === 'discarded';

			html += "<b>Message type</b>: ";
			html += this.getQuietPmButton(this.commandPrefix + " " + newMessagesCommand, "New",
				{selectedAndDisabled: showingNew}) + "&nbsp;";
			html += this.getQuietPmButton(this.commandPrefix + " " + oldMessagesCommand, "Old",
				{selectedAndDisabled: showingOld}) + "&nbsp;";
			html += this.getQuietPmButton(this.commandPrefix + " " + discardedMessagesCommand, "Discarded",
				{selectedAndDisabled: showingDiscarded});

			html += "<br /><br /><details><summary><b>Set your timezone</b> (currently " + this.timezone + "):</summary>";
			let rowCount = 0;
			for (const timezone of Tools.timezones) {
				html += this.getQuietPmButton(this.commandPrefix + " " + timezoneCommand + ", " + timezone, timezone,
					{selectedAndDisabled: this.timezone === timezone}) + "&nbsp;";
				rowCount++;
				if (rowCount === 6) {
					html += "<br />";
					rowCount = 0;
				}
			}
			html += "</details><hr />";

			if (this.dateOptions.length) {
				html += "<h3>";
				if (this.messageType === 'new') {
					html += "New";
				} else if (this.messageType === 'old') {
					html += "Old";
				} else {
					html += "Discarded";
				}
				html += " Messages</h3>";

				html += "<b>Date</b>: ";
				for (const date of this.dateOptions) {
					html += this.getQuietPmButton(this.commandPrefix + " " + dateCommand + ", " + date, date,
						{selectedAndDisabled: this.selectedDate === date}) + "&nbsp;";
				}
				html += "<br /><div class='pmbox'>" + this.displayedMessagesByDate[this.selectedDate] + "</div>";
			} else {
				html += "<b>You have no " + this.messageType + " messages!</b>";
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
			const botRoom = user.getBotRoom();
			if (!botRoom) return this.say(CommandParser.getErrorText(['noBotRankRoom']));

			const cmd = Tools.toId(targets[0]);
			targets.shift();

			Storage.createOfflineMessagesEntry(user.name);

			if (!cmd) {
				new OfflineMessages(botRoom, user).open();
				return;
			}

			if (!(user.id in pages) && cmd !== CLOSE_COMMAND) new OfflineMessages(botRoom, user);

			if (cmd === newMessagesCommand) {
				pages[user.id].selectNewMessages();
			} else if (cmd === oldMessagesCommand) {
				pages[user.id].selectOldMessages();
			} else if (cmd === discardedMessagesCommand) {
				pages[user.id].selectDiscardedMessages();
			} else if (cmd === timezoneCommand) {
				const timezone = targets[0].trim() as TimeZone;
				if (!Tools.timezones.includes(timezone)) return this.say("Invalid timezone.");

				pages[user.id].setTimezone(timezone);
			} else if (cmd === discardCommand || cmd === undoDiscardCommand) {
				const database = Storage.getGlobalDatabase();
				if (!database.offlineMessages || !(user.id in database.offlineMessages)) {
					return this.say("You do not have any offline messages.");
				}

				const index = parseInt(targets[0].trim());
				if (isNaN(index) || index < 0 || index >= database.offlineMessages[user.id].messages.length) {
					return this.say("Invalid message index.");
				}

				database.offlineMessages[user.id].messages[index].discarded = cmd === discardCommand ? true : false;

				pages[user.id].discardOrUndoDiscard();
			} else if (cmd === dateCommand) {
				if (!pages[user.id].setDate(targets[0].trim())) this.say("Invalid date.");
			} else if (cmd === CLOSE_COMMAND) {
				if (user.id in pages) pages[user.id].close();
			} else {
				this.say("Unknown sub-command '" + cmd + "'.");
			}
		},
		aliases: [reReadCommand, 'readofflinemessages', 'checkofflinemessages', 'checkmail', 'inbox', 'mailbox'],
	},
};
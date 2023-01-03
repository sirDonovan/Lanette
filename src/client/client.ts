import fs = require('fs');
import path = require('path');

import type { ScriptedGame } from '../room-game-scripted';
import type { UserHostedGame } from '../room-game-user-hosted';
import type { Room } from '../rooms';
import type {
	GroupName, IClientMessageTypes, IMessageParserFile, IOutgoingMessage, IRoomInfoResponse, IRoomsResponse,
	IServerGroup, ITournamentMessageTypes, QueryResponseType, ServerGroupData, IUserDetailsResponse,
	UserDetailsListener, IServerUserSettings, IParsedIncomingMessage
} from '../types/client';
import type { ISeparatedCustomRules } from '../types/dex';
import type { RoomType } from '../types/rooms';
import type { IExtractedBattleId } from '../types/tools';
import type { ITournamentEndJson, ITournamentUpdateJson } from '../types/tournaments';
import type { User } from '../users';
import { Filters } from './filters';
import { Websocket } from './websocket';

const BOT_GREETING_COOLDOWN = 6 * 60 * 60 * 1000;
const CODE_COMMAND = '!code';
const BOT_MESSAGE_COMMAND = '/botmsg ';
const INVITE_COMMAND = '/invite ';
const HTML_CHAT_COMMAND = '/raw ';
const UHTML_CHAT_COMMAND = '/uhtml ';
const UHTML_CHANGE_CHAT_COMMAND = '/uhtmlchange ';
const ANNOUNCE_CHAT_COMMAND = '/announce ';
const REQUEST_PM_LOG_COMMAND = '/text **PM log requested**: Do you allow staff to see PM logs between ';
const ALLOWED_PM_LOG = '/text PM log approved: Staff may check PM logs between ';
const HANGMAN_START_COMMAND = "/log A game of hangman was started by ";
const HANGMAN_END_COMMAND = "/log (The game of hangman was ended by ";
const TOURNAMENT_AUTOSTART_COMMAND = "/log (The tournament was set to autostart when the player cap is reached by ";
const TOURNAMENT_AUTODQ_COMMAND = "/log (The tournament auto disqualify timer was set to ";
const TOURNAMENT_FORCEPUBLIC_COMMAND = "/log (Tournament public battles were turned ON by ";
const TOURNAMENT_SCOUTING_COMMAND = "/log (The tournament was set to disallow scouting by ";
const TOURNAMENT_MODJOIN_COMMAND = "/log (The tournament was set to disallow modjoin by ";
const TOURNAMENT_FORCE_TIMER_COMMAND = "/log (The timer was turned on for the tournament by ";
const TOURNAMENT_END_COMMAND = "forcibly ended a tournament.)";
const TOURNAMENT_RUNAUTODQ_COMMAND = "All available matches were checked for automatic disqualification.";
const HANGMAN_END_RAW_MESSAGE = "The game of hangman was ended.";
const NOTIFY_USER_MESSAGE = "Sent a notification to ";
const NOTIFY_OFF_USER_MESSAGE = "Closed the notification previously sent to ";
const HIGHLIGHT_HTML_PAGE_MESSAGE = "Sent a highlight to ";
const PRIVATE_HTML_MESSAGE = "Sent private HTML to ";
const CHAT_ERROR_MESSAGE = "/error ";
const USER_NOT_FOUND_MESSAGE = "/error User ";
const UNREGISTERED_USER_MESSAGE = "/error That user is unregistered and cannot be PMed.";
const USER_BLOCKING_PMS_MESSAGE = "/error This user is blocking private messages right now.";
const STAFF_BLOCKING_PMS_MESSAGE = "is too busy to answer private messages right now. Please contact a different staff member.";
const BLOCK_CHALLENGES_COMMAND = "/text You are now blocking all incoming challenge requests.";
const ALREADY_BLOCKING_CHALLENGES_COMMAND = "/error You are already blocking challenges!";
const AVATAR_COMMAND = "/text Avatar changed to:";
const ROLL_COMMAND_HELP = "/text /dice ";

const DATA_COMMANDS: string[] = [
	'rollmove', 'randmove', 'randommove', 'rollpokemon', 'randpoke', 'randompokemon',
	'data', 'pstats', 'stats', 'dex', 'pokedex',
	'dt', 'dt1', 'dt2', 'dt3', 'dt4', 'dt5', 'dt6', 'dt7', 'dt8', 'details',
	'ds', 'ds1', 'ds2', 'ds3', 'ds4', 'ds5', 'ds6', 'ds7', 'ds8', 'dsearch', 'nds', 'dexsearch',
	'ms', 'ms1', 'ms2', 'ms3', 'ms4', 'ms5', 'ms6', 'ms7', 'ms8', 'msearch', 'nms', 'movesearch',
	'is', 'is2', 'is3', 'is4', 'is5', 'is6', 'is7', 'is8', 'itemsearch',
	'as', 'as3', 'as4', 'as5', 'as6', 'as7', 'as8', 'abilitysearch',
];

const DEFAULT_TRAINER_SPRITES: Dict<string> = {
	"1": "lucas",
	"2": "dawn",
	"101": "ethan",
	"102": "lyra",
	"169": "hilbert",
	"170": "hilda",
	"265": "rosa",
	"266": "nate",
};

const NEWLINE = /\n/g;
const CODE_LINEBREAK = /<wbr \/>/g;

const DEFAULT_GROUP_SYMBOLS: KeyedDict<GroupName, string> = {
	'administrator': '&',
	'roomowner': '#',
	'host': '\u2605',
	'moderator': '@',
	'driver': '%',
	'bot': '*',
	'player': '\u2606',
	'voice': '+',
	'star': '\u2729',
	'prizewinner': '^',
	'regularuser': ' ',
	'muted': '!',
	'locked': '\u203d',
};

const DEFAULT_SERVER_GROUPS: ServerGroupData[] = [
	{
		"symbol": DEFAULT_GROUP_SYMBOLS.administrator,
		"name": "Administrator",
		"type": "leadership",
	},
	{
		"symbol": DEFAULT_GROUP_SYMBOLS.roomowner,
		"name": "Room Owner",
		"type": "leadership",
	},
	{
		"symbol": DEFAULT_GROUP_SYMBOLS.host,
		"name": "Host",
		"type": "leadership",
	},
	{
		"symbol": DEFAULT_GROUP_SYMBOLS.moderator,
		"name": "Moderator",
		"type": "staff",
	},
	{
		"symbol": DEFAULT_GROUP_SYMBOLS.driver,
		"name": "Driver",
		"type": "staff",
	},
	{
		"symbol": DEFAULT_GROUP_SYMBOLS.bot,
		"name": "Bot",
		"type": "normal",
	},
	{
		"symbol": DEFAULT_GROUP_SYMBOLS.player,
		"name": "Player",
		"type": "normal",
	},
	{
		"symbol": DEFAULT_GROUP_SYMBOLS.voice,
		"name": "Voice",
		"type": "normal",
	},
	{
		"symbol": DEFAULT_GROUP_SYMBOLS.star,
		"name": "Star",
		"type": "normal",
	},
	{
		"symbol": DEFAULT_GROUP_SYMBOLS.prizewinner,
		"name": "Prize Winner",
		"type": "normal",
	},
	{
		"symbol": DEFAULT_GROUP_SYMBOLS.regularuser,
		"name": null,
		"type": "normal",
	},
	{
		"symbol": DEFAULT_GROUP_SYMBOLS.muted,
		"name": "Muted",
		"type": "punishment",
	},
	{
		"symbol": DEFAULT_GROUP_SYMBOLS.locked,
		"name": "Locked",
		"type": "punishment",
	},
];

export class Client {
	defaultMessageRoom: string = 'lobby';

	private botGreetingCooldowns: Dict<number> = {};
	/**Maps group name to symbol */
	private groupSymbols: KeyedDict<GroupName, string> = DEFAULT_GROUP_SYMBOLS;
	private loggedIn: boolean = false;
	private messageParsers: IMessageParserFile[] = [];
	private messageParsersExist: boolean = false;
	private publicChatRooms: string[] = [];
	private reconnectRoomMessages: Dict<string[]> = {};
	private replayServerAddress: string = Config.replayServer || Tools.mainReplayServer;
	private roomsToRejoin: string[] = [];
	private serverAddress: string = Config.server || Tools.mainServer;
	private serverGroupsResponse: ServerGroupData[] = DEFAULT_SERVER_GROUPS;
	/**Maps symbol to group info */
	private serverGroups: Dict<IServerGroup> = {};
	private serverTimeOffset: number = 0;

	private filters: Filters;
	private websocket: Websocket;

	constructor() {
		this.filters = new Filters();
		this.websocket = new Websocket({
			serverAddress: this.serverAddress,
			defaultMessageRoom: this.defaultMessageRoom,
			onConnect: () => this.onConnect(),
			onFailedPing: () => this.prepareReconnect(),
			onIncomingMessage: (room, message, now) => this.parseMessage(room, message, now),
		});

		this.parseServerGroups();
		this.updateConfigSettings();

		const messageParsersDir = path.join(Tools.srcBuildFolder, 'message-parsers');
		const privateMessageParsersDir = path.join(messageParsersDir, 'private');

		this.loadMessageParsersDirectory(messageParsersDir);
		this.loadMessageParsersDirectory(privateMessageParsersDir, true);

		this.messageParsers.sort((a, b) => b.priority - a.priority);
		this.messageParsersExist = this.messageParsers.length > 0;
	}

	getServerId(): string {
		return this.websocket.getServerId();
	}

	getLastOutgoingMessage(): DeepImmutable<IOutgoingMessage> | null {
		return this.websocket.getLastOutgoingMessage();
	}

	getOutgoingMessageQueue(): readonly DeepImmutable<IOutgoingMessage>[] {
		return this.websocket.getOutgoingMessageQueue();
	}

	exceedsMessageSizeLimit(message: string): boolean {
		return this.websocket.exceedsMessageSizeLimit(message);
	}

	getSendThrottle(): number {
		return this.websocket.getSendThrottle();
	}

	joinRoom(roomid: string): void {
		this.websocket.joinRoom(roomid);
	}

	getRoomInfo(room: Room): void {
		this.websocket.getRoomInfo(room);
	}

	getUserDetails(user: User, listener?: UserDetailsListener): void {
		user.userDetailsListener = listener;

		this.websocket.getUserDetails(user);
	}

	connect(): void {
		this.websocket.connect();
	}

	send(outgoingMessage: IOutgoingMessage): void {
		this.websocket.send(outgoingMessage);
	}

	/**Maps group name to symbol */
	getGroupSymbols(): DeepImmutable<KeyedDict<GroupName, string>> {
		return this.groupSymbols;
	}

	/**Maps symbol to group info */
	getServerGroups(): DeepImmutable<Dict<IServerGroup>> {
		return this.serverGroups;
	}

	getServerAddress(): string {
		return this.serverAddress;
	}

	getHtmlChatCommand(): string {
		return HTML_CHAT_COMMAND;
	}

	getUhtmlChatCommand(): string {
		return UHTML_CHAT_COMMAND;
	}

	getUhtmlChangeChatCommand(): string {
		return UHTML_CHANGE_CHAT_COMMAND;
	}

	getPublicRooms(): readonly string[] {
		return this.publicChatRooms;
	}

	getReplayServerAddress(): string {
		return this.replayServerAddress;
	}

	getUserAttributionHtml(text: string): string {
		return '<div style="float:right;color:#888;font-size:8pt">[' + text + ']</div><div style="clear:both"></div>';
	}

	getListenerHtml(html: string, noAttribution?: boolean): string {
		html = '<div class="infobox">' + html;
		if (!noAttribution && Users.self.globalRank !== this.groupSymbols.bot) {
			html += this.getUserAttributionHtml(Users.self.name);
		}
		html += '</div>';

		return Tools.unescapeHTML(html);
	}

	getListenerUhtml(html: string, noAttribution?: boolean): string {
		if (!noAttribution && Users.self.globalRank !== this.groupSymbols.bot) {
			html += this.getUserAttributionHtml(Users.self.name);
		}

		return Tools.unescapeHTML(html);
	}

	getCodeListenerHtml(code: string): string {
		if (code.length < 80 && !code.includes('\n') && !code.includes('```')) return code;
		return '<div class="infobox"><details class="readmore code" style="white-space: pre-wrap; display: table; tab-size: 3">' +
			'<summary></summary>' + Tools.escapeHTML(code.replace(NEWLINE, "<br />")) + '</details></div>';
	}

	getCommandButton(command: string, label: string, disabled?: boolean, buttonStyle?: string): string {
		return '<button class="button' + (disabled ? " disabled" : "") + '"' + (disabled ? " disabled" : "") +
			(buttonStyle ? ' style="' + buttonStyle + '"' : '') + ' name="send" value="' + command + '">' + label + '</button>';
	}

	getMsgRoomButton(room: Room, message: string, label: string, disabled?: boolean, buttonStyle?: string): string {
		return '<button class="button' + (disabled ? " disabled" : "") + '"' + (disabled ? " disabled" : "") +
			(buttonStyle ? ' style="' + buttonStyle + '"' : '') + ' name="send" value="/msg ' + Users.self.id + ', ' + '/msgroom ' +
			room.id + ', ' + message + '">' + label + '</button>';
	}

	getPmUserButton(user: User, message: string, label: string, disabled?: boolean, buttonStyle?: string): string {
		return '<button class="button' + (disabled ? " disabled" : "") + '"' + (disabled ? " disabled" : "") +
			(buttonStyle ? ' style="' + buttonStyle + '"' : '') + ' name="send" value="/msg ' + user.id + ', ' + message + '">' +
			label + '</button>';
	}

	getPmSelfButton(message: string, label: string, disabled?: boolean, buttonStyle?: string): string {
		return this.getPmUserButton(Users.self, message, label, disabled, buttonStyle);
	}

	getQuietPmButton(room: Room, message: string, label: string, disabled?: boolean, buttonStyle?: string): string {
		const roomData = Users.self.rooms.get(room);
		if (!roomData || (roomData.rank !== this.groupSymbols.bot && roomData.rank !== this.groupSymbols.roomowner)) {
			return this.getPmSelfButton(message, label, disabled, buttonStyle);
		}

		return this.getPmUserButton(Users.self, "/msgroom " + room.id + ", " + BOT_MESSAGE_COMMAND + Users.self.id + ", " + message,
			label, disabled, buttonStyle);
	}

	isDataRollCommand(message: string): boolean {
		return DATA_COMMANDS.includes(message.substr(1).split(" ")[0]);
	}

	isDataCommandError(error: string): boolean {
		return error.startsWith("You can't ") || error.endsWith(' could not be found in any of the search categories.') ||
			error.startsWith('A Pok&eacute;mon cannot ') || error.startsWith('A search cannot ') ||
			error.startsWith('No more than ') || error.startsWith('No value given to compare with ') ||
			error.endsWith(' is not a recognized egg group.') || error.endsWith(' is not a recognized stat.') ||
			error.endsWith(' cannot have alternative parameters.') || error.endsWith(' did not contain a valid stat') ||
			error.endsWith(" cannot be broadcast.") || error.endsWith(" is a status move and can't be used with 'resists'.") ||
			error.endsWith(" is a status move and can't be used with 'weak'.") ||
			error.endsWith(" is not a recognized type or move.") || error.startsWith("You cannot ") ||
			error.startsWith("Invalid stat range for ") || error.startsWith("Invalid property range for ") ||
			error.endsWith(" isn't a valid move target.") || error.endsWith(" did not contain a valid property.") ||
			error.startsWith("A Pok\u00e9mon learnset cannot ") || error.startsWith("A search should not ") ||
			error.endsWith("not recognized.") || error.startsWith("Priority cannot ") ||
			error.startsWith("The generation must be between ") || error.endsWith("Try a more specific search.") ||
			error.startsWith("Only specify ") || error.startsWith("No items ") || error.startsWith("No berries ") ||
			error.startsWith('The search included ');
	}

	isHangmanCommandError(error: string): boolean {
		return error.startsWith("Phrase must be less than ") || error.startsWith("Each word in the phrase must be less than ") ||
			error.startsWith("Hint too long") || error.startsWith("Enter a valid word") ||
			error.startsWith("You are not allowed to use filtered words") || error.startsWith("Hangman is disabled for this room");
	}

	/**Returns the description of the filter triggered by the message, if any */
	checkFilters(message: string, room?: Room): string | undefined {
		return this.filters.check(message, room);
	}

	extractBattleId(source: string): IExtractedBattleId | null {
		return Tools.extractBattleId(source, this.replayServerAddress, this.serverAddress, this.websocket.getServerId());
	}

	updateConfigSettings(): void {
		this.filters.updateConfigSettings();
	}

	parseMessage(room: Room, message: IParsedIncomingMessage, now: number): void {
		if (this.messageParsersExist) {
			for (const messageParser of this.messageParsers) {
				if (messageParser.parseMessage(room, message.type, message.parts, now) === true) return;
			}
		}

		const lastOutgoingMessage = this.websocket.getLastOutgoingMessage();

		switch (message.type) {
		/**
		 * Global messages
		 */
		case 'updateuser': {
			const messageArguments: IClientMessageTypes['updateuser'] = {
				usernameText: message.parts[0],
				loginStatus: message.parts[1],
				avatar: message.parts[2],
				userSettings: message.parts[3],
			};

			let rank: string = '';
			const firstCharacter = messageArguments.usernameText.charAt(0);
			for (const i in this.serverGroups) {
				if (this.serverGroups[i].symbol === firstCharacter) {
					rank = firstCharacter;
					messageArguments.usernameText = messageArguments.usernameText.substr(1);
					break;
				}
			}

			const {status, username} = Tools.parseUsernameText(messageArguments.usernameText);

			if (Tools.toId(username) !== Users.self.id) return;

			if (lastOutgoingMessage && lastOutgoingMessage.type === 'trn') {
				this.websocket.clearLastOutgoingMessage(now);
			}

			Users.self.setName(username);

			if (this.loggedIn) {
				Users.self.updateStatus(status);
			} else {
				if (messageArguments.loginStatus !== '1') {
					console.log('Failed to log in');
					return;
				}

				this.websocket.afterLogin();

				console.log('Successfully logged in');
				this.loggedIn = true;

				this.send({
					message: '|/cmd rooms',
					type: 'query-rooms',
					measure: true,
				});

				let userSettings: IServerUserSettings | undefined;
				if (messageArguments.userSettings) {
					userSettings = JSON.parse(messageArguments.userSettings) as IServerUserSettings;
				}

				if (!userSettings || !userSettings.blockChallenges) {
					this.send({
						message: '|/blockchallenges',
						type: 'blockchallenges',
						measure: true,
					});
				}

				if (Tools.toAlphaNumeric(Config.username) !== Config.username && Users.self.name !== Config.username) {
					this.send({
						message: '|/trn ' + Config.username,
						type: 'trn',
						measure: true,
					});
				}

				if (rank) {
					Users.self.setGlobalRank(rank);
				} else {
					this.getUserDetails(Users.self);
				}

				if (this.roomsToRejoin.length) {
					for (const roomId of this.roomsToRejoin) {
						this.joinRoom(roomId);
					}

					this.roomsToRejoin = [];
				} else if (Config.rooms) {
					for (const roomId of Config.rooms) {
						if (roomId !== 'staff') this.joinRoom(roomId);
					}
				}

				if (Config.avatar && Config.avatar !== messageArguments.avatar) {
					this.send({
						message: '|/avatar ' + Config.avatar,
						type: 'avatar',
						measure: true,
					});
				}
			}
			break;
		}

		case 'queryresponse': {
			const messageArguments: IClientMessageTypes['queryresponse'] = {
				type: message.parts[0] as QueryResponseType,
				response: message.parts.slice(1).join('|'),
			};

			if (messageArguments.type === 'roominfo') {
				if (messageArguments.response && messageArguments.response !== 'null') {
					const response = JSON.parse(messageArguments.response) as IRoomInfoResponse;
					const responseRoom = Rooms.get(response.id);
					if (responseRoom) {
						if (lastOutgoingMessage && lastOutgoingMessage.type === 'query-roominfo' &&
							lastOutgoingMessage.roomid === responseRoom.id) {
							this.websocket.clearLastOutgoingMessage(now);
						}

						responseRoom.onRoomInfoResponse(response);
						Games.updateGameCatalog(responseRoom);
					}
				}
			} else if (messageArguments.type === 'rooms') {
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'query-rooms') {
					this.websocket.clearLastOutgoingMessage(now);
				}

				if (messageArguments.response && messageArguments.response !== 'null') {
					const response = JSON.parse(messageArguments.response) as IRoomsResponse;

					this.publicChatRooms = [];

					if (response.chat) {
						for (const chatRoom of response.chat) {
							this.publicChatRooms.push(Tools.toRoomId(chatRoom.title));
						}
					}

					if (response.official) {
						for (const officialRoom of response.official) {
							this.publicChatRooms.push(Tools.toRoomId(officialRoom.title));
						}
					}

					if (response.pspl) {
						for (const psplRoom of response.pspl) {
							this.publicChatRooms.push(Tools.toRoomId(psplRoom.title));
						}
					}

					Rooms.updatePublicRooms();
				}
			} else if (messageArguments.type === 'userdetails') { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
				if (messageArguments.response && messageArguments.response !== 'null') {
					const response = JSON.parse(messageArguments.response) as IUserDetailsResponse;
					if (lastOutgoingMessage && lastOutgoingMessage.type === 'query-userdetails' &&
						lastOutgoingMessage.userDetailsId === response.userid) {
						this.websocket.clearLastOutgoingMessage(now);
					}

					let user: User | undefined;
					if (response.userid === Users.self.id) {
						user = Users.self;
					} else {
						user = Users.get(response.name);
					}

					if (user) {
						if (response.avatar) {
							let avatar = "" + response.avatar;
							if (avatar in DEFAULT_TRAINER_SPRITES) {
								avatar = DEFAULT_TRAINER_SPRITES[avatar];
							}
							user.avatar = avatar;
							user.customAvatar = !Dex.getTrainerSpriteId(avatar);
						}

						user.autoconfirmed = response.autoconfirmed || false;
						user.status = response.status || "";
						if (response.group) user.setGlobalRank(response.group);

						if (user.userDetailsListener) {
							user.userDetailsListener(user);
							delete user.userDetailsListener;
						}
					}
				}
			}
			break;
		}

		case 'init': {
			const messageArguments: IClientMessageTypes['init'] = {
				type: message.parts[0] as RoomType,
			};

			if (lastOutgoingMessage && lastOutgoingMessage.type === 'join-room' &&
				lastOutgoingMessage.roomid === room.id) {
				this.websocket.clearLastOutgoingMessage(now);
			}

			room.init(messageArguments.type);
			if (room.type === 'chat') {
				console.log("Joined room: " + room.id);
				if (room.id === 'staff') {
					this.send({
						message: room.id + '|/filters view',
						type: 'filters-view',
						measure: true,
					});
				}

				this.getRoomInfo(room);

				if (room.id in this.reconnectRoomMessages) {
					for (const reconnectMessage of this.reconnectRoomMessages[room.id]) {
						room.say(reconnectMessage);
					}
					delete this.reconnectRoomMessages[room.id];
				}

				Tournaments.setNextTournament(room);
				Games.setNextScheduledGame(room);
			}

			if (room.id in Rooms.createListeners) {
				for (const listener of Rooms.createListeners[room.id]) {
					listener(room);
				}
				delete Rooms.createListeners[room.id];
			}

			break;
		}

		case 'deinit': {
			if (lastOutgoingMessage && lastOutgoingMessage.type === 'leave-room' &&
				lastOutgoingMessage.roomid === room.id) {
				this.websocket.clearLastOutgoingMessage(now);
			}

			Rooms.remove(room);
			break;
		}

		case 'noinit': {
			const messageArguments: IClientMessageTypes['noinit'] = {
				action: message.parts[0],
				newId: message.parts[1],
				newTitle: message.parts[2],
			};

			if (messageArguments.action === 'rename') {
				const oldId = room.id;
				room = Rooms.renameRoom(room, messageArguments.newId, messageArguments.newTitle);
				Storage.renameRoom(room, oldId);

				if (room.type === 'chat') this.getRoomInfo(room);
			} else {
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'join-room' &&
					lastOutgoingMessage.roomid === room.id) {
					this.websocket.clearLastOutgoingMessage(now);
				}

				Rooms.remove(room);
			}

			break;
		}

		case 'title': {
			const messageArguments: IClientMessageTypes['title'] = {
				title: message.parts[0],
			};

			room.setTitle(messageArguments.title);
			break;
		}

		case 'customgroups': {
			const messageArguments: IClientMessageTypes['customgroups'] = {
				groups: JSON.parse(message.parts[0]) as ServerGroupData[],
			};

			this.serverGroupsResponse = messageArguments.groups;
			this.parseServerGroups();
			break;
		}

		/**
		 * Chat messages
		 */
		case 'users': {
			const messageArguments: IClientMessageTypes['users'] = {
				userlist: message.parts[0],
			};

			if (messageArguments.userlist === '0') return;

			const addedUsers = new Set<User>();
			const users = messageArguments.userlist.split(",");
			for (let i = 1; i < users.length; i++) {
				const rank = users[i].charAt(0);
				const {status, username} = Tools.parseUsernameText(users[i].substr(1));
				const id = Tools.toId(username);
				if (!id) continue;

				const user = Users.add(username, id);
				addedUsers.add(user);

				room.onUserJoin(user, rank);
				user.updateStatus(status);
			}

			// prune users after reconnecting
			for (const id of Users.getUserIds()) {
				const user = Users.get(id)!;
				if (user.rooms.has(room) && !addedUsers.has(user)) room.onUserLeave(user);
			}

			break;
		}

		case 'join':
		case 'j':
		case 'J': {
			const messageArguments: IClientMessageTypes['join'] = {
				rank: message.parts[0].charAt(0),
				usernameText: message.parts[0].substr(1),
			};
			const {status, username} = Tools.parseUsernameText(messageArguments.usernameText);
			const id = Tools.toId(username);
			if (!id) return;

			const user = Users.add(username, id);
			room.onUserJoin(user, messageArguments.rank);
			user.updateStatus(status);

			if (user === Users.self && this.publicChatRooms.includes(room.id)) {
				if (Users.self.rooms.get(room)!.rank === this.groupSymbols.bot) {
					this.websocket.setPublicBotSendThrottle();
				} else if (Users.self.hasRank(room, 'driver')) {
					this.websocket.setTrustedSendThrottle();
				}
			}

			if (room.publicRoom) Storage.updateLastSeen(user, now);

			if (!room.battle) {
				if (Config.allowMail) Storage.retrieveOfflineMessages(user);

				if ((!room.game || room.game.isMiniGame) && !room.userHostedGame && (!(user.id in this.botGreetingCooldowns) ||
					now - this.botGreetingCooldowns[user.id] >= BOT_GREETING_COOLDOWN)) {
					if (Storage.checkBotGreeting(room, user, now)) this.botGreetingCooldowns[user.id] = now;
				}
			}

			break;
		}

		case 'leave':
		case 'l':
		case 'L': {
			const messageArguments: IClientMessageTypes['leave'] = {
				possibleRank: message.parts[0].charAt(0),
				username: message.parts[0].substr(1),
			};

			let username: string;
			if (messageArguments.possibleRank in this.serverGroups) {
				username = messageArguments.username;
			} else {
				username = messageArguments.possibleRank + messageArguments.username;
			}

			const id = Tools.toId(username);
			if (!id) return;

			const user = Users.add(username, id);

			if (room.publicRoom) Storage.updateLastSeen(user, now);

			room.onUserLeave(user);
			if (!user.rooms.size) Users.remove(user);
			break;
		}

		case 'name':
		case 'n':
		case 'N': {
			const messageArguments: IClientMessageTypes['name'] = {
				rank: message.parts[0].charAt(0),
				usernameText: message.parts[0].substr(1),
				oldId: message.parts[1],
			};

			const {status, username} = Tools.parseUsernameText(messageArguments.usernameText);
			const user = Users.rename(username, messageArguments.oldId);
			room.onUserRename(user, messageArguments.rank);
			user.updateStatus(status);

			if (!user.away && Config.allowMail) {
				Storage.retrieveOfflineMessages(user);
			}

			if (room.publicRoom) Storage.updateLastSeen(user, now);
			break;
		}

		case 'chat':
		case 'c':
		case 'c:': {
			let messageArguments: IClientMessageTypes['chat'];
			if (message.type === 'c:') {
				messageArguments = {
					timestamp: (parseInt(message.parts[0]) + this.serverTimeOffset) * 1000,
					rank: message.parts[1].charAt(0),
					username: message.parts[1].substr(1),
					message: message.parts.slice(2).join("|"),
				};
			} else {
				messageArguments = {
					timestamp: now,
					rank: message.parts[0].charAt(0),
					username: message.parts[0].substr(1),
					message: message.parts.slice(1).join("|"),
				};
			}

			const userId = Tools.toId(messageArguments.username);
			if (!userId) return;

			const user = Users.add(messageArguments.username, userId);
			const roomData = user.rooms.get(room);
			if (roomData) roomData.lastChatMessage = messageArguments.timestamp;

			if (user === Users.self) {
				if (messageArguments.message === CODE_COMMAND) {
					if (lastOutgoingMessage && lastOutgoingMessage.type === 'code' &&
						lastOutgoingMessage.roomid === room.id) {
						this.websocket.clearLastOutgoingMessage(now);
					}
				} else if (messageArguments.message.startsWith(ANNOUNCE_CHAT_COMMAND)) {
					const announcement = messageArguments.message.substr(ANNOUNCE_CHAT_COMMAND.length);
					if (lastOutgoingMessage && lastOutgoingMessage.type === 'announce' &&
						Tools.toId(lastOutgoingMessage.announcement) === Tools.toId(announcement)) {
						this.websocket.clearLastOutgoingMessage(now);
					}
				} else if (messageArguments.message.startsWith(HTML_CHAT_COMMAND)) {
					const html = Tools.unescapeHTML(messageArguments.message.substr(HTML_CHAT_COMMAND.length));
					const htmlId = Tools.toId(html);
					if (lastOutgoingMessage && ((lastOutgoingMessage.type === 'chat-html' &&
						Tools.toId(lastOutgoingMessage.html) === htmlId) || (lastOutgoingMessage.type === 'code' &&
						Tools.toId(lastOutgoingMessage.html) === Tools.toId(Tools.unescapeHTML(html.replace(CODE_LINEBREAK, "")))))) {
						this.websocket.clearLastOutgoingMessage(now);
					}

					room.addHtmlChatLog(html);

					if (htmlId in room.htmlMessageListeners) {
						room.htmlMessageListeners[htmlId](now);
						delete room.htmlMessageListeners[htmlId];
					}
				} else {
					let uhtml = '';
					let uhtmlChange = false;
					if (messageArguments.message.startsWith(UHTML_CHAT_COMMAND)) {
						uhtml = messageArguments.message.substr(UHTML_CHAT_COMMAND.length);
					} else if (messageArguments.message.startsWith(UHTML_CHANGE_CHAT_COMMAND)) {
						uhtml = messageArguments.message.substr(UHTML_CHANGE_CHAT_COMMAND.length);
						uhtmlChange = true;
					}

					const commaIndex = uhtml.indexOf(',');
					if (commaIndex !== -1) {
						const uhtmlName = uhtml.substr(0, commaIndex);
						const uhtmlId = Tools.toId(uhtmlName);
						const html = Tools.unescapeHTML(uhtml.substr(commaIndex + 1));
						const htmlId = Tools.toId(html);
						if (lastOutgoingMessage &&
							(lastOutgoingMessage.type === 'chat-uhtml' || lastOutgoingMessage.type === 'chat-uhtml-change') &&
							Tools.toId(lastOutgoingMessage.uhtmlName) === uhtmlId &&
							Tools.toId(lastOutgoingMessage.html) === htmlId) {
							this.websocket.clearLastOutgoingMessage(now);
						}

						if (!uhtmlChange) room.addUhtmlChatLog(uhtmlName, html);

						if (uhtmlId in room.uhtmlMessageListeners && htmlId in room.uhtmlMessageListeners[uhtmlId]) {
							room.uhtmlMessageListeners[uhtmlId][htmlId](now);
							room.removeUhtmlMessageListener(uhtmlId, htmlId);
						}
					} else {
						const messageId = Tools.toId(messageArguments.message);
						if (lastOutgoingMessage && ((lastOutgoingMessage.type === 'chat' &&
							Tools.toId(lastOutgoingMessage.text) === messageId) || (lastOutgoingMessage.type === 'code' &&
							messageArguments.message.startsWith("```") && Tools.toId(lastOutgoingMessage.html) === messageId))) {
							this.websocket.clearLastOutgoingMessage(now);
						}

						room.addChatLog(messageArguments.message);

						if (messageId in room.messageListeners) {
							room.messageListeners[messageId](now);
							delete room.messageListeners[messageId];
						}
					}
				}
			} else {
				room.addChatLog(messageArguments.message);
				this.parseChatMessage(room, user, messageArguments.message, now);
			}

			if (room.publicRoom) Storage.updateLastSeen(user, messageArguments.timestamp);

			if (messageArguments.message.startsWith('/log ')) {
				if (room.tournament && messageArguments.message.startsWith(TOURNAMENT_AUTODQ_COMMAND)) {
					const minutes = messageArguments.message.substr(TOURNAMENT_AUTODQ_COMMAND.length).split(" by ")[0].trim();
					room.tournament.setAutoDqMinutes(minutes === 'off' ? 0 : parseInt(minutes));
				}

				if (messageArguments.message.startsWith(HANGMAN_START_COMMAND)) {
					room.serverHangman = true;

					if (lastOutgoingMessage && lastOutgoingMessage.type === 'hangman-start' &&
						lastOutgoingMessage.roomid === room.id &&
						messageArguments.message.startsWith(HANGMAN_START_COMMAND + Users.self.name)) {
						this.websocket.clearLastOutgoingMessage(now);
					}
				} else if (messageArguments.message.startsWith(HANGMAN_END_COMMAND)) {
					room.serverHangman = null;

					if (lastOutgoingMessage && lastOutgoingMessage.type === 'hangman-end' &&
						lastOutgoingMessage.roomid === room.id &&
						messageArguments.message.startsWith(HANGMAN_END_COMMAND + Users.self.name)) {
						this.websocket.clearLastOutgoingMessage(now);
					}
				} else if (lastOutgoingMessage && lastOutgoingMessage.roomid === room.id && user === Users.self) {
					if (lastOutgoingMessage.type === 'room-voice') {
						if (messageArguments.message.endsWith(" was promoted to Room Voice by " + Users.self.name + ".")) {
							const promoted = messageArguments.message.substr(5).split(" was promoted to Room Voice by")[0];
							if (Tools.toId(promoted) === lastOutgoingMessage.userid) this.websocket.clearLastOutgoingMessage(now);
						}
					} else if (lastOutgoingMessage.type === 'room-deauth') {
						if (messageArguments.message.endsWith(" was demoted to Room regular user by " + Users.self.name + ".)")) {
							const demoted = messageArguments.message.substr(6).split(" was demoted to Room regular user by")[0];
							if (Tools.toId(demoted) === lastOutgoingMessage.deauthedUserid) this.websocket.clearLastOutgoingMessage(now);
						}
					} else if (lastOutgoingMessage.type === 'warn') {
						if (messageArguments.message.endsWith(' was warned by ' + Users.self.name + ". (" +
							lastOutgoingMessage.warnReason + ")")) {
							this.websocket.clearLastOutgoingMessage(now);
						}
					} else if (lastOutgoingMessage.type === 'modnote') {
						const modnoteCommand = '/log (' + Users.self.name + ' notes: ';
						if (messageArguments.message.startsWith(modnoteCommand) &&
							messageArguments.message.substr(modnoteCommand.length).startsWith(lastOutgoingMessage.modnote!)) {
							this.websocket.clearLastOutgoingMessage(now);
						}
					} else if (lastOutgoingMessage.type === 'tournament-create') {
						if (messageArguments.message.startsWith('/log (' + Users.self.name + ' created a tournament in ')) {
							this.websocket.clearLastOutgoingMessage(now);
						}
					} else if (lastOutgoingMessage.type === 'tournament-start') {
						if (messageArguments.message.startsWith('/log (' + Users.self.name + ' started the tournament.)')) {
							this.websocket.clearLastOutgoingMessage(now);
						}
					} else if (lastOutgoingMessage.type === 'tournament-name') {
						if (messageArguments.message.startsWith("/log (" + Users.self.name + " set the tournament's name to ")) {
							this.websocket.clearLastOutgoingMessage(now);
						}
					} else if (lastOutgoingMessage.type === 'tournament-cap') {
						if (messageArguments.message.startsWith("/log (" + Users.self.name + " set the tournament's player cap to ")) {
							this.websocket.clearLastOutgoingMessage(now);
						}
					} else if (lastOutgoingMessage.type === 'tournament-autostart') {
						if (messageArguments.message.startsWith(TOURNAMENT_AUTOSTART_COMMAND + Users.self.name)) {
							this.websocket.clearLastOutgoingMessage(now);
						}
					} else if (lastOutgoingMessage.type === 'tournament-autodq') {
						if (messageArguments.message.startsWith(TOURNAMENT_AUTODQ_COMMAND) &&
							messageArguments.message.endsWith(" by " + Users.self.name + ")")) {
							this.websocket.clearLastOutgoingMessage(now);
						}
					} else if (lastOutgoingMessage.type === 'tournament-forcepublic') {
						if (messageArguments.message.startsWith(TOURNAMENT_FORCEPUBLIC_COMMAND + Users.self.name)) {
							this.websocket.clearLastOutgoingMessage(now);
						}
					} else if (lastOutgoingMessage.type === 'tournament-forcetimer') {
						if (messageArguments.message.startsWith(TOURNAMENT_FORCE_TIMER_COMMAND + Users.self.name)) {
							this.websocket.clearLastOutgoingMessage(now);
						}
					} else if (lastOutgoingMessage.type === 'tournament-scouting') {
						if (messageArguments.message.startsWith(TOURNAMENT_SCOUTING_COMMAND + Users.self.name)) {
							this.websocket.clearLastOutgoingMessage(now);
						}
					} else if (lastOutgoingMessage.type === 'tournament-modjoin') {
						if (messageArguments.message.startsWith(TOURNAMENT_MODJOIN_COMMAND + Users.self.name)) {
							this.websocket.clearLastOutgoingMessage(now);
						}
					} else if (lastOutgoingMessage.type === 'tournament-end') {
						if (messageArguments.message.endsWith(TOURNAMENT_END_COMMAND)) {
							this.websocket.clearLastOutgoingMessage(now);
						}
					} else if (lastOutgoingMessage.type === 'tournament-rules') {
						if (messageArguments.message.startsWith("/log (" + Users.self.name + " updated the tournament's custom rules.")) {
							this.websocket.clearLastOutgoingMessage(now);
						}
					}
				}
			}

			break;
		}

		case ':': {
			const messageArguments: IClientMessageTypes[':'] = {
				timestamp: parseInt(message.parts[0]),
			};
			this.serverTimeOffset = Math.floor(now / 1000) - messageArguments.timestamp;
			break;
		}

		case 'pm': {
			const messageArguments: IClientMessageTypes['pm'] = {
				rank: message.parts[0].charAt(0),
				username: message.parts[0].substr(1),
				recipientRank: message.parts[1].charAt(0),
				recipientUsername: message.parts[1].substr(1),
				message: message.parts.slice(2).join("|"),
			};

			const userId = Tools.toId(messageArguments.username);
			if (!userId) return;

			const isHtml = messageArguments.message.startsWith(HTML_CHAT_COMMAND);
			const isUhtml = !isHtml && messageArguments.message.startsWith(UHTML_CHAT_COMMAND);
			const isUhtmlChange = !isHtml && !isUhtml && messageArguments.message.startsWith(UHTML_CHANGE_CHAT_COMMAND);

			const user = Users.add(messageArguments.username, userId);
			if (user === Users.self) {
				if (messageArguments.message === BLOCK_CHALLENGES_COMMAND ||
					messageArguments.message === ALREADY_BLOCKING_CHALLENGES_COMMAND) {
					if (lastOutgoingMessage && lastOutgoingMessage.type === 'blockchallenges') {
						this.websocket.clearLastOutgoingMessage(now);
					}
					return;
				}

				if (messageArguments.message === AVATAR_COMMAND) {
					if (lastOutgoingMessage && lastOutgoingMessage.type === 'avatar') {
						this.websocket.clearLastOutgoingMessage(now);
					}
					return;
				}

				const recipientId = Tools.toId(messageArguments.recipientUsername);
				if (messageArguments.message.startsWith(USER_NOT_FOUND_MESSAGE) ||
					messageArguments.message.startsWith(USER_BLOCKING_PMS_MESSAGE) ||
					messageArguments.message.endsWith(STAFF_BLOCKING_PMS_MESSAGE) ||
					messageArguments.message.startsWith(UNREGISTERED_USER_MESSAGE) ||
					messageArguments.message.startsWith(ROLL_COMMAND_HELP) ||
					(messageArguments.message.startsWith('/error The user ') &&
					messageArguments.message.endsWith('is locked and cannot be PMed.'))) {
					if (lastOutgoingMessage && lastOutgoingMessage.userid === recipientId &&
						(lastOutgoingMessage.type === 'pm' || lastOutgoingMessage.type === 'pm-html' ||
						lastOutgoingMessage.type === 'pm-uhtml' || lastOutgoingMessage.type === 'pm-uhtml-change' ||
						lastOutgoingMessage.type === 'htmlpage' || lastOutgoingMessage.type === 'htmlpageselector' ||
						lastOutgoingMessage.type === 'closehtmlpage' || lastOutgoingMessage.type === 'highlight-htmlpage' ||
						lastOutgoingMessage.type === 'notifyuser' || lastOutgoingMessage.type === 'notifyoffuser' ||
						lastOutgoingMessage.type === 'private-html' || lastOutgoingMessage.type === 'private-uhtml' ||
						lastOutgoingMessage.type === 'private-uhtml-change')) {
						this.websocket.clearLastOutgoingMessage(now);
					}

					return;
				} else if (messageArguments.message.startsWith(CHAT_ERROR_MESSAGE)) {
					Tools.logMessage("Error message in PM to " + messageArguments.recipientUsername + ": " +
						messageArguments.message.substr(CHAT_ERROR_MESSAGE.length));
				}

				if (!recipientId) return;

				const recipient = Users.add(messageArguments.recipientUsername, recipientId);
				if (messageArguments.message.startsWith('/error ')) {
					const error = messageArguments.message.substr(7).trim();
					if (lastOutgoingMessage && lastOutgoingMessage.type === 'pm' &&
						lastOutgoingMessage.userid === recipient.id && this.isDataRollCommand(lastOutgoingMessage.text!) &&
						this.isDataCommandError(error)) {
						this.websocket.clearLastOutgoingMessage(now);
						recipient.say(Tools.unescapeHTML(error));
					}

					return;
				}

				if (isUhtml || isUhtmlChange) {
					const uhtml = messageArguments.message.substr(messageArguments.message.indexOf(" ") + 1);
					const commaIndex = uhtml.indexOf(",");
					const uhtmlName = uhtml.substr(0, commaIndex);
					const uhtmlId = Tools.toId(uhtmlName);
					const html = Tools.unescapeHTML(uhtml.substr(commaIndex + 1));
					const htmlId = Tools.toId(html);

					if (lastOutgoingMessage && (lastOutgoingMessage.type === 'pm-uhtml' ||
						lastOutgoingMessage.type === 'pm-uhtml-change') && lastOutgoingMessage.userid === recipient.id &&
						Tools.toId(lastOutgoingMessage.uhtmlName) === uhtmlId &&
						Tools.toId(lastOutgoingMessage.html) === htmlId) {
						this.websocket.clearLastOutgoingMessage(now);
					}

					if (!isUhtmlChange) user.addUhtmlChatLog(uhtmlName, html);

					if (recipient.uhtmlMessageListeners && uhtmlId in recipient.uhtmlMessageListeners &&
						htmlId in recipient.uhtmlMessageListeners[uhtmlId]) {
						recipient.uhtmlMessageListeners[uhtmlId][htmlId](now);
						recipient.removeUhtmlMessageListener(uhtmlId, htmlId);
					}
				} else if (isHtml) {
					const html = Tools.unescapeHTML(messageArguments.message.substr(HTML_CHAT_COMMAND.length));
					const htmlId = Tools.toId(html);
					if (lastOutgoingMessage && lastOutgoingMessage.userid === recipient.id &&
						((lastOutgoingMessage.type === 'pm-html' && Tools.toId(lastOutgoingMessage.html) === htmlId) ||
						(lastOutgoingMessage.type === 'code' &&
						Tools.toId(lastOutgoingMessage.html) === Tools.toId(Tools.unescapeHTML(html.replace(CODE_LINEBREAK, "")))))) {
						this.websocket.clearLastOutgoingMessage(now);
					}

					user.addHtmlChatLog(html);

					if (recipient.htmlMessageListeners) {
						if (htmlId in recipient.htmlMessageListeners) {
							recipient.htmlMessageListeners[htmlId](now);
							delete recipient.htmlMessageListeners[htmlId];
						}
					}
				} else {
					const messageId = Tools.toId(messageArguments.message);
					if (messageArguments.message === CODE_COMMAND) {
						if (lastOutgoingMessage && lastOutgoingMessage.type === 'code' &&
							lastOutgoingMessage.userid === recipient.id) {
							this.websocket.clearLastOutgoingMessage(now);
						}
					} else if (lastOutgoingMessage && lastOutgoingMessage.userid === recipient.id &&
						((lastOutgoingMessage.type === 'pm' && Tools.toId(lastOutgoingMessage.text) === messageId) ||
						((lastOutgoingMessage.type === 'code' && messageArguments.message.startsWith("```") &&
						Tools.toId(lastOutgoingMessage.html) === messageId)))) {
						this.websocket.clearLastOutgoingMessage(now);
					}

					user.addChatLog(messageArguments.message);

					if (recipient.messageListeners) {
						if (messageId in recipient.messageListeners) {
							recipient.messageListeners[messageId](now);
							delete recipient.messageListeners[messageId];
						}
					}
				}
			} else {
				user.setGlobalRank(messageArguments.rank);

				if (isUhtml || isUhtmlChange) {
					if (!isUhtmlChange) user.addUhtmlChatLog("", "html");
				} else if (isHtml) {
					user.addHtmlChatLog("html");
				} else {
					let commandMessage = messageArguments.message;
					if (commandMessage.startsWith(BOT_MESSAGE_COMMAND)) commandMessage = commandMessage.substr(BOT_MESSAGE_COMMAND.length);

					user.addChatLog(commandMessage);

					if (commandMessage.startsWith(REQUEST_PM_LOG_COMMAND)) {
						if (user.hasGlobalRank('driver')) {
							const names = commandMessage.substr(REQUEST_PM_LOG_COMMAND.length).trim().split(" and ");
							let otherUser = "";
							for (const name of names) {
								const id = Tools.toId(name);
								if (id !== Users.self.id) {
									otherUser = id;
									break;
								}
							}

							if (otherUser) {
								this.send({
									message: '|/allowpmlog ' + user.id + ', ' + otherUser,
									type: 'allowpmlog',
									userid: user.id,
									measure: true,
								});
							}
						}
					} else if (commandMessage.startsWith(ALLOWED_PM_LOG)) {
						if (lastOutgoingMessage && lastOutgoingMessage.type === 'allowpmlog' &&
							lastOutgoingMessage.userid === user.id) {
							this.websocket.clearLastOutgoingMessage(now);
						}
					} else {
						const battleUrl = this.extractBattleId(commandMessage.startsWith(INVITE_COMMAND) ?
							commandMessage.substr(INVITE_COMMAND.length) : commandMessage);
						if (battleUrl) {
							commandMessage = Config.commandCharacter + 'check ' + battleUrl.fullId;
						}

						CommandParser.parse(user, user, commandMessage, now);
					}
				}
			}
			break;
		}

		case '': {
			const messageArguments: IClientMessageTypes[''] = {
				message: message.incomingMessage,
			};

			if (messageArguments.message === 'This room has no banned phrases.') {
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'banword-list' &&
					lastOutgoingMessage.roomid === room.id) {
					this.websocket.clearLastOutgoingMessage(now);
				}

				room.serverBannedWords = [];
				room.serverBannedWordsRegex = null;
			} else if (messageArguments.message.startsWith('Banned phrases in room ')) {
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'banword-list' &&
					lastOutgoingMessage.roomid === room.id) {
					this.websocket.clearLastOutgoingMessage(now);
				}

				room.serverBannedWordsRegex = null;

				let subMessage = messageArguments.message.split('Banned phrases in room ')[1];
				const colonIndex = subMessage.indexOf(':');
				subMessage = subMessage.substr(colonIndex + 2);
				if (subMessage) {
					room.serverBannedWords = subMessage.split(',').map(x => x.trim()).filter(x => x.length);
				} else {
					room.serverBannedWords = [];
				}
			} else if (messageArguments.message === HANGMAN_END_RAW_MESSAGE) {
				room.serverHangman = null;
			} else if (messageArguments.message.startsWith('Tournament battles forced public: ON') ||
				messageArguments.message.startsWith('Tournament battles forced public: OFF')) {
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'tournament-forcepublic' &&
					lastOutgoingMessage.roomid === room.id) {
					this.websocket.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.message.startsWith('Modjoining is now banned (Players cannot modjoin their tournament battles)') ||
				messageArguments.message.startsWith('Modjoining is now allowed (Players can modjoin their tournament battles)')) {
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'tournament-modjoin' &&
					lastOutgoingMessage.roomid === room.id) {
					this.websocket.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.message.startsWith('Scouting is now allowed (Tournament players can watch other tournament ' +
				'battles)') || messageArguments.message.startsWith("Scouting is now banned (Tournament players can't watch other " +
				"tournament battles)")) {
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'tournament-scouting' &&
					lastOutgoingMessage.roomid === room.id) {
					this.websocket.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.message.startsWith('Forcetimer is now on for the tournament') ||
				messageArguments.message.startsWith('Forcetimer is now off for the tournament')) {
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'tournament-forcetimer' &&
					lastOutgoingMessage.roomid === room.id) {
					this.websocket.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.message.startsWith('The tournament will start once ')) {
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'tournament-autostart' &&
					lastOutgoingMessage.roomid === room.id) {
					this.websocket.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.message.startsWith('Tournament cap set to ')) {
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'tournament-cap' &&
					lastOutgoingMessage.roomid === room.id) {
					this.websocket.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.message === TOURNAMENT_RUNAUTODQ_COMMAND) {
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'tournament-runautodq' &&
					lastOutgoingMessage.roomid === room.id) {
					this.websocket.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.message.startsWith(NOTIFY_USER_MESSAGE)) {
				const recipient = messageArguments.message.substr(NOTIFY_USER_MESSAGE.length);
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'notifyuser' &&
					lastOutgoingMessage.roomid === room.id && lastOutgoingMessage.userid === Tools.toId(recipient)) {
					this.websocket.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.message.startsWith(NOTIFY_OFF_USER_MESSAGE)) {
				const recipient = messageArguments.message.substr(NOTIFY_OFF_USER_MESSAGE.length);
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'notifyoffuser' &&
					lastOutgoingMessage.roomid === room.id && lastOutgoingMessage.userid === Tools.toId(recipient)) {
					this.websocket.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.message.startsWith(HIGHLIGHT_HTML_PAGE_MESSAGE)) {
				const parts = messageArguments.message.substr(HIGHLIGHT_HTML_PAGE_MESSAGE.length).split(" on the bot page ");
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'highlight-htmlpage' &&
					lastOutgoingMessage.roomid === room.id && lastOutgoingMessage.userid === Tools.toId(parts[0]) &&
					Tools.toId(lastOutgoingMessage.pageId) === Tools.toId(parts[1])) {
					this.websocket.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.message.startsWith(PRIVATE_HTML_MESSAGE)) {
				const recipient = messageArguments.message.substr(PRIVATE_HTML_MESSAGE.length);
				if (lastOutgoingMessage && (lastOutgoingMessage.type === 'private-html' || lastOutgoingMessage.type === 'private-uhtml' ||
					lastOutgoingMessage.type === 'private-uhtml-change') && lastOutgoingMessage.roomid === room.id &&
					lastOutgoingMessage.userid === Tools.toId(recipient)) {
					this.websocket.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.message.startsWith("/dice ")) {
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'chat' &&
					lastOutgoingMessage.roomid === room.id && lastOutgoingMessage.text!.startsWith('!roll ')) {
					this.websocket.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.message.startsWith("Sent ")) {
				const parts = messageArguments.message.substr(5).split(" the bot page ");
				let recipient = parts[0];
				if (messageArguments.message.includes(" the selector ")) {
					const selectorParts = parts[0].split(" the selector ");
					recipient = selectorParts[0];
					const selector = selectorParts[1].split(" on")[0];
					if (lastOutgoingMessage && lastOutgoingMessage.type === 'htmlpageselector' &&
						lastOutgoingMessage.roomid === room.id && lastOutgoingMessage.userid === Tools.toId(recipient) &&
						Tools.toId(lastOutgoingMessage.selector) === Tools.toId(selector) &&
						Tools.toId(lastOutgoingMessage.pageId) === Tools.toId(parts[1])) {
						this.websocket.clearLastOutgoingMessage(now);
					}
				} else {
					if (lastOutgoingMessage && lastOutgoingMessage.type === 'htmlpage' &&
						lastOutgoingMessage.roomid === room.id && lastOutgoingMessage.userid === Tools.toId(recipient) &&
						Tools.toId(lastOutgoingMessage.pageId) === Tools.toId(parts[1])) {
						this.websocket.clearLastOutgoingMessage(now);
					}
				}
			} else if (messageArguments.message.startsWith("Closed the bot page ")) {
				const parts = messageArguments.message.split("Closed the bot page ");
				const subParts = parts[1].split(" for ");
				const pageId = subParts[0];
				const recipient = subParts.slice(1).join(" for ");
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'closehtmlpage' &&
					lastOutgoingMessage.roomid === room.id && lastOutgoingMessage.userid === Tools.toId(recipient) &&
					Tools.toId(lastOutgoingMessage.pageId) === Tools.toId(pageId)) {
					this.websocket.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.message.startsWith(CHAT_ERROR_MESSAGE)) {
				Tools.logMessage("Chat error message in " + room.title + ": " + messageArguments.message.substr(CHAT_ERROR_MESSAGE.length));
			}

			break;
		}

		case 'error': {
			const messageArguments: IClientMessageTypes['error'] = {
				error: message.whole,
			};

			if (messageArguments.error.startsWith('/tour new - Access denied')) {
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'tournament-create' &&
					lastOutgoingMessage.roomid === room.id) {
					this.websocket.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.error.startsWith('/tour start - Access denied')) {
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'tournament-start' &&
					lastOutgoingMessage.roomid === room.id) {
					this.websocket.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.error.startsWith('/tour end - Access denied')) {
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'tournament-end' &&
					lastOutgoingMessage.roomid === room.id) {
					this.websocket.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.error.startsWith('/tour name - Access denied')) {
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'tournament-name' &&
					lastOutgoingMessage.roomid === room.id) {
					this.websocket.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.error.startsWith('/tour cap - Access denied') ||
				messageArguments.error.startsWith("The tournament's player cap is already ")) {
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'tournament-cap' &&
					lastOutgoingMessage.roomid === room.id) {
					this.websocket.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.error.startsWith('/tour runautodq - Access denied')) {
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'tournament-runautodq' &&
					lastOutgoingMessage.roomid === room.id) {
					this.websocket.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.error.startsWith('/tour forcetimer - Access denied')) {
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'tournament-forcetimer' &&
					lastOutgoingMessage.roomid === room.id) {
					this.websocket.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.error.startsWith('/tour rules - Access denied')) {
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'tournament-rules' &&
					lastOutgoingMessage.roomid === room.id) {
					this.websocket.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.error.startsWith('/tour forcepublic - Access denied') ||
				messageArguments.error.startsWith('Tournament battles are already being forced public') ||
				messageArguments.error.startsWith('Tournament battles are not being forced public')) {
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'tournament-forcepublic' &&
					lastOutgoingMessage.roomid === room.id) {
					this.websocket.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.error.startsWith('/tour modjoin - Access denied') ||
				messageArguments.error.startsWith('Modjoining is already not allowed for this tournament') ||
				messageArguments.error.startsWith('Modjoining is already allowed for this tournament')) {
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'tournament-modjoin' &&
					lastOutgoingMessage.roomid === room.id) {
					this.websocket.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.error.startsWith('/tour scouting - Access denied') ||
				messageArguments.error.startsWith('Scouting for this tournament is already set to allowed') ||
				messageArguments.error.startsWith('Scouting for this tournament is already disabled')) {
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'tournament-scouting' &&
					lastOutgoingMessage.roomid === room.id) {
					this.websocket.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.error.startsWith('/tour autostart - Access denied') ||
				messageArguments.error.startsWith('The tournament is already set to autostart when the player cap is reached') ||
				messageArguments.error.startsWith('The automatic tournament start timer is already off')) {
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'tournament-autostart' &&
					lastOutgoingMessage.roomid === room.id) {
					this.websocket.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.error.startsWith('/tour autodq - Access denied') ||
				messageArguments.error.startsWith('The automatic tournament disqualify timer is already set to ')) {
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'tournament-autodq' &&
					lastOutgoingMessage.roomid === room.id) {
					this.websocket.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.error.startsWith('This user is currently blocking PMs') ||
				messageArguments.error.startsWith('This user is currently locked, so you cannot send them HTML')) {
				if (lastOutgoingMessage && lastOutgoingMessage.roomid === room.id &&
					(lastOutgoingMessage.type === 'pm-html' || lastOutgoingMessage.type === 'pm-uhtml' ||
					lastOutgoingMessage.type === 'pm-uhtml-change' || lastOutgoingMessage.type === 'htmlpage' ||
					lastOutgoingMessage.type === 'htmlpageselector' || lastOutgoingMessage.type === 'highlight-htmlpage' ||
					lastOutgoingMessage.type === 'closehtmlpage')) {
					this.websocket.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.error.startsWith('A group chat named ')) {
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'create-groupchat') {
					this.websocket.clearLastOutgoingMessage(now);
				}
			} else if (this.isDataCommandError(messageArguments.error)) {
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'chat' && lastOutgoingMessage.roomid === room.id &&
					this.isDataRollCommand(lastOutgoingMessage.text!)) {
					this.websocket.clearLastOutgoingMessage(now);
					room.say(Tools.escapeHTML(messageArguments.error));
				}
			} else if (this.isHangmanCommandError(messageArguments.error)) {
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'hangman-start' &&
					lastOutgoingMessage.roomid === room.id) {
					const user = Users.get(lastOutgoingMessage.userid!);
					this.websocket.clearLastOutgoingMessage(now);
					if (user) user.say("Hangman error: " + Tools.escapeHTML(messageArguments.error));
				}
			} else {
				if (lastOutgoingMessage && lastOutgoingMessage.roomid === room.id) {
					Tools.logMessage("Error message in " + room.title + ": " + messageArguments.error);
				}
			}

			break;
		}

		case 'raw':
		case 'html': {
			const messageArguments: IClientMessageTypes['html'] = {
				html: Tools.unescapeHTML(message.whole),
			};

			room.addHtmlChatLog(messageArguments.html);

			const htmlId = Tools.toId(messageArguments.html);
			if (htmlId in room.htmlMessageListeners) {
				room.htmlMessageListeners[htmlId](now);
				delete room.htmlMessageListeners[htmlId];
			}

			if (lastOutgoingMessage && lastOutgoingMessage.type === 'chat-html' &&
				Tools.toId(lastOutgoingMessage.html) === htmlId) {
				this.websocket.clearLastOutgoingMessage(now);
			}

			if (messageArguments.html === '<strong class="message-throttle-notice">Your message was not sent because you\'ve been ' +
				'typing too quickly.</strong>') {
				this.websocket.onMessageThrottle();
			} else if (messageArguments.html.startsWith('<div class="broadcast-red"><strong>Moderated chat was set to ')) {
				room.setModchat(messageArguments.html.split('<div class="broadcast-red">' +
					'<strong>Moderated chat was set to ')[1].split('!</strong>')[0]);
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'modchat' &&
					lastOutgoingMessage.modchatLevel === room.modchat) {
					this.websocket.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.html.startsWith('<div class="broadcast-red"><strong>This battle is invite-only!</strong>') ||
				messageArguments.html.startsWith('<div class="broadcast-red"><strong>This room is now invite only!</strong>')) {
				room.inviteOnlyBattle = true;
			} else if (messageArguments.html.startsWith('<div class="broadcast-blue"><strong>Moderated chat was disabled!</strong>')) {
				room.setModchat('off');
			} else if (messageArguments.html.startsWith('<div class="infobox infobox-limited">This tournament includes:<br />')) {
				if (room.tournament) {
					if (lastOutgoingMessage && lastOutgoingMessage.type === 'tournament-rules' &&
						lastOutgoingMessage.roomid === room.id) {
						this.websocket.clearLastOutgoingMessage(now);
					}

					const separatedCustomRules: ISeparatedCustomRules = {
						addedbans: [], removedbans: [], addedrestrictions: [], addedrules: [], removedrules: [],
					};
					const lines = messageArguments.html.substr(0, messageArguments.html.length - 6)
						.split('<div class="infobox infobox-limited">This tournament includes:<br />')[1].split('<br />');
					let currentCategory: 'addedbans' | 'removedbans' | 'addedrestrictions' | 'addedrules' | 'removedrules' = 'addedbans';
					for (let line of lines) {
						line = line.trim();
						if (line.startsWith('<b>')) {
							const category = Tools.toId(line.split('<b>')[1].split('</b>')[0]);
							if (category === 'addedbans' || category === 'removedbans' ||
								category === 'addedrestrictions' || category === 'addedrules' || category === 'removedrules') {
								currentCategory = category;
							}
						}
						if (line.includes('</b> - ')) line = line.split('</b> - ')[1].trim();
						separatedCustomRules[currentCategory] = line.split(",").map(x => x.trim());
					}

					room.tournament.format = Dex.getExistingFormat(Dex.joinNameAndCustomRules(room.tournament.format,
						Dex.combineCustomRules(separatedCustomRules)));
					room.tournament.setCustomFormatName();
				}
			} else if (messageArguments.html.startsWith('<div class="broadcast-green"><p style="text-align:left;font-weight:bold;' +
				'font-size:10pt;margin:5px 0 0 15px">The word has been guessed. Congratulations!</p>')) {
				if (room.userHostedGame) {
					const winner = messageArguments.html.split('<br />Winner: ')[1].split('</td></tr></table></div>')[0].trim();
					if (Tools.isUsernameLength(winner)) {
						room.userHostedGame.useHostCommand("addgamepoint", winner);
					}
				}

				room.serverHangman = null;
			} else if (messageArguments.html.startsWith('<div class="broadcast-red"><p style="text-align:left;font-weight:bold;' +
				'font-size:10pt;margin:5px 0 0 15px">Too bad! The mon has been hanged.</p>')) {
				room.serverHangman = null;
			} else if (messageArguments.html === "<b>The tournament's custom rules were cleared.</b>") {
				if (room.tournament) {
					room.tournament.format = Dex.getExistingFormat(room.tournament.format.name);
					room.tournament.setCustomFormatName();
				}
			} else if (messageArguments.html.startsWith('<div class="message"><ul class="utilichart"><li class="result">') ||
				messageArguments.html.startsWith('<ul class="utilichart"><li class="result">')) {
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'chat' && lastOutgoingMessage.roomid === room.id &&
					this.isDataRollCommand(lastOutgoingMessage.text!)) {
					this.websocket.clearLastOutgoingMessage(now);
				}
			}
			break;
		}

		case 'pagehtml': {
			if (room.id === 'view-filters') {
				if (lastOutgoingMessage && lastOutgoingMessage.type === 'filters-view') {
					this.websocket.clearLastOutgoingMessage(now);
				}

				const messageArguments: IClientMessageTypes['pagehtml'] = {
					html: Tools.unescapeHTML(message.whole),
				};
				this.filters.update(messageArguments.html);
			}
			break;
		}

		case 'uhtmlchange':
		case 'uhtml': {
			const messageArguments: IClientMessageTypes['uhtml'] = {
				name: message.parts[0],
				html: Tools.unescapeHTML(message.parts.slice(1).join("|")),
			};

			const uhtmlId = Tools.toId(messageArguments.name);
			const htmlId = Tools.toId(messageArguments.html);
			if (lastOutgoingMessage && (lastOutgoingMessage.type === 'chat-uhtml' || lastOutgoingMessage.type === 'chat-uhtml-change') &&
				Tools.toId(lastOutgoingMessage.uhtmlName) === uhtmlId &&
				Tools.toId(lastOutgoingMessage.html) === htmlId) {
				this.websocket.clearLastOutgoingMessage(now);
			} else if (lastOutgoingMessage && messageArguments.name.startsWith('hangman') &&
				(lastOutgoingMessage.type === 'hangman-start' || (lastOutgoingMessage.type === 'hangman-end' &&
				messageArguments.html === '<div class="infobox">(The game of hangman was ended.)</div>'))) {
				this.websocket.clearLastOutgoingMessage(now);
			}

			if (uhtmlId in room.uhtmlMessageListeners && htmlId in room.uhtmlMessageListeners[uhtmlId]) {
				room.uhtmlMessageListeners[uhtmlId][htmlId](now);
				room.removeUhtmlMessageListener(uhtmlId, htmlId);
			}

			if (message.type !== 'uhtmlchange') room.addUhtmlChatLog(messageArguments.name, messageArguments.html);

			break;
		}

		case 'tempnotify': {
			const messageArguments: IClientMessageTypes['tempnotify'] = {
				id: message.parts[0],
				title: message.parts[1],
				message: message.parts[2],
				highlight: message.parts[3],
			};

			if (lastOutgoingMessage && lastOutgoingMessage.type === 'notifyrank' &&
				lastOutgoingMessage.roomid === room.id && lastOutgoingMessage.notifyId === messageArguments.id &&
				messageArguments.title.startsWith(lastOutgoingMessage.notifyTitle!) &&
				lastOutgoingMessage.notifyMessage === messageArguments.message) {
				this.websocket.clearLastOutgoingMessage(now);
			}
			break;
		}

		case 'tempnotifyoff': {
			const messageArguments: IClientMessageTypes['tempnotifyoff'] = {
				id: message.parts[0],
			};

			if (lastOutgoingMessage && lastOutgoingMessage.type === 'notifyoffrank' &&
				lastOutgoingMessage.roomid === room.id && lastOutgoingMessage.notifyId === messageArguments.id) {
				this.websocket.clearLastOutgoingMessage(now);
			}
			break;
		}

		/**
		 * Tournament messages
		 */
		case 'tournament': {
			if (!room.tournament && !(room.id in Tournaments.createListeners) &&
				(!Config.allowTournaments || !Config.allowTournaments.includes(room.id))) return;

			const subMessage = Tools.getSubIncomingMessage<ITournamentMessageTypes>(message);
			switch (subMessage.type) {
			case 'create': {
				const messageArguments: ITournamentMessageTypes['create'] = {
					formatid: subMessage.parts[0],
				};

				const format = Dex.getFormat(messageArguments.formatid);
				if (room.tournament && (!format || room.tournament.format.id !== format.id)) room.tournament.forceEnd();

				if (lastOutgoingMessage && lastOutgoingMessage.roomid === room.id &&
					lastOutgoingMessage.type === 'tournament-create') {
					if (format && format.id === lastOutgoingMessage.format!) {
						this.websocket.clearLastOutgoingMessage(now);
					}
				}
				break;
			}

			case 'update': {
				const messageArguments: ITournamentMessageTypes['update'] = {
					json: JSON.parse(subMessage.whole) as ITournamentUpdateJson,
				};

				if (!room.tournament) Tournaments.onNewTournament(room, messageArguments.json);

				if (room.tournament) {
					room.tournament.update(messageArguments.json);

					if (messageArguments.json.playerCap && lastOutgoingMessage && lastOutgoingMessage.roomid === room.id &&
						lastOutgoingMessage.type === 'tournament-cap') {
						this.websocket.clearLastOutgoingMessage(now);
					} else if (lastOutgoingMessage && lastOutgoingMessage.roomid === room.id &&
						lastOutgoingMessage.type === 'tournament-name' &&
						messageArguments.json.format === lastOutgoingMessage.name!) {
						this.websocket.clearLastOutgoingMessage(now);
					} else if (lastOutgoingMessage && lastOutgoingMessage.roomid === room.id &&
						lastOutgoingMessage.type === 'tournament-rules' &&
						messageArguments.json.format === room.tournament.format.name + Dex.getDefaultCustomRulesName()) {
						this.websocket.clearLastOutgoingMessage(now);
					}
				}
				break;
			}

			case 'updateEnd': {
				if (room.tournament) room.tournament.updateEnd();
				break;
			}

			case 'end': {
				const messageArguments: ITournamentMessageTypes['end'] = {
					json: JSON.parse(subMessage.whole) as ITournamentEndJson,
				};

				room.addHtmlChatLog("tournament|end");

				if (!room.tournament) Tournaments.onNewTournament(room, messageArguments.json);
				if (room.tournament) {
					room.tournament.update(messageArguments.json);
					room.tournament.updateEnd();
					room.tournament.end();
				}

				Tournaments.onTournamentEnd(room, now);
				break;
			}

			case 'forceend': {
				if (lastOutgoingMessage && lastOutgoingMessage.roomid === room.id &&
					lastOutgoingMessage.type === 'tournament-end') {
					this.websocket.clearLastOutgoingMessage(now);
				}

				room.addHtmlChatLog("tournament|forceend");

				if (room.tournament) room.tournament.forceEnd();

				Tournaments.onTournamentEnd(room, now);
				break;
			}

			case 'autodq': {
				if (lastOutgoingMessage && lastOutgoingMessage.roomid === room.id &&
					lastOutgoingMessage.type === 'tournament-autodq') {
					this.websocket.clearLastOutgoingMessage(now);
				}

				if (!room.tournament) return;

				const messageArguments: ITournamentMessageTypes['autodq'] = {
					status: subMessage.parts[0],
					time: parseInt(subMessage.parts[1]),
				};

				if (Tools.toId(messageArguments.status) === "on" && !isNaN(messageArguments.time)) {
					room.tournament.setAutoDqMinutes(messageArguments.time / 60 / 1000);
				}

				break;
			}

			case 'autostart': {
				if (lastOutgoingMessage && lastOutgoingMessage.roomid === room.id &&
					lastOutgoingMessage.type === 'tournament-autostart') {
					this.websocket.clearLastOutgoingMessage(now);
				}
				break;
			}

			case 'scouting': {
				if (lastOutgoingMessage && lastOutgoingMessage.roomid === room.id &&
					lastOutgoingMessage.type === 'tournament-scouting') {
					this.websocket.clearLastOutgoingMessage(now);
				}
				break;
			}

			case 'start': {
				if (lastOutgoingMessage && lastOutgoingMessage.roomid === room.id &&
					lastOutgoingMessage.type === 'tournament-start') {
					this.websocket.clearLastOutgoingMessage(now);
				}

				room.addHtmlChatLog("tournament|start");

				if (room.tournament) room.tournament.start();
				break;
			}

			case 'join': {
				room.addHtmlChatLog("tournament|join");

				if (!room.tournament) return;

				const messageArguments: ITournamentMessageTypes['join'] = {
					username: subMessage.parts[0],
				};
				room.tournament.addPlayer(messageArguments.username);
				break;
			}

			case 'leave':
			case 'disqualify': {
				const messageArguments: ITournamentMessageTypes['leave'] = {
					username: subMessage.parts[0],
				};

				if (subMessage.type === 'disqualify' && lastOutgoingMessage && lastOutgoingMessage.roomid === room.id &&
					lastOutgoingMessage.type === 'tournament-disqualify' &&
					Tools.toId(messageArguments.username) === lastOutgoingMessage.disqualifiedUserid) {
					this.websocket.clearLastOutgoingMessage(now);
				}

				room.addHtmlChatLog("tournament|leave");

				if (!room.tournament) return;

				room.tournament.removePlayer(messageArguments.username);
				break;
			}

			case 'battlestart': {
				room.addHtmlChatLog("tournament|battlestart");

				if (!room.tournament) return;

				const messageArguments: ITournamentMessageTypes['battlestart'] = {
					usernameA: subMessage.parts[0],
					usernameB: subMessage.parts[1],
					roomid: subMessage.parts[2],
				};

				room.tournament.onBattleStart(messageArguments.usernameA, messageArguments.usernameB, messageArguments.roomid);
				break;
			}

			case 'battleend': {
				room.addHtmlChatLog("tournament|battleend");

				if (!room.tournament) return;

				const messageArguments: ITournamentMessageTypes['battleend'] = {
					usernameA: subMessage.parts[0],
					usernameB: subMessage.parts[1],
					result: subMessage.parts[2] as 'win' | 'loss' | 'draw',
					score: subMessage.parts[3].split(',') as [string, string],
					recorded: subMessage.parts[4] as 'success' | 'fail',
					roomid: subMessage.parts[5],
				};

				room.tournament.onBattleEnd(messageArguments.usernameA, messageArguments.usernameB, messageArguments.score,
					messageArguments.roomid);
				break;
			}

			case 'error': {
				const messageArguments: ITournamentMessageTypes['error'] = {
					errorType: subMessage.parts[0],
					errorMessage: subMessage.parts[1],
				};

				if (lastOutgoingMessage && lastOutgoingMessage.roomid === room.id &&
					lastOutgoingMessage.type === 'tournament-disqualify' &&
					Tools.toId(messageArguments.errorType) === "alreadydisqualified" &&
					Tools.toId(messageArguments.errorMessage) === lastOutgoingMessage.disqualifiedUserid) {
					this.websocket.clearLastOutgoingMessage(now);
				}
				break;
			}
			}
			break;
		}

		/**
		 * Battle messages
		 */
		case 'player': {
			const messageArguments: IClientMessageTypes['player'] = {
				slot: message.parts[0],
				username: message.parts[1],
			};

			if (room.tournament) {
				room.tournament.onBattlePlayer(room, messageArguments.slot, messageArguments.username);
			}

			if (room.game) {
				if (room.game.onBattlePlayer) room.game.onBattlePlayer(room, messageArguments.slot, messageArguments.username);
			}
			break;
		}

		case 'teamsize': {
			const messageArguments: IClientMessageTypes['teamsize'] = {
				slot: message.parts[0],
				size: parseInt(message.parts[1]),
			};

			if (room.tournament) {
				room.tournament.onBattleTeamSize(room, messageArguments.slot, messageArguments.size);
			}

			if (room.game) {
				if (room.game.onBattleTeamSize && !room.game.onBattleTeamSize(room, messageArguments.slot, messageArguments.size)) {
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					if (room.game) room.game.leaveBattleRoom(room);
				}
			}
			break;
		}

		case 'teampreview': {
			if (room.game) {
				if (room.game.onBattleTeamPreview && !room.game.onBattleTeamPreview(room)) {
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					if (room.game) room.game.leaveBattleRoom(room);
				}
			}
			break;
		}

		case 'start': {
			if (room.game) {
				if (room.game.onBattleStart && !room.game.onBattleStart(room)) {
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					if (room.game) room.game.leaveBattleRoom(room);
				}
			}
			break;
		}

		case 'poke': {
			const messageArguments: IClientMessageTypes['poke'] = {
				slot: message.parts[0],
				details: message.parts[1],
				item: message.parts[2] === 'item',
			};

			if (room.game) {
				if (room.game.onBattlePokemon && !room.game.onBattlePokemon(room, messageArguments.slot, messageArguments.details,
					messageArguments.item)) {
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					if (room.game) room.game.leaveBattleRoom(room);
				}
			}
			break;
		}

		case 'move': {
			const messageArguments: IClientMessageTypes['move'] = {
				pokemon: message.parts[0],
				move: message.parts[1],
				target: message.parts[2],
			};

			if (room.game) {
				if (room.game.onBattleMove && !room.game.onBattleMove(room, messageArguments.pokemon, messageArguments.move,
					messageArguments.target)) {
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					if (room.game) room.game.leaveBattleRoom(room);
				}
			}
			break;
		}

		case 'faint': {
			const messageArguments: IClientMessageTypes['faint'] = {
				pokemon: message.parts[0],
			};

			if (room.tournament) {
				room.tournament.onBattleFaint(room, messageArguments.pokemon);
			}

			if (room.game) {
				if (room.game.onBattleFaint && !room.game.onBattleFaint(room, messageArguments.pokemon)) {
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					if (room.game) room.game.leaveBattleRoom(room);
				}
			}
			break;
		}

		case 'drag':
		case 'switch': {
			const messageArguments: IClientMessageTypes['switch'] = {
				pokemon: message.parts[0],
				details: message.parts[1],
				hpStatus: message.parts[2].split(" ") as [string, string],
			};

			if (room.game) {
				if (room.game.onBattleSwitch && !room.game.onBattleSwitch(room, messageArguments.pokemon, messageArguments.details,
					messageArguments.hpStatus)) {
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					if (room.game) room.game.leaveBattleRoom(room);
				}
			}
			break;
		}

		case '-message': {
			const messageArguments: IClientMessageTypes['-message'] = {
				message: message.parts[0],
			};

			if (room.game) {
				if (room.game.onBattleMessage && !room.game.onBattleMessage(room, messageArguments.message)) {
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					if (room.game) room.game.leaveBattleRoom(room);
				}
			}

			break;
		}

		case 'win': {
			const messageArguments: IClientMessageTypes['win'] = {
				username: message.parts[0],
			};

			if (room.game) {
				if (room.game.onBattleWin) room.game.onBattleWin(room, messageArguments.username);
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				if (room.game) room.game.leaveBattleRoom(room);
			}

			break;
		}

		case 'tie': {
			if (room.game) {
				if (room.game.onBattleTie) room.game.onBattleTie(room);
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				if (room.game) room.game.leaveBattleRoom(room);
			}

			break;
		}

		case 'expire': {
			if (room.game && room.game.onBattleExpire) {
				room.game.onBattleExpire(room);
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				if (room.game) room.game.leaveBattleRoom(room);
			}
			break;
		}
		}
	}

	onConnect(): void {
		this.loggedIn = false;
	}

	prepareReconnect(): void {
		Tools.logMessage("Client.reconnect() called");

		this.roomsToRejoin = Rooms.getRoomIds();
		if (Config.rooms && !Config.rooms.includes(this.defaultMessageRoom)) {
			const index = this.roomsToRejoin.indexOf(this.defaultMessageRoom);
			if (index !== -1) this.roomsToRejoin.splice(index, 1);
		}

		for (const id of this.roomsToRejoin) {
			const reconnectRoomMessages: string[] = [];
			const room = Rooms.get(id)!;
			let game: ScriptedGame | UserHostedGame | undefined;
			if (room.game && room.game.started) {
				game = room.game;
			} else if (room.userHostedGame && room.userHostedGame.started) {
				game = room.userHostedGame;
			}

			if (game) {
				reconnectRoomMessages.push(Users.self.name + " had to reconnect to the server so the game was forcibly ended.");
				game.deallocate(true);
			}

			if (room.searchChallenge) {
				reconnectRoomMessages.push(Users.self.name + " had to reconnect to the server so the search challenge was forcibly ended.");
				room.searchChallenge.deallocate(true);
			}

			if (reconnectRoomMessages.length) {
				this.reconnectRoomMessages[room.id] = reconnectRoomMessages;
			}
		}

		for (const id of Users.getUserIds()) {
			const user = Users.get(id)!;
			if (user.game) user.game.deallocate(true);
		}

		this.loggedIn = false;
		this.websocket.reconnect(true);
	}

	private loadMessageParsersDirectory(directory: string, optional?: boolean): void {
		let messageParserFiles: string[] = [];
		try {
			messageParserFiles = fs.readdirSync(directory);
		} catch (e) {
			if ((e as NodeJS.ErrnoException).code === 'ENOENT' && optional) return;
			throw e;
		}

		for (const fileName of messageParserFiles) {
			if (!fileName.endsWith('.js') || fileName === 'example.js') continue;
			const filePath = path.join(directory, fileName);
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const messageParser = require(filePath) as IMessageParserFile;
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (!messageParser.parseMessage) throw new Error("No parseMessage function exported from " + filePath);

			if (!messageParser.priority) messageParser.priority = 0;
			this.messageParsers.push(messageParser);
		}
	}

	private beforeReload(): void {
		this.websocket.beforeReload();
	}

	/* eslint-disable @typescript-eslint/no-unnecessary-condition */
	private onReload(previous: Client): void {
		if (previous.botGreetingCooldowns) Object.assign(this.botGreetingCooldowns, previous.botGreetingCooldowns);
		if (previous.groupSymbols) Object.assign(this.groupSymbols, previous.groupSymbols);
		if (previous.loggedIn) this.loggedIn = previous.loggedIn;
		if (previous.publicChatRooms) this.publicChatRooms = previous.publicChatRooms.slice();

		if (previous.serverGroupsResponse) {
			this.serverGroupsResponse = previous.serverGroupsResponse.slice();
			this.parseServerGroups();
		} else if (previous.serverGroups) {
			Object.assign(this.serverGroups, previous.serverGroups);
		}
		if (previous.serverTimeOffset) this.serverTimeOffset = previous.serverTimeOffset;

		for (const messageParser of previous.messageParsers) {
			Tools.unrefProperties(messageParser);
		}

		this.filters.onReload(previous.filters);
		this.websocket.onReload(previous.websocket);

		Tools.unrefProperties(previous);
	}
	/* eslint-enable */

	private parseChatMessage(room: Room, user: User, message: string, now: number): void {
		CommandParser.parse(room, user, message, now);

		const lowerCaseMessage = message.toLowerCase();

		// unlink tournament battle replays
		if (room.unlinkTournamentReplays && room.tournament && !room.tournament.format.team &&
			lowerCaseMessage.includes(this.replayServerAddress) && !user.hasRank(room, 'voice')) {
			const battle = this.extractBattleId(lowerCaseMessage);
			if (battle && room.tournament.battleRooms.includes(battle.publicId)) {
				room.warn(user, "Please do not link to tournament battles");
			}
		}

		// unlink game battles
		if (room.game && room.game.battleRooms && (lowerCaseMessage.includes(this.replayServerAddress) ||
			lowerCaseMessage.includes(this.serverAddress)) && !user.hasRank(room, 'voice')) {
			const battle = this.extractBattleId(lowerCaseMessage);
			if (battle && room.game.battleRooms.includes(battle.publicId)) {
				room.warn(user, "Please do not link to game battles");
			}
		}

		// unlink unapproved Challonge tournaments
		if (room.unlinkChallongeLinks && lowerCaseMessage.includes('challonge.com/')) {
			const links: string[] = [];
			const possibleLinks = message.split(" ");
			for (const possibleLink of possibleLinks) {
				const link = Tools.getChallongeUrl(possibleLink);
				if (link) links.push(link);
			}

			const database = Storage.getDatabase(room);
			let rank: GroupName = 'voice';
			if (Config.userHostedTournamentRanks && room.id in Config.userHostedTournamentRanks) {
				rank = Config.userHostedTournamentRanks[room.id].review;
			}

			const authOrTHC = user.hasRank(room, rank) || (database.thcWinners && user.id in database.thcWinners);
			outer:
			for (const link of links) {
				if (room.approvedUserHostedTournaments) {
					for (const i in room.approvedUserHostedTournaments) {
						if (room.approvedUserHostedTournaments[i].urls.includes(link)) {
							if (!authOrTHC && room.approvedUserHostedTournaments[i].hostId !== user.id) {
								room.warn(user, "Please do not post links to other hosts' tournaments");
							}
							break outer;
						}
					}
				}

				if (authOrTHC) {
					if (!room.approvedUserHostedTournaments) room.approvedUserHostedTournaments = {};
					room.approvedUserHostedTournaments[link] = {
						hostName: user.name,
						hostId: user.id,
						startTime: now,
						approvalStatus: 'approved',
						reviewer: user.id,
						urls: [link],
					};
				} else {
					for (const i in room.newUserHostedTournaments) {
						if (room.newUserHostedTournaments[i].urls.includes(link)) {
							if (room.newUserHostedTournaments[i].hostId !== user.id) {
								room.warn(user, "Please do not post links to other hosts' tournaments");
							} else if (room.newUserHostedTournaments[i].approvalStatus === 'changes-requested') {
								let name = room.newUserHostedTournaments[i].reviewer;
								const reviewer = Users.get(name);
								if (reviewer) name = reviewer.name;
								room.warn(user, name + " has requested changes for your tournament and you " +
									"must wait for them to be approved");
							} else {
								room.warn(user, "You must wait for a staff member to approve your tournament");
							}
							break outer;
						}
					}
					room.warn(user, "Your tournament must be approved by a staff member");
					user.say('Use the command ``' + Config.commandCharacter + 'gettourapproval ' + room.id + ', __bracket link__, ' +
						'__signup link__`` to get your tournament approved (insert your actual links).');
					break;
				}
			}
		}

		// per-game parsing
		if (room.game && room.game.parseChatMessage) room.game.parseChatMessage(user, message);
	}

	private parseServerGroups(): void {
		this.serverGroups = {};

		let ranking = this.serverGroupsResponse.length;
		for (const group of this.serverGroupsResponse) {
			this.serverGroups[group.symbol] = Object.assign({ranking}, group);
			ranking--;

			if (group.name === null) {
				this.groupSymbols.regularuser = group.symbol;
			} else {
				this.groupSymbols[Tools.toId(group.name) as GroupName] = group.symbol;
			}
		}

		if (this.serverAddress === Tools.mainServer) {
			if (this.serverGroups[DEFAULT_GROUP_SYMBOLS.star].ranking < this.serverGroups[DEFAULT_GROUP_SYMBOLS.prizewinner].ranking) {
				const prizeWinner = this.serverGroups[DEFAULT_GROUP_SYMBOLS.prizewinner].ranking;
				this.serverGroups[DEFAULT_GROUP_SYMBOLS.prizewinner].ranking = this.serverGroups[DEFAULT_GROUP_SYMBOLS.star].ranking;
				this.serverGroups[DEFAULT_GROUP_SYMBOLS.star].ranking = prizeWinner;
			}
		} else {
			if (!(DEFAULT_GROUP_SYMBOLS.star in this.serverGroups)) {
				this.serverGroups[DEFAULT_GROUP_SYMBOLS.star] = {
					name: 'Star',
					ranking: this.serverGroups[DEFAULT_GROUP_SYMBOLS.voice].ranking - 1,
					symbol: DEFAULT_GROUP_SYMBOLS.star,
					type: 'normal',
				};
			}
		}
	}
}

export const instantiate = (): void => {
	let oldClient = global.Client as Client | undefined;
	if (oldClient) {
		// @ts-expect-error
		oldClient.beforeReload();
	}

	global.Client = new Client();

	if (oldClient) {
		// @ts-expect-error
		global.Client.onReload(oldClient);
		oldClient = undefined;
	}
};

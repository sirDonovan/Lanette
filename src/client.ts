import https = require('https');
import querystring = require('querystring');
import url = require('url');
import websocket = require('websocket');
import { Room, RoomType } from './rooms';
import { IClientMessageTypes, IRoomInfoResponse, IServerGroup, ITournamentMessageTypes, IUserDetailsResponse, ServerGroupData } from './types/client-message-types';
import { ISeparatedCustomRules } from './types/in-game-data-types';
import { User } from './users';

const RELOGIN_SECONDS = 60;
const SEND_THROTTLE = 800;
const DEFAULT_SERVER_GROUPS: ServerGroupData[] = [
	{
		"symbol": "~",
		"name": "Administrator",
		"type": "leadership",
	},
	{
		"symbol": "&",
		"name": "Leader",
		"type": "leadership",
	},
	{
		"symbol": "#",
		"name": "Room Owner",
		"type": "leadership",
	},
	{
		"symbol": "★",
		"name": "Host",
		"type": "leadership",
	},
	{
		"symbol": "@",
		"name": "Moderator",
		"type": "staff",
	},
	{
		"symbol": "%",
		"name": "Driver",
		"type": "staff",
	},
	{
		"symbol": "☆",
		"name": "Player",
		"type": "normal",
	},
	{
		"symbol": "*",
		"name": "Bot",
		"type": "normal",
	},
	{
		"symbol": "+",
		"name": "Voice",
		"type": "normal",
	},
	{
		"symbol": " ",
		"name": null,
		"type": "normal",
	},
	{
		"symbol": "‽",
		"name": "Locked",
		"type": "punishment",
	},
	{
		"symbol": "!",
		"name": "Muted",
		"type": "punishment",
	},
];

export class Client {
	challstr: string = '';
	client: websocket.client = new websocket.client();
	connection: websocket.connection | null = null;
	connectionAttempts: number = 0;
	connectionTimeout: NodeJS.Timer | null = null;
	filterPhrases: string[] | null = null;
	filterRegularExpressions: RegExp[] | null = null;
	groupSymbols: Dict<string> = {};
	loggedIn: boolean = false;
	loginTimeout: NodeJS.Timer | null = null;
	reconnectTime: number = Config.reconnectTime || 60 * 1000;
	sendQueue: string[] = [];
	sendTimeout: NodeJS.Timer | null = null;
	server: string = Config.server || 'play.pokemonshowdown.com';
	serverGroups: Dict<IServerGroup> = {};
	serverId: string = 'showdown';
	serverTimeOffset: number = 0;

	constructor() {
		this.client.on('connect', connection => {
			this.connection = connection;

			this.connection.on('message', message => global.Client.onMessage(message));
			this.connection.on('error', error => global.Client.onConnectionError(error));
			this.connection.on('close', (code, description) => global.Client.onConnectionClose(code, description));

			this.onConnect();
		});
		this.client.on('connectFailed', error => global.Client.onConnectFail(error));

		this.parseServerGroups(DEFAULT_SERVER_GROUPS);
	}

	onReload(previous: Client) {
		this.challstr = previous.challstr;
		this.client = previous.client;
		this.connection = previous.connection;
		this.filterPhrases = previous.filterPhrases;
		this.filterRegularExpressions = previous.filterRegularExpressions;
		this.groupSymbols = previous.groupSymbols;
		this.loggedIn = previous.loggedIn;
		this.sendQueue = previous.sendQueue;
		this.sendTimeout = previous.sendTimeout;
		this.server = previous.server;
		this.serverGroups = previous.serverGroups;
		this.serverId = previous.serverId;
		this.serverTimeOffset = previous.serverTimeOffset;
	}

	onConnectFail(error?: Error) {
		if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
		console.log('Failed to connect to server ' + this.serverId);
		if (error) console.log(error.stack);
		this.connectionAttempts++;
		const reconnectTime = this.reconnectTime * this.connectionAttempts;
		console.log('Retrying in ' + (reconnectTime / 1000) + ' seconds');
		this.connectionTimeout = setTimeout(() => this.connect(), reconnectTime);
	}

	onConnectionError(error: Error) {
		console.log('Connection error: ' + error.stack);
		// 'close' is emitted directly after 'error' so reconnecting is handled in onConnectionClose
	}

	onConnectionClose(code: number, description: string) {
		if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
		if (this.loginTimeout) clearTimeout(this.loginTimeout);
		console.log('Connection closed: ' + description + ' (' + code + ')');
		console.log('Reconnecting in ' + (this.reconnectTime /  1000) + ' seconds');
		this.connectionTimeout = setTimeout(() => this.reconnect(), this.reconnectTime);
	}

	onConnect() {
		if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
		console.log('Successfully connected');
		Dex.fetchClientData();
	}

	connect() {
		const options = {
			hostname: 'play.pokemonshowdown.com',
			path: '/crossdomain.php?' + querystring.stringify({host: this.server, path: ''}),
			method: 'GET',
		};

		this.connectionTimeout = setTimeout(() => this.onConnectFail(), 30 * 1000);

		console.log("Attempting to connect to the server " + this.server + "...");
		https.get(options, response => {
			response.setEncoding('utf8');
			let data = '';
			response.on('data', chunk => {
				data += chunk;
			});
			response.on('end', () => {
				const configData = data.split('var config = ')[1];
				if (configData) {
					let config = JSON.parse(configData.split(';')[0]);
					// the config is potentially encoded twice by the server
					if (typeof config === 'string') config = JSON.parse(config);
					if (config.host) {
						if (config.id) this.serverId = config.id;
						this.client.connect('ws://' + (config.host === 'showdown' ? 'sim.smogon.com' : config.host) + ':' + (config.port || 8000) + '/showdown/websocket');
						return;
					}
				}
				console.log('Error: failed to get data for server ' + this.server);
			});
		}).on('error', error => {
			console.log('Error: ' + error.message);
		});
	}

	reconnect() {
		Rooms.removeAll();
		Users.removeAll();

		this.connectionAttempts = 0;
		this.loggedIn = false;
		this.connect();
	}

	onMessage(websocketMessage: websocket.IMessage) {
		if (websocketMessage.type !== 'utf8' || !websocketMessage.utf8Data) return;
		const lines = websocketMessage.utf8Data.split("\n");
		let room: Room;
		if (lines[0].charAt(0) === '>') {
			room = Rooms.add(lines[0].substr(1));
			lines.shift();
		} else {
			room = Rooms.add('lobby');
		}
		for (let i = 0; i < lines.length; i++) {
			if (!lines[i]) continue;
			this.parseMessage(room, lines[i]);
			if (lines[i].startsWith('|init|')) {
				const page = room.type === 'html';
				for (let j = i + 1; j < lines.length; j++) {
					if (page) {
						if (lines[j].startsWith('|pagehtml|')) {
							this.parseMessage(room, lines[j]);
							break;
						}
					} else {
						if (lines[j].startsWith('|users|')) {
							this.parseMessage(room, lines[j]);
							for (let k = j + 1; k < lines.length; k++) {
								if (lines[k].startsWith('|:|')) {
									this.parseMessage(room, lines[k]);
									break;
								}
							}
							break;
						}
					}
				}
				return;
			}
		}
	}

	parseMessage(room: Room, rawMessage: string): true {
		let message: string;
		let messageType: keyof IClientMessageTypes;
		if (rawMessage.charAt(0) !== "|") {
			message = rawMessage;
			messageType = '';
		} else {
			message = rawMessage.substr(1);
			const pipeIndex = message.indexOf("|");
			messageType = message.substr(0, pipeIndex) as keyof IClientMessageTypes;
			message = message.substr(pipeIndex + 1);
		}
		const messageParts = message.split("|");
		switch (messageType) {
		/**
		 * Global messages
		 */
		case 'challstr': {
			this.challstr = message;
			if (Config.username) this.login();
			break;
		}

		case 'updateuser': {
			const messageArguments: IClientMessageTypes['updateuser'] = {
				usernameText: messageParts[0],
				loginStatus: messageParts[1],
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
			const {away, status, username} = Tools.parseUsernameText(messageArguments.usernameText);

			if (Tools.toId(username) === Users.self.id) {
				if (this.loggedIn) {
					if (status || Users.self.status) Users.self.status = status;
					if (away) {
						Users.self.away = true;
					} else if (Users.self.away) {
						Users.self.away = false;
					}
				} else {
					if (messageArguments.loginStatus !== '1') {
						console.log('Failed to log in');
						process.exit();
					}
					console.log('Successfully logged in');
					this.loggedIn = true;
					this.send('|/blockchallenges');
					if (rank) {
						Users.self.group = rank;
					} else {
						this.send('|/cmd userdetails ' + Users.self.id);
					}
					if (Config.rooms) {
						for (let i = 0; i < Config.rooms.length; i++) {
							this.send('|/join ' + Config.rooms[i]);
						}
					}
					if (Config.avatar) this.send('|/avatar ' + Config.avatar);
				}
			}
			break;
		}

		case 'queryresponse': {
			const messageArguments: IClientMessageTypes['queryresponse'] = {
				type: messageParts[0] as 'roominfo' | 'userdetails',
				response: messageParts.slice(1).join('|'),
			};
			if (messageParts[0] === 'roominfo') {
				if (messageArguments.response && messageArguments.response !== 'null') {
					const response = JSON.parse(messageArguments.response) as IRoomInfoResponse;
					const room = Rooms.search(response.id);
					if (room) room.onRoomInfoResponse(response);
				}
			} else if (messageParts[0] === 'userdetails') {
				if (messageArguments.response && messageArguments.response !== 'null') {
					const response = JSON.parse(messageArguments.response) as IUserDetailsResponse;
					if (response.userid === Users.self.id) Users.self.group = response.group;
				}
			}
			break;
		}

		case 'init': {
			const messageArguments: IClientMessageTypes['init'] = {
				type: messageParts[0] as RoomType,
			};
			console.log("Joined room: " + room.id);
			room.init(messageArguments.type);
			if (room.type === 'chat') {
				if (room.id === 'staff') room.sayCommand('/filters view');
				room.sayCommand('/cmd roominfo ' + room.id);
				room.sayCommand('/banword list');
				if (room.id in Tournaments.schedules) {
					Tournaments.setScheduledTournament(room);
				}
			}
			break;
		}

		case 'deinit': {
			Rooms.remove(room);
			break;
		}

		case 'customgroups': {
			const messageArguments: IClientMessageTypes['customgroups'] = {
				groups: JSON.parse(messageParts[0]),
			};
			this.parseServerGroups(messageArguments.groups);
			break;
		}

		/**
		 * Chat messages
		 */
		case 'users': {
			const messageArguments: IClientMessageTypes['users'] = {
				userlist: messageParts[0],
			};
			if (messageArguments.userlist !== '0') {
				const users = messageArguments.userlist.split(",");
				for (let i = 1; i < users.length; i++) {
					const rank = users[i].charAt(0);
					const {away, status, username} = Tools.parseUsernameText(users[i].substr(1));
					const user = Users.add(username);
					room.users.add(user);
					if (status || user.status) user.status = status;
					if (away) {
						user.away = true;
					} else if (user.away) {
						user.away = false;
					}
					user.rooms.set(room, rank);
				}
			}
			break;
		}

		case 'join':
		case 'j':
		case 'J': {
			const messageArguments: IClientMessageTypes['join'] = {
				rank: messageParts[0].charAt(0),
				usernameText: messageParts[0].substr(1),
			};
			const {away, status, username} = Tools.parseUsernameText(messageArguments.usernameText);
			const user = Users.add(username);
			room.users.add(user);
			if (status || user.status) user.status = status;
			if (away) {
				user.away = true;
			} else if (user.away) {
				user.away = false;
			}
			user.rooms.set(room, messageArguments.rank);
			if (Config.allowMail && messageArguments.rank !== this.groupSymbols.locked) Storage.retrieveOfflineMessages(user);
			if (room.logChatMessages) {
				Storage.logChatMessage(room, Date.now(), 'J', messageArguments.rank + user.name);
			}
			break;
		}

		case 'leave':
		case 'l':
		case 'L': {
			const messageArguments: IClientMessageTypes['leave'] = {
				rank: messageParts[0].charAt(0),
				usernameText: messageParts[0].substr(1),
			};
			const {away, status, username} = Tools.parseUsernameText(messageArguments.usernameText);
			const user = Users.add(username);
			room.users.delete(user);
			user.rooms.delete(room);
			if (!user.rooms.size) {
				Users.remove(user);
			} else {
				if (status || user.status) user.status = status;
				if (away) {
					user.away = true;
				} else if (user.away) {
					user.away = false;
				}
			}
			if (room.logChatMessages) {
				Storage.logChatMessage(room, Date.now(), 'L', messageArguments.rank + user.name);
			}
			break;
		}

		case 'name':
		case 'n':
		case 'N': {
			const messageArguments: IClientMessageTypes['name'] = {
				rank: messageParts[0].charAt(0),
				usernameText: messageParts[0].substr(1),
				oldId: messageParts[1],
			};
			const {away, status, username} = Tools.parseUsernameText(messageArguments.usernameText);
			const user = Users.rename(username, messageArguments.oldId);
			room.users.add(user);
			if (status || user.status) user.status = status;
			if (away) {
				user.away = true;
			} else if (user.away) {
				user.away = false;
			}
			user.rooms.set(room, messageArguments.rank);
			break;
		}

		case 'chat':
		case 'c':
		case 'c:': {
			let messageArguments: IClientMessageTypes['chat'];
			if (messageType === 'c:') {
				messageArguments = {
					timestamp: (parseInt(messageParts[0]) + this.serverTimeOffset) * 1000,
					rank: messageParts[1].charAt(0),
					username: messageParts[1].substr(1),
					message: messageParts.slice(2).join("|"),
				};
			} else {
				messageArguments = {
					timestamp: Date.now(),
					rank: messageParts[0].charAt(0),
					username: messageParts[0].substr(1),
					message: messageParts.slice(1).join("|"),
				};
			}
			const user = Users.add(messageArguments.username);
			if (user === Users.self) {
				const id = Tools.toId(messageArguments.message);
				if (id in room.messageListeners) {
					room.messageListeners[id]();
					delete room.messageListeners[id];
				}
			} else {
				this.parseChatMessage(room, user, messageArguments.message);
			}
			if (room.logChatMessages) {
				Storage.logChatMessage(room, messageArguments.timestamp, 'c', messageArguments.rank + user.name + '|' + messageArguments.message);
			}
			break;
		}

		case ':': {
			const messageArguments: IClientMessageTypes[':'] = {
				timestamp: parseInt(messageParts[0]),
			};
			this.serverTimeOffset = Math.floor(Date.now() / 1000) - messageArguments.timestamp;
			break;
		}

		case 'pm': {
			const messageArguments: IClientMessageTypes['pm'] = {
				rank: messageParts[0].charAt(0),
				username: messageParts[0].substr(1),
				recipient: messageParts[1].substr(1),
				message: messageParts.slice(2).join("|"),
			};
			const isHtml = messageArguments.message.startsWith("/raw") || messageArguments.message.startsWith("/html");
			const isUthml = !isHtml && messageArguments.message.startsWith("/uthml");
			const user = Users.add(messageArguments.username);
			if (user === Users.self) {
				const recipient = Users.add(messageArguments.recipient);
				if (isUthml) {
					if (recipient.uhtmlMessageListeners) {
						const uhtml = messageArguments.message.substr(messageArguments.message.indexOf(" ") + 1);
						const pipeIndex = uhtml.indexOf("|");
						const id = Tools.toId(uhtml.substr(0, pipeIndex));
						const html = uhtml.substr(pipeIndex + 1);
						if (id in recipient.uhtmlMessageListeners) {
							const htmlId = Tools.toId(html);
							if (htmlId in recipient.uhtmlMessageListeners[id]) {
								recipient.uhtmlMessageListeners[id][htmlId]();
								delete recipient.uhtmlMessageListeners[id][htmlId];
							}
						}
					}
				} else if (isHtml) {
					if (recipient.htmlMessageListeners) {
						const htmlId = Tools.toId(messageArguments.message.substr(messageArguments.message.indexOf(" ") + 1));
						if (htmlId in recipient.htmlMessageListeners) {
							recipient.htmlMessageListeners[htmlId]();
							delete recipient.htmlMessageListeners[htmlId];
						}
					}
				} else {
					if (recipient.messageListeners) {
						const id = Tools.toId(messageArguments.message);
						if (id in recipient.messageListeners) {
							recipient.messageListeners[id]();
							delete recipient.messageListeners[id];
						}
					}
				}
			} else if (!isHtml && !isUthml && messageArguments.rank !== this.groupSymbols.locked) {
				CommandParser.parse(user, user, messageArguments.message);
			}
		}

		case '': {
			const messageArguments: IClientMessageTypes[''] = {
				message: rawMessage,
			};
			if (messageArguments.message.startsWith('Banned phrases in room ')) {
				let subMessage = messageArguments.message.split('Banned phrases in room ')[1];
				const colonIndex = subMessage.indexOf(':');
				const roomId = subMessage.substr(0, colonIndex);
				subMessage = subMessage.substr(colonIndex + 2);
				if (subMessage) {
					const room = Rooms.search(roomId);
					if (room) room.bannedWords = subMessage.split(', ');
				}
			}
			break;
		}

		case 'raw':
		case 'html': {
			const messageArguments: IClientMessageTypes['html'] = {
				html: messageParts.join("|"),
			};
			const htmlId = Tools.toId(messageArguments.html);
			if (htmlId in room.htmlMessageListeners) {
				room.htmlMessageListeners[htmlId]();
				delete room.htmlMessageListeners[htmlId];
			}

			if (messageArguments.html.startsWith('<div class="broadcast-red"><strong>Moderated chat was set to ')) {
				room.modchat = messageArguments.html.split('<div class="broadcast-red"><strong>Moderated chat was set to ')[1].split('!</strong>')[0];
			} else if (messageArguments.html.startsWith('<div class="broadcast-blue"><strong>Moderated chat was disabled!</strong>')) {
				room.modchat = 'off';
			} else if (messageArguments.html.startsWith("<div class='infobox infobox-limited'>This tournament includes:<br />")) {
				if (room.tournament) {
					const separatedCustomRules: ISeparatedCustomRules = {bans: [], unbans: [], addedrules: [], removedrules: []};
					const lines = messageArguments.html.substr(0, messageArguments.html.length - 6).split("<div class='infobox infobox-limited'>This tournament includes:<br />")[1].split('<br />');
					let currentCategory: 'bans' | 'unbans' | 'addedrules' | 'removedrules' = 'bans';
					for (let i = 0; i < lines.length; i++) {
						let line = lines[i].trim();
						if (line.startsWith('<b>')) {
							const category = Tools.toId(line.split('<b>')[1].split('</b>')[0]);
							if (category === 'bans' || category === 'unbans' || category === 'addedrules' || category === 'removedrules') {
								currentCategory = category;
							}
						}
						if (line.includes('</b> - ')) line = line.split('</b> - ')[1];
						separatedCustomRules[currentCategory] = line.split(",").map(x => x.trim());
					}

					room.tournament.format.customRules = Dex.combineCustomRules(separatedCustomRules);
					room.tournament.format.separatedCustomRules = separatedCustomRules;
					if (!room.tournament.manuallyNamed) room.tournament.setCustomFormatName();
				}
			} else if (messageArguments.html === "<b>The tournament's custom rules were cleared.</b>") {
				if (room.tournament) {
					room.tournament.format.customRules = null;
					room.tournament.format.separatedCustomRules = null;
					if (!room.tournament.manuallyNamed) room.tournament.setCustomFormatName();
				}
			}
			break;
		}

		case 'pagehtml': {
			if (room.id === 'view-filters') {
				let filterPhrases: string[] | null = null;
				let filterRegularExpressions: RegExp[] | null = null;
				const messageArguments: IClientMessageTypes['pagehtml'] = {
					html: messageParts.join("|"),
				};
				if (messageArguments.html.includes('<table>')) {
					const table = messageArguments.html.split('<table>')[1].split('</table>')[0];
					const rows = table.split("<tr>");
					let currentHeader = '';

					for (let i = 0; i < rows.length; i++) {
						if (!rows[i]) continue;
						if (rows[i].startsWith('<th colspan="2"><h3>')) {
							currentHeader = rows[i].split('<th colspan="2"><h3>')[1].split(' <span')[0];
						} else if (rows[i].startsWith('<td><abbr title="">') && currentHeader !== 'Whitelisted names') {
							const phrase = rows[i].split('<td><abbr title="">')[1].split('</abbr>')[0];
							// regular expression
							if (phrase.startsWith('<code>/')) {
								const regularExpressionString = phrase.split('<code>/')[1].split('</code>')[0];
								const slashIndex = regularExpressionString.indexOf('/');
								let regularExpression;
								try {
									regularExpression = new RegExp(regularExpressionString.substr(0, slashIndex), regularExpressionString.substr(slashIndex + 1));
								} catch (e) {
									console.log(e);
								}
								if (regularExpression) {
									if (!filterRegularExpressions) filterRegularExpressions = [];
									filterRegularExpressions.push(regularExpression);
								}
							} else {
								if (!filterPhrases) filterPhrases = [];
								filterPhrases.push(phrase);
							}
						}
					}
				}
				this.filterPhrases = filterPhrases;
				this.filterRegularExpressions = filterRegularExpressions;
			}
			break;
		}

		case 'uhtmlchange':
		case 'uhtml': {
			const messageArguments: IClientMessageTypes['uhtml'] = {
				name: messageParts[0],
				html: messageParts.slice(1).join("|"),
			};
			const id = Tools.toId(messageArguments.name);
			if (id in room.uhtmlMessageListeners) {
				const htmlId = Tools.toId(messageArguments.html);
				if (htmlId in room.uhtmlMessageListeners[id]) {
					room.uhtmlMessageListeners[id][htmlId]();
					delete room.uhtmlMessageListeners[id][htmlId];
				}
			}
			break;
		}

		/**
		 * Chatroom messages
		 */
		case 'tournament': {
			const type = messageParts[0] as keyof ITournamentMessageTypes;
			messageParts.shift();
			switch (type) {
				case 'create': {
					if (Config.allowTournaments && Config.allowTournaments.includes(room.id)) {
						const messageArguments: ITournamentMessageTypes['create'] = {
							format: Dex.getExistingFormat(messageParts[0]),
							generator: messageParts[1],
							playerCap: parseInt(messageParts[2]),
						};
						if (Tournaments.tournamentTimers[room.id]) clearTimeout(Tournaments.tournamentTimers[room.id]);
						room.tournament = Tournaments.createTournament(room, messageArguments.format, messageArguments.generator, messageArguments.playerCap);
						if (room.id in Tournaments.createListeners && messageArguments.format.id === Tournaments.createListeners[room.id].format.id) {
							if (Tournaments.createListeners[room.id].scheduled) {
								room.tournament.scheduled = true;
								Tournaments.setScheduledTournament(room);
							}
							room.tournament.format = Tournaments.createListeners[room.id].format;
							if (room.tournament.format.customRules) {
								room.tournament.setCustomFormatName();
								room.sayCommand("/tour rules " + room.tournament.format.customRules.join(","));
							}
							const database = Storage.getDatabase(room);
							if (database.queuedTournament && room.tournament.format.id === Dex.getExistingFormat(database.queuedTournament.formatid, true).id) delete database.queuedTournament;
							delete Tournaments.createListeners[room.id];
						}
						if (room.tournament.playerCap) room.sayCommand("/tour autostart on");
						if (Config.tournamentAutoDQTimers && room.id in Config.tournamentAutoDQTimers) room.sayCommand("/tour autodq " + Config.tournamentAutoDQTimers[room.id]);
						if (!room.tournament.format.team && Config.disallowTournamentScouting && Config.disallowTournamentScouting.includes(room.id)) room.sayCommand("/tour scouting disallow");
						let startMinutes = 5;
						if (Config.tournamentStartTimers && room.id in Config.tournamentStartTimers) {
							startMinutes = Config.tournamentStartTimers[room.id];
							if (room.tournament.scheduled) startMinutes *= 2;
							room.tournament.startTimer = setTimeout(() => room.sayCommand("/tour start"), startMinutes * 60 * 1000);
						}
						if (Config.adjustTournamentCaps && Config.adjustTournamentCaps.includes(room.id)) {
							room.tournament.adjustCapTimer = setTimeout(() => room.tournament!.adjustCap(), (startMinutes / 2) * 60 * 1000);
						}
						if (Config.displayTournamentFormatInfo && Config.displayTournamentFormatInfo.includes(room.id)) {
							const formatInfo = Dex.getFormatInfoDisplay(room.tournament.format);
							if (formatInfo) {
								let divClass = '';
								if (room.tournament.format.team) {
									divClass = 'green';
								} else if (room.tournament.format.gameType === 'singles') {
									divClass = 'blue';
								} else {
									divClass = 'red';
								}
								room.sayHtml("<div class='broadcast-" + divClass + "'><b>" + room.tournament.name + "</b>:</div>" + formatInfo);
							}
						}
						if (Config.tournamentRoomAdvertisements && room.id in Config.tournamentRoomAdvertisements) {
							for (let i = 0; i < Config.tournamentRoomAdvertisements[room.id].length; i++) {
								const advertisementRoom = Rooms.search(Config.tournamentRoomAdvertisements[room.id][i]);
								if (advertisementRoom) advertisementRoom.sayHtml('<a href="/' + room.id + '" class="ilink"><strong>' + room.tournament.name + '</strong> tournament created in <strong>' + room.title + '</strong>.</a>');
							}
						}
					}
					break;
				}

				case 'end': {
					const messageArguments: ITournamentMessageTypes['end'] = {
						json: JSON.parse(messageParts.join("|")),
					};
					if (!room.tournament) Tournaments.createTournamentFromJSON(room, messageArguments.json);
					if (room.tournament) {
						Object.assign(room.tournament.updates, messageArguments.json);
						room.tournament.update();
						room.tournament.end();
					}
					const database = Storage.getDatabase(room);
					const now = Date.now();
					database.lastTournamentTime = now;
					const hasSchedule = room.id in Tournaments.scheduledTournaments;
					if (hasSchedule && Tournaments.scheduledTournaments[room.id].time <= now) {
						Tournaments.setScheduledTournamentTimer(room);
					} else if (database.queuedTournament) {
						let timer: number;
						if (database.queuedTournament.time) {
							timer = database.queuedTournament.time - now;
						} else {
							timer = now + Tournaments.queuedTournamentTime;
						}
						Tournaments.setTournamentTimer(room, timer, Dex.getExistingFormat(database.queuedTournament.formatid, true), database.queuedTournament.playerCap);
					} else {
						if (Config.randomTournamentTimers && room.id in Config.randomTournamentTimers && Tournaments.canSetRandomTournament(room)) {
							Tournaments.setRandomTournamentTimer(room, Config.randomTournamentTimers![room.id]);
						} else if (hasSchedule) {
							Tournaments.setScheduledTournamentTimer(room);
						}
					}
					break;
				}

				case 'update': {
					const messageArguments: ITournamentMessageTypes['update'] = {
						json: JSON.parse(messageParts.join("|")),
					};
					if (!room.tournament) Tournaments.createTournamentFromJSON(room, messageArguments.json);
					if (room.tournament) {
						Object.assign(room.tournament.updates, messageArguments.json);
					}
					break;
				}

				case 'updateEnd': {
					if (room.tournament) room.tournament.update();
					break;
				}

				case 'forceend': {
					if (room.tournament) room.tournament.forceEnd();
					break;
				}

				case 'start': {
					if (room.tournament) {
						if (room.tournament.startTimer) clearTimeout(room.tournament.startTimer);
						room.tournament.start();
					}
					break;
				}

				case 'join': {
					if (room.tournament) {
						const messageArguments: ITournamentMessageTypes['join'] = {
							username: messageParts[0],
						};
						room.tournament.createPlayer(messageArguments.username);
					}
					break;
				}

				case 'leave':
				case 'disqualify': {
					if (room.tournament) {
						const messageArguments: ITournamentMessageTypes['leave'] = {
							username: messageParts[0],
						};
						room.tournament.destroyPlayer(messageArguments.username);
					}
					break;
				}

				case 'battlestart': {
					if (room.tournament) {
						const messageArguments: ITournamentMessageTypes['battlestart'] = {
							usernameA: messageParts[0],
							usernameB: messageParts[1],
							roomid: messageParts[2],
						};
						room.tournament.onBattleStart(messageArguments.usernameA, messageArguments.usernameB, messageArguments.roomid);
					}
					break;
				}

				case 'battleend': {
					if (room.tournament) {
						const messageArguments: ITournamentMessageTypes['battleend'] = {
							usernameA: messageParts[0],
							usernameB: messageParts[1],
							result: messageParts[2] as 'win' | 'loss' | 'draw',
							score: messageParts[3].split(',') as [string, string],
							recorded: messageParts[4] as 'success' | 'fail',
							roomid: messageParts[5],
						};
						room.tournament.onBattleEnd(messageArguments.usernameA, messageArguments.usernameB, messageArguments.score, messageArguments.roomid);
					}
					break;
				}
			}
			break;
		}

		}

		return true;
	}

	parseChatMessage(room: Room, user: User, message: string) {
		const isCommand = CommandParser.parse(room, user, message);

		// unlink tournament battle replays
		if (room.tournament && !room.tournament.format.team && Config.disallowTournamentBattleLinks && Config.disallowTournamentBattleLinks.includes(room.id) && message.includes("replay.pokemonshowdown.com/")) {
			let battle = message.split("replay.pokemonshowdown.com/")[1];
			if (battle) {
				battle = 'battle-' + battle.split(" ")[0].trim();
				if (room.tournament.battleRooms.includes(battle)) {
					room.sayCommand("/warn " + user.name + ", Please do not link replays to tournament battles");
				}
			}
		}

		// per-game parsing
		if (room.game && room.game.parseChatMessage) room.game.parseChatMessage(user, message, isCommand);
	}

	parseServerGroups(groups: ServerGroupData[]) {
		this.serverGroups = {};
		// Bot is below Driver on the user list but above Moderator in terms of permissions
		let botIndex = -1;
		let moderatorIndex = -1;
		for (let i = 0; i < groups.length; i++) {
			if (groups[i].name === 'Bot') {
				botIndex = i;
			} else if ((groups[i].type === 'leadership' || groups[i].type === 'staff') && groups[i].name === 'Moderator') {
				moderatorIndex = i;
			}
		}
		if (botIndex !== -1 && moderatorIndex !== -1) {
			const bot = groups.splice(botIndex, 1);
			groups.splice(moderatorIndex, 0, bot[0]);
		}

		let ranking = groups.length;
		for (let i = 0; i < groups.length; i++) {
			this.serverGroups[groups[i].symbol] = Object.assign({ranking}, groups[i]);
			if (groups[i].name === 'Bot') this.groupSymbols.bot = groups[i].symbol;
			if (groups[i].type === 'leadership' || groups[i].type === 'staff') {
				if (groups[i].name === 'Room Owner' || groups[i].name === 'Moderator' || groups[i].name === 'Driver') {
					this.groupSymbols[Tools.toId(groups[i].name!)] = groups[i].symbol;
				}
			} else if (groups[i].type === 'normal' && groups[i].name === 'Voice') {
				this.groupSymbols.voice = groups[i].symbol;
			} else if (groups[i].type === 'punishment' && groups[i].name === 'Locked') {
				this.groupSymbols.locked = groups[i].symbol;
			}
			ranking--;
		}
	}

	willBeFiltered(message: string, room?: Room): boolean {
		const lowerCase = message.toLowerCase();
		if (this.filterPhrases) {
			for (let i = 0; i < this.filterPhrases.length; i++) {
				if (lowerCase.includes(this.filterPhrases[i])) return true;
			}
		}

		if (this.filterRegularExpressions) {
			for (let i = 0; i < this.filterRegularExpressions.length; i++) {
				if (!!message.match(this.filterRegularExpressions[i])) return true;
			}
		}

		if (room && room.bannedWords) {
			for (let i = 0; i < room.bannedWords.length; i++) {
				if (lowerCase.includes(room.bannedWords[i])) return true;
			}
		}

		return false;
	}

	send(message: string) {
		if (!message || !this.connection || !this.connection.connected) return;
		if (this.sendTimeout) {
			this.sendQueue.push(message);
			return;
		}
		this.connection.send(message);
		this.sendTimeout = setTimeout(() => {
			this.sendTimeout = null;
			if (!this.sendQueue.length) return;
			this.send(this.sendQueue.shift()!);
		}, SEND_THROTTLE);
	}

	login() {
		const action = url.parse('https://play.pokemonshowdown.com/~~' + this.serverId + '/action.php');
		const options: {hostname: string | undefined, path: string | undefined, agent: boolean, method: string, headers?: Dict<string | number>} = {
			hostname: action.hostname,
			path: action.pathname,
			agent: false,
			method: '',
		};

		let postData = '';
		if (Config.password) {
			options.method = 'POST';
			postData = querystring.stringify({
				'act': 'login',
				'name': Config.username,
				'pass': Config.password,
				'challstr': this.challstr,
			});
			options.headers = {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': postData.length,
			};
		} else {
			options.method = 'GET';
			options.path += '?' + querystring.stringify({
				'act': 'getassertion',
				'userid': Tools.toId(Config.username),
				'challstr': this.challstr,
			});
		}

		const request = https.request(options, response => {
			response.setEncoding('utf8');
			let data = '';
			response.on('data', chunk => {
				data += chunk;
			});
			response.on('end', () => {
				if (data === ';') {
					console.log('Failed to log in: invalid password');
					process.exit();
				} else if (data.charAt(0) !== ']') {
					console.log('Failed to log in: ' + data);
					process.exit();
				} else if (data.startsWith('<!DOCTYPE html>')) {
					console.log('Failed to log in: connection timed out. Trying again in ' + RELOGIN_SECONDS + ' seconds');
					this.loginTimeout = setTimeout(() => this.login(), RELOGIN_SECONDS * 1000);
					return;
				} else if (data.includes('heavy load')) {
					console.log('Failed to log in: the login server is under heavy load. Trying again in ' + (RELOGIN_SECONDS * 5) + ' seconds');
					this.loginTimeout = setTimeout(() => this.login(), RELOGIN_SECONDS * 5 * 1000);
					return;
				} else {
					if (Config.password) {
						const assertion = JSON.parse(data.substr(1));
						if (assertion.actionsuccess && assertion.assertion) {
							data = assertion.assertion;
						} else {
							console.log('Failed to log in: ' + data.substr(1));
							process.exit();
						}
					}
					this.send('|/trn ' + Config.username + ',0,' + data);
				}
			});
		});

		request.on('error', error => {
			console.log('Login error: ' + error.stack);
			console.log('Trying again in ' + RELOGIN_SECONDS + ' seconds');
			if (this.loginTimeout) clearTimeout(this.loginTimeout);
			this.loginTimeout = setTimeout(() => this.login(), RELOGIN_SECONDS * 1000);
		});

		if (postData) request.write(postData);
		request.end();
	}
}

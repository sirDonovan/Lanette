import https = require('https');
import querystring = require('querystring');
import url = require('url');
import ws = require('ws');

import type { Room } from './../rooms';
import type { ILoginServerRequestOptions, IOutgoingMessage, IParsedIncomingMessage, IServerConfig } from './../types/client';
import type { User } from './../users';

type IncomingMessageHandler = (room: Room, message: IParsedIncomingMessage, now: number) => void;

interface IWebsocketOptions {
	serverAddress: string;
	defaultMessageRoom: string
	onConnect: () => void;
	onFailedPing: () => void;
	onIncomingMessage: IncomingMessageHandler;
}

type LoginServerAction = 'upkeep' | 'login' | 'getassertion';
const LOGIN_SERVER_ACTION_PATHS: KeyedDict<LoginServerAction, LoginServerAction> = {
	upkeep: "upkeep",
	login: "login",
	getassertion: "getassertion",
};

interface ILoginResponse {
	actionsuccess: boolean;
	assertion: string;
	curuser?: {loggedin: boolean, username: string, userid: string};
}

interface IUpkeepResponse {
	assertion: string;
	username: string;
	loggedin: boolean;
}

const MAIN_HOST = "sim3.psim.us";
const CHALLSTR_TIMEOUT_SECONDS = 15;
const RELOGIN_SECONDS = 60;
const UPKEEP_LOGIN_SECONDS = 15;
const LOGIN_TIMEOUT_SECONDS = 150;
const SERVER_RESTART_CONNECTION_TIME = 10 * 1000;
const REGULAR_MESSAGE_THROTTLE = 600;
const TRUSTED_MESSAGE_THROTTLE = 100;
const PUBLIC_BOT_MESSAGE_THROTTLE = 25;
const SERVER_CHAT_QUEUE_LIMIT = 6;
const STANDARD_MESSAGE_THROTTLE = REGULAR_MESSAGE_THROTTLE * SERVER_CHAT_QUEUE_LIMIT;
const SLOWER_COMMAND_MESSAGE_THROTTLE = STANDARD_MESSAGE_THROTTLE * 2;
const MAX_MESSAGE_SIZE = 100 * 1024;
const CONNECTION_CHECK_INTERVAL = 30 * 1000;

let openListener: (() => void) | null;
let messageListener: ((event: ws.MessageEvent) => void) | null;
let errorListener: ((event: ws.ErrorEvent) => void) | null;
let closeListener: ((event: ws.CloseEvent) => void) | null;
let pongListener: (() => void) | null;

export class Websocket {
    defaultMessageRoom: string;
	serverAddress: string;
	onConnect: () => void;
	onFailedPing: () => void;
	onIncomingMessage: IncomingMessageHandler;
	private loginServerHosts: KeyedDict<LoginServerAction, string>;
	private loginServerPaths: KeyedDict<LoginServerAction, string>;

	private averageOutgoingMessageMeasurements: number[] = [];
	private challstr: string = '';
	private challstrTimeout: NodeJS.Timeout | undefined = undefined;
	private connectionAttempts: number = 0;
	private connectionAttemptTime: number = Config.connectionAttemptTime || 60 * 1000;
	private connectionTimeout: NodeJS.Timeout | undefined = undefined;
	private firstFormatsList: boolean = true;
	private incomingMessageQueue: {event: ws.MessageEvent, timestamp: number}[] = [];
	private lastMeasuredMessage: IOutgoingMessage | null = null;
	private lastSendTimeoutAfterMeasure: number = 0;
	private lastOutgoingMessage: IOutgoingMessage | null = null;
	private lastProcessingTimeCheck: number = 0;
	private loginTimeout: NodeJS.Timeout | undefined = undefined;
	private outgoingMessageQueue: IOutgoingMessage[] = [];
	private outgoingMessageMeasurements: number[] = [];
	private outgoingMessageMeasurementsLimit: number = 30;
	private outgoingMessageMeasurementsInfo: string[] = [];
	private pausedIncomingMessages: boolean = true;
	private pausedOutgoingMessages: boolean = false;
	private pingWsAlive: boolean = true;
	private reFetchClientData: boolean = false;
	private reloadInProgress: boolean = false;
	private retryLoginTimeout: NodeJS.Timeout | undefined = undefined;
	private sendTimeout: NodeJS.Timeout | true | undefined = undefined;
	private sendTimeoutDuration: number = 0;
	private serverId: string = 'showdown';
	private serverPingTimeout: NodeJS.Timeout | null = null;
	private ws: import('ws') | null = null;

	private chatQueueSendThrottle!: number;
	private sendThrottle!: number;

	constructor(options: IWebsocketOptions) {
		this.serverAddress = options.serverAddress;
        this.defaultMessageRoom = options.defaultMessageRoom;
		this.onConnect = options.onConnect;
		this.onFailedPing = options.onFailedPing;
		this.onIncomingMessage = options.onIncomingMessage;

		openListener = () => this.onConnectionOpen();
		messageListener = (event: ws.MessageEvent) => this.onMessage(event, Date.now());
		errorListener = (event: ws.ErrorEvent) => this.onConnectionError(event);
		closeListener = (event: ws.CloseEvent) => this.onConnectionClose(event);

		this.setSendThrottle(Config.publicBot ? PUBLIC_BOT_MESSAGE_THROTTLE : Config.trustedUser ? TRUSTED_MESSAGE_THROTTLE :
			REGULAR_MESSAGE_THROTTLE);

		if (this.serverAddress.startsWith('https://')) {
			this.serverAddress = this.serverAddress.substr(8);
		} else if (this.serverAddress.startsWith('http://')) {
			this.serverAddress = this.serverAddress.substr(7);
		}
		if (this.serverAddress.endsWith('/')) this.serverAddress = this.serverAddress.substr(0, this.serverAddress.length - 1);

		const baseLoginServer = 'https://' + Tools.mainServer + '/api/';
		const upkeep = new url.URL(baseLoginServer + LOGIN_SERVER_ACTION_PATHS.upkeep);
		if (!upkeep.hostname || !upkeep.pathname) {
			console.log("Failed to parse upkeep URL");
			process.exit();
		}

		const login = new url.URL(baseLoginServer + LOGIN_SERVER_ACTION_PATHS.login);
		if (!login.hostname || !login.pathname) {
			console.log("Failed to parse login URL");
			process.exit();
		}

		const getAssertion = new url.URL(baseLoginServer + LOGIN_SERVER_ACTION_PATHS.getassertion);
		if (!getAssertion.hostname || !getAssertion.pathname) {
			console.log("Failed to parse getAssertion URL");
			process.exit();
		}

		this.loginServerHosts = {
			upkeep: upkeep.hostname,
			login: login.hostname,
			getassertion: getAssertion.hostname,
		};

		this.loginServerPaths = {
			upkeep: upkeep.pathname,
			login: login.pathname,
			getassertion: getAssertion.pathname,
		};
	}

	getServerId(): string {
		return this.serverId;
	}

	getLastOutgoingMessage(): DeepImmutable<IOutgoingMessage> | null {
		return this.lastOutgoingMessage;
	}

	getOutgoingMessageQueue(): readonly DeepImmutable<IOutgoingMessage>[] {
		return this.outgoingMessageQueue;
	}

	joinRoom(roomid: string): void {
		this.send({
			message: '|/join ' + roomid,
			roomid,
			type: 'join-room',
			measure: true,
		});
	}

	getRoomInfo(room: Room): void {
		this.send({
			message: '|/cmd roominfo ' + room.id,
			roomid: room.id,
			type: 'query-roominfo',
			measure: true,
		});
	}

	getUserDetails(user: User): void {
		this.send({
			message: '|/cmd userdetails ' + user.id,
			type: 'query-userdetails',
			userDetailsId: user.id,
			measure: true,
		});
	}

	exceedsMessageSizeLimit(message: string): boolean {
		return message.length >= MAX_MESSAGE_SIZE;
	}

	send(outgoingMessage: IOutgoingMessage): void {
		if (!this.ws) return;

		if (!outgoingMessage.message) throw new Error("Message is empty");

		if (this.exceedsMessageSizeLimit(outgoingMessage.message)) {
			throw new Error("Message exceeds server size limit of " + (MAX_MESSAGE_SIZE / 1024) + "KB: " + outgoingMessage.message);
		}

		if (this.sendTimeout || this.pausedOutgoingMessages) {
			this.outgoingMessageQueue.push(outgoingMessage);
			return;
		}

		let room: Room | undefined;
		if (outgoingMessage.roomid && outgoingMessage.type !== 'join-room' && outgoingMessage.type !== 'create-groupchat') {
			room = Rooms.get(outgoingMessage.roomid);
			if (!room) return;

			if (room.type === 'chat' && !room.serverBannedWords && outgoingMessage.type !== 'leave-room' &&
				outgoingMessage.type !== 'banword-list') {
				room.serverBannedWords = [];

				this.send({
					message: room.id + '|/banword list',
					roomid: room.id,
					type: 'banword-list',
					measure: true,
				});

				this.outgoingMessageQueue.push(outgoingMessage);
				return;
			}
		}

		if (outgoingMessage.userid) {
			const user = Users.get(outgoingMessage.userid);
			if (!user || user.locked || (room && !room.getTargetUser(user))) return;
		}

		if (outgoingMessage.filterSend && !outgoingMessage.filterSend()) {
			return;
		}

		this.sendTimeout = true;

		if (outgoingMessage.measure) outgoingMessage.sentTime = Date.now();
		this.lastOutgoingMessage = outgoingMessage;

		this.ws.send(outgoingMessage.message, () => {
			if (this.sendTimeout === true) {
				this.startSendTimeout(outgoingMessage.slowerCommand ? SLOWER_COMMAND_MESSAGE_THROTTLE : STANDARD_MESSAGE_THROTTLE);
			}
		});
	}

	getSendThrottle(): number {
		return this.sendThrottle;
	}

    reconnect(prepared?: boolean): void {
		if (!prepared) {
			Rooms.removeAll();
			Users.removeAll();
			this.outgoingMessageQueue = [];
		}

		this.lastOutgoingMessage = null;
		this.connectionAttempts = 0;

		this.terminate();

		this.reFetchClientData = true;
		this.connect();
	}

    afterLogin(): void {
        if (this.loginTimeout) clearTimeout(this.loginTimeout);
    }

    clearLastOutgoingMessage(responseTime?: number): void {
		if (this.lastOutgoingMessage) {
			if (this.lastOutgoingMessage.measure && this.lastOutgoingMessage.sentTime && responseTime) {
				const measurement = responseTime - this.lastOutgoingMessage.sentTime;
				if (this.outgoingMessageMeasurements.length > this.outgoingMessageMeasurementsLimit) {
					this.outgoingMessageMeasurements.pop();
				}

				if (this.outgoingMessageMeasurementsInfo.length > this.outgoingMessageMeasurementsLimit) {
					this.outgoingMessageMeasurementsInfo.pop();
				}

				this.outgoingMessageMeasurements.unshift(measurement);
				this.outgoingMessageMeasurementsInfo.unshift(measurement + " (" + this.lastOutgoingMessage.type +
					((this.lastOutgoingMessage.roomid || this.lastOutgoingMessage.userid)
						? (" in " + (this.lastOutgoingMessage.roomid || this.lastOutgoingMessage.userid))
						: "")
				+ ")");

				this.lastMeasuredMessage = this.lastOutgoingMessage;
				this.lastProcessingTimeCheck = responseTime;

				let sendTimeout: number;
				if (this.lastOutgoingMessage.slowerCommand) {
					sendTimeout = this.lastSendTimeoutAfterMeasure || this.sendThrottle;
				} else if (measurement >= this.sendThrottle) {
					const serverQueue = Math.ceil(measurement / this.sendThrottle);
					sendTimeout = this.sendThrottle + (this.sendThrottle * serverQueue);
				} else {
					sendTimeout = this.sendThrottle;
				}

				sendTimeout += this.getAverageOutgoingMeasurements();
				this.lastSendTimeoutAfterMeasure = sendTimeout;
				this.startSendTimeout(sendTimeout);
			}

			this.lastOutgoingMessage = null;
		}
	}

    onMessageThrottle(): void {
        Tools.errorLog("Typing too quickly;\nBase throttle: " + this.sendThrottle + "ms\nQueued outgoing messages: " +
            this.outgoingMessageQueue.length +
            "\nOutgoing message measurements: [" + this.outgoingMessageMeasurementsInfo.join(", ") + "]" +
            (this.lastOutgoingMessage && this.lastOutgoingMessage.sentTime ?
            "\n\nMessage sent at: " + new Date(this.lastOutgoingMessage.sentTime).toTimeString() + "; " +
            "Processing time last measured at: " + new Date(this.lastProcessingTimeCheck).toTimeString() + "; " +
            "Message: " + JSON.stringify(this.lastOutgoingMessage) : ""));
        this.startSendTimeout(this.chatQueueSendThrottle);
    }

    pauseOutgoingMessages(): void {
        this.pausedOutgoingMessages = true;
    }

    pauseIncomingMessages(): void {
        this.pausedIncomingMessages = true;
    }

	beforeReload(): void {
		this.pauseIncomingMessages();
		this.reloadInProgress = true;
	}

	onReload(previous: Websocket): void {
		if (previous.challstrTimeout) clearTimeout(previous.challstrTimeout);
		if (previous.serverPingTimeout) clearTimeout(previous.serverPingTimeout);

		if (previous.lastSendTimeoutAfterMeasure) this.lastSendTimeoutAfterMeasure = previous.lastSendTimeoutAfterMeasure;
		if (previous.lastProcessingTimeCheck) this.lastProcessingTimeCheck = previous.lastProcessingTimeCheck;
		if (previous.lastOutgoingMessage) this.lastOutgoingMessage = Object.assign({}, previous.lastOutgoingMessage);
		if (previous.sendTimeoutDuration) this.sendTimeoutDuration = previous.sendTimeoutDuration;

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (previous.averageOutgoingMessageMeasurements) {
			this.averageOutgoingMessageMeasurements = previous.averageOutgoingMessageMeasurements.slice();
		}
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (previous.outgoingMessageQueue) this.outgoingMessageQueue = previous.outgoingMessageQueue.slice();
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (previous.outgoingMessageMeasurements) this.outgoingMessageMeasurements = previous.outgoingMessageMeasurements.slice();
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (previous.outgoingMessageMeasurementsInfo) {
			this.outgoingMessageMeasurementsInfo = previous.outgoingMessageMeasurementsInfo.slice();
		}

		if (previous.ws) {
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (previous.removeClientListeners) previous.removeClientListeners(true);

			this.ws = previous.ws;
			this.setClientListeners();
			this.pingServer();

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (previous.incomingMessageQueue) {
				for (const item of previous.incomingMessageQueue.slice()) {
					if (!this.incomingMessageQueue.includes(item)) this.onMessage(item.event, item.timestamp);
				}
			}

			this.pausedIncomingMessages = false;
			if (this.incomingMessageQueue.length) {
				for (const item of this.incomingMessageQueue) {
					this.onMessage(item.event, item.timestamp);
				}

				this.incomingMessageQueue = [];
			}
		}

		if (previous.challstr) this.challstr = previous.challstr;
		if (previous.sendThrottle) this.setSendThrottle(previous.sendThrottle);

		if (previous.sendTimeout) {
			if (previous.sendTimeout !== true) clearTimeout(previous.sendTimeout);
			previous.sendTimeout = undefined;
			if (!this.sendTimeout) this.startSendTimeout(this.sendTimeoutDuration);
		}

		if (previous.serverAddress) this.serverAddress = previous.serverAddress;
		if (previous.serverId) this.serverId = previous.serverId;

		this.firstFormatsList = previous.firstFormatsList;

		Tools.unrefProperties(previous);
	}

	setPublicBotSendThrottle(): void {
		this.setSendThrottle(PUBLIC_BOT_MESSAGE_THROTTLE);
	}

	setTrustedSendThrottle(): void {
		this.setSendThrottle(TRUSTED_MESSAGE_THROTTLE);
	}

    connect(): void {
		const httpsOptions = {
			hostname: Tools.mainServer,
			path: '/crossdomain.php?' + querystring.stringify({host: this.serverAddress, path: ''}),
			method: 'GET',
			headers: {
				"Cache-Control": "no-cache",
			},
		};

		this.pausedIncomingMessages = false;

		if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
		this.connectionTimeout = setTimeout(() => this.onConnectFail(), 30 * 1000);

		console.log("Attempting to connect to the server " + this.serverAddress + "...");
		https.get(httpsOptions, response => {
			response.setEncoding('utf8');
			let data = '';
			response.on('data', chunk => {
				data += chunk;
			});
			response.on('error', error => {
				Tools.logException(error, "Error during client connect response");
			});
			response.on('end', () => {
				const configData = data.split('var config = ')[1];
				if (configData) {
					let config = JSON.parse(configData.split(';')[0]) as IServerConfig | string;
					// the config is potentially encoded twice by the server
					if (typeof config === 'string') config = JSON.parse(config) as IServerConfig;
					if (config.host) {
						if (config.id) this.serverId = config.id;

						let address: string;
						if (config.host === 'showdown') {
							address = 'wss://' + MAIN_HOST + ':' + (config.port || 443) + '/showdown/websocket';
						} else {
							address = 'ws://' + config.host + ':' + (config.port || 8000) + '/showdown/websocket';
						}

						const wsOptions: ws.ClientOptions = {
							perMessageDeflate: Config.perMessageDeflate || false,
							headers: {
								"Cache-Control": "no-cache",
								"User-Agent": "ws",
							},
							skipUTF8Validation: true,
							allowSynchronousEvents: true,
						};

						this.ws = new ws(address, [], wsOptions);
						this.pausedOutgoingMessages = false;
						this.setClientListeners();

						return;
					}
				}

				Tools.warningLog('Error: failed to get data for server ' + this.serverAddress);
			});
		}).on('error', error => {
			Tools.logException(error, "Error during client connect request");
		});
	}

    /**Removes all webSocket listeners and clears sendTimeout */
	private terminate(): void {
		this.clearConnectionTimeouts();
		this.removeClientListeners();

		if (this.ws) {
			this.ws.terminate();
			this.ws = null;
		}

		this.pauseOutgoingMessages();
	}

	private setSendThrottle(throttle: number): void {
		this.sendThrottle = throttle;
		this.chatQueueSendThrottle = throttle * SERVER_CHAT_QUEUE_LIMIT;
	}

	private setClientListeners(): void {
		if (!this.ws) return;

		this.ws.addEventListener('open', openListener!);
		this.ws.addEventListener('message', messageListener!);
		this.ws.addEventListener('error', errorListener!);
		this.ws.addEventListener('close', closeListener!);
	}

	private removeClientListeners(previousClient?: boolean): void {
		if (!this.ws) return;

		if (openListener) {
			this.ws.removeEventListener('open', openListener);
			if (previousClient) openListener = null;
		}

		if (messageListener) {
			this.ws.removeEventListener('message', messageListener);
			if (previousClient) messageListener = null;
		}

		if (errorListener) {
			this.ws.removeEventListener('error', errorListener);
			if (previousClient) errorListener = null;
		}

		if (closeListener) {
			this.ws.removeEventListener('close', closeListener);
			if (previousClient) closeListener = null;
		}

		if (pongListener) {
			this.ws.off('pong', pongListener);
			if (previousClient) pongListener = null;
		}

		if (this.serverPingTimeout) {
			clearTimeout(this.serverPingTimeout);
			// @ts-expect-error
			this.serverPingTimeout = undefined;
		}
	}

	private pingServer(): void {
		if (!this.ws || this.reloadInProgress) return;

		if (!this.pingWsAlive) {
			this.pingWsAlive = true;
			this.onFailedPing();
			return;
		}

		if (pongListener) {
			this.ws.off('pong', pongListener);
		}

		pongListener = () => {
			this.pingWsAlive = true;
		};

		this.pingWsAlive = false;
		this.ws.once('pong', pongListener);
		this.ws.ping('', undefined, () => {
			if (this.serverPingTimeout) clearTimeout(this.serverPingTimeout);
			this.serverPingTimeout = setTimeout(() => this.pingServer(), CONNECTION_CHECK_INTERVAL + 1000);
		});
	}

	private clearConnectionTimeouts(): void {
		if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
		if (this.challstrTimeout) clearTimeout(this.challstrTimeout);
		if (this.loginTimeout) clearTimeout(this.loginTimeout);
		if (this.retryLoginTimeout) clearTimeout(this.retryLoginTimeout);
		if (this.serverPingTimeout) clearTimeout(this.serverPingTimeout);
		this.clearSendTimeout();
	}

	private onConnectFail(error?: Error): void {
		this.clearConnectionTimeouts();

		console.log('Failed to connect to server ' + this.serverId);
		if (error) console.log(error.stack);

		this.connectionAttempts++;
		const reconnectTime = this.connectionAttemptTime * this.connectionAttempts;
		console.log('Retrying in ' + reconnectTime / 1000 + ' seconds');
		this.connectionTimeout = setTimeout(() => this.connect(), reconnectTime);
	}

	private onConnectionError(event: ws.ErrorEvent): void {
		this.clearConnectionTimeouts();

		console.log('Connection error: ' + event.message);
		// 'close' is emitted directly after 'error' so reconnecting is handled in onConnectionClose
	}

	private onConnectionClose(event: ws.CloseEvent): void {
		this.terminate();

		console.log('Connection closed: ' + event.reason + ' (' + event.code + ')');
		console.log('Reconnecting in ' + SERVER_RESTART_CONNECTION_TIME / 1000 + ' seconds');

		this.connectionTimeout = setTimeout(() => this.reconnect(), SERVER_RESTART_CONNECTION_TIME);
	}

	private onConnectionOpen(): void {
		this.clearConnectionTimeouts();

		console.log('Connection successfully opened');

		this.onConnect();

		this.challstrTimeout = setTimeout(() => {
			console.log("Did not receive a challstr! Reconnecting in " + this.connectionAttemptTime / 1000 + " seconds");
			this.terminate();
			this.connectionTimeout = setTimeout(() => this.connect(), this.connectionAttemptTime);
		}, CHALLSTR_TIMEOUT_SECONDS * 1000);

		this.pingServer();

		// avoid reload race condition on server restart with Tools.updatePokemonShowdown()
		if (!this.reFetchClientData) Dex.fetchClientData();
	}

	private onMessage(event: ws.MessageEvent, now: number): void {
		if (!event.data || typeof event.data !== 'string') return;

		if (this.pausedIncomingMessages) {
			this.incomingMessageQueue.push({event, timestamp: now});
			return;
		}

		const lines = event.data.trim().split("\n");
		let roomid: string;
		if (lines[0].startsWith('>')) {
			roomid = lines[0].substr(1).trim();
			lines.shift();
		} else {
			roomid = this.defaultMessageRoom;
		}

		const room = Rooms.add(roomid);

		if (this.lastOutgoingMessage && this.lastOutgoingMessage.roomid === room.id && (this.lastOutgoingMessage.type === 'join-room' ||
			this.lastOutgoingMessage.type === 'create-groupchat')) {
			this.clearLastOutgoingMessage(now);
		}

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			if (!line) continue;

			try {
				this.parseMessage(room, line, now);

				if (line.startsWith('|init|')) {
					const page = room.type === 'html';
					const chat = !page && room.type === 'chat';
					for (let j = i + 1; j < lines.length; j++) {
						let nextLine = lines[j].trim();
						if (page) {
							if (nextLine.startsWith('|pagehtml|')) {
								this.parseMessage(room, nextLine, now);
								break;
							}
						} else if (chat) {
							if (nextLine.startsWith('|users|')) {
								this.parseMessage(room, nextLine.trim(), now);
								for (let k = j + 1; k < lines.length; k++) {
									nextLine = lines[k].trim();
									if (nextLine.startsWith('|:|')) {
										this.parseMessage(room, nextLine, now);
										break;
									}
								}
								break;
							}
						}
					}

					if (page || chat) return;
				}
			} catch (e) {
				console.log(e);
				Tools.logException(e as NodeJS.ErrnoException, "Websocket.parseMessage() in " + room.id + ": " + line);
			}
		}
	}

    private parseMessage(room: Room, incomingMessage: string, now: number): void {
        const parsedMessage = Tools.parseIncomingMessage(incomingMessage);
        if (parsedMessage.type === 'challstr') {
            if (this.challstrTimeout) clearTimeout(this.challstrTimeout);

			this.challstr = parsedMessage.whole;

			if (Config.username) {
				this.loginTimeout = setTimeout(() => {
					console.log("Failed to login. Reconnecting in " + this.connectionAttemptTime / 1000 + " seconds");
					this.terminate();
					this.connectionTimeout = setTimeout(() => this.connect(), this.connectionAttemptTime);
				}, LOGIN_TIMEOUT_SECONDS * 1000);

				this.checkLoginSession();
			}
        } else if (parsedMessage.type === 'formats') {
			if (this.firstFormatsList) {
				this.firstFormatsList = false;
				return;
			}

			Tools.updatePokemonShowdown(this.reFetchClientData);
			if (this.reFetchClientData) this.reFetchClientData = false;
		} else {
            this.onIncomingMessage(room, parsedMessage, now);
        }
    }

	private clearSendTimeout(): void {
		if (this.sendTimeout) {
			if (this.sendTimeout !== true) clearTimeout(this.sendTimeout);
			delete this.sendTimeout;
		}
	}

	private startSendTimeout(time: number): void {
		this.clearSendTimeout();
		if (this.reloadInProgress) {
			this.sendTimeout = true;
			return;
		}

		this.sendTimeoutDuration = time;
		this.sendTimeout = setTimeout(() => {
			if (this.reloadInProgress) {
				this.sendTimeout = true;
				return;
			}

			delete this.sendTimeout;

			if (this.lastOutgoingMessage) {
				if (this.lastOutgoingMessage.measure) {
					Tools.warningLog("Last outgoing message not measured (" + Date.now() + "): " +
						JSON.stringify(this.lastOutgoingMessage) + "\n\nSend timeout value: " + time +
						"\nLast measured send timeout: " + this.lastSendTimeoutAfterMeasure +
						"\nOutgoing message measurements: [" + this.outgoingMessageMeasurementsInfo.join(", ") + "]" +
						(this.lastMeasuredMessage ? "\n\nLast measured message (" + this.lastProcessingTimeCheck + "): " +
						JSON.stringify(this.lastMeasuredMessage) : ""));
				}
				this.lastOutgoingMessage = null;

				this.startSendTimeout(this.chatQueueSendThrottle + this.getAverageOutgoingMeasurements());
				return;
			}

			// prevent infinite loop with outgoingMessageQueue
			if (this.pausedOutgoingMessages) return;

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			while (!this.sendTimeout && this.outgoingMessageQueue.length) {
				this.send(this.outgoingMessageQueue.shift()!);
			}
		}, time);
	}

	private getAverageOutgoingMeasurements(): number {
		if (!this.outgoingMessageMeasurements.length) return 0;

		let totalMeasurements = 0;
		for (const measurement of this.outgoingMessageMeasurements) {
			totalMeasurements += measurement;
		}

		const average = Math.ceil(totalMeasurements / this.outgoingMessageMeasurements.length);
		if (this.averageOutgoingMessageMeasurements.length > this.outgoingMessageMeasurementsLimit) {
			this.averageOutgoingMessageMeasurements.pop();
		}

		this.averageOutgoingMessageMeasurements.unshift(average);
		return average;
	}

	private setRetryLoginTimeout(failedUpkeep?: boolean): void {
		const timeout = failedUpkeep ? UPKEEP_LOGIN_SECONDS : RELOGIN_SECONDS;
		console.log((failedUpkeep ? 'Trying' : 'Retrying') + ' login in ' + timeout + ' seconds');

		if (this.retryLoginTimeout) clearTimeout(this.retryLoginTimeout);
		this.retryLoginTimeout = setTimeout(() => this.login(failedUpkeep), timeout * 1000);
	}

	private checkLoginSession(): void {
		const globalDatabase = Storage.getGlobalDatabase();
		if (!Config.password || !globalDatabase.loginSessionCookie || globalDatabase.loginSessionCookie.userid !== Users.self.id) {
			this.login(true);
			return;
		}

		const options: ILoginServerRequestOptions = {
			hostname: this.loginServerHosts.upkeep,
			path: this.loginServerPaths.upkeep,
			agent: false,
			method: 'POST',
		};

		const postData =  querystring.stringify({
			'challstr': this.challstr,
		});

		options.headers = {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': postData.length,
			'cookie': globalDatabase.loginSessionCookie.cookie,
		};

		console.log("Attempting to upkeep session...");
		const request = https.request(options, response => {
			response.setEncoding('utf8');
			let data = '';
			response.on('data', chunk => {
				data += chunk;
			});
			response.on('error', error => {
				Tools.logException(error, "Error during client upkeep response");
				this.setRetryLoginTimeout(true);
			});
			response.on('end', () => {
				if (!data) {
					Tools.warningLog('Did not receive a response from the login server.');
					this.login(true);
					return;
				}

				if (data.charAt(0) === ']') data = data.substr(1);

				let sessionAssertion: string | undefined;
				try {
					const sessionResponse = JSON.parse(data) as IUpkeepResponse;
					if (sessionResponse.username && sessionResponse.loggedin) {
						sessionAssertion = sessionResponse.assertion;
					}
				} catch (e) {
					Tools.warningLog('Error parsing upkeep response:\n' + (e as Error).stack);
					this.setRetryLoginTimeout(true);
					return;
				}

				if (sessionAssertion) {
					this.verifyLoginAssertion(sessionAssertion, true);
				} else {
					Tools.debugLog("Previous session expired");
					this.login(true);
				}
			});
		});

		request.on('error', error => {
			Tools.logException(error, "Error during client upkeep request");
			this.setRetryLoginTimeout(true);
		});

		if (postData) request.write(postData);
		request.end();
	}

	private login(failedUpkeep?: boolean): void {
		if (this.retryLoginTimeout) clearTimeout(this.retryLoginTimeout);

		if (failedUpkeep) {
			delete Storage.getGlobalDatabase().loginSessionCookie;
		}

		const options: ILoginServerRequestOptions = {
			hostname: '',
			path: '',
			agent: false,
			method: '',
		};

		let postData = '';
		if (Config.password) {
			options.hostname = this.loginServerHosts.login;
			options.path = this.loginServerPaths.login;
			options.method = 'POST';

			postData = querystring.stringify({
				'serverid': this.serverId,
				'name': Config.username,
				'pass': Config.password,
				'challstr': this.challstr,
			});

			options.headers = {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': postData.length,
			};
		} else {
			options.hostname = this.loginServerHosts.getassertion;
			options.path = this.loginServerPaths.getassertion + '?' + querystring.stringify({
				'serverid': this.serverId,
				'userid': Tools.toId(Config.username),
				'challstr': this.challstr,
			});
			options.method = 'GET';
		}

		console.log("Attempting to login...");
		const request = https.request(options, response => {
			response.setEncoding('utf8');
			let data = '';
			response.on('data', chunk => {
				data += chunk;
			});
			response.on('error', error => {
				Tools.logException(error, "Error during client login response");
				this.setRetryLoginTimeout();
			});
			response.on('end', () => {
				if (!data) {
					Tools.warningLog('Did not receive a response from the login server.');
					this.setRetryLoginTimeout();
					return;
				}

				let newLoginSessionCookie = false;
				if (response.headers['set-cookie']) {
					for (const cookie of response.headers['set-cookie']) {
						const equalsIndex = cookie.indexOf('=');
						if (equalsIndex !== -1 && cookie.substr(0, equalsIndex) === 'sid') {
							let value = cookie;
							const semiColonIndex = value.indexOf(';');
							if (semiColonIndex !== -1) value = value.substr(0, semiColonIndex);

							Storage.getGlobalDatabase().loginSessionCookie = {cookie: value, userid: Users.self.id};
							newLoginSessionCookie = true;
						}
					}
				}

				if (data.charAt(0) === ']') data = data.substr(1);

				let loginAssertion = '';
				try {
					if (Config.password) {
						const loginResponse = JSON.parse(data) as ILoginResponse;
						if (!loginResponse.curuser || !loginResponse.curuser.loggedin) {
							Tools.warningLog('Login response did not contain user or loggedin status');
							this.setRetryLoginTimeout();
							return;
						}

						loginAssertion = loginResponse.assertion || '';
					} else {
						loginAssertion = (JSON.parse(data) as string) || '';
					}
				} catch (e) {
					Tools.logException(e as Error, "Error parsing login response");
					this.setRetryLoginTimeout();
					return;
				}

				if (this.verifyLoginAssertion(loginAssertion)) {
					if (failedUpkeep || newLoginSessionCookie) {
						Storage.tryExportGlobalDatabase();
					}
				}
			});
		});

		request.on('error', error => {
			Tools.logException(error, "Error during client login request");
			this.setRetryLoginTimeout();
		});

		if (postData) request.write(postData);
		request.end();
	}

	private verifyLoginAssertion(assertion: string, sessionUpkeep?: boolean): boolean {
		if (assertion.slice(0, 14).toLowerCase() === '<!doctype html') {
			const endIndex = assertion.indexOf('>');
			if (endIndex !== -1) assertion = assertion.slice(endIndex + 1);
		}
		if (assertion.charAt(0) === '\r') assertion = assertion.slice(1);
		if (assertion.charAt(0) === '\n') assertion = assertion.slice(1);

		if (assertion.substr(0, 2) === ';;') {
			console.log("Assertion error: " + assertion);

			if (sessionUpkeep) {
				console.log('Failed to upkeep session');
			} else {
				Tools.warningLog('Failed to log in: ' + assertion);
			}

			this.setRetryLoginTimeout(sessionUpkeep);
			return false;
		} else if (assertion.includes('<') || assertion.includes('\n') || !assertion) {
			console.log("Unexpected assertion: " + assertion);

			const message = 'Something is interfering with the connection to the login server';
			if (sessionUpkeep) {
				console.log(message + ' (session upkeep)');
			} else {
				Tools.warningLog(message + ": " + assertion);
			}

			this.setRetryLoginTimeout(sessionUpkeep);
			return false;
		} else {
			this.send({
				message: '|/trn ' + Config.username + ',0,' + assertion,
				type: 'trn',
				measure: true,
			});

			return true;
		}
	}
}

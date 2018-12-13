import https = require('https');
import querystring = require('querystring');
import url = require('url');
import websocket = require('websocket');
import { Room } from './rooms';
import { IClientMessageTypes, IServerGroup } from './types/client-message-types';

const RELOGIN_SECONDS = 60;
const SEND_THROTTLE = 800;

export class Client {
	challstr = '';
	client = new websocket.client();
	connection = null as websocket.connection | null;
	connectionAttempts = 0;
	connectionTimeout = null as NodeJS.Timer | null;
	reconnectTime = Config.reconnectTime || 60 * 1000;
	sendQueue = [] as string[];
	sendTimeout = null as NodeJS.Timer | null;
	server = Config.server || 'play.pokemonshowdown.com';
	serverGroups = {} as Dict<IServerGroup>;
	serverId = 'showdown';
	serverTimeOffset = 0;

	constructor() {
		this.client.on('connect', connection => {
			this.connection = connection;

			this.connection.on('message', message => this.onMessage(message));
			this.connection.on('error', error => this.onConnectionError(error));
			this.connection.on('close', (code, description) => this.onConnectionClose(code, description));

			this.onConnect();
		});
		this.client.on('connectFailed', error => this.onConnectFail(error));
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
		console.log('Connection closed: ' + description + ' (' + code + ')');
		console.log('Reconnecting in ' + (this.reconnectTime /  1000) + ' seconds');
		this.connectionTimeout = setTimeout(() => this.reconnect(), this.reconnectTime);
	}

	onConnect() {
		if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
		console.log('Successfully connected to server ' + this.serverId);
	}

	connect() {
		const options = {
			hostname: 'play.pokemonshowdown.com',
			path: '/crossdomain.php?' + querystring.stringify({host: this.server, path: ''}),
			method: 'GET',
		};

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
					if (typeof config === 'string') config = JSON.parse(config); // encoded twice by the server
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

		this.connectionTimeout = setTimeout(() => this.onConnectFail(), 30 * 1000);
	}

	reconnect() {
		for (const i in Users.users) {
			if (Users.users[i] === Users.self) continue;
			delete Users.users[i];
		}
		for (const i in Rooms.rooms) {
			delete Rooms.rooms[i];
		}

		this.connect();
	}

	onMessage(websocketMessage: websocket.IMessage) {
		if (websocketMessage.type !== 'utf8' || !websocketMessage.utf8Data) return;
		const lines = websocketMessage.utf8Data.split("\n");
		let room = Rooms.add('lobby');
		if (lines[0].charAt(0) === '>') {
			room = Rooms.add(lines[0].substr(1));
			lines.shift();
		}
		for (let i = 0; i < lines.length; i++) {
			this.parseMessage(room, lines[i]);
			if (lines[i].startsWith('|init|')) {
				for (let j = i + 1; j < lines.length; j++) {
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
				return;
			}
		}
	}

	parseMessage(room: Room, message: string): boolean {
		message = message.substr(1);
		const pipeIndex = message.indexOf("|");
		const messageType = message.substr(0, pipeIndex) as keyof IClientMessageTypes;
		message = message.substr(pipeIndex + 1);
		const messageParts = message.split("|");
		switch (messageType) {
		case 'challstr': {
			this.challstr = message;
			if (Config.username) this.login();
			break;
		}

		case 'updateuser': {
			const messageArguments: IClientMessageTypes['updateuser'] = {username: messageParts[0], loginStatus: messageParts[1]};
			if (messageArguments.username === Config.username) {
				if (messageArguments.loginStatus !== '1') {
					console.log('Failed to log in');
					process.exit();
				}

				console.log('Successfully logged in');
				if (Config.rooms) {
					for (let i = 0, len = Config.rooms.length; i < len; i++) {
						this.send('|/join ' + Config.rooms[i]);
					}
				}
				if (Config.avatar) this.send('|/avatar ' + Config.avatar);
			}
			break;
		}

		case 'init': {
			console.log("Joined room: " + room.id);
			break;
		}

		case 'users': {
			const messageArguments: IClientMessageTypes['users'] = {userlist: messageParts[0]};
			if (messageArguments.userlist !== '0') {
				const users = messageArguments.userlist.split(",");
				for (let i = 1; i < users.length; i++) {
					const rank = users[i].charAt(0);
					const user = Users.add(users[i].substr(1));
					room.users.add(user);
					user.rooms.set(room, rank);
				}
			}
			break;
		}

		case 'customgroups': {
			const messageArguments: IClientMessageTypes['customgroups'] = {groups: JSON.parse(messageParts[0])};
			this.serverGroups = {};
			let ranking = messageArguments.groups.length;
			for (let i = 0; i < messageArguments.groups.length; i++) {
				this.serverGroups[messageArguments.groups[i].symbol] = Object.assign({ranking}, messageArguments.groups[i]);
				ranking--;
			}
			break;
		}

		case 'join':
		case 'j':
		case 'J': {
			const messageArguments: IClientMessageTypes['join'] = {rank: messageParts[0].charAt(0), username: messageParts[0].substr(1)};
			const user = Users.add(messageArguments.username);
			room.users.add(user);
			user.rooms.set(room, messageArguments.rank);
			break;
		}

		case 'leave':
		case 'l':
		case 'L': {
			const messageArguments: IClientMessageTypes['leave'] = {rank: messageParts[0].charAt(0), username: messageParts[0].substr(1)};
			const user = Users.add(messageArguments.username);
			room.users.delete(user);
			user.rooms.delete(room);
			if (!user.rooms.size) Users.remove(user);
			break;
		}

		case 'name':
		case 'n':
		case 'N': {
			const messageArguments: IClientMessageTypes['name'] = {rank: messageParts[0].charAt(0), username: messageParts[0].substr(1), oldId: messageParts[1]};
			const user = Users.rename(messageArguments.username, messageArguments.oldId);
			room.users.add(user);
			user.rooms.set(room, messageArguments.rank);
			break;
		}

		case 'chat':
		case 'c':
		case 'c:': {
			let messageArguments: IClientMessageTypes['chat'];
			if (messageType === 'c:') {
				messageArguments = {timestamp: (parseInt(messageParts[0]) + this.serverTimeOffset) * 1000, rank: messageParts[1].charAt(0), username: messageParts[1].substr(1), message: messageParts.slice(2).join("|")};
			} else {
				messageArguments = {timestamp: Date.now(), rank: messageParts[0].charAt(0), username: messageParts[0].substr(1), message: messageParts.slice(1).join("|")};
			}
			const user = Users.add(messageArguments.username);
			if (user !== Users.self) {
				CommandParser.parse(room, user, messageArguments.message);
			}
			break;
		}

		case ':': {
			const messageArguments: IClientMessageTypes[':'] = {timestamp: parseInt(messageParts[0])};
			this.serverTimeOffset = Math.floor(Date.now() / 1000) - messageArguments.timestamp;
			break;
		}

		case 'pm': {
			const messageArguments: IClientMessageTypes['pm'] = {rank: messageParts[0].charAt(0), username: messageParts[0].substr(1), message: messageParts.slice(2).join("|")};
			const user = Users.add(messageArguments.username);
			if (user !== Users.self) {
				CommandParser.parse(user, user, messageArguments.message);
			}
		}
		}

		return true;
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
					setTimeout(() => this.login(), RELOGIN_SECONDS * 1000);
					return;
				} else if (data.includes('heavy load')) {
					console.log('Failed to log in: the login server is under heavy load. Trying again in ' + (RELOGIN_SECONDS * 5) + ' seconds');
					setTimeout(() => this.login(), RELOGIN_SECONDS * 5 * 1000);
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

		request.on('error', error => console.log('Login error: ' + error.stack));

		if (postData) request.write(postData);
		request.end();
	}
}

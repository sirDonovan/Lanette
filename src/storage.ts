import fs = require('fs');
import path = require('path');

import type { Room } from './rooms';
import type { IDatabase, IGlobalDatabase, Leaderboard, LeaderboardType } from './types/storage';
import type { User } from './users';

const MAX_QUEUED_OFFLINE_MESSAGES = 3;
const LAST_SEEN_EXPIRATION = 30 * 24 * 60 * 60 * 1000;
const OFFLINE_MESSAGE_EXPIRATION = 30 * 24 * 60 * 60 * 1000;

const globalDatabaseId = 'globalDB';
const hostingDatabaseSuffix = '-hostingDB';
const baseOfflineMessageLength = '[28 Jun 2019, 00:00:00 GMT-0500] **** said: '.length;

export class Storage {
	gameLeaderboard = 'gameLeaderboard' as const;
	tournamentLeaderboard = 'tournamentLeaderboard' as const;
	unsortedLeaderboard = 'unsortedLeaderboard' as const;

	databases: Dict<IDatabase> = {};
	databasesDir: string = path.join(Tools.rootFolder, 'databases');
	lastSeenExpirationDuration = Tools.toDurationString(LAST_SEEN_EXPIRATION);
	loadedDatabases: boolean = false;
	reloadInProgress: boolean = false;

	allLeaderboardTypes: LeaderboardType[];
	globalDatabaseExportInterval: NodeJS.Timer;

	constructor() {
		this.allLeaderboardTypes = [this.gameLeaderboard, this.tournamentLeaderboard, this.unsortedLeaderboard];
		this.globalDatabaseExportInterval = setInterval(() => this.exportDatabase(globalDatabaseId), 15 * 60 * 1000);
	}

	onReload(previous: Partial<Storage>): void {
		if (previous.databases) Object.assign(this.databases, previous.databases);
		if (previous.loadedDatabases) this.loadedDatabases = !!previous.loadedDatabases;

		if (previous.globalDatabaseExportInterval) clearInterval(previous.globalDatabaseExportInterval);

		for (const i in previous) {
			// @ts-expect-error
			delete previous[i];
		}
	}

	getDatabase(room: Room): IDatabase {
		if (!(room.id in this.databases)) this.databases[room.id] = {};
		return this.databases[room.id];
	}

	getGlobalDatabase(): IGlobalDatabase {
		if (!(globalDatabaseId in this.databases)) this.databases[globalDatabaseId] = {};
		return this.databases[globalDatabaseId] as IGlobalDatabase;
	}

	getHostingDatabase(room: Room): IDatabase {
		const id = room.id + hostingDatabaseSuffix;
		if (!(id in this.databases)) this.databases[id] = {};
		return this.databases[id];
	}

	exportDatabase(roomid: string): void {
		if (!(roomid in this.databases) || roomid.startsWith(Tools.battleRoomPrefix) || roomid.startsWith(Tools.groupchatPrefix)) return;
		const contents = JSON.stringify(this.databases[roomid]);
		Tools.safeWriteFileSync(path.join(this.databasesDir, roomid + '.json'), contents);
	}

	archiveDatabase(roomid: string): void {
		if (!(roomid in this.databases) || roomid.startsWith(Tools.battleRoomPrefix) || roomid.startsWith(Tools.groupchatPrefix)) return;
		const date = new Date();
		const year = date.getFullYear();
		const month = date.getMonth() + 1;
		const day = date.getDate();
		const filename = roomid + '-' + year + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day + '-at-' +
			Tools.toTimestampString(date).split(' ')[1].split(':').join('-');
		const contents = JSON.stringify(this.databases[roomid]);
		Tools.safeWriteFileSync(path.join(Tools.rootFolder, 'archived-databases', filename + '.json'), contents);
	}

	importDatabases(): void {
		if (this.loadedDatabases) return;

		const files = fs.readdirSync(this.databasesDir);
		for (const fileName of files) {
			if (!fileName.endsWith('.json')) continue;
			const id = fileName.substr(0, fileName.indexOf('.json'));
			const file = fs.readFileSync(path.join(this.databasesDir, fileName)).toString();
			this.databases[id] = JSON.parse(file) as IDatabase;
		}

		const globalDatabase = this.getGlobalDatabase();
		if (globalDatabase.lastSeen) {
			const now = Date.now();
			for (const i in globalDatabase.lastSeen) {
				if (now - globalDatabase.lastSeen[i] > LAST_SEEN_EXPIRATION) delete globalDatabase.lastSeen[i];
			}
		}

		this.loadedDatabases = true;
	}

	exportDatabases(): void {
		for (const i in this.databases) {
			this.exportDatabase(i);
		}
	}

	getDefaultLeaderboardType(database: IDatabase): LeaderboardType {
		if (database.tournamentLeaderboard) return 'tournamentLeaderboard';
		if (database.gameLeaderboard) return 'gameLeaderboard';
		return 'unsortedLeaderboard';
	}

	clearLeaderboard(roomid: string, leaderboardTypes?: LeaderboardType[]): boolean {
		if (!(roomid in this.databases)) return false;
		this.archiveDatabase(roomid);

		if (!leaderboardTypes || !leaderboardTypes.length) leaderboardTypes = this.allLeaderboardTypes;
		const database = this.databases[roomid];
		const date = new Date();
		const month = date.getMonth() + 1;
		const day = date.getDate();
		const clearAnnual = (month === 12 && day === 31) || (month === 1 && day === 1);
		for (const leaderboardType of leaderboardTypes) {
			if (!database[leaderboardType]) continue;
			for (const i in database[leaderboardType]) {
				const user = database[leaderboardType]![i];
				if (clearAnnual) {
					user.annual = 0;
				} else {
					user.annual += user.current;
				}
				user.current = 0;

				if (clearAnnual) {
					user.annualSources = {};
				} else {
					for (const source in user.sources) {
						if (source in user.annualSources) {
							user.annualSources[source] += user.sources[source];
						} else {
							user.annualSources[source] = user.sources[source];
						}
					}
				}
				user.sources = {};
			}
		}

		if (this.databases[roomid].userHostedGameStats) {
			this.databases[roomid].previousUserHostedGameStats = this.databases[roomid].userHostedGameStats;
		}

		if (roomid + hostingDatabaseSuffix in this.databases) this.clearLeaderboard(roomid + hostingDatabaseSuffix);

		this.exportDatabase(roomid);
		return true;
	}

	createLeaderboardEntry(leaderboard: Leaderboard, name: string, id: string): void {
		leaderboard[id] = {
			annual: 0,
			annualSources: {},
			current: 0,
			name,
			sources: {},
		};
	}

	addPoints(room: Room, leaderboardType: LeaderboardType, name: string, amount: number, source: string): void {
		if (!amount) return;

		name = Tools.toAlphaNumeric(name);
		const id = Tools.toId(name);
		if (!id) return;
		source = Tools.toId(source);
		if (!source) return;

		const database = this.getDatabase(room);
		if (!database[leaderboardType]) database[leaderboardType] = {};
		const leaderboard = database[leaderboardType]!;

		if (!(id in leaderboard)) {
			this.createLeaderboardEntry(leaderboard, name, id);
		} else {
			leaderboard[id].name = name;
		}

		leaderboard[id].current = Math.max(0, leaderboard[id].current + amount);

		if (!(source in leaderboard[id].sources)) leaderboard[id].sources[source] = 0;
		leaderboard[id].sources[source] += amount;
		if (leaderboard[id].sources[source] <= 0) delete leaderboard[id].sources[source];
	}

	removePoints(room: Room, leaderboardType: LeaderboardType, name: string, amount: number, source: string): void {
		if (amount < 0) throw new Error("Storage.removePoints() called with a negative amount");
		this.addPoints(room, leaderboardType, name, amount * -1, source);
	}

	transferData(roomid: string, sourceName: string, destinationName: string): boolean {
		if (!(roomid in this.databases)) return false;

		const sourceId = Tools.toId(sourceName);
		const destinationId = Tools.toId(destinationName);
		if (!sourceId || !destinationId || sourceId === destinationId) return false;

		const database = this.databases[roomid];
		for (const leaderboardType of this.allLeaderboardTypes) {
			if (!database[leaderboardType] || !(sourceId in database[leaderboardType]!)) continue;

			const leaderboad = database[leaderboardType]!;
			if (!(destinationId in leaderboad)) {
				this.createLeaderboardEntry(leaderboad, destinationName, destinationId);
			}

			for (const source in leaderboad[sourceId].sources) {
				if (source in leaderboad[destinationId].sources) {
					leaderboad[destinationId].sources[source] += leaderboad[sourceId].sources[source];
				} else {
					leaderboad[destinationId].sources[source] = leaderboad[sourceId].sources[source];
				}
				delete leaderboad[sourceId].sources[source];
			}

			for (const source in leaderboad[sourceId].annualSources) {
				if (source in leaderboad[destinationId].annualSources) {
					leaderboad[destinationId].annualSources[source] += leaderboad[sourceId].annualSources[source];
				} else {
					leaderboad[destinationId].annualSources[source] = leaderboad[sourceId].annualSources[source];
				}
				delete leaderboad[sourceId].annualSources[source];
			}

			leaderboad[destinationId].current += leaderboad[sourceId].current;
			leaderboad[sourceId].current = 0;
			leaderboad[destinationId].annual += leaderboad[sourceId].annual;
			leaderboad[sourceId].annual = 0;
		}

		if (database.gameAchievements && sourceId in database.gameAchievements) {
			if (!(destinationId in database.gameAchievements)) database.gameAchievements[destinationId] = [];
			for (const achievement of database.gameAchievements[sourceId]) {
				if (!database.gameAchievements[destinationId].includes(achievement)) {
					database.gameAchievements[destinationId].push(achievement);
				}
			}
		}

		if (roomid + hostingDatabaseSuffix in this.databases) {
			this.transferData(roomid + hostingDatabaseSuffix, sourceName, destinationName);
		}

		return true;
	}

	getMaxOfflineMessageLength(sender: User): number {
		return Tools.maxMessageLength - (baseOfflineMessageLength + sender.name.length);
	}

	storeOfflineMessage(sender: string, recipientId: string, message: string): boolean {
		const database = this.getGlobalDatabase();
		if (!database.offlineMessages) database.offlineMessages = {};
		if (recipientId in database.offlineMessages) {
			const senderId = Tools.toId(sender);
			let queuedMessages = 0;
			for (const offlineMessage of database.offlineMessages[recipientId]) {
				if (!offlineMessage.readTime && Tools.toId(offlineMessage.sender) === senderId) queuedMessages++;
			}
			if (queuedMessages > MAX_QUEUED_OFFLINE_MESSAGES) return false;
		} else {
			database.offlineMessages[recipientId] = [];
		}

		database.offlineMessages[recipientId].push({
			message,
			sender,
			readTime: 0,
			sentTime: Date.now(),
		});
		return true;
	}

	retrieveOfflineMessages(user: User, retrieveRead?: boolean): boolean {
		const database = this.getGlobalDatabase();
		if (!database.offlineMessages || !(user.id in database.offlineMessages)) return false;
		const now = Date.now();
		const expiredTime = now - OFFLINE_MESSAGE_EXPIRATION;
		let hasExpiredMessages = false;
		for (const message of database.offlineMessages[user.id]) {
			if (message.readTime) {
				if (message.readTime <= expiredTime) {
					message.expired = true;
					if (!hasExpiredMessages) hasExpiredMessages = true;
				}
				if (!retrieveRead) continue;
			}
			const date = new Date(message.sentTime);
			let dateString = date.toUTCString();
			dateString = dateString.substr(dateString.indexOf(',') + 1);
			dateString = dateString.substr(0, dateString.indexOf(':') - 3);
			let timeString = date.toTimeString();
			timeString = timeString.substr(0, timeString.indexOf('('));
			user.say("[" + dateString.trim() + ", " + timeString.trim() + "] " + "**" + message.sender + "** said: " + message.message);
			message.readTime = now;
		}

		if (hasExpiredMessages) database.offlineMessages[user.id] = database.offlineMessages[user.id].filter(x => !x.expired);

		return true;
	}

	clearOfflineMessages(user: User): boolean {
		const database = this.getGlobalDatabase();
		if (!database.offlineMessages || !(user.id in database.offlineMessages)) return false;
		delete database.offlineMessages[user.id];
		return true;
	}

	checkBotGreeting(room: Room, user: User, timestamp: number): boolean {
		const database = this.getDatabase(room);
		if (!database.botGreetings || !(user.id in database.botGreetings)) return false;
		if (database.botGreetings[user.id].expiration && timestamp >= database.botGreetings[user.id].expiration!) {
			delete database.botGreetings[user.id];
			return false;
		}
		room.say(database.botGreetings[user.id].greeting);
		return true;
	}

	updateLastSeen(user: User, time: number): void {
		const database = this.getGlobalDatabase();
		if (!database.lastSeen) database.lastSeen = {};
		database.lastSeen[user.id] = time;
	}
}

export const instantiate = (): void => {
	const oldStorage = global.Storage as Storage | undefined;

	global.Storage = new Storage();

	if (oldStorage) {
		global.Storage.onReload(oldStorage);
	}
};
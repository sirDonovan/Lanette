import fs = require('fs');
import path = require('path');

import type { Room } from './rooms';
import type {
	ICachedLeaderboardEntry, IDatabase, IGlobalDatabase, ILeaderboard,
	ILeaderboardEntry, IOfflineMessage, LeaderboardType
} from './types/storage';
import type { User } from './users';

const MAX_QUEUED_OFFLINE_MESSAGES = 3;
const LAST_SEEN_EXPIRATION = 30 * 24 * 60 * 60 * 1000;
const OFFLINE_MESSAGE_EXPIRATION = 30 * 24 * 60 * 60 * 1000;

const globalDatabaseId = 'globalDB';
const baseOfflineMessageLength = '[28 Jun 2019, 00:00:00 GMT-0500] **** said: '.length;

export class Storage {
	gameLeaderboard = 'gameLeaderboard' as const;
	gameHostingLeaderboard = 'gameHostingLeaderbaord' as const;
	tournamentLeaderboard = 'tournamentLeaderboard' as const;
	unsortedLeaderboard = 'unsortedLeaderboard' as const;

	databasesDir: string = path.join(Tools.rootFolder, 'databases');
	lastSeenExpirationDuration = Tools.toDurationString(LAST_SEEN_EXPIRATION);
	leaderboardsAnnualPointsCache: Dict<PartialKeyedDict<LeaderboardType, ICachedLeaderboardEntry[]>> = {};
	leaderboardsAnnualSourcePointsCache: Dict<PartialKeyedDict<LeaderboardType, Dict<ICachedLeaderboardEntry[]>>> = {};
	leaderboardsCurrentPointsCache: Dict<PartialKeyedDict<LeaderboardType, ICachedLeaderboardEntry[]>> = {};
	leaderboardsCurrentSourcePointsCache: Dict<PartialKeyedDict<LeaderboardType, Dict<ICachedLeaderboardEntry[]>>> = {};
	loadedDatabases: boolean = false;
	reloadInProgress: boolean = false;

	allLeaderboardTypes: LeaderboardType[];
	globalDatabaseExportInterval: NodeJS.Timer;

	private databases: Dict<IDatabase> = {};

	constructor() {
		this.allLeaderboardTypes = [this.gameLeaderboard, this.gameHostingLeaderboard, this.tournamentLeaderboard,
			this.unsortedLeaderboard];
		this.globalDatabaseExportInterval = setInterval(() => this.exportDatabase(globalDatabaseId), 15 * 60 * 1000);
	}

	onReload(previous: Partial<Storage>): void {
		// @ts-expect-error
		if (previous.databases) Object.assign(this.databases, previous.databases);
		for (const id in this.databases) {
			this.updateLeaderboardCaches(id, this.databases[id]);
		}

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
			const database = JSON.parse(file) as IDatabase;

			let hasLeaderboard = false;
			// convert old leaderboards as needed
			for (const type of this.allLeaderboardTypes) {
				if (!database[type]) continue;
				hasLeaderboard = true;

				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				if (!database[type]!.entries) {
					const oldLeaderboard = (database[type] as unknown) as Dict<ILeaderboardEntry>;
					const sources: string[] = [];
					for (const i in oldLeaderboard) {
						const entry = oldLeaderboard[i];
						for (const source in entry.sources) {
							if (!sources.includes(source)) sources.push(source);
						}
						for (const source in entry.annualSources) {
							if (!sources.includes(source)) sources.push(source);
						}
					}

					database[type] = {
						entries: oldLeaderboard,
						sources,
						type,
					};
				}
			}

			if (hasLeaderboard) this.updateLeaderboardCaches(id, database);

			this.databases[id] = database;
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

	renameRoom(room: Room, oldId: string): void {
		if (oldId in this.databases) {
			this.databases[room.id] = this.databases[oldId];
			delete this.databases[oldId];
		}
	}

	getDefaultLeaderboardType(database: IDatabase): LeaderboardType {
		if (database.tournamentLeaderboard) return 'tournamentLeaderboard';
		if (database.gameLeaderboard) return 'gameLeaderboard';
		return 'unsortedLeaderboard';
	}

	clearLeaderboard(roomid: string, leaderboardTypes?: LeaderboardType[]): boolean {
		if (!(roomid in this.databases)) return false;
		if (!leaderboardTypes || !leaderboardTypes.length) leaderboardTypes = this.allLeaderboardTypes;

		this.archiveDatabase(roomid);

		const database = this.databases[roomid];
		const date = new Date();
		const month = date.getMonth() + 1;
		const day = date.getDate();
		const clearAnnual = (month === 12 && day === 31) || (month === 1 && day === 1);
		for (const leaderboardType of leaderboardTypes) {
			if (!database[leaderboardType]) continue;
			for (const i in database[leaderboardType]!.entries) {
				const user = database[leaderboardType]!.entries[i];
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

		if (database.scriptedGameCounts) database.scriptedGameCounts = {};
		if (database.userHostedGameCounts) database.userHostedGameCounts = {};
		if (database.userHostedGameStats) database.previousUserHostedGameStats = database.userHostedGameStats;

		this.updateLeaderboardCaches(roomid, database);
		this.exportDatabase(roomid);
		return true;
	}

	createLeaderboardEntry(leaderboard: ILeaderboard, name: string, id: string): void {
		if (id in leaderboard.entries) return;

		leaderboard.entries[id] = {
			annual: 0,
			annualSources: {},
			current: 0,
			name,
			sources: {},
		};
	}

	createGameTrainerCard(database: IDatabase, name: string): void {
		const id = Tools.toId(name);
		if (!database.gameTrainerCards) database.gameTrainerCards = {};
		if (id in database.gameTrainerCards) return;

		database.gameTrainerCards[id] = {
			avatar: '',
			pokemon: [],
		};
	}

	createGameHostBox(database: IDatabase, name: string): void {
		const id = Tools.toId(name);
		if (!database.gameHostBoxes) database.gameHostBoxes = {};
		if (id in database.gameHostBoxes) return;

		database.gameHostBoxes[id] = {
			pokemon: [],
			shinyPokemon: [],
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
		if (!database[leaderboardType]) {
			database[leaderboardType] = {
				entries: {},
				sources: [],
				type: leaderboardType,
			};
		}
		const leaderboard = database[leaderboardType]!;

		if (!(id in leaderboard.entries)) {
			this.createLeaderboardEntry(leaderboard, name, id);
		} else {
			leaderboard.entries[id].name = name;
		}

		leaderboard.entries[id].current = Math.max(0, leaderboard.entries[id].current + amount);

		if (!(source in leaderboard.entries[id].sources)) leaderboard.entries[id].sources[source] = 0;
		leaderboard.entries[id].sources[source] += amount;
		if (leaderboard.entries[id].sources[source] <= 0) delete leaderboard.entries[id].sources[source];

		this.updateLeaderboardPointsCaches(room.id, leaderboard);
		this.updateLeaderboardSourcePointsCaches(room.id, leaderboard, source);
	}

	removePoints(room: Room, leaderboardType: LeaderboardType, name: string, amount: number, source: string): void {
		if (amount < 0) throw new Error("Storage.removePoints() called with a negative amount");
		this.addPoints(room, leaderboardType, name, amount * -1, source);
	}

	getPoints(room: Room, leaderboardType: LeaderboardType, name: string): number {
		const database = this.getDatabase(room);
		const id = Tools.toId(name);
		if (!database[leaderboardType] || !(id in database[leaderboardType]!.entries)) return 0;
		return database[leaderboardType]!.entries[id].current;
	}

	getAnnualPoints(room: Room, leaderboardType: LeaderboardType, name: string): number {
		const database = this.getDatabase(room);
		const id = Tools.toId(name);
		if (!database[leaderboardType] || !(id in database[leaderboardType]!.entries)) return 0;
		return database[leaderboardType]!.entries[id].annual + database[leaderboardType]!.entries[id].current;
	}

	updateLeaderboardCaches(roomid: string, database: IDatabase): void {
		for (const type of this.allLeaderboardTypes) {
			if (!database[type]) continue;
			this.updateLeaderboardPointsCaches(roomid, database[type]!);
			for (const source of database[type]!.sources) {
				this.updateLeaderboardSourcePointsCaches(roomid, database[type]!, source);
			}
		}
	}

	updateLeaderboardPointsCaches(roomid: string, leaderboard: ILeaderboard): void {
		const users = Object.keys(leaderboard.entries);

		const annualPointsCache: Dict<number> = {};
		const currentPointsCache: Dict<number> = {};

		for (const id of users) {
			annualPointsCache[id] = leaderboard.entries[id].annual + leaderboard.entries[id].current;
			currentPointsCache[id] = leaderboard.entries[id].current;
		}

		if (!(roomid in this.leaderboardsAnnualPointsCache)) {
			this.leaderboardsAnnualPointsCache[roomid] = {};
		}

		if (!(roomid in this.leaderboardsCurrentPointsCache)) {
			this.leaderboardsCurrentPointsCache[roomid] = {};
		}

		this.leaderboardsAnnualPointsCache[roomid][leaderboard.type] = users.filter(x => annualPointsCache[x] !== 0)
			.sort((a, b) => {
				if (annualPointsCache[b] === annualPointsCache[a]) {
					if (b > a) return -1;
					return 1;
				}
				return annualPointsCache[b] - annualPointsCache[a];
			}).map(x => {
				return {
					id: x,
					points: annualPointsCache[x],
				};
			});
		this.leaderboardsCurrentPointsCache[roomid][leaderboard.type] = users.filter(x => currentPointsCache[x] !== 0)
			.sort((a, b) => {
				if (currentPointsCache[b] === currentPointsCache[a]) {
					if (b > a) return -1;
					return 1;
				}
				return currentPointsCache[b] - currentPointsCache[a];
			}).map(x => {
				return {
					id: x,
					points: currentPointsCache[x],
				};
			});
	}

	updateLeaderboardSourcePointsCaches(roomid: string, leaderboard: ILeaderboard, source: string): void {
		const users = Object.keys(leaderboard.entries);

		const annualSourcePointsCache: Dict<number> = {};
		const currentSourcePointsCache: Dict<number> = {};

		for (const id of users) {
			let annualSourcePoints = 0;
			if (leaderboard.entries[id].sources[source]) annualSourcePoints += leaderboard.entries[id].sources[source];
			if (leaderboard.entries[id].annualSources[source]) {
				annualSourcePoints += leaderboard.entries[id].annualSources[source];
			}
			annualSourcePointsCache[id] = annualSourcePoints;
			currentSourcePointsCache[id] = leaderboard.entries[id].sources[source] || 0;
		}

		if (!(roomid in this.leaderboardsAnnualSourcePointsCache)) {
			this.leaderboardsAnnualSourcePointsCache[roomid] = {};
		}
		if (!this.leaderboardsAnnualSourcePointsCache[roomid][leaderboard.type]) {
			this.leaderboardsAnnualSourcePointsCache[roomid][leaderboard.type] = {};
		}

		if (!(roomid in this.leaderboardsCurrentSourcePointsCache)) {
			this.leaderboardsCurrentSourcePointsCache[roomid] = {};
		}
		if (!this.leaderboardsCurrentSourcePointsCache[roomid][leaderboard.type]) {
			this.leaderboardsCurrentSourcePointsCache[roomid][leaderboard.type] = {};
		}

		this.leaderboardsAnnualSourcePointsCache[roomid][leaderboard.type]![source] = users.filter(x => annualSourcePointsCache[x] !== 0)
			.sort((a, b) => {
				if (annualSourcePointsCache[b] === annualSourcePointsCache[a]) {
					if (b > a) return -1;
					return 1;
				}
				return annualSourcePointsCache[b] - annualSourcePointsCache[a];
			}).map(x => {
				return {
					id: x,
					points: annualSourcePointsCache[x],
				};
			});
		this.leaderboardsCurrentSourcePointsCache[roomid][leaderboard.type]![source] = users.filter(x => currentSourcePointsCache[x] !== 0)
			.sort((a, b) => {
				if (currentSourcePointsCache[b] === currentSourcePointsCache[a]) {
					if (b > a) return -1;
					return 1;
				}
				return currentSourcePointsCache[b] - currentSourcePointsCache[a];
			}).map(x => {
				return {
					id: x,
					points: currentSourcePointsCache[x],
				};
			});
	}

	getAnnualPointsCache(room: Room, leaderboardType: LeaderboardType): ICachedLeaderboardEntry[] | undefined {
		if (!(room.id in this.leaderboardsAnnualPointsCache) || !this.leaderboardsAnnualPointsCache[room.id][leaderboardType]) return;
		return this.leaderboardsAnnualPointsCache[room.id][leaderboardType];
	}

	getAnnualSourcePointsCache(room: Room, leaderboardType: LeaderboardType, source: string): ICachedLeaderboardEntry[] | undefined {
		if (!(room.id in this.leaderboardsAnnualSourcePointsCache) ||
			!this.leaderboardsAnnualSourcePointsCache[room.id][leaderboardType] ||
			!(source in this.leaderboardsAnnualSourcePointsCache[room.id][leaderboardType]!)) return;
		return this.leaderboardsAnnualSourcePointsCache[room.id][leaderboardType]![source];
	}

	getCurrentPointsCache(room: Room, leaderboardType: LeaderboardType): ICachedLeaderboardEntry[] | undefined {
		if (!(room.id in this.leaderboardsCurrentPointsCache) || !this.leaderboardsCurrentPointsCache[room.id][leaderboardType]) return;
		return this.leaderboardsCurrentPointsCache[room.id][leaderboardType];
	}

	getCurrentSourcePointsCache(room: Room, leaderboardType: LeaderboardType, source: string): ICachedLeaderboardEntry[] | undefined {
		if (!(room.id in this.leaderboardsCurrentSourcePointsCache) ||
			!this.leaderboardsCurrentSourcePointsCache[room.id][leaderboardType] ||
			!(source in this.leaderboardsCurrentSourcePointsCache[room.id][leaderboardType]!)) return;
		return this.leaderboardsCurrentSourcePointsCache[room.id][leaderboardType]![source];
	}

	transferData(roomid: string, sourceName: string, destinationName: string): boolean {
		if (!(roomid in this.databases)) return false;

		const sourceId = Tools.toId(sourceName);
		const destinationId = Tools.toId(destinationName);
		if (!sourceId || !destinationId || sourceId === destinationId) return false;

		const database = this.databases[roomid];
		let updatedLeaderboard = false;

		for (const leaderboardType of this.allLeaderboardTypes) {
			if (!database[leaderboardType] || !(sourceId in database[leaderboardType]!.entries)) continue;
			updatedLeaderboard = true;

			const leaderboard = database[leaderboardType]!;
			if (!(destinationId in leaderboard.entries)) {
				this.createLeaderboardEntry(leaderboard, destinationName, destinationId);
			}

			for (const source in leaderboard.entries[sourceId].sources) {
				if (source in leaderboard.entries[destinationId].sources) {
					leaderboard.entries[destinationId].sources[source] += leaderboard.entries[sourceId].sources[source];
				} else {
					leaderboard.entries[destinationId].sources[source] = leaderboard.entries[sourceId].sources[source];
				}
				delete leaderboard.entries[sourceId].sources[source];
			}

			for (const source in leaderboard.entries[sourceId].annualSources) {
				if (source in leaderboard.entries[destinationId].annualSources) {
					leaderboard.entries[destinationId].annualSources[source] += leaderboard.entries[sourceId].annualSources[source];
				} else {
					leaderboard.entries[destinationId].annualSources[source] = leaderboard.entries[sourceId].annualSources[source];
				}
				delete leaderboard.entries[sourceId].annualSources[source];
			}

			leaderboard.entries[destinationId].current += leaderboard.entries[sourceId].current;
			leaderboard.entries[sourceId].current = 0;
			leaderboard.entries[destinationId].annual += leaderboard.entries[sourceId].annual;
			leaderboard.entries[sourceId].annual = 0;
		}

		if (database.gameAchievements && sourceId in database.gameAchievements) {
			if (!(destinationId in database.gameAchievements)) database.gameAchievements[destinationId] = [];
			for (const achievement of database.gameAchievements[sourceId]) {
				if (!database.gameAchievements[destinationId].includes(achievement)) {
					database.gameAchievements[destinationId].push(achievement);
				}
			}
		}

		if (updatedLeaderboard) this.updateLeaderboardCaches(roomid, database);
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
		const filteredMessages: IOfflineMessage[] = [];
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
			const formattedMessage = "[" + dateString.trim() + ", " + timeString.trim() + "] " + "**" + message.sender + "** said: " +
				message.message;
			if (Client.checkFilters(formattedMessage)) {
				filteredMessages.push(message);
			} else {
				user.say(formattedMessage);
				message.readTime = now;
			}
		}

		for (const filteredMessage of filteredMessages) {
			database.offlineMessages[user.id].splice(database.offlineMessages[user.id].indexOf(filteredMessage), 1);
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
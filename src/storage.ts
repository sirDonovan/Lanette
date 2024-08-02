import fs = require('fs');
import path = require('path');

import type { Room } from './rooms';
import type {
	ICachedLeaderboardEntry, ICachedPointsBreakdown, IDatabase, IGlobalDatabase, ILeaderboard, ILeaderboardEntry, IPreviousCycle,
	IPointTotalsByType, LeaderboardType, IPointBreakdownsByType, IUserPointBreakdowns, IPointBreakdown, IArchiveDatabase
} from './types/storage';
import type { User } from './users';

const MAX_QUEUED_OFFLINE_MESSAGES = 3;
const LAST_SEEN_EXPIRATION = 30 * 24 * 60 * 60 * 1000;

const globalDatabaseId = 'globalDB';

export class Storage {
	gameLeaderboard = 'gameLeaderboard' as const;
	gameHostingLeaderboard = 'gameHostingLeaderbaord' as const;
	tournamentLeaderboard = 'tournamentLeaderboard' as const;
	unsortedLeaderboard = 'unsortedLeaderboard' as const;

	currentCycle = 'Current' as const;
	manualSource = 'manual' as const;

	databasesDir: string = path.join(Tools.rootFolder, 'databases');
	archivesDir: string = path.join(this.databasesDir, 'archives');
	snapshotsDir: string = path.join(this.databasesDir, 'snapshots');
	lastExportedDatabaseContents: Dict<string> = {};
	lastSeenExpirationDuration = Tools.toDurationString(LAST_SEEN_EXPIRATION);
	leaderboardsAnnualPointsCache: Dict<PartialKeyedDict<LeaderboardType, ICachedLeaderboardEntry[]>> = {};
	leaderboardsAnnualSourcePointsCache: Dict<PartialKeyedDict<LeaderboardType, Dict<ICachedLeaderboardEntry[]>>> = {};
	leaderboardsPointsCache: Dict<Dict<PartialKeyedDict<LeaderboardType, ICachedLeaderboardEntry[]>>> = {};
	leaderboardsSourcePointsCache: Dict<Dict<PartialKeyedDict<LeaderboardType, Dict<ICachedLeaderboardEntry[]>>>> = {};
	leaderboardsAnnualPointBreakdownsCache: Dict<PartialKeyedDict<LeaderboardType, ICachedPointsBreakdown[]>> = {};
	leaderboardsPointBreakdownsCache: Dict<Dict<PartialKeyedDict<LeaderboardType, ICachedPointsBreakdown[]>>> = {};
	loadedDatabases: boolean = false;

	allLeaderboardTypes: LeaderboardType[];
	allLeaderboardTypesById: Dict<LeaderboardType>;
	allLeaderboardNames: KeyedDict<LeaderboardType, string>;
	globalDatabaseExportInterval: NodeJS.Timeout;

	private archiveDatabases: Dict<IArchiveDatabase> = {};
	private databases: Dict<IDatabase> = {};

	constructor() {
		this.allLeaderboardTypes = [this.gameLeaderboard, this.gameHostingLeaderboard, this.tournamentLeaderboard,
			this.unsortedLeaderboard];
		this.allLeaderboardNames = {
			[this.gameLeaderboard]: 'game',
			[this.gameHostingLeaderboard]: 'game hosting',
			[this.tournamentLeaderboard]: 'tournament',
			[this.unsortedLeaderboard]: 'unsorted',
		};

		this.allLeaderboardTypesById = {};
		for (const leadboardType of this.allLeaderboardTypes) {
			this.allLeaderboardTypesById[Tools.toId(leadboardType)] = leadboardType;
		}

		this.globalDatabaseExportInterval = setInterval(() => this.tryExportGlobalDatabase(), 15 * 60 * 1000);
	}

	onReload(previous: Storage): void {
		Object.assign(this.lastExportedDatabaseContents, previous.lastExportedDatabaseContents);
		Object.assign(this.leaderboardsAnnualPointsCache, previous.leaderboardsAnnualPointsCache);
		Object.assign(this.leaderboardsAnnualSourcePointsCache, previous.leaderboardsAnnualSourcePointsCache);
		Object.assign(this.leaderboardsPointsCache, previous.leaderboardsPointsCache);
		Object.assign(this.leaderboardsSourcePointsCache, previous.leaderboardsSourcePointsCache);
		Object.assign(this.leaderboardsAnnualPointBreakdownsCache, previous.leaderboardsAnnualPointBreakdownsCache);
		Object.assign(this.leaderboardsPointBreakdownsCache, previous.leaderboardsPointBreakdownsCache);

		Object.assign(this.archiveDatabases, previous.archiveDatabases);
		Object.assign(this.databases, previous.databases);

		if (previous.loadedDatabases) this.loadedDatabases = previous.loadedDatabases;

		Tools.unrefProperties(previous);
	}

	getDatabaseIds(): string[] {
		return Object.keys(this.databases);
	}

	getDatabase(room: Room): IDatabase {
		return this.getDatabaseById(room.id);
	}

	getDatabaseById(roomid: string): IDatabase {
		if (!(roomid in this.databases)) this.databases[roomid] = {};
		return this.databases[roomid];
	}

	getArchiveDatabase(room: Room): IArchiveDatabase {
		if (!(room.id in this.archiveDatabases)) this.archiveDatabases[room.id] = {};
		return this.archiveDatabases[room.id];
	}

	getGlobalDatabase(): IGlobalDatabase {
		if (!(globalDatabaseId in this.databases)) this.databases[globalDatabaseId] = {};
		return this.databases[globalDatabaseId] as IGlobalDatabase;
	}

	async exportGlobalDatabase(): Promise<void> {
		return this.exportDatabase(globalDatabaseId);
	}

	tryExportGlobalDatabase(): void {
		void this.exportDatabase(globalDatabaseId);
	}

	async exportDatabase(roomid: string): Promise<void> {
		if (!(roomid in this.databases) || roomid.startsWith(Tools.battleRoomPrefix) || roomid.startsWith(Tools.bestOfRoomPrefix) ||
			roomid.startsWith(Tools.groupchatPrefix)) {
			return Promise.resolve();
		}

		const contents = JSON.stringify(this.databases[roomid]);
		if (roomid in this.lastExportedDatabaseContents && contents === this.lastExportedDatabaseContents[roomid]) {
			return Promise.resolve();
		}

		this.lastExportedDatabaseContents[roomid] = contents;

		return Tools.safeWriteFile(path.join(this.databasesDir, roomid + '.json'), contents)
			.catch((e: Error) => Tools.logException(e, "Error exporting " + roomid + " database: " + e.message));
	}

	tryExportDatabase(roomid: string): void {
		void this.exportDatabase(roomid);
	}

	async exportArchiveDatabase(roomid: string): Promise<void> {
		if (!(roomid in this.archiveDatabases) || roomid.startsWith(Tools.battleRoomPrefix) ||
			roomid.startsWith(Tools.bestOfRoomPrefix) || roomid.startsWith(Tools.groupchatPrefix)) {
			return Promise.resolve();
		}

		return Tools.safeWriteFile(path.join(this.archivesDir, roomid + '.json'), JSON.stringify(this.archiveDatabases[roomid]))
			.catch((e: Error) => Tools.logException(e, "Error exporting " + roomid + " archive database: " + e.message));
	}

	tryExportArchiveDatabase(roomid: string): void {
		void this.exportArchiveDatabase(roomid);
	}

	async saveDatabaseSnapshot(roomid: string): Promise<void> {
		if (!(roomid in this.databases) || roomid.startsWith(Tools.battleRoomPrefix) || roomid.startsWith(Tools.bestOfRoomPrefix) ||
			roomid.startsWith(Tools.groupchatPrefix)) {
			return Promise.resolve();
		}

		const date = new Date();
		const year = date.getFullYear();
		const month = date.getMonth() + 1;
		const day = date.getDate();
		const filename = roomid + '-' + year + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day + '-at-' +
			Tools.toTimestampString(date).split(' ')[1].split(':').join('-');

		return Tools.safeWriteFile(path.join(this.snapshotsDir, filename + '.json'), JSON.stringify(this.databases[roomid]))
			.catch((e: Error) => Tools.logException(e, "Error saving snapshot of " + roomid + " database: " + e.message));
	}

	importDatabases(): void {
		if (this.loadedDatabases) return;

		const archiveDatabaseFiles = fs.readdirSync(this.archivesDir);
		for (const fileName of archiveDatabaseFiles) {
			if (!fileName.endsWith('.json')) continue;

			const id = fileName.substr(0, fileName.indexOf('.json'));
			if (id in this.archiveDatabases) continue;

			const file = fs.readFileSync(path.join(this.archivesDir, fileName)).toString();
			this.archiveDatabases[id] = JSON.parse(file) as IArchiveDatabase;
		}

		const convertedArchiveDatabases: string[] = [];
		const databaseFiles = fs.readdirSync(this.databasesDir);
		for (const fileName of databaseFiles) {
			if (!fileName.endsWith('.json')) continue;

			const id = fileName.substr(0, fileName.indexOf('.json'));
			if (id in this.databases) continue;

			const file = fs.readFileSync(path.join(this.databasesDir, fileName)).toString();
			const database = JSON.parse(file) as IDatabase;

			// convert to new archive databases
			// @ts-expect-error
			if (database.previousCycles) {
				if (!(id in this.archiveDatabases)) this.archiveDatabases[id] = {};
				// @ts-expect-error
				this.archiveDatabases[id].previousCycles = Tools.deepClone(database.previousCycles); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
				// @ts-expect-error
				delete database.previousCycles;

				convertedArchiveDatabases.push(id);
			}

			let hasLeaderboard = false;
			// convert old leaderboards as needed
			for (const type of this.allLeaderboardTypes) {
				if (!database[type]) continue;
				hasLeaderboard = true;

				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				if (!database[type].entries) {
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

		// convert old offline messages
		if (globalDatabase.offlineMessages) {
			for (const user in globalDatabase.offlineMessages) {
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				if (!globalDatabase.offlineMessages[user].messages) {
					globalDatabase.offlineMessages[user] = {
						// @ts-expect-error
						messages: globalDatabase.offlineMessages[user],
					};
				}
			}
		}

		if (globalDatabase.lastSeen) {
			const now = Date.now();
			for (const i in globalDatabase.lastSeen) {
				if (now - globalDatabase.lastSeen[i] > LAST_SEEN_EXPIRATION) delete globalDatabase.lastSeen[i];
			}
		}

		this.loadedDatabases = true;

		for (const id of convertedArchiveDatabases) {
			void this.exportArchiveDatabase(id);
			void this.exportDatabase(id);
		}
	}

	exportDatabases(): Promise<void>[] {
		const promises: Promise<void>[] = [this.exportGlobalDatabase()];

		for (const i in this.databases) {
			promises.push(this.exportDatabase(i));
		}

		return promises;
	}

	removeDatabase(id: string): void {
		delete this.databases[id];
		delete this.archiveDatabases[id];
	}

	renameRoom(room: Room, oldId: string): void {
		if (oldId in this.databases && room.id !== oldId) {
			this.databases[room.id] = this.databases[oldId];
			delete this.databases[oldId];
		}
	}

	getDefaultLeaderboardType(database: IDatabase): LeaderboardType {
		if (database.tournamentLeaderboard) return 'tournamentLeaderboard';
		if (database.gameLeaderboard) return 'gameLeaderboard';
		return 'unsortedLeaderboard';
	}

	async clearLeaderboard(roomid: string, leaderboardTypes?: LeaderboardType[]): Promise<void> {
		if (!(roomid in this.databases)) return Promise.resolve();
		if (!leaderboardTypes || !leaderboardTypes.length) leaderboardTypes = this.allLeaderboardTypes;

		return this.saveDatabaseSnapshot(roomid)
			.then(() => {
				const database = this.databases[roomid];
				const cycleTime = this.formatCycleTime(Date.now());
				const previousCycle: IPreviousCycle = {
					cycleStartDate: database.cycleStartDate || cycleTime,
					cycleEndDate: cycleTime,
				};

				database.cycleStartDate = cycleTime;

				for (const type of this.allLeaderboardTypes) {
					if (!database[type]) continue;
					previousCycle[type] = Tools.deepClone(database[type]);
				}

				if (database.scriptedGameCounts) {
					previousCycle.scriptedGameCounts = Tools.deepClone(database.scriptedGameCounts);
					database.scriptedGameCounts = {};
				}

				if (database.userHostedGameCounts) {
					previousCycle.userHostedGameCounts = Tools.deepClone(database.userHostedGameCounts);
					database.userHostedGameCounts = {};
				}

				if (database.scriptedGameStats) {
					previousCycle.scriptedGameStats = Tools.deepClone(database.scriptedGameStats);
					database.scriptedGameStats = [];
				}

				if (database.userHostedGameStats) {
					previousCycle.userHostedGameStats = Tools.deepClone(database.userHostedGameStats);
					database.userHostedGameStats = {};
				}

				if (!(roomid in this.archiveDatabases)) this.archiveDatabases[roomid] = {};
				const archiveDatabase = this.archiveDatabases[roomid];
				if (!archiveDatabase.previousCycles) {
					archiveDatabase.previousCycles = [];
				} else {
					while (archiveDatabase.previousCycles.length > 26) {
						archiveDatabase.previousCycles.pop();
					}
				}
				archiveDatabase.previousCycles.unshift(previousCycle);

				const date = new Date();
				const month = date.getMonth() + 1;
				const day = date.getDate();
				const clearAnnual = (month === 12 && day === 31) || (month === 1 && day === 1);
				for (const leaderboardType of leaderboardTypes) {
					if (!database[leaderboardType]) continue;
					for (const i in database[leaderboardType].entries) {
						const user = database[leaderboardType].entries[i];
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

				this.updateLeaderboardCaches(roomid, database);

				this.tryExportArchiveDatabase(roomid);
				this.tryExportDatabase(roomid);
			})
			.catch((e: Error) => console.log("Error archiving " + roomid + " database: " + e.message));
	}

	formatCycleTime(time: number): string {
		const date = new Date(time);
		return (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear();
	}

	createLeaderboardEntry(leaderboard: ILeaderboard, name: string, id: string): void {
		if (id in leaderboard.entries) return;

		leaderboard.entries[id] = {
			annual: 0,
			annualSources: {},
			current: 0,
			name: Tools.toAlphaNumeric(name),
			sources: {},
		};
	}

	createGameTrainerCard(database: IDatabase, name: string): void {
		const id = Tools.toId(name);
		if (!database.gameTrainerCards) database.gameTrainerCards = {};
		if (id in database.gameTrainerCards) return;

		database.gameTrainerCards[id] = {
			pokemon: [],
		};
	}

	createGameHostBox(database: IDatabase, name: string): void {
		const id = Tools.toId(name);
		if (!database.gameHostBoxes) database.gameHostBoxes = {};
		if (id in database.gameHostBoxes) return;

		database.gameHostBoxes[id] = {
			pokemon: [],
		};
	}

	createGameHostDisplay(database: IDatabase, name: string): void {
		const id = Tools.toId(name);
		if (!database.gameHostDisplays) database.gameHostDisplays = {};
		if (id in database.gameHostDisplays) return;

		database.gameHostDisplays[id] = {
			pokemon: [],
			trainers: [],
			gifOrIcon: 'gif',
		};
	}

	createGameScriptedBox(database: IDatabase, name: string): void {
		const id = Tools.toId(name);
		if (!database.gameScriptedBoxes) database.gameScriptedBoxes = {};
		if (!(id in database.gameScriptedBoxes)) {
			database.gameScriptedBoxes[id] = {};
		}

		if (!database.gameFormatScriptedBoxes) database.gameFormatScriptedBoxes = {};
		if (!(id in database.gameFormatScriptedBoxes)) {
			database.gameFormatScriptedBoxes[id] = {};
		}
	}

	createOfflineMessagesEntry(name: string): void {
		const globalDatabase = this.getGlobalDatabase();
		const id = Tools.toId(name);
		if (!globalDatabase.offlineMessages) globalDatabase.offlineMessages = {};
		if (id in globalDatabase.offlineMessages) return;

		globalDatabase.offlineMessages[id] = {
			messages: [],
		};
	}

	createTournamentTrainerCard(database: IDatabase, name: string): void {
		const id = Tools.toId(name);
		if (!database.tournamentTrainerCards) database.tournamentTrainerCards = {};
		if (id in database.tournamentTrainerCards) return;

		database.tournamentTrainerCards[id] = {};
	}

	addPoints(room: Room, leaderboardType: LeaderboardType, name: string, amount: number, source: string, batch?: boolean): void {
		if (!amount) return;

		const id = Tools.toId(name);
		if (!id || !Tools.isUsernameLength(id)) return;
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

		const leaderboard = database[leaderboardType];
		if (!leaderboard.sources.includes(source)) leaderboard.sources.push(source);

		if (!(id in leaderboard.entries)) {
			this.createLeaderboardEntry(leaderboard, name, id);
		} else {
			leaderboard.entries[id].name = Tools.toAlphaNumeric(name);
		}

		leaderboard.entries[id].current = Math.max(0, leaderboard.entries[id].current + amount);

		if (!(source in leaderboard.entries[id].sources)) leaderboard.entries[id].sources[source] = 0;
		leaderboard.entries[id].sources[source] += amount;
		if (leaderboard.entries[id].sources[source] <= 0) delete leaderboard.entries[id].sources[source];

		if (!batch) this.afterAddPoints(room, leaderboardType, source);
	}

	afterAddPoints(room: Room, leaderboardType: LeaderboardType, source: string): void {
		const database = this.getDatabase(room);
		const leaderboard = database[leaderboardType];
		if (!leaderboard) throw new Error("Storage.afterAddPoints() called with no leaderboard");

		this.updateLeaderboardPointsCaches(room.id, leaderboard);
		this.updateLeaderboardPointsBreakdownCaches(room.id, leaderboard);
		this.updateLeaderboardCachesForSource(room.id, leaderboard, source);
	}

	removePoints(room: Room, leaderboardType: LeaderboardType, name: string, amount: number, source: string, batch?: boolean): void {
		if (amount < 0) throw new Error("Storage.removePoints() called with a negative amount");
		this.addPoints(room, leaderboardType, name, amount * -1, source, batch);
	}

	removeAllPoints(room: Room, leaderboardType: LeaderboardType, name: string): boolean {
		const database = this.getDatabase(room);
		const leaderboard = database[leaderboardType];
		if (!leaderboard) throw new Error("Storage.removeAllPoints() called with no leaderboard");

		const id = Tools.toId(name);
		if (!(id in leaderboard.entries)) return false;

		const sources = Object.keys(leaderboard.entries[id].sources).filter(x => leaderboard.entries[id].sources[x] > 0);
		const lastIndex = sources.length - 1;
		for (let i = 0; i < sources.length; i++) {
			this.removePoints(room, leaderboardType, name, leaderboard.entries[id].sources[sources[i]], sources[i], i !== lastIndex);
		}

		return true;
	}

	getPoints(room: Room, leaderboardType: LeaderboardType, name: string): number {
		const database = this.getDatabase(room);
		const id = Tools.toId(name);
		if (!database[leaderboardType] || !(id in database[leaderboardType].entries)) return 0;
		return database[leaderboardType].entries[id].current;
	}

	getAnnualPoints(room: Room, leaderboardType: LeaderboardType, name: string): number {
		const database = this.getDatabase(room);
		const id = Tools.toId(name);
		if (!database[leaderboardType] || !(id in database[leaderboardType].entries)) return 0;
		return database[leaderboardType].entries[id].annual + database[leaderboardType].entries[id].current;
	}

	sortPointsCache(users: string[], leaderboard: ILeaderboard, points: Dict<number>): ICachedLeaderboardEntry[] {
		return users.filter(x => points[x] !== 0)
			.sort((a, b) => {
				if (points[b] === points[a]) {
					if (b > a) return -1;
					return 1;
				}
				return points[b] - points[a];
			}).map(x => {
				return {
					id: x,
					name: leaderboard.entries[x].name,
					points: points[x],
				};
			});
	}

	sortPointBreakdownsCache(users: string[], leaderboard: ILeaderboard, breakdowns: Dict<IUserPointBreakdowns>):
		ICachedPointsBreakdown[] {
		return users.filter(x => breakdowns[x].total !== 0)
			.sort((a, b) => {
				if (breakdowns[b].total === breakdowns[a].total) {
					if (b > a) return -1;
					return 1;
				}
				return breakdowns[b].total - breakdowns[a].total;
			}).map(x => {
				return {
					id: x,
					name: leaderboard.entries[x].name,
					breakdown: breakdowns[x],
				};
			});
	}

	getAllPoints(leaderboard: ILeaderboard): IPointTotalsByType {
		const annual: Dict<number> = {};
		const current: Dict<number> = {};

		for (const id in leaderboard.entries) {
			annual[id] = leaderboard.entries[id].annual + leaderboard.entries[id].current;
			current[id] = leaderboard.entries[id].current;
		}

		return {
			annual,
			current,
		};
	}

	getAllPointBreakdowns(leaderboard: ILeaderboard, sources?: string[]): IPointBreakdownsByType {
		if (!sources) sources = leaderboard.sources;
		const annualBreakdowns: Dict<IUserPointBreakdowns> = {};
		const currentBreakdowns: Dict<IUserPointBreakdowns> = {};

		for (const id in leaderboard.entries) {
			const annualBreakdown: Dict<IPointBreakdown> = {};
			const currentBreakdown: Dict<IPointBreakdown> = {};

			const annualTotal = leaderboard.entries[id].annual + leaderboard.entries[id].current;
			const currentTotal = leaderboard.entries[id].current;
			for (const source of sources) {
				let annualSource = 0;
				let currentSource = 0;
				if (leaderboard.entries[id].annualSources[source]) annualSource += leaderboard.entries[id].annualSources[source];
				if (leaderboard.entries[id].sources[source]) {
					annualSource += leaderboard.entries[id].sources[source];
					currentSource = leaderboard.entries[id].sources[source];
				}

				if (annualSource && annualTotal) {
					annualBreakdown[source] = {
						points: annualSource,
						percentage: 100 * (annualSource / annualTotal),
					};
				}

				if (currentSource && currentTotal) {
					currentBreakdown[source] = {
						points: currentSource,
						percentage: 100 * (currentSource / currentTotal),
					};
				}
			}

			const sortedAnnualBreakdown: Dict<IPointBreakdown> = {};
			const sortedCurrentBreakdown: Dict<IPointBreakdown> = {};

			const sortedAnnualKeys = Object.keys(annualBreakdown).sort((a, b) => annualBreakdown[b].points - annualBreakdown[a].points);
			for (const key of sortedAnnualKeys) {
				sortedAnnualBreakdown[key] = annualBreakdown[key];
			}

			const sortedCurrentKeys = Object.keys(currentBreakdown).sort((a, b) => currentBreakdown[b].points - currentBreakdown[a].points);
			for (const key of sortedCurrentKeys) {
				sortedCurrentBreakdown[key] = currentBreakdown[key];
			}

			annualBreakdowns[id] = {
				total: annualTotal,
				breakdowns: sortedAnnualBreakdown,
			};
			currentBreakdowns[id] = {
				total: currentTotal,
				breakdowns: sortedCurrentBreakdown,
			};
		}

		return {
			annual: annualBreakdowns,
			current: currentBreakdowns,
		};
	}

	getSourcePoints(leaderboard: ILeaderboard, sources: string[]): IPointTotalsByType {
		const annual: Dict<number> = {};
		const current: Dict<number> = {};

		const users = Object.keys(leaderboard.entries);
		for (const source of sources) {
			for (const id of users) {
				let annualSourcePoints = 0;
				if (leaderboard.entries[id].sources[source]) annualSourcePoints += leaderboard.entries[id].sources[source];
				if (leaderboard.entries[id].annualSources[source]) {
					annualSourcePoints += leaderboard.entries[id].annualSources[source];
				}

				if (!annual[id]) annual[id] = 0;
				if (!current[id]) current[id] = 0;

				annual[id] += annualSourcePoints;
				current[id] += leaderboard.entries[id].sources[source] || 0;
			}
		}

		return {
			annual,
			current,
		};
	}

	updateLeaderboardCaches(roomid: string, database: IDatabase): void {
		for (const type of this.allLeaderboardTypes) {
			if (!database[type]) continue;
			this.updateLeaderboardPointsCaches(roomid, database[type]);
			this.updateLeaderboardPointsBreakdownCaches(roomid, database[type]);
			for (const source of database[type].sources) {
				this.updateLeaderboardSourcePointsCaches(roomid, database[type], source);
			}
		}
	}

	getSourceCacheKey(sources: readonly string[]): string {
		return sources.slice().sort().join(',');
	}

	updateLeaderboardCachesForSource(roomid: string, leaderboard: ILeaderboard, sourceKey: string): void {
		this.updateLeaderboardSourcePointsCaches(roomid, leaderboard, sourceKey);

		for (const key in this.leaderboardsSourcePointsCache[roomid][this.currentCycle][leaderboard.type]) {
			if (key === sourceKey) continue;
			if (key.includes(sourceKey)) {
				this.updateLeaderboardSourcePointsCaches(roomid, leaderboard, key);
			}
		}
	}

	updateLeaderboardPointsCaches(roomid: string, leaderboard: ILeaderboard): void {
		const users = Object.keys(leaderboard.entries);

		const allPoints = this.getAllPoints(leaderboard);

		if (!(roomid in this.leaderboardsAnnualPointsCache)) {
			this.leaderboardsAnnualPointsCache[roomid] = {};
		}

		if (!(roomid in this.leaderboardsPointsCache)) {
			this.leaderboardsPointsCache[roomid] = {};
		}

		if (!(this.currentCycle in this.leaderboardsPointsCache[roomid])) {
			this.leaderboardsPointsCache[roomid][this.currentCycle] = {};
		}

		this.leaderboardsAnnualPointsCache[roomid][leaderboard.type] = this.sortPointsCache(users, leaderboard, allPoints.annual);
		this.leaderboardsPointsCache[roomid][this.currentCycle][leaderboard.type] = this.sortPointsCache(users, leaderboard,
			allPoints.current);
	}

	updateLeaderboardPointsBreakdownCaches(roomid: string, leaderboard: ILeaderboard): void {
		const users = Object.keys(leaderboard.entries);

		const allBreakdowns = this.getAllPointBreakdowns(leaderboard);

		if (!(roomid in this.leaderboardsAnnualPointBreakdownsCache)) {
			this.leaderboardsAnnualPointBreakdownsCache[roomid] = {};
		}

		if (!(roomid in this.leaderboardsPointBreakdownsCache)) {
			this.leaderboardsPointBreakdownsCache[roomid] = {};
		}

		if (!(this.currentCycle in this.leaderboardsPointBreakdownsCache[roomid])) {
			this.leaderboardsPointBreakdownsCache[roomid][this.currentCycle] = {};
		}

		this.leaderboardsAnnualPointBreakdownsCache[roomid][leaderboard.type] = this.sortPointBreakdownsCache(users, leaderboard,
			allBreakdowns.annual);
		this.leaderboardsPointBreakdownsCache[roomid][this.currentCycle][leaderboard.type] = this.sortPointBreakdownsCache(users,
			leaderboard, allBreakdowns.current);
	}

	updateLeaderboardSourcePointsCaches(roomid: string, leaderboard: ILeaderboard, sourceKey: string): void {
		const users = Object.keys(leaderboard.entries);

		const sources = sourceKey.split(",");
		const sourcePoints = this.getSourcePoints(leaderboard, sources);

		if (!(roomid in this.leaderboardsAnnualSourcePointsCache)) {
			this.leaderboardsAnnualSourcePointsCache[roomid] = {};
		}
		if (!this.leaderboardsAnnualSourcePointsCache[roomid][leaderboard.type]) {
			this.leaderboardsAnnualSourcePointsCache[roomid][leaderboard.type] = {};
		}

		if (!(roomid in this.leaderboardsSourcePointsCache)) {
			this.leaderboardsSourcePointsCache[roomid] = {};
		}

		if (!(this.currentCycle in this.leaderboardsSourcePointsCache[roomid])) {
			this.leaderboardsSourcePointsCache[roomid][this.currentCycle] = {};
		}

		if (!(leaderboard.type in this.leaderboardsSourcePointsCache[roomid][this.currentCycle])) {
			this.leaderboardsSourcePointsCache[roomid][this.currentCycle][leaderboard.type] = {};
		}

		this.leaderboardsAnnualSourcePointsCache[roomid][leaderboard.type]![sourceKey] = this.sortPointsCache(users,
			leaderboard, sourcePoints.annual);
		this.leaderboardsSourcePointsCache[roomid][this.currentCycle][leaderboard.type]![sourceKey] = this.sortPointsCache(users,
			leaderboard, sourcePoints.current);
	}

	getAnnualPointsCache(room: Room, leaderboardType: LeaderboardType): ICachedLeaderboardEntry[] | undefined {
		if (!(room.id in this.leaderboardsAnnualPointsCache) || !this.leaderboardsAnnualPointsCache[room.id][leaderboardType]) return;
		return this.leaderboardsAnnualPointsCache[room.id][leaderboardType];
	}

	getAnnualSourcePointsCache(room: Room, leaderboardType: LeaderboardType, sources: readonly string[]): ICachedLeaderboardEntry[] {
		if (!(room.id in this.leaderboardsAnnualSourcePointsCache) ||
			!this.leaderboardsAnnualSourcePointsCache[room.id][leaderboardType]) return [];

		const key = this.getSourceCacheKey(sources);
		if (!(key in this.leaderboardsAnnualSourcePointsCache[room.id][leaderboardType]!)) {
			this.updateLeaderboardSourcePointsCaches(room.id, this.getDatabase(room)[leaderboardType]!, key);
		}

		return this.leaderboardsAnnualSourcePointsCache[room.id][leaderboardType]![key];
	}

	getPointsCache(room: Room, leaderboardType: LeaderboardType): ICachedLeaderboardEntry[] {
		if (!(room.id in this.leaderboardsPointsCache) || !(this.currentCycle in this.leaderboardsPointsCache[room.id]) ||
			!(leaderboardType in this.leaderboardsPointsCache[room.id][this.currentCycle])) return [];
		return this.leaderboardsPointsCache[room.id][this.currentCycle][leaderboardType]!;
	}

	getSourcePointsCache(room: Room, leaderboardType: LeaderboardType, sources: readonly string[]): ICachedLeaderboardEntry[] {
		if (!(room.id in this.leaderboardsSourcePointsCache) || !(this.currentCycle in this.leaderboardsSourcePointsCache[room.id]) ||
			!(leaderboardType in this.leaderboardsSourcePointsCache[room.id][this.currentCycle])) return [];

		const key = this.getSourceCacheKey(sources);
		if (!(key in this.leaderboardsSourcePointsCache[room.id][this.currentCycle][leaderboardType]!)) {
			this.updateLeaderboardSourcePointsCaches(room.id, this.getDatabase(room)[leaderboardType]!, key);
		}

		return this.leaderboardsSourcePointsCache[room.id][this.currentCycle][leaderboardType]![key];
	}

	getPointsBreakdownCache(room: Room, leaderboardType: LeaderboardType): ICachedPointsBreakdown[] {
		if (!(room.id in this.leaderboardsPointBreakdownsCache) || !(this.currentCycle in this.leaderboardsPointBreakdownsCache[room.id]) ||
			!(leaderboardType in this.leaderboardsPointBreakdownsCache[room.id][this.currentCycle])) return [];
		return this.leaderboardsPointBreakdownsCache[room.id][this.currentCycle][leaderboardType]!;
	}

	getPreviousCyclePointsCache(room: Room, leaderboard: ILeaderboard, cycle: string): ICachedLeaderboardEntry[] {
		if (!(room.id in this.leaderboardsPointsCache)) {
			this.leaderboardsPointsCache[room.id] = {};
		}

		if (!(cycle in this.leaderboardsPointsCache[room.id])) {
			this.leaderboardsPointsCache[room.id][cycle] = {};
		}

		if (!(leaderboard.type in this.leaderboardsPointsCache[room.id][cycle])) {
			this.leaderboardsPointsCache[room.id][cycle][leaderboard.type] = this.sortPointsCache(Object.keys(leaderboard.entries),
				leaderboard, this.getAllPoints(leaderboard).current);
		}

		return this.leaderboardsPointsCache[room.id][cycle][leaderboard.type]!;
	}

	getPreviousCycleSourcePointsCache(room: Room, leaderboard: ILeaderboard, sources: string[], cycle: string): ICachedLeaderboardEntry[] {
		if (!(room.id in this.leaderboardsSourcePointsCache)) {
			this.leaderboardsSourcePointsCache[room.id] = {};
		}

		if (!(cycle in this.leaderboardsSourcePointsCache[room.id])) {
			this.leaderboardsSourcePointsCache[room.id][cycle] = {};
		}

		if (!(leaderboard.type in this.leaderboardsSourcePointsCache[room.id][cycle])) {
			this.leaderboardsSourcePointsCache[room.id][cycle][leaderboard.type] = {};
		}

		const key = this.getSourceCacheKey(sources);
		if (!(key in this.leaderboardsSourcePointsCache[room.id][cycle][leaderboard.type]!)) {
			this.leaderboardsSourcePointsCache[room.id][cycle][leaderboard.type]![key] =
				this.sortPointsCache(Object.keys(leaderboard.entries), leaderboard, this.getSourcePoints(leaderboard, sources).current);
		}

		return this.leaderboardsSourcePointsCache[room.id][cycle][leaderboard.type]![key];
	}

	getPreviousCyclePointsBreakdownCache(room: Room, leaderboard: ILeaderboard, cycle: string): ICachedPointsBreakdown[] {
		if (!(room.id in this.leaderboardsPointBreakdownsCache)) {
			this.leaderboardsPointBreakdownsCache[room.id] = {};
		}

		if (!(cycle in this.leaderboardsPointBreakdownsCache[room.id])) {
			this.leaderboardsPointBreakdownsCache[room.id][cycle] = {};
		}

		if (!(leaderboard.type in this.leaderboardsPointBreakdownsCache[room.id][cycle])) {
			this.leaderboardsPointBreakdownsCache[room.id][cycle][leaderboard.type] =
				this.sortPointBreakdownsCache(Object.keys(leaderboard.entries), leaderboard,
					this.getAllPointBreakdowns(leaderboard).current);
		}

		return this.leaderboardsPointBreakdownsCache[room.id][cycle][leaderboard.type]!;
	}

	transferData(roomid: string, sourceName: string, destinationName: string): boolean {
		if (!(roomid in this.databases)) return false;

		const sourceId = Tools.toId(sourceName);
		const destinationId = Tools.toId(destinationName);
		if (!sourceId || !destinationId || sourceId === destinationId) return false;

		const database = this.databases[roomid];
		let updatedLeaderboard = false;

		for (const leaderboardType of this.allLeaderboardTypes) {
			if (!database[leaderboardType] || !(sourceId in database[leaderboardType].entries)) continue;
			updatedLeaderboard = true;

			const leaderboard = database[leaderboardType];
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

		if (database.gameHostBoxes && sourceId in database.gameHostBoxes) {
			database.gameHostBoxes[destinationId] = database.gameHostBoxes[sourceId];
			delete database.gameHostBoxes[sourceId];
		}

		if (database.gameScriptedBoxes && sourceId in database.gameScriptedBoxes) {
			database.gameScriptedBoxes[destinationId] = database.gameScriptedBoxes[sourceId];
			delete database.gameScriptedBoxes[sourceId];
		}

		if (database.gameTrainerCards && sourceId in database.gameTrainerCards) {
			database.gameTrainerCards[destinationId] = database.gameTrainerCards[sourceId];
			delete database.gameTrainerCards[sourceId];
		}

		if (updatedLeaderboard) this.updateLeaderboardCaches(roomid, database);
		return true;
	}

	storeOfflineMessage(sender: string, recipientId: string, message: string): boolean {
		const database = this.getGlobalDatabase();
		if (!database.offlineMessages) database.offlineMessages = {};
		if (recipientId in database.offlineMessages) {
			const senderId = Tools.toId(sender);
			let queuedMessages = 0;
			for (const offlineMessage of database.offlineMessages[recipientId].messages) {
				if (!offlineMessage.readTime && Tools.toId(offlineMessage.sender) === senderId) queuedMessages++;
			}
			if (queuedMessages > MAX_QUEUED_OFFLINE_MESSAGES) return false;
		} else {
			database.offlineMessages[recipientId] = {
				messages: [],
			};
		}

		database.offlineMessages[recipientId].messages.push({
			message,
			sender: Tools.toAlphaNumeric(sender),
			readTime: 0,
			sentTime: Date.now(),
		});
		return true;
	}

	retrieveOfflineMessages(user: User): void {
		if (user.locked) return;

		const database = this.getGlobalDatabase();
		if (!database.offlineMessages || !(user.id in database.offlineMessages)) return;
		let hasNewMail = false;
		for (const message of database.offlineMessages[user.id].messages) {
			if (!message.readTime && !Client.checkFilters(message.message)) {
				hasNewMail = true;
				break;
			}
		}

		if (hasNewMail) CommandParser.parse(user, user, Config.commandCharacter + "checkmail", Date.now());
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
	let oldStorage = global.Storage as Storage | undefined;

	global.Storage = new Storage();

	if (oldStorage) {
		global.Storage.onReload(oldStorage);
		oldStorage = undefined;
	}
};
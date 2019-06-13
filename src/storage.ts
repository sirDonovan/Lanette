import fs = require('fs');
import path = require('path');
import { Room } from './rooms';
import { rootFolder } from './tools';
import { IDatabase } from './types/storage';

const archivedDatabasesDir = path.join(rootFolder, 'archived-databases');
const databasesDir = path.join(rootFolder, 'databases');

export class Storage {
	databaseCache: Dict<IDatabase> = {};
	loadedDatabases: boolean = false;
	chatLogFilePathCache: Dict<string> = {};
	chatLogRolloverTimes: Dict<number> = {};

	get databases(): Dict<IDatabase> {
		if (!this.loadedDatabases) this.importDatabases();
		return this.databaseCache;
	}

	onReload(previous: Storage) {
		this.databaseCache = previous.databaseCache;
		this.loadedDatabases = previous.loadedDatabases;
	}

	getDatabase(room: Room): IDatabase {
		if (!(room.id in this.databases)) this.databases[room.id] = {};
		return this.databases[room.id];
	}

	importDatabase(roomid: string) {
		try {
			const file = fs.readFileSync(path.join(databasesDir, roomid + '.json')).toString();
			this.databaseCache[roomid] = JSON.parse(file);
		} catch (e) {
			if (e.code !== 'ENOENT') throw e;
		}
	}

	exportDatabase(roomid: string) {
		if (!(roomid in this.databases) || roomid.startsWith('battle-') || roomid.startsWith('groupchat-')) return;
		fs.writeFileSync(path.join(databasesDir, roomid + '.json'), JSON.stringify(this.databases[roomid]));
	}

	archiveDatabase(roomid: string) {
		if (!(roomid in this.databases) || roomid.startsWith('battle-') || roomid.startsWith('groupchat-')) return;
		const date = new Date();
		const year = date.getFullYear();
		const month = date.getMonth() + 1;
		const day = date.getDate();
		const filename = roomid + '-' + year + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day + '-at-' + Tools.toTimestampString(date).split(' ')[1].split(':').join('-');
		fs.writeFileSync(path.join(archivedDatabasesDir, filename + '.json'), JSON.stringify(this.databases[roomid]));
	}

	importDatabases() {
		if (this.loadedDatabases) return;

		const databases = fs.readdirSync(databasesDir);
		for (let i = 0; i < databases.length; i++) {
			const file = databases[i];
			if (!file.endsWith('.json')) continue;
			this.importDatabase(file.substr(0, file.indexOf('.json')));
		}

		this.loadedDatabases = true;
	}

	exportDatabases() {
		for (const i in this.databases) {
			this.exportDatabase(i);
		}
	}

	clearLeaderboard(roomid: string): boolean {
		if (!(roomid in this.databases) || !this.databases[roomid].leaderboard) return false;
		this.archiveDatabase(roomid);
		const date = new Date();
		const month = date.getMonth() + 1;
		const day = date.getDate();
		const clearAnnual = (month === 12 && day === 31) || (month === 1 && day === 1);
		for (const i in this.databases[roomid].leaderboard) {
			const user = this.databases[roomid].leaderboard![i];
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
		if (roomid + 'hosting' in this.databases) this.clearLeaderboard(roomid + 'hosting');
		this.exportDatabase(roomid);
		return true;
	}

	createLeaderboardEntry(database: IDatabase, name: string, id: string) {
		database.leaderboard![id] = {
			annual: 0,
			annualSources: {},
			current: 0,
			name,
			sources: {},
		};
	}

	addPoints(room: Room, name: string, amount: number, source: string): void {
		if (!amount) return;
		if (amount < 0) return this.removePoints(room, name, amount * -1, source);
		const database = this.getDatabase(room);
		if (!database.leaderboard) database.leaderboard = {};
		name = Tools.toAlphaNumeric(name);
		const id = Tools.toId(name);
		if (!id) return;
		source = Tools.toId(source);
		if (!source) return;
		if (!(id in database.leaderboard)) {
			this.createLeaderboardEntry(database, name, id);
		} else {
			database.leaderboard[id].name = name;
		}
		database.leaderboard[id].current += amount;
		if (!(source in database.leaderboard[id].sources)) database.leaderboard[id].sources[source] = 0;
		database.leaderboard[id].sources[source] += amount;
	}

	removePoints(room: Room, name: string, amount: number, source: string): void {
		if (!amount) return;
		if (amount < 0) return this.addPoints(room, name, amount * -1, source);
		const database = this.getDatabase(room);
		if (!database.leaderboard) return;
		name = Tools.toAlphaNumeric(name);
		const id = Tools.toId(name);
		if (!(id in database.leaderboard)) return;
		source = Tools.toId(source);
		if (!source) return;
		database.leaderboard[id].name = name;
		database.leaderboard[id].current -= amount;
		if (database.leaderboard[id].current < 0) database.leaderboard[id].current = 0;
		if (source in database.leaderboard[id].sources) {
			database.leaderboard[id].sources[source] -= amount;
			if (database.leaderboard[id].sources[source] <= 0) delete database.leaderboard[id].sources[source];
		}
	}

	transferData(roomid: string, source: string, destination: string): boolean {
		if (!(roomid in this.databases)) return false;
		const sourceId = Tools.toId(source);
		const destinationId = Tools.toId(destination);
		if (!sourceId || !destinationId || sourceId === destinationId) return false;
		const database = this.databases[roomid];
		if (database.leaderboard && sourceId in database.leaderboard) {
			if (!(destinationId in database.leaderboard)) this.createLeaderboardEntry(database, destination, destinationId);
			for (const source in database.leaderboard[sourceId].sources) {
				if (source in database.leaderboard[destinationId].sources) {
					database.leaderboard[destinationId].sources[source] += database.leaderboard[sourceId].sources[source];
				} else {
					database.leaderboard[destinationId].sources[source] = database.leaderboard[sourceId].sources[source];
				}
			}
			for (const source in database.leaderboard[sourceId].annualSources) {
				if (source in database.leaderboard[destinationId].annualSources) {
					database.leaderboard[destinationId].annualSources[source] += database.leaderboard[sourceId].annualSources[source];
				} else {
					database.leaderboard[destinationId].annualSources[source] = database.leaderboard[sourceId].annualSources[source];
				}
			}
			database.leaderboard[destinationId].current += database.leaderboard[sourceId].current;
			database.leaderboard[destinationId].annual += database.leaderboard[sourceId].annual;
		}

		if (roomid + 'hosting' in this.databases) this.transferData(roomid + 'hosting', source, destination);
		return true;
	}

	logChatMessage(room: Room, time: number, messageType: string, message: string) {
		const date = new Date(time);
		if (!this.chatLogRolloverTimes[room.id] || time >= this.chatLogRolloverTimes[room.id]) {
			const midnight = new Date();
			midnight.setHours(24, 0, 0, 0);
			this.chatLogRolloverTimes[room.id] = midnight.getTime();
			const year = date.getFullYear();
			const month = date.getMonth() + 1;
			const day = date.getDate();
			const directory = path.join(rootFolder, 'roomlogs', room.id, '' + year);
			try {
				fs.mkdirSync(directory, {recursive: true});
			// tslint:disable-next-line no-empty
			} catch {}
			const filename = year + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day + '.txt';
			this.chatLogFilePathCache[room.id] = path.join(directory, filename);
		}
		fs.appendFileSync(this.chatLogFilePathCache[room.id], Tools.toTimestampString(date).split(" ")[1] + ' |' + messageType + '|' + message + "\n");
	}
}

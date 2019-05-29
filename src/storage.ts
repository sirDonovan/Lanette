import fs = require('fs');
import path = require('path');
import { Room } from './rooms';
import { IDatabase } from './types/storage';

const rootFolder = path.resolve(__dirname, '.', '..');
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
		if (!(roomid in this.databaseCache) || roomid.startsWith('battle-') || roomid.startsWith('groupchat-')) return;
		fs.writeFileSync(path.join(databasesDir, roomid + '.json'), JSON.stringify(this.databaseCache[roomid]));
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
		for (const i in this.databaseCache) {
			this.exportDatabase(i);
		}
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
			database.leaderboard[id] = {
				annual: 0,
				annualSources: {},
				current: 0,
				name,
				sources: {},
			};
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

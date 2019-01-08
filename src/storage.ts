import fs = require('fs');
import path = require('path');
import { Room } from './rooms';
import { IDatabase } from './types/storage';

const databasesDir = path.resolve(__dirname, '.', '..', 'databases');

export class Storage {
	databaseCache: Dict<IDatabase> = {};
	globalDatabase: IDatabase = {};
	loadedDatabases: boolean = false;

	get databases(): Dict<IDatabase> {
		if (!this.loadedDatabases) this.importDatabases();
		return this.databaseCache;
	}

	getDatabase(roomid: string): IDatabase {
		if (!(roomid in this.databases)) this.databases[roomid] = {};
		return this.databases[roomid];
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
		if (!(roomid in this.databaseCache)) return;
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
		const database = this.getDatabase(room.id);
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
		const database = this.getDatabase(room.id);
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
}

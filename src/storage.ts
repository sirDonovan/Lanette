import * as fs from 'fs';

const BACKUP_INTERVAL = 60 * 60 * 1000 as number;

export class Storage {
	databases = {} as Dict<any>;
	globalDatabase = {} as Dict<any>;
	backupInterval = null as NodeJS.Timer | null;

	constructor() {
		this.backupInterval = setInterval(() => this.exportDatabases(), BACKUP_INTERVAL);
	}

	getDatabase(roomid: string) {
		if (!(roomid in this.databases)) this.databases[roomid] = {};
		return this.databases[roomid];
	}

	importDatabase(roomid: string) {
		let file = '{}';
		try {
			file = fs.readFileSync('./src/databases/' + roomid + '.json').toString();
		} catch (e) {
			if (e.code !== 'ENOENT') throw e;
			// fs.writeFileSync('./src/databases/' + roomid + '.json', '{}');
		}
		this.databases[roomid] = JSON.parse(file);
	}

	exportDatabase(roomid: string) {
		if (!(roomid in this.databases)) return;
		fs.writeFileSync('./src/databases/' + roomid + '.json', JSON.stringify(this.databases[roomid]));
	}

	importDatabases() {
		const databases = fs.readdirSync('./src/databases');
		for (let i = 0; i < databases.length; i++) {
			const file = databases[i];
			if (!file.endsWith('.json')) continue;
			this.importDatabase(file.substr(0, file.indexOf('.json')));
		}
	}

	exportDatabases() {
		for (const roomid in this.databases) {
			this.exportDatabase(roomid);
		}
	}
}

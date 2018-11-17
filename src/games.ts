import * as fs from 'fs';
import * as path from 'path';
import { Game } from "./room-game";
import { Room } from "./rooms";

interface IGameClass<T> {
	new(room: Room): T;
}

export interface IGameFile<T extends Game> {
	class: IGameClass<T>;
	description: string;
	name: string;

	aliases?: string[];
}

export interface IGameFormat extends IGameFile<Game> {
	id: string;
}

export class Games {
	aliasesCache = {} as Dict<string>;
	formatsCache = {} as Dict<IGameFormat>;
	loadedFormats = false;

	get formats(): Dict<IGameFormat> {
		if (!this.loadedFormats) this.loadFormats();
		return this.formatsCache;
	}

	loadFormats() {
		this.aliasesCache = {};
		this.formatsCache = {};

		const gamesDirectory = path.join(__dirname, '/games');
		const gameFiles = fs.readdirSync(gamesDirectory);
		for (let i = 0; i < gameFiles.length; i++) {
			if (!gameFiles[i].endsWith('.js')) continue;
			const format = require(gamesDirectory + '/' + gameFiles[i]) as IGameFormat;
			format.id = Tools.toId(format.name);
			this.formatsCache[format.id] = format;
		}

		for (const i in this.formatsCache) {
			const format = this.formatsCache[i];
			if (format.aliases) {
				for (let i = 0; i < format.aliases.length; i++) {
					const alias = Tools.toId(format.aliases[i]);
					if (alias in this.formatsCache) throw new Error(format.name + "'s alias '" + alias + "' is the name of another game");
					if (alias in this.aliasesCache) throw new Error(format.name + "'s alias '" + alias + "' is already used by " + this.aliasesCache[alias]);
					this.aliasesCache[alias] = format.name;
				}
			}
		}

		this.loadedFormats = true;
	}

	getFormat(target: string): IGameFormat | false {
		const id = Tools.toId(target);
		if (id in this.aliasesCache) return this.getFormat(this.aliasesCache[id]);
		if (!(id in this.formatsCache)) return false;
		return this.formatsCache[id];
	}
}

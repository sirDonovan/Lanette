import path = require('path');
import { WorkerBase } from './worker-base';

interface ILogsIdKeys {
	search: any;
}
export type LogsId = keyof ILogsIdKeys;

export interface ILogsWorkerData {
	commandCharacter: string | undefined;
	roomLogsFolder: string;
	serverLogsViewer: string | undefined;
}

export interface ILogsSearchOptions {
	endDate: number[];
	phrases: string[] | null;
	roomid: string;
	showCommands: boolean;
	startDate: number[];
	userids: string[] | null;
}

// tslint:disable-next-line:no-empty-interface
export interface ILogsSearchMessage extends ILogsSearchOptions {}

export interface ILogsResponse {
	lines: string[];
	totalLines: number;
}

let serverLogsViewer = Config.serverLogsViewer;
if (serverLogsViewer && !serverLogsViewer.endsWith('/')) serverLogsViewer += '/';

export class LogsWorker extends WorkerBase<ILogsWorkerData, LogsId, ILogsResponse> {
	requestsByUserid: string[] = [];
	threadPath: string = path.join(__dirname, 'threads', __filename.substr(__dirname.length + 1));

	loadData(): ILogsWorkerData {
		if (this.workerData) return this.workerData;

		const data: ILogsWorkerData = {
			commandCharacter: Config.commandCharacter,
			roomLogsFolder: Tools.roomLogsFolder,
			serverLogsViewer,
		};

		return data;
	}

	search(options: ILogsSearchOptions): Promise<ILogsResponse> {
		return this.sendMessage('search', JSON.stringify(options));
	}
}

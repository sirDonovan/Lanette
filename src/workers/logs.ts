import path = require('path');

import { WorkerBase } from './worker-base';

export type LogsId = 'search';

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

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ILogsSearchMessage extends ILogsSearchOptions {}

export interface ILogsResponse {
	lines: string[];
	totalLines: number;
}

export class LogsWorker extends WorkerBase<ILogsWorkerData, LogsId, ILogsResponse> {
	requestsByUserid: string[] = [];
	threadPath: string = path.join(__dirname, 'threads', __filename.substr(__dirname.length + 1));

	loadData(): ILogsWorkerData {
		if (this.workerData) return this.workerData;

		let serverLogsViewer = Config.serverLogsViewer;
		if (serverLogsViewer && !serverLogsViewer.endsWith('/')) serverLogsViewer += '/';

		const data: ILogsWorkerData = {
			commandCharacter: Config.commandCharacter,
			roomLogsFolder: Tools.roomLogsFolder,
			serverLogsViewer,
		};

		return data;
	}

	async search(options: ILogsSearchOptions): Promise<ILogsResponse | null> {
		return this.sendMessage('search', JSON.stringify(options));
	}
}

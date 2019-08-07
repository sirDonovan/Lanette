import path = require('path');
import worker_threads = require('worker_threads');

export interface ILogsWorkerData {
	commandCharacter: string | undefined;
	roomLogsDir: string;
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

export interface ILogsSearchResult {
	lines: string[];
	totalLines: number;
}

let serverLogsViewer = Config.serverLogsViewer;
if (serverLogsViewer && !serverLogsViewer.endsWith('/')) serverLogsViewer += '/';

export const data: ILogsWorkerData = {
	commandCharacter: Config.commandCharacter,
	roomLogsDir: path.join(Tools.rootFolder, 'roomlogs'),
	serverLogsViewer,
};

export const requests: string[] = [];

let worker: worker_threads.Worker | undefined;

export function init(): worker_threads.Worker {
	if (worker) return worker;

	worker = new worker_threads.Worker(path.join(__dirname, 'threads', __filename.substr(__dirname.length + 1)), {workerData: data});
	worker.setMaxListeners(Infinity);
	worker.on('exit', code => {
		if (code !== 0) {
			console.log(new Error(`Worker stopped with exit code ${code}`));
		}
	});

	return worker;
}

export function unref() {
	if (worker) worker.unref();
}

export async function search(options: ILogsSearchOptions): Promise<ILogsSearchResult> {
	if (!worker) init();
	return (new Promise((resolve, reject) => {
		worker!.once('message', resolve);
		worker!.once('error', resolve);
		worker!.postMessage('search|' + JSON.stringify(options));
	}));
}

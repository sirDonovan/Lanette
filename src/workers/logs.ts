import path = require('path');
import worker_threads = require('worker_threads');

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

export interface ILogsSearchRequest extends ILogsSearchOptions {
	requestNumber: number;
}

export interface ILogsSearchResult {
	lines: string[];
	totalLines: number;
}

export interface ILogsSearchResponse extends ILogsSearchResult {
	requestNumber: number;
}

interface ILogsSearchQueueItem {
	resolve: (value?: ILogsSearchResult | PromiseLike<ILogsSearchResult> | undefined) => void;
	requestNumber: number;
}

let serverLogsViewer = Config.serverLogsViewer;
if (serverLogsViewer && !serverLogsViewer.endsWith('/')) serverLogsViewer += '/';

export const data: ILogsWorkerData = {
	commandCharacter: Config.commandCharacter,
	roomLogsFolder: Tools.roomLogsFolder,
	serverLogsViewer,
};

let requestNumber = 0;
const requestQueue: ILogsSearchQueueItem[] = [];
export const requestsByUserid: string[] = [];

let worker: worker_threads.Worker | undefined;

export function init(): worker_threads.Worker {
	if (worker) return worker;

	worker = new worker_threads.Worker(path.join(__dirname, 'threads', __filename.substr(__dirname.length + 1)), {workerData: data});
	worker.on('message', (message: string) => {
		const pipeIndex = message.indexOf('|');
		const result: ILogsSearchResponse = JSON.parse(message.substr(pipeIndex + 1));
		for (let i = 0; i < requestQueue.length; i++) {
			if (requestQueue[i].requestNumber === result.requestNumber) {
				requestQueue.splice(i, 1)[0].resolve(result);
				break;
			}
		}
	});
	worker.on('error', e => console.log(e));
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
		const request: ILogsSearchRequest = Object.assign({}, options, {requestNumber});
		requestQueue.push({resolve, requestNumber});
		requestNumber++;
		worker!.postMessage('search|' + JSON.stringify(request));
	}));
}

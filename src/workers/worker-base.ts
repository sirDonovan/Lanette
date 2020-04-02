// eslint-disable-next-line @typescript-eslint/camelcase
import worker_threads = require('worker_threads');

const UNREF_TIMER = 30 * 60 * 1000;

interface IWorkerQueueItem<T> {
	resolve: PromiseResolve<T>;
	messageNumber: number;
}

export abstract class WorkerBase<WorkerData, MessageId, ThreadResponse> {
	abstract threadPath: string;

	workerData: WorkerData | null = null;

	// eslint-disable-next-line @typescript-eslint/camelcase
	protected worker: worker_threads.Worker | null = null;

	private messageNumber: number = 0;
	private messageQueue: IWorkerQueueItem<ThreadResponse>[] = [];
	private unrefTimer: NodeJS.Timer | null = null;

	abstract loadData(): WorkerData;

	sendMessage(id: MessageId, message: string): Promise<ThreadResponse> {
		this.init();

		if (this.unrefTimer) clearTimeout(this.unrefTimer);
		this.unrefTimer = setTimeout(() => this.unref(), UNREF_TIMER);

		return (new Promise(resolve => {
			this.messageNumber++;
			this.messageQueue.push({resolve, messageNumber: this.messageNumber});
			this.worker!.postMessage(this.messageNumber + "|" + id + "|" + message);
		}));
	}

	init(): void {
		if (!this.workerData) this.workerData = this.loadData();
		if (!this.worker) {
			// eslint-disable-next-line @typescript-eslint/camelcase
			this.worker = new worker_threads.Worker(this.threadPath, {workerData: this.workerData});

			this.worker.on('message', (message: string) => {
				const parts = message.split("|");
				const requestNumber = parseInt(parts[0]);
				for (let i = 0; i < this.messageQueue.length; i++) {
					if (this.messageQueue[i].messageNumber === requestNumber) {
						const request = this.messageQueue.splice(i, 1)[0];
						request.resolve(JSON.parse(parts.slice(2).join("|")));
						break;
					}
				}
			});

			this.worker.on('error', e => console.log(e));

			this.worker.on('exit', code => {
				if (code !== 0) {
					console.log(new Error(`Worker stopped with exit code ${code}`));
				}
			});
		}
	}

	unref(): void {
		if (this.unrefTimer) clearTimeout(this.unrefTimer);
		if (this.worker) {
			this.worker.unref();
			this.worker = null;
		}
	}
}

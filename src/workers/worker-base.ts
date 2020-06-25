// eslint-disable-next-line @typescript-eslint/naming-convention
import worker_threads = require('worker_threads');

const UNREF_TIMER = 30 * 60 * 1000;

interface IWorkerQueueItem<T> {
	resolve: PromiseResolve<T>;
	messageNumber: number;
}

export abstract class WorkerBase<WorkerData, MessageId, ThreadResponse> {
	abstract threadPath: string;

	isBusy: boolean = false;
	workerData: WorkerData | null = null;

	// eslint-disable-next-line @typescript-eslint/naming-convention
	protected worker: worker_threads.Worker | null = null;

	private messageNumber: number = 0;
	private messageQueue: IWorkerQueueItem<ThreadResponse>[] = [];
	private sendMessages: boolean = true;
	private unrefTimer: NodeJS.Timer | null = null;

	abstract loadData(): WorkerData;

	async sendMessage(id: MessageId, message: string): Promise<ThreadResponse | null> {
		if (!this.sendMessages) return Promise.resolve(null);

		this.init();

		if (this.unrefTimer) clearTimeout(this.unrefTimer);
		this.unrefTimer = setTimeout(() => this.unref(), UNREF_TIMER);

		this.isBusy = true;

		return (new Promise(resolve => {
			this.messageNumber++;
			this.messageQueue.push({resolve, messageNumber: this.messageNumber});
			this.worker!.postMessage(this.messageNumber + "|" + id + "|" + message);
		}));
	}

	init(): void {
		if (!this.workerData) this.workerData = this.loadData();
		if (!this.worker) {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			this.worker = new worker_threads.Worker(this.threadPath, {workerData: this.workerData});

			this.worker.on('message', (message: string) => {
				const parts = message.split("|");
				const requestNumber = parseInt(parts[0]);
				for (let i = 0; i < this.messageQueue.length; i++) {
					if (this.messageQueue[i].messageNumber === requestNumber) {
						const request = this.messageQueue.splice(i, 1)[0];
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						let result = JSON.parse(parts.slice(2).join("|"));
						if (result === "") result = null;
						request.resolve(result);
						break;
					}
				}

				this.isBusy = !!this.messageQueue.length;
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
		this.sendMessages = false;

		if (this.messageQueue.length) {
			this.unrefTimer = setTimeout(() => this.unref(), 1000);
			return;
		}

		if (this.unrefTimer) {
			clearTimeout(this.unrefTimer);
			delete this.unrefTimer;
		}

		if (this.worker) {
			this.worker.unref();
			delete this.worker;
		}

		delete this.messageQueue;
		delete this.workerData;
	}
}

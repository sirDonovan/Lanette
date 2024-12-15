import worker_threads = require('worker_threads');

interface IWorkerQueueItem<T> {
	resolve: PromiseResolve<T>;
	messageNumber: number;
}

export type WorkerBaseMessageId = 'memory-usage' | 'initialize-thread' | 'unref';

export abstract class WorkerBase<WorkerData, MessageId, ThreadResponse, WorkerNames = string> {
	abstract threadPath: string;

	isBusy: boolean = false;
	workerData: WorkerData | undefined = undefined;
	workerNames: WorkerNames[] | undefined = undefined;

	protected queueWorkerMessages: boolean = true;
	protected workers: worker_threads.Worker[] | undefined = undefined;

	private workerBusy: Dict<boolean> = {};
	private messageNumber: number = 0;
	private pendingResolves: IWorkerQueueItem<ThreadResponse>[] = [];
	private workerMessageQueues: Dict<string[]> = {};
	private sendMessages: boolean = true;
	private unrefTimer: NodeJS.Timeout | undefined = undefined;

	async sendMessage(id: MessageId, message?: string, workerNumber?: number): Promise<ThreadResponse | null> {
		if (!this.sendMessages) return Promise.resolve(null);

		this.initialize();

		if (workerNumber) {
			if (!this.workerNames) throw new Error("Worker number passed to sendMessage() for a single worker");
			if (workerNumber < 0 || workerNumber > this.workerNames.length - 1) {
				throw new Error("Invalid worker number passed to sendMessage()");
			}
		} else {
			workerNumber = this.workerNames ? Tools.random(this.workerNames.length) : 0;
		}

		this.isBusy = true;

		return new Promise(resolve => {
			this.messageNumber++;
			this.pendingResolves.push({resolve, messageNumber: this.messageNumber});

			const workerMessage = this.messageNumber + "|" + id + "|" + (message || "");
			if (this.queueWorkerMessages && this.workerBusy[workerNumber]) {
				this.workerMessageQueues[workerNumber].push(workerMessage);
			} else {
				this.postMessage(workerNumber, workerMessage);
			}
		});
	}

	getData(): WorkerData {
		this.initialize();
		return this.workerData!;
	}

	initialize(): void {
		if (this.loadData && !this.workerData) this.workerData = this.loadData();

		if (!this.workers) {
			this.workers = [];

			let numberOfWorkers: number;
			if (this.workerNames) {
				numberOfWorkers = this.workerNames.length;
			} else {
				numberOfWorkers = 1;
			}

			for (let i = 0; i < numberOfWorkers; i++) {
				this.workerBusy[i] = false;
				this.workerMessageQueues[i] = [];

				const worker = new worker_threads.Worker(this.threadPath, {workerData: this.workerData});

				worker.on('message', (message: string) => {
					const parts = message.split("|");
					const requestNumber = parseInt(parts[0]);
					for (let j = 0; j < this.pendingResolves.length; j++) {
						if (this.pendingResolves[j].messageNumber === requestNumber) {
							const request = this.pendingResolves.splice(j, 1)[0];
							// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
							let result = JSON.parse(parts.slice(2).join("|"));
							if (result === "") result = null;

							// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
							request.resolve(result);

							this.workerBusy[i] = false;
							if (this.workerMessageQueues[i].length) this.postMessage(i, this.workerMessageQueues[i].shift()!);

							break;
						}
					}

					this.isBusy = !!this.pendingResolves.length;
				});

				worker.on('error', e => console.log(e));

				worker.on('exit', code => {
					if (code !== 0 && code !== 1) {
						console.log(new Error("Worker stopped with exit code " + code));
					}
				});

				this.workers.push(worker);
			}
		}
	}

	async initializeThread(): Promise<void> {
		// @ts-expect-error
		await this.sendMessage('initialize-thread');
	}

	async getMemoryUsage(): Promise<ThreadResponse | null> {
		// @ts-expect-error
		return this.sendMessage('memory-usage');
	}

	async unref(): Promise<void> {
		this.sendMessages = false;

		if (this.unrefTimer) {
			clearTimeout(this.unrefTimer);
			this.unrefTimer = undefined;
		}

		if (this.pendingResolves.length) {
			this.unrefTimer = setTimeout(() => void this.unref(), 100);
			return;
		}

		if (this.workers) {
			for (let i = 0; i < this.workers.length; i++) {
				// @ts-expect-error
				await this.sendMessage('unref', "", this.workerNames ? i : undefined);
				await this.workers[i].terminate();
				this.workers[i].removeAllListeners();
				this.workers[i].unref();
				Tools.unrefProperties(this.workers[i]);
			}

			this.workers = undefined;
		}

		Tools.unrefProperties(this.workerData);
		Tools.unrefProperties(this);
	}

	exit(): void {
		if (this.workers) {
			for (const worker of this.workers) {
				void worker.terminate();
			}
		}
	}

	private postMessage(workerNumber: number, message: string): void {
		this.workerBusy[workerNumber] = true;
		this.workers![workerNumber].postMessage(message);
	}

	loadData?(): WorkerData;
}

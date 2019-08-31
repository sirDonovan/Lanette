import { Worker } from "worker_threads";

export interface IWorker {
	init: (data: any) => Worker;
	unref: () => void;
}

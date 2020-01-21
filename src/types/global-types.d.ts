import { Worker } from "worker_threads";

export interface IWorker {
	init: (data: any) => Worker;
	unref: () => void;
}

export interface IHexColor {
	"White": any;
	"Black": any;
	"Dark Yellow": any;
	"Orange": any;
	"Blue": any;
	"Yellow": any;
	"Light Pink": any;
	"Green": any;
	"Light Blue": any;
	"Red": any;
	"Dark Pink": any;
	"Light Brown": any;
	"Light Purple": any;
	"Pink": any;
	"Light Green": any;
	"Brown": any;
	"Dark Purple": any;
	"Purple": any;
	"Light Gray": any;
	"Dark Brown": any;
}

export type HexColor = keyof IHexColor;

import type { IMessageTypes } from "./client";

export type RoomType = 'battle' | 'chat' | 'html';

export interface IRepeatedMessage {
	interval: number;
	message: string;
	name: string;
	timer: NodeJS.Timer;
	user: string;
}

export interface IRoomMessageOptions {
	dontCheckFilter?: boolean;
	dontMeasure?: boolean;
	dontPrepare?: boolean;
	html?: string;
	type?: IMessageTypes;
	uhtmlName?: string;
	user?: string;
}
import type { IOutgoingMessageTypes } from "./client";

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
	modchatLevel?: string;
	type?: IOutgoingMessageTypes;
	uhtmlName?: string;
	user?: string;
}
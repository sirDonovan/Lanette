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
	announcement?: string;
	dontCheckFilter?: boolean;
	dontMeasure?: boolean;
	dontPrepare?: boolean;
	html?: string;
	modchatLevel?: string;
	notifyId?: string;
	notifyTitle?: string;
	notifyMessage?: string;
	pageId?: string;
	type?: IOutgoingMessageTypes;
	uhtmlName?: string;
	user?: string;
}
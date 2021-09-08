import type { IOutgoingMessageAttributes } from "./client";

export interface IUserRoomData {
	rank: string;
	lastChatMessage?: number;
}

export interface IUserMessageOptions extends IOutgoingMessageAttributes {
	dontCheckFilter?: boolean;
	dontPrepare?: boolean;
	html?: string;
	type?: 'code' | 'pm';
}
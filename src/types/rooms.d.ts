import type { User } from "../users";
import type { IOutgoingMessageAttributes, IOutgoingMessageTypes } from "./client";

export type RoomType = 'battle' | 'chat' | 'html';

export interface IRepeatedMessage {
	interval: number;
	message: string;
	name: string;
	timer: NodeJS.Timer;
	user: string;
}

export interface IRoomMessageOptions extends IOutgoingMessageAttributes {
	dontCheckFilter?: boolean;
	dontMeasure?: boolean;
	dontPrepare?: boolean;
	type?: IOutgoingMessageTypes;
	user?: User;
}
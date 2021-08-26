export interface IUserRoomData {
	rank: string;
	lastChatMessage?: number;
}

export interface IUserMessageOptions {
	dontCheckFilter?: boolean;
	dontPrepare?: boolean;
	html?: string;
	type?: 'code' | 'pm';
}
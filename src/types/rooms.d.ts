export type RoomType = 'battle' | 'chat' | 'html';

export interface IRepeatedMessage {
	interval: number;
	message: string;
	name: string;
	timer: NodeJS.Timer;
	user: string;
}
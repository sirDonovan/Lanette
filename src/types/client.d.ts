import type { Room } from "../rooms";
import type { IFormat } from "./pokemon-showdown";
import type { RoomType } from "./rooms";
import type { ITournamentEndJson, ITournamentUpdateJson } from "./tournaments";

export type IMessageParserFunction = (room: Room, messageType: keyof IClientMessageTypes, messageParts: readonly string[], now: number) =>
	// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
	true | void;

export interface IMessageParserFile {
	/**Return `true` to prevent a message from being parsed by other parsers and Client */
	parseMessage: IMessageParserFunction;
	/**Message parsers with higher priority will run before others, potentially preventing their execution */
	priority: number;
}

export type IMessageTypes = 'command' | 'chat' | 'html' | 'uhtml' | 'pm' | 'pmhtml' | 'pmuhtml' | 'query';
export interface IOutgoingMessage {
	message: string;
	type: IMessageTypes;
	html?: string;
	measure?: boolean;
	query?: string;
	sentTime?: number;
	serverLatency?: number;
	serverProcessingTime?: number;
	text?: string;
	uhtmlName?: string;
	user?: string;
}

export type GroupName = 'locked' | 'muted' | 'regularuser' | 'prizewinner' | 'voice' | 'player' | 'bot' | 'driver' | 'moderator' | 'host' |
	'roomowner' | 'administrator';

export interface ILoginOptions {
	hostname: string | undefined;
	path: string | undefined;
	agent: boolean;
	method: string;
	headers?: Dict<string | number>;
}

export interface IServerConfig {
	host?: string;
	id?: string;
	port?: number;
}

export interface IServerGroup {
	name: string | null;
	ranking: number;
	symbol: string;
	type: "leadership" | "staff" | "normal" | "punishment";
}

export type ServerGroupData = Omit<IServerGroup, "ranking">;

export type QueryResponseType = 'roominfo' | 'rooms' | 'userdetails';

export interface IRoomInfoResponse {
	id: string;
	title: string;
	type: string;
	visibility: string;
	modchat: string | false;
	modjoin: string | boolean;
	auth: Dict<string[]>;
	users: string[];
}

interface IRoomDetails {
	desc?: string;
	title: string;
	subRooms?: string[];
	userCount: number;
}

export interface IRoomsResponse {
	battleCount: number;
	chat: IRoomDetails[];
	official: IRoomDetails[];
	pspl: IRoomDetails[];
	userCount: number;
}

export interface IUserDetailsResponse {
	avatar: string;
	group: string;
	userid: string;
}

export type ChatLogType = 'chat' | 'html' | 'uhtml';

export interface IChatLogEntry {
	log: string;
	type: ChatLogType;

	uhtmlName?: string;
}

export type MessageListener = (timestamp: number) => void;

export interface IClientMessageTypes {
	/**
	 * Global messages
	 */

	/**
	 * Challenge key ID|challenge
	 */
	challstr: string;

	/**
	 * Username|login result
	 */
	updateuser: {
		/** username[@status] */
		usernameText: string;
		/** '1' if logged in */
		readonly loginStatus: string;
	};

	/**
	 * Query type|response
	 */
	queryresponse: {
		readonly type: QueryResponseType;
		/** JSON string */
		readonly response: string;
	};

	/**
	 * Room type
	 */
	init: {
		/** Chat, battle, or HTML */
		readonly type: RoomType;
	};

	/**
	 * Room title
	 */
	title: {
		readonly title: string;
	}

	deinit: null;

	/**
	 * Reason or action
	 */
	noinit: {
		/** joinfailed, nonexistent, namerequired or rename */
		readonly action: string;
		readonly newId: string;
		readonly newTitle: string;
	};

	/**
	 * Groups list
	 */
	customgroups: {
		readonly groups: ServerGroupData[];
	};

	/**
	 * Chat messages
	 */

	/**
	 * User list
	 */
	users: {
		/** usercount,[rank]username[@status],[rank]username[@status], etc. */
		readonly userlist: string;
	};

	/**
	 * Rank+username[@status]
	 */
	join: {
		readonly rank: string;
		readonly usernameText: string;
	};
	j: IClientMessageTypes['join'];
	J: IClientMessageTypes['join'];

	/**
	 * Rank+username[@status]
	 */
	leave: {
		readonly possibleRank: string;
		readonly username: string;
	};
	l: IClientMessageTypes['leave'];
	L: IClientMessageTypes['leave'];

	/**
	 * Rank+username[@status]|old userid
	 */
	name: {
		readonly rank: string;
		readonly usernameText: string;
		readonly oldId: string;
	};
	n: IClientMessageTypes['name'];
	N: IClientMessageTypes['name'];

	/**
	 * Rank+username|message
	 */
	chat: {
		/** Defaults to current time */
		readonly timestamp: number;
		readonly rank: string;
		readonly username: string;
		readonly message: string;
	};
	c: IClientMessageTypes['chat'];

	/**
	 * Timestamp|rank+username|message
	 */
	'c:': IClientMessageTypes['chat'];

	/**
	 * Server timestamp
	 */
	':': {
		readonly timestamp: number;
	};

	/**
	 * Rank+username|message
	 */
	pm: {
		readonly rank: string;
		readonly username: string;
		readonly recipientRank: string;
		readonly recipientUsername: string;
		readonly message: string;
	};

	/**
	 * Plaintext message
	 */
	'': {
		readonly message: string;
	};

	/**
	 * HTML message
	 */
	html: {
		readonly html: string;
	};
	raw: IClientMessageTypes['html'];

	/**
	 * Page HTML
	 */
	pagehtml: {
		readonly html: string;
	};

	/**
	 * Name|HTML message
	 */
	uhtml: {
		readonly name: string;
		readonly html: string;
	};
	uhtmlchange: IClientMessageTypes['uhtml'];

	/**
	 * Message type|(Rest)
	 */
	tournament: {
		readonly type: keyof ITournamentMessageTypes;
	};

	/**
	 * Battle messages
	 */

	/**
	 * Slot|username
	 */
	player: {
		slot: string;
		username: string;
	};

	/**
	 * Slot|size
	 */
	teamsize: {
		slot: string;
		size: number;
	};

	teampreview: null;

	start: null;

	/**
	 * Slot|Species+level|item
	 */
	poke: {
		slot: string;
		details: string;
		item: boolean
	};

	/**
	 * Slot+name|Species+level|hp status
	 */
	switch: {
		pokemon: string;
		details: string;
		hpStatus: [string, string];
	};
	drag: IClientMessageTypes['switch'];

	/**
	 * Slot+name
	 */
	faint: {
		pokemon: string;
	};

	/**
	 * Username of winner
	 */
	win: {
		username: string
	};

	expire: null;
}

export interface ITournamentMessageTypes {
	/**
	 * Format|Generator|Player cap
	 */
	create: {
		readonly format: IFormat;
		readonly generator: string;
		readonly playerCap: number;
	};

	/**
	 * Update JSON
	 */
	update: {
		readonly json: ITournamentUpdateJson;
	};

	updateEnd: null;

	/**
	 * End JSON
	 */
	end: {
		readonly json: ITournamentEndJson;
	};

	forceend: null;

	start: null;

	/**
	 * Username
	 */
	join: {
		readonly username: string;
	};

	/**
	 * Username
	 */
	leave: {
		readonly username: string;
	};

	/**
	 * Username
	 */
	disqualify: ITournamentMessageTypes['leave'];

	/**
	 * UsernameA|UsernameB|Roomid
	 */
	battlestart: {
		readonly usernameA: string;
		readonly usernameB: string;
		readonly roomid: string;
	};

	/**
	 * UsernameA|UsernameB|Result|Score|Recorded|Roomid
	 */
	battleend: {
		readonly usernameA: string;
		readonly usernameB: string;
		readonly result: 'win' | 'loss' | 'draw';
		readonly score: [string, string];
		readonly recorded: 'success' | 'fail';
		readonly roomid: string;
	};
}

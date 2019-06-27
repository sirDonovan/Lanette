import { ITournamentEndJSON, ITournamentUpdateJSON } from "../room-tournament";
import { RoomType } from "../rooms";
import { IFormat } from "../types/in-game-data-types";

export interface IServerGroup {
	name: string | null;
	ranking: number;
	symbol: string;
	type: "leadership" | "staff" | "normal" | "punishment";
}

export type ServerGroupData = Pick<IServerGroup, Exclude<keyof IServerGroup, "ranking">>;

export interface IUserDetailsResponse {
	avatar: string;
	group: string;
	userid: string;
}

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

export interface IClientMessageTypes {
	/**
	 * Challenge key ID|challenge
	 */
	challstr: string;

	/**
	 * Username|login result
	 */
	updateuser: {
		/** username[@status] */
		usernameText: string,
		/** '1' if logged in */
		readonly loginStatus: string,
	};

	/**
	 * Query type|response
	 */
	queryresponse: {
		readonly type: 'roominfo' | 'userdetails',
		/** JSON string */
		readonly response: string,
	};

	/**
	 * Room type
	 */
	init: {
		/** Chat, battle, or HTML */
		readonly type: RoomType,
	};

	deinit: {};

	/**
	 * User list
	 */
	users: {
		/** usercount,[rank]username[@status],[rank]username[@status], etc. */
		readonly userlist: string,
	};

	/**
	 * Groups list
	 */
	customgroups: {
		readonly groups: ServerGroupData[],
	};

	/**
	 * Rank+username[@status]
	 */
	join: {
		readonly rank: string,
		readonly usernameText: string,
	};
	j: IClientMessageTypes['join'];
	J: IClientMessageTypes['join'];

	/**
	 * Rank+username[@status]
	 */
	leave: {
		readonly rank: string,
		readonly usernameText: string,
	};
	l: IClientMessageTypes['leave'];
	L: IClientMessageTypes['leave'];

	/**
	 * Rank+username[@status]|old userid
	 */
	name: {
		readonly rank: string,
		readonly usernameText: string,
		readonly oldId: string,
	};
	n: IClientMessageTypes['name'];
	N: IClientMessageTypes['name'];

	/**
	 * Rank+username|message
	 */
	chat: {
		/** Defaults to current time */
		readonly timestamp: number,
		readonly rank: string,
		readonly username: string,
		readonly message: string,
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
		readonly timestamp: number,
	};

	/**
	 * Rank+username|message
	 */
	pm: {
		readonly rank: string,
		readonly username: string,
		readonly recipient: string,
		readonly message: string,
	};

	/**
	 * Message type|(Rest)
	 */
	tournament: {
		readonly type: keyof ITournamentMessageTypes,
	};

	/**
	 * Plaintext message
	 */
	'': {
		readonly message: string,
	};

	/**
	 * HTML message
	 */
	html: {
		readonly html: string,
	};
	raw: IClientMessageTypes['html'];

	/**
	 * Page HTML
	 */
	pagehtml: {
		readonly html: string,
	};

	/**
	 * Name|HTML message
	 */
	uhtml: {
		readonly name: string,
		readonly html: string,
	};
	uhtmlchange: IClientMessageTypes['uhtml'];
}

export interface ITournamentMessageTypes {
	/**
	 * Format|Generator|Player cap
	 */
	create: {
		readonly format: IFormat,
		readonly generator: string,
		readonly playerCap: number,
	};

	/**
	 * Update JSON
	 */
	update: {
		readonly json: ITournamentUpdateJSON,
	};

	updateEnd: {};

	/**
	 * End JSON
	 */
	end: {
		readonly json: ITournamentEndJSON,
	};

	forceend: {};

	start: {};

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

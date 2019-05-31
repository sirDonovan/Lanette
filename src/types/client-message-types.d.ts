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
		loginStatus: string,
	};

	/**
	 * Query type|response
	 */
	queryresponse: {
		type: 'roominfo' | 'userdetails',
		/** JSON string */
		response: string,
	};

	/**
	 * Room type
	 */
	init: {
		/** Chat, battle, or HTML */
		type: RoomType,
	};

	deinit: null;

	/**
	 * User list
	 */
	users: {
		/** usercount,[rank]username[@status],[rank]username[@status], etc. */
		userlist: string,
	};

	/**
	 * Groups list
	 */
	customgroups: {
		groups: ServerGroupData[],
	};

	/**
	 * Rank+username[@status]
	 */
	join: {
		rank: string,
		usernameText: string,
	};
	j: IClientMessageTypes['join'];
	J: IClientMessageTypes['join'];

	/**
	 * Rank+username[@status]
	 */
	leave: {
		rank: string,
		usernameText: string,
	};
	l: IClientMessageTypes['leave'];
	L: IClientMessageTypes['leave'];

	/**
	 * Rank+username[@status]|old userid
	 */
	name: {
		rank: string,
		usernameText: string,
		oldId: string,
	};
	n: IClientMessageTypes['name'];
	N: IClientMessageTypes['name'];

	/**
	 * Rank+username|message
	 */
	chat: {
		/** Defaults to current time */
		timestamp: number,
		rank: string,
		username: string,
		message: string,
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
		timestamp: number,
	};

	/**
	 * Rank+username|message
	 */
	pm: {
		rank: string,
		username: string,
		recipient: string,
		message: string,
	};

	/**
	 * Message type|(Rest)
	 */
	tournament: {
		type: keyof ITournamentMessageTypes,
	};

	/**
	 * Raw message
	 */
	'': {
		message: string,
	};

	/**
	 * Raw HTML
	 */
	raw: {
		html: string,
	};

	/**
	 * Page HTML
	 */
	pagehtml: {
		html: string,
	};
}

export interface ITournamentMessageTypes {
	/**
	 * Format|Generator|Player cap
	 */
	create: {
		format: IFormat,
		generator: string,
		playerCap: number,
	};

	/**
	 * Update JSON
	 */
	update: {
		json: ITournamentUpdateJSON,
	};

	updateEnd: {};

	/**
	 * End JSON
	 */
	end: {
		json: ITournamentEndJSON,
	};

	forceend: {};

	start: {};

	/**
	 * Username
	 */
	join: {
		username: string;
	};

	/**
	 * Username
	 */
	leave: {
		username: string;
	};

	/**
	 * Username
	 */
	disqualify: ITournamentMessageTypes['leave'];

	/**
	 * UsernameA|UsernameB|Roomid
	 */
	battlestart: {
		usernameA: string;
		usernameB: string;
		roomid: string;
	};

	/**
	 * UsernameA|UsernameB|Result|Score|Recorded|Roomid
	 */
	battleend: {
		usernameA: string;
		usernameB: string;
		result: 'win' | 'loss' | 'draw';
		score: [string, string];
		recorded: 'success' | 'fail';
		roomid: string;
	};
}

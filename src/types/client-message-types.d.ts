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

export interface IClientMessageTypes {
	/**
	 * Challenge key ID|challenge
	 */
	challstr: string;

	/**
	 * Username|login result
	 */
	updateuser: {
		/** Config.username or Guest### if not logged in */
		username: string,
		/** '1' if logged in */
		loginStatus: string,
	};

	/**
	 * Query type|response
	 */
	queryresponse: {
		type: 'userdetails',
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

	/**
	 * User list
	 */
	users: {
		/** usercount,[rank]user1,[rank]user2, etc. */
		userlist: string,
	};

	/**
	 * Groups list
	 */
	customgroups: {
		groups: ServerGroupData[],
	};

	/**
	 * Rank+username
	 */
	join: {
		rank: string,
		username: string,
	};
	j: IClientMessageTypes['join'];
	J: IClientMessageTypes['join'];

	/**
	 * Rank+username
	 */
	leave: {
		rank: string,
		username: string,
	};
	l: IClientMessageTypes['leave'];
	L: IClientMessageTypes['leave'];

	/**
	 * Rank+username|old userid
	 */
	name: {
		rank: string,
		username: string,
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
}

export interface IServerGroup {
	name: string | null;
	ranking: number;
	symbol: string;
	type: "leadership" | "staff" | "normal" | "punishment";
}

export interface IClientMessageTypes {
	/**
	 * Challenge key ID|Challenge
	 */
	challstr: string;

	/**
	 * Username|Login result
	 */
	updateuser: {
		/** Config.username or Guest### if not logged in */
		username: string,
		/** '1' if logged in */
		loginStatus: string,
	};

	/**
	 * Room type
	 */
	init: {
		/** Chat or battle */
		type: string,
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
		groups: Pick<IServerGroup, Exclude<keyof IServerGroup, "ranking">>[],
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
	 * Rank+username|Old userid
	 */
	name: {
		rank: string,
		username: string,
		oldId: string,
	};
	n: IClientMessageTypes['name'];
	N: IClientMessageTypes['name'];
}

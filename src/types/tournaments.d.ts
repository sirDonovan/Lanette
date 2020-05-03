import { Player } from "../room-activity";

interface IBracketNode {
	readonly result: string;
	readonly state: 'available' | 'challenging' | 'inprogress' | 'finished' | 'unavailable';
	readonly team: string;
	readonly children?: IBracketNode[];
}

export interface IBracketData {
	readonly type: string;
	readonly rootNode?: IBracketNode;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	readonly tableHeaders?: {cols: string[]; rows: any[]};
	readonly users?: string[];
}

export interface IBattleData {
	remainingPokemon: Dict<number>;
	slots: Map<Player, string>;
}

export interface IUserHostedTournament {
	approvalStatus: 'changes-requested' | 'approved' | '';
	hostId: string;
	hostName: string;
	reviewer: string;
	startTime: number;
	reviewTimer?: NodeJS.Timer;
	urls: string[];
}

export interface ITournamentUpdateJson {
	/** An object representing the current state of the bracket */
	bracketData: IBracketData;
	/** A list of opponents that can currently challenge you */
	challengeBys: string[];
	/** The name of the opponent that has challenged you */
	challenged: string;
	/** A list of opponents that you can currently challenge */
	challenges: string[];
	/** The name of the opponent that you are challenging */
	challenging: string;
	/** The tournament's custom name or the format being used */
	format: string;
	/** The type of bracket being used by the tournament */
	generator: string;
	/** Whether or not you have joined the tournament */
	isJoined: boolean;
	/** Whether or not the tournament has started */
	isStarted: boolean;
	/** The player cap that was set or 0 if it was removed */
	playerCap: number;
	/** The format being used; sent if a custom name was set */
	teambuilderFormat: string;
}

export interface ITournamentEndJson {
	/** An object representing the final state of the bracket */
	bracketData: IBracketData;
	/** The tournament's custom name or the format that was used */
	format: string;
	/** The type of bracket that was used by the tournament */
	generator: string;
	/** The name(s) of the winner(s) of the tournament */
	results: string[][];
}

export interface ITournamentCreateJson {
	format: string;
	generator: string;
	isStarted?: boolean;
	playerCap?: number;
	teambuilderFormat?: string;
}
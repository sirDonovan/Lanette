import type { Player } from "../room-activity";
import type { ScriptedGame } from "../room-game-scripted";
import type { IFormat } from "./pokemon-showdown";

export type TournamentPlace = 'semifinalist' | 'runnerup' | 'winner';

export type TournamentType = 'elimination' | 'roundrobin';

export interface ITournamentCreateListener {
	format: IFormat;
	game?: ScriptedGame;
	name?: string;
	official?: boolean;
	callback?: () => void;
}

export interface ICreateTournamentOptions {
	format: IFormat;
	cap: number;
	official?: boolean;
	name?: string;
	type?: TournamentType;
}

export interface ITreeRootPlaces<T> {
	winner: T | null;
	runnerup: T | null;
	semifinalists: T[] | null;
}

export interface IScheduledTournament {
	format: string;
	time: number;
	official?: boolean;
}

export interface IOfficialTournament extends IScheduledTournament {
	official: true;
}

export interface ITournamentScheduleDay {
	format: string;
	times: [number, number][];
	invalidFormat?: boolean;
}

export interface ITournamentScheduleMonth {
	days: Dict<ITournamentScheduleDay | undefined>;
}

export interface ITournamentScheduleYear {
	months: Dict<ITournamentScheduleMonth>;
}

export interface ITournamentScheduleWhole {
	years: Dict<ITournamentScheduleYear>;
}

export interface IClientTournamentNode {
	readonly result: string;
	readonly state: 'available' | 'challenging' | 'inprogress' | 'finished' | 'unavailable';
	readonly team: string;
	readonly children?: IClientTournamentNode[];
}

export interface IClientTournamentData {
	readonly type: string;
	readonly rootNode?: IClientTournamentNode;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	readonly tableHeaders?: {cols: string[]; rows: any[]};
	readonly users?: string[];
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
	bracketData: IClientTournamentData;
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
	bracketData: IClientTournamentData;
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

interface ICurrentTournamentBattle {
	readonly playerA: Player;
	readonly playerB: Player;
	readonly roomid: string;
}

export interface ITournamentTimerData {
	cap: number;
	formatid: string;
	startTime: number;
	official?: boolean;
	name?: string;
}

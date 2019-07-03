import { GameDifficulty } from "./types/games";

/**
 * The username used for logging in to PS
 */
export let username = '';

/**
 * The password used for logging in to PS
 *
 * Leave blank if the username is unregistered
 */
export let password = '';

/**
 * The server address used to connect to PS (must end in .psim.us)
 *
 * Leave blank to connect to the main server
 */
export let server = '';

/**
 * The base amount of time (in milliseconds) between connection attempts
 */
export let reconnectTime = 60 * 1000;

/**
 * A list of rooms to join after logging in
 */
export let rooms: string[] = [];

/**
 * The avatar code to use after logging in
 */
export let avatar = '';

/**
 * The character used to denote commands in chat messages
 */
export let commandCharacter = '.';

/**
 * Whether or not users can send messages to other offline users
 */
export let allowMail: boolean = true;

/**
 * Userids of those who should have access to the eval command
 */
export let developers: string[] = [];

/**
 * A list of rooms (roomids) where tournament features are allowed to be used
 */
export let allowTournaments: string[] = [];

/**
 * A list of rooms (roomids) where regular tournaments will award leaderboard points
 */
export let rankedTournaments: string[] = [];

/**
 * A list of rooms (roomids) where custom rule tournaments will award leaderboard points
 */
export let rankedCustomTournaments: string[] = [];

/**
 * A list of rooms (roomids) where tournaments in default 'uncompetitive' formats will not leaderboard points
 */
export let useDefaultUnrankedTournaments: string[] = [];

/**
 * The default player caps to use when creating tournaments
 */
export let defaultTournamentPlayerCaps: Dict<number> = {};

/**
 * A list of rooms (roomids) where scheduled tournaments will use the maximum player cap
 */
export let scheduledTournamentsMaxPlayerCap: string[] = [];

/**
 * A list of rooms (roomids) where information and links about tournament formats will be displayed
 */
export let displayTournamentFormatInfo: string[] = [];

/**
 * A list of rooms (roomids) where scouting in non-random tournaments will not be allowed
 */
export let disallowTournamentScouting: string[] = [];

/**
 * A list of rooms (roomids) where links to non-random tournament battles are not allowed to be posted
 */
export let disallowTournamentBattleLinks: string[] = [];

/**
 * For each room in the object, a list of rooms (roomids) where created tournaments will be advertised
 */
export let tournamentRoomAdvertisements: Dict<string[]> = {};

/**
 * The number of minutes to set for the auto DQ timer in tournaments
 */
export let tournamentAutoDQTimers: Dict<number> = {};

/**
 * The number of minutes to leave signups open before starting tournaments
 */
export let tournamentStartTimers: Dict<number> = {};

/**
 * A list of rooms (roomids) where scripted games are allowed to be played
 */
export let allowScriptedGames: string[] = [];

/**
 * Difficulties for players in scripted games
 */
export let scriptedGameDifficulties: Dict<GameDifficulty> = {};

/**
 * Difficulties for players in user-hosted games
 */
export let userHostedGamePlayerDifficulties: Dict<GameDifficulty> = {};

/**
 * Difficulties for hosts in user-hosted games
 */
export let userHostedGameHostDifficulties: Dict<GameDifficulty> = {};

/**
 * The maximum number of players that can win a user-hosted game in each specified room
 */
export let maxUserHostedGameWinners: Dict<number> = {};

/**
 * The maximum number of users that can be queued to host a game
 */
export let maxQueuedUserHostedGames: Dict<number> = {};

/**
 * A list of rooms (roomids) where messages will not be logged
 */
export let disallowChatLogging: string[] = [];

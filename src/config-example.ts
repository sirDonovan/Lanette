import type { GroupName } from "./client";
import type { GameDifficulty } from "./types/games";

/* eslint-disable prefer-const*/

/**
 * Values in the object will override the values set throughout the config when starting Lanette with `tempConfig.js`
 */
export let tempConfig: typeof Config = {};

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
 * Whether the configured username should always be considered to have the 'trusted' status on PS
 */
export let trustedUser = false;

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
 * Room aliases that can be used with user input
 */
export let roomAliases: Dict<string> = {};

/**
 * The avatar code to use after logging in
 */
export let avatar = '';

/**
 * The character used to denote commands in chat messages
 */
export let commandCharacter = '.';

/**
 * Whether or not PS code should be updated upon hotpatching
 */
export let autoUpdatePS: boolean = false;

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
 * A list of rooms (roomids) where tournaments will only award leaderboard points if manually enabled
 */
export let manualRankedTournaments: string[] = [];

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
 * A list of rooms (roomids) where results of unranked tournaments will be displayed
 */
export let displayUnrankedTournamentResults: string[] = [];

/**
 * A list of rooms (roomids) where scouting in non-random tournaments will not be allowed
 */
export let disallowTournamentScouting: string[] = [];

/**
 * For each room in the object, a list of formats (full name including gen) for which scouting will not be allowed
 */
export let disallowTournamentScoutingFormats: Dict<string[]> = {};

/**
 * A list of rooms (roomids) where modjoin in tournament battles will not be allowed
 */
export let disallowTournamentModjoin: string[] = [];

/**
 * A list of rooms (roomids) where links to non-random tournament battles are not allowed to be posted
 */
export let disallowTournamentBattleLinks: string[] = [];

/**
 * A list of rooms (roomids) where formats on the past tournaments list cannot be queued
 */
export let disallowQueueingPastTournaments: string[] = [];

/**
 * For each room in the object, a list of rooms (roomids) where created tournaments will be advertised
 */
export let tournamentRoomAdvertisements: Dict<string[]> = {};

/**
 * The number of minutes to set for the auto DQ timer in tournaments
 */
export let tournamentAutoDQTimers: Dict<number> = {};

/**
 * A list of rooms (roomids) where tournament caps will be adjusted when signups are halfway over
 */
export let adjustTournamentCaps: string[] = [];

/**
 * The number of minutes to leave signups open before starting tournaments
 */
export let tournamentStartTimers: Dict<number> = {};

/**
 * A list of rooms (roomids) where scores of tournament battles will be tracked
 */
export let trackTournamentBattleScores: string[] = [];

/**
 * For each room in the object, the number of minutes to wait before setting a timer for a random tournament
 */
export let randomTournamentTimers: Dict<number> = {};

/**
 * A list of rooms (roomids) where hosted tournaments go through the approval process
 */
export let allowUserHostedTournaments: string[] = [];

/**
 * For each room in the object and for each action in the room, the minimum rank required
 */
export let userHostedTournamentRanks: Dict<{review: GroupName}> = {};

/**
 * A list of rooms (roomids) where scripted games are allowed to be played
 */
export let allowScriptedGames: string[] = [];

/**
 * A list of rooms (roomids) where games are allowed to be hosted
 */
export let allowUserHostedGames: string[] = [];

/**
 * A list of rooms (roomids) where games cannot be hosted back-to-back
 */
export let disallowRepeatUserHostedGames: string[] = [];

/**
 * The number of games that must be played before a game category can be played again
 */
export let gameCategoryCooldowns: Dict<number> = {};

/**
 * The number of minutes that must pass before starting consecutive scripted or user-hosted games
 */
export let gameCooldownTimers: Dict<number> = {};

/**
 * The number of seconds that must pass before starting consecutive minigames
 */
export let minigameCooldownTimers: Dict<number> = {};

/**
 * The number of minutes that must pass before a scripted or user-hosted game is automatically created
 *
 * Compounds with gameCooldownTimers
 */
export let gameAutoCreateTimers: Dict<number> = {};

/**
 * The number of minutes that must pass before a scripted game is automatically started
 */
export let gameAutoStartTimers: Dict<number> = {};

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
 * The number of minutes that must pass before a user can host another game
 */
export let userHostCooldownTimers: Dict<number> = {};

/**
 * A list of rooms (roomids) where formats on the past games list cannot be created
 */
export let disallowCreatingPastGames: string[] = [];

/**
 * A list of rooms (roomids) where the last user-hosted game cannot be the next scripted game
 */
export let disallowCreatingPreviousUserHostedGame: string[] = [];

/**
 * A list of rooms (roomids) where variants on the past games list cannot be used
 */
export let limitGamesByVariant: string[] = [];

/**
 * A list of rooms (roomids) where modes on the past games list cannot be used
 */
export let limitGamesByMode: string[] = [];

/**
 * A list of rooms (roomids) where categories on the past games list cannot be created before a cooldown
 */
export let limitGamesByCategory: string[] = [];

/**
 * A list of rooms (roomids) where messages will not be logged
 */
export let disallowChatLogging: string[] = [];

/**
 * A link to the server's log viewer
 */
export let serverLogsViewer: string = '';

/**
 * For each room in the object, the length of time in which an awarded bot greeting will last
 */
export let awardedBotGreetingDurations: Dict<number> = {};

/**
 * The username(s) and personal access token(s) to use for various GitHub API endpoints
 */
export let githubApiCredentials: Dict<{token: string; username: string}> = {};

/**
 * For each room in the object, the information for its game catalog gist
 */
export let gameCatalogGists: Dict<{description: string; files: string[]; id: string}> = {};

/* eslint-enable prefer-const*/
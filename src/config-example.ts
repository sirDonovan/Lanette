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
 * Userids of those who should have access to the eval command
 */
export let developers: string[] = [];

/**
 * A list of rooms (roomids) where scripted games are allowed to be played
 */
export let allowScriptedGames: string[] = [];

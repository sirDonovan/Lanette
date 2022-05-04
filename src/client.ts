import fs = require('fs');
import https = require('https');
import path = require('path');
import querystring = require('querystring');
import url = require('url');
import ws = require('ws');

import type { ScriptedGame } from './room-game-scripted';
import type { UserHostedGame } from './room-game-user-hosted';
import type { Room } from './rooms';
import type {
	GroupName, IClientMessageTypes, ILoginOptions, IMessageParserFile, IOutgoingMessage, IRoomInfoResponse, IRoomsResponse,
	IServerConfig, IServerGroup, ITournamentMessageTypes, QueryResponseType, ServerGroupData, IUserDetailsResponse,
	UserDetailsListener, IServerUserSettings
} from './types/client';
import type { ISeparatedCustomRules } from './types/dex';
import type { RoomType } from './types/rooms';
import type { IExtractedBattleId } from './types/tools';
import type { ITournamentEndJson, ITournamentUpdateJson } from './types/tournaments';
import type { User } from './users';

const MAIN_HOST = "sim3.psim.us";
const REPLAY_SERVER_ADDRESS = "replay.pokemonshowdown.com";
const CHALLSTR_TIMEOUT_SECONDS = 15;
const RELOGIN_SECONDS = 60;
const LOGIN_TIMEOUT_SECONDS = 150;
const SERVER_RESTART_CONNECTION_TIME = 10 * 1000;
const REGULAR_MESSAGE_THROTTLE = 600;
const TRUSTED_MESSAGE_THROTTLE = 100;
const SERVER_CHAT_QUEUE_LIMIT = 6;
const STANDARD_MESSAGE_THROTTLE = REGULAR_MESSAGE_THROTTLE * SERVER_CHAT_QUEUE_LIMIT;
const SLOWER_COMMAND_MESSAGE_THROTTLE = STANDARD_MESSAGE_THROTTLE * 2;
const MAX_MESSAGE_SIZE = 100 * 1024;
const BOT_GREETING_COOLDOWN = 6 * 60 * 60 * 1000;
const CONNECTION_CHECK_INTERVAL = 30 * 1000;
const CODE_COMMAND = '!code';
const BOT_MESSAGE_COMMAND = '/botmsg ';
const INVITE_COMMAND = '/invite ';
const HTML_CHAT_COMMAND = '/raw ';
const UHTML_CHAT_COMMAND = '/uhtml ';
const UHTML_CHANGE_CHAT_COMMAND = '/uhtmlchange ';
const ANNOUNCE_CHAT_COMMAND = '/announce ';
const REQUEST_PM_LOG_COMMAND = '/text **PM log requested**: Do you allow staff to see PM logs between ';
const ALLOWED_PM_LOG = '/text PM log approved: Staff may check PM logs between ';
const HANGMAN_START_COMMAND = "/log A game of hangman was started by ";
const HANGMAN_END_COMMAND = "/log (The game of hangman was ended by ";
const TOURNAMENT_AUTOSTART_COMMAND = "/log (The tournament was set to autostart when the player cap is reached by ";
const TOURNAMENT_AUTODQ_COMMAND = "/log (The tournament auto disqualify timer was set to ";
const TOURNAMENT_FORCEPUBLIC_COMMAND = "/log (Tournament public battles were turned ON by ";
const TOURNAMENT_SCOUTING_COMMAND = "/log (The tournament was set to disallow scouting by ";
const TOURNAMENT_MODJOIN_COMMAND = "/log (The tournament was set to disallow modjoin by ";
const TOURNAMENT_FORCE_TIMER_COMMAND = "/log (The timer was turned on for the tournament by ";
const TOURNAMENT_END_COMMAND = "forcibly ended a tournament.)";
const TOURNAMENT_RUNAUTODQ_COMMAND = "All available matches were checked for automatic disqualification.";
const HANGMAN_END_RAW_MESSAGE = "The game of hangman was ended.";
const NOTIFY_USER_MESSAGE = "Sent a notification to ";
const NOTIFY_OFF_USER_MESSAGE = "Closed the notification previously sent to ";
const HIGHLIGHT_HTML_PAGE_MESSAGE = "Sent a highlight to ";
const PRIVATE_HTML_MESSAGE = "Sent private HTML to ";
const CHAT_ERROR_MESSAGE = "/error ";
const USER_NOT_FOUND_MESSAGE = "/error User ";
const UNREGISTERED_USER_MESSAGE = "/error That user is unregistered and cannot be PMed.";
const USER_BLOCKING_PMS_MESSAGE = "/error This user is blocking private messages right now.";
const STAFF_BLOCKING_PMS_MESSAGE = "is too busy to answer private messages right now. Please contact a different staff member.";
const BLOCK_CHALLENGES_COMMAND = "/text You are now blocking all incoming challenge requests.";
const ALREADY_BLOCKING_CHALLENGES_COMMAND = "/error You are already blocking challenges!";
const AVATAR_COMMAND = "/text Avatar changed to:";
const ROLL_COMMAND_HELP = "/text /dice ";

const DATA_COMMANDS: string[] = [
	'rollmove', 'randmove', 'randommove', 'rollpokemon', 'randpoke', 'randompokemon',
	'data', 'pstats', 'stats', 'dex', 'pokedex',
	'dt', 'dt1', 'dt2', 'dt3', 'dt4', 'dt5', 'dt6', 'dt7', 'dt8', 'details',
	'ds', 'ds1', 'ds2', 'ds3', 'ds4', 'ds5', 'ds6', 'ds7', 'ds8', 'dsearch', 'nds', 'dexsearch',
	'ms', 'ms1', 'ms2', 'ms3', 'ms4', 'ms5', 'ms6', 'ms7', 'ms8', 'msearch', 'nms', 'movesearch',
	'is', 'is2', 'is3', 'is4', 'is5', 'is6', 'is7', 'is8', 'itemsearch',
	'as', 'as3', 'as4', 'as5', 'as6', 'as7', 'as8', 'abilitysearch',
];

const DEFAULT_TRAINER_SPRITES: Dict<string> = {
	"1": "lucas",
	"2": "dawn",
	"101": "ethan",
	"102": "lyra",
	"169": "hilbert",
	"170": "hilda",
	"265": "rosa",
	"266": "nate",
};

const NEWLINE = /\n/g;
const CODE_LINEBREAK = /<wbr \/>/g;
const FILTERS_REGEX_N = /\u039d/g;
// eslint-disable-next-line no-misleading-character-class
const FILTERS_REGEX_EMPTY_CHARACTERS = /[\u200b\u007F\u00AD\uDB40\uDC00\uDC21]/g;
const FILTERS_REGEX_O_LEFT = /\u03bf/g;
const FILTERS_REGEX_O_RIGHT = /\u043e/g;
const FILTERS_REGEX_A = /\u0430/g;
const FILTERS_REGEX_E_LEFT = /\u0435/g;
const FILTERS_REGEX_E_RIGHT = /\u039d/g;
const FILTERS_REGEX_FORMATTING = /__|\*\*|``|\[\[|\]\]/g;
const FILTERS_REGEX_EVASION_REPLACEMENT = /[\s-_,.]+/g;

const DEFAULT_GROUP_SYMBOLS: KeyedDict<GroupName, string> = {
	'administrator': '&',
	'roomowner': '#',
	'host': '\u2605',
	'moderator': '@',
	'driver': '%',
	'bot': '*',
	'player': '\u2606',
	'voice': '+',
	'star': '\u2729',
	'prizewinner': '^',
	'regularuser': ' ',
	'muted': '!',
	'locked': '\u203d',
};

const DEFAULT_SERVER_GROUPS: ServerGroupData[] = [
	{
		"symbol": DEFAULT_GROUP_SYMBOLS.administrator,
		"name": "Administrator",
		"type": "leadership",
	},
	{
		"symbol": DEFAULT_GROUP_SYMBOLS.roomowner,
		"name": "Room Owner",
		"type": "leadership",
	},
	{
		"symbol": DEFAULT_GROUP_SYMBOLS.host,
		"name": "Host",
		"type": "leadership",
	},
	{
		"symbol": DEFAULT_GROUP_SYMBOLS.moderator,
		"name": "Moderator",
		"type": "staff",
	},
	{
		"symbol": DEFAULT_GROUP_SYMBOLS.driver,
		"name": "Driver",
		"type": "staff",
	},
	{
		"symbol": DEFAULT_GROUP_SYMBOLS.bot,
		"name": "Bot",
		"type": "normal",
	},
	{
		"symbol": DEFAULT_GROUP_SYMBOLS.player,
		"name": "Player",
		"type": "normal",
	},
	{
		"symbol": DEFAULT_GROUP_SYMBOLS.voice,
		"name": "Voice",
		"type": "normal",
	},
	{
		"symbol": DEFAULT_GROUP_SYMBOLS.star,
		"name": "Star",
		"type": "normal",
	},
	{
		"symbol": DEFAULT_GROUP_SYMBOLS.prizewinner,
		"name": "Prize Winner",
		"type": "normal",
	},
	{
		"symbol": DEFAULT_GROUP_SYMBOLS.regularuser,
		"name": null,
		"type": "normal",
	},
	{
		"symbol": DEFAULT_GROUP_SYMBOLS.muted,
		"name": "Muted",
		"type": "punishment",
	},
	{
		"symbol": DEFAULT_GROUP_SYMBOLS.locked,
		"name": "Locked",
		"type": "punishment",
	},
];

/* eslint-disable max-len */
// Substitution dictionary adapted from https://github.com/ThreeLetters/NoSwearingPlease/blob/master/index.js, licensed under MIT.
const EVASION_DETECTION_SUBSTITUTIONS: Dict<string[]> = {
	a: ["a", "4", "@", "á", "â", "ã", "à", "ᗩ", "A", "ⓐ", "Ⓐ", "α", "͏", "₳", "ä", "Ä", "Ꮧ", "λ", "Δ", "Ḁ", "Ꭺ", "ǟ", "̾", "ａ", "Ａ", "ᴀ", "ɐ", "🅐", "𝐚", "𝐀", "𝘢", "𝘈", "𝙖", "𝘼", "𝒶", "𝓪", "𝓐", "𝕒", "𝔸", "𝔞", "𝔄", "𝖆", "𝕬", "🄰", "🅰", "𝒜", "𝚊", "𝙰", "ꍏ", "а", "𝓪"],
	b: ["b", "8", "ᗷ", "B", "ⓑ", "Ⓑ", "в", "฿", "ḅ", "Ḅ", "Ᏸ", "ϐ", "Ɓ", "ḃ", "Ḃ", "ɮ", "ｂ", "Ｂ", "ʙ", "🅑", "𝐛", "𝐁", "𝘣", "𝘉", "𝙗", "𝘽", "𝒷", "𝓫", "𝓑", "𝕓", "𝔹", "𝔟", "𝔅", "𝖇", "𝕭", "🄱", "🅱", "𝐵", "Ⴆ", "𝚋", "𝙱", "♭", "b"],
	c: ["c", "ç", "ᑕ", "C", "ⓒ", "Ⓒ", "¢", "͏", "₵", "ċ", "Ċ", "ፈ", "ς", "ḉ", "Ḉ", "Ꮯ", "ƈ", "̾", "ｃ", "Ｃ", "ᴄ", "ɔ", "🅒", "𝐜", "𝐂", "𝘤", "𝘊", "𝙘", "𝘾", "𝒸", "𝓬", "𝓒", "𝕔", "ℂ", "𝔠", "ℭ", "𝖈", "𝕮", "🄲", "🅲", "𝒞", "𝚌", "𝙲", "☾", "с"],
	d: ["d", "ᗪ", "D", "ⓓ", "Ⓓ", "∂", "Đ", "ď", "Ď", "Ꮄ", "Ḋ", "Ꭰ", "ɖ", "ｄ", "Ｄ", "ᴅ", "🅓", "𝐝", "𝐃", "𝘥", "𝘋", "𝙙", "𝘿", "𝒹", "𝓭", "𝓓", "𝕕", "​", "𝔡", "𝖉", "𝕯", "🄳", "🅳", "𝒟", "ԃ", "𝚍", "𝙳", "◗", "ⅾ"],
	e: ["e", "3", "é", "ê", "E", "ⓔ", "Ⓔ", "є", "͏", "Ɇ", "ệ", "Ệ", "Ꮛ", "ε", "Σ", "ḕ", "Ḕ", "Ꭼ", "ɛ", "̾", "ｅ", "Ｅ", "ᴇ", "ǝ", "🅔", "𝐞", "𝐄", "𝘦", "𝘌", "𝙚", "𝙀", "ℯ", "𝓮", "𝓔", "𝕖", "𝔻", "𝔢", "𝔇", "𝖊", "𝕰", "🄴", "🅴", "𝑒", "𝐸", "ҽ", "𝚎", "𝙴", "€", "е", "ё", "𝓮"],
	f: ["f", "ᖴ", "F", "ⓕ", "Ⓕ", "₣", "ḟ", "Ḟ", "Ꭶ", "ғ", "ʄ", "ｆ", "Ｆ", "ɟ", "🅕", "𝐟", "𝐅", "𝘧", "𝘍", "𝙛", "𝙁", "𝒻", "𝓯", "𝓕", "𝕗", "𝔼", "𝔣", "𝔈", "𝖋", "𝕱", "🄵", "🅵", "𝐹", "ϝ", "𝚏", "𝙵", "Ϝ", "f"],
	g: ["g", "q", "6", "9", "G", "ⓖ", "Ⓖ", "͏", "₲", "ġ", "Ġ", "Ꮆ", "ϑ", "Ḡ", "ɢ", "̾", "ｇ", "Ｇ", "ƃ", "🅖", "𝐠", "𝐆", "𝘨", "𝘎", "𝙜", "𝙂", "ℊ", "𝓰", "𝓖", "𝕘", "𝔽", "𝔤", "𝔉", "𝖌", "𝕲", "🄶", "🅶", "𝑔", "𝒢", "ɠ", "𝚐", "𝙶", "❡", "ց", "𝙶", "𝓰"],
	h: [
		"h", "ᕼ", "H", "ⓗ", "Ⓗ", "н", "Ⱨ", "ḧ", "Ḧ", "Ꮒ", "ɦ", "ｈ", "Ｈ", "ʜ", "ɥ", "🅗", "𝐡", "𝐇", "𝘩", "𝘏", "𝙝", "𝙃", "𝒽", "𝓱", "𝓗", "𝕙", "𝔾", "𝔥", "𝔊", "𝖍", "𝕳", "🄷", "🅷", "𝐻", "ԋ", "𝚑", "𝙷", "♄", "h",
	],
	i: ["i", "!", "l", "1", "í", "I", "ⓘ", "Ⓘ", "ι", "͏", "ł", "ï", "Ï", "Ꭵ", "ḭ", "Ḭ", "ɨ", "̾", "ｉ", "Ｉ", "ɪ", "ı", "🅘", "𝐢", "𝐈", "𝘪", "𝘐", "𝙞", "𝙄", "𝒾", "𝓲", "𝓘", "𝕚", "ℍ", "𝔦", "ℌ", "𝖎", "𝕴", "🄸", "🅸", "𝐼", "𝚒", "𝙸", "♗", "і", "¡", "|", "𝓲"],
	j: ["j", "ᒍ", "J", "ⓙ", "Ⓙ", "נ", "Ꮰ", "ϳ", "ʝ", "ｊ", "Ｊ", "ᴊ", "ɾ", "🅙", "𝐣", "𝐉", "𝘫", "𝘑", "𝙟", "𝙅", "𝒿", "𝓳", "𝓙", "𝕛", "​", "𝔧", "𝖏", "𝕵", "🄹", "🅹", "𝒥", "𝚓", "𝙹", "♪", "ј"],
	k: ["k", "K", "ⓚ", "Ⓚ", "к", "͏", "₭", "ḳ", "Ḳ", "Ꮶ", "κ", "Ƙ", "ӄ", "̾", "ｋ", "Ｋ", "ᴋ", "ʞ", "🅚", "𝐤", "𝐊", "𝘬", "𝘒", "𝙠", "𝙆", "𝓀", "𝓴", "𝓚", "𝕜", "𝕀", "𝔨", "ℑ", "𝖐", "𝕶", "🄺", "🅺", "𝒦", "ƙ", "𝚔", "𝙺", "ϰ", "k", "𝓴"],
	l: ["l", "i", "1", "/", "|", "ᒪ", "L", "ⓛ", "Ⓛ", "ℓ", "Ⱡ", "ŀ", "Ŀ", "Ꮭ", "Ḷ", "Ꮮ", "ʟ", "ｌ", "Ｌ", "🅛", "𝐥", "𝐋", "𝘭", "𝘓", "𝙡", "𝙇", "𝓁", "𝓵", "𝓛", "𝕝", "𝕁", "𝔩", "​", "𝖑", "𝕷", "🄻", "🅻", "𝐿", "ʅ", "𝚕", "𝙻", "↳", "ⅼ"],
	m: [
		"m", "ᗰ", "M", "ⓜ", "Ⓜ", "м", "͏", "₥", "ṃ", "Ṃ", "Ꮇ", "ϻ", "Μ", "ṁ", "Ṁ", "ʍ", "̾", "ｍ", "Ｍ", "ᴍ", "ɯ", "🅜", "𝐦", "𝐌", "𝘮", "𝘔", "𝙢", "𝙈", "𝓂", "𝓶", "𝓜", "𝕞", "𝕂", "𝔪", "𝔍", "𝖒", "𝕸", "🄼", "🅼", "𝑀", "ɱ", "𝚖", "𝙼", "♔", "ⅿ",
	],
	n: ["n", "ñ", "ᑎ", "N", "ⓝ", "Ⓝ", "и", "₦", "ń", "Ń", "Ꮑ", "π", "∏", "Ṇ", "ռ", "ｎ", "Ｎ", "ɴ", "🅝", "𝐧", "𝐍", "𝘯", "𝘕", "𝙣", "𝙉", "𝓃", "𝓷", "𝓝", "𝕟", "𝕃", "𝔫", "𝔎", "𝖓", "𝕹", "🄽", "🅽", "𝒩", "ɳ", "𝚗", "𝙽", "♫", "ո", "η", "𝙽", "ƞ", "𝓷"],
	o: ["o", "0", "ó", "ô", "õ", "ú", "O", "ⓞ", "Ⓞ", "σ", "͏", "Ø", "ö", "Ö", "Ꭷ", "Θ", "ṏ", "Ṏ", "Ꮎ", "օ", "̾", "ｏ", "Ｏ", "ᴏ", "🅞", "𝐨", "𝐎", "𝘰", "𝘖", "𝙤", "𝙊", "ℴ", "𝓸", "𝓞", "𝕠", "𝕄", "𝔬", "𝔏", "𝖔", "𝕺", "🄾", "🅾", "𝑜", "𝒪", "𝚘", "𝙾", "⊙", "ο"],
	p: ["p", "ᑭ", "P", "ⓟ", "Ⓟ", "ρ", "₱", "ṗ", "Ṗ", "Ꭾ", "Ƥ", "Ꮲ", "ք", "ｐ", "Ｐ", "ᴘ", "🅟", "𝐩", "𝐏", "𝘱", "𝘗", "𝙥", "𝙋", "𝓅", "𝓹", "𝓟", "𝕡", "ℕ", "𝔭", "𝔐", "𝖕", "𝕻", "🄿", "🅿", "𝒫", "𝚙", "𝙿", "р"],
	q: [
		"q", "ᑫ", "Q", "ⓠ", "Ⓠ", "͏", "Ꭴ", "φ", "Ⴓ", "զ", "̾", "ｑ", "Ｑ", "ϙ", "ǫ", "🅠", "𝐪", "𝐐", "𝘲", "𝘘", "𝙦", "𝙌", "𝓆", "𝓺", "𝓠", "𝕢", "​", "𝔮", "𝔑", "𝖖", "𝕼", "🅀", "🆀", "𝒬", "𝚚", "𝚀", "☭", "ԛ",
	],
	r: ["r", "ᖇ", "R", "ⓡ", "Ⓡ", "я", "Ɽ", "ŕ", "Ŕ", "Ꮢ", "г", "Γ", "ṙ", "Ṙ", "ʀ", "ｒ", "Ｒ", "ɹ", "🅡", "𝐫", "𝐑", "𝘳", "𝘙", "𝙧", "𝙍", "𝓇", "𝓻", "𝓡", "𝕣", "𝕆", "𝔯", "𝔒", "𝖗", "𝕽", "🅁", "🆁", "𝑅", "ɾ", "𝚛", "𝚁", "☈", "r", "𝚁", "𝓻"],
	s: ["s", "5", "ᔕ", "S", "ⓢ", "Ⓢ", "ѕ", "͏", "₴", "ṩ", "Ṩ", "Ꮥ", "Ѕ", "Ṡ", "ֆ", "̾", "ｓ", "Ｓ", "ꜱ", "🅢", "𝐬", "𝐒", "𝘴", "𝘚", "𝙨", "𝙎", "𝓈", "𝓼", "𝓢", "𝕤", "ℙ", "𝔰", "𝔓", "𝖘", "𝕾", "🅂", "🆂", "𝒮", "ʂ", "𝚜", "𝚂", "ѕ", "𝓼"],
	t: ["t", "+", "T", "ⓣ", "Ⓣ", "т", "₮", "ẗ", "Ṯ", "Ꮦ", "τ", "Ƭ", "Ꮖ", "ȶ", "ｔ", "Ｔ", "ᴛ", "ʇ", "🅣", "𝐭", "𝐓", "𝘵", "𝘛", "𝙩", "𝙏", "𝓉", "𝓽", "𝓣", "𝕥", "​", "𝔱", "𝔔", "𝖙", "𝕿", "🅃", "🆃", "𝒯", "ƚ", "𝚝", "𝚃", "☂", "t", "𝓽"],
	u: ["u", "ú", "ü", "ᑌ", "U", "ⓤ", "Ⓤ", "υ", "͏", "Ʉ", "Ü", "Ꮼ", "Ʊ", "ṳ", "Ṳ", "ʊ", "̾", "ｕ", "Ｕ", "ᴜ", "🅤", "𝐮", "𝐔", "𝘶", "𝘜", "𝙪", "𝙐", "𝓊", "𝓾", "𝓤", "𝕦", "ℚ", "𝔲", "ℜ", "𝖚", "𝖀", "🅄", "🆄", "𝒰", "𝚞", "𝚄", "☋", "ս"],
	v: ["v", "ᐯ", "V", "ⓥ", "Ⓥ", "ν", "ṿ", "Ṿ", "Ꮙ", "Ʋ", "Ṽ", "ʋ", "ｖ", "Ｖ", "ᴠ", "ʌ", "🅥", "𝐯", "𝐕", "𝘷", "𝘝", "𝙫", "𝙑", "𝓋", "𝓿", "𝓥", "𝕧", "​", "𝔳", "𝖛", "𝖁", "🅅", "🆅", "𝒱", "𝚟", "𝚅", "✓", "ⅴ"],
	w: ["w", "ᗯ", "W", "ⓦ", "Ⓦ", "ω", "͏", "₩", "ẅ", "Ẅ", "Ꮗ", "ш", "Ш", "ẇ", "Ẇ", "Ꮃ", "ա", "̾", "ｗ", "Ｗ", "ᴡ", "ʍ", "🅦", "𝐰", "𝐖", "𝘸", "𝘞", "𝙬", "𝙒", "𝓌", "𝔀", "𝓦", "𝕨", "ℝ", "𝔴", "𝔖", "𝖜", "𝖂", "🅆", "🆆", "𝒲", "ɯ", "𝚠", "𝚆", "ԝ"],
	x: ["x", "᙭", "X", "ⓧ", "Ⓧ", "χ", "Ӿ", "ẍ", "Ẍ", "ጀ", "ϰ", "Ж", "х", "Ӽ", "ｘ", "Ｘ", "🅧", "𝐱", "𝐗", "𝘹", "𝘟", "𝙭", "𝙓", "𝓍", "𝔁", "𝓧", "𝕩", "​", "𝔵", "𝔗", "𝖝", "𝖃", "🅇", "🆇", "𝒳", "𝚡", "𝚇", "⌘", "х"],
	y: [
		"y", "Y", "ⓨ", "Ⓨ", "у", "͏", "Ɏ", "ÿ", "Ÿ", "Ꭹ", "ψ", "Ψ", "ẏ", "Ẏ", "Ꮍ", "ч", "ʏ", "̾", "ｙ", "Ｙ", "ʎ", "🅨", "𝐲", "𝐘", "𝘺", "𝘠", "𝙮", "𝙔", "𝓎", "𝔂", "𝓨", "𝕪", "𝕊", "𝔶", "𝔘", "𝖞", "𝖄", "🅈", "🆈", "𝒴", "ყ", "𝚢", "𝚈", "☿", "у",
	],
	z: ["z", "ᘔ", "Z", "ⓩ", "Ⓩ", "Ⱬ", "ẓ", "Ẓ", "ፚ", "Ꮓ", "ʐ", "ｚ", "Ｚ", "ᴢ", "🅩", "𝐳", "𝐙", "𝘻", "𝘡", "𝙯", "𝙕", "𝓏", "𝔃", "𝓩", "𝕫", "𝕋", "𝔷", "𝔙", "𝖟", "𝖅", "🅉", "🆉", "𝒵", "ȥ", "𝚣", "𝚉", "☡", "z", "𝔃"],
};
/* eslint-enable */
const EVASION_DETECTION_SUB_STRINGS: Dict<string> = {};

for (const letter in EVASION_DETECTION_SUBSTITUTIONS) {
	EVASION_DETECTION_SUB_STRINGS[letter] = `[${EVASION_DETECTION_SUBSTITUTIONS[letter].join('')}]`;
}

function constructEvasionRegex(str: string): RegExp {
	const buf = "\\b" +
		[...str].map(letter => (EVASION_DETECTION_SUB_STRINGS[letter] || letter) + '+').join('\\.?') +
		"\\b";
	return new RegExp(buf, 'iu');
}

function constructBannedWordRegex(bannedWords: string[]): RegExp {
	return new RegExp('(?:\\b|(?!\\w))(?:' + bannedWords.join('|') + ')(?:\\b|\\B(?!\\w))', 'i');
}

let openListener: (() => void) | null;
let messageListener: ((event: ws.MessageEvent) => void) | null;
let errorListener: ((event: ws.ErrorEvent) => void) | null;
let closeListener: ((event: ws.CloseEvent) => void) | null;
let pongListener: (() => void) | null;

export class Client {
	defaultMessageRoom: string = 'lobby';

	private battleFilterRegularExpressions: RegExp[] | null = null;
	private botGreetingCooldowns: Dict<number> = {};
	private challstr: string = '';
	private challstrTimeout: NodeJS.Timer | undefined = undefined;
	private chatFilterRegularExpressions: RegExp[] | null = null;
	private configBannedWordsRegex: RegExp | null = null;
	private connectionAttempts: number = 0;
	private connectionAttemptTime: number = Config.connectionAttemptTime || 60 * 1000;
	private connectionTimeout: NodeJS.Timer | undefined = undefined;
	private evasionFilterRegularExpressions: RegExp[] | null = null;
	/**Maps group name to symbol */
	private groupSymbols: KeyedDict<GroupName, string> = DEFAULT_GROUP_SYMBOLS;
	private incomingMessageQueue: {event: ws.MessageEvent, timestamp: number}[] = [];
	private lastMeasuredMessage: IOutgoingMessage | null = null;
	private lastSendTimeoutAfterMeasure: number = 0;
	private lastOutgoingMessage: IOutgoingMessage | null = null;
	private lastProcessingTimeCheck: number = 0;
	private loggedIn: boolean = false;
	private loginServerHostname: string = '';
	private loginServerPath: string = '';
	private loginTimeout: NodeJS.Timer | undefined = undefined;
	private messageParsers: IMessageParserFile[] = [];
	private messageParsersExist: boolean = false;
	private outgoingMessageQueue: IOutgoingMessage[] = [];
	private outgoingMessageMeasurements: number[] = [];
	private outgoingMessageMeasurementsInfo: string[] = [];
	private pauseIncomingMessages: boolean = true;
	private pauseOutgoingMessages: boolean = false;
	private pingWsAlive: boolean = true;
	private publicChatRooms: string[] = [];
	private reconnectRoomMessages: Dict<string[]> = {};
	private reloadInProgress: boolean = false;
	private replayServerAddress: string = Config.replayServer || REPLAY_SERVER_ADDRESS;
	private retryLoginTimeout: NodeJS.Timer | undefined = undefined;
	private roomsToRejoin: string[] = [];
	private sendTimeout: NodeJS.Timer | true | undefined = undefined;
	private sendTimeoutDuration: number = 0;
	private server: string = Config.server || Tools.mainServer;
	private serverGroupsResponse: ServerGroupData[] = DEFAULT_SERVER_GROUPS;
	/**Maps symbol to group info */
	private serverGroups: Dict<IServerGroup> = {};
	private serverId: string = 'showdown';
	private serverPingTimeout: NodeJS.Timer | null = null;
	private serverTimeOffset: number = 0;
	private webSocket: import('ws') | null = null;

	private chatQueueSendThrottle!: number;
	private sendThrottle!: number;

	constructor() {
		openListener = () => this.onConnect();
		messageListener = (event: ws.MessageEvent) => this.onMessage(event, Date.now());
		errorListener = (event: ws.ErrorEvent) => this.onConnectionError(event);
		closeListener = (event: ws.CloseEvent) => this.onConnectionClose(event);

		this.setSendThrottle(Config.trustedUser ? TRUSTED_MESSAGE_THROTTLE : REGULAR_MESSAGE_THROTTLE);

		if (this.server.startsWith('https://')) {
			this.server = this.server.substr(8);
		} else if (this.server.startsWith('http://')) {
			this.server = this.server.substr(7);
		}
		if (this.server.endsWith('/')) this.server = this.server.substr(0, this.server.length - 1);

		this.parseServerGroups();
		this.updateConfigSettings();

		const messageParsersDir = path.join(Tools.buildFolder, 'message-parsers');
		const privateMessageParsersDir = path.join(messageParsersDir, 'private');

		this.loadMessageParsersDirectory(messageParsersDir);
		this.loadMessageParsersDirectory(privateMessageParsersDir, true);

		this.messageParsers.sort((a, b) => b.priority - a.priority);
		this.messageParsersExist = this.messageParsers.length > 0;
	}

	/**Maps group name to symbol */
	getGroupSymbols(): DeepImmutable<KeyedDict<GroupName, string>> {
		return this.groupSymbols;
	}

	/**Maps symbol to group info */
	getServerGroups(): DeepImmutable<Dict<IServerGroup>> {
		return this.serverGroups;
	}

	getServerId(): string {
		return this.serverId;
	}

	getHtmlChatCommand(): string {
		return HTML_CHAT_COMMAND;
	}

	getUhtmlChatCommand(): string {
		return UHTML_CHAT_COMMAND;
	}

	getUhtmlChangeChatCommand(): string {
		return UHTML_CHANGE_CHAT_COMMAND;
	}

	getLastOutgoingMessage(): DeepImmutable<IOutgoingMessage> | null {
		return this.lastOutgoingMessage;
	}

	getPublicRooms(): readonly string[] {
		return this.publicChatRooms;
	}

	getServer(): string {
		return this.server;
	}

	getReplayServerAddress(): string {
		return this.replayServerAddress;
	}

	getOutgoingMessageQueue(): readonly DeepImmutable<IOutgoingMessage>[] {
		return this.outgoingMessageQueue;
	}

	getUserAttributionHtml(text: string): string {
		return '<div style="float:right;color:#888;font-size:8pt">[' + text + ']</div><div style="clear:both"></div>';
	}

	getListenerHtml(html: string, noAttribution?: boolean): string {
		html = '<div class="infobox">' + html;
		if (!noAttribution && Users.self.globalRank !== this.groupSymbols.bot) {
			html += this.getUserAttributionHtml(Users.self.name);
		}
		html += '</div>';

		return Tools.unescapeHTML(html);
	}

	getListenerUhtml(html: string, noAttribution?: boolean): string {
		if (!noAttribution && Users.self.globalRank !== this.groupSymbols.bot) {
			html += this.getUserAttributionHtml(Users.self.name);
		}

		return Tools.unescapeHTML(html);
	}

	getCodeListenerHtml(code: string): string {
		if (code.length < 80 && !code.includes('\n') && !code.includes('```')) return code;
		return '<div class="infobox"><details class="readmore code" style="white-space: pre-wrap; display: table; tab-size: 3">' +
			code.replace(NEWLINE, "<br />") + '</details></div>';
	}

	getCommandButton(command: string, label: string, disabled?: boolean, buttonStyle?: string): string {
		return '<button class="button' + (disabled ? " disabled" : "") + '"' + (disabled ? " disabled" : "") +
			(buttonStyle ? ' style="' + buttonStyle + '"' : '') + 'name="send" value="' + command + '">' + label + '</button>';
	}

	getMsgRoomButton(room: Room, message: string, label: string, disabled?: boolean, buttonStyle?: string): string {
		return '<button class="button' + (disabled ? " disabled" : "") + '"' + (disabled ? " disabled" : "") +
			(buttonStyle ? ' style="' + buttonStyle + '"' : '') + 'name="send" value="/msg ' + Users.self.id + ', ' + '/msgroom ' +
			room.id + ', ' + message + '">' + label + '</button>';
	}

	getPmUserButton(user: User, message: string, label: string, disabled?: boolean, buttonStyle?: string): string {
		return '<button class="button' + (disabled ? " disabled" : "") + '"' + (disabled ? " disabled" : "") +
			(buttonStyle ? ' style="' + buttonStyle + '"' : '') + ' name="send" value="/msg ' + user.id + ', ' + message + '">' +
			label + '</button>';
	}

	getPmSelfButton(message: string, label: string, disabled?: boolean, buttonStyle?: string): string {
		return this.getPmUserButton(Users.self, message, label, disabled, buttonStyle);
	}

	getQuietPmButton(room: Room, message: string, label: string, disabled?: boolean, buttonStyle?: string): string {
		const roomData = Users.self.rooms.get(room);
		if (!roomData || (roomData.rank !== this.groupSymbols.bot && roomData.rank !== this.groupSymbols.roomowner)) {
			return this.getPmSelfButton(message, label, disabled, buttonStyle);
		}

		return this.getPmUserButton(Users.self, "/msgroom " + room.id + ", " + BOT_MESSAGE_COMMAND + Users.self.id + ", " + message,
			label, disabled, buttonStyle);
	}

	isDataRollCommand(message: string): boolean {
		return DATA_COMMANDS.includes(message.substr(1).split(" ")[0]);
	}

	isDataCommandError(error: string): boolean {
		return error.startsWith("You can't ") || error.endsWith(' could not be found in any of the search categories.') ||
			error.startsWith('A Pok&eacute;mon cannot ') || error.startsWith('A search cannot ') ||
			error.startsWith('No more than ') || error.startsWith('No value given to compare with ') ||
			error.endsWith(' is not a recognized egg group.') || error.endsWith(' is not a recognized stat.') ||
			error.endsWith(' cannot have alternative parameters') || error.endsWith(' did not contain a valid stat') ||
			error.endsWith(" cannot be broadcast.") || error.endsWith(" is a status move and can't be used with 'resists'.") ||
			error.endsWith(" is a status move and can't be used with 'weak'.") ||
			error.endsWith(" is not a recognized type or move.") || error.startsWith("You cannot ") ||
			error.startsWith("Invalid stat range for ") || error.startsWith("Invalid property range for ") ||
			error.endsWith(" isn't a valid move target.") || error.endsWith(" did not contain a valid property.") ||
			error.startsWith("A Pok\u00e9mon learnset cannot ") || error.startsWith("A search should not ") ||
			error.endsWith("not recognized.") || error.startsWith("Priority cannot ") ||
			error.startsWith("The generation must be between ") || error.endsWith("Try a more specific search.") ||
			error.startsWith("Only specify ") || error.startsWith("No items ") || error.startsWith("No berries ") ||
			error.startsWith('The search included ');
	}

	isHangmanCommandError(error: string): boolean {
		return error.startsWith("Phrase must be less than ") || error.startsWith("Each word in the phrase must be less than ") ||
			error.startsWith("Hint too long") || error.startsWith("Enter a valid word") ||
			error.startsWith("You are not allowed to use filtered words") || error.startsWith("Hangman is disabled for this room");
	}

	/**Returns the description of the filter triggered by the message, if any */
	checkFilters(message: string, room?: Room): string | undefined {
		if (room) {
			if (room.configBannedWords && room.configBannedWords.length) {
				if (!room.configBannedWordsRegex) {
					room.configBannedWordsRegex = constructBannedWordRegex(room.configBannedWords);
				}
				if (message.match(room.configBannedWordsRegex)) return "config room banned words";
			}

			if (room.serverBannedWords && room.serverBannedWords.length) {
				if (!room.serverBannedWordsRegex) {
					room.serverBannedWordsRegex = constructBannedWordRegex(room.serverBannedWords);
				}
				if (message.match(room.serverBannedWordsRegex)) return "server room banned words";
			}
		}

		let lowerCase = message
			.replace(FILTERS_REGEX_N, 'N').toLowerCase()
			.replace(FILTERS_REGEX_EMPTY_CHARACTERS, '')
			.replace(FILTERS_REGEX_O_LEFT, 'o')
			.replace(FILTERS_REGEX_O_RIGHT, 'o')
			.replace(FILTERS_REGEX_A, 'a')
			.replace(FILTERS_REGEX_E_LEFT, 'e')
			.replace(FILTERS_REGEX_E_RIGHT, 'e');

		lowerCase = lowerCase.replace(FILTERS_REGEX_FORMATTING, '');

		if (this.battleFilterRegularExpressions && room && room.type === 'battle') {
			for (const expression of this.battleFilterRegularExpressions) {
				if (lowerCase.match(expression)) return "battle filter";
			}
		}

		if (this.chatFilterRegularExpressions) {
			for (const expression of this.chatFilterRegularExpressions) {
				if (lowerCase.match(expression)) return "chat filter";
			}
		}

		if (this.evasionFilterRegularExpressions) {
			const evasionLowerCase = lowerCase.normalize('NFKC').replace(FILTERS_REGEX_EVASION_REPLACEMENT, '.');
			for (const expression of this.evasionFilterRegularExpressions) {
				if (evasionLowerCase.match(expression)) return "evasion filter";
			}
		}

		if (this.configBannedWordsRegex && message.match(this.configBannedWordsRegex)) return "config banned words";
	}

	extractBattleId(source: string): IExtractedBattleId | null {
		return Tools.extractBattleId(source, this.replayServerAddress, this.server, this.serverId);
	}

	joinRoom(roomid: string): void {
		this.send({
			message: '|/join ' + roomid,
			roomid,
			type: 'join-room',
			measure: true,
		});
	}

	getRoomInfo(room: Room): void {
		this.send({
			message: '|/cmd roominfo ' + room.id,
			roomid: room.id,
			type: 'query-roominfo',
			measure: true,
		});
	}

	getUserDetails(user: User, listener?: UserDetailsListener): void {
		user.userDetailsListener = listener;

		this.send({
			message: '|/cmd userdetails ' + user.id,
			type: 'query-userdetails',
			userid: user.id,
			measure: true,
		});
	}

	exceedsMessageSizeLimit(message: string): boolean {
		return message.length >= MAX_MESSAGE_SIZE;
	}

	send(outgoingMessage: IOutgoingMessage): void {
		if (!this.webSocket) return;

		if (!outgoingMessage.message) throw new Error("Message is empty");

		if (this.exceedsMessageSizeLimit(outgoingMessage.message)) {
			throw new Error("Message exceeds server size limit of " + (MAX_MESSAGE_SIZE / 1024) + "KB: " + outgoingMessage.message);
		}

		if (this.sendTimeout || this.pauseOutgoingMessages) {
			this.outgoingMessageQueue.push(outgoingMessage);
			return;
		}

		let room: Room | undefined;
		if (outgoingMessage.roomid && outgoingMessage.type !== 'join-room' && outgoingMessage.type !== 'create-groupchat') {
			room = Rooms.get(outgoingMessage.roomid);
			if (!room) return;

			if (room.type === 'chat' && !room.serverBannedWords && outgoingMessage.type !== 'leave-room' &&
				outgoingMessage.type !== 'banword-list') {
				room.serverBannedWords = [];

				this.send({
					message: room.id + '|/banword list',
					roomid: room.id,
					type: 'banword-list',
					measure: true,
				});

				this.outgoingMessageQueue.push(outgoingMessage);
				return;
			}
		}

		if (outgoingMessage.userid) {
			const user = Users.get(outgoingMessage.userid);
			if (!user || user.locked || (room && !room.getTargetUser(user))) return;
		}

		if (outgoingMessage.filterSend && !outgoingMessage.filterSend()) {
			return;
		}

		this.sendTimeout = true;

		if (outgoingMessage.measure) outgoingMessage.sentTime = Date.now();
		this.lastOutgoingMessage = outgoingMessage;

		this.webSocket.send(outgoingMessage.message, () => {
			if (this.sendTimeout === true) {
				this.startSendTimeout(outgoingMessage.slowerCommand ? SLOWER_COMMAND_MESSAGE_THROTTLE : STANDARD_MESSAGE_THROTTLE);
			}
		});
	}

	updateConfigSettings(): void {
		if (Config.bannedWords && Config.bannedWords.length) {
			this.configBannedWordsRegex = constructBannedWordRegex(Config.bannedWords);
		} else {
			this.configBannedWordsRegex = null;
		}
	}

	getSendThrottle(): number {
		return this.sendThrottle;
	}

	private setSendThrottle(throttle: number): void {
		this.sendThrottle = throttle;
		this.chatQueueSendThrottle = throttle * SERVER_CHAT_QUEUE_LIMIT;
	}

	private loadMessageParsersDirectory(directory: string, optional?: boolean): void {
		let messageParserFiles: string[] = [];
		try {
			messageParserFiles = fs.readdirSync(directory);
		} catch (e) {
			if ((e as NodeJS.ErrnoException).code === 'ENOENT' && optional) return;
			throw e;
		}

		for (const fileName of messageParserFiles) {
			if (!fileName.endsWith('.js') || fileName === 'example.js') continue;
			const filePath = path.join(directory, fileName);
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const messageParser = require(filePath) as IMessageParserFile;
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (!messageParser.parseMessage) throw new Error("No parseMessage function exported from " + filePath);

			if (!messageParser.priority) messageParser.priority = 0;
			this.messageParsers.push(messageParser);
		}
	}

	private setClientListeners(): void {
		if (!this.webSocket) return;

		this.webSocket.addEventListener('open', openListener!);
		this.webSocket.addEventListener('message', messageListener!);
		this.webSocket.addEventListener('error', errorListener!);
		this.webSocket.addEventListener('close', closeListener!);
	}

	private removeClientListeners(previousClient?: boolean): void {
		if (!this.webSocket) return;

		if (openListener) {
			this.webSocket.removeEventListener('open', openListener);
			if (previousClient) openListener = null;
		}

		if (messageListener) {
			this.webSocket.removeEventListener('message', messageListener);
			if (previousClient) messageListener = null;
		}

		if (errorListener) {
			this.webSocket.removeEventListener('error', errorListener);
			if (previousClient) errorListener = null;
		}

		if (closeListener) {
			this.webSocket.removeEventListener('close', closeListener);
			if (previousClient) closeListener = null;
		}

		if (pongListener) {
			this.webSocket.off('pong', pongListener);
			if (previousClient) pongListener = null;
		}

		if (this.serverPingTimeout) {
			clearTimeout(this.serverPingTimeout);
			// @ts-expect-error
			this.serverPingTimeout = undefined;
		}
	}

	private pingServer(): void {
		if (!this.webSocket || this.reloadInProgress) return;

		if (!this.pingWsAlive) {
			this.pingWsAlive = true;
			this.prepareReconnect();
			return;
		}

		if (pongListener) {
			this.webSocket.off('pong', pongListener);
		}

		pongListener = () => {
			this.pingWsAlive = true;
		};

		this.pingWsAlive = false;
		this.webSocket.once('pong', pongListener);
		this.webSocket.ping('', undefined, () => {
			if (this.serverPingTimeout) clearTimeout(this.serverPingTimeout);
			this.serverPingTimeout = setTimeout(() => this.pingServer(), CONNECTION_CHECK_INTERVAL + 1000);
		});
	}

	private beforeReload(): void {
		this.reloadInProgress = true;
		this.pauseIncomingMessages = true;
	}

	/* eslint-disable @typescript-eslint/no-unnecessary-condition */
	private onReload(previous: Client): void {
		if (previous.challstrTimeout) clearTimeout(previous.challstrTimeout);
		if (previous.serverPingTimeout) clearTimeout(previous.serverPingTimeout);

		if (previous.lastSendTimeoutAfterMeasure) this.lastSendTimeoutAfterMeasure = previous.lastSendTimeoutAfterMeasure;
		if (previous.lastProcessingTimeCheck) this.lastProcessingTimeCheck = previous.lastProcessingTimeCheck;
		if (previous.lastOutgoingMessage) this.lastOutgoingMessage = Object.assign({}, previous.lastOutgoingMessage);
		if (previous.sendTimeoutDuration) this.sendTimeoutDuration = previous.sendTimeoutDuration;

		if (previous.outgoingMessageQueue) this.outgoingMessageQueue = previous.outgoingMessageQueue.slice();
		if (previous.outgoingMessageMeasurements) this.outgoingMessageMeasurements = previous.outgoingMessageMeasurements.slice();
		if (previous.outgoingMessageMeasurementsInfo) {
			this.outgoingMessageMeasurementsInfo = previous.outgoingMessageMeasurementsInfo.slice();
		}

		if (previous.webSocket) {
			if (previous.removeClientListeners) previous.removeClientListeners(true);

			this.webSocket = previous.webSocket;
			this.setClientListeners();
			this.pingServer();

			if (previous.incomingMessageQueue) {
				for (const item of previous.incomingMessageQueue.slice()) {
					if (!this.incomingMessageQueue.includes(item)) this.onMessage(item.event, item.timestamp);
				}
			}

			this.pauseIncomingMessages = false;
			if (this.incomingMessageQueue.length) {
				for (const item of this.incomingMessageQueue) {
					this.onMessage(item.event, item.timestamp);
				}

				this.incomingMessageQueue = [];
			}
		}

		if (previous.botGreetingCooldowns) Object.assign(this.botGreetingCooldowns, previous.botGreetingCooldowns);
		if (previous.challstr) this.challstr = previous.challstr;
		if (previous.battleFilterRegularExpressions) this.battleFilterRegularExpressions = previous.battleFilterRegularExpressions.slice();
		if (previous.chatFilterRegularExpressions) this.chatFilterRegularExpressions = previous.chatFilterRegularExpressions.slice();
		if (previous.evasionFilterRegularExpressions) {
			this.evasionFilterRegularExpressions = previous.evasionFilterRegularExpressions.slice();
		}
		if (previous.groupSymbols) Object.assign(this.groupSymbols, previous.groupSymbols);
		if (previous.loggedIn) this.loggedIn = previous.loggedIn;
		if (previous.publicChatRooms) this.publicChatRooms = previous.publicChatRooms.slice();
		if (previous.sendThrottle) this.setSendThrottle(previous.sendThrottle);

		if (previous.sendTimeout) {
			if (previous.sendTimeout !== true) clearTimeout(previous.sendTimeout);
			previous.sendTimeout = undefined;
			if (!this.sendTimeout) this.startSendTimeout(this.sendTimeoutDuration);
		}

		if (previous.server) this.server = previous.server;
		if (previous.serverGroupsResponse) {
			this.serverGroupsResponse = previous.serverGroupsResponse.slice();
			this.parseServerGroups();
		} else if (previous.serverGroups) {
			Object.assign(this.serverGroups, previous.serverGroups);
		}
		if (previous.serverId) this.serverId = previous.serverId;
		if (previous.serverTimeOffset) this.serverTimeOffset = previous.serverTimeOffset;

		for (const messageParser of previous.messageParsers) {
			Tools.unrefProperties(messageParser);
		}

		Tools.unrefProperties(previous);
	}
	/* eslint-enable */

	private clearConnectionTimeouts(): void {
		if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
		if (this.challstrTimeout) clearTimeout(this.challstrTimeout);
		if (this.loginTimeout) clearTimeout(this.loginTimeout);
		if (this.retryLoginTimeout) clearTimeout(this.retryLoginTimeout);
		if (this.serverPingTimeout) clearTimeout(this.serverPingTimeout);
		this.clearSendTimeout();
	}

	private onConnectFail(error?: Error): void {
		this.clearConnectionTimeouts();

		console.log('Failed to connect to server ' + this.serverId);
		if (error) console.log(error.stack);

		this.connectionAttempts++;
		const reconnectTime = this.connectionAttemptTime * this.connectionAttempts;
		console.log('Retrying in ' + reconnectTime / 1000 + ' seconds');
		this.connectionTimeout = setTimeout(() => this.connect(), reconnectTime);
	}

	private onConnectionError(event: ws.ErrorEvent): void {
		this.clearConnectionTimeouts();

		console.log('Connection error: ' + event.message);
		// 'close' is emitted directly after 'error' so reconnecting is handled in onConnectionClose
	}

	private onConnectionClose(event: ws.CloseEvent): void {
		this.terminateWebSocket();

		console.log('Connection closed: ' + event.reason + ' (' + event.code + ')');
		console.log('Reconnecting in ' + SERVER_RESTART_CONNECTION_TIME / 1000 + ' seconds');

		this.connectionTimeout = setTimeout(() => this.reconnect(), SERVER_RESTART_CONNECTION_TIME);
	}

	private onConnect(): void {
		this.clearConnectionTimeouts();

		console.log('Successfully connected');

		this.challstrTimeout = setTimeout(() => {
			console.log("Did not receive a challstr! Reconnecting in " + this.connectionAttemptTime / 1000 + " seconds");
			this.terminateWebSocket();
			this.connectionTimeout = setTimeout(() => this.connect(), this.connectionAttemptTime);
		}, CHALLSTR_TIMEOUT_SECONDS * 1000);

		this.pingServer();

		Dex.fetchClientData();
	}

	private connect(): void {
		if (Config.username) {
			const action = new url.URL('https://' + Tools.mainServer + '/action.php');
			if (!action.hostname || !action.pathname) {
				console.log("Failed to parse login server URL");
				process.exit();
			}

			this.loginServerHostname = action.hostname;
			this.loginServerPath = action.pathname;
		}

		const httpsOptions = {
			hostname: Tools.mainServer,
			path: '/crossdomain.php?' + querystring.stringify({host: this.server, path: ''}),
			method: 'GET',
			headers: {
				"Cache-Control": "no-cache",
			},
		};

		this.pauseIncomingMessages = false;
		if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
		this.connectionTimeout = setTimeout(() => this.onConnectFail(), 30 * 1000);

		console.log("Attempting to connect to the server " + this.server + "...");
		https.get(httpsOptions, response => {
			response.setEncoding('utf8');
			let data = '';
			response.on('data', chunk => {
				data += chunk;
			});
			response.on('end', () => {
				const configData = data.split('var config = ')[1];
				if (configData) {
					let config = JSON.parse(configData.split(';')[0]) as IServerConfig | string;
					// the config is potentially encoded twice by the server
					if (typeof config === 'string') config = JSON.parse(config) as IServerConfig;
					if (config.host) {
						if (config.id) this.serverId = config.id;

						let address: string;
						if (config.host === 'showdown') {
							address = 'wss://' + MAIN_HOST + ':' + (config.port || 443) + '/showdown/websocket';
						} else {
							address = 'ws://' + config.host + ':' + (config.port || 8000) + '/showdown/websocket';
						}

						const wsOptions: ws.ClientOptions = {
							maxPayload: 8 * 100 * 1024 * 1024,
							perMessageDeflate: Config.perMessageDeflate || false,
							headers: {
								"Cache-Control": "no-cache",
								"User-Agent": "ws",
							},
						};

						this.webSocket = new ws(address, [], wsOptions);
						this.pauseOutgoingMessages = false;
						this.setClientListeners();

						return;
					}
				}
				console.log('Error: failed to get data for server ' + this.server);
			});
		}).on('error', error => {
			console.log('Error: ' + error.message);
		});
	}

	/**Removes all webSocket listeners and clears sendTimeout */
	private terminateWebSocket(): void {
		this.clearConnectionTimeouts();
		this.removeClientListeners();

		if (this.webSocket) {
			this.webSocket.terminate();
			this.webSocket = null;
		}

		this.pauseOutgoingMessages = true;
	}

	private prepareReconnect(): void {
		this.terminateWebSocket();

		Tools.logMessage("Client.reconnect() called");

		this.roomsToRejoin = Rooms.getRoomIds();
		if (Config.rooms && !Config.rooms.includes(this.defaultMessageRoom)) {
			const index = this.roomsToRejoin.indexOf(this.defaultMessageRoom);
			if (index !== -1) this.roomsToRejoin.splice(index, 1);
		}

		for (const id of this.roomsToRejoin) {
			const reconnectRoomMessages: string[] = [];
			const room = Rooms.get(id)!;
			let game: ScriptedGame | UserHostedGame | undefined;
			if (room.game && room.game.started) {
				game = room.game;
			} else if (room.userHostedGame && room.userHostedGame.started) {
				game = room.userHostedGame;
			}

			if (game) {
				reconnectRoomMessages.push(Users.self.name + " had to reconnect to the server so the game was forcibly ended.");
				game.deallocate(true);
			}

			if (room.searchChallenge) {
				reconnectRoomMessages.push(Users.self.name + " had to reconnect to the server so the search challenge was forcibly ended.");
				room.searchChallenge.deallocate(true);
			}

			if (reconnectRoomMessages.length) {
				this.reconnectRoomMessages[room.id] = reconnectRoomMessages;
			}
		}

		for (const id of Users.getUserIds()) {
			const user = Users.get(id)!;
			if (user.game) user.game.deallocate(true);
		}

		this.reconnect(true);
	}

	private reconnect(prepared?: boolean): void {
		if (!prepared) {
			Rooms.removeAll();
			Users.removeAll();
			this.outgoingMessageQueue = [];
		}

		this.lastOutgoingMessage = null;
		this.loggedIn = false;
		this.connectionAttempts = 0;
		this.connect();
	}

	private onMessage(event: ws.MessageEvent, now: number): void {
		if (!event.data || typeof event.data !== 'string') return;

		if (this.pauseIncomingMessages) {
			this.incomingMessageQueue.push({event, timestamp: now});
			return;
		}

		const lines = event.data.trim().split("\n");
		let roomid: string;
		if (lines[0].startsWith('>')) {
			roomid = lines[0].substr(1).trim();
			lines.shift();
		} else {
			roomid = this.defaultMessageRoom;
		}

		const room = Rooms.add(roomid);

		if (this.lastOutgoingMessage && this.lastOutgoingMessage.roomid === room.id && (this.lastOutgoingMessage.type === 'join-room' ||
			this.lastOutgoingMessage.type === 'create-groupchat')) {
			this.clearLastOutgoingMessage(now);
		}

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			if (!line) continue;

			try {
				this.parseMessage(room, line, now);

				if (line.startsWith('|init|')) {
					const page = room.type === 'html';
					const chat = !page && room.type === 'chat';
					for (let j = i + 1; j < lines.length; j++) {
						let nextLine = lines[j].trim();
						if (page) {
							if (nextLine.startsWith('|pagehtml|')) {
								this.parseMessage(room, nextLine, now);
								break;
							}
						} else if (chat) {
							if (nextLine.startsWith('|users|')) {
								this.parseMessage(room, nextLine.trim(), now);
								for (let k = j + 1; k < lines.length; k++) {
									nextLine = lines[k].trim();
									if (nextLine.startsWith('|:|')) {
										this.parseMessage(room, nextLine, now);
										break;
									}
								}
								break;
							}
						}
					}

					if (page || chat) return;
				}
			} catch (e) {
				console.log(e);
				Tools.logError(e as NodeJS.ErrnoException, "Client.parseMessage() in " + room.id + ": " + line);
			}
		}
	}

	private parseMessage(room: Room, rawMessage: string, now: number): void {
		let message: string;
		let messageType: keyof IClientMessageTypes;
		if (!rawMessage.startsWith("|")) {
			message = rawMessage;
			messageType = '';
		} else {
			message = rawMessage.substr(1);
			const pipeIndex = message.indexOf("|");
			if (pipeIndex !== -1) {
				messageType = message.substr(0, pipeIndex) as keyof IClientMessageTypes;
				message = message.substr(pipeIndex + 1);
			} else {
				messageType = message as keyof IClientMessageTypes;
				message = '';
			}
		}

		const messageParts = message.split("|");

		if (this.messageParsersExist) {
			for (const messageParser of this.messageParsers) {
				if (messageParser.parseMessage(room, messageType, messageParts, now) === true) return;
			}
		}

		switch (messageType) {
		/**
		 * Global messages
		 */
		case 'challstr': {
			if (this.challstrTimeout) clearTimeout(this.challstrTimeout);

			this.challstr = message;

			if (Config.username) {
				this.loginTimeout = setTimeout(() => {
					console.log("Failed to login. Reconnecting in " + this.connectionAttemptTime / 1000 + " seconds");
					this.terminateWebSocket();
					this.connectionTimeout = setTimeout(() => this.connect(), this.connectionAttemptTime);
				}, LOGIN_TIMEOUT_SECONDS * 1000);

				this.checkLoginSession();
			}
			break;
		}

		case 'updateuser': {
			const messageArguments: IClientMessageTypes['updateuser'] = {
				usernameText: messageParts[0],
				loginStatus: messageParts[1],
				avatar: messageParts[2],
				userSettings: messageParts[3],
			};

			let rank: string = '';
			const firstCharacter = messageArguments.usernameText.charAt(0);
			for (const i in this.serverGroups) {
				if (this.serverGroups[i].symbol === firstCharacter) {
					rank = firstCharacter;
					messageArguments.usernameText = messageArguments.usernameText.substr(1);
					break;
				}
			}

			const {status, username} = Tools.parseUsernameText(messageArguments.usernameText);

			if (Tools.toId(username) !== Users.self.id) return;

			if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'trn') {
				this.clearLastOutgoingMessage(now);
			}

			Users.self.setName(username);

			if (this.loggedIn) {
				Users.self.updateStatus(status);
			} else {
				if (messageArguments.loginStatus !== '1') {
					console.log('Failed to log in');
					return;
				}

				if (this.loginTimeout) clearTimeout(this.loginTimeout);

				console.log('Successfully logged in');
				this.loggedIn = true;

				this.send({
					message: '|/cmd rooms',
					type: 'query-rooms',
					measure: true,
				});

				let userSettings: IServerUserSettings | undefined;
				if (messageArguments.userSettings) {
					userSettings = JSON.parse(messageArguments.userSettings) as IServerUserSettings;
				}

				if (!userSettings || !userSettings.blockChallenges) {
					this.send({
						message: '|/blockchallenges',
						type: 'blockchallenges',
						measure: true,
					});
				}

				if (Tools.toAlphaNumeric(Config.username) !== Config.username && Users.self.name !== Config.username) {
					this.send({
						message: '|/trn ' + Config.username,
						type: 'trn',
						measure: true,
					});
				}

				if (rank) {
					Users.self.setGlobalRank(rank);
				} else {
					this.getUserDetails(Users.self);
				}

				if (this.roomsToRejoin.length) {
					for (const roomId of this.roomsToRejoin) {
						this.joinRoom(roomId);
					}

					this.roomsToRejoin = [];
				} else if (Config.rooms) {
					for (const roomId of Config.rooms) {
						if (roomId !== 'staff') this.joinRoom(roomId);
					}
				}

				if (Config.avatar && Config.avatar !== messageArguments.avatar) {
					this.send({
						message: '|/avatar ' + Config.avatar,
						type: 'avatar',
						measure: true,
					});
				}
			}
			break;
		}

		case 'queryresponse': {
			const messageArguments: IClientMessageTypes['queryresponse'] = {
				type: messageParts[0] as QueryResponseType,
				response: messageParts.slice(1).join('|'),
			};

			if (messageArguments.type === 'roominfo') {
				if (messageArguments.response && messageArguments.response !== 'null') {
					const response = JSON.parse(messageArguments.response) as IRoomInfoResponse;
					const responseRoom = Rooms.get(response.id);
					if (responseRoom) {
						if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'query-roominfo' &&
							this.lastOutgoingMessage.roomid === responseRoom.id) {
							this.clearLastOutgoingMessage(now);
						}

						responseRoom.onRoomInfoResponse(response);
						Games.updateGameCatalog(responseRoom);
					}
				}
			} else if (messageArguments.type === 'rooms') {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'query-rooms') {
					this.clearLastOutgoingMessage(now);
				}

				if (messageArguments.response && messageArguments.response !== 'null') {
					const response = JSON.parse(messageArguments.response) as IRoomsResponse;

					this.publicChatRooms = [];

					if (response.chat) {
						for (const chatRoom of response.chat) {
							this.publicChatRooms.push(Tools.toRoomId(chatRoom.title));
						}
					}

					if (response.official) {
						for (const officialRoom of response.official) {
							this.publicChatRooms.push(Tools.toRoomId(officialRoom.title));
						}
					}

					if (response.pspl) {
						for (const psplRoom of response.pspl) {
							this.publicChatRooms.push(Tools.toRoomId(psplRoom.title));
						}
					}

					Rooms.updatePublicRooms();
				}
			} else if (messageArguments.type === 'userdetails') { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
				if (messageArguments.response && messageArguments.response !== 'null') {
					const response = JSON.parse(messageArguments.response) as IUserDetailsResponse;
					if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'query-userdetails' &&
						this.lastOutgoingMessage.userid === response.userid) {
						this.clearLastOutgoingMessage(now);
					}

					let user: User | undefined;
					if (response.userid === Users.self.id) {
						user = Users.self;
					} else {
						user = Users.get(response.name);
					}

					if (user) {
						let avatar = "" + response.avatar;
						if (avatar in DEFAULT_TRAINER_SPRITES) {
							avatar = DEFAULT_TRAINER_SPRITES[avatar];
						}
						user.avatar = avatar;
						user.customAvatar = !Dex.getTrainerSpriteId(avatar);

						user.autoconfirmed = response.autoconfirmed;
						user.status = response.status;
						user.setGlobalRank(response.group);

						if (user.userDetailsListener) {
							user.userDetailsListener(user);
							delete user.userDetailsListener;
						}
					}
				}
			}
			break;
		}

		case 'init': {
			const messageArguments: IClientMessageTypes['init'] = {
				type: messageParts[0] as RoomType,
			};

			if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'join-room' &&
				this.lastOutgoingMessage.roomid === room.id) {
				this.clearLastOutgoingMessage(now);
			}

			room.init(messageArguments.type);
			if (room.type === 'chat') {
				console.log("Joined room: " + room.id);
				if (room.id === 'staff') {
					this.send({
						message: room.id + '|/filters view',
						type: 'filters-view',
						measure: true,
					});
				}

				this.getRoomInfo(room);

				if (room.id in this.reconnectRoomMessages) {
					for (const reconnectMessage of this.reconnectRoomMessages[room.id]) {
						room.say(reconnectMessage);
					}
					delete this.reconnectRoomMessages[room.id];
				}

				Tournaments.setNextTournament(room);
			}

			if (room.id in Rooms.createListeners) {
				for (const listener of Rooms.createListeners[room.id]) {
					listener(room);
				}
				delete Rooms.createListeners[room.id];
			}

			break;
		}

		case 'deinit': {
			if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'leave-room' &&
				this.lastOutgoingMessage.roomid === room.id) {
				this.clearLastOutgoingMessage(now);
			}

			Rooms.remove(room);
			break;
		}

		case 'noinit': {
			const messageArguments: IClientMessageTypes['noinit'] = {
				action: messageParts[0],
				newId: messageParts[1],
				newTitle: messageParts[2],
			};

			if (messageArguments.action === 'rename') {
				const oldId = room.id;
				room = Rooms.renameRoom(room, messageArguments.newId, messageArguments.newTitle);
				Storage.renameRoom(room, oldId);

				if (room.type === 'chat') this.getRoomInfo(room);
			} else {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'join-room' &&
					this.lastOutgoingMessage.roomid === room.id) {
					this.clearLastOutgoingMessage(now);
				}

				Rooms.remove(room);
			}

			break;
		}

		case 'title': {
			const messageArguments: IClientMessageTypes['title'] = {
				title: messageParts[0],
			};

			room.setTitle(messageArguments.title);
			break;
		}

		case 'customgroups': {
			const messageArguments: IClientMessageTypes['customgroups'] = {
				groups: JSON.parse(messageParts[0]) as ServerGroupData[],
			};

			this.serverGroupsResponse = messageArguments.groups;
			this.parseServerGroups();
			break;
		}

		/**
		 * Chat messages
		 */
		case 'users': {
			const messageArguments: IClientMessageTypes['users'] = {
				userlist: messageParts[0],
			};

			if (messageArguments.userlist === '0') return;

			const addedUsers = new Set<User>();
			const users = messageArguments.userlist.split(",");
			for (let i = 1; i < users.length; i++) {
				const rank = users[i].charAt(0);
				const {status, username} = Tools.parseUsernameText(users[i].substr(1));
				const id = Tools.toId(username);
				if (!id) continue;

				const user = Users.add(username, id);
				addedUsers.add(user);

				room.onUserJoin(user, rank);
				user.updateStatus(status);
			}

			// prune users after reconnecting
			for (const id of Users.getUserIds()) {
				const user = Users.get(id)!;
				if (user.rooms.has(room) && !addedUsers.has(user)) room.onUserLeave(user);
			}

			break;
		}

		case 'join':
		case 'j':
		case 'J': {
			const messageArguments: IClientMessageTypes['join'] = {
				rank: messageParts[0].charAt(0),
				usernameText: messageParts[0].substr(1),
			};
			const {status, username} = Tools.parseUsernameText(messageArguments.usernameText);
			const id = Tools.toId(username);
			if (!id) return;

			const user = Users.add(username, id);
			room.onUserJoin(user, messageArguments.rank);
			user.updateStatus(status);

			if (user === Users.self && this.publicChatRooms.includes(room.id) && Users.self.hasRank(room, 'driver')) {
				this.setSendThrottle(TRUSTED_MESSAGE_THROTTLE);
			}

			if (room.publicRoom) Storage.updateLastSeen(user, now);

			if (!room.battle) {
				if (Config.allowMail) Storage.retrieveOfflineMessages(user);

				if ((!room.game || room.game.isMiniGame) && !room.userHostedGame && (!(user.id in this.botGreetingCooldowns) ||
					now - this.botGreetingCooldowns[user.id] >= BOT_GREETING_COOLDOWN)) {
					if (Storage.checkBotGreeting(room, user, now)) this.botGreetingCooldowns[user.id] = now;
				}
			}

			break;
		}

		case 'leave':
		case 'l':
		case 'L': {
			const messageArguments: IClientMessageTypes['leave'] = {
				possibleRank: messageParts[0].charAt(0),
				username: messageParts[0].substr(1),
			};

			let username: string;
			if (messageArguments.possibleRank in this.serverGroups) {
				username = messageArguments.username;
			} else {
				username = messageArguments.possibleRank + messageArguments.username;
			}

			const id = Tools.toId(username);
			if (!id) return;

			const user = Users.add(username, id);

			if (room.publicRoom) Storage.updateLastSeen(user, now);

			room.onUserLeave(user);
			if (!user.rooms.size) Users.remove(user);
			break;
		}

		case 'name':
		case 'n':
		case 'N': {
			const messageArguments: IClientMessageTypes['name'] = {
				rank: messageParts[0].charAt(0),
				usernameText: messageParts[0].substr(1),
				oldId: messageParts[1],
			};

			const {status, username} = Tools.parseUsernameText(messageArguments.usernameText);
			const user = Users.rename(username, messageArguments.oldId);
			room.onUserRename(user, messageArguments.rank);
			user.updateStatus(status);

			if (!user.away && Config.allowMail) {
				Storage.retrieveOfflineMessages(user);
			}

			if (room.publicRoom) Storage.updateLastSeen(user, now);
			break;
		}

		case 'chat':
		case 'c':
		case 'c:': {
			let messageArguments: IClientMessageTypes['chat'];
			if (messageType === 'c:') {
				messageArguments = {
					timestamp: (parseInt(messageParts[0]) + this.serverTimeOffset) * 1000,
					rank: messageParts[1].charAt(0),
					username: messageParts[1].substr(1),
					message: messageParts.slice(2).join("|"),
				};
			} else {
				messageArguments = {
					timestamp: now,
					rank: messageParts[0].charAt(0),
					username: messageParts[0].substr(1),
					message: messageParts.slice(1).join("|"),
				};
			}

			const userId = Tools.toId(messageArguments.username);
			if (!userId) return;

			const user = Users.add(messageArguments.username, userId);
			const roomData = user.rooms.get(room);
			if (roomData) roomData.lastChatMessage = messageArguments.timestamp;

			if (user === Users.self) {
				if (messageArguments.message === CODE_COMMAND) {
					if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'code' &&
						this.lastOutgoingMessage.roomid === room.id) {
						this.clearLastOutgoingMessage(now);
					}
				} else if (messageArguments.message.startsWith(ANNOUNCE_CHAT_COMMAND)) {
					const announcement = messageArguments.message.substr(ANNOUNCE_CHAT_COMMAND.length);
					if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'announce' &&
						Tools.toId(this.lastOutgoingMessage.announcement) === Tools.toId(announcement)) {
						this.clearLastOutgoingMessage(now);
					}
				} else if (messageArguments.message.startsWith(HTML_CHAT_COMMAND)) {
					const html = Tools.unescapeHTML(messageArguments.message.substr(HTML_CHAT_COMMAND.length));
					const htmlId = Tools.toId(html);
					if (this.lastOutgoingMessage && ((this.lastOutgoingMessage.type === 'chat-html' &&
						Tools.toId(this.lastOutgoingMessage.html) === htmlId) || (this.lastOutgoingMessage.type === 'code' &&
						Tools.toId(this.lastOutgoingMessage.html) === Tools.toId(html.replace(CODE_LINEBREAK, ""))))) {
						this.clearLastOutgoingMessage(now);
					}

					room.addHtmlChatLog(html);

					if (htmlId in room.htmlMessageListeners) {
						room.htmlMessageListeners[htmlId](now);
						delete room.htmlMessageListeners[htmlId];
					}
				} else {
					let uhtml = '';
					let uhtmlChange = false;
					if (messageArguments.message.startsWith(UHTML_CHAT_COMMAND)) {
						uhtml = messageArguments.message.substr(UHTML_CHAT_COMMAND.length);
					} else if (messageArguments.message.startsWith(UHTML_CHANGE_CHAT_COMMAND)) {
						uhtml = messageArguments.message.substr(UHTML_CHANGE_CHAT_COMMAND.length);
						uhtmlChange = true;
					}

					const commaIndex = uhtml.indexOf(',');
					if (commaIndex !== -1) {
						const uhtmlName = uhtml.substr(0, commaIndex);
						const uhtmlId = Tools.toId(uhtmlName);
						const html = Tools.unescapeHTML(uhtml.substr(commaIndex + 1));
						const htmlId = Tools.toId(html);
						if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'chat-uhtml' &&
							Tools.toId(this.lastOutgoingMessage.uhtmlName) === uhtmlId &&
							Tools.toId(this.lastOutgoingMessage.html) === htmlId) {
							this.clearLastOutgoingMessage(now);
						}

						if (!uhtmlChange) room.addUhtmlChatLog(uhtmlName, html);

						if (uhtmlId in room.uhtmlMessageListeners && htmlId in room.uhtmlMessageListeners[uhtmlId]) {
							room.uhtmlMessageListeners[uhtmlId][htmlId](now);
							room.removeUhtmlMessageListener(uhtmlId, htmlId);
						}
					} else {
						const messageId = Tools.toId(messageArguments.message);
						if (this.lastOutgoingMessage && ((this.lastOutgoingMessage.type === 'chat' &&
							Tools.toId(this.lastOutgoingMessage.text) === messageId) || (this.lastOutgoingMessage.type === 'code' &&
							messageArguments.message.startsWith("```") && Tools.toId(this.lastOutgoingMessage.html) === messageId))) {
							this.clearLastOutgoingMessage(now);
						}

						room.addChatLog(messageArguments.message);

						if (messageId in room.messageListeners) {
							room.messageListeners[messageId](now);
							delete room.messageListeners[messageId];
						}
					}
				}
			} else {
				room.addChatLog(messageArguments.message);
				this.parseChatMessage(room, user, messageArguments.message, now);
			}

			if (room.publicRoom) Storage.updateLastSeen(user, messageArguments.timestamp);

			if (messageArguments.message.startsWith('/log ')) {
				if (messageArguments.message.startsWith(HANGMAN_START_COMMAND)) {
					room.serverHangman = true;

					if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'hangman-start' &&
						this.lastOutgoingMessage.roomid === room.id &&
						messageArguments.message.startsWith(HANGMAN_START_COMMAND + Users.self.name)) {
						this.clearLastOutgoingMessage(now);
					}
				} else if (messageArguments.message.startsWith(HANGMAN_END_COMMAND)) {
					room.serverHangman = null;

					if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'hangman-end' &&
						this.lastOutgoingMessage.roomid === room.id &&
						messageArguments.message.startsWith(HANGMAN_END_COMMAND + Users.self.name)) {
						this.clearLastOutgoingMessage(now);
					}
				} else if (this.lastOutgoingMessage && this.lastOutgoingMessage.roomid === room.id && user === Users.self) {
					if (this.lastOutgoingMessage.type === 'room-voice') {
						if (messageArguments.message.endsWith(" was promoted to Room Voice by " + Users.self.name + ".")) {
							const promoted = messageArguments.message.substr(5).split(" was promoted to Room Voice by")[0];
							if (Tools.toId(promoted) === this.lastOutgoingMessage.userid) this.clearLastOutgoingMessage(now);
						}
					} else if (this.lastOutgoingMessage.type === 'room-deauth') {
						if (messageArguments.message.endsWith(" was demoted to Room regular user by " + Users.self.name + ".)")) {
							const demoted = messageArguments.message.substr(6).split(" was demoted to Room regular user by")[0];
							if (Tools.toId(demoted) === this.lastOutgoingMessage.deauthedUserid) this.clearLastOutgoingMessage(now);
						}
					} else if (this.lastOutgoingMessage.type === 'warn') {
						if (messageArguments.message.endsWith(' was warned by ' + Users.self.name + ". (" +
							this.lastOutgoingMessage.warnReason + ")")) {
							this.clearLastOutgoingMessage(now);
						}
					} else if (this.lastOutgoingMessage.type === 'modnote') {
						const modnoteCommand = '/log (' + Users.self.name + ' notes: ';
						if (messageArguments.message.startsWith(modnoteCommand) &&
							messageArguments.message.substr(modnoteCommand.length).startsWith(this.lastOutgoingMessage.modnote!)) {
							this.clearLastOutgoingMessage(now);
						}
					} else if (this.lastOutgoingMessage.type === 'tournament-create') {
						if (messageArguments.message.startsWith('/log (' + Users.self.name + ' created a tournament in ')) {
							this.clearLastOutgoingMessage(now);
						}
					} else if (this.lastOutgoingMessage.type === 'tournament-start') {
						if (messageArguments.message.startsWith('/log (' + Users.self.name + ' started the tournament.)')) {
							this.clearLastOutgoingMessage(now);
						}
					} else if (this.lastOutgoingMessage.type === 'tournament-name') {
						if (messageArguments.message.startsWith("/log (" + Users.self.name + " set the tournament's name to ")) {
							this.clearLastOutgoingMessage(now);
						}
					} else if (this.lastOutgoingMessage.type === 'tournament-cap') {
						if (messageArguments.message.startsWith("/log (" + Users.self.name + " set the tournament's player cap to ")) {
							this.clearLastOutgoingMessage(now);
						}
					} else if (this.lastOutgoingMessage.type === 'tournament-autostart') {
						if (messageArguments.message.startsWith(TOURNAMENT_AUTOSTART_COMMAND + Users.self.name)) {
							this.clearLastOutgoingMessage(now);
						}
					} else if (this.lastOutgoingMessage.type === 'tournament-autodq') {
						if (messageArguments.message.startsWith(TOURNAMENT_AUTODQ_COMMAND) &&
							messageArguments.message.endsWith(" by " + Users.self.name + ")")) {
							this.clearLastOutgoingMessage(now);
						}
					} else if (this.lastOutgoingMessage.type === 'tournament-forcepublic') {
						if (messageArguments.message.startsWith(TOURNAMENT_FORCEPUBLIC_COMMAND + Users.self.name)) {
							this.clearLastOutgoingMessage(now);
						}
					} else if (this.lastOutgoingMessage.type === 'tournament-forcetimer') {
						if (messageArguments.message.startsWith(TOURNAMENT_FORCE_TIMER_COMMAND + Users.self.name)) {
							this.clearLastOutgoingMessage(now);
						}
					} else if (this.lastOutgoingMessage.type === 'tournament-scouting') {
						if (messageArguments.message.startsWith(TOURNAMENT_SCOUTING_COMMAND + Users.self.name)) {
							this.clearLastOutgoingMessage(now);
						}
					} else if (this.lastOutgoingMessage.type === 'tournament-modjoin') {
						if (messageArguments.message.startsWith(TOURNAMENT_MODJOIN_COMMAND + Users.self.name)) {
							this.clearLastOutgoingMessage(now);
						}
					} else if (this.lastOutgoingMessage.type === 'tournament-end') {
						if (messageArguments.message.endsWith(TOURNAMENT_END_COMMAND)) {
							this.clearLastOutgoingMessage(now);
						}
					} else if (this.lastOutgoingMessage.type === 'tournament-rules') {
						if (messageArguments.message.startsWith("/log (" + Users.self.name + " updated the tournament's custom rules.")) {
							this.clearLastOutgoingMessage(now);
						}
					}
				}
			}

			break;
		}

		case ':': {
			const messageArguments: IClientMessageTypes[':'] = {
				timestamp: parseInt(messageParts[0]),
			};
			this.serverTimeOffset = Math.floor(now / 1000) - messageArguments.timestamp;
			break;
		}

		case 'pm': {
			const messageArguments: IClientMessageTypes['pm'] = {
				rank: messageParts[0].charAt(0),
				username: messageParts[0].substr(1),
				recipientRank: messageParts[1].charAt(0),
				recipientUsername: messageParts[1].substr(1),
				message: messageParts.slice(2).join("|"),
			};

			const userId = Tools.toId(messageArguments.username);
			if (!userId) return;

			const isHtml = messageArguments.message.startsWith(HTML_CHAT_COMMAND);
			const isUhtml = !isHtml && messageArguments.message.startsWith(UHTML_CHAT_COMMAND);
			const isUhtmlChange = !isHtml && !isUhtml && messageArguments.message.startsWith(UHTML_CHANGE_CHAT_COMMAND);

			const user = Users.add(messageArguments.username, userId);
			if (user === Users.self) {
				if (messageArguments.message === BLOCK_CHALLENGES_COMMAND ||
					messageArguments.message === ALREADY_BLOCKING_CHALLENGES_COMMAND) {
					if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'blockchallenges') {
						this.clearLastOutgoingMessage(now);
					}
					return;
				}

				if (messageArguments.message === AVATAR_COMMAND) {
					if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'avatar') {
						this.clearLastOutgoingMessage(now);
					}
					return;
				}

				const recipientId = Tools.toId(messageArguments.recipientUsername);
				if (messageArguments.message.startsWith(USER_NOT_FOUND_MESSAGE) ||
					messageArguments.message.startsWith(USER_BLOCKING_PMS_MESSAGE) ||
					messageArguments.message.endsWith(STAFF_BLOCKING_PMS_MESSAGE) ||
					messageArguments.message.startsWith(UNREGISTERED_USER_MESSAGE) ||
					messageArguments.message.startsWith(ROLL_COMMAND_HELP) ||
					(messageArguments.message.startsWith('/error The user ') &&
					messageArguments.message.endsWith('is locked and cannot be PMed.'))) {
					if (this.lastOutgoingMessage && this.lastOutgoingMessage.userid === recipientId &&
						(this.lastOutgoingMessage.type === 'pm' || this.lastOutgoingMessage.type === 'pm-html' ||
						this.lastOutgoingMessage.type === 'pm-uhtml' || this.lastOutgoingMessage.type === 'htmlpage' ||
						this.lastOutgoingMessage.type === 'htmlpageselector' || this.lastOutgoingMessage.type === 'closehtmlpage' ||
						this.lastOutgoingMessage.type === 'highlight-htmlpage' || this.lastOutgoingMessage.type === 'notifyuser' ||
						this.lastOutgoingMessage.type === 'notifyoffuser' || this.lastOutgoingMessage.type === 'private-html')) {
						this.clearLastOutgoingMessage(now);
					}

					return;
				} else if (messageArguments.message.startsWith(CHAT_ERROR_MESSAGE)) {
					Tools.logMessage("Error message in PM to " + messageArguments.recipientUsername + ": " +
						messageArguments.message.substr(CHAT_ERROR_MESSAGE.length));
				}

				if (!recipientId) return;

				const recipient = Users.add(messageArguments.recipientUsername, recipientId);
				if (messageArguments.message.startsWith('/error ')) {
					const error = messageArguments.message.substr(7).trim();
					if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'pm' &&
						this.lastOutgoingMessage.userid === recipient.id && this.isDataRollCommand(this.lastOutgoingMessage.text!) &&
						this.isDataCommandError(error)) {
						this.clearLastOutgoingMessage(now);
						recipient.say(Tools.unescapeHTML(error));
					}

					return;
				}

				if (isUhtml || isUhtmlChange) {
					const uhtml = messageArguments.message.substr(messageArguments.message.indexOf(" ") + 1);
					const commaIndex = uhtml.indexOf(",");
					const uhtmlName = uhtml.substr(0, commaIndex);
					const uhtmlId = Tools.toId(uhtmlName);
					const html = Tools.unescapeHTML(uhtml.substr(commaIndex + 1));
					const htmlId = Tools.toId(html);

					if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'pm-uhtml' &&
						this.lastOutgoingMessage.userid === recipient.id && Tools.toId(this.lastOutgoingMessage.uhtmlName) === uhtmlId &&
						Tools.toId(this.lastOutgoingMessage.html) === htmlId) {
						this.clearLastOutgoingMessage(now);
					}

					if (!isUhtmlChange) user.addUhtmlChatLog(uhtmlName, html);

					if (recipient.uhtmlMessageListeners && uhtmlId in recipient.uhtmlMessageListeners &&
						htmlId in recipient.uhtmlMessageListeners[uhtmlId]) {
						recipient.uhtmlMessageListeners[uhtmlId][htmlId](now);
						recipient.removeUhtmlMessageListener(uhtmlId, htmlId);
					}
				} else if (isHtml) {
					const html = Tools.unescapeHTML(messageArguments.message.substr(HTML_CHAT_COMMAND.length));
					const htmlId = Tools.toId(html);
					if (this.lastOutgoingMessage && this.lastOutgoingMessage.userid === recipient.id &&
						((this.lastOutgoingMessage.type === 'pm-html' && Tools.toId(this.lastOutgoingMessage.html) === htmlId) ||
						(this.lastOutgoingMessage.type === 'code' &&
						Tools.toId(this.lastOutgoingMessage.html) === Tools.toId(html.replace(CODE_LINEBREAK, ""))))) {
						this.clearLastOutgoingMessage(now);
					}

					user.addHtmlChatLog(html);

					if (recipient.htmlMessageListeners) {
						if (htmlId in recipient.htmlMessageListeners) {
							recipient.htmlMessageListeners[htmlId](now);
							delete recipient.htmlMessageListeners[htmlId];
						}
					}
				} else {
					const messageId = Tools.toId(messageArguments.message);
					if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'pm' &&
						this.lastOutgoingMessage.userid === recipient.id &&
						Tools.toId(this.lastOutgoingMessage.text) === messageId) {
						this.clearLastOutgoingMessage(now);
					}

					user.addChatLog(messageArguments.message);

					if (recipient.messageListeners) {
						if (messageId in recipient.messageListeners) {
							recipient.messageListeners[messageId](now);
							delete recipient.messageListeners[messageId];
						}
					}
				}
			} else {
				user.setGlobalRank(messageArguments.rank);

				if (isUhtml || isUhtmlChange) {
					if (!isUhtmlChange) user.addUhtmlChatLog("", "html");
				} else if (isHtml) {
					user.addHtmlChatLog("html");
				} else {
					let commandMessage = messageArguments.message;
					if (commandMessage.startsWith(BOT_MESSAGE_COMMAND)) commandMessage = commandMessage.substr(BOT_MESSAGE_COMMAND.length);

					user.addChatLog(commandMessage);

					if (commandMessage.startsWith(REQUEST_PM_LOG_COMMAND)) {
						if (user.hasGlobalRank('driver')) {
							const names = commandMessage.substr(REQUEST_PM_LOG_COMMAND.length).trim().split(" and ");
							let otherUser = "";
							for (const name of names) {
								const id = Tools.toId(name);
								if (id !== Users.self.id) {
									otherUser = id;
									break;
								}
							}

							if (otherUser) {
								this.send({
									message: '|/allowpmlog ' + user.id + ', ' + otherUser,
									type: 'allowpmlog',
									userid: user.id,
									measure: true,
								});
							}
						}
					} else if (commandMessage.startsWith(ALLOWED_PM_LOG)) {
						if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'allowpmlog' &&
							this.lastOutgoingMessage.userid === user.id) {
							this.clearLastOutgoingMessage(now);
						}
					} else {
						const battleUrl = this.extractBattleId(commandMessage.startsWith(INVITE_COMMAND) ?
							commandMessage.substr(INVITE_COMMAND.length) : commandMessage);
						if (battleUrl) {
							commandMessage = Config.commandCharacter + 'check ' + battleUrl.fullId;
						}

						CommandParser.parse(user, user, commandMessage, now);
					}
				}
			}
			break;
		}

		case '': {
			const messageArguments: IClientMessageTypes[''] = {
				message: rawMessage,
			};

			if (messageArguments.message === 'This room has no banned phrases.') {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'banword-list' &&
					this.lastOutgoingMessage.roomid === room.id) {
					this.clearLastOutgoingMessage(now);
				}

				room.serverBannedWords = [];
				room.serverBannedWordsRegex = null;
			} else if (messageArguments.message.startsWith('Banned phrases in room ')) {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'banword-list' &&
					this.lastOutgoingMessage.roomid === room.id) {
					this.clearLastOutgoingMessage(now);
				}

				room.serverBannedWordsRegex = null;

				let subMessage = messageArguments.message.split('Banned phrases in room ')[1];
				const colonIndex = subMessage.indexOf(':');
				subMessage = subMessage.substr(colonIndex + 2);
				if (subMessage) {
					room.serverBannedWords = subMessage.split(',').map(x => x.trim()).filter(x => x.length);
				} else {
					room.serverBannedWords = [];
				}
			} else if (messageArguments.message === HANGMAN_END_RAW_MESSAGE) {
				room.serverHangman = null;
			} else if (messageArguments.message.startsWith('Tournament battles forced public: ON') ||
				messageArguments.message.startsWith('Tournament battles forced public: OFF')) {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'tournament-forcepublic' &&
					this.lastOutgoingMessage.roomid === room.id) {
					this.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.message.startsWith('Modjoining is now banned (Players cannot modjoin their tournament battles)') ||
				messageArguments.message.startsWith('Modjoining is now allowed (Players can modjoin their tournament battles)')) {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'tournament-modjoin' &&
					this.lastOutgoingMessage.roomid === room.id) {
					this.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.message.startsWith('Scouting is now allowed (Tournament players can watch other tournament ' +
				'battles)') || messageArguments.message.startsWith("Scouting is now banned (Tournament players can't watch other " +
				"tournament battles)")) {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'tournament-scouting' &&
					this.lastOutgoingMessage.roomid === room.id) {
					this.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.message.startsWith('Forcetimer is now on for the tournament') ||
				messageArguments.message.startsWith('Forcetimer is now off for the tournament')) {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'tournament-forcetimer' &&
					this.lastOutgoingMessage.roomid === room.id) {
					this.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.message.startsWith('The tournament will start once ')) {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'tournament-autostart' &&
					this.lastOutgoingMessage.roomid === room.id) {
					this.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.message.startsWith('Tournament cap set to ')) {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'tournament-cap' &&
					this.lastOutgoingMessage.roomid === room.id) {
					this.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.message === TOURNAMENT_RUNAUTODQ_COMMAND) {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'tournament-runautodq' &&
					this.lastOutgoingMessage.roomid === room.id) {
					this.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.message.startsWith(NOTIFY_USER_MESSAGE)) {
				const recipient = messageArguments.message.substr(NOTIFY_USER_MESSAGE.length);
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'notifyuser' &&
					this.lastOutgoingMessage.roomid === room.id && this.lastOutgoingMessage.userid === Tools.toId(recipient)) {
					this.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.message.startsWith(NOTIFY_OFF_USER_MESSAGE)) {
				const recipient = messageArguments.message.substr(NOTIFY_OFF_USER_MESSAGE.length);
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'notifyoffuser' &&
					this.lastOutgoingMessage.roomid === room.id && this.lastOutgoingMessage.userid === Tools.toId(recipient)) {
					this.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.message.startsWith(HIGHLIGHT_HTML_PAGE_MESSAGE)) {
				const parts = messageArguments.message.substr(HIGHLIGHT_HTML_PAGE_MESSAGE.length).split(" on the bot page ");
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'highlight-htmlpage' &&
					this.lastOutgoingMessage.roomid === room.id && this.lastOutgoingMessage.userid === Tools.toId(parts[0]) &&
					Tools.toId(this.lastOutgoingMessage.pageId) === Tools.toId(parts[1])) {
					this.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.message.startsWith(PRIVATE_HTML_MESSAGE)) {
				const recipient = messageArguments.message.substr(PRIVATE_HTML_MESSAGE.length);
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'private-html' &&
					this.lastOutgoingMessage.roomid === room.id && this.lastOutgoingMessage.userid === Tools.toId(recipient)) {
					this.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.message.startsWith("/dice ")) {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'chat' &&
					this.lastOutgoingMessage.roomid === room.id && this.lastOutgoingMessage.text!.startsWith('!roll ')) {
					this.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.message.startsWith("Sent ")) {
				const parts = messageArguments.message.substr(5).split(" the bot page ");
				let recipient = parts[0];
				if (messageArguments.message.includes(" the selector ")) {
					const selectorParts = parts[0].split(" the selector ");
					recipient = selectorParts[0];
					const selector = selectorParts[1].split(" on")[0];
					if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'htmlpageselector' &&
						this.lastOutgoingMessage.roomid === room.id && this.lastOutgoingMessage.userid === Tools.toId(recipient) &&
						Tools.toId(this.lastOutgoingMessage.selector) === Tools.toId(selector) &&
						Tools.toId(this.lastOutgoingMessage.pageId) === Tools.toId(parts[1])) {
						this.clearLastOutgoingMessage(now);
					}
				} else {
					if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'htmlpage' &&
						this.lastOutgoingMessage.roomid === room.id && this.lastOutgoingMessage.userid === Tools.toId(recipient) &&
						Tools.toId(this.lastOutgoingMessage.pageId) === Tools.toId(parts[1])) {
						this.clearLastOutgoingMessage(now);
					}
				}
			} else if (messageArguments.message.startsWith("Closed the bot page ")) {
				const parts = messageArguments.message.split("Closed the bot page ");
				const subParts = parts[1].split(" for ");
				const pageId = subParts[0];
				const recipient = subParts.slice(1).join(" for ");
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'closehtmlpage' &&
					this.lastOutgoingMessage.roomid === room.id && this.lastOutgoingMessage.userid === Tools.toId(recipient) &&
					Tools.toId(this.lastOutgoingMessage.pageId) === Tools.toId(pageId)) {
					this.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.message.startsWith(CHAT_ERROR_MESSAGE)) {
				Tools.logMessage("Chat error message in " + room.title + ": " + messageArguments.message.substr(CHAT_ERROR_MESSAGE.length));
			}

			break;
		}

		case 'error': {
			const messageArguments: IClientMessageTypes['error'] = {
				error: messageParts.join("|"),
			};

			if (messageArguments.error.startsWith('/tour new - Access denied')) {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'tournament-create' &&
					this.lastOutgoingMessage.roomid === room.id) {
					this.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.error.startsWith('/tour start - Access denied')) {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'tournament-start' &&
					this.lastOutgoingMessage.roomid === room.id) {
					this.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.error.startsWith('/tour end - Access denied')) {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'tournament-end' &&
					this.lastOutgoingMessage.roomid === room.id) {
					this.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.error.startsWith('/tour name - Access denied')) {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'tournament-name' &&
					this.lastOutgoingMessage.roomid === room.id) {
					this.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.error.startsWith('/tour cap - Access denied') ||
				messageArguments.error.startsWith("The tournament's player cap is already ")) {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'tournament-cap' &&
					this.lastOutgoingMessage.roomid === room.id) {
					this.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.error.startsWith('/tour runautodq - Access denied')) {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'tournament-runautodq' &&
					this.lastOutgoingMessage.roomid === room.id) {
					this.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.error.startsWith('/tour forcetimer - Access denied')) {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'tournament-forcetimer' &&
					this.lastOutgoingMessage.roomid === room.id) {
					this.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.error.startsWith('/tour rules - Access denied')) {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'tournament-rules' &&
					this.lastOutgoingMessage.roomid === room.id) {
					this.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.error.startsWith('/tour forcepublic - Access denied') ||
				messageArguments.error.startsWith('Tournament battles are already being forced public') ||
				messageArguments.error.startsWith('Tournament battles are not being forced public')) {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'tournament-forcepublic' &&
					this.lastOutgoingMessage.roomid === room.id) {
					this.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.error.startsWith('/tour modjoin - Access denied') ||
				messageArguments.error.startsWith('Modjoining is already not allowed for this tournament') ||
				messageArguments.error.startsWith('Modjoining is already allowed for this tournament')) {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'tournament-modjoin' &&
					this.lastOutgoingMessage.roomid === room.id) {
					this.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.error.startsWith('/tour scouting - Access denied') ||
				messageArguments.error.startsWith('Scouting for this tournament is already set to allowed') ||
				messageArguments.error.startsWith('Scouting for this tournament is already disabled')) {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'tournament-scouting' &&
					this.lastOutgoingMessage.roomid === room.id) {
					this.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.error.startsWith('/tour autostart - Access denied') ||
				messageArguments.error.startsWith('The tournament is already set to autostart when the player cap is reached') ||
				messageArguments.error.startsWith('The automatic tournament start timer is already off')) {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'tournament-autostart' &&
					this.lastOutgoingMessage.roomid === room.id) {
					this.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.error.startsWith('/tour autodq - Access denied') ||
				messageArguments.error.startsWith('The automatic tournament disqualify timer is already set to ')) {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'tournament-autodq' &&
					this.lastOutgoingMessage.roomid === room.id) {
					this.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.error.startsWith('This user is currently blocking PMs') ||
				messageArguments.error.startsWith('This user is currently locked, so you cannot send them HTML')) {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.roomid === room.id &&
					(this.lastOutgoingMessage.type === 'pm-html' || this.lastOutgoingMessage.type === 'pm-uhtml' ||
					this.lastOutgoingMessage.type === 'htmlpage' || this.lastOutgoingMessage.type === 'htmlpageselector' ||
					this.lastOutgoingMessage.type === 'highlight-htmlpage' || this.lastOutgoingMessage.type === 'closehtmlpage')) {
					this.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.error.startsWith('A group chat named ')) {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'create-groupchat') {
					this.clearLastOutgoingMessage(now);
				}
			} else if (this.isDataCommandError(messageArguments.error)) {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'chat' && this.lastOutgoingMessage.roomid === room.id &&
					this.isDataRollCommand(this.lastOutgoingMessage.text!)) {
					this.clearLastOutgoingMessage(now);
					room.say(Tools.escapeHTML(messageArguments.error));
				}
			} else if (this.isHangmanCommandError(messageArguments.error)) {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'hangman-start' &&
					this.lastOutgoingMessage.roomid === room.id) {
					const user = Users.get(this.lastOutgoingMessage.userid!);
					this.clearLastOutgoingMessage(now);
					if (user) user.say("Hangman error: " + Tools.escapeHTML(messageArguments.error));
				}
			} else {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.roomid === room.id) {
					Tools.logMessage("Error message in " + room.title + ": " + messageArguments.error);
				}
			}

			break;
		}

		case 'raw':
		case 'html': {
			const messageArguments: IClientMessageTypes['html'] = {
				html: Tools.unescapeHTML(messageParts.join("|")),
			};

			room.addHtmlChatLog(messageArguments.html);

			const htmlId = Tools.toId(messageArguments.html);
			if (htmlId in room.htmlMessageListeners) {
				room.htmlMessageListeners[htmlId](now);
				delete room.htmlMessageListeners[htmlId];
			}

			if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'chat-html' &&
				Tools.toId(this.lastOutgoingMessage.html) === htmlId) {
				this.clearLastOutgoingMessage(now);
			}

			if (messageArguments.html === '<strong class="message-throttle-notice">Your message was not sent because you\'ve been ' +
				'typing too quickly.</strong>') {
				Tools.logMessage("Typing too quickly;\nBase throttle: " + this.sendThrottle + "ms\nQueued outgoing messages: " +
					this.outgoingMessageQueue.length +
					"\nOutgoing message measurements: [" + this.outgoingMessageMeasurementsInfo.join(", ") + "]" +
					(this.lastOutgoingMessage && this.lastOutgoingMessage.sentTime ?
					"\n\nMessage sent at: " + new Date(this.lastOutgoingMessage.sentTime).toTimeString() + "; " +
					"Processing time last measured at: " + new Date(this.lastProcessingTimeCheck).toTimeString() + "; " +
					"Message: " + JSON.stringify(this.lastOutgoingMessage) : ""));
				this.startSendTimeout(this.chatQueueSendThrottle);
			} else if (messageArguments.html.startsWith('<div class="broadcast-red"><strong>Moderated chat was set to ')) {
				room.setModchat(messageArguments.html.split('<div class="broadcast-red">' +
					'<strong>Moderated chat was set to ')[1].split('!</strong>')[0]);
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'modchat' &&
					this.lastOutgoingMessage.modchatLevel === room.modchat) {
					this.clearLastOutgoingMessage(now);
				}
			} else if (messageArguments.html.startsWith('<div class="broadcast-red"><strong>This battle is invite-only!</strong>') ||
				messageArguments.html.startsWith('<div class="broadcast-red"><strong>This room is now invite only!</strong>')) {
				room.inviteOnlyBattle = true;
			} else if (messageArguments.html.startsWith('<div class="broadcast-blue"><strong>Moderated chat was disabled!</strong>')) {
				room.setModchat('off');
			} else if (messageArguments.html.startsWith('<div class="infobox infobox-limited">This tournament includes:<br />')) {
				if (room.tournament) {
					if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'tournament-rules' &&
						this.lastOutgoingMessage.roomid === room.id) {
						this.clearLastOutgoingMessage(now);
					}

					const separatedCustomRules: ISeparatedCustomRules = {
						addedbans: [], removedbans: [], addedrestrictions: [], addedrules: [], removedrules: [],
					};
					const lines = messageArguments.html.substr(0, messageArguments.html.length - 6)
						.split('<div class="infobox infobox-limited">This tournament includes:<br />')[1].split('<br />');
					let currentCategory: 'addedbans' | 'removedbans' | 'addedrestrictions' | 'addedrules' | 'removedrules' = 'addedbans';
					for (let line of lines) {
						line = line.trim();
						if (line.startsWith('<b>')) {
							const category = Tools.toId(line.split('<b>')[1].split('</b>')[0]);
							if (category === 'addedbans' || category === 'removedbans' ||
								category === 'addedrestrictions' || category === 'addedrules' || category === 'removedrules') {
								currentCategory = category;
							}
						}
						if (line.includes('</b> - ')) line = line.split('</b> - ')[1].trim();
						separatedCustomRules[currentCategory] = line.split(",").map(x => x.trim());
					}

					room.tournament.format = Dex.getExistingFormat(Dex.joinNameAndCustomRules(room.tournament.format,
						Dex.combineCustomRules(separatedCustomRules)));
					room.tournament.setCustomFormatName();
				}
			} else if (messageArguments.html.startsWith('<div class="broadcast-green"><p style="text-align:left;font-weight:bold;' +
				'font-size:10pt;margin:5px 0 0 15px">The word has been guessed. Congratulations!</p>')) {
				if (room.userHostedGame) {
					const winner = messageArguments.html.split('<br />Winner: ')[1].split('</td></tr></table></div>')[0].trim();
					if (Tools.isUsernameLength(winner)) {
						room.userHostedGame.useHostCommand("addgamepoint", winner);
					}
				}

				room.serverHangman = null;
			} else if (messageArguments.html.startsWith('<div class="broadcast-red"><p style="text-align:left;font-weight:bold;' +
				'font-size:10pt;margin:5px 0 0 15px">Too bad! The mon has been hanged.</p>')) {
				room.serverHangman = null;
			} else if (messageArguments.html === "<b>The tournament's custom rules were cleared.</b>") {
				if (room.tournament) {
					room.tournament.format = Dex.getExistingFormat(room.tournament.format.name);
					room.tournament.setCustomFormatName();
				}
			} else if (messageArguments.html.startsWith('<div class="message"><ul class="utilichart"><li class="result">') ||
				messageArguments.html.startsWith('<ul class="utilichart"><li class="result">')) {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'chat' && this.lastOutgoingMessage.roomid === room.id &&
					this.isDataRollCommand(this.lastOutgoingMessage.text!)) {
					this.clearLastOutgoingMessage(now);
				}
			}
			break;
		}

		case 'pagehtml': {
			if (room.id === 'view-filters') {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'filters-view') {
					this.clearLastOutgoingMessage(now);
				}

				let battleFilterRegularExpressions: RegExp[] | null = null;
				let chatFilterRegularExpressions: RegExp[] | null = null;
				let evasionFilterRegularExpressions: RegExp[] | null = null;
				const messageArguments: IClientMessageTypes['pagehtml'] = {
					html: Tools.unescapeHTML(messageParts.join("|")),
				};
				if (messageArguments.html.includes('<table>')) {
					const table = messageArguments.html.split('<table>')[1].split('</table>')[0];
					const rows = table.split("<tr>");
					let currentHeader = '';
					let shortener = false;
					let evasion = false;
					let battleFilter = false;

					for (const row of rows) {
						if (!row) continue;
						if (row.startsWith('<th colspan="2"><h3>')) {
							currentHeader = row.split('<th colspan="2"><h3>')[1].split('</h3>')[0].split(' <span ')[0];
							shortener = currentHeader === 'URL Shorteners';
							evasion = currentHeader === 'Filter Evasion Detection';
							battleFilter = currentHeader === 'Filtered in battles';
						} else if (row.startsWith('<td><abbr') && currentHeader !== 'Whitelisted names' &&
							currentHeader !== 'Filtered in names') {
							const word = row.split('<code>')[1].split('</code>')[0].trim();

							let replacementWord = row.split("</abbr>")[1];
							const reasonIndex = replacementWord.indexOf('</small>');
							if (reasonIndex !== -1) replacementWord = replacementWord.substr(reasonIndex + 8);
							const hasReplacement = replacementWord.includes(" &rArr; ");

							let regularExpression: RegExp | undefined;
							try {
								if (evasion) {
									regularExpression = constructEvasionRegex(word);
								} else {
									regularExpression = new RegExp(shortener ? '\\b' + word : word, hasReplacement ? 'igu' : 'iu');
								}
							} catch (e) {
								console.log(e);
								Tools.logError(e as NodeJS.ErrnoException);
							}

							if (regularExpression) {
								if (evasion) {
									if (!evasionFilterRegularExpressions) evasionFilterRegularExpressions = [];
									evasionFilterRegularExpressions.push(regularExpression);
								} else if (battleFilter) {
									if (!battleFilterRegularExpressions) battleFilterRegularExpressions = [];
									battleFilterRegularExpressions.push(regularExpression);
								} else {
									if (!chatFilterRegularExpressions) chatFilterRegularExpressions = [];
									chatFilterRegularExpressions.push(regularExpression);
								}
							}
						}
					}
				}

				this.battleFilterRegularExpressions = battleFilterRegularExpressions;
				this.chatFilterRegularExpressions = chatFilterRegularExpressions;
				this.evasionFilterRegularExpressions = evasionFilterRegularExpressions;
			}
			break;
		}

		case 'uhtmlchange':
		case 'uhtml': {
			const messageArguments: IClientMessageTypes['uhtml'] = {
				name: messageParts[0],
				html: Tools.unescapeHTML(messageParts.slice(1).join("|")),
			};

			const uhtmlId = Tools.toId(messageArguments.name);
			const htmlId = Tools.toId(messageArguments.html);
			if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'chat-uhtml' &&
				Tools.toId(this.lastOutgoingMessage.uhtmlName) === uhtmlId &&
				Tools.toId(this.lastOutgoingMessage.html) === htmlId) {
				this.clearLastOutgoingMessage(now);
			} else if (this.lastOutgoingMessage && messageArguments.name.startsWith('hangman') &&
				(this.lastOutgoingMessage.type === 'hangman-start' || (this.lastOutgoingMessage.type === 'hangman-end' &&
				messageArguments.html === '<div class="infobox">(The game of hangman was ended.)</div>'))) {
				this.clearLastOutgoingMessage(now);
			}

			if (uhtmlId in room.uhtmlMessageListeners && htmlId in room.uhtmlMessageListeners[uhtmlId]) {
				room.uhtmlMessageListeners[uhtmlId][htmlId](now);
				room.removeUhtmlMessageListener(uhtmlId, htmlId);
			}

			if (messageType !== 'uhtmlchange') room.addUhtmlChatLog(messageArguments.name, messageArguments.html);

			break;
		}

		case 'tempnotify': {
			const messageArguments: IClientMessageTypes['tempnotify'] = {
				id: messageParts[0],
				title: messageParts[1],
				message: messageParts[2],
				highlight: messageParts[3],
			};

			if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'notifyrank' &&
				this.lastOutgoingMessage.roomid === room.id && this.lastOutgoingMessage.notifyId === messageArguments.id &&
				messageArguments.title.startsWith(this.lastOutgoingMessage.notifyTitle!) &&
				this.lastOutgoingMessage.notifyMessage === messageArguments.message) {
				this.clearLastOutgoingMessage(now);
			}
			break;
		}

		case 'tempnotifyoff': {
			const messageArguments: IClientMessageTypes['tempnotifyoff'] = {
				id: messageParts[0],
			};

			if (this.lastOutgoingMessage && this.lastOutgoingMessage.type === 'notifyoffrank' &&
				this.lastOutgoingMessage.roomid === room.id && this.lastOutgoingMessage.notifyId === messageArguments.id) {
				this.clearLastOutgoingMessage(now);
			}
			break;
		}

		/**
		 * Tournament messages
		 */
		case 'tournament': {
			if (!room.tournament && !(room.id in Tournaments.createListeners) &&
				(!Config.allowTournaments || !Config.allowTournaments.includes(room.id))) return;

			const type = messageParts[0] as keyof ITournamentMessageTypes;
			messageParts.shift();
			switch (type) {
			case 'create': {
				const messageArguments: ITournamentMessageTypes['create'] = {
					formatid: messageParts[0],
				};

				const format = Dex.getFormat(messageArguments.formatid);
				if (room.tournament && (!format || room.tournament.format.id !== format.id)) room.tournament.forceEnd();

				if (this.lastOutgoingMessage && this.lastOutgoingMessage.roomid === room.id &&
					this.lastOutgoingMessage.type === 'tournament-create') {
					if (format && format.id === this.lastOutgoingMessage.format!) {
						this.clearLastOutgoingMessage(now);
					}
				}
				break;
			}

			case 'update': {
				const messageArguments: ITournamentMessageTypes['update'] = {
					json: JSON.parse(messageParts.join("|")) as ITournamentUpdateJson,
				};

				if (!room.tournament) Tournaments.createTournament(room, messageArguments.json);

				if (room.tournament) {
					room.tournament.update(messageArguments.json);

					if (messageArguments.json.playerCap && this.lastOutgoingMessage && this.lastOutgoingMessage.roomid === room.id &&
						this.lastOutgoingMessage.type === 'tournament-cap') {
						this.clearLastOutgoingMessage(now);
					} else if (this.lastOutgoingMessage && this.lastOutgoingMessage.roomid === room.id &&
						this.lastOutgoingMessage.type === 'tournament-name' &&
						messageArguments.json.format === this.lastOutgoingMessage.name!) {
						this.clearLastOutgoingMessage(now);
					} else if (this.lastOutgoingMessage && this.lastOutgoingMessage.roomid === room.id &&
						this.lastOutgoingMessage.type === 'tournament-rules' &&
						messageArguments.json.format === room.tournament.format.name + Dex.getDefaultCustomRulesName()) {
						this.clearLastOutgoingMessage(now);
					}
				}
				break;
			}

			case 'updateEnd': {
				if (room.tournament) room.tournament.updateEnd();
				break;
			}

			case 'end': {
				const messageArguments: ITournamentMessageTypes['end'] = {
					json: JSON.parse(messageParts.join("|")) as ITournamentEndJson,
				};

				room.addHtmlChatLog("tournament|end");

				if (!room.tournament) Tournaments.createTournament(room, messageArguments.json);
				if (room.tournament) {
					room.tournament.update(messageArguments.json);
					room.tournament.updateEnd();
					room.tournament.end();
				}

				Tournaments.onTournamentEnd(room, now);
				break;
			}

			case 'forceend': {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.roomid === room.id &&
					this.lastOutgoingMessage.type === 'tournament-end') {
					this.clearLastOutgoingMessage(now);
				}

				room.addHtmlChatLog("tournament|forceend");

				if (room.tournament) room.tournament.forceEnd();

				Tournaments.onTournamentEnd(room, now);
				break;
			}

			case 'autodq': {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.roomid === room.id &&
					this.lastOutgoingMessage.type === 'tournament-autodq') {
					this.clearLastOutgoingMessage(now);
				}

				if (!room.tournament) return;

				const messageArguments: ITournamentMessageTypes['autodq'] = {
					status: messageParts[0],
					time: parseInt(messageParts[1]),
				};

				if (Tools.toId(messageArguments.status) === "on" && !isNaN(messageArguments.time)) {
					room.tournament.setAutoDqMinutes(messageArguments.time / 60 / 1000);
				}

				break;
			}

			case 'autostart': {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.roomid === room.id &&
					this.lastOutgoingMessage.type === 'tournament-autostart') {
					this.clearLastOutgoingMessage(now);
				}
				break;
			}

			case 'scouting': {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.roomid === room.id &&
					this.lastOutgoingMessage.type === 'tournament-scouting') {
					this.clearLastOutgoingMessage(now);
				}
				break;
			}

			case 'start': {
				if (this.lastOutgoingMessage && this.lastOutgoingMessage.roomid === room.id &&
					this.lastOutgoingMessage.type === 'tournament-start') {
					this.clearLastOutgoingMessage(now);
				}

				room.addHtmlChatLog("tournament|start");

				if (room.tournament) room.tournament.start();
				break;
			}

			case 'join': {
				room.addHtmlChatLog("tournament|join");

				if (!room.tournament) return;

				const messageArguments: ITournamentMessageTypes['join'] = {
					username: messageParts[0],
				};
				room.tournament.addPlayer(messageArguments.username);
				break;
			}

			case 'leave':
			case 'disqualify': {
				const messageArguments: ITournamentMessageTypes['leave'] = {
					username: messageParts[0],
				};

				if (type === 'disqualify' && this.lastOutgoingMessage && this.lastOutgoingMessage.roomid === room.id &&
					this.lastOutgoingMessage.type === 'tournament-disqualify' &&
					Tools.toId(messageArguments.username) === this.lastOutgoingMessage.disqualifiedUserid) {
					this.clearLastOutgoingMessage(now);
				}

				room.addHtmlChatLog("tournament|leave");

				if (!room.tournament) return;

				room.tournament.removePlayer(messageArguments.username);
				break;
			}

			case 'battlestart': {
				room.addHtmlChatLog("tournament|battlestart");

				if (!room.tournament) return;

				const messageArguments: ITournamentMessageTypes['battlestart'] = {
					usernameA: messageParts[0],
					usernameB: messageParts[1],
					roomid: messageParts[2],
				};

				room.tournament.onBattleStart(messageArguments.usernameA, messageArguments.usernameB, messageArguments.roomid);
				break;
			}

			case 'battleend': {
				room.addHtmlChatLog("tournament|battleend");

				if (!room.tournament) return;

				const messageArguments: ITournamentMessageTypes['battleend'] = {
					usernameA: messageParts[0],
					usernameB: messageParts[1],
					result: messageParts[2] as 'win' | 'loss' | 'draw',
					score: messageParts[3].split(',') as [string, string],
					recorded: messageParts[4] as 'success' | 'fail',
					roomid: messageParts[5],
				};

				room.tournament.onBattleEnd(messageArguments.usernameA, messageArguments.usernameB, messageArguments.score,
					messageArguments.roomid);
				break;
			}

			case 'error': {
				const messageArguments: ITournamentMessageTypes['error'] = {
					errorType: messageParts[0],
					errorMessage: messageParts[1],
				};

				if (this.lastOutgoingMessage && this.lastOutgoingMessage.roomid === room.id &&
					this.lastOutgoingMessage.type === 'tournament-disqualify' &&
					Tools.toId(messageArguments.errorType) === "alreadydisqualified" &&
					Tools.toId(messageArguments.errorMessage) === this.lastOutgoingMessage.disqualifiedUserid) {
					this.clearLastOutgoingMessage(now);
				}
				break;
			}
			}
			break;
		}

		/**
		 * Battle messages
		 */
		case 'player': {
			const messageArguments: IClientMessageTypes['player'] = {
				slot: messageParts[0],
				username: messageParts[1],
			};

			if (room.tournament) {
				room.tournament.onBattlePlayer(room, messageArguments.slot, messageArguments.username);
			}

			if (room.game) {
				if (room.game.onBattlePlayer) room.game.onBattlePlayer(room, messageArguments.slot, messageArguments.username);
			}
			break;
		}

		case 'teamsize': {
			const messageArguments: IClientMessageTypes['teamsize'] = {
				slot: messageParts[0],
				size: parseInt(messageParts[1]),
			};

			if (room.tournament) {
				room.tournament.onBattleTeamSize(room, messageArguments.slot, messageArguments.size);
			}

			if (room.game) {
				if (room.game.onBattleTeamSize && !room.game.onBattleTeamSize(room, messageArguments.slot, messageArguments.size)) {
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					if (room.game) room.game.leaveBattleRoom(room);
				}
			}
			break;
		}

		case 'teampreview': {
			if (room.game) {
				if (room.game.onBattleTeamPreview && !room.game.onBattleTeamPreview(room)) {
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					if (room.game) room.game.leaveBattleRoom(room);
				}
			}
			break;
		}

		case 'start': {
			if (room.game) {
				if (room.game.onBattleStart && !room.game.onBattleStart(room)) {
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					if (room.game) room.game.leaveBattleRoom(room);
				}
			}
			break;
		}

		case 'poke': {
			const messageArguments: IClientMessageTypes['poke'] = {
				slot: messageParts[0],
				details: messageParts[1],
				item: messageParts[2] === 'item',
			};

			if (room.game) {
				if (room.game.onBattlePokemon && !room.game.onBattlePokemon(room, messageArguments.slot, messageArguments.details,
					messageArguments.item)) {
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					if (room.game) room.game.leaveBattleRoom(room);
				}
			}
			break;
		}

		case 'move': {
			const messageArguments: IClientMessageTypes['move'] = {
				pokemon: messageParts[0],
				move: messageParts[1],
				target: messageParts[2],
			};

			if (room.game) {
				if (room.game.onBattleMove && !room.game.onBattleMove(room, messageArguments.pokemon, messageArguments.move,
					messageArguments.target)) {
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					if (room.game) room.game.leaveBattleRoom(room);
				}
			}
			break;
		}

		case 'faint': {
			const messageArguments: IClientMessageTypes['faint'] = {
				pokemon: messageParts[0],
			};

			if (room.tournament) {
				room.tournament.onBattleFaint(room, messageArguments.pokemon);
			}

			if (room.game) {
				if (room.game.onBattleFaint && !room.game.onBattleFaint(room, messageArguments.pokemon)) {
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					if (room.game) room.game.leaveBattleRoom(room);
				}
			}
			break;
		}

		case 'drag':
		case 'switch': {
			const messageArguments: IClientMessageTypes['switch'] = {
				pokemon: messageParts[0],
				details: messageParts[1],
				hpStatus: messageParts[2].split(" ") as [string, string],
			};

			if (room.game) {
				if (room.game.onBattleSwitch && !room.game.onBattleSwitch(room, messageArguments.pokemon, messageArguments.details,
					messageArguments.hpStatus)) {
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					if (room.game) room.game.leaveBattleRoom(room);
				}
			}
			break;
		}

		case '-message': {
			const messageArguments: IClientMessageTypes['-message'] = {
				message: messageParts[0],
			};

			if (room.game) {
				if (room.game.onBattleMessage && !room.game.onBattleMessage(room, messageArguments.message)) {
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					if (room.game) room.game.leaveBattleRoom(room);
				}
			}

			break;
		}

		case 'win': {
			const messageArguments: IClientMessageTypes['win'] = {
				username: messageParts[0],
			};

			if (room.game) {
				if (room.game.onBattleWin) room.game.onBattleWin(room, messageArguments.username);
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				if (room.game) room.game.leaveBattleRoom(room);
			}

			break;
		}

		case 'tie': {
			if (room.game) {
				if (room.game.onBattleTie) room.game.onBattleTie(room);
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				if (room.game) room.game.leaveBattleRoom(room);
			}

			break;
		}

		case 'expire': {
			if (room.game && room.game.onBattleExpire) {
				room.game.onBattleExpire(room);
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				if (room.game) room.game.leaveBattleRoom(room);
			}
			break;
		}
		}
	}

	private parseChatMessage(room: Room, user: User, message: string, now: number): void {
		CommandParser.parse(room, user, message, now);

		const lowerCaseMessage = message.toLowerCase();

		// unlink tournament battle replays
		if (room.unlinkTournamentReplays && room.tournament && !room.tournament.format.team &&
			lowerCaseMessage.includes(this.replayServerAddress) && !user.hasRank(room, 'voice')) {
			const battle = this.extractBattleId(lowerCaseMessage);
			if (battle && room.tournament.battleRooms.includes(battle.publicId)) {
				room.warn(user, "Please do not link to tournament battles");
			}
		}

		// unlink game battles
		if (room.game && room.game.battleRooms && (lowerCaseMessage.includes(this.replayServerAddress) ||
			lowerCaseMessage.includes(this.server)) && !user.hasRank(room, 'voice')) {
			const battle = this.extractBattleId(lowerCaseMessage);
			if (battle && room.game.battleRooms.includes(battle.publicId)) {
				room.warn(user, "Please do not link to game battles");
			}
		}

		// unlink unapproved Challonge tournaments
		if (room.unlinkChallongeLinks && lowerCaseMessage.includes('challonge.com/')) {
			const links: string[] = [];
			const possibleLinks = message.split(" ");
			for (const possibleLink of possibleLinks) {
				const link = Tools.getChallongeUrl(possibleLink);
				if (link) links.push(link);
			}

			const database = Storage.getDatabase(room);
			let rank: GroupName = 'voice';
			if (Config.userHostedTournamentRanks && room.id in Config.userHostedTournamentRanks) {
				rank = Config.userHostedTournamentRanks[room.id].review;
			}

			const authOrTHC = user.hasRank(room, rank) || (database.thcWinners && user.id in database.thcWinners);
			outer:
			for (const link of links) {
				if (room.approvedUserHostedTournaments) {
					for (const i in room.approvedUserHostedTournaments) {
						if (room.approvedUserHostedTournaments[i].urls.includes(link)) {
							if (!authOrTHC && room.approvedUserHostedTournaments[i].hostId !== user.id) {
								room.warn(user, "Please do not post links to other hosts' tournaments");
							}
							break outer;
						}
					}
				}

				if (authOrTHC) {
					if (!room.approvedUserHostedTournaments) room.approvedUserHostedTournaments = {};
					room.approvedUserHostedTournaments[link] = {
						hostName: user.name,
						hostId: user.id,
						startTime: now,
						approvalStatus: 'approved',
						reviewer: user.id,
						urls: [link],
					};
				} else {
					for (const i in room.newUserHostedTournaments) {
						if (room.newUserHostedTournaments[i].urls.includes(link)) {
							if (room.newUserHostedTournaments[i].hostId !== user.id) {
								room.warn(user, "Please do not post links to other hosts' tournaments");
							} else if (room.newUserHostedTournaments[i].approvalStatus === 'changes-requested') {
								let name = room.newUserHostedTournaments[i].reviewer;
								const reviewer = Users.get(name);
								if (reviewer) name = reviewer.name;
								room.warn(user, name + " has requested changes for your tournament and you " +
									"must wait for them to be approved");
							} else {
								room.warn(user, "You must wait for a staff member to approve your tournament");
							}
							break outer;
						}
					}
					room.warn(user, "Your tournament must be approved by a staff member");
					user.say('Use the command ``' + Config.commandCharacter + 'gettourapproval ' + room.id + ', __bracket link__, ' +
						'__signup link__`` to get your tournament approved (insert your actual links).');
					break;
				}
			}
		}

		// per-game parsing
		if (room.game && room.game.parseChatMessage) room.game.parseChatMessage(user, message);
	}

	private parseServerGroups(): void {
		this.serverGroups = {};

		let ranking = this.serverGroupsResponse.length;
		for (const group of this.serverGroupsResponse) {
			this.serverGroups[group.symbol] = Object.assign({ranking}, group);
			ranking--;

			if (group.name === null) {
				this.groupSymbols.regularuser = group.symbol;
			} else {
				this.groupSymbols[Tools.toId(group.name) as GroupName] = group.symbol;
			}
		}

		if (this.server === Tools.mainServer) {
			if (this.serverGroups[DEFAULT_GROUP_SYMBOLS.star].ranking < this.serverGroups[DEFAULT_GROUP_SYMBOLS.prizewinner].ranking) {
				const prizeWinner = this.serverGroups[DEFAULT_GROUP_SYMBOLS.prizewinner].ranking;
				this.serverGroups[DEFAULT_GROUP_SYMBOLS.prizewinner].ranking = this.serverGroups[DEFAULT_GROUP_SYMBOLS.star].ranking;
				this.serverGroups[DEFAULT_GROUP_SYMBOLS.star].ranking = prizeWinner;
			}
		} else {
			if (!(DEFAULT_GROUP_SYMBOLS.star in this.serverGroups)) {
				this.serverGroups[DEFAULT_GROUP_SYMBOLS.star] = {
					name: 'Star',
					ranking: this.serverGroups[DEFAULT_GROUP_SYMBOLS.voice].ranking - 1,
					symbol: DEFAULT_GROUP_SYMBOLS.star,
					type: 'normal',
				};
			}
		}
	}

	private clearLastOutgoingMessage(responseTime?: number): void {
		if (this.lastOutgoingMessage) {
			if (this.lastOutgoingMessage.measure && this.lastOutgoingMessage.sentTime && responseTime) {
				const measurement = responseTime - this.lastOutgoingMessage.sentTime;
				if (this.outgoingMessageMeasurements.length > 30) {
					this.outgoingMessageMeasurements.pop();
				}

				if (this.outgoingMessageMeasurementsInfo.length > 30) {
					this.outgoingMessageMeasurementsInfo.pop();
				}

				this.outgoingMessageMeasurements.unshift(measurement);
				this.outgoingMessageMeasurementsInfo.unshift(measurement + " (" + this.lastOutgoingMessage.type + " in " +
					(this.lastOutgoingMessage.roomid || this.lastOutgoingMessage.userid) + ")");

				this.lastMeasuredMessage = this.lastOutgoingMessage;
				this.lastProcessingTimeCheck = responseTime;

				let sendTimeout: number;
				if (this.lastOutgoingMessage.slowerCommand) {
					sendTimeout = this.lastSendTimeoutAfterMeasure || this.sendThrottle;
				} else if (measurement >= this.sendThrottle) {
					const serverQueue = Math.ceil(measurement / this.sendThrottle);
					sendTimeout = this.sendThrottle + (this.sendThrottle * serverQueue);
				} else {
					sendTimeout = this.sendThrottle;
				}

				this.lastSendTimeoutAfterMeasure = sendTimeout;
				this.startSendTimeout(sendTimeout);
			}

			this.lastOutgoingMessage = null;
		}
	}

	private clearSendTimeout(): void {
		if (this.sendTimeout) {
			if (this.sendTimeout !== true) clearTimeout(this.sendTimeout);
			delete this.sendTimeout;
		}
	}

	private startSendTimeout(time: number): void {
		this.clearSendTimeout();
		if (this.reloadInProgress) {
			this.sendTimeout = true;
			return;
		}

		this.sendTimeoutDuration = time;
		this.sendTimeout = setTimeout(() => {
			if (this.reloadInProgress) {
				this.sendTimeout = true;
				return;
			}

			delete this.sendTimeout;

			if (this.lastOutgoingMessage) {
				if (this.lastOutgoingMessage.measure) {
					Tools.logMessage("Last outgoing message not measured (" + Date.now() + "): " +
						JSON.stringify(this.lastOutgoingMessage) + "\n\nSend timeout value: " + time +
						"\nLast measured send timeout: " + this.lastSendTimeoutAfterMeasure +
						"\nOutgoing message measurements: [" + this.outgoingMessageMeasurementsInfo.join(", ") + "]" +
						(this.lastMeasuredMessage ? "\n\nLast measured message (" + this.lastProcessingTimeCheck + "): " +
						JSON.stringify(this.lastMeasuredMessage) : ""));
				}
				this.lastOutgoingMessage = null;

				this.startSendTimeout(this.chatQueueSendThrottle);
				return;
			}

			// prevent infinite loop with outgoingMessageQueue
			if (this.pauseOutgoingMessages) return;

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			while (!this.sendTimeout && this.outgoingMessageQueue.length) {
				this.send(this.outgoingMessageQueue.shift()!);
			}
		}, time);
	}

	private setRetryLoginTimeout(sessionUpkeep?: boolean): void {
		console.log((sessionUpkeep ? 'Trying' : 'Retrying') + ' login in' + RELOGIN_SECONDS + ' seconds');

		if (this.retryLoginTimeout) clearTimeout(this.retryLoginTimeout);
		this.retryLoginTimeout = setTimeout(() => this.login(), RELOGIN_SECONDS * 1000);
	}

	private checkLoginSession(): void {
		const globalDatabase = Storage.getGlobalDatabase();
		if (!Config.password || !globalDatabase.loginSessionCookie || globalDatabase.loginSessionCookie.userid !== Users.self.id) {
			this.login();
			return;
		}

		const options: ILoginOptions = {
			hostname: this.loginServerHostname,
			path: this.loginServerPath,
			agent: false,
			method: 'POST',
		};

		const postData =  querystring.stringify({
			'act': 'upkeep',
			'challstr': this.challstr,
		});

		options.headers = {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': postData.length,
			'cookie': globalDatabase.loginSessionCookie.cookie,
		};

		const request = https.request(options, response => {
			response.setEncoding('utf8');
			let data = '';
			response.on('data', chunk => {
				data += chunk;
			});
			response.on('end', () => {
				if (!data) {
					console.log('Did not receive a response from the login server.');
					this.login();
					return;
				}

				if (data.charAt(0) === ']') data = data.substr(1);

				let sessionAssertion: string | undefined;
				try {
					const sessionResponse = JSON.parse(data) as {assertion?: string; username?: string, loggedin?: boolean};
					if (sessionResponse.username && sessionResponse.loggedin) {
						sessionAssertion = sessionResponse.assertion;
					}
				} catch (e) {
					console.log('Error parsing session upkeep response:\n' + (e as Error).stack);
					this.setRetryLoginTimeout(true);
					return;
				}

				if (!sessionAssertion || !this.verifyLoginAssertion(sessionAssertion, true)) {
					delete globalDatabase.loginSessionCookie;
					this.login();
				}
			});
		});

		request.on('error', error => {
			console.log('Error in session upkeep call: ' + error.stack);
			this.setRetryLoginTimeout(true);
		});

		if (postData) request.write(postData);
		request.end();
	}

	private login(): void {
		if (this.retryLoginTimeout) clearTimeout(this.retryLoginTimeout);

		const options: ILoginOptions = {
			hostname: this.loginServerHostname,
			path: this.loginServerPath,
			agent: false,
			method: '',
		};

		let postData = '';
		if (Config.password) {
			options.method = 'POST';
			postData = querystring.stringify({
				'serverid': this.serverId,
				'act': 'login',
				'name': Config.username,
				'pass': Config.password,
				'challstr': this.challstr,
			});
			options.headers = {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': postData.length,
			};
		} else {
			options.method = 'GET';
			options.path += '?' + querystring.stringify({
				'serverid': this.serverId,
				'act': 'getassertion',
				'userid': Tools.toId(Config.username),
				'challstr': this.challstr,
			});
		}

		const request = https.request(options, response => {
			response.setEncoding('utf8');
			let data = '';
			response.on('data', chunk => {
				data += chunk;
			});
			response.on('end', () => {
				if (!data) {
					console.log('Did not receive a response from the login server.');
					this.setRetryLoginTimeout();
					return;
				}

				if (response.headers['set-cookie']) {
					for (const cookie of response.headers['set-cookie']) {
						const equalsIndex = cookie.indexOf('=');
						if (equalsIndex !== -1 && cookie.substr(0, equalsIndex) === 'sid') {
							let value = cookie;
							const semiColonIndex = value.indexOf(';');
							if (semiColonIndex !== -1) value = value.substr(0, semiColonIndex);

							Storage.getGlobalDatabase().loginSessionCookie = {cookie: value, userid: Users.self.id};
							Storage.tryExportGlobalDatabase();
						}
					}
				}

				if (data.charAt(0) === ']') data = data.substr(1);

				let loginAssertion = '';
				try {
					const loginResponse = JSON.parse(data) as {assertion: string; curuser?: {loggedin: boolean}};
					if (Config.password && (!loginResponse.curuser || !loginResponse.curuser.loggedin)) {
						console.log('Failed to log in.');
						this.setRetryLoginTimeout();
						return;
					}

					loginAssertion = loginResponse.assertion;
				} catch (e) {
					console.log('Error parsing login response:\n' + (e as Error).stack);
					this.setRetryLoginTimeout();
					return;
				}

				this.verifyLoginAssertion(loginAssertion);
			});
		});

		request.on('error', error => {
			console.log('Error in login call: ' + error.stack);
			this.setRetryLoginTimeout();
		});

		if (postData) request.write(postData);
		request.end();
	}

	private verifyLoginAssertion(assertion: string, sessionUpkeep?: boolean): boolean {
		if (assertion.slice(0, 14).toLowerCase() === '<!doctype html') {
			const endIndex = assertion.indexOf('>');
			if (endIndex !== -1) assertion = assertion.slice(endIndex + 1);
		}
		if (assertion.charAt(0) === '\r') assertion = assertion.slice(1);
		if (assertion.charAt(0) === '\n') assertion = assertion.slice(1);
		if (assertion.indexOf('<') >= 0) {
			const message = 'Something is interfering with the connection to the login server.';
			if (sessionUpkeep) {
				console.log(message + ' (session upkeep)');
			} else {
				console.log(message);
				this.setRetryLoginTimeout();
			}
			return false;
		}

		if (assertion.substr(0, 2) === ';;') {
			if (sessionUpkeep) {
				console.log('Failed to check session: invalid cookie');
				return false;
			} else {
				console.log('Failed to log in: invalid username or password');
				process.exit();
			}
		} else if (assertion.indexOf('\n') >= 0 || !assertion) {
			const message = 'Something is interfering with the connection to the login server.';
			if (sessionUpkeep) {
				console.log(message + ' (session upkeep)');
			} else {
				console.log(message);
				this.setRetryLoginTimeout();
			}
			return false;
		} else {
			this.send({
				message: '|/trn ' + Config.username + ',0,' + assertion,
				type: 'trn',
				measure: true,
			});
			return true;
		}
	}
}

export const instantiate = (): void => {
	let oldClient = global.Client as Client | undefined;
	if (oldClient) {
		// @ts-expect-error
		oldClient.beforeReload();
	}

	global.Client = new Client();

	if (oldClient) {
		// @ts-expect-error
		global.Client.onReload(oldClient);
		oldClient = undefined;
	}
};

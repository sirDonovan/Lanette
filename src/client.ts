import https = require('https');
import querystring = require('querystring');
import url = require('url');
import websocket = require('websocket');

import { Room, RoomType } from './rooms';
import { IClientMessageTypes, IRoomInfoResponse, IServerGroup, ITournamentMessageTypes, IUserDetailsResponse, ServerGroupData } from './types/client-message-types';
import { ISeparatedCustomRules } from './types/in-game-data-types';
import { User } from './users';

export type GroupName = 'voice' | 'bot' | 'driver' | 'moderator' | 'roomowner' | 'locked';

const MAIN_HOST = "sim3.psim.us";
const RELOGIN_SECONDS = 60;
const SEND_THROTTLE = 800;
const BOT_GREETING_COOLDOWN = 6 * 60 * 60 * 1000;
const DEFAULT_SERVER_GROUPS: ServerGroupData[] = [
	{
		"symbol": "~",
		"name": "Administrator",
		"type": "leadership",
	},
	{
		"symbol": "&",
		"name": "Leader",
		"type": "leadership",
	},
	{
		"symbol": "#",
		"name": "Room Owner",
		"type": "leadership",
	},
	{
		"symbol": "★",
		"name": "Host",
		"type": "leadership",
	},
	{
		"symbol": "@",
		"name": "Moderator",
		"type": "staff",
	},
	{
		"symbol": "%",
		"name": "Driver",
		"type": "staff",
	},
	{
		"symbol": "☆",
		"name": "Player",
		"type": "normal",
	},
	{
		"symbol": "*",
		"name": "Bot",
		"type": "normal",
	},
	{
		"symbol": "+",
		"name": "Voice",
		"type": "normal",
	},
	{
		"symbol": " ",
		"name": null,
		"type": "normal",
	},
	{
		"symbol": "‽",
		"name": "Locked",
		"type": "punishment",
	},
	{
		"symbol": "!",
		"name": "Muted",
		"type": "punishment",
	},
];

// Substitution dictionary adapted from https://github.com/ThreeLetters/NoSwearingPlease/blob/master/index.js, licensed under MIT.
const EVASION_DETECTION_SUBSTITUTIONS: Dict<string[]> = {
	"a": ["a", "4", "@", "á", "â", "ã", "à", "ᗩ", "A", "ⓐ", "Ⓐ", "α", "͏", "₳", "ä", "Ä", "Ꮧ", "λ", "Δ", "Ḁ", "Ꭺ", "ǟ", "̾", "ａ", "Ａ", "ᴀ", "ɐ", "🅐", "𝐚", "𝐀", "𝘢", "𝘈", "𝙖", "𝘼", "𝒶", "𝓪", "𝓐", "𝕒", "𝔸", "𝔞", "𝔄", "𝖆", "𝕬", "🄰", "🅰", "𝒜", "𝚊", "𝙰", "ꍏ", "а"],
	"b": ["b", "8", "ᗷ", "B", "ⓑ", "Ⓑ", "в", "฿", "ḅ", "Ḅ", "Ᏸ", "ϐ", "Ɓ", "ḃ", "Ḃ", "ɮ", "ｂ", "Ｂ", "ʙ", "🅑", "𝐛", "𝐁", "𝘣", "𝘉", "𝙗", "𝘽", "𝒷", "𝓫", "𝓑", "𝕓", "𝔹", "𝔟", "𝔅", "𝖇", "𝕭", "🄱", "🅱", "𝐵", "Ⴆ", "𝚋", "𝙱", "♭", "b"],
	"c": ["c", "ç", "ᑕ", "C", "ⓒ", "Ⓒ", "¢", "͏", "₵", "ċ", "Ċ", "ፈ", "ς", "ḉ", "Ḉ", "Ꮯ", "ƈ", "̾", "ｃ", "Ｃ", "ᴄ", "ɔ", "🅒", "𝐜", "𝐂", "𝘤", "𝘊", "𝙘", "𝘾", "𝒸", "𝓬", "𝓒", "𝕔", "ℂ", "𝔠", "ℭ", "𝖈", "𝕮", "🄲", "🅲", "𝒞", "𝚌", "𝙲", "☾", "с"],
	"d": ["d", "ᗪ", "D", "ⓓ", "Ⓓ", "∂", "Đ", "ď", "Ď", "Ꮄ", "Ḋ", "Ꭰ", "ɖ", "ｄ", "Ｄ", "ᴅ", "🅓", "𝐝", "𝐃", "𝘥", "𝘋", "𝙙", "𝘿", "𝒹", "𝓭", "𝓓", "𝕕", "​", "𝔡", "𝖉", "𝕯", "🄳", "🅳", "𝒟", "ԃ", "𝚍", "𝙳", "◗", "ⅾ"],
	"e": ["e", "3", "é", "ê", "E", "ⓔ", "Ⓔ", "є", "͏", "Ɇ", "ệ", "Ệ", "Ꮛ", "ε", "Σ", "ḕ", "Ḕ", "Ꭼ", "ɛ", "̾", "ｅ", "Ｅ", "ᴇ", "ǝ", "🅔", "𝐞", "𝐄", "𝘦", "𝘌", "𝙚", "𝙀", "ℯ", "𝓮", "𝓔", "𝕖", "𝔻", "𝔢", "𝔇", "𝖊", "𝕰", "🄴", "🅴", "𝑒", "𝐸", "ҽ", "𝚎", "𝙴", "€", "е"],
	"f": ["f", "ᖴ", "F", "ⓕ", "Ⓕ", "₣", "ḟ", "Ḟ", "Ꭶ", "ғ", "ʄ", "ｆ", "Ｆ", "ɟ", "🅕", "𝐟", "𝐅", "𝘧", "𝘍", "𝙛", "𝙁", "𝒻", "𝓯", "𝓕", "𝕗", "𝔼", "𝔣", "𝔈", "𝖋", "𝕱", "🄵", "🅵", "𝐹", "ϝ", "𝚏", "𝙵", "Ϝ", "f"],
	"g": ["g", "q", "6", "9", "G", "ⓖ", "Ⓖ", "͏", "₲", "ġ", "Ġ", "Ꮆ", "ϑ", "Ḡ", "ɢ", "̾", "ｇ", "Ｇ", "ƃ", "🅖", "𝐠", "𝐆", "𝘨", "𝘎", "𝙜", "𝙂", "ℊ", "𝓰", "𝓖", "𝕘", "𝔽", "𝔤", "𝔉", "𝖌", "𝕲", "🄶", "🅶", "𝑔", "𝒢", "ɠ", "𝚐", "𝙶", "❡", "ց"],
	"h": ["h", "ᕼ", "H", "ⓗ", "Ⓗ", "н", "Ⱨ", "ḧ", "Ḧ", "Ꮒ", "ɦ", "ｈ", "Ｈ", "ʜ", "ɥ", "🅗", "𝐡", "𝐇", "𝘩", "𝘏", "𝙝", "𝙃", "𝒽", "𝓱", "𝓗", "𝕙", "𝔾", "𝔥", "𝔊", "𝖍", "𝕳", "🄷", "🅷", "𝐻", "ԋ", "𝚑", "𝙷", "♄", "h"],
	"i": ["i", "!", "l", "1", "í", "I", "ⓘ", "Ⓘ", "ι", "͏", "ł", "ï", "Ï", "Ꭵ", "ḭ", "Ḭ", "ɨ", "̾", "ｉ", "Ｉ", "ɪ", "ı", "🅘", "𝐢", "𝐈", "𝘪", "𝘐", "𝙞", "𝙄", "𝒾", "𝓲", "𝓘", "𝕚", "ℍ", "𝔦", "ℌ", "𝖎", "𝕴", "🄸", "🅸", "𝐼", "𝚒", "𝙸", "♗", "і", "¡", "|"],
	"j": ["j", "ᒍ", "J", "ⓙ", "Ⓙ", "נ", "Ꮰ", "ϳ", "ʝ", "ｊ", "Ｊ", "ᴊ", "ɾ", "🅙", "𝐣", "𝐉", "𝘫", "𝘑", "𝙟", "𝙅", "𝒿", "𝓳", "𝓙", "𝕛", "​", "𝔧", "𝖏", "𝕵", "🄹", "🅹", "𝒥", "𝚓", "𝙹", "♪", "ј"],
	"k": ["k", "K", "ⓚ", "Ⓚ", "к", "͏", "₭", "ḳ", "Ḳ", "Ꮶ", "κ", "Ƙ", "ӄ", "̾", "ｋ", "Ｋ", "ᴋ", "ʞ", "🅚", "𝐤", "𝐊", "𝘬", "𝘒", "𝙠", "𝙆", "𝓀", "𝓴", "𝓚", "𝕜", "𝕀", "𝔨", "ℑ", "𝖐", "𝕶", "🄺", "🅺", "𝒦", "ƙ", "𝚔", "𝙺", "ϰ", "k"],
	"l": ["l", "i", "1", "/", "|", "ᒪ", "L", "ⓛ", "Ⓛ", "ℓ", "Ⱡ", "ŀ", "Ŀ", "Ꮭ", "Ḷ", "Ꮮ", "ʟ", "ｌ", "Ｌ", "🅛", "𝐥", "𝐋", "𝘭", "𝘓", "𝙡", "𝙇", "𝓁", "𝓵", "𝓛", "𝕝", "𝕁", "𝔩", "​", "𝖑", "𝕷", "🄻", "🅻", "𝐿", "ʅ", "𝚕", "𝙻", "↳", "ⅼ"],
	"m": ["m", "ᗰ", "M", "ⓜ", "Ⓜ", "м", "͏", "₥", "ṃ", "Ṃ", "Ꮇ", "ϻ", "Μ", "ṁ", "Ṁ", "ʍ", "̾", "ｍ", "Ｍ", "ᴍ", "ɯ", "🅜", "𝐦", "𝐌", "𝘮", "𝘔", "𝙢", "𝙈", "𝓂", "𝓶", "𝓜", "𝕞", "𝕂", "𝔪", "𝔍", "𝖒", "𝕸", "🄼", "🅼", "𝑀", "ɱ", "𝚖", "𝙼", "♔", "ⅿ"],
	"n": ["n", "ñ", "ᑎ", "N", "ⓝ", "Ⓝ", "и", "₦", "ń", "Ń", "Ꮑ", "π", "∏", "Ṇ", "ռ", "ｎ", "Ｎ", "ɴ", "🅝", "𝐧", "𝐍", "𝘯", "𝘕", "𝙣", "𝙉", "𝓃", "𝓷", "𝓝", "𝕟", "𝕃", "𝔫", "𝔎", "𝖓", "𝕹", "🄽", "🅽", "𝒩", "ɳ", "𝚗", "𝙽", "♫", "ո"],
	"o": ["o", "0", "ó", "ô", "õ", "ú", "O", "ⓞ", "Ⓞ", "σ", "͏", "Ø", "ö", "Ö", "Ꭷ", "Θ", "ṏ", "Ṏ", "Ꮎ", "օ", "̾", "ｏ", "Ｏ", "ᴏ", "🅞", "𝐨", "𝐎", "𝘰", "𝘖", "𝙤", "𝙊", "ℴ", "𝓸", "𝓞", "𝕠", "𝕄", "𝔬", "𝔏", "𝖔", "𝕺", "🄾", "🅾", "𝑜", "𝒪", "𝚘", "𝙾", "⊙", "ο"],
	"p": ["p", "ᑭ", "P", "ⓟ", "Ⓟ", "ρ", "₱", "ṗ", "Ṗ", "Ꭾ", "Ƥ", "Ꮲ", "ք", "ｐ", "Ｐ", "ᴘ", "🅟", "𝐩", "𝐏", "𝘱", "𝘗", "𝙥", "𝙋", "𝓅", "𝓹", "𝓟", "𝕡", "ℕ", "𝔭", "𝔐", "𝖕", "𝕻", "🄿", "🅿", "𝒫", "𝚙", "𝙿", "р"],
	"q": ["q", "ᑫ", "Q", "ⓠ", "Ⓠ", "͏", "Ꭴ", "φ", "Ⴓ", "զ", "̾", "ｑ", "Ｑ", "ϙ", "ǫ", "🅠", "𝐪", "𝐐", "𝘲", "𝘘", "𝙦", "𝙌", "𝓆", "𝓺", "𝓠", "𝕢", "​", "𝔮", "𝔑", "𝖖", "𝕼", "🅀", "🆀", "𝒬", "𝚚", "𝚀", "☭", "ԛ"],
	"r": ["r", "ᖇ", "R", "ⓡ", "Ⓡ", "я", "Ɽ", "ŕ", "Ŕ", "Ꮢ", "г", "Γ", "ṙ", "Ṙ", "ʀ", "ｒ", "Ｒ", "ɹ", "🅡", "𝐫", "𝐑", "𝘳", "𝘙", "𝙧", "𝙍", "𝓇", "𝓻", "𝓡", "𝕣", "𝕆", "𝔯", "𝔒", "𝖗", "𝕽", "🅁", "🆁", "𝑅", "ɾ", "𝚛", "𝚁", "☈", "r"],
	"s": ["s", "5", "ᔕ", "S", "ⓢ", "Ⓢ", "ѕ", "͏", "₴", "ṩ", "Ṩ", "Ꮥ", "Ѕ", "Ṡ", "ֆ", "̾", "ｓ", "Ｓ", "ꜱ", "🅢", "𝐬", "𝐒", "𝘴", "𝘚", "𝙨", "𝙎", "𝓈", "𝓼", "𝓢", "𝕤", "ℙ", "𝔰", "𝔓", "𝖘", "𝕾", "🅂", "🆂", "𝒮", "ʂ", "𝚜", "𝚂", "ѕ"],
	"t": ["t", "+", "T", "ⓣ", "Ⓣ", "т", "₮", "ẗ", "Ṯ", "Ꮦ", "τ", "Ƭ", "Ꮖ", "ȶ", "ｔ", "Ｔ", "ᴛ", "ʇ", "🅣", "𝐭", "𝐓", "𝘵", "𝘛", "𝙩", "𝙏", "𝓉", "𝓽", "𝓣", "𝕥", "​", "𝔱", "𝔔", "𝖙", "𝕿", "🅃", "🆃", "𝒯", "ƚ", "𝚝", "𝚃", "☂", "t"],
	"u": ["u", "ú", "ü", "ᑌ", "U", "ⓤ", "Ⓤ", "υ", "͏", "Ʉ", "Ü", "Ꮼ", "Ʊ", "ṳ", "Ṳ", "ʊ", "̾", "ｕ", "Ｕ", "ᴜ", "🅤", "𝐮", "𝐔", "𝘶", "𝘜", "𝙪", "𝙐", "𝓊", "𝓾", "𝓤", "𝕦", "ℚ", "𝔲", "ℜ", "𝖚", "𝖀", "🅄", "🆄", "𝒰", "𝚞", "𝚄", "☋", "ս"],
	"v": ["v", "ᐯ", "V", "ⓥ", "Ⓥ", "ν", "ṿ", "Ṿ", "Ꮙ", "Ʋ", "Ṽ", "ʋ", "ｖ", "Ｖ", "ᴠ", "ʌ", "🅥", "𝐯", "𝐕", "𝘷", "𝘝", "𝙫", "𝙑", "𝓋", "𝓿", "𝓥", "𝕧", "​", "𝔳", "𝖛", "𝖁", "🅅", "🆅", "𝒱", "𝚟", "𝚅", "✓", "ⅴ"],
	"w": ["w", "ᗯ", "W", "ⓦ", "Ⓦ", "ω", "͏", "₩", "ẅ", "Ẅ", "Ꮗ", "ш", "Ш", "ẇ", "Ẇ", "Ꮃ", "ա", "̾", "ｗ", "Ｗ", "ᴡ", "ʍ", "🅦", "𝐰", "𝐖", "𝘸", "𝘞", "𝙬", "𝙒", "𝓌", "𝔀", "𝓦", "𝕨", "ℝ", "𝔴", "𝔖", "𝖜", "𝖂", "🅆", "🆆", "𝒲", "ɯ", "𝚠", "𝚆", "ԝ"],
	"x": ["x", "᙭", "X", "ⓧ", "Ⓧ", "χ", "Ӿ", "ẍ", "Ẍ", "ጀ", "ϰ", "Ж", "х", "Ӽ", "ｘ", "Ｘ", "🅧", "𝐱", "𝐗", "𝘹", "𝘟", "𝙭", "𝙓", "𝓍", "𝔁", "𝓧", "𝕩", "​", "𝔵", "𝔗", "𝖝", "𝖃", "🅇", "🆇", "𝒳", "𝚡", "𝚇", "⌘", "х"],
	"y": ["y", "Y", "ⓨ", "Ⓨ", "у", "͏", "Ɏ", "ÿ", "Ÿ", "Ꭹ", "ψ", "Ψ", "ẏ", "Ẏ", "Ꮍ", "ч", "ʏ", "̾", "ｙ", "Ｙ", "ʎ", "🅨", "𝐲", "𝐘", "𝘺", "𝘠", "𝙮", "𝙔", "𝓎", "𝔂", "𝓨", "𝕪", "𝕊", "𝔶", "𝔘", "𝖞", "𝖄", "🅈", "🆈", "𝒴", "ყ", "𝚢", "𝚈", "☿", "у"],
	"z": ["z", "ᘔ", "Z", "ⓩ", "Ⓩ", "Ⱬ", "ẓ", "Ẓ", "ፚ", "Ꮓ", "ʐ", "ｚ", "Ｚ", "ᴢ", "🅩", "𝐳", "𝐙", "𝘻", "𝘡", "𝙯", "𝙕", "𝓏", "𝔃", "𝓩", "𝕫", "𝕋", "𝔷", "𝔙", "𝖟", "𝖅", "🅉", "🆉", "𝒵", "ȥ", "𝚣", "𝚉", "☡", "z"],
};
const EVASION_DETECTION_SUB_STRINGS: Dict<string> = {};

for (const letter in EVASION_DETECTION_SUBSTITUTIONS) {
	EVASION_DETECTION_SUB_STRINGS[letter] = `[${EVASION_DETECTION_SUBSTITUTIONS[letter].join('')}]`;
}

function constructEvasionRegex(str: string) {
	const buf = "\\b" +
		str.split('').map(letter => (EVASION_DETECTION_SUB_STRINGS[letter] || letter) + '+').join('\\.?') +
		"\\b";
	return new RegExp(buf, 'i');
}

export class Client {
	botGreetingCooldowns: Dict<number> = {};
	challstr: string = '';
	client: websocket.client = new websocket.client();
	connection: websocket.connection | null = null;
	connectionAttempts: number = 0;
	connectionTimeout: NodeJS.Timer | null = null;
	filterRegularExpressions: RegExp[] | null = null;
	evasionFilterRegularExpressions: RegExp[] | null = null;
	groupSymbols: Dict<string> = {};
	loggedIn: boolean = false;
	loginTimeout: NodeJS.Timer | null = null;
	reconnectTime: number = Config.reconnectTime || 60 * 1000;
	sendQueue: string[] = [];
	sendTimeout: NodeJS.Timer | null = null;
	server: string = Config.server || Tools.mainServer;
	serverGroups: Dict<IServerGroup> = {};
	serverId: string = 'showdown';
	serverTimeOffset: number = 0;

	constructor() {
		this.client.on('connect', connection => {
			this.connection = connection;

			this.connection.on('message', message => global.Client.onMessage(message));
			this.connection.on('error', error => global.Client.onConnectionError(error));
			this.connection.on('close', (code, description) => global.Client.onConnectionClose(code, description));

			this.onConnect();
		});
		this.client.on('connectFailed', error => global.Client.onConnectFail(error));

		this.parseServerGroups(DEFAULT_SERVER_GROUPS);
	}

	onReload(previous: Partial<Client>) {
		if (previous.botGreetingCooldowns) this.botGreetingCooldowns = previous.botGreetingCooldowns;
		if (previous.challstr) this.challstr = previous.challstr;
		if (previous.client) this.client = previous.client;
		if (previous.connection) this.connection = previous.connection;
		if (previous.filterRegularExpressions) this.filterRegularExpressions = previous.filterRegularExpressions;
		if (previous.evasionFilterRegularExpressions) this.evasionFilterRegularExpressions = previous.evasionFilterRegularExpressions;
		if (previous.groupSymbols) this.groupSymbols = previous.groupSymbols;
		if (previous.loggedIn) this.loggedIn = previous.loggedIn;
		if (previous.sendQueue) this.sendQueue = previous.sendQueue;
		if (previous.sendTimeout) this.sendTimeout = previous.sendTimeout;
		if (previous.server) this.server = previous.server;
		if (previous.serverGroups) this.serverGroups = previous.serverGroups;
		if (previous.serverId) this.serverId = previous.serverId;
		if (previous.serverTimeOffset) this.serverTimeOffset = previous.serverTimeOffset;
	}

	onConnectFail(error?: Error) {
		if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
		console.log('Failed to connect to server ' + this.serverId);
		if (error) console.log(error.stack);
		this.connectionAttempts++;
		const reconnectTime = this.reconnectTime * this.connectionAttempts;
		console.log('Retrying in ' + (reconnectTime / 1000) + ' seconds');
		this.connectionTimeout = setTimeout(() => this.connect(), reconnectTime);
	}

	onConnectionError(error: Error) {
		console.log('Connection error: ' + error.stack);
		// 'close' is emitted directly after 'error' so reconnecting is handled in onConnectionClose
	}

	onConnectionClose(code: number, description: string) {
		if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
		if (this.loginTimeout) clearTimeout(this.loginTimeout);
		console.log('Connection closed: ' + description + ' (' + code + ')');
		console.log('Reconnecting in ' + (this.reconnectTime /  1000) + ' seconds');
		this.connectionTimeout = setTimeout(() => this.reconnect(), this.reconnectTime);
	}

	onConnect() {
		if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
		console.log('Successfully connected');
		Dex.fetchClientData();
	}

	connect() {
		const options = {
			hostname: Tools.mainServer,
			path: '/crossdomain.php?' + querystring.stringify({host: this.server, path: ''}),
			method: 'GET',
		};

		this.connectionTimeout = setTimeout(() => this.onConnectFail(), 30 * 1000);

		console.log("Attempting to connect to the server " + this.server + "...");
		https.get(options, response => {
			response.setEncoding('utf8');
			let data = '';
			response.on('data', chunk => {
				data += chunk;
			});
			response.on('end', () => {
				const configData = data.split('var config = ')[1];
				if (configData) {
					let config = JSON.parse(configData.split(';')[0]);
					// the config is potentially encoded twice by the server
					if (typeof config === 'string') config = JSON.parse(config);
					if (config.host) {
						if (config.id) this.serverId = config.id;
						if (config.host === 'showdown') {
							this.client.connect('wss://' + MAIN_HOST + ':' + (config.port || 443) + '/showdown/websocket');
						} else {
							this.client.connect('ws://' + config.host + ':' + (config.port || 8000) + '/showdown/websocket');
						}
						return;
					}
				}
				console.log('Error: failed to get data for server ' + this.server);
			});
		}).on('error', error => {
			console.log('Error: ' + error.message);
		});
	}

	reconnect() {
		Rooms.removeAll();
		Users.removeAll();

		this.connectionAttempts = 0;
		this.loggedIn = false;
		this.connect();
	}

	onMessage(websocketMessage: websocket.IMessage) {
		if (websocketMessage.type !== 'utf8' || !websocketMessage.utf8Data) return;
		const lines = websocketMessage.utf8Data.split("\n");
		let room: Room;
		if (lines[0].charAt(0) === '>') {
			room = Rooms.add(lines[0].substr(1));
			lines.shift();
		} else {
			room = Rooms.add('lobby');
		}
		for (let i = 0; i < lines.length; i++) {
			if (!lines[i]) continue;
			this.parseMessage(room, lines[i]);
			if (lines[i].startsWith('|init|')) {
				const page = room.type === 'html';
				const chat = !page && room.type === 'chat';
				for (let j = i + 1; j < lines.length; j++) {
					if (page) {
						if (lines[j].startsWith('|pagehtml|')) {
							this.parseMessage(room, lines[j]);
							break;
						}
					} else if (chat) {
						if (lines[j].startsWith('|users|')) {
							this.parseMessage(room, lines[j]);
							for (let k = j + 1; k < lines.length; k++) {
								if (lines[k].startsWith('|:|')) {
									this.parseMessage(room, lines[k]);
									break;
								}
							}
							break;
						}
					}
				}
				if (page || chat) return;
			}
		}
	}

	parseMessage(room: Room, rawMessage: string): true {
		let message: string;
		let messageType: keyof IClientMessageTypes;
		if (rawMessage.charAt(0) !== "|") {
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
		switch (messageType) {
		/**
		 * Global messages
		 */
		case 'challstr': {
			this.challstr = message;
			if (Config.username) this.login();
			break;
		}

		case 'updateuser': {
			const messageArguments: IClientMessageTypes['updateuser'] = {
				usernameText: messageParts[0],
				loginStatus: messageParts[1],
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
			const {away, status, username} = Tools.parseUsernameText(messageArguments.usernameText);

			if (Tools.toId(username) === Users.self.id) {
				if (this.loggedIn) {
					if (status || Users.self.status) Users.self.status = status;
					if (away) {
						Users.self.away = true;
					} else if (Users.self.away) {
						Users.self.away = false;
					}
				} else {
					if (messageArguments.loginStatus !== '1') {
						console.log('Failed to log in');
						process.exit();
					}
					console.log('Successfully logged in');
					this.loggedIn = true;
					this.send('|/blockchallenges');
					if (rank) {
						Users.self.group = rank;
					} else {
						this.send('|/cmd userdetails ' + Users.self.id);
					}
					if (Config.rooms) {
						for (let i = 0; i < Config.rooms.length; i++) {
							this.send('|/join ' + Config.rooms[i]);
						}
					}
					if (Config.avatar) this.send('|/avatar ' + Config.avatar);
				}
			}
			break;
		}

		case 'queryresponse': {
			const messageArguments: IClientMessageTypes['queryresponse'] = {
				type: messageParts[0] as 'roominfo' | 'userdetails',
				response: messageParts.slice(1).join('|'),
			};
			if (messageParts[0] === 'roominfo') {
				if (messageArguments.response && messageArguments.response !== 'null') {
					const response = JSON.parse(messageArguments.response) as IRoomInfoResponse;
					const room = Rooms.get(response.id);
					if (room) room.onRoomInfoResponse(response);
				}
			} else if (messageParts[0] === 'userdetails') {
				if (messageArguments.response && messageArguments.response !== 'null') {
					const response = JSON.parse(messageArguments.response) as IUserDetailsResponse;
					if (response.userid === Users.self.id) Users.self.group = response.group;
				}
			}
			break;
		}

		case 'init': {
			const messageArguments: IClientMessageTypes['init'] = {
				type: messageParts[0] as RoomType,
			};
			room.init(messageArguments.type);
			if (room.type === 'chat') {
				console.log("Joined room: " + room.id);
				if (room.id === 'staff') room.sayCommand('/filters view');
				room.sayCommand('/cmd roominfo ' + room.id);
				room.sayCommand('/banword list');
				if (room.id in Tournaments.schedules) {
					Tournaments.setScheduledTournament(room);
				}
			}
			break;
		}

		case 'deinit': {
			Rooms.remove(room);
			break;
		}

		case 'customgroups': {
			const messageArguments: IClientMessageTypes['customgroups'] = {
				groups: JSON.parse(messageParts[0]),
			};
			this.parseServerGroups(messageArguments.groups);
			break;
		}

		/**
		 * Chat messages
		 */
		case 'users': {
			const messageArguments: IClientMessageTypes['users'] = {
				userlist: messageParts[0],
			};
			if (messageArguments.userlist !== '0') {
				const users = messageArguments.userlist.split(",");
				for (let i = 1; i < users.length; i++) {
					const rank = users[i].charAt(0);
					const {away, status, username} = Tools.parseUsernameText(users[i].substr(1));
					const user = Users.add(username);
					room.users.add(user);
					if (status || user.status) user.status = status;
					if (away) {
						user.away = true;
					} else if (user.away) {
						user.away = false;
					}
					user.rooms.set(room, {lastChatMessage: 0, rank});
				}
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
			const {away, status, username} = Tools.parseUsernameText(messageArguments.usernameText);
			const user = Users.add(username);
			room.users.add(user);
			if (status || user.status) user.status = status;
			if (away) {
				user.away = true;
			} else if (user.away) {
				user.away = false;
			}
			user.rooms.set(room, {lastChatMessage: 0, rank: messageArguments.rank});
			const now = Date.now();
			Storage.updateLastSeen(user, now);
			if (Config.allowMail && messageArguments.rank !== this.groupSymbols.locked) Storage.retrieveOfflineMessages(user);
			if ((!room.game || room.game.isMiniGame) && !room.userHostedGame && (!(user.id in this.botGreetingCooldowns) || now - this.botGreetingCooldowns[user.id] >= BOT_GREETING_COOLDOWN)) {
				if (Storage.checkBotGreeting(room, user, now)) this.botGreetingCooldowns[user.id] = now;
			}
			if (room.logChatMessages) {
				Storage.logChatMessage(room, now, 'J', messageArguments.rank + user.name);
			}
			break;
		}

		case 'leave':
		case 'l':
		case 'L': {
			const messageArguments: IClientMessageTypes['leave'] = {
				rank: messageParts[0].charAt(0),
				usernameText: messageParts[0].substr(1),
			};
			const {away, status, username} = Tools.parseUsernameText(messageArguments.usernameText);
			const user = Users.add(username);
			room.users.delete(user);
			user.rooms.delete(room);
			if (!user.rooms.size) {
				Users.remove(user);
			} else {
				if (status || user.status) user.status = status;
				if (away) {
					user.away = true;
				} else if (user.away) {
					user.away = false;
				}
			}
			const now = Date.now();
			Storage.updateLastSeen(user, now);
			if (room.logChatMessages) {
				Storage.logChatMessage(room, now, 'L', messageArguments.rank + user.name);
			}
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
			const {away, status, username} = Tools.parseUsernameText(messageArguments.usernameText);
			const user = Users.rename(username, messageArguments.oldId);
			room.users.add(user);
			if (status || user.status) user.status = status;
			if (away) {
				user.away = true;
			} else if (user.away) {
				user.away = false;
			}
			const roomData = user.rooms.get(room);
			user.rooms.set(room, {lastChatMessage: roomData ? roomData.lastChatMessage : 0, rank: messageArguments.rank});
			Storage.updateLastSeen(user, Date.now());
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
					timestamp: Date.now(),
					rank: messageParts[0].charAt(0),
					username: messageParts[0].substr(1),
					message: messageParts.slice(1).join("|"),
				};
			}
			const user = Users.add(messageArguments.username);
			const roomData = user.rooms.get(room);
			if (roomData) roomData.lastChatMessage = messageArguments.timestamp;

			if (user === Users.self) {
				const id = Tools.toId(messageArguments.message);
				if (id in room.messageListeners) {
					room.messageListeners[id]();
					delete room.messageListeners[id];
				}
			} else {
				this.parseChatMessage(room, user, messageArguments.message);
			}
			Storage.updateLastSeen(user, messageArguments.timestamp);
			if (room.logChatMessages) {
				Storage.logChatMessage(room, messageArguments.timestamp, 'c', messageArguments.rank + user.name + '|' + messageArguments.message);
			}
			if (messageArguments.message.startsWith('/log ') && messageArguments.message.includes(' used /hotpatch ')) {
				const hotpatched = messageArguments.message.substr(messageArguments.message.indexOf('/hotpatch ') + 10).trim();
				if (hotpatched === 'formats' || hotpatched === 'battles') {
					Tools.runUpdatePS();
				}
			}
			break;
		}

		case ':': {
			const messageArguments: IClientMessageTypes[':'] = {
				timestamp: parseInt(messageParts[0]),
			};
			this.serverTimeOffset = Math.floor(Date.now() / 1000) - messageArguments.timestamp;
			break;
		}

		case 'pm': {
			const messageArguments: IClientMessageTypes['pm'] = {
				rank: messageParts[0].charAt(0),
				username: messageParts[0].substr(1),
				recipient: messageParts[1].substr(1),
				message: messageParts.slice(2).join("|"),
			};
			const isHtml = messageArguments.message.startsWith("/raw") || messageArguments.message.startsWith("/html");
			const isUthml = !isHtml && messageArguments.message.startsWith("/uthml");
			const user = Users.add(messageArguments.username);
			if (user === Users.self) {
				const recipient = Users.add(messageArguments.recipient);
				if (isUthml) {
					if (recipient.uhtmlMessageListeners) {
						const uhtml = messageArguments.message.substr(messageArguments.message.indexOf(" ") + 1);
						const pipeIndex = uhtml.indexOf("|");
						const id = Tools.toId(uhtml.substr(0, pipeIndex));
						const html = uhtml.substr(pipeIndex + 1);
						if (id in recipient.uhtmlMessageListeners) {
							const htmlId = Tools.toId(html);
							if (htmlId in recipient.uhtmlMessageListeners[id]) {
								recipient.uhtmlMessageListeners[id][htmlId]();
								delete recipient.uhtmlMessageListeners[id][htmlId];
							}
						}
					}
				} else if (isHtml) {
					if (recipient.htmlMessageListeners) {
						const htmlId = Tools.toId(messageArguments.message.substr(messageArguments.message.indexOf(" ") + 1));
						if (htmlId in recipient.htmlMessageListeners) {
							recipient.htmlMessageListeners[htmlId]();
							delete recipient.htmlMessageListeners[htmlId];
						}
					}
				} else {
					if (recipient.messageListeners) {
						const id = Tools.toId(messageArguments.message);
						if (id in recipient.messageListeners) {
							recipient.messageListeners[id]();
							delete recipient.messageListeners[id];
						}
					}
				}
			} else if (!isHtml && !isUthml && messageArguments.rank !== this.groupSymbols.locked) {
				CommandParser.parse(user, user, messageArguments.message);
			}
		}

		case '': {
			const messageArguments: IClientMessageTypes[''] = {
				message: rawMessage,
			};
			if (messageArguments.message.startsWith('Banned phrases in room ')) {
				let subMessage = messageArguments.message.split('Banned phrases in room ')[1];
				const colonIndex = subMessage.indexOf(':');
				const roomId = subMessage.substr(0, colonIndex);
				subMessage = subMessage.substr(colonIndex + 2);
				if (subMessage) {
					const room = Rooms.get(roomId);
					if (room) room.bannedWords = subMessage.split(', ');
				}
			}
			break;
		}

		case 'raw':
		case 'html': {
			const messageArguments: IClientMessageTypes['html'] = {
				html: messageParts.join("|"),
			};
			const htmlId = Tools.toId(messageArguments.html);
			if (htmlId in room.htmlMessageListeners) {
				room.htmlMessageListeners[htmlId]();
				delete room.htmlMessageListeners[htmlId];
			}

			if (messageArguments.html.startsWith('<div class="broadcast-red"><strong>Moderated chat was set to ')) {
				room.modchat = messageArguments.html.split('<div class="broadcast-red"><strong>Moderated chat was set to ')[1].split('!</strong>')[0];
			} else if (messageArguments.html.startsWith('<div class="broadcast-blue"><strong>Moderated chat was disabled!</strong>')) {
				room.modchat = 'off';
			} else if (messageArguments.html.startsWith("<div class='infobox infobox-limited'>This tournament includes:<br />")) {
				if (room.tournament) {
					const separatedCustomRules: ISeparatedCustomRules = {bans: [], unbans: [], addedrules: [], removedrules: []};
					const lines = messageArguments.html.substr(0, messageArguments.html.length - 6).split("<div class='infobox infobox-limited'>This tournament includes:<br />")[1].split('<br />');
					let currentCategory: 'bans' | 'unbans' | 'addedrules' | 'removedrules' = 'bans';
					for (let i = 0; i < lines.length; i++) {
						let line = lines[i].trim();
						if (line.startsWith('<b>')) {
							const category = Tools.toId(line.split('<b>')[1].split('</b>')[0]);
							if (category === 'bans' || category === 'unbans' || category === 'addedrules' || category === 'removedrules') {
								currentCategory = category;
							}
						}
						if (line.includes('</b> - ')) line = line.split('</b> - ')[1];
						separatedCustomRules[currentCategory] = line.split(",").map(x => x.trim());
					}

					room.tournament.format.customRules = Dex.combineCustomRules(separatedCustomRules);
					room.tournament.format.separatedCustomRules = separatedCustomRules;
					if (!room.tournament.manuallyNamed) room.tournament.setCustomFormatName();
				}
			} else if (messageArguments.html === "<b>The tournament's custom rules were cleared.</b>") {
				if (room.tournament) {
					room.tournament.format.customRules = null;
					room.tournament.format.separatedCustomRules = null;
					if (!room.tournament.manuallyNamed) room.tournament.setCustomFormatName();
				}
			}
			break;
		}

		case 'pagehtml': {
			if (room.id === 'view-filters') {
				let filterRegularExpressions: RegExp[] | null = null;
				let evasionFilterRegularExpressions: RegExp[] | null = null;
				const messageArguments: IClientMessageTypes['pagehtml'] = {
					html: messageParts.join("|"),
				};
				if (messageArguments.html.includes('<table>')) {
					const table = messageArguments.html.split('<table>')[1].split('</table>')[0];
					const rows = table.split("<tr>");
					let currentHeader = '';
					let shortener = false;
					let evasion = false;

					for (let i = 0; i < rows.length; i++) {
						if (!rows[i]) continue;
						if (rows[i].startsWith('<th colspan="2"><h3>')) {
							currentHeader = rows[i].split('<th colspan="2"><h3>')[1].split('</h3>')[0].split(' <span ')[0];
							shortener = currentHeader === 'URL Shorteners';
							evasion = currentHeader === 'Filter Evasion Detection';
						} else if (rows[i].startsWith('<td><abbr title="') && currentHeader !== 'Whitelisted names') {
							let word = rows[i].split('<td><abbr title="')[1].split('</abbr>')[0].trim();
							let filterTo = false;
							const titleEndIndex = word.indexOf('">');
							if (titleEndIndex !== -1) word = word.substr(titleEndIndex + 2);
							if (word.startsWith('<code>') && word.endsWith('</code>')) {
								word = word.split('<code>')[1].split('</code>')[0].trim();
								filterTo = true;
							}

							let regularExpression: RegExp | undefined;
							try {
								if (evasion) {
									regularExpression = constructEvasionRegex(word);
								} else {
									regularExpression = new RegExp(shortener ? '\\b' + word : word, filterTo ? 'ig' : 'i');
								}
							} catch (e) {
								console.log(e);
							}

							if (regularExpression) {
								if (evasion) {
									if (!evasionFilterRegularExpressions) evasionFilterRegularExpressions = [];
									evasionFilterRegularExpressions.push(regularExpression);
								} else {
									if (!filterRegularExpressions) filterRegularExpressions = [];
									filterRegularExpressions.push(regularExpression);
								}
							}
						}
					}
				}

				this.filterRegularExpressions = filterRegularExpressions;
				this.evasionFilterRegularExpressions = evasionFilterRegularExpressions;
			}
			break;
		}

		case 'uhtmlchange':
		case 'uhtml': {
			const messageArguments: IClientMessageTypes['uhtml'] = {
				name: messageParts[0],
				html: messageParts.slice(1).join("|"),
			};
			const id = Tools.toId(messageArguments.name);
			if (id in room.uhtmlMessageListeners) {
				const htmlId = Tools.toId(messageArguments.html);
				if (htmlId in room.uhtmlMessageListeners[id]) {
					room.uhtmlMessageListeners[id][htmlId]();
					delete room.uhtmlMessageListeners[id][htmlId];
				}
			}
			break;
		}

		/**
		 * Chatroom messages
		 */
		case 'tournament': {
			const type = messageParts[0] as keyof ITournamentMessageTypes;
			messageParts.shift();
			switch (type) {
				case 'update': {
					const messageArguments: ITournamentMessageTypes['update'] = {
						json: JSON.parse(messageParts.join("|")),
					};
					if (!room.tournament) Tournaments.createTournament(room, messageArguments.json);
					if (room.tournament) room.tournament.update(messageArguments.json);
					break;
				}

				case 'updateEnd': {
					if (room.tournament) room.tournament.updateEnd();
					break;
				}

				case 'end': {
					const messageArguments: ITournamentMessageTypes['end'] = {
						json: JSON.parse(messageParts.join("|")),
					};
					if (!room.tournament) Tournaments.createTournament(room, messageArguments.json);
					if (room.tournament) {
						room.tournament.update(messageArguments.json);
						room.tournament.updateEnd();
						room.tournament.end();
					}
					const database = Storage.getDatabase(room);
					const now = Date.now();
					database.lastTournamentTime = now;
					const hasSchedule = room.id in Tournaments.scheduledTournaments;
					if (hasSchedule && Tournaments.scheduledTournaments[room.id].time <= now) {
						Tournaments.setScheduledTournamentTimer(room);
					} else if (database.queuedTournament) {
						if (!database.queuedTournament.time) database.queuedTournament.time = now + Tournaments.queuedTournamentTime;
						Tournaments.setTournamentTimer(room, database.queuedTournament.time, Dex.getExistingFormat(database.queuedTournament.formatid, true), database.queuedTournament.playerCap, database.queuedTournament.scheduled);
					} else {
						if (Config.randomTournamentTimers && room.id in Config.randomTournamentTimers && Tournaments.canSetRandomTournament(room)) {
							Tournaments.setRandomTournamentTimer(room, Config.randomTournamentTimers![room.id]);
						} else if (hasSchedule) {
							Tournaments.setScheduledTournamentTimer(room);
						}
					}
					break;
				}

				case 'forceend': {
					if (room.tournament) room.tournament.forceEnd();
					break;
				}

				case 'start': {
					if (room.tournament) room.tournament.start();
					break;
				}

				case 'join': {
					if (room.tournament) {
						const messageArguments: ITournamentMessageTypes['join'] = {
							username: messageParts[0],
						};
						room.tournament.createPlayer(messageArguments.username);
					}
					break;
				}

				case 'leave':
				case 'disqualify': {
					if (room.tournament) {
						const messageArguments: ITournamentMessageTypes['leave'] = {
							username: messageParts[0],
						};
						room.tournament.destroyPlayer(messageArguments.username);
					}
					break;
				}

				case 'battlestart': {
					if (room.tournament) {
						const messageArguments: ITournamentMessageTypes['battlestart'] = {
							usernameA: messageParts[0],
							usernameB: messageParts[1],
							roomid: messageParts[2],
						};
						room.tournament.onBattleStart(messageArguments.usernameA, messageArguments.usernameB, messageArguments.roomid);
					}
					break;
				}

				case 'battleend': {
					if (room.tournament) {
						const messageArguments: ITournamentMessageTypes['battleend'] = {
							usernameA: messageParts[0],
							usernameB: messageParts[1],
							result: messageParts[2] as 'win' | 'loss' | 'draw',
							score: messageParts[3].split(',') as [string, string],
							recorded: messageParts[4] as 'success' | 'fail',
							roomid: messageParts[5],
						};
						room.tournament.onBattleEnd(messageArguments.usernameA, messageArguments.usernameB, messageArguments.score, messageArguments.roomid);
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
				const player = room.tournament.players[Tools.toId(messageArguments.username)];
				if (player) {
					if (!(room.id in room.tournament.battleData)) {
						room.tournament.battleData[room.id] = {
							remainingPokemon: {},
							slots: new Map(),
						};
					}
					room.tournament.battleData[room.id].slots.set(player, messageArguments.slot);
				}
			}
			break;
		}

		case 'teamsize': {
			const messageArguments: IClientMessageTypes['teamsize'] = {
				slot: messageParts[0],
				size: parseInt(messageParts[1]),
			};
			if (room.tournament) {
				room.tournament.battleData[room.id].remainingPokemon[messageArguments.slot] = messageArguments.size;
			}
			break;
		}

		case 'faint': {
			const messageArguments: IClientMessageTypes['faint'] = {
				details: messageParts[0],
			};
			if (room.tournament) {
				room.tournament.battleData[room.id].remainingPokemon[messageArguments.details.substr(0, 2)]--;
			}
			break;
		}
		}

		return true;
	}

	parseChatMessage(room: Room, user: User, message: string) {
		CommandParser.parse(room, user, message);
		const lowerCaseMessage = message.toLowerCase();

		// unlink tournament battle replays
		if (room.unlinkTournamentReplays && !user.hasRank(room, 'voice') && room.tournament && !room.tournament.format.team && lowerCaseMessage.includes("replay.pokemonshowdown.com/")) {
			let battle = lowerCaseMessage.split("replay.pokemonshowdown.com/")[1];
			if (battle) {
				battle = 'battle-' + battle.split(" ")[0].trim();
				if (room.tournament.battleRooms.includes(battle)) {
					room.sayCommand("/warn " + user.name + ", Please do not link replays to tournament battles");
				}
			}
		}

		// unlink unapproved Challonge tournaments
		if (room.unlinkChallongeLinks && lowerCaseMessage.includes('challonge.com/')) {
			const links: string[] = [];
			const possibleLinks = message.split(" ");
			for (let i = 0; i < possibleLinks.length; i++) {
				const link = Tools.getChallongeUrl(possibleLinks[i]);
				if (link) links.push(link);
			}
			// let hasOwnLink = false;
			const database = Storage.getDatabase(room);
			let rank: GroupName = 'voice';
			if (Config.userHostedTournamentRanks && room.id in Config.userHostedTournamentRanks) rank = Config.userHostedTournamentRanks[room.id].review;
			const authOrTHC = user.hasRank(room, rank) || (database.thcWinners && user.id in database.thcWinners);
			outer:
			for (let i = 0; i < links.length; i++) {
				const link = links[i];
				/*
				if (database.hostingBlacklist && user.id in database.hostingBlacklist) {
					room.sayCommand("/warn " + user.name + ", You are currently banned from hosting");
					break;
				}
				*/
				// hasOwnLink = true;
				if (room.approvedUserHostedTournaments) {
					for (const i in room.approvedUserHostedTournaments) {
						if (room.approvedUserHostedTournaments[i].urls.includes(link)) {
							if (!authOrTHC && room.approvedUserHostedTournaments[i].hostId !== user.id) {
								room.sayCommand("/warn " + user.name + ", Please do not post links to other hosts' tournaments");
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
						startTime: Date.now(),
						approvalStatus: 'approved',
						reviewer: user.id,
						urls: [link],
					};
				} else {
					for (const i in room.newUserHostedTournaments) {
						if (room.newUserHostedTournaments[i].urls.includes(link)) {
							if (room.newUserHostedTournaments[i].hostId !== user.id) {
								room.sayCommand("/warn " + user.name + ", Please do not post links to other hosts' tournaments");
							} else if (room.newUserHostedTournaments[i].approvalStatus === 'changes-requested') {
								let name = room.newUserHostedTournaments[i].reviewer;
								const reviewer = Users.get(name);
								if (reviewer) name = reviewer.name;
								room.sayCommand("/warn " + user.name + ", " + name + " has requested changes for your tournament and you must wait for them to be approved");
							} else {
								room.sayCommand("/warn " + user.name + ", You must wait for a staff member to approve your tournament");
							}
							break outer;
						}
					}
					room.sayCommand("/warn " + user.name + ", Your tournament must be approved by a staff member");
					user.say('Use the command ``' + Config.commandCharacter + 'gettourapproval ' + room.id + ', __bracket link__, __signup link__`` to get your tournament approved (insert your actual links).');
					break;
				}
			}

			// if (hasOwnLink) Tournaments.setTournamentGameTimer(room);
		}

		// per-game parsing
		if (room.game && room.game.parseChatMessage) room.game.parseChatMessage(user, message);
	}

	parseServerGroups(groups: ServerGroupData[]) {
		this.serverGroups = {};
		// Bot is below Driver on the user list but above Moderator in terms of permissions
		let botIndex = -1;
		let moderatorIndex = -1;
		for (let i = 0; i < groups.length; i++) {
			if (groups[i].name === 'Bot') {
				botIndex = i;
			} else if ((groups[i].type === 'leadership' || groups[i].type === 'staff') && groups[i].name === 'Moderator') {
				moderatorIndex = i;
			}
		}
		if (botIndex !== -1 && moderatorIndex !== -1) {
			const bot = groups.splice(botIndex, 1);
			groups.splice(moderatorIndex, 0, bot[0]);
		}

		let ranking = groups.length;
		for (let i = 0; i < groups.length; i++) {
			this.serverGroups[groups[i].symbol] = Object.assign({ranking}, groups[i]);
			if (groups[i].name === 'Bot') this.groupSymbols.bot = groups[i].symbol;
			if (groups[i].type === 'leadership' || groups[i].type === 'staff') {
				if (groups[i].name === 'Room Owner' || groups[i].name === 'Moderator' || groups[i].name === 'Driver') {
					this.groupSymbols[Tools.toId(groups[i].name!)] = groups[i].symbol;
				}
			} else if (groups[i].type === 'normal' && groups[i].name === 'Voice') {
				this.groupSymbols.voice = groups[i].symbol;
			} else if (groups[i].type === 'punishment' && groups[i].name === 'Locked') {
				this.groupSymbols.locked = groups[i].symbol;
			}
			ranking--;
		}
	}

	willBeFiltered(message: string, room?: Room): boolean {
		let lowerCase = message.replace(/\u039d/g, 'N').toLowerCase().replace(/[\u200b\u007F\u00AD\uDB40\uDC00\uDC21]/g, '').replace(/\u03bf/g, 'o').replace(/\u043e/g, 'o').replace(/\u0430/g, 'a').replace(/\u0435/g, 'e').replace(/\u039d/g, 'e');
		lowerCase = lowerCase.replace(/__|\*\*|``|\[\[|\]\]/g, '');

		if (this.filterRegularExpressions) {
			for (let i = 0; i < this.filterRegularExpressions.length; i++) {
				if (!!lowerCase.match(this.filterRegularExpressions[i])) return true;
			}
		}

		if (this.evasionFilterRegularExpressions) {
			let evasionLowerCase = lowerCase.normalize('NFKC');
			evasionLowerCase = evasionLowerCase.replace(/[\s-_,.]+/g, '.');
			for (let i = 0; i < this.evasionFilterRegularExpressions.length; i++) {
				if (!!evasionLowerCase.match(this.evasionFilterRegularExpressions[i])) return true;
			}
		}

		if (room && room.bannedWords) {
			if (!room.bannedWordsRegex) room.bannedWordsRegex = new RegExp('(?:\\b|(?!\\w))(?:' + room.bannedWords.join('|') + ')(?:\\b|\\B(?!\\w))', 'i');
			if (!!message.match(room.bannedWordsRegex)) return true;
		}

		return false;
	}

	getListenerHtml(html: string): string {
		html = '<div class="infobox">' + html;
		if (Users.self.group !== this.groupSymbols.bot) html += '<div style="float:right;color:#888;font-size:8pt">[' + Users.self.name + ']</div><div style="clear:both"></div>';
		html += '</div>';
		return html;
	}

	getListenerUhtml(html: string): string {
		if (Users.self.group !== this.groupSymbols.bot) html += '<div style="float:right;color:#888;font-size:8pt">[' + Users.self.name + ']</div><div style="clear:both"></div>';
		return html;
	}

	send(message: string) {
		if (!message) return;
		if (!this.connection || !this.connection.connected || this.sendTimeout) {
			this.sendQueue.push(message);
			return;
		}
		this.connection.send(message);
		this.sendTimeout = setTimeout(() => {
			this.sendTimeout = null;
			if (!this.sendQueue.length) return;
			this.send(this.sendQueue.shift()!);
		}, SEND_THROTTLE);
	}

	login() {
		const action = url.parse('https://' + Tools.mainServer + '/~~' + this.serverId + '/action.php');
		if (!action.hostname || !action.pathname) {
			console.log("Failed to parse login URL");
			process.exit();
		}

		const options: {hostname: string | undefined, path: string | undefined, agent: boolean, method: string, headers?: Dict<string | number>} = {
			hostname: action.hostname,
			path: action.pathname,
			agent: false,
			method: '',
		};

		let postData = '';
		if (Config.password) {
			options.method = 'POST';
			postData = querystring.stringify({
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
				if (data === ';') {
					console.log('Failed to log in: invalid password');
					process.exit();
				} else if (data.charAt(0) !== ']') {
					console.log('Failed to log in: ' + data);
					process.exit();
				} else if (data.startsWith('<!DOCTYPE html>')) {
					console.log('Failed to log in: connection timed out. Trying again in ' + RELOGIN_SECONDS + ' seconds');
					this.loginTimeout = setTimeout(() => this.login(), RELOGIN_SECONDS * 1000);
					return;
				} else if (data.includes('heavy load')) {
					console.log('Failed to log in: the login server is under heavy load. Trying again in ' + (RELOGIN_SECONDS * 5) + ' seconds');
					this.loginTimeout = setTimeout(() => this.login(), RELOGIN_SECONDS * 5 * 1000);
					return;
				} else {
					if (Config.password) {
						const assertion = JSON.parse(data.substr(1));
						if (assertion.actionsuccess && assertion.assertion) {
							data = assertion.assertion;
						} else {
							console.log('Failed to log in: ' + data.substr(1));
							process.exit();
						}
					}
					this.send('|/trn ' + Config.username + ',0,' + data);
				}
			});
		});

		request.on('error', error => {
			console.log('Login error: ' + error.stack);
			console.log('Trying again in ' + RELOGIN_SECONDS + ' seconds');
			if (this.loginTimeout) clearTimeout(this.loginTimeout);
			this.loginTimeout = setTimeout(() => this.login(), RELOGIN_SECONDS * 1000);
		});

		if (postData) request.write(postData);
		request.end();
	}
}

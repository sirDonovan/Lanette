import fs = require('fs/promises');
import https = require('https');
import Module = require('module');
import path = require('path');
import url = require('url');

import type { IColorPick } from './html-pages/components/color-picker';
import type { PRNG } from './lib/prng';
import type { Room } from './rooms';
import { eggGroupHexCodes, hexCodes, namedHexCodes, pokemonColorHexCodes, moveCategoryHexCodes, typeHexCodes } from './tools-hex-codes';
import type { IClientMessageTypes, IParsedIncomingMessage } from './types/client';
import type {
	BorderType, HexCode, IExtractedBattleId, IHexCodeData, IParsedSmogonLink, IWriteQueueItem, NamedHexCode, TextColorHex, TimeZone
} from './types/tools';
import type { IParam, IParametersGenData, ParametersSearchType } from './workers/parameters';
import { buildPokemonShowdown, getCurrentPokemonShowdownSha, pullLatestPokemonShowdownSha } from './../build-src';
import { setToSha } from '../tools';

const TABLE_PADDING_SIZE = 2;
const TABLE_TEXT_SIZE = 18;

const ALPHA_NUMERIC_REGEX = /[^a-zA-Z0-9 ]/g;
const ID_REGEX = /[^a-z0-9]/g;
const CONTAINS_INTEGER_REGEX = /.*[0-9]+.*/g;
const INTEGER_REGEX = /^[0-9]+$/g;
const FLOAT_REGEX = /^[.0-9]+$/g;
const SPACE_REGEX = /\s/g;
const APOSTROPHE_REGEX = /[/']/g;
const HTML_CHARACTER_REGEX = /[<>/\\'"]/g;
const HTML_TAG_CHARACTER_REGEX = /[<>/\\]/g;
const UNSAFE_API_CHARACTER_REGEX = /[^A-Za-z0-9 ,.%&'"!?()[\]`_<>/|:;=+-@]/g;
const HEX_CODE_REGEX = /^[abcdef0123456789]+$/g;

const AMPERSAND_REGEX = /&/g;
const LESS_THAN_REGEX = /</g;
const GREATER_THAN_REGEX = />/g;
const DOUBLE_QUOTE_REGEX = /"/g;
const SINGLE_QUOTE_REGEX = /'/g;
const FORWARD_SLASH_REGEX = /\//g;
const BACK_SLASH_REGEX = /\\/g;
const E_ACUTE_REGEX = /é/g;
const BULLET_POINT_REGEX = /•/g;

const ESCAPED_AMPERSAND_REGEX = /&amp;/g;
const ESCAPED_LESS_THAN_REGEX = /&lt;/g;
const ESCAPED_GREATER_THAN_REGEX = /&gt;/g;
const ESCAPED_DOUBLE_QUOTE_REGEX = /&quot;/g;
const ESCAPED_SINGLE_QUOTE_REGEX = /&apos;/g;
const ESCAPED_FORWARD_SLASH_REGEX = /&#x2f;/g;
const ESCAPED_BACK_SLASH_REGEX = /&#92;/g;
const ESCAPED_E_ACUTE_REGEX = /&eacute;/g;
const ESCAPED_BULLET_POINT_REGEX = /&bull;/g;
const ESCAPED_SPACE_REGEX = /&nbsp;/g;
const ESCAPED_HYPHEN_REGEX = /&#8209;/g;

const ESCAPED_NUMBER_AMPERSAND_REGEX = /&#38;/g;
const ESCAPED_NUMBER_LESS_THAN_REGEX = /&#60;/g;
const ESCAPED_NUMBER_GREATER_THAN_REGEX = /&#62;/g;
const ESCAPED_NUMBER_DOUBLE_QUOTE_REGEX = /&#34;/g;
const ESCAPED_NUMBER_SINGLE_QUOTE_REGEX = /&#39;/g;
const ESCAPED_NUMBER_FORWARD_SLASH_REGEX = /&#47;/g;

const HERE_REGEX = />here.?</i;
const CLICK_HERE_REGEX = /click here/i;
const HTML_TAGS_REGEX = /<!--.*?-->|<\/?[^<>]*/g;
const ONE_OR_MORE_SPACE_REGEX = /\s+/;
const TAG_NAME_REGEX = /^[a-z]+[0-9]?$/;
const IMAGE_WIDTH_REGEX = /width ?= ?(?:[0-9]+|"[0-9]+")/i;
const IMAGE_HEIGHT_REGEX = /height ?= ?(?:[0-9]+|"[0-9]+")/i;
const IMAGE_SRC_REGEX = / src ?= ?(?:"|')?([^ "']+)(?: ?(?:"|'))?/i;
const BUTTON_NAME_REGEX = / name ?= ?"([^"]*)"/i;
const BUTTON_VALUE_REGEX = / value ?= ?"([^"]*)"/i;
const MSG_COMMAND_REGEX = /^\/(?:msg|pm|w|whisper|botmsg) /;
const BOT_MSG_COMMAND_REGEX = /^\/msgroom (?:[a-z0-9-]+), ?\/botmsg /;

const CHALLONGE_REGEX = /(https?)?challonge.com\/([a-z][a-z]\/)?([a-z0-9#$%&\-+]*)/;
const CHALLONGE_SIGNUPS_REGEX = /(https?)?challonge.com\/([a-z][a-z]\/)?tournaments\/signup\/([a-z0-9#$%&\-+]*)/;
const CHALLONGE_URL = "challonge.com";
const CHALLONGE_SIGNUPS_PREFIX = "/tournaments/signup";
const HTTPS = "https://";

const MAIN_SERVER = 'play.pokemonshowdown.com';
const MAIN_REPLAY_SERVER = 'replay.pokemonshowdown.com';
const BATTLE_ROOM_PREFIX = 'battle-';
const BEST_OF_ROOM_PREFIX = 'game-bestof';
const GROUPCHAT_PREFIX = 'groupchat-';
const GUEST_USER_PREFIX = 'Guest ';
const SMOGON_DEX_PREFIX = 'https://www.smogon.com/dex/';
const SMOGON_THREADS_PREFIX = 'https://www.smogon.com/forums/threads/';
const SMOGON_POSTS_PREFIX = 'https://www.smogon.com/forums/posts/';
const SMOGON_PERMALINK_PAGE_PREFIX = "page-";
const SMOGON_PERMALINK_POST_PREFIX = "post-";
const MAX_MESSAGE_LENGTH = 1000;
const MAX_USERNAME_LENGTH = 18;
const GITHUB_API_THROTTLE = 2 * 1000;
const UPDATE_POKEMON_SHOWDOWN_TIMEOUT = 30 * 1000;
const UPDATE_POKEMON_SHOWDOWN_ATTEMPTS = 60;
const LETTERS = "abcdefghijklmnopqrstuvwxyz";
const ALPHA_NUMERIC = LETTERS + "0123456789";

// __dirname will be [..]/build/src
const rootFolder = path.resolve(__dirname, '..', '..');

// eslint-disable-next-line @typescript-eslint/no-empty-function
let timeout = setTimeout(() => {}, 1000);
// eslint-disable-next-line @typescript-eslint/naming-convention
const TimeoutConstructor = timeout.constructor;
clearTimeout(timeout);
// @ts-expect-error
timeout = undefined;

export class Tools {
	// exported constants
	readonly alphaNumericArray: readonly string[] = ALPHA_NUMERIC.split("");
	readonly battleRoomPrefix: string = BATTLE_ROOM_PREFIX;
	readonly bestOfRoomPrefix: string = BEST_OF_ROOM_PREFIX;
	readonly rootBuildFolder: string = path.join(rootFolder, 'build');
	readonly srcBuildFolder: string = path.join(rootFolder, 'build', 'src');
	readonly eggGroupHexCodes: typeof eggGroupHexCodes = eggGroupHexCodes;
	readonly groupchatPrefix: string = GROUPCHAT_PREFIX;
	readonly guestUserPrefix: string = GUEST_USER_PREFIX;
	readonly hexCodes: typeof hexCodes = hexCodes;
	readonly letters: typeof LETTERS = LETTERS;
	readonly lettersArray: readonly string[] = LETTERS.split("");
	readonly mainServer: string = MAIN_SERVER;
	readonly mainReplayServer: string = MAIN_REPLAY_SERVER;
	readonly maxMessageLength: typeof MAX_MESSAGE_LENGTH = MAX_MESSAGE_LENGTH;
	readonly maxUsernameLength: typeof MAX_USERNAME_LENGTH = MAX_USERNAME_LENGTH;
	readonly minRoomHeight: number = 500;
	readonly minRoomWidth: number = 350;
	readonly namedHexCodes: typeof namedHexCodes = namedHexCodes;
	readonly pokemonColorHexCodes: typeof pokemonColorHexCodes = pokemonColorHexCodes;
	readonly moveCategoryHexCodes: typeof moveCategoryHexCodes = moveCategoryHexCodes;
	readonly pokemonShowdownFolder: string = path.join(rootFolder, 'pokemon-showdown');
	readonly rootFolder: typeof rootFolder = rootFolder;
	readonly runtimeOutputRootFolder: string = 'runtime-output';
	readonly runtimeOutputDebug: string = 'debug';
	readonly runtimeOutputError: string = 'error';
	readonly runtimeOutputGameDebug: string = 'game-debug';
	readonly runtimeOutputWarning: string = 'warning';
	readonly smogonDexPrefix: string = SMOGON_DEX_PREFIX;
	readonly smogonPermalinkPagePrefix: string = SMOGON_PERMALINK_PAGE_PREFIX;
	readonly smogonPermalinkPostPrefix: string = SMOGON_PERMALINK_POST_PREFIX;
	readonly smogonPostsPrefix: string = SMOGON_POSTS_PREFIX;
	readonly smogonThreadsPrefix: string = SMOGON_THREADS_PREFIX;
	readonly spritePrefix: string = '//' + MAIN_SERVER + '/sprites';
	readonly timezones: readonly TimeZone[] = ['GMT-12:00', 'GMT-11:00', 'GMT-10:00', 'GMT-09:30', 'GMT-09:00', 'GMT-08:00', 'GMT-07:00',
		'GMT-06:00', 'GMT-05:00', 'GMT-04:00', 'GMT-03:30', 'GMT-03:00', 'GMT-02:00', 'GMT-01:00', 'GMT+00:00', 'GMT+01:00', 'GMT+02:00',
		'GMT+03:00', 'GMT+03:30', 'GMT+04:00', 'GMT+04:30', 'GMT+05:00', 'GMT+05:30', 'GMT+05:45', 'GMT+06:00', 'GMT+06:30', 'GMT+07:00',
		'GMT+08:00', 'GMT+08:45', 'GMT+09:00', 'GMT+09:30', 'GMT+10:00', 'GMT+10:30', 'GMT+11:00', 'GMT+12:00', 'GMT+12:45', 'GMT+13:00',
		'GMT+14:00',
	];
	readonly typeHexCodes: typeof typeHexCodes = typeHexCodes;
	readonly unsafeApiCharacterRegex: RegExp = UNSAFE_API_CHARACTER_REGEX;
	readonly vowels: string = "aeiou";

	private lastGithubApiCall: number = 0;
	private currentAppendFiles: Dict<string> = {};
	private appendFileQueue: Dict<string[]> = {};
	private currentSafeFileWrites: Dict<string> = {};
	private safeWriteFileQueue: Dict<IWriteQueueItem<void, Error>[]> = {};

	/* eslint-disable @typescript-eslint/no-unnecessary-condition */
	onReload(previous: Tools): void {
		if (previous.lastGithubApiCall) this.lastGithubApiCall = previous.lastGithubApiCall;
		if (previous.currentAppendFiles) Object.assign(this.currentAppendFiles, previous.currentAppendFiles);
		if (previous.appendFileQueue) Object.assign(this.appendFileQueue, previous.appendFileQueue);
		if (previous.currentSafeFileWrites) Object.assign(this.currentSafeFileWrites, previous.currentSafeFileWrites);
		if (previous.safeWriteFileQueue) Object.assign(this.safeWriteFileQueue, previous.safeWriteFileQueue);

		this.unrefProperties(previous.eggGroupHexCodes);
		this.unrefProperties(previous.hexCodes);
		this.unrefProperties(previous.namedHexCodes);
		this.unrefProperties(previous.pokemonColorHexCodes);
		this.unrefProperties(previous.moveCategoryHexCodes);
		this.unrefProperties(previous.typeHexCodes);
		this.unrefProperties(previous);
	}
	/* eslint-enable */

	parseIncomingMessage<T = IClientMessageTypes>(incomingMessage: string): IParsedIncomingMessage<T> {
		let message: string;
		let messageType: keyof T;
		if (incomingMessage.charAt(0) !== "|") {
			message = incomingMessage;
			messageType = '' as keyof T;
		} else {
			message = incomingMessage.substr(1);
			const pipeIndex = message.indexOf("|");
			if (pipeIndex !== -1) {
				messageType = message.substr(0, pipeIndex) as keyof T;
				message = message.substr(pipeIndex + 1);
			} else {
				messageType = message as keyof T;
				message = '';
			}
		}

		return {
			incomingMessage,
			type: messageType,
			whole: message,
			parts: message.split("|"),
		};
	}

	getSubIncomingMessage<T>(parsedIncomingMessage: IParsedIncomingMessage): IParsedIncomingMessage<T> {
		return this.parseIncomingMessage<T>((parsedIncomingMessage.whole.charAt(0) === "|" ? "" : "|") + parsedIncomingMessage.whole);
	}

	checkHtml(room: Room, htmlContent: string): boolean {
		htmlContent = htmlContent.trim();
		if (!htmlContent) return false;

		const additionalInfo = "\nRoom: " + room.title + "\nHTML: " + htmlContent;
		if (htmlContent.match(HERE_REGEX) || htmlContent.match(CLICK_HERE_REGEX)) {
			throw new Error('Cannot use "click here"' + additionalInfo);
		}

		// check for mismatched tags
		const tags = htmlContent.match(HTML_TAGS_REGEX);
		if (tags) {
			const ILLEGAL_TAGS = ['script', 'head', 'body', 'html', 'canvas', 'base', 'meta', 'link', 'iframe'];
			const LEGAL_AUTOCLOSE_TAGS = [
				// void elements (no-close tags)
				'br', 'area', 'embed', 'hr', 'img', 'source', 'track', 'input', 'wbr', 'col',
				// autoclose tags
				'p', 'li', 'dt', 'dd', 'option', 'tr', 'th', 'td', 'thead', 'tbody', 'tfoot', 'colgroup',
				// PS custom element
				'psicon', 'youtube',
			];

			const stack: string[] = [];
			for (const tag of tags) {
				const isClosingTag = tag.charAt(1) === '/';
				const contentEndLoc = tag.endsWith('/') ? -1 : undefined;
				const tagContent = tag.slice(isClosingTag ? 2 : 1, contentEndLoc).replace(ONE_OR_MORE_SPACE_REGEX, ' ').trim();
				const tagNameEndIndex = tagContent.indexOf(' ');
				const tagName = tagContent.slice(0, tagNameEndIndex >= 0 ? tagNameEndIndex : undefined).toLowerCase();
				if (tagName === '!--') continue;
				if (isClosingTag) {
					if (LEGAL_AUTOCLOSE_TAGS.includes(tagName)) continue;
					if (!stack.length) {
						throw new Error("Extraneous </" + tagName + "> without an opening tag." + additionalInfo);
					}
					const expectedTagName = stack.pop();
					if (tagName !== expectedTagName) {
						throw new Error("Extraneous </" + tagName + "> where </" + expectedTagName + "> was expected." + additionalInfo);
					}
					continue;
				}

				if (ILLEGAL_TAGS.includes(tagName) || !tagName.match(TAG_NAME_REGEX)) {
					throw new Error("Illegal tag <" + tagName + "> can't be used here." + additionalInfo);
				}

				if (!LEGAL_AUTOCLOSE_TAGS.includes(tagName)) {
					stack.push(tagName);
				}

				if (tagName === 'img') {
					if (room.groupchat) {
						throw new Error("This tag is not allowed: <" + tagContent + ">. Images are not allowed outside of chatrooms.");
					}
					if (!tagContent.match(IMAGE_WIDTH_REGEX) || !tagContent.match(IMAGE_HEIGHT_REGEX)) {
						// Width and height are required because most browsers insert the
						// <img> element before width and height are known, and when the
						// image is loaded, this changes the height of the chat area, which
						// messes up autoscrolling.
						throw new Error("Images without predefined width/height cause problems with scrolling because loading them " +
							"changes their height." + additionalInfo);
					}

					const srcMatch = IMAGE_SRC_REGEX.exec(tagContent);
					if (srcMatch) {
						if (!srcMatch[1].startsWith('https://') && !srcMatch[1].startsWith('//') && !srcMatch[1].startsWith('data:')) {
							throw new Error("Image URLs must begin with 'https://' or 'data:'; 'http://' cannot be used." + additionalInfo);
						}
					} else {
						throw new Error("The src attribute must exist and have no spaces in the URL" + additionalInfo);
					}
				}

				if (tagName === 'button') {
					if ((room.groupchat || room.secretRoom) && !Users.self.isGlobalStaff()) {
						const buttonNameExec = BUTTON_NAME_REGEX.exec(tagContent);
						const buttonValueExec = BUTTON_VALUE_REGEX.exec(tagContent);
						const buttonName = buttonNameExec ? buttonNameExec[1] : "";
						const buttonValue = buttonValueExec ? buttonValueExec[1] : "";
						if (buttonName === 'send' && buttonValue && buttonValue.match(MSG_COMMAND_REGEX)) {
							const [pmTarget] = buttonValue.replace(MSG_COMMAND_REGEX, '').split(',');
							const targetUser = Users.get(pmTarget);
							if ((!targetUser || !targetUser.isBot(room)) && this.toId(pmTarget) !== Users.self.id) {
								throw new Error("Your scripted button can't send PMs to " + pmTarget + ", because that user is not a " +
									"Room Bot." + additionalInfo);
							}
						} else if (buttonName === 'send' && buttonValue && buttonValue.match(BOT_MSG_COMMAND_REGEX)) {
							// no need to validate the bot being an actual bot; `/botmsg` will do it for us and is not abusable
						} else if (buttonName) {
							throw new Error("This button is not allowed: <" + tagContent + ">" + additionalInfo);
						}
					}
				}
			}

			if (stack.length) {
				throw new Error("Missing </" + stack.pop() + ">." + additionalInfo);
			}
		}

		return true;
	}

	getMaxTableWidth(borderSpacing: number): number {
		return this.minRoomWidth - (borderSpacing * 2);
	}

	getMaxTableHeight(borderSpacing: number): number {
		return this.minRoomHeight - (borderSpacing * 2);
	}

	getTableCellAdditionalWidth(borderSpacing: number): number {
		return (borderSpacing * 2) + TABLE_PADDING_SIZE;
	}

	getTableCellAdditionalHeight(borderSpacing: number, cellText?: boolean): number {
		let additionalHeight = (borderSpacing * 2) + TABLE_PADDING_SIZE;
		if (cellText) additionalHeight += TABLE_TEXT_SIZE;

		return additionalHeight;
	}

	getMaxTableCellWidth(maxTableWidth: number, borderSpacing: number, cellsPerRow: number): number {
		return Math.floor((maxTableWidth - (this.getTableCellAdditionalWidth(borderSpacing) * cellsPerRow)) / cellsPerRow);
	}

	getMaxTableCellHeight(maxTableHeight: number, borderSpacing: number, rowsInTable: number, cellText?: boolean): number {
		return Math.floor((maxTableHeight - (this.getTableCellAdditionalHeight(borderSpacing, cellText) * rowsInTable)) / rowsInTable);
	}

	getNamedHexCode(name: NamedHexCode): IHexCodeData {
		return hexCodes[namedHexCodes[name]]!;
	}

	getEggGroupHexCode(eggGroup: string): IHexCodeData | undefined {
		return hexCodes[eggGroupHexCodes[eggGroup]];
	}

	getPokemonColorHexCode(color: string): IHexCodeData | undefined {
		return hexCodes[pokemonColorHexCodes[color]];
	}

	getMoveCategoryHexCode(category: string): IHexCodeData | undefined {
		return hexCodes[moveCategoryHexCodes[category]];
	}

	getTypeHexCode(type: string): IHexCodeData | undefined {
		return hexCodes[typeHexCodes[type]];
	}

	validateHexCode(code: string): HexCode | undefined {
		if (code.charAt(0) === '#') code = code.slice(1);
		if (code.length !== 6) return;

		code = code.toLowerCase();
		if (!code.match(HEX_CODE_REGEX)) return;

		return '#' + code as HexCode;
	}

	colorPickToStorage(colorPick: IColorPick): IHexCodeData | HexCode {
		return colorPick.gradient ? {
			color: colorPick.hexCode,
			gradient: colorPick.gradient,
			secondaryColor: colorPick.secondaryHexCode,
			textColor: colorPick.textColor,
		} : colorPick.hexCode;
	}

	getBlackHexCode(): HexCode {
		return '#000000' as HexCode;
	}

	getWhiteHexCode(): HexCode {
		return '#ffffff' as HexCode;
	}

	getBlackTextCode(): TextColorHex {
		return '#000000';
	}

	getWhiteTextCode(): TextColorHex {
		return '#ffffff';
	}

	getDynamicTextHexCode(color: TextColorHex, background?: HexCode): TextColorHex {
		if (Config.getDynamicTextHexCode) return Config.getDynamicTextHexCode(color, background);
		return color;
	}

	getHexCodeGradient(topHex?: HexCode, bottomHex?: HexCode): string {
		if (!topHex) topHex = this.getWhiteHexCode();
		return "linear-gradient(" + topHex + "," + (bottomHex || topHex) + ")";
	}

	getBorderTypes(): BorderType[] {
		return ['solid', 'dotted', 'dashed', 'double', 'inset', 'outset'];
	}

	getTypeOrColorLabel(color: IHexCodeData, label: string, width?: 'auto' | number): string {
		return '<div style="display: inline-block;background: ' + color.gradient + ';border: 1px solid #68a;border-radius: 5px;' +
			'width: ' + (width || 75) + 'px;padding: 1px;color: #ffffff;text-shadow: 1px 1px 1px #333;' +
			'text-align: center"><b>' + label + '</b></div>';
	}

	getHexSpan(backgroundColor: string | IHexCodeData | undefined, borderColor?: string | IHexCodeData, borderRadiusValue?: number,
		borderSize?: number, borderType?: BorderType): string {
		let border: string | undefined;
		let borderStyle: string | undefined;
		let borderRadius: string | undefined;

		if (borderColor || borderSize) {
			if (!borderSize) borderSize = 1;
			border = "border: " + borderSize + "px solid ";
			if (borderColor) {
				if (typeof borderColor === 'string') {
					if (borderColor in this.hexCodes) {
						border += this.hexCodes[borderColor]!.color;
					} else {
						border += this.getBlackHexCode();
					}
				} else {
					border += borderColor.color;
				}
			}
			border += ";";
		}

		if (borderType) {
			borderStyle = "border-style: " + borderType + ";";
		}

		if (borderRadiusValue) {
			borderRadius = "border-radius: " + borderRadiusValue + "px;";
		}

		const background = this.getHexBackground(backgroundColor);
		if (background || border || borderStyle || borderRadius) {
			let span = "<span style='display: block;";

			if (background) span += background;
			if (border) span += border;
			if (borderStyle) span += borderStyle;
			if (borderRadius) span += borderRadius;

			span += "'>";
			return span;
		}

		return "";
	}

	getHexBackground(backgroundColor: string | IHexCodeData | undefined): string {
		let background = "";
		let textColor = "";

		if (backgroundColor) {
			if (typeof backgroundColor === 'string') {
				if (backgroundColor in this.hexCodes) {
					textColor = 'color: ' +
						this.getDynamicTextHexCode(this.hexCodes[backgroundColor]!.textColor || this.getBlackTextCode(),
						this.hexCodes[backgroundColor]!.color) + ';';
					background = "background: " + this.hexCodes[backgroundColor]!.gradient + ";";
				}
			} else {
				textColor = 'color: ' + this.getDynamicTextHexCode(backgroundColor.textColor || this.getBlackTextCode(),
					backgroundColor.color) + ';';
				background = "background: " + backgroundColor.gradient + ";";
			}
		}

		return background + textColor;
	}

	getCustomButtonStyle(backgroundColor: HexCode | IHexCodeData | undefined, borderColor?: HexCode | IHexCodeData, borderRadius?: number,
		borderSize?: number, borderType?: BorderType): string {
		let buttonStyle = '';
		if (backgroundColor) {
			if (typeof backgroundColor === 'string') {
				if (backgroundColor in this.hexCodes) {
					if (this.hexCodes[backgroundColor]!.textColor) {
						buttonStyle += "color: " + this.getDynamicTextHexCode(this.hexCodes[backgroundColor]!.textColor,
							this.hexCodes[backgroundColor]!.color) + ";";
					} else {
						buttonStyle += "color: #000000;";
					}
					buttonStyle += "background: " + this.hexCodes[backgroundColor]!.gradient + ";";
					buttonStyle += "text-shadow: none;";
				}
			} else {
				buttonStyle += "color: " + this.getDynamicTextHexCode(backgroundColor.textColor || this.getBlackTextCode(),
					backgroundColor.color) + ";";
				buttonStyle += "background: " + backgroundColor.gradient + ";";
				buttonStyle += "text-shadow: none;";
			}
		}

		if (borderColor || borderSize) {
			if (!borderSize) borderSize = 1;
			buttonStyle += "border: " + borderSize + "px solid ";
			if (borderColor) {
				if (typeof borderColor === 'string') {
					if (borderColor in this.hexCodes) {
						buttonStyle += this.hexCodes[borderColor]!.color;
					} else {
						buttonStyle += this.getBlackHexCode();
					}
				} else {
					buttonStyle += borderColor.color;
				}
			} else {
				buttonStyle += this.getBlackHexCode();
			}
			buttonStyle += ";";
		}

		if (borderType) {
			buttonStyle += "border-style: " + borderType + ";";
		}

		if (borderRadius) {
			buttonStyle += "border-radius: " + borderRadius + 'px;';
		}

		return buttonStyle;
	}

	getDateFilename(date?: Date): string {
		if (!date) date = new Date();
		const month = date.getMonth() + 1;
		const day = date.getDate();
		const year = date.getFullYear();

		return year + '-' + month + '-' + day;
	}

	debugLog(message: string): void {
		this.logRuntimeOutput(message, this.runtimeOutputDebug);
	}

	warningLog(message: string): void {
		this.logRuntimeOutput(message, this.runtimeOutputWarning);
	}

	errorLog(message: string): void {
		this.logRuntimeOutput(message, this.runtimeOutputError);
	}

	logException(error: NodeJS.ErrnoException, message?: string): void {
		this.logRuntimeOutput((message ? message + "\n" : "") + (error.stack || error.message), this.runtimeOutputError);
	}

	logRuntimeOutput(message: string, subFolder: string): void {
		const date = new Date();
		const filepath = path.join(rootFolder, this.runtimeOutputRootFolder, subFolder, this.getDateFilename(date) + '.txt');
		message = "\n" + date.toUTCString() + " " + date.toTimeString() + "\n" + message + "\n";

		console.log(message);

		this.appendFile(filepath, message);
	}

	random(limit?: number, prng?: PRNG): number {
		if (!limit) limit = 2;
		if (prng) return prng.next(limit);
		return Math.floor(Math.random() * limit);
	}

	sampleMany<T>(array: readonly T[], amount: string | number, prng?: PRNG): T[] {
		const len = array.length;
		if (!len) throw new Error("Tools.sampleMany() does not accept empty arrays");
		if (len === 1) return array.slice();
		if (typeof amount === 'string') amount = parseInt(amount);
		if (!amount || isNaN(amount)) throw new Error("Invalid amount in Tools.sampleMany()");
		if (amount > len) amount = len;
		return this.shuffle(array, prng).splice(0, amount);
	}

	sampleOne<T>(array: readonly T[], prng?: PRNG): T {
		const len = array.length;
		if (!len) throw new Error("Tools.sampleOne() does not accept empty arrays");
		if (len === 1) return array.slice()[0];
		return this.shuffle(array, prng)[0];
	}

	shuffle<T>(array: readonly T[], prng?: PRNG): T[] {
		const shuffled = array.slice();

		// Fisher-Yates shuffle algorithm
		let currentIndex = shuffled.length;
		let randomIndex = 0;
		let temporaryValue;

		// While there remain elements to shuffle...
		while (currentIndex !== 0) {
			// Pick a remaining element...
			randomIndex = this.random(currentIndex, prng);
			currentIndex -= 1;

			// And swap it with the current element.
			temporaryValue = shuffled[currentIndex];
			shuffled[currentIndex] = shuffled[randomIndex];
			shuffled[randomIndex] = temporaryValue;
		}
		return shuffled;
	}

	deepSortArray<T>(unsortedArray: readonly T[]): T[] {
		const copy = unsortedArray.slice();
		const arrayType = typeof copy[0];
		if (arrayType === 'number' || arrayType === 'bigint') {
			copy.sort((a, b) => ((a as unknown) as number) - ((b as unknown) as number));
		} else if (Array.isArray(copy[0])) {
			for (let i = 0; i < copy.length; i++) {
				// @ts-expect-error
				copy[i] = this.deepSortArray(copy[i]);
			}

			copy.sort((a, b) => {
				const subArrayA = (a as unknown) as T[];
				const subArrayB = (b as unknown) as T[];
				const subArrayALen = subArrayA.length;
				const subArrayBLen = subArrayB.length;
				if (subArrayALen === subArrayBLen) {
					const subArrayType = typeof subArrayA[0];
					const isInteger = subArrayType === 'number' || subArrayType === 'bigint';
					for (let i = 0; i < subArrayALen; i++) {
						if (subArrayA[i] === subArrayB[i]) continue;
						if (isInteger) return ((subArrayA[i] as unknown) as number) - ((subArrayB[i] as unknown) as number);
						return subArrayA[i] > subArrayB[i] ? 1 : -1;
					}

					return 0;
				} else {
					return subArrayALen - subArrayBLen;
				}
			});
		} else {
			copy.sort();
		}

		return copy;
	}

	/**Returns `true` if the arrays contain the same values in the same order */
	compareArrays<T>(arrayA: readonly T[], arrayB: readonly T[]): boolean {
		const arrayALen = arrayA.length;
		if (arrayALen !== arrayB.length) return false;
		if (arrayALen === 0) return true;

		arrayA = this.deepSortArray(arrayA);
		arrayB = this.deepSortArray(arrayB);

		const isSubArrayA = Array.isArray(arrayA[0]);
		const isSubArrayB = Array.isArray(arrayB[0]);
		for (let i = 0; i < arrayALen; i++) {
			if (isSubArrayA && isSubArrayB) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				if (!this.compareArrays((arrayA[i] as unknown) as any[], (arrayB[i] as unknown) as any[])) return false;
			} else {
				if (arrayA[i] !== arrayB[i]) return false;
			}
		}

		return true;
	}

	arraysContainArray<T>(input: T[], arrays: T[][]): boolean {
		for (const array of arrays) {
			if (this.compareArrays(input, array)) return true;
		}

		return false;
	}

	intersectArrays<T>(arrayA: readonly T[], arrayB: readonly T[]): T[] {
		const temp: T[] = [];
		const arrayALen = arrayA.length;
		const arrayBLen = arrayB.length;
		if (arrayALen < arrayBLen) {
			for (let i = 0; i < arrayALen; i++) {
				if (arrayB.includes(arrayA[i])) temp.push(arrayA[i]);
			}
		} else {
			for (let i = 0; i < arrayBLen; i++) {
				if (arrayA.includes(arrayB[i])) temp.push(arrayB[i]);
			}
		}

		return temp;
	}

	intersectParams(paramsType: ParametersSearchType, params: IParam[], parametersData: DeepImmutableObject<IParametersGenData>): string[] {
		let tierSearch = false;
		for (const param of params) {
			if (!(param.type in parametersData.paramTypeDexes) || !(param.param in parametersData.paramTypeDexes[param.type])) return [];
			if (!tierSearch && param.type === 'tier') {
				tierSearch = true;
			}
		}

		let intersection: string[] = parametersData.paramTypeDexes[params[0].type][params[0].param].slice();
		for (let i = 1; i < params.length; i++) {
			intersection = this.intersectArrays(intersection, parametersData.paramTypeDexes[params[i].type][params[i].param]);
			if (!intersection.length) break;
		}

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (paramsType === 'pokemon') {
			const filtered: string[] = [];
			for (const slice of intersection) {
				const id = this.toId(slice);
				const isRegionalForm = (parametersData.formes[id] === 'Galar' || parametersData.formes[id] === 'Alola' ||
					parametersData.formes[id] === 'Paldea') && slice !== "Pikachu-Alola";
				if (!isRegionalForm && id in parametersData.otherFormes &&
					intersection.includes(parametersData.otherFormes[id])) continue;
				if (parametersData.gigantamax.includes(slice) && !tierSearch) continue;
				filtered.push(id);
			}

			intersection = filtered;
		}

		return intersection.sort();
	}

	toId(input: string | number | {id: string} | undefined): string {
		if (input === undefined) return '';
		if (typeof input !== 'string') {
			if (typeof input === 'number') {
				input = '' + input;
			} else {
				input = input.id;
			}
		}
		return input.toLowerCase().replace(ID_REGEX, '');
	}

	toRoomId(name: string): string {
		const id = name.trim().toLowerCase();
		if (id.startsWith(BATTLE_ROOM_PREFIX) || id.startsWith(BEST_OF_ROOM_PREFIX) || id.startsWith(GROUPCHAT_PREFIX)) {
			return id.replace(SPACE_REGEX, '');
		}
		return this.toId(name);
	}

	toAlphaNumeric(input: string | number | undefined): string {
		if (input === undefined) return '';
		if (typeof input === 'number') input = '' + input;
		return input.replace(ALPHA_NUMERIC_REGEX, '').trim();
	}

	toString(input: string | number | boolean | undefined | null | {activityType?: string; effectType?: string; name?: string; id?: string;
		toString?: () => string;}): string {
		if (input === undefined) return 'undefined';
		if (input === null) return 'null';
		if (typeof input === 'string') return input;
		if (typeof input === 'number' || typeof input === 'boolean') return '' + input;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		if (Array.isArray(input)) return '[' + input.map(x => this.toString(x)).join(', ') + ']';
		if (input instanceof TimeoutConstructor) return '[Timeout]';

		for (const i in global) {
			// @ts-expect-error
			if (input === global[i]) return '[global ' + i + ']';
		}

		if (input.effectType && typeof input.effectType === 'string') {
			return '[' + input.effectType.toLowerCase() + ' ' + (input.name || input.id) + ']';
		} else if (input.activityType && typeof input.activityType === 'string') {
			return '[' + input.activityType + ' ' + (input.name || input.id) + ']';
		} else {
			const properties: string[] = [];
			for (const i in input) {
				// @ts-expect-error
				properties.push(i + ": " + this.toString(input[i])); // eslint-disable-line @typescript-eslint/no-unsafe-argument
			}
			return "{" + properties.join(", ") + "}";
		}
	}

	toNumberOrderString(input: number): string {
		const numberString = "" + input;
		if (numberString.endsWith('11') || numberString.endsWith('12') || numberString.endsWith('13')) return numberString + "th";
		if (numberString.endsWith('1')) return numberString + "st";
		if (numberString.endsWith('2')) return numberString + "nd";
		if (numberString.endsWith('3')) return numberString + "rd";
		return numberString + "th";
	}

	toMarkdownAnchor(name: string, linkPrefix?: string): string {
		return "[" + name + "](#" + (linkPrefix ? linkPrefix : "") + name.toLowerCase().replace(APOSTROPHE_REGEX, "")
			.replace(SPACE_REGEX, "-") + ")";
	}

	escapeHTML(input: string): string {
		if (!input) return '';
		return input
			.replace(AMPERSAND_REGEX, '&amp;')
			.replace(LESS_THAN_REGEX, '&lt;')
			.replace(GREATER_THAN_REGEX, '&gt;')
			.replace(DOUBLE_QUOTE_REGEX, '&quot;')
			.replace(SINGLE_QUOTE_REGEX, "&apos;")
			.replace(FORWARD_SLASH_REGEX, '&#x2f;')
			.replace(BACK_SLASH_REGEX, '&#92;')
			.replace(E_ACUTE_REGEX, '&eacute;')
			.replace(BULLET_POINT_REGEX, '&bull;');
	}

	unescapeHTML(input: string): string {
		if (!input) return '';
		return input
			.replace(ESCAPED_AMPERSAND_REGEX, '&').replace(ESCAPED_NUMBER_AMPERSAND_REGEX, '&')
			.replace(ESCAPED_LESS_THAN_REGEX, '<').replace(ESCAPED_NUMBER_LESS_THAN_REGEX, '<')
			.replace(ESCAPED_GREATER_THAN_REGEX, '>').replace(ESCAPED_NUMBER_GREATER_THAN_REGEX, '>')
			.replace(ESCAPED_DOUBLE_QUOTE_REGEX, '"').replace(ESCAPED_NUMBER_DOUBLE_QUOTE_REGEX, '"')
			.replace(ESCAPED_SINGLE_QUOTE_REGEX, "'").replace(ESCAPED_NUMBER_SINGLE_QUOTE_REGEX, "'")
			.replace(ESCAPED_FORWARD_SLASH_REGEX, '/').replace(ESCAPED_NUMBER_FORWARD_SLASH_REGEX, '/')
			.replace(ESCAPED_BACK_SLASH_REGEX, '\\')
			.replace(ESCAPED_E_ACUTE_REGEX, 'é')
			.replace(ESCAPED_BULLET_POINT_REGEX, '•')
			.replace(ESCAPED_SPACE_REGEX, ' ')
			.replace(ESCAPED_HYPHEN_REGEX, '-');
	}

	stripHtmlCharacters(input: string): string {
		return input.replace(HTML_CHARACTER_REGEX, '').trim();
	}

	stripHtmlTagCharacters(input: string): string {
		return input.replace(HTML_TAG_CHARACTER_REGEX, '').trim();
	}

	joinList(list: readonly string[], preFormatting?: string | null, postFormatting?: string | null, conjunction?: string): string {
		let len = list.length;
		if (!len) return "";
		if (!preFormatting) preFormatting = "";
		if (!postFormatting) postFormatting = preFormatting;
		if (!conjunction) conjunction = "and";
		if (len === 1) {
			return preFormatting + list[0] + postFormatting;
		} else if (len === 2) {
			return preFormatting + list[0] + postFormatting + " " + conjunction + " " + preFormatting + list[1] + postFormatting;
		} else {
			len--;
			return preFormatting + list.slice(0, len).join(postFormatting + ", " + preFormatting) + postFormatting + ", " + conjunction +
				" " + preFormatting + list[len] + postFormatting;
		}
	}

	prepareMessage(message: string): string {
		message = this.toString(message);
		if (message.length > MAX_MESSAGE_LENGTH) message = message.substr(0, MAX_MESSAGE_LENGTH - 3) + "...";
		return message;
	}

	/**
	 * Returns a timestamp in the form {yyyy}-{MM}-{dd} {hh}:{mm}:{ss}.
	 *
	 * options.human = true will reports hours human-readable
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	toTimestampString(date: Date, options?: Dict<any>): string {
		const human: boolean = options && options.human ? true : false;
		let parts: (number | string)[] = [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(),
			date.getSeconds()];
		if (human) {
			parts.push(parts[3] as number >= 12 ? 'pm' : 'am');
			parts[3] = (parts[3] as number) % 12 || 12;
		}
		parts = parts.map(val => typeof val === 'number' && val < 10 ? '0' + val : '' + val);
		return parts.slice(0, 3).join("-") + " " + parts.slice(3, human ? 5 : 6).join(":") + (human ? "" + parts[6] : "");
	}

	/**Converts `input` in milliseconds to a duration string */
	toDurationString(input: number, options?: {precision?: number; hhmmss?: boolean, milliseconds?: boolean}): string {
		const date = new Date(input);
		const parts = [date.getUTCFullYear() - 1970, date.getUTCMonth(), date.getUTCDate() - 1, date.getUTCHours(), date.getUTCMinutes(),
			date.getUTCSeconds()];
		const roundingBoundaries = [6, 15, 12, 30, 30];
		const unitNames = ["year", "month", "day", "hour", "minute", "second"];
		if (options && options.milliseconds) {
			parts.push(date.getUTCMilliseconds());
			roundingBoundaries.push(500);
			unitNames.push("millisecond");
		}
		const positiveIndex = parts.findIndex(elem => elem > 0);
		const precision = options && options.precision ? options.precision : parts.length;
		if (options && options.hhmmss) {
			const joined = parts.slice(positiveIndex).map(value => value < 10 ? "0" + value : "" + value).join(":");
			return joined.length === 2 ? "00:" + joined : joined;
		}
		// round least significant displayed unit
		if (positiveIndex + precision < parts.length && precision > 0 && positiveIndex >= 0) {
			if (parts[positiveIndex + precision] >= roundingBoundaries[positiveIndex + precision - 1]) {
				parts[positiveIndex + precision - 1]++;
			}
		}

		const durationString: string[] = [];
		for (let i = positiveIndex; i < parts.length; i++) {
			if (parts[i]) durationString.push(parts[i] + " " + unitNames[i] + (parts[i] > 1 ? "s" : ""));
		}
		return this.joinList(durationString);
	}

	getLastDayOfMonth(date: Date): number {
		const month = date.getMonth() + 1;
		if (month === 2) {
			if (date.getFullYear() % 4 === 0) return 29;
			return 28;
		}
		if ([4, 6, 9, 11].includes(month)) return 30;
		return 31;
	}

	/**
	 * Returns 2 numbers for month/day or 3 for year/month/day
	 */
	toDateArray(input: string, pastDate?: boolean): number[] | null {
		const parts = input.split('/');
		const extracted: number[] = [];
		let hasYear = false;
		for (const part of parts) {
			const partNumber = parseInt(part);
			if (isNaN(partNumber)) return null;
			if (partNumber > 31) {
				if (hasYear) return null;
				hasYear = true;
				extracted.unshift(partNumber);
			} else {
				extracted.push(partNumber);
			}
		}
		if (hasYear && extracted.length === 2) extracted.push(pastDate ? 1 : new Date().getDate());
		return extracted;
	}

	containsInteger(text: string): boolean {
		text = text.trim();
		if (text.startsWith('-')) text = text.substr(1);
		if (text === '') return false;
		return !!text.match(CONTAINS_INTEGER_REGEX);
	}

	isInteger(text: string): boolean {
		text = text.trim();
		if (text.startsWith('-')) text = text.substr(1);
		if (text === '') return false;
		return !!text.match(INTEGER_REGEX);
	}

	isFloat(text: string): boolean {
		text = text.trim();
		if (text.startsWith('-')) text = text.substr(1);
		if (text === '') return false;
		return !!text.match(FLOAT_REGEX);
	}

	isUsernameLength(name: string): boolean {
		const id = this.toId(name);
		return id && id.length <= MAX_USERNAME_LENGTH ? true : false;
	}

	deepClone<T>(obj: T): DeepMutable<T> {
		if (obj === null || obj === undefined || typeof obj !== 'object') return obj as DeepMutable<T>;
		if (Array.isArray(obj)) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const clone = obj.slice() as DeepMutable<T & any[]>;
			for (let i = 0; i < obj.length; i++) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				clone[i] = this.deepClone(obj[i]);
			}
			return clone;
		}

		if (obj instanceof Map) {
			const clone = new Map();
			const keys = Array.from(obj.keys());
			for (const key of keys) {
				clone.set(key, this.deepClone(obj.get(key)));
			}
			return clone as DeepMutable<T>;
		}

		if (obj instanceof Set) {
			const clone = new Set();
			const values = Array.from(obj.values());
			for (const value of values) {
				clone.add(this.deepClone(value));
			}
			return clone as DeepMutable<T>;
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment
		const clone = Object.create(Object.getPrototypeOf(obj));
		const keys = Object.getOwnPropertyNames(obj) as (keyof T)[];
		for (const key of keys) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			clone[key] = this.deepClone(obj[key]);
		}
		return clone as DeepMutable<T>;
	}

	unrefProperties<T>(objectInstance: T, skippedKeys?: (keyof T)[]): void {
		if (!objectInstance) return;

		const keys = Object.getOwnPropertyNames(objectInstance);
		for (const key of keys) {
			if (skippedKeys && skippedKeys.includes(key as keyof T)) continue;

			try {
				// @ts-expect-error
				objectInstance[key as keyof T] = undefined;
			} catch (e) {} // eslint-disable-line no-empty
		}
	}

	uncacheTree(root: string): void {
		try {
			const rootFilepath = require.resolve(root);
			if (!(rootFilepath in require.cache)) return;

			const modulesList: NodeModule[] = [require.cache[rootFilepath]!];
			const cachedModules: NodeModule[] = [];
			// modulesList is only unique items due to cachedModules
			while (modulesList.length) {
				const currentModule = modulesList[0];
				modulesList.shift();

				if (!cachedModules.includes(currentModule) && !currentModule.id.endsWith('.node')) {
					cachedModules.push(currentModule);
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					if (currentModule.children) {
						for (const child of currentModule.children) {
							if (!child.id.endsWith('.node')) modulesList.push(child);
						}
					}
				}
			}

			for (const filename in require.cache) {
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				if (require.cache[filename]!.children) {
					for (const cachedModule of cachedModules) {
						const index = require.cache[filename]!.children.indexOf(cachedModule);
						if (index !== -1) require.cache[filename]!.children.splice(index, 1);
					}
				}
			}

			// @ts-expect-error
			const cacheKeys = Object.keys(Module.Module._cache); // eslint-disable-line @typescript-eslint/no-unsafe-argument
			// @ts-expect-error
			const pathCacheKeys = Object.keys(Module.Module._pathCache); // eslint-disable-line @typescript-eslint/no-unsafe-argument

			for (const cachedModule of cachedModules) {
				delete require.cache[cachedModule.filename];

				for (const cacheKey of cacheKeys) {
					if (cacheKey.includes(cachedModule.filename)) {
						// @ts-expect-error
						delete Module.Module._cache[cacheKey]; // eslint-disable-line @typescript-eslint/no-unsafe-member-access
					}
				}

				for (const pathCacheKey of pathCacheKeys) {
					if (pathCacheKey.includes(cachedModule.filename)) {
						// @ts-expect-error
						delete Module.Module._pathCache[pathCacheKey]; // eslint-disable-line @typescript-eslint/no-unsafe-member-access
					}
				}

				this.unrefProperties(cachedModule);
			}
		} catch (e) {
			console.log(e);
		}
	}

	getPermutations<T>(elements: readonly T[], minimumLength?: number, maximumLength?: number, ordered?: boolean): T[][] {
		const length = elements.length;

		if (minimumLength === undefined) {
			minimumLength = length;
		} else if (minimumLength < 0) {
			throw new Error("Invalid minimum length");
		}

		if (maximumLength === undefined) {
			maximumLength = length;
		} else if (maximumLength > length) {
			throw new Error("Invalid maximum length");
		}

		const permutations: T[][] = [];
		const indicesInUse = new Set<number>();
		const depthFirstSearch = (currentPermutation?: T[], startingIndex?: number): void => {
			if (!currentPermutation) currentPermutation = [];
			const currentLength = currentPermutation.length;
			if (currentLength >= minimumLength) {
				permutations.push(currentPermutation);
				if (currentLength === maximumLength) return;
			}

			for (let i = startingIndex || 0; i < length; i++){
				if (!indicesInUse.has(i)) {
					indicesInUse.add(i);
					depthFirstSearch(currentPermutation.concat(elements[i]), ordered ? i + 1 : undefined);
					indicesInUse.delete(i);
				}
			}
		};

		depthFirstSearch();

		return permutations;
	}

	getCombinations<T>(...input: T[][]): T[][] {
		const combinations: T[][] = [];
		const maxIndex = input.length - 1;

		function combine(current: T[], index: number): void {
			for (let i = 0, j = input[index].length; i < j; i++) {
				const clone = current.slice();
				clone.push(input[index][i]);

				if (index === maxIndex) {
					combinations.push(clone);
				} else {
					combine(clone, index + 1);
				}
			}
		}

		if (input.length) combine([], 0);

		return combinations;
	}

	async fetchUrl(urlToFetch: string): Promise<string | Error> {
		return new Promise((resolve, reject) => {
			let data = '';
			const request = https.get(urlToFetch, res => {
				res.setEncoding('utf8');
				res.on('data', chunk => data += chunk);
				res.on('error', error => reject(error));
				res.on('end', () => {
					resolve(data);
				});
			});

			request.on('error', error => {
				reject(error);
			});
		});
	}

	parseUsernameText(usernameText: string): {status: string; username: string} {
		let status = '';
		let username = '';
		const atIndex = usernameText.indexOf('@');
		if (atIndex !== -1) {
			username = usernameText.substr(0, atIndex);
			status = usernameText.substr(atIndex + 1);
		} else {
			username = usernameText;
		}

		return {status, username};
	}

	parseSmogonLink(thread: string): IParsedSmogonLink | null {
		const parsedThread: IParsedSmogonLink = {description: '', link: ''};
		let id = thread;
		if (thread.startsWith('&bullet;') && thread.includes('<a href="')) {
			parsedThread.description = thread.split('</a>')[0].split('">')[1].trim();
			id = thread.split('<a href="')[1].split('">')[0].trim();
		}

		if (id.endsWith('/')) id = id.substr(0, id.length - 1);
		parsedThread.link = id;
		const parts = id.split('/');
		if (id.startsWith(SMOGON_DEX_PREFIX)) {
			parsedThread.dexPage = id;
			return parsedThread;
		} else if (id.startsWith(SMOGON_POSTS_PREFIX)) {
			parsedThread.postId = parts[parts.length - 1];
			return parsedThread;
		} else if (id.startsWith(SMOGON_THREADS_PREFIX)) {
			let lastPart = parts[parts.length - 1];
			if (lastPart.startsWith(SMOGON_PERMALINK_PAGE_PREFIX)) {
				lastPart = lastPart.substr(SMOGON_PERMALINK_PAGE_PREFIX.length);
				const hashIndex = lastPart.indexOf('#');
				let pageNumber: string;
				if (hashIndex !== -1) {
					pageNumber = lastPart.substr(0, hashIndex);
					lastPart = lastPart.substr(hashIndex);
				} else {
					pageNumber = lastPart;
				}
				parsedThread.pageNumber = pageNumber;
			}

			if (lastPart.startsWith(SMOGON_PERMALINK_POST_PREFIX)) {
				parsedThread.postId = lastPart.substr(SMOGON_PERMALINK_POST_PREFIX.length);
				parsedThread.threadId = parts[parts.length - 2];
			} else if (lastPart.startsWith("#" + SMOGON_PERMALINK_POST_PREFIX)) {
				parsedThread.postId = lastPart.substr(SMOGON_PERMALINK_POST_PREFIX.length + 1);
				parsedThread.threadId = parts[parts.length - 2];
			} else {
				parsedThread.threadId = lastPart;
			}
			return parsedThread;
		}

		return null;
	}

	getNewerForumLink(linkA: IParsedSmogonLink, linkB: IParsedSmogonLink): IParsedSmogonLink {
		const linkAPost = linkA.postId && !linkA.threadId;
		const linkBPost = linkB.postId && !linkB.threadId;
		if (linkAPost && linkBPost) {
			const linkAPostNumber = parseInt(linkA.postId!);
			const linkBPostNumber = parseInt(linkB.postId!);

			if (linkAPostNumber >= linkBPostNumber) return linkA;
			return linkB;
		} else {
			if (linkAPost) return linkA;
			if (linkBPost) return linkB;
		}

		if (linkA.threadId && !linkB.threadId) return linkA;
		if (linkB.threadId && !linkA.threadId) return linkB;

		const linkANumber = parseInt(linkA.threadId!);
		const linkBNumber = parseInt(linkB.threadId!);

		if (linkANumber === linkBNumber) {
			if (linkA.postId && !linkB.postId) return linkA;
			if (linkB.postId && !linkA.postId) return linkB;

			const postANumber = parseInt(linkA.postId!);
			const postBNumber = parseInt(linkB.postId!);

			if (postANumber >= postBNumber) return linkA;
			return linkB;
		}

		if (linkANumber >= linkBNumber) return linkA;
		return linkB;
	}

	extractBattleId(message: string, replayServerAddress: string, serverAddress: string, serverId: string): IExtractedBattleId | null {
		message = message.trim();
		if (!message) return null;

		let fullBattleId = "";
		const replayServerLink = replayServerAddress + (replayServerAddress.endsWith("/") ? "" : "/");
		const replayServerLinkIndex = message.indexOf(replayServerLink);
		if (replayServerLinkIndex !== -1) {
			message = message.substr(replayServerLinkIndex + replayServerLink.length).trim();
			if (message) {
				if (serverId !== 'showdown' && message.startsWith(serverId + "-")) message = message.substr(serverId.length + 1);
				fullBattleId = message.startsWith(BATTLE_ROOM_PREFIX) ? message : BATTLE_ROOM_PREFIX + message;
			} else {
				return null;
			}
		}

		if (!fullBattleId) {
			const serverLink = serverAddress + (serverAddress.endsWith("/") ? "" : "/");
			const serverLinkIndex = message.indexOf(serverLink);
			if (serverLinkIndex !== -1) {
				message = message.substr(serverLinkIndex + serverLink.length).trim();
				if (message.startsWith(BATTLE_ROOM_PREFIX)) {
					fullBattleId = message;
				} else {
					return null;
				}
			}

			if (!fullBattleId && message.startsWith(BATTLE_ROOM_PREFIX)) fullBattleId = message;
		}

		if (!fullBattleId) return null;

		const parts = fullBattleId.split("-");

		return {
			format: parts[1],
			fullId: fullBattleId,
			publicId: parts.slice(0, 3).join("-"),
			password: parts.slice(3).join("-"),
		};
	}

	// requires https prefix for <a> in HTML
	getChallongeUrl(input: string | undefined): string | undefined {
		if (input) input = input.trim().toLowerCase();
		if (!input) return;

		let match = input.match(CHALLONGE_SIGNUPS_REGEX);
		if (match && match[3]) return HTTPS + CHALLONGE_URL + CHALLONGE_SIGNUPS_PREFIX + "/" + match[3];

		match = input.match(CHALLONGE_REGEX);
		if (!match || !match[3] || (match[3] === "tournaments" && input.endsWith("/signup"))) return;

		return HTTPS + CHALLONGE_URL + "/" + match[3];
	}

	isChallongeSignupUrl(challongeUrl: string): boolean {
		if (!challongeUrl) return false;

		return challongeUrl.includes(CHALLONGE_SIGNUPS_PREFIX);
	}

	isChallongeBracketUrl(challongeUrl: string): boolean {
		return !this.isChallongeSignupUrl(challongeUrl);
	}

	editGist(username: string, token: string, gistId: string, description: string, files: Dict<{filename: string; content: string}>): void {
		if (this.lastGithubApiCall && (Date.now() - this.lastGithubApiCall) < GITHUB_API_THROTTLE) return;

		const patchData = JSON.stringify({
			description,
			files,
		});

		const gistAPi = new url.URL('https://api.github.com/gists/' + gistId);
		if (!gistAPi.hostname || !gistAPi.pathname) {
			console.log("Failed to parse gist API URL");
			return;
		}

		const options = {
			hostname: gistAPi.hostname,
			path: gistAPi.pathname,
			method: "PATCH",
			headers: {
				'Accept': 'application/vnd.github.v3+json',
				'User-Agent': username,
				'Authorization': 'token ' + token,
			},
		};

		const request = https.request(options, response => {
			response.setEncoding('utf8');
			let data = '';
			response.on('data', chunk => {
				data += chunk;
			});
			response.on('error', error => {
				console.log("Error during gist response for " + gistId + ": " + error.stack);
			});
			response.on('end', () => {
				if (response.statusCode !== 200) {
					console.log(response.statusCode + ": " + response.statusMessage);
					console.log(data);
				}
			});
		});

		request.on('error', error => {
			console.log("Error during gist request for " + gistId + ": " + error.stack);
		});

		request.write(patchData);
		request.end();

		this.lastGithubApiCall = Date.now();
	}

	updatePokemonShowdown(fetchClientData?: boolean, attempt?: number): void {
		if (attempt && attempt > UPDATE_POKEMON_SHOWDOWN_ATTEMPTS) return;

		process.chdir(this.pokemonShowdownFolder);

		const currentSha = getCurrentPokemonShowdownSha();
		if (currentSha === false) return;

		const latestSha = pullLatestPokemonShowdownSha();
		let buildResult: string | boolean = false;
		if (latestSha !== false) buildResult = buildPokemonShowdown();

		process.chdir(this.rootFolder);

		if (buildResult !== false) {
			const modulesList = ["dex", "games", "commandparser", "tournaments"];

			if (!__reloadInProgress) {
				// eslint-disable-next-line @typescript-eslint/no-floating-promises
				__reloadModules("", modulesList, true).then(error => {
					if (error) {
						if (error.startsWith("You must wait for ")) {
							setTimeout(() => this.updatePokemonShowdown(fetchClientData, (attempt || 1) + 1),
								UPDATE_POKEMON_SHOWDOWN_TIMEOUT);
						} else {
							process.chdir(this.pokemonShowdownFolder);

							const resetResult = setToSha(currentSha);
							buildResult = false;
							if (resetResult !== false) buildResult = buildPokemonShowdown();

							process.chdir(this.rootFolder);

							if (buildResult !== false) {
								void __reloadModules("", modulesList, true);
							}
						}
					} else {
						void this.safeWriteFile(path.join(rootFolder, "pokemon-showdown-sha.txt"), latestSha as string);
						if (fetchClientData) Dex.fetchClientData();
					}
				});
			}
		}
	}

	appendFile(filepath: string, data: string): void {
		if (filepath in this.currentAppendFiles) {
			if (!(filepath in this.appendFileQueue)) this.appendFileQueue[filepath] = [];
			this.appendFileQueue[filepath].push(data);
		} else {
			this.currentAppendFiles[filepath] = data;
			this.appendFileInternal(filepath, data);
		}
	}

	async safeWriteFile(filepath: string, data: string): Promise<void> {
		return new Promise((resolve, reject) => {
			if (filepath in this.currentSafeFileWrites) {
				if (!(filepath in this.safeWriteFileQueue)) this.safeWriteFileQueue[filepath] = [];
				this.safeWriteFileQueue[filepath].push({data, resolve, reject});
			} else {
				this.currentSafeFileWrites[filepath] = data;
				this.safeWriteFileInternal(filepath, data, resolve, reject);
			}
		});
	}

	private safeWriteFileInternal(filepath: string, data: string, resolve: PromiseResolve<void>,
		reject: PromiseReject<Error>): void {
		const tempFilepath = filepath + '.temp';
		fs.writeFile(tempFilepath, data)
			.catch((e: Error) => {
				reject(e);
				this.logException(e, "Error writing temp file " + tempFilepath);
			})
			.then(() => fs.rename(tempFilepath, filepath))
			.catch((e: Error) => {
				reject(e);
				this.logException(e, "Error renaming temp file " + tempFilepath);
			})
			.then(() => {
				resolve();
			})
			.finally(() => {
				if (filepath in this.safeWriteFileQueue && this.safeWriteFileQueue[filepath].length) {
					const queuedItem = this.safeWriteFileQueue[filepath][0];
					this.safeWriteFileQueue[filepath].shift();
					if (!this.safeWriteFileQueue[filepath].length) delete this.safeWriteFileQueue[filepath];

					this.currentSafeFileWrites[filepath] = queuedItem.data;
					this.safeWriteFileInternal(filepath, queuedItem.data, queuedItem.resolve, queuedItem.reject);
				} else {
					delete this.currentSafeFileWrites[filepath];
				}
			})
			.catch((e: Error) => {
				this.logException(e, "Error in finally block for temp file " + tempFilepath);
			})
	}

	private appendFileInternal(filepath: string, message: string): void {
		fs.appendFile(filepath, message)
			.catch((e: Error) => console.log(e))
			.finally(() => {
				if (filepath in this.appendFileQueue && this.appendFileQueue[filepath].length) {
					const queuedMessage = this.appendFileQueue[filepath][0];
					this.appendFileQueue[filepath].shift();
					if (!this.appendFileQueue[filepath].length) delete this.appendFileQueue[filepath];

					this.currentAppendFiles[filepath] = queuedMessage;
					this.appendFileInternal(filepath, queuedMessage);
				} else {
					delete this.currentAppendFiles[filepath];
				}
			});
	}
}

export const instantiate = (): void => {
	let oldTools = global.Tools as Tools | undefined;

	global.Tools = new Tools();

	if (oldTools) {
		global.Tools.onReload(oldTools);
		oldTools = undefined;
	}
};
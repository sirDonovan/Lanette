import type { Player } from "../room-activity";
import type { Room } from "../rooms";
import type { User } from "../users";
import type { ComponentBase } from "./components/component-base";

export interface IQuietPMButtonOptions {
	disabled?: boolean;
	enabledReadonly?: boolean;
	selected?: boolean;
	selectedAndDisabled?: boolean;
	style?: string;
}

export interface ISendOptions {
	hideSelector?: boolean;
	onExpire?: boolean;
	onOpen?: boolean;
	forceSend?: boolean;
}

export const CLOSE_COMMAND = 'closehtmlpage';
export const SWITCH_LOCATION_COMMAND = 'switchhtmlpagelocation';

const SELECTOR_COMMAND_PREFIX = '#';
const HEADER_SELECTOR = 'page-header';
const FOOTER_SELECTOR = 'page-footer';
const EXPIRE_SELECTOR = 'page-expire-message';
const EXPIRE_MESSAGE = "<h1>The page has expired!</h1><hr />";
const EMPTY_SELECTOR_CONTENT = "<div></div>";
const EXPIRATION_TIMEOUT_SECONDS = 30 * 60 * 1000;

export class HtmlSelector {
	childSelectors: HtmlSelector[] | undefined;
	component: ComponentBase | undefined;

	active: boolean;
	id: string;

	constructor(id: string, active?: boolean) {
		this.active = active === undefined ? true : active;
		this.id = id;
	}

	setComponent(component: ComponentBase): void {
		this.component = component;
	}

	addChildSelector(selector: HtmlSelector): void {
		if (!this.childSelectors) this.childSelectors = [];
		if (!this.childSelectors.includes(selector)) this.childSelectors.push(selector);
	}

	includesChildSelector(selector: HtmlSelector): boolean {
		if (!this.childSelectors) return false;
		return this.childSelectors.includes(selector);
	}
}

export abstract class HtmlPageBase {
	abstract pageId: string;

	baseChatUhtmlName: string = "";
	/**Only has a value when the page is currently displaying in chat */
	chatUhtmlName: string = "";
	closed: boolean = false;
	closeButtonHtml: string = "";
	components: ComponentBase[] = [];
	destroyed: boolean = false;
	/**If selectors are enabled, displays the expire message at the top of the page */
	expireSelector: HtmlSelector | null = null;
	expirationTimer: NodeJS.Timeout | null = null;
	/**If selectors are enabled, displays HTML at the bottom of the page */
	footerSelector: HtmlSelector | null = null;
	globalRoomPage: boolean = false;
	/**If selectors are enabled, displays HTML at the top of the page */
	headerSelector: HtmlSelector | null = null;
	initializedSelectors: boolean = false;
	initializedSelectorDivs: boolean = false;
	/**Store the last rendered HTML to avoid unnecessary messages */
	lastRender: string = '';
	/**If selectors are enabled, store the last rendered HTML for each one to avoid unnecessary messages */
	lastSelectorRenders: Dict<string> = {};
	readonly: boolean = false;
	sentClosingSnapshot: boolean = false;
	showSwitchLocationButton: boolean = false;
	staffUserView: boolean = false;
	successfullyOpenedPage: boolean = false;
	switchLocationButtonHtml: string = "";
	/**When `true`, the last render is not compared before sending */
	usedCommandAfterLastRender: boolean = false;
	useExpirationTimer: boolean = true;
	usesHtmlSelectors: boolean = false;

	/**The list of selectors in the desired render order */
	private htmlSelectors: HtmlSelector[] = [];

	baseCommand: string;
	commandPrefix: string;
	pageList: Dict<HtmlPageBase>;
	room: Room;

	isRoomStaff!: boolean;
	userName!: string;
	userId!: string;

	constructor(room: Room, userOrPlayer: User | Player, baseCommand: string, pageList: Dict<HtmlPageBase>) {
		this.room = room;
		this.baseCommand = baseCommand;
		this.commandPrefix = Config.commandCharacter + baseCommand + " " + (room.alias || room.id);
		this.pageList = pageList;

		this.setUser(userOrPlayer);

		if (userOrPlayer.id in pageList) pageList[userOrPlayer.id].destroy();
		pageList[userOrPlayer.id] = this;

		this.setExpirationTimer();
	}

	setExpirationTimer(): void {
		if (this.expirationTimer) clearTimeout(this.expirationTimer);

		if (this.useExpirationTimer) this.expirationTimer = setTimeout(() => this.expire(), EXPIRATION_TIMEOUT_SECONDS);
	}

	expire(): void {
		try {
			if (this.successfullyOpenedPage) {
				if (this.usesHtmlSelectors) {
					this.expireSelector!.active = true;
					this.sendSelector(this.expireSelector!, {onExpire: true});
				} else {
					this.send({onExpire: true});
				}
			}

			this.destroy();
		} catch (e) {
			Tools.logException(e as Error, "Error expiring " + this.pageId + " page for user " + this.userId);
		}
	}

	destroy(): void {
		if (this.destroyed) throw new Error(this.pageId + " page already destroyed for user " + this.userId);

		if (this.expirationTimer) {
			clearTimeout(this.expirationTimer);
			// @ts-expect-error
			this.expirationTimer = undefined;
		}

		for (const component of this.components) {
			component.destroy();
		}

		delete this.pageList[this.userId];

		this.destroyed = true;
		Tools.unrefProperties(this, ['closed', 'sentClosingSnapshot', 'destroyed', 'pageId', 'userName', 'userId']);
	}

	open(): void {
		this.send({onOpen: true});

		if (this.onOpen) this.onOpen();
	}

	close(): void {
		if (!this.closed && !this.sentClosingSnapshot) {
			this.closed = true;
			this.initializedSelectorDivs = false;

			const user = Users.get(this.userId);
			if (user) this.getPmRoom().closeHtmlPage(user, this.pageId);

			if (this.onClose) this.onClose();
		}

		this.destroy();
	}

	/**Close the HTML page while moving it to the chat */
	temporarilyClose(): void {
		if (!this.closed) {
			this.closed = true;
			this.initializedSelectorDivs = false;

			const user = Users.get(this.userId);
			if (user) this.getPmRoom().closeHtmlPage(user, this.pageId);
		}
	}

	sendClosingSnapshot(): void {
		if (!this.closed && !this.sentClosingSnapshot) {
			this.sentClosingSnapshot = true;

			const user = Users.get(this.userId);
			if (user) {
				if (this.usesHtmlSelectors) {
					const room = this.getPmRoom();
					for (const selector of this.htmlSelectors) {
						room.changeHtmlPageSelector(user, this.pageId, selector.id, this.renderSelector!(selector));
					}
				} else {
					const render = this.render!();
					if (this.chatUhtmlName) {
						this.getPmRoom().sayPrivateUhtml(user, this.chatUhtmlName, render);
					} else {
						this.getPmRoom().sendHtmlPage(user, this.pageId, render);
					}
				}
			}
		}

		this.destroy();
	}

	switchLocation(): void {
		let closeHtmlPage = true;
		if (this.chatUhtmlName) {
			closeHtmlPage = false;
			this.chatUhtmlName = "";
		} else {
			this.chatUhtmlName = this.baseChatUhtmlName;
		}

		this.usedCommandAfterLastRender = true;
		this.setSwitchLocationButtonHtml();
		this.setCloseButtonHtml();

		const user = Users.get(this.userId);
		if (user) {
			if (closeHtmlPage) {
				this.temporarilyClose();
			} else {
				this.getPmRoom().sayPrivateUhtml(user, this.baseChatUhtmlName, "<div>Successfully moved to an HTML page.</div>");
			}
		}

		this.send({forceSend: true});
	}

	setUser(userOrPlayer: User | Player): void {
		this.userName = userOrPlayer.name;
		this.userId = userOrPlayer.id;

		const user = Users.get(userOrPlayer.name);
		this.isRoomStaff = user ? user.hasRank(this.room, 'driver') : false;
	}

	onRenameUser(userOrPlayer: User | Player, oldId: string): void {
		if (!(oldId in this.pageList)) return;

		if (oldId === userOrPlayer.id) {
			this.userName = userOrPlayer.name;
			return;
		}

		if (userOrPlayer.id in this.pageList) {
			this.pageList[oldId].destroy();
		} else {
			this.setUser(userOrPlayer);
			this.pageList[userOrPlayer.id] = this;
		}

		delete this.pageList[oldId];
	}

	// allow the full page to be re-sent to the user after disconnecting
	onDestroyUser(): void {
		this.lastRender = "";
		this.lastSelectorRenders = {};
		this.initializedSelectorDivs = false;
	}

	getPmRoom(): Room {
		return this.room;
	}

	exceedsMessageSizeLimit(selector?: HtmlSelector): boolean {
		if (selector) {
			return Client.exceedsMessageSizeLimit("/changehtmlpageselector " + this.userId + "," + this.pageId + "," +
				SELECTOR_COMMAND_PREFIX + selector.id + "," + this.renderSelector!(selector));
		}

		return Client.exceedsMessageSizeLimit("/sendhtmlpage " + this.userId + "," + this.pageId + "," + this.render!());
	}

	getSelectors(): readonly HtmlSelector[] {
		return this.htmlSelectors;
	}

	addSelector(selector: HtmlSelector): void {
		this.htmlSelectors.push(selector);
	}

	newSelector(id: string, active?: boolean): HtmlSelector {
		return new HtmlSelector(id, active);
	}

	newComponentSelector(selector: HtmlSelector, id: string, active?: boolean): HtmlSelector {
		const componentSelector = new HtmlSelector(selector.id + "-" + id, active);
		selector.addChildSelector(componentSelector);

		return componentSelector;
	}

	send(options?: ISendOptions): void {
		if (this.destroyed) return;

		// selectors currently can't be used in the chat
		if (this.usesHtmlSelectors && !this.chatUhtmlName) {
			this.initializeSelectors();

			// send any selectors that have updated
			for (const selector of this.htmlSelectors) {
				// components with child selectors are rendered indivudually
				if (selector.childSelectors) {
					for (const childSelector of selector.childSelectors) {
						this.sendSelector(childSelector, options);
					}
				} else {
					this.sendSelector(selector, options);
				}
			}
		} else {
			// send the whole HTML page
			this.sendSinglePage(options);
		}
	}

	sendSinglePage(options?: ISendOptions): void {
		if (this.destroyed) return;

		const onOpen = options && options.onOpen;
		if (this.beforeSend && !this.beforeSend(onOpen)) return;

		const user = Users.get(this.userId);
		if (!user) return;

		const expire = options && options.onExpire;
		let render = "";
		if (expire) {
			render = EXPIRE_MESSAGE + this.lastRender;
		} else {
			render = this.render!(onOpen);
		}

		if (render === this.lastRender && !this.usedCommandAfterLastRender && !this.closed && !(options && options.forceSend)) return;

		this.lastRender = render;
		this.usedCommandAfterLastRender = false;
		this.closed = false;

		if (this.chatUhtmlName) {
			this.getPmRoom().sayPrivateUhtml(user, this.chatUhtmlName, render);
		} else {
			this.getPmRoom().sendHtmlPage(user, this.pageId, render);
		}

		if (this.onSend) this.onSend(onOpen);

		if (!expire) this.setExpirationTimer();

		this.successfullyOpenedPage = true;
	}

	getSelectorDiv(selector: HtmlSelector): string {
		// create parent divs for components and child divs if needed
		if (selector.component) return this.getComponentSelectorDiv(selector);

		return "<div id='" + selector.id + "'></div>";
	}

	getComponentSelectorDiv(selector: HtmlSelector): string {
		let div = "<div id='" + selector.id + "'>";
		if (selector.childSelectors) {
			div += this.getChildSelectorDivs(selector).join("");
		}
		div += "</div>";

		return div;
	}

	getChildSelectorDivs(selector: HtmlSelector): string[] {
		const divs: string[] = [];
		for (const childSelector of selector.childSelectors!) {
			const div = this.getSelectorDiv(childSelector);
			if (!divs.includes(div)) divs.push(div);
		}

		return divs;
	}

	getEmptySelectorDiv(selector: HtmlSelector): string {
		let div: string;
		if (selector.childSelectors) {
			div = this.getChildSelectorDivs(selector).join("");
		} else {
			div = EMPTY_SELECTOR_CONTENT;
		}

		return div;
	}

	/**Create default selectors and add to the page's list */
	initializeSelectors(): void {
		if (this.initializedSelectors) return;

		this.headerSelector = this.newSelector(HEADER_SELECTOR);
		this.footerSelector = this.newSelector(FOOTER_SELECTOR);
		this.expireSelector = this.newSelector(EXPIRE_SELECTOR, false);

		this.htmlSelectors.push(this.footerSelector);
		this.htmlSelectors.unshift(this.headerSelector);
		this.htmlSelectors.unshift(this.expireSelector);

		this.initializedSelectors = true;
	}

	/**Send <div> elements for all selectors that can be on the page, regardless of active status */
	initializeSelectorDivs(user: User): void {
		if (this.initializedSelectorDivs) return;

		let html = "<div class='chat' style='margin-top: 4px;margin-left: 4px'>";
		const divs: string[] = [];
		divs.push(this.getSelectorDiv(this.expireSelector!));
		divs.push(this.getSelectorDiv(this.headerSelector!));

		for (const selector of this.htmlSelectors) {
			const div = this.getSelectorDiv(selector);
			if (!divs.includes(div)) divs.push(div);
		}

		const div = this.getSelectorDiv(this.footerSelector!);
		if (!divs.includes(div)) divs.push(div);

		html += divs.join("") + "</div>";

		this.getPmRoom().sendHtmlPage(user, this.pageId, html);
		this.initializedSelectorDivs = true;
	}

	hideSelector(selector: HtmlSelector): void {
		// force send for component selectors
		this.sendSelector(selector, {forceSend: true, hideSelector: true});
	}

	sendSelector(selector: HtmlSelector, options?: ISendOptions): void {
		// ignore toggled selectors from activity pages that were moved to the chat
		if (!selector.active || this.destroyed || this.chatUhtmlName) return;

		const onOpen = options && options.onOpen;
		if (this.beforeSendSelector && !this.beforeSendSelector(selector, onOpen)) return;

		const user = Users.get(this.userId);
		if (!user) return;

		// initialize after closing or moving from chat
		this.initializeSelectorDivs(user);

		if (!(selector.id in this.lastSelectorRenders)) this.lastSelectorRenders[selector.id] = EMPTY_SELECTOR_CONTENT;

		const expire = options && options.onExpire;
		const hideSelector = options && options.hideSelector;

		let render: string;
		if (expire) {
			render = EXPIRE_MESSAGE;
		} else if (hideSelector) {
			render = this.getEmptySelectorDiv(selector);
		} else {
			render = this.renderSelector!(selector, onOpen);
			if (!render) render = EMPTY_SELECTOR_CONTENT;
		}

		if (render === this.lastSelectorRenders[selector.id] && !this.closed && !(options && options.forceSend)) return;

		this.lastSelectorRenders[selector.id] = render;
		this.closed = false;

		this.getPmRoom().changeHtmlPageSelector(user, this.pageId, SELECTOR_COMMAND_PREFIX + selector.id, render);

		if (this.onSendSelector) this.onSendSelector(selector, onOpen);

		if (!expire) this.setExpirationTimer();

		this.successfullyOpenedPage = true;
	}

	checkComponentCommands(componentCommand: string, targets: readonly string[]): string | undefined {
		if (this.destroyed) return;

		for (const component of this.components) {
			if (component.active && component.componentCommand === componentCommand) {
				this.usedCommandAfterLastRender = true;
				return component.tryCommand(targets);
			}
		}

		return "Unknown sub-command '" + componentCommand + "'.";
	}

	/**Get the render for the selector or component */
	checkComponentSelectors(selector: HtmlSelector): string {
		for (const component of this.components) {
			if (component.props.htmlPageSelector &&
				(component.props.htmlPageSelector === selector || component.props.htmlPageSelector.includesChildSelector(selector))) {
				let render = "";
				if (component.renderSelector) {
					render = component.renderSelector(selector);
				} else {
					render = component.render!();
				}

				if (render) return render;
			}
		}

		return "";
	}

	getTooltip(tip: string, icon?: string): string {
		return "&nbsp;<span title='" + tip + "'>" + (icon || "&#9432;") + "</span>";
	}

	getButtonDisabled(options?: IQuietPMButtonOptions): boolean | undefined {
		let disabled = this.sentClosingSnapshot || this.staffUserView || (options && (options.disabled || options.selectedAndDisabled));
		if (!disabled && options && !options.enabledReadonly && this.readonly) disabled = true;

		return disabled;
	}

	getQuietPmButton(message: string, label: string, options?: IQuietPMButtonOptions): string {
		const disabled = this.getButtonDisabled(options);

		let style = options && options.style ? options.style : "";
		if (options && (options.selected || options.selectedAndDisabled)) {
			if (style && !style.endsWith(';')) style += ';';
			style += 'border-color: #ffffff;';
		}

		return Client.getQuietPmButton(this.getPmRoom(), message, label, disabled, style);
	}

	setCloseButtonHtml(options?: IQuietPMButtonOptions): void {
		if (this.chatUhtmlName) {
			this.closeButtonHtml = "";
		} else {
			this.closeButtonHtml = this.getQuietPmButton(this.commandPrefix + (this.globalRoomPage ? " " : ", ") + CLOSE_COMMAND,
				"Close page", options);
		}
	}

	setSwitchLocationButtonHtml(): void {
		if (this.showSwitchLocationButton) {
			this.switchLocationButtonHtml = this.getQuietPmButton(this.commandPrefix + (this.globalRoomPage ? " " : ", ") +
			SWITCH_LOCATION_COMMAND, "Move to " + (this.chatUhtmlName ? "HTML page" : "chat"));
		} else {
			this.switchLocationButtonHtml = "";
		}
	}

	beforeSend?(onOpen?: boolean): boolean;
	beforeSendSelector?(selector: HtmlSelector, onOpen?: boolean): boolean;
	onClose?(): void;
	onOpen?(): void;
	onSend?(onOpen?: boolean): void;
	onSendSelector?(selector: HtmlSelector, onOpen?: boolean): void;
	render?(onOpen?: boolean): string;
	renderSelector?(selector: HtmlSelector, onOpen?: boolean): string;
}

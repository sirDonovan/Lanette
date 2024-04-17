import type { HtmlPageBase, HtmlSelector, IQuietPMButtonOptions } from "../html-page-base";

export interface IComponentProps {
	readonly?: boolean;
	htmlPageSelector?: HtmlSelector;
}

export abstract class ComponentBase<PropsType extends IComponentProps = IComponentProps> {
	abstract componentId: string;

	active: boolean = true;
	components: ComponentBase[] = [];
	destroyed: boolean = false;
	timeout: NodeJS.Timeout | null = null;

	/**The list of selectors in the desired render order */
	private htmlSelectors: HtmlSelector[] = [];

	commandPrefix: string;
	componentCommand: string;
	htmlPage: HtmlPageBase;
	parentCommandPrefix: string;
	props: PropsType;

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: PropsType) {
		this.htmlPage = htmlPage;
		this.parentCommandPrefix = parentCommandPrefix;
		this.componentCommand = componentCommand;
		this.commandPrefix = parentCommandPrefix + ", " + componentCommand;
		this.props = props;

		if (props.htmlPageSelector) props.htmlPageSelector.setComponent(this);
	}

	abstract tryCommand(targets: readonly string[]): string | undefined;

	destroy(): void {
		// prevent accidental looping from sub-components
		if (this.destroyed) return;

		if (this.cleanupTimers) this.cleanupTimers();

		if (this.timeout) {
			clearTimeout(this.timeout);
			// @ts-expect-error
			this.timeout = undefined;
		}

		for (const component of this.components) {
			component.destroy();
		}

		this.destroyed = true;

		Tools.unrefProperties(this.props);
		Tools.unrefProperties(this, ['destroyed']);
	}

	addSelector(selector: HtmlSelector): void {
		if (!this.props.htmlPageSelector) throw new Error("Missing HTML page selector");

		this.htmlSelectors.push(selector);
	}

	newSelector(id: string, active?: boolean): HtmlSelector {
		if (!this.props.htmlPageSelector) throw new Error("Missing HTML page selector");

		return this.htmlPage.newComponentSelector(this.props.htmlPageSelector, id, active);
	}

	send(): void {
		if (this.htmlSelectors.length) {
			for (const selector of this.htmlSelectors) {
				this.htmlPage.sendSelector(selector);
			}
		} else if (this.props.htmlPageSelector) {
			this.htmlPage.sendSelector(this.props.htmlPageSelector);
		} else {
			this.htmlPage.send();
		}
	}

	/**Show all selectors of this component that are currently active */
	show(): void {
		if (this.htmlSelectors.length) {
			for (const selector of this.htmlSelectors) {
				this.htmlPage.sendSelector(selector, {forceSend: true});
			}
		} else if (this.props.htmlPageSelector) {
			this.htmlPage.sendSelector(this.props.htmlPageSelector, {forceSend: true});
		}
	}

	/**Hide all selectors of this component*/
	hide(): void {
		if (this.props.htmlPageSelector) {
			this.htmlPage.hideSelector(this.props.htmlPageSelector);
		}
	}

	toggleActive(active: boolean, onOpen?: boolean): void {
		if (this.active === active && !onOpen) return;

		this.active = active;

		if (active) {
			for (const selector of this.htmlSelectors) {
				selector.active = true;
			}
			if (this.props.htmlPageSelector) {
				this.props.htmlPageSelector.active = true;
			}

			this.show();
		} else {
			this.hide();

			// change active status after to bypass check in htmlPage.sendSelector()
			for (const selector of this.htmlSelectors) {
				selector.active = false;
			}
			if (this.props.htmlPageSelector) {
				this.props.htmlPageSelector.active = false;
			}
		}
	}

	checkComponentCommands(componentCommand: string, targets: readonly string[]): string | undefined {
		if (this.destroyed) return;

		for (const component of this.components) {
			if (component.active && component.componentCommand === componentCommand) {
				return component.tryCommand(targets);
			}
		}

		return "Unknown sub-command '" + componentCommand + "'.";
	}

	getQuietPmButton(message: string, label: string, options?: IQuietPMButtonOptions): string {
		let disabled = this.htmlPage.sentClosingSnapshot || this.htmlPage.staffUserView ||
			(options && (options.disabled || options.selectedAndDisabled));
		if (!disabled && options && !options.enabledReadonly && this.props.readonly) disabled = true;

		let style = options && options.style ? options.style : "";
		if (options && (options.selected || options.selectedAndDisabled)) {
			if (style && !style.endsWith(';')) style += ';';
			style += 'border-color: #ffffff;';
		}

		return Client.getQuietPmButton(this.htmlPage.getPmRoom(), message, label, disabled, style);
	}

	cleanupTimers?(): void;
	render?(onOpen?: boolean): string;
	renderSelector?(selector: HtmlSelector, onOpen?: boolean): string;
}

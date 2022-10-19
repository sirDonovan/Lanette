import type { HtmlPageBase, IQuietPMButtonOptions } from "../html-page-base";

export interface IComponentProps {
	readonly?: boolean;
	reRender: () => void;
}

export abstract class ComponentBase<PropsType extends IComponentProps = IComponentProps> {
	abstract componentId: string;

	active: boolean = true;
	destroyed: boolean = false;
	components: ComponentBase[] = [];
	timeout: NodeJS.Timer | null = null;

	htmlPage: HtmlPageBase;
	commandPrefix: string;
	parentCommandPrefix: string;
	componentCommand: string;
	props: PropsType;

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: PropsType) {
		this.htmlPage = htmlPage;
		this.parentCommandPrefix = parentCommandPrefix;
		this.componentCommand = componentCommand;
		this.commandPrefix = parentCommandPrefix + ", " + componentCommand;
		this.props = props;
	}

	abstract render(onOpen?: boolean): string;
	abstract tryCommand(targets: readonly string[]): string | undefined;

	destroy(): void {
		if (this.timeout) clearTimeout(this.timeout);

		this.destroyed = true;

		Tools.unrefProperties(this.props);
		Tools.unrefProperties(this, ['destroyed']);
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
		let disabled = this.htmlPage.closingSnapshot || this.htmlPage.staffUserView ||
			(options && (options.disabled || options.selectedAndDisabled));
		if (!disabled && options && !options.enabledReadonly && this.props.readonly) disabled = true;

		let style = options && options.style ? options.style : "";
		if (options && (options.selected || options.selectedAndDisabled)) {
			if (style && !style.endsWith(';')) style += ';';
			style += 'border-color: #ffffff;';
		}

		return Client.getQuietPmButton(this.htmlPage.getPmRoom(), message, label, disabled, style);
	}
}

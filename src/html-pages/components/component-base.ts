import type { Room } from "../../rooms";
import type { IQuietPMButtonOptions } from "../html-page-base";

export interface IComponentProps {
	readonly?: boolean;
	reRender: () => void;
}

export abstract class ComponentBase<PropsType extends IComponentProps = IComponentProps> {
	abstract componentId: string;

	active: boolean = true;
	closed: boolean = false;
	components: ComponentBase[] = [];
	timeout: NodeJS.Timer | null = null;

	room: Room;
	commandPrefix: string;
	parentCommandPrefix: string;
	componentCommand: string;
	props: PropsType;

	constructor(room: Room, parentCommandPrefix: string, componentCommand: string, props: PropsType) {
		this.room = room;
		this.parentCommandPrefix = parentCommandPrefix;
		this.componentCommand = componentCommand;
		this.commandPrefix = parentCommandPrefix + ", " + componentCommand;
		this.props = props;
	}

	abstract render(onOpen?: boolean): string;
	abstract tryCommand(targets: readonly string[]): string | undefined;

	destroy(): void {
		if (this.timeout) clearTimeout(this.timeout);

		this.closed = true;
		Tools.unrefProperties(this, ['closed']);
	}

	checkComponentCommands(componentCommand: string, targets: readonly string[]): string | undefined {
		for (const component of this.components) {
			if (component.active && component.componentCommand === componentCommand) {
				return component.tryCommand(targets);
			}
		}

		return "Unknown sub-command '" + componentCommand + "'.";
	}

	getQuietPmButton(message: string, label: string, options?: IQuietPMButtonOptions): string {
		let disabled = options && (options.disabled || options.selectedAndDisabled);
		if (!disabled && options && !options.enabledReadonly && this.props.readonly) disabled = true;

		let style = options && options.style ? options.style : "";
		if (options && (options.selected || options.selectedAndDisabled)) {
			if (style && !style.endsWith(';')) style += ';';
			style += 'border-color: #ffffff;';
		}

		return Client.getQuietPmButton(this.room, message, label, disabled, style);
	}
}

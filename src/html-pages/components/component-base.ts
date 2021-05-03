import type { Room } from "../../rooms";

export interface IComponentProps {
	reRender: () => void;
}

export abstract class ComponentBase<PropsType extends IComponentProps = IComponentProps> {
	abstract componentId: string;

	active: boolean = true;
	components: ComponentBase[] = [];

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

	checkComponentCommands(componentCommand: string, targets: readonly string[]): string | undefined {
		for (const component of this.components) {
			if (component.active && component.componentCommand === componentCommand) {
				return component.tryCommand(targets);
			}
		}

		return "Unknown sub-command '" + componentCommand + "'.";
	}

	getQuietPmButton(message: string, label: string, disabled?: boolean, buttonStyle?: string): string {
		return Client.getQuietPmButton(this.room, message, label, disabled, buttonStyle);
	}
}

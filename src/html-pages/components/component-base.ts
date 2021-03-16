export abstract class ComponentBase {
	active: boolean = true;
	components: ComponentBase[] = [];

	commandPrefix: string;
	parentCommandPrefix: string;
	componentCommand: string;

	constructor(parentCommandPrefix: string, componentCommand: string) {
		this.parentCommandPrefix = parentCommandPrefix;
		this.componentCommand = componentCommand;
		this.commandPrefix = parentCommandPrefix + ", " + componentCommand;
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
}

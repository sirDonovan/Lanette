import type { CommandContext } from "../command-parser";
import type { Room } from "../rooms";
import type { IClientMessageTypes } from "./client";
import type { CommandDefinitions } from "./command-parser";

export interface IPluginConstructor {
	new (): IPluginInterface;
}

export interface IPluginInterface {
	name: string;
	loadData?: () => void;
	onReload?: (previous: Partial<IPluginInterface>) => void;
	parseMessage?: (room: Room, messageType: keyof IClientMessageTypes, messageParts: string[]) => true | undefined;
}

export interface IParseMessagePlugin {
	parseMessage: NonNullable<IPluginInterface['parseMessage']>;
}

export interface IPluginFile {
	commands?: CommandDefinitions<CommandContext>;
	Module?: IPluginConstructor;
}

export type LoadedPlugin = Omit<IPluginFile, "Module"> & {moduleName?: string};
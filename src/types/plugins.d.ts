import type { ICommandDefinition, Command } from "../command-parser";
import type { Room } from "../rooms";
import type { IClientMessageTypes } from "../types/client";

export interface IPluginConstructor {
	new (): IPluginInterface;
}

export interface IPluginInterface {
	name: string;
	loadData?: () => Promise<void>;
	parseMessage?: (room: Room, messageType: keyof IClientMessageTypes, messageParts: string[]) => true | undefined;
}

export interface IParseMessagePlugin {
	parseMessage: NonNullable<IPluginInterface['parseMessage']>;
}

export interface IPluginFile {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	commands?: Dict<ICommandDefinition<Command, any>>;
	Module?: IPluginConstructor;
}

export type LoadedPlugin = Omit<IPluginFile, "Module"> & {moduleName?: string};
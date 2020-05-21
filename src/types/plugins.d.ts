import { ICommandDefinition } from "../command-parser";
import { IClientMessageTypes } from "../types/client";
import { Room } from "../rooms";

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
	commands?: Dict<ICommandDefinition>;
	Module?: IPluginConstructor;
}

export type LoadedPlugin = Omit<IPluginFile, "Module"> & {moduleName?: string};
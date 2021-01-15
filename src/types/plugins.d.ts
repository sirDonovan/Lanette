import type { Room } from "../rooms";
import type { IClientMessageTypes } from "./client";
import type { BaseCommandDefinitions } from "./command-parser";

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
	commands?: BaseCommandDefinitions;
	Module?: IPluginConstructor;
}

export type LoadedPlugin = Omit<IPluginFile, "Module"> & {moduleName?: string};
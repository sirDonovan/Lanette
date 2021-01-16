import type { CommandContext } from "../command-parser";
import type { Room } from "../rooms";
import type { User } from "../users";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ICommandDefinition<ThisContext, ReturnType = any> {
	command: (this: ThisContext, target: string, room: Room | User, user: User, alias: string, timestamp: number) => ReturnType;
	aliases?: string[];
	readonly chatOnly?: boolean;
	readonly eliminatedGameCommand?: boolean;
	readonly developerOnly?: boolean;
	readonly pmGameCommand?: boolean;
	readonly pmOnly?: boolean;
	readonly signupsGameCommand?: boolean;
	readonly spectatorGameCommand?: boolean;
	readonly staffGameCommand?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LoadedCommand<ThisContext, ReturnType = any> = Omit<ICommandDefinition<ThisContext, ReturnType>, "aliases">;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CommandDefinitions<ThisContext, ReturnType = any> = Dict<ICommandDefinition<ThisContext, ReturnType>>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LoadedCommands<ThisContext, ReturnType = any> = Dict<LoadedCommand<ThisContext, ReturnType>>;

export type BaseCommandDefinitions = CommandDefinitions<CommandContext, void>;
export type BaseLoadedCommands = LoadedCommands<CommandContext, void>;

export type CommandErrorOptionalTarget = 'invalidBotRoom' | 'invalidAbility' | 'invalidFormat' | 'invalidGameFormat' | 'invalidItem' |
	'invalidMove' | 'invalidPokemon' | 'invalidTournamentFormat' | 'invalidUserHostedGameFormat' | 'invalidType' | 'invalidEggGroup' |
	'tooManyGameModes' | 'tooManyGameVariants' | 'emptyUserHostedGameQueue';

export type CommandErrorRequiredTarget = 'noPmHtmlRoom' | 'missingBotRankForFeatures' | 'disabledTournamentFeatures' |
	'disabledGameFeatures' | 'disabledTournamentGameFeatures' | 'disabledUserHostedGameFeatures' | 'disabledUserHostedTournamentFeatures' |
	'noRoomEventInformation' | 'invalidRoomEvent' | 'invalidGameOption' | 'disabledGameFormat';

export type CommandErrorNoTarget = 'invalidUserInRoom' | 'invalidUsernameLength' | 'reloadInProgress' | 'invalidHttpsLink' | 'noPmGameRoom';

export type CommandErrorArray = [CommandErrorOptionalTarget, string?] | [CommandErrorRequiredTarget, string] | [CommandErrorNoTarget];

export interface ICommandFile {
	commands?: BaseCommandDefinitions;
}

export interface IHtmlPageFile {
	commands?: BaseCommandDefinitions;
}
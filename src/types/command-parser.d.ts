import type { CommandContext } from "../command-parser";
import type { HtmlPageBase } from "../html-pages/html-page-base";
import type { Room } from "../rooms";
import type { User } from "../users";

export interface ICommandGuide {
	aliases?: string[];
	readonly chatOnly?: boolean;
	readonly description?: readonly string[];
	readonly developerOnly?: boolean;
	readonly pmOnly?: boolean;
	readonly pmSyntax?: readonly string[];
	readonly syntax?: readonly string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ICommandDefinition<ThisContext, ReturnType = any> extends ICommandGuide {
	command: (this: ThisContext, target: string, room: Room | User, user: User, alias: string, timestamp: number) => ReturnType;
	readonly eliminatedGameCommand?: boolean;
	readonly pmGameCommand?: boolean;
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
	'disabledGameFeatures' | 'disabledTournamentGameFeatures' | 'disabledSearchChallengeFeatures' | 'disabledUserHostedGameFeatures' |
	'disabledUserHostedTournamentFeatures' | 'noRoomEventInformation' | 'invalidRoomEvent' | 'invalidGameOption' | 'disabledGameFormat' |
	'gameOptionRequiresFreejoin';

export type CommandErrorNoTarget = 'invalidUserInRoom' | 'invalidUsernameLength' | 'reloadInProgress' | 'invalidHttpsLink' |
	'noPmGameRoom' | 'noBotRankRoom';

export type CommandErrorArray = [CommandErrorOptionalTarget, string?] | [CommandErrorRequiredTarget, string] | [CommandErrorNoTarget];

export interface ICommandFile {
	commands?: BaseCommandDefinitions;
}

export interface IHtmlPageFile {
	pageId: string;
	pages: Dict<HtmlPageBase>;
	commands?: BaseCommandDefinitions;
}
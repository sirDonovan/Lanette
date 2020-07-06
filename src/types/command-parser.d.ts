import type { Command } from "../command-parser";
import type { Room } from "../rooms";
import type { User } from "../users";

export interface ICommandDefinition<T, U> {
	asyncCommand?: (this: T, target: string, room: Room | User, user: User, alias: string) => Promise<U>;
	command?: (this: T, target: string, room: Room | User, user: User, alias: string) => U;
	aliases?: string[];
	readonly chatOnly?: boolean;
	readonly eliminatedGameCommand?: boolean;
	readonly developerOnly?: boolean;
	readonly pmGameCommand?: boolean;
	readonly pmOnly?: boolean;
	readonly signupsGameCommand?: boolean;
	readonly staffGameCommand?: boolean;
}

export type CommandsDict<T, U> = Dict<Omit<ICommandDefinition<T, U>, "aliases">>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BaseCommandsDict = CommandsDict<Command, any>;

export type CommandErrorOptionalTarget = 'invalidBotRoom' | 'invalidFormat' | 'invalidGameFormat' | 'invalidTournamentFormat' |
	'invalidUserHostedGameFormat' | 'tooManyGameModes' | 'tooManyGameVariants' | 'emptyUserHostedGameQueue';

export type CommandErrorRequiredTarget = 'noPmHtmlRoom' | 'missingBotRankForFeatures' | 'disabledTournamentFeatures' | 'disabledGameFeatures' |
	'disabledUserHostedGameFeatures' | 'disabledUserHostedTournamentFeatures' |'noRoomEventInformation' | 'invalidRoomEvent' |
	'invalidGameOption' | 'disabledGameFormat';

export type CommandErrorNoTarget = 'invalidUserInRoom' | 'invalidUsernameLength' | 'reloadInProgress' | 'invalidHttpsLink' | 'noPmGameRoom';

export type CommandErrorArray = [CommandErrorOptionalTarget, string?] | [CommandErrorRequiredTarget, string] | [CommandErrorNoTarget];

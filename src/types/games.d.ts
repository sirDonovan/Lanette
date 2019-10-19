import { CommandsDict, ICommandDefinition } from "../command-parser";
import { UserHosted } from "../games/internal/user-hosted";
import { Game } from "../room-game";
import { Room } from "../rooms";
import { User } from "../users";
import { IWorker } from "./global-types";

export type GameCommandReturnType = boolean;
export type GameDifficulty = 'easy' | 'medium' | 'hard';

export interface IInternalGames {
	vote: string;
}

export type InternalGameKey = keyof IInternalGames;

interface IGameClass<T> {
	new(room: Room | User, pmRoom?: Room): T;
	loadData?(room: Room | User, extendedClass?: boolean): void;
}

export interface IGameFile<T extends Game = Game> {
	readonly class: IGameClass<T>;
	readonly description: string;
	readonly name: string;

	aliases?: string[];
	commands?: Dict<ICommandDefinition<T>>;
	readonly commandDescriptions?: string[];
	readonly freejoin?: boolean;
	/** Legacy names, such as from before game mascots were introduced; used for aliases */
	formerNames?: string[];
	readonly mascot?: string;
	readonly mascots?: string[];
	minigameCommand?: string;
	minigameCommandAliases?: string[];
	readonly minigameDescription?: string;
	readonly modes?: string[];
	readonly scriptedOnly?: boolean;
	readonly tests?: (this: Mocha.Context, game: T) => void;
	readonly variants?: (Partial<T> & IGameVariant)[];
	readonly workers?: IWorker[];
}

export interface IGameVariant {
	readonly name: string;
	readonly variant: string;

	readonly commandDescriptions?: string[];
	readonly description?: string;
	readonly mode?: string;
	variantAliases?: string[];
}

export interface IUserHostedFile<T extends UserHosted = UserHosted> {
	readonly class: IGameClass<T>;
	readonly formats: IUserHosted[];
}

export type UserHostedCustomizable = 'name' | 'link';
interface IUserHosted {
	readonly description: string;
	name: string;

	aliases?: string[];
	readonly approvedHostOnly?: boolean;
	readonly customizableAttributes?: UserHostedCustomizable[];
	readonly freejoin?: boolean;
	link?: string;
	readonly mascot?: string;
	readonly mascots?: string[];
}

export interface IUserHostedComputed<T extends UserHosted = UserHosted> extends IUserHosted {
	readonly class: IGameClass<T>;
	readonly id: string;
}

export interface IUserHostedFormatComputed {
	readonly effectType: 'UserHostedFormat';
	inputOptions: Dict<number>;
	inputTarget: string;
}

export interface IUserHostedFormat<T extends UserHosted = UserHosted> extends IUserHostedComputed<T>, IUserHostedFormatComputed {}

export interface IGameFileComputed<T extends Game = Game> extends IGameFile<T> {
	readonly id: string;

	commands?: CommandsDict<T>;
}

export interface IGameFormatComputed {
	readonly effectType: 'GameFormat';
	inputOptions: Dict<number>;
	inputTarget: string;

	readonly mode?: IGameMode;
	readonly variant?: IGameVariant;
}

export interface IGameModeFile<T = Game, U extends Game = Game> {
	readonly description: string;
	initialize: (game: Game) => void;
	readonly name: string;
	readonly naming: 'prefix' | 'suffix';

	aliases?: string[];
	readonly commands?: CommandsDict<T & U, GameCommandReturnType>;
}

export interface IGameMode<T = Game, U extends Game = Game> extends IGameModeFile<T, U> {
	readonly id: string;
}

export interface IGameFormat<T extends Game = Game> extends IGameFileComputed<T>, IGameFormatComputed {}

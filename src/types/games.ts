import { ICommandDefinition } from "../command-parser";
import { UserHosted } from "../games/templates/user-hosted";
import { Game } from "../room-game";
import { Room } from "../rooms";
import { User } from "../users";

interface IGameClass<T> {
	new(room: Room | User, pmRoom?: Room): T;
	loadData?(room: Room | User): void;
}

export interface IGameFile<T extends Game = Game> {
	class: IGameClass<T>;
	description: string;
	name: string;

	aliases?: string[];
	commands?: Dict<ICommandDefinition<T>>;
	commandDescriptions?: string[];
	freejoin?: boolean;
	/** Legacy names, such as from before game mascots were introduced; used for aliases */
	formerNames?: string[];
	mascot?: string;
	mascots?: string[];
	minigameCommand?: string;
	minigameDescription?: string;
	modes?: string[];
	scriptedOnly?: boolean;
	variants?: IGameVariant[];
}

export interface IGameVariant {
	name: string;
	variant: string;

	description?: string;
	variantAliases?: string[];
}

export interface IUserHostedFile<T extends UserHosted = UserHosted> {
	class: IGameClass<T>;
	formats: IUserHosted[];
}

interface IUserHosted {
	description: string;
	name: string;

	aliases?: string[];
	approvedHostOnly?: boolean;
	formerNames?: string[];
	freejoin?: boolean;
	mascot?: string;
	mascots?: string[];
}

export interface IUserHostedComputed<T extends UserHosted = UserHosted> extends IUserHosted {
	class: IGameClass<T>;
	id: string;
}

export interface IUserHostedFormatComputed {
	effectType: 'UserHostedFormat';
	inputOptions: Dict<number>;
}

export interface IUserHostedFormat extends IUserHostedComputed, IUserHostedFormatComputed {}

export interface IGameFileComputed extends IGameFile {
	id: string;
}

export interface IGameFormatComputed {
	effectType: 'GameFormat';
	inputOptions: Dict<number>;

	mode?: IGameMode;
	variant?: IGameVariant;
}

export interface IGameModeFile<T = Game, U extends Game = Game> {
	description: string;
	initialize: (game: Game) => void;
	name: string;
	naming: 'prefix' | 'suffix';

	aliases?: string[];
	commands?: Dict<ICommandDefinition<T & U>>;
}

export interface IGameMode extends IGameModeFile {
	id: string;
}

export interface IGameFormat extends IGameFileComputed, IGameFormatComputed {}

import type { IOutgoingMessage } from "../types/client";
import type { IGameFormat } from "../types/games";

export type GameServerEndpoint = 'refresh' | 'reload' | 'reloadAll' | 'reloadGameServer' | 'createGame' | 'startGame' | 'restartGame' |
    'endGame' | 'addPlayers' | 'choosePlayer' | 'useCommand' | 'checkMessageQueue' | 'chatCommand' | 'pmCommand';

export type MessageQueue = IOutgoingMessage[];

export interface IGameServerRequest<T = string> {
    input: T;
}

export interface IGameServerResponse {
    currentPlayer?: string;
    error?: string;
}

export interface IMessageQueueResponse extends IGameServerResponse {
    queue: MessageQueue;
}

export interface IAddPlayersResponse extends IMessageQueueResponse {
    players: Dict<string>;
}

export interface ICreateGameResponse extends IAddPlayersResponse {
    format: IGameFormat | null;
}

export interface IRefreshResponse extends Partial<ICreateGameResponse>, Partial<IMessageQueueResponse> {
    botName: string;
    startedGame?: boolean;
}
import type http = require('http');

import { reloadModules } from '../app';
import type { Player } from '../room-activity';
import type { ScriptedGame } from '../room-game-scripted';
import type { Room } from '../rooms';
import type { IGameFormat } from '../types/games';
import type {
    GameServerEndpoint,
    IAddPlayersResponse, IGameServerRequest, IGameServerResponse, IMessageQueueResponse, IRefreshResponse, ICreateGameResponse,
    MessageQueue
} from './types';

const allModulesToReload = ['client', 'commandparser', 'config', 'dex', 'games', 'storage', 'tools', 'tournaments'];
const buttonSplitToken = "<button ";
const formattedSendButtonPrefix = 'class="button" name="send"';
const chatCommandButton = 'class="button chat-command-button" name="send"';
const pmCommandButton = 'class="button pm-command-button" name="send"';

let room: Room | null = null;
let gameFormat: IGameFormat | null = null;
let game: ScriptedGame | undefined = undefined;
let playerCount = 0;
let players: Dict<Player> = {};
let currentPlayerId = "";
let botMsgPrefix = "";
let msgRoomPrefix = "";
let msgSelfPrefix = "";

const requestListener = (req: http.IncomingMessage, res: http.ServerResponse) => {
    req.setEncoding('utf8');

    let bodyJson = '';
    req.on('data', (chunk) => {
        bodyJson += chunk;
    });

    req.on('end', () => {
        if (req.url === '/favicon.ico') return;

        const body = JSON.parse(bodyJson) as IGameServerRequest;

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

        // response.error is checked in the frontend instead of status code
        res.writeHead(200);

        const endpoint = (req.url ? req.url.slice(1) : "") as GameServerEndpoint;
        if (endpoint === 'refresh') {
            const response: IRefreshResponse = {
                botName: Users.self.name,
                players: getPlayerNames(),
                startedGame: game && game.started && !game.ended ? true : false,
            };

            if (gameFormat) response.format = gameFormat;
            if (game) response.queue = getMessageQueue(true);

            res.end(stringifyResponse(response));
        } else if (endpoint === 'reload' || endpoint === 'reloadAll' || endpoint === 'reloadGameServer') {
            if (game && !game.ended) game.forceEnd(Users.self);

            res.write("");

            // @ts-expect-error
            Client.websocket.ws = null;

            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            reloadModules("dev", endpoint === 'reloadGameServer' ? ['tools'] : endpoint === 'reload' ? body.input.split(',') :
                allModulesToReload).then(error => {
                if (error) {
                    res.end(stringifyResponse({error}));
                } else {
                    // @ts-expect-error
                    global._reloadGameServer(); // eslint-disable-line @typescript-eslint/no-unsafe-call

                    console.clear();
                    console.log("Successfully reloaded");
                    res.end(getMessageQueueResponse());
                }
            });
        } else if (endpoint === 'createGame') {
            const format = Games.getFormat(body.input);

            const response: ICreateGameResponse = {
                queue: [],
                format: null,
                players: {},
            };

            if (Array.isArray(format)) {
                response.error = CommandParser.getErrorText(format);
            } else {
                response.format = format;
                gameFormat = format;

                createGame();
                response.queue = getMessageQueue();
            }

            res.end(stringifyResponse(response));
        } else if (endpoint === 'startGame') {
            if (!game) return;

            const response: IMessageQueueResponse = {
                queue: [],
            };

            if (game.options.freejoin) {
                response.error = "This game is freejoin";
            } else if (!game.start()) {
                response.error = "Not enough players created";
            } else {
                if (game.timeLimit) game.timeLimit = 0;
                response.queue = getMessageQueue();
            }

            res.end(stringifyResponse(response));
        } else if (endpoint === 'restartGame') {
            if (!game) return;

            createGame();

            res.end(getMessageQueueResponse());
        } else if (endpoint === 'endGame') {
            if (!game) return;

            if (game.ended) {
                res.end(stringifyResponse({error: "The game already ended"}));
            } else {
                game.forceEnd(Users.self);
                game = undefined;

                res.end(getMessageQueueResponse());
            }
        } else if (endpoint === 'addPlayers') {
            if (!game) return;

            const inputPlayerCount = parseInt(body.input);
            if (isNaN(inputPlayerCount)) return;

            playerCount = inputPlayerCount;

            const response: IAddPlayersResponse = {
                queue: [],
                players: {},
            };

            const error = addPlayers();
            if (error) {
                response.error = error;
            } else {
                response.players = getPlayerNames();
                response.queue = getMessageQueue();
            }

            res.end(stringifyResponse(response));
        } else if (endpoint === 'choosePlayer') {
            if (!game) return;

            const response: IGameServerResponse = {};

            const id = Tools.toId(body.input);
            if (!(id in players)) {
                response.error = "Invalid player '" + id + "'";
            } else {
                currentPlayerId = id;
            }

            res.end(stringifyResponse(response));
        } else if (endpoint === 'chatCommand' || endpoint === 'pmCommand') {
            if (!game || !currentPlayerId) return;

            const response: IMessageQueueResponse = {
                queue: [],
            };

            const input = body.input.trim();
            const parts = input.split(" ");
            const command = Tools.toId(parts[0]);
            if (!(command in Commands)) {
                response.error = "Invalid command '" + command + "'";
            } else {
                const user = Users.get(currentPlayerId)!;
                CommandParser.parse(endpoint === 'pmCommand' ? user : room!, user, input, Date.now());

                if (game.currentPlayer) currentPlayerId = game.currentPlayer.id;
                response.currentPlayer = currentPlayerId;
                response.queue = getMessageQueue();
            }

            res.end(stringifyResponse(response));
        } else if (endpoint === 'checkMessageQueue') {
            if (!game) return;

            if (game.currentPlayer) currentPlayerId = game.currentPlayer.id;

            const response: IMessageQueueResponse = {
                queue: getMessageQueue(),
                currentPlayer: currentPlayerId,
            };

            res.end(stringifyResponse(response));
        }
    });

    req.on('error', e => {
        console.log("Request error: " + e.message);
        console.log(e);
    });
};

function getPlayerNames(): Dict<string> {
    const playerNames: Dict<string> = {};
    for (const id in players) {
        playerNames[id] = players[id].name;
    }

    return playerNames;
}

function getMessageQueue(onRefresh?: boolean): MessageQueue {
    // @ts-expect-error
    const queue = Client.websocket.getOutgoingMessageQueue();
    const filtered: MessageQueue = [];

    for (const message of queue) {
        // @ts-expect-error
        if (message._parsed && !onRefresh) continue;

        if (game && room && !onRefresh) {
            if (message.type === 'chat') {
                const id = Tools.toId(message.text);
                if (id in room.messageListeners) {
                    room.messageListeners[id](Date.now());
                    delete room.messageListeners[id];
                }
            } else if (message.type === 'chat-html' || message.type === 'private-html') {
                const id = Tools.toId(Client.getListenerHtml(message.rawHtml!));
                if (id in room.htmlMessageListeners) {
                    room.htmlMessageListeners[id](Date.now());
                    delete room.htmlMessageListeners[id];
                } else {
                    const unescapedId = Tools.toId(Tools.unescapeHTML(message.rawHtml!));
                    if (unescapedId in room.htmlMessageListeners) {
                        room.htmlMessageListeners[unescapedId](Date.now());
                        delete room.htmlMessageListeners[unescapedId];
                    }
                }
            } else if (message.type === 'chat-uhtml' || message.type === 'chat-uhtml-change' || message.type === 'private-uhtml' ||
                message.type === 'private-uhtml-change') {
                const name = Tools.toId(message.uhtmlName);
                const htmlId = Tools.toId(Client.getListenerUhtml(message.rawHtml!));
                if (name in room.uhtmlMessageListeners && htmlId in room.uhtmlMessageListeners[name]) {
                    room.uhtmlMessageListeners[name][htmlId](Date.now());
                    room.removeUhtmlMessageListener(name, htmlId);
                }
            }

            if (message.rawHtml && (message.rawHtml.includes(botMsgPrefix) || message.rawHtml.includes(msgRoomPrefix) ||
                message.rawHtml.includes(msgSelfPrefix))) {
                const replacedHtml = message.rawHtml.split(buttonSplitToken).map(button => {
                    let pmCommand = false;
                    if (button.includes(botMsgPrefix)) {
                        pmCommand = true;
                        button = button.replaceAll(botMsgPrefix, "");
                    }

                    if (button.includes(msgRoomPrefix)) {
                        button = button.replaceAll(msgRoomPrefix, "");
                    }

                    if (button.includes(msgSelfPrefix)) {
                        pmCommand = true;
                        button = button.replaceAll(msgSelfPrefix, "");
                    }

                    return button.replaceAll(formattedSendButtonPrefix, pmCommand ? pmCommandButton : chatCommandButton);
                }).join(buttonSplitToken);

                // @ts-expect-error
                message.rawHtml = replacedHtml;
            }
        }

        // @ts-expect-error
        message._parsed = true;

        filtered.push(message);
    }

    return filtered;
}

function getMessageQueueResponse(): string {
    return stringifyResponse({queue: getMessageQueue()});
}

function stringifyResponse(response: IGameServerResponse | IMessageQueueResponse): string {
    return JSON.stringify(response);
}

function addPlayers(): string | undefined {
    if (!game) return;

    currentPlayerId = "";
    players = {};
    for (let i = 1; i <= playerCount; i++) {
        const name = "Player " + i;
        const user = Users.get(name) || Users.add(name, Tools.toId(name));
        if (!user.rooms.has(room!)) room!.onUserJoin(user, " ");

        const player = game.players[user.id] as Player | undefined ||
            (game.options.freejoin ? game.createPlayer(user) : game.addPlayer(user));
        if (!player) {
            return name + " not created";
        }

        players[player.id] = player;
    }
}

function createGame(): void {
    if (!gameFormat) return;

    if (game && !game.ended) game.deallocate(true);

    // @ts-expect-error
    Client.websocket.outgoingMessageQueue = [];

    game = Games.createGame(room!, gameFormat);
    if (!game) return;

    game.signups();
}

function modifyGlobals(): void {
    // allow outgoing messages to be queued and read later

    // @ts-expect-error
    Client.websocket.ws = {};
    // @ts-expect-error
    Client.websocket.pauseIncomingMessages();
    // @ts-expect-error
    Client.websocket.pauseOutgoingMessages();

    // allow models to be displayed (not // on localhost)

    // @ts-expect-error
    Tools.spritePrefix = 'https://' + Tools.mainServer + '/sprites';
}

export function initializeGameServer() {
    modifyGlobals();

    if (!room) {
        room = Rooms.add('gameworkshop');
        room.setTitle("Game Workshop");
        room.onUserJoin(Users.self, '*');

        Config.roomAliases = {'gw': 'gameworkshop'};
    }

    Users.self.setGlobalRank('*');

    msgSelfPrefix = "/msg " + Users.self.id + ", ";
    msgRoomPrefix = msgSelfPrefix + "/msgroom " + room.id + ", ";
    botMsgPrefix = msgRoomPrefix + "/botmsg " + Users.self.id + ", ";

    // @ts-expect-error
    global._gameServerListener = (req: http.IncomingMessage, res: http.ServerResponse) => requestListener(req, res);
}

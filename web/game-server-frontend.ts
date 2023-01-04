import type {
    IAddPlayersResponse, IGameServerRequest, IGameServerResponse, IMessageQueueResponse, IRefreshResponse, ICreateGameResponse, GameServerEndpoint
} from "../src/game-server/types";
import type { IGameFormat } from "../src/types/games";

interface IElement extends HTMLElement {
    disabled?: boolean;
    value?: string;
}

interface IHtmlQueueEntry {
    html: string;
    uhtmlName?: string;
}

const ID_REGEX = /[^a-z0-9]/g;
const USERNAME_REGEX = /([^<]*)<username>([^<]*)<\/username>([^<]*)/g;
const BOLD_REGEX = /([^\*]*)\*\*([^\*]*)\*\*([^\*]*)/g;
const ITALICS_REGEX = /([^_]*)__([^_]*)__([^_]*)/g;
const CODE_REGEX = /([^`]*)``([^`]*)``([^`]*)/g;

const observerConfig = {
    attributes: true,
    childList: true,
    characterData: true,
};

const reloadModulesInput = getElementById('input-reload-modules');
const gameFormatInput = getElementById('input-game-format');

const reloadButton = getElementById('reload-modules');
const reloadAllButton = getElementById('reload-all');
const reloadGameServerButton = getElementById('reload-game-server');
const createGameButton = getElementById('create-game');
const startGameButton = getElementById('start-game');
const restartGameButton = getElementById('restart-game');
const endGameButton = getElementById('end-game');
const addPlayersButton = getElementById('submit-players');
const submitChatCommandButton = getElementById('submit-chat-command');
const submitPmCommandButton = getElementById('submit-pm-command');

const gameServerControlsDiv = getElementById('game-server-controls');
const chatLogDiv = getElementById('chat-log');
const pmLogDiv = getElementById('pm-log');
const reloadMessagesDiv = getElementById('reload-messages');
const playersDiv = getElementById('players');
const errorMessagesDiv = getElementById('error-messages');
const playerMessagesDiv = getElementById('player-messages');
const chatMessagesDiv = getElementById('chat-messages');
const manualMessagePlayerSpan = getElementById('manual-message-player');

const userList = getElementById('userlist');

let botName = "";
let botId = "";
let playerNames: Dict<string> = {};
let playerHtmlPages: Dict<string> = {};
let playerPms: Dict<IHtmlQueueEntry[]> = {};
let playerPrivateHtml: Dict<IHtmlQueueEntry[]> = {};
let chatHtml: IHtmlQueueEntry[] = [];
let gameFormat: IGameFormat | null = null;
let currentPlayerId = "";
let checkMessageQueueTimeout: NodeJS.Timeout | null = null;
let commandButtons: Element[] = [];
let commandButtonListeners = new Map<Element, () => void>();

/**
 * Utilities
 */

function toId(input: string): string {
    return input.toLowerCase().replace(ID_REGEX, "").trim();
}

function getElementById(id: string): IElement {
    return document.getElementById(id)!;
}

function getUsernameHtml(name: string, chat?: boolean): string {
    // @ts-expect-error
    const color = BattleLog.usernameColor(toId(name)) as string;
    return '<span style="color:' + color + '">' + name + (chat ? ':' : '') + '</span>';
}

function disableButton(button: IElement): void {
    button.disabled = true;
    if (!button.className.includes("disabled")) button.className += " disabled";
}

function enableButton(button: IElement): void {
    button.disabled = false;
    if (button.className.endsWith(" disabled")) button.className = button.className.substr(0, button.className.length - 9);
}

function scrollToBottom(element: IElement): void {
    element.scrollTo(0, element.scrollHeight);
}

function displayError(error: string, div?: HTMLElement): void {
    (div || errorMessagesDiv).innerHTML += "<br /><b>" + error + "</b>";
}

function formatHtml(html: string): string {
    return html.split(',')
        .map(x => x.replace(USERNAME_REGEX, (match, prefix, group, suffix) => prefix + "<b>" + getUsernameHtml(group) + "</b>" + suffix))
        .join(',');
}

function formatText(text: string): string {
    return text.replace(BOLD_REGEX, (match, prefix, group, suffix) => prefix + "<b>" + group + "</b>" + suffix)
        .replace(ITALICS_REGEX, (match, prefix, group, suffix) => prefix + "<i>" + group + "</i>" + suffix)
        .replace(CODE_REGEX, (match, prefix, group, suffix) => prefix + "<code>" + group + "</code>" + suffix);
}

function setCommandButtonListeners(): void {
    for (const commandButton of commandButtons) {
        commandButton.removeEventListener('click', commandButtonListeners.get(commandButton)!);
        commandButtonListeners.delete(commandButton);
    }

    commandButtons = [];

    const chatCommandButtons = document.getElementsByClassName("chat-command-button");
    for (let i = 0; i < chatCommandButtons.length; i++) {
        const chatCommandButton = chatCommandButtons[i];
        const listener = () => useChatCommand((chatCommandButton as HTMLButtonElement).value);
        chatCommandButton.addEventListener('click', listener);

        commandButtons.push(chatCommandButton);
        commandButtonListeners.set(chatCommandButton, listener);
    }

    const pmCommandButtons = document.getElementsByClassName("pm-command-button");
    for (let i = 0; i < pmCommandButtons.length; i++) {
        const pmCommandButton = pmCommandButtons[i];
        const listener = () => usePmCommand((pmCommandButton as HTMLButtonElement).value)
        pmCommandButton.addEventListener('click', listener);

        commandButtons.push(pmCommandButton);
        commandButtonListeners.set(pmCommandButton, listener);
    }
}

// used by dynamic player buttons
function choosePlayer(id: string): void {
    if (currentPlayerId) enablePlayerButton(currentPlayerId);

    makeRequest("choosePlayer", {input: id}, response => {
        currentPlayerId = id;
        onChoosePlayer();
    });
}

function clearMessageQueues(): void {
    chatHtml = [];
    playerPms = {};
    playerHtmlPages = {};
    playerPrivateHtml = {};
    chatMessagesDiv.innerHTML = "";
    playersDiv.innerHTML = "";
}

function enablePlayerButton(id: string): void {
    enableButton(getElementById("player-" + id));
}

// scroll to the bottom of each div and attach event listeners to any command buttons on new messages
function createObserver(element: HTMLElement, callback: (() => void)): void {
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length) callback();
        });
    });

    observer.observe(element, observerConfig);
}

createObserver(chatMessagesDiv, () => {
    scrollToBottom(chatLogDiv);
    setCommandButtonListeners();
});

createObserver(playerMessagesDiv, () => {
    scrollToBottom(gameServerControlsDiv);
    setCommandButtonListeners();
});

/**
 * Requests and responses
 */

function makeRequest<T = IGameServerResponse, U = IGameServerRequest>(endpoint: GameServerEndpoint, input: U,
    handler: (response: T) => void, onErrorResponse?: (error: string) => void): void {
    fetch("http://localhost:8080/" + endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        cache: 'no-cache',
        body: JSON.stringify(input),
    }).then(response => {
        return response.json() as Promise<T>;
    }).then(body => {
        if ((body as IGameServerResponse).error) {
            (onErrorResponse || displayError)((body as IGameServerResponse).error!);
        } else {
            handler(body);
        }
    }).catch(e => {
        const message = "Fetch error: " + e.message;
        console.log(message);

        (onErrorResponse || displayError)(message);
    });
}

function parseCreateGameResponse(response: ICreateGameResponse): void {
    gameFormat = response.format;
    if (gameFormat) {
        getElementById('game-format')!.innerHTML = "Chosen game: " + gameFormat.nameWithOptions;
        enableButton(addPlayersButton);

        if (gameFormat.freejoin || gameFormat.inputOptions.freejoin) {
            enableButton(restartGameButton);
            enableButton(endGameButton);
            disableButton(startGameButton);
        } else {
            enableButton(startGameButton);
            disableButton(restartGameButton);
            disableButton(endGameButton);
        }

        parseAddPlayersResponse(response);
        parseMessageQueueResponse(response);
    }
}

function parseAddPlayersResponse(response: IAddPlayersResponse): void {
    playerNames = {};

    const html: string[] = [];
    const userListHtml: string[] = [];
    for (const id in response.players) {
        playerNames[id] = response.players[id];
        if (!currentPlayerId) {
            choosePlayer(id);
            currentPlayerId = id;
        }

        html.push("<button id='player-" + id + "' onclick='choosePlayer(\"" + id + "\")'>" + response.players[id] + "</button>");
        userListHtml.push('<li><button class="userbutton username"><em class="group"> </em>' + getUsernameHtml(response.players[id]) + '</button></li>');
    }
    playersDiv.innerHTML = html.length ? "Players (" + html.length + "):<br />" + html.join(" | ") : "";

    userListHtml.unshift('<li><button class="userbutton username"><em class="group">*</em>' + getUsernameHtml(botName) + '</button></li>');

    const userCount = userListHtml.length;
    userList.innerHTML = '<li class="userlist-count" id="userlist-users" style="text-align:center;padding:2px 0"><small>' +
        '<span id="usercount-users">' + userCount + '</span> user' + (userCount > 1 ? 's' : '') + '</small></li>' +
        userListHtml.join("");
}

function parseMessageQueueResponse(response: IMessageQueueResponse): void {
    if (!response.queue.length) return;

    for (const message of response.queue) {
        let addedUhtml = false;
        if (message.type === 'chat-uhtml-change') {
            for (const entry of chatHtml) {
                if (entry.uhtmlName && entry.uhtmlName === message.uhtmlName) {
                    entry.html = formatHtml(message.rawHtml!);
                    addedUhtml = true;
                    break;
                }
            }
        } else if (message.type === 'chat-uhtml') {
            for (const entry of chatHtml) {
                if (entry.uhtmlName && entry.uhtmlName === message.uhtmlName) {
                    chatHtml.splice(chatHtml.indexOf(entry), 1);
                    entry.html = formatHtml(message.rawHtml!);
                    chatHtml.push(entry);
                    addedUhtml = true;
                    break;
                }
            }
        } else if (message.type === 'pm-uhtml-change') {
            const id = message.userid!;
            if (!(id in playerPms)) playerPms[id] = [];

            for (const entry of playerPms[id]) {
                if (entry.uhtmlName && entry.uhtmlName === message.uhtmlName) {
                    entry.html = formatHtml(message.rawHtml!);
                    addedUhtml = true;
                    break;
                }
            }
        } else if (message.type === 'pm-uhtml') {
            const id = message.userid!;
            if (!(id in playerPms)) playerPms[id] = [];

            for (const entry of playerPms[id]) {
                if (entry.uhtmlName && entry.uhtmlName === message.uhtmlName) {
                    playerPms[id].splice(playerPms[id].indexOf(entry), 1);
                    entry.html = formatHtml(message.rawHtml!);
                    playerPms[id].push(entry);
                    addedUhtml = true;
                    break;
                }
            }
        } else if (message.type === 'private-uhtml-change') {
            const id = message.userid!;
            if (!(id in playerPrivateHtml)) playerPrivateHtml[id] = [];

            for (const entry of playerPrivateHtml[id]) {
                if (entry.uhtmlName && entry.uhtmlName === message.uhtmlName) {
                    entry.html = formatHtml(message.rawHtml!);
                    addedUhtml = true;
                    break;
                }
            }
        } else if (message.type === 'private-uhtml') {
            const id = message.userid!;
            if (!(id in playerPrivateHtml)) playerPrivateHtml[id] = [];

            for (const entry of playerPrivateHtml[id]) {
                if (entry.uhtmlName && entry.uhtmlName === message.uhtmlName) {
                    playerPrivateHtml[id].splice(playerPrivateHtml[id].indexOf(entry), 1);
                    entry.html = formatHtml(message.rawHtml!);
                    playerPrivateHtml[id].push(entry);
                    addedUhtml = true;
                    break;
                }
            }
        }

        if (addedUhtml) continue;

        if (message.type === 'chat') {
            chatHtml.push({
                html: "<b><small>*</small>" + getUsernameHtml(botName, true) + "</b> " + formatText(message.text || ""),
            });
        } else if (message.type === 'pm') {
            const id = message.userid!
            if (!(id in playerPms)) playerPms[id] = [];

            playerPms[id].push({html: '<div class="chat chatmessage-' + botId + ' mine"><small>*</small><b>' +
                getUsernameHtml(botName, true) + '</b> <em>' + formatText(message.text || "") + '</em></div>'});
        } else if (message.type === 'chat-html' || message.type === 'chat-uhtml') {
            chatHtml.push({
                html: formatHtml(message.rawHtml || message.text || ""),
                uhtmlName: message.uhtmlName
            });
        } else if (message.type === 'private-html' || message.type === 'private-uhtml') {
            const id = message.userid!
            if (!(id in playerPrivateHtml)) playerPrivateHtml[id] = [];

            playerPrivateHtml[id].push({
                html: formatHtml(message.rawHtml || message.text || ""),
                uhtmlName: message.uhtmlName
            });
        } else if (message.type === 'pm-html' || message.type === 'pm-uhtml') {
            const id = message.userid!
            if (!(id in playerPms)) playerPms[id] = [];

            playerPms[id].push({
                html: formatHtml(message.rawHtml || message.text || ""),
                uhtmlName: message.uhtmlName
            });
        } else if (message.type === 'htmlpage') {
            playerHtmlPages[message.userid!] = formatHtml(message.rawHtml!);
        }
    }

    displayChatMessages();
    displayPlayerMessages();
}

function displayChatMessages(): void {
    const html: string[] = [];
    for (const entry of chatHtml) {
        html.push("<div class='chat'>" + entry.html + "</div>");
    }

    chatMessagesDiv.innerHTML = html.join("");
}

function displayPlayerMessages(): void {
    if (!currentPlayerId) return;

    let html = "";
    if (playerHtmlPages[currentPlayerId]) html += playerHtmlPages[currentPlayerId];

    const privateHtml: string[] = [];
    if (currentPlayerId in playerPrivateHtml) {
        for (const entry of playerPrivateHtml[currentPlayerId]) {
            privateHtml.push(entry.html);
        }
    }

    if (privateHtml.length) html += "<br />" + privateHtml.join("<br />");

    playerMessagesDiv.innerHTML = html;

    const pmHtml: string[] = [];
    if (currentPlayerId in playerPms) {
        for (const entry of playerPms[currentPlayerId]) {
            pmHtml.push(entry.html);
        }
    }

    pmLogDiv.innerHTML = pmHtml.join("");
}

function onChoosePlayer(): void {
    disableButton(getElementById("player-" + currentPlayerId));

    manualMessagePlayerSpan.innerHTML = "<b>" + getUsernameHtml(playerNames[currentPlayerId], true) + "</b>";

    displayPlayerMessages();
    enableButton(submitChatCommandButton);
    enableButton(submitPmCommandButton);
}

function setCheckMessageQueueTimeout(): void {
    if (checkMessageQueueTimeout) clearTimeout(checkMessageQueueTimeout);

    checkMessageQueueTimeout = setTimeout(() => checkMessageQueue(), 1000);
}

function checkMessageQueue(): void {
    if (checkMessageQueueTimeout) clearTimeout(checkMessageQueueTimeout);

    makeRequest<IMessageQueueResponse>("checkMessageQueue", {input: ""}, intervalResponse => {
        parseMessageQueueResponse(intervalResponse);

        if (intervalResponse.currentPlayer && intervalResponse.currentPlayer !== currentPlayerId) {
            if (currentPlayerId) enablePlayerButton(currentPlayerId);

            currentPlayerId = intervalResponse.currentPlayer;
            onChoosePlayer();
        }

        setCheckMessageQueueTimeout();
    }, (error) => {
        displayError(error);

        if (checkMessageQueueTimeout) clearTimeout(checkMessageQueueTimeout);
    });
}

function useChatCommand(command: string): void {
    makeRequest<IMessageQueueResponse>("chatCommand", {input: command}, response => {
        chatHtml.push({html: "<b><small> </small>" + getUsernameHtml(playerNames[currentPlayerId], true) +
            "</b> " + command});
        parseMessageQueueResponse(response);
        displayChatMessages();

        setCheckMessageQueueTimeout();
    });
}

function usePmCommand(command: string): void {
    makeRequest<IMessageQueueResponse>("pmCommand", {input: command}, response => {
        if (!(currentPlayerId in playerPms)) playerPms[currentPlayerId] = [];
        playerPms[currentPlayerId].push({html: '<div class="chat chatmessage-' + currentPlayerId + ' mine"><b>' +
            getUsernameHtml(playerNames[currentPlayerId], true) + '</b> <em>' + command + '</em></div>'});

        parseMessageQueueResponse(response);
        displayPlayerMessages();

        setCheckMessageQueueTimeout();
    });
}

/**
 * Events
 */

reloadButton.addEventListener('click', () => {
    reloadMessagesDiv.innerHTML = "<h3>Reloading specified module(s)...</h3>";

    makeRequest("reload", {input: reloadModulesInput.value!}, response => {
        reloadMessagesDiv.innerHTML = "<h3>Successfully reloaded</h3>";
    }, (error) => {
        reloadMessagesDiv.innerHTML = "<h3>" + error + "</h3>";
    });
})

reloadAllButton.addEventListener('click', () => {
    reloadMessagesDiv.innerHTML = "<h3>Reloading all...</h3>";

    makeRequest("reloadAll", {input: ""}, response => {
        reloadMessagesDiv.innerHTML = "<h3>Successfully reloaded</h3>";
    }, (error) => {
        reloadMessagesDiv.innerHTML = "<h3>" + error + "</h3>";
    });
})

reloadGameServerButton.addEventListener('click', () => {
    reloadMessagesDiv.innerHTML = "<h3>Reloading game server...</h3>";

    makeRequest("reloadGameServer", {input: ""}, response => {
        reloadMessagesDiv.innerHTML = "<h3>Successfully reloaded (refresh the page!)</h3>";
    }, (error) => {
        reloadMessagesDiv.innerHTML = "<h3>" + error + "</h3>";
    });
})

createGameButton.addEventListener('click', () => {
    makeRequest<ICreateGameResponse>("createGame", {input: gameFormatInput.value!}, response => {
        clearMessageQueues();

        parseCreateGameResponse(response);
        setCheckMessageQueueTimeout();
    });
});

startGameButton.addEventListener('click', () => {
    if (!gameFormat) return;

    makeRequest<IMessageQueueResponse>("startGame", {input: ""}, response => {
        parseMessageQueueResponse(response);

        errorMessagesDiv.innerHTML = "";
        disableButton(startGameButton);
        enableButton(restartGameButton);
        enableButton(endGameButton);
    });
});

restartGameButton.addEventListener('click', () => {
    if (!gameFormat) return;

    clearMessageQueues();

    makeRequest<IMessageQueueResponse>("restartGame", {input: ""}, response => {
        parseMessageQueueResponse(response);

        if (!gameFormat!.freejoin && !gameFormat!.inputOptions.freejoin) {
            enableButton(startGameButton);
            disableButton(restartGameButton);
        }
    });
});

endGameButton.addEventListener('click', () => {
    if (!gameFormat) return;

    makeRequest<IMessageQueueResponse>("endGame", {input: ""}, response => {
        if (checkMessageQueueTimeout) clearTimeout(checkMessageQueueTimeout);

        parseMessageQueueResponse(response);

        enableButton(createGameButton);
        enableButton(startGameButton);
        disableButton(restartGameButton);
        disableButton(endGameButton);
    });
});

addPlayersButton.addEventListener('click', () => {
    if (!gameFormat) return;

    makeRequest<IAddPlayersResponse>("addPlayers", {input: getElementById('input-players').value!}, response => {
        parseAddPlayersResponse(response);
    });
});

submitChatCommandButton.addEventListener('click', () => {
    useChatCommand(getElementById('input-command').value!);
});

submitPmCommandButton.addEventListener('click', () => {
    usePmCommand(getElementById('input-command').value!);
});

document.body.onload = function() {
    makeRequest<IRefreshResponse>("refresh", {input: ""}, response => {
        botName = response.botName;
        botId = toId(botName);
        getElementById('pm-bot-name').innerHTML = botName;

        if (response.format) {
            gameFormatInput.value = response.format.nameWithOptions;
            parseCreateGameResponse(response as ICreateGameResponse);
        }

        if (response.players) parseAddPlayersResponse(response as IAddPlayersResponse);

        if (response.startedGame) {
            setCheckMessageQueueTimeout();

            disableButton(startGameButton);
            enableButton(restartGameButton);
        }
    });
};
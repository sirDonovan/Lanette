import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { GameCommandDefinitions, IGameFile } from "../types/games";

const MIN_BLOCKS = 1;
const MAX_BLOCKS = 5;
const REMOVE_COMMAND = "remove";

class CrustlesCrumblingBlocks extends ScriptedGame {
	blocks: number = 0;
	hasAssistActions: boolean = true;
	minPlayers: number = 4;
	order: Player[] = [];
	playerList: Player[] = [];

	onRemovePlayer(): void {
		if (!this.started) return;
		this.currentPlayer = null;
		this.nextRound();
	}

	onStart(): void {
		this.nextRound();
	}

	onNextRound(): void {
		if (this.currentPlayer) {
			this.say("**" + this.currentPlayer.name + "** did not remove any blocks and has been eliminated from the game! The blocks " +
				"will now reset.");
			this.eliminatePlayer(this.currentPlayer);
			this.currentPlayer = null;
		}

		const remainingPlayerCount = this.getRemainingPlayerCount();
		if (remainingPlayerCount === 2) {
			this.say("There are no blocks remaining!");
			this.setTimeout(() => this.end(), 5 * 1000);
			return;
		} else if (remainingPlayerCount <= 1) {
			this.say("The game has ended due to a lack of players.");
			this.end();
			return;
		}

		this.order = this.shufflePlayers(this.getRemainingPlayers());
		this.playerList = this.order.slice();
		this.currentPlayer = this.playerList[0];
		this.playerList.shift();

		const html = this.getRoundHtml(players => this.getPlayerNames(players));
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			this.setTimeout(() => {
				let blocks = remainingPlayerCount * 3;
				if (blocks > 25) {
					blocks = 25;
				} else if (blocks < 10) {
					blocks = 10;
				}
				this.blocks = blocks;
				this.chooseNextPlayer();
			}, 5000);
		});
		this.sayUhtml(uhtmlName, html);
	}

	chooseNextPlayer(): void {
		if (!this.getRemainingPlayerCount()) {
			this.nextRound();
			return;
		}

		this.currentPlayer = null;

		if (!this.playerList.length) this.playerList = this.order.slice();
		let currentPlayer = this.playerList[0];
		this.playerList.shift();
		while (currentPlayer.eliminated) {
			if (!this.playerList.length) this.playerList = this.order.slice();
			currentPlayer = this.playerList[0];
			this.playerList.shift();
		}

		if (this.blocks - MIN_BLOCKS <= 0) {
			this.removeLastBlock(currentPlayer);
			return;
		}

		const text = "**" + currentPlayer.name + "**, you are up! There " + (this.blocks > 1 ? "are" : "is") + " currently **" +
			this.blocks + "** block" + (this.blocks > 1 ? "s" : "") + " remaining.";
		this.on(text, () => {
			this.currentPlayer = currentPlayer;
			this.setTimeout(() => this.nextRound(), 30 * 1000);
		});
		this.say(text);

		const buttons: string[] = [];
		for (let i = MIN_BLOCKS; i <= MAX_BLOCKS; i++) {
			if (i > this.blocks) break;
			buttons.push(this.getMsgRoomButton(REMOVE_COMMAND + " " + i, "Remove <b>" + i + "</b> block" + (i > 1 ? "s" : ""),
				false, currentPlayer));
		}

		this.sendPlayerAssistActions(currentPlayer, this.getCustomButtonsDiv(buttons, currentPlayer), this.actionsUhtmlName);
	}

	removeLastBlock(player: Player): void {
		this.say("**" + player.name + "** was forced to remove the last block from the pyramid and has been eliminated from the game!");
		this.eliminatePlayer(player);
		this.currentPlayer = null;
		this.setTimeout(() => this.nextRound(), 5 * 1000);
	}

	onEnd(): void {
		const remainingPlayers = Object.keys(this.getRemainingPlayers());
		if (remainingPlayers.length <= 2) {
			for (let i = 0; i < 2; i++) {
				if (!remainingPlayers[i]) break;
				this.winners.set(this.players[remainingPlayers[i]], 1);
				this.addBits(this.players[remainingPlayers[i]], 250);
			}
		}
		this.announceWinners();
	}
}

const commands: GameCommandDefinitions<CrustlesCrumblingBlocks> = {
	[REMOVE_COMMAND]: {
		command(target, room, user) {
			if (this.players[user.id] !== this.currentPlayer) return false;
			const player = this.players[user.id];
			const targetNumber = parseInt(target);
			if (isNaN(targetNumber) || targetNumber > MAX_BLOCKS || targetNumber < MIN_BLOCKS) {
				this.say("You can only remove between " + MIN_BLOCKS + " and " + MAX_BLOCKS + " blocks at a time.");
				return false;
			}

			if (this.timeout) clearTimeout(this.timeout);

			this.clearPlayerAssistActions(player, this.actionsUhtmlName);

			this.blocks -= targetNumber;
			if (this.blocks <= 0) {
				this.removeLastBlock(player);
				return false;
			}
			this.chooseNextPlayer();
			return true;
		},
	},
};

export const game: IGameFile<CrustlesCrumblingBlocks> = {
	aliases: ['crustles', 'ccb'],
	category: 'luck',
	class: CrustlesCrumblingBlocks,
	commandDescriptions: [Config.commandCharacter + REMOVE_COMMAND + " [number of blocks]"],
	commands,
	description: "Players remove blocks from Crustle's pyramid until only one remains. The player forced to remove the final block is " +
		"eliminated!",
	name: "Crustle's Crumbling Blocks",
	mascot: "Crustle",
	scriptedOnly: true,
};

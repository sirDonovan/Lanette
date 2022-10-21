import type { Player } from '../room-activity';
import { ScriptedGame } from '../room-game-scripted';
import type { GameCommandDefinitions, IGameFile } from "../types/games";
import type { GameActionGames } from '../types/storage';

type BerryType = 'Cheri' | 'Chesto' | 'Pecha' | 'Rawst' | 'Mystery';
interface IBerryPile {
	readonly name: BerryType;
	amount: number;
}

const GAME_ACTION_TYPE: GameActionGames = 'greedentsberrypiles';
const GRAB_COMMAND = "grab";
const RUN_COMMAND = "run";
const ACTION_COMMANDS = [GRAB_COMMAND, RUN_COMMAND];

const mysteryBerryAmount = 11;

class GreedentsBerryPiles extends ScriptedGame {
	berryPiles: IBerryPile[] = [];
	canGrab: boolean = false;
	canLateJoin: boolean = true;
	gameActionType = GAME_ACTION_TYPE;
	greedentTotalForaged: number = 0;
	readonly maxSubGames: number = 5;
	readonly maxBerryTotal: number = 21;
	readonly minGreedentFirstForage: number = 17;
	readonly perfectForageBonuses = new Map<Player, number>();
	readonly playerBerryPiles = new Map<Player, IBerryPile[]>();
	readonly playerTotals = new Map<Player, number>();
	readonly roundActions = new Set<Player>();
	readonly roundLimit: number = 20;
	readonly startingPiles: number = 2;
	subGameNumber: number = 0;
	subGameRound: number = 0;
	usesHtmlPage = true;

	greedentFirstForage!: IBerryPile;

	createBerryPiles(): IBerryPile[] {
		const berryPiles: IBerryPile[] = [];
		for (let i = 0; i < 4; i++) {
			berryPiles.push({name: "Mystery", amount: mysteryBerryAmount});
		}

		const berryTypes: (Exclude<BerryType, "Mystery">)[] = ["Cheri", "Chesto", "Pecha", "Rawst"];
		for (let i = 2; i <= 13; i++) {
			const amount = i === 11 || i === 12 || i === 13 ? 10 : i;
			for (const type of berryTypes) {
				berryPiles.push({name: type, amount});
			}
		}

		this.berryPiles = this.shuffle(berryPiles);
		return this.berryPiles;
	}

	getBerryPile(): IBerryPile {
		if (!this.berryPiles.length) this.createBerryPiles();
		const berryPile = this.berryPiles[0];
		this.berryPiles.shift();
		return berryPile;
	}

	getBerryPiles(amount: number): IBerryPile[] {
		const berryPiles: IBerryPile[] = [];
		for (let i = 0; i < amount; i++) {
			berryPiles.push(this.getBerryPile());
		}

		return berryPiles;
	}

	onStart(): void {
		this.say("If you grab more than " + this.maxBerryTotal + " berries, the Greedent will notice!");
		this.nextSubGame();
	}

	startSubGame(): void {
		if (this.timeout) clearTimeout(this.timeout);

		this.subGameRound = 0;
		this.subGameNumber++;
		if (this.subGameNumber > 1) {
			this.say("Starting the next game!");

			this.playerBerryPiles.clear();
			this.playerTotals.clear();
		}

		const berryPiles = this.getBerryPiles(2);
		if (berryPiles[0].name === 'Mystery' && berryPiles[1].name === 'Mystery') berryPiles[0].amount = 1;
		this.greedentFirstForage = berryPiles[0];
		this.greedentTotalForaged = berryPiles[0].amount + berryPiles[1].amount;
		while (this.greedentTotalForaged < this.minGreedentFirstForage) {
			berryPiles.push(this.getBerryPile());
			let total = 0;
			const lumBerries = [];
			for (const berryPile of berryPiles) {
				total += berryPile.amount;
				if (berryPile.name === 'Mystery') lumBerries.push(berryPile);
			}

			let lumBerry = lumBerries.shift();
			while (total > this.maxBerryTotal && lumBerry) {
				lumBerry.amount = 1;
				total -= mysteryBerryAmount - 1;
				lumBerry = lumBerries.shift();
			}

			this.greedentTotalForaged = total;
		}

		this.canLateJoin = false;
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			this.giveStartingBerries(this.players[i]);
			this.showBerryPiles(this.players[i]);
		}
		this.setTimeout(() => this.nextRound(), 3 * 1000);
	}

	giveStartingBerries(player: Player): void {
		const berryPiles = this.getBerryPiles(this.startingPiles);
		let total = 0;
		const lumBerries: IBerryPile[] = [];
		for (const berryPile of berryPiles) {
			total += berryPile.amount;
			if (berryPile.name === 'Mystery') lumBerries.push(berryPile);
		}

		while (this.maxBerryTotal && total > this.maxBerryTotal && lumBerries.length) {
			lumBerries[0].amount = 1;
			lumBerries.shift();
			total -= mysteryBerryAmount - 1;
		}

		this.playerBerryPiles.set(player, berryPiles);
		this.playerTotals.set(player, total);
	}

	showBerryPiles(player: Player): void {
		let html = '<center><b>You have grabbed</b>:<br /><br />';

		const berryPilesHtml: string[] = [];
		const berryPiles = this.playerBerryPiles.get(player)!;
		for (const berryPile of berryPiles) {
			berryPilesHtml.push(Dex.getItemIcon(Dex.getExistingItem(berryPile.name + " Berry")) + berryPile.amount + ' ' + berryPile.name +
				' ' + (berryPile.amount === 1 ? 'Berry' : 'Berries'));
		}

		html += Tools.joinList(berryPilesHtml);

		html += '<br />';
		const total = this.playerTotals.get(player)!;
		if (total > this.maxBerryTotal) {
			html += "<br /><b>You grabbed too many berries and alerted Greedent!</b>";
		} else if (player.frozen) {
			html += "<br /><b>Final total</b>: " + total + " berries<br /><br />Stay tuned to see how many berries Greedent foraged!";
		} else {
			html += "<b>Total</b>: " + total + " berries <br /><br />Greedent's first forage yielded <b>" +
				this.greedentFirstForage.amount + " " + this.greedentFirstForage.name + " " + (this.greedentFirstForage.amount === 1 ?
				"Berry" : "Berries") + "</b>.";
			if (!this.roundActions.has(player) && this.subGameRound > 0) {
				html += "<br /><br />" + this.getMsgRoomButton(GRAB_COMMAND, "Grab more berries", false, player) + "&nbsp;|&nbsp;" +
					this.getMsgRoomButton(RUN_COMMAND, "Run away", false, player);
			}
		}

		html += '</center>';

		this.sendPlayerActions(player, this.getCustomBoxDiv(html, player));
	}

	getPlayerSummary(player: Player): void {
		if (player.eliminated) return;
		const berryPiles = this.playerBerryPiles.get(player);
		if (!berryPiles || !berryPiles.length) return player.say("You have not grabbed any berries yet.");
		this.showBerryPiles(player);
	}

	nextSubGame(): void {
		if (this.timeout) clearTimeout(this.timeout);
		for (const i in this.players) {
			this.players[i].frozen = false;
		}
		if (!this.getRemainingPlayerCount() || this.subGameNumber >= this.maxSubGames) return this.end();

		this.startSubGame();
	}

	getDisplayedRoundNumber(): number {
		return this.subGameRound;
	}

	onNextRound(): void {
		this.canGrab = false;
		this.offCommands(ACTION_COMMANDS);

		let playersLeft: number;
		this.subGameRound++;
		if (this.subGameRound === 1) {
			playersLeft = this.getRemainingPlayerCount();
		} else {
			playersLeft = 0;
			const autoFreeze = this.subGameRound > 3;
			for (const i in this.getRemainingPlayers()) {
				const player = this.players[i];
				const berryPiles = this.playerBerryPiles.get(player);
				if (!berryPiles || (autoFreeze && berryPiles.length === 2)) {
					player.frozen = true;
					continue;
				}
				playersLeft++;
			}
		}

		if (!playersLeft || this.subGameRound > this.roundLimit) {
			const finishedText = "All players have finished their turns!";
			this.on(finishedText, () => {
				this.canLateJoin = true;
				this.setTimeout(() => {
					let greedentText: string;
					if (this.greedentTotalForaged > this.maxBerryTotal) {
						greedentText = "Greedent foraged too many berries and dropped them all!";
					} else {
						greedentText = "Greedent foraged " + this.greedentTotalForaged + " berries!";
					}

					this.on(greedentText, () => {
						this.setTimeout(() => this.endSubGame(), 3 * 1000);
					});
					this.say(greedentText);
				}, 3 * 1000);
			});
			this.say(finishedText);
			return;
		}

		this.roundActions.clear();
		const html = this.getRoundHtml(players => this.getPlayerWins(players));
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			this.canGrab = true;
			this.onCommands(ACTION_COMMANDS, {max: this.getRemainingPlayerCount(), remainingPlayersMax: true}, () => this.nextRound());
			this.setTimeout(() => this.nextRound(), 15 * 1000);
		});
		this.sayUhtml(uhtmlName, html);

		for (const i in this.players) {
			if (!this.players[i].eliminated && !this.players[i].frozen) this.showBerryPiles(this.players[i]);
		}
	}

	endSubGame(): void {
		if (this.timeout) clearTimeout(this.timeout);
		this.canGrab = false;
		const perfectForages: Player[] = [];
		const gameWinners: string[] = [];
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			const total = this.playerTotals.get(player);
			// late-joins
			if (!total) continue;
			if (total > this.maxBerryTotal) continue;
			if (total === this.maxBerryTotal) perfectForages.push(player);
			if (this.greedentTotalForaged > this.maxBerryTotal || total >= this.greedentTotalForaged) {
				const wins = this.winners.get(player) || 0;
				this.winners.set(player, wins + 1);
				gameWinners.push(player.name);
			}
		}

		let text = '';
		if (gameWinners.length) {
			if (perfectForages.length) {
				const bonus = Math.floor(300 / perfectForages.length);
				for (const player of perfectForages) {
					const previousBonuses = this.perfectForageBonuses.get(player) || 0;
					this.perfectForageBonuses.set(player, previousBonuses + bonus);
				}
			}
			text = "**Game " + this.subGameNumber + " winner" + (gameWinners.length > 1 ? "s" : "") + "**: " + Tools.joinList(gameWinners) +
				(perfectForages.length ? " | **Perfect forage" + (perfectForages.length > 1 ? "s" : "") + "**: " +
				Tools.joinList(this.getPlayerNamesText(perfectForages)) : "");
		} else if (this.greedentTotalForaged > this.maxBerryTotal) {
			text = "No one wins Game " + this.subGameNumber + "!";
		} else {
			text = "Greedent wins Game " + this.subGameNumber + "!";
		}

		this.on(text, () => {
			this.setTimeout(() => this.nextSubGame(), 3 * 1000);
		});
		this.say(text);
	}

	onEnd(): void {
		this.winners.forEach((wins, user) => {
			let bits = wins * 100;
			const perfectForageBonuses = this.perfectForageBonuses.get(user);
			if (perfectForageBonuses) bits += perfectForageBonuses;
			this.addBits(user, bits);
		});

		this.announceWinners();
	}

	destroyPlayers(): void {
		super.destroyPlayers();

		this.perfectForageBonuses.clear();
		this.playerBerryPiles.clear();
		this.playerTotals.clear();
		this.roundActions.clear();
	}
}

const commands: GameCommandDefinitions<GreedentsBerryPiles> = {
	[GRAB_COMMAND]: {
		command(target, room, user) {
			if (!this.canGrab || this.players[user.id].frozen) return false;
			const player = this.players[user.id];
			if (this.roundActions.has(player)) return false;
			const berryPiles = this.playerBerryPiles.get(player)!;
			berryPiles.push(this.getBerryPile());
			let total = 0;
			const lumBerries = [];
			for (const berryPile of berryPiles) {
				total += berryPile.amount;
				// check amount for mystery berries that were already changed to 1
				if (berryPile.amount === mysteryBerryAmount) lumBerries.push(berryPile);
			}

			let lumBerry = lumBerries.shift();
			while (total > this.maxBerryTotal && lumBerry) {
				lumBerry.amount = 1;
				total -= mysteryBerryAmount - 1;
				lumBerry = lumBerries.shift();
			}

			if (total > this.maxBerryTotal) {
				player.frozen = true;
			}

			this.playerTotals.set(player, total);
			this.roundActions.add(player);

			this.showBerryPiles(player);
			return true;
		},
		pmGameCommand: true,
	},
	[RUN_COMMAND]: {
		command(target, room, user) {
			if (this.players[user.id].frozen) return false;
			const player = this.players[user.id];
			if (this.roundActions.has(player)) return false;
			player.frozen = true;
			this.roundActions.add(player);
			this.showBerryPiles(player);
			return true;
		},
		pmGameCommand: true,
	},
};

commands.summary = Tools.deepClone(Games.getSharedCommands().summary);
commands.summary.aliases = ['berries'];

export const game: IGameFile<GreedentsBerryPiles> = {
	aliases: ["greedents", "berrypiles", "gbp"],
	category: 'luck',
	challengeSettings: {
		onevsone: {
			enabled: true,
		},
	},
	commandDescriptions: [Config.commandCharacter + "grab", Config.commandCharacter + "run"],
	commands,
	class: GreedentsBerryPiles,
	description: "Players try to grab more berries from the berry piles than Greedent can forage!",
	name: "Greedent's Berry Piles",
	mascot: "Greedent",
	scriptedOnly: true,
};

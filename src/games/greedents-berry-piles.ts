import type { Player } from '../room-activity';
import { ScriptedGame } from '../room-game-scripted';
import type { GameCategory, GameCommandDefinitions, IGameFile } from "../types/games";

type BerryType = 'Cheri' | 'Chesto' | 'Pecha' | 'Rawst' | 'Mystery';
interface IBerryPile {
	readonly name: BerryType;
	amount: number;
}

const mysteryBerryAmount = 11;

class GreedentsBerryPiles extends ScriptedGame {
	berryPiles: IBerryPile[] = [];
	canGrab: boolean = false;
	canLateJoin: boolean = true;
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

	getBerryPileHtml(berryPile: IBerryPile): string {
		let html = '<div class="infobox">';
		html += Dex.getItemIcon(Dex.getExistingItem(berryPile.name + " Berry")) + berryPile.amount + ' ' + berryPile.name + ' ' +
			(berryPile.amount === 1 ? 'Berry' : 'Berries');
		html += '</div>';
		return html;
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
				total -= (mysteryBerryAmount - 1);
				lumBerry = lumBerries.shift();
			}

			this.greedentTotalForaged = total;
		}

		this.canLateJoin = false;
		this.say("Giving " + (this.subGameNumber > 1 ? "new ": "") + " starting berries in PMs!");
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			this.giveStartingBerries(this.players[i]);
			this.showBerryPiles(this.players[i]);
		}
		this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
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
			total -= (mysteryBerryAmount - 1);
		}

		this.playerBerryPiles.set(player, berryPiles);
		this.playerTotals.set(player, total);
	}

	showBerryPiles(player: Player): void {
		let html = '<div class="infobox"><center><b>You have grabbed</b>:<br />';

		const berryPilesHtml: string[] = [];
		const berryPiles = this.playerBerryPiles.get(player)!;
		for (const berryPile of berryPiles) {
			berryPilesHtml.push(this.getBerryPileHtml(berryPile));
		}

		html += berryPilesHtml.join("<br />");

		html += '<br />';
		const total = this.playerTotals.get(player)!;
		if (total > this.maxBerryTotal) {
			html += "<b>You grabbed too many berries and alerted Greedent!</b>";
		} else if (player.frozen) {
			html += "<b>Final total</b>: " + total + " berries<br />Stay tuned to see how many berries Greedent foraged!";
		} else {
			html += "<b>Total</b>: " + total + " berries <br />Greedent's first forage yielded <b>" + this.greedentFirstForage.amount +
				" " + this.greedentFirstForage.name + " " + (this.greedentFirstForage.amount === 1 ? "Berry" : "Berries") + "</b>.";
		}

		html += '</center></div>';
		player.sayUhtml(html, this.uhtmlBaseName + "-hand");
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

	onNextRound(): void {
		this.canGrab = false;
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
			const text = "All players have finished their turns!";
			this.on(text, () => {
				this.canLateJoin = true;
				this.timeout = setTimeout(() => {
					let text: string;
					if (this.greedentTotalForaged > this.maxBerryTotal) {
						text = "Greedent foraged too many berries and dropped them all!";
					} else {
						text = "Greedent foraged " + this.greedentTotalForaged + " berries!";
					}

					this.on(text, () => {
						this.timeout = setTimeout(() => this.endSubGame(), 5 * 1000);
					});
					this.say(text);
				}, 5000);
			});
			this.say(text);
			return;
		}

		this.roundActions.clear();
		const html = this.getRoundHtml(this.getPlayerWins, null, "Round " + this.subGameRound);
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			this.canGrab = true;
			this.onCommands(['grab', 'run'], {max: this.getRemainingPlayerCount(), remainingPlayersMax: true}, () => this.nextRound());
			this.timeout = setTimeout(() => this.nextRound(), 15 * 1000);
		});
		this.sayUhtml(uhtmlName, html);
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
			text = "**Game " + this.subGameNumber + " winner" + (gameWinners.length > 1 ? "s" : "") + "**: " + gameWinners.join(", ") +
				(perfectForages.length ? " | **Perfect forage" + (perfectForages.length > 1 ? "s" : "") + "**: " +
				this.getPlayerNames(perfectForages) : "");
		} else if (this.greedentTotalForaged > this.maxBerryTotal) {
			text = "No one wins Game " + this.subGameNumber + "!";
		} else {
			text = "Greedent wins Game " + this.subGameNumber + "!";
		}

		this.on(text, () => {
			this.timeout = setTimeout(() => this.nextSubGame(), 10 * 1000);
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
}

const commands: GameCommandDefinitions<GreedentsBerryPiles> = {
	grab: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
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
				if (berryPile.amount === mysteryBerryAmount) lumBerries.push(berryPile);
			}

			let lumBerry = lumBerries.shift();
			while (total > this.maxBerryTotal && lumBerry) {
				lumBerry.amount = 1;
				total -= (mysteryBerryAmount - 1);
				lumBerry = lumBerries.shift();
			}

			if (total > this.maxBerryTotal) {
				this.players[user.id].frozen = true;
			}
			this.playerTotals.set(player, total);
			this.showBerryPiles(player);
			this.roundActions.add(player);
			return true;
		},
		pmGameCommand: true,
	},
	run: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (this.players[user.id].frozen) return false;
			const player = this.players[user.id];
			if (this.roundActions.has(player)) return false;
			player.frozen = true;
			this.showBerryPiles(player);
			this.roundActions.add(player);
			return true;
		},
		pmGameCommand: true,
	},
};

commands.summary = Tools.deepClone(Games.sharedCommands.summary);
commands.summary.aliases = ['berries'];

export const game: IGameFile<GreedentsBerryPiles> = {
	aliases: ["greedents", "berrypiles", "gbp"],
	category: 'luck' as GameCategory,
	commandDescriptions: [Config.commandCharacter + "grab", Config.commandCharacter + "run"],
	commands,
	class: GreedentsBerryPiles,
	description: "Players try to grab more berries from the berry piles than Greedent can forage!",
	name: "Greedent's Berry Piles",
	mascot: "Greedent",
	scriptedOnly: true,
};

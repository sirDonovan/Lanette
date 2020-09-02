import type { Player } from '../room-activity';
import { Game } from '../room-game';
import type { GameCategory, GameCommandDefinitions, GameCommandReturnType, IGameFile } from "../types/games";

type BerryType = 'Cheri' | 'Chesto' | 'Pecha' | 'Rawst' | 'Mystery';
interface IBerryPile {
	readonly name: BerryType;
	amount: number;
}

const mysteryBerryAmount = 11;

class GreedentsPiles extends Game {
	readonly perfectForageBonuses = new Map<Player, number>();
	berryPiles: IBerryPile[] = [];
	canGrab: boolean = false;
	canLateJoin: boolean = true;
	greedentTotalForaged: number = 0;
	readonly maxSubGames: number = 5;
	readonly maxBerryTotal: number = 21;
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

	getPile(): IBerryPile {
		if (!this.berryPiles.length) this.createBerryPiles();
		const pile = this.berryPiles[0];
		this.berryPiles.shift();
		return pile;
	}

	getPiles(amount: number): IBerryPile[] {
		const piles: IBerryPile[] = [];
		for (let i = 0; i < amount; i++) {
			piles.push(this.getPile());
		}

		return piles;
	}

	getPileHtml(pile: IBerryPile): string {
		let html = '<div class="infobox">';
		html += Dex.getItemIcon(Dex.getExistingItem(pile.name + " Berry")) + pile.amount + ' ' + pile.name + ' ' +
			(pile.amount === 1 ? 'Berry' : 'Berries');
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

		const piles = this.getPiles(2);
		if (piles[0].name === 'Mystery' && piles[1].name === 'Mystery') piles[0].amount = 1;
		this.greedentFirstForage = piles[0];
		this.greedentTotalForaged = piles[0].amount + piles[1].amount;
		while (this.greedentTotalForaged < 17) {
			piles.push(this.getPile());
			let total = 0;
			const lumBerries = [];
			for (const pile of piles) {
				total += pile.amount;
				if (pile.name === 'Mystery') lumBerries.push(pile);
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
			this.showPiles(this.players[i]);
		}
		this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
	}

	giveStartingBerries(player: Player): void {
		const piles = this.getPiles(this.startingPiles);
		let total = 0;
		const lumBerries: IBerryPile[] = [];
		for (const pile of piles) {
			total += pile.amount;
			if (pile.name === 'Mystery') lumBerries.push(pile);
		}

		while (this.maxBerryTotal && total > this.maxBerryTotal && lumBerries.length) {
			lumBerries[0].amount = 1;
			lumBerries.shift();
			total -= (mysteryBerryAmount - 1);
		}

		this.playerBerryPiles.set(player, piles);
		this.playerTotals.set(player, total);
	}

	showPiles(player: Player): void {
		let html = '<div class="infobox"><center><b>You have grabbed</b>:<br />';

		const pilesHtml: string[] = [];
		const piles = this.playerBerryPiles.get(player)!;
		for (const pile of piles) {
			pilesHtml.push(this.getPileHtml(pile));
		}

		html += pilesHtml.join("<br />");

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
		const piles = this.playerBerryPiles.get(player);
		if (!piles || !piles.length) return player.say("You have not grabbed any berries yet.");
		this.showPiles(player);
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
				const piles = this.playerBerryPiles.get(player);
				if (!piles || (autoFreeze && piles.length === 2)) {
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

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
const commands: GameCommandDefinitions<GreedentsPiles> = {
	grab: {
		command(target, room, user): GameCommandReturnType {
			if (!this.canGrab || this.players[user.id].frozen) return false;
			const player = this.players[user.id];
			if (this.roundActions.has(player)) return false;
			const piles = this.playerBerryPiles.get(player)!;
			piles.push(this.getPile());
			let total = 0;
			const lumBerries = [];
			for (const pile of piles) {
				total += pile.amount;
				if (pile.amount === mysteryBerryAmount) lumBerries.push(pile);
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
			this.showPiles(player);
			this.roundActions.add(player);
			return true;
		},
		pmGameCommand: true,
	},
	run: {
		command(target, room, user): GameCommandReturnType {
			if (this.players[user.id].frozen) return false;
			const player = this.players[user.id];
			if (this.roundActions.has(player)) return false;
			player.frozen = true;
			this.showPiles(player);
			this.roundActions.add(player);
			return true;
		},
		pmGameCommand: true,
	},
};
/* eslint-enable */

commands.summary = Tools.deepClone(Games.sharedCommands.summary);
commands.summary.aliases = ['berries'];

export const game: IGameFile<GreedentsPiles> = {
	aliases: ["greedents", "piles", "gp"],
	category: 'luck' as GameCategory,
	commandDescriptions: [Config.commandCharacter + "grab", Config.commandCharacter + "run"],
	commands,
	class: GreedentsPiles,
	description: "Players try to grab more berries from the piles than Greedent can forage!",
	name: "Greedent's Piles",
	mascot: "Greedent",
	scriptedOnly: true,
};

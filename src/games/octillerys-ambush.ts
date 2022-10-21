import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { GameCommandDefinitions, IGameAchievement, IGameFile } from "../types/games";

type AchievementNames = "quickdraw";

class OctillerysAmbush extends ScriptedGame {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		'quickdraw': {name: 'Quick Draw', type: 'first', bits: 1000, description: "be the first to successfully fire each round"},
	};

	fireTime: boolean = false;
	firstFire: Player | false | undefined;
	queue: {source: Player; target: Player}[] = [];
	roundActions = new Map<Player, boolean>();
	shields = new Map<Player, boolean>();

	onStart(): void {
		this.say("Prepare your Remoraid!");
		this.nextRound();
	}

	onRenamePlayer(player: Player): void {
		if (!this.started || player.eliminated) return;
		this.removePlayer(player.name, true);
		this.say(player.name + " was DQed for changing names!");
	}

	onNextRound(): void {
		this.fireTime = false;
		if (this.round > 1) {
			this.shields.clear();
			let firstFireChecked = false;
			for (const slot of this.queue) {
				if (slot.source.eliminated) continue;
				const player = slot.source;
				this.shields.set(player, true);
				const targetPlayer = slot.target;
				if (this.shields.has(targetPlayer) || targetPlayer.eliminated) continue;

				if (!firstFireChecked) {
					if (this.firstFire === undefined) {
						this.firstFire = player;
					} else {
						if (this.firstFire && this.firstFire !== player) this.firstFire = false;
					}
					firstFireChecked = true;
				}

				this.eliminatePlayer(targetPlayer, "You were hit by " + player.name + "'s Remoraid!");
			}
			if (this.getRemainingPlayerCount() <= 1) return this.end();
		}
		this.roundActions.clear();
		this.queue = [];
		const html = this.getRoundHtml(players => this.getPlayerNames(players));
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			const time = this.sampleOne([8000, 9000, 10000]);
			const text = "**FIRE**";
			this.on(text, () => {
				this.fireTime = true;
				this.setTimeout(() => this.nextRound(), (3 * 1000) + time);
			});
			this.setTimeout(() => this.say(text), time);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd(): void {
		const winner = this.getFinalPlayer();
		if (winner) {
			this.winners.set(winner, 1);
			this.addBits(winner, 250);
			if (this.firstFire === winner) this.unlockAchievement(winner, OctillerysAmbush.achievements.quickdraw);
		}

		this.announceWinners();
	}

	destroyPlayers(): void {
		super.destroyPlayers();

		this.roundActions.clear();
		this.shields.clear();
	}
}

const commands: GameCommandDefinitions<OctillerysAmbush> = {
	fire: {
		command(target, room, user) {
			const player = this.players[user.id];
			if (this.roundActions.has(player)) return false;
			this.roundActions.set(player, true);
			if (!this.fireTime) return false;

			const id = Tools.toId(target);
			if (!(id in this.players)) return false;

			const targetPlayer = this.players[id];
			if (targetPlayer === player || targetPlayer.eliminated) return false;
			this.queue.push({"target": targetPlayer, "source": player});
			return true;
		},
	},
};

export const game: IGameFile<OctillerysAmbush> = {
	aliases: ["octillerys", "oa"],
	category: 'reaction',
	challengeSettings: {
		onevsone: {
			enabled: true,
		},
	},
	commandDescriptions: [Config.commandCharacter + "fire [player]"],
	commands,
	class: OctillerysAmbush,
	description: "Players await Octillery's <code>FIRE</code> signal to eliminate their opponents with their Remoraid!",
	formerNames: ["Ambush"],
	name: "Octillery's Ambush",
	mascot: "Octillery",
};

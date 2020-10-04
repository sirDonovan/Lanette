import type { Player, PlayerTeam } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { GameCommandDefinitions, GameCommandReturnType, IGameFile } from "../types/games";

const BALL_POKEMON = "Igglybuff";

class JigglypuffsDodgeball extends ScriptedGame {
	throwTime: boolean = false;
	queue: {source: Player; target: Player}[] = [];
	renameDQs: Player[] = [];
	roundActions = new Map<Player, boolean>();
	shields = new Map<Player, boolean>();
	teams: Dict<PlayerTeam> = {};

	onRenamePlayer(player: Player, oldId: string): void {
		if (!this.started || player.eliminated) return;
		this.removePlayer(player.name, true);
		this.say(player.name + " was DQed for changing names!");
		this.renameDQs.push(player);
	}

	onStart(): void {
		this.teams = this.generateTeams(2);
		for (const i in this.teams) {
			const players = this.teams[i].players;
			for (const player of players) {
				player.say("**Your team**: " + Tools.joinList(players.filter(x => x !== player).map(x => x.name)));
			}
		}

		this.nextRound();
	}

	onNextRound(): void {
		this.throwTime = false;
		if (this.round > 1) {
			this.shields.clear();
			let revivedPlayer: Player | undefined;
			let caughtBall = false;
			for (const slot of this.queue) {
				const player = slot.source;
				const targetPlayer = slot.target;
				this.shields.set(player, true);
				if (this.shields.has(targetPlayer) || targetPlayer.eliminated || targetPlayer.frozen ||
					(revivedPlayer && targetPlayer === revivedPlayer)) continue;

				if (!caughtBall && this.random(2)) {
					let text = targetPlayer.name + " caught " + player.name + "'s " + BALL_POKEMON;
					const eliminatedTeammates = targetPlayer.team!.players.filter(x => x.frozen);
					if (eliminatedTeammates.length) {
						revivedPlayer = this.sampleOne(eliminatedTeammates);
						revivedPlayer.frozen = false;
						text += " and brought " + revivedPlayer.name + " back into the game";
					}

					this.say(text + "!");
					caughtBall = true;
				} else {
					targetPlayer.frozen = true;
					targetPlayer.say("You were hit by " + player.name + "'s " + BALL_POKEMON + "!");
				}
			}

			if (this.getRemainingPlayerCount() === 1) return this.end();

			let remainingTeams = 0;
			for (const i in this.teams) {
				if (this.getRemainingPlayerCount(this.teams[i].players) >= 1) remainingTeams++;
			}
			if (remainingTeams === 1) return this.end();
		}

		this.roundActions.clear();
		this.queue = [];

		const html = this.getRoundHtml(() => this.getTeamPlayerNames(this.teams), undefined, undefined, "Remaining team players");
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			const time = this.sampleOne([8000, 9000, 10000]);
			const text = "**THROW**";
			this.on(text, () => {
				this.throwTime = true;
				this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
			});
			this.timeout = setTimeout(() => this.say(text), time);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd(): void {
		let team: PlayerTeam | undefined;
		for (const i in this.players) {
			if (this.players[i].eliminated || this.players[i].frozen) continue;
			team = this.players[i].team!;
			break;
		}

		if (team) {
			for (const player of team.players) {
				this.winners.set(player, 1);
				let earnings = 250;
				if (!player.eliminated && !player.frozen) earnings *= 2;
				this.addBits(player, earnings);
			}
		}

		this.announceWinners();
	}
}

const commands: GameCommandDefinitions<JigglypuffsDodgeball> = {
	throw: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user): GameCommandReturnType {
			const player = this.players[user.id];
			if (this.roundActions.has(player)) return false;
			this.roundActions.set(player, true);
			if (!this.throwTime) return false;
			const targetPlayer = this.players[Tools.toId(target)];
			if (!targetPlayer || targetPlayer === player || targetPlayer.eliminated || targetPlayer.frozen ||
				targetPlayer.team === player.team) return false;
			this.queue.push({"target": targetPlayer, "source": player});
			return true;
		},
	},
};

export const game: IGameFile<JigglypuffsDodgeball> = {
	aliases: ["jigglypuffs", "dodgeball"],
	category: 'reaction',
	commandDescriptions: [Config.commandCharacter + "throw [player]"],
	commands,
	class: JigglypuffsDodgeball,
	description: "Players await Jigglypuff's <code>THROW</code> signal to eliminate the opposing team with their " + BALL_POKEMON + "!",
	name: "Jigglypuff's Dodgeball",
	noOneVsOne: true,
	mascot: "Jigglypuff",
};

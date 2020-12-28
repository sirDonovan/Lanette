import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { GameCommandDefinitions, IGameFile } from "../types/games";

interface IRoundAbility {
	name: string;
	points: number;
}

const data: {abilities: string[]} = {
	abilities: [],
};

class DedennesAbilityBlitz extends ScriptedGame {
	canSelect: boolean = false;
	firstType: Player | null = null;
	inactiveRoundLimit: number = 5;
	maxPoints: number = 1000;
	points = new Map<Player, number>();
	revealTime: number = 5 * 1000;
	roundAbilities = new Map<string, IRoundAbility>();
	roundLimit: number = 20;
	roundSelections = new Map<Player, IRoundAbility>();
	roundTime: number = 3 * 1000;
	highestCatch: Player | null = null;

	static loadData(): void {
		data.abilities = Games.getAbilitiesList().map(x => x.name);
	}

	onSignups(): void {
		if (this.format.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5000);
	}

	generateAbilities(): void {
		const abilities = this.sampleMany(data.abilities, 3);
		for (const ability of abilities) {
			const id = Tools.toId(ability);
			this.roundAbilities.set(id, {name: ability, points: id.length * 10});
		}
		const text = "Randomly generated abilities: **" + abilities.join(", ") + "**!";
		this.on(text, () => {
			this.canSelect = true;
			this.timeout = setTimeout(() => this.nextRound(), this.roundTime);
		});
		this.say(text);
	}

	onNextRound(): void {
		this.canSelect = false;
		if (this.round > 1) {
			let highestPoints = 0;
			if (this.roundSelections.size) {
				if (this.inactiveRounds) this.inactiveRounds = 0;

				const selections: {player: Player; ability: string; points: number}[] = [];
				// let actions = 0;
				this.roundSelections.forEach((ability, player) => {
					if (player.eliminated) return;
					/*
					if (ability.points > 0) {
						if (actions === 0) this.markFirstAction(player, 'firstType');
						actions++;
					}
					*/
					selections.push({player, ability: ability.name, points: ability.points});
				});
				selections.sort((a, b) => b.points - a.points);
				for (let i = 0, len = selections.length; i < len; i++) {
					const player = selections[i].player;
					let points = this.points.get(player) || 0;
					points += selections[i].points;
					this.points.set(player, points);
					player.say(selections[i].ability + " was worth " + selections[i].points + " points! Your total score is now: " +
						points + ".");
					if (points > highestPoints) highestPoints = points;
					// if (catches[i].pokemon === this.highestBST) this.markFirstAction(player, 'highestCatch');
				}
			} else {
				this.inactiveRounds++;
				if (this.inactiveRounds === this.inactiveRoundLimit) {
					this.inactivityEnd();
					return;
				}
			}

			this.roundSelections.clear();
			this.roundAbilities.clear();
			if (highestPoints >= this.maxPoints) {
				this.timeout = setTimeout(() => this.end(), 3000);
				return;
			}
			if (this.round > this.roundLimit) {
				this.timeout = setTimeout(() => {
					this.say("We've reached the end of the game!");
					this.maxPoints = highestPoints;
					this.timeout = setTimeout(() => this.end(), 3000);
				}, 3000);
				return;
			}
		}
		const html = this.getRoundHtml(players => this.getPlayerPoints(players));
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			this.timeout = setTimeout(() => this.generateAbilities(), this.revealTime);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd(): void {
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			const points = this.points.get(player);
			if (points && points >= this.maxPoints) this.winners.set(player, 1);
		}
		this.convertPointsToBits(0.5, 0.1);
		this.announceWinners();
		/*
		this.winners.forEach((value, user) => {
			if (user === this.firstType) Games.unlockAchievement(this.room, user, "Pokemon Ranger", this);
			if (this.highestCatch === user) Games.unlockAchievement(this.room, user, "Legendary Collector", this);
		});
		*/
	}
}

const commands: GameCommandDefinitions<DedennesAbilityBlitz> = {
	select: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (!this.canSelect) return false;
			const player = this.createPlayer(user) || this.players[user.id];
			if (this.roundSelections.has(player)) return false;
			target = Tools.toId(target);
			if (!target) return false;
			const ability = this.roundAbilities.get(target);
			if (!ability) return false;
			this.roundSelections.set(player, ability);
			this.roundAbilities.delete(target);
			return true;
		},
	},
};

export const game: IGameFile<DedennesAbilityBlitz> = {
	aliases: ["dedennes", "dab"],
	category: 'speed',
	commandDescriptions: [Config.commandCharacter + "select [ability]"],
	commands,
	class: DedennesAbilityBlitz,
	description: "Players try to type one of the shown abilities before anyone else within the three second timer! Abilities containing " +
		"more letters award more points.",
	freejoin: true,
	name: "Dedenne's Ability Blitz",
	mascot: "Dedenne",
};

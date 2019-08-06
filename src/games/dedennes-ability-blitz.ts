import { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { Game } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";

interface IRoundAbility {
	name: string;
	points: number;
}

const name = "Dedenne’s Ability Blitz";
const keys: string[] = [];
let loadedData = false;

class DedennesAbilityBlitz extends Game {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const abilities = Dex.getAbilitiesList();
		for (let i = 0; i < abilities.length; i++) {
			keys.push(abilities[i].name);
		}

		loadedData = true;
	}

	canSelect: boolean = false;
	firstType: Player | null = null;
	maxPoints: number = 1000;
	points = new Map<Player, number>();
	revealTime: number = 5 * 1000;
	roundAbilities = new Map<string, IRoundAbility>();
	roundLimit: number = 20;
	roundSelections = new Map<Player, IRoundAbility>();
	roundTime: number = 3 * 1000;
	highestCatch: Player | null = null;

	onSignups() {
		if (this.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5000);
	}

	generateAbilities() {
		const abilities = Tools.sampleMany(keys, 3);
		for (let i = 0; i < abilities.length; i++) {
			const ability = Tools.toId(abilities[i]);
			this.roundAbilities.set(ability, {name: abilities[i], points: ability.length * 10});
		}
		const text = "Randomly generated abilities: **" + abilities.join(", ") + "**!";
		this.on(text, () => {
			this.canSelect = true;
			this.timeout = setTimeout(() => this.nextRound(), this.roundTime);
		});
		this.say(text);
	}

	onNextRound() {
		this.canSelect = false;
		if (this.round > 1) {
			const selections: {player: Player, ability: string, points: number}[] = [];
			// let actions = 0;
			this.roundSelections.forEach((ability, user) => {
				if (!(user.id in this.players) || this.players[user.id].eliminated) return;
				const player = this.players[user.id];
				/*
				if (ability.points > 0) {
					if (actions === 0) this.markFirstAction(player, 'firstType');
					actions++;
				}
				*/
				selections.push({player, ability: ability.name, points: ability.points});
			});
			selections.sort((a, b) => b.points - a.points);
			let highestPoints = 0;
			for (let i = 0, len = selections.length; i < len; i++) {
				const player = selections[i].player;
				let points = this.points.get(player) || 0;
				points += selections[i].points;
				this.points.set(player, points);
				player.say(selections[i].ability + " was worth " + selections[i].points + " points! Your total score is now: " + points + ".");
				if (points > highestPoints) highestPoints = points;
				// if (catches[i].pokemon === this.highestBST) this.markFirstAction(player, 'highestCatch');
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
		const html = this.getRoundHtml(this.getPlayerPoints);
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			this.timeout = setTimeout(() => this.generateAbilities(), this.revealTime);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd() {
		if (this.parentGame && this.parentGame.id === 'battlefrontier') {
			let highestPoints = 0;
			for (const i in this.players) {
				if (this.players[i].eliminated) continue;
				const player = this.players[i];
				const points = this.points.get(player) || 0;
				if (points > highestPoints) {
					this.winners.clear();
					this.winners.set(player, 1);
					highestPoints = points;
				} else if (points === highestPoints) {
					this.winners.set(player, 1);
				}
			}
		} else {
			for (const i in this.players) {
				if (this.players[i].eliminated) continue;
				const player = this.players[i];
				const points = this.points.get(player);
				if (points && points >= this.maxPoints) this.winners.set(player, 1);
			}
		}
		this.say("**Winner" + (this.winners.size > 1 ? "s" : "") + "**: " + this.getPlayerNames(this.winners));
		this.convertPointsToBits(0.5, 0.1);
		/*
		this.winners.forEach((value, user) => {
			if (user === this.firstType) Games.unlockAchievement(this.room, user, "Pokemon Ranger", this);
			if (this.highestCatch === user) Games.unlockAchievement(this.room, user, "Legendary Collector", this);
		});
		*/
	}
}

const commands: Dict<ICommandDefinition<DedennesAbilityBlitz>> = {
	select: {
		command(target, room, user) {
			if (!this.canSelect) return;
			const player = this.createPlayer(user) || this.players[user.id];
			if (this.roundSelections.has(player)) return;
			target = Tools.toId(target);
			if (!target) return;
			const ability = this.roundAbilities.get(target);
			if (!ability) return;
			this.roundSelections.set(player, ability);
			this.roundAbilities.delete(target);
		},
	},
};

export const game: IGameFile<DedennesAbilityBlitz> = {
	aliases: ["dedennes", "dab"],
	battleFrontierCategory: 'Speed',
	commandDescriptions: [Config.commandCharacter + "select [ability]"],
	commands,
	class: DedennesAbilityBlitz,
	description: "Players try to type one of the shown abilities before anyone else within the three second timer! Abilities containing more letters award more points.",
	freejoin: true,
	name,
	mascot: "Dedenne",
};

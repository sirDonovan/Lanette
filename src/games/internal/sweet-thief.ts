import type { Player } from "../../room-activity";
import { ScriptedGame } from "../../room-game-scripted";
import type { Room } from "../../rooms";
import type { GameCommandDefinitions, IGameFile } from "../../types/games";
import type { User } from "../../users";

export class SweetThief extends ScriptedGame {
	currentHolder: Player | null = null;
	takeBackTimeout: NodeJS.Timer | null = null;
	internalGame: boolean = true;

	// hack for selectUser()
	declare readonly room: Room;

	cleanupTimers(): void {
		if (this.takeBackTimeout) {
			clearTimeout(this.takeBackTimeout);
			// @ts-expect-error
			this.takeBackTimeout = undefined;
		}
	}

	onSignups(): void {
		this.takeBackTimeout = setTimeout(() => this.takeBackSweets(), this.sampleOne([10, 10.5, 11, 11.5, 12]) * 1000);
	}

	takeBackSweets(): void {
		if (this.takeBackTimeout) clearTimeout(this.takeBackTimeout);
		if (this.timeout) clearTimeout(this.timeout);

		if (this.currentHolder) {
			this.say("**Thievul stole the sweets back from " + this.currentHolder.name + "!**");
			this.addBits(this.currentHolder, 25);
		}

		this.end();
	}

	selectUser(): User | undefined {
		let users: User[] = [];
		const now = Date.now();
		const limit = 5 * 60 * 1000;
		this.room.users.forEach(user => {
			if (user.id === Users.self.id || user.away || user.isIdleStatus()) return;
			const roomData = user.rooms.get(this.room)!;
			if (!roomData.lastChatMessage || now - roomData.lastChatMessage > limit) return;
			users.push(user);
		});

		let targetUser: User | undefined;
		users = this.shuffle(users);
		for (const user of users) {
			if (!user.isBot(this.room)) {
				targetUser = user;
				break;
			}
		}

		return targetUser;
	}
}

const commands: GameCommandDefinitions<SweetThief> = {
	steal: {
		command(target, room, user) {
			const player = this.createPlayer(user) || this.players[user.id];
			if (player === this.currentHolder) {
				player.sayPrivateHtml("You cannot steal the sweets from yourself!");
				return false;
			}

			const id = Tools.toId(target);
			if (!(id in this.players) || this.players[id].eliminated) {
				player.sayPrivateHtml("You can only steal the sweets from someone currently in the game!");
				return false;
			}

			if (this.players[id] !== this.currentHolder) {
				player.sayPrivateHtml(this.players[id].name + " does not currently have the sweets!");
				return false;
			}

			this.currentHolder = player;
			return true;
		},
		aliases: ['thief'],
	},
};

export const game: IGameFile<SweetThief> = {
	class: SweetThief,
	commands,
	description: "Players try to steal the sweets from other players before Thievul returns!",
	freejoin: true,
	name: "Sweet Thief",
};

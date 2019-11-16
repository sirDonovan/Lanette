import { ICommandDefinition } from "../../command-parser";
import { Player } from "../../room-activity";
import { Game } from "../../room-game";
import { Room } from "../../rooms";
import { IGameFile } from "../../types/games";
import { User } from "../../users";

class EggToss extends Game {
	currentHolder: Player | null = null;
	internalGame: boolean = true;
	// lastHolder: string = '';
	tossTimeout: NodeJS.Timer | null = null;

	// hack for selectUser()
	room!: Room;

	onSignups() {
		this.timeout = setTimeout(() => this.explodeEgg(), this.sampleOne([10, 10.5, 11, 11.5, 12]) * 1000);
	}

	explodeEgg() {
		if (this.tossTimeout) clearTimeout(this.tossTimeout);
		if (this.currentHolder) {
			this.say("**BOOOOM**! The egg exploded on **" + this.currentHolder.name + "**!");
			// if (this.currentHolder.id === Users.self.id) Games.unlockAchievement(this.room, this.lastHolder, 'egg the system', this);
		}
		// Games.lastEggTimes[this.room.id] = Date.now();
		this.end();
	}

	selectUser(): User {
		const users: User[] = [];
		const now = Date.now();
		const limit = 5 * 60 * 1000;
		this.room.users.forEach(user => {
			if (user.id === Users.self.id) return;
			const roomData = user.rooms.get(this.room)!;
			if (!roomData.lastChatMessage || now - roomData.lastChatMessage > limit) return;
			users.push(user);
		});

		let targetUser = this.sampleOne(users);
		while (targetUser.hasRank(this.room, 'bot')) {
			targetUser = this.sampleOne(users);
		}
		return targetUser;
	}
}

const commands: Dict<ICommandDefinition<EggToss>> = {
	toss: {
		command(target, room, user) {
			if (!this.currentHolder) {
				this.currentHolder = this.createPlayer(user) || this.players[user.id];
			} else {
				if (this.currentHolder.id !== user.id) return false;
			}
			const targetUser = Users.get(target);
			if (!targetUser || !targetUser.rooms.has(this.room) || (targetUser.id !== Users.self.id && targetUser.hasRank(this.room, 'bot'))) return false;
			this.currentHolder = this.createPlayer(targetUser) || this.players[targetUser.id];
			// this.lastHolder = user.name;
			if (targetUser.id === Users.self.id) {
				const selectedUser = this.selectUser();
				this.timeout = setTimeout(() => {
					this.say(Config.commandCharacter + "pass " + selectedUser.name);
					this.currentHolder = this.createPlayer(selectedUser) || this.players[selectedUser.id];
				}, this.sampleOne([500, 1000, 1500]));
			}
			return true;
		},
		aliases: ['pass'],
	},
};

export const game: IGameFile<EggToss> = {
	class: EggToss,
	commands,
	description: "Players try to get rid of the egg before it explodes!",
	freejoin: true,
	name: "Egg Toss",
};

import { ICommandDefinition } from "../../command-parser";
import { Player } from "../../room-activity";
import { Game } from "../../room-game";
import { Room } from "../../rooms";
import { IGameFile, AchievementsDict } from "../../types/games";
import { User } from "../../users";

const achievements: AchievementsDict = {
	"eggthesystem": {name: "Egg the System", type: 'special', bits: 500, description: 'explode the egg on Lady Monita'},
};

class EggToss extends Game {
	currentHolder: Player | null = null;
	internalGame: boolean = true;
	lastHolder: Player | null = null;
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
			if (this.lastHolder && this.currentHolder.id === Users.self.id) this.unlockAchievement(this.lastHolder, achievements.eggthesystem!);
		}
		this.end();
	}

	selectUser(): User {
		const users: User[] = [];
		const now = Date.now();
		const limit = 5 * 60 * 1000;
		this.room.users.forEach(user => {
			if (user.id === Users.self.id || user.away || user.isIdleStatus()) return;
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
			if (!targetUser || !targetUser.rooms.has(this.room)) {
				this.say("You can only egg someone currently in the room.");
				return false;
			}
			if (targetUser === user) {
				this.say("You cannot egg yourself!");
				return false;
			}
			if (targetUser.away || targetUser.isIdleStatus()) {
				this.say("You cannot egg someone who is marked as away.");
				return false;
			}
			this.lastHolder = this.currentHolder;
			this.currentHolder = this.createPlayer(targetUser) || this.players[targetUser.id];
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
	achievements,
	class: EggToss,
	commands,
	description: "Players try to get rid of the egg before it explodes!",
	freejoin: true,
	name: "Egg Toss",
};

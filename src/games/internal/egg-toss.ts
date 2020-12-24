import type { Player } from "../../room-activity";
import { ScriptedGame } from "../../room-game-scripted";
import type { Room } from "../../rooms";
import type { GameCommandDefinitions, IGameAchievement, IGameFile } from "../../types/games";
import type { User } from "../../users";

type AchievementNames = "eggthesystem";

class EggToss extends ScriptedGame {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"eggthesystem": {name: "Egg the System", type: 'special', bits: 500, minigame: true, description: 'explode the egg on Lady Monita'},
	};

	currentHolder: Player | null = null;
	explodeTimeout: NodeJS.Timer | null = null;
	internalGame: boolean = true;
	lastHolder: Player | null = null;

	// hack for selectUser()
	room!: Room;

	cleanupTimers(): void {
		if (this.explodeTimeout) clearTimeout(this.explodeTimeout);
	}

	onUserLeaveRoom(room: Room, user: User): void {
		if (!this.started || !(user.id in this.players) || this.players[user.id].eliminated) return;
		this.currentHolder = this.players[user.id];
		this.explodeEgg("for leaving the room");
	}

	onRenamePlayer(player: Player): void {
		if (!this.started || player.eliminated) return;
		this.currentHolder = player;
		this.explodeEgg("for changing their username");
	}

	onUserUpdateStatus(user: User, status: string, away: boolean): void {
		if (!(user.id in this.players) || this.players[user.id].eliminated || !away) return;
		this.currentHolder = this.players[user.id];
		this.explodeEgg("for changing their away status");
	}

	onSignups(): void {
		this.explodeTimeout = setTimeout(() => this.explodeEgg(), this.sampleOne([10, 10.5, 11, 11.5, 12]) * 1000);
	}

	explodeEgg(reason?: string): void {
		if (this.explodeTimeout) clearTimeout(this.explodeTimeout);
		if (this.timeout) clearTimeout(this.timeout);

		if (this.currentHolder) {
			this.say("**BOOOOM**! The egg exploded on **" + this.currentHolder.name + "**" + (reason ? " " + reason : "") + "!");
			if (this.lastHolder && this.currentHolder.id === Users.self.id) {
				this.unlockAchievement(this.lastHolder, EggToss.achievements.eggthesystem!);
			}
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

const commands: GameCommandDefinitions<EggToss> = {
	toss: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
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
			if (user.away || user.isIdleStatus()) {
				this.say("You cannot egg someone while you are marked as away.");
				return false;
			}
			if (targetUser.away || targetUser.isIdleStatus()) {
				this.say("You cannot egg someone who is marked as away.");
				return false;
			}
			if (targetUser.isBot(this.room) && targetUser !== Users.self) {
				this.say("You cannot egg a bot that is not " + Users.self.name + ".");
				return false;
			}

			this.lastHolder = this.currentHolder;
			this.currentHolder = this.createPlayer(targetUser) || this.players[targetUser.id];
			if (targetUser.id === Users.self.id) {
				this.timeout = setTimeout(() => {
					const selectedUser = this.selectUser();
					if (selectedUser) {
						this.say(Config.commandCharacter + "pass " + selectedUser.name);
						this.currentHolder = this.createPlayer(selectedUser) || this.players[selectedUser.id];
					}
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

import { ICommandDefinition } from "./command-parser";

const commands: Dict<ICommandDefinition> = {
	eval: {
		command(target, room, user) {
			if (!user.isDeveloper()) return;
			try {
				// tslint:disable-next-line no-eval
				const result = eval(target);
				this.say(result);
			} catch (e) {
				this.say(e.message);
			}
		},
		aliases: ['js'],
	},
	creategame: {
		command(target, room, user) {
			if (this.isPm(room) || !user.hasRank(room, '+') || room.game) return;
			if (!Config.allowScriptedGames.includes(room.id)) return this.say("Scripted games are not enabled for this room.");
			if (Users.self.rooms.get(room) !== '*') return this.say(Users.self.name + " requires Bot rank (*) to host scripted games.");
			const format = Games.getFormat(target);
			if (!format) return this.say("'" + target + "' is not a valid game format.");
			Games.createGame(room, format);
		},
		aliases: ['cg'],
	},
	startgame: {
		command(target, room, user) {
			if (this.isPm(room) || !user.hasRank(room, '+') || !room.game || room.game.started) return;
			room.game.start();
		},
		aliases: ['sg'],
	},
	endgame: {
		command(target, room, user) {
			if (this.isPm(room) || !user.hasRank(room, '+') || !room.game) return;
			room.game.forceEnd(user);
		},
	},
	joingame: {
		command(target, room, user) {
			if (this.isPm(room)) {
				if (!target) return;
				const chatRoom = Rooms.get(target);
				if (chatRoom && chatRoom.game) chatRoom.game.addPlayer(user);
			} else {
				if (room.game) room.game.addPlayer(user);
			}
		},
		aliases: ['jg'],
	},
	leavegame: {
		command(target, room, user) {
			if (this.isPm(room)) return;
			if (room.game) room.game.removePlayer(user);
		},
		aliases: ['lg'],
	},
};

export = commands;

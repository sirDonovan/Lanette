import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

export const commands: BaseCommandDefinitions = {
	logs: {
		command(target, room) {
			if (!this.isPm(room)) return;
			this.say("This feature has been removed. Please use the server command ``/searchlogs`` instead.");
		},
	},
	jointournament: {
		command(target, room, user) {
			if (!this.isPm(room) && !user.hasRank(room, 'voice')) return;
			const targetUser = Users.get(target);
			this.say((targetUser ? targetUser.name + ": you" : "You") + " can join a scripted tournament by clicking the ``Join`` button " +
				"at the top of the chat or using the command ``/tour join``. | Guide to joining user-hosted tournaments: " +
				"http://pstournaments.weebly.com/joining-a-tournament.html");
		},
		aliases: ['jointour'],
	},
	autodq: {
		command(target, room, user) {
			if (this.isPm(room) || !user.hasRank(room, 'voice')) return;
			if (!Config.tournamentAutoDQTimers || !(room.id in Config.tournamentAutoDQTimers)) {
				return this.say("The automatic disqualification timer is not set for " + room.title + ".");
			}
			this.say("The automatic disqualification timer is currently set to " + Config.tournamentAutoDQTimers[room.id] + " minutes. " +
				"You will be disqualified from a tournament if you fail to send or accept a challenge from your opponent before the " +
				"timer expires.");
		},
	},
	sampleteams: {
		command(target, room, user) {
			if (!this.isPm(room) && !user.hasRank(room, 'voice')) return;
			const format = Dex.getFormat(target);
			if (!format) return this.sayError(['invalidFormat', target]);
			if (!format.teams) return this.say("No sample teams link found for " + format.name + ".");
			this.say("**" + format.name + " sample teams**: " + format.teams);
		},
		aliases: ['steams'],
	},
	roomsampleteams: {
		command(target, room, user) {
			let samplesRoom: Room;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(Tools.toRoomId(target));
				if (!targetRoom) return this.sayError(['invalidBotRoom', target]);
				if (!user.rooms.has(targetRoom)) return this.sayError(['noPmHtmlRoom', targetRoom.title]);
				samplesRoom = targetRoom;
			} else {
				if (!user.hasRank(room, 'voice')) return;
				samplesRoom = room;
			}

			const database = Storage.getDatabase(samplesRoom);
			if (!database.roomSampleTeamsLink) return this.say("No room sample teams link found for " + samplesRoom.title + ".");
			this.sayHtml("<a href='" + database.roomSampleTeamsLink + "'>" + samplesRoom.title + " sample teams</a>", samplesRoom);
		},
		aliases: ['roomsamples'],
	},
	viabilityranking: {
		command(target, room, user) {
			if (!this.isPm(room) && !user.hasRank(room, 'voice')) return;
			const format = Dex.getFormat(target);
			if (!format) return this.sayError(['invalidFormat', target]);
			if (!format.viability) return this.say("No viability ranking link found for " + format.name + ".");
			this.say("**" + format.name + " viability ranking**: " + format.viability);
		},
		aliases: ['vranking'],
	},
	format: {
		command(target, room, user) {
			let pmRoom: Room | undefined;
			if (this.isPm(room)) {
				user.rooms.forEach((value, userRoom) => {
					if (!pmRoom && Users.self.hasRank(userRoom, 'bot')) pmRoom = userRoom;
				});
				if (!pmRoom) return this.say("You must be in a room where " + Users.self.name + " has Bot rank.");
			} else {
				if (!user.hasRank(room, 'voice')) return;
				pmRoom = room;
			}
			const format = Dex.getFormat(target);
			if (!format) return this.sayError(['invalidFormat', target]);
			const html = Dex.getFormatInfoDisplay(format);
			if (!html) return this.say("No info found for " + format.name + ".");
			this.sayHtml(html, pmRoom);
		},
		aliases: ['om', 'tier'],
	},
	randombattle: {
		command(target, room, user) {
			if (!this.isPm(room) && !user.hasRank(room, 'voice')) return;
			const pokemon = Dex.getPokemon(target);
			if (!pokemon) return this.sayError(['invalidPokemon', target]);
			if (!pokemon.randomBattleMoves) return this.say("No Random Battle data found for " + pokemon.name + ".");
			const data: string[] = [];
			for (const move of pokemon.randomBattleMoves) {
				data.push(Dex.getExistingMove(move).name);
			}
			this.say("**" + pokemon.name + " moves**: " + Tools.joinList(data.sort()) + ".");
		},
		aliases: ['randombattles', 'randbat', 'randbats'],
	},
	randomdoublesbattle: {
		command(target, room, user) {
			if (!this.isPm(room) && !user.hasRank(room, 'voice')) return;
			const pokemon = Dex.getPokemon(target);
			if (!pokemon) return this.sayError(['invalidPokemon', target]);
			if (!pokemon.randomDoubleBattleMoves) return this.say("No Random Doubles Battle data found for " + pokemon.name + ".");
			const data: string[] = [];
			for (const move of pokemon.randomDoubleBattleMoves) {
				data.push(Dex.getExistingMove(move).name);
			}
			this.say("**" + pokemon.name + " doubles moves**: " + Tools.joinList(data.sort()) + ".");
		},
		aliases: ['randomdoublesbattles', 'randombattledoubles', 'randombattlesdoubles', 'randdubs', 'randbatdubs', 'randbatsdubs'],
	},
};

/* eslint-enable */
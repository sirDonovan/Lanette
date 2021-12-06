import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";

export const commands: BaseCommandDefinitions = {
	logs: {
		command(target, room) {
			if (!this.isPm(room)) return;
			this.say("This feature has been removed. Please use the server command ``/searchlogs`` instead.");
		},
		pmOnly: true,
	},
	jointournament: {
		command(target, room, user) {
			if (!this.isPm(room) && !user.hasRank(room, 'star')) return;
			const targetUser = Users.get(target);
			this.say((targetUser ? targetUser.name + ": you" : "You") + " can join a scripted tournament by clicking the ``Join`` button " +
				"at the top of the chat or using the command ``/tour join``. | Guide to joining user-hosted tournaments: " +
				"http://pstournaments.weebly.com/joining-a-tournament.html");
		},
		aliases: ['jointour'],
		description: ["displays information about joining server tournaments"],
	},
	autodq: {
		command(target, room, user) {
			if (this.isPm(room) || !user.hasRank(room, 'star')) return;
			if (!Config.tournamentAutoDQTimers || !(room.id in Config.tournamentAutoDQTimers)) {
				return this.say("The automatic disqualification timer is not set for " + room.title + ".");
			}
			this.say("The automatic disqualification timer is currently set to " + Config.tournamentAutoDQTimers[room.id] + " minutes. " +
				"You will be disqualified from a tournament if you fail to send or accept a challenge from your opponent before the " +
				"timer expires.");
		},
		chatOnly: true,
		description: ["displays automatic disqualification timer information for the room"],
	},
	sampleteams: {
		command(target, room, user) {
			if (!this.isPm(room) && !user.hasRank(room, 'star')) return;
			const format = Dex.getFormat(target);
			if (!format || format.effectType !== 'Format') return this.sayError(['invalidFormat', target]);

			const teams: string[] = [];
			if (format.teams) teams.push("sample teams: " + format.teams);
			if (format.ruinsOfAlphTeams) teams.push("Ruins of Alph team hub: " + format.ruinsOfAlphTeams);

			if (!teams.length) return this.say("No sample teams links found for " + format.name + ".");
			this.say("**" + format.name + "** | " + teams.join(" | "));
		},
		aliases: ['steams'],
		syntax: ["[format]"],
		description: ["links to the sample teams for the given format"],
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
				if (!user.hasRank(room, 'star')) return;
				samplesRoom = room;
			}

			const database = Storage.getDatabase(samplesRoom);
			if (!database.roomSampleTeamsLink) return this.say("No room sample teams link found for " + samplesRoom.title + ".");
			this.sayHtml("<a href='" + database.roomSampleTeamsLink + "'>" + samplesRoom.title + " sample teams</a>", samplesRoom);
		},
		aliases: ['roomsamples'],
		pmSyntax: ["[room]"],
		description: ["links to the room's sample teams"],
	},
	viabilityranking: {
		command(target, room, user) {
			if (!this.isPm(room) && !user.hasRank(room, 'star')) return;
			const format = Dex.getFormat(target);
			if (!format || format.effectType !== 'Format') return this.sayError(['invalidFormat', target]);
			if (!format.viability) return this.say("No viability ranking link found for " + format.name + ".");
			this.say("**" + format.name + " viability ranking**: " + format.viability);
		},
		aliases: ['vranking'],
		syntax: ["[format]"],
		description: ["links to the format's viability ranking"],
	},
	format: {
		command(target, room, user) {
			let pmRoom: Room | undefined;
			if (this.isPm(room)) {
				const botRoom = user.getBotRoom();
				if (!botRoom) return this.say(CommandParser.getErrorText(['noBotRankRoom']));
				pmRoom = botRoom;
			} else {
				if (!user.hasRank(room, 'star')) return;
				pmRoom = room;
			}
			const format = Dex.getFormat(target);
			if (!format || format.effectType !== 'Format') return this.sayError(['invalidFormat', target]);
			const html = Dex.getFormatInfoDisplay(format);
			if (!html) return this.say("No info found for " + format.name + ".");
			this.sayHtml(html, pmRoom);
		},
		aliases: ['tier', 'om'],
		description: ["displays information about the given format"],
	},
	randombattle: {
		command(target, room, user) {
			if (!this.isPm(room) && !user.hasRank(room, 'star')) return;
			const pokemon = Dex.getPokemon(target);
			if (!pokemon) return this.sayError(['invalidPokemon', target]);
			if (!pokemon.randomBattleMoves) return this.say("No Random Battle data found for " + pokemon.name + ".");
			const data: string[] = [];
			for (const move of pokemon.randomBattleMoves) {
				data.push(Dex.getExistingMove(move).name);
			}
			this.say("**" + pokemon.name + " moves**: " + Tools.joinList(data.sort()) + ".");
		},
		aliases: ['randbats', 'randombattles', 'randbat'],
		syntax: ["[Pokemon]"],
		description: ["displays possible Random Battle moves for the given Pokemon"],
	},
	randomdoublesbattle: {
		command(target, room, user) {
			if (!this.isPm(room) && !user.hasRank(room, 'star')) return;
			const pokemon = Dex.getPokemon(target);
			if (!pokemon) return this.sayError(['invalidPokemon', target]);
			if (!pokemon.randomDoubleBattleMoves) return this.say("No Random Doubles Battle data found for " + pokemon.name + ".");
			const data: string[] = [];
			for (const move of pokemon.randomDoubleBattleMoves) {
				data.push(Dex.getExistingMove(move).name);
			}
			this.say("**" + pokemon.name + " doubles moves**: " + Tools.joinList(data.sort()) + ".");
		},
		aliases: ['randbatsdubs', 'randomdoublesbattles', 'randombattledoubles', 'randombattlesdoubles', 'randdubs', 'randbatdubs'],
		syntax: ["[Pokemon]"],
		description: ["displays possible Random Doubles Battle moves for the given Pokemon"],
	},
};

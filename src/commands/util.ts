import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { CharacterType, LocationType, RegionName } from "../types/dex";
import type { IPokemon } from "../types/pokemon-showdown";

const RANDOM_GENERATOR_LIMIT = 6;

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

export const commands: BaseCommandDefinitions = {
	randompick: {
		command(target, room, user) {
			if (!this.isPm(room) && !user.hasRank(room, 'voice') && !(room.userHostedGame && room.userHostedGame.isHost(user))) return;
			const choices: string[] = [];
			const targets = target.split(',');
			for (const choice of targets) {
				if (Tools.toId(choice)) choices.push(choice.trim());
			}
			if (choices.length < 2) return this.say("You must specify at least 2 choices.");
			this.say("**Random pick**: " + Tools.sampleOne(choices));
		},
		aliases: ['rpick'],
	},
	randomorder: {
		command(target, room, user) {
			if (!this.isPm(room) && !user.hasRank(room, 'voice') && !(room.userHostedGame && room.userHostedGame.isHost(user))) return;
			const choices: string[] = [];
			const targets = target.split(',');
			for (const choice of targets) {
				if (Tools.toId(choice)) choices.push(choice.trim());
			}
			if (choices.length < 2) return this.say("You must specify at least 2 items.");
			this.say("**Random order**: " + Tools.shuffle(choices).join(', '));
		},
		aliases: ['rorder', 'shuffle'],
	},
	timer: {
		command(target, room, user) {
			if (this.isPm(room)) return;
			if (!user.hasRank(room, 'voice')) {
				if (room.userHostedGame && room.userHostedGame.isHost(user)) this.run('gametimer');
				return;
			}
			const id = Tools.toId(target);
			if (id === 'off' || id === 'end') {
				if (!room.timers || !(user.id in room.timers)) return this.say("You do not have a timer running.");
				clearTimeout(room.timers[user.id]);
				delete room.timers[user.id];
				return this.say("Your timer has been turned off.");
			}

			let time: number;
			if (id.length === 1) {
				time = parseInt(id) * 60;
			} else {
				time = parseInt(id);
			}
			if (isNaN(time) || time > 1800 || time < 5) return this.say("Please enter an amount of time between 5 seconds and 30 minutes.");
			time *= 1000;

			if (!room.timers) room.timers = {};
			if (user.id in room.timers) clearTimeout(room.timers[user.id]);
			room.timers[user.id] = setTimeout(() => {
				room.say(user.name + ": time is up!");
				delete room.timers![user.id];
			}, time);
			this.say("Your timer has been set for: " + Tools.toDurationString(time) + ".");
		},
	},
	repeatmessage: {
		command(target, room, user, cmd) {
			const targets = target.split(',');
			let repeatSummary = !target;
			let repeatRoom: Room | undefined;
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(targets[0]);
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
				if (!user.rooms.has(targetRoom)) return this.sayError(['noPmHtmlRoom', targetRoom.title]);
				targets.shift();
				repeatRoom = targetRoom;
				repeatSummary = !targets.length;
			} else {
				repeatRoom = room;
			}

			if (!user.hasRank(repeatRoom, 'driver')) return;

			if (repeatSummary) {
				if (!repeatRoom.repeatedMessages) return this.say("There are currently no repeated messages in this room.");
				let html = "<b>Repeated messages</b>:<ul>";
				for (const i in repeatRoom.repeatedMessages) {
					const repeatedMessage = repeatRoom.repeatedMessages[i];
					html += "<li><b>" + repeatedMessage.name + "</b>: every " +
						Tools.toDurationString(repeatedMessage.interval) + " with the text <code>" +
						repeatedMessage.message + "</code> (" + repeatedMessage.user + ")</li>";
				}
				html += "</ul>";
				return this.sayHtml(html, repeatRoom);
			}

			const action = Tools.toId(targets[0]);
			if (action === 'off' || action === 'end' || action === 'stop' || action === 'delete' || action === 'remove') {
				const messageId = Tools.toId(targets[1]);
				if (!repeatRoom.repeatedMessages || !(messageId in repeatRoom.repeatedMessages)) {
					return this.say("There is no repeating message with the name '" + targets[1].trim() + "'.");
				}
				clearInterval(repeatRoom.repeatedMessages[messageId].timer);
				const name = repeatRoom.repeatedMessages[messageId].name;
				delete repeatRoom.repeatedMessages[messageId];
				if (!Object.keys(repeatRoom.repeatedMessages).length) delete repeatRoom.repeatedMessages;
				return this.say("The repeating message with the name '" + name + "' has been stopped.");
			}

			if (action !== 'add' || targets.length < 4) {
				return this.say("Usage: ``" + Config.commandCharacter + "" + cmd + " add, [name], [interval in minutes], message``.");
			}

			const messageName = targets[1].trim();
			const messageId = Tools.toId(messageName);
			if (!messageId) return this.say("Please specify a valid message name.");

			if (repeatRoom.repeatedMessages && messageId in repeatRoom.repeatedMessages) {
				return this.say("There is already a repeating message with the name '" + messageName + "'.");
			}

			const minutes = parseInt(targets[2].trim());
			const maxHours = 6;
			if (isNaN(minutes) || minutes < 5 || minutes > (maxHours * 60)) {
				return this.say("Please specify an interval between 5 minutes and " + maxHours + " hours.");
			}
			const interval = minutes * 60 * 1000;

			const message = this.sanitizeResponse(targets.slice(3).join(',').trim(), ['daily', 'roomfaq', 'rfaq', 'roomevents', 'events']);
			if (!Tools.toId(message).length) return this.say("Please specify a valid message.");

			if (!repeatRoom.repeatedMessages) repeatRoom.repeatedMessages = {};
			repeatRoom.repeatedMessages[messageId] = {
				timer: setInterval(() => repeatRoom!.say(message), interval),
				message,
				interval,
				name: messageName,
				user: user.name,
			};

			const duration = Tools.toDurationString(interval);
			this.say("The message with the name '" + messageName + "' has been set to repeat every " + duration + ".");
			repeatRoom.sayCommand("/modnote " + user.name + " set a message to repeat every " + duration + " with the text '" +
				message + "'");
		},
		aliases: ['repeatm', 'repeatmessages'],
	},
	showgifs: {
		command(target, room, user, cmd) {
			if (!this.isPm(room)) return;
			const targets = target.split(',');
			const gameRoom = Rooms.search(targets[0]);
			if (!gameRoom) return this.sayError(['invalidBotRoom', targets[0]]);
			if (!Users.self.hasRank(gameRoom, 'bot')) return this.sayError(['missingBotRankForFeatures', 'game']);
			if (gameRoom.userHostedGame) {
				if (!gameRoom.userHostedGame.isHost(user)) return;
			} else {
				if (gameRoom.game || !user.hasRank(gameRoom, 'driver')) return;
			}
			targets.shift();

			const showIcon = cmd.startsWith('showicon');
			const isBW = cmd.startsWith('showbw');
			const generation = isBW ? "bw" : "xy";
			const gifsOrIcons: string[] = [];
			const pokemonList: IPokemon[] = [];

			for (const name of targets) {
				const pokemon = Dex.getPokemon(name);
				if (!pokemon) return this.sayError(['invalidPokemon', name]);
				if (!showIcon && !Dex.hasGifData(pokemon, generation)) {
					return this.say(pokemon.name + " does not have a" + (isBW ? " BW" : "") + " gif.");
				}
				pokemonList.push(pokemon);
				gifsOrIcons.push(showIcon ? Dex.getPSPokemonIcon(pokemon) + pokemon.name : Dex.getPokemonGif(pokemon, generation));
			}

			if (!gifsOrIcons.length) return this.say("You must specify at least 1 Pokemon.");

			const max = showIcon ? 30 : 5;
			if (gifsOrIcons.length > max) return this.say("Please specify between 1 and " + max + " Pokemon.");

			let html = "";
			if (!showIcon) html += "<center>";
			html += gifsOrIcons.join(showIcon ? ", " : "");
			if (!showIcon) html += "</center>";

			html += '<div style="float:right;color:#888;font-size:8pt">[' + user.name + ']</div><div style="clear:both"></div>';

			if (gameRoom.userHostedGame) {
				const uhtmlName = gameRoom.userHostedGame.uhtmlBaseName + "-" + gameRoom.userHostedGame.round + "-" +
					(showIcon ? "icon" : "gif");
				gameRoom.userHostedGame.sayPokemonUhtml(pokemonList, showIcon ? 'icon' : 'gif', uhtmlName,
					"<div class='infobox'>" + html + "</div>", user);
			} else {
				gameRoom.sayHtml(html);
			}
		},
		aliases: ['showgif', 'showbwgifs', 'showbwgif', 'showicons', 'showicon'],
	},
	showrandomgifs: {
		command(target, room, user, cmd) {
			if (!this.isPm(room)) return;
			const targets = target.split(',');
			const gameRoom = Rooms.search(targets[0]);
			if (!gameRoom) return this.sayError(['invalidBotRoom', targets[0]]);
			if (!Users.self.hasRank(gameRoom, 'bot')) return this.sayError(['missingBotRankForFeatures', 'game']);
			if (gameRoom.userHostedGame) {
				if (!gameRoom.userHostedGame.isHost(user)) return;
			} else {
				if (gameRoom.game || !user.hasRank(gameRoom, 'driver')) return;
			}

			targets.shift();

			const showIcon = cmd.endsWith('icon') || cmd.endsWith('icons');
			const isBW = cmd.startsWith('showrandombw') || cmd.startsWith('showrandbw');
			const generation = isBW ? "bw" : "xy";
			const gifsOrIcons: string[] = [];

			let typing = '';
			let dualType = false;
			let amount: number;
			if (targets.length && !Tools.isInteger(targets[0].trim())) {
				const types = targets[0].split("/").map(x => x.trim());
				for (let i = 0; i < types.length; i++) {
					const type = Dex.getType(types[i]);
					if (!type) return this.say("'" + types[i] + "' is not a valid type.");
					types[i] = type.name;
				}
				typing = types.sort().join("/");
				dualType = types.length > 1;
				targets.shift();
			}

			if (targets.length) {
				const max = showIcon ? 30 : 5;
				amount = parseInt(targets[0]);
				if (isNaN(amount) || amount < 1 || amount > max) return this.say("Please specify a number of Pokemon between 1 and " +
					max + ".");
			} else {
				amount = 1;
			}

			let pokemonList = Games.getPokemonList();
			if (gameRoom.userHostedGame) {
				pokemonList = gameRoom.userHostedGame.shuffle(pokemonList);
			} else {
				pokemonList = Tools.shuffle(pokemonList);
			}
			const usedPokemon: IPokemon[] = [];
			for (const pokemon of pokemonList) {
				if (isBW && pokemon.gen > 5) continue;
				if (!showIcon && !Dex.hasGifData(pokemon, generation)) continue;
				if (typing) {
					if (dualType) {
						if (pokemon.types.slice().sort().join("/") !== typing) continue;
					} else {
						if (!pokemon.types.includes(typing)) continue;
					}
				}

				usedPokemon.push(pokemon);
				gifsOrIcons.push(showIcon ? Dex.getPSPokemonIcon(pokemon) + pokemon.name : Dex.getPokemonGif(pokemon, generation));
				if (gifsOrIcons.length === amount) break;
			}

			if (gifsOrIcons.length < amount) return this.say("Not enough Pokemon match the specified options.");

			let html = "";
			if (!showIcon) html += "<center>";
			html += gifsOrIcons.join(showIcon ? ", " : "");
			if (!showIcon) html += "</center>";

			html += '<div style="float:right;color:#888;font-size:8pt">[' + user.name + ']</div><div style="clear:both"></div>';

			if (gameRoom.userHostedGame) {
				const uhtmlName = gameRoom.userHostedGame.uhtmlBaseName + "-" + gameRoom.userHostedGame.round + "-" +
					(showIcon ? "icon" : "gif");
				gameRoom.userHostedGame.sayPokemonUhtml(usedPokemon, showIcon ? 'icon' : 'gif', uhtmlName,
					"<div class='infobox'>" + html + "</div>", user);
			} else {
				gameRoom.sayHtml(html);
			}
		},
		aliases: ['showrandomgif', 'showrandombwgifs', 'showrandombwgif', 'showrandgifs', 'showrandgif', 'showrandbwgifs', 'showrandbwgif',
			'showrandomicons', 'showrandomicon', 'showrandicons', 'showrandicon'],
	},
	showtrainersprites: {
		command(target, room, user) {
			if (!this.isPm(room)) return;
			const targets = target.split(',');
			const gameRoom = Rooms.search(targets[0]);
			if (!gameRoom) return this.sayError(['invalidBotRoom', targets[0]]);
			if (!Users.self.hasRank(gameRoom, 'bot')) return this.sayError(['missingBotRankForFeatures', 'game']);
			if (gameRoom.userHostedGame) {
				if (!gameRoom.userHostedGame.isHost(user)) return;
			} else {
				if (gameRoom.game || !user.hasRank(gameRoom, 'driver')) return;
			}
			targets.shift();

			const trainerList: string[] = [];

			for (const name of targets) {
				const id = Dex.getTrainerSpriteId(name);
				if (!id) return this.say("There is no trainer sprite for '" + name.trim() + "'.");
				trainerList.push(id);
			}

			if (!trainerList.length) return this.say("You must specify at least 1 Pokemon.");

			const max = 5;
			if (trainerList.length > max) return this.say("Please specify between 1 and " + max + " trainers.");

			let html = "<center>" + trainerList.map(x => Dex.getTrainerSprite(x)).join("") + "</center>";

			html += '<div style="float:right;color:#888;font-size:8pt">[' + user.name + ']</div><div style="clear:both"></div>';

			if (gameRoom.userHostedGame) {
				const uhtmlName = gameRoom.userHostedGame.uhtmlBaseName + "-" + gameRoom.userHostedGame.round + "-trainer";
				gameRoom.userHostedGame.sayTrainerUhtml(trainerList, uhtmlName, "<div class='infobox'>" + html + "</div>", user);
			} else {
				gameRoom.sayHtml(html);
			}
		},
		aliases: ['showtrainersprite', 'showtrainers', 'showtrainer'],
	},
	roll: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;
			this.say('!roll ' + (target || "2"));
		},
	},
	dt: {
		command(target, room, user) {
			if (!target || (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user)))))) return;
			this.say('!dt ' + target);
		},
	},
	randompokemon: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;
			if (!target) {
				const species = Dex.getExistingPokemon(Tools.sampleOne(Dex.data.pokemonKeys)).name;
				if (this.pm) {
					this.say('Randomly generated Pokemon: **' + species + '**');
				} else {
					this.say('!dt ' + species);
				}
				return;
			}
			this.say("!randpoke " + target);
		},
		aliases: ['rpoke', 'rpokemon', 'randpoke'],
	},
	randommove: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;

			let amount: number;
			if (target) {
				amount = parseInt(target);
				if (isNaN(amount) || amount < 1 || amount > RANDOM_GENERATOR_LIMIT) {
					return this.say("Please specify a number of moves between 1 and " + RANDOM_GENERATOR_LIMIT + ".");
				}
			} else {
				amount = 1;
			}

			const movesList = Games.getMovesList().map(x => x.name);
			let moves: string[];
			if (!this.isPm(room) && room.userHostedGame) {
				moves = room.userHostedGame.shuffle(movesList);
			} else {
				moves = Tools.shuffle(movesList);
			}

			const multiple = amount > 1;
			if (this.pm || multiple) {
				this.say("Randomly generated move" + (multiple ? "s" : "") + ": **" + Tools.joinList(moves.slice(0, amount)) + "**");
			} else {
				this.say('!dt ' + moves[0]);
			}
		},
		aliases: ['rmove', 'randmove'],
	},
	randomitem: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;

			let amount: number;
			if (target) {
				amount = parseInt(target);
				if (isNaN(amount) || amount < 1 || amount > RANDOM_GENERATOR_LIMIT) {
					return this.say("Please specify a number of items between 1 and " + RANDOM_GENERATOR_LIMIT + ".");
				}
			} else {
				amount = 1;
			}

			const itemsList = Games.getItemsList().map(x => x.name);
			let items: string[];
			if (!this.isPm(room) && room.userHostedGame) {
				items = room.userHostedGame.shuffle(itemsList);
			} else {
				items = Tools.shuffle(itemsList);
			}

			const multiple = amount > 1;
			if (this.pm || multiple) {
				this.say("Randomly generated item" + (multiple ? "s" : "") + ": **" + Tools.joinList(items.slice(0, amount)) + "**");
			} else {
				this.say('!dt ' + items[0]);
			}
		},
		aliases: ['ritem', 'randitem'],
	},
	randomability: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;

			let amount: number;
			if (target) {
				amount = parseInt(target);
				if (isNaN(amount) || amount < 1 || amount > RANDOM_GENERATOR_LIMIT) {
					return this.say("Please specify a number of abilities between 1 and " + RANDOM_GENERATOR_LIMIT + ".");
				}
			} else {
				amount = 1;
			}

			const abilitiesList = Games.getAbilitiesList().map(x => x.name);
			let abilities: string[];
			if (!this.isPm(room) && room.userHostedGame) {
				abilities = room.userHostedGame.shuffle(abilitiesList);
			} else {
				abilities = Tools.shuffle(abilitiesList);
			}

			const multiple = amount > 1;
			if (this.pm || multiple) {
				this.say("Randomly generated " + (multiple ? "abilities" : "ability") + ": **" +
					Tools.joinList(abilities.slice(0, amount)) + "**");
			} else {
				this.say('!dt ' + abilities[0]);
			}
		},
		aliases: ['rability', 'randability'],
	},
	randomtype: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;
			const typeKeys = Dex.data.typeKeys.slice();
			const key = Tools.sampleOne(typeKeys);
			const types: string[] = [Dex.getExistingType(key).name];
			if (Tools.random(2)) {
				typeKeys.splice(typeKeys.indexOf(key), 1);
				types.push(Dex.getExistingType(Tools.sampleOne(typeKeys)).name);
			}
			this.say('Randomly generated type: **' + types.join("/") + '**');
		},
		aliases: ['rtype', 'randtype'],
	},
	randomexistingtype: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;
			let type = '';
			const pokedex = Tools.shuffle(Dex.getPokemonList());
			for (const pokemon of pokedex) {
				if (!pokemon.forme) {
					type = pokemon.types.join('/');
					break;
				}
			}
			this.say('Randomly generated existing type: **' + type + '**');
		},
		aliases: ['rextype', 'randextype', 'rexistingtype', 'randexistingtype'],
	},
	randombadge: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;
			let region: RegionName;
			if (target) {
				const id = Tools.toId(target) as RegionName;
				if (!Dex.regions.includes(id) || !Dex.data.badges[id].length) {
					return this.say("'" + target + "' is not a valid badge region.");
				}
				region = id;
			} else {
				region = Tools.sampleOne(Dex.regions);
				while (!Dex.data.badges[region].length) {
					region = Tools.sampleOne(Dex.regions);
				}
			}

			this.say('Randomly generated' + (target ? ' ' + Dex.regionNames[region] : '') + ' badge: ' +
				'**' + Tools.sampleOne(Dex.data.badges[region]).trim() + '**');
		},
		aliases: ['rbadge', 'randbadge'],
	},
	randomcharacter: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;
			const targets = target.split(',');
			let region: RegionName;
			if (target) {
				const id = Tools.toId(targets[0]) as RegionName;
				if (!Dex.regions.includes(id)) return this.say("'" + targets[0].trim() + "' is not a valid character region.");
				region = id;
			} else {
				region = Tools.sampleOne(Dex.regions);
			}

			let type = Tools.toId(targets[1]) as CharacterType;
			if (type.length) {
				if (!Dex.characterTypes.includes(type)) return this.say("'" + targets[1].trim() + "' is not a valid location type.");
				if (!Dex.data.characters[region][type].length) {
					return this.say("There are no " + Dex.characterTypeNames[type] + " characters in " + Dex.regionNames[region] + ".");
				}
			} else {
				type = Tools.sampleOne(Dex.characterTypes);
				while (!Dex.data.characters[region][type].length) {
					type = Tools.sampleOne(Dex.characterTypes);
				}
			}

			this.say('Randomly generated' + (target ? ' ' + Dex.regionNames[region] : '') + (targets[1] ? ' ' +
				Dex.characterTypeNames[type] : '') + ' character: **' + Tools.sampleOne(Dex.data.characters[region][type]).trim() + '**');
		},
		aliases: ['rchar', 'rcharacter', 'randchar', 'randcharacter'],
	},
	randomlocation: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;
			const targets = target.split(',');
			let region: RegionName;
			if (target) {
				const id = Tools.toId(targets[0]) as RegionName;
				if (!Dex.regions.includes(id)) return this.say("'" + targets[0].trim() + "' is not a valid location region.");
				region = id;
			} else {
				region = Tools.sampleOne(Dex.regions);
			}

			let type = Tools.toId(targets[1]) as LocationType;
			if (type.length) {
				if (!Dex.locationTypes.includes(type)) return this.say("'" + targets[1] + "' is not a valid location type.");
				if (!Dex.data.locations[region][type].length) {
					return this.say("There are no " + Dex.locationTypeNames[type] + " locations in " + Dex.regionNames[region] + ".");
				}
			} else {
				type = Tools.sampleOne(Dex.locationTypes);
				while (!Dex.data.locations[region][type].length) {
					type = Tools.sampleOne(Dex.locationTypes);
				}
			}

			this.say('Randomly generated' + (target ? ' ' + Dex.regionNames[region] : '') + (targets[1] ? ' ' +
				Dex.locationTypeNames[type] : '') + ' location: **' + Tools.sampleOne(Dex.data.locations[region][type]).trim() + '**');
		},
		aliases: ['rlocation', 'rloc', 'randloc', 'randlocation'],
	},
	randomletter: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;
			this.say('Randomly generated letter: **' + Tools.sampleOne(Tools.letters.toUpperCase().split("")) + '**');
		},
		aliases: ['rletter'],
	},
	randomcolor: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;
			this.say('Randomly generated color: **' + Dex.data.colors[Tools.sampleOne(Object.keys(Dex.data.colors))] + '**');
		},
		aliases: ['rcolor', 'randcolour', 'rcolour'],
	},
	randomegggroup: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;
			this.say('Randomly generated egg group: **' + Dex.data.eggGroups[Tools.sampleOne(Object.keys(Dex.data.eggGroups))] + '**');
		},
		aliases: ['regggroup', 'regg'],
	},
	randomnature: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;
			this.say('Randomly generated nature: **' + Dex.getExistingNature(Tools.sampleOne(Dex.data.natureKeys)).name + '**');
		},
		aliases: ['rnature'],
	},
	randomcategory: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;
			this.say('Randomly generated category: **the ' + Dex.data.categories[Tools.sampleOne(Object.keys(Dex.data.categories))] +
				' Pokemon**');
		},
		aliases: ['rcategory', 'rcat'],
	},
};

/* eslint-enable */
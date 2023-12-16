import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { CharacterType, ModelGeneration, LocationType, RegionName } from "../types/dex";
import type { IPokemon } from "../types/pokemon-showdown";

const RANDOM_GENERATOR_LIMIT = 6;

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
		syntax: ["[choices]"],
		description: ["randomly picks one of the given choices"],
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
		syntax: ["[choices]"],
		description: ["randomly shuffles the order of the given choices"],
	},
	timer: {
		command(target, room, user) {
			if (!this.isPm(room) && !user.hasRank(room, 'voice')) {
				if (room.userHostedGame && room.userHostedGame.isHost(user)) this.run('gametimer');
				return;
			}

			const targets = target.split(',');
			let timerId = "";
			let timerName = "";
			if (this.isPm(room)) {
				const targetRoom = Rooms.search(targets[0]);
				if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);

				targets.shift();
				timerId = targetRoom.id;
				timerName = targetRoom.title;
			} else {
				timerId = user.id;
				timerName = user.name;
			}

			const id = Tools.toId(targets[0]);
			if (id === 'off' || id === 'end') {
				if (!room.timers || !(timerId in room.timers)) return this.say("You do not have a timer running.");
				clearTimeout(room.timers[timerId]);
				delete room.timers[timerId];
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
			if (timerId in room.timers) clearTimeout(room.timers[timerId]);

			room.timers[timerId] = setTimeout(() => {
				room.say(timerName + ": time is up!");
				delete room.timers![timerId];
			}, time);

			this.say("Your timer has been set for: " + Tools.toDurationString(time) + ".");
		},
		syntax: ["[seconds | minutes | 'off']"],
		pmSyntax: ["[room], [seconds | minutes | 'off']"],
		description: ["sets or clears a timer for the room"],
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
				if (!repeatRoom.repeatedMessages) {
					return this.say("There are no repeating messages for " + repeatRoom.title + ".");
				}

				const messageId = Tools.toId(targets[1]);
				if (!messageId) return this.say("Please specify a valid message name.");
				if (!(messageId in repeatRoom.repeatedMessages)) {
					return this.say("There is no repeating message with the name '" + (targets[1] ? targets[1].trim() : "") + "'.");
				}

				clearInterval(repeatRoom.repeatedMessages[messageId].timer);
				const name = repeatRoom.repeatedMessages[messageId].name;
				delete repeatRoom.repeatedMessages[messageId];
				if (!Object.keys(repeatRoom.repeatedMessages).length) repeatRoom.repeatedMessages = null;
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
			repeatRoom.modnote(user.name + " set a message to repeat every " + duration + " with the text '" +
				message + "'");
		},
		aliases: ['repeatm', 'repeatmessages'],
		syntax: ["['off']", "['add'], [name], [interval in minutes], [message]"],
		description: ["starts or stops a repeated message in the room with the given name, interval, and text"],
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
			const generation: ModelGeneration = isBW ? "bw" : "xy";
			const gifsOrIcons: string[] = [];
			const pokemonList: IPokemon[] = [];

			for (const name of targets) {
				const pokemon = Dex.getPokemon(name);
				if (!pokemon) return this.sayError(['invalidPokemon', name]);
				if (!showIcon && !Dex.hasModelData(pokemon, generation)) {
					return this.say(pokemon.name + " does not have a" + (isBW ? " BW" : "") + " gif.");
				}
				pokemonList.push(pokemon);
				gifsOrIcons.push(showIcon ? Dex.getPSPokemonIcon(pokemon) + pokemon.name : Dex.getPokemonModel(pokemon, generation));
			}

			if (!gifsOrIcons.length) return this.say("You must specify at least 1 Pokemon.");

			const max = showIcon ? 30 : 5;
			if (gifsOrIcons.length > max) return this.say("Please specify between 1 and " + max + " Pokemon.");

			let html = "";
			if (!showIcon) html += "<center>";
			html += gifsOrIcons.join(showIcon ? ", " : "");
			if (!showIcon) html += "</center>";

			html += Client.getUserAttributionHtml(user.name);

			if (gameRoom.userHostedGame) {
				const uhtmlName = gameRoom.userHostedGame.uhtmlBaseName + "-" + gameRoom.userHostedGame.round + "-" +
					(showIcon ? "icon" : "gif");
				gameRoom.userHostedGame.sayPokemonUhtml(pokemonList, showIcon ? 'icon' : 'gif', uhtmlName,
					"<div class='infobox'>" + html + "</div>", user);
			} else {
				gameRoom.sayHtml(html);
			}
		},
		pmOnly: true,
		aliases: ['showgif', 'showbwgifs', 'showbwgif', 'showicons', 'showicon'],
		syntax: ["[room], [Pokemon]"],
		description: ["displays the given Pokemon GIFs in the room"],
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
			const generation: ModelGeneration = isBW ? "bw" : "xy";
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
				if (!showIcon && !Dex.hasModelData(pokemon, generation)) continue;
				if (typing) {
					if (dualType) {
						if (pokemon.types.slice().sort().join("/") !== typing) continue;
					} else {
						if (!pokemon.types.includes(typing)) continue;
					}
				}

				usedPokemon.push(pokemon);
				gifsOrIcons.push(showIcon ? Dex.getPSPokemonIcon(pokemon) + pokemon.name : Dex.getPokemonModel(pokemon, generation));
				if (gifsOrIcons.length === amount) break;
			}

			if (gifsOrIcons.length < amount) return this.say("Not enough Pokemon match the specified options.");

			let html = "";
			if (!showIcon) html += "<center>";
			html += gifsOrIcons.join(showIcon ? ", " : "");
			if (!showIcon) html += "</center>";

			html += Client.getUserAttributionHtml(user.name);

			if (gameRoom.userHostedGame) {
				const uhtmlName = gameRoom.userHostedGame.uhtmlBaseName + "-" + gameRoom.userHostedGame.round + "-" +
					(showIcon ? "icon" : "gif");
				gameRoom.userHostedGame.sayPokemonUhtml(usedPokemon, showIcon ? 'icon' : 'gif', uhtmlName,
					"<div class='infobox'>" + html + "</div>", user);
			} else {
				gameRoom.sayHtml(html);
			}
		},
		pmOnly: true,
		aliases: ['showrandgif', 'showrandomgif', 'showrandombwgifs', 'showrandombwgif', 'showrandgifs', 'showrandbwgifs', 'showrandbwgif',
			'showrandomicons', 'showrandomicon', 'showrandicons', 'showrandicon'],
		syntax: ["[room], [amount]"],
		description: ["displays random GIFs in the room, optionally the given amount"],
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

			html += Client.getUserAttributionHtml(user.name);

			if (gameRoom.userHostedGame) {
				const uhtmlName = gameRoom.userHostedGame.uhtmlBaseName + "-" + gameRoom.userHostedGame.round + "-trainer";
				gameRoom.userHostedGame.sayTrainerUhtml(trainerList, uhtmlName, "<div class='infobox'>" + html + "</div>", user);
			} else {
				gameRoom.sayHtml(html);
			}
		},
		pmOnly: true,
		aliases: ['showtrainer', 'showtrainersprite', 'showtrainers'],
		syntax: ["[room], [trainer(s)"],
		description: ["displays the given trainer sprites in the room"],
	},
	roll: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;
			if (target) {
				const parts = target.toLowerCase().split("d");
				for (const part of parts) {
					if (isNaN(parseInt(part))) {
						return this.say("You must specify a number of dice.");
					}
				}
			}

			this.say('!roll ' + (target || "2"));
		},
		syntax: ["[number of dice]"],
		description: ["uses the server roll command to perform a dice roll"],
	},
	dt: {
		command(target, room, user) {
			if (!target || (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user)))))) return;
			if (!target) return this.say("You must specify an ability, item, move, nature, or Pokemon.");
			this.say('!dt ' + target);
		},
		syntax: ["[ability, item, move, nature, or Pokemon]"],
		description: ["uses the server dt command to display information"],
	},
	randompokemon: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;
			if (target) {
				const parts = target.split(',');
				for (const part of parts) {
					const amount = parseInt(part);
					if (!isNaN(amount) && (amount < 1 || amount > 30)) {
						return this.say("You must specify a number of Pokemon between 1 and 30.");
					}
				}
			} else {
				const species = Dex.getExistingPokemon(Tools.sampleOne(Dex.getData().pokemonKeys)).name;
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
		syntax: ["{option(s)}"],
		description: ["uses the server randpoke command to generate random Pokemon"],
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
		syntax: ["{amount}"],
		description: ["generates a random move(s)"],
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
		syntax: ["{amount}"],
		description: ["generates a random item(s)"],
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
		syntax: ["{amount}"],
		description: ["generates a random ability(ies)"],
	},
	randomtype: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;
			const typeKeys = Dex.getTypeKeys().slice();
			const key = Tools.sampleOne(typeKeys);
			const types: string[] = [Dex.getExistingType(key).name];
			if (Tools.random(2)) {
				typeKeys.splice(typeKeys.indexOf(key), 1);
				types.push(Dex.getExistingType(Tools.sampleOne(typeKeys)).name);
			}
			this.say('Randomly generated type: **' + types.join("/") + '**');
		},
		aliases: ['rtype', 'randtype'],
		description: ["generates a random typing"],
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
		description: ["generates a random typing that matches an existing Pokemon's typing"],
	},
	randombadge: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;

			const badges = Dex.getData().badges;
			const regions = Dex.getRegions();
			let region: RegionName;
			if (target) {
				const id = Tools.toId(target) as RegionName;
				if (!regions.includes(id) || !badges[id].length) {
					return this.say("'" + target + "' is not a valid badge region.");
				}
				region = id;
			} else {
				region = Tools.sampleOne(regions);
				while (!badges[region].length) {
					region = Tools.sampleOne(regions);
				}
			}

			this.say('Randomly generated' + (target ? ' ' + Dex.getRegionNames()[region] : '') + ' badge: ' +
				'**' + Tools.sampleOne(badges[region]).trim() + '**');
		},
		aliases: ['rbadge', 'randbadge'],
		syntax: ["{region}"],
		description: ["generates a random badge, optionally in the given region"],
	},
	randomcharacter: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;

			const targets = target.split(',');
			const regions = Dex.getRegions();
			let region: RegionName;
			if (target) {
				const id = Tools.toId(targets[0]) as RegionName;
				if (!regions.includes(id)) return this.say("'" + targets[0].trim() + "' is not a valid character region.");
				region = id;
			} else {
				region = Tools.sampleOne(regions);
				while (!Dex.regionHasCharacters(region)) {
					region = Tools.sampleOne(regions);
				}
			}

			const characters = Dex.getData().characters;
			const characterTypes = Dex.getCharacterTypes(region);
			const characterTypeNames = Dex.getCharacterTypeNames();
			const regionNames = Dex.getRegionNames();

			let type = Tools.toId(targets[1]) as CharacterType;
			if (type.length) {
				if (!characterTypes.includes(type)) return this.say("'" + targets[1].trim() + "' is not a valid location type.");
				if (!characters[region][type].length) {
					return this.say("There are no " + characterTypeNames[type] + " characters in " + regionNames[region] + ".");
				}
			} else {
				type = Tools.sampleOne(characterTypes);
			}

			this.say('Randomly generated' + (target ? ' ' + regionNames[region] : '') + (targets[1] ? ' ' +
				characterTypeNames[type] : '') + ' character: **' + Tools.sampleOne(characters[region][type]).trim() + '**');
		},
		aliases: ['rchar', 'rcharacter', 'randchar', 'randcharacter'],
		syntax: ["{region}, {type}"],
		description: ["generates a random character, optionally in the given region and character type"],
	},
	randomlocation: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;

			const targets = target.split(',');
			const regions = Dex.getRegions();
			let region: RegionName;
			if (target) {
				const id = Tools.toId(targets[0]) as RegionName;
				if (!regions.includes(id)) return this.say("'" + targets[0].trim() + "' is not a valid location region.");
				region = id;
			} else {
				region = Tools.sampleOne(regions);
				while (!Dex.regionHasLocations(region)) {
					region = Tools.sampleOne(regions);
				}
			}

			const locations = Dex.getData().locations;
			const locationTypes = Dex.getLocationTypes(region);
			const locationTypeNames = Dex.getLocationTypeNames();
			const regionNames = Dex.getRegionNames();

			let type = Tools.toId(targets[1]) as LocationType;
			if (type.length) {
				if (!locationTypes.includes(type)) return this.say("'" + targets[1] + "' is not a valid location type.");
				if (!locations[region][type].length) {
					return this.say("There are no " + locationTypeNames[type] + " locations in " + regionNames[region] + ".");
				}
			} else {
				type = Tools.sampleOne(locationTypes);
			}

			this.say('Randomly generated' + (target ? ' ' + regionNames[region] : '') + (targets[1] ? ' ' +
				locationTypeNames[type] : '') + ' location: **' + Tools.sampleOne(locations[region][type]).trim() + '**');
		},
		aliases: ['rloc', 'rlocation', 'randloc', 'randlocation'],
		syntax: ["{region}, {type}"],
		description: ["generates a random location, optionally in the given region and location type"],
	},
	randomletter: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;
			this.say('Randomly generated letter: **' + Tools.sampleOne(Tools.letters.toUpperCase().split("")) + '**');
		},
		aliases: ['rletter'],
		description: ["generates a random letter"],
	},
	randomcolor: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;

			const colors = Dex.getData().colors;
			this.say('Randomly generated color: **' + colors[Tools.sampleOne(Object.keys(colors))] + '**');
		},
		aliases: ['rcolor', 'randcolour', 'rcolour'],
		description: ["generates a random color"],
	},
	randomegggroup: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;

			const eggGroups = Dex.getData().eggGroups;
			this.say('Randomly generated egg group: **' + eggGroups[Tools.sampleOne(Object.keys(eggGroups))] + '**');
		},
		aliases: ['regg', 'regggroup'],
		description: ["generates a random egg group"],
	},
	randomnature: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;

			this.say('Randomly generated nature: **' + Dex.getExistingNature(Tools.sampleOne(Dex.getData().natureKeys)).name + '**');
		},
		aliases: ['rnature'],
		description: ["generates a random nature"],
	},
	randomcategory: {
		command(target, room, user) {
			if (!this.isPm(room) && (!Users.self.hasRank(room, 'voice') || (!user.hasRank(room, 'voice') &&
				!(room.userHostedGame && room.userHostedGame.isHost(user))))) return;

			const categories = Dex.getData().categories;
			this.say('Randomly generated category: **the ' + categories[Tools.sampleOne(Object.keys(categories))] +
				' Pokemon**');
		},
		aliases: ['rcat', 'rcategory'],
		description: ["generates a random Pokemon category"],
	},
};

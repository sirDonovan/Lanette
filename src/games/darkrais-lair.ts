import type { Player, PlayerTeam } from "../room-activity";
import type { GameCommandDefinitions, IGameFile, GameFileTests } from "../types/games";
import { game as mapGame, MapGame } from "./templates/map";
import type { GameMap, MapFloor, MapFloorSpace } from "./templates/map";
import { addPlayers, assertStrictEqual, assert } from "../test/test-tools";

interface IShadowTrapData {
	name: string;
	damage?: number;
	uses?: number;
}

type ShadowTrap = 'dreamvision' | 'shadowcolumn' | 'shadowpit' | 'shadowspike' | 'shadowsphere' | 'shadowrow';

interface IPlacedShadowTrap {
	player: Player;
	type: ShadowTrap;
}

const shadowTraps: KeyedDict<ShadowTrap, IShadowTrapData> = {
	shadowcolumn: {
		damage: 1,
		name: "Shadow Column",
		uses: 4,
	},
	shadowpit: {
		name: "Shadow Pit",
		uses: 4,
	},
	dreamvision: {
		name: "Dream Vision",
	},
	shadowspike: {
		damage: 2,
		name: "Shadow Spike",
		uses: 4,
	},
	shadowsphere: {
		damage: 1,
		name: "Shadow Sphere",
		uses: 4,
	},
	shadowrow: {
		damage: 1,
		name: "Shadow Row",
		uses: 4,
	},
};

class DarkraisLair extends MapGame {
	currency = 'dreams';
	inPlaceShadowTraps: ShadowTrap[] = ['dreamvision'];
	map: GameMap | null = null;
	maxDimensions: number = 10;
	minDimensions: number = 8;
	maxRound = 20;
	placedShadowTraps: Dict<IPlacedShadowTrap> = {};
	playerUsedShadowTraps = new Map<Player, PartialKeyedDict<ShadowTrap, number>>();
	roundActions = new Map<Player, boolean>();
	roundShadowTraps = new Set<Player>();
	shadowPits: Dict<Player> = {};
	startingLives: number = 3;
	teamCount: number = 2;
	teams: Dict<PlayerTeam> = {};
	trappedPlayers = new Map<Player, string>();

	getMap(player?: Player): GameMap {
		if (!this.map) this.map = this.generateMap(this.playerCount);
		return this.map;
	}

	getFloorIndex(player?: Player): number {
		return this.currentFloor - 1;
	}

	onGenerateMapFloor(floor: MapFloor): void {
		this.setCurrencyCoordinates(floor);
	}

	distributeShadowTrapDamage(shadowTrap: IPlacedShadowTrap, damageCoordinates: string[], damage: number): Player[] {
		const affected: Player[] = [];
		for (const id in this.players) {
			if (this.players[id].eliminated || shadowTrap.player.team === this.players[id].team) continue;
			const player = this.players[id];
			const playerCoordinates = this.playerCoordinates.get(player)!;
			if (!damageCoordinates.includes(this.coordinatesToString(playerCoordinates[0], playerCoordinates[1]))) continue;
			affected.push(player);
			let lives = this.lives.get(player)!;
			lives = Math.max(0, lives - damage);
			this.lives.set(player, lives);
			if (lives > 0) {
				player.say("You were caught in the " + shadowTraps[shadowTrap.type].name + " and lost " + damage + " " +
					(damage === 1 ? "life" : "lives") + "! You have " + lives + " remaining.");
			} else {
				this.eliminatePlayer(player, "You were caught in the " + shadowTraps[shadowTrap.type].name + " and " +
					" lost your last life!");
			}
		}

		return affected;
	}

	onRegularSpace(player: Player, floor: MapFloor, space: MapFloorSpace): void {
		if (space.coordinates in this.shadowPits && player.team === this.shadowPits[space.coordinates].team) {
			const freedPlayer = this.shadowPits[space.coordinates];
			const source = this.trappedPlayers.get(freedPlayer);
			this.trappedPlayers.delete(freedPlayer);
			if (!freedPlayer.eliminated) {
				freedPlayer.say("You were freed from the " + source + " by " + player.name + "!");
				player.say("You arrived at (" + space.coordinates + ") and freed " + freedPlayer.name + "!");
			}

			delete this.shadowPits[space.coordinates];
		}

		if (!(space.coordinates in this.placedShadowTraps)) return;

		const spaceShadowTrap = this.placedShadowTraps[space.coordinates];
		switch (spaceShadowTrap.type) {
		case 'shadowpit':
			if (player.team !== spaceShadowTrap.player.team) {
				player.say("You arrived at (" + space.coordinates + ") and fell into a " + shadowTraps[spaceShadowTrap.type].name + " " +
					"trap! You must wait for a teammate to release you.");
				spaceShadowTrap.player.say(player.name + " fell into your " + shadowTraps[spaceShadowTrap.type].name + " trap!");
				this.shadowPits[space.coordinates] = player;
				this.trappedPlayers.set(player, shadowTraps[spaceShadowTrap.type].name);
				delete this.placedShadowTraps[space.coordinates];
			}
			break;
		case 'shadowsphere':
			if (player.team !== spaceShadowTrap.player.team) {
				player.say("You arrived at (" + space.coordinates + ") and stepped on a " + shadowTraps[spaceShadowTrap.type].name + " " +
					"trap!");
				const sphereCoordinates = this.radiateFromCoordinates(this.stringToCoordinates(space.coordinates), 1);
				const affected = this.distributeShadowTrapDamage(spaceShadowTrap, sphereCoordinates, 1);
				spaceShadowTrap.player.say("Your " + shadowTraps[spaceShadowTrap.type].name + " trap damaged " +
					Tools.joinList(affected.map(x => x.name)) + "!");

				delete this.placedShadowTraps[space.coordinates];
				if (this.getRemainingPlayerCount() < 2) this.end();
			}
			break;
		case 'shadowcolumn':
			if (player.team !== spaceShadowTrap.player.team) {
				player.say("You arrived at (" + space.coordinates + ") and stepped on a " + shadowTraps[spaceShadowTrap.type].name + " " +
					"trap!");
				const spaceCoordinates = this.stringToCoordinates(space.coordinates);
				const x = parseInt(spaceCoordinates[0]);
				const columnCoordinates: string[] = [];
				for (let i = 0; i < this.maxDimensions; i++) {
					columnCoordinates.push(this.coordinatesToString(x, i));
				}
				const affected = this.distributeShadowTrapDamage(spaceShadowTrap, columnCoordinates, 1);
				spaceShadowTrap.player.say("Your " + shadowTraps[spaceShadowTrap.type].name + " trap damaged " +
					Tools.joinList(affected.map(x => x.name)) + "!");

				delete this.placedShadowTraps[space.coordinates];
				if (this.getRemainingPlayerCount() < 2) this.end();
			}
			break;
		case 'shadowrow':
			if (player.team !== spaceShadowTrap.player.team) {
				player.say("You arrived at (" + space.coordinates + ") and stepped on a " + shadowTraps[spaceShadowTrap.type].name + " " +
					"trap!");
				const spaceCoordinates = this.stringToCoordinates(space.coordinates);
				const y = parseInt(spaceCoordinates[1]);
				const rowCoordinates: string[] = [];
				for (let i = 0; i < this.maxDimensions; i++) {
					rowCoordinates.push(this.coordinatesToString(i, y));
				}
				const affected = this.distributeShadowTrapDamage(spaceShadowTrap, rowCoordinates, 1);
				spaceShadowTrap.player.say("Your " + shadowTraps[spaceShadowTrap.type].name + " trap damaged " +
					Tools.joinList(affected.map(x => x.name)) + "!");

				delete this.placedShadowTraps[space.coordinates];
				if (this.getRemainingPlayerCount() < 2) this.end();
			}
			break;
		case 'shadowspike':
			if (player.team !== spaceShadowTrap.player.team) {
				player.say("You arrived at (" + space.coordinates + ") and stepped on a " + shadowTraps[spaceShadowTrap.type].name + " " +
					"trap!");
				spaceShadowTrap.player.say("Your " + shadowTraps[spaceShadowTrap.type].name + " trap damaged " + player.name + "!");
				let lives = this.lives.get(player)!;
				lives = Math.max(0, lives - 2);
				this.lives.set(player, lives);
				if (lives > 0) {
					player.say("You lost 2 lives! You have " + lives + " remaining.");
				} else {
					this.eliminatePlayer(player, "You lost your last life!");
				}

				delete this.placedShadowTraps[space.coordinates];
			}
			break;
		}
	}

	onAddPlayer(player: Player): boolean {
		this.lives.set(player, this.startingLives);
		this.playerUsedShadowTraps.set(player, {});
		return true;
	}

	onStart(): void {
		this.teams = this.generateTeams(this.teamCount);
		this.say("Now sending coordinates in PMs!");
		this.map = this.generateMap(this.playerCount);
		this.positionPlayers();
		this.nextRound();
	}

	onNextRound(): void {
		let emptyTeams = 0;
		for (const team in this.teams) {
			if (!this.getRemainingPlayerCount(this.teams[team].players)) {
				emptyTeams++;
			}
		}

		if (emptyTeams >= this.teamCount - 1) {
			this.say("Only one team remains!");
			for (const team in this.teams) {
				if (this.getRemainingPlayerCount(this.teams[team].players)) {
					for (const player of this.teams[team].players) {
						this.winners.set(player, 1);
					}
					break;
				}
			}

			this.timeout = setTimeout(() => this.end(), 5000);
			return;
		}

		this.roundActions.clear();
		this.roundShadowTraps.clear();

		const html = this.getRoundHtml(this.getTeamLives);
		const uhtmlName = this.uhtmlBaseName + '-round';
		this.onUhtml(uhtmlName, html, () => {
			if (!this.canMove) this.canMove = true;
			this.timeout = setTimeout(() => this.nextRound(), 30 * 1000);
		});
		this.sayUhtml(uhtmlName, html);
	}

	getTeamLives(): string {
		const output: string[] = [];
		for (const team in this.teams) {
			const teamLives: string[] = [];
			for (const player of this.teams[team].players) {
				if (player.eliminated) continue;
				teamLives.push(player.name + " (" + this.lives.get(player) + ")");
			}
			output.push("<b>" + this.teams[team].name + "</b>: " + teamLives.join(', '));
		}
		return output.join(" | ");
	}

	onMaxRound(): void {
		this.say("Darkrai casts Dark Void on the lair!");
		this.canMove = false;
	}

	onEnd() {
		if (!this.getRemainingPlayerCount()) {
			this.say("All players were eliminated!");
		} else {
			let remainingTeam: PlayerTeam | false | undefined;
			for (const team in this.teams) {
				if (this.getRemainingPlayerCount(this.teams[team].players)) {
					if (remainingTeam === undefined) {
						remainingTeam = this.teams[team];
					} else {
						remainingTeam = false;
					}
				}
			}
			if (remainingTeam) {
				this.say("**Team " + remainingTeam.name + "** wins the game!");
				for (const player of remainingTeam.players) {
					this.winners.set(player, 1);
					let earnings = this.points.get(player) || 0;
					earnings = Math.floor(earnings / 4);
					if (earnings < 250) {
						earnings = 250;
					}
					this.addBits(player, earnings);
				}
			} else {
				this.say("All players fall into nightmares!");
				for (const id in this.players) {
					if (this.players[id].eliminated) continue;
					const player = this.players[id];
					let earnings = this.points.get(player) || 0;
					earnings = Math.floor(earnings / 2);
					if (earnings < 250) {
						earnings = 250;
					}
					this.addBits(player, earnings);
				}
			}
		}
	}

	layShadowTrap(player: Player, shadowTrap: ShadowTrap): boolean {
		if (this.roundShadowTraps.has(player)) return false;
		const data = shadowTraps[shadowTrap];
		const usedShadowTraps = this.playerUsedShadowTraps.get(player)!;
		let limitedUses = false;
		let remainingShadowTraps: number | undefined;
		if (data.uses) {
			limitedUses = true;
			remainingShadowTraps = (data.uses - 1);
			if (shadowTrap in usedShadowTraps) {
				if (usedShadowTraps[shadowTrap]! >= data.uses) {
					player.say("You have already used " + data.name + " " + data.uses + " times! Please choose another shadow trap to " +
						"lay.");
					return false;
				}
				remainingShadowTraps -= usedShadowTraps[shadowTrap]!;
			}
		}

		if (this.trappedPlayers.has(player) && !this.inPlaceShadowTraps.includes(shadowTrap)) {
			player.say("You are trapped and can only use " +
				Tools.joinList(this.inPlaceShadowTraps.map(x => shadowTraps[x].name), undefined, undefined, "or") + "!");
			return false;
		}

		const playerCoordinates = this.playerCoordinates.get(player)!;
		if (shadowTrap === 'dreamvision') {
			let closestDistance = Infinity;
			let closestPlayer: Player;
			let closestPlayerCoordinates: number[];
			for (const id in this.players) {
				if (this.players[id].eliminated || this.players[id] === player) continue;
				const otherPlayer = this.players[id];
				const otherPlayerCoordinates = this.playerCoordinates.get(otherPlayer)!;
				const distance = Math.abs(otherPlayerCoordinates[0] - playerCoordinates[0]) +
					Math.abs(otherPlayerCoordinates[1] - playerCoordinates[1]);
				if (distance < closestDistance) {
					closestPlayer = otherPlayer;
					closestPlayerCoordinates = otherPlayerCoordinates;
					closestDistance = distance;
				}
			}
			player.say("The closest player to you is " + closestPlayer!.name + " at (" + closestPlayerCoordinates!.join(", ") + ")!");
		} else {
			const coordinateString = this.coordinatesToString(playerCoordinates[0], playerCoordinates[1]);
			if (coordinateString in this.placedShadowTraps) {
				player.say("There is already a shadow trap placed at (" + playerCoordinates[0] + ", " + playerCoordinates[1] + ")!");
				return false;
			}
			if (coordinateString in this.shadowPits) {
				player.say("Your team already has an opposing player in a " + shadowTraps[shadowTrap].name + " trap at (" +
					playerCoordinates[0] + ", " + playerCoordinates[1] + ")!");
				return false;
			}

			this.placedShadowTraps[coordinateString] = {player, type: shadowTrap};
			let text = "You placed a " + shadowTraps[shadowTrap].name + " trap at (" + playerCoordinates[0] + ", " + playerCoordinates[1] +
				")!";
			if (limitedUses) {
				text += " You have " + (remainingShadowTraps === 0 ? "no" : remainingShadowTraps) + " use" +
					(remainingShadowTraps === 1 ? "" : "s") + " remaining.";
			}
			player.say(text);
		}

		if (!(shadowTrap in usedShadowTraps)) usedShadowTraps[shadowTrap] = 0;
		usedShadowTraps[shadowTrap]!++;
		this.roundShadowTraps.add(player);
		return true;
	}
}

const commands: GameCommandDefinitions<DarkraisLair> = {
	shadowcolumn: {
		command(target, room, user) {
			return this.layShadowTrap(this.players[user.id], "shadowcolumn");
		},
		aliases: ["scolumn"],
	},
	shadowspike: {
		command(target, room, user) {
			return this.layShadowTrap(this.players[user.id], "shadowspike");
		},
		aliases: ["sspike"],
	},
	shadowsphere: {
		command(target, room, user) {
			return this.layShadowTrap(this.players[user.id], "shadowsphere");
		},
		aliases: ["ssphere"],
	},
	shadowrow: {
		command(target, room, user) {
			return this.layShadowTrap(this.players[user.id], "shadowrow");
		},
		aliases: ["srow"],
	},
	shadowpit: {
		command(target, room, user) {
			return this.layShadowTrap(this.players[user.id], "shadowpit");
		},
		aliases: ["spit"],
	},
	dreamvision: {
		command(target, room, user) {
			return this.layShadowTrap(this.players[user.id], "dreamvision");
		},
		aliases: ["dvision"],
	},
};

const tests: GameFileTests<DarkraisLair> = {
	'should not allow movement outside of the map': {
		test(game, format) {
			const players = addPlayers(game, 4);
			game.start();
			game.nextRound();
			game.canMove = true;
			const coordinates = [0, 0];
			game.playerCoordinates.set(players[0], coordinates);
			players[0].useCommand('down');
			assertStrictEqual(game.playerCoordinates.get(players[0]), coordinates);
		},
	},
	'should allow one movement per round': {
		test(game, format) {
			const players = addPlayers(game, 4);
			game.start();
			game.nextRound();
			game.canMove = true;
			game.playerCoordinates.set(players[0], [0, 0]);
			players[0].useCommand('up');
			players[0].useCommand('up');
			assertStrictEqual(game.playerCoordinates.get(players[0])![1], 1);
		},
	},
	'should properly handle Shadow Spike': {
		test(game, format) {
			const players = addPlayers(game, 4);
			game.start();
			game.nextRound();

			const map = game.getMap(players[0]);
			const floorIndex = game.getFloorIndex(players[0]);
			const floor = map.floors[floorIndex];
			const coordinates = [0, 0];
			const space = floor.spaces[game.coordinatesToString(coordinates[0], coordinates[1])];
			delete space.attributes.currency;

			game.canMove = true;
			game.playerCoordinates.set(players[0], coordinates);
			players[0].useCommand("shadowspike");
			const coordinatesString = game.coordinatesToString(coordinates[0], coordinates[1]);
			assert(coordinatesString in game.placedShadowTraps);
			assertStrictEqual(game.placedShadowTraps[coordinatesString].player, players[0]);
			assertStrictEqual(game.placedShadowTraps[coordinatesString].type, "shadowspike");
			assertStrictEqual(game.playerUsedShadowTraps.get(players[0])!.shadowspike, 1);
			let opposingTeam: PlayerTeam;
			for (const i in game.teams) {
				if (game.teams[i] !== players[0].team) {
					opposingTeam = game.teams[i];
					break;
				}
			}
			game.playerCoordinates.set(opposingTeam!.players[0], [0, 1]);
			opposingTeam!.players[0].useCommand("down");
			assertStrictEqual(game.lives.get(opposingTeam!.players[0]), Math.max(0, game.startingLives - shadowTraps.shadowspike.damage!));
			assert(!(coordinatesString in game.placedShadowTraps));
		},
	},
	'should properly handle Shadow Row': {
		test(game, format) {
			const players = addPlayers(game, 4);
			game.start();
			game.nextRound();

			const map = game.getMap(players[0]);
			const floorIndex = game.getFloorIndex(players[0]);
			const floor = map.floors[floorIndex];
			const coordinates = [0, 0];
			const space = floor.spaces[game.coordinatesToString(coordinates[0], coordinates[1])];
			delete space.attributes.currency;

			game.canMove = true;
			game.playerCoordinates.set(players[0], coordinates);
			players[0].useCommand("shadowrow");
			const coordinatesString = game.coordinatesToString(coordinates[0], coordinates[1]);
			assert(coordinatesString in game.placedShadowTraps);
			assertStrictEqual(game.placedShadowTraps[coordinatesString].player, players[0]);
			assertStrictEqual(game.placedShadowTraps[coordinatesString].type, "shadowrow");
			assertStrictEqual(game.playerUsedShadowTraps.get(players[0])!.shadowrow, 1);
			let opposingTeam: PlayerTeam;
			for (const i in game.teams) {
				if (game.teams[i] !== players[0].team) {
					opposingTeam = game.teams[i];
					break;
				}
			}
			game.playerCoordinates.set(opposingTeam!.players[0], [0, 1]);
			game.playerCoordinates.set(opposingTeam!.players[1], [4, 0]);
			opposingTeam!.players[0].useCommand("down");
			for (const player of opposingTeam!.players) {
				assertStrictEqual(game.lives.get(player), Math.max(0, game.startingLives - shadowTraps.shadowrow.damage!));
			}
			assert(!(coordinatesString in game.placedShadowTraps));
		},
	},
	'should properly handle Shadow Column': {
		test(game, format) {
			const players = addPlayers(game, 4);
			game.start();
			game.nextRound();

			const map = game.getMap(players[0]);
			const floorIndex = game.getFloorIndex(players[0]);
			const floor = map.floors[floorIndex];
			const coordinates = [0, 0];
			const space = floor.spaces[game.coordinatesToString(coordinates[0], coordinates[1])];
			delete space.attributes.currency;

			game.canMove = true;
			game.playerCoordinates.set(players[0], coordinates);
			players[0].useCommand("shadowcolumn");
			const coordinatesString = game.coordinatesToString(coordinates[0], coordinates[1]);
			assert(coordinatesString in game.placedShadowTraps);
			assertStrictEqual(game.placedShadowTraps[coordinatesString].player, players[0]);
			assertStrictEqual(game.placedShadowTraps[coordinatesString].type, "shadowcolumn");
			assertStrictEqual(game.playerUsedShadowTraps.get(players[0])!.shadowcolumn, 1);
			let opposingTeam: PlayerTeam;
			for (const i in game.teams) {
				if (game.teams[i] !== players[0].team) {
					opposingTeam = game.teams[i];
					break;
				}
			}
			game.playerCoordinates.set(opposingTeam!.players[0], [1, 0]);
			game.playerCoordinates.set(opposingTeam!.players[1], [0, 4]);
			opposingTeam!.players[0].useCommand("left");
			for (const player of opposingTeam!.players) {
				assertStrictEqual(game.lives.get(player), Math.max(0, game.startingLives - shadowTraps.shadowcolumn.damage!));
			}
			assert(!(coordinatesString in game.placedShadowTraps));
		},
	},
	'should properly handle Shadow Sphere': {
		test(game, format) {
			const players = addPlayers(game, 4);
			game.start();
			game.nextRound();

			const map = game.getMap(players[0]);
			const floorIndex = game.getFloorIndex(players[0]);
			const floor = map.floors[floorIndex];
			const coordinates = [2, 2];
			const space = floor.spaces[game.coordinatesToString(coordinates[0], coordinates[1])];
			delete space.attributes.currency;

			game.canMove = true;
			game.playerCoordinates.set(players[0], coordinates);
			players[0].useCommand("shadowsphere");
			const coordinatesString = game.coordinatesToString(coordinates[0], coordinates[1]);
			assert(coordinatesString in game.placedShadowTraps);
			assertStrictEqual(game.placedShadowTraps[coordinatesString].player, players[0]);
			assertStrictEqual(game.placedShadowTraps[coordinatesString].type, "shadowsphere");
			assertStrictEqual(game.playerUsedShadowTraps.get(players[0])!.shadowsphere, 1);
			let opposingTeam: PlayerTeam;
			for (const i in game.teams) {
				if (game.teams[i] !== players[0].team) {
					opposingTeam = game.teams[i];
					break;
				}
			}
			game.playerCoordinates.set(opposingTeam!.players[0], [3, 2]);
			game.playerCoordinates.set(opposingTeam!.players[1], [3, 1]);
			opposingTeam!.players[0].useCommand("left");
			for (const player of opposingTeam!.players) {
				assertStrictEqual(game.lives.get(player), Math.max(0, game.startingLives - shadowTraps.shadowsphere.damage!));
			}
			assert(!(coordinatesString in game.placedShadowTraps));
		},
	},
	'should properly handle Shadow Pit': {
		test(game, format) {
			const players = addPlayers(game, 4);
			game.start();
			game.nextRound();

			const map = game.getMap(players[0]);
			const floorIndex = game.getFloorIndex(players[0]);
			const floor = map.floors[floorIndex];
			const coordinates = [0, 0];
			const space = floor.spaces[game.coordinatesToString(coordinates[0], coordinates[1])];
			delete space.attributes.currency;

			game.canMove = true;
			game.playerCoordinates.set(players[0], coordinates);
			players[0].useCommand("shadowpit");
			const coordinatesString = game.coordinatesToString(coordinates[0], coordinates[1]);
			assert(coordinatesString in game.placedShadowTraps);
			assertStrictEqual(game.placedShadowTraps[coordinatesString].player, players[0]);
			assertStrictEqual(game.placedShadowTraps[coordinatesString].type, "shadowpit");
			assertStrictEqual(game.playerUsedShadowTraps.get(players[0])!.shadowpit, 1);
			let opposingTeam: PlayerTeam;
			for (const i in game.teams) {
				if (game.teams[i] !== players[0].team) {
					opposingTeam = game.teams[i];
					break;
				}
			}
			game.playerCoordinates.set(opposingTeam!.players[0], [1, 0]);
			game.playerCoordinates.set(opposingTeam!.players[1], [2, 0]);
			opposingTeam!.players[0].useCommand("left");
			assert(game.trappedPlayers.get(opposingTeam!.players[0]), shadowTraps.shadowpit.name);
			assert(!(coordinatesString in game.placedShadowTraps));
			assert(coordinatesString in game.shadowPits);

			opposingTeam!.players[0].useCommand("shadowrow");
			assert(!game.playerUsedShadowTraps.get(opposingTeam!.players[0])!.shadowrow);
			opposingTeam!.players[1].useCommand("left", "2");
			assert(!game.trappedPlayers.has(opposingTeam!.players[0]));
			assert(!(coordinatesString in game.shadowPits));
		},
	},
};

export const game: IGameFile<DarkraisLair> = Games.copyTemplateProperties(mapGame, {
	aliases: ["darkrais", "dlair"],
	class: DarkraisLair,
	commands: Object.assign(mapGame.commands, commands),
	commandDescriptions: mapGame.commandDescriptions!.concat([Config.commandCharacter + "scolumn", Config.commandCharacter + "srow",
		Config.commandCharacter + "ssphere", Config.commandCharacter + "spit", Config.commandCharacter + "sspike",
		Config.commandCharacter + "dvision"]),
	description: "Players must lay shadow traps for the opposing team to trigger and avoid Darkrai's nightmares each round!",
	additionalDescription: '<details><summary>Usable shadow traps:</summary>' +
		"<code>" + Config.commandCharacter + "scolumn</code> (<b>Shadow Column</b>) - damages all opposing players in the column<br />" +
		"<code>" + Config.commandCharacter + "srow</code> (<b>Shadow Row</b>) - damages all opposing players in the row<br />" +
		"<code>" + Config.commandCharacter + "ssphere</code> (<b>Shadow Sphere</b>) - damages all opposing players in a 1 space radius" +
		"<br />" +
		"<code>" + Config.commandCharacter + "spit</code> (<b>Shadow Pit</b>) - traps a player until one of their teammates helps them " +
		"out <br />" +
		"<code>" + Config.commandCharacter + "sspike</code> (<b>Shadow Spike</b>) - deals double damage to a single opposing player" +
		"<br />" +
		"<code>" + Config.commandCharacter + "dvision</code> (<b>Dream Vision</b>) - shows you the player you are currently closest to" +
		"</details>",
	name: "Darkrai's Lair",
	mascot: "Darkrai",
	scriptedOnly: true,
	noOneVsOne: true,
	tests,
});

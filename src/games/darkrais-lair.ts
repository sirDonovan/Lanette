import type { Player, PlayerTeam } from "../room-activity";
import { addPlayers, assert, assertStrictEqual } from "../test/test-tools";
import type { GameCommandDefinitions, GameFileTests, IGameFile } from "../types/games";
import type { GameMap, ISpaceDisplayData, MapFloor, MapFloorSpace } from "./templates/map";
import { game as mapGame, MapGame } from "./templates/map";

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

type MapKeys = 'teamtrap';

const mapKeys: KeyedDict<MapKeys, string> = {
	teamtrap: 'T',
};

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
	additionalMapSymbols: Dict<string> = {
		[mapKeys.teamtrap]: "a trap that your team has placed",
	};
	currency = 'dreams';
	inPlaceShadowTraps: ShadowTrap[] = ['dreamvision'];
	maxDimensions: number = 10;
	minDimensions: number = 8;
	maxRound = 20;
	minPlayers = 4;
	placedShadowTraps: Dict<IPlacedShadowTrap> = {};
	playerUsedShadowTraps = new Map<Player, PartialKeyedDict<ShadowTrap, number>>();
	roundActions = new Map<Player, boolean>();
	roundShadowTraps = new Set<Player>();
	shadowPits: Dict<Player> = {};
	sharedMap: boolean = true;
	startingLives: number = 3;
	teamCount: number = 2;
	teams: Dict<PlayerTeam> = {};
	trappedPlayers = new Map<Player, string>();

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
			const lives = this.addLives(player, -damage);
			if (lives) {
				this.playerRoundInfo.get(player)!.push("You were caught in the " + shadowTraps[shadowTrap.type].name + " and lost " +
					damage + " " + (damage === 1 ? "life" : "lives") + "! You have " + lives + " remaining.");
			} else {
				this.playerRoundInfo.get(player)!.push("You were caught in the " + shadowTraps[shadowTrap.type].name + " and lost " +
					"your last life.");
				this.eliminatePlayer(player, "You were caught in the " + shadowTraps[shadowTrap.type].name + " and " +
					" lost your last life!");
			}
			this.sendPlayerControls(player);
		}

		return affected;
	}

	onRegularSpace(player: Player, floor: MapFloor, space: MapFloorSpace): void {
		if (space.coordinates in this.shadowPits && player.team === this.shadowPits[space.coordinates].team) {
			const freedPlayer = this.shadowPits[space.coordinates];
			const source = this.trappedPlayers.get(freedPlayer);
			this.trappedPlayers.delete(freedPlayer);
			if (!freedPlayer.eliminated) {
				this.playerRoundInfo.get(freedPlayer)!.push("You were freed from the " + source + " by " + player.name + "!");
				this.playerRoundInfo.get(player)!.push("You arrived at (" + space.coordinates + ") and freed " + freedPlayer.name +
					"!");
			}

			delete this.shadowPits[space.coordinates];
		}

		if (!(space.coordinates in this.placedShadowTraps)) {
			this.playerRoundInfo.get(player)!.push("You travelled safely to (" + space.coordinates + ").");
			return;
		}

		const spaceShadowTrap = this.placedShadowTraps[space.coordinates];
		switch (spaceShadowTrap.type) {
		case 'shadowpit':
			if (player.team !== spaceShadowTrap.player.team) {
				this.playerRoundInfo.get(player)!.push("You arrived at (" + space.coordinates + ") and fell into a " +
					shadowTraps[spaceShadowTrap.type].name + " trap! You must wait for a teammate to release you.");
				this.playerRoundInfo.get(spaceShadowTrap.player)!.push(player.name + " fell into your " +
					shadowTraps[spaceShadowTrap.type].name + " trap!");
				this.shadowPits[space.coordinates] = player;
				this.trappedPlayers.set(player, shadowTraps[spaceShadowTrap.type].name);
				delete this.placedShadowTraps[space.coordinates];
			}
			break;
		case 'shadowsphere':
			if (player.team !== spaceShadowTrap.player.team) {
				this.playerRoundInfo.get(player)!.push("You arrived at (" + space.coordinates + ") and stepped on a " +
					shadowTraps[spaceShadowTrap.type].name + " trap!");
				const sphereCoordinates = this.radiateFromCoordinates(this.stringToCoordinates(space.coordinates), 1);
				const affected = this.distributeShadowTrapDamage(spaceShadowTrap, sphereCoordinates, 1);
				this.playerRoundInfo.get(spaceShadowTrap.player)!.push("Your " + shadowTraps[spaceShadowTrap.type].name + " trap " +
					"damaged " + Tools.joinList(affected.map(x => x.name)) + "!");

				delete this.placedShadowTraps[space.coordinates];
				if (this.getRemainingPlayerCount() < 2) return this.end();
			}
			break;
		case 'shadowcolumn':
			if (player.team !== spaceShadowTrap.player.team) {
				this.playerRoundInfo.get(player)!.push("You arrived at (" + space.coordinates + ") and stepped on a " +
					shadowTraps[spaceShadowTrap.type].name + " trap!");
				const spaceCoordinates = this.stringToCoordinates(space.coordinates);
				const xCoordinate = parseInt(spaceCoordinates[0]);
				const columnCoordinates: string[] = [];
				for (let i = 0; i < this.maxDimensions; i++) {
					columnCoordinates.push(this.coordinatesToString(xCoordinate, i));
				}
				const affected = this.distributeShadowTrapDamage(spaceShadowTrap, columnCoordinates, 1);
				this.playerRoundInfo.get(spaceShadowTrap.player)!.push("Your " + shadowTraps[spaceShadowTrap.type].name + " trap " +
					"damaged " + Tools.joinList(affected.map(x => x.name)) + "!");

				delete this.placedShadowTraps[space.coordinates];
				if (this.getRemainingPlayerCount() < 2) return this.end();
			}
			break;
		case 'shadowrow':
			if (player.team !== spaceShadowTrap.player.team) {
				this.playerRoundInfo.get(player)!.push("You arrived at (" + space.coordinates + ") and stepped on a " +
					shadowTraps[spaceShadowTrap.type].name + " trap!");
				const spaceCoordinates = this.stringToCoordinates(space.coordinates);
				const y = parseInt(spaceCoordinates[1]);
				const rowCoordinates: string[] = [];
				for (let i = 0; i < this.maxDimensions; i++) {
					rowCoordinates.push(this.coordinatesToString(i, y));
				}
				const affected = this.distributeShadowTrapDamage(spaceShadowTrap, rowCoordinates, 1);
				this.playerRoundInfo.get(spaceShadowTrap.player)!.push("Your " + shadowTraps[spaceShadowTrap.type].name + " trap " +
					"damaged " + Tools.joinList(affected.map(x => x.name)) + "!");

				delete this.placedShadowTraps[space.coordinates];
				if (this.getRemainingPlayerCount() < 2) return this.end();
			}
			break;
		case 'shadowspike':
			if (player.team !== spaceShadowTrap.player.team) {
				this.playerRoundInfo.get(player)!.push("You arrived at (" + space.coordinates + ") and stepped on a " +
					shadowTraps[spaceShadowTrap.type].name + " trap!");
				this.playerRoundInfo.get(spaceShadowTrap.player)!.push("Your " + shadowTraps[spaceShadowTrap.type].name + " trap " +
					"damaged " + player.name + "!");
				const lives = this.addLives(player, -shadowTraps[spaceShadowTrap.type].damage!);
				if (lives) {
					this.playerRoundInfo.get(player)!.push("You lost " + shadowTraps[spaceShadowTrap.type].damage + " lives! You have " +
						lives + " remaining.");
				} else {
					this.eliminatePlayer(player, "You lost your last life!");
				}

				delete this.placedShadowTraps[space.coordinates];
			}
			break;
		}
	}

	getSpaceDisplay(player: Player, floor: MapFloor, space: MapFloorSpace): ISpaceDisplayData | undefined {
		if (!(space.coordinates in floor.traversedCoordinates) || !floor.traversedCoordinates[space.coordinates].has(player)) return;
		if (space.coordinates in this.placedShadowTraps &&
			player.team!.players.includes(this.placedShadowTraps[space.coordinates].player)) {
			return {
				symbol: mapKeys.teamtrap,
				title: shadowTraps[this.placedShadowTraps[space.coordinates].type].name,
			};
		}
	}

	onAddPlayer(player: Player): boolean {
		this.lives.set(player, this.startingLives);
		this.playerUsedShadowTraps.set(player, {});
		return true;
	}

	async onStart(): Promise<void> {
		this.teams = this.generateTeams(this.teamCount);
		this.positionPlayers();
		await this.nextRound();
	}

	getPlayerControlsHtml(map: GameMap, floor: MapFloor, player: Player): string {
		let html = this.getPlayerMovementControlsHtml(map, floor, player);
		if (player.eliminated) return html;

		html += "<br /><b>Shadow traps</b>:<br />";

		const playerCoordinates = this.playerCoordinates.get(player)!;
		const coordinateString = this.coordinatesToString(playerCoordinates[0], playerCoordinates[1]);
		const usedShadowTraps = this.playerUsedShadowTraps.get(player)!;
		const keys = Object.keys(shadowTraps) as ShadowTrap[];
		const inShadowTrap = this.roundShadowTraps.has(player);

		for (const key of keys) {
			let remainingUses: number | undefined;
			if (shadowTraps[key].uses) {
				remainingUses = shadowTraps[key].uses;
				if (key in usedShadowTraps) {
					remainingUses -= usedShadowTraps[key]!;
				}
			}

			const cannotLayTrap = inShadowTrap || remainingUses === 0 || coordinateString in this.shadowPits ||
				(key !== 'dreamvision' && coordinateString in this.placedShadowTraps) ||
				(this.trappedPlayers.has(player) && !this.inPlaceShadowTraps.includes(key));

			html += Client.getPmSelfButton(Config.commandCharacter + key, shadowTraps[key].name +
				(remainingUses ? " x" + remainingUses : ""), cannotLayTrap) + "&nbsp;";
		}
		return html;
	}

	async onNextRound(): Promise<void> { // eslint-disable-line @typescript-eslint/require-await
		if (this.round > 1) {
			for (const id in this.players) {
				if (this.players[id].eliminated) continue;
				const player = this.players[id];
				if (!this.roundActions.has(player)) {
					const lives = this.addLives(player, -1);
					if (lives === 0) {
						this.playerRoundInfo.get(player)!.push("You did not move in the previous round and lost your last life.");
						this.eliminatePlayer(player, "You did not move in the previous round and lost your last life!");
					} else {
						this.playerRoundInfo.get(player)!.push("You did not move in the previous round and lost 1 life! You have " +
							lives + " remaining.");
					}
					this.sendPlayerControls(player);
				}
			}
		}

		let emptyTeams = 0;
		const shadowPitPlayers: Player[] = [];
		for (const team in this.teams) {
			const remainingTeamPlayers = this.getRemainingPlayers(this.teams[team].players);
			let allInShadowPit = true;
			for (const i in remainingTeamPlayers) {
				const player = remainingTeamPlayers[i];
				const playerCoordinates = this.playerCoordinates.get(player)!;
				const coordinateString = this.coordinatesToString(playerCoordinates[0], playerCoordinates[1]);
				if (coordinateString in this.shadowPits) {
					player.eliminated = true;
					shadowPitPlayers.push(player);
					continue;
				}

				allInShadowPit = false;
				break;
			}

			if (allInShadowPit || !this.getRemainingPlayerCount(remainingTeamPlayers)) {
				emptyTeams++;
			}
		}

		if (emptyTeams >= this.teamCount - 1) {
			this.say("Only one team remains!");
			this.setTimeout(() => this.end(), 5000);
			return;
		}

		for (const player of shadowPitPlayers) {
			player.eliminated = false;
		}

		this.roundActions.clear();
		this.roundShadowTraps.clear();

		const html = this.getRoundHtml(() => this.getTeamLives());
		const uhtmlName = this.uhtmlBaseName + '-round';
		this.onUhtml(uhtmlName, html, () => {
			if (this.round === 1) this.displayMapLegend();
			if (!this.canMove) this.canMove = true;
			this.updateRoundHtml();
			this.setTimeout(() => void this.nextRound(), 30 * 1000);
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

	onEnd(): void {
		if (!this.getRemainingPlayerCount()) {
			this.say("All players were eliminated!");
		} else {
			const winningTeam = this.getFinalTeam();
			if (winningTeam) {
				this.say("**Team " + winningTeam.name + "** wins the game!");
				for (const player of winningTeam.players) {
					if (player.eliminated) continue;

					this.winners.set(player, 1);
					let earnings = this.points.get(player) || 0;
					earnings = Math.floor(earnings / 4);
					if (earnings < 250) {
						earnings = 250;
					}
					this.addBits(player, earnings);
				}
			} else {
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

		this.announceWinners();
	}

	destroyPlayers(): void {
		super.destroyPlayers();

		this.playerUsedShadowTraps.clear();
		this.roundActions.clear();
		this.trappedPlayers.clear();
		this.roundShadowTraps.clear();
	}

	layShadowTrap(player: Player, shadowTrap: ShadowTrap): boolean {
		if (this.roundShadowTraps.has(player)) return false;
		const data = shadowTraps[shadowTrap];
		const usedShadowTraps = this.playerUsedShadowTraps.get(player)!;
		let limitedUses = false;
		let remainingShadowTraps: number | undefined;
		if (data.uses) {
			limitedUses = true;
			remainingShadowTraps = data.uses - 1;
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
			let closestDistance: number | undefined;
			let closestPlayer: Player;
			let closestPlayerCoordinates: number[];
			for (const id in this.players) {
				if (this.players[id].eliminated || this.players[id] === player) continue;
				const otherPlayer = this.players[id];
				const otherPlayerCoordinates = this.playerCoordinates.get(otherPlayer)!;
				const distance = Math.abs(otherPlayerCoordinates[0] - playerCoordinates[0]) +
					Math.abs(otherPlayerCoordinates[1] - playerCoordinates[1]);
				if (closestDistance === undefined || distance < closestDistance) {
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
			this.playerRoundInfo.get(player)!.push(text);
		}

		if (!(shadowTrap in usedShadowTraps)) usedShadowTraps[shadowTrap] = 0;
		usedShadowTraps[shadowTrap]!++;
		this.roundShadowTraps.add(player);
		this.sendPlayerControls(player);

		return true;
	}
}

const commands: GameCommandDefinitions<DarkraisLair> = {
	shadowcolumn: {
		command(target, room, user) {
			return this.layShadowTrap(this.players[user.id], "shadowcolumn");
		},
		aliases: ["scolumn"],
		pmGameCommand: true,
	},
	shadowspike: {
		command(target, room, user) {
			return this.layShadowTrap(this.players[user.id], "shadowspike");
		},
		aliases: ["sspike"],
		pmGameCommand: true,
	},
	shadowsphere: {
		command(target, room, user) {
			return this.layShadowTrap(this.players[user.id], "shadowsphere");
		},
		aliases: ["ssphere"],
		pmGameCommand: true,
	},
	shadowrow: {
		command(target, room, user) {
			return this.layShadowTrap(this.players[user.id], "shadowrow");
		},
		aliases: ["srow"],
		pmGameCommand: true,
	},
	shadowpit: {
		command(target, room, user) {
			return this.layShadowTrap(this.players[user.id], "shadowpit");
		},
		aliases: ["spit"],
		pmGameCommand: true,
	},
	dreamvision: {
		command(target, room, user) {
			return this.layShadowTrap(this.players[user.id], "dreamvision");
		},
		aliases: ["dvision"],
		pmGameCommand: true,
	},
};

const tests: GameFileTests<DarkraisLair> = {
	'should not allow movement outside of the map': {
		config: {
			async: true,
		},
		async test(game): Promise<void> {
			const players = await addPlayers(game, 4);
			await game.start();
			game.canMove = true;
			const coordinates = [0, 0];
			game.playerCoordinates.set(players[0], coordinates);
			players[0].useCommand('down');
			assertStrictEqual(game.playerCoordinates.get(players[0]), coordinates);
		},
	},
	'should allow one movement per round': {
		config: {
			async: true,
		},
		async test(game): Promise<void> {
			const players = await addPlayers(game, 4);
			await game.start();
			game.canMove = true;
			game.playerCoordinates.set(players[0], [0, 0]);
			players[0].useCommand('up');
			players[0].useCommand('up');
			assertStrictEqual(game.playerCoordinates.get(players[0])![1], 1);
		},
	},
	'should properly handle Shadow Spike': {
		config: {
			async: true,
		},
		async test(game): Promise<void> {
			const players = await addPlayers(game, 4);
			await game.start();

			const map = game.getMap();
			const floorIndex = game.getFloorIndex();
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
		config: {
			async: true,
		},
		async test(game): Promise<void> {
			const players = await addPlayers(game, 4);
			await game.start();

			const map = game.getMap();
			const floorIndex = game.getFloorIndex();
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
		config: {
			async: true,
		},
		async test(game): Promise<void> {
			const players = await addPlayers(game, 4);
			await game.start();

			const map = game.getMap();
			const floorIndex = game.getFloorIndex();
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
		config: {
			async: true,
		},
		async test(game): Promise<void> {
			const players = await addPlayers(game, 4);
			await game.start();

			const map = game.getMap();
			const floorIndex = game.getFloorIndex();
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
		config: {
			async: true,
		},
		async test(game): Promise<void> {
			const players = await addPlayers(game, 4);
			await game.start();

			const map = game.getMap();
			const floorIndex = game.getFloorIndex();
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
	commands: Object.assign((Tools.deepClone(mapGame.commands) as unknown) as GameCommandDefinitions<DarkraisLair>, commands),
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
	tests,
});

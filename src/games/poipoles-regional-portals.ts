import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { LocationType, RegionName } from "../types/dex";
import type { GameCommandDefinitions, IGameFile } from "../types/games";

const BASE_TRAVELERS_PER_ROUND: number = 3;

const data: {regions: Dict<PartialKeyedDict<LocationType, readonly string[]>>} = {
	regions: {},
};
const regionKeys: RegionName[] = [];
const regionTypeKeys: Dict<LocationType[]> = {};

class PoipolesRegionalPortals extends ScriptedGame {
	baseTravelersPerRound: number = BASE_TRAVELERS_PER_ROUND;
	canTravel: boolean = false;
	inactiveRoundLimit: number = 5;
	lastRegion: string = '';
	lastType: string = '';
	loserPointsToBits: number = 5;
	maxTravelersPerRound: number = 0;
	points = new Map<Player, number>();
	roundLocations: string[] = [];
	roundTime: number = 20 * 1000;
	roundTravels = new Set<Player>();
	winnerPointsToBits: number = 25;

	static loadData(): void {
		const locations = Dex.getData().locations;
		for (const region of Dex.getRegions()) {
			const types = Object.keys(locations[region]) as LocationType[];
			const regionLocations: PartialKeyedDict<LocationType, string[]> = {};
			for (const type of types) {
				for (const location of locations[region][type]) {
					if (!(type in regionLocations)) regionLocations[type] = [];
					regionLocations[type]!.push(Tools.toId(location));
				}
			}

			const typesWithLocations = Object.keys(regionLocations) as LocationType[];
			if (typesWithLocations.length) {
				data.regions[region] = regionLocations;
				regionKeys.push(region);
				regionTypeKeys[region] = typesWithLocations;
			}
		}
	}

	onSignups(): void {
		if (this.format.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
	}

	onStart(): void {
		if (this.parentGame && this.parentGame.playerCount < this.baseTravelersPerRound) {
			this.baseTravelersPerRound = this.parentGame.playerCount;
		}

		this.nextRound();
	}

	onNextRound(): void {
		this.canTravel = false;

		if (this.roundLocations.length) {
			this.inactiveRounds++;
			if (this.inactiveRounds === this.inactiveRoundLimit) {
				this.inactivityEnd();
				return;
			}
		} else {
			if (this.inactiveRounds) this.inactiveRounds = 0;
		}

		let reachedCap = false;
		this.points.forEach((points, player) => {
			if (points >= this.format.options.points) {
				this.winners.set(player, points);
				if (!reachedCap) reachedCap = true;
			}
		});
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (reachedCap) {
			this.end();
			return;
		}

		let region = this.sampleOne(regionKeys);
		while (region === this.lastRegion) {
			region = this.sampleOne(regionKeys);
		}
		this.lastRegion = region;

		let type = this.sampleOne(regionTypeKeys[region]);
		while (type === this.lastType) {
			type = this.sampleOne(regionTypeKeys[region]);
		}
		this.lastType = type;

		this.roundLocations = data.regions[region][type]!.slice();
		this.roundTravels.clear();

		if (this.roundLocations.length < this.baseTravelersPerRound) {
			this.maxTravelersPerRound = this.roundLocations.length;
		} else {
			this.maxTravelersPerRound = this.baseTravelersPerRound;
		}
		if (this.inheritedPlayers && this.maxTravelersPerRound > this.playerCount) this.maxTravelersPerRound = this.playerCount;

		const html = this.getRoundHtml(players => this.getPlayerPoints(players));
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			this.timeout = setTimeout(() => {
				const text = "Poipole opened a portal to a **" + Dex.getLocationTypeNames()[type] + " location** in " +
					"**" + Dex.getRegionNames()[region] + "**!";
				this.on(text, () => {
					this.canTravel = true;
					if (this.parentGame && this.parentGame.onChildHint) this.parentGame.onChildHint("", this.roundLocations, true);
					this.timeout = setTimeout(() => this.nextRound(), this.roundTime);
				});
				this.say(text);
			}, 5000);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd(): void {
		this.convertPointsToBits();
		this.announceWinners();
	}

	botChallengeTurn(botPlayer: Player, newAnswer: boolean): void {
		if (!newAnswer) return;

		if (this.botTurnTimeout) clearTimeout(this.botTurnTimeout);
		this.botTurnTimeout = setTimeout(() => {
			const command = "travel";
			const answer = this.sampleOne(this.roundLocations).toLowerCase();
			this.say(Config.commandCharacter + command + " " + answer);
			botPlayer.useCommand(command, answer);
		}, this.sampleOne(this.botChallengeSpeeds!));
	}
}

const commands: GameCommandDefinitions<PoipolesRegionalPortals> = {
	travel: {
		command(target, room, user) {
			if (!this.canTravel) return false;
			const player = this.createPlayer(user) || this.players[user.id];
			if (this.roundTravels.has(player)) return false;

			const location = Tools.toId(target);
			if (!location) return false;

			const index = this.roundLocations.indexOf(location);
			if (index === -1) return false;
			this.roundLocations.splice(index, 1);

			let points = this.points.get(player) || 0;
			points += BASE_TRAVELERS_PER_ROUND - this.roundTravels.size;
			this.points.set(player, points);

			this.roundTravels.add(player);
			this.say(player.name + " is the **" + Tools.toNumberOrderString(this.roundTravels.size) + "** traveler!");

			if (this.roundTravels.size === this.maxTravelersPerRound) {
				this.roundLocations = [];
				this.nextRound();
			}
			return true;
		},
	},
};

export const game: IGameFile<PoipolesRegionalPortals> = {
	aliases: ["poipoles", "prp", "regionalportals", "portals"],
	botChallenge: {
		enabled: true,
		options: ['speed'],
	},
	category: 'knowledge-2',
	commandDescriptions: [Config.commandCharacter + "travel [location]"],
	commands,
	class: PoipolesRegionalPortals,
	customizableOptions: {
		points: {min: 20, base: 20, max: 20},
	},
	description: "Players try to be the first 1-" + BASE_TRAVELERS_PER_ROUND + " travelers to a location of a randomly generated type " +
		"and region!",
	freejoin: true,
	name: "Poipole's Regional Portals",
	mascot: "Poipole",
};

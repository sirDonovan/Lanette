import { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { Game } from "../room-game";
import { Room } from "../rooms";
import { IGameFile, AchievementsDict, GameCommandReturnType } from "../types/games";

interface IBerry {
	effect: string;
	name: string;
}

interface IRoundEffect {
	effect: string;
	type: string;
}

const name = "Tropius' Berry Picking";
const data: {moves: string[]} = {
	moves: [],
};
let loadedData = false;

const berries: Dict<IBerry> = {
	// status
	'cheriberry': {name: 'Cheri', effect: 'par'},
	'chestoberry': {name: 'Chesto', effect: 'slp'},
	'pechaberry': {name: 'Pecha', effect: 'psn'},
	'rawstberry': {name: 'Rawst', effect: 'brn'},
	'aspearberry': {name: 'Aspear', effect: 'frz'},
	'persimberry': {name: 'Persim', effect: 'confusion'},

	// stats
	'liechi': {name: 'Liechi', effect: 'stat-attack'},
	'petaya': {name: 'Petaya', effect: 'stat-specialattack'},
	'ganlon': {name: 'Ganlon', effect: 'stat-defense'},
	'apicot': {name: 'Apicot', effect: 'stat-specialdefense'},
	'salac': {name: 'Salac', effect: 'stat-speed'},

	// EVs
	'pomeg': {name: 'Pomeg', effect: 'ev-hp'},
	'kelpsy': {name: 'Kelpsy', effect: 'ev-attack'},
	'qualot': {name: 'Qualot', effect: 'ev-defense'},
	'hondew': {name: 'Hondew', effect: 'ev-specialattack'},
	'grepa': {name: 'Grepa', effect: 'ev-specialdefense'},
	'tamato': {name: 'Tamato', effect: 'ev-speed'},

	// super-effective
	'occaberry': {name: 'Occa', effect: 'Fire'},
	'passhoberry': {name: 'Passho', effect: 'Water'},
	'wacanberry': {name: 'Wacan', effect: 'Electric'},
	'rindoberry': {name: 'Rindo', effect: 'Grass'},
	'yacheberry': {name: 'Yache', effect: 'Ice'},
	'chopleberry': {name: 'Chople', effect: 'Fighting'},
	'kebiaberry': {name: 'Kebia', effect: 'Poison'},
	'shucaberry': {name: 'Shuca', effect: 'Ground'},
	'cobaberry': {name: 'Coba', effect: 'Flying'},
	'payapaberry': {name: 'Payapa', effect: 'Psychic'},
	'tangaberry': {name: 'Tanga', effect: 'Bug'},
	'chartiberry': {name: 'Charti', effect: 'Rock'},
	'kasibberry': {name: 'Kasib', effect: 'Ghost'},
	'habanberry': {name: 'Haban', effect: 'Dragon'},
	'colburberry': {name: 'Colbur', effect: 'Dark'},
	'babiriberry': {name: 'Babiri', effect: 'Steel'},
	'chilanberry': {name: 'Chilan', effect: 'Normal'},
	'roseliberry': {name: 'Roseli', effect: 'Fairy'},
};

const effectDescriptions: Dict<string> = {
	'par': 'paralyzed',
	'slp': 'put to sleep',
	'psn': 'poisoned',
	'brn': 'burned',
	'frz': 'frozen',
	'confusion': 'confused',
};

const stats: string[] = ['Attack', 'Defense', 'Special Attack', 'Special Defense', 'Speed'];
const evs: string[] = ['HP', 'Attack', 'Defense', 'Special Attack', 'Special Defense', 'Speed'];

const achievements: AchievementsDict = {
	"berrymaster": {name: "Berry Master", type: 'first', bits: 1000, description: 'eat first in every round'},
};

class TropiusBerryPicking extends Game {
	canEat: boolean = false;
	canLateJoin: boolean = true;
	firstEat: Player | false | undefined;
	lastMove: string = '';
	points = new Map<Player, number>();
	roundBerries = new Map<Player, IBerry>();
	roundEffect: IRoundEffect = {effect: '', type: ''};
	roundLimit: number = 20;
	roundTime: number = 10 * 1000;

	static loadData(room: Room): void {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const movesList = Games.getMovesList(move => move.category !== 'Status' && move.type in Dex.data.typeChart && !move.id.startsWith('hiddenpower'));
		for (const move of movesList) {
			data.moves.push(move.name);
		}

		loadedData = true;
	}

	onSignups(): void {
		if (this.format.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
	}

	onStart(): void {
		this.nextRound();
	}

	onNextRound(): void {
		this.canEat = false;
		if (!this.format.options.freejoin) {
			if (this.round > 1) {
				if (this.canLateJoin) this.canLateJoin = false;
				if (this.roundTime > 3000) this.roundTime -= 500;
				for (const i in this.players) {
					if (this.players[i].eliminated) continue;
					if (!this.roundBerries.has(this.players[i])) this.eliminatePlayer(this.players[i], "You did not eat a berry!");
				}
				let firstEat = true;
				let lastPlayer: Player | null = null;
				this.roundBerries.forEach((berry, player) => {
					if (player.eliminated) return;
					if (firstEat) {
						if (this.firstEat === undefined) {
							this.firstEat = player;
						} else {
							if (this.firstEat && this.firstEat !== player) this.firstEat = false;
						}
						firstEat = false;
					}
					if (berry.effect !== this.roundEffect.effect) {
						this.eliminatePlayer(player, "You ate the wrong berry!");
						return;
					}
					lastPlayer = player;
				});
				if (lastPlayer && this.getRemainingPlayerCount() > 1) {
					this.eliminatePlayer(lastPlayer, "You were the last player to eat a berry!");
				}
			}
			if (this.round > this.roundLimit) {
				this.say("Tropius flew away!");
				this.timeout = setTimeout(() => this.end(), 5000);
				return;
			}
			if (this.getRemainingPlayerCount() < 2) return this.end();
			this.roundBerries.clear();
		}

		let name = this.sampleOne(data.moves);
		while (this.lastMove === name) {
			name = this.sampleOne(data.moves);
		}
		this.lastMove = name;
		const move = Dex.getExistingMove(name);
		let effect = move.type;
		let effectType = 'type';
		if (move.secondary && move.secondary !== true) {
			let moveEffect = move.secondary.status || move.secondary.volatileStatus;
			if (moveEffect) {
				if (moveEffect === 'tox') moveEffect = 'psn';
				if (moveEffect in effectDescriptions) {
					effect = moveEffect;
					effectType = 'status';
				}
			}
		} else if (!this.random(3)) {
			if (!this.random(2)) {
				effect = this.sampleOne(stats);
				effectType = 'stat';
			} else {
				effect = this.sampleOne(evs);
				effectType = 'ev';
			}
		}
		let smeargleText = 'A wild Smeargle used **' + move.name + '**!';
		if (effectType === 'status') {
			smeargleText += ' You were **' + effectDescriptions[effect] + '**!';
		} else if (effectType === 'stat') {
			smeargleText = 'Tropius is down to 25% health and wants a' + (effect === 'Attack' ? "n" : "") + " **" + effect + " boost**!";
			effect = 'stat-' + Tools.toId(effect);
		} else if (effectType === 'ev') {
			smeargleText = 'Tropius has excess **' + effect + ' EVs**!';
			effect = 'ev-' + Tools.toId(effect);
		}
		const roundEffect: IRoundEffect = {effect, type: effectType};
		this.roundEffect = roundEffect;

		this.on(smeargleText, () => {
			this.canEat = true;
			this.timeout = setTimeout(() => this.nextRound(), this.roundTime);
		});

		if (this.format.options.freejoin) {
			this.timeout = setTimeout(() => this.say(smeargleText), 5000);
		} else {
			const html = this.getRoundHtml(this.getPlayerNames);
			const uhtmlName = this.uhtmlBaseName + '-round-html';
			this.onUhtml(uhtmlName, html, () => {
				this.timeout = setTimeout(() => this.say(smeargleText), 5000);
			});
			this.sayUhtml(uhtmlName, html);
		}
	}

	onEnd(): void {
		if (this.format.options.freejoin) return;
		const base = Math.min(500, 100 * this.round);
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			this.winners.set(player, 1);
			this.addBits(player, base);
			if (this.firstEat === player && this.round >= 5) this.unlockAchievement(player, achievements.berrymaster!);
		}

		this.announceWinners();
	}
}

const commands: Dict<ICommandDefinition<TropiusBerryPicking>> = {
	eat: {
		command(target, room, user): GameCommandReturnType {
			if (!this.canEat || (!this.format.options.freejoin && (!this.players[user.id] || this.players[user.id].eliminated))) return false;
			const player = this.createPlayer(user) || this.players[user.id];
			const id = Tools.toId(target);
			const berry = berries[id] || berries[id + 'berry'];
			if (!berry) return false;
			if (this.format.options.freejoin) {
				if (berry.effect !== this.roundEffect.effect) return false;
				if (this.timeout) clearTimeout(this.timeout);
				this.canEat = false;
				let points = this.points.get(player) || 0;
				points += 1;
				this.points.set(player, points);
				if (points === this.format.options.points) {
					this.say('**' + player.name + '** wins' + (this.parentGame ? '' : ' the game') + '! A possible answer was __' + berry.name + '__.');
					this.winners.set(player, 1);
					this.convertPointsToBits(50);
					this.end();
					return true;
				}
				this.say('**' + player.name + '** advances to **' + points + '** point' + (points > 1 ? 's' : '') + '! A possible answer was __' + berry.name + '__.');
				this.nextRound();
			} else {
				if (this.roundBerries.has(player)) return false;
				this.roundBerries.set(player, berry);
				user.say("You ate a " + berry.name + " Berry!");
			}
			return true;
		},
	},
};

export const game: IGameFile<TropiusBerryPicking> = {
	achievements,
	aliases: ["tropius", "berrypicking", "berries", "tbp"],
	category: 'knowledge',
	commandDescriptions: [Config.commandCharacter + "eat [berry]"],
	commands,
	class: TropiusBerryPicking,
	defaultOptions: ['freejoin', 'points'],
	description: "Players help Tropius pick berries and fight off wild Pokemon! Use status and super-effective berries based on their moves.",
	formerNames: ["Smeargle's Berry Picking"],
	name,
	mascot: "Tropius",
};

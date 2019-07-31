import { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { DefaultGameOption, Game } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";

interface IBerry {
	effect: string;
	name: string;
}

interface IRoundEffect {
	effect: string;
	type: string;
}

const name = "Tropius' Berry Picking";
const moves: string[] = [];
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

class TropiusBerryPicking extends Game {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const movesList = Dex.getMovesList(move => move.category === 'Status' || !(move.type in Dex.data.typeChart) || move.id.startsWith('hiddenpower'));
		for (let i = 0; i < movesList.length; i++) {
			moves.push(movesList[i].name);
		}

		loadedData = true;
	}

	canEat: boolean = false;
	canLateJoin: boolean = true;
	defaultOptions: DefaultGameOption[] = ['freejoin', 'points'];
	// firstEat: Player | null;
	lastMove: string = '';
	points = new Map<Player, number>();
	roundBerries = new Map<Player, IBerry>();
	roundEffect: IRoundEffect = {effect: '', type: ''};
	roundLimit: number = 20;
	roundTime: number = 10 * 1000;

	onSignups() {
		if (this.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
	}

	onStart() {
		this.nextRound();
	}

	onNextRound() {
		this.canEat = false;
		if (!this.options.freejoin) {
			if (this.round > 1) {
				if (this.canLateJoin) this.canLateJoin = false;
				if (this.roundTime > 3000) this.roundTime -= 500;
				for (const i in this.players) {
					const player = this.players[i];
					if (player.eliminated) continue;
					if (!this.roundBerries.has(player)) {
						player.say("You didn't eat a berry! You have been eliminated.");
						player.eliminated = true;
					}
				}
				// let firstEat = true;
				let lastPlayer: Player | null = null;
				this.roundBerries.forEach((berry, player) => {
					if (player.eliminated) return;
					/*
					if (firstEat) {
						this.markFirstAction(player, 'firstEat');
						firstEat = false;
					}
					*/
					if (berry.effect !== this.roundEffect.effect) {
						player.say("You ate the wrong berry! You have been eliminated.");
						player.eliminated = true;
						return;
					}
					lastPlayer = player;
				});
				if (lastPlayer && this.getRemainingPlayerCount() > 1) {
					lastPlayer!.say("You were the last player to eat a berry! You have been eliminated.");
					lastPlayer!.eliminated = true;
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

		let name = Tools.sampleOne(moves);
		while (this.lastMove === name) {
			name = Tools.sampleOne(moves);
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
		} else if (!Tools.random(3)) {
			if (!Tools.random(2)) {
				effect = Tools.sampleOne(stats);
				effectType = 'stat';
			} else {
				effect = Tools.sampleOne(evs);
				effectType = 'ev';
			}
		}
		let smeargleText = 'A wild Smeargle used **' + move.name + '**!';
		if (effectType === 'status') {
			smeargleText += ' You were ' + effectDescriptions[effect] + '!';
		} else if (effectType === 'stat') {
			smeargleText = 'Tropius is down to 25% health and wants a' + (effect === 'Attack' ? "n" : "") + " " + effect + " boost!";
			effect = 'stat-' + Tools.toId(effect);
		} else if (effectType === 'ev') {
			smeargleText = 'Tropius has excess ' + effect + ' EVs!';
			effect = 'ev-' + Tools.toId(effect);
		}
		const roundEffect: IRoundEffect = {effect, type: effectType};
		this.roundEffect = roundEffect;

		this.on(smeargleText, () => {
			this.canEat = true;
			this.timeout = setTimeout(() => this.nextRound(), this.roundTime);
		});

		if (this.options.freejoin) {
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

	onEnd() {
		if (this.options.freejoin) return;
		const remainingPlayers = this.getRemainingPlayerCount();
		if (!remainingPlayers) {
			this.say("All players were eliminated! No winners this game.");
		} else {
			const multipleWinners = remainingPlayers > 1;
			const winners: string[] = [];
			let base = 100 * this.round;
			if (base > 500) {
				base = 500;
			}
			for (const i in this.players) {
				const player = this.players[i];
				if (player.eliminated) continue;
				this.winners.set(player, 1);
				this.addBits(player, base);
				// if (player === this.firstEat && this.round >= 5) Games.unlockAchievement(this.room, player, "Berry Master", this);
				winners.push(player.name);
			}
			const names = winners.join(", ");
			this.say("**Winner" + (multipleWinners ? "s" : "") + "**: " + names);
		}
	}
}

const commands: Dict<ICommandDefinition<TropiusBerryPicking>> = {
	eat: {
		command(target, room, user) {
			if (!this.canEat) return;
			if (!this.options.freejoin && (!this.players[user.id] || this.players[user.id].eliminated)) return;
			const player = this.createPlayer(user) || this.players[user.id];
			const id = Tools.toId(target);
			const berry = berries[id] || berries[id + 'berry'];
			if (!berry) return;
			if (this.options.freejoin) {
				if (berry.effect !== this.roundEffect.effect) return;
				if (this.timeout) clearTimeout(this.timeout);
				this.canEat = false;
				let points = this.points.get(player) || 0;
				points += 1;
				this.points.set(player, points);
				if (points === this.options.points) {
					this.say('**' + player.name + '** wins' + (this.parentGame ? '' : ' the game') + '! A possible answer was __' + berry.name + '__.');
					this.winners.set(player, 1);
					this.convertPointsToBits(50);
					this.end();
					return;
				}
				this.say('**' + player.name + '** advances to **' + points + '** point' + (points > 1 ? 's' : '') + '! A possible answer was __' + berry.name + '__.');
				this.nextRound();
			} else {
				if (this.roundBerries.has(player)) return;
				this.roundBerries.set(player, berry);
				user.say("You ate a " + berry.name + " Berry!");
			}
		},
	},
};

export const game: IGameFile<TropiusBerryPicking> = {
	aliases: ["tropius", "berrypicking", "berries", "tbp"],
	battleFrontierCategory: 'Knowledge',
	commandDescriptions: [Config.commandCharacter + "eat [berry]"],
	commands,
	class: TropiusBerryPicking,
	description: "Players help Tropius pick berries and fight off wild Pokemon! Use status and super-effective berries based on their moves.",
	formerNames: ["Smeargle's Berry Picking"],
	name,
	mascot: "Tropius",
};

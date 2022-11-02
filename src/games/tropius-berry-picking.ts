import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { GameCommandDefinitions, IGameAchievement, IGameFile } from "../types/games";

type AchievementNames = "berrymaster";

interface IBerry {
	effect: string;
	name: string;
}

interface IRoundEffect {
	effect: string;
	type: string;
}

const data: {moves: string[]} = {
	moves: [],
};

const noEffect: IRoundEffect = {effect: '', type: ''};

const berries: Dict<IBerry> = {
	// status
	'cheriberry': {name: 'Cheri', effect: 'par'},
	'chestoberry': {name: 'Chesto', effect: 'slp'},
	'pechaberry': {name: 'Pecha', effect: 'psn'},
	'rawstberry': {name: 'Rawst', effect: 'brn'},
	'aspearberry': {name: 'Aspear', effect: 'frz'},
	'persimberry': {name: 'Persim', effect: 'confusion'},

	// flavor
	'figyberry': {name: 'Figy', effect: 'flavor-spicy'},
	'wikiberry': {name: 'Wiki', effect: 'flavor-dry'},
	'magoberry': {name: 'Mago', effect: 'flavor-sweet'},
	'aguavberry': {name: 'Aguav', effect: 'flavor-bitter'},
	'iapapaberry': {name: 'Iapapa', effect: 'flavor-sour'},

	// stats
	'liechi': {name: 'Liechi', effect: 'stat-attack'},
	'petaya': {name: 'Petaya', effect: 'stat-specialattack'},
	'ganlon': {name: 'Ganlon', effect: 'stat-defense'},
	'apicot': {name: 'Apicot', effect: 'stat-specialdefense'},
	'salac': {name: 'Salac', effect: 'stat-speed'},
	'micle': {name: 'Micle', effect: 'stat-accuracy'},
	'custap': {name: 'Custap', effect: 'stat-priority'},
	'starf': {name: 'Starf', effect: 'stat-randomstat'},

	// EVs
	'pomeg': {name: 'Pomeg', effect: 'ev-hp'},
	'kelpsy': {name: 'Kelpsy', effect: 'ev-attack'},
	'qualot': {name: 'Qualot', effect: 'ev-defense'},
	'hondew': {name: 'Hondew', effect: 'ev-specialattack'},
	'grepa': {name: 'Grepa', effect: 'ev-specialdefense'},
	'tamato': {name: 'Tamato', effect: 'ev-speed'},

	// damageback
	'jaboca': {name: 'Jaboca', effect: 'damageback-physical'},
	'rowap': {name: 'Rowap', effect: 'damageback-special'},

	// boostback
	'kee': {name: 'Kee', effect: 'boostback-physical'},
	'maranga': {name: 'Maranga', effect: 'boostback-special'},

	//healback
	'enigma': {name: 'Enigma', effect: 'healback'},

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

const stats: string[] = ['Attack', 'Defense', 'Special Attack', 'Special Defense', 'Speed', 'Accuracy', 'Priority', 'random stat'];
const evs: string[] = ['HP', 'Attack', 'Defense', 'Special Attack', 'Special Defense', 'Speed'];
const flavor: string[] = ['Spicy', 'Dry', 'Sweet', 'Bitter', 'Sour'];

class TropiusBerryPicking extends ScriptedGame {
	static achievements: KeyedDict<AchievementNames, IGameAchievement> = {
		"berrymaster": {name: "Berry Master", type: 'first', bits: 1000, description: 'eat first in every round'},
	};

	canEat: boolean = false;
	canLateJoin: boolean = true;
	firstEat: Player | false | undefined;
	lastMove: string = '';
	points = new Map<Player, number>();
	roundBerries = new Map<Player, IBerry>();
	roundEffect: IRoundEffect = noEffect;
	roundLimit: number = 20;
	roundTime: number = 10 * 1000;

	static loadData(): void {
		const types: string[] = [];
		for (const key of Dex.getData().typeKeys) {
			types.push(Dex.getExistingType(key).name);
		}

		data.moves = Games.getMovesList(move => move.category !== 'Status' && types.includes(move.type) &&
			!move.id.startsWith('hiddenpower')).map(x => x.name);
	}

	onSignups(): void {
		if (this.options.freejoin) this.setTimeout(() => this.nextRound(), 5 * 1000);
	}

	onStart(): void {
		this.nextRound();
	}

	onNextRound(): void {
		this.canEat = false;

		const answers: string[] = [];
		for (const i in berries) {
			if (berries[i].effect === this.roundEffect.effect) {
				answers.push(berries[i].name);
			}
		}

		if (this.options.freejoin) {
			if (this.round > 1 && this.roundEffect !== noEffect) {
				this.say("Time is up! The " + (answers.length > 1 ? "possible answers were" : "answer was") + " __" +
					Tools.joinList(answers) + "__.");
			}
		} else {
			if (this.round > 1) {
				if (this.canLateJoin) this.canLateJoin = false;
				if (this.roundTime > 3000) this.roundTime -= 500;

				this.say("The correct " + (answers.length > 1 ? "answers were" : "answer was") + " __" + Tools.joinList(answers) + "__.");
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
				if (lastPlayer && this.getRemainingPlayerCount() > 1) { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
					this.eliminatePlayer(lastPlayer, "You were the last player to eat a berry!");
				}
			}
			if (this.round > this.roundLimit) {
				this.say("Tropius flew away!");
				this.setTimeout(() => this.end(), 5000);
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
		const randnum = this.random(22);
		if (move.secondary) {
			let moveEffect = move.secondary.status || move.secondary.volatileStatus;
			if (moveEffect) {
				if (moveEffect === 'tox') moveEffect = 'psn';
				if (moveEffect in effectDescriptions) {
					effect = moveEffect;
					effectType = 'status';
				}
			}
		} else {
			if (randnum >= 0 && randnum < 6) {
				effect = this.sampleOne(stats);
				effectType = 'stat';
			} else if (randnum >= 6 && randnum < 12) {
				effect = this.sampleOne(evs);
				effectType = 'ev';
			} else if (randnum >= 12 && randnum < 17){
				effect = this.sampleOne(flavor);
				effectType = 'flavor';
			} else if (randnum == 17){
				effectType = 'healback';
			} else if (randnum == 18 || randnum == 19){
				effectType = 'damageback';
				} else {
				effectType = 'boostback';
			}
		}
		let smeargleText = 'A wild Smeargle used **' + move.name + '**!';
		if (effectType === 'status') {
			smeargleText += ' You were **' + effectDescriptions[effect] + '**!';
		} else if (effectType === 'stat') {
			smeargleText = 'Tropius is down to 25% HP and wants a' + (effect === 'Attack' ? "n" : "") + " **" + effect + " boost**!";
			effect = 'stat-' + Tools.toId(effect);
		} else if (effectType === 'ev') {
			smeargleText = 'Tropius has excess **' + effect + ' EVs**!';
			effect = 'ev-' + Tools.toId(effect);
		} else if (effectType === 'flavor') {
			smeargleText = 'Tropius wants to **restore HP** but got confused by a **' + effect + ' flavor**!';
			effect = 'flavor-' + Tools.toId(effect);
		} else if (effectType === 'damageback') {
			smeargleText = 'Tropius wants to **inflict damage** after being hit by **' + move.name + '**!';
			effect = 'damageback-' + move.category.toLowerCase();
		} else if (effectType === 'boostback') {
			smeargleText = 'Tropius wants to **raise a defensive stat** after being hit by **' + move.name + '**!';
			effect = 'boostback-' + move.category.toLowerCase();
		} else if (effectType === 'healback') {
			smeargleText = 'Tropius wants to **restore HP** after being hit by a **super-effective move**!';
			effect = 'healback';
		}
		const roundEffect: IRoundEffect = {effect, type: effectType};
		this.roundEffect = roundEffect;

		this.on(smeargleText, () => {
			this.canEat = true;
			if (this.parentGame && this.parentGame.onChildHint) this.parentGame.onChildHint(smeargleText, [], true);
			this.setTimeout(() => this.nextRound(), this.getRoundTime());
		});

		if (this.options.freejoin) {
			this.say(smeargleText);
		} else {
			const html = this.getRoundHtml(players => this.getPlayerNames(players));
			const uhtmlName = this.uhtmlBaseName + '-round-html';
			this.onUhtml(uhtmlName, html, () => {
				this.setTimeout(() => this.say(smeargleText), 5000);
			});
			this.sayUhtml(uhtmlName, html);
		}
	}

	onEnd(): void {
		if (this.options.freejoin) {
			this.convertPointsToBits();
		} else {
			const base = Math.min(500, 100 * this.round);
			for (const i in this.players) {
				if (this.players[i].eliminated) continue;
				const player = this.players[i];
				this.winners.set(player, 1);
				this.addBits(player, base);
				if (this.firstEat === player && this.round >= 5) {
					this.unlockAchievement(player, TropiusBerryPicking.achievements.berrymaster);
				}
			}
		}

		this.announceWinners();
	}

	destroyPlayers(): void {
		super.destroyPlayers();

		this.roundBerries.clear();
	}

	botChallengeTurn(botPlayer: Player, newAnswer: boolean): void {
		if (!newAnswer) return;

		this.setBotTurnTimeout(() => {
			let answer = '';
			const keys = this.shuffle(Object.keys(berries));
			for (const key of keys) {
				if (berries[key].effect === this.roundEffect.effect) {
					answer = berries[key].name.toLowerCase();
					break;
				}
			}

			const command = "eat";
			const text = Config.commandCharacter + command + " " + answer;
			this.on(text, () => {
				botPlayer.useCommand(command, answer);
			});
			this.say(text);
		}, this.sampleOne(this.botChallengeSpeeds!));
	}
}

const commands: GameCommandDefinitions<TropiusBerryPicking> = {
	eat: {
		command(target, room, user) {
			if (!this.canEat) return false;
			const player = this.createPlayer(user) || this.players[user.id];
			const id = Tools.toId(target);
			const berry = id in berries ? berries[id] : berries[id + 'berry'] as IBerry | undefined;
			if (!berry) return false;
			if (this.options.freejoin) {
				if (berry.effect !== this.roundEffect.effect) return false;

				if (this.botTurnTimeout) clearTimeout(this.botTurnTimeout);
				if (this.timeout) clearTimeout(this.timeout);

				this.canEat = false;
				let points = this.points.get(player) || 0;
				points += 1;
				this.points.set(player, points);

				if (this.firstEat === undefined) {
					this.firstEat = player;
				} else {
					if (this.firstEat && this.firstEat !== player) this.firstEat = false;
				}

				this.say('**' + player.name + '** advances to **' + points + '** point' + (points > 1 ? 's' : '') + '! A possible ' +
					'answer was __' + berry.name + '__.');

				if (points === this.options.points) {
					if (this.firstEat === player && !this.parentGame) {
						this.unlockAchievement(player, TropiusBerryPicking.achievements.berrymaster);
					}
					this.winners.set(player, points);
					this.end();
					return true;
				}
				this.roundEffect = noEffect;
				this.setTimeout(() => this.nextRound(), 5000);
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
	aliases: ["tropius", "berrypicking", "berries", "tbp"],
	challengeSettings: {
		botchallenge: {
			enabled: true,
			options: ['speed'],
			requiredFreejoin: true,
		},
		onevsone: {
			enabled: true,
			options: ['speed'],
			requiredFreejoin: true,
		},
	},
	category: 'knowledge-2',
	commandDescriptions: [Config.commandCharacter + "eat [berry]"],
	commands,
	class: TropiusBerryPicking,
	defaultOptions: ['freejoin', 'points'],
	description: "Players help Tropius pick berries and fight off wild Pokemon! Use status and super-effective berries based on their " +
		"moves.",
	formerNames: ["Smeargle's Berry Picking"],
	name: "Tropius' Berry Picking",
	mascot: "Tropius",
};

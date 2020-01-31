import { ICommandDefinition } from "../command-parser";
import { Player } from "../room-activity";
import { Game } from "../room-game";
import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { IParametersWorkerData, IParam } from './../workers/parameters';

const name = "Inkay's Cups";
const gen = 7;
const genString = 'gen' + gen;

interface IParamType {
	'color': any;
	'letter': any;
	'tier': any;
	'type': any;
}
type ParamType = keyof IParamType;
const paramTypes: ParamType[] = ['color', 'letter', 'tier', 'type'];
const paramTypeDexesKeys: Dict<Dict<KeyedDict<IParamType, string[]>>> = {};

const searchTypes: (keyof IParametersWorkerData)[] = ['pokemon'];

let loadedData = false;

class InkaysCups extends Game {
	static loadData(room: Room) {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const parametersData = Games.workers.parameters.loadData();

		for (let i = 0; i < searchTypes.length; i++) {
			const searchType = searchTypes[i];
			paramTypeDexesKeys[searchType] = {};
			for (const gen in parametersData[searchType].gens) {
				paramTypeDexesKeys[searchType][gen] = {
					'color': [],
					'letter': [],
					'tier': [],
					'type': [],
				};
				for (let i = 0; i < paramTypes.length; i++) {
					paramTypeDexesKeys[searchType][gen][paramTypes[i]] = Object.keys(parametersData[searchType].gens[gen].paramTypeDexes[paramTypes[i]]);
				}
			}
		}

		loadedData = true;
	}

	answers: string[] = [];
	canGrab: boolean = false;
	canLateJoin: boolean = true;
	roundGuesses = new Map<Player, boolean>();
	roundTime: number = 15 * 1000;
	usesWorkers: boolean = true;

	onAddPlayer(player: Player, lateJoin?: boolean) {
		if (lateJoin && this.round > 1) {
			player.say("Sorry, the late-join period has ended.");
			return false;
		}
		return true;
	}

	onStart() {
		const text = "The game will be played in Gen " + gen + "!";
		this.on(text, () => {
			this.timeout = setTimeout(() => this.nextRound(), 5000);
		});
		this.say(text);
	}

	async generateCups() {
		const roundParamTypes = this.sampleMany(paramTypes, 2);
		const lower = this.getRemainingPlayerCount();
		const upper = lower * 3;
		let attempts = 0;
		let len = 0;
		let params: IParam[] = [];
		let mons: string[] = [];
		while ((len < lower || len > upper) && attempts < 10) {
			params = [];
			attempts++;
			for (let i = 0; i < roundParamTypes.length; i++) {
				const name = this.sampleOne(paramTypeDexesKeys.pokemon[genString][roundParamTypes[i]]);
				params.push(Games.workers.parameters.workerData!.pokemon.gens[genString].paramTypePools[roundParamTypes[i]][Tools.toId(name)]);
			}
			const intersection = await Games.workers.parameters.intersect({
				mod: genString,
				params,
				paramTypes,
				searchType: 'pokemon',
			});
			mons = intersection.pokemon;
			len = mons.length;
		}
		if (len < lower || len > upper) {
			this.generateCups();
			return;
		}
		this.answers = mons;
		this.roundGuesses.clear();

		const paramNames: string[] = params.map(x => x.param);
		let text = '';
		let letterIndex = -1;
		let tierIndex = -1;
		for (let i = 0; i < roundParamTypes.length; i++) {
			if (roundParamTypes[i] === 'letter') {
				letterIndex = i;
			} else if (roundParamTypes[i] === 'tier') {
				tierIndex = i;
			} else if (roundParamTypes[i] === 'type') {
				paramNames[i] += " type";
			}
		}
		if (letterIndex !== -1 && tierIndex !== -1) {
			text = "Grab a Pokemon that is **" + paramNames[tierIndex] + "** and starts with the letter **" + paramNames[letterIndex] + "**!";
		} else if (letterIndex !== -1) {
			text = "Grab a **" + (letterIndex === 0 ? paramNames[1] : paramNames[0]) + "** Pokemon that starts with the letter **" + paramNames[letterIndex] + "**!";
		} else if (tierIndex !== -1) {
			text = "Grab a **" + (tierIndex === 0 ? paramNames[1] : paramNames[0]) + "** Pokemon that is **" + paramNames[tierIndex] + "**!";
		} else {
			text = "Grab a **" + paramNames[0] + ", " + paramNames[1] + "** Pokemon!";
		}
		this.on(text, () => {
			this.canGrab = true;
			if (this.timeout) clearTimeout(this.timeout);
			this.timeout = setTimeout(() => this.nextRound(), this.roundTime);
		});
		this.say(text);
	}

	onNextRound() {
		this.canGrab = false;
		if (this.round > 1) {
			if (this.roundTime > 5000) this.roundTime -= 2500;
			for (const i in this.players) {
				if (this.players[i].eliminated) continue;
				if (!this.roundGuesses.has(this.players[i])) this.eliminatePlayer(this.players[i], "You did not grab a Pokemon!");
			}
		}
		if (this.getRemainingPlayerCount() < 2) return this.end();
		const html = this.getRoundHtml(this.getPlayerNames);
		const uhtmlName = this.uhtmlBaseName + '-round';
		this.onUhtml(uhtmlName, html, () => {
			if (this.timeout) clearTimeout(this.timeout);
			this.timeout = setTimeout(() => this.generateCups(), 5000);
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd() {
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			this.winners.set(player, 1);
			this.addBits(player, 500);
		}

		this.announceWinners();
	}
}

const commands: Dict<ICommandDefinition<InkaysCups>> = {
	grab: {
		command(target, room, user) {
			if (!this.canGrab || !(user.id in this.players) || this.players[user.id].eliminated) return false;
			const player = this.players[user.id];
			if (this.roundGuesses.has(player)) return false;
			const guess = Tools.toId(target);
			if (!guess) return false;
			const guessMega = (guess.substr(0, 4) === 'mega' ? guess.substr(4) + 'mega' : '');
			const guessPrimal = (guess.substr(0, 6) === 'primal' ? guess.substr(6) + 'primal' : '');
			let answerIndex = -1;
			for (let i = 0; i < this.answers.length; i++) {
				const answer = Tools.toId(this.answers[i]);
				if (answer === guess || (guessMega && answer === guessMega) || (guessPrimal && answer === guessPrimal)) {
					answerIndex = i;
					break;
				}
			}
			if (answerIndex === -1) return false;
			const pokemon = Dex.getExistingPokemon(this.answers[answerIndex]).species;
			this.answers.splice(answerIndex, 1);
			this.roundGuesses.set(player, true);
			user.say("You grabbed " + pokemon + " and advanced to the next round!");
			return true;
		},
	},
};

export const game: IGameFile<InkaysCups> = {
	aliases: ['inkays', 'cups'],
	category: 'knowledge',
	class: InkaysCups,
	commandDescriptions: [Config.commandCharacter + 'grab [Pokemon]'],
	commands,
	description: "Players grab Pokemon that fit the given parameters each round (one per player)!",
	name,
	mascot: "Inkay",
};

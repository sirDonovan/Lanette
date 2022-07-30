import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { GameCommandDefinitions, IGameFile } from "../types/games";
import type { IPokemon } from "../types/pokemon-showdown";

let MAX_GUESSES = 20;
const roundTimer = 30;
const turnTimer = 5;
const pokemonList = Dex.getPokemonList();

const allTypes = ["bug", "dark", "dragon", "electric", "fairy", "fighting", "fire", "flying",
	"ghost", "grass", "ground", "ice", "normal", "poison", "psychic", "rock", "steel", "water"];
const allTiers = ["uber", "ubers", "ou", "overused", "uubl", "uu", "underused", "rubl", "ru", "rarelyused",
	"nubl", "nu", "neverused", "publ", "pu", "zubl", "zu", "ag", "anythinggoes", "lc", "littlecup", "nfe", "illegal"];
const allStats = ["hp", "hitpoints", "atk", "attack", "def", "defense", "spa", "spatk",
	"specialattack", "spc", "special", "spd", "spdef", "specialdefense", "spe", "speed", "bst",
	"basestattotal", "ht", "height", "weight", "wt"];
const allCols = ["red", "blue", "green", "yellow", "brown", "black", "white", "pink", "purple", "gray"];
const allEggs = ["monster", "humanlike", "water1", "water2", "water3", "bug", "mineral", "flying",
	"amorphous", "field", "fairy", "grass", "dragon", "ditto", "undiscovered"];
const badForms = ["Pikachu-", "Unown-", "Deerling-", "Sawsbuck-", "Keldeo-", "Genesect-", "Vivillon-",
	"Furfrou-", "Flabebe-", "Floette-", "Florges-", "Minior-", "Alcremie-", "Morpeko-", "Zarude-"];

class DittosWhoAmI extends ScriptedGame {
	canLateJoin = false;
	currentPlayer: Player | null = null;
	playerInactiveRoundLimit = 2;
	playerOrder: Player[] = [];
	roundPlayerOrder: Player[] = [];
	points = new Map<Player, number>();
	playerPokemon = new Map<Player, IPokemon>();
	megaWeakList = new Map<Player, string>();
	megaResList = new Map<Player, string>();
	frozenList = new Map<Player, boolean>();
	realPoke = Dex.getExistingPokemon("mew");
	realPokeName = "nyaa~";
	weakList = "";
	resList = "";
	valpoke = 0;
	VALID_QUESTION = -1;
	MASTER_INDEX = 0;
	invalidPrompt = false;

	moveflag = false;
	typeflag = false;
	weakflag = false;
	resflag = false;
	monoflag = false;
	tierflag = false;
	genflag = false;
	formflag = false;
	abilflag = false;
	pokeflag = false;
	evoflag = false;
	statflag = false;
	elimflag = false;
	win_flag = false;
	colorflag = false;
	eggflag = false;
	megaflag = false;
	alolaflag = false;
	galarflag = false;
	totemflag = false;
	gmaxflag = false;
	hisuiflag = false;

	onAddPlayer(player: Player, latejoin?: boolean): boolean {
		if (latejoin) {
			this.roundPlayerOrder.push(player);
			this.playerOrder.push(player);
		}

		return true;
	}

	onStart(): void {
		const text = "Each round, try to guess a parameter with ``" + Config.commandCharacter + "g [parameter]``. If you're sure about " +
			"what Pokemon you have, guess it with ``" + Config.commandCharacter + "g [Pokemon]``!";

		this.on(text, () => {
			this.timeout = setTimeout(() => this.nextRound(), turnTimer * 1000);
		});

		this.say(text);

		let lastid = "";
		let resetFlag = false;

		for (let id in this.players) {
			if (lastid === "")
				lastid = id;
			if (resetFlag) {
				id = lastid;
				resetFlag = false;
			}
			const player = this.players[id];

			const randnum = this.random(pokemonList.length);
			const pokemonName = pokemonList[randnum].name;
			const pokemon = Dex.getExistingPokemon(pokemonName);

			for (const form of badForms) {
				if (pokemonName.includes(form)) {
					id = lastid;
					resetFlag = true;
					break;
				}
			}

			if (resetFlag) continue;

			lastid = id;

			this.playerPokemon.set(player, pokemon);

			this.frozenList.set(player, false);
			const typeKeys = Dex.getData().typeKeys;
			let resList = "";
			let weakList = "";
			for (const key of typeKeys) {
				const type = Dex.getExistingType(key).name;
				if (Dex.isImmune(type, pokemon.types)) {
					resList += type;
				} else {
					const effectiveness = Dex.getEffectiveness(type, pokemon.types);
					if (effectiveness <= -1) {
						resList += type;
					} else if (effectiveness >= 1) {
						weakList += type;
					}
				}
			}

			if (resList.length < 1 ) resList = "none2";
			this.megaResList.set(player, this.sanctify(resList));

			if (weakList.length < 1) weakList = "none2";
			this.megaWeakList.set(player, this.sanctify(weakList));
		}
	}

	getBST(realPoke: IPokemon): number{
		let i = 0;
		for (const meta of Object.values(realPoke.baseStats)) {
			i += Object.values(realPoke.baseStats)[meta];
		}

		return i;
	}

	tierSwap(input: string): string{
		if (input === "anythinggoes") return "ag";
		if (input === "ubers") return "uber";
		if (input === "overused") return "ou";
		if (input === "underused") return "uu";
		if (input === "underusedbanlist") return "uubl";
		if (input === "rarelyused") return "ru";
		if (input === "rarelusedbanlist") return "rubl";
		if (input === "neverused") return "nu";
		if (input === "neverusedbanlist") return "nubl";
		if (input === "littlecup") return "lc";

		return input;
	}

	findSmallestNonZero(a: number, b: number, c: number): number {
		const i = [];
		i[0] = a;
		i[1] = b;
		i[2] = c;
		let ret = 99;
		for (const x of i) {
			if (i[x] < 0) continue;
			if (i[x] < ret) ret = i[x];
		}

		return ret;
	}

	sanctify(input: string): string {
		let copycat = "";

		if (!input) return "";

		for (let i = 0; i < input.length; i++) {
			const x = input.charAt(i);
			if (x === '-' || x === ' ' || x === '\'' || x === '~' || x === ',' || x === '?' || x === '(' || x === ')' || x === '~') {
				continue;
			}

			copycat += x;
		}

		return copycat.replace("é", "e").toLowerCase().replace("generation", "gen");
	}

	refresh(): void {
		this.moveflag = false;
		this.typeflag = false;
		this.weakflag = false;
		this.resflag = false;
		this.monoflag = false;
		this.tierflag = false;
		this.genflag = false;
		this.formflag = false;
		this.abilflag = false;
		this.pokeflag = false;
		this.evoflag = false;
		this.statflag = false;
		this.colorflag = false;
		this.eggflag = false;
		this.megaflag = false;
		this.alolaflag = false;
		this.galarflag = false;
		this.totemflag = false;
		this.gmaxflag = false;
		this.hisuiflag = false;
		this.VALID_QUESTION = -1;
	}

	parser(guess: string, player: Player): boolean {
		this.realPokeName = this.playerPokemon.get(player)!.name;
		this.realPoke = Dex.getExistingPokemon(this.realPokeName);
		let finres = false;
		let negation = false;

		this.refresh();

		if (guess.charAt(0) === "!") {
			negation = true;
			guess = guess.substring(1, guess.length);
		} else {
			negation = false;
		}

		this.monoflag = guess === "mono" || guess === "monotype";
		this.tierflag = this.tierSwap(guess) === this.sanctify(this.realPoke.tier);
		this.genflag = guess.includes("gen") && guess.length < 5 ;
		this.formflag = guess === "forme" || guess === "form" ;
		this.evoflag = guess === "fe" || guess === "fullyevolved";
		this.megaflag = guess.includes("mega") && guess.length < 6;
		this.alolaflag = guess.includes("alola") && guess.length < 7;
		this.galarflag = guess.includes("galar") && guess.length < 7;
		this.totemflag = guess.includes("totem") && guess.length < 7;
		this.gmaxflag = guess.includes("gmax") && guess.length < 6;
		this.hisuiflag = guess.includes("hisui") && guess.length < 7;

		let valmove = 0;
		let valtype = 0;
		let valtier = 0;
		let valabil = 0;
		let valpoke = 0;
		let valstat = 0;
		let valcolor = 0;
		let valegg = 0;
		let statcon = false;
		const valgen = parseInt(guess.substring(3, guess.length));
		const lessindex = guess.indexOf("<");
		const moreindex = guess.indexOf(">");
		const eqindex = guess.indexOf("=");

		this.tierflag = valtier !== 0;

		for (const move of Games.getMovesList()) {
			if (this.sanctify(move.id) === guess) {
				valmove++;
				break;
			}
		}

		for (const type of allTypes) {
			if ((type + "type") === guess || type === guess) {
				valtype++;
				break;
			}
		}

		for (const tier of allTiers) {
			if (tier === this.tierSwap(guess)) {
				valtier++;
				break;
			}
		}

		for (const abil of Games.getAbilitiesList()) {
			if (this.sanctify(abil.id) === guess) {
				valabil++;
				break;
			}
		}

		for (const poke of pokemonList) {
			if (this.sanctify(poke.name).replace('.', '') === guess.replace('.', '')) {
				valpoke++;
				break;
			}
		}

		for (const stat of allStats) {
			if (guess.substring(0, this.findSmallestNonZero(moreindex, lessindex, eqindex)) === stat) {
				valstat++;
				break;
			}
		}

		for (const col of allCols) {
			if (guess === col) {
				valcolor++;
				break;
			}
		}

		for (const egg of allEggs) {
			if (guess === egg + "group" || guess === egg) {
				valegg++;
				break;
			}
		}

		this.valpoke = valpoke;
		this.statflag = valstat !== 0;
		this.colorflag = valcolor !== 0;
		this.eggflag = valegg !== 0;

		if (guess === this.sanctify(this.realPoke.abilities[0]) || guess === this.sanctify(String(this.realPoke.abilities[1])) ||
			guess === this.sanctify(String(this.realPoke.abilities['H'])) ||
			guess === this.sanctify(String(this.realPoke.abilities['S']))) {
			this.abilflag = true;
		} else {
			this.abilflag = false;
		}

		if (guess === this.sanctify(this.realPoke.eggGroups[0]) || guess === this.sanctify(this.realPoke.eggGroups[1])) {
			this.eggflag = true;
		} else {
			this.eggflag = false;
		}

		if (guess === this.sanctify(this.realPoke.color)) {
			this.colorflag = true;
		} else {
			this.colorflag = false;
		}

		if (valmove) {
			for (const move of Dex.getAllPossibleMoves(this.realPoke)) {
				if (this.sanctify(move) === guess) {
					this.moveflag = true;
					break;
				} else {
					this.moveflag = false;
				}
			}
		}

		if (valtype) {
			for (const name of this.realPoke.types) {
				const condition = guess === this.sanctify(name);
				const condition2 = guess === this.sanctify(name + "type");
				if (condition || condition2) {
					this.typeflag = true;
					break;
				} else {
					this.typeflag = false;
				}
			}
		}

		if (valstat) {

			const MAX_AFFECTED_STAT = Math.max(Math.max(moreindex, lessindex), eqindex);
			let metric = guess.substring(0, MAX_AFFECTED_STAT);

			const metval = guess.substring(MAX_AFFECTED_STAT + 1, guess.length);
			let RAW_STAT = -1;
			const value = parseFloat(metval);
			if (metric.charAt(metric.length - 1) === "<" || metric.charAt(metric.length - 1) === ">") {
				metric = metric.substring(0, metric.length - 1);
			}

			if (isNaN(value) || value < 0) {
				this.say("You did not enter a valid numeric stat.");
				return false;
			}

			if (metric === "hp" || metric === "hitpoints") {
				RAW_STAT = Object.values(this.realPoke.baseStats)[0];
			} else if (metric === "atk" || metric === "attack") {
				RAW_STAT = Object.values(this.realPoke.baseStats)[1];
			} else if (metric === "def" || metric === "defense") {
				RAW_STAT = Object.values(this.realPoke.baseStats)[2];
			} else if (metric === "spa" || metric === "spatk" || metric === "specialattack" || metric === "spc" || metric === "special") {
				RAW_STAT = Object.values(this.realPoke.baseStats)[3];
			} else if (metric === "spd" || metric === "spdef" || metric === "specialdefense") {
				RAW_STAT = Object.values(this.realPoke.baseStats)[4];
			} else if (metric === "spe" || metric === "speed") {
				RAW_STAT = Object.values(this.realPoke.baseStats)[5];
			} else if (metric === "bst" || metric === "basestattotal") {
				RAW_STAT = this.getBST(this.realPoke);
			} else if (metric === "ht" || metric === "height") {
				RAW_STAT = this.realPoke.heightm;
			} else if (metric === "wt" || metric === "weight") {
				RAW_STAT = this.realPoke.weightkg;
			}


			if (eqindex > 0) statcon = RAW_STAT === value;
			if (moreindex > 0) statcon = statcon || RAW_STAT > value;
			if (lessindex > 0) statcon = statcon || RAW_STAT < value;
		}


		this.abilflag = valabil !== 0;
		this.typeflag = valtype !== 0;
		this.moveflag = valmove !== 0;
		this.tierflag = valtier !== 0;

		if (this.currentPlayer !== null && this.megaWeakList.has(this.currentPlayer)) {
			this.weakList = String(this.megaWeakList.get(this.currentPlayer));
		} else {
			this.weakList = "none";
		}

		if (this.currentPlayer !== null && this.megaWeakList.has(this.currentPlayer)) {
			this.resList = String(this.megaResList.get(this.currentPlayer));
		} else {
			this.resList = "none;";
		}

		if (this.moveflag && valmove > 0) {
			finres = true;
			// this.say("**YES, move is learnt.**");
		} else if (!this.moveflag && valmove > 0) {
			// this.say("**NO, move is NOT learnt.**");
		} else if (this.typeflag && valtype > 0) {
			finres = true;
			// this.say("**YES, type is matched.**");
		} else if (!this.typeflag && valtype > 0) {
			// this.say("**NO, type is NOT matched.**");
		} else if (this.tierflag && valtier > 0) {
			finres = true;
			// this.say("**YES, tier is matched.**");
		} else if (!this.tierflag && valtier > 0) {
			// this.say("**NO, tier is NOT matched.**");
		} else if (this.abilflag && valabil > 0) {
			finres = true;
			// this.say("**YES, abiliy is matched**");
		} else if (!this.abilflag && valabil > 0 ) {
			// this.say("**NO, ability is NOT matched.**");
		} else if (this.eggflag && valegg > 0) {
			finres = true;
			// this.say("**YES, egg group is matched**");
		} else if (!this.eggflag && valegg > 0 ) {
			// this.say("**NO, egg group is NOT matched.**");
		} else if (this.colorflag && valcolor > 0) {
			finres = true;
			// this.say("**YES, color is matched**");
		} else if (!this.colorflag && valcolor > 0 ) {
			// this.say("**NO, color is NOT matched.**");
		} else if (!this.monoflag && !this.genflag && !this.formflag && !this.evoflag && !this.valpoke &&
			!this.statflag  && !this.colorflag && !valstat && !this.megaflag && !this.alolaflag &&
			!this.galarflag && !this.totemflag && !this.gmaxflag && !this.hisuiflag) {
			let AM_I_WEAK = guess.indexOf("weak");
			if (AM_I_WEAK < 0) AM_I_WEAK = -99;

			let AM_I_RES = guess.indexOf("resists");
			if (AM_I_RES < 0) AM_I_RES = -99;

			let present;
			if (AM_I_RES >= 0 || AM_I_WEAK >= 0) {
				guess = this.sanctify(guess.substring(Math.max(AM_I_WEAK + 4, AM_I_RES + 7), guess.length));
				let metatype = 0;
				for (const type of allTypes) {
					if ((type + "type") === guess || type === guess) {
						metatype++;
						break;
					}
				}

				if (metatype === 0) {
					this.say("Invalid type.");
					return false;
				} else {
					if (AM_I_WEAK >= 0 && AM_I_RES < 0) {
						present = this.weakList.includes(guess);
						this.weakflag = true;
						if (present) {
							finres = true;
							// this.say("**YES, the Pokemon is weak to that type.**");
						} else {
							// this.say("**NO, the Pokemon is NOT weak to that type.**")
						}
					}

					if (AM_I_RES >= 0 && AM_I_WEAK < 0) {
						present = this.resList.includes(guess);
						this.resflag = true;
						// this.say("My present to you is "+present+ " found from "+resList);

						if (present) {
							finres = true;
							// this.say("**YES, the Pokemon does resist that type.**");
						} else {
							// this.say("**NO, the Pokemon does NOT resist that type.**")
						}
					}
				}
			}
		} else if (this.monoflag) {
			if (this.realPoke.types.length === 1) {
				finres = true;
				// this.say("**YES, the pokemon is monotype.**");
			} else {
				// this.say("**NO, the pokemon is NOT monotype.**");
			}
		} else if (this.megaflag) {
			if (this.realPokeName.includes("-Mega")) {
				finres = true;
				// this.say("**YES, the pokemon is mega.**");
			} else {
				// this.say("**NO, the pokemon is NOT mega.**");
			}
		} else if (this.alolaflag) {
			if (this.realPokeName.includes("-Alola")) {
				finres = true;
				// this.say("**YES, the pokemon is alola.**");
			} else {
				// this.say("**NO, the pokemon is NOT alola.**");
			}
		} else if (this.galarflag) {
			if (this.realPokeName.includes("-Galar")) {
				finres = true;
				// this.say("**YES, the pokemon is galar.**");
			} else {
				// this.say("**NO, the pokemon is NOT galar.**");
			}
		} else if (this.totemflag) {
			if (this.realPokeName.includes("-Totem")) {
				finres = true;
				// this.say("**YES, the pokemon is totem.**");
			} else {
				// this.say("**NO, the pokemon is NOT totem.**");
			}
		} else if (this.gmaxflag) {
			if (this.realPokeName.includes("-Gmax")) {
				finres = true;
				// this.say("**YES, the pokemon is a gmax.**");
			} else {
				// this.say("**NO, the pokemon is NOT a gmax.**");
			}
		} else if (this.hisuiflag) {
			if (this.realPokeName.includes("-Hisui")) {
				finres = true;
				// this.say("**YES, the pokemon is hisui.**");
			} else {
				// this.say("**NO, the pokemon is NOT hisui.**");
			}
		} else if (this.genflag && !isNaN(valgen) && (valgen > 0 && valgen < 10)) {
			if (valgen === this.realPoke.gen) {
				finres = true;
				// this.say("**YES, the pokemon is from that generation**");
			} else {
				// this.say("**NO, the pokemon is NOT from that generation.**");
			}
		} else if (this.formflag) {
			if (this.realPokeName.includes("-") && !(this.realPokeName === "Porygon-Z") &&
				!(this.realPokeName === "Jangmo-o") && !(this.realPokeName === "Hakamo-o") && !(this.realPokeName === "Kommo-o")) {
				finres = true;
				// this.say("**YES, the pokemon is a forme**");
			} else {
				// this.say("**NO, the pokemon is NOT a forme.**");
			}
		} else if (this.evoflag) {
			if (this.realPoke.evos.length <= 0) {
				finres = true;
				// this.say("**YES, the pokemon is fully evolved**");
			} else {
				// this.say("**NO, the pokemon is NOT fully evolved**");
			}
		} else if (this.statflag) {
			if (statcon) {
				finres = true;
				// this.say("**YES**, the stat falls in the specified range.");
			} else {
				// this.say("**NO**, the stat does NOT fall in the specified range.")
			}
		} else if (this.valpoke > 0) {
			if (guess.replace(".", "") === this.sanctify(this.realPokeName).replace(".", "")) {
				finres = true;

				if (this.currentPlayer) {
					this.say("**Correct!** " + this.currentPlayer.name + " has guessed their Pokemon.");
					this.points.set(this.currentPlayer, 1);
				}
			} else {
				if (this.currentPlayer) {
					this.say("**Incorrect!** " + this.currentPlayer.name + " has been eliminated for the wrong guess. Their Pokemon was " +
						this.realPokeName + ".");
					this.eliminatePlayer(this.currentPlayer);
				}
			}
		} else {
			// this.say("**NO. blanket case.**");
		}

		// this.say("in order, they are " + !monoflag + !genflag + !formflag + !evoflag + !valpoke + !statflag  + !colorflag + !valstat);

		if (negation) finres = !finres;
		return finres;
	}

	switchPlayer(): void {
		this.invalidPrompt = false;
		if (this.timeout) clearTimeout(this.timeout);
		this.MASTER_INDEX++;

		// this.say(this.roundPlayerOrder.length+" players are left.");
		if (this.MASTER_INDEX >= this.roundPlayerOrder.length ) {
			this.MASTER_INDEX = 0;
			this.say("All players have taken their turns, moving to the next round~");
			this.nextRound();
		} else {
			this.currentPlayer = this.roundPlayerOrder[this.MASTER_INDEX];
			if (!this.roundPlayerOrder[this.MASTER_INDEX]) {
				this.currentPlayer = this.roundPlayerOrder[0];
				this.MASTER_INDEX = 0;
				this.say("current player undefined(why?), he has been reset to the first available and is now " + this.currentPlayer.name);
			}

			if (this.MASTER_INDEX > 0) this.say("**" + this.currentPlayer.name + "** it is your turn now!");
			this.timeout = setTimeout(() => this.fancyElim(), roundTimer * 1000);
		}
	}

	fancyElim(): void {
		if (this.currentPlayer && this.frozenList.get(this.currentPlayer)) {
			this.say("Timer DQ for " + this.currentPlayer.name + ".");
			this.eliminatePlayer(this.currentPlayer);
		} else if (this.currentPlayer && !this.frozenList.get(this.currentPlayer)) {
			this.say(this.currentPlayer.name + " has been skipped for this turn, any further skipped turns result in their elimination.");
			this.frozenList.set(this.currentPlayer, true);
		}
		this.switchPlayer();
	}

	onNextRound(): void {
		if (this.timeout) clearTimeout(this.timeout);

		if (this.getRemainingPlayerCount() < 1 && !this.win_flag) {
			this.say("Everyone has been eliminated!");
			this.say("No winners this game!");
			this.end();
			return;
		}

		if (this.currentPlayer) {
			if (this.addPlayerInactiveRound(this.currentPlayer)) {
				if (this.VALID_QUESTION < 0) {
					this.say(this.currentPlayer.name + " did not guess a parameter or the Pokemon and has been eliminated from the game!");
					this.eliminatePlayer(this.currentPlayer);
				}
			}
		}

		let win2 = false;

		for (const id in this.players) {
			if (this.players[id].eliminated) continue;
			const player = this.players[id];
			const points = this.points.get(player);

			if (points && points > 0) {
				if (!win2)
				this.say("Some guesses have been correct!");
				win2 = true;
				this.onEnd();
			}
		}

		if (MAX_GUESSES === 1) {
			this.say("The **last round** has started! Now's the time to use .guess [pokemon] to have a chance at winning.");
		}

		if (MAX_GUESSES <= 0) {
			this.say("Twenty rounds have elapsed! The game is now concluding.");
			win2 = true;
		}

		MAX_GUESSES--;

		if (win2) {
			this.announceWinners(); this.end();
		} else {
			this.roundPlayerOrder = this.shufflePlayers();
			this.playerOrder = this.roundPlayerOrder.slice();
			this.sayUhtml(this.uhtmlBaseName + '-round-html', this.getRoundHtml(players => this.getPlayerPoints(players)));

			if (!this.playerOrder.length) {
				this.playerOrder = this.roundPlayerOrder;
			}

			const currentPlayer = this.playerOrder[0];
			this.playerOrder.shift();
			if (currentPlayer.eliminated ) {
				// this.say("onnextround's case, player switching now");
				this.fancyElim();
			}

			const text = "**" + currentPlayer.name + "** you are up!";
			this.on(text, () => {
				this.currentPlayer = currentPlayer;
				this.timeout = setTimeout(() => this.fancyElim(), roundTimer * 1000);
			});
			this.say(text);
		}
	}

	onEnd(): void {
		for (const id in this.players) {
			if (this.players[id].eliminated) continue;
			const player = this.players[id];
			const points = this.points.get(player);
			if (points && points > 0) {
				this.winners.set(player, points);
				this.addBits(player, 500);
			}
		}
		this.win_flag = true;
	}
}

const commands: GameCommandDefinitions<DittosWhoAmI> = {
	guess: {
		command(target, room, user) {
			this.refresh();
			target = this.sanctify(target);
			const player = this.players[user.id];
			if (player !== this.currentPlayer && this.currentPlayer) {
				this.say("__" + this.currentPlayer.name + "__ should be the one currently asking.");
				return false;
			}

			let alternatives = target.split("|");
			if (alternatives.length < 1) alternatives = ["meow"];
			if (alternatives.length > 5) {
				this.say("You're asking too many questions in one go, try asking less. (You can ask again).");
				return false;
			}

			let effectiveCondition  = false;
			this.VALID_QUESTION = 0;
			for (const each of alternatives) {
				if (each === "") continue;

				effectiveCondition = effectiveCondition || this.parser(each, player);
				if (this.tierflag || this.eggflag || this.colorflag || this.statflag || this.moveflag ||
					this.typeflag || this.monoflag || this.genflag || this.formflag || this.evoflag ||
					this.valpoke > 0 || this.resflag || this.weakflag || this.abilflag || this.megaflag ||
					this.alolaflag || this.galarflag || this.totemflag || this.gmaxflag || this.hisuiflag)
					this.VALID_QUESTION = 1;

			}

			if (this.VALID_QUESTION !== 1 && !this.invalidPrompt) {
				this.say("That wasn't a valid question. Try again!");
			}

			this.invalidPrompt = true;
			if (this.VALID_QUESTION === 1) {
				if (this.timeout) clearTimeout(this.timeout);

				if (effectiveCondition) {
					this.say("**Yes!**");
				} else {
					this.say("**No!**");
				}

				this.timeout = setTimeout(() => this.switchPlayer(), turnTimer * 1000);
			}

			return true;
		},
		aliases: ['g'],
	},
};

export const game: IGameFile<DittosWhoAmI> = {
	aliases: ["dittos", "who am i"],
	category: 'puzzle',
	class: DittosWhoAmI,
	commands,
	commandDescriptions: [Config.commandCharacter + 'g [Pokemon]', Config.commandCharacter + 'g [parameter]'],
	description: "At the start of the game, all players are assigned a different Pokemon." +
	" Each round, players must ask 'yes' or 'no' questions in chat to guess what Pokemon they were assigned!",
	name: "Ditto's Who Am I",
	mascot: "Ditto",
	nonTrivialLoadData: true,
};

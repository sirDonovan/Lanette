import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { GameCommandDefinitions, IGameFile } from "../types/games";
import { addPlayers, assertStrictEqual } from "../test/test-tools";
import type { IPokemon } from "../types/pokemon-showdown";



interface IPokemonData {
	color: string[];
	eggGroup: string[];
	generation: string[];
	moves: string[];
	type: readonly string[];
}
type IPokemonCategory = keyof IPokemonData;

const data: {pokemon: Dict<IPokemonData>, keys: string[], allParameters: KeyedDict<IPokemonCategory, string[]>} = {
	pokemon: {},
	keys: [],
	allParameters: {
		color: [],
		eggGroup: [],
		generation: [],
		moves: [],
		type: [],
	},
};


const pokemonList = Dex.getPokemonList();

var MAX_GUESSES = 20;
var win_flag = false;
const round_timer = 30;
const turn_timer = 5;
var real_poke = Dex.getExistingPokemon("mew");
var real_poke_name = "nyaa~";
var valid_question = -1;
var master_index = 0;
var playerPokemon = new Map<Player, IPokemon>();
var mega_weak_list = new Map<Player, String> ();
var mega_res_list = new Map<Player, String> ();
var frozen_list = new Map<Player, boolean> ();

var weak_list = "";
var res_list = "";

let moveflag=false;
let typeflag=false;
let weakflag=false;
let resflag=false;
let monoflag=false;
let tierflag=false;
let genflag=false;
let formflag=false;
let abilflag=false;
let pokeflag=false;
let evoflag=false;
let statflag=false;
let elimflag=false;
let colorflag=false;
let eggflag=false;
let megaflag=false;
let alolaflag=false;
let galarflag=false;
let totemflag=false;
let gmaxflag=false;

let invalid_prompt =false;



const allTypes = ["bug","dark","dragon","electric","fairy","fighting","fire","flying","ghost","grass","ground","ice","normal","poison","psychic","rock","steel","water"];
const allTiers = ["uber","ubers","ou","overused","uubl","uu","underused","rubl","ru","rarelyused","nubl","nu","neverused","publ","pu","zubl","zu","ag","anythinggoes","lc","littlecup","nfe","illegal"];
const allStats = ["hp", "hitpoints", "atk", "attack", "def", "defense", "spa", "spatk", "specialattack", "spc", "special", "spd", "spdef", "specialdefense", "spe", "speed", "bst", "basestattotal","ht", "height", "weight", "wt"];
const allCols = ["red", "blue", "green", "yellow", "brown", "black", "white", "pink", "purple", "gray"];
const allEggs = ["monster", "humanlike", "water1", "water2", "water3", "bug", "mineral", "flying", "amorphous", "field", "fairy", "grass", "dragon", "ditto", "undiscovered"];
const badForms = ["Pikachu-", "Unown-","Deerling-","Sawsbuck-","Keldeo-","Genesect-","Vivillon-", "Furfrou-","Flabebe-", "Floette-", "Florges-","Minior-","Alcremie-", "Morpeko-", "Zarude-"];


class DittosWhoAmI extends ScriptedGame {
	canLateJoin = false;
	currentPlayer: Player | null = null;
	playerInactiveRoundLimit = 2;
	playerOrder: Player[] = [];
	points = new Map<Player, number>();
	playerPokemon = new Map<Player, IPokemon>();
	mega_weak_list = new Map<Player, String> ();
	mega_res_list = new Map<Player, String> ();
	frozen_list = new Map<Player, boolean> ();

	weak_list="";
	res_list="";

	roundPlayerOrder: Player[] = [];

	
	valpoke = 0;
	valid_question = -1;
	master_index = 0;

	moveflag=false;
	typeflag=false;
	weakflag=false;
	resflag=false;
	monoflag=false;
	tierflag=false;
	genflag=false;
	formflag=false;
	abilflag=false;
	pokeflag=false;
	evoflag=false;
	statflag=false;
	elimflag=false;
	win_flag=false;
	colorflag=false;
	eggflag=false;
	megaflag=false;
	alolaflag=false;
	galarflag=false;
	totemflag=false;
	gmaxflag=false;

	invalid_prompt = false;


	onAddPlayer(player: Player, latejoin?: boolean): boolean {
		if (latejoin) {
			this.roundPlayerOrder.push(player);
			this.playerOrder.push(player);
		}

		return true;
	}

	onStart(): void {
		const playerPokemon: string[] = [];
		const text = "Each round, try to guess a parameter with ``" + Config.commandCharacter +
		 "g [parameter]``. If you're sure about what Pokemon you have, guess it with ``" + Config.commandCharacter + "g [Pokemon]``!";

		this.on(text, () => {
			this.timeout = setTimeout(() => this.nextRound(), turn_timer * 1000);
		});

		this.say(text);


		var last_id="";
		var reset_flag = false;

		for (var id in this.players) {
			if(last_id=="") 
				last_id=id;
			if(reset_flag){
				id=last_id;
				reset_flag=false;
			}
			var player = this.players[id];

			var randnum = this.random(pokemonList.length);
			var pokemonName = pokemonList[randnum].name;
			var pokemon = Dex.getExistingPokemon(pokemonName);

			for(const form in badForms) {
				if(pokemonName.includes(form)){
					id=last_id;
					reset_flag = true;
					break;
				}
			}			
			if(reset_flag)
				continue;
			
			last_id=id;	
		
	

			this.playerPokemon.set(player, pokemon);
			
			//this.say(player.name+" has been given "+pokemon.name+".");
			this.frozen_list.set(player,false);
			const typeKeys = Dex.getData().typeKeys;
			var res_list="";
			var weak_list="";
			for (const key of typeKeys) {

				const type = Dex.getExistingType(key).name;
				if (Dex.isImmune(type, pokemon.types)) {
					res_list+=" ("+type+") ";
				} else {
					const effectiveness = Dex.getEffectiveness(type, pokemon.types);
					if (effectiveness <= -1) {
						res_list+=type+", ";
					} else if (effectiveness >= 1) {
						weak_list+=type+", ";
					}
				}
			}
			
			if(res_list.length < 1 ) res_list = "none2";
			this.mega_res_list.set(player,this.sanctify(res_list));
			if(weak_list.length < 1) weak_list = "none2";
			this.mega_weak_list.set(player,this.sanctify(weak_list));
		
		}


	}

	getBST(real_poke: IPokemon) :number{
		let i=0;
		for (const meta in Object.values(real_poke.baseStats)) {
				i+=Object.values(real_poke.baseStats)[meta];
			}
		return i;
	}

	tierSwap(input: string) : string{
		if(input == "anythinggoes") return "ag";
		if(input == "ubers") return "uber";
		if(input == "overused") return "ou";
		if(input == "underused") return "uu";
		if(input == "underusedbanlist") return "uubl";
		if(input == "rarelyused") return "ru";
		if(input == "rarelusedbanlist") return "rubl";
		if(input == "neverused") return "nu";
		if(input == "neverusedbanlist") return "nubl";
		if(input == "littlecup") return "lc";
		return input;

	}

	findSmallestNonZero(a: number, b: number, c: number): number {
		var i = [];
		i[0]=a;
		i[1]=b;
		i[2]=c;
		var ret=99;
		for(const x in i){
			if(i[x]<0) continue;
			if(i[x]<ret) ret=i[x];
		}
		return ret;


	}

	sanctify(input : string): string {
		var copycat="";

		if(!input) return "";
		
		for(var i=0;i<input.length;i++) {
			var x=input.charAt(i);
			if(x == '-' || x == ' ' || x == '\'' || x == '~' || x == ',' || x == '?' || x == '(' || x == ')' || x == '~') continue;
			
			copycat+=x;
			
		}
		return copycat.replace("é","e").toLowerCase().replace("generation","gen");

	}

	refresh (): void {
		this.moveflag=false;
		this.typeflag=false;
		this.weakflag=false;
		this.resflag=false;
		this.monoflag=false;
		this.tierflag=false;
		this.genflag=false;
		this.formflag=false;
		this.abilflag=false;
		this.pokeflag=false;
		this.evoflag=false;
		this.statflag=false;
		this.colorflag=false;
		this.eggflag=false;
		this.megaflag=false;
		this.alolaflag=false;
		this.galarflag=false;
		this.totemflag=false;
		this.gmaxflag=false;
		this.valid_question=-1;

		

	}

	parser (guess:string, player: Player): boolean {

		real_poke_name = (this.playerPokemon.get(player)!.name);
		real_poke = Dex.getExistingPokemon(real_poke_name);
		let finres=false;
		let flag=0;
		let negation=false;
		this.refresh();
		if(guess.charAt(0)=="!"){
			negation=true;
			guess=guess.substring(1,guess.length);
		}
		else 
			negation=false;

		monoflag=(guess == "mono" || guess == "monotype");
		tierflag=(this.tierSwap(guess) == this.sanctify(real_poke.tier));
		genflag=(guess.includes("gen") && guess.length <5 );
		formflag=(guess == "forme" || guess == "form") ;
		evoflag=(guess == "fe" || guess == "fullyevolved");
		megaflag=(guess.includes("mega") && guess.length < 6);
		alolaflag=(guess.includes("alola")&& guess.length < 7);
		galarflag=(guess.includes("galar")&& guess.length < 7);
		totemflag=(guess.includes("totem")&& guess.length < 7);
		gmaxflag=(guess.includes("gmax")&& guess.length < 6);

		let valmove=0;
		let valtype=0;
		let valtier=0;
		let valgen=parseInt(guess.substring(3,guess.length));
		let valabil=0;
		let valpoke=0;
		let valstat=0;
		let valcolor=0;
		let valegg=0;
		let lessindex=guess.indexOf("<");
		let moreindex=guess.indexOf(">");
		let eqindex=guess.indexOf("=");
		let statcon=false;

		this.monoflag=monoflag;
		this.tierflag=valtier!=0;
		this.genflag=genflag;
		this.formflag=formflag;
		this.evoflag=evoflag;
		this.gmaxflag=gmaxflag;

		this.megaflag=megaflag;
		this.alolaflag=alolaflag;
		this.galarflag=galarflag;
		this.totemflag=totemflag;

	for (const move of Games.getMovesList()) {
	if(this.sanctify(move.id) == guess){
		valmove++; break;
	}

	}

	for(const type of allTypes) {
	if(((type+"type") ==guess) || type==guess) {
	valtype++; break;
	}
	}


	for(const tier of allTiers) {
	if(tier==this.tierSwap(guess)) {
	valtier++; break;
	}
	}

	for (const abil of Games.getAbilitiesList()) {
	if(this.sanctify(abil.id) == guess){
		valabil++; break;
	}

	}

	for(const poke of pokemonList) {
		if(this.sanctify(poke.name).replace('.','') == guess.replace('.','')) {
			valpoke++; break;
		}

	}
	
	for(const stat of allStats){
		
		if(guess.substring(0,this.findSmallestNonZero(moreindex,lessindex,eqindex)) == stat){
			valstat++; break;
		
		}
	}

	for(const col of allCols) {
		if(guess == col) {
			valcolor++; break;
		}
	}

	for(const egg of allEggs){
		if(guess == egg+"group" || guess==egg) {
			valegg++; break;
		}

	}
statflag=valstat!=0;
this.valpoke=valpoke;
this.statflag=statflag;
this.colorflag=valcolor!=0;
this.eggflag=valegg!=0;

if(guess==this.sanctify(real_poke.abilities[0]) || guess==this.sanctify(String(real_poke.abilities[1])) ||
 guess==this.sanctify(String(real_poke.abilities['H'])) || guess==this.sanctify(String(real_poke.abilities['S'])))
	abilflag=true; 
else abilflag=false;

if(guess==this.sanctify(real_poke.eggGroups[0]) || guess==this.sanctify(real_poke.eggGroups[1]))
	eggflag=true;
else eggflag=false;

if(guess==this.sanctify(real_poke.color))
	colorflag=true;
else colorflag=false;

if(valmove) {
	for (const move of Dex.getAllPossibleMoves(real_poke)) {
	if(this.sanctify(move) == guess){
		moveflag=true; break;
	} else
	moveflag=false;

	}		

	}

		if(valtype) {

			for (const name of real_poke.types) {
				let condition = (guess == this.sanctify(name));
				let condition2 = ((guess) == this.sanctify(name+"type"));				
				if (condition || condition2) {typeflag=true; break;
				} else typeflag = false;
					
				}
			}

		if(valstat){
			
			let max_affected_stat = (Math.max(Math.max(moreindex,lessindex),eqindex));
			let metric=guess.substring(0,max_affected_stat);
		
			let metval=guess.substring(max_affected_stat+1,guess.length);
			let raw_stat=-1;
			let value=parseFloat(metval);
			if(metric.charAt(metric.length-1) == "<" || metric.charAt(metric.length-1) == ">")
				metric=metric.substring(0,metric.length-1);

			if(value==NaN || value<0)
			{
				this.say("You did not enter a valid numeric stat.");
				return false;
			}
			if(metric=="hp" || metric == "hitpoints")
				raw_stat = Object.values(real_poke.baseStats)[0];
			else if(metric=="atk" || metric == "attack")
				raw_stat = Object.values(real_poke.baseStats)[1];
			else if(metric=="def" || metric == "defense")
				raw_stat = Object.values(real_poke.baseStats)[2];
			else if(metric=="spa" || metric == "spatk" || metric == "specialattack" || metric == "spc" || metric == "special")
				raw_stat = Object.values(real_poke.baseStats)[3];
			else if(metric=="spd" || metric == "spdef" || metric == "specialdefense")
				raw_stat = Object.values(real_poke.baseStats)[4];
			else if(metric=="spe" || metric == "speed")
				raw_stat = Object.values(real_poke.baseStats)[5];
			else if(metric=="bst" || metric == "basestattotal")
				raw_stat = this.getBST(real_poke);
			else if(metric=="ht" || metric == "height")
				raw_stat = (real_poke.heightm);
			else if(metric=="wt" || metric == "weight")
				raw_stat = (real_poke.weightkg);

			
			if(eqindex>0)
				statcon = (raw_stat == value);
			if(moreindex>0)
				statcon = (statcon || raw_stat > value);
			if(lessindex>0)
				statcon = (statcon || raw_stat < value);
		} 
		

			this.abilflag=valabil!=0;
			this.typeflag=valtype!=0;
			this.moveflag=valmove!=0;
			this.tierflag=valtier!=0;
			if(this.mega_weak_list && this.currentPlayer !=null)
			weak_list = String(this.mega_weak_list.get(this.currentPlayer));
		else weak_list ="none";
		if(this.mega_res_list && this.currentPlayer !=null)
			res_list = String(this.mega_res_list.get(this.currentPlayer));
		else res_list= "none;";

			if (moveflag && valmove>0){ 
				finres=true;
				//this.say("**YES, move is learnt.**"); 
			}
			else if(!moveflag && valmove>0) { 
				//this.say("**NO, move is NOT learnt.**"); 
			}
 			else if (typeflag && valtype>0) {
 				finres=true;
 				//this.say("**YES, type is matched.**");  
 			} 
 			else if (!typeflag && valtype>0) {
 				//this.say("**NO, type is NOT matched.**");
 			}
 			else if (tierflag && valtier>0) {
 				finres=true;
 				//this.say("**YES, tier is matched.**");
 			}
 			else if (!tierflag && valtier>0) {
 				//this.say("**NO, tier is NOT matched.**"); 
 			}
 			else if (abilflag && valabil>0) {
 				finres=true;
 				//this.say("**YES, abiliy is matched**");
 			}
 			else if (!abilflag && valabil>0 ) {
 				//this.say("**NO, ability is NOT matched.**"); 
 			}
 			else if (eggflag && valegg>0) {
 				finres=true;
 				//this.say("**YES, egg group is matched**");
 			}
 			else if (!eggflag && valegg>0 ) {
 				//this.say("**NO, egg group is NOT matched.**"); 
 			}
 			else if (colorflag && valcolor>0) {
 				finres=true;
 				//this.say("**YES, color is matched**");
 			}
 			else if (!colorflag && valcolor>0 ) {
 				//this.say("**NO, color is NOT matched.**"); 
 			}
 			else if ( !monoflag && !genflag && !formflag && !evoflag && !valpoke && 
 				!statflag  && !colorflag && !valstat && !megaflag && !alolaflag && !galarflag && !totemflag && !gmaxflag) {
 					var am_i_weak = guess.indexOf("weak");
 					if(am_i_weak<0)
 						am_i_weak=-99;
 					var am_i_res = guess.indexOf("resists");
 					if(am_i_res<0)
 						am_i_res=-99;
 					var present;
 					if(am_i_res >= 0 || am_i_weak >=0){

 					guess=this.sanctify(guess.substring(Math.max(am_i_weak+4,am_i_res+7),guess.length));
 					var metatype=0;
 					for(const type of allTypes) {
						if(((type+"type") ==guess) || type==guess) {
						metatype++; break;
						}
						}
					if(metatype==0) {
						this.say("Invalid type.");
						return false;
					} else {

 					if(am_i_weak>=0 && am_i_res <0) {
 						present=(weak_list.includes(guess));
 						weakflag=true;
 						this.weakflag=weakflag;
 						if(present) {
 							finres=true;	
 					//	this.say("**YES, the Pokemon is weak to that type.**");
 					}
 					
 						else {
 						//this.say("**NO, the Pokemon is NOT weak to that type.**")
 					}

 					}

 					if(am_i_res>=0 && am_i_weak<0) {
 						present=(res_list.includes(guess));
 						resflag=true;
 						this.resflag=resflag;
 						//this.say("My present to you is "+present+ " found from "+res_list);

 						if(present) {
 							finres=true;	
 						//this.say("**YES, the Pokemon does resist that type.**");
 					}
 				
 					else {
 						//this.say("**NO, the Pokemon does NOT resist that type.**")
 					}

 					}

 					}
 				}
			}

 					else if(monoflag)
 						if((real_poke.types.length==1)) {
 							finres=true;	
 						//	this.say("**YES, the pokemon is monotype.**");
 						}
 						else {
 						//	this.say("**NO, the pokemon is NOT monotype.**");
 						}

 						else if(megaflag)
 						if((real_poke_name.includes("-Mega"))) {
 							finres=true;	
 						//	this.say("**YES, the pokemon is mega.**");
 						}
 						else {
 							//this.say("**NO, the pokemon is NOT mega.**");
 						}

 						else if(alolaflag)
 						if((real_poke_name.includes("-Alola"))) {
 							finres=true;	
 						//	this.say("**YES, the pokemon is alola.**");
 						}
 						else {
 						//	this.say("**NO, the pokemon is NOT alola.**");
 						}

 						else if(galarflag)
 						if((real_poke_name.includes("-Galar"))) {
 							finres=true;	
 						//	this.say("**YES, the pokemon is galar.**");
 						}
 						else {
 						//	this.say("**NO, the pokemon is NOT galar.**");
 						}

 						else if(totemflag)
 						if((real_poke_name.includes("-Totem"))) {
 							finres=true;	
 						//	this.say("**YES, the pokemon is totem.**");
 						}
 						else {
 						//	this.say("**NO, the pokemon is NOT totem.**");
 						}

 						else if(gmaxflag)
 						if((real_poke_name.includes("-Gmax"))) {
 							finres=true;	
 						//	this.say("**YES, the pokemon is a gmax.**");
 						}
 						else {
 						//	this.say("**NO, the pokemon is NOT a gmax.**");
 						}


 						

 					else if (genflag && valgen != NaN && (valgen > 0 && valgen < 10))
 						if(valgen == real_poke.gen){
 							finres=true;	
 						//	this.say("**YES, the pokemon is from that generation**");
 						}
 						else{
 						//	this.say("**NO, the pokemon is NOT from that generation.**");
 						}

 					else if(formflag)
 						if((real_poke_name.includes("-")) && !(real_poke_name == "Porygon-Z") && !(real_poke_name == "Jangmo-o") && 
 							!(real_poke_name == "Hakamo-o") && !(real_poke_name == "Kommo-o")) {
 							finres=true;	
 						//	this.say("**YES, the pokemon is a forme**");
 						}
 						else {
 						//	this.say("**NO, the pokemon is NOT a forme.**");
 						}

 					else if(evoflag)
 						if((real_poke.evos.length <=0)) {
 							finres=true;	
 						//	this.say("**YES, the pokemon is fully evolved**");
 						}
 						else {
 						//	this.say("**NO, the pokemon is NOT fully evolved**");
 						}

 					else if(statflag)
 						if(statcon){
 							finres=true;
 						//	this.say("**YES**, the stat falls in the specified range.");
 						}
 						else {
 						//	this.say("**NO**, the stat does NOT fall in the specified range.")
 						}

 					else if(valpoke>0)
 						if(guess.replace(".","")==this.sanctify(real_poke_name).replace(".","")) {
 							finres=true;
 							
 							if(this.currentPlayer) {
							this.say("**Correct!** " + this.currentPlayer.name+" has guessed their Pokemon.");
							this.points.set(this.currentPlayer, 1);

						}
 						}
 					
 						else {
 							 
 							if(this.currentPlayer) {

 							this.say("**Incorrect!** "+this.currentPlayer.name+" has been eliminated for the wrong guess. Their Pokemon was "+
 								real_poke_name+".");
 							this.eliminatePlayer(this.currentPlayer);
 						}

 						}

 	//		else
 	//			this.say("**NO. blanket case.**"); 


 		//	this.say("in order, they are " + !monoflag + !genflag + !formflag + !evoflag + !valpoke + 
 		//		!statflag  + !colorflag + !valstat);

 		if(negation) finres=!finres;
		return finres;
	}

	switchPlayer() : void {
		this.invalid_prompt = false;
		if (this.timeout) clearTimeout(this.timeout);
		if(this.currentPlayer == null || ! (this.roundPlayerOrder) || this.roundPlayerOrder.length < 1) {this.onNextRound();}
		master_index++;

		//if(master_index == 0)
	
		//this.say(this.roundPlayerOrder.length+" players are left.");
		if(master_index >= this.roundPlayerOrder.length ) {
			master_index = 0;
			this.say("All players have taken their turns, moving to the next round~");
			this.nextRound();
		} else {
				
		this.currentPlayer = this.roundPlayerOrder[master_index];
		if(!this.currentPlayer) {
			this.currentPlayer = this.roundPlayerOrder[0]; 
			master_index = 0;
		    this.say("current player undefined(why?), he has been reset to the first available and is now "+this.currentPlayer.name); 
		}
		if(master_index>0)
			this.say("**"+this.currentPlayer.name+"** it is your turn now!");
		this.timeout = setTimeout(() => this.fancyElim(), (round_timer) * 1000);
	
	}

	}

	fancyElim() : void {
		if(this.currentPlayer && this.frozen_list.get(this.currentPlayer)) {
			this.say("Timer DQ for "+this.currentPlayer.name+".");
			this.eliminatePlayer(this.currentPlayer);
		}
		else if(this.currentPlayer && !this.frozen_list.get(this.currentPlayer)) {
			this.say(this.currentPlayer.name+" has been skipped for this turn, any further skipped turns result in their elimination.");
			this.frozen_list.set(this.currentPlayer, true);
		}
		this.switchPlayer();
	}

	


	onNextRound(): void {


		if (this.timeout) clearTimeout(this.timeout);
		
		if (this.getRemainingPlayerCount() < 1 && !this.win_flag)
		{
			this.say("Everyone has been eliminated!");
			this.say("No winners this game!");
			this.end();
			return;
		}
		if (this.currentPlayer) {
			if (this.addPlayerInactiveRound(this.currentPlayer)) {
				if(valid_question < 0) {
				this.say(this.currentPlayer.name + " did not guess a parameter or the Pokemon and has been eliminated from " +
					"the game!");
				this.eliminatePlayer(this.currentPlayer);
				}
			} 
		}
		var win2 = false;

		for (const id in this.players) {
			if (this.players[id].eliminated) continue;
			const player = this.players[id];
			const points = this.points.get(player);
		
			if (points && points > 0) {
				if(!win2)
				this.say("Some guesses have been correct!");
				win2= true;
				this.onEnd();
			}
		}
		if(MAX_GUESSES==1){
			this.say("The **last round** has started! Now's the time to use .guess [pokemon] to have a chance at winning.")
		}
		if(MAX_GUESSES<=0) {
			this.say("Twenty rounds have elapsed! The game is now concluding.");
			win2=true;
		}
		MAX_GUESSES--;

		if(win2) {this.announceWinners(); this.end();}
		if(!win2){
		
		this.roundPlayerOrder = this.shufflePlayers();
			this.playerOrder = this.roundPlayerOrder.slice();
			this.sayUhtml(this.uhtmlBaseName + '-round-html', this.getRoundHtml(players => this.getPlayerPoints(players)));

		if (!this.playerOrder.length) {			
			this.playerOrder = this.roundPlayerOrder;
		}

		const currentPlayer = this.playerOrder[0];
		this.playerOrder.shift();
		if (currentPlayer.eliminated ) {this.say("onnextround's case, player switching now"); this.fancyElim();}

		const text = "**" + currentPlayer.name + "** you are up!";
		this.on(text, () => {
			this.currentPlayer = currentPlayer;
			this.timeout = setTimeout(() => this.fancyElim(), (round_timer) * 1000);
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
			if(player !== this.currentPlayer && this.currentPlayer) {
				this.say("__"+this.currentPlayer.name+"__ should be the one currently asking.");
				return false;
			}
			var alternatives = target.split("|");
			if(!alternatives || alternatives.length < 1) alternatives = ["meow"];
			if(alternatives.length > 5) {
				this.say("You're asking too many questions in one go, try asking less. (You can ask again).");
				return false;
			}
			var effectiveCondition  = false;
			valid_question = 0;
			for(const each of alternatives) {
				if(each == "") continue;

				effectiveCondition = effectiveCondition || this.parser(each,player);
				if(this.tierflag || this.eggflag || this.colorflag || this.statflag || this.moveflag || 
					this.typeflag || this.monoflag || this.genflag || this.formflag || this.evoflag || 
					this.valpoke>0 || this.resflag || this.weakflag || this.abilflag || this.megaflag ||
					this.alolaflag || this.galarflag || this.totemflag || this.gmaxflag)
					valid_question=1;
				
			}

			
			if(valid_question !=1 && this.invalid_prompt==false) {
				this.say("That wasn't a valid question. Try again!");

			}
			this.invalid_prompt=true;
			if(valid_question == 1) {
				if (this.timeout) clearTimeout(this.timeout);
			

			if(effectiveCondition) {
				this.say("**Yes!**");			

				
			}
			else {
				this.say("**No!**");
				
			}
			this.timeout = setTimeout(() => this.switchPlayer(), (turn_timer) * 1000);

		}
			
			return true;
		},
		aliases: ['g'],
	},
};

export const game: IGameFile<DittosWhoAmI> = {
	aliases: ["dittos", "q3", "quack3"],
	category: 'puzzle',
	class: DittosWhoAmI,
	commands,
	commandDescriptions: [Config.commandCharacter + 'g [Pokemon]', Config.commandCharacter + 'g [parameter]'],
	description: "At the start of the game, all players are assigned a different Pokemon." +
	" Each round, players must ask 'yes' or 'no' questions in chat to guess what Pokemon they were assigned!",
	name: "Ditto's Who Am I",
	freejoin:false,
	mascot: "Ditto",
	nonTrivialLoadData: true,
	
};

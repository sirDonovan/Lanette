import { Player } from "../../room-activity";
import { Game } from "../../room-game";
import { Room } from "../../rooms";
import { GameDifficulty, IUserHostedFile } from "../../types/games";
import { User } from "../../users";

const timeLimit = 25 * 60 * 1000;

export class UserHosted extends Game {
	endTime: number = 0;
	gameTimer: NodeJS.Timer | null = null;
	hostId: string = '';
	hostName: string = '';
	hostTimeout: NodeJS.Timer | null = null;
	readonly points = new Map<Player, number>();
	savedWinners: Player[] | null = null;
	scoreCap: number = 0;
	storedMessage: string | null = null;
	twist: string | null = null;
	isUserHosted = true;

	// type hack for onDeallocate
	room!: Room;

	onInitialize() {
		this.endTime = Date.now() + timeLimit;
		this.nameWithOptions = this.hostName + "'s " + this.nameWithOptions;
		this.uhtmlBaseName = 'userhosted-' + this.id;
	}

	setHost(host: User | string) {
		if (typeof host === 'string') {
			this.hostId = Tools.toId(host);
			this.hostName = host;
		} else {
			this.hostId = host.id;
			this.hostName = host.name;
		}
	}

	onDeallocate() {
		if (this.gameTimer) clearTimeout(this.gameTimer);
		if (this.hostTimeout) clearTimeout(this.hostTimeout);
		this.room.userHostedGame = null;
	}

	onSignups() {
		this.notifyRankSignups = true;
		this.sayCommand("/notifyrank all, " + this.room.title + " user-hosted game," + this.name + "," + this.hostName + " is hosting a hostgame of " + this.name, true);
		const firstWarning = 5 * 60 * 1000;
		const secondWarning = 30 * 1000;
		this.hostTimeout = setTimeout(() => {
			this.say(this.hostName + " you have " + Tools.toDurationString(firstWarning) + " left! Please start to finish up your game.");
			this.hostTimeout = setTimeout(() => {
				this.say(this.hostName + " you have " + Tools.toDurationString(secondWarning) + " left! Please declare the winner(s) with .win.");
				this.hostTimeout = setTimeout(() => {
					this.say(this.hostName + " your time is up!");
					this.end();
				}, secondWarning);
			}, firstWarning - secondWarning);
		}, timeLimit - firstWarning);
	}

	onEnd() {
		let hostDifficulty: GameDifficulty;
		if (Config.userHostedGameHostDifficulties && this.format.id in Config.userHostedGameHostDifficulties) {
			hostDifficulty = Config.userHostedGameHostDifficulties[this.format.id];
		} else {
			hostDifficulty = 'medium';
		}

		let hostBits: number;
		if (hostDifficulty === 'easy') {
			hostBits = 300;
		} else if (hostDifficulty === 'medium') {
			hostBits = 400;
		} else if (hostDifficulty === 'hard') {
			hostBits = 500;
		}
		if (this.shinyMascot) hostBits! *= 2;
		Storage.addPoints(this.room as Room, this.hostName, hostBits!, 'userhosted');
		const user = Users.get(this.hostName);
		if (user) user.say("You were awarded " + hostBits! + " bits! To see your total amount, use this command: ``" + Config.commandCharacter + "bits " + (this.room as Room).title + "``. Thanks for your efforts, we hope you host again soon!");
	}
}

export const game: IUserHostedFile<UserHosted> = {
	class: UserHosted,
	formats: [
		{
			name: "Floette's Forum Game",
			mascot: "Floette-eternal",
			description: "A game from Game Corner's official forum.",
			aliases: ['ffg'],
		},
		{
			name: "Acrotopia",
			description: "Each round, players earn points by coming up with creative interpretations of an acronym chosen by the host",
			freejoin: true,
		},
		{
			name: "Battle Maison",
			aliases: ['bm'],
			description: "A tournament style game where each player is given a Pokemon to battle with in [Gen 7] OU. Defeating an opponent allows the player to add the opponent’s Pokemon to his or her team. This continues until there is only one player left standing!",
		},
		{
			name: "Buneary's Bountiful Buffet",
			mascot: "Buneary",
			aliases: ['BBB', 'Bunearys'],
			description: "Players try to choose the meals for maximum points, but meals picked by multiple people are shared!",
		},
		{
			name: "Commonyms",
			description: "Players must find the word that applies to all of the words in the puzzle Ex: sky, jay, sad | Answer: blue",
			freejoin: true,
		},
		{
			name: "Counting",
			description: "Players have to do .count in the right order based on the given category (numbers, words or etc.). The first person to mess up the sequence loses a point, so be careful!",
		},
		{
			name: "Delcatty's Hide and Seek",
			mascot: "Delcatty",
			aliases: ['DHS', 'Delcattys'],
			description: "Each round, the host will give a param that determines Pokemon players can hide behind (by PMing the host). One player will be chosen to seek one Pokemon. If anyone hid behind it, they are eliminated. If not, the seeker is eliminated.",
		},
		{
			name: "Diddly Dice",
			aliases: ['DD', 'DDice'],
			description: "Players bid numbers from 1-100 and after 30 seconds, the player with highest bid is chosen. Then, a random number from 1-100 is chosen. If the number is greater than or equal to the player's bid, that player wins, but if is lesser, then that player is eliminated.",
		},
		{
			name: "Dugtrio's Dex Entries",
			mascot: "Dugtrio",
			aliases: ['DDE'],
			description: "Each round players create a brand new Pokedex entry for each Pokemon the host presents. Entries are judged by creativity and originality.",
			freejoin: true,
		},
		{
			name: "Empoleon's Empires",
			mascot: "Empoleon",
			aliases: ['Empires', 'Empoleons'],
			description: "Each player PMs the host an alias that they will use for the game (fake aliases may be added by the host). Each round, a player guesses who owns an alias. If correct, the owner is eliminated. Otherwise, the player who is guessed goes. The last player standing wins!",
		},
		{
			name: "Excluded",
			description: "Players try to guess pokemon that aren't excluded by the parameter..",
		},
		{
			name: "Gameathlon",
			description: "A series of Game Corner games in one! Players try to win each mini-game to earn points.",
		},
		{
			name: "Ghost",
			description: "Each player adds a letter to a string of letters while trying not to form an English word on their turn. If a word is formed, that player is eliminated. Players may challenge the previous player for elimination if there is no word that can be formed from the existing string.",
		},
		{
			name: "Guess That Auth",
			description: "Players guess users that have matching global and room auth as the lists presented by the host.",
			aliases: ['gta'],
			freejoin: true,
		},
		{
			name: "Hunger Games",
			description: "This is a game of storytelling, decision-making, swift responses, and chance! The host will create a scenario in which players have to choose their paths and overcome obstacles to be the last one standing.",
			aliases: ['hg'],
			approvedHostOnly: true,
		},
		{
			name: "Hypno's Hunches",
			mascot: "Hypno",
			aliases: ['Hunches', 'Hypnos'],
			description: "A variation of hangman where the blanks aren't revealed!",
			freejoin: true,
		},
		{
			name: "Jigglypuff's Dodgeball",
			mascot: "Jigglypuff",
			aliases: ['Dodgeball', 'Jigglypuffs'],
			description: "Players await Jigglypuff's THROW signal to eliminate the opposing team!",
		},
		{
			name: "Jynx's Klutsy Kissing",
			mascot: "Jynx",
			aliases: ['JKK'],
			description: "Kiss the Pokemon with gender differences to win! Use the command ''.kiss'' on the Pokemon you believe has different sprites when it is female or male.",
			freejoin: true,
		},
		{
			name: "Letter Getter",
			description: "In this game, players must complete the phrase with the given letters and (optional) numbers. Example: __26 L of the A__ would be __26 Letters of the Alphabet__.",
			freejoin: true,
		},
		{
			name: "Luig-E's Challenge",
			aliases: ['Luiges'],
			description: "Each round the players decide to either attack, counter or rest to take down Luig-E. However, Luig-E picks a move and can attack too, so be careful with your picks!",
		},
		{
			name: "Lyrics",
			description: "Players have to guess the names and singers of songs based on lyrics presented by the host.",
			freejoin: true,
		},
		{
			name: "Mad Gabs",
			description: "The host gives the pronunciation of a word and players have to correctly identify the word to score points.",
			freejoin: true,
		},
		{
			name: "Magcargo's Weak Spot ",
			mascot: "Magcargo",
			aliases: ['weakspot', 'Magcargos'],
			description: "Players guess the weakness(es) that the given Pokemon share!",
			freejoin: true,
		},
		{
			name: "Mascots",
			description: "Each round the host will provide a song and players must find a Pokemon that best represents it using the standard formatting --[Pokemon]--.",
			freejoin: true,
		},
		{
			name: "Mega Mania",
			description: "Each round players make mega evolutions for a Pokemon given by the host. Entries are judged on creativity and viability made through typing, stats, and abilities.",
			freejoin: true,
		},
		{
			name: "Metagross' Mind Mash",
			mascot: "Metagross",
			aliases: ['mmm', 'metagrosssmindmash'],
			description: "Players answer riddles within the time limit to survive each round!",
			freejoin: true,
		},
		{
			name: "Mimics",
			description: "Be the 2nd player to say the host's phrase exactly! Use deception to trick competitors into saying the host's phrase to earn points. Formatting does not count unless stated otherwise by the host.",
			freejoin: true,
		},
		{
			name: "Nickgames",
			description: "Each round the host will announce a Pokemon and players must create the most funny, clever, cute, creative, or fitting nickname for it using the standard formatting --[nickname]--.",
			freejoin: true,
		},
		{
			name: "Pachirisu's Picking Process",
			mascot: 'Pachirisu',
			aliases: ['pachirisus'],
			description: "'A random Pokemon is displayed by the host and the players have to either recommend or not recommend it. Then, the host will display another random Pokemon. If the 1st Pokemon wins type-wise, the players that recommended it win a point and vice-versa!",
			freejoin: true,
		},
		{
			name: "Piplup's Letter Placements",
			mascot: "Piplup",
			aliases: ['PLP', 'Piplups'],
			description: "A category and 3 letters will be shown each round. Players must find something in that category that contains those letters side by side in the order given.",
			freejoin: true,
		},
		{
			name: "Pokemath",
			description: "Players solve math problems using Pokemon dex numbers. Answers are submitted as Pokemon names.",
			freejoin: true,
		},
		{
			name: "Porygon's Movesearch Match",
			mascot: "Porygon",
			description: "Players guess Pokemon based on the given movesets!",
			aliases: ['porygons', 'pmm'],
			freejoin: true,
		},
		{
			name: "Precise Timing",
			aliases: ['pt'],
			description: "Each round the host will set a timer and players must do <code>/me check</code> before time runs out. The catch: the first one to check in is eliminated.",
		},
		{
			name: "Private Objects",
			description: "Each round, the host selects a topic, and players have to PM the host with an answer. The host selects a response and players will have to identify the respondent to gain points. If no one manages to correctly identify the player, that player will instead get the point.",
			aliases: ['po'],
		},
		{
			name: "Probopass' Letter Station",
			mascot: "Probopass",
			description: "A letter is picked and players have to name something that starts with that letter that also matches the given parameters!",
			aliases: ['PLS'],
			freejoin: true,
		},
		{
			name: "Pun Game",
			description: "Players make creative puns referencing the Pokemon selected by the host to score points.",
			freejoin: true,
		},
		{
			name: "Rapid CAP",
			description: "Each round, players will create Pokemon based on the typing given by the host, including the species, name, and ability(ies) in their answers. Dex entries are not required, but may give a player an edge over the rest of the competition.",
			freejoin: true,
		},
		{
			name: "Rock Paras Scizor",
			aliases: ["RPS"],
			description: "A Pokemon themed rock paper scissors tournament where typings determine the winner. PM a Pokemon to the host in hopes of having a type advantage over your opponent. More info: https://docs.google.com/document/d/1H6bRZlxJSfNZvqzxnbTyV2RiXABtuVgZdprTNEfn6bk",
		},
		{
			name: "Rotom-Dex's Trivia",
			mascot: "Rotom",
			description: "A dex entry of a Pokemon will be posted and players have to be first to guess the Pokemon correctly!",
			aliases: ['RDT', 'rotomdexs'],
			freejoin: true,
		},
		{
			name: "Russian Rowlet",
			mascot: "Rowlet",
			aliases: ['RR', 'Rowlets'],
			description: "Players pick a number between 1-7 and gain points based on what number they pick. First to 15 points wins!",
		},
		{
			name: "Sableye's Trick House",
			mascot: "Sableye",
			aliases: ['Trick House', 'TH', 'Sableyes'],
			description: "Players make their way through various rooms while avoiding the trap doors. Last person standing wins!",
		},
		{
			name: "Scizor's Clock Tower",
			mascot: "Scizor",
			aliases: ['Clock Tower', 'Scizors'],
			description: "Evade the Scizor as it tries to capture the players by selecting their doors and capturing its prey by being faster than them in a series of minigames! More info: https://www.tapatalk.com/groups/ps_game_corner/scizor-39-s-clock-tower-t803.html",
		},
		{
			name: "Scyther's Message Slide",
			mascot: "Scyther",
			description: "Players have to PM the host. Depending on the order in which they PMed, they can win or lose points!",
			aliases: ['SMS'],
			freejoin: true,
		},
		{
			name: "Similarities",
			description: "Each round, the host names three objects (Pokémon related or not) and players must guess what the similarity between the three is.",
			freejoin: true,
		},
		{
			name: "Simon Says",
			description: "Each round, the host will announce an action. If the action is preceded by 'Simon Says', players must do the action using <code>/me [action]</code>. If players do the action when it is not preceded by 'Simon Says', they are eliminated.",
		},
		{
			name: "Smeargle's Move Parameters",
			mascot: "Smeargle",
			aliases: ['MoveParameters', 'MoveParams', 'Smeargles'],
			description: "Players search for possible /movesearch parameters that result in the given move list!",
			freejoin: true,
		},
		{
			name: "Spot The Reference",
			description: "Players must identify the source (who said it, movie/tv show title, etc.) of a quote",
			aliases: ['str'],
			freejoin: true,
		},
		{
			name: "Spyfall",
			description: "Each player is sent the location for the game and a unique job. If a player is chosen to be the spy, only they will know and they will not receive the location. By asking questions in turns, the spy tries to guess the location and the other players try to discover the spy.",
		},
		{
			name: "The Chosen One",
			description: "The host PMs a selected player three words. A timer is set and all players have a conversation in the chat, in which the selected player must use all three words. After the timer ends, all players PM the host who they think was The Chosen One.",
			aliases: ['tco', 'chosenone'],
		},
		{
			name: "The Evo Game",
			description: "Each round the host will announce a Pokemon and players must create an evolution, providing the species, typing, ability(ies), and dex entry.",
			aliases: ['evogame'],
			freejoin: true,
		},
		{
			name: "The Missing Link",
			description: "Players must find the missing word that completes both phrases! Example: Key _ Reaction (Chain)",
			aliases: ['missinglink', 'tml'],
			freejoin: true,
		},
		{
			name: "Two Truths and a Lie",
			description: "Each round, the host presents the players with three statements. Players have to correctly identify the lie to score points.",
			aliases: ['ttal', 'ttaal'],
			freejoin: true,
		},
		{
			name: "Voltorb's Tricks",
			mascot: "Voltorb",
			description: "Players try to win each mini-game to get a chance of catching opponents with a randomly chosen Poke Ball. Each Poke Ball has a different catch rate, and getting a Voltorb (or Electrode) may result in your own elimination!",
			aliases: ['voltorbs', 'vt'],
		},
		{
			name: "Weavile's Wicked Battlegrounds",
			mascot: "Weavile",
			description: "Each round, one player PMs the host a move while the other players PM the host a Pokemon. If a player's Pokemon resists the move or is immune to it, they win points. However, the more picked Pokemon the move hits super effectively, the more points the user gets",
			aliases: ['WWB'],
		},
		{
			name: "Wishiwashi's Stat Fishing",
			mascot: "Wishiwashi",
			aliases: ['Stat Fishing', 'Wishiwashis'],
			description: "Players await the [ ! ] signal to reel in Pokemon and earn points based on their stats!",
			freejoin: true,
		},
		{
			name: "Wonder Guard Wipeout",
			mascot: "Ditto",
			aliases: ['WGW'],
			description: "Players must use damaging moves that hit through the transforming Ditto's Wonder Guard (no repeats in a round)!",
			freejoin: true,
		},
		{
			name: "Zygarde's Orders",
			mascot: "Zygarde",
			aliases: ['Orders', 'Zygardes'],
			description: "A variation of hangman in which the host starts with a single letter. Instead of players guessing letters, the host will start to add more letters. Players have to be the first to guess the complete words to gain points.",
			freejoin: true,
		},
		{
			name: "20 Questions",
			description: "The host will choose either a Pokemon or real world object and players take turns asking yes/no questions to figure out what it is. The game ends if no one guesses correctly after 20 questions!",
			aliases: ['20q', '20qs'],
		},
	],
};

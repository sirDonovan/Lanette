import type { Player } from "../room-activity";
import { ScriptedGame } from "../room-game-scripted";
import type { GameCommandDefinitions, IGameFile } from "../types/games";

const MAX_WIDTH = 100;
const MAX_HEIGHT = 100;
const BASE_HORIZONTAL = 3;
const BASE_VERTICAL = 3;
const MAX_HORIZONTAL = 7;
const MAX_VERTICAL = 7;
const MAX_TOTAL_WIDTH = MAX_WIDTH * BASE_HORIZONTAL;
const MAX_TOTAL_HEIGHT = MAX_HEIGHT * BASE_VERTICAL;
const SPRITE_GENERATION = 'bw';

const letters = Tools.letters.toUpperCase().split("");
const data: {pokemon: string[]} = {
	pokemon: [],
};

class GyaradosShinyHunting extends ScriptedGame {
	canHunt: boolean = false;
	currentPokemon: string = '';
	lastPokemon: string = '';
	lastShinyCoordinates: [number, number] = [-1, -1];
	points = new Map<Player, number>();
	roundGridSize: [number, number] = [0, 0];
	shinyCoordinates: [number, number] = [-1, -1];

	static loadData(): void {
		data.pokemon = Games.getPokemonList(x => {
			if (x.forme || x.gen > 5) return false;
			const gifData = Dex.getGifData(x, SPRITE_GENERATION);
			return !!gifData && gifData.w <= MAX_WIDTH && gifData.h <= MAX_HEIGHT;
		}).map(x => x.name);
	}

	onSignups(): void {
		if (this.format.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
	}

	onStart(): void {
		this.nextRound();
	}

	onNextRound(): void {
		this.canHunt = false;

		let species = this.sampleOne(data.pokemon);
		while (species === this.lastPokemon) {
			species = this.sampleOne(data.pokemon);
		}
		this.lastPokemon = species;

		const pokemon = Dex.getExistingPokemon(species);
		this.currentPokemon = pokemon.name;

		const gifData = Dex.getGifData(pokemon, SPRITE_GENERATION)!;
		let horizontalCount = BASE_HORIZONTAL;
		while ((horizontalCount + 1) * gifData.w < MAX_TOTAL_WIDTH) {
			horizontalCount++;
			if (horizontalCount === MAX_HORIZONTAL) break;
		}

		let verticalCount = BASE_VERTICAL;
		while ((verticalCount + 1) * gifData.h < MAX_TOTAL_HEIGHT) {
			verticalCount++;
			if (verticalCount === MAX_VERTICAL) break;
		}

		let shinyCoordinates = [this.random(horizontalCount), this.random(verticalCount) + 1] as [number, number];
		while (shinyCoordinates[0] === this.lastShinyCoordinates[0] || shinyCoordinates[1] === this.lastShinyCoordinates[1]) {
			shinyCoordinates = [this.random(horizontalCount), this.random(verticalCount) + 1] as [number, number];
		}
		this.shinyCoordinates = shinyCoordinates;
		this.lastShinyCoordinates = shinyCoordinates;
		this.roundGridSize = [horizontalCount - 1, verticalCount];

		const tableWidth = (horizontalCount + 1) * (gifData.w + 2);
		const rowHeight = gifData.h + 2;
		let gridHtml = '<table align="center" border="1" ' +
			'style="color: black;font-weight: bold;text-align: center;table-layout: fixed;width: ' +
			tableWidth + 'px"><tr style="height:' + rowHeight + 'px"><td>&nbsp;</td>';
		for (let i = 0; i < horizontalCount; i++) {
			gridHtml += '<td style="background: ' + Tools.hexColorCodes["White"]["background"] + '">' + letters[i] + '</td>';
		}
		gridHtml += '</tr></table>';

		gridHtml += '<table align="center" border="1" ' +
			'style="color: black;font-weight: bold;text-align: center;table-layout: fixed;width: ' + tableWidth + 'px">';

		const gif = Dex.getPokemonGif(pokemon, SPRITE_GENERATION);
		const shinyGif = Dex.getPokemonGif(pokemon, SPRITE_GENERATION, undefined, true);
		for (let y = 1; y <= verticalCount; y++) {
			gridHtml += '<tr style="height:' + rowHeight + 'px">';
			gridHtml += '<td style="background: ' + Tools.hexColorCodes["White"]["background"] + '">' + y + '</td>';
			for (let x = 0; x < horizontalCount; x++) {
				gridHtml += '<td>';
				if (x === this.shinyCoordinates[0] && y === this.shinyCoordinates[1]) {
					gridHtml += shinyGif;
				} else {
					gridHtml += gif;
				}
				gridHtml += '</td>';
			}
			gridHtml += '</tr>';
		}
		gridHtml += '</table>';

		this.sayUhtml(this.uhtmlBaseName + '-round-html', this.getRoundHtml(players => this.getPlayerPoints(players)));

		const previewUhtmlName = this.uhtmlBaseName + '-preview';
		const previewHtml = "<center>Find the shiny <b>" + this.currentPokemon + "</b>!<br />" + gif + "&nbsp;" + shinyGif +
			"</center>";
		this.onUhtml(previewUhtmlName, previewHtml, () => {
			const gridUhtmlName = this.uhtmlBaseName + '-grid';
			this.onUhtml(gridUhtmlName, gridHtml, () => {
				this.canHunt = true;
				this.timeout = setTimeout(() => this.nextRound(), 30 * 1000);
			});
			this.timeout = setTimeout(() => this.sayUhtml(gridUhtmlName, gridHtml), 5000);
		});
		this.sayUhtml(previewUhtmlName, previewHtml);
	}
}

const commands: GameCommandDefinitions<GyaradosShinyHunting> = {
	hunt: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (!this.canHunt) return false;
			const player = this.createPlayer(user) || this.players[user.id];

			const targets = Tools.toId(target).split("");
			if (targets.length !== 2) {
				user.say("You must specify a letter and number corresponding to the grid.");
				return false;
			}

			const letter = targets[0].trim().toUpperCase();
			const letterIndex = letters.indexOf(letter);
			if (letterIndex === -1 || letterIndex > this.roundGridSize[0]) {
				user.say("You must specify a letter between " + letters[0] + " and " + letters[this.roundGridSize[0]] + "!");
				return false;
			}

			const number = parseInt(targets[1].trim());
			if (isNaN(number) || number < 1 || number > this.roundGridSize[1]) {
				user.say("You must specify a row between 1 and " + this.roundGridSize[1] + "!");
				return false;
			}

			if (letterIndex !== this.shinyCoordinates[0] || number !== this.shinyCoordinates[1]) {
				user.say("The shiny " + this.currentPokemon + " is not at " + letter + number + "!");
				return false;
			}

			if (this.timeout) clearTimeout(this.timeout);

			let points = this.points.get(player) || 0;
			points += 1;
			this.points.set(player, points);

			if (points === this.format.options.points) {
				this.say("**" + player.name + "** wins the game!");
				this.winners.set(player, 1);
				this.convertPointsToBits();
				this.end();
			} else {
				this.say("**" + player.name + "** advances to **" + points + "** point" + (points > 1 ? "s" : "") + "!");
				this.canHunt = false;
				this.timeout = setTimeout(() => this.nextRound(), 5000);
			}
			return true;
		},
	},
};

export const game: IGameFile<GyaradosShinyHunting> = {
	aliases: ["gyarados", "shinyhunting", "gsh"],
	category: 'visual',
	commandDescriptions: [Config.commandCharacter + "hunt [coordinates]"],
	commands,
	class: GyaradosShinyHunting,
	customizableOptions: {
		points: {min: 10, base: 10, max: 10},
	},
	description: "Each round players try to be the first to hunt the shiny Pokemon in the grid!",
	freejoin: true,
	name: "Gyarados' Shiny Hunting",
	mascot: "Gyarados",
};

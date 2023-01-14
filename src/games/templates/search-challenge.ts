import type { Player } from "../../room-activity";
import { ScriptedGame } from "../../room-game-scripted";
import type { Room } from "../../rooms";
import type { GameCategory, IBattleGameData, IGameTemplateFile } from "../../types/games";
import type { IFormat, IMove, IPokemon } from "../../types/pokemon-showdown";

export abstract class SearchChallenge extends ScriptedGame {
	readonly battleData = new Map<Room, IBattleGameData>();
	battleFormatId: string = 'gen9challengecup1v1';
	internalGame: boolean = true;

	banlist?: string[];

	// set in onInitialize
	battleFormat!: IFormat;

	declare readonly room: Room;

	afterInitialize(): void {
		this.battleFormat = Dex.getExistingFormat(this.battleFormatId);
		this.battleFormat.usablePokemon = Dex.getUsablePokemon(this.battleFormat);
	}

	meetsPokemonCriteria(pokemon: IPokemon, noTeamPreviewPokemon: readonly string[]): boolean {
		if (pokemon.battleOnly || !this.battleFormat.usablePokemon!.includes(pokemon.name) ||
			(this.banlist && this.banlist.includes(pokemon.name)) || noTeamPreviewPokemon.includes(pokemon.name) ||
			(pokemon.forme && noTeamPreviewPokemon.includes(pokemon.baseSpecies))) {
			return false;
		}

		return true;
	}

	announce(text: string): void {
		this.room.announce("**" + this.format.nameWithOptions + "**: " + text);
	}

	getPlayersFromBattleData(room: Room): [Player, Player] | null {
		const battleData = this.battleData.get(room);
		if (!battleData || battleData.slots.size < 2) return null;

		const players = battleData.slots.keys();
		const p1 = players.next().value as Player;
		const p2 = players.next().value as Player;

		return [p1, p2];
	}

	onBattlePlayer(room: Room, slot: string, username: string): void {
		const id = Tools.toId(username);
		if (!id || !(id in this.players)) return;

		let battleData = this.battleData.get(room);

		if (!battleData) {
			battleData = this.generateBattleData();
			this.battleData.set(room, battleData);
		}

		battleData.slots.set(this.players[id], slot);
	}

	onBattlePokemon(room: Room, slot: string, details: string): boolean {
		const battleData = this.battleData.get(room);
		if (!battleData) return false;

		const player = this.getBattleSlotPlayer(battleData, slot);
		if (!player) return false;

		if (!(slot in battleData.remainingPokemon)) battleData.remainingPokemon[slot] = 0;
		battleData.remainingPokemon[slot]++;

		const pokemon = Dex.getPokemon(details.split(',')[0]);
		if (!pokemon) return false;

		if (!(slot in battleData.pokemon)) battleData.pokemon[slot] = [];
		battleData.pokemon[slot].push(pokemon.name);

		if (this.registerTeamPreview) this.registerTeamPreview(player, pokemon, details);

		return this.ended ? false : true;
	}

	onBattleSwitch(room: Room, pokemonInfo: string, details: string): boolean {
		const battleData = this.battleData.get(room);
		if (!battleData) return false;

		const slot = pokemonInfo.substr(0, 2);
		const player = this.getBattleSlotPlayer(battleData, slot);
		if (!player) return false;

		if (this.registerSwitch) {
			let pokemon = Dex.getPokemon(details.split(',')[0]);
			if (!pokemon) {
				pokemon = Dex.getPokemon(pokemonInfo.substr(5).trim());
			}

			if (pokemon) this.registerSwitch(player, pokemon, details);
		}

		return this.ended ? false : true;
	}

	onBattleMove(room: Room, pokemonInfo: string, moveName: string): boolean {
		const battleData = this.battleData.get(room);
		if (!battleData) return false;

		const slot = pokemonInfo.substr(0, 2);
		const player = this.getBattleSlotPlayer(battleData, slot);
		if (!player) return false;

		if (this.registerMove) {
			const move = Dex.getMove(moveName);
			if (move) this.registerMove(player, move);
		}

		return this.ended ? false : true;
	}

	getObjectiveText?(): string;
	registerTeamPreview?(player: Player, pokemon: IPokemon, details: string): void;
	registerSwitch?(player: Player, pokemon: IPokemon, details: string): void;
	registerMove?(player: Player, move: IMove): void;
}

export const game: IGameTemplateFile<SearchChallenge> = {
	category: 'search-challenge' as GameCategory,
	searchChallenge: true,
	scriptedOnly: true,
};

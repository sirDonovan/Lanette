import buffer = require('buffer');
import path = require('path');
// eslint-disable-next-line @typescript-eslint/naming-convention
import worker_threads = require('worker_threads');

import * as tools from '../../tools';
import type { IAbility, IFormat, IItem, ILearnsetData, IMove, IPokemon, ITypeData } from '../../types/dex';
import type {
	IGetDataIdsMessage, IGetDataIdsOptions, IGetDataMessage, IGetDataOptions, IPokemonShowdownResponse, IPokemonShowdownWorkerData,
	PokemonShowdownId
} from '../pokemon-showdown';

interface IPSAbility extends DeepMutable<IAbility> {
	exists: boolean;
}

interface IPSFormat extends DeepMutable<IFormat> {
	checkLearnset?: () => void;
	exists: boolean;
}

interface IPSItem extends DeepMutable<IItem> {
	exists: boolean;
}

interface IPSLearnsetData extends DeepMutable<ILearnsetData> {
	exists: boolean;
}

interface IPSMove extends DeepMutable<IMove> {
	basePowerCallback?: () => void;
	exists: boolean;
}

interface IPSPokemon extends DeepMutable<IPokemon> {
	exists: boolean;
}

interface IPSTypeData extends DeepMutable<ITypeData> {
	exists: boolean;
}

interface IPokemonShowdownDex {
	data: {
		Aliases: Dict<string>;
		Abilities: Dict<string>;
		Items: Dict<string>;
		Formats: Dict<string>;
		Learnsets: Dict<string>;
		Moves: Dict<string>;
		Pokedex: Dict<string>;
		TypeChart: Dict<string>;
	}
	gen: number;
	getAbility: (name: string) => IPSAbility;
	getFormat: (name: string) => IPSFormat;
	getItem: (name: string) => IPSItem;
	getLearnsetData: (name: string) => IPSLearnsetData;
	getMove: (name: string) => IPSMove;
	getSpecies: (name: string) => IPSPokemon;
	getType: (name: string) => IPSTypeData;
	mod: (mod: string) => IPokemonShowdownDex;
}

interface IValidator {
	checkLearnset: (move: IMove, pokemon: IPokemon) => boolean;
	learnsetParent: (pokemon: IPokemon) => IPokemon | null;
}

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

// eslint-disable-next-line @typescript-eslint/naming-convention
const Tools = new tools.Tools();
// eslint-disable-next-line @typescript-eslint/naming-convention
const data = worker_threads.workerData as IPokemonShowdownWorkerData;
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
const pokemonShowdownDex = new (require(path.join(Tools.pokemonShowdownFolder, ".sim-dist", "dex.js")).ModdedDex)() as IPokemonShowdownDex;
const MAX_STRING_LENGTH = buffer.constants.MAX_STRING_LENGTH;

function getPostMessage(messageNumber: string, id: string, response: string): string {
	return messageNumber + "|" + id + "|" + response;
}

function isResponseTooLarge(heapLimit: number, messageNumber: string, id: string, response: string): boolean {
	const message = getPostMessage(messageNumber, id, response);
	return message.length >= MAX_STRING_LENGTH || Buffer.byteLength(message) >= heapLimit;
}

function batchObject<T>(object: T, responseDataKey: string, messageNumber: string, id: string, startIndex: number,
	availableHeapSize: number): {data: T; endIndex: number} {
	const keys: string[] = Object.keys(object);
	let responseObject: T = object;
	let totalAmount = keys.length;
	let endIndex = startIndex + totalAmount - 1;
	let response = {[responseDataKey]: responseObject, endIndex};
	let responseString = JSON.stringify({data: JSON.stringify(response)});
	let heapLimit = Tools.getHeapLimit();
	while (isResponseTooLarge(heapLimit, messageNumber, id, responseString) ||
		isResponseTooLarge(availableHeapSize, messageNumber, id, responseString)) {
		totalAmount = Math.floor(totalAmount / 2);
		endIndex = startIndex + totalAmount - 1;
		// @ts-expect-error
		responseObject = {};
		for (let i = 0; i < totalAmount; i++) {
			// @ts-expect-error
			responseObject[keys[i]] = object[keys[i]];
		}
		response = {[responseDataKey]: responseObject, endIndex};
		responseString = JSON.stringify({data: JSON.stringify(response)});
		heapLimit = Tools.getHeapLimit();
	}

	return {data: responseObject, endIndex};
}

function batchArray<T, U extends T[]>(array: U, responseDataKey: string, messageNumber: string, id: string, startIndex: number,
	availableHeapSize: number): {data: U; endIndex: number} {
	let responseObject: U = array;
	let totalAmount = array.length;
	let endIndex = startIndex + totalAmount - 1;
	let response = {[responseDataKey]: responseObject, endIndex};
	let responseString = JSON.stringify({data: JSON.stringify(response)});
	let heapLimit = Tools.getHeapLimit();
	while (isResponseTooLarge(heapLimit, messageNumber, id, responseString) ||
		isResponseTooLarge(availableHeapSize, messageNumber, id, responseString)) {
		totalAmount = Math.floor(totalAmount / 2);
		endIndex = startIndex + totalAmount - 1;
		// @ts-expect-error
		responseObject = array.slice(0, totalAmount);
		response = {[responseDataKey]: responseObject, endIndex};
		responseString = JSON.stringify({data: JSON.stringify(response)});
		heapLimit = Tools.getHeapLimit();
	}

	return {data: responseObject, endIndex};
}

function removeObjectFunctions<T>(object: T): void {
	const keys = Object.keys(object) as (keyof T)[];
	for (const key of keys) {
		if (typeof object[key] === 'function') delete object[key];
	}
}

function getAbilities(messageNumber: string, id: string, options: IGetDataOptions): IPokemonShowdownResponse {
	const dex = pokemonShowdownDex.mod(options.mod);
	const abilities: IAbility[] = [];
	const length = options.keys.length;
	for (let i = options.startIndex; i < length; i++) {
		const ability = dex.getAbility(options.keys[i]);
		removeObjectFunctions(ability);
		abilities.push(ability);
	}

	const responseKey = "abilities";
	const batch = batchArray(abilities, responseKey, messageNumber, id, options.startIndex, options.availableHeapSize);

	return {data: JSON.stringify({[responseKey]: batch.data, endIndex: batch.endIndex})};
}

function getAbilityIds(options: IGetDataIdsOptions): IPokemonShowdownResponse {
	const dex = pokemonShowdownDex.mod(options.mod);
	if (!dex.data.Abilities) throw new Error("No PS abilities dex");
	const keys: string[] = [];
	for (const i in dex.data.Abilities) {
		const ability = dex.getAbility(i);
		if (!ability.exists || (ability.gen && ability.gen > dex.gen)) continue;
		keys.push(ability.id);
	}

	const aliases: Dict<string> = {};
	for (const i in dex.data.Aliases) {
		const ability = dex.getAbility(dex.data.Aliases[i]);
		if (!ability.exists || (ability.gen && ability.gen > dex.gen)) continue;
		aliases[i] = ability.id;
	}

	return {data: JSON.stringify({aliases, keys})};
}

function getAliases(options: IGetDataIdsOptions): IPokemonShowdownResponse {
	return {data: JSON.stringify(pokemonShowdownDex.data.Aliases)};
}

function getAllPossibleMoves(messageNumber: string, id: string, options: IGetDataOptions): IPokemonShowdownResponse {
	// eslint-disable-next-line max-len, @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
	const validator = new (require(path.join(Tools.pokemonShowdownFolder, ".sim-dist", "team-validator.js")).TeamValidator)(options.mod + 'ou') as IValidator;
	const dex = pokemonShowdownDex.mod(options.mod);

	const allPossibleMoves: Dict<string[]> = {};
	const length = options.keys.length;
	for (let i = options.startIndex; i < length; i++) {
		const pokemon = dex.getSpecies(options.keys[i]);

		let possibleMoves: string[] = [];
		let learnsetParent: IPokemon | null = pokemon;
		while (learnsetParent) {
			const learnsetData = dex.getLearnsetData(learnsetParent.id);
			if (!learnsetData.learnset) {
				if ((learnsetParent.changesFrom || learnsetParent.baseSpecies) !== learnsetParent.name) {
					// forme without its own learnset
					learnsetParent = dex.getSpecies(learnsetParent.changesFrom || learnsetParent.baseSpecies);
					// warning: formes with their own learnset, like Wormadam, should NOT
					// inherit from their base forme unless they're freely switchable
					continue;
				}
				break;
			}

			possibleMoves = possibleMoves.concat(Object.keys(learnsetData.learnset));

			const previousLearnsetParent: IPokemon = learnsetParent;
			learnsetParent = validator.learnsetParent(learnsetParent);
			// prevent recursion from calling validator.learnsetParent() directly
			if (learnsetParent && learnsetParent === previousLearnsetParent) break;
		}

		const checkedMoves: string[] = [];
		for (const i of possibleMoves) {
			const move = dex.getMove(i);
			if (!checkedMoves.includes(move.id) && !validator.checkLearnset(move, pokemon)) checkedMoves.push(move.id);
		}

		allPossibleMoves[pokemon.id] = checkedMoves;
	}

	const responseKey = "allPossibleMoves";
	const batch = batchObject(allPossibleMoves, responseKey, messageNumber, id, options.startIndex, options.availableHeapSize);

	return {data: JSON.stringify({[responseKey]: batch.data, endIndex: batch.endIndex})};
}

function getFormats(messageNumber: string, id: string, options: IGetDataOptions): IPokemonShowdownResponse {
	const dex = pokemonShowdownDex.mod(options.mod);
	const formats: IFormat[] = [];
	const length = options.keys.length;
	for (let i = options.startIndex; i < length; i++) {
		const format = dex.getFormat(options.keys[i]);
		if (format.checkLearnset) format.hasCheckLearnset = true;

		removeObjectFunctions(format);
		formats.push(format as IFormat);
	}

	const responseKey = "formats";
	const batch = batchArray(formats, responseKey, messageNumber, id, options.startIndex, options.availableHeapSize);

	return {data: JSON.stringify({[responseKey]: batch.data, endIndex: batch.endIndex})};
}

function getFormatIds(options: IGetDataIdsOptions): IPokemonShowdownResponse {
	const dex = pokemonShowdownDex.mod(options.mod);
	if (!dex.data.Formats) throw new Error("No PS formats dex");
	const keys: string[] = [];
	for (const i in dex.data.Formats) {
		const format = dex.getFormat(i);
		if (format.exists) keys.push(format.id);
	}

	const aliases: Dict<string> = {};
	for (const i in dex.data.Aliases) {
		const format = dex.getFormat(dex.data.Aliases[i]);
		if (format.exists) aliases[i] = format.id;
	}

	return {data: JSON.stringify({aliases, keys})};
}

function getItems(messageNumber: string, id: string, options: IGetDataOptions): IPokemonShowdownResponse {
	const dex = pokemonShowdownDex.mod(options.mod);
	const items: IItem[] = [];
	const length = options.keys.length;
	for (let i = options.startIndex; i < length; i++) {
		const item = dex.getItem(options.keys[i]);
		removeObjectFunctions(item);
		items.push(item);
	}

	const responseKey = "items";
	const batch = batchArray(items, responseKey, messageNumber, id, options.startIndex, options.availableHeapSize);

	return {data: JSON.stringify({[responseKey]: batch.data, endIndex: batch.endIndex})};
}

function getItemIds(options: IGetDataIdsOptions): IPokemonShowdownResponse {
	const dex = pokemonShowdownDex.mod(options.mod);
	if (!dex.data.Items) throw new Error("No PS items dex");
	const keys: string[] = [];
	for (const i in dex.data.Items) {
		const item = dex.getItem(i);
		if (!item.exists || (item.gen && item.gen > dex.gen)) continue;
		keys.push(item.id);
	}

	const aliases: Dict<string> = {};
	for (const i in dex.data.Aliases) {
		const item = dex.getItem(dex.data.Aliases[i]);
		if (!item.exists || (item.gen && item.gen > dex.gen)) continue;
		aliases[i] = item.id;
	}

	return {data: JSON.stringify({aliases, keys})};
}

function getLearnsetData(messageNumber: string, id: string, options: IGetDataOptions): IPokemonShowdownResponse {
	const dex = pokemonShowdownDex.mod(options.mod);
	const learnsets: Dict<ILearnsetData> = {};
	const length = options.keys.length;
	for (let i = options.startIndex; i < length; i++) {
		const learnsetData = dex.getLearnsetData(options.keys[i]);
		removeObjectFunctions(learnsetData);
		learnsetData.id = options.keys[i];
		learnsets[options.keys[i]] = learnsetData;
	}

	const responseKey = "learnsets";
	const batch = batchObject(learnsets, responseKey, messageNumber, id, options.startIndex, options.availableHeapSize);

	return {data: JSON.stringify({[responseKey]: batch.data, endIndex: batch.endIndex})};
}

function getLearnsetDataIds(options: IGetDataIdsOptions): IPokemonShowdownResponse {
	const dex = pokemonShowdownDex.mod(options.mod);
	if (!dex.data.Learnsets) throw new Error("No PS learnsets dex");
	const keys: string[] = [];
	for (const i in dex.data.Learnsets) {
		const species = dex.getSpecies(i);
		if (!species.exists || (species.gen && species.gen > dex.gen)) continue;

		const id = Tools.toId(i);
		const learnsetData = dex.getLearnsetData(id);
		if (learnsetData.exists) keys.push(id);
	}

	return {data: JSON.stringify({keys})};
}

function getMoves(messageNumber: string, id: string, options: IGetDataOptions): IPokemonShowdownResponse {
	const dex = pokemonShowdownDex.mod(options.mod);
	const moves: IMove[] = [];
	const length = options.keys.length;
	for (let i = options.startIndex; i < length; i++) {
		const move = dex.getMove(options.keys[i]);
		if (move.basePowerCallback) move.hasBasePowerCallback = true;

		removeObjectFunctions(move);
		moves.push(move);
	}

	const responseKey = "moves";
	const batch = batchArray(moves, responseKey, messageNumber, id, options.startIndex, options.availableHeapSize);

	return {data: JSON.stringify({[responseKey]: batch.data, endIndex: batch.endIndex})};
}

function getMoveIds(options: IGetDataIdsOptions): IPokemonShowdownResponse {
	const dex = pokemonShowdownDex.mod(options.mod);
	if (!dex.data.Moves) throw new Error("No PS moves dex");
	const keys: string[] = [];
	for (const i in dex.data.Moves) {
		const move = dex.getMove(i);
		if (!move.exists || (move.gen && move.gen > dex.gen)) continue;
		keys.push(move.realMove ? Tools.toId(move.name) : move.id);
	}

	const aliases: Dict<string> = {};
	for (const i in dex.data.Aliases) {
		const move = dex.getMove(dex.data.Aliases[i]);
		if (!move.exists || (move.gen && move.gen > dex.gen)) continue;
		aliases[i] = move.realMove ? Tools.toId(move.name) : move.id;
	}

	return {data: JSON.stringify({aliases, keys})};
}

function getSpecies(messageNumber: string, id: string, options: IGetDataOptions): IPokemonShowdownResponse {
	const dex = pokemonShowdownDex.mod(options.mod);
	const pokemon: IPokemon[] = [];
	const length = options.keys.length;
	for (let i = options.startIndex; i < length; i++) {
		const species = dex.getSpecies(options.keys[i]);
		if (species.tier === '(PU)') species.tier = 'ZU';

		removeObjectFunctions(species);
		pokemon.push(species);
	}

	const responseKey = "pokemon";
	const batch = batchArray(pokemon, responseKey, messageNumber, id, options.startIndex, options.availableHeapSize);

	return {data: JSON.stringify({[responseKey]: batch.data, endIndex: batch.endIndex})};
}

function getSpeciesIds(options: IGetDataIdsOptions): IPokemonShowdownResponse {
	const dex = pokemonShowdownDex.mod(options.mod);
	if (!dex.data.Pokedex) throw new Error("No PS pokemon dex");
	const keys: string[] = [];
	for (const i in dex.data.Pokedex) {
		const species = dex.getSpecies(i);
		if (!species.exists || (species.gen && species.gen > dex.gen)) continue;
		keys.push(species.id);
	}

	const aliases: Dict<string> = {};
	for (const i in dex.data.Aliases) {
		const species = dex.getSpecies(dex.data.Aliases[i]);
		if (!species.exists || (species.gen && species.gen > dex.gen)) continue;
		aliases[i] = species.id;
	}

	return {data: JSON.stringify({aliases, keys})};
}

function getTypes(messageNumber: string, id: string, options: IGetDataOptions): IPokemonShowdownResponse {
	const dex = pokemonShowdownDex.mod(options.mod);
	const types: ITypeData[] = [];
	const length = options.keys.length;
	for (let i = options.startIndex; i < length; i++) {
		const type = dex.getType(options.keys[i]);
		removeObjectFunctions(type);
		types.push(type);
	}

	const responseKey = "types";
	const batch = batchArray(types, responseKey, messageNumber, id, options.startIndex, options.availableHeapSize);

	return {data: JSON.stringify({[responseKey]: batch.data, endIndex: batch.endIndex})};
}

function getTypeIds(options: IGetDataIdsOptions): IPokemonShowdownResponse {
	const dex = pokemonShowdownDex.mod(options.mod);
	if (!dex.data.TypeChart) throw new Error("No PS types dex");

	const keys: string[] = [];
	for (const i in dex.data.TypeChart) {
		const type = dex.getType(i);
		if (!type.exists || (type.gen && type.gen > dex.gen)) continue;
		keys.push(type.id);
	}

	return {data: JSON.stringify({keys})};
}

// eslint-disable-next-line @typescript-eslint/naming-convention
worker_threads.parentPort!.on('message', (incommingMessage: string) => {
	const parts = incommingMessage.split("|");
	const messageNumber = parts[0];
	const id = parts[1] as PokemonShowdownId;
	const message = parts.slice(2).join("|");
	let response: IPokemonShowdownResponse;
	try {
		if (id === 'getAbilities') {
			const options = JSON.parse(message) as IGetDataMessage;
			response = getAbilities(messageNumber, id, options);
		} else if (id === 'getAbilityIds') {
			const options = JSON.parse(message) as IGetDataIdsMessage;
			response = getAbilityIds(options);
		} else if (id === 'getAliases') {
			const options = JSON.parse(message) as IGetDataIdsMessage;
			response = getAliases(options);
		} else if (id === 'getAllPossibleMoves') {
			const options = JSON.parse(message) as IGetDataMessage;
			response = getAllPossibleMoves(messageNumber, id, options);
		} else if (id === 'getFormats') {
			const options = JSON.parse(message) as IGetDataMessage;
			response = getFormats(messageNumber, id, options);
		} else if (id === 'getFormatIds') {
			const options = JSON.parse(message) as IGetDataIdsMessage;
			response = getFormatIds(options);
		} else if (id === 'getItems') {
			const options = JSON.parse(message) as IGetDataMessage;
			response = getItems(messageNumber, id, options);
		} else if (id === 'getItemIds') {
			const options = JSON.parse(message) as IGetDataIdsMessage;
			response = getItemIds(options);
		} else if (id === 'getLearnsetData') {
			const options = JSON.parse(message) as IGetDataMessage;
			response = getLearnsetData(messageNumber, id, options);
		} else if (id === 'getLearnsetDataIds') {
			const options = JSON.parse(message) as IGetDataIdsMessage;
			response = getLearnsetDataIds(options);
		} else if (id === 'getMoves') {
			const options = JSON.parse(message) as IGetDataMessage;
			response = getMoves(messageNumber, id, options);
		} else if (id === 'getMoveIds') {
			const options = JSON.parse(message) as IGetDataIdsMessage;
			response = getMoveIds(options);
		} else if (id === 'getSpecies') {
			const options = JSON.parse(message) as IGetDataMessage;
			response = getSpecies(messageNumber, id, options);
		} else if (id === 'getSpeciesIds') {
			const options = JSON.parse(message) as IGetDataIdsMessage;
			response = getSpeciesIds(options);
		} else if (id === 'getTypes') {
			const options = JSON.parse(message) as IGetDataMessage;
			response = getTypes(messageNumber, id, options);
		} else if (id === 'getTypeIds') {
			const options = JSON.parse(message) as IGetDataIdsMessage;
			response = getTypeIds(options);
		}
	} catch (e) {
		console.log(e);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	worker_threads.parentPort!.postMessage(getPostMessage(messageNumber, id, JSON.stringify(response! || "")));
});
/* eslint-enable */
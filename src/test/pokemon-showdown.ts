import { assert, assertStrictEqual } from './test-tools';

/* eslint-env mocha */
describe("pokemon-showdown", () => {
	it("should properly interface with Lanette through worker", () => {
		for (const i of Dex.data.abilityKeys) {
			const ability = Dex.getAbility(i);
			assert(ability, i);
			assertStrictEqual(ability.id, i);
			assertStrictEqual(typeof ability.name, 'string');
			assertStrictEqual(typeof ability.id, 'string');
			assertStrictEqual(typeof ability.gen, 'number');
			if (ability.desc) assertStrictEqual(typeof ability.desc, 'string');
			if (ability.shortDesc) assertStrictEqual(typeof ability.shortDesc, 'string');
		}

		for (const i of Dex.data.formatKeys) {
			const format = Dex.getFormat(i);
			assert(format, i);
			assertStrictEqual(format.id, i);
			assertStrictEqual(typeof format.name, 'string');
			assert(Array.isArray(format.banlist));
			if (format.banlist.length) assertStrictEqual(typeof format.banlist[0], 'string');

			assert(Array.isArray(format.unbanlist));
			if (format.unbanlist.length) assertStrictEqual(typeof format.unbanlist[0], 'string');

			assert(Array.isArray(format.restricted));
			if (format.restricted.length) assertStrictEqual(typeof format.restricted[0], 'string');

			assert(Array.isArray(format.ruleset));
			if (format.ruleset.length) assertStrictEqual(typeof format.ruleset[0], 'string');
		}

		for (const i of Dex.data.itemKeys) {
			const item = Dex.getItem(i);
			assert(item, i);
			assertStrictEqual(item.id, i);
			assertStrictEqual(typeof item.name, 'string');
			assertStrictEqual(typeof item.gen, 'number');
			if (item.desc) assertStrictEqual(typeof item.desc, 'string');
			if (item.shortDesc) assertStrictEqual(typeof item.shortDesc, 'string');
			if (item.isNonstandard) assertStrictEqual(typeof item.isNonstandard, 'string');
		}

		for (const i of Dex.data.learnsetDataKeys) {
			const learnsetData = Dex.getLearnsetData(i);
			assert(learnsetData, i);
			assertStrictEqual(learnsetData.id, i);
		}

		for (const i of Dex.data.moveKeys) {
			const move = Dex.getMove(i);
			assert(move, i);
			if (move.realMove) {
				assertStrictEqual(i, Tools.toId(move.name));
				assertStrictEqual(move.id, Tools.toId(move.realMove));
			} else {
				assertStrictEqual(move.id, i);
			}
			assertStrictEqual(typeof move.name, 'string');
			assertStrictEqual(typeof move.gen, 'number');
			assertStrictEqual(typeof move.type, 'string');
			if (move.desc) assertStrictEqual(typeof move.desc, 'string');
			if (move.shortDesc) assertStrictEqual(typeof move.shortDesc, 'string');
			if (move.isNonstandard) assertStrictEqual(typeof move.isNonstandard, 'string');
		}

		for (const i of Dex.data.pokemonKeys) {
			const pokemon = Dex.getPokemon(i);
			assert(pokemon, i);
			assertStrictEqual(pokemon.id, i);
			assertStrictEqual(typeof pokemon.name, 'string');
			assertStrictEqual(typeof pokemon.baseSpecies, 'string');
			assertStrictEqual(typeof pokemon.gen, 'number');
			assertStrictEqual(typeof pokemon.num, 'number');

			assert(Array.isArray(pokemon.types));
			assertStrictEqual(typeof pokemon.types[0], 'string');

			assert(Array.isArray(pokemon.evos));
			if (pokemon.evos.length) assertStrictEqual(typeof pokemon.evos[0], 'string');

			assert(Array.isArray(pokemon.eggGroups));
			if (pokemon.eggGroups.length) assertStrictEqual(typeof pokemon.eggGroups[0], 'string');

			assertStrictEqual(typeof pokemon.spriteid, 'string');
			assertStrictEqual(typeof pokemon.abilities['0'], 'string');
			assertStrictEqual(typeof pokemon.baseStats['hp'], 'number');
			assertStrictEqual(typeof pokemon.baseStats['atk'], 'number');
			assertStrictEqual(typeof pokemon.baseStats['def'], 'number');
			assertStrictEqual(typeof pokemon.baseStats['spa'], 'number');
			assertStrictEqual(typeof pokemon.baseStats['spd'], 'number');
			assertStrictEqual(typeof pokemon.baseStats['spe'], 'number');
			assertStrictEqual(typeof pokemon.tier, 'string');
			assertStrictEqual(typeof pokemon.prevo, 'string');
			// @ts-expect-error
			if (pokemon.nfe !== 0) {
				assertStrictEqual(typeof pokemon.nfe, 'boolean');
			}
			if (pokemon.isNonstandard) assertStrictEqual(typeof pokemon.isNonstandard, 'string');
			if (pokemon.forme) assertStrictEqual(typeof pokemon.forme, 'string');
			if (pokemon.evoLevel) assertStrictEqual(typeof pokemon.evoLevel, 'number');
			if (pokemon.evoMove) assertStrictEqual(typeof pokemon.evoMove, 'string');
			if (pokemon.evoCondition) assertStrictEqual(typeof pokemon.evoCondition, 'string');
			if (pokemon.evoItem) assertStrictEqual(typeof pokemon.evoItem, 'string');
			if (pokemon.evoType) assertStrictEqual(typeof pokemon.evoType, 'string');
			if (pokemon.cosmeticFormes) {
				assert(Array.isArray(pokemon.cosmeticFormes));
				assertStrictEqual(typeof pokemon.cosmeticFormes[0], 'string');
			}
			if (pokemon.otherFormes) {
				assert(Array.isArray(pokemon.otherFormes));
				assertStrictEqual(typeof pokemon.otherFormes[0], 'string');
			}
		}

		for (const i of Dex.data.typeKeys) {
			const type = Dex.getType(i);
			assert(type, i);
			assertStrictEqual(type.id, i);
			assertStrictEqual(typeof type.name, 'string');
			assertStrictEqual(typeof type.damageTaken, 'object');
		}

		/*
			Abilities
		*/

		const unBreakableAbility = Dex.getAbility("Dark Aura");
		assert(unBreakableAbility);
		assertStrictEqual(unBreakableAbility.isUnbreakable, true);

		const suppressWeatherAbility = Dex.getAbility("Air Lock");
		assert(suppressWeatherAbility);
		assertStrictEqual(suppressWeatherAbility.suppressWeather, true);

		const capAbility = Dex.getAbility("Mountaineer");
		assert(capAbility);
		assertStrictEqual(capAbility.isNonstandard, "CAP");

		/*
			Items
		*/

		const drive = Dex.getItem("Burn Drive");
		assert(drive);
		assertStrictEqual(drive.onDrive, "Fire");

		const plate = Dex.getItem("Draco Plate");
		assert(plate);
		assertStrictEqual(plate.onPlate, "Dragon");

		const memory = Dex.getItem("Bug Memory");
		assert(memory);
		assertStrictEqual(memory.onMemory, "Bug");

		const berry = Dex.getItem("Aguav Berry");
		assert(berry);
		assertStrictEqual(berry.isBerry, true);

		const choice = Dex.getItem("Choice Band");
		assert(choice);
		assertStrictEqual(choice.isChoice, true);

		const gem = Dex.getItem("Bug Gem");
		assert(gem);
		assertStrictEqual(gem.isGem, true);

		const pokeball = Dex.getItem("Cherish Ball");
		assert(pokeball);
		assertStrictEqual(pokeball.isPokeball, true);

		const megaStone = Dex.getItem("Abomasite");
		assert(megaStone);
		assertStrictEqual(megaStone.megaEvolves, "Abomasnow");
		assertStrictEqual(megaStone.megaStone, "Abomasnow-Mega");
		assert(Array.isArray(megaStone.itemUser));
		assertStrictEqual(megaStone.itemUser.length, 1);
		assertStrictEqual(megaStone.itemUser[0], "Abomasnow");

		const pastItem = Dex.getItem("Adamant Orb");
		assert(pastItem);
		assertStrictEqual(pastItem.isNonstandard, "Past");

		const capMegaStone = Dex.getItem("Crucibellite");
		assert(capMegaStone);
		assertStrictEqual(capMegaStone.isNonstandard, "CAP");

		const unObtainableItem = Dex.getItem("Custap Berry");
		assert(unObtainableItem);
		assertStrictEqual(unObtainableItem.isNonstandard, "Unobtainable");

		const zCrystalPokemon = Dex.getItem("Aloraichium Z");
		assert(zCrystalPokemon);
		assertStrictEqual(zCrystalPokemon.zMove, "Stoked Sparksurfer");
		assertStrictEqual(zCrystalPokemon.zMoveFrom, "Thunderbolt");

		const zCrystal = Dex.getItem("Buginium Z");
		assert(zCrystal);
		assertStrictEqual(zCrystal.zMove, true);
		assertStrictEqual(zCrystal.zMoveType, "Bug");

		/*
			Moves
		*/

		const type = Dex.getMove("Tackle");
		assert(type);
		assertStrictEqual(type.type, "Normal");

		const basePowerCallback = Dex.getMove("Acrobatics");
		assert(basePowerCallback);
		assertStrictEqual(basePowerCallback.hasBasePowerCallback, true);

		const critRatio = Dex.getMove("Aeroblast");
		assert(critRatio);
		assertStrictEqual(critRatio.critRatio, 2);

		const pastMove = Dex.getMove("10,000,000 Volt Thunderbolt");
		assert(pastMove);
		assertStrictEqual(pastMove.isNonstandard, "Past");

		const lgpeMove = Dex.getMove("Baddy Bad");
		assert(lgpeMove);
		assertStrictEqual(lgpeMove.isNonstandard, "LGPE");

		const capMove = Dex.getMove("Paleo Wave");
		assert(capMove);
		assertStrictEqual(capMove.isNonstandard, "CAP");

		const potentialZMove = Dex.getMove("Acid Armor");
		assert(potentialZMove);
		assert(potentialZMove.zMove);
		assertStrictEqual(typeof potentialZMove.zMove, 'object');
		assertStrictEqual(potentialZMove.zMove.effect, 'clearnegativeboost');

		const trueAccuracy = Dex.getMove("Acid Downpour");
		assert(trueAccuracy);
		assertStrictEqual(trueAccuracy.accuracy, true);

		const oneHundredPercentAccuracy = Dex.getMove("Absorb");
		assert(oneHundredPercentAccuracy);
		assertStrictEqual(oneHundredPercentAccuracy.accuracy, 100);

		/*
			Pokemon
		*/

		const nfe = Dex.getPokemon("Ivysaur");
		assert(nfe);
		assertStrictEqual(nfe.nfe, true);
		assertStrictEqual(nfe.prevo, "Bulbasaur");
		assert(Array.isArray(nfe.evos));
		assertStrictEqual(nfe.evos.length, 1);
		assertStrictEqual(nfe.evos[0], "Venusaur");

		const forme = Dex.getPokemon("Rattata-Alola");
		assert(forme);
		assert(forme.baseSpecies !== forme.name);
		assertStrictEqual(forme.forme, "Alola");

		const mega = Dex.getPokemon("Venusaur-Mega");
		assert(mega);
		assert(mega.baseSpecies !== mega.name);
		assertStrictEqual(mega.isMega, true);

		const primal = Dex.getPokemon("Kyogre-Primal");
		assert(primal);
		assert(primal.baseSpecies !== primal.name);
		assertStrictEqual(primal.isPrimal, true);

		const battleOnly = Dex.getPokemon("Greninja-Ash");
		assert(battleOnly);
		assert(battleOnly.baseSpecies !== battleOnly.name);
		assertStrictEqual(battleOnly.battleOnly, "Greninja");

		const eggGroup = Dex.getPokemon("Bulbasaur");
		assert(eggGroup);
		assert(Array.isArray(eggGroup.eggGroups));
		assertStrictEqual(eggGroup.eggGroups.length, 2);

		const changesFrom = Dex.getPokemon("Pikachu-Rock-Star");
		assert(changesFrom);
		assertStrictEqual(changesFrom.changesFrom, "Pikachu-Cosplay");

		const cosmeticForme = Dex.getPokemon("Unown");
		assert(cosmeticForme);
		assert(Array.isArray(cosmeticForme.cosmeticFormes));
		assert(cosmeticForme.cosmeticFormes.length);

		assert(Dex.getPokemon("Unown-B"));

		const otherForme = Dex.getPokemon("Venusaur");
		assert(otherForme);
		assert(Array.isArray(otherForme.otherFormes));
		assertStrictEqual(otherForme.otherFormes.length, 1);
		assertStrictEqual(otherForme.otherFormes[0], "Venusaur-Mega");

		const singleType = Dex.getPokemon("Charmander");
		assert(singleType);
		assertStrictEqual(singleType.types.length, 1);
		assertStrictEqual(singleType.types[0], "Fire");

		const dualType = Dex.getPokemon("Charizard");
		assert(dualType);
		assertStrictEqual(dualType.types.length, 2);
		assertStrictEqual(dualType.types[0], "Fire");
		assertStrictEqual(dualType.types[1], "Flying");

		const alphaName = Dex.getPokemon("Jynx");
		assert(alphaName);
		assertStrictEqual(alphaName.id, "jynx");
		assertStrictEqual(alphaName.name, "Jynx");

		const periodName = Dex.getPokemon("Mr. Mime");
		assert(periodName);
		assertStrictEqual(periodName.id, "mrmime");
		assertStrictEqual(periodName.name, "Mr. Mime");

		const colonName = Dex.getPokemon("Type: Null");
		assert(colonName);
		assertStrictEqual(colonName.id, "typenull");
		assertStrictEqual(colonName.name, "Type: Null");

		const hyphenName = Dex.getPokemon("Kommo-o");
		assert(hyphenName);
		assertStrictEqual(hyphenName.id, "kommoo");
		assertStrictEqual(hyphenName.name, "Kommo-o");

		const allPossibleMoves = Dex.getAllPossibleMoves(Dex.getExistingPokemon("Charizard"));
		assert(allPossibleMoves);
		assertStrictEqual(allPossibleMoves.filter(x => x === 'flamethrower').length, 1);
	});
});

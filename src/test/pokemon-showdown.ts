import { assert, assertStrictEqual } from './test-tools';

const formatEffectTypes: string[] = ['Format', 'Rule', 'ValidatorRule'];

/* eslint-env mocha */
describe("pokemon-showdown", () => {
	it("should properly interface with Lanette", () => {
		for (const i of Dex.data.abilityKeys) {
			const ability = Dex.getAbility(i);
			assert(ability, i);
			assertStrictEqual(ability.id, i);
			assertStrictEqual(ability.effectType, "Ability");
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
			assert(formatEffectTypes.includes(format.effectType));
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
			assertStrictEqual(item.effectType, "Item");
			assertStrictEqual(typeof item.name, 'string');
			assertStrictEqual(typeof item.gen, 'number');
			if (item.desc) assertStrictEqual(typeof item.desc, 'string');
			if (item.shortDesc) assertStrictEqual(typeof item.shortDesc, 'string');
			if (item.isNonstandard) assertStrictEqual(typeof item.isNonstandard, 'string');
		}

		for (const i of Dex.data.learnsetDataKeys) {
			assert(Dex.getLearnsetData(i), i);
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
			assertStrictEqual(move.effectType, "Move");
			assertStrictEqual(typeof move.name, 'string');
			assertStrictEqual(typeof move.gen, 'number');
			assertStrictEqual(typeof move.type, 'string');
			if (move.desc) assertStrictEqual(typeof move.desc, 'string');
			if (move.shortDesc) assertStrictEqual(typeof move.shortDesc, 'string');
			if (move.isNonstandard) assertStrictEqual(typeof move.isNonstandard, 'string');
		}

		for (const i of Dex.data.natureKeys) {
			const nature = Dex.getNature(i);
			assert(nature, i);
			assertStrictEqual(nature.id, i);
			assertStrictEqual(nature.effectType, "Nature");
			assertStrictEqual(typeof nature.name, 'string');
			assertStrictEqual(typeof nature.gen, 'number');
			if (nature.plus) assertStrictEqual(typeof nature.plus, 'string');
			if (nature.minus) assertStrictEqual(typeof nature.minus, 'string');
		}

		for (const i of Dex.data.pokemonKeys) {
			const pokemon = Dex.getPokemon(i);
			assert(pokemon, i);
			assertStrictEqual(pokemon.id, i);
			assertStrictEqual(pokemon.effectType, "Pokemon");
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

		assertStrictEqual(Dex.getExistingAbility("Stench").gen, 3);
		assertStrictEqual(Dex.getExistingAbility("Tangled Feet").gen, 4);
		assertStrictEqual(Dex.getExistingAbility("Pickpocket").gen, 5);
		assertStrictEqual(Dex.getExistingAbility("Aroma Veil").gen, 6);
		assertStrictEqual(Dex.getExistingAbility("Stamina").gen, 7);
		assertStrictEqual(Dex.getExistingAbility("Intrepid Sword").gen, 8);

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

		assertStrictEqual(Dex.getExistingItem("Berry Juice").gen, 2);
		assertStrictEqual(Dex.getExistingItem("Aguav Berry").gen, 3);
		assertStrictEqual(Dex.getExistingItem("Rare Bone").gen, 4);
		assertStrictEqual(Dex.getExistingItem("Prism Scale").gen, 5);
		assertStrictEqual(Dex.getExistingItem("Assault Vest").gen, 6);
		assertStrictEqual(Dex.getExistingItem("Adrenaline Orb").gen, 7);
		assertStrictEqual(Dex.getExistingItem("Berry Sweet").gen, 8);

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

		const pastItem = Dex.getItem("Armor Fossil");
		assert(pastItem);
		assertStrictEqual(pastItem.isNonstandard, "Past");

		const capMegaStone = Dex.getItem("Crucibellite");
		assert(capMegaStone);
		assertStrictEqual(capMegaStone.isNonstandard, "CAP");

		const unObtainableItem = Dex.getItem("Draco Plate");
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

		assertStrictEqual(Dex.getExistingMove("Pound").gen, 1);
		assertStrictEqual(Dex.getExistingMove("Sketch").gen, 2);
		assertStrictEqual(Dex.getExistingMove("Fake Out").gen, 3);
		assertStrictEqual(Dex.getExistingMove("Roost").gen, 4);
		assertStrictEqual(Dex.getExistingMove("Hone Claws").gen, 5);
		assertStrictEqual(Dex.getExistingMove("Flying Press").gen, 6);
		assertStrictEqual(Dex.getExistingMove("Breakneck Blitz").gen, 7);
		assertStrictEqual(Dex.getExistingMove("Max Guard").gen, 8);

		const type = Dex.getMove("Tackle");
		assert(type);
		assertStrictEqual(type.type, "Normal");

		const basePowerCallback = Dex.getMove("Acrobatics");
		assert(basePowerCallback);
		assert(basePowerCallback.basePowerCallback);

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

		assertStrictEqual(Dex.getExistingPokemon("Bulbasaur").gen, 1);
		assertStrictEqual(Dex.getExistingPokemon("Chikorita").gen, 2);
		assertStrictEqual(Dex.getExistingPokemon("Treecko").gen, 3);
		assertStrictEqual(Dex.getExistingPokemon("Turtwig").gen, 4);
		assertStrictEqual(Dex.getExistingPokemon("Snivy").gen, 5);
		assertStrictEqual(Dex.getExistingPokemon("Chespin").gen, 6);
		assertStrictEqual(Dex.getExistingPokemon("Charizard-Mega-X").gen, 6);
		assertStrictEqual(Dex.getExistingPokemon("Groudon-Primal").gen, 6);
		assertStrictEqual(Dex.getExistingPokemon("Rowlet").gen, 7);
		assertStrictEqual(Dex.getExistingPokemon("Raichu-Alola").gen, 7);
		assertStrictEqual(Dex.getExistingPokemon("Eevee-Starter").gen, 7);
		assertStrictEqual(Dex.getExistingPokemon("Grookey").gen, 8);
		assertStrictEqual(Dex.getExistingPokemon("Meowth-Gmax").gen, 8);
		assertStrictEqual(Dex.getExistingPokemon("Meowth-Galar").gen, 8);
		assertStrictEqual(Dex.getExistingPokemon("Darmanitan-Galar-Zen").gen, 8);

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

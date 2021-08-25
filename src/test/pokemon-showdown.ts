import { assert, assertStrictEqual } from './test-tools';

const formatEffectTypes: string[] = ['Format', 'Rule', 'ValidatorRule'];

/* eslint-env mocha */
describe("pokemon-showdown", () => {
	it("should properly interface with Lanette", () => {
		/*
			Abilities
		*/

		const abilityKeys = Dex.getData().abilityKeys;
		assert(abilityKeys.length);
		assert(abilityKeys.includes('stench'));
		assert(abilityKeys.includes('mountaineer'));

		for (const i of abilityKeys) {
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

		assertStrictEqual(Dex.getExistingAbility("Stench").gen, 3);
		assertStrictEqual(Dex.getExistingAbility("Tangled Feet").gen, 4);
		assertStrictEqual(Dex.getExistingAbility("Pickpocket").gen, 5);
		assertStrictEqual(Dex.getExistingAbility("Aroma Veil").gen, 6);
		assertStrictEqual(Dex.getExistingAbility("Stamina").gen, 7);
		assertStrictEqual(Dex.getExistingAbility("Intrepid Sword").gen, 8);

		const isBreakableAbility = Dex.getAbility("Aroma Veil");
		assert(isBreakableAbility);
		assertStrictEqual(isBreakableAbility.isBreakable, true);

		const suppressWeatherAbility = Dex.getAbility("Air Lock");
		assert(suppressWeatherAbility);
		assertStrictEqual(suppressWeatherAbility.suppressWeather, true);

		const capAbility = Dex.getAbility("Mountaineer");
		assert(capAbility);
		assertStrictEqual(capAbility.isNonstandard, "CAP");

		/*
			Formats
		*/

		const formatKeys = Dex.getData().formatKeys;
		assert(formatKeys.length);
		assert(formatKeys.includes('gen8ou'));
		assert(formatKeys.includes('gen1ou'));

		for (const i of formatKeys) {
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

		const currentGenFormat = Dex.getFormat("gen8ou");
		assert(currentGenFormat);
		assertStrictEqual(currentGenFormat.id, 'gen8ou');
		assertStrictEqual(currentGenFormat.name, "[Gen 8] OU");

		const pastGenFormat = Dex.getFormat("gen1ou");
		assert(pastGenFormat);
		assertStrictEqual(pastGenFormat.id, 'gen1ou');
		assertStrictEqual(pastGenFormat.name, "[Gen 1] OU");

		/*
			Items
		*/

		const itemKeys = Dex.getData().itemKeys;
		assert(itemKeys.length);
		assert(itemKeys.includes('berryjuice'));
		assert(itemKeys.includes('crucibellite'));

		for (const i of itemKeys) {
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
			Learnset data
		*/

		const learnsetDataKeys = Dex.getData().learnsetDataKeys;
		assert(learnsetDataKeys.length);
		assert(learnsetDataKeys.includes('pikachu'));
		assert(learnsetDataKeys.includes('pokestarsmeargle'));
		assert(learnsetDataKeys.includes('arghonaut'));

		for (const i of learnsetDataKeys) {
			assert(Dex.getLearnsetData(i), i);
		}

		/*
			Moves
		*/

		const moveKeys = Dex.getData().moveKeys;
		assert(moveKeys.length);
		assert(moveKeys.includes('pound'));
		assert(moveKeys.includes('paleowave'));
		assert(moveKeys.includes('hiddenpower'));
		assert(moveKeys.includes('hiddenpowerice'));

		for (const i of moveKeys) {
			const move = Dex.getMove(i);
			assert(move, i);
			assertStrictEqual(move.id, i);
			assertStrictEqual(move.effectType, "Move");
			assertStrictEqual(typeof move.name, 'string');
			assertStrictEqual(typeof move.gen, 'number');
			assertStrictEqual(typeof move.type, 'string');
			if (move.desc) assertStrictEqual(typeof move.desc, 'string');
			if (move.shortDesc) assertStrictEqual(typeof move.shortDesc, 'string');
			if (move.isNonstandard) assertStrictEqual(typeof move.isNonstandard, 'string');
		}

		assertStrictEqual(Dex.getExistingMove("Pound").gen, 1);
		assertStrictEqual(Dex.getExistingMove("Sketch").gen, 2);
		assertStrictEqual(Dex.getExistingMove("Fake Out").gen, 3);
		assertStrictEqual(Dex.getExistingMove("Roost").gen, 4);
		assertStrictEqual(Dex.getExistingMove("Hone Claws").gen, 5);
		assertStrictEqual(Dex.getExistingMove("Flying Press").gen, 6);
		assertStrictEqual(Dex.getExistingMove("Breakneck Blitz").gen, 7);
		assertStrictEqual(Dex.getExistingMove("Max Guard").gen, 8);

		const moveType = Dex.getMove("Tackle");
		assert(moveType);
		assertStrictEqual(moveType.type, "Normal");

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

		const natureKeys = Dex.getData().natureKeys;
		assert(natureKeys.length);

		for (const i of natureKeys) {
			const nature = Dex.getNature(i);
			assert(nature, i);
			assertStrictEqual(nature.id, i);
			assertStrictEqual(nature.effectType, "Nature");
			assertStrictEqual(typeof nature.name, 'string');
			assertStrictEqual(typeof nature.gen, 'number');
			if (nature.plus) assertStrictEqual(typeof nature.plus, 'string');
			if (nature.minus) assertStrictEqual(typeof nature.minus, 'string');
		}

		/*
			Pokemon
		*/

		const pokemonKeys = Dex.getData().pokemonKeys;
		assert(pokemonKeys.length);
		assert(pokemonKeys.includes('pikachu'));
		assert(pokemonKeys.includes('pokestarsmeargle'));
		assert(pokemonKeys.includes('arghonaut'));

		const gen1PokemonKeys = Dex.getDex('gen1').getData().pokemonKeys;
		const gen2PokemonKeys = Dex.getDex('gen2').getData().pokemonKeys;
		const gen3PokemonKeys = Dex.getDex('gen3').getData().pokemonKeys;
		const gen4PokemonKeys = Dex.getDex('gen4').getData().pokemonKeys;
		const gen5PokemonKeys = Dex.getDex('gen5').getData().pokemonKeys;
		const gen6PokemonKeys = Dex.getDex('gen6').getData().pokemonKeys;
		const gen7PokemonKeys = Dex.getDex('gen7').getData().pokemonKeys;
		const gen8PokemonKeys = Dex.getDex('gen8').getData().pokemonKeys;
		assert(gen1PokemonKeys.includes('bulbasaur'));
		assert(gen2PokemonKeys.includes('bulbasaur'));
		assert(gen3PokemonKeys.includes('bulbasaur'));
		assert(gen4PokemonKeys.includes('bulbasaur'));
		assert(gen5PokemonKeys.includes('bulbasaur'));
		assert(gen6PokemonKeys.includes('bulbasaur'));
		assert(gen7PokemonKeys.includes('bulbasaur'));
		assert(gen8PokemonKeys.includes('bulbasaur'));

		assert(!gen1PokemonKeys.includes('chikorita'));
		assert(gen2PokemonKeys.includes('chikorita'));
		assert(gen3PokemonKeys.includes('chikorita'));
		assert(gen4PokemonKeys.includes('chikorita'));
		assert(gen5PokemonKeys.includes('chikorita'));
		assert(gen6PokemonKeys.includes('chikorita'));
		assert(gen7PokemonKeys.includes('chikorita'));
		assert(gen8PokemonKeys.includes('chikorita'));

		assert(!gen1PokemonKeys.includes('treecko'));
		assert(!gen2PokemonKeys.includes('treecko'));
		assert(gen3PokemonKeys.includes('treecko'));
		assert(gen4PokemonKeys.includes('treecko'));
		assert(gen5PokemonKeys.includes('treecko'));
		assert(gen6PokemonKeys.includes('treecko'));
		assert(gen7PokemonKeys.includes('treecko'));
		assert(gen8PokemonKeys.includes('treecko'));

		assert(!gen1PokemonKeys.includes('turtwig'));
		assert(!gen2PokemonKeys.includes('turtwig'));
		assert(!gen3PokemonKeys.includes('turtwig'));
		assert(gen4PokemonKeys.includes('turtwig'));
		assert(gen5PokemonKeys.includes('turtwig'));
		assert(gen6PokemonKeys.includes('turtwig'));
		assert(gen7PokemonKeys.includes('turtwig'));
		assert(gen8PokemonKeys.includes('turtwig'));

		assert(!gen1PokemonKeys.includes('snivy'));
		assert(!gen2PokemonKeys.includes('snivy'));
		assert(!gen3PokemonKeys.includes('snivy'));
		assert(!gen4PokemonKeys.includes('snivy'));
		assert(gen5PokemonKeys.includes('snivy'));
		assert(gen6PokemonKeys.includes('snivy'));
		assert(gen7PokemonKeys.includes('snivy'));
		assert(gen8PokemonKeys.includes('snivy'));

		assert(!gen1PokemonKeys.includes('chespin'));
		assert(!gen2PokemonKeys.includes('chespin'));
		assert(!gen3PokemonKeys.includes('chespin'));
		assert(!gen4PokemonKeys.includes('chespin'));
		assert(!gen5PokemonKeys.includes('chespin'));
		assert(gen6PokemonKeys.includes('chespin'));
		assert(gen7PokemonKeys.includes('chespin'));
		assert(gen8PokemonKeys.includes('chespin'));

		assert(!gen1PokemonKeys.includes('rowlet'));
		assert(!gen2PokemonKeys.includes('rowlet'));
		assert(!gen3PokemonKeys.includes('rowlet'));
		assert(!gen4PokemonKeys.includes('rowlet'));
		assert(!gen5PokemonKeys.includes('rowlet'));
		assert(!gen6PokemonKeys.includes('rowlet'));
		assert(gen7PokemonKeys.includes('rowlet'));
		assert(gen8PokemonKeys.includes('rowlet'));

		assert(!gen1PokemonKeys.includes('grookey'));
		assert(!gen2PokemonKeys.includes('grookey'));
		assert(!gen3PokemonKeys.includes('grookey'));
		assert(!gen4PokemonKeys.includes('grookey'));
		assert(!gen5PokemonKeys.includes('grookey'));
		assert(!gen6PokemonKeys.includes('grookey'));
		assert(!gen7PokemonKeys.includes('grookey'));
		assert(gen8PokemonKeys.includes('grookey'));

		for (const i of pokemonKeys) {
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

		const pokestar = Dex.getPokemon("Pokestar Smeargle");
		assert(pokestar);
		assertStrictEqual(pokestar.id, "pokestarsmeargle");
		assertStrictEqual(pokestar.name, "Pokestar Smeargle");

		const cap = Dex.getPokemon("Arghonaut");
		assert(cap);
		assertStrictEqual(cap.id, "arghonaut");
		assertStrictEqual(cap.name, "Arghonaut");

		/*
			Types
		*/

		const typeKeys = Dex.getData().typeKeys;
		assert(typeKeys.length);
		assert(typeKeys.includes('normal'));

		const gen1TypeKeys = Dex.getDex('gen1').getData().typeKeys;
		const gen2TypeKeys = Dex.getDex('gen2').getData().typeKeys;
		const gen3TypeKeys = Dex.getDex('gen3').getData().typeKeys;
		const gen4TypeKeys = Dex.getDex('gen4').getData().typeKeys;
		const gen5TypeKeys = Dex.getDex('gen5').getData().typeKeys;
		const gen6TypeKeys = Dex.getDex('gen6').getData().typeKeys;
		const gen7TypeKeys = Dex.getDex('gen7').getData().typeKeys;
		const gen8TypeKeys = Dex.getDex('gen8').getData().typeKeys;

		assert(gen1TypeKeys.includes('normal'));
		assert(gen2TypeKeys.includes('normal'));
		assert(gen3TypeKeys.includes('normal'));
		assert(gen4TypeKeys.includes('normal'));
		assert(gen5TypeKeys.includes('normal'));
		assert(gen6TypeKeys.includes('normal'));
		assert(gen7TypeKeys.includes('normal'));
		assert(gen8TypeKeys.includes('normal'));

		assert(!gen1TypeKeys.includes('dark'));
		assert(gen2TypeKeys.includes('dark'));
		assert(gen3TypeKeys.includes('dark'));
		assert(gen4TypeKeys.includes('dark'));
		assert(gen5TypeKeys.includes('dark'));
		assert(gen6TypeKeys.includes('dark'));
		assert(gen7TypeKeys.includes('dark'));
		assert(gen8TypeKeys.includes('dark'));

		assert(!gen1TypeKeys.includes('steel'));
		assert(gen2TypeKeys.includes('steel'));
		assert(gen3TypeKeys.includes('steel'));
		assert(gen4TypeKeys.includes('steel'));
		assert(gen5TypeKeys.includes('steel'));
		assert(gen6TypeKeys.includes('steel'));
		assert(gen7TypeKeys.includes('steel'));
		assert(gen8TypeKeys.includes('steel'));

		assert(!gen1TypeKeys.includes('fairy'));
		assert(!gen2TypeKeys.includes('fairy'));
		assert(!gen3TypeKeys.includes('fairy'));
		assert(!gen4TypeKeys.includes('fairy'));
		assert(!gen5TypeKeys.includes('fairy'));
		assert(gen6TypeKeys.includes('fairy'));
		assert(gen7TypeKeys.includes('fairy'));
		assert(gen8TypeKeys.includes('fairy'));

		for (const i of typeKeys) {
			const type = Dex.getType(i);
			assert(type, i);
			assertStrictEqual(type.id, i);
			assertStrictEqual(typeof type.name, 'string');
			assertStrictEqual(typeof type.damageTaken, 'object');
		}

		const normalType = Dex.getType("Normal");
		assert(normalType);
		assertStrictEqual(normalType.id, 'normal');
		assertStrictEqual(normalType.name, "Normal");
		assertStrictEqual(normalType.damageTaken['Normal'], 0);
		assertStrictEqual(normalType.damageTaken['Fighting'], 1);
		assertStrictEqual(normalType.damageTaken['Ghost'], 3);

		const allPossibleMoves = Dex.getAllPossibleMoves(Dex.getExistingPokemon("Charizard"));
		assert(allPossibleMoves);
		assertStrictEqual(allPossibleMoves.filter(x => x === 'flamethrower').length, 1);
	});
});

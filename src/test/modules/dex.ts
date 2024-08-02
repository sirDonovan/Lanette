import { formatLinks } from '../../data/format-links';
import type { ISeparatedCustomRules } from '../../types/dex';
import { assert, assertStrictEqual, testOptions } from './../test-tools';

/* eslint-env mocha */

describe("Dex", () => {
	it('should properly load data', function(this: Mocha.Context) {
		this.timeout(15000);

		const dexData = Dex.getData();

		assert(dexData.abilityKeys.length > 1);
		assert(dexData.formatKeys.length > 1);
		assert(dexData.itemKeys.length > 1);
		assert(dexData.moveKeys.length > 1);
		assert(dexData.natureKeys.length > 1);
		assert(dexData.pokemonKeys.length > 1);

		const typeKeys = Dex.getTypeKeys();
		assert(typeKeys.length > 1);
		assert(typeKeys.includes('normal'));
		assert(!typeKeys.includes('stellar'));

		assert(Object.keys(dexData.colors).length > 1);
		assert(Object.keys(dexData.eggGroups).length > 1);
		assert(Object.keys(dexData.gifData).length > 1);
		assert(Object.keys(dexData.gifDataBW).length > 1);

		// data keys by gen

		assert(Dex.getDex("gen1").getData().pokemonKeys.includes("bulbasaur"));
		assert(!Dex.getDex("gen1").getData().pokemonKeys.includes("chikorita"));

		assert(Dex.getDex("gen2").getData().pokemonKeys.includes("chikorita"));
		assert(!Dex.getDex("gen2").getData().pokemonKeys.includes("treecko"));

		assert(Dex.getDex("gen3").getData().pokemonKeys.includes("treecko"));
		assert(!Dex.getDex("gen3").getData().pokemonKeys.includes("turtwig"));

		assert(Dex.getDex("gen4").getData().pokemonKeys.includes("turtwig"));
		assert(!Dex.getDex("gen4").getData().pokemonKeys.includes("snivy"));

		assert(Dex.getDex("gen5").getData().pokemonKeys.includes("snivy"));
		assert(!Dex.getDex("gen5").getData().pokemonKeys.includes("chespin"));

		assert(Dex.getDex("gen6").getData().pokemonKeys.includes("chespin"));
		assert(!Dex.getDex("gen6").getData().pokemonKeys.includes("rowlet"));

		assert(Dex.getDex("gen7").getData().pokemonKeys.includes("rowlet"));
		assert(!Dex.getDex("gen7").getData().pokemonKeys.includes("grookey"));

		assert(Dex.getDex("gen8").getData().pokemonKeys.includes("grookey"));

		// allPossibleMoves
		let pokemon = Dex.getExistingPokemon('Charizard');
		let allPossibleMoves = Dex.getAllPossibleMoves(pokemon);
		assert(allPossibleMoves.length > 1);
		assert(allPossibleMoves.includes("hiddenpower"));
		assert(allPossibleMoves.includes("hiddenpowerice"));
		assert(!allPossibleMoves.includes("hiddenpowernormal"));
		assert(!allPossibleMoves.includes("hiddenpowerfairy"));

		pokemon = Dex.getExistingPokemon('Lycanroc-Dusk');
		allPossibleMoves = Dex.getAllPossibleMoves(pokemon);
		assert(allPossibleMoves.length > 1);

		pokemon = Dex.getExistingPokemon('Rotom-Frost');
		allPossibleMoves = Dex.getAllPossibleMoves(pokemon);
		assert(allPossibleMoves.length > 1);

		pokemon = Dex.getExistingPokemon('Smeargle');
		allPossibleMoves = Dex.getAllPossibleMoves(pokemon);
		assertStrictEqual(allPossibleMoves.length, 855);

		pokemon = Dex.getExistingPokemon('Pikachu-Gmax');
		allPossibleMoves = Dex.getAllPossibleMoves(pokemon);
		assert(allPossibleMoves.length > 1);

		const houndour = Dex.getExistingPokemon('Houndour');
		const houndoomMega = Dex.getExistingPokemon('Houndoom-Mega');
		const allPossibleMovesHoundour = Dex.getAllPossibleMoves(houndour);
		const allPossibleMovesHoundoomMega = Dex.getAllPossibleMoves(houndoomMega);
		for (const move of allPossibleMovesHoundour) {
			assert(allPossibleMovesHoundoomMega.includes(move));
		}

		const rattataAlola = Dex.getExistingPokemon('Rattata-Alola');
		const raticateAlola = Dex.getExistingPokemon('Raticate-Alola');
		const allPossibleMovesRattataAlola = Dex.getAllPossibleMoves(rattataAlola);
		const allPossibleMovesRaticateAlola = Dex.getAllPossibleMoves(raticateAlola);
		for (const move of allPossibleMovesRattataAlola) {
			assert(allPossibleMovesRaticateAlola.includes(move));
		}

		assertStrictEqual(Dex.getExistingPokemon("Furfrou").spriteid, "furfrou");
		assertStrictEqual(Dex.getExistingPokemon("Furfrou-Dandy").spriteid, "furfrou-dandy");

		assertStrictEqual(Dex.getExistingFormat("gen1ou").gen, 1);
		assertStrictEqual(Dex.getExistingFormat("gen2ou").gen, 2);
		assertStrictEqual(Dex.getExistingFormat("gen3ou").gen, 3);
		assertStrictEqual(Dex.getExistingFormat("gen4ou").gen, 4);
		assertStrictEqual(Dex.getExistingFormat("gen5ou").gen, 5);
		assertStrictEqual(Dex.getExistingFormat("gen6ou").gen, 6);
		assertStrictEqual(Dex.getExistingFormat("gen7ou").gen, 7);
		assertStrictEqual(Dex.getExistingFormat("gen8ou").gen, 8);
	});
	it('should contain valid data files', function(this: Mocha.Context) {
		const dexData = Dex.getData();

		const badges = Dex.getBadges();
		assert(badges.length > 1);

		const characters = Dex.getCharacters();
		assert(characters.length > 1);

		const locations = Dex.getLocations();
		assert(locations.length > 1);

		const categories = dexData.categories;
		assert(Object.keys(categories).length > 1);

		assert(dexData.trainerClasses.length > 1);

		for (let i = 0; i < badges.length; i++) {
			assert(badges.indexOf(badges[i]) === i, "Duplicate badge " + badges[i]);
		}

		for (let i = 0; i < characters.length; i++) {
			assert(characters.indexOf(characters[i]) === i, "Duplicate character " + characters[i]);
		}

		for (let i = 0; i < locations.length; i++) {
			assert(locations.indexOf(locations[i]) === i, "Duplicate location " + locations[i]);
		}

		for (let i = Dex.getGen(); i >= 1; i--) {
			const dex = Dex.getDex('gen' + i);
			assertStrictEqual(dex.getPokemonCategory(dex.getExistingPokemon('Pikachu')), 'Mouse');
		}

		assertStrictEqual(Dex.getPokemonCategory(Dex.getExistingPokemon('Raichu')), 'Mouse');
		assertStrictEqual(Dex.getPokemonCategory(Dex.getExistingPokemon('Raichu-Alola')), 'Mouse');

		const categoryKeys = Object.keys(categories);
		for (let i = 0; i < categoryKeys.length; i++) {
			assert(Tools.toId(categoryKeys[i]) === categoryKeys[i], categoryKeys[i] + " should be an ID in categories.js");
			assert(categoryKeys.indexOf(categoryKeys[i]) === i, "Duplicate category for " + categoryKeys[i]);
		}

		const missingFormats: string[] = [];
		for (const i in formatLinks) {
			if (!Dex.getFormat(i)) missingFormats.push(i);
		}

		assert(!missingFormats.length, "Invalid formats for links: " + missingFormats.join(", "));
	});
	it('should return data based on ids', () => {
		const ability = Dex.getAbility("Air Lock");
		assert(ability);
		let variants: string[] = ["airlock", "air lock", "Air lock", "air Lock", "AIRLOCK", "AIR LOCK"];
		for (const variant of variants) {
			assertStrictEqual(Dex.getAbility(variant), ability);
		}

		const gen = Dex.getGen();
		const format = Dex.getFormat("[Gen " + gen + "] OU");
		assert(format);
		variants = ["gen" + gen + "ou", "gen" + gen + " ou", "Gen" + gen + "ou", "Gen" + gen + " ou"];
		for (const variant of variants) {
			assertStrictEqual(Dex.getFormat(variant)!.name, format.name);
		}

		const item = Dex.getItem("Burn Drive");
		assert(item);
		variants = ["burndrive", "burn drive", "Burn drive", "burn Drive", "BURNDRIVE", "BURN DRIVE"];
		for (const variant of variants) {
			assertStrictEqual(Dex.getItem(variant), item);
		}

		const move = Dex.getMove("Acid Armor");
		assert(move);
		variants = ["acidarmor", "acid armor", "Acid armor", "acid Armor", "ACIDARMOR", "ACID ARMOR"];
		for (const variant of variants) {
			assertStrictEqual(Dex.getMove(variant), move);
		}

		const nature = Dex.getNature("Adamant");
		assert(nature);
		variants = ["adamant", "ADAMANT"];
		for (const variant of variants) {
			assertStrictEqual(Dex.getNature(variant), nature);
		}

		const pokemon = Dex.getPokemon("Mr. Mime");
		assert(pokemon);
		variants = ["mrmime", "mr mime", "Mr mime", "mr Mime", "MRMIME", "MR MIME", "mr.mime", "mr. mime", "Mr. mime", "mr. Mime",
			"MR.MIME", "MR. MIME"];
		for (const variant of variants) {
			assertStrictEqual(Dex.getPokemon(variant), pokemon);
		}

		const type = Dex.getType("Water");
		assert(type);
		variants = ["water", "WATER"];
		for (const variant of variants) {
			assertStrictEqual(Dex.getType(variant), type);
		}
	});
	it('should properly determine data types', () => {
		const ability = Dex.getExistingAbility("Air Lock");
		const item = Dex.getExistingItem("Burn Drive");
		const move = Dex.getExistingMove("Acid Armor");
		const pokemon = Dex.getExistingPokemon("Mr. Mime");
		const fake = {effectType: "Fake", name: "Fake"};

		assertStrictEqual(Dex.isAbility(ability), true);
		assertStrictEqual(Dex.isAbility(item), false);
		assertStrictEqual(Dex.isAbility(move), false);
		assertStrictEqual(Dex.isAbility(pokemon), false);
		assertStrictEqual(Dex.isAbility(fake), false);

		assertStrictEqual(Dex.isItem(item), true);
		assertStrictEqual(Dex.isItem(ability), false);
		assertStrictEqual(Dex.isItem(move), false);
		assertStrictEqual(Dex.isItem(pokemon), false);
		assertStrictEqual(Dex.isItem(fake), false);

		assertStrictEqual(Dex.isMove(move), true);
		assertStrictEqual(Dex.isMove(ability), false);
		assertStrictEqual(Dex.isMove(item), false);
		assertStrictEqual(Dex.isMove(pokemon), false);
		assertStrictEqual(Dex.isMove(fake), false);

		assertStrictEqual(Dex.isPokemon(pokemon), true);
		assertStrictEqual(Dex.isPokemon(ability), false);
		assertStrictEqual(Dex.isPokemon(item), false);
		assertStrictEqual(Dex.isPokemon(move), false);
		assertStrictEqual(Dex.isPokemon(fake), false);
	});
	it('should run methods for all data types', function() {
		if (!testOptions.regression) return;

		this.timeout(60000);

		const dexData = Dex.getData();

		for (const i of dexData.abilityKeys) {
			const ability = Dex.getExistingAbility(i);
			Dex.getAbilityCopy(ability);
			Dex.getAbilityCopy(i);
		}

		for (const i of dexData.itemKeys) {
			const item = Dex.getExistingItem(i);
			Dex.getItemCopy(item);
			Dex.getItemCopy(i);
			Dex.getItemIcon(item);
		}

		for (const i of dexData.formatKeys) {
			const format = Dex.getExistingFormat(i);
			Dex.getFormatInfoDisplay(format);
			Dex.validateFormat(format.name);
			Dex.getUsableAbilities(format);
			Dex.getUsableItems(format);
			Dex.getUsableMoves(format);
			Dex.getUsablePokemon(format);
		}

		for (const i of dexData.moveKeys) {
			const move = Dex.getExistingMove(i);
			Dex.getMoveCopy(move);
			Dex.getMoveCopy(i);
			Dex.getMoveAvailability(move);
		}

		for (const i of dexData.pokemonKeys) {
			const pokemon = Dex.getExistingPokemon(i);

			if (pokemon.cosmeticFormes) {
				for (const forme of pokemon.cosmeticFormes) {
					assert(Dex.getPokemon(forme), forme);
				}
			}

			if (pokemon.otherFormes) {
				for (const forme of pokemon.otherFormes) {
					assert(Dex.getPokemon(forme), forme);
				}
			}

			Dex.getPokemonCopy(pokemon);
			Dex.getPokemonCopy(i);
			Dex.getPokemonCategory(pokemon);
			Dex.getFormes(pokemon);
			Dex.getEvolutionLines(pokemon);
			Dex.isPseudoLCPokemon(pokemon);
			Dex.getResistances(pokemon);
			Dex.getInverseResistances(pokemon);
			Dex.getWeaknesses(pokemon);
			Dex.getInverseWeaknesses(pokemon);
			if (Dex.hasModelData(pokemon)) {
				Dex.getPokemonModel(pokemon);
			}
			Dex.getPokemonIcon(pokemon);
		}
	});
	it('should set custom attributes for formats', () => {
		assertStrictEqual(Dex.getExistingFormat("ou").nameWithoutGen, "OU");

		for (const i of Dex.getData().formatKeys) {
			const format = Dex.getExistingFormat(i);
			assertStrictEqual(typeof format.nameWithoutGen, 'string');
			assertStrictEqual(typeof format.quickFormat, 'boolean');
			assertStrictEqual(typeof format.tournamentPlayable, 'boolean');
			assertStrictEqual(typeof format.unranked, 'boolean');
		}
	});
	it('should properly cache data', () => {
		assert(Dex.getExistingAbility("Air Lock") === Dex.getExistingAbility("Air Lock"));
		assert(Dex.getExistingItem("Burn Drive") === Dex.getExistingItem("Burn Drive"));
		assert(Dex.getExistingMove("Acid Armor") === Dex.getExistingMove("Acid Armor"));
		assert(Dex.getExistingNature("Adamant") === Dex.getExistingNature("Adamant"));
		assert(Dex.getExistingPokemon("Mr. Mime") === Dex.getExistingPokemon("Mr. Mime"));

		assert(Dex.getExistingFormat("[Gen 8] OU") !== Dex.getExistingFormat("[Gen 8] OU"));
		assert(Dex.getExistingFormat("[Gen 8] OU") !== Dex.getExistingFormat("[Gen 8] OU@@@+Lunala"));
	});
	it('should return proper trainer sprite ids', () => {
		assertStrictEqual(Dex.getTrainerSpriteId("Ace Trainer"), "acetrainer");
		assertStrictEqual(Dex.getTrainerSpriteId("acetrainer"), "acetrainer");
		assertStrictEqual(Dex.getTrainerSpriteId("acetrainer-gen4"), "acetrainer-gen4");
		assertStrictEqual(Dex.getTrainerSpriteId("agatha"), "agatha-gen3");
		assertStrictEqual(Dex.getTrainerSpriteId("agatha-gen3"), "agatha-gen3");
	});
	it('should return proper values from splitNameAndCustomRules()', () => {
		let split = Dex.splitNameAndCustomRules("ou");
		assertStrictEqual(split[0], "ou");
		assertStrictEqual(split[1].length, 0);

		split = Dex.splitNameAndCustomRules("ou@@@+Lunala");
		assertStrictEqual(split[0], "ou");
		assertStrictEqual(split[1].length, 1);
		assertStrictEqual(split[1][0], '+Lunala');

		split = Dex.splitNameAndCustomRules("ou@@@+Lunala,+Solgaleo");
		assertStrictEqual(split[0], "ou");
		assertStrictEqual(split[1].length, 2);
		assertStrictEqual(split[1][0], '+Lunala');
		assertStrictEqual(split[1][1], '+Solgaleo');
	});
	it('should have valid custom rule and format aliases', () => {
		const customRuleAliases = Dex.getCustomRuleAliases();
		for (const i in customRuleAliases) {
			for (const rule of customRuleAliases[i]) {
				assert(Dex.validateRule(rule), i);
			}
		}

		const customRuleFormats = Dex.getCustomRuleFormats();
		for (const i in customRuleFormats) {
			assert(Dex.validateFormat(customRuleFormats[i].format + '@@@' + customRuleFormats[i].banlist), i);
		}

		assert(Dex.resolveCustomRuleAliases(["ou"]).length > 1);
		assertStrictEqual(Dex.resolveCustomRuleAliases(["-ou"]).join(','), "-ou");
		assertStrictEqual(Dex.resolveCustomRuleAliases(["+ou"]).join(','), "+ou");
	});
	it('should support all types of custom rule aliases', () => {
		const gen = Dex.getGen();
		let format = Dex.getExistingFormat("ou@@@+Lunala");
		assert(format.customRules);
		assertStrictEqual(format.customRules.length, 1);
		assertStrictEqual(format.customRules[0], '+Lunala');
		assertStrictEqual(format.id, 'gen' + gen + 'ou');

		format = Dex.getExistingFormat("uubl");
		assert(format.customRules);
		assertStrictEqual(format.customRules.length, 1);
		assertStrictEqual(format.customRules[0], '+UUBL');
		assertStrictEqual(format.id, 'gen' + gen + 'uu');

		format = Dex.getExistingFormat("UUBL");
		assert(format.customRules);
		assertStrictEqual(format.customRules.length, 1);
		assertStrictEqual(format.customRules[0], '+UUBL');
		assertStrictEqual(format.id, 'gen' + gen + 'uu');

		format = Dex.getExistingFormat("uubl@@@+Lunala");
		assert(format.customRules);
		assertStrictEqual(format.customRules.length, 2);
		assertStrictEqual(format.customRules[0], '+Lunala');
		assertStrictEqual(format.customRules[1], '+UUBL');
		assertStrictEqual(format.id, 'gen' + gen + 'uu');

		format = Dex.getExistingFormat("gen7uubl");
		assert(format.customRules);
		assertStrictEqual(format.customRules.length, 1);
		assertStrictEqual(format.customRules[0], '+UUBL');
		assertStrictEqual(format.id, 'gen7uu');

		format = Dex.getExistingFormat("gen7uubl@@@+Lugia");
		assert(format.customRules);
		assertStrictEqual(format.customRules.length, 2);
		assertStrictEqual(format.customRules[0], '+Lugia');
		assertStrictEqual(format.customRules[1], '+UUBL');
		assertStrictEqual(format.id, 'gen7uu');

		format = Dex.getExistingFormat("monotype uu");
		assert(format.customRules);
		assertStrictEqual(format.customRules.length, 1);
		assertStrictEqual(format.customRules[0], 'Same Type Clause');
		assertStrictEqual(format.id, 'gen' + gen + 'uu');

		format = Dex.getExistingFormat("monotype uubl");
		assert(format.customRules);
		assertStrictEqual(format.customRules.length, 2);
		assertStrictEqual(format.customRules[0], 'Same Type Clause');
		assertStrictEqual(format.customRules[1], '+UUBL');
		assertStrictEqual(format.id, 'gen' + gen + 'uu');

		format = Dex.getExistingFormat("monotype gen7uu");
		assert(format.customRules);
		assertStrictEqual(format.customRules.length, 1);
		assertStrictEqual(format.customRules[0], 'Same Type Clause');
		assertStrictEqual(format.id, 'gen7uu');

		format = Dex.getExistingFormat("monotype gen7uubl");
		assert(format.customRules);
		assertStrictEqual(format.customRules.length, 2);
		assertStrictEqual(format.customRules[0], 'Same Type Clause');
		assertStrictEqual(format.customRules[1], '+UUBL');
		assertStrictEqual(format.id, 'gen7uu');

		format = Dex.getExistingFormat("monotype doubles ou");
		assert(format.customRules);
		assertStrictEqual(format.customRules.length, 1);
		assertStrictEqual(format.customRules[0], 'Same Type Clause');
		assertStrictEqual(format.id, 'gen' + gen + 'doublesou');

		format = Dex.getExistingFormat("monobug ou");
		assert(format.customRules);
		assertStrictEqual(format.customRules.length, 1);
		assertStrictEqual(format.customRules[0], 'Force Monotype = Bug');
		assertStrictEqual(format.id, 'gen' + gen + 'ou');

		format = Dex.getExistingFormat("level5 ou");
		assert(format.customRules);
		assertStrictEqual(format.customRules.length, 1);
		assertStrictEqual(format.customRules[0], 'Adjust Level = 5');
		assertStrictEqual(format.id, 'gen' + gen + 'ou');

		format = Dex.getExistingFormat("1move ou");
		assert(format.customRules);
		assertStrictEqual(format.customRules.length, 1);
		assertStrictEqual(format.customRules[0], 'Max Move Count = 1');
		assertStrictEqual(format.id, 'gen' + gen + 'ou');

		format = Dex.getExistingFormat("bring1 ou");
		assert(format.customRules);
		assertStrictEqual(format.customRules.length, 1);
		assertStrictEqual(format.customRules[0], 'Max Team Size = 1');
		assertStrictEqual(format.id, 'gen' + gen + 'ou');

		format = Dex.getExistingFormat("pick1 ou");
		assert(format.customRules);
		assertStrictEqual(format.customRules.length, 1);
		assertStrictEqual(format.customRules[0], 'Picked Team Size = 1');
		assertStrictEqual(format.id, 'gen' + gen + 'ou');
	});
	it('should properly parse custom rules in separateCustomRules()', () => {
		const customRules: string[] = ["-Pikachu", "+Charizard", "*Kubfu", "Same Type Clause", "!Team Preview"];
		let separatedCustomRules: ISeparatedCustomRules = Dex.separateCustomRules(customRules);
		assertStrictEqual(separatedCustomRules.addedbans.length, 1);
		assertStrictEqual(separatedCustomRules.addedbans[0], "Pikachu");
		assertStrictEqual(separatedCustomRules.removedbans.length, 1);
		assertStrictEqual(separatedCustomRules.removedbans[0], "Charizard");
		assertStrictEqual(separatedCustomRules.addedrestrictions.length, 1);
		assertStrictEqual(separatedCustomRules.addedrestrictions[0], "Kubfu");
		assertStrictEqual(separatedCustomRules.addedrules.length, 1);
		assertStrictEqual(separatedCustomRules.addedrules[0], "Same Type Clause");
		assertStrictEqual(separatedCustomRules.removedrules.length, 1);
		assertStrictEqual(separatedCustomRules.removedrules[0], "Team Preview");

		separatedCustomRules = Dex.separateCustomRules(["-no item"]);
		assertStrictEqual(separatedCustomRules.addedbans.length, 1);
		assertStrictEqual(separatedCustomRules.addedbans[0], "Empty Item");

		separatedCustomRules = Dex.separateCustomRules(["-no ability"]);
		assertStrictEqual(separatedCustomRules.addedbans.length, 1);
		assertStrictEqual(separatedCustomRules.addedbans[0], "Empty Ability");
	});
	it('should return expected custom format names in getCustomFormatName()', () => {
		let format = Dex.getExistingFormat("ou@@@+Lunala");
		assertStrictEqual(Dex.getCustomFormatName(format), "[Gen 9] OU (Plus Lunala)");

		format = Dex.getExistingFormat("ou@@@+Moody");
		assertStrictEqual(Dex.getCustomFormatName(format), "[Gen 9] OU (Plus Moody)");

		format = Dex.getExistingFormat("ou@@@+King's Rock");
		assertStrictEqual(Dex.getCustomFormatName(format), "[Gen 9] OU (Plus King's Rock)");

		format = Dex.getExistingFormat("ou@@@+Lunala,+Moody,+King's Rock");
		assertStrictEqual(Dex.getCustomFormatName(format), "[Gen 9] OU (Plus Lunala, Moody, and King's Rock)");

		format = Dex.getExistingFormat("ou@@@-Pikachu");
		assertStrictEqual(Dex.getCustomFormatName(format), "(No Pikachu) [Gen 9] OU");

		format = Dex.getExistingFormat("ou@@@-Adaptability");
		assertStrictEqual(Dex.getCustomFormatName(format), "(No Adaptability) [Gen 9] OU");

		format = Dex.getExistingFormat("ou@@@-Absorb Bulb");
		assertStrictEqual(Dex.getCustomFormatName(format), "(No Absorb Bulb) [Gen 9] OU");

		format = Dex.getExistingFormat("ou@@@-Pikachu,-Adaptability,-Absorb Bulb");
		assertStrictEqual(Dex.getCustomFormatName(format), "(No Pikachu, Adaptability, or Absorb Bulb) [Gen 9] OU");

		format = Dex.getExistingFormat("ou@@@Same Type Clause");
		assertStrictEqual(Dex.getCustomFormatName(format), "Monotype [Gen 9] OU");

		format = Dex.getExistingFormat("ou@@@!Team Preview");
		assertStrictEqual(Dex.getCustomFormatName(format), "(No Team Preview) [Gen 9] OU");

		format = Dex.getExistingFormat("ou@@@Same Type Clause,!Team Preview");
		assertStrictEqual(Dex.getCustomFormatName(format), "(No Team Preview) Monotype [Gen 9] OU");

		format = Dex.getExistingFormat("ou@@@+Lunala,-Pikachu,Same Type Clause,!Team Preview");
		assertStrictEqual(Dex.getCustomFormatName(format), "(No Pikachu or Team Preview) Monotype [Gen 9] OU (Plus Lunala)");

		format = Dex.getExistingFormat("ou@@@*Tackle");
		assertStrictEqual(Dex.getCustomFormatName(format), "[Gen 9] OU (Restricted Tackle)");

		format = Dex.getExistingFormat("ou@@@+Lunala,*Tackle");
		assertStrictEqual(Dex.getCustomFormatName(format), "[Gen 9] OU (Plus Lunala) (Restricted Tackle)");
	});
	it('should return proper values from isImmune()', () => {
		const normalTypeMove = Dex.getExistingMove('Tackle');
		const ghostTypePokemon = Dex.getExistingPokemon('Duskull');

		assertStrictEqual(Dex.isImmune('Normal', 'Ghost'), true);
		assertStrictEqual(Dex.isImmune('Normal', ['Ghost']), true);
		assertStrictEqual(Dex.isImmune('Normal', ghostTypePokemon), true);
		assertStrictEqual(Dex.isImmune(normalTypeMove, 'Ghost'), true);
		assertStrictEqual(Dex.isImmune(normalTypeMove, ['Ghost']), true);
		assertStrictEqual(Dex.isImmune(normalTypeMove, ghostTypePokemon), true);

		const fireTypePokemon = Dex.getExistingPokemon('Charmander');

		assertStrictEqual(Dex.isImmune('Normal', 'Fire'), false);
		assertStrictEqual(Dex.isImmune('Normal', ['Fire']), false);
		assertStrictEqual(Dex.isImmune('Normal', fireTypePokemon), false);
		assertStrictEqual(Dex.isImmune(normalTypeMove, 'Fire'), false);
		assertStrictEqual(Dex.isImmune(normalTypeMove, ['Fire']), false);
		assertStrictEqual(Dex.isImmune(normalTypeMove, fireTypePokemon), false);

		const waterTypeMove = Dex.getExistingMove('Surf');

		assertStrictEqual(Dex.isImmune('Water', 'Fire'), false);
		assertStrictEqual(Dex.isImmune('Water', ['Fire']), false);
		assertStrictEqual(Dex.isImmune('Water', fireTypePokemon), false);
		assertStrictEqual(Dex.isImmune(waterTypeMove, 'Fire'), false);
		assertStrictEqual(Dex.isImmune(waterTypeMove, ['Fire']), false);
		assertStrictEqual(Dex.isImmune(waterTypeMove, fireTypePokemon), false);

		const fireTypeMove = Dex.getExistingMove('Ember');
		const waterTypePokemon = Dex.getExistingPokemon('Squirtle');

		assertStrictEqual(Dex.isImmune('Fire', 'Water'), false);
		assertStrictEqual(Dex.isImmune('Fire', ['Water']), false);
		assertStrictEqual(Dex.isImmune('Fire', waterTypePokemon), false);
		assertStrictEqual(Dex.isImmune(fireTypeMove, 'Water'), false);
		assertStrictEqual(Dex.isImmune(fireTypeMove, ['Water']), false);
		assertStrictEqual(Dex.isImmune(fireTypeMove, waterTypePokemon), false);
	});
	it('should return proper values from getEffectiveness()', () => {
		const waterTypeMove = Dex.getExistingMove('Surf');
		const fireTypePokemon = Dex.getExistingPokemon('Charmander');

		assertStrictEqual(Dex.getEffectiveness('Water', 'Fire'), 1);
		assertStrictEqual(Dex.getEffectiveness('Water', ['Fire']), 1);
		assertStrictEqual(Dex.getEffectiveness('Water', fireTypePokemon), 1);
		assertStrictEqual(Dex.getEffectiveness(waterTypeMove, 'Fire'), 1);
		assertStrictEqual(Dex.getEffectiveness(waterTypeMove, ['Fire']), 1);
		assertStrictEqual(Dex.getEffectiveness(waterTypeMove, fireTypePokemon), 1);

		assertStrictEqual(Dex.getEffectiveness('Water', ['Rock', 'Ground']), 2);
		assertStrictEqual(Dex.getEffectiveness('Water', Dex.getExistingPokemon('Golem')), 2);
		assertStrictEqual(Dex.getEffectiveness(waterTypeMove, ['Rock', 'Ground']), 2);
		assertStrictEqual(Dex.getEffectiveness(waterTypeMove, Dex.getExistingPokemon('Golem')), 2);

		const fireTypeMove = Dex.getExistingMove('Ember');
		const waterTypePokemon = Dex.getExistingPokemon('Squirtle');

		assertStrictEqual(Dex.getEffectiveness('Fire', 'Water'), -1);
		assertStrictEqual(Dex.getEffectiveness('Fire', ['Water']), -1);
		assertStrictEqual(Dex.getEffectiveness('Fire', waterTypePokemon), -1);
		assertStrictEqual(Dex.getEffectiveness(fireTypeMove, 'Water'), -1);
		assertStrictEqual(Dex.getEffectiveness(fireTypeMove, ['Water']), -1);
		assertStrictEqual(Dex.getEffectiveness(fireTypeMove, waterTypePokemon), -1);

		assertStrictEqual(Dex.getEffectiveness('Fire', ['Rock', 'Fire']), -2);
		assertStrictEqual(Dex.getEffectiveness('Fire', Dex.getExistingPokemon('Magcargo')), -2);
		assertStrictEqual(Dex.getEffectiveness(fireTypeMove, ['Rock', 'Fire']), -2);
		assertStrictEqual(Dex.getEffectiveness(fireTypeMove, Dex.getExistingPokemon('Magcargo')), -2);

		const normalTypeMove = Dex.getExistingMove('Tackle');
		const ghostTypePokemon = Dex.getExistingPokemon('Duskull');

		assertStrictEqual(Dex.getEffectiveness('Normal', 'Ghost'), 0);
		assertStrictEqual(Dex.getEffectiveness('Normal', ['Ghost']), 0);
		assertStrictEqual(Dex.getEffectiveness('Normal', ghostTypePokemon), 0);
		assertStrictEqual(Dex.getEffectiveness(normalTypeMove, 'Ghost'), 0);
		assertStrictEqual(Dex.getEffectiveness(normalTypeMove, ['Ghost']), 0);
		assertStrictEqual(Dex.getEffectiveness(normalTypeMove, ghostTypePokemon), 0);

		assertStrictEqual(Dex.getEffectiveness('Normal', ['Ghost', 'Dark']), 0);
		assertStrictEqual(Dex.getEffectiveness('Normal', Dex.getExistingPokemon('Spiritomb')), 0);
		assertStrictEqual(Dex.getEffectiveness(normalTypeMove, ['Ghost', 'Dark']), 0);
		assertStrictEqual(Dex.getEffectiveness(normalTypeMove, Dex.getExistingPokemon('Spiritomb')), 0);
	});
	it('should return proper values from getMoveAvailability()', () => {
		assertStrictEqual(Dex.getMoveAvailability(Dex.getExistingMove("Tackle")), 462);
		assertStrictEqual(Dex.getMoveAvailability(Dex.getExistingMove("Aeroblast")), 2);

		// bypass gen 8 Sketch check
		assertStrictEqual(Dex.getMoveAvailability(Dex.getExistingMove("Aura Wheel")), 3);

		assertStrictEqual(Dex.getMoveAvailabilityPokemon(Dex.getExistingMove("Origin Pulse")).join(','), 'Kyogre,Kyogre-Primal');
		assertStrictEqual(Dex.getMoveAvailabilityPokemon(Dex.getExistingMove("Toxic Thread")).join(','), 'Spinarak,Ariados');
		assertStrictEqual(Dex.getMoveAvailabilityPokemon(Dex.getExistingMove("Kinesis")).join(','), 'Kadabra,Alakazam,Alakazam-Mega');
		assertStrictEqual(Dex.getMoveAvailabilityPokemon(Dex.getExistingMove("Judgment")).join(','), 'Arceus,Arceus-Bug,Arceus-Dark,' +
			'Arceus-Dragon,Arceus-Electric,Arceus-Fairy,Arceus-Fighting,Arceus-Fire,Arceus-Flying,Arceus-Ghost,Arceus-Grass,' +
			'Arceus-Ground,Arceus-Ice,Arceus-Poison,Arceus-Psychic,Arceus-Rock,Arceus-Steel,Arceus-Water');
		assertStrictEqual(Dex.getMoveAvailabilityPokemon(Dex.getExistingMove("Volt Tackle")).join(','), 'Pikachu,Pikachu-Original,' +
			'Pikachu-Hoenn,Pikachu-Sinnoh,Pikachu-Unova,Pikachu-Kalos,Pikachu-Alola,Pikachu-Partner,Pikachu-Gmax,Pikachu-World,Raichu,' +
			'Raichu-Alola,Pichu,Pichu-Spiky-eared');
	});
	it('should return proper values from isSignatureMove()', () => {
		assert(!Dex.isSignatureMove(Dex.getExistingMove("Tackle")));

		// no evolutions
		assert(Dex.isSignatureMove(Dex.getExistingMove("Origin Pulse")));

		// evolution line
		assert(Dex.isSignatureMove(Dex.getExistingMove("Toxic Thread")));

		// mega evolution
		assert(Dex.isSignatureMove(Dex.getExistingMove("Kinesis")));

		// base formes
		assert(Dex.isSignatureMove(Dex.getExistingMove("Judgment")));

		// base formes + evolutions
		assert(Dex.isSignatureMove(Dex.getExistingMove("Volt Tackle")));
	});
	it('should return proper values from isPseudoLCPokemon()', () => {
		assertStrictEqual(Dex.isPseudoLCPokemon(Dex.getExistingPokemon('Pichu')), false);
		assertStrictEqual(Dex.isPseudoLCPokemon(Dex.getExistingPokemon('Pikachu')), false);
		assertStrictEqual(Dex.isPseudoLCPokemon(Dex.getExistingPokemon('Raichu')), false);
		// assertStrictEqual(Dex.isPseudoLCPokemon(Dex.getExistingPokemon('Ferroseed')), true);
	});
	it('should return proper values from getEvolutionLines()', () => {
		const pokemonList = ['Charmander', 'Charmeleon', 'Charizard'];
		for (const pokemon of pokemonList) {
			const evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon(pokemon));
			assertStrictEqual(evolutionLines.length, 1);
			assertStrictEqual(evolutionLines[0].join(","), 'Charmander,Charmeleon,Charizard');
		}

		let evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon('Charizard-Mega-X'));
		assertStrictEqual(evolutionLines.length, 2);
		assertStrictEqual(evolutionLines[0].join(','), 'Charizard-Mega-X');
		assertStrictEqual(evolutionLines[1].join(","), 'Charmander,Charmeleon,Charizard');

		evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon('Ditto'));
		assertStrictEqual(evolutionLines.length, 1);
		assertStrictEqual(evolutionLines[0].join(','), 'Ditto');

		evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon('Gloom'));
		assertStrictEqual(evolutionLines.length, 2);
		assertStrictEqual(evolutionLines[0].join(","), 'Oddish,Gloom,Vileplume');
		assertStrictEqual(evolutionLines[1].join(","), 'Oddish,Gloom,Bellossom');
		evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon('Vileplume'));
		assertStrictEqual(evolutionLines.length, 1);
		assertStrictEqual(evolutionLines[0].join(","), 'Oddish,Gloom,Vileplume');
		evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon('Bellossom'));
		assertStrictEqual(evolutionLines.length, 1);
		assertStrictEqual(evolutionLines[0].join(","), 'Oddish,Gloom,Bellossom');

		evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon('Tyrogue'));
		assertStrictEqual(evolutionLines.length, 3);
		assertStrictEqual(evolutionLines[0].join(","), 'Tyrogue,Hitmonlee');
		assertStrictEqual(evolutionLines[1].join(","), 'Tyrogue,Hitmonchan');
		assertStrictEqual(evolutionLines[2].join(","), 'Tyrogue,Hitmontop');

		evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon('Zigzagoon'));
		assertStrictEqual(evolutionLines.length, 1);
		assertStrictEqual(evolutionLines[0].join(","), 'Zigzagoon,Linoone');
		evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon('Linoone'));
		assertStrictEqual(evolutionLines.length, 1);
		assertStrictEqual(evolutionLines[0].join(","), 'Zigzagoon,Linoone');
		evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon('Zigzagoon'), ['Zigzagoon-Galar']);
		assertStrictEqual(evolutionLines.length, 2);
		assertStrictEqual(evolutionLines[0].join(","), 'Zigzagoon,Linoone');
		assertStrictEqual(evolutionLines[1].join(","), 'Zigzagoon-Galar,Linoone-Galar,Obstagoon');
		evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon('Zigzagoon-Galar'));
		assertStrictEqual(evolutionLines.length, 1);
		assertStrictEqual(evolutionLines[0].join(","), 'Zigzagoon-Galar,Linoone-Galar,Obstagoon');
		evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon('Linoone-Galar'));
		assertStrictEqual(evolutionLines.length, 1);
		assertStrictEqual(evolutionLines[0].join(","), 'Zigzagoon-Galar,Linoone-Galar,Obstagoon');
		evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon('Obstagoon'));
		assertStrictEqual(evolutionLines.length, 1);
		assertStrictEqual(evolutionLines[0].join(","), 'Zigzagoon-Galar,Linoone-Galar,Obstagoon');
	});
	it('should return proper values from isEvolutionFamily()', () => {
		assert(Dex.isEvolutionFamily(['Charmander', 'Charmeleon', 'Charizard']));
		assert(Dex.isEvolutionFamily(['Charmander', 'Charmeleon', 'Charizard-Mega-X']));
		assert(Dex.isEvolutionFamily(['Charmander', 'Charmeleon', 'Charizard-Mega-Y']));
		assert(Dex.isEvolutionFamily(['Charmander', 'Charmeleon']));
		assert(Dex.isEvolutionFamily(['Charmeleon', 'Charizard']));
		assert(Dex.isEvolutionFamily(['Charmeleon', 'Charizard-Mega-X']));
		assert(Dex.isEvolutionFamily(['Charmeleon', 'Charizard-Mega-Y']));
		assert(Dex.isEvolutionFamily(['Charmander', 'Charizard']));
		assert(Dex.isEvolutionFamily(['Charmander', 'Charizard-Mega-X']));
		assert(Dex.isEvolutionFamily(['Charmander', 'Charizard-Mega-Y']));
		assert(Dex.isEvolutionFamily(['Charmander']));
		assert(Dex.isEvolutionFamily(['Charmeleon']));
		assert(Dex.isEvolutionFamily(['Charizard']));
		assert(Dex.isEvolutionFamily(['Charizard-Mega-X']));
		assert(Dex.isEvolutionFamily(['Charizard-Mega-Y']));
		assert(Dex.isEvolutionFamily(['Charizard', 'Charizard-Mega-X']));
		assert(Dex.isEvolutionFamily(['Charizard', 'Charizard-Mega-Y']));
		assert(!Dex.isEvolutionFamily(['Bulbasaur', 'Charmeleon', 'Charizard']));
		assert(Dex.isEvolutionFamily(['Tyrogue', 'Hitmonlee']));
		assert(Dex.isEvolutionFamily(['Tyrogue', 'Hitmonchan']));
		assert(Dex.isEvolutionFamily(['Tyrogue', 'Hitmontop']));
		assert(!Dex.isEvolutionFamily(['Tyrogue', 'Hitmonlee', 'Hitmonchan']));
		assert(Dex.isEvolutionFamily(['Oddish', 'Gloom', 'Vileplume']));
		assert(Dex.isEvolutionFamily(['Oddish', 'Gloom', 'Bellossom']));
		assert(Dex.isEvolutionFamily(['Oddish', 'Vileplume']));
		assert(Dex.isEvolutionFamily(['Oddish', 'Bellossom']));
	});
	it('should return proper values from includesPokemon()', () => {
		assert(Dex.includesPokemon(['Pikachu'], ['Pikachu']));
		assert(Dex.includesPokemon(['Pikachu', 'Charmander'], ['Pikachu']));

		assert(!Dex.includesPokemon(['Pikachu'], ['Pikachu', 'Charmander']));
		assert(!Dex.includesPokemon(['Pikachu'], ['Charmander']));
	});
	it('should return proper values from includesPokemonFormes()', () => {
		assert(Dex.includesPokemonFormes(['Vulpix'], [['Vulpix'], ['Vulpix-Alola']]));
		assert(Dex.includesPokemonFormes(['Vulpix-Alola'], [['Vulpix'], ['Vulpix-Alola']]));
	});
	it('should return proper values from getUsablePokemon()', () => {
		let usablePokemon = Dex.getUsablePokemon(Dex.getExistingFormat("gen8ou"));
		assert(usablePokemon.includes(Dex.getExistingPokemon('Pikachu').name));
		assert(usablePokemon.includes(Dex.getExistingPokemon('Pikachu-Sinnoh').name));
		assert(usablePokemon.includes(Dex.getExistingPokemon('Gastrodon').name));
		assert(usablePokemon.includes(Dex.getExistingPokemon('Gastrodon-East').name));
		assert(usablePokemon.includes(Dex.getExistingPokemon('Meowth').name));
		assert(usablePokemon.includes(Dex.getExistingPokemon('Meowth-Alola').name));
		assert(usablePokemon.includes(Dex.getExistingPokemon('Meowth-Galar').name));
		assert(usablePokemon.includes(Dex.getExistingPokemon('Darmanitan-Zen').name));
		assert(!usablePokemon.includes(Dex.getExistingPokemon('Lunala').name));
		assert(!usablePokemon.includes(Dex.getExistingPokemon('Voodoom').name));
		assert(!usablePokemon.includes(Dex.getExistingPokemon('Missingno.').name));
		assert(!usablePokemon.includes(Dex.getExistingPokemon('Pokestar Smeargle').name));

		usablePokemon = Dex.getUsablePokemon(Dex.getExistingFormat("gen8ubers"));
		assert(usablePokemon.includes(Dex.getExistingPokemon('Pikachu').name));
		assert(usablePokemon.includes(Dex.getExistingPokemon('Giratina').name));
		assert(usablePokemon.includes(Dex.getExistingPokemon('Giratina-Origin').name));
		assert(usablePokemon.includes(Dex.getExistingPokemon('Keldeo-Resolute').name));
		assert(!usablePokemon.includes(Dex.getExistingPokemon('Voodoom').name));
		assert(!usablePokemon.includes(Dex.getExistingPokemon('Missingno.').name));
		assert(!usablePokemon.includes(Dex.getExistingPokemon('Pokestar Smeargle').name));

		usablePokemon = Dex.getUsablePokemon(Dex.getExistingFormat("gen8ou@@@+Lunala"));
		assert(usablePokemon.includes(Dex.getExistingPokemon('Pikachu').name));
		assert(usablePokemon.includes(Dex.getExistingPokemon('Lunala').name));
		assert(!usablePokemon.includes(Dex.getExistingPokemon('Voodoom').name));
		assert(!usablePokemon.includes(Dex.getExistingPokemon('Missingno.').name));
		assert(!usablePokemon.includes(Dex.getExistingPokemon('Pokestar Smeargle').name));

		usablePokemon = Dex.getUsablePokemon(Dex.getExistingFormat("gen8lc"));
		assert(usablePokemon.includes(Dex.getExistingPokemon('Pawniard').name));
		assert(usablePokemon.includes(Dex.getExistingPokemon('Pichu').name));
		assert(!usablePokemon.includes(Dex.getExistingPokemon('Pikachu').name));

		// usablePokemon = Dex.getUsablePokemon(Dex.getExistingFormat("gen8nationaldexag"));
		// assert(usablePokemon.includes(Dex.getExistingPokemon('Arceus-Bug').name));

		// all abilities banned
		usablePokemon = Dex.getUsablePokemon(Dex.getExistingFormat("gen9almostanyability"));
		assert(!usablePokemon.includes(Dex.getExistingPokemon('Komala').name));
	});
	it('should return proper values from isPossibleTeam()', () => {
		let teams = [['Charmander', 'Squirtle']];
		assert(Dex.isPossibleTeam(['Charmander', 'Squirtle'], teams));
		assert(!Dex.isPossibleTeam(['Charmander'], teams));
		assert(!Dex.isPossibleTeam(['Squirtle'], teams));

		teams = [['Squirtle', 'Charmander']];
		assert(Dex.isPossibleTeam(['Charmander', 'Squirtle'], teams));
		assert(!Dex.isPossibleTeam(['Charmander'], teams));
		assert(!Dex.isPossibleTeam(['Squirtle'], teams));
	});
	it('should return proper values from getFormes()', () => {
		let formes = Dex.getFormes(Dex.getExistingPokemon('Bulbasaur'));
		assertStrictEqual(formes.length, 1);
		assert(formes.includes("Bulbasaur"));

		formes = Dex.getFormes(Dex.getExistingPokemon('Meowth'));
		assertStrictEqual(formes.length, 3);
		assert(formes.includes("Meowth"));
		assert(formes.includes("Meowth-Alola"));
		assert(formes.includes("Meowth-Galar"));

		formes = Dex.getFormes(Dex.getExistingPokemon('Meowth-Alola'));
		assertStrictEqual(formes.length, 3);
		assert(formes.includes("Meowth"));
		assert(formes.includes("Meowth-Alola"));
		assert(formes.includes("Meowth-Galar"));

		formes = Dex.getFormes(Dex.getExistingPokemon('Gastrodon'), true);
		assertStrictEqual(formes.length, 1);
		assert(formes.includes("Gastrodon"));

		formes = Dex.getFormes(Dex.getExistingPokemon('Gastrodon'));
		assertStrictEqual(formes.length, 2);
		assert(formes.includes("Gastrodon"));
		assert(formes.includes("Gastrodon-East"));

		// repeated to test not caching
		formes = Dex.getFormes(Dex.getExistingPokemon('Gastrodon'), true);
		assertStrictEqual(formes.length, 1);
		assert(formes.includes("Gastrodon"));

		formes = Dex.getDex("gen5").getFormes(Dex.getExistingPokemon('Pikachu'));
		assertStrictEqual(formes.length, 1);

		formes = Dex.getDex("gen6").getFormes(Dex.getExistingPokemon('Pikachu'));
		assertStrictEqual(formes.length, 7);

		formes = Dex.getDex("gen7").getFormes(Dex.getExistingPokemon('Pikachu'));
		assertStrictEqual(formes.length, 15);

		formes = Dex.getDex("gen8").getFormes(Dex.getExistingPokemon('Pikachu'));
		assertStrictEqual(formes.length, 16);
	});
	it('should return proper values from getFormeCombinations()', () => {
		let combinations = Dex.getFormeCombinations(['Bulbasaur']).map(x => x.join(","));
		assertStrictEqual(combinations.length, 1);
		assert(combinations.includes("Bulbasaur"));

		combinations = Dex.getFormeCombinations(['Meowth']).map(x => x.join(","));
		assertStrictEqual(combinations.length, 3);
		assert(combinations.includes("Meowth"));
		assert(combinations.includes("Meowth-Alola"));
		assert(combinations.includes("Meowth-Galar"));

		combinations = Dex.getFormeCombinations(['Meowth'], ['Meowth', 'Meowth-Alola']).map(x => x.join(","));
		assertStrictEqual(combinations.length, 2);
		assert(combinations.includes("Meowth"));
		assert(combinations.includes("Meowth-Alola"));

		combinations = Dex.getFormeCombinations(['Gastrodon']).map(x => x.join(","));
		assertStrictEqual(combinations.length, 2);
		assert(combinations.includes("Gastrodon"));
		assert(combinations.includes("Gastrodon-East"));

		combinations = Dex.getFormeCombinations(['Bulbasaur', 'Meowth']).map(x => x.join(","));
		assertStrictEqual(combinations.length, 3);
		assert(combinations.includes("Bulbasaur,Meowth"));
		assert(combinations.includes("Bulbasaur,Meowth-Alola"));
		assert(combinations.includes("Bulbasaur,Meowth-Galar"));
	});
	it('should return proper values from getPossibleTeams()', () => {
		// catch and evolve

		// 1 optional addition and 1 optional evolution
		let possibleTeams = Dex.getPossibleTeams([["Bulbasaur"]], ["Charmander"], {additions: 1, evolutions: 1}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 5);
		assert(possibleTeams.includes('Bulbasaur'));
		assert(possibleTeams.includes('Ivysaur'));
		assert(possibleTeams.includes('Bulbasaur,Charmander'));
		assert(possibleTeams.includes('Bulbasaur,Charmeleon'));
		assert(possibleTeams.includes('Charmander,Ivysaur'));

		// 1 required addition and 1 optional evolution
		possibleTeams = Dex.getPossibleTeams([["Bulbasaur"]], ["Charmander"], {additions: 1, evolutions: 1, requiredAddition: true})
			.map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 3);
		assert(possibleTeams.includes('Bulbasaur,Charmander'));
		assert(possibleTeams.includes('Bulbasaur,Charmeleon'));
		assert(possibleTeams.includes('Charmander,Ivysaur'));

		// 1 required addition and 1 required evolution
		possibleTeams = Dex.getPossibleTeams([["Bulbasaur"]], ["Charmander"],
			{additions: 1, evolutions: 1, requiredAddition: true, requiredEvolution: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 2);
		assert(possibleTeams.includes('Bulbasaur,Charmeleon'));
		assert(possibleTeams.includes('Charmander,Ivysaur'));

		// 1 optional addition and 1 required evolution
		possibleTeams = Dex.getPossibleTeams([["Bulbasaur"]], ["Charmander"], {additions: 1, evolutions: 1, requiredEvolution: true})
			.map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 3);
		assert(possibleTeams.includes('Ivysaur'));
		assert(possibleTeams.includes('Bulbasaur,Charmeleon'));
		assert(possibleTeams.includes('Charmander,Ivysaur'));

		// no additions left
		possibleTeams = Dex.getPossibleTeams([["Bulbasaur", "Charmander", "Squirtle", "Chikorita", "Cyndaquil", "Totodile"]], ["Pikachu"],
			{additions: 1, evolutions: 1, requiredAddition: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 7);

		// no evolutions left
		possibleTeams = Dex.getPossibleTeams([["Venusaur"]], ["Charizard"], {additions: 1, evolutions: 1, requiredEvolution: true})
			.map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 2);
		assert(possibleTeams.includes('Venusaur'));
		assert(possibleTeams.includes('Charizard,Venusaur'));

		// no additions or evolutions left
		possibleTeams = Dex.getPossibleTeams([["Venusaur", "Charizard", "Blastoise", "Meganium", "Typhlosion", "Feraligatr"]], ["Pikachu"],
			{additions: 1, evolutions: 1, requiredAddition: true, requiredEvolution: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 1);

		// allow formes
		possibleTeams = Dex.getPossibleTeams([["Bulbasaur"]], ["Meowth"], {additions: 1, evolutions: 1, allowFormes: true})
			.map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 11);
		assert(possibleTeams.includes('Bulbasaur'));
		assert(possibleTeams.includes('Ivysaur'));
		assert(possibleTeams.includes('Bulbasaur,Meowth'));
		assert(possibleTeams.includes('Bulbasaur,Persian'));
		assert(possibleTeams.includes('Bulbasaur,Meowth-Alola'));
		assert(possibleTeams.includes('Bulbasaur,Persian-Alola'));
		assert(possibleTeams.includes('Bulbasaur,Meowth-Galar'));
		assert(possibleTeams.includes('Bulbasaur,Perrserker'));
		assert(possibleTeams.includes('Ivysaur,Meowth'));
		assert(possibleTeams.includes('Ivysaur,Meowth-Alola'));
		assert(possibleTeams.includes('Ivysaur,Meowth-Galar'));
		possibleTeams = Dex.getPossibleTeams([["Bulbasaur"]], ["Meowth-Alola"], {additions: 1, evolutions: 1, allowFormes: true})
			.map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 11);
		possibleTeams = Dex.getPossibleTeams([["Bulbasaur"]], ["Meowth-Galar"], {additions: 1, evolutions: 1, allowFormes: true})
			.map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 11);

		possibleTeams = Dex.getPossibleTeams([["Bulbasaur"]], ["Shellos"], {additions: 1, evolutions: 1, allowFormes: true})
			.map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 8);
		assert(possibleTeams.includes('Bulbasaur'));
		assert(possibleTeams.includes('Ivysaur'));
		assert(possibleTeams.includes('Bulbasaur,Shellos'));
		assert(possibleTeams.includes('Bulbasaur,Gastrodon'));
		assert(possibleTeams.includes('Bulbasaur,Shellos-East'));
		assert(possibleTeams.includes('Bulbasaur,Gastrodon-East'));
		assert(possibleTeams.includes('Ivysaur,Shellos'));
		assert(possibleTeams.includes('Ivysaur,Shellos-East'));

		// catch and de-volve

		// 1 optional addition and 1 optional de-volution
		possibleTeams = Dex.getPossibleTeams([["Venusaur"]], ["Charizard"], {additions: 1, evolutions: -1}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 5);
		assert(possibleTeams.includes('Venusaur'));
		assert(possibleTeams.includes('Ivysaur'));
		assert(possibleTeams.includes('Charizard,Venusaur'));
		assert(possibleTeams.includes('Charizard,Ivysaur'));
		assert(possibleTeams.includes('Charmeleon,Venusaur'));

		// 1 required addition and 1 optional de-volution
		possibleTeams = Dex.getPossibleTeams([["Venusaur"]], ["Charizard"], {additions: 1, evolutions: -1, requiredAddition: true})
			.map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 3);
		assert(possibleTeams.includes('Charizard,Venusaur'));
		assert(possibleTeams.includes('Charizard,Ivysaur'));
		assert(possibleTeams.includes('Charmeleon,Venusaur'));

		// 1 required addition and 1 required de-volution
		possibleTeams = Dex.getPossibleTeams([["Venusaur"]], ["Charizard"],
			{additions: 1, evolutions: -1, requiredAddition: true, requiredEvolution: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 2);
		assert(possibleTeams.includes('Charizard,Ivysaur'));
		assert(possibleTeams.includes('Charmeleon,Venusaur'));

		// 1 optional addition and 1 required de-volution
		possibleTeams = Dex.getPossibleTeams([["Venusaur"]], ["Charizard"], {additions: 1, evolutions: -1, requiredEvolution: true})
			.map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 3);
		assert(possibleTeams.includes('Ivysaur'));
		assert(possibleTeams.includes('Charizard,Ivysaur'));
		assert(possibleTeams.includes('Charmeleon,Venusaur'));

		// no additions left
		possibleTeams = Dex.getPossibleTeams([["Venusaur", "Charizard", "Blastoise", "Meganium", "Typhlosion", "Feraligatr"]], ["Raichu"],
			{additions: 1, evolutions: -1, requiredAddition: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 7);

		// no de-volutions left
		possibleTeams = Dex.getPossibleTeams([["Bulbasaur"]], ["Charmander"], {additions: 1, evolutions: -1, requiredEvolution: true})
			.map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 2);
		assert(possibleTeams.includes('Bulbasaur'));
		assert(possibleTeams.includes('Bulbasaur,Charmander'));

		// no additions or de-volutions left
		possibleTeams = Dex.getPossibleTeams([["Bulbasaur", "Charmander", "Squirtle", "Chikorita", "Cyndaquil", "Totodile"]], ["Pikachu"],
			{additions: 1, evolutions: -1, requiredAddition: true, requiredEvolution: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 1);

		// allow formes
		possibleTeams = Dex.getPossibleTeams([["Venusaur"]], ["Mr. Rime"], {additions: 1, evolutions: -1, allowFormes: true})
			.map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 6);
		assert(possibleTeams.includes('Venusaur'));
		assert(possibleTeams.includes('Ivysaur'));
		assert(possibleTeams.includes('Mr. Rime,Venusaur'));
		assert(possibleTeams.includes('Ivysaur,Mr. Rime'));
		assert(possibleTeams.includes('Mr. Mime-Galar,Venusaur'));
		assert(possibleTeams.includes('Mr. Mime,Venusaur'));

		possibleTeams = Dex.getPossibleTeams([["Venusaur"]], ["Gastrodon"], {additions: 1, evolutions: -1, allowFormes: true})
			.map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 8);
		assert(possibleTeams.includes('Venusaur'));
		assert(possibleTeams.includes('Ivysaur'));
		assert(possibleTeams.includes('Gastrodon,Venusaur'));
		assert(possibleTeams.includes('Gastrodon,Ivysaur'));
		assert(possibleTeams.includes('Gastrodon-East,Venusaur'));
		assert(possibleTeams.includes('Gastrodon-East,Ivysaur'));
		assert(possibleTeams.includes('Shellos,Venusaur'));
		assert(possibleTeams.includes('Shellos-East,Venusaur'));

		// release and evolve

		// 1 optional drop and 1 optional evolution
		possibleTeams = Dex.getPossibleTeams([["Bulbasaur", "Charmander", "Squirtle", "Chikorita", "Cyndaquil", "Totodile"]], [],
			{drops: 1, evolutions: 1}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 43);

		// 1 required drop and 1 optional evolution
		possibleTeams = Dex.getPossibleTeams([["Bulbasaur", "Charmander", "Squirtle", "Chikorita", "Cyndaquil", "Totodile"]], [],
			{drops: 1, evolutions: 1, requiredDrop: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 36);

		// 1 required drop and 1 required evolution
		possibleTeams = Dex.getPossibleTeams([["Bulbasaur", "Charmander", "Squirtle", "Chikorita", "Cyndaquil", "Totodile"]], [],
			{drops: 1, evolutions: 1, requiredDrop: true, requiredEvolution: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 30);

		// 1 optional drop and 1 required evolution
		possibleTeams = Dex.getPossibleTeams([["Bulbasaur", "Charmander", "Squirtle", "Chikorita", "Cyndaquil", "Totodile"]], [],
			{drops: 1, evolutions: 1, requiredEvolution: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 36);

		// no drops left
		possibleTeams = Dex.getPossibleTeams([["Bulbasaur"]], [], {drops: 1, evolutions: 1, requiredDrop: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 2);
		assert(possibleTeams.includes('Bulbasaur'));
		assert(possibleTeams.includes('Ivysaur'));

		// no evolutions left
		possibleTeams = Dex.getPossibleTeams([["Venusaur", "Charizard", "Blastoise", "Meganium", "Typhlosion", "Feraligatr"]], [],
			{drops: 1, evolutions: 1, requiredEvolution: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 7);

		// no drops or evolutions left
		possibleTeams = Dex.getPossibleTeams([["Venusaur"]], [],
			{drops: 1, evolutions: 1, requiredDrop: true, requiredEvolution: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 1);
		assert(possibleTeams.includes('Venusaur'));

		// release and de-volve

		// 1 optional drop and 1 optional de-volution
		possibleTeams = Dex.getPossibleTeams([["Venusaur", "Charizard", "Blastoise", "Meganium", "Typhlosion", "Feraligatr"]], [],
			{drops: 1, evolutions: -1}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 43);

		// 1 required drop and 1 optional de-volution
		possibleTeams = Dex.getPossibleTeams([["Venusaur", "Charizard", "Blastoise", "Meganium", "Typhlosion", "Feraligatr"]], [],
			{drops: 1, evolutions: -1, requiredDrop: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 36);

		// 1 required drop and 1 required de-volution
		possibleTeams = Dex.getPossibleTeams([["Venusaur", "Charizard", "Blastoise", "Meganium", "Typhlosion", "Feraligatr"]], [],
			{drops: 1, evolutions: -1, requiredDrop: true, requiredEvolution: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 30);

		// 1 optional drop and 1 required de-volution
		possibleTeams = Dex.getPossibleTeams([["Venusaur", "Charizard", "Blastoise", "Meganium", "Typhlosion", "Feraligatr"]], [],
			{drops: 1, evolutions: -1, requiredEvolution: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 36);

		// no drops left
		possibleTeams = Dex.getPossibleTeams([["Ivysaur"]], [], {drops: 1, evolutions: -1, requiredDrop: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 2);
		assert(possibleTeams.includes('Bulbasaur'));
		assert(possibleTeams.includes('Ivysaur'));

		// no de-volutions left
		possibleTeams = Dex.getPossibleTeams([["Bulbasaur", "Charmander", "Squirtle", "Chikorita", "Cyndaquil", "Totodile"]], [],
			{drops: 1, evolutions: -1, requiredEvolution: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 7);

		// no drops or de-volutions left
		possibleTeams = Dex.getPossibleTeams([["Bulbasaur"]], [],
			{drops: 1, evolutions: -1, requiredDrop: true, requiredEvolution: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 1);
		assert(possibleTeams.includes('Bulbasaur'));

		// trade and evolve

		// 1 required addition, 1 required drop, and 1 optional evolution
		possibleTeams = Dex.getPossibleTeams([["Bulbasaur"]], ["Charmander"],
			{additions: 1, drops: 1, evolutions: 1, requiredAddition: true, requiredDrop: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 2);
		assert(possibleTeams.includes('Charmander'));
		assert(possibleTeams.includes('Charmeleon'));

		// 1 required addition, 1 required drop, and 1 required evolution
		possibleTeams = Dex.getPossibleTeams([["Bulbasaur"]], ["Charmander"],
			{additions: 1, drops: 1, evolutions: 1, requiredAddition: true, requiredDrop: true, requiredEvolution: true})
			.map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 1);
		assert(possibleTeams.includes('Charmeleon'));

		// no evolutions left
		possibleTeams = Dex.getPossibleTeams([["Venusaur"]], ["Charizard"],
		{additions: 1, drops: 1, evolutions: 1, requiredAddition: true, requiredDrop: true, requiredEvolution: true})
			.map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 1);
		assert(possibleTeams.includes('Charizard'));

		// allow formes
		possibleTeams = Dex.getPossibleTeams([["Bulbasaur"]], ["Meowth"],
			{additions: 1, drops: 1, evolutions: 1, requiredAddition: true, requiredDrop: true, requiredEvolution: true, allowFormes: true})
			.map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 3);
		assert(possibleTeams.includes('Persian'));
		assert(possibleTeams.includes('Persian-Alola'));
		assert(possibleTeams.includes('Perrserker'));

		possibleTeams = Dex.getPossibleTeams([["Bulbasaur"]], ["Meowth-Alola"],
			{additions: 1, drops: 1, evolutions: 1, requiredAddition: true, requiredDrop: true, requiredEvolution: true, allowFormes: true})
			.map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 3);

		possibleTeams = Dex.getPossibleTeams([["Bulbasaur"]], ["Meowth-Galar"],
			{additions: 1, drops: 1, evolutions: 1, requiredAddition: true, requiredDrop: true, requiredEvolution: true, allowFormes: true})
			.map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 3);

		possibleTeams = Dex.getPossibleTeams([["Bulbasaur"]], ["Shellos"],
			{additions: 1, drops: 1, evolutions: 1, requiredAddition: true, requiredDrop: true, requiredEvolution: true, allowFormes: true})
			.map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 2);
		assert(possibleTeams.includes('Gastrodon'));
		assert(possibleTeams.includes('Gastrodon-East'));

		// prevent OOM
		let possibleTeamsRecursive = Dex.getPossibleTeams([["Bulbasaur", "Charmander", "Squirtle"]],
			["Chikorita", "Cyndaquil", "Totodile"],
			{additions: 1, drops: 1, evolutions: 1, requiredAddition: true, requiredDrop: true, requiredEvolution: true});
		assertStrictEqual(possibleTeamsRecursive.length, 27);

		possibleTeamsRecursive = Dex.getPossibleTeams(possibleTeamsRecursive,
			["Treecko", "Torchic", "Mudkip"],
			{additions: 1, drops: 1, evolutions: 1, requiredAddition: true, requiredDrop: true, requiredEvolution: true});
		assertStrictEqual(possibleTeamsRecursive.length, 288);

		possibleTeamsRecursive = Dex.getPossibleTeams(possibleTeamsRecursive,
			["Turtwig", "Chimchar", "Piplup"],
			{additions: 1, drops: 1, evolutions: 1, requiredAddition: true, requiredDrop: true, requiredEvolution: true});
		assertStrictEqual(possibleTeamsRecursive.length, 1116);

		possibleTeamsRecursive = Dex.getPossibleTeams(possibleTeamsRecursive,
			["Snivy", "Tepig", "Oshawott"],
			{additions: 1, drops: 1, evolutions: 1, requiredAddition: true, requiredDrop: true, requiredEvolution: true});
		assertStrictEqual(possibleTeamsRecursive.length, 2520);

		possibleTeamsRecursive = Dex.getPossibleTeams(possibleTeamsRecursive,
			["Chespin", "Fennekin", "Froakie"],
			{additions: 1, drops: 1, evolutions: 1, requiredAddition: true, requiredDrop: true, requiredEvolution: true});
		assertStrictEqual(possibleTeamsRecursive.length, 4338);

		possibleTeamsRecursive = Dex.getPossibleTeams(possibleTeamsRecursive,
			["Rowlet", "Litten", "Popplio"],
			{additions: 1, drops: 1, evolutions: 1, requiredAddition: true, requiredDrop: true, requiredEvolution: true});
		assertStrictEqual(possibleTeamsRecursive.length, 6552);

		possibleTeamsRecursive = Dex.getPossibleTeams(possibleTeamsRecursive,
			["Grookey", "Scorbunny", "Sobble"],
			{additions: 1, drops: 1, evolutions: 1, requiredAddition: true, requiredDrop: true, requiredEvolution: true});
		assertStrictEqual(possibleTeamsRecursive.length, 9225);

		// trade and de-volve

		// 1 required addition, 1 required drop, and 1 optional evolution
		possibleTeams = Dex.getPossibleTeams([["Venusaur"]], ["Charizard"],
			{additions: 1, drops: 1, evolutions: -1, requiredAddition: true, requiredDrop: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 2);
		assert(possibleTeams.includes('Charizard'));
		assert(possibleTeams.includes('Charmeleon'));

		// 1 required addition, 1 required drop, and 1 required evolution
		possibleTeams = Dex.getPossibleTeams([["Venusaur"]], ["Charizard"],
			{additions: 1, drops: 1, evolutions: -1, requiredAddition: true, requiredDrop: true, requiredEvolution: true})
			.map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 1);
		assert(possibleTeams.includes('Charmeleon'));

		// no evolutions left
		possibleTeams = Dex.getPossibleTeams([["Bulbasaur"]], ["Charmander"],
		{additions: 1, drops: 1, evolutions: -1, requiredAddition: true, requiredDrop: true, requiredEvolution: true})
			.map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 1);
		assert(possibleTeams.includes('Charmander'));

		// allow formes
		possibleTeams = Dex.getPossibleTeams([["Venusaur"]], ["Persian"],
			{additions: 1, drops: 1, evolutions: -1, requiredAddition: true, requiredDrop: true, requiredEvolution: true,
			allowFormes: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 3);
		assert(possibleTeams.includes('Meowth'));
		assert(possibleTeams.includes('Meowth-Alola'));
		assert(possibleTeams.includes('Meowth-Galar'));

		possibleTeams = Dex.getPossibleTeams([["Venusaur"]], ["Persian-Alola"],
			{additions: 1, drops: 1, evolutions: -1, requiredAddition: true, requiredDrop: true, requiredEvolution: true,
			allowFormes: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 3);

		possibleTeams = Dex.getPossibleTeams([["Venusaur"]], ["Perrserker"],
			{additions: 1, drops: 1, evolutions: -1, requiredAddition: true, requiredDrop: true, requiredEvolution: true,
			allowFormes: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 3);

		possibleTeams = Dex.getPossibleTeams([["Venusaur"]], ["Gastrodon"],
			{additions: 1, drops: 1, evolutions: -1, requiredAddition: true, requiredDrop: true, requiredEvolution: true,
			allowFormes: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 2);
		assert(possibleTeams.includes('Shellos'));
		assert(possibleTeams.includes('Shellos-East'));

		// doubles catch and evolve

		// 2 optional additions and 2 optional evolutions
		possibleTeams = Dex.getPossibleTeams([["Bulbasaur", "Charmander"]], ["Squirtle", "Chikorita"],
			{additions: 2, evolutions: 2}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 29);

		// 2 required additions and 2 optional evolutions
		possibleTeams = Dex.getPossibleTeams([["Bulbasaur", "Charmander"]], ["Squirtle", "Chikorita"],
			{additions: 2, evolutions: 2, requiredAddition: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 11);

		// 2 required additions and 2 required evolutions
		possibleTeams = Dex.getPossibleTeams([["Bulbasaur", "Charmander"]], ["Squirtle", "Chikorita"],
			{additions: 2, evolutions: 2, requiredAddition: true, requiredEvolution: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 6);

		// 2 optional additions and 2 required evolutions
		possibleTeams = Dex.getPossibleTeams([["Bulbasaur", "Charmander"]], ["Squirtle", "Chikorita"],
			{additions: 2, evolutions: 2, requiredEvolution: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 13);

		// no evolutions left
		possibleTeams = Dex.getPossibleTeams([["Venusaur", "Charizard"]], ["Blastoise", "Meganium"],
			{additions: 2, evolutions: 2, requiredEvolution: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 4);

		// doubles catch and de-volve

		// 2 optional additions and 2 optional de-volutions
		possibleTeams = Dex.getPossibleTeams([["Venusaur", "Charizard"]], ["Blastoise", "Meganium"],
			{additions: 2, evolutions: -2}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 29);

		// 2 required additions and 2 optional de-volutions
		possibleTeams = Dex.getPossibleTeams([["Venusaur", "Charizard"]], ["Blastoise", "Meganium"],
			{additions: 2, evolutions: -2, requiredAddition: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 11);

		// 2 required additions and 2 required de-volutions
		possibleTeams = Dex.getPossibleTeams([["Venusaur", "Charizard"]], ["Blastoise", "Meganium"],
			{additions: 2, evolutions: -2, requiredAddition: true, requiredEvolution: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 6);

		// 2 optional additions and 2 required de-volutions
		possibleTeams = Dex.getPossibleTeams([["Venusaur", "Charizard"]], ["Blastoise", "Meganium"],
			{additions: 2, evolutions: -2, requiredEvolution: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 13);

		// no de-volutions left
		possibleTeams = Dex.getPossibleTeams([["Bulbasaur", "Charmander"]], ["Squirtle", "Chikorita"],
			{additions: 2, evolutions: -2, requiredEvolution: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 4);

		// misc

		// no changes
		possibleTeams = Dex.getPossibleTeams([["Venusaur", "Charizard", "Blastoise", "Meganium", "Typhlosion", "Feraligatr"]], [],
			{evolutions: 1}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 1);

		// 2 required additions
		possibleTeams = Dex.getPossibleTeams([["Bulbasaur"]], ["Charmander", "Squirtle", "Chikorita", "Cyndaquil", "Totodile"],
			{additions: 2, requiredAddition: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 10);

		// 2 required drops
		possibleTeams = Dex.getPossibleTeams([["Bulbasaur", "Charmander", "Squirtle", "Chikorita", "Cyndaquil", "Totodile"]], [],
			{drops: 2, requiredDrop: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 15);

		// reversing previousTeams and pool
		possibleTeams = Dex.getPossibleTeams([["Pikachu"]], ["Charmander"],
			{additions: 1, evolutions: 1, requiredAddition: true, requiredEvolution: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 2);
		assert(possibleTeams.includes('Charmander,Raichu'));
		assert(possibleTeams.includes('Charmeleon,Pikachu'));

		possibleTeams = Dex.getPossibleTeams([["Charmander"]], ["Pikachu"],
			{additions: 1, evolutions: 1, requiredAddition: true, requiredEvolution: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 2);
		assert(possibleTeams.includes('Charmander,Raichu'));
		assert(possibleTeams.includes('Charmeleon,Pikachu'));

		// split evolutions
		possibleTeams = Dex.getPossibleTeams([["Gloom"]], ["Charmander"],
			{additions: 1, evolutions: 1, requiredAddition: true, requiredEvolution: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 3);
		assert(possibleTeams.includes('Charmander,Vileplume'));
		assert(possibleTeams.includes('Bellossom,Charmander'));
		assert(possibleTeams.includes('Charmeleon,Gloom'));

		// usablePokemon
		possibleTeams = Dex.getPossibleTeams([["Gloom"]], ["Charmander"],
			{additions: 1, evolutions: 1, requiredAddition: true, requiredEvolution: true,
			usablePokemon: ['Charmander', 'Charmeleon', 'Gloom', 'Vileplume']}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 2);
		assert(possibleTeams.includes('Charmander,Vileplume'));
		assert(possibleTeams.includes('Charmeleon,Gloom'));

		possibleTeams = Dex.getPossibleTeams([["Gloom"]], ["Charmander"],
			{additions: 1, evolutions: 1, requiredAddition: true, requiredEvolution: true,
			usablePokemon: ['Charmander', 'Vileplume']}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 1);
		assert(possibleTeams.includes('Charmander,Vileplume'));

		// forme evolutions
		possibleTeams = Dex.getPossibleTeams([["Pikachu"]], ["Charmander"],
			{additions: 1, evolutions: 1, allowFormes: true, requiredAddition: true, requiredEvolution: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 3);
		assert(possibleTeams.includes('Charmander,Raichu'));
		assert(possibleTeams.includes('Charmander,Raichu-Alola'));
		assert(possibleTeams.includes('Charmeleon,Pikachu'));

		possibleTeams = Dex.getPossibleTeams([["Charmander"]], ["Cutiefly"],
			{additions: 1, evolutions: 1, allowFormes: true, requiredAddition: true, requiredEvolution: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 3);
		assert(possibleTeams.includes('Charmander,Ribombee'));
		assert(possibleTeams.includes('Charmander,Ribombee-Totem'));
		assert(possibleTeams.includes('Charmeleon,Cutiefly'));

		possibleTeams = Dex.getPossibleTeams([["Venusaur"]], ["Charizard"],
			{additions: 1, drops: 1, evolutions: -1, requiredEvolution: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 4);
		assert(possibleTeams.includes('Ivysaur'));
		assert(possibleTeams.includes('Charmeleon'));
		assert(possibleTeams.includes('Charmeleon,Venusaur'));
		assert(possibleTeams.includes('Charizard,Ivysaur'));

		possibleTeams = Dex.getPossibleTeams([["Charmander"]], ["Mr. Mime"],
			{additions: 1, evolutions: 1, allowFormes: true, requiredAddition: true, requiredEvolution: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 3);
		assert(possibleTeams.includes('Charmander,Mr. Rime'));
		assert(possibleTeams.includes('Charmeleon,Mr. Mime'));
		assert(possibleTeams.includes('Charmeleon,Mr. Mime-Galar'));

		possibleTeams = Dex.getPossibleTeams([["Charmander"]], ["Mr. Mime-Galar"],
			{additions: 1, evolutions: 1, requiredAddition: true, requiredEvolution: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 2);
		assert(possibleTeams.includes('Charmander,Mr. Rime'));
		assert(possibleTeams.includes('Charmeleon,Mr. Mime-Galar'));

		possibleTeams = Dex.getPossibleTeams([["Charmander"]], ["Mr. Rime"],
			{additions: 1, evolutions: -1, allowFormes: true, requiredAddition: true, requiredEvolution: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 2);
		assert(possibleTeams.includes('Charmander,Mr. Mime'));
		assert(possibleTeams.includes('Charmander,Mr. Mime-Galar'));

		// usablePokemon + forme
		possibleTeams = Dex.getPossibleTeams([["Charmander"]], ["Cutiefly"],
			{additions: 1, evolutions: 1, allowFormes: true, requiredAddition: true, requiredEvolution: true,
			usablePokemon: ['Charmander', 'Charmeleon', 'Cutiefly', 'Ribombee']}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 2);
		assert(possibleTeams.includes('Charmander,Ribombee'));
		assert(possibleTeams.includes('Charmeleon,Cutiefly'));

		// forme + base species not in usablePokemon
		possibleTeams = Dex.getPossibleTeams([["Mr. Mime"], ["Mr. Mime-Galar"]], ["Lycanroc-Midnight"],
			{additions: 1, evolutions: -1, allowFormes: true, requiredAddition: true, requiredEvolution: true,
			usablePokemon: ['Lycanroc-Midnight', 'Mime Jr.', 'Mr. Mime', 'Mr. Mime-Galar', 'Rockruff']}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 3);
		assert(possibleTeams.includes('Lycanroc-Midnight,Mime Jr.'));
		assert(possibleTeams.includes('Mr. Mime,Rockruff'));
		assert(possibleTeams.includes('Mr. Mime-Galar,Rockruff'));

		// species clause
		possibleTeams = Dex.getPossibleTeams([["Meowth"]], ["Perrserker"],
			{additions: 1, evolutions: -1, allowFormes: true, speciesClause: true}).map(x => x.join(','));
		assertStrictEqual(possibleTeams.length, 2);
		assert(possibleTeams.includes('Meowth'));
		assert(possibleTeams.includes('Meowth,Perrserker'));
	});
	it('should return proper values from getClosestPossibleTeamSummary()', () => {
		assertStrictEqual(Dex.getClosestPossibleTeamSummary(['Charizard'], [['Venusaur', 'Charizard', 'Blastoise']], {"evolutions": 1}),
			"Your team needed to have 3 Pokemon.");
		assertStrictEqual(Dex.getClosestPossibleTeamSummary(['Pikachu'], [['Venusaur', 'Charizard', 'Blastoise']], {"evolutions": 1}),
			"Your team needed to have 3 Pokemon. Pikachu was not possible to have based on your options.");
		assertStrictEqual(Dex.getClosestPossibleTeamSummary(['Bulbasaur'], [['Venusaur']], {"evolutions": 1}),
			"Bulbasaur needed to be evolved 2 more stages.");
		assertStrictEqual(Dex.getClosestPossibleTeamSummary(['Ivysaur'], [['Venusaur']], {"evolutions": 1}),
			"Ivysaur needed to be evolved 1 more stage.");
		assertStrictEqual(Dex.getClosestPossibleTeamSummary(['Venusaur'], [['Bulbasaur']], {"evolutions": 1}),
			"Venusaur was evolved 2 extra stages.");
		assertStrictEqual(Dex.getClosestPossibleTeamSummary(['Venusaur'], [['Ivysaur']], {"evolutions": 1}),
			"Venusaur was evolved 1 extra stage.");
		assertStrictEqual(Dex.getClosestPossibleTeamSummary(['Venusaur'], [['Bulbasaur']], {"evolutions": -1}),
			"Venusaur needed to be de-volved 2 more stages.");
		assertStrictEqual(Dex.getClosestPossibleTeamSummary(['Venusaur'], [['Ivysaur']], {"evolutions": -1}),
			"Venusaur needed to be de-volved 1 more stage.");
		assertStrictEqual(Dex.getClosestPossibleTeamSummary(['Bulbasaur'], [['Venusaur']], {"evolutions": -1}),
			"Bulbasaur was de-volved 2 extra stages.");
		assertStrictEqual(Dex.getClosestPossibleTeamSummary(['Bulbasaur'], [['Ivysaur']], {"evolutions": -1}),
			"Bulbasaur was de-volved 1 extra stage.");
		assertStrictEqual(Dex.getClosestPossibleTeamSummary(['Bulbasaur', 'Charmander'], [['Venusaur', 'Charizard']], {"evolutions": 1}),
			"Bulbasaur needed to be evolved 2 more stages and Charmander needed to be evolved 2 more stages.");
	});
	it('should return proper values from getList methods', () => {
		let dex = Dex.getDex("gen8");
		const abilities = dex.getAbilitiesList().map(x => x.name);
		const items = dex.getItemsList().map(x => x.name);
		const moves = dex.getMovesList().map(x => x.name);
		const pokemon = dex.getPokemonList().map(x => x.name);

		assert(abilities.length);
		assert(items.length);
		assert(moves.length);
		assert(pokemon.length);

		assert(!abilities.includes(Dex.getExistingAbility('No Ability').name));

		// LGPE/CAP/Glitch/Pokestar/Unobtainable
		assert(!abilities.includes(Dex.getExistingAbility('Mountaineer').name));
		assert(!items.includes(Dex.getExistingItem('Crucibellite').name));
		assert(!moves.includes(Dex.getExistingMove('Baddy Bad').name));
		assert(!moves.includes(Dex.getExistingMove('Paleo Wave').name));
		assert(!pokemon.includes(Dex.getExistingPokemon('Pikachu-Starter').name));
		assert(!pokemon.includes(Dex.getExistingPokemon('Voodoom').name));
		assert(!pokemon.includes(Dex.getExistingPokemon('Missingno.').name));
		assert(!pokemon.includes(Dex.getExistingPokemon('Pokestar Smeargle').name));

		assert(abilities.includes(Dex.getExistingAbility('Intimidate').name));

		assert(items.includes(Dex.getExistingItem('Abomasite').name));
		assert(items.includes(Dex.getExistingItem('Choice Scarf').name));
		assert(items.includes(Dex.getExistingItem('Custap Berry').name));

		assert(moves.includes(Dex.getExistingMove('Aeroblast').name));
		assert(moves.includes(Dex.getExistingMove('Tackle').name));
		assert(moves.includes(Dex.getExistingMove('Thousand Arrows').name));

		assert(pokemon.includes(Dex.getExistingPokemon('Bulbasaur').name));
		assert(pokemon.includes(Dex.getExistingPokemon('Charmander').name));
		assert(pokemon.includes(Dex.getExistingPokemon('Slowpoke').name));

		// past gen

		dex = Dex.getDex("gen1");
		assert(!dex.getPokemonList().map(x => x.name).includes(dex.getExistingPokemon('Missingno.').name));
	});
	it('should have hex colors for all relevant Pokemon and move data', () => {
		for (const i of Dex.getData().pokemonKeys) {
			const pokemon = Dex.getExistingPokemon(i);
			assert(pokemon.color in Tools.pokemonColorHexCodes, pokemon.name + "'s color " + pokemon.color);
			for (const type of pokemon.types) {
				assert(type in Tools.typeHexCodes, pokemon.name + "'s type " + type);
			}
			for (const eggGroup of pokemon.eggGroups) {
				assert(eggGroup in Tools.eggGroupHexCodes, pokemon.name + "'s egg group " + eggGroup);
			}
		}

		for (const i of Dex.getData().moveKeys) {
			const move = Dex.getExistingMove(i);
			assert(move.type in Tools.typeHexCodes, move.name);
		}
	});
	it('should return proper summaries in getClosestPossibleTeamSummary()', () => {
		assertStrictEqual(Dex.getClosestPossibleTeamSummary(['Charizard', 'Pikachu'], [['Charizard', 'Pikachu']],
			{additions: 1, evolutions: 1}), "");

		assertStrictEqual(Dex.getClosestPossibleTeamSummary(['Charizard'], [['Charizard', 'Pikachu']], {additions: 1, evolutions: 1}),
			"Your team needed to have 2 Pokemon.");
		assertStrictEqual(Dex.getClosestPossibleTeamSummary(['Charizard', 'Pikachu'], [['Charizard']], {additions: -1, evolutions: 1}),
			"Your team needed to have 1 Pokemon. Pikachu was not possible to have based on your options.");

		assertStrictEqual(Dex.getClosestPossibleTeamSummary(['Charizard', 'Pikachu'], [['Charizard', 'Raichu']],
			{additions: 1, evolutions: 1}), "Pikachu needed to be evolved 1 more stage.");
		assertStrictEqual(Dex.getClosestPossibleTeamSummary(['Charizard', 'Raichu'], [['Charizard', 'Pikachu']],
			{additions: 1, evolutions: 1}), "Raichu was evolved 1 extra stage.");
		assertStrictEqual(Dex.getClosestPossibleTeamSummary(['Charizard', 'Raichu'], [['Charizard', 'Pichu']],
			{additions: 1, evolutions: 1}), "Raichu was evolved 2 extra stages.");

		assertStrictEqual(Dex.getClosestPossibleTeamSummary(['Charizard', 'Raichu'], [['Charizard', 'Pikachu']],
			{additions: 1, evolutions: -1}), "Raichu needed to be de-volved 1 more stage.");
		assertStrictEqual(Dex.getClosestPossibleTeamSummary(['Charizard', 'Pichu'], [['Charizard', 'Pikachu']],
			{additions: 1, evolutions: -1}), "Pichu was de-volved 1 extra stage.");
		assertStrictEqual(Dex.getClosestPossibleTeamSummary(['Charizard', 'Pichu'], [['Charizard', 'Raichu']],
			{additions: 1, evolutions: -1}), "Pichu was de-volved 2 extra stages.");

		assertStrictEqual(Dex.getClosestPossibleTeamSummary(['Charizard', 'Venusaur'], [['Charizard', 'Blastoise']], {additions: 1}),
			"Venusaur was not possible to have based on your options.");
		assertStrictEqual(Dex.getClosestPossibleTeamSummary(['Meganium', 'Venusaur'], [['Charizard', 'Blastoise']], {additions: 1}),
			"Meganium and Venusaur were not possible to have based on your options.");

		assertStrictEqual(Dex.getClosestPossibleTeamSummary(['Charizard', 'Pikachu'], [['Charizard', 'Blastoise'],
			['Pikachu', 'Blastoise']], {additions: 1}), "Your team has an invalid combination of added Pokemon.");
		assertStrictEqual(Dex.getClosestPossibleTeamSummary(['Charizard', 'Pikachu'], [['Charizard', 'Blastoise'],
			['Pikachu', 'Blastoise']], {additions: 1, evolutions: 1}),
			"Your team has an invalid combination of added and evolved Pokemon.");

		assertStrictEqual(Dex.getClosestPossibleTeamSummary(['Charizard', 'Pikachu'], [['Charizard', 'Blastoise'],
			['Pikachu', 'Blastoise']], {drops: 1}), "Your team has an invalid combination of removed Pokemon.");
		assertStrictEqual(Dex.getClosestPossibleTeamSummary(['Charizard', 'Pikachu'], [['Charizard', 'Blastoise'],
			['Pikachu', 'Blastoise']], {drops: 1, evolutions: 1}), "Your team has an invalid combination of removed and evolved Pokemon.");
	});
});

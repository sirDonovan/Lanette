import { formatLinks } from '../../data/format-links';
import type { ISeparatedCustomRules } from '../../types/dex';
import { assert, assertStrictEqual } from './../test-tools';

/* eslint-env mocha */

describe("Dex", () => {
	it('should properly load data', function(this: Mocha.Context) {
		assert(Dex.data.abilityKeys.length > 1);
		assert(Dex.data.formatKeys.length > 1);
		assert(Dex.data.itemKeys.length > 1);
		assert(Dex.data.learnsetDataKeys.length > 1);
		assert(Dex.data.moveKeys.length > 1);
		assert(Dex.data.natureKeys.length > 1);
		assert(Dex.data.pokemonKeys.length > 1);
		assert(Dex.data.typeKeys.length > 1);

		assert(Object.keys(Dex.data.colors).length > 1);
		assert(Object.keys(Dex.data.eggGroups).length > 1);
		assert(Object.keys(Dex.data.gifData).length > 1);
		assert(Object.keys(Dex.data.gifDataBW).length > 1);

		// allPossibleMoves
		let pokemon = Dex.getExistingPokemon('Charizard');
		let allPossibleMoves = Dex.getAllPossibleMoves(pokemon);
		assert(allPossibleMoves.length > 1);
		let learnsetData = Dex.getLearnsetData(pokemon.id);
		assert(learnsetData && learnsetData.learnset && Object.keys(learnsetData.learnset).length > 1);
		assert(allPossibleMoves.length > Object.keys(learnsetData.learnset).length, pokemon.name);

		pokemon = Dex.getExistingPokemon('Lycanroc-Dusk');
		allPossibleMoves = Dex.getAllPossibleMoves(pokemon);
		assert(allPossibleMoves.length > 1);
		learnsetData = Dex.getLearnsetData(pokemon.id);
		assert(learnsetData && learnsetData.learnset && Object.keys(learnsetData.learnset).length > 1);
		assert(allPossibleMoves.length > Object.keys(learnsetData.learnset).length, pokemon.name);

		pokemon = Dex.getExistingPokemon('Rotom-Frost');
		allPossibleMoves = Dex.getAllPossibleMoves(pokemon);
		assert(allPossibleMoves.length > 1);
		learnsetData = Dex.getLearnsetData(pokemon.id);
		assert(learnsetData && learnsetData.learnset);
		assert(allPossibleMoves.length > Object.keys(learnsetData.learnset).length, pokemon.name);

		pokemon = Dex.getExistingPokemon('Smeargle');
		allPossibleMoves = Dex.getAllPossibleMoves(pokemon);
		assertStrictEqual(allPossibleMoves.length, 689);

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

		assertStrictEqual(Dex.getMoveAvailability(Dex.getExistingMove("Tackle")), 394);
		assertStrictEqual(Dex.getMoveAvailability(Dex.getExistingMove("Aeroblast")), 2);

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
		const badges = Dex.getBadges();
		assert(badges.length > 1);

		const characters = Dex.getCharacters();
		assert(characters.length > 1);

		const locations = Dex.getLocations();
		assert(locations.length > 1);

		assert(Dex.data.trainerClasses.length > 1);
		assert(Object.keys(Dex.data.categories).length > 1);

		for (let i = 0; i < badges.length; i++) {
			assert(badges.indexOf(badges[i]) === i, "Duplicate badge " + badges[i]);
		}

		for (let i = 0; i < characters.length; i++) {
			assert(characters.indexOf(characters[i]) === i, "Duplicate character " + characters[i]);
		}

		for (let i = 0; i < locations.length; i++) {
			assert(locations.indexOf(locations[i]) === i, "Duplicate location " + locations[i]);
		}

		for (let i = Dex.gen; i >= 1; i--) {
			const dex = Dex.getDex('gen' + i);
			assertStrictEqual(dex.getPokemonCategory(dex.getExistingPokemon('Pikachu')), 'Mouse');
		}

		const categoryKeys = Object.keys(Dex.data.categories);
		for (let i = 0; i < categoryKeys.length; i++) {
			assert(Tools.toId(categoryKeys[i]) === categoryKeys[i], categoryKeys[i] + " should be an ID in categories.js");
			assert(categoryKeys.indexOf(categoryKeys[i]) === i, "Duplicate category for " + categoryKeys[i]);
		}

		for (const i in formatLinks) {
			assert(Dex.getFormat(i), i);
		}
	});
	it('should return data based on ids', () => {
		const ability = Dex.getAbility("Air Lock");
		assert(ability);
		let variants: string[] = ["airlock", "air lock", "Air lock", "air Lock", "AIRLOCK", "AIR LOCK"];
		for (const variant of variants) {
			assertStrictEqual(Dex.getAbility(variant), ability);
		}

		const format = Dex.getFormat("[Gen " + Dex.gen + "] OU");
		assert(format);
		variants = ["gen" + Dex.gen + "ou", "gen" + Dex.gen + " ou", "Gen" + Dex.gen + "ou", "Gen" + Dex.gen + " ou"];
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

		const learnsetData = Dex.getLearnsetData("Mr. Mime");
		assert(learnsetData);
		for (const variant of variants) {
			assertStrictEqual(Dex.getLearnsetData(variant), learnsetData);
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
		// eslint-disable-next-line @typescript-eslint/no-invalid-this
		this.timeout(15000);

		for (const i of Dex.data.abilityKeys) {
			const ability = Dex.getExistingAbility(i);
			Dex.getAbilityCopy(ability);
			Dex.getAbilityCopy(i);
		}

		for (const i of Dex.data.itemKeys) {
			const item = Dex.getExistingItem(i);
			Dex.getItemCopy(item);
			Dex.getItemCopy(i);
			Dex.getItemIcon(item);
			Dex.getPSItemIcon(item);
		}

		for (const i of Dex.data.formatKeys) {
			const format = Dex.getExistingFormat(i);
			Dex.getFormatInfoDisplay(format);
			Dex.validateFormat(format.name);
			Dex.getUsablePokemon(format);
		}

		for (const i of Dex.data.moveKeys) {
			const move = Dex.getExistingMove(i);
			Dex.getMoveCopy(move);
			Dex.getMoveCopy(i);
			Dex.getMoveAvailability(move);
		}

		for (const i of Dex.data.pokemonKeys) {
			const pokemon = Dex.getExistingPokemon(i);
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
			if (Dex.hasGifData(pokemon)) {
				Dex.getPokemonGif(pokemon);
			}
			Dex.getPokemonIcon(pokemon);
			Dex.getPSPokemonIcon(pokemon);
			Dex.getLearnsetData(pokemon.id);
		}
	});
	it('should set custom attributes for formats', () => {
		for (const i of Dex.data.formatKeys) {
			const format = Dex.getExistingFormat(i);
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
		assert(Dex.getLearnsetData("Mr. Mime") === Dex.getLearnsetData("Mr. Mime"));

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
		for (const i in Dex.customRuleAliases) {
			for (const rule of Dex.customRuleAliases[i]) {
				assert(Dex.validateRule(rule), i);
			}
		}

		for (const i in Dex.customRuleFormats) {
			assert(Dex.validateFormat(Dex.customRuleFormats[i].format + '@@@' + Dex.customRuleFormats[i].banlist), i);
		}
	});
	it('should support all types of custom rule aliases', () => {
		let format = Dex.getExistingFormat("ou@@@+Lunala");
		assert(format.customRules);
		assertStrictEqual(format.customRules.length, 1);
		assertStrictEqual(format.customRules[0], '+Lunala');
		assertStrictEqual(format.id, 'gen' + Dex.gen + 'ou');

		format = Dex.getExistingFormat("uubl");
		assert(format.customRules);
		assertStrictEqual(format.customRules.length, 1);
		assertStrictEqual(format.customRules[0], '+UUBL');
		assertStrictEqual(format.id, 'gen' + Dex.gen + 'uu');

		format = Dex.getExistingFormat("uubl@@@+Lunala");
		assert(format.customRules);
		assertStrictEqual(format.customRules.length, 2);
		assertStrictEqual(format.customRules[0], '+Lunala');
		assertStrictEqual(format.customRules[1], '+UUBL');
		assertStrictEqual(format.id, 'gen' + Dex.gen + 'uu');

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
		assertStrictEqual(format.id, 'gen' + Dex.gen + 'uu');

		format = Dex.getExistingFormat("monotype uubl");
		assert(format.customRules);
		assertStrictEqual(format.customRules.length, 2);
		assertStrictEqual(format.customRules[0], 'Same Type Clause');
		assertStrictEqual(format.customRules[1], '+UUBL');
		assertStrictEqual(format.id, 'gen' + Dex.gen + 'uu');

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
		assertStrictEqual(format.id, 'gen' + Dex.gen + 'doublesou');
	});
	it('should properly parse custom rules in separateCustomRules()', () => {
		const customRules: string[] = ["-Pikachu", "+Charizard", "*Kubfu", "Same Type Clause", "!Team Preview"];
		const separatedCustomRules: ISeparatedCustomRules = Dex.separateCustomRules(customRules);
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

		let evolutionLines = Dex.getEvolutionLines(Dex.getExistingPokemon('Ditto'));
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
		assert(Dex.isEvolutionFamily(['Charmander', 'Charmeleon']));
		assert(Dex.isEvolutionFamily(['Charmeleon', 'Charizard']));
		assert(Dex.isEvolutionFamily(['Charmander', 'Charizard']));
		assert(Dex.isEvolutionFamily(['Charmander']));
		assert(Dex.isEvolutionFamily(['Charmeleon']));
		assert(Dex.isEvolutionFamily(['Charizard']));
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
		let usablePokemon = Dex.getUsablePokemon(Dex.getExistingFormat("ou"));
		assert(usablePokemon.includes(Dex.getExistingPokemon('Pikachu').name));
		assert(usablePokemon.includes(Dex.getExistingPokemon('Pikachu-Sinnoh').name));
		assert(usablePokemon.includes(Dex.getExistingPokemon('Gastrodon').name));
		assert(usablePokemon.includes(Dex.getExistingPokemon('Gastrodon-East').name));
		assert(usablePokemon.includes(Dex.getExistingPokemon('Meowth').name));
		assert(usablePokemon.includes(Dex.getExistingPokemon('Meowth-Alola').name));
		assert(usablePokemon.includes(Dex.getExistingPokemon('Meowth-Galar').name));
		assert(!usablePokemon.includes(Dex.getExistingPokemon('Lunala').name));
		assert(!usablePokemon.includes(Dex.getExistingPokemon('Voodoom').name));
		assert(!usablePokemon.includes(Dex.getExistingPokemon('Missingno.').name));
		assert(!usablePokemon.includes(Dex.getExistingPokemon('Pokestar Smeargle').name));

		usablePokemon = Dex.getUsablePokemon(Dex.getExistingFormat("uber"));
		assert(usablePokemon.includes(Dex.getExistingPokemon('Pikachu').name));
		assert(usablePokemon.includes(Dex.getExistingPokemon('Lunala').name));
		assert(!usablePokemon.includes(Dex.getExistingPokemon('Voodoom').name));
		assert(!usablePokemon.includes(Dex.getExistingPokemon('Missingno.').name));
		assert(!usablePokemon.includes(Dex.getExistingPokemon('Pokestar Smeargle').name));

		usablePokemon = Dex.getUsablePokemon(Dex.getExistingFormat("ou@@@+Lunala"));
		assert(usablePokemon.includes(Dex.getExistingPokemon('Pikachu').name));
		assert(usablePokemon.includes(Dex.getExistingPokemon('Lunala').name));
		assert(!usablePokemon.includes(Dex.getExistingPokemon('Voodoom').name));
		assert(!usablePokemon.includes(Dex.getExistingPokemon('Missingno.').name));
		assert(!usablePokemon.includes(Dex.getExistingPokemon('Pokestar Smeargle').name));

		usablePokemon = Dex.getUsablePokemon(Dex.getExistingFormat("lc"));
		assert(usablePokemon.includes(Dex.getExistingPokemon('Pawniard').name));
		assert(usablePokemon.includes(Dex.getExistingPokemon('Pichu').name));
		assert(!usablePokemon.includes(Dex.getExistingPokemon('Pikachu').name));
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

		formes = Dex.getFormes(Dex.getExistingPokemon('Gastrodon'));
		assertStrictEqual(formes.length, 2);
		assert(formes.includes("Gastrodon"));
		assert(formes.includes("Gastrodon-East"));
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
	});
	it('should return proper values from getList methods', () => {
		const abilities = Dex.getAbilitiesList().map(x => x.name);
		const items = Dex.getItemsList().map(x => x.name);
		const moves = Dex.getMovesList().map(x => x.name);
		const pokemon = Dex.getPokemonList().map(x => x.name);

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

		const dex = Dex.getDex("gen1");
		assert(!dex.getPokemonList().map(x => x.name).includes(dex.getExistingPokemon('Missingno.').name));
	});
	it('should have hex colors for all relevant Pokemon and move data', () => {
		for (const i of Dex.data.pokemonKeys) {
			const pokemon = Dex.getExistingPokemon(i);
			assert(pokemon.color in Tools.pokemonColorHexCodes, pokemon.name + "'s color " + pokemon.color);
			for (const type of pokemon.types) {
				assert(type in Tools.typeHexCodes, pokemon.name + "'s type " + type);
			}
			for (const eggGroup of pokemon.eggGroups) {
				assert(eggGroup in Tools.eggGroupHexCodes, pokemon.name + "'s egg group " + eggGroup);
			}
		}

		for (const i of Dex.data.moveKeys) {
			const move = Dex.getExistingMove(i);
			assert(move.type in Tools.typeHexCodes, move.name);
		}
	});
});

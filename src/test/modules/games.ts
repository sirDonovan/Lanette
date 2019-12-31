import { PRNGSeed } from '../../prng';
import { Game } from '../../room-game';
import { GameFileTests, IGameFormat, IGameTestAttributes, IUserHostedFormat } from '../../types/games';
import { IPastGame } from '../../types/storage';
import { assert, assertClientSendQueue, assertStrictEqual } from '../test-tools';

function testMascots(format: IGameFormat | IUserHostedFormat) {
	if (format.mascot) {
		assert(Dex.getPokemon(format.mascot), format.name);
	} else if (format.mascots) {
		for (let i = 0; i < format.mascots.length; i++) {
			assert(Dex.getPokemon(format.mascots[i]), format.name);
		}
	}
}

function createIndividualTestGame(format: IGameFormat): Game {
	const game = Games.createGame(room, format);
	if (game.timeout) clearTimeout(game.timeout);

	return game;
}

function createIndividualTests(format: IGameFormat, tests: GameFileTests) {
	for (const test in tests) {
		const testData = tests[test];
		const testConfig = testData.config || {};
		if (testConfig.inputTargets && testConfig.commands && testConfig.inputTargets.length !== testConfig.commands.length) {
			throw new Error(format.name + " must have the same number of test inputTargets and commands");
		}
		const formats = testConfig.inputTargets ? testConfig.inputTargets : [format.inputTarget];
		const commands = testConfig.commands ? testConfig.commands : null;
		const numberOfTests = Math.max(formats.length, commands ? commands.length : 0);
		for (let i = 0; i < numberOfTests; i++) {
			let testFormat: IGameFormat;
			if (formats[i]) {
				testFormat = Games.getExistingFormat(formats[i]);
			} else {
				testFormat = format;
			}
			const attributes: IGameTestAttributes = {};
			if (commands) attributes.commands = commands[i];
			if (testConfig.async) {
				it(test, async function() {
					await testData.test.call(this, createIndividualTestGame(testFormat), testFormat, attributes);
				});
			} else {
				it(test, function() {
					testData.test.call(this, createIndividualTestGame(testFormat), testFormat, attributes);
				});
			}
		}
	}
}

const room = Rooms.get('mocha')!;
for (const i in Games.formats) {
	if (Games.formats[i].tests) {
		const format = Games.getExistingFormat(i);
		describe(format.name + " individual tests", () => {
			afterEach(() => {
				if (room.game) room.game.deallocate(true);
			});
			createIndividualTests(format, format.tests!);
		});
	}
}

for (const i in Games.modes) {
	const mode = Games.modes[i];
	if (mode.tests) {
		const formats: string[] = [];
		for (const i in Games.formats) {
			if (Games.formats[i].modes && Games.formats[i].modes!.includes(mode.id)) {
				formats.push(i);
			}
		}
		if (!formats.length) throw new Error("No format found for " + mode.name + " tests");

		for (let i = 0; i < formats.length; i++) {
			const format = Games.getExistingFormat(formats[i] + ", " + mode.id);
			describe(format.nameWithOptions + " individual tests", () => {
				afterEach(() => {
					if (room.game) room.game.deallocate(true);
				});
				createIndividualTests(format, mode.tests!);
			});
		}
	}
}

describe("Games", () => {
	after(() => {
		Games.unrefWorkers();
	});

	it('should load data properly', () => {
		assert(Object.keys(Games.aliases).length);
		assert(Object.keys(Games.formats).length);
		assert(Object.keys(Games.internalFormats).length);
		assert(Object.keys(Games.modes).length);
		assert(Object.keys(Games.modeAliases).length);
		assert(Object.keys(Games.userHostedFormats).length);
		assert(Object.keys(Games.userHostedAliases).length);
	});

	it('should have valid mascots', () => {
		for (const i in Games.formats) {
			const format = Games.getExistingFormat(i);
			testMascots(format);
		}

		for (const i in Games.userHostedFormats) {
			const format = Games.getExistingUserHostedFormat(i);
			testMascots(format);
		}
	});

	it('should only be defined in one location (scripted vs. user-hosted)', () => {
		for (const i in Games.userHostedFormats) {
			assert(Array.isArray(Games.getFormat(i)), Games.getExistingUserHostedFormat(i).name);
		}
	});

	it('should create games properly', function() {
		this.timeout(30000);
		for (const i in Games.formats) {
			try {
				// tslint:disable-next-line prefer-const
				let initialSeed: PRNGSeed | undefined;
				Games.createGame(room, Games.getExistingFormat(i), room, false, initialSeed);
			} catch (e) {
				if (room.game) {
					console.log(Games.getExistingFormat(i).name + " (starting seed = " + room.game.prng.initialSeed + ") crashed with: " + e.message);
				}
				throw e;
			}
			if (room.game) room.game.deallocate(true);
		}

		const formatsByMode: Dict<string[]> = {};
		for (const i in Games.modes) {
			const mode = Games.modes[i];
			formatsByMode[mode.id] = [];
			for (const i in Games.formats) {
				if (Games.formats[i].modes && Games.formats[i].modes!.includes(mode.id)) formatsByMode[mode.id].push(i);
			}
		}

		for (const mode in formatsByMode) {
			for (let i = 0; i < formatsByMode[mode].length; i++) {
				const format = Games.getExistingFormat(formatsByMode[mode][i] + "," + mode);
				try {
					// tslint:disable-next-line prefer-const
					let initialSeed: PRNGSeed | undefined;
					Games.createGame(room, format, room, false, initialSeed);
				} catch (e) {
					if (room.game) {
						console.log(format.name + " (starting seed = " + room.game.prng.initialSeed + ") crashed with: " + e.message);
					}
					throw e;
				}
				if (room.game) room.game.deallocate(true);
			}
		}
	});

	it('should return proper values from getFormat() and getUserHostedFormat()', () => {
		const formats = Object.keys(Games.formats);
		assert(!Array.isArray(Games.getFormat(formats[0])));

		assertStrictEqual(Games.getExistingFormat("Slowking's Trivia").name, "Slowking's Trivia");
		assertStrictEqual(Games.getExistingFormat('trivia').name, "Slowking's Trivia");
		assertStrictEqual(Games.getExistingFormat('trivia, abilities').nameWithOptions, "Slowking's Ability Trivia");
		assertStrictEqual(Games.getExistingFormat('trivia, survival').nameWithOptions, "Slowking's Trivia Survival");
		assertStrictEqual(Games.getExistingFormat('trivia, abilities, survival').nameWithOptions, "Slowking's Ability Trivia Survival");
		assertStrictEqual(Games.getExistingFormat('trivia, abilities, surv').nameWithOptions, "Slowking's Ability Trivia Survival");

		assertStrictEqual(Games.getExistingFormat('params, survival').nameWithOptions, "Paras' Parameters Survival");
		assertStrictEqual(Games.getExistingFormat('params, team').nameWithOptions, "Team Paras' Parameters");

		assertStrictEqual(Games.getExistingFormat('params,params:3').inputOptions.params, 3);
		assert(!Games.getExistingFormat('params').inputOptions.params);

		assert(!Array.isArray(Games.getUserHostedFormat(Object.keys(Games.userHostedFormats)[0])));
		assertStrictEqual(Games.getExistingUserHostedFormat('floettes forum game, name: Mocha Test Game').name, 'Mocha Test Game');

		const name = 'Non-existent Game';
		const nameFormat = Games.getFormat(name);
		assert(Array.isArray(nameFormat));
		assertStrictEqual(nameFormat[0], 'invalidGameFormat');
		assertStrictEqual(nameFormat[1], name);

		for (let i = 0; i < formats.length; i++) {
			const formatData = Games.formats[formats[i]];
			if (formatData.modes && formatData.modes.length >= 2) {
				const modesFormat = Games.getFormat(formats[i] + "," + formatData.modes[0] + "," + formatData.modes[1]);
				assert(Array.isArray(modesFormat));
				assertStrictEqual(modesFormat[0], 'tooManyGameModes');
				assertStrictEqual(modesFormat[1], undefined);
				break;
			}
		}

		for (let i = 0; i < formats.length; i++) {
			const formatData = Games.formats[formats[i]];
			if (formatData.variants && formatData.variants.length >= 2) {
				const variantsFormat = Games.getFormat(formats[i] + "," + formatData.variants[0].variant + "," + formatData.variants[1].variant);
				assert(Array.isArray(variantsFormat));
				assertStrictEqual(variantsFormat[0], 'tooManyGameVariants');
				assertStrictEqual(variantsFormat[1], undefined);
				break;
			}
		}

		const option = "Non-existent option";
		const optionFormat = Games.getFormat(formats[0] + "," + option);
		assert(Array.isArray(optionFormat));
		assertStrictEqual(optionFormat[0], 'invalidGameOption');
		assertStrictEqual(optionFormat[1], option);

		assert(!Array.isArray(Games.getUserHostedFormat(Object.keys(Games.userHostedFormats)[0])));

		const nameUserHostedFormat = Games.getUserHostedFormat(name);
		assert(Array.isArray(nameUserHostedFormat));
		assertStrictEqual(nameUserHostedFormat[0], 'invalidUserHostedGameFormat');
		assertStrictEqual(nameUserHostedFormat[1], name);
	});

	it('should start signups for scripted games', () => {
		const roomPrefix = room.id + "|";
		for (const i in Games.formats) {
			const format = Games.getExistingFormat(i);
			const startingSendQueueIndex = Client.sendQueue.length;

			const gameLog: string[] = [];
			const game = Games.createGame(room, format);
			assert(game);
			assertStrictEqual(game.format.name, format.name);
			if (game.mascot) game.shinyMascot = true;
			game.signups();
			gameLog.push(roomPrefix + "/adduhtml " + game.uhtmlBaseName + "-signups, " + game.getSignupsHtml());
			gameLog.push(roomPrefix + "/notifyrank all, Mocha scripted game," + format.name + "," + Games.scriptedGameHighlight + " " + game.name);
			if (game.mascot) gameLog.push(roomPrefix + game.mascot.name + " is shiny so bits will be doubled!");

			assertClientSendQueue(startingSendQueueIndex, gameLog);
			game.deallocate(true);
		}
	});

	it('should start signups for user-hosted games', () => {
		const roomPrefix = room.id + "|";
		const userHostedFormats: IUserHostedFormat[] = [];
		for (const i in Games.userHostedFormats) {
			userHostedFormats.push(Games.getExistingUserHostedFormat(i));
		}
		for (const i in Games.formats) {
			const format = Games.getExistingFormat(i);
			if (!format.scriptedOnly) userHostedFormats.push(Games.getExistingUserHostedFormat(i));
		}

		for (let i = 0; i < userHostedFormats.length; i++) {
			const format = userHostedFormats[i];
			const startingSendQueueIndex = Client.sendQueue.length;

			const gameLog: string[] = [];
			const game = Games.createUserHostedGame(room, format, Users.self.name);
			assert(game);
			assertStrictEqual(game.format.name, format.name);
			if (game.mascot) game.shinyMascot = true;
			game.signups();
			gameLog.push(roomPrefix + "/adduhtml " + game.uhtmlBaseName + "-signups, " + game.getSignupsHtml());
			if (game.mascot) gameLog.push(roomPrefix + game.mascot.name + " is shiny so bits will be doubled!");
			gameLog.push(roomPrefix + "/notifyrank all, Mocha user-hosted game," + game.name + "," + game.hostName + " " + Games.userHostedGameHighlight + " " + game.name);

			assertClientSendQueue(startingSendQueueIndex, gameLog);
			game.deallocate(true);
		}
	});

	it('should properly set options', () => {
		assertStrictEqual(Games.createGame(room, Games.getExistingFormat('trivia')).name, "Slowking's Trivia");
		assertStrictEqual(Games.createGame(room, Games.getExistingFormat('trivia, abilities')).name, "Slowking's Ability Trivia");
		assertStrictEqual(Games.createGame(room, Games.getExistingFormat('trivia, survival')).name, "Slowking's Trivia Survival");
		assertStrictEqual(Games.createGame(room, Games.getExistingFormat('trivia, abilities, survival')).name, "Slowking's Ability Trivia Survival");

		assertStrictEqual(Games.createUserHostedGame(room, Games.getExistingUserHostedFormat('floettes forum game, name: Mocha Test Game'), Users.self.name).name, Users.self.name + "'s Mocha Test Game");
	});

	it('should return proper values from isInPastGames()', () => {
		const now = Date.now();
		const pastGames: IPastGame[] = [
			{inputTarget: 'trivia', name: "Slowking's Trivia", time: now},
			{inputTarget: 'mocha', name: 'Mocha', time: now},
		];

		assert(Games.isInPastGames(room, 'trivia', pastGames));
		assert(Games.isInPastGames(room, "Slowking's Trivia", pastGames));
		assert(Games.isInPastGames(room, 'trivia,Pokemon Moves', pastGames));
		assert(!Games.isInPastGames(room, 'anagrams', pastGames));
		assert(Games.isInPastGames(room, 'mocha', pastGames));
		assert(Games.isInPastGames(room, 'Mocha', pastGames));
	});
	it('should return proper values from getList methods', () => {
		const abilities = Games.getAbilitiesList().map(x => x.name);
		const items = Games.getItemsList().map(x => x.name);
		const moves = Games.getMovesList().map(x => x.name);
		const pokemon = Games.getPokemonList().map(x => x.species);

		assert(!abilities.includes(Dex.getExistingAbility('No Ability').name));

		// LGPE/CAP/Glitch/Pokestar
		assert(!abilities.includes(Dex.getExistingAbility('Mountaineer').name));
		assert(!items.includes(Dex.getExistingItem('Crucibellite').name));
		assert(!moves.includes(Dex.getExistingMove('Baddy Bad').name));
		assert(!moves.includes(Dex.getExistingMove('Paleo Wave').name));
		assert(!pokemon.includes(Dex.getExistingPokemon('Pikachu-Starter').species));
		assert(!pokemon.includes(Dex.getExistingPokemon('Voodoom').species));
		assert(!pokemon.includes(Dex.getExistingPokemon('Missingno.').species));
		assert(!pokemon.includes(Dex.getExistingPokemon('Pokestar Smeargle').species));

		// not available in Sword/Shield
		assert(items.includes(Dex.getExistingItem('Abomasite').name));
		assert(moves.includes(Dex.getExistingMove('Aeroblast').name));
		assert(pokemon.includes(Dex.getExistingPokemon('Bulbasaur').species));

		// available in Sword/Shield
		assert(abilities.includes(Dex.getExistingAbility('Intimidate').name));
		assert(items.includes(Dex.getExistingItem('Choice Scarf').name));
		assert(moves.includes(Dex.getExistingMove('Tackle').name));
		assert(pokemon.includes(Dex.getExistingPokemon('Charmander').species));
	});
});

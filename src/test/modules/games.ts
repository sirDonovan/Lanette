import assert = require('assert');
import fs = require('fs');
import path = require('path');

import { CommandErrorArray } from '../../command-parser';
import { PRNGSeed } from '../../prng';
import { Game } from '../../room-game';
import { GameCommandReturnType, IGameFile, IGameFormat, IGameFormatData, IGameMode, IGameModeFile, IUserHostedComputed, IUserHostedFormat } from '../../types/games';
import { assertClientSendQueue } from '../test-tools';

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

const room = Rooms.add('mocha');
for (const i in Games.formats) {
	const format = Games.getExistingFormat(i);
	if (format.tests) {
		describe(format.name + " individual tests", () => {
			afterEach(() => {
				if (room.game) room.game.deallocate(true);
			});

			for (const i in format.tests) {
				const testData = format.tests[i];
				let testFormat = format;
				if (testData.attributes && testData.attributes.inputTarget) testFormat = Games.getExistingFormat(testData.attributes.inputTarget);

				if (testData.attributes && testData.attributes.async) {
					it(i, async function() {
						await testData.test.call(this, createIndividualTestGame(testFormat), testFormat);
					});
				} else {
					it(i, function() {
						testData.test.call(this, createIndividualTestGame(testFormat), testFormat);
					});
				}
			}
		});
	}
}

describe("Games", () => {
	after(() => {
		Games.unrefWorkers();
	});

	it('should not overwrite data from other games', () => {
		const aliases: Dict<string> = {};
		const commandNames: string[] = Object.keys(Games.sharedCommands);
		const formats: Dict<IGameFormatData> = {};
		const minigameCommandNames: Dict<{aliases: string[], format: string}> = {};
		const modes: Dict<IGameMode> = {};
		const userHostedAliases: Dict<string> = {};
		const userHostedFormats: Dict<IUserHostedComputed> = {};

		const gameFiles = fs.readdirSync(Games.gamesDirectory);
		for (let i = 0; i < gameFiles.length; i++) {
			if (!gameFiles[i].endsWith('.js')) continue;
			const file = require(Games.gamesDirectory + '/' + gameFiles[i]).game as IGameFile;
			const id = Tools.toId(file.name);
			assert(!(id in formats), "'" + id + "' is the name of another game");
			let commands;
			if (file.commands) commands = CommandParser.loadCommands<Game, GameCommandReturnType>(Tools.deepClone(file.commands));
			formats[id] = Object.assign({}, file, {commands, id});
		}

		const modesDirectory = path.join(Games.gamesDirectory, "modes");
		const modeFiles = fs.readdirSync(modesDirectory);
		for (let i = 0; i < modeFiles.length; i++) {
			if (!modeFiles[i].endsWith('.js')) continue;
			const file = require(modesDirectory + '/' + modeFiles[i]).mode as IGameModeFile;
			const id = Tools.toId(file.name);
			assert(!(id in modes), "'" + id + "' is the name of another game mode");
			modes[id] = Object.assign({id}, file);
		}

		for (let i = 0; i < Games.userHosted.formats.length; i++) {
			const format = Games.userHosted.formats[i];
			const id = Tools.toId(format.name);

			assert(!(id in userHostedFormats), "'" + id + "' is the name of another user-hosted game");

			if (format.aliases) {
				for (let i = 0; i < format.aliases.length; i++) {
					const alias = Tools.toId(format.aliases[i]);
					assert(!(alias in userHostedFormats), format.name + "'s alias '" + alias + "' is the name of another user-hosted game");
					assert(!(alias in userHostedAliases), format.name + "'s alias '" + alias + "' is already used by " + userHostedAliases[alias]);
					userHostedAliases[alias] = format.name;
				}
			}

			userHostedFormats[id] = Object.assign({}, format, {
				class: Games.userHosted.class,
				id,
			});
		}

		for (const i in formats) {
			const format = formats[i];
			if (format.aliases) {
				for (let i = 0; i < format.aliases.length; i++) {
					const alias = Tools.toId(format.aliases[i]);
					assert(!(alias in formats), format.name + "'s alias '" + alias + "' is the name of another game");
					assert(!(alias in aliases), format.name + "'s alias '" + alias + "' is already used by " + aliases[alias]);
					aliases[alias] = format.name;
				}
			}

			if (format.commands) {
				for (const i in format.commands) {
					if (!commandNames.includes(i)) commandNames.push(i);
				}
			}

			if (format.minigameCommand) {
				const minigameCommand = Tools.toId(format.minigameCommand);
				assert(!minigameCommandNames.hasOwnProperty(minigameCommand), format.name + "'s minigame command '" + minigameCommand + "' is already used by " + minigameCommandNames[minigameCommand]);
				minigameCommandNames[minigameCommand] = {aliases: format.minigameCommandAliases ? format.minigameCommandAliases.map(x => Tools.toId(x)) : [], format: format.name};
			}

			if (format.variants) {
				for (let i = 0; i < format.variants.length; i++) {
					if (format.variants[i].mode) assert(Tools.toId(format.variants[i].mode) in modes, "Variant " + format.variants[i].name + "'s mode '" + format.variants[i].mode + "' does not exist");
					const id = Tools.toId(format.variants[i].name);
					assert(!(id in formats), "Variant " + format.variants[i].name + " is the name of another game");
					assert(!(id in modes), "Variant " + format.variants[i].name + " is the name of a game mode");
					if (!(id in aliases)) aliases[id] = format.name + "," + format.variants[i].variant;
				}
			}

			if (format.modes) {
				for (let i = 0; i < format.modes.length; i++) {
					assert(Tools.toId(format.modes[i]) in modes, "'" + format.modes[i] + "' is not a valid mode");
				}
			}
		}

		for (const i in formats) {
			const format = formats[i];
			if (format.formerNames) {
				for (let i = 0; i < format.formerNames.length; i++) {
					const id = Tools.toId(format.formerNames[i]);
					assert(!(id in formats), format.name + "'s former name '" + format.formerNames[i] + "' is the name of another game");
					assert(!(id in aliases), aliases[id] + "'s alias '" + id + "' is the former name of another game");
				}
			}
		}

		for (const i in modes) {
			const mode = modes[i];
			if (mode.commands) {
				for (const i in mode.commands) {
					if (!commandNames.includes(i)) commandNames.push(i);
				}
			}
		}

		for (const name in minigameCommandNames) {
			assert(!commandNames.includes(name), "Minigame command '" + name + "' is a regular command for another game");
			for (let i = 0; i < minigameCommandNames[name].aliases.length; i++) {
				const alias = minigameCommandNames[name].aliases[i];
				assert(!commandNames.includes(alias), "Minigame command alias '" + alias + "' (" + name + ") is a regular command for another game");
			}
		}
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

	it('should load data properly', function() {
		this.timeout(15000);
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
	});

	it('should return proper values from getFormat() and getUserHostedFormat()', () => {
		const formats = Object.keys(Games.formats);
		assert(!Array.isArray(Games.getFormat(formats[0])));

		assert(Games.getExistingFormat("Slowking's Trivia").name === "Slowking's Trivia");
		assert(Games.getExistingFormat('trivia').name === "Slowking's Trivia");
		assert(Games.getExistingFormat('trivia, abilities').nameWithOptions === "Slowking's Ability Trivia");
		assert(Games.getExistingFormat('trivia, survival').nameWithOptions === "Slowking's Trivia Survival");
		assert(Games.getExistingFormat('trivia, abilities, survival').nameWithOptions === "Slowking's Ability Trivia Survival");

		assert(Games.getExistingFormat('params,params:3').inputOptions.params === 3);
		assert(!Games.getExistingFormat('params').inputOptions.params);

		assert(!Array.isArray(Games.getUserHostedFormat(Object.keys(Games.userHostedFormats)[0])));
		assert(Games.getExistingUserHostedFormat('floettes forum game, name: Mocha Test Game').name === 'Mocha Test Game');

		const name = 'Non-existent Game';
		const nameFormat = Games.getFormat(name) as CommandErrorArray;
		assert(Array.isArray(nameFormat));
		assert(nameFormat[0] === 'invalidGameFormat');
		assert(nameFormat[1] === name);

		const modes = Object.keys(Games.modes);
		if (modes.length >= 2) {
			const modesFormat = Games.getFormat(name + "," + modes[0] + "," + modes[1]) as CommandErrorArray;
			assert(Array.isArray(modesFormat));
			assert(modesFormat[0] === 'tooManyGameModes');
			assert(modesFormat[1] === undefined);
		}

		for (let i = 0; i < formats.length; i++) {
			const formatData = Games.formats[formats[i]];
			if (formatData.variants && formatData.variants.length >= 2) {
				const variantsFormat = Games.getFormat(formats[i] + "," + formatData.variants[0].variant + "," + formatData.variants[1].variant) as CommandErrorArray;
				assert(Array.isArray(variantsFormat));
				assert(variantsFormat[0] === 'tooManyGameVariants');
				assert(variantsFormat[1] === undefined);
				break;
			}
		}

		for (let i = 0; i < formats.length; i++) {
			const formatData = Games.formats[formats[i]];
			if (formatData.modes && formatData.variants) {
				let hasVariantMode = false;
				for (let i = 0; i < formatData.variants.length; i++) {
					if (formatData.variants[i].mode) {
						const variantsModeFormat = Games.getFormat(formatData.id + "," + formatData.variants[i].variant + "," + formatData.variants[i].mode) as CommandErrorArray;
						assert(Array.isArray(variantsModeFormat));
						assert(variantsModeFormat[0] === 'tooManyGameModes');
						assert(variantsModeFormat[1] === undefined);
						hasVariantMode = true;
					}
				}
				if (hasVariantMode) break;
			}
		}

		const option = "Non-existent option";
		const optionFormat = Games.getFormat(formats[0] + "," + option) as CommandErrorArray;
		assert(Array.isArray(nameFormat));
		assert(optionFormat[0] === 'invalidGameOption');
		assert(optionFormat[1] === option);

		assert(!Array.isArray(Games.getUserHostedFormat(Object.keys(Games.userHostedFormats)[0])));

		const nameUserHostedFormat = Games.getUserHostedFormat(name) as CommandErrorArray;
		assert(Array.isArray(nameUserHostedFormat));
		assert(nameUserHostedFormat[0] === 'invalidUserHostedGameFormat');
		assert(nameUserHostedFormat[1] === name);
	});

	it('should start signups for scripted games', () => {
		const roomPrefix = room.id + "|";
		for (const i in Games.formats) {
			const format = Games.getExistingFormat(i);
			const startingSendQueueIndex = Client.sendQueue.length;

			const gameLog: string[] = [];
			const game = Games.createGame(room, format);
			assert(game);
			assert(game.format.name === format.name);
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
			assert(game.format.name === format.name);
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
		assert(Games.createGame(room, Games.getExistingFormat('trivia')).name === "Slowking's Trivia");
		assert(Games.createGame(room, Games.getExistingFormat('trivia, abilities')).name === "Slowking's Ability Trivia");
		assert(Games.createGame(room, Games.getExistingFormat('trivia, survival')).name === "Slowking's Trivia Survival");
		assert(Games.createGame(room, Games.getExistingFormat('trivia, abilities, survival')).name === "Slowking's Ability Trivia Survival");

		assert(Games.createUserHostedGame(room, Games.getExistingUserHostedFormat('floettes forum game, name: Mocha Test Game'), Users.self.name).name === Users.self.name + "'s Mocha Test Game");
	});
});

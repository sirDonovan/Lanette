import assert = require('assert');
import fs = require('fs');
import path = require('path');

import { CommandErrorArray } from '../../command-parser';
import { PoliwrathsPortmanteaus } from '../../games/poliwraths-portmanteaus';
import { IGameFile, IGameFileComputed, IGameFormat, IGameMode, IGameModeFile, IUserHostedComputed, IUserHostedFormat } from '../../types/games';

function testMascots(format: IGameFormat | IUserHostedFormat) {
	if (format.mascot) {
		assert(Dex.getPokemon(format.mascot), format.name);
	} else if (format.mascots) {
		for (let i = 0; i < format.mascots.length; i++) {
			assert(Dex.getPokemon(format.mascots[i]), format.name);
		}
	}
}

describe("Games", () => {
	after(() => {
		Games.unrefWorkers();
	});

	it('should not overwrite data from other games', () => {
		const aliases: Dict<string> = {};
		const commandNames: string[] = Object.keys(Games.commands);
		const formats: Dict<IGameFileComputed> = {};
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
			formats[id] = Object.assign({id}, file);
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
				format.commands = CommandParser.loadCommands(format.commands);
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

	it('should return proper error codes from getFormat() and getUserHostedFormat()', () => {
		const formats = Object.keys(Games.formats);
		assert(!Array.isArray(Games.getFormat(formats[0])));

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
	it('should return proper values from Portmanteaus worker', async () => {
		const room = Rooms.add('mocha');
		const game = Games.createGame(room, Games.getExistingFormat('poliwrathsportmanteaus')) as PoliwrathsPortmanteaus;
		for (let i = game.customizableOptions.ports.min; i <= game.customizableOptions.ports.max; i++) {
			game.options.ports = i;
			await game.onNextRound();
			assert(game.answers.length);
			assert(game.ports.length);
			for (let i = 0; i < game.answers.length; i++) {
				assert(game.answers[i] in game.answerParts);
			}
		}

		game.customPortTypes = ['Pokemon', 'Item'];
		game.customPortCategories = ['egggroup', 'type'];
		game.customPortDetails = ['Flying', 'Plate'];
		await game.onNextRound();
		assert(game.answers.length);
		assert(game.ports.length);
		assert(game.answers.join(', ') === 'pidgeottoxic, togeticicle, talonflameadow');
		for (let i = 0; i < game.answers.length; i++) {
			assert(game.answers[i] in game.answerParts);
		}
	});
});

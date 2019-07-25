import * as assert from 'assert';
import { CommandErrorArray } from '../../command-parser';
import { IGameFormat, IUserHostedFormat } from '../../types/games';

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
});

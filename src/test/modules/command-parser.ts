import { ColorPicker } from '../../html-pages/components/color-picker';
import { PokemonPickerBase } from '../../html-pages/components/pokemon-picker-base';
import { PokemonPickerManual } from '../../html-pages/components/pokemon-picker-manual';
import { PokemonPickerRandom } from '../../html-pages/components/pokemon-picker-random';
import { TrainerPicker } from '../../html-pages/components/trainer-picker';
import { TypePicker } from '../../html-pages/components/type-picker';
import { GameHostControlPanel } from '../../html-pages/game-host-control-panel';
import { assert } from './../test-tools';

/* eslint-env mocha */

describe("CommandParser", () => {
	it('should have commands with only 1 function type each', () => {
		for (const i in Commands) {
			assert(Commands[i].command);
		}
	});

	it('should load data for HTML pages', function() {
		this.timeout(10000); // eslint-disable-line @typescript-eslint/no-invalid-this

		ColorPicker.loadData();
		GameHostControlPanel.loadData();
		PokemonPickerBase.loadData();
		PokemonPickerManual.loadData();
		PokemonPickerRandom.loadData();
		TrainerPicker.loadData();
		TypePicker.loadData();
	});
});

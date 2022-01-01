import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { ModelGeneration } from "../types/dex";
import type { IGameFormat } from "../types/games";
import type { IPokemon } from "../types/pokemon-showdown";
import type { IDatabase, IGameCustomBorder, IGameScriptedBox } from "../types/storage";
import type { BorderType, HexCode } from "../types/tools";
import type { User } from "../users";
import { BorderStyle } from "./components/border-style";
import type { IColorPick } from "./components/color-picker";
import { ColorPicker } from "./components/color-picker";
import type { IPokemonPick } from "./components/pokemon-picker-base";
import { PokemonPickerManual } from "./components/pokemon-picker-manual";
import { HtmlPageBase } from "./html-page-base";

type BorderPickers = 'background' | 'buttons' | 'signups-background' | 'signups-buttons' | 'game-background' | 'game-buttons';
type BorderDatabaseKeys = 'backgroundBorder' | 'buttonsBorder' | 'signupsBackgroundBorder' | 'signupsButtonsBorder' |
	'gameBackgroundBorder' | 'gameButtonsBorder';

const baseCommand = 'gamescriptedbox';
const setGameFormatCommand = 'setgameformat';
const setGameFormatSeparateCommand = 'gsbformat';
const setPokemonCommand = 'setpokemon';
const chooseSignupsView = 'choosesignupsview';
const chooseGameView = 'choosegameview';
const chooseBackgroundColorPicker = 'choosebackgroundcolorpicker';
const chooseButtonColorPicker = 'choosebuttoncolorpicker';
const chooseSignupsBackgroundColorPicker = 'choosesignupsbackgroundcolorpicker';
const chooseSignupsButtonColorPicker = 'choosesignupsbuttoncolorpicker';
const chooseGameBackgroundColorPicker = 'choosegamebackgroundcolorpicker';
const chooseGameButtonColorPicker = 'choosegamebuttoncolorpicker';
const choosePokemonPicker = 'choosepokemonpicker';
const chooseBackgroundBorderPicker = 'choosebackgroundborderpicker';
const chooseButtonsBorderPicker = 'choosebuttonsborderpicker';
const chooseSignupsBackgroundBorderPicker = 'choosesignupsbackgroundborderpicker';
const chooseSignupsButtonsBorderPicker = 'choosesignupsbuttonsborderpicker';
const chooseGameBackgroundBorderPicker = 'choosegamebackgroundborderpicker';
const chooseGameButtonsBorderPicker = 'choosegamebuttonsborderpicker';
const setBackgroundColorCommand = 'setbackgroundcolor';
const setButtonColorCommand = 'setbuttonscolor';
const setSignupsBackgroundColorCommand = 'setsignupsbackgroundcolor';
const setSignupsButtonColorCommand = 'setsignupsbuttonscolor';
const setGameBackgroundColorCommand = 'setgamebackgroundcolor';
const setGameButtonColorCommand = 'setgamebuttonscolor';
const setBackgroudBorderStyleCommand = 'setbackgroundborderstyle';
const setButtonBorderStyleCommand = 'setbuttonborderstyle';
const setSignupsBackgroudBorderStyleCommand = 'setsignupsbackgroundborderstyle';
const setSignupsButtonBorderStyleCommand = 'setsignupsbuttonborderstyle';
const setGameBackgroudBorderStyleCommand = 'setgamebackgroundborderstyle';
const setGameButtonBorderStyleCommand = 'setgamebuttonborderstyle';
const closeCommand = 'close';

const pageId = 'game-scripted-box';

export const id = pageId;
export const pages: Dict<GameScriptedBox> = {};

class GameScriptedBox extends HtmlPageBase {
	pageId = pageId;

	gameFormat: string;

	backgroundColorPicker: ColorPicker;
	buttonColorPicker: ColorPicker;
	signupsBackgroundColorPicker: ColorPicker;
	signupsButtonColorPicker: ColorPicker;
	gameBackgroundColorPicker: ColorPicker;
	gameButtonColorPicker: ColorPicker;
	pokemonPicker: PokemonPickerManual;
	backgroundBorderStyle: BorderStyle;
	buttonsBorderStyle: BorderStyle;
	signupsBackgroundBorderStyle: BorderStyle;
	signupsButtonsBorderStyle: BorderStyle;
	gameBackgroundBorderStyle: BorderStyle;
	gameButtonsBorderStyle: BorderStyle;
	currentPicker: 'background' | 'buttons' | 'signups-background' | 'signups-buttons' | 'game-background' | 'game-buttons' |
		'pokemon' | 'background-border' | 'buttons-border' | 'signups-background-border' | 'signups-buttons-border' |
		'game-background-border' | 'game-buttons-border' = 'pokemon';
	currentView: 'signups' | 'game' = 'signups';

	constructor(room: Room, user: User) {
		super(room, user, baseCommand);

		const database = Storage.getDatabase(this.room);
		let currentBackgroundColor: HexCode | undefined;
		let currentButtonColor: HexCode | undefined;
		let currentSignupsBackgroundColor: HexCode | undefined;
		let currentSignupsButtonColor: HexCode | undefined;
		let currentGameBackgroundColor: HexCode | undefined;
		let currentGameButtonColor: HexCode | undefined;
		let currentBackgroundBorder: IGameCustomBorder | undefined;
		let currentButtonsBorder: IGameCustomBorder | undefined;
		let currentSignupsBackgroundBorder: IGameCustomBorder | undefined;
		let currentSignupsButtonsBorder: IGameCustomBorder | undefined;
		let currentGameBackgroundBorder: IGameCustomBorder | undefined;
		let currentGameButtonsBorder: IGameCustomBorder | undefined;
		let previewFormat: string | undefined;
		if (database.gameScriptedBoxes && this.userId in database.gameScriptedBoxes) {
			const box = database.gameScriptedBoxes[this.userId];
			currentBackgroundColor = box.background;
			currentButtonColor = box.buttons;
			currentSignupsBackgroundColor = box.signupsBackground;
			currentSignupsButtonColor = box.signupsButtons;
			currentGameBackgroundColor = box.gameBackground;
			currentGameButtonColor = box.gameButtons;
			currentBackgroundBorder = box.backgroundBorder;
			currentButtonsBorder = box.buttonsBorder;
			currentSignupsBackgroundBorder = box.signupsBackgroundBorder;
			currentSignupsButtonsBorder = box.signupsButtonsBorder;
			currentGameBackgroundBorder = box.gameBackgroundBorder;
			currentGameButtonsBorder = box.gameButtonsBorder;
			previewFormat = box.previewFormat;
		}

		this.gameFormat = previewFormat || "pmp";

		this.backgroundColorPicker = new ColorPicker(room, this.commandPrefix, setBackgroundColorCommand, {
			currentPick: currentBackgroundColor,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickBackgroundHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickBackgroundLightness(dontRender),
			onClear: (index, dontRender) => this.clearBackgroundColor(dontRender),
			onPick: (index, color, dontRender) => this.setBackgroundColor(color, dontRender),
			reRender: () => this.send(),
		});

		this.buttonColorPicker = new ColorPicker(room, this.commandPrefix, setButtonColorCommand, {
			currentPick: currentButtonColor,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickButtonHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickButtonLightness(dontRender),
			onClear: (index, dontRender) => this.clearButtonsColor(dontRender),
			onPick: (index, color, dontRender) => this.setButtonsColor(color, dontRender),
			reRender: () => this.send(),
		});

		this.signupsBackgroundColorPicker = new ColorPicker(room, this.commandPrefix, setSignupsBackgroundColorCommand, {
			currentPick: currentSignupsBackgroundColor,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickBackgroundHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickBackgroundLightness(dontRender),
			onClear: (index, dontRender) => this.clearSignupsBackgroundColor(dontRender),
			onPick: (index, color, dontRender) => this.setSignupsBackgroundColor(color, dontRender),
			reRender: () => this.send(),
		});

		this.signupsButtonColorPicker = new ColorPicker(room, this.commandPrefix, setSignupsButtonColorCommand, {
			currentPick: currentSignupsButtonColor,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickButtonHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickButtonLightness(dontRender),
			onClear: (index, dontRender) => this.clearSignupsButtonsColor(dontRender),
			onPick: (index, color, dontRender) => this.setSignupsButtonsColor(color, dontRender),
			reRender: () => this.send(),
		});

		this.gameBackgroundColorPicker = new ColorPicker(room, this.commandPrefix, setGameBackgroundColorCommand, {
			currentPick: currentGameBackgroundColor,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickBackgroundHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickBackgroundLightness(dontRender),
			onClear: (index, dontRender) => this.clearGameBackgroundColor(dontRender),
			onPick: (index, color, dontRender) => this.setGameBackgroundColor(color, dontRender),
			reRender: () => this.send(),
		});

		this.gameButtonColorPicker = new ColorPicker(room, this.commandPrefix, setGameButtonColorCommand, {
			currentPick: currentGameButtonColor,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickButtonHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickButtonLightness(dontRender),
			onClear: (index, dontRender) => this.clearGameButtonsColor(dontRender),
			onPick: (index, color, dontRender) => this.setGameButtonsColor(color, dontRender),
			reRender: () => this.send(),
		});

		this.pokemonPicker = new PokemonPickerManual(room, this.commandPrefix, setPokemonCommand, {
			gif: false,
			maxGifs: 0,
			maxIcons: 1,
			onPickLetter: (index, letter, dontRender) => this.pickPokemonLetter(dontRender),
			onPickGeneration: (index, generation, dontRender) => this.pickPokemonGeneration(index, generation, dontRender),
			onPickShininess: (index, shininess, dontRender) => this.pickPokemonShininess(index, shininess, dontRender),
			onClearType: (index, dontRender) => this.clearPokemonType(dontRender),
			onPickType: (index, type, dontRender) => this.pickPokemonType(dontRender),
			onClear: (index, dontRender) => this.clearPokemon(index, dontRender),
			onPick: (index, pokemon, dontRender) =>
				this.selectPokemon(index, pokemon, dontRender),
			reRender: () => this.send(),
		});

		this.backgroundBorderStyle = new BorderStyle(room, this.commandPrefix, setBackgroudBorderStyleCommand, {
			currentBorder: currentBackgroundBorder,
			minRadius: 2,
			maxRadius: 100,
			minSize: 2,
			maxSize: 5,
			onClearColor: (dontRender) => this.clearBorderColor('background', dontRender),
			onPickColor: (color: IColorPick, dontRender: boolean | undefined) => this.setBorderColor('background', color, dontRender),
			onClearRadius: () => this.clearBorderRadius('background'),
			onPickRadius: (radius) => this.setBorderRadius('background', radius),
			onClearSize: () => this.clearBorderSize('background'),
			onPickSize: (size) => this.setBorderSize('background', size),
			onClearType: () => this.clearBorderType('background'),
			onPickType: (type) => this.setBorderType('background', type),
			reRender: () => this.send(),
		});

		this.buttonsBorderStyle = new BorderStyle(room, this.commandPrefix, setButtonBorderStyleCommand, {
			currentBorder: currentButtonsBorder,
			minRadius: 2,
			maxRadius: 50,
			minSize: 2,
			maxSize: 5,
			onClearColor: (dontRender) => this.clearBorderColor('buttons', dontRender),
			onPickColor: (color: IColorPick, dontRender: boolean | undefined) => this.setBorderColor('buttons', color, dontRender),
			onClearRadius: () => this.clearBorderRadius('buttons'),
			onPickRadius: (radius) => this.setBorderRadius('buttons', radius),
			onClearSize: () => this.clearBorderSize('buttons'),
			onPickSize: (size) => this.setBorderSize('buttons', size),
			onClearType: () => this.clearBorderType('buttons'),
			onPickType: (type) => this.setBorderType('buttons', type),
			reRender: () => this.send(),
		});

		this.signupsBackgroundBorderStyle = new BorderStyle(room, this.commandPrefix, setSignupsBackgroudBorderStyleCommand, {
			currentBorder: currentSignupsBackgroundBorder,
			minRadius: 2,
			maxRadius: 100,
			minSize: 2,
			maxSize: 5,
			onClearColor: (dontRender) => this.clearBorderColor('signups-background', dontRender),
			onPickColor: (color: IColorPick, dontRender: boolean | undefined) =>
				this.setBorderColor('signups-background', color, dontRender),
			onClearRadius: () => this.clearBorderRadius('signups-background'),
			onPickRadius: (radius) => this.setBorderRadius('signups-background', radius),
			onClearSize: () => this.clearBorderSize('signups-background'),
			onPickSize: (size) => this.setBorderSize('signups-background', size),
			onClearType: () => this.clearBorderType('signups-background'),
			onPickType: (type) => this.setBorderType('signups-background', type),
			reRender: () => this.send(),
		});

		this.signupsButtonsBorderStyle = new BorderStyle(room, this.commandPrefix, setSignupsButtonBorderStyleCommand, {
			currentBorder: currentSignupsButtonsBorder,
			minRadius: 2,
			maxRadius: 50,
			minSize: 2,
			maxSize: 5,
			onClearColor: (dontRender) => this.clearBorderColor('signups-buttons', dontRender),
			onPickColor: (color: IColorPick, dontRender: boolean | undefined) => this.setBorderColor('signups-buttons', color, dontRender),
			onClearRadius: () => this.clearBorderRadius('signups-buttons'),
			onPickRadius: (radius) => this.setBorderRadius('signups-buttons', radius),
			onClearSize: () => this.clearBorderSize('signups-buttons'),
			onPickSize: (size) => this.setBorderSize('signups-buttons', size),
			onClearType: () => this.clearBorderType('signups-buttons'),
			onPickType: (type) => this.setBorderType('signups-buttons', type),
			reRender: () => this.send(),
		});

		this.gameBackgroundBorderStyle = new BorderStyle(room, this.commandPrefix, setGameBackgroudBorderStyleCommand, {
			currentBorder: currentGameBackgroundBorder,
			minRadius: 0,
			maxRadius: 0,
			minSize: 2,
			maxSize: 5,
			onClearColor: (dontRender) => this.clearBorderColor('game-background', dontRender),
			onPickColor: (color: IColorPick, dontRender: boolean | undefined) => this.setBorderColor('game-background', color, dontRender),
			onClearRadius: () => this.clearBorderRadius('game-background'),
			onPickRadius: (radius) => this.setBorderRadius('game-background', radius),
			onClearSize: () => this.clearBorderSize('game-background'),
			onPickSize: (size) => this.setBorderSize('game-background', size),
			onClearType: () => this.clearBorderType('game-background'),
			onPickType: (type) => this.setBorderType('game-background', type),
			reRender: () => this.send(),
		});

		this.gameButtonsBorderStyle = new BorderStyle(room, this.commandPrefix, setGameButtonBorderStyleCommand, {
			currentBorder: currentGameButtonsBorder,
			minRadius: 2,
			maxRadius: 50,
			minSize: 2,
			maxSize: 5,
			onClearColor: (dontRender) => this.clearBorderColor('game-buttons', dontRender),
			onPickColor: (color: IColorPick, dontRender: boolean | undefined) => this.setBorderColor('game-buttons', color, dontRender),
			onClearRadius: () => this.clearBorderRadius('game-buttons'),
			onPickRadius: (radius) => this.setBorderRadius('game-buttons', radius),
			onClearSize: () => this.clearBorderSize('game-buttons'),
			onPickSize: (size) => this.setBorderSize('game-buttons', size),
			onClearType: () => this.clearBorderType('game-buttons'),
			onPickType: (type) => this.setBorderType('game-buttons', type),
			reRender: () => this.send(),
		});

		this.toggleActivePicker();

		this.components = [this.backgroundColorPicker, this.buttonColorPicker, this.signupsBackgroundColorPicker,
			this.signupsButtonColorPicker, this.gameBackgroundColorPicker, this.gameButtonColorPicker, this.pokemonPicker,
			this.backgroundBorderStyle, this.buttonsBorderStyle, this.signupsBackgroundBorderStyle, this.signupsButtonsBorderStyle,
			this.gameBackgroundBorderStyle, this.gameButtonsBorderStyle];

		pages[this.userId] = this;
	}

	onClose(): void {
		delete pages[this.userId];
	}

	getDatabase(): IDatabase {
		const database = Storage.getDatabase(this.room);
		Storage.createGameScriptedBox(database, this.userId);

		return database;
	}

	toggleActivePicker(): void {
		const signups = this.currentView === 'signups';
		const game = this.currentView === 'game';

		this.backgroundColorPicker.active = signups && this.currentPicker === 'background';
		this.buttonColorPicker.active = signups && this.currentPicker === 'buttons';
		this.signupsBackgroundColorPicker.active = signups && this.currentPicker === 'signups-background';
		this.signupsButtonColorPicker.active = signups && this.currentPicker === 'signups-buttons';
		this.pokemonPicker.active = signups && this.currentPicker === 'pokemon';
		this.backgroundBorderStyle.active = signups && this.currentPicker === 'background-border';
		this.buttonsBorderStyle.active = signups && this.currentPicker === 'buttons-border';
		this.signupsBackgroundBorderStyle.active = signups && this.currentPicker === 'signups-background-border';
		this.signupsButtonsBorderStyle.active = signups && this.currentPicker === 'signups-buttons-border';

		this.gameBackgroundColorPicker.active = game && this.currentPicker === 'game-background';
		this.gameButtonColorPicker.active = game && this.currentPicker === 'game-buttons';
		this.gameBackgroundBorderStyle.active = game && this.currentPicker === 'game-background-border';
		this.gameButtonsBorderStyle.active = game && this.currentPicker === 'game-buttons-border';
	}

	chooseSignupsView(): void {
		if (this.currentView === 'signups') return;

		this.currentView = 'signups';
		this.currentPicker = 'background';
		this.toggleActivePicker();

		this.send();
	}

	chooseGameView(): void {
		if (this.currentView === 'game') return;

		this.currentView = 'game';
		this.currentPicker = 'game-background';
		this.toggleActivePicker();

		this.send();
	}

	chooseBackgroundColorPicker(): void {
		if (this.currentPicker === 'background') return;

		this.currentPicker = 'background';
		this.toggleActivePicker();

		this.send();
	}

	chooseButtonColorPicker(): void {
		if (this.currentPicker === 'buttons') return;

		this.currentPicker = 'buttons';
		this.toggleActivePicker();

		this.send();
	}

	chooseSignupsBackgroundColorPicker(): void {
		if (this.currentPicker === 'signups-background') return;

		this.currentPicker = 'signups-background';
		this.toggleActivePicker();

		this.send();
	}

	chooseSignupsButtonColorPicker(): void {
		if (this.currentPicker === 'signups-buttons') return;

		this.currentPicker = 'signups-buttons';
		this.toggleActivePicker();

		this.send();
	}

	chooseGameBackgroundColorPicker(): void {
		if (this.currentPicker === 'game-background') return;

		this.currentPicker = 'game-background';
		this.toggleActivePicker();

		this.send();
	}

	chooseGameButtonColorPicker(): void {
		if (this.currentPicker === 'game-buttons') return;

		this.currentPicker = 'game-buttons';
		this.toggleActivePicker();

		this.send();
	}

	choosePokemonPicker(): void {
		if (this.currentPicker === 'pokemon') return;

		this.currentPicker = 'pokemon';
		this.toggleActivePicker();

		this.send();
	}

	chooseBackgroundBorderPicker(): void {
		if (this.currentPicker === 'background-border') return;

		this.currentPicker = 'background-border';
		this.toggleActivePicker();

		this.send();
	}

	chooseButtonsBorderPicker(): void {
		if (this.currentPicker === 'buttons-border') return;

		this.currentPicker = 'buttons-border';
		this.toggleActivePicker();

		this.send();
	}

	chooseSignupsBackgroundBorderPicker(): void {
		if (this.currentPicker === 'signups-background-border') return;

		this.currentPicker = 'signups-background-border';
		this.toggleActivePicker();

		this.send();
	}

	chooseSignupsButtonsBorderPicker(): void {
		if (this.currentPicker === 'signups-buttons-border') return;

		this.currentPicker = 'signups-buttons-border';
		this.toggleActivePicker();

		this.send();
	}

	chooseGameBackgroundBorderPicker(): void {
		if (this.currentPicker === 'game-background-border') return;

		this.currentPicker = 'game-background-border';
		this.toggleActivePicker();

		this.send();
	}

	chooseGameButtonsBorderPicker(): void {
		if (this.currentPicker === 'game-buttons-border') return;

		this.currentPicker = 'game-buttons-border';
		this.toggleActivePicker();

		this.send();
	}

	pickBackgroundHueVariation(dontRender?: boolean): void {
		if (!dontRender) this.send();
	}

	pickBackgroundLightness(dontRender?: boolean): void {
		if (!dontRender) this.send();
	}

	clearBackgroundColor(dontRender?: boolean): void {
		const database = this.getDatabase();
		delete database.gameScriptedBoxes![this.userId].background;

		if (!dontRender) this.send();
	}

	setBackgroundColor(color: IColorPick, dontRender?: boolean): void {
		const database = this.getDatabase();
		database.gameScriptedBoxes![this.userId].background = color.hexCode;

		if (!dontRender) this.send();
	}

	clearSignupsBackgroundColor(dontRender?: boolean): void {
		const database = this.getDatabase();
		delete database.gameScriptedBoxes![this.userId].signupsBackground;

		if (!dontRender) this.send();
	}

	setSignupsBackgroundColor(color: IColorPick, dontRender?: boolean): void {
		const database = this.getDatabase();
		database.gameScriptedBoxes![this.userId].signupsBackground = color.hexCode;

		if (!dontRender) this.send();
	}

	clearGameBackgroundColor(dontRender?: boolean): void {
		const database = this.getDatabase();
		delete database.gameScriptedBoxes![this.userId].gameBackground;

		if (!dontRender) this.send();
	}

	setGameBackgroundColor(color: IColorPick, dontRender?: boolean): void {
		const database = this.getDatabase();
		database.gameScriptedBoxes![this.userId].gameBackground = color.hexCode;

		if (!dontRender) this.send();
	}

	pickButtonHueVariation(dontRender?: boolean): void {
		if (!dontRender) this.send();
	}

	pickButtonLightness(dontRender?: boolean): void {
		if (!dontRender) this.send();
	}

	clearButtonsColor(dontRender?: boolean): void {
		const database = this.getDatabase();
		delete database.gameScriptedBoxes![this.userId].buttons;

		if (!dontRender) this.send();
	}

	setButtonsColor(color: IColorPick, dontRender?: boolean): void {
		const database = this.getDatabase();
		database.gameScriptedBoxes![this.userId].buttons = color.hexCode;

		if (!dontRender) this.send();
	}

	clearSignupsButtonsColor(dontRender?: boolean): void {
		const database = this.getDatabase();
		delete database.gameScriptedBoxes![this.userId].signupsButtons;

		if (!dontRender) this.send();
	}

	setSignupsButtonsColor(color: IColorPick, dontRender?: boolean): void {
		const database = this.getDatabase();
		database.gameScriptedBoxes![this.userId].signupsButtons = color.hexCode;

		if (!dontRender) this.send();
	}

	clearGameButtonsColor(dontRender?: boolean): void {
		const database = this.getDatabase();
		delete database.gameScriptedBoxes![this.userId].gameButtons;

		if (!dontRender) this.send();
	}

	setGameButtonsColor(color: IColorPick, dontRender?: boolean): void {
		const database = this.getDatabase();
		database.gameScriptedBoxes![this.userId].gameButtons = color.hexCode;

		if (!dontRender) this.send();
	}

	pickPokemonLetter(dontRender?: boolean): void {
		if (!dontRender) this.send();
	}

	pickPokemonGeneration(index: number, generation: ModelGeneration, dontRender?: boolean): void {
		if (!dontRender) this.send();
	}

	pickPokemonShininess(index: number, shininess: boolean, dontRender?: boolean): void {
		if (!dontRender) this.send();
	}

	clearPokemonType(dontRender?: boolean): void {
		if (!dontRender) this.send();
	}

	pickPokemonType(dontRender?: boolean): void {
		if (!dontRender) this.send();
	}

	clearPokemon(index: number, dontRender?: boolean): void {
		const database = this.getDatabase();

		database.gameScriptedBoxes![this.userId].pokemon = [];

		if (!dontRender) this.send();
	}

	selectPokemon(index: number, pokemon: IPokemonPick, dontRender?: boolean): void {
		const database = this.getDatabase();

		database.gameScriptedBoxes![this.userId].pokemon = [pokemon.pokemon];

		if (!dontRender) this.send();
	}

	getBorderDatabaseKey(picker: BorderPickers): BorderDatabaseKeys {
		if (picker === 'background') {
			return 'backgroundBorder';
		} else if (picker === 'buttons') {
			return 'buttonsBorder';
		} else if (picker === 'signups-background') {
			return 'signupsBackgroundBorder';
		} else if (picker === 'signups-buttons') {
			return 'signupsButtonsBorder';
		} else if (picker === 'game-background') {
			return 'gameBackgroundBorder';
		} else {
			return 'gameButtonsBorder';
		}
	}

	clearBorderColor(picker: BorderPickers, dontRender?: boolean): void {
		const database = this.getDatabase();
		const databaseKey = this.getBorderDatabaseKey(picker);

		if (databaseKey in database.gameScriptedBoxes![this.userId]) {
			delete database.gameScriptedBoxes![this.userId][databaseKey]!.color;
		}

		if (!dontRender) this.send();
	}

	setBorderColor(picker: BorderPickers, color: IColorPick, dontRender?: boolean): void {
		const database = this.getDatabase();
		const databaseKey = this.getBorderDatabaseKey(picker);

		if (!(databaseKey in database.gameScriptedBoxes![this.userId])) {
			database.gameScriptedBoxes![this.userId][databaseKey] = {};
		}
		database.gameScriptedBoxes![this.userId][databaseKey]!.color = color.hexCode;

		if (!dontRender) this.send();
	}

	clearBorderRadius(picker: BorderPickers): void {
		const database = this.getDatabase();
		const databaseKey = this.getBorderDatabaseKey(picker);

		if (databaseKey in database.gameScriptedBoxes![this.userId]) {
			delete database.gameScriptedBoxes![this.userId][databaseKey]!.radius;
		}

		this.send();
	}

	setBorderRadius(picker: BorderPickers, radius: number): void {
		const database = this.getDatabase();
		const databaseKey = this.getBorderDatabaseKey(picker);

		if (!(databaseKey in database.gameScriptedBoxes![this.userId])) {
			database.gameScriptedBoxes![this.userId][databaseKey] = {};
		}
		database.gameScriptedBoxes![this.userId][databaseKey]!.radius = radius;

		this.send();
	}

	clearBorderSize(picker: BorderPickers): void {
		const database = this.getDatabase();
		const databaseKey = this.getBorderDatabaseKey(picker);

		if (databaseKey in database.gameScriptedBoxes![this.userId]) {
			delete database.gameScriptedBoxes![this.userId][databaseKey]!.size;
		}

		this.send();
	}

	setBorderSize(picker: BorderPickers, size: number): void {
		const database = this.getDatabase();
		const databaseKey = this.getBorderDatabaseKey(picker);

		if (!(databaseKey in database.gameScriptedBoxes![this.userId])) {
			database.gameScriptedBoxes![this.userId][databaseKey] = {};
		}
		database.gameScriptedBoxes![this.userId][databaseKey]!.size = size;

		this.send();
	}

	clearBorderType(picker: BorderPickers): void {
		const database = this.getDatabase();
		const databaseKey = this.getBorderDatabaseKey(picker);

		if (databaseKey in database.gameScriptedBoxes![this.userId]) {
			delete database.gameScriptedBoxes![this.userId][databaseKey]!.type;
		}

		this.send();
	}

	setBorderType(picker: BorderPickers, type: BorderType): void {
		const database = this.getDatabase();
		const databaseKey = this.getBorderDatabaseKey(picker);

		if (!(databaseKey in database.gameScriptedBoxes![this.userId])) {
			database.gameScriptedBoxes![this.userId][databaseKey] = {};
		}
		database.gameScriptedBoxes![this.userId][databaseKey]!.type = type;

		this.send();
	}

	setGameFormat(format: IGameFormat): void {
		if (this.gameFormat === format.inputTarget) return;

		const database = this.getDatabase();
		database.gameScriptedBoxes![this.userId].previewFormat = format.inputTarget;

		this.gameFormat = format.inputTarget;

		this.send();
	}

	render(): string {
		let name = this.userId;
		const user = Users.get(this.userId);
		if (user) name = user.name;

		let html = "<div class='chat' style='margin-top: 4px;margin-left: 4px'><center><b>" + this.room.title + ": Game Scripted Box</b>";
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + closeCommand, "Close");

		const format = Games.getExistingFormat(this.gameFormat);
		let mascot: IPokemon | undefined;
		if (format.mascot) {
			mascot = Dex.getExistingPokemon(format.mascot);
		} else if (format.mascots) {
			mascot = Dex.getExistingPokemon(Tools.sampleOne(format.mascots));
		}

		const database = Storage.getDatabase(this.room);
		let scriptedBox: IGameScriptedBox | undefined;
		if (database.gameScriptedBoxes && this.userId in database.gameScriptedBoxes) {
			scriptedBox = database.gameScriptedBoxes[this.userId];
		}

		const signups = this.currentView === 'signups';
		const game = this.currentView === 'game';

		let viewButtons = "<b>Current view</b><br />";
		viewButtons += this.getQuietPmButton(this.commandPrefix + ", " + chooseSignupsView, "Signups view", signups);
		viewButtons += "&nbsp;|&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseGameView, "Game view", game);

		html += "<br />";

		if (signups) {
			html += Games.getScriptedBoxHtml(this.room, format.name, name, format.description, mascot);
			html += "</center><br />";

			html += Games.getSignupsPlayersHtml(scriptedBox, (mascot ? Dex.getPokemonIcon(mascot) : '') + "<b>" +
				format.nameWithOptions + " - signups</b>", 1, "<username>" + this.userName + "</username>");
			html += "<br />";
			html += "<center><button class='button' style='" + Games.getCustomBoxButtonStyle(scriptedBox, 'signups') + "'>Join the <b>" +
				format.nameWithOptions + "</b> game</button></center>";
			html += "<br />";

			html += viewButtons;
			html += "<br /><br />";

			html += "<b>Game preview</b><br />";
			html += "Choose a game to preview by PMing " + Users.self.name + " <code>" + Config.commandCharacter +
				setGameFormatSeparateCommand + " " + this.room.title + ", [format]</code>";
			html += "<br /><br />";

			const background = this.currentPicker === 'background';
			const buttons = this.currentPicker === 'buttons';
			const signupsBackground = this.currentPicker === 'signups-background';
			const signupsButtons = this.currentPicker === 'signups-buttons';
			const pokemon = this.currentPicker === 'pokemon';
			const backgroundBorder = this.currentPicker === 'background-border';
			const buttonsBorder = this.currentPicker === 'buttons-border';
			const signupsBackgroundBorder = this.currentPicker === 'signups-background-border';
			const signupsButtonsBorder = this.currentPicker === 'signups-buttons-border';

			html += this.getQuietPmButton(this.commandPrefix + ", " + choosePokemonPicker, "Pokemon",
				pokemon);
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseBackgroundColorPicker, "Background",
				background);
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseBackgroundBorderPicker, "Background border",
				backgroundBorder);
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseButtonColorPicker, "Buttons",
				buttons);
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseButtonsBorderPicker, "Buttons border",
				buttonsBorder);

			html += "<br />";
			html += this.getQuietPmButton(this.commandPrefix + ", " + chooseSignupsBackgroundColorPicker,
				"Signups background", signupsBackground);
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseSignupsBackgroundBorderPicker,
				"Signups background border", signupsBackgroundBorder);
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseSignupsButtonColorPicker,
				"Signups buttons", signupsButtons);
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseSignupsButtonsBorderPicker,
				"Signups buttons border", signupsButtonsBorder);

			html += "<br /><br />";

			if (background) {
				html += "<b>Background color</b><br />";
				html += this.backgroundColorPicker.render();
				html += "<br /><br />";
			} else if (buttons) {
				html += "<b>Buttons background color</b><br />";
				html += this.buttonColorPicker.render();
			} else if (signupsBackground) {
				html += "<b>Signups background color</b><br />";
				html += this.signupsBackgroundColorPicker.render();
			} else if (signupsButtons) {
				html += "<b>Signups buttons background color</b><br />";
				html += this.signupsButtonColorPicker.render();
			} else if (pokemon) {
				html += "<b>Pokemon icon</b><br />";
				html += this.pokemonPicker.render();
			} else if (backgroundBorder) {
				html += "<b>Background border</b><br />";
				html += this.backgroundBorderStyle.render();
			} else if (buttonsBorder) {
				html += "<b>Buttons border</b><br />";
				html += this.buttonsBorderStyle.render();
			} else if (signupsBackgroundBorder) {
				html += "<b>Signups background border</b><br />";
				html += this.signupsBackgroundBorderStyle.render();
			} else {
				html += "<b>Signups buttons border</b><br />";
				html += this.signupsButtonsBorderStyle.render();
			}
		} else {
			html += "</center><br />";

			const buttonStyle = Games.getCustomBoxButtonStyle(scriptedBox, 'game');
			html += Games.getGameCustomBoxDiv("<center><h3>Round Choices</h3><button class='button' style='" +
				buttonStyle + "'>Choice 1</button>&nbsp;|&nbsp;<button class='button' style='" + buttonStyle + "'>Choice 2</button>" +
				"&nbsp;|&nbsp;<button class='button' style='" + buttonStyle + "'>Choice 3</button></center>", scriptedBox);
			html += "<br /><br />";
			html += Games.getGameCustomBoxDiv("<h3>Round Actions</h3>" +
				"<button class='button' style='" + buttonStyle + "'>Action</button>&nbsp;|&nbsp;" +
				"<button class='button' style='" + buttonStyle + "'>Other action</button>", scriptedBox);

			html += "<br /><br />";
			html += viewButtons;
			html += "<br /><br />";

			const gameBackground = this.currentPicker === 'game-background';
			const gameButtons = this.currentPicker === 'game-buttons';
			const gameBackgroundBorder = this.currentPicker === 'game-background-border';
			const gameButtonsBorder = this.currentPicker === 'game-buttons-border';

			html += this.getQuietPmButton(this.commandPrefix + ", " + chooseGameBackgroundColorPicker,
				"Background", gameBackground);
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseGameButtonColorPicker,
				"Buttons", gameButtons);
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseGameBackgroundBorderPicker,
				"Background border", gameBackgroundBorder);
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseGameButtonsBorderPicker,
				"Buttons border", gameButtonsBorder);

			html += "<br /><br />";

			if (gameBackground) {
				html += "<b>Game background color</b><br />";
				html += this.gameBackgroundColorPicker.render();
			} else if (gameButtons) {
				html += "<b>Game buttons background color</b><br />";
				html += this.gameButtonColorPicker.render();
			} else if (gameBackgroundBorder) {
				html += "<b>Game background border</b><br />";
				html += this.gameBackgroundBorderStyle.render();
			} else {
				html += "<b>Game buttons border</b><br />";
				html += this.gameButtonsBorderStyle.render();
			}
		}

		html += "</div>";
		return html;
	}
}

export const commands: BaseCommandDefinitions = {
	[baseCommand]: {
		command(target, room, user) {
			if (!this.isPm(room)) return;
			const targets = target.split(",");
			const targetRoom = Rooms.search(targets[0]);
			if (!targetRoom) return this.sayError(['invalidBotRoom', targets[0]]);
			targets.shift();

			if (!Config.gameScriptedBoxRequirements || !(targetRoom.id in Config.gameScriptedBoxRequirements)) {
				return this.say("Game scripted boxes are not enabled for " + targetRoom.title + ".");
			}

			const checkBits = !user.hasRank(targetRoom, 'voice');
			const database = Storage.getDatabase(targetRoom);
			const annualBits = Storage.getAnnualPoints(targetRoom, Storage.gameLeaderboard, user.name);
			if (checkBits && Config.gameScriptedBoxRequirements[targetRoom.id] > 0) {
				if (annualBits < Config.gameScriptedBoxRequirements[targetRoom.id]) {
					return this.say("You need to earn at least " + Config.gameScriptedBoxRequirements[targetRoom.id] + " annual " +
						"bits before you can use this command.");
				}
			}

			if (!database.gameScriptedBoxes) database.gameScriptedBoxes = {};

			const cmd = Tools.toId(targets[0]);
			targets.shift();

			if (!cmd) {
				new GameScriptedBox(targetRoom, user).open();
			} else if (cmd === setGameFormatCommand || cmd === 'setgame') {
				const format = Games.getFormat(targets.join(','));
				if (Array.isArray(format)) return this.sayError(format);

				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].setGameFormat(format);
			} else if (cmd === chooseSignupsView) {
				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].chooseSignupsView();
			} else if (cmd === chooseGameView) {
				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].chooseGameView();
			} else if (cmd === chooseBackgroundColorPicker) {
				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].chooseBackgroundColorPicker();
			} else if (cmd === chooseButtonColorPicker) {
				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].chooseButtonColorPicker();
			} else if (cmd === chooseSignupsBackgroundColorPicker) {
				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].chooseSignupsBackgroundColorPicker();
			} else if (cmd === chooseSignupsButtonColorPicker) {
				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].chooseSignupsButtonColorPicker();
			} else if (cmd === chooseGameBackgroundColorPicker) {
				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].chooseGameBackgroundColorPicker();
			} else if (cmd === chooseGameButtonColorPicker) {
				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].chooseGameButtonColorPicker();
			} else if (cmd === choosePokemonPicker) {
				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].choosePokemonPicker();
			} else if (cmd === chooseBackgroundBorderPicker) {
				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].chooseBackgroundBorderPicker();
			} else if (cmd === chooseButtonsBorderPicker) {
				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].chooseButtonsBorderPicker();
			} else if (cmd === chooseSignupsBackgroundBorderPicker) {
				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].chooseSignupsBackgroundBorderPicker();
			} else if (cmd === chooseSignupsButtonsBorderPicker) {
				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].chooseSignupsButtonsBorderPicker();
			} else if (cmd === chooseGameBackgroundBorderPicker) {
				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].chooseGameBackgroundBorderPicker();
			} else if (cmd === chooseGameButtonsBorderPicker) {
				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].chooseGameButtonsBorderPicker();
			} else if (cmd === closeCommand) {
				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				pages[user.id].close();
				delete pages[user.id];
			} else {
				if (!(user.id in pages)) new GameScriptedBox(targetRoom, user);
				const error = pages[user.id].checkComponentCommands(cmd, targets);
				if (error) this.say(error);
			}
		},
		aliases: ['gsb'],
	},
	[setGameFormatSeparateCommand]: {
		command(target) {
			const targets = target.split(',');
			this.run(baseCommand, targets[0] + "," + setGameFormatCommand + "," + targets.slice(1).join(","));
		},
	},
};
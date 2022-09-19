import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { ModelGeneration } from "../types/dex";
import type { IPokemon } from "../types/pokemon-showdown";
import type { IDatabase, IGameScriptedBox } from "../types/storage";
import type { BorderType } from "../types/tools";
import type { User } from "../users";
import { BorderStyle } from "./components/border-style";
import type { IColorPick } from "./components/color-picker";
import { ColorPicker } from "./components/color-picker";
import { GameTextInput } from "./components/game-text-input";
import { PokemonPickerBase } from "./components/pokemon-picker-base";
import { PokemonTextInput } from "./components/pokemon-text-input";
import type { PokemonChoices } from "./game-host-control-panel";
import { CLOSE_COMMAND, HtmlPageBase } from "./html-page-base";

type BorderPickers = 'background' | 'buttons' | 'signups-background' | 'signups-buttons' | 'game-background' | 'game-buttons';
type BorderDatabaseKeys = 'backgroundBorder' | 'buttonsBorder' | 'signupsBackgroundBorder' | 'signupsButtonsBorder' |
	'gameBackgroundBorder' | 'gameButtonsBorder';

const baseCommand = 'gamescriptedbox';
const loadFormatCommand = 'loadformatbox';
const copyFormatCommand = 'copyformatbox';
const deleteFormatCommand = 'deleteformatbox';
const setGameFormatCommand = 'setgameformat';
const setGameFormatSeparateCommand = 'gsbformat';
const setGamePokemonAvatarCommand = 'setgamepokemonavatar';
const setMascotGenerationCommand = 'setmascotgeneration';
const clearMascotGenerationCommand = 'clearmascotgeneration';
const chooseSignupsView = 'choosesignupsview';
const chooseGameView = 'choosegameview';
const chooseBackgroundColorPicker = 'choosebackgroundcolorpicker';
const chooseButtonColorPicker = 'choosebuttoncolorpicker';
const chooseSignupsBackgroundColorPicker = 'choosesignupsbackgroundcolorpicker';
const chooseSignupsButtonColorPicker = 'choosesignupsbuttoncolorpicker';
const choosePokemonAvatarPicker = 'choosepokemonavatarpicker';
const chooseGameBackgroundColorPicker = 'choosegamebackgroundcolorpicker';
const chooseGameButtonColorPicker = 'choosegamebuttoncolorpicker';
const chooseMascotGenerationPicker = 'choosemascotgenerationpicker';
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

export const pageId = 'game-scripted-box';
export const pages: Dict<GameScriptedBox> = {};

class GameScriptedBox extends HtmlPageBase {
	pageId = pageId;

	activeGameFormat;
	gameFormat;
	lastUsedGameFormat;
	lastCopiedGameFormat;
	pokemonAvatar: boolean;

	gameTextInput!: GameTextInput;
	backgroundColorPicker!: ColorPicker;
	buttonColorPicker!: ColorPicker;
	signupsBackgroundColorPicker!: ColorPicker;
	signupsButtonColorPicker!: ColorPicker;
	gameBackgroundColorPicker!: ColorPicker;
	gameButtonColorPicker!: ColorPicker;
	backgroundBorderStyle!: BorderStyle;
	buttonsBorderStyle!: BorderStyle;
	signupsBackgroundBorderStyle!: BorderStyle;
	signupsButtonsBorderStyle!: BorderStyle;
	gameBackgroundBorderStyle!: BorderStyle;
	gameButtonsBorderStyle!: BorderStyle;
	pokemonAvatarPicker!: PokemonTextInput;
	currentPicker: 'background' | 'buttons' | 'signups-background' | 'signups-buttons' | 'game-background' | 'game-buttons' |
		'background-border' | 'buttons-border' | 'signups-background-border' | 'signups-buttons-border' |
		'mascot-generation' | 'pokemon-avatar' | 'game-background-border' | 'game-buttons-border';
	currentView: 'signups' | 'game' = 'signups';

	constructor(room: Room, user: User, pokemonAvatar: boolean) {
		super(room, user, baseCommand, pages);

		this.pokemonAvatar = pokemonAvatar;
		this.currentPicker = pokemonAvatar ? 'pokemon-avatar' : 'background';
		this.setCloseButton();

		const database = this.getDatabase();

		let previewFormat = "";
		if (database.gameScriptedBoxes![this.userId].previewFormat) {
			const format = Games.getFormat(database.gameScriptedBoxes![this.userId].previewFormat!);
			if (!Array.isArray(format) && format.id in database.gameFormatScriptedBoxes![this.userId]) previewFormat = format.id;
		}

		this.activeGameFormat = previewFormat;
		this.gameFormat = previewFormat;
		this.lastUsedGameFormat = previewFormat;
		this.lastCopiedGameFormat = previewFormat;

		this.gameTextInput = new GameTextInput(this, this.commandPrefix, setGameFormatCommand, {
			currentInput: previewFormat ? Games.getExistingFormat(previewFormat).name : "",
			allowModes: false,
			allowVariants: false,
			onClear: () => this.clearFormat(),
			onErrors: () => this.send(),
			onSubmit: (output) => this.setFormat(output),
			reRender: () => this.send(),
		});

		this.resetComponents();
	}

	resetComponents(): void {
		const database = this.getDatabase();
		const gameScriptedBox = this.getScriptedBox();
		const currentGamePokemonAvatar = database.gameScriptedBoxes![this.userId].pokemonAvatar;

		this.backgroundColorPicker = new ColorPicker(this, this.commandPrefix, setBackgroundColorCommand, {
			currentPick: typeof gameScriptedBox.background === 'string' ? gameScriptedBox.background : undefined,
			currentPickObject: gameScriptedBox.background && typeof gameScriptedBox.background !== 'string' ?
				gameScriptedBox.background : undefined,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickBackgroundHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickBackgroundLightness(dontRender),
			onClear: (index, dontRender) => this.clearBackgroundColor(dontRender),
			onPick: (index, color, dontRender) => this.setBackgroundColor(color, dontRender),
			reRender: () => this.send(),
		});

		this.buttonColorPicker = new ColorPicker(this, this.commandPrefix, setButtonColorCommand, {
			currentPick: typeof gameScriptedBox.buttons === 'string' ? gameScriptedBox.buttons : undefined,
			currentPickObject: gameScriptedBox.buttons && typeof gameScriptedBox.buttons !== 'string' ?
				gameScriptedBox.buttons : undefined,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickButtonHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickButtonLightness(dontRender),
			onClear: (index, dontRender) => this.clearButtonsColor(dontRender),
			onPick: (index, color, dontRender) => this.setButtonsColor(color, dontRender),
			reRender: () => this.send(),
		});

		this.signupsBackgroundColorPicker = new ColorPicker(this, this.commandPrefix, setSignupsBackgroundColorCommand, {
			currentPick: typeof gameScriptedBox.signupsBackground === 'string' ? gameScriptedBox.signupsBackground : undefined,
			currentPickObject: gameScriptedBox.signupsBackground && typeof gameScriptedBox.signupsBackground !== 'string' ?
				gameScriptedBox.signupsBackground : undefined,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickBackgroundHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickBackgroundLightness(dontRender),
			onClear: (index, dontRender) => this.clearSignupsBackgroundColor(dontRender),
			onPick: (index, color, dontRender) => this.setSignupsBackgroundColor(color, dontRender),
			reRender: () => this.send(),
		});

		this.signupsButtonColorPicker = new ColorPicker(this, this.commandPrefix, setSignupsButtonColorCommand, {
			currentPick: typeof gameScriptedBox.signupsButtons === 'string' ? gameScriptedBox.signupsButtons : undefined,
			currentPickObject: gameScriptedBox.signupsButtons && typeof gameScriptedBox.signupsButtons !== 'string' ?
				gameScriptedBox.signupsButtons : undefined,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickButtonHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickButtonLightness(dontRender),
			onClear: (index, dontRender) => this.clearSignupsButtonsColor(dontRender),
			onPick: (index, color, dontRender) => this.setSignupsButtonsColor(color, dontRender),
			reRender: () => this.send(),
		});

		this.gameBackgroundColorPicker = new ColorPicker(this, this.commandPrefix, setGameBackgroundColorCommand, {
			currentPick: typeof gameScriptedBox.gameBackground === 'string' ? gameScriptedBox.gameBackground : undefined,
			currentPickObject: gameScriptedBox.gameBackground && typeof gameScriptedBox.gameBackground !== 'string' ?
				gameScriptedBox.gameBackground : undefined,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickBackgroundHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickBackgroundLightness(dontRender),
			onClear: (index, dontRender) => this.clearGameBackgroundColor(dontRender),
			onPick: (index, color, dontRender) => this.setGameBackgroundColor(color, dontRender),
			reRender: () => this.send(),
		});

		this.gameButtonColorPicker = new ColorPicker(this, this.commandPrefix, setGameButtonColorCommand, {
			currentPick: typeof gameScriptedBox.gameButtons === 'string' ? gameScriptedBox.gameButtons : undefined,
			currentPickObject: gameScriptedBox.gameButtons && typeof gameScriptedBox.gameButtons !== 'string' ?
				gameScriptedBox.gameButtons : undefined,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickButtonHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickButtonLightness(dontRender),
			onClear: (index, dontRender) => this.clearGameButtonsColor(dontRender),
			onPick: (index, color, dontRender) => this.setGameButtonsColor(color, dontRender),
			reRender: () => this.send(),
		});

		PokemonPickerBase.loadData();

		this.pokemonAvatarPicker = new PokemonTextInput(this, this.commandPrefix, setGamePokemonAvatarCommand, {
			gif: false,
			currentInput: currentGamePokemonAvatar ? currentGamePokemonAvatar : "",
			pokemonList: PokemonPickerBase.pokemonGens[Dex.getModelGenerations().slice().pop()!],
			inputWidth: Tools.minRoomWidth,
			minPokemon: 1,
			maxPokemon: 1,
			placeholder: "Enter a Pokemon",
			clearText: "Clear",
			submitText: "Update",
			onClear: () => this.clearGamePokemonAvatar(),
			onErrors: () => this.send(),
			onSubmit: (output) => this.selectGamePokemonAvatar(output),
			reRender: () => this.send(),
		});

		this.backgroundBorderStyle = new BorderStyle(this, this.commandPrefix, setBackgroudBorderStyleCommand, {
			currentBorder: gameScriptedBox.backgroundBorder,
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

		this.buttonsBorderStyle = new BorderStyle(this, this.commandPrefix, setButtonBorderStyleCommand, {
			currentBorder: gameScriptedBox.buttonsBorder,
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

		this.signupsBackgroundBorderStyle = new BorderStyle(this, this.commandPrefix, setSignupsBackgroudBorderStyleCommand, {
			currentBorder: gameScriptedBox.signupsBackgroundBorder,
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

		this.signupsButtonsBorderStyle = new BorderStyle(this, this.commandPrefix, setSignupsButtonBorderStyleCommand, {
			currentBorder: gameScriptedBox.signupsButtonsBorder,
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

		this.gameBackgroundBorderStyle = new BorderStyle(this, this.commandPrefix, setGameBackgroudBorderStyleCommand, {
			currentBorder: gameScriptedBox.gameBackgroundBorder,
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

		this.gameButtonsBorderStyle = new BorderStyle(this, this.commandPrefix, setGameButtonBorderStyleCommand, {
			currentBorder: gameScriptedBox.gameButtonsBorder,
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

		this.components = [this.gameTextInput, this.backgroundColorPicker, this.buttonColorPicker, this.signupsBackgroundColorPicker,
			this.signupsButtonColorPicker, this.gameBackgroundColorPicker, this.gameButtonColorPicker,
			this.backgroundBorderStyle, this.buttonsBorderStyle, this.signupsBackgroundBorderStyle, this.signupsButtonsBorderStyle,
			this.pokemonAvatarPicker, this.gameBackgroundBorderStyle, this.gameButtonsBorderStyle];

		this.lastUsedGameFormat = this.activeGameFormat;
	}

	getDatabase(): IDatabase {
		const database = Storage.getDatabase(this.room);
		Storage.createGameScriptedBox(database, this.userId);

		return database;
	}

	toggleActivePicker(): void {
		const signups = this.currentView === 'signups';
		const game = this.currentView === 'game';

		this.pokemonAvatarPicker.active = this.currentPicker === 'pokemon-avatar';

		this.backgroundColorPicker.active = signups && this.currentPicker === 'background';
		this.buttonColorPicker.active = signups && this.currentPicker === 'buttons';
		this.signupsBackgroundColorPicker.active = signups && this.currentPicker === 'signups-background';
		this.signupsButtonColorPicker.active = signups && this.currentPicker === 'signups-buttons';
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
		this.currentPicker = this.pokemonAvatar ? 'pokemon-avatar' : 'background';
		this.toggleActivePicker();

		this.send();
	}

	chooseGameView(): void {
		if (this.currentView === 'game') return;

		this.currentView = 'game';
		this.currentPicker = this.pokemonAvatar ? 'pokemon-avatar' : 'game-background';
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

	chooseGamePokemonAvatarPicker(): void {
		if (!this.pokemonAvatar || this.currentPicker === 'pokemon-avatar') return;

		this.currentPicker = 'pokemon-avatar';
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

	chooseMascotGenerationPicker(): void {
		if (this.currentPicker === 'mascot-generation') return;

		this.currentPicker = 'mascot-generation';
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

	clearFormat(): void {
		if (!this.gameFormat) return;

		this.gameFormat = "";
		this.activeGameFormat = "";
		this.lastCopiedGameFormat = "";

		this.resetComponents();
		this.send();
	}

	setFormat(input: string): void {
		const name = input.split(',')[0];
		const formatId = Tools.toId(name);
		if (this.gameFormat === formatId) return;

		this.gameFormat = formatId;
		this.gameTextInput.parentSetInput(name);

		this.send();
	}

	loadFormat(): void {
		if (!this.gameFormat) return;

		const database = this.getDatabase();
		database.gameScriptedBoxes![this.userId].previewFormat = this.gameFormat;
		if (!(this.gameFormat in database.gameFormatScriptedBoxes![this.userId])) {
			database.gameFormatScriptedBoxes![this.userId][this.gameFormat] = {};
		}

		this.activeGameFormat = this.gameFormat;
		this.lastCopiedGameFormat = this.gameFormat;
		this.resetComponents();

		this.send();
	}

	copyFormat(): void {
		if (this.gameFormat === this.activeGameFormat) return;

		const database = this.getDatabase();
		database.gameScriptedBoxes![this.userId].previewFormat = this.gameFormat;

		const copiedFormat = Tools.deepClone(this.getScriptedBox(this.lastUsedGameFormat));
		delete copiedFormat.pokemonAvatar;
		delete copiedFormat.previewFormat;
		database.gameFormatScriptedBoxes![this.userId][this.gameFormat] = copiedFormat;

		this.activeGameFormat = this.gameFormat;
		this.lastCopiedGameFormat = this.gameFormat;
		this.resetComponents();

		this.send();
	}

	deleteFormat(): void {
		const database = this.getDatabase();
		delete database.gameFormatScriptedBoxes![this.userId][this.gameFormat];

		if (this.gameFormat === database.gameScriptedBoxes![this.userId].previewFormat) {
			delete database.gameScriptedBoxes![this.userId].previewFormat;
		}

		this.resetComponents();
		this.send();
	}

	pickBackgroundHueVariation(dontRender?: boolean): void {
		if (!dontRender) this.send();
	}

	pickBackgroundLightness(dontRender?: boolean): void {
		if (!dontRender) this.send();
	}

	getScriptedBox(format?: string): IGameScriptedBox {
		if (!format) format = this.activeGameFormat;

		const database = this.getDatabase();
		if (format) {
			if (!(format in database.gameFormatScriptedBoxes![this.userId])) {
				database.gameFormatScriptedBoxes![this.userId][format] = {};
			}

			return database.gameFormatScriptedBoxes![this.userId][format];
		}

		return database.gameScriptedBoxes![this.userId];
	}

	clearBackgroundColor(dontRender?: boolean): void {
		const scriptedBox = this.getScriptedBox();
		delete scriptedBox.background;

		if (!dontRender) this.send();
	}

	setBackgroundColor(color: IColorPick, dontRender?: boolean): void {
		const scriptedBox = this.getScriptedBox();
		scriptedBox.background = Tools.colorPickToStorage(color);

		if (!dontRender) this.send();
	}

	clearSignupsBackgroundColor(dontRender?: boolean): void {
		const scriptedBox = this.getScriptedBox();
		delete scriptedBox.signupsBackground;

		if (!dontRender) this.send();
	}

	setSignupsBackgroundColor(color: IColorPick, dontRender?: boolean): void {
		const scriptedBox = this.getScriptedBox();
		scriptedBox.signupsBackground = Tools.colorPickToStorage(color);

		if (!dontRender) this.send();
	}

	clearGameBackgroundColor(dontRender?: boolean): void {
		const scriptedBox = this.getScriptedBox();
		delete scriptedBox.gameBackground;

		if (!dontRender) this.send();
	}

	setGameBackgroundColor(color: IColorPick, dontRender?: boolean): void {
		const scriptedBox = this.getScriptedBox();
		scriptedBox.gameBackground = Tools.colorPickToStorage(color);

		if (!dontRender) this.send();
	}

	pickButtonHueVariation(dontRender?: boolean): void {
		if (!dontRender) this.send();
	}

	pickButtonLightness(dontRender?: boolean): void {
		if (!dontRender) this.send();
	}

	clearButtonsColor(dontRender?: boolean): void {
		const scriptedBox = this.getScriptedBox();
		delete scriptedBox.buttons;

		if (!dontRender) this.send();
	}

	setButtonsColor(color: IColorPick, dontRender?: boolean): void {
		const scriptedBox = this.getScriptedBox();
		scriptedBox.buttons = Tools.colorPickToStorage(color);

		if (!dontRender) this.send();
	}

	clearSignupsButtonsColor(dontRender?: boolean): void {
		const scriptedBox = this.getScriptedBox();
		delete scriptedBox.signupsButtons;

		if (!dontRender) this.send();
	}

	setSignupsButtonsColor(color: IColorPick, dontRender?: boolean): void {
		const scriptedBox = this.getScriptedBox();
		scriptedBox.signupsButtons = Tools.colorPickToStorage(color);

		if (!dontRender) this.send();
	}

	clearGameButtonsColor(dontRender?: boolean): void {
		const scriptedBox = this.getScriptedBox();
		delete scriptedBox.gameButtons;

		if (!dontRender) this.send();
	}

	setGameButtonsColor(color: IColorPick, dontRender?: boolean): void {
		const scriptedBox = this.getScriptedBox();
		scriptedBox.gameButtons = Tools.colorPickToStorage(color);

		if (!dontRender) this.send();
	}

	clearGamePokemonAvatar(): void {
		const database = this.getDatabase();

		delete database.gameScriptedBoxes![this.userId].pokemonAvatar;

		this.send();
	}

	selectGamePokemonAvatar(pokemon: PokemonChoices): void {
		const database = this.getDatabase();

		database.gameScriptedBoxes![this.userId].pokemonAvatar = pokemon[0]!.pokemon;

		this.send();
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
		const scriptedBox = this.getScriptedBox();
		const databaseKey = this.getBorderDatabaseKey(picker);

		if (databaseKey in scriptedBox) {
			delete scriptedBox[databaseKey]!.color;
		}

		if (!dontRender) this.send();
	}

	setBorderColor(picker: BorderPickers, color: IColorPick, dontRender?: boolean): void {
		const scriptedBox = this.getScriptedBox();
		const databaseKey = this.getBorderDatabaseKey(picker);

		if (!(databaseKey in scriptedBox)) {
			scriptedBox[databaseKey] = {};
		}
		scriptedBox[databaseKey]!.color = Tools.colorPickToStorage(color);

		if (!dontRender) this.send();
	}

	clearBorderRadius(picker: BorderPickers): void {
		const scriptedBox = this.getScriptedBox();
		const databaseKey = this.getBorderDatabaseKey(picker);

		if (databaseKey in scriptedBox) {
			delete scriptedBox[databaseKey]!.radius;
		}

		this.send();
	}

	setBorderRadius(picker: BorderPickers, radius: number): void {
		const scriptedBox = this.getScriptedBox();
		const databaseKey = this.getBorderDatabaseKey(picker);

		if (!(databaseKey in scriptedBox)) {
			scriptedBox[databaseKey] = {};
		}
		scriptedBox[databaseKey]!.radius = radius;

		this.send();
	}

	clearBorderSize(picker: BorderPickers): void {
		const scriptedBox = this.getScriptedBox();
		const databaseKey = this.getBorderDatabaseKey(picker);

		if (databaseKey in scriptedBox) {
			delete scriptedBox[databaseKey]!.size;
		}

		this.send();
	}

	setBorderSize(picker: BorderPickers, size: number): void {
		const scriptedBox = this.getScriptedBox();
		const databaseKey = this.getBorderDatabaseKey(picker);

		if (!(databaseKey in scriptedBox)) {
			scriptedBox[databaseKey] = {};
		}
		scriptedBox[databaseKey]!.size = size;

		this.send();
	}

	clearBorderType(picker: BorderPickers): void {
		const scriptedBox = this.getScriptedBox();
		const databaseKey = this.getBorderDatabaseKey(picker);

		if (databaseKey in scriptedBox) {
			delete scriptedBox[databaseKey]!.type;
		}

		this.send();
	}

	setBorderType(picker: BorderPickers, type: BorderType): void {
		const scriptedBox = this.getScriptedBox();
		const databaseKey = this.getBorderDatabaseKey(picker);

		if (!(databaseKey in scriptedBox)) {
			scriptedBox[databaseKey] = {};
		}
		scriptedBox[databaseKey]!.type = type;

		this.send();
	}

	clearMascotGeneration(): void {
		const database = this.getDatabase();

		delete database.gameScriptedBoxes![this.userId].mascotGeneration;

		this.send();
	}

	setMascotGeneration(generation: ModelGeneration): void {
		const database = this.getDatabase();

		database.gameScriptedBoxes![this.userId].mascotGeneration = generation;

		this.send();
	}

	render(): string {
		let name = this.userId;
		const user = Users.get(this.userId);
		if (user) name = user.name;

		let html = "<div class='chat' style='margin-top: 4px;margin-left: 4px'><center><b>" + this.room.title + ": Game Scripted Box</b>";
		html += "&nbsp;" + this.closeButtonHtml;

		const format = Games.getExistingFormat(this.activeGameFormat || "pmp");
		let mascot: IPokemon | undefined;
		if (format.mascot) {
			mascot = Dex.getExistingPokemon(format.mascot);
		} else if (format.mascots) {
			mascot = Dex.getExistingPokemon(Tools.sampleOne(format.mascots));
		}

		const database = this.getDatabase();
		const scriptedBox = this.getScriptedBox();

		const signups = this.currentView === 'signups';
		const game = this.currentView === 'game';

		const formatBoxExists = this.gameFormat in database.gameFormatScriptedBoxes![this.userId];

		let formatView = "<b>Change games</b>";
		formatView += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + deleteFormatCommand, "Delete",
			{disabled: !formatBoxExists});
		formatView += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + loadFormatCommand, "Load",
			{disabled: !formatBoxExists || this.gameFormat === this.activeGameFormat});
		formatView += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + copyFormatCommand, "Copy current",
			{disabled: !this.gameFormat || this.gameFormat === this.lastCopiedGameFormat ? true : false}) + "<br />";
		formatView += this.gameTextInput.render();

		let viewButtons = "<b>Current view</b><br />";
		viewButtons += this.getQuietPmButton(this.commandPrefix + ", " + chooseSignupsView, "Signups view",
			{selectedAndDisabled: signups});
		viewButtons += "&nbsp;|&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseGameView, "Game view",
			{selectedAndDisabled: game});

		html += "<br />";

		if (signups) {
			html += Games.getScriptedBoxHtml(this.room, format.nameWithOptions, format.id, name, format.description, mascot);
			html += "</center><br />";

			const selectedPokemonAvatar = database.gameScriptedBoxes![this.userId].pokemonAvatar;
			html += Games.getSignupsPlayersHtml(scriptedBox, (mascot ? Dex.getPokemonIcon(mascot) : '') + "<b>" +
				format.nameWithOptions + " - signups</b>", 1, (selectedPokemonAvatar ?
					Dex.getPokemonIcon(Dex.getExistingPokemon(selectedPokemonAvatar)) : "") +
					"<username>" + this.userName + "</username>", selectedPokemonAvatar ? true : false);
			html += "<br />";
			html += "<center><button class='button' style='" + Games.getCustomBoxButtonStyle(scriptedBox, 'signups') + "'>Join the <b>" +
				format.nameWithOptions + "</b> game</button></center>";
			html += "<br />";

			html += formatView;
			html += "<br />";
			html += viewButtons;
			html += "<br /><br />";

			const background = this.currentPicker === 'background';
			const buttons = this.currentPicker === 'buttons';
			const signupsBackground = this.currentPicker === 'signups-background';
			const signupsButtons = this.currentPicker === 'signups-buttons';
			const pokemonAvatar = this.currentPicker === 'pokemon-avatar';
			const mascotGeneration = this.currentPicker === 'mascot-generation';
			const backgroundBorder = this.currentPicker === 'background-border';
			const buttonsBorder = this.currentPicker === 'buttons-border';
			const signupsBackgroundBorder = this.currentPicker === 'signups-background-border';
			const signupsButtonsBorder = this.currentPicker === 'signups-buttons-border';

			if (this.pokemonAvatar) {
				html += this.getQuietPmButton(this.commandPrefix + ", " + choosePokemonAvatarPicker, "Pokemon avatar",
					{selectedAndDisabled: pokemonAvatar}) + "&nbsp;";
			}

			html += this.getQuietPmButton(this.commandPrefix + ", " + chooseMascotGenerationPicker, "Mascot generation",
				{selectedAndDisabled: mascotGeneration});
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseBackgroundColorPicker, "Background",
				{selectedAndDisabled: background});
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseBackgroundBorderPicker, "Background border",
				{selectedAndDisabled: backgroundBorder});
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseButtonColorPicker, "Buttons",
				{selectedAndDisabled: buttons});
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseButtonsBorderPicker, "Buttons border",
				{selectedAndDisabled: buttonsBorder});

			html += "<br />";
			html += this.getQuietPmButton(this.commandPrefix + ", " + chooseSignupsBackgroundColorPicker,
				"Signups background", {selectedAndDisabled: signupsBackground});
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseSignupsBackgroundBorderPicker,
				"Signups background border", {selectedAndDisabled: signupsBackgroundBorder});
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseSignupsButtonColorPicker,
				"Signups buttons", {selectedAndDisabled: signupsButtons});
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseSignupsButtonsBorderPicker,
				"Signups buttons border", {selectedAndDisabled: signupsButtonsBorder});

			html += "<br /><br />";

			if (mascotGeneration) {
				html += "<b>Mascot generation</b><br />";
				html += this.getQuietPmButton(this.commandPrefix + ", " + clearMascotGenerationCommand, "Default",
					{selectedAndDisabled: !database.gameScriptedBoxes![this.userId].mascotGeneration});

				const generations = Dex.getModelGenerations();
				for (const gen of generations) {
					html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + setMascotGenerationCommand + ", " + gen,
						gen.toUpperCase(), {selectedAndDisabled: database.gameScriptedBoxes![this.userId].mascotGeneration === gen});
				}
			} else if (background) {
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
			} else if (pokemonAvatar) {
				html += "<b>Pokemon avatar</b><br />";
				html += this.pokemonAvatarPicker.render();
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
			if (this.pokemonAvatar) {
				const pokemonAvatar = database.gameScriptedBoxes![this.userId].pokemonAvatar;

				html += "<br /><br />";
				html += Games.getGameCustomBoxDiv((mascot ? Dex.getPokemonIcon(mascot) : "") + "<b>" + format.name + " - Round 1</b>" +
					"<br />&nbsp;", scriptedBox, "<b>Players (1)</b>: " + (pokemonAvatar ?
					Dex.getPokemonIcon(Dex.getExistingPokemon(pokemonAvatar)) : "") + "<username>" + this.userName +
					"</username>");
			}

			html += "<br /><br />";
			html += formatView;
			html += "<br />";
			html += viewButtons;
			html += "<br /><br />";

			const gamePokemonAvatar = this.currentPicker === 'pokemon-avatar';
			const gameBackground = this.currentPicker === 'game-background';
			const gameButtons = this.currentPicker === 'game-buttons';
			const gameBackgroundBorder = this.currentPicker === 'game-background-border';
			const gameButtonsBorder = this.currentPicker === 'game-buttons-border';

			if (this.pokemonAvatar) {
				html += this.getQuietPmButton(this.commandPrefix + ", " + choosePokemonAvatarPicker,
					"Pokemon avatar", {selectedAndDisabled: gamePokemonAvatar}) + "&nbsp;";
			}

			html += this.getQuietPmButton(this.commandPrefix + ", " + chooseGameBackgroundColorPicker,
				"Background", {selectedAndDisabled: gameBackground});
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseGameButtonColorPicker,
				"Buttons", {selectedAndDisabled: gameButtons});
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseGameBackgroundBorderPicker,
				"Background border", {selectedAndDisabled: gameBackgroundBorder});
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseGameButtonsBorderPicker,
				"Buttons border", {selectedAndDisabled: gameButtonsBorder});

			html += "<br /><br />";

			if (gamePokemonAvatar) {
				html += "<b>Pokemon avatar</b><br />";
				html += this.pokemonAvatarPicker.render();
			} else if (gameBackground) {
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
			if (checkBits && Config.gameScriptedBoxRequirements[targetRoom.id].background > 0) {
				if (annualBits < Config.gameScriptedBoxRequirements[targetRoom.id].background) {
					return this.say("You need to earn at least " + Config.gameScriptedBoxRequirements[targetRoom.id].background +
						" annual bits before you can use this command.");
				}
			}

			if (!database.gameScriptedBoxes) database.gameScriptedBoxes = {};

			const cmd = Tools.toId(targets[0]);
			targets.shift();

			let pokemonAvatar = checkBits ? false : true;
			if (checkBits && (!cmd || !(user.id in pages))) {
				if (Config.gameScriptedBoxRequirements[targetRoom.id].pokemonAvatar &&
					annualBits >= Config.gameScriptedBoxRequirements[targetRoom.id].pokemonAvatar) {
					pokemonAvatar = true;
				}
			}

			if (!cmd) {
				new GameScriptedBox(targetRoom, user, pokemonAvatar).open();
				return;
			}

			if (!(user.id in pages) && cmd !== CLOSE_COMMAND) new GameScriptedBox(targetRoom, user, pokemonAvatar);

			if (cmd === loadFormatCommand) {
				pages[user.id].loadFormat();
			} else if (cmd === copyFormatCommand) {
				pages[user.id].copyFormat();
			} else if (cmd === deleteFormatCommand) {
				pages[user.id].deleteFormat();
			} else if (cmd === chooseSignupsView) {
				pages[user.id].chooseSignupsView();
			} else if (cmd === chooseGameView) {
				pages[user.id].chooseGameView();
			} else if (cmd === chooseBackgroundColorPicker) {
				pages[user.id].chooseBackgroundColorPicker();
			} else if (cmd === chooseButtonColorPicker) {
				pages[user.id].chooseButtonColorPicker();
			} else if (cmd === chooseSignupsBackgroundColorPicker) {
				pages[user.id].chooseSignupsBackgroundColorPicker();
			} else if (cmd === chooseSignupsButtonColorPicker) {
				pages[user.id].chooseSignupsButtonColorPicker();
			} else if (cmd === choosePokemonAvatarPicker) {
				pages[user.id].chooseGamePokemonAvatarPicker();
			} else if (cmd === chooseGameBackgroundColorPicker) {
				pages[user.id].chooseGameBackgroundColorPicker();
			} else if (cmd === chooseGameButtonColorPicker) {
				pages[user.id].chooseGameButtonColorPicker();
			} else if (cmd === chooseMascotGenerationPicker) {
				pages[user.id].chooseMascotGenerationPicker();
			} else if (cmd === chooseBackgroundBorderPicker) {
				pages[user.id].chooseBackgroundBorderPicker();
			} else if (cmd === chooseButtonsBorderPicker) {
				pages[user.id].chooseButtonsBorderPicker();
			} else if (cmd === chooseSignupsBackgroundBorderPicker) {
				pages[user.id].chooseSignupsBackgroundBorderPicker();
			} else if (cmd === chooseSignupsButtonsBorderPicker) {
				pages[user.id].chooseSignupsButtonsBorderPicker();
			} else if (cmd === chooseGameBackgroundBorderPicker) {
				pages[user.id].chooseGameBackgroundBorderPicker();
			} else if (cmd === chooseGameButtonsBorderPicker) {
				pages[user.id].chooseGameButtonsBorderPicker();
			} else if (cmd === setMascotGenerationCommand) {
				const gen = targets[0].trim() as ModelGeneration;
				if (!Dex.getModelGenerations().includes(gen)) {
					return this.say("'" + targets[0] + "' is not a valid generation.");
				}

				pages[user.id].setMascotGeneration(gen);
			} else if (cmd === clearMascotGenerationCommand) {
				pages[user.id].clearMascotGeneration();
			} else if (cmd === CLOSE_COMMAND) {
				if (user.id in pages) pages[user.id].close();
			} else {
				const error = pages[user.id].checkComponentCommands(cmd, targets);
				if (error) this.say(error);
			}
		},
		aliases: ['gsb'],
	},
	[setGameFormatSeparateCommand]: {
		command(target, room) {
			if (!this.isPm(room)) return;
			return this.say("You must change the format on the HTML page.");
		},
	},
};
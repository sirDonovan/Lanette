import { HexCode } from "../../types/tools";
import type { HtmlPageBase } from "../html-page-base";
import { ColorPicker, IColorPick } from "./color-picker";
import type { IComponentProps } from "./component-base";
import { ComponentBase } from "./component-base";
import { NumberTextInput } from "./number-text-input";
import { PokemonChoices, PokemonPickerBase } from "./pokemon-picker-base";
import { PokemonTextInput } from "./pokemon-text-input";
import { ITextInputValidation, TextInput } from "./text-input";

export interface ICustomGridProps extends IComponentProps {
	defaultColor?: HexCode;
	onSubmit: (output: string) => void;
}

interface ICellData {
	color?: HexCode;
	htmlCache?: string;
	label?: string;
	labelColor?: HexCode;
	players?: string[];
	pokemonIcon?: string;
}

const DEFAULT_WIDTH = 5;
const DEFAULT_HEIGHT = 5;
const DEFAULT_PIXELS = 50;
const EDIT_CELL_PIXEL_SIZE = 50;

const MIN_PIXELS = 5;
const MAX_PIXELS = 100;
const MIN_DIMENSION = 1;
const MAX_DIMENSION = 12;
const MAX_TOTAL_PIXELS = 500;
const MAX_LABEL_LENGTH = 10;
const HISTORY_LIMIT = 5;

const EDIT_CELL_BUTTON_STYLE = 'width: 30px; height: 20px';
const UPDATE_ALL_BUTTON_TEXT = "All";
const UPDATE_ROW_BUTTON_TEXT = "&rarr;";
const UPDATE_COLUMN_BUTTON_TEXT = "&darr;";
const UPDATE_CELL_BUTTON_TEXT = "&check;";

const chooseColorsView = 'choosecolorsview';
const chooseHomeView = 'choosehomeview';
const choosePokemonView = 'choosepokemonview';
const choosePlayersView = 'chooseplayersview';
const chooseLabelsView = 'chooselabelsview';
const chooseInsertMode = 'chooseinsertmode';
const chooseEraseMode = 'chooseerasemode';
const chooseEraseAllMode = 'chooseeraseallmode';
const setCellColorCommand = 'setcellcolor';
const updateCellCommand = 'updatecell';
const updateColumnCommand = 'updatecolumn';
const updateRowCommand = 'updaterow';
const updateAllCommand = 'updateall';
const setPixelsCommand = 'setpixels';
const setWidthCommand = 'setwidth';
const setHeightCommand = 'setheight';
const setPlayerCommand = 'setplayer';
const setPokemonCommand = 'setpokemon';
const setLabelCommand = 'setlabel';
const setLabelColorCommand = 'setlabelcolor';
const allowDuplicatePokemonCommand = 'allowduplicatepokemon';
const disallowDuplicatePokemonCommand = 'disallowduplicatepokemon';
const randomPokemonCommand = 'randompokemon';
const fillRandomPokemonCommand = 'fillrandompokemon';
const choosePokemon = 'choosepokemon';
const choosePlayer = 'chooseplayer';
const undoCommand = 'undo';
const redoCommand = 'redo';
const resetCommand = 'reset';
const submitCommand = 'submit';

const PLAYER_SYMBOL = "P";

export class CustomGrid extends ComponentBase<ICustomGridProps> {
	componentId: string = 'custom-grid';

	allowDuplicatePokemon: boolean = false;
	currentView: 'colors' | 'pokemon' | 'players' | 'labels' | 'home' = 'home';
	currentMode: 'insert' | 'erase' | 'eraseall' = 'insert';
	currentPlayer: string = "";
	currentPokemonIcon: string = "";
	currentLabel: string = "";
	filterError: string = "";
	grid: ICellData[][] = [];
	gridHtml: string = "";
	height: number = DEFAULT_HEIGHT;
	pixelSize: number = DEFAULT_PIXELS;
	playerLocations: Dict<ICellData> = {};
	pokemonNames: Dict<string> = {};
	pokemonIconLocations: Dict<ICellData> = {};
	previewHtml: string = "";
	redosAvailable: number = 0;
	redoGrids: ICellData[][][] = [];
	undosAvailable: number = 0;
	undoGrids: ICellData[][][] = [];
	width: number = DEFAULT_WIDTH;

	currentCellColor: HexCode | undefined;
	currentLabelColor: HexCode | undefined;
	cellColorPicker: ColorPicker;
	defaultColor: HexCode;
	maxDimensions!: number;
	minPokemonIconPixelSize: number;
	playerPicker: NumberTextInput;
	pokemonPicker: PokemonTextInput;
	pokemonList: string[];
	labelInput: TextInput;
	labelColorPicker: ColorPicker;

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: ICustomGridProps) {
		super(htmlPage, parentCommandPrefix, componentCommand, props);

		this.defaultColor = props.defaultColor || Tools.getWhiteHexCode();
		this.minPokemonIconPixelSize = Dex.getPokemonIconWidth();

		PokemonPickerBase.loadData();
		this.pokemonList = PokemonPickerBase.pokemonGens[Dex.getModelGenerations().slice().pop()!].slice();

		// initialize grid and cell caches
		this.updateGridDimensions();
		for (const row of this.grid) {
			for (const cell of row) {
				this.updateCellHtmlCache(cell);
			}
		}
		this.updateGridHtml(true);

		this.cellColorPicker = new ColorPicker(htmlPage, this.commandPrefix, setCellColorCommand, {
			name: "Current color",
			autoSubmitCustomInput: true,
			hidePreview: true,
			onlyCustomPrimary: true,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickColorHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickColorLightness(dontRender),
			onClear: (index, dontRender) => this.clearCellColor(dontRender),
			onPick: (index, color, dontRender) => this.setCellColor(color, dontRender),
			readonly: this.props.readonly,
			reRender: () => this.props.reRender(),
		});

		this.playerPicker = new NumberTextInput(htmlPage, this.commandPrefix, setPlayerCommand, {
			min: 1,
			max: 20,
			name: "Player",
			label: "Enter player number",
			onClear: () => this.clearPlayer(),
			onErrors: () => this.props.reRender(),
			onSubmit: (output) => this.setPlayer(PLAYER_SYMBOL + output),
			reRender: () => this.props.reRender(),
		});

		this.pokemonPicker = new PokemonTextInput(htmlPage, this.commandPrefix, setPokemonCommand, {
			inputWidth: Tools.minRoomWidth,
			minPokemon: 1,
			maxPokemon: 1,
			name: "Pokemon icon",
			placeholder: "Enter a Pokemon",
			pokemonList: this.pokemonList,
			clearText: "Clear",
			submitText: "Update",
			onClear: () => this.clearPokemon(),
			onSubmit: (output) => this.setPokemon(output),
			reRender: () => this.props.reRender(),
		});

		this.labelInput = new TextInput(htmlPage, this.commandPrefix, setLabelCommand, {
			label: "Enter label",
			name: "Label",
			validateSubmission: (input): ITextInputValidation => {
				input = input.trim();
				if (input.length > MAX_LABEL_LENGTH) {
					return {errors: ["Labels cannot be longer than " + MAX_LABEL_LENGTH + " characters"]};
				}

				if (input in this.playerLocations) {
					return {errors: ["Labels cannot be the same as an existing player marker"]};
				}

				if (Client.checkFilters(input, this.htmlPage.room)) {
					return {errors: ["The specified label contains a banned word"]};
				}

				return {currentOutput: input};
			},
			onClear: () => this.clearLabel(),
			onErrors: () => this.props.reRender(),
			onSubmit: (output) => this.setLabel(output),
			reRender: () => this.props.reRender(),
		});

		this.labelColorPicker = new ColorPicker(htmlPage, this.commandPrefix, setLabelColorCommand, {
			name: "Current color",
			autoSubmitCustomInput: true,
			hidePreview: true,
			onlyCustomPrimary: true,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickColorHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickColorLightness(dontRender),
			onClear: (index, dontRender) => this.clearLabelColor(dontRender),
			onPick: (index, color, dontRender) => this.setLabelColor(color, dontRender),
			readonly: this.props.readonly,
			reRender: () => this.props.reRender(),
		});

		this.components = [this.cellColorPicker, this.playerPicker, this.pokemonPicker, this.labelInput, this.labelColorPicker];

		this.toggleActiveComponents();
	}

	chooseHomeView(): void {
		if (this.currentView === 'home') return;

		this.currentView = 'home';

		this.toggleActiveComponents();
		this.updateGridHtml(true);
		this.props.reRender();
	}

	chooseColorsView(): void {
		if (this.currentView === 'colors') return;

		this.currentView = 'colors';

		this.toggleActiveComponents();
		this.updateGridHtml(true);
		this.props.reRender();
	}

	choosePlayersView(): void {
		if (this.currentView === 'players') return;

		this.currentView = 'players';

		this.toggleActiveComponents();
		this.updateGridHtml(true);
		this.props.reRender();
	}

	choosePokemonView(): void {
		if (this.currentView === 'pokemon') return;

		this.currentView = 'pokemon';

		this.toggleActiveComponents();
		this.updateGridHtml(true);
		this.props.reRender();
	}

	chooseLabelsView(): void {
		if (this.currentView === 'labels') return;

		this.currentView = 'labels';

		this.toggleActiveComponents();
		this.updateGridHtml(true);
		this.props.reRender();
	}

	toggleActiveComponents(): void {
		this.cellColorPicker.active = this.currentView === 'colors';
		this.playerPicker.active = this.currentView === 'players';
		this.pokemonPicker.active = this.currentView === 'pokemon';

		const labels = this.currentView === 'labels';
		this.labelInput.active = labels;
		this.labelColorPicker.active = labels;
	}

	chooseInsertMode(): void {
		if (this.currentMode === 'insert') return;

		this.currentMode = 'insert';
		this.updateGridHtml(true);
		this.props.reRender();
	}

	chooseEraseMode(): void {
		if (this.currentMode === 'erase') return;

		this.currentMode = 'erase';
		this.updateGridHtml(true);
		this.props.reRender();
	}

	chooseEraseAllMode(): void {
		if (this.currentMode === 'eraseall') return;

		this.currentMode = 'eraseall';
		this.updateGridHtml(true);
		this.props.reRender();
	}

	pickColorHueVariation(dontRender?: boolean): void {
		if (!dontRender) this.props.reRender();
	}

	pickColorLightness(dontRender?: boolean): void {
		if (!dontRender) this.props.reRender();
	}

	clearCellColor(dontRender?: boolean): void {
		this.currentCellColor = undefined;

		if (!dontRender) {
			this.updateGridHtml(true);
			this.props.reRender();
		}
	}

	setCellColor(color: IColorPick, dontRender?: boolean): void {
		this.currentCellColor = color.hexCode;

		if (!dontRender) {
			this.updateGridHtml(true);
			this.props.reRender();
		}
	}

	clearLabelColor(dontRender?: boolean): void {
		this.currentLabelColor = undefined;

		if (!dontRender) {
			this.updateGridHtml(true);
			this.props.reRender();
		}
	}

	setLabelColor(color: IColorPick, dontRender?: boolean): void {
		this.currentLabelColor = color.hexCode;

		if (!dontRender) {
			this.updateGridHtml(true);
			this.props.reRender();
		}
	}

	clearPlayer(dontRender?: boolean): void {
		this.currentPlayer = "";

		if (!dontRender) {
			this.updateGridHtml(true);
			this.props.reRender();
		}
	}

	setPlayer(player: string, dontRender?: boolean): void {
		this.currentPlayer = player;

		if (!dontRender) {
			this.updateGridHtml(true);
			this.props.reRender();
		}
	}

	clearPokemon(dontRender?: boolean): void {
		this.currentPokemonIcon = "";

		if (!dontRender) {
			this.updateGridHtml(true);
			this.props.reRender();
		}
	}

	setPokemon(choices: PokemonChoices): void {
		this.choosePokemon(choices[0]!.pokemon);
	}

	choosePokemon(species: string): void {
		const pokemon = Dex.getExistingPokemon(species);
		this.currentPokemonIcon = Dex.getPokemonIcon(pokemon);
		this.pokemonNames[this.currentPokemonIcon] = pokemon.name;

		this.cellColorPicker.parentSetPokemon(pokemon.name);
		this.updateGridHtml(true);
		this.props.reRender();
	}

	clearLabel(dontRender?: boolean): void {
		this.currentLabel = "";

		if (!dontRender) {
			this.updateGridHtml(true);
			this.props.reRender();
		}
	}

	setLabel(label: string, dontRender?: boolean): void {
		this.currentLabel = label;

		if (!dontRender) {
			this.updateGridHtml(true);
			this.props.reRender();
		}
	}

	updateGridDimensions(): void {
		this.maxDimensions = Math.floor(MAX_TOTAL_PIXELS / this.pixelSize);
		// limit size of sent HTML
		if (this.maxDimensions > MAX_DIMENSION) this.maxDimensions = MAX_DIMENSION;

		if (this.width > this.maxDimensions) this.width = this.maxDimensions;
		if (this.height > this.maxDimensions) this.height = this.maxDimensions;

		const height = this.grid.length;
		if (height > this.height) {
			this.grid = this.grid.slice(0, this.height);
		} else if (height < this.height) {
			for (let i = height; i < this.height; i++) {
				this.grid.push([]);
			}
		}

		for (let i = 0; i < this.grid.length; i++) {
			const rowWidth = this.grid[i].length;
			if (rowWidth > this.width) {
				this.grid[i] = this.grid[i].slice(0, this.width);
			} else if (rowWidth < this.width) {
				for (let j = rowWidth; j < this.width; j++) {
					this.grid[i].push({});
				}
			}
		}
	}

	updateWidth(width: number): void {
		if (width === this.width) return;

		this.width = width;
		this.updateGridDimensions();
	}

	updateHeight(height: number): void {
		if (height === this.height) return;

		this.height = height;
		this.updateGridDimensions();
	}

	updatePixelSize(pixels: number): void {
		if (pixels === this.pixelSize) return;

		this.pixelSize = pixels;
		this.updateGridDimensions();
	}

	checkPokemonIconCount(): void {
		for (const row of this.grid) {
			for (const cell of row) {
				if (cell.pokemonIcon) {
					if (this.pixelSize < this.minPokemonIconPixelSize) {
						this.updatePixelSize(this.minPokemonIconPixelSize);
					}

					return;
				}
			}
		}
	}

	clearCell(cell: ICellData): void {
		cell.color = undefined;
		cell.label = "";

		this.removePlayersFromCell(cell);

		if (cell.pokemonIcon) {
			delete this.pokemonIconLocations[cell.pokemonIcon];
			cell.pokemonIcon = "";
		}
	}

	removePlayersFromCell(cell: ICellData): void {
		if (cell.players) {
			for (const player of cell.players) {
				delete this.playerLocations[player];
			}

			cell.players = undefined;
		}
	}

	updateCellHtmlCache(cell: ICellData): void {
		let html = '<td style="position: relative;background: ' + (cell.color || this.defaultColor) + '">';

		let hasPlayers = false;
		if (cell.players) {
			const players = cell.players.length;
			if (players) {
				hasPlayers = true;
				if (players > 1) {
					html += "<span title='" + cell.players.join(", ") + "'>*</span>";
				} else {
					html += cell.players[0];
				}
			}
		}

		if (cell.label) {
			if (hasPlayers) html += "<br />";
			if (cell.labelColor) html += "<span style='color: " + cell.labelColor + "'>";
			html += cell.label;
			if (cell.labelColor) html += "</span>";
		}

		if (cell.pokemonIcon) {
			if (hasPlayers || cell.label) html += "<br />";
			html += cell.pokemonIcon;
		}

		html += '</td>';

		cell.htmlCache = html;
	}

	getGridHtml(display?: boolean): string {
		let width = this.width;
		if (display) {
			width += 1;
		}

		const totalWidth = width * (display ? this.pixelSize : EDIT_CELL_PIXEL_SIZE);
		const rowHeight = display ? this.pixelSize : EDIT_CELL_PIXEL_SIZE;
		let html = '<table align="center" border="1" ' +
			'style="color: black;font-weight: bold;text-align: center;table-layout: fixed;border-spacing: 1px;' +
				'width: ' + totalWidth + 'px;">';

		const colors = this.currentView === 'colors';
		const players = this.currentView === 'players';
		const pokemon = this.currentView === 'pokemon';
		const labels = this.currentView === 'labels';
		const home = this.currentView === 'home';

		const clear = this.currentMode === 'erase' || this.currentMode === 'eraseall';

		const disableFills = home || (!clear && players) || (!clear && colors && !this.currentCellColor) ||
			(!clear && labels && !this.currentLabel) || (!clear && pokemon && !this.allowDuplicatePokemon);

		let disableAllCells = home;
		if (!clear && !home) {
			if (colors) {
				disableAllCells = !this.currentCellColor;
			} else if (players) {
				disableAllCells = !this.currentPlayer;
			} else if (pokemon) {
				disableAllCells = !this.currentPokemonIcon;
			} else if (labels) {
				disableAllCells = !this.currentLabel;
			}
		}

		const fillBackground = Tools.getBlackHexCode();
		// update all or column
		if (!display) {
			html += '<tr style="height:' + rowHeight + 'px">';
			for (let i = 0; i <= this.width; i++) {
				if (i === 0) {
					html += '<td style="position: relative;background: ' + fillBackground + '">';
					html += this.getQuietPmButton(this.commandPrefix + ", " + updateAllCommand, UPDATE_ALL_BUTTON_TEXT,
						{disabled: disableFills, style: EDIT_CELL_BUTTON_STYLE});
					html += '</td>';
				} else {
					html += '<td style="position: relative;background: ' + fillBackground + '">';
					html += this.getQuietPmButton(this.commandPrefix + ", " + updateColumnCommand + ", " + (i - 1),
						UPDATE_COLUMN_BUTTON_TEXT, {disabled: disableFills, style: EDIT_CELL_BUTTON_STYLE});
					html += '</td>';
				}
			}
			html += '</tr>';
		}

		for (let i = 0; i < this.grid.length; i++) {
			html += '<tr style="height:' + rowHeight + 'px">';

			// update row
			if (!display) {
				html += '<td style="position: relative;background: ' + fillBackground + '">';
				html += this.getQuietPmButton(this.commandPrefix + ", " + updateRowCommand + ", " + i, UPDATE_ROW_BUTTON_TEXT,
					{disabled: disableFills, style: EDIT_CELL_BUTTON_STYLE});
				html += '</td>';
			}

			const row = this.grid[i];
			for (let j = 0; j < row.length; j++) {
				if (display) {
					html += row[j].htmlCache;
				} else {
					html += '<td style="position: relative;background: ' + (row[j].color || this.defaultColor) + '">';

					let hasPlayers = false;
					if (row[j].players) {
						const players = row[j].players!.length;
						if (players) {
							hasPlayers = true;
							if (players > 1) {
								html += "<span title='" + row[j].players!.join(", ") + "'>*</span>";
							} else {
								html += row[j].players![0];
							}
						}
					}

					if (row[j].label) {
						if (hasPlayers) html += "<br />";
						html += row[j].label;
					}

					if (row[j].pokemonIcon) {
						if (hasPlayers || row[j].label) html += "<br />";
						html += row[j].pokemonIcon;
					}

					let disableCell = false;
					if (clear && !disableAllCells) {
						if (colors) {
							if (!row[j].color) disableCell = true;
						} else if (pokemon) {
							if (!row[j].pokemonIcon) disableCell = true;
						} else if (players) {
							if (!row[j].players || !row[j].players!.includes(this.currentPlayer)) disableCell = true;
						} else if (labels) {
							if (!row[j].label) disableCell = true;
						}
					}

					html += this.getQuietPmButton(this.commandPrefix + ", " + updateCellCommand + ", " + i + ", " + j,
						UPDATE_CELL_BUTTON_TEXT, {disabled: disableAllCells || disableCell, style: EDIT_CELL_BUTTON_STYLE});

					html += '</td>';
				}
			}

			html += '</tr>';
		}

		html += '</table>';

		return html;
	}

	updateGridHtml(controlsOnly?: boolean): void {
		this.gridHtml = this.getGridHtml();
		if (!controlsOnly) this.previewHtml = this.getGridHtml(true);
	}

	reset(): void {
		this.prepareUndo(true);

		for (const row of this.grid) {
			for (let i = 0; i < row.length; i++) {
				row[i] = {};
			}
		}

		this.playerLocations = {};
		this.pokemonIconLocations = {};
		this.pokemonNames = {};

		this.updateGridHtml();
		this.previewHtml = "";
		this.props.reRender();
	}

	submit(): void {
		this.props.onSubmit(this.getGridHtml(true));
	}

	insertColor(cell: ICellData): void {
		cell.color = this.currentCellColor;
	}

	eraseColor(cell: ICellData): void {
		cell.color = undefined;
	}

	insertPokemon(cell: ICellData, multipleCells?: boolean): void {
		if (cell.pokemonIcon && cell.pokemonIcon !== this.currentPokemonIcon) {
			if (!this.allowDuplicatePokemon) delete this.pokemonNames[cell.pokemonIcon];
			delete this.pokemonIconLocations[cell.pokemonIcon];
		}

		if (!this.allowDuplicatePokemon && this.currentPokemonIcon in this.pokemonIconLocations) {
			this.pokemonIconLocations[this.currentPokemonIcon].pokemonIcon = "";
			this.updateCellHtmlCache(this.pokemonIconLocations[this.currentPokemonIcon]);
		}

		cell.pokemonIcon = this.currentPokemonIcon;
		this.pokemonIconLocations[this.currentPokemonIcon] = cell;

		if (!multipleCells) this.checkPokemonIconCount();
	}

	erasePokemon(cell: ICellData): void {
		if (cell.pokemonIcon) {
			if (!this.allowDuplicatePokemon) delete this.pokemonNames[cell.pokemonIcon];
			delete this.pokemonIconLocations[cell.pokemonIcon];
			cell.pokemonIcon = "";
		}
	}

	insertLabel(cell: ICellData): boolean {
		const previousValue = cell.label;
		cell.label = this.currentLabel;
		if (this.checkFilters()) {
			cell.label = previousValue;
			return false;
		} else {
			if (this.currentLabelColor) cell.labelColor = this.currentLabelColor;
			return true;
		}
	}

	eraseLabel(cell: ICellData): boolean {
		const previousValue = cell.label;
		cell.label = "";
		if (this.checkFilters()) {
			cell.label = previousValue;
			return false;
		} else {
			cell.labelColor = undefined;
			return true;
		}
	}

	updateCell(inputX: string | undefined, inputY: string | undefined): void {
		if (!inputX || !inputY || this.currentView === 'home') return;

		const x = parseInt(inputX.trim());
		const y = parseInt(inputY.trim());
		if (isNaN(x) || isNaN(y) || x < 0 || y < 0 || x > this.width || y > this.height) return;

		this.prepareUndo(true);

		const cell = this.grid[x][y];
		if (this.currentMode === 'eraseall') {
			this.clearCell(cell);
		} else {
			const colors = this.currentView === 'colors';
			const pokemon = this.currentView === 'pokemon';
			const labels = this.currentView === 'labels';

			const clear = this.currentMode === 'erase';
			if (!clear && (
				(colors && !this.currentCellColor) ||
				(pokemon && !this.currentPokemonIcon) ||
				(labels && !this.currentLabel))) return;

			if (colors) {
				if (clear) {
					this.eraseColor(cell);
				} else {
					this.insertColor(cell);
				}
			} else if (this.currentView === 'players') {
				if (!clear && this.currentPlayer in this.playerLocations) {
					this.playerLocations[this.currentPlayer].players!
						.splice(this.playerLocations[this.currentPlayer].players!.indexOf(this.currentPlayer), 1);

					this.updateCellHtmlCache(this.playerLocations[this.currentPlayer]);
				}

				if (!cell.players) cell.players = [];
				const index = cell.players.indexOf(this.currentPlayer);
				if (clear) {
					if (index !== -1) cell.players.splice(index, 1);
					delete this.playerLocations[this.currentPlayer];
				} else {
					if (index === -1) cell.players.push(this.currentPlayer);
					this.playerLocations[this.currentPlayer] = cell;
				}
			} else if (pokemon) {
				if (clear) {
					this.erasePokemon(cell);
				} else {
					this.insertPokemon(cell);
				}
			} else if (labels) {
				if (clear) {
					this.eraseLabel(cell);
				} else {
					this.insertLabel(cell);
				}
			}
		}

		this.updateCellHtmlCache(cell);

		this.updateGridHtml();
		this.props.reRender();
	}

	updateColumn(inputColumn: string | undefined): void {
		if (!inputColumn || this.currentView === 'home') return;

		const colors = this.currentView === 'colors';
		const players = this.currentView === 'players';
		const pokemon = this.currentView === 'pokemon';
		const labels = this.currentView === 'labels';

		const eraseAll = this.currentMode === 'eraseall';
		const clear = eraseAll || this.currentMode === 'erase';
		if (!clear && (players ||
			(colors && !this.currentCellColor) ||
			(pokemon && (!this.allowDuplicatePokemon || !this.currentPokemonIcon)) ||
			(labels && !this.currentLabel))) return;

		const column = parseInt(inputColumn.trim());
		if (isNaN(column) || column < 0 || column > this.width) return;

		this.prepareUndo(true);

		for (let i = 0; i < this.height; i++) {
			const cell = this.grid[i][column];
			if (eraseAll) {
				this.clearCell(cell);
			} else {
				if (colors) {
					if (clear) {
						this.eraseColor(cell);
					} else {
						this.insertColor(cell);
					}
				} else if (pokemon) {
					if (clear) {
						this.erasePokemon(cell);
					} else {
						this.insertPokemon(cell, true);
					}
				} else if (labels) {
					if (clear) {
						if (!this.eraseLabel(cell)) break;
					} else {
						if (!this.insertLabel(cell)) break;
					}
				} else if (players) {
					this.removePlayersFromCell(cell);
				}
			}

			this.updateCellHtmlCache(cell);
		}

		if (pokemon && !clear) this.checkPokemonIconCount();

		this.updateGridHtml();
		this.props.reRender();
	}

	updateRow(inputRow: string | undefined): void {
		if (!inputRow || this.currentView === 'home') return;

		const colors = this.currentView === 'colors';
		const players = this.currentView === 'players';
		const pokemon = this.currentView === 'pokemon';
		const labels = this.currentView === 'labels';

		const eraseAll = this.currentMode === 'eraseall';
		const clear = eraseAll || this.currentMode === 'erase';
		if (!clear && (players ||
			(colors && !this.currentCellColor) ||
			(pokemon && (!this.allowDuplicatePokemon || !this.currentPokemonIcon)) ||
			(labels && !this.currentLabel))) return;

		const row = parseInt(inputRow.trim());
		if (isNaN(row) || row < 0 || row > this.height) return;

		this.prepareUndo(true);

		for (let i = 0; i < this.width; i++) {
			const cell = this.grid[row][i];
			if (eraseAll) {
				this.clearCell(cell);
			} else {
				if (colors) {
					if (clear) {
						this.eraseColor(cell);
					} else {
						this.insertColor(cell);
					}
				} else if (pokemon) {
					if (clear) {
						this.erasePokemon(cell);
					} else {
						this.insertPokemon(cell, true);
					}
				} else if (labels) {
					if (clear) {
						if (!this.eraseLabel(cell)) break;
					} else {
						if (!this.insertLabel(cell)) break;
					}
				} else if (players) {
					this.removePlayersFromCell(cell);
				}
			}

			this.updateCellHtmlCache(cell);
		}

		if (pokemon && !clear) this.checkPokemonIconCount();

		this.updateGridHtml();
		this.props.reRender();
	}

	updateAll(): void {
		if (this.currentView === 'home') return;

		const colors = this.currentView === 'colors';
		const players = this.currentView === 'players';
		const pokemon = this.currentView === 'pokemon';
		const labels = this.currentView === 'labels';

		const eraseAll = this.currentMode === 'eraseall';
		const clear = eraseAll || this.currentMode === 'erase';
		if (!clear && (players ||
			(colors && !this.currentCellColor) ||
			(pokemon && (!this.allowDuplicatePokemon || !this.currentPokemonIcon)) ||
			(labels && !this.currentLabel))) return;

		this.prepareUndo(true);

		outer:
		for (const row of this.grid) {
			for (const cell of row) {
				if (eraseAll) {
					this.clearCell(cell);
				} else {
					if (colors) {
						if (clear) {
							this.eraseColor(cell);
						} else {
							this.insertColor(cell);
						}
					} else if (pokemon) {
						if (clear) {
							this.erasePokemon(cell);
						} else {
							this.insertPokemon(cell, true);
						}
					} else if (labels) {
						if (clear) {
							if (!this.eraseLabel(cell)) break outer;
						} else {
							if (!this.insertLabel(cell)) break outer;
						}
					} else if (players) {
						this.removePlayersFromCell(cell);
					}
				}

				this.updateCellHtmlCache(cell);
			}
		}

		if (pokemon && !clear) this.checkPokemonIconCount();

		this.updateGridHtml();
		this.props.reRender();
	}

	fillRandomPokemon(): void {
		if (this.currentView !== 'pokemon') return;

		const usedPokemon: string[] = [];
		for (const i in this.pokemonNames) {
			usedPokemon.push(this.pokemonNames[i]);
		}

		const pokemonList = Tools.shuffle(this.pokemonList);
		for (const row of this.grid) {
			for (const cell of row) {
				if (cell.pokemonIcon) continue;

				const species = pokemonList.shift();
				if (!species) return;

				const pokemon = Dex.getExistingPokemon(species);
				cell.pokemonIcon = Dex.getPokemonIcon(pokemon);
				this.pokemonNames[cell.pokemonIcon] = pokemon.name;
				this.pokemonIconLocations[cell.pokemonIcon] = cell;

				this.updateCellHtmlCache(cell);
			}
		}

		this.updateGridHtml();
		this.props.reRender();
	}

	checkFilters(): boolean {
		let allLetters = "";
		const rows: string[] = [];
		const columns: string[] = [];
		const diagonals: string[] = [];
		const gridLength = this.grid.length;
		for (let i = 0; i < gridLength; i++) {
			const row = this.grid[i];
			let word = "";

			for (let j = 0; j < row.length; j++) {
				if (row[j].label) {
					// whole grid
					allLetters += row[j].label;

					// row
					word += row[j].label;

					// column
					if (!columns[j]) columns[j] = "";
					columns[j] += row[j].label;

					// diagonal
					let diagonal = row[j].label!;
					for (let diagonalRow = i + 1, diagonalColumn = j + 1; diagonalRow < gridLength; diagonalRow++, diagonalColumn++) {
						if (this.grid[diagonalRow][diagonalColumn] && this.grid[diagonalRow][diagonalColumn].label) {
							diagonal += this.grid[diagonalRow][diagonalColumn].label!;
						}
					}

					if (diagonal.length > 1) diagonals.push(diagonal);
				}
			}

			if (word) {
				rows.push(word);
			}
		}

		const words = [allLetters].concat(rows, columns, diagonals);
		for (const word of words) {
			if (!word) continue;

			const filterError = Client.checkFilters(word, this.htmlPage.room);
			if (filterError) {
				this.filterError = "The specified labels contain a banned word";
				return true;
			}
		}

		this.filterError = "";
		return false;
	}

	removeDuplicatePokemon(): void {
		const countedIcons: Dict<boolean> = {};
		for (const row of this.grid) {
			for (const cell of row) {
				if (cell.pokemonIcon) {
					if (cell.pokemonIcon in countedIcons) {
						cell.pokemonIcon = "";
						this.updateCellHtmlCache(cell);
					} else {
						countedIcons[cell.pokemonIcon] = true;
					}
				}
			}
		}
	}

	cloneGrid(grid: ICellData[][]): ICellData[][] {
		const gridCopy: ICellData[][] = [];
		for (const row of grid) {
			const rowCopy: ICellData[] = [];
			for (const cell of row) {
				rowCopy.push(Object.assign({}, cell));
			}
			gridCopy.push(rowCopy);
		}

		return gridCopy;
	}

	prepareUndo(newAction?: boolean): void {
		if (this.undoGrids.length === HISTORY_LIMIT) this.undoGrids.pop();

		this.undoGrids.unshift(this.cloneGrid(this.grid));
		this.undosAvailable = this.undoGrids.length;

		if (newAction) {
			this.redoGrids = [];
			this.redosAvailable = 0;
		}
	}

	prepareRedo(): void {
		if (this.redoGrids.length === HISTORY_LIMIT) this.redoGrids.pop();

		this.redoGrids.unshift(this.cloneGrid(this.grid));
		this.redosAvailable = this.redoGrids.length;
	}

	redo(): void {
		if (!this.redosAvailable) return;

		this.prepareUndo();

		this.grid = this.cloneGrid(this.redoGrids[0]);

		this.redoGrids.shift();
		this.redosAvailable--;

		this.updateGridHtml();
		this.props.reRender();
	}

	undo(): void {
		if (!this.undosAvailable) return;

		this.prepareRedo();

		this.grid = this.cloneGrid(this.undoGrids[0]);

		this.undoGrids.shift();
		this.undosAvailable--;

		this.updateGridHtml();
		this.props.reRender();
	}

	tryCommand(originalTargets: readonly string[]): string | undefined {
		const targets = originalTargets.slice();
		const cmd = Tools.toId(targets[0]);
		targets.shift();

		if (cmd === chooseColorsView) {
			this.chooseColorsView();
		} else if (cmd === choosePlayersView) {
			this.choosePlayersView();
		} else if (cmd === choosePokemonView) {
			this.choosePokemonView();
		} else if (cmd === chooseLabelsView) {
			this.chooseLabelsView();
		} else if (cmd === chooseHomeView) {
			this.chooseHomeView();
		} else if (cmd === chooseInsertMode) {
			this.chooseInsertMode();
		} else if (cmd === chooseEraseMode) {
			this.chooseEraseMode();
		} else if (cmd === chooseEraseAllMode) {
			this.chooseEraseAllMode();
		} else if (cmd === choosePlayer) {
			const id = targets[0].trim();
			if (!(id in this.playerLocations)) return;

			this.setPlayer(id);
		} else if (cmd === choosePokemon) {
			const name = targets[0].trim();
			let icon = "";
			for (const i in this.pokemonNames) {
				if (this.pokemonNames[i] === name) {
					icon = i;
					break;
				}
			}

			if (!(icon in this.pokemonNames)) return;

			this.choosePokemon(name);
		} else if (cmd === setWidthCommand) {
			const width = parseInt(targets[0] ? targets[0].trim() : "");
			if (isNaN(width) || width < MIN_DIMENSION || width > this.maxDimensions) return;

			this.updateWidth(width);
			this.updateGridHtml();
			this.props.reRender();
		} else if (cmd === setHeightCommand) {
			const height = parseInt(targets[0] ? targets[0].trim() : "");
			if (isNaN(height) || height < MIN_DIMENSION || height > this.maxDimensions) return;

			this.updateHeight(height);
			this.updateGridHtml();
			this.props.reRender();
		} else if (cmd === setPixelsCommand) {
			const pixels = parseInt(targets[0] ? targets[0].trim() : "");
			if (isNaN(pixels) || pixels < MIN_PIXELS || pixels > MAX_PIXELS) return;

			this.updatePixelSize(pixels);
			this.checkPokemonIconCount();
			this.updateGridHtml();
			this.props.reRender();
		} else if (cmd === updateCellCommand) {
			this.updateCell(targets[0], targets[1]);
		} else if (cmd === updateColumnCommand) {
			this.updateColumn(targets[0]);
		} else if (cmd === updateRowCommand) {
			this.updateRow(targets[0]);
		} else if (cmd === updateAllCommand) {
			this.updateAll();
		} else if (cmd === allowDuplicatePokemonCommand) {
			if (this.allowDuplicatePokemon) return;

			this.allowDuplicatePokemon = true;
			this.props.reRender();
		} else if (cmd === disallowDuplicatePokemonCommand) {
			if (!this.allowDuplicatePokemon) return;

			this.allowDuplicatePokemon = false;

			this.removeDuplicatePokemon();
			this.updateGridHtml();
			this.props.reRender();
		} else if (cmd === randomPokemonCommand) {
			const randomPokemon = Tools.sampleOne(this.pokemonList);

			this.pokemonPicker.parentSetInput(randomPokemon);
			this.choosePokemon(randomPokemon);
		} else if (cmd === fillRandomPokemonCommand) {
			this.fillRandomPokemon();
		} else if (cmd === redoCommand) {
			this.redo();
		} else if (cmd === undoCommand) {
			this.undo();
		} else if (cmd === resetCommand) {
			this.reset();
		} else if (cmd === submitCommand) {
			this.submit();
		} else {
			return this.checkComponentCommands(cmd, targets);
		}
	}

	render(): string {
		let html = "";

		if (this.previewHtml) {
			html += "<b>Preview</b>:<br />" + this.previewHtml;
			html += "<br />";
		} else {
			html += "You can customize the grid with colors, player markers, Pokemon icons, and cell labels!";
			html += "<br /><br />";
			html += "Choose a property, enter a value, make sure you're in the desired edit mode, and then click one of the edit " +
				"buttons:";
			html += "<ul>";
			html += "<li><button class='button'>" + UPDATE_ALL_BUTTON_TEXT + "</button> - edit the entire grid</li>";
			html += "<li><button class='button'>" + UPDATE_ROW_BUTTON_TEXT + "</button> - edit that row</li>";
			html += "<li><button class='button'>" + UPDATE_COLUMN_BUTTON_TEXT + "</button> - edit that column</li>";
			html += "<li><button class='button'>" + UPDATE_CELL_BUTTON_TEXT + "</button> - edit that cell</li>";
			html += "</ul>";
		}

		if (this.filterError) {
			html += "<b>" + this.filterError + "</b>";
			html += "<br />";
		}

		html += this.gridHtml;

		html += "<b>Actions</b>:";
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + undoCommand, "Undo", {disabled: !this.undosAvailable});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + redoCommand, "Redo", {disabled: !this.redosAvailable});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + resetCommand, "Reset");
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + submitCommand, "Submit");
		html += "<br /><br />";

		const home = this.currentView === 'home';
		const colors = this.currentView === 'colors';
		const players = this.currentView === 'players';
		const pokemon = this.currentView === 'pokemon';
		const labels = this.currentView === 'labels';

		let eraseText: string;
		if (colors) {
			eraseText = 'color';
		} else if (players) {
			eraseText = 'player(s)';
		} else if (pokemon) {
			eraseText = 'Pokemon';
		} else if (labels) {
			eraseText = 'label';
		} else {
			eraseText = "";
		}

		html += "<b>Edit modes</b>:";
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseInsertMode, "Insert",
			{disabled: home || this.currentMode === 'insert'});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseEraseMode,
			"Erase" + (eraseText ? " " + eraseText : ""), {disabled: home || this.currentMode === 'erase'});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseEraseAllMode, "Erase all",
			{disabled: home || this.currentMode === 'eraseall'});
		html += "<br /><br />";

		html += "<b>Navigation</b>:"
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseHomeView, "Home", {selectedAndDisabled: home});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseColorsView, "Colors", {selectedAndDisabled: colors});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + choosePlayersView, "Players",
			{selectedAndDisabled: players});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + choosePokemonView, "Pokemon icons",
			{selectedAndDisabled: pokemon});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseLabelsView, "Labels", {selectedAndDisabled: labels});

		html += "<hr />";

		if (home) {
			html += "<b>Number of columns</b>";
			for (let i = MIN_DIMENSION; i <= this.maxDimensions; i++) {
				html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + setWidthCommand + ", " + i, "" + i,
					{selectedAndDisabled: this.width === i});
			}

			html += "<br /><br />";

			html += "<b>Number of rows</b>";
			for (let i = MIN_DIMENSION; i <= this.maxDimensions; i++) {
				html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + setHeightCommand + ", " + i, "" + i,
					{selectedAndDisabled: this.height === i});
			}

			html += "<br /><br />";

			html += "<b>Cell size</b> (in pixels)";
			for (let i = MIN_PIXELS; i <= MAX_PIXELS; i += 5) {
				html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + setPixelsCommand + ", " + i, "" + i,
					{selectedAndDisabled: this.pixelSize === i});
			}
		} else if (colors) {
			html += "<b>Cell fill color</b> ";
			html += this.cellColorPicker.render();
		} else if (players) {
			html += "<b>Player markers</b>";
			if (this.currentPlayer) html += ": " + this.currentPlayer;

			const currentPlayers: string[] = [];
			for (const i in this.playerLocations) {
				currentPlayers.push(this.getQuietPmButton(this.commandPrefix + ", " + choosePlayer + ", " + i, i,
					{selectedAndDisabled: i === this.currentPlayer}));
			}

			if (currentPlayers.length) {
				html += "<br />";
				html += currentPlayers.join(" ");
			}

			html += this.playerPicker.render();
		} else if (pokemon) {
			html += "<b>Pokemon icons</b>";
			if (this.currentPokemonIcon) html += ": " + this.currentPokemonIcon;

			if (this.allowDuplicatePokemon) {
				html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + disallowDuplicatePokemonCommand,
					"Disallow duplicate Pokemon");
			} else {
				html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + allowDuplicatePokemonCommand,
					"Allow duplicate Pokemon");
			}
			html += "<br />";

			const currentIcons: string[] = [];
			for (const i in this.pokemonIconLocations) {
				currentIcons.push(this.getQuietPmButton(this.commandPrefix + ", " + choosePokemon + ", " + this.pokemonNames[i],
					this.pokemonNames[i], {selectedAndDisabled: i === this.currentPokemonIcon}));
			}

			if (currentIcons.length) {
				html += "<br />";
				html += currentIcons.join(" ");
			}

			html += "<br /><br />";
			html += this.getQuietPmButton(this.commandPrefix + ", " + randomPokemonCommand, "Single random Pokemon");
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + fillRandomPokemonCommand, "Fill with random Pokemon");
			html += this.pokemonPicker.render();
		} else if (labels) {
			html += "<b>Cell label</b>";
			if (this.currentLabel) {
				html += ": <span";
				if (this.currentLabelColor) html += " style='color: " + this.currentLabelColor + "'";
				html += "><b>" + this.currentLabel + "</b></span>";
			}

			html += this.labelInput.render();
			html += "<br /><br />";
			html += "<b>Label color</b> ";
			html += this.labelColorPicker.render();
		}

		return html;
	}
}
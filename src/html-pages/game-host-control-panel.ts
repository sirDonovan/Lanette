import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { ModelGeneration } from "../types/dex";
import type { IRandomGameAnswer } from "../types/games";
import type { BorderType } from "../types/tools";
import type { User } from "../users";
import type { IColorPick } from "./components/color-picker";
import { ManualHostDisplay } from "./components/manual-host-display";
import type { IHostDisplayProps } from "./components/host-display-base";
import type { IPokemonPick, PokemonChoices } from "./components/pokemon-picker-base";
import { RandomHostDisplay } from "./components/random-host-display";
import type { ITrainerPick, TrainerChoices } from "./components/trainer-picker";
import { CLOSE_COMMAND, HtmlPageBase, HtmlSelector } from "./html-page-base";
import { MultiTextInput } from "./components/multi-text-input";
import { TextInput } from "./components/text-input";
import { NumberTextInput } from "./components/number-text-input";
import type { IDatabase, GifIcon, IGameHostDisplay, ISavedCustomGridData } from "../types/storage";
import { CustomGrid } from "./components/custom-grid";

const excludedHintGames: string[] = ['hypnoshunches', 'mareaniesmarquees', 'pikachusmysterypokemon', 'smearglesmysterymoves',
'zygardesorders'];

const baseCommand = 'gamehostcontrolpanel';
const chooseHostInformation = 'choosehostinformation';
const chooseCustomGrid = 'choosecustomgrid';
const chooseCustomDisplay = 'choosecustomdisplay';
const chooseRandomDisplay = 'chooserandomdisplay';
const chooseGenerateHints = 'choosegeneratehints';
const addPointsCommand = 'addpoints';
const removePointsCommand = 'removepoints';
const storedMessageInputCommand = 'storedmessage';
const twistInputCommand = 'twist';
const customGridCommand = 'customgrid';
const setCurrentPlayerCommand = 'setcurrentplayer';
const manualHostDisplayCommand = 'manualhostdisplay';
const randomHostDisplayCommand = 'randomhostdisplay';
const generateHintCommand = 'generatehint';
const sendDisplayCommand = 'senddisplay';
const autoSendCommand = 'autosend';
const autoSendYes = 'yes';
const autoSendNo = 'no';

const refreshCommand = 'refresh';
const autoRefreshCommand = 'autorefresh';

const maxGifs = 6;
const maxIcons = 15;
const maxTrainers = 6;

export const pageId = 'game-host-control-panel';
export const pages: Dict<GameHostControlPanel> = {};

export class GameHostControlPanel extends HtmlPageBase {
	static compatibleHintGames: string[] = [];
	static GameHostControlPanelLoaded: boolean = false;
	static baseCommand: string = baseCommand;
	static autoRefreshCommand: string = autoRefreshCommand;

	pageId = pageId;

	addPointsInput: NumberTextInput;
	autoSendDisplay: boolean = false;
	currentView: 'hostinformation' | 'customgrid' | 'manualhostdisplay' | 'randomhostdisplay' | 'generatehints';
	currentPokemon: PokemonChoices = [];
	currentTrainers: TrainerChoices = [];
	currentPlayer: string = '';
	customGrid: CustomGrid;
	customGridSelector: HtmlSelector;
	generateHintsGameHtml: string = '';
	generateHintsSelector: HtmlSelector;
	generatedAnswer: IRandomGameAnswer | undefined;
	generatedAnswerErrorHtml: string = '';
	hostInformationSelector: HtmlSelector;
	manualHostDisplay: ManualHostDisplay | undefined;
	manualHostDisplaySelector: HtmlSelector | undefined;
	pokemonGeneration: ModelGeneration = 'xy';
	randomHostDisplay: RandomHostDisplay | undefined;
	randomHostDisplaySelector: HtmlSelector | undefined;
	removePointsInput: NumberTextInput;
	storedMessageInput: MultiTextInput;
	twistInput: TextInput;
	usesHtmlSelectors: boolean = true;

	constructor(room: Room, user: User) {
		super(room, user, baseCommand, pages);

		GameHostControlPanel.loadData();

		this.setCloseButtonHtml();

		const database = Storage.getDatabase(this.room);
		let hostDisplay: IGameHostDisplay | undefined;

		if (database.gameHostDisplays && this.userId in database.gameHostDisplays) {
			hostDisplay = database.gameHostDisplays[this.userId];
		}

		this.currentView = room.userHostedGame && room.userHostedGame.isHost(user) ? 'hostinformation' : 'customgrid';

		this.hostInformationSelector = this.newSelector("hostinformation", this.currentView === 'hostinformation');
		this.customGridSelector = this.newSelector("customgrid", this.currentView === 'customgrid');
		this.generateHintsSelector = this.newSelector("generatehints", false);
		this.addSelector(this.hostInformationSelector);
		this.addSelector(this.customGridSelector);
		this.addSelector(this.generateHintsSelector);

		this.addPointsInput = new NumberTextInput(this, this.commandPrefix, addPointsCommand, {
			min: 1,
			name: "Add points",
			label: "Add point(s)",
			submitText: "Add",
			onClear: () => this.onClearAddPoints(),
			onErrors: () => this.onAddPointsErrors(),
			onSubmit: (output) => this.onSubmitAddPoints(output),
			reRender: () => this.send(),
		});

		this.removePointsInput = new NumberTextInput(this, this.commandPrefix, removePointsCommand, {
			min: 1,
			name: "Remove points",
			label: "Remove point(s)",
			submitText: "Remove",
			onClear: () => this.onClearRemovePoints(),
			onErrors: () => this.onRemovePointsErrors(),
			onSubmit: (output) => this.onSubmitRemovePoints(output),
			reRender: () => this.send(),
		});

		this.storedMessageInput = new MultiTextInput(this, this.commandPrefix, storedMessageInputCommand, {
			inputCount: 2,
			labels: ['Key', 'Message'],
			name: "Stored message",
			textAreas: [false, true],
			textAreaConfigurations: [null, {rows: 3, cols: 60}],
			onClear: () => this.onClearStoreMessage(),
			onErrors: () => this.onStoreMessageErrors(),
			onSubmit: (output) => this.onSubmitStoreMessage(output),
			reRender: () => this.send(),
		});

		this.twistInput = new TextInput(this, this.commandPrefix, twistInputCommand, {
			currentInput: room.userHostedGame && room.userHostedGame.twist ? room.userHostedGame.twist : "",
			label: "Enter twist",
			name: "Twist",
			textArea: true,
			textAreaConfiguration: {rows: 3, cols: 60},
			onClear: () => this.onClearTwist(),
			onErrors: () => this.onTwistErrors(),
			onSubmit: (output) => this.onSubmitTwist(output),
			reRender: () => this.send(),
		});

		const currentHost = this.room.userHostedGame && this.room.userHostedGame.isHost(user) ? true : false;

		if (!database.gameCustomGrids) database.gameCustomGrids = {};
		if (!(this.userId in database.gameCustomGrids)) database.gameCustomGrids[this.userId] = {
			grids: [],
		};

		this.customGrid = new CustomGrid(this, this.commandPrefix, customGridCommand, {
			htmlPageSelector: this.customGridSelector,
			savedCustomGrids: database.gameCustomGrids[this.userId],
			showSubmit: currentHost,
			onSubmit: (gridIndex, output) => this.submitCustomGridHtml(gridIndex, output),
		});

		this.components = [this.addPointsInput, this.removePointsInput, this.storedMessageInput, this.twistInput,
			this.customGrid];

		if (currentHost) {
			const hostDisplayProps: IHostDisplayProps = {
				currentBackground: hostDisplay ? hostDisplay.background : undefined,
				currentBackgroundBorder: hostDisplay ? hostDisplay.backgroundBorder : undefined,
				maxGifs,
				maxIcons,
				maxTrainers,
				clearBackgroundColor: (dontRender) => this.clearBackgroundColor(dontRender),
				setBackgroundColor: (color, dontRender) => this.setBackgroundColor(color, dontRender),
				clearPokemon: (index, dontRender) => this.clearPokemon(index, dontRender),
				selectPokemon: (index, pokemon, dontRender) => this.selectPokemon(index, pokemon, dontRender),
				clearRandomizedPokemon: () => this.clearRandomizedPokemon(),
				randomizePokemon: (pokemon) => this.randomizePokemon(pokemon),
				clearTrainer: (index, dontRender) => this.clearTrainer(index, dontRender),
				selectTrainer: (index, trainer, dontRender) => this.selectTrainer(index, trainer, dontRender),
				randomizeTrainers: (trainers) => this.randomizeTrainers(trainers),
				setGifOrIcon: (gifOrIcon, currentPokemon, dontRender) => this.setGifOrIcon(gifOrIcon, currentPokemon, dontRender),
				onClearBorderColor: (dontRender) => this.clearBorderColor(dontRender),
				onPickBorderColor: (color: IColorPick, dontRender: boolean | undefined) => this.setBorderColor(color, dontRender),
				onClearBorderRadius: (dontRender) => this.clearBorderRadius(dontRender),
				onPickBorderRadius: (radius, dontRender) => this.setBorderRadius(radius, dontRender),
				onClearBorderSize: (dontRender) => this.clearBorderSize(dontRender),
				onPickBorderSize: (size, dontRender) => this.setBorderSize(size, dontRender),
				onClearBorderType: (dontRender) => this.clearBorderType(dontRender),
				onPickBorderType: (type, dontRender) => this.setBorderType(type, dontRender),
				reRender: () => this.send(),
			};

			this.manualHostDisplaySelector = this.newSelector("manualhostdisplay", false);
			this.randomHostDisplaySelector = this.newSelector("randomhostdisplay", false);
			this.addSelector(this.manualHostDisplaySelector);
			this.addSelector(this.randomHostDisplaySelector);

			this.manualHostDisplay = new ManualHostDisplay(this, this.commandPrefix, manualHostDisplayCommand,
				Object.assign({htmlPageSelector: this.manualHostDisplaySelector}, hostDisplayProps));
			this.components.push(this.manualHostDisplay);

			this.randomHostDisplay = new RandomHostDisplay(this, this.commandPrefix, randomHostDisplayCommand,
				Object.assign({htmlPageSelector: this.randomHostDisplaySelector, random: true}, hostDisplayProps));
			this.components.push(this.randomHostDisplay);

			if (hostDisplay) {
				this.manualHostDisplay.loadHostDisplay(hostDisplay);
				this.randomHostDisplay.loadHostDisplay(hostDisplay);
			}
		}
	}

	static loadData(): void {
		if (this.GameHostControlPanelLoaded) return;

		for (const format of Games.getFormatList()) {
			if (format.canGetRandomAnswer && format.minigameCommand && !excludedHintGames.includes(format.id)) {
				this.compatibleHintGames.push(format.name);
			}
		}

		this.GameHostControlPanelLoaded = true;
	}

	initializeSelectors(): void {
		if (this.initializedSelectors) return;

		super.initializeSelectors();

		this.sendSelector(this.headerSelector!);
		this.toggleActiveComponents(true);
	}

	getDatabase(): IDatabase {
		const database = Storage.getDatabase(this.room);
		Storage.createGameHostDisplay(database, this.userId);

		return database;
	}

	chooseHostInformation(): void {
		if (this.currentView === 'hostinformation') return;

		this.currentView = 'hostinformation';

		this.toggleActiveComponents();
		this.send();
	}

	chooseCustomGrid(): void {
		if (this.currentView === 'customgrid') return;

		this.currentView = 'customgrid';

		this.toggleActiveComponents();
		this.send();
	}

	chooseManualHostDisplay(): void {
		if (this.currentView === 'manualhostdisplay' || !this.manualHostDisplay) return;

		this.currentView = 'manualhostdisplay';

		this.toggleActiveComponents();
		this.send();
	}

	chooseRandomHostDisplay(): void {
		if (this.currentView === 'randomhostdisplay' || !this.randomHostDisplay) return;

		this.currentView = 'randomhostdisplay';

		this.toggleActiveComponents();
		this.send();
	}

	chooseGenerateHints(): void {
		if (this.currentView === 'generatehints') return;

		this.currentView = 'generatehints';

		this.toggleActiveComponents();
		this.send();
	}

	toggleActiveComponents(onOpen?: boolean): void {
		if (!onOpen) this.sendSelector(this.headerSelector!);

		const hostInformation = this.currentView === 'hostinformation';
		const customGrid = this.currentView === 'customgrid';
		const generateHints = this.currentView === 'generatehints';
		const manualDisplay = this.currentView === 'manualhostdisplay';
		const randomDisplay = this.currentView === 'randomhostdisplay';

		if (hostInformation) {
			this.hideSelector(this.generateHintsSelector);
			this.generateHintsSelector.active = false;

			this.hostInformationSelector.active = true;
			this.sendSelector(this.hostInformationSelector);
		} else if (generateHints) {
			this.hideSelector(this.hostInformationSelector);
			this.hostInformationSelector.active = false;

			this.generateHintsSelector.active = true;
			this.sendSelector(this.generateHintsSelector);
		} else {
			this.hideSelector(this.generateHintsSelector);
			this.hideSelector(this.hostInformationSelector);

			this.generateHintsSelector.active = false;
			this.hostInformationSelector.active = false;
		}

		this.addPointsInput.toggleActive(hostInformation, onOpen);
		this.removePointsInput.toggleActive(hostInformation, onOpen);
		this.storedMessageInput.toggleActive(hostInformation, onOpen);
		this.twistInput.toggleActive(hostInformation, onOpen);
		this.customGrid.toggleActive(customGrid, onOpen);
		if (this.manualHostDisplay) this.manualHostDisplay.toggleActive(manualDisplay, onOpen);
		if (this.randomHostDisplay) this.randomHostDisplay.toggleActive(randomDisplay, onOpen);
	}

	onClearAddPoints(): void {
		this.send();
	}

	onAddPointsErrors(): void {
		this.send();
	}

	onSubmitAddPoints(output: string): void {
		if (!this.room.userHostedGame || !this.currentPlayer) return;

		const amount = parseInt(output.trim());
		if (isNaN(amount)) return;

		const user = Users.get(this.userName);
		if (user) {
			CommandParser.parse(this.room, user, Config.commandCharacter + "addpoint " + this.currentPlayer + ", " + amount, Date.now());
		}
	}

	onClearRemovePoints(): void {
		this.send();
	}

	onRemovePointsErrors(): void {
		this.send();
	}

	onSubmitRemovePoints(output: string): void {
		if (!this.room.userHostedGame || !this.currentPlayer) return;

		const amount = parseInt(output.trim());
		if (isNaN(amount)) return;

		const user = Users.get(this.userName);
		if (user) {
			CommandParser.parse(this.room, user, Config.commandCharacter + "removepoint " + this.currentPlayer + ", " + amount, Date.now());
		}
	}

	onClearStoreMessage(): void {
		this.send();
	}

	onStoreMessageErrors(): void {
		this.send();
	}

	onSubmitStoreMessage(output: string[]): void {
		if (!this.room.userHostedGame) return;

		const game = this.room.userHostedGame;
		const key = Tools.toId(output[0]);
		const message = output[1].trim();
		if (!game.storedMessages || !(key in game.storedMessages) || message !== game.storedMessages[key]) {
			const user = Users.get(this.userName);
			if (user) {
				CommandParser.parse(user, user, Config.commandCharacter + "store" + (key ? "m" : "") + " " + this.room.id + ", " +
					(key ? key + ", " : "") + message, Date.now());
			}
		}

		this.send();
	}

	onClearTwist(): void {
		this.send();
	}

	onTwistErrors(): void {
		this.send();
	}

	onSubmitTwist(output: string): void {
		if (!this.room.userHostedGame) return;

		const game = this.room.userHostedGame;
		const message = output.trim();
		if (!game.twist || message !== game.twist) {
			const user = Users.get(this.userName);
			if (user) {
				CommandParser.parse(user, user, Config.commandCharacter + "twist " + this.room.id + ", " + message, Date.now());
			}
		}

		this.send();
	}

	setCurrentPlayer(playerId: string): void {
		if (this.currentPlayer === playerId) return;

		this.currentPlayer = playerId;

		this.send();
	}

	clearBackgroundColor(dontRender: boolean | undefined): void {
		const database = this.getDatabase();
		delete database.gameHostDisplays![this.userId].background;

		if (!dontRender) this.send();
	}

	setBackgroundColor(color: IColorPick, dontRender: boolean | undefined): void {
		const database = this.getDatabase();
		database.gameHostDisplays![this.userId].background = Tools.colorPickToStorage(color);

		if (this.currentView === 'randomhostdisplay') {
			this.manualHostDisplay!.setRandomizedBackgroundColor(color.hueVariation, color.lightness, color.hexCode);
		}

		if (!dontRender) {
			if (this.autoSendDisplay) this.sendHostDisplay();
			this.send();
		}
	}

	clearPokemon(index: number, dontRender: boolean | undefined): void {
		this.currentPokemon[index] = undefined;

		this.storePokemon();

		if (!dontRender) this.send();
	}

	selectPokemon(index: number, pokemon: IPokemonPick, dontRender: boolean | undefined): void {
		this.currentPokemon[index] = pokemon;

		this.storePokemon();

		if (!dontRender) {
			if (this.autoSendDisplay) this.sendHostDisplay();
			this.send();
		}
	}

	clearRandomizedPokemon(): void {
		this.currentPokemon = [];

		this.storePokemon();

		this.send();
	}

	randomizePokemon(pokemon: PokemonChoices): void {
		this.manualHostDisplay!.loadHostDisplayPokemon(pokemon);
		this.currentPokemon = pokemon;

		this.storePokemon();

		if (this.autoSendDisplay) this.sendHostDisplay();
		this.send();
	}

	storePokemon(): void {
		const database = this.getDatabase();
		database.gameHostDisplays![this.userId].pokemon = this.currentPokemon.filter(x => x !== undefined);
	}

	clearTrainer(index: number, dontRender: boolean | undefined): void {
		this.currentTrainers[index] = undefined;

		this.storeTrainers();

		if (!dontRender) this.send();
	}

	selectTrainer(index: number, trainer: ITrainerPick, dontRender: boolean | undefined): void {
		this.currentTrainers[index] = trainer;

		this.storeTrainers();

		if (!dontRender) {
			if (this.autoSendDisplay) this.sendHostDisplay();
			this.send();
		}
	}

	randomizeTrainers(trainers: TrainerChoices): void {
		this.manualHostDisplay!.loadHostDisplayTrainers(trainers);
		this.currentTrainers = trainers;

		this.storeTrainers();

		if (this.autoSendDisplay) this.sendHostDisplay();
		this.send();
	}

	storeTrainers(): void {
		const database = this.getDatabase();
		database.gameHostDisplays![this.userId].trainers = this.currentTrainers.filter(x => x !== undefined);
	}

	setGifOrIcon(gifOrIcon: GifIcon, currentPokemon: PokemonChoices, dontRender: boolean | undefined): void {
		const database = this.getDatabase();
		database.gameHostDisplays![this.userId].gifOrIcon = gifOrIcon;

		if (this.currentView === 'manualhostdisplay') {
			this.randomHostDisplay!.setGifOrIcon(gifOrIcon, true);
		} else {
			this.manualHostDisplay!.setGifOrIcon(gifOrIcon, true);
		}

		this.currentPokemon = currentPokemon;

		if (!dontRender) this.send();
	}

	clearBorderColor(dontRender?: boolean): void {
		const database = this.getDatabase();

		if (database.gameHostDisplays![this.userId].backgroundBorder) {
			delete database.gameHostDisplays![this.userId].backgroundBorder!.color;
		}

		if (!dontRender) this.send();
	}

	setBorderColor(color: IColorPick, dontRender?: boolean): void {
		const database = this.getDatabase();

		if (!database.gameHostDisplays![this.userId].backgroundBorder) {
			database.gameHostDisplays![this.userId].backgroundBorder = {};
		}
		database.gameHostDisplays![this.userId].backgroundBorder!.color = Tools.colorPickToStorage(color);

		if (!dontRender) this.send();
	}

	clearBorderRadius(dontRender?: boolean): void {
		const database = this.getDatabase();

		if (database.gameHostDisplays![this.userId].backgroundBorder) {
			delete database.gameHostDisplays![this.userId].backgroundBorder!.radius;
		}

		if (!dontRender) this.send();
	}

	setBorderRadius(radius: number, dontRender?: boolean): void {
		const database = this.getDatabase();

		if (!database.gameHostDisplays![this.userId].backgroundBorder) {
			database.gameHostDisplays![this.userId].backgroundBorder = {};
		}
		database.gameHostDisplays![this.userId].backgroundBorder!.radius = radius;

		if (!dontRender) this.send();
	}

	clearBorderSize(dontRender?: boolean): void {
		const database = this.getDatabase();

		if (database.gameHostDisplays![this.userId].backgroundBorder) {
			delete database.gameHostDisplays![this.userId].backgroundBorder!.size;
		}

		if (!dontRender) this.send();
	}

	setBorderSize(size: number, dontRender?: boolean): void {
		const database = this.getDatabase();

		if (!database.gameHostDisplays![this.userId].backgroundBorder) {
			database.gameHostDisplays![this.userId].backgroundBorder = {};
		}
		database.gameHostDisplays![this.userId].backgroundBorder!.size = size;

		if (!dontRender) this.send();
	}

	clearBorderType(dontRender?: boolean): void {
		const database = this.getDatabase();

		if (database.gameHostDisplays![this.userId].backgroundBorder) {
			delete database.gameHostDisplays![this.userId].backgroundBorder!.type;
		}

		if (!dontRender) this.send();
	}

	setBorderType(type: BorderType, dontRender?: boolean): void {
		const database = this.getDatabase();

		if (!database.gameHostDisplays![this.userId].backgroundBorder) {
			database.gameHostDisplays![this.userId].backgroundBorder = {};
		}
		database.gameHostDisplays![this.userId].backgroundBorder!.type = type;

		if (!dontRender) this.send();
	}

	setAutoSend(autoSend: boolean): void {
		if (this.autoSendDisplay === autoSend) return;

		this.autoSendDisplay = autoSend;

		this.send();
	}

	generateHint(user: User, name: string): boolean {
		if (!GameHostControlPanel.compatibleHintGames.includes(name)) return false;

		const format = Games.getFormat(name);
		if (Array.isArray(format) || !format.canGetRandomAnswer) return false;

		if (user.game) user.game.deallocate(true);

		void (async () => {
			const game = await Games.createGame(user, format, {pmRoom: this.room, minigame: true});
			if (game) {
				if (!this.closed) {
					this.generateHintsGameHtml = game.getMascotAndNameHtml(undefined, true);
					this.generatedAnswer = game.getRandomAnswer!();

					let attempts = 0;
					while (this.exceedsMessageSizeLimit(this.generateHintsSelector) && attempts < 100) {
						attempts++;
						this.generatedAnswer = game.getRandomAnswer!();
					}

					if (this.exceedsMessageSizeLimit(this.generateHintsSelector)) {
						this.generatedAnswer = undefined;
						this.generatedAnswerErrorHtml = "A random answer could not be generated. Please try again!";
					} else {
						this.generatedAnswerErrorHtml = "";
					}

					this.send();
				}

				game.deallocate(true);
			}
		})();

		return true;
	}

	getTrainers(): ITrainerPick[] {
		return this.currentTrainers.filter(x => x !== undefined);
	}

	getPokemon(): IPokemonPick[] {
		return this.currentPokemon.filter(x => x !== undefined);
	}

	getHostDisplay(): string {
		const database = this.getDatabase();
		return Games.getHostCustomDisplay(this.userName, database.gameHostDisplays![this.userId]);
	}

	sendHostDisplay(): void {
		const user = Users.get(this.userName);
		if (!user || !this.room.userHostedGame || !this.room.userHostedGame.isHost(user)) return;

		const database = this.getDatabase();
		this.room.userHostedGame.sayHostDisplayUhtml(user, database.gameHostDisplays![this.userId],
			this.currentView === 'randomhostdisplay');
		this.send();
	}

	saveCustomGrid(index: number, gridData: ISavedCustomGridData): void {
		const database = this.getDatabase();
		if (!database.gameCustomGrids) database.gameCustomGrids = {};
		if (!(this.userId in database.gameCustomGrids)) {
			database.gameCustomGrids[this.userId] = {
				grids: [],
			};
		}

		database.gameCustomGrids[this.userId].grids[index] = gridData;
	}

	submitCustomGridHtml(gridIndex: number, output: string): void {
		const user = Users.get(this.userName);
		if (!user || !this.room.userHostedGame || !this.room.userHostedGame.isHost(user)) return;

		this.room.userHostedGame.sayCustomGridUhtml(user, gridIndex, output);
	}

	renderSelector(selector: HtmlSelector): string {
		const hostInformation = this.currentView === 'hostinformation';
		const customGrid = this.currentView === 'customgrid';
		const manualHostDisplay = this.currentView === 'manualhostdisplay';
		const randomHostDisplay = this.currentView === 'randomhostdisplay';
		const generateHints = this.currentView === 'generatehints';

		const user = Users.get(this.userId);
		const currentHost = user && this.room.userHostedGame && this.room.userHostedGame.isHost(user);

		let html = "";
		if (selector === this.headerSelector) {
			html += "<center><b>" + this.room.title + ": Hosting Control Panel</b>";
			html += "&nbsp;" + this.closeButtonHtml;
			html += "<br /><br />";

			html += "Options:";
			if (currentHost) {
				html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseHostInformation, "Host Information",
					{selectedAndDisabled: hostInformation});
			}
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseCustomGrid, "Customizable Grid",
				{selectedAndDisabled: customGrid});
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseGenerateHints, "Generate Hints",
				{selectedAndDisabled: generateHints});

			if (currentHost) {
				html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseCustomDisplay, "Pokemon GIFs & Trainers",
					{selectedAndDisabled: manualHostDisplay});
				html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseRandomDisplay, "Randomized Pokemon & Trainers",
					{selectedAndDisabled: randomHostDisplay});
			}

			html += "</center>";
		} else if (selector === this.hostInformationSelector) {
			html += "<h3>Host Information</h3>";

			const game = this.room.userHostedGame!;

			html += game.getMascotAndNameHtml();
			html += "<br />";
			html += "<b>Remaining time</b>: " + Tools.toDurationString(game.endTime - Date.now());
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + refreshCommand, "Refresh");
			if (game.gameTimerEndTime) {
				html += "<br /><br /><b>Game timer:</b> " + Tools.toDurationString(game.gameTimerEndTime - Date.now()) + " remaining";
				html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + refreshCommand, "Refresh");
			}
			html += "<hr />";

			const remainingPlayerCount = game.getRemainingPlayerCount();
			html += "<b>Players</b> (" + remainingPlayerCount + ")" + (remainingPlayerCount ? ":" : "");
			if (game.teams) {
				html += "<br />";
				for (const i in game.teams) {
					const team = game.teams[i];
					html += "Team " + team.name + (team.points ? " (" + team.points + ")" : "") + " - " +
						game.getPlayerNames(game.getRemainingPlayers(team.players));
					html += "<br />";
				}
			} else {
				html += " " + game.getPlayerPoints();
				html += "<br />";
			}

			if (game.savedWinners.length) html += "<br /><b>Saved winners</b>: " + Tools.joinList(game.savedWinners.map(x => x.name));

			const remainingPlayers = Object.keys(game.getRemainingPlayers());
			if (game.scoreCap || remainingPlayers.length) html += "<br /><b>Points management</b>:";
			if (game.scoreCap) html += "<br />(the score cap is <b>" + game.scoreCap + "</b>)";

			if (remainingPlayers.length) {
				html += "<br /><center>";
				html += this.getQuietPmButton(this.commandPrefix + ", " + setCurrentPlayerCommand, "Hide points controls",
					{selectedAndDisabled: !this.currentPlayer});

				if (game.teams) {
					html += "<br /><br />";
					for (const i in game.teams) {
						const remainingTeamPlayers = Object.keys(game.getRemainingPlayers(game.teams[i].players));
						if (remainingTeamPlayers.length) {
							html += "Team " + game.teams[i].name + ":";
							for (const playerId of remainingTeamPlayers) {
								const player = game.players[playerId];
								html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + setCurrentPlayerCommand + ", " +
									playerId, player.name, {selectedAndDisabled: this.currentPlayer === playerId});
							}
							html += "<br />";
						}
					}

					if (this.currentPlayer) html += "<br />";
				} else {
					for (const playerId of remainingPlayers) {
						const player = game.players[playerId];
						html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + setCurrentPlayerCommand + ", " + playerId,
							player.name, {selectedAndDisabled: this.currentPlayer === playerId});
					}

					if (this.currentPlayer) html += "<br /><br />";
				}

				if (this.currentPlayer) {
					html += this.addPointsInput.render();
					html += this.removePointsInput.render();
				}

				html += "</center>";
			}

			html += "<br />";

			html += "<b>Stored messages</b> (<code>[key] | [message]</code>):<br />";
			const storedMessageKeys = game.storedMessages ? Object.keys(game.storedMessages) : [];
			if (storedMessageKeys.length) {
				for (const key of storedMessageKeys) {
					html += "<br />" + Tools.escapeHTML(key || "(none)") + " | <code>" + Tools.escapeHTML(game.storedMessages![key]) +
						"</code>";
					html += "&nbsp;" + this.getQuietPmButton(Config.commandCharacter + "unstore, " + this.room.id +
						(key ? ", " + key : ""), "Clear");
					html += "&nbsp;" + Client.getMsgRoomButton(this.room,
						Config.commandCharacter + "stored" + (key ? " " + key : ""), "Send to " + this.room.title);
				}
				html += "<br />";
			}

			html += "<br />Store new message:<br /><br />" + this.storedMessageInput.render();

			html += "<br /><br />";

			html += "<b>Twist</b>: ";
			if (game.twist) {
				html += "<br />" + Tools.escapeHTML(game.twist);
				html += "&nbsp;" + this.getQuietPmButton(Config.commandCharacter + "removetwist, " + this.room.id, "Clear");
				html += "&nbsp;" + Client.getMsgRoomButton(this.room, Config.commandCharacter + "twist", "Send to " + this.room.title);
			}
			html += "<br /><br />";
			html += this.twistInput.render();
		} else if (selector === this.manualHostDisplaySelector || selector === this.randomHostDisplaySelector) {
			html += "<h3>" + (manualHostDisplay ? "Manual" : "Random") + " Display</h3>";

			const hostDisplay = this.getHostDisplay();
			html += hostDisplay;

			let disabledSend = !currentHost;
			if (!disabledSend && this.room.userHostedGame && this.room.userHostedGame.lastHostDisplayUhtml &&
				this.room.userHostedGame.lastHostDisplayUhtml.html === hostDisplay) {
				disabledSend = true;
			}
			html += "<center>" + this.getQuietPmButton(this.commandPrefix + ", " + sendDisplayCommand, "Send to " + this.room.title,
				{disabled: disabledSend}) + "</center>";

			html += "<br />";
			html += "Auto-send after any change: ";
			html += this.getQuietPmButton(this.commandPrefix + ", " + autoSendCommand + ", " + autoSendYes, "Yes",
				{disabled: !currentHost || this.autoSendDisplay});
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + autoSendCommand + ", " + autoSendNo, "No",
				{disabled: !currentHost || !this.autoSendDisplay});

			html += "<br /><br />";
			if (manualHostDisplay) {
				html += this.manualHostDisplay!.render();
			} else {
				html += this.randomHostDisplay!.render();
			}
		} else if (selector === this.generateHintsSelector) {
			html += "<h3>Generate Hints</h3>";

			if (this.generatedAnswer) {
				html += "<div class='infobox'>" + this.generateHintsGameHtml;
				html += "<br /><br />";
				html += this.generatedAnswer.hint;
				html += "<br /><br />";
				html += "<b>Answer" + (this.generatedAnswer.answers.length > 1 ? "s" : "") + "</b>: " +
					this.generatedAnswer.answers.join(", ") + "</div>";
			} else if (this.generatedAnswerErrorHtml) {
				html += this.generatedAnswerErrorHtml;
			} else {
				html += "<center><b>Click on a game's name to generate a hint and see the answer</b>!</center>";
			}
			html += "<br />";

			for (let i = 0; i < GameHostControlPanel.compatibleHintGames.length; i++) {
				const format = Games.getFormat(GameHostControlPanel.compatibleHintGames[i]);
				if (Array.isArray(format) || !format.canGetRandomAnswer) continue;

				if (i > 0) html += "&nbsp;";
				html += this.getQuietPmButton(this.commandPrefix + ", " + generateHintCommand + ", " + format.name, format.name);
			}
		} else {
			html += this.checkComponentSelectors(selector);
		}

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

			const cmd = Tools.toId(targets[0]);
			targets.shift();

			if (!cmd) {
				new GameHostControlPanel(targetRoom, user).open();
				return;
			}

			if (!(user.id in pages) && cmd !== CLOSE_COMMAND && cmd !== autoRefreshCommand && cmd !== setCurrentPlayerCommand &&
				cmd !== sendDisplayCommand) {
				new GameHostControlPanel(targetRoom, user);
			}

			if (cmd === chooseHostInformation) {
				pages[user.id].chooseHostInformation();
			} else if (cmd === chooseCustomGrid) {
				pages[user.id].chooseCustomGrid();
			} else if (cmd === chooseCustomDisplay) {
				pages[user.id].chooseManualHostDisplay();
			} else if (cmd === chooseRandomDisplay) {
				pages[user.id].chooseRandomHostDisplay();
			} else if (cmd === chooseGenerateHints) {
				pages[user.id].chooseGenerateHints();
			} else if (cmd === refreshCommand) {
				pages[user.id].send();
			} else if (cmd === autoRefreshCommand) {
				if (user.id in pages) pages[user.id].send();
			} else if (cmd === generateHintCommand) {
				const name = targets[0].trim();
				if (!pages[user.id].generateHint(user, name)) this.say("'" + name + "' is not a valid game for generating hints.");
			} else if (cmd === setCurrentPlayerCommand) {
				if (!(user.id in pages) || !targetRoom.userHostedGame || !targetRoom.userHostedGame.isHost(user)) return;

				pages[user.id].setCurrentPlayer(Tools.toId(targets[0]));
			} else if (cmd === autoSendCommand) {
				const option = targets[0].trim();
				if (option !== autoSendYes && option !== autoSendNo) {
					return this.say("'" + option + "' is not a valid auto-send option.");
				}

				pages[user.id].setAutoSend(option === autoSendYes);
			} else if (cmd === sendDisplayCommand) {
				if (!(user.id in pages)) return;
				pages[user.id].sendHostDisplay();
			} else if (cmd === CLOSE_COMMAND) {
				if (user.id in pages) pages[user.id].close();
			} else {
				const error = pages[user.id].checkComponentCommands(cmd, targets);
				if (error) this.say(error);
			}
		},
		aliases: ['ghcp'],
	},
};
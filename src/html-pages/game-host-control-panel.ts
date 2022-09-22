import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { ModelGeneration } from "../types/dex";
import type { IRandomGameAnswer } from "../types/games";
import type { BorderType } from "../types/tools";
import type { User } from "../users";
import type { IColorPick } from "./components/color-picker";
import { ManualHostDisplay } from "./components/manual-host-display";
import type { IHostDisplayProps } from "./components/host-display-base";
import type { IPokemonPick } from "./components/pokemon-picker-base";
import { RandomHostDisplay } from "./components/random-host-display";
import type { ITrainerPick } from "./components/trainer-picker";
import { CLOSE_COMMAND, HtmlPageBase } from "./html-page-base";
import { MultiTextInput } from "./components/multi-text-input";
import { TextInput } from "./components/text-input";
import { NumberTextInput } from "./components/number-text-input";
import type { IDatabase, GifIcon, IGameHostDisplay } from "../types/storage";

export type PokemonChoices = (IPokemonPick | undefined)[];
export type TrainerChoices = (ITrainerPick | undefined)[];

const excludedHintGames: string[] = ['hypnoshunches', 'mareaniesmarquees', 'pikachusmysterypokemon', 'smearglesmysterymoves',
'zygardesorders'];

const baseCommand = 'gamehostcontrolpanel';
const chooseHostInformation = 'choosehostinformation';
const chooseCustomDisplay = 'choosecustomdisplay';
const chooseRandomDisplay = 'chooserandomdisplay';
const chooseGenerateHints = 'choosegeneratehints';
const addPointsCommand = 'addpoints';
const removePointsCommand = 'removepoints';
const storedMessageInputCommand = 'storedmessage';
const twistInputCommand = 'twist';
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

	autoSendDisplay: boolean = false;
	currentView: 'hostinformation' | 'manualhostdisplay' | 'randomhostdisplay' | 'generatehints';
	currentPokemon: PokemonChoices = [];
	currentTrainers: TrainerChoices = [];
	currentPlayer: string = '';
	generateHintsGameHtml: string = '';
	generatedAnswer: IRandomGameAnswer | undefined = undefined;
	generatedAnswerErrorHtml: string = '';
	pokemonGeneration: ModelGeneration = 'xy';
	storedMessageInput: MultiTextInput;
	twistInput: TextInput;
	addPointsInput: NumberTextInput;
	removePointsInput: NumberTextInput;

	manualHostDisplay: ManualHostDisplay;
	randomHostDisplay: RandomHostDisplay;

	constructor(room: Room, user: User) {
		super(room, user, baseCommand, pages);

		GameHostControlPanel.loadData();

		this.setCloseButton();

		const database = Storage.getDatabase(this.room);
		let hostDisplay: IGameHostDisplay | undefined;

		if (database.gameHostDisplays && this.userId in database.gameHostDisplays) {
			hostDisplay = database.gameHostDisplays[this.userId];
		}

		this.currentView = room.userHostedGame && room.userHostedGame.isHost(user) ? 'hostinformation' : 'manualhostdisplay';
		const hostInformation = this.currentView === 'hostinformation';

		this.addPointsInput = new NumberTextInput(this, this.commandPrefix, addPointsCommand, {
			min: 1,
			label: "Add point(s)",
			submitText: "Add",
			onClear: () => this.onClearAddPoints(),
			onErrors: () => this.onAddPointsErrors(),
			onSubmit: (output) => this.onSubmitAddPoints(output),
			reRender: () => this.send(),
		});
		this.addPointsInput.active = hostInformation;

		this.removePointsInput = new NumberTextInput(this, this.commandPrefix, removePointsCommand, {
			min: 1,
			label: "Remove point(s)",
			submitText: "Remove",
			onClear: () => this.onClearRemovePoints(),
			onErrors: () => this.onRemovePointsErrors(),
			onSubmit: (output) => this.onSubmitRemovePoints(output),
			reRender: () => this.send(),
		});
		this.removePointsInput.active = hostInformation;

		this.storedMessageInput = new MultiTextInput(this, this.commandPrefix, storedMessageInputCommand, {
			inputCount: 2,
			labels: ['Key', 'Message'],
			textAreas: [false, true],
			textAreaConfigurations: [null, {rows: 3, cols: 60}],
			onClear: () => this.onClearStoreMessage(),
			onErrors: () => this.onStoreMessageErrors(),
			onSubmit: (output) => this.onSubmitStoreMessage(output),
			reRender: () => this.send(),
		});
		this.storedMessageInput.active = hostInformation;

		this.twistInput = new TextInput(this, this.commandPrefix, twistInputCommand, {
			currentInput: room.userHostedGame && room.userHostedGame.twist ? room.userHostedGame.twist : "",
			label: "Enter twist",
			textArea: true,
			textAreaConfiguration: {rows: 3, cols: 60},
			onClear: () => this.onClearTwist(),
			onErrors: () => this.onTwistErrors(),
			onSubmit: (output) => this.onSubmitTwist(output),
			reRender: () => this.send(),
		});
		this.twistInput.active = hostInformation;

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
			onClearBorderRadius: () => this.clearBorderRadius(),
			onPickBorderRadius: (radius) => this.setBorderRadius(radius),
			onClearBorderSize: () => this.clearBorderSize(),
			onPickBorderSize: (size) => this.setBorderSize(size),
			onClearBorderType: () => this.clearBorderType(),
			onPickBorderType: (type) => this.setBorderType(type),
			reRender: () => this.send(),
		};

		this.manualHostDisplay = new ManualHostDisplay(this, this.commandPrefix, manualHostDisplayCommand, hostDisplayProps);
		this.manualHostDisplay.active = !hostInformation;

		this.randomHostDisplay = new RandomHostDisplay(this, this.commandPrefix, randomHostDisplayCommand,
			Object.assign({random: true}, hostDisplayProps));
		this.randomHostDisplay.active = false;

		if (hostDisplay) {
			this.manualHostDisplay.loadHostDisplay(hostDisplay);
			this.randomHostDisplay.loadHostDisplay(hostDisplay);
		}

		this.components = [this.addPointsInput, this.removePointsInput, this.storedMessageInput, this.twistInput,
			this.manualHostDisplay, this.randomHostDisplay];
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

	getDatabase(): IDatabase {
		const database = Storage.getDatabase(this.room);
		Storage.createGameHostDisplay(database, this.userId);

		return database;
	}

	chooseHostInformation(): void {
		if (this.currentView === 'hostinformation') return;

		this.addPointsInput.active = true;
		this.removePointsInput.active = true;
		this.storedMessageInput.active = true;
		this.twistInput.active = true;
		this.randomHostDisplay.active = false;
		this.manualHostDisplay.active = false;
		this.currentView = 'hostinformation';

		this.send();
	}

	chooseManualHostDisplay(): void {
		if (this.currentView === 'manualhostdisplay') return;

		this.addPointsInput.active = false;
		this.removePointsInput.active = false;
		this.storedMessageInput.active = false;
		this.twistInput.active = false;
		this.manualHostDisplay.active = true;
		this.randomHostDisplay.active = false;
		this.currentView = 'manualhostdisplay';

		this.send();
	}

	chooseRandomHostDisplay(): void {
		if (this.currentView === 'randomhostdisplay') return;

		this.addPointsInput.active = false;
		this.removePointsInput.active = false;
		this.storedMessageInput.active = false;
		this.twistInput.active = false;
		this.randomHostDisplay.active = true;
		this.manualHostDisplay.active = false;
		this.currentView = 'randomhostdisplay';

		this.send();
	}

	chooseGenerateHints(): void {
		if (this.currentView === 'generatehints') return;

		this.addPointsInput.active = false;
		this.removePointsInput.active = false;
		this.storedMessageInput.active = false;
		this.twistInput.active = false;
		this.randomHostDisplay.active = false;
		this.manualHostDisplay.active = false;
		this.currentView = 'generatehints';

		this.send();
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
			this.manualHostDisplay.setRandomizedBackgroundColor(color.hueVariation, color.lightness, color.hexCode);
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
		this.manualHostDisplay.loadHostDisplayPokemon(pokemon);
		this.currentPokemon = pokemon;

		this.storePokemon();

		if (this.autoSendDisplay) this.sendHostDisplay();
		this.send();
	}

	storePokemon(): void {
		const database = this.getDatabase();
		database.gameHostDisplays![this.userId].pokemon = this.currentPokemon.filter(x => x !== undefined) as IPokemonPick[];
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
		this.manualHostDisplay.loadHostDisplayTrainers(trainers);
		this.currentTrainers = trainers;

		this.storeTrainers();

		if (this.autoSendDisplay) this.sendHostDisplay();
		this.send();
	}

	storeTrainers(): void {
		const database = this.getDatabase();
		database.gameHostDisplays![this.userId].trainers = this.currentTrainers.filter(x => x !== undefined) as ITrainerPick[];
	}

	setGifOrIcon(gifOrIcon: GifIcon, currentPokemon: PokemonChoices, dontRender: boolean | undefined): void {
		const database = this.getDatabase();
		database.gameHostDisplays![this.userId].gifOrIcon = gifOrIcon;

		if (this.currentView === 'manualhostdisplay') {
			this.randomHostDisplay.setGifOrIcon(gifOrIcon, true);
		} else {
			this.manualHostDisplay.setGifOrIcon(gifOrIcon, true);
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

	clearBorderRadius(): void {
		const database = this.getDatabase();

		if (database.gameHostDisplays![this.userId].backgroundBorder) {
			delete database.gameHostDisplays![this.userId].backgroundBorder!.radius;
		}

		this.send();
	}

	setBorderRadius(radius: number): void {
		const database = this.getDatabase();

		if (!database.gameHostDisplays![this.userId].backgroundBorder) {
			database.gameHostDisplays![this.userId].backgroundBorder = {};
		}
		database.gameHostDisplays![this.userId].backgroundBorder!.radius = radius;

		this.send();
	}

	clearBorderSize(): void {
		const database = this.getDatabase();

		if (database.gameHostDisplays![this.userId].backgroundBorder) {
			delete database.gameHostDisplays![this.userId].backgroundBorder!.size;
		}

		this.send();
	}

	setBorderSize(size: number): void {
		const database = this.getDatabase();

		if (!database.gameHostDisplays![this.userId].backgroundBorder) {
			database.gameHostDisplays![this.userId].backgroundBorder = {};
		}
		database.gameHostDisplays![this.userId].backgroundBorder!.size = size;

		this.send();
	}

	clearBorderType(): void {
		const database = this.getDatabase();

		if (database.gameHostDisplays![this.userId].backgroundBorder) {
			delete database.gameHostDisplays![this.userId].backgroundBorder!.type;
		}

		this.send();
	}

	setBorderType(type: BorderType): void {
		const database = this.getDatabase();

		if (!database.gameHostDisplays![this.userId].backgroundBorder) {
			database.gameHostDisplays![this.userId].backgroundBorder = {};
		}
		database.gameHostDisplays![this.userId].backgroundBorder!.type = type;

		this.send();
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

		const game = Games.createGame(user, format, {pmRoom: this.room, minigame: true});
		if (game) {
			this.generateHintsGameHtml = game.getMascotAndNameHtml(undefined, true);
			this.generatedAnswer = game.getRandomAnswer!();

			let attempts = 0;
			while (this.exceedsMessageSizeLimit() && attempts < 100) {
				attempts++;
				this.generatedAnswer = game.getRandomAnswer!();
			}

			if (this.exceedsMessageSizeLimit()) {
				this.generatedAnswer = undefined;
				this.generatedAnswerErrorHtml = "A random answer could not be generated. Please try again!";
			} else {
				this.generatedAnswerErrorHtml = "";
			}

			game.deallocate(true);
		}

		this.send();

		return true;
	}

	getTrainers(): ITrainerPick[] {
		return this.currentTrainers.filter(x => x !== undefined) as ITrainerPick[];
	}

	getPokemon(): IPokemonPick[] {
		return this.currentPokemon.filter(x => x !== undefined) as IPokemonPick[];
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

	render(): string {
		let html = "<div class='chat' style='margin-top: 4px;margin-left: 4px'><center><b>" + this.room.title + ": Hosting Control " +
			"Panel</b>";
		html += "&nbsp;" + this.closeButtonHtml;
		html += "<br /><br />";

		const user = Users.get(this.userId);
		const currentHost = user && this.room.userHostedGame && this.room.userHostedGame.isHost(user);

		const hostInformation = this.currentView === 'hostinformation';
		const manualHostDisplay = this.currentView === 'manualhostdisplay';
		const randomHostDisplay = this.currentView === 'randomhostdisplay';
		const generateHints = this.currentView === 'generatehints';

		html += "Options:";
		if (currentHost) {
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseHostInformation, "Host Information",
				{selectedAndDisabled: hostInformation});
		}
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseCustomDisplay, "Manual Display",
			{selectedAndDisabled: manualHostDisplay});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseRandomDisplay, "Random Display",
			{selectedAndDisabled: randomHostDisplay});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseGenerateHints, "Generate Hints",
			{selectedAndDisabled: generateHints});
		html += "</center>";

		if (hostInformation) {
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
		} else if (manualHostDisplay || randomHostDisplay) {
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
				html += this.manualHostDisplay.render();
			} else {
				html += this.randomHostDisplay.render();
			}
		} else {
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
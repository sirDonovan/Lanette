import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { IDatabase, IGameVoteBox } from "../types/storage";
import type { BorderType } from "../types/tools";
import type { User } from "../users";
import { BorderStyle } from "./components/border-style";
import type { IColorPick } from "./components/color-picker";
import { ColorPicker } from "./components/color-picker";
import { PokemonChoices, PokemonPickerBase } from "./components/pokemon-picker-base";
import { PokemonTextInput } from "./components/pokemon-text-input";
import { CLOSE_COMMAND, HtmlPageBase } from "./html-page-base";

type BorderPickers = 'background' | 'buttons' | 'signups-background';
type BorderDatabaseKeys = 'backgroundBorder' | 'buttonsBorder' | 'signupsBackgroundBorder';

const baseCommand = 'gamevotebox';
const setGamePokemonAvatarCommand = 'setgamepokemonavatar';
const chooseHome = 'choosehome';
const chooseBackgroundColorPicker = 'choosebackgroundcolorpicker';
const chooseButtonColorPicker = 'choosebuttoncolorpicker';
const chooseBackgroundBorderPicker = 'choosebackgroundborderpicker';
const chooseButtonsBorderPicker = 'choosebuttonsborderpicker';
const chooseSignupsBackgroundColorPicker = 'choosesignupsbackgroundcolorpicker';
const chooseSignupsBackgroundBorderPicker = 'choosesignupsbackgroundborderpicker';
const setBackgroundColorCommand = 'setbackgroundcolor';
const setButtonColorCommand = 'setbuttonscolor';
const setSignupsBackgroundColorCommand = 'setsignupsbackgroundcolor';
const setBackgroudBorderStyleCommand = 'setbackgroundborderstyle';
const setButtonBorderStyleCommand = 'setbuttonborderstyle';
const setSignupsBackgroundBorderStyleCommand = 'setsignupsbuttonborderstyle';

export const pageId = 'game-vote-box';
export const pages: Dict<GameVoteBox> = {};

class GameVoteBox extends HtmlPageBase {
	pageId = pageId;

	pokemonAvatar: boolean;

	backgroundColorPicker!: ColorPicker;
	buttonColorPicker!: ColorPicker;
	signupsBackgroundColorPicker!: ColorPicker;
	backgroundBorderStyle!: BorderStyle;
	buttonsBorderStyle!: BorderStyle;
	signupsBackgroundBorderStyle!: BorderStyle;
	pokemonAvatarPicker!: PokemonTextInput;
	currentPicker: 'background' | 'buttons' | 'background-border' | 'buttons-border' | 'signups-background' | 'signups-background-border' |
		'home';
	selectedColor: string = "#000000";

	constructor(room: Room, user: User, pokemonAvatar: boolean) {
		super(room, user, baseCommand, pages);

		this.pokemonAvatar = pokemonAvatar;
		this.currentPicker = 'home';
		this.setCloseButton();

		this.resetComponents();
	}

	resetComponents(): void {
		const database = this.getDatabase();
		const gameVoteBox = this.getVoteBox();
		const currentGamePokemonAvatar = database.gameVoteBoxes![this.userId].pokemonAvatar;

		this.backgroundColorPicker = new ColorPicker(this, this.commandPrefix, setBackgroundColorCommand, {
			name: "Background",
			currentPick: typeof gameVoteBox.background === 'string' ? gameVoteBox.background : undefined,
			currentPickObject: gameVoteBox.background && typeof gameVoteBox.background !== 'string' ?
				gameVoteBox.background : undefined,
			pokemon: currentGamePokemonAvatar,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickBackgroundHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickBackgroundLightness(dontRender),
			onClear: (index, dontRender) => this.clearBackgroundColor(dontRender),
			onPick: (index, color, dontRender) => this.setBackgroundColor(color, dontRender),
			reRender: () => this.send(),
		});

		this.buttonColorPicker = new ColorPicker(this, this.commandPrefix, setButtonColorCommand, {
			name: "Buttons",
			button: true,
			currentPick: typeof gameVoteBox.buttons === 'string' ? gameVoteBox.buttons : undefined,
			currentPickObject: gameVoteBox.buttons && typeof gameVoteBox.buttons !== 'string' ?
				gameVoteBox.buttons : undefined,
			pokemon: currentGamePokemonAvatar,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickButtonHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickButtonLightness(dontRender),
			onClear: (index, dontRender) => this.clearButtonsColor(dontRender),
			onPick: (index, color, dontRender) => this.setButtonsColor(color, dontRender),
			reRender: () => this.send(),
		});

		this.signupsBackgroundColorPicker = new ColorPicker(this, this.commandPrefix, setSignupsBackgroundColorCommand, {
			name: "Votes background",
			currentPick: typeof gameVoteBox.signupsBackground === 'string' ? gameVoteBox.signupsBackground : undefined,
			currentPickObject: gameVoteBox.signupsBackground && typeof gameVoteBox.signupsBackground !== 'string' ?
				gameVoteBox.signupsBackground : undefined,
			pokemon: currentGamePokemonAvatar,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickSignupsBackgroundHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickSignupsBackgroundLightness(dontRender),
			onClear: (index, dontRender) => this.clearSignupsBackgroundColor(dontRender),
			onPick: (index, color, dontRender) => this.setSignupsBackgroundColor(color, dontRender),
			reRender: () => this.send(),
		});

		PokemonPickerBase.loadData();

		this.pokemonAvatarPicker = new PokemonTextInput(this, this.commandPrefix, setGamePokemonAvatarCommand, {
			currentInput: currentGamePokemonAvatar ? currentGamePokemonAvatar : "",
			inputWidth: Tools.minRoomWidth,
			minPokemon: 1,
			maxPokemon: 1,
			placeholder: "Enter a Pokemon",
			clearText: "Clear",
			submitText: "Update",
			onClear: () => this.clearPokemonAvatar(),
			onSubmit: (output) => this.selectPokemonAvatar(output),
			reRender: () => this.send(),
		});

		this.backgroundBorderStyle = new BorderStyle(this, this.commandPrefix, setBackgroudBorderStyleCommand, {
			currentBorder: gameVoteBox.backgroundBorder,
			minRadius: 2,
			maxRadius: 50,
			minSize: 2,
			maxSize: 5,
			pokemon: currentGamePokemonAvatar,
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
			button: true,
			currentBorder: gameVoteBox.buttonsBorder,
			minRadius: 2,
			maxRadius: 50,
			minSize: 2,
			maxSize: 5,
			pokemon: currentGamePokemonAvatar,
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

		this.signupsBackgroundBorderStyle = new BorderStyle(this, this.commandPrefix, setSignupsBackgroundBorderStyleCommand, {
			currentBorder: gameVoteBox.backgroundBorder,
			minRadius: 2,
			maxRadius: 50,
			minSize: 2,
			maxSize: 5,
			pokemon: currentGamePokemonAvatar,
			onClearColor: (dontRender) => this.clearBorderColor('signups-background', dontRender),
			onPickColor: (color: IColorPick, dontRender: boolean | undefined) => this.setBorderColor('signups-background', color,
				dontRender),
			onClearRadius: () => this.clearBorderRadius('signups-background'),
			onPickRadius: (radius) => this.setBorderRadius('signups-background', radius),
			onClearSize: () => this.clearBorderSize('signups-background'),
			onPickSize: (size) => this.setBorderSize('signups-background', size),
			onClearType: () => this.clearBorderType('signups-background'),
			onPickType: (type) => this.setBorderType('signups-background', type),
			reRender: () => this.send(),
		});

		this.toggleActivePicker();

		this.components = [this.backgroundColorPicker, this.buttonColorPicker, this.backgroundBorderStyle, this.buttonsBorderStyle,
			this.signupsBackgroundColorPicker, this.signupsBackgroundBorderStyle, this.pokemonAvatarPicker];

		const colorPickers = [this.backgroundColorPicker, this.buttonColorPicker, this.signupsBackgroundColorPicker];
		for (const colorPicker of colorPickers) {
			colorPicker.registerCopySources(colorPickers);
		}
	}

	getDatabase(): IDatabase {
		const database = Storage.getDatabase(this.room);
		if (!(this.userId in database.gameVoteBoxes!)) database.gameVoteBoxes![this.userId] = {};

		return database;
	}

	getVoteBox(): IGameVoteBox {
		const database = this.getDatabase();
		return database.gameVoteBoxes![this.userId];
	}

	toggleActivePicker(): void {
		this.pokemonAvatarPicker.active = this.currentPicker === 'home';
		this.backgroundColorPicker.active = this.currentPicker === 'background';
		this.buttonColorPicker.active = this.currentPicker === 'buttons';
		this.backgroundBorderStyle.active = this.currentPicker === 'background-border';
		this.buttonsBorderStyle.active = this.currentPicker === 'buttons-border';
		this.signupsBackgroundColorPicker.active = this.currentPicker === 'signups-background';
		this.signupsBackgroundBorderStyle.active = this.currentPicker === 'signups-background-border';
	}

	chooseHome(): void {
		if (this.currentPicker === 'home') return;

		this.currentPicker = 'home';
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

	chooseSignupsBackgroundColorPicker(): void {
		if (this.currentPicker === 'signups-background') return;

		this.currentPicker = 'signups-background';
		this.toggleActivePicker();

		this.send();
	}

	chooseSignupsBackgroundBorderPicker(): void {
		if (this.currentPicker === 'signups-background-border') return;

		this.currentPicker = 'signups-background-border';
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
		const voteBox = this.getVoteBox();
		delete voteBox.background;

		if (!dontRender) this.send();
	}

	setBackgroundColor(color: IColorPick, dontRender?: boolean): void {
		const voteBox = this.getVoteBox();
		voteBox.background = Tools.colorPickToStorage(color);

		if (!dontRender) this.send();
	}

	pickButtonHueVariation(dontRender?: boolean): void {
		if (!dontRender) this.send();
	}

	pickButtonLightness(dontRender?: boolean): void {
		if (!dontRender) this.send();
	}

	clearButtonsColor(dontRender?: boolean): void {
		const voteBox = this.getVoteBox();
		delete voteBox.buttons;

		if (!dontRender) this.send();
	}

	setButtonsColor(color: IColorPick, dontRender?: boolean): void {
		const voteBox = this.getVoteBox();
		voteBox.buttons = Tools.colorPickToStorage(color);

		if (!dontRender) this.send();
	}

	pickSignupsBackgroundHueVariation(dontRender?: boolean): void {
		if (!dontRender) this.send();
	}

	pickSignupsBackgroundLightness(dontRender?: boolean): void {
		if (!dontRender) this.send();
	}

	clearSignupsBackgroundColor(dontRender?: boolean): void {
		const voteBox = this.getVoteBox();
		delete voteBox.signupsBackground;

		if (!dontRender) this.send();
	}

	setSignupsBackgroundColor(color: IColorPick, dontRender?: boolean): void {
		const voteBox = this.getVoteBox();
		voteBox.signupsBackground = Tools.colorPickToStorage(color);

		if (!dontRender) this.send();
	}

	clearPokemonAvatar(): void {
		const database = this.getDatabase();

		delete database.gameVoteBoxes![this.userId].pokemonAvatar;

		this.send();
	}

	selectPokemonAvatar(choices: PokemonChoices): void {
		const database = this.getDatabase();

		const pokemon = choices[0]!.pokemon;
		database.gameVoteBoxes![this.userId].pokemonAvatar = pokemon;

		this.backgroundColorPicker.parentSetPokemon(pokemon);
		this.buttonColorPicker.parentSetPokemon(pokemon);
		this.signupsBackgroundColorPicker.parentSetPokemon(pokemon);

		this.send();
	}

	getBorderDatabaseKey(picker: BorderPickers): BorderDatabaseKeys {
		if (picker === 'background') {
			return 'backgroundBorder';
		} else if (picker === 'buttons') {
			return 'buttonsBorder';
		} else {
			return 'signupsBackgroundBorder';
		}
	}

	clearBorderColor(picker: BorderPickers, dontRender?: boolean): void {
		const voteBox = this.getVoteBox();
		const databaseKey = this.getBorderDatabaseKey(picker);

		if (databaseKey in voteBox) {
			delete voteBox[databaseKey]!.color;
		}

		if (!dontRender) this.send();
	}

	setBorderColor(picker: BorderPickers, color: IColorPick, dontRender?: boolean): void {
		const voteBox = this.getVoteBox();
		const databaseKey = this.getBorderDatabaseKey(picker);

		if (!(databaseKey in voteBox)) {
			voteBox[databaseKey] = {};
		}
		voteBox[databaseKey]!.color = Tools.colorPickToStorage(color);

		if (!dontRender) this.send();
	}

	clearBorderRadius(picker: BorderPickers): void {
		const voteBox = this.getVoteBox();
		const databaseKey = this.getBorderDatabaseKey(picker);

		if (databaseKey in voteBox) {
			delete voteBox[databaseKey]!.radius;
		}

		this.send();
	}

	setBorderRadius(picker: BorderPickers, radius: number): void {
		const voteBox = this.getVoteBox();
		const databaseKey = this.getBorderDatabaseKey(picker);

		if (!(databaseKey in voteBox)) {
			voteBox[databaseKey] = {};
		}
		voteBox[databaseKey]!.radius = radius;

		this.send();
	}

	clearBorderSize(picker: BorderPickers): void {
		const voteBox = this.getVoteBox();
		const databaseKey = this.getBorderDatabaseKey(picker);

		if (databaseKey in voteBox) {
			delete voteBox[databaseKey]!.size;
		}

		this.send();
	}

	setBorderSize(picker: BorderPickers, size: number): void {
		const voteBox = this.getVoteBox();
		const databaseKey = this.getBorderDatabaseKey(picker);

		if (!(databaseKey in voteBox)) {
			voteBox[databaseKey] = {};
		}
		voteBox[databaseKey]!.size = size;

		this.send();
	}

	clearBorderType(picker: BorderPickers): void {
		const voteBox = this.getVoteBox();
		const databaseKey = this.getBorderDatabaseKey(picker);

		if (databaseKey in voteBox) {
			delete voteBox[databaseKey]!.type;
		}

		this.send();
	}

	setBorderType(picker: BorderPickers, type: BorderType): void {
		const voteBox = this.getVoteBox();
		const databaseKey = this.getBorderDatabaseKey(picker);

		if (!(databaseKey in voteBox)) {
			voteBox[databaseKey] = {};
		}
		voteBox[databaseKey]!.type = type;

		this.send();
	}

	render(): string {
		let name = this.userId;
		const user = Users.get(this.userId);
		if (user) name = user.name;

		let html = "<div class='chat' style='margin-top: 4px;margin-left: 4px'><center><b>" + this.room.title + ": Game Vote Box</b>";
		html += "&nbsp;" + this.closeButtonHtml;

		const voteBox = this.getVoteBox();

		let pokemonIcon = "";
		if (voteBox.pokemonAvatar) {
			pokemonIcon = Dex.getPokemonIcon(Dex.getPokemon(voteBox.pokemonAvatar));
		}

		const buttonStyle = Games.getCustomBoxButtonStyle(voteBox);
		let voteHtml = "<h3>" + name + "'s Scripted Game Voting #0" + pokemonIcon + "</h3>Vote for the next scripted game " +
			"with the command <code>" + Config.commandCharacter + "vote [name]</code>!";
		voteHtml += '<br />';
		voteHtml += Client.getClientCommandButton("/dummy", "Enable voting highlights", false, buttonStyle);
		voteHtml += Client.getClientCommandButton("/dummy", "Disable voting highlights", false, buttonStyle);
		voteHtml += '<br /><br />';

		voteHtml += "<b>" + Users.self.name + "'s suggestions:</b><br />";
		voteHtml += Client.getClientCommandButton("/dummy", "Least played game", false, buttonStyle);
		voteHtml += " | ";
		voteHtml += Client.getClientCommandButton("/dummy", "Random game", false, buttonStyle);
		voteHtml += " | ";
		voteHtml += Client.getClientCommandButton("/dummy", "Random freejoin game", false, buttonStyle);

		voteHtml += '<br /><br />';
		voteHtml += Client.getClientCommandButton("/dummy", "View current votable games", false, buttonStyle);
		voteHtml += '<br />';
		voteHtml += "<br /><br /><b>Past games (cannot be voted for)</b>: Sample Game";
		voteHtml += "<br />&nbsp;";

		html += Games.getCustomBoxDiv(voteHtml, voteBox);

		html += Games.getCustomBoxDiv("<h3>Current votes</h3>Sample Game: " + name + "<br />&nbsp;", voteBox, undefined, 'signups');
		html += "</center><br />";

		const home = this.currentPicker === 'home';
		const background = this.currentPicker === 'background';
		const buttons = this.currentPicker === 'buttons';
		const backgroundBorder = this.currentPicker === 'background-border';
		const buttonsBorder = this.currentPicker === 'buttons-border';
		const signupsBackground = this.currentPicker === 'signups-background';
		const signupsBackgroundBorder = this.currentPicker === 'signups-background-border';

		let navigation = "";
		let component = "";
		if (home) {
			navigation += this.getQuietPmButton(this.commandPrefix + ", " + chooseBackgroundColorPicker, "Background",
				{selectedAndDisabled: background});
			navigation += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseBackgroundBorderPicker, "Background border",
				{selectedAndDisabled: backgroundBorder});
			navigation += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseButtonColorPicker, "Buttons",
				{selectedAndDisabled: buttons});
			navigation += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseButtonsBorderPicker, "Buttons border",
				{selectedAndDisabled: buttonsBorder});
			navigation += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseSignupsBackgroundColorPicker,
				"Votes background color", {selectedAndDisabled: signupsBackground});
			navigation += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseSignupsBackgroundBorderPicker,
				"Votes background border", {selectedAndDisabled: signupsBackgroundBorder});

			if (this.pokemonAvatar) {
				component += "<br /><br />";
				component += "<b>Pokemon avatar</b><br />";
				component += this.pokemonAvatarPicker.render();
			}
		} else {
			navigation += this.getQuietPmButton(this.commandPrefix + ", " + chooseHome, "&larr; Home") +" ";
		}

		if (background) {
			navigation += "<b>Background color</b>";
			component += " | ";
			component += this.backgroundColorPicker.render();
		} else if (buttons) {
			navigation += "<b>Buttons background color</b>";
			component += " | ";
			component += this.buttonColorPicker.render();
		} else if (backgroundBorder) {
			navigation += "<b>Background border</b>";
			component += "<br /><br />";
			component += this.backgroundBorderStyle.render();
		} else if (buttonsBorder) {
			navigation += "<b>Buttons border</b>";
			component += "<br /><br />";
			component += this.buttonsBorderStyle.render();
		} else if (signupsBackground) {
			navigation += "<b>Votes background color</b>";
			component += " | ";
			component += this.signupsBackgroundColorPicker.render();
		} else if (signupsBackgroundBorder) {
			navigation += "<b>Votes background border</b>";
			component += "<br /><br />";
			component += this.signupsBackgroundBorderStyle.render();
		}

		html += navigation;

		if (component) {
			html += component;
		}

		html += "<br /><br />";

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

			const checkBits = !user.hasRank(targetRoom, 'voice') && !user.isDeveloper();
			const database = Storage.getDatabase(targetRoom);
			const annualBits = Storage.getAnnualPoints(targetRoom, Storage.gameLeaderboard, user.name);

			if (!database.gameVoteBoxes) database.gameVoteBoxes = {};

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
				new GameVoteBox(targetRoom, user, pokemonAvatar).open();
				return;
			}

			if (!(user.id in pages) && cmd !== CLOSE_COMMAND) new GameVoteBox(targetRoom, user, pokemonAvatar);

			if (cmd === chooseBackgroundColorPicker) {
				pages[user.id].chooseBackgroundColorPicker();
			} else if (cmd === chooseButtonColorPicker) {
				pages[user.id].chooseButtonColorPicker();
			} else if (cmd === chooseHome) {
				pages[user.id].chooseHome();
			} else if (cmd === chooseBackgroundBorderPicker) {
				pages[user.id].chooseBackgroundBorderPicker();
			} else if (cmd === chooseButtonsBorderPicker) {
				pages[user.id].chooseButtonsBorderPicker();
			} else if (cmd === chooseSignupsBackgroundColorPicker) {
				pages[user.id].chooseSignupsBackgroundColorPicker();
			} else if (cmd === chooseSignupsBackgroundBorderPicker) {
				pages[user.id].chooseSignupsBackgroundBorderPicker();
			} else if (cmd === CLOSE_COMMAND) {
				if (user.id in pages) pages[user.id].close();
			} else {
				const error = pages[user.id].checkComponentCommands(cmd, targets);
				if (error) this.say(error);
			}
		},
		aliases: ['gvb'],
	},
};
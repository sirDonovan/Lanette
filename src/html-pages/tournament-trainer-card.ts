import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { IDatabase, ITournamentTrainerCard } from "../types/storage";
import type { User } from "../users";
import { TrainerPicker } from "./components/trainer-picker";
import type { ITrainerPick } from "./components/trainer-picker";
import { HtmlPageBase } from "./html-page-base";
import { FormatTextInput } from "./components/format-text-input";
import type { IFormat } from "../types/pokemon-showdown";
import { TrainerCardBadgePicker } from "./components/trainer-card-badge-picker";
import { TextInput } from "./components/text-input";
import { ColorPicker, type IColorPick } from "./components/color-picker";
import { PokemonTextInput } from "./components/pokemon-text-input";
import { PokemonPickerBase } from "./components/pokemon-picker-base";
import type { PokemonChoices } from "./game-host-control-panel";
import { NamePicker } from "./components/name-picker";

const baseCommand = 'tournamenttrainercard';
const baseCommandAlias = 'ttc';
const viewAllCommand = 'view';
const staffEditCommand = 'staffedit';

const chooseTrainerPicker = 'choosetrainerpicker';
const chooseFormatPicker = 'chooseformatpicker';
const chooseBadgesView = 'choosebadgesview';
const chooseBioView = 'choosebioview';
const chooseHeaderView = 'chooseheaderview';
const chooseTableView = 'choosetableview';
const chooseFooterView = 'choosefooterview';
const choosePokemonView = 'choosepokemonview';

const setFormatCommand = 'setformat';
const setTrainerCommand = 'settrainer';
const setBadgesCommand = 'setbadges';
const setBioCommand = 'setbio';
const setHeaderColorCommand = 'setheadercolor';
const setTableColorCommand = 'settablecolor';
const setFooterColorCommand = 'setfootercolor';
const setPokemonCommand = 'setpokemon';
const setTargetUserIdCommand = 'settargetuserid';
const closeCommand = 'close';

const pageId = 'tournament-trainer-card';

export const id = pageId;
export const pages: Dict<TournamentTrainerCard> = {};

interface ITournamentTrainerCardOptions {
	targetUserId?: string;
	viewAllMode?: boolean;
}

class TournamentTrainerCard extends HtmlPageBase {
	pageId = pageId;

	currentPicker: 'badges' | 'bio' | 'format' | 'footer' | 'header' | 'pokemon' | 'table' | 'trainer' = 'trainer';
	trainerCardUserIdNames: Dict<string> = {};

	trainerCardUserIds: string[];
	trainerCardUserIdPicker: NamePicker;
	targetUserId: string | undefined;
	viewAllMode: boolean;

	// set in loadTournamentTrainerCard()
	bioInput!: TextInput;
	footerColorPicker!: ColorPicker;
	formatPicker!: FormatTextInput;
	headerColorPicker!: ColorPicker;
	tableColorPicker!: ColorPicker;
	pokemonPicker!: PokemonTextInput;
	trainerPicker!: TrainerPicker;
	trainerCardBadgePicker!: TrainerCardBadgePicker;

	constructor(room: Room, user: User, options?: ITournamentTrainerCardOptions) {
		super(room, user, baseCommandAlias, pages);

		this.targetUserId = (options && options.targetUserId) || this.userId;
		this.viewAllMode = options && options.viewAllMode ? true : false;
		this.readonly = this.viewAllMode;

		const database = Storage.getDatabase(this.room);
		if (database.tournamentTrainerCards) {
			this.trainerCardUserIds = Object.keys(database.tournamentTrainerCards).sort();
			for (const userId of this.trainerCardUserIds) {
				const targetUser = Users.get(userId);
				this.trainerCardUserIdNames[userId] = targetUser ? targetUser.name : database.tournamentLeaderboard &&
					userId in database.tournamentLeaderboard.entries ? database.tournamentLeaderboard.entries[userId].name : userId;
			}
		} else {
			this.trainerCardUserIds = [];
		}

		this.trainerCardUserIdPicker = new NamePicker(room, this.commandPrefix, setTargetUserIdCommand, {
			currentPick: this.targetUserId,
			names: this.trainerCardUserIds,
			namesHtml: this.trainerCardUserIdNames,
			label: "Choose a user",
			pagesLabel: "Names",
			onClear: (index, dontRender) => this.clearTargetUserId(dontRender),
			onPick: (index, name, dontRender) => this.selectTargetUserId(name, dontRender),
			reRender: () => this.send(),
		});
		this.trainerCardUserIdPicker.active = this.viewAllMode;

		this.loadTournamentTrainerCard();
	}

	getDatabase(): IDatabase {
		let targetRoom = this.room;
		if (Config.sharedTournamentTrainerCards && this.room.id in Config.sharedTournamentTrainerCards) {
			targetRoom = Rooms.get(Config.sharedTournamentTrainerCards[this.room.id])!;
		}

		const database = Storage.getDatabase(targetRoom);
		if (this.targetUserId) Storage.createTournamentTrainerCard(database, this.targetUserId);

		return database;
	}

	chooseTrainerPicker(): void {
		if (this.currentPicker === 'trainer') return;

		this.currentPicker = 'trainer';
		this.toggleActivePicker();

		this.send();
	}

	chooseFormatPicker(): void {
		if (this.currentPicker === 'format') return;

		this.currentPicker = 'format';
		this.toggleActivePicker();

		this.send();
	}

	chooseBadgesView(): void {
		if (!this.isRoomStaff || this.currentPicker === 'badges') return;

		this.currentPicker = 'badges';
		this.toggleActivePicker();

		this.send();
	}

	chooseBioView(): void {
		if (!this.isRoomStaff || this.currentPicker === 'bio') return;

		this.currentPicker = 'bio';
		this.toggleActivePicker();

		this.send();
	}

	chooseHeaderView(): void {
		if (this.currentPicker === 'header') return;

		this.currentPicker = 'header';
		this.toggleActivePicker();

		this.send();
	}

	chooseTableView(): void {
		if (this.currentPicker === 'table') return;

		this.currentPicker = 'table';
		this.toggleActivePicker();

		this.send();
	}

	chooseFooterView(): void {
		if (this.currentPicker === 'footer') return;

		this.currentPicker = 'footer';
		this.toggleActivePicker();

		this.send();
	}

	choosePokemonView(): void {
		if (this.currentPicker === 'pokemon') return;

		this.currentPicker = 'pokemon';
		this.toggleActivePicker();

		this.send();
	}

	toggleActivePicker(): void {
		this.bioInput.active = this.currentPicker === 'bio';
		this.formatPicker.active = this.currentPicker === 'format';
		this.trainerPicker.active = this.currentPicker === 'trainer';
		this.trainerCardBadgePicker.active = this.currentPicker === 'badges';
		this.headerColorPicker.active = this.currentPicker === 'header';
		this.tableColorPicker.active = this.currentPicker === 'table';
		this.footerColorPicker.active = this.currentPicker === 'footer';
		this.pokemonPicker.active = this.currentPicker === 'pokemon';
	}

	loadTournamentTrainerCard(): void {
		if (!this.targetUserId) return;

		const database = Storage.getDatabase(this.room);
		let trainerCard: ITournamentTrainerCard | undefined;
		if (database.tournamentTrainerCards) {
			if (this.targetUserId in database.tournamentTrainerCards) {
				trainerCard = database.tournamentTrainerCards[this.targetUserId];
			}
		}

		this.trainerPicker = new TrainerPicker(this.room, this.commandPrefix, setTrainerCommand, {
			currentPick: trainerCard ? trainerCard.avatar : undefined,
			userId: this.targetUserId,
			onSetTrainerGen: (index, trainerGen, dontRender) => this.setTrainerGen(dontRender),
			onClear: (index, dontRender) => this.clearTrainer(dontRender),
			onPick: (index, trainer, dontRender) => this.selectTrainer(trainer, dontRender),
			readonly: this.readonly,
			reRender: () => this.send(),
		});

		let format: IFormat | undefined;
		if (trainerCard && trainerCard.favoriteFormat) {
			format = Dex.getFormat(trainerCard.favoriteFormat);
		}

		this.formatPicker = new FormatTextInput(this.room, this.commandPrefix, setFormatCommand, {
			currentInput: format ? format.name : "",
			inputWidth: Tools.minRoomWidth,
			placeholder: "Enter a format",
			maxFormats: 1,
			onClear: () => this.clearFormatInput(),
			onErrors: () => this.send(),
			onSubmit: (output) => this.submitFormatInput(output),
			readonly: this.readonly,
			reRender: () => this.send(),
		});

		this.trainerCardBadgePicker = new TrainerCardBadgePicker(this.room, this.commandPrefix, setBadgesCommand, {
			currentPicks: trainerCard ? trainerCard.badges : undefined,
			maxPicks: 0,
			onClear: (index, dontRender) => this.clearBadges(dontRender),
			onPick: (index, badge, dontRender) => this.addBadge(badge, dontRender),
			onUnPick: (index, badge, dontRender) => this.removeBadge(badge, dontRender),
			readonly: this.readonly,
			reRender: () => this.send(),
		});

		this.bioInput = new TextInput(this.room, this.commandPrefix, setBioCommand, {
			placeholder: "Enter bio",
			stripHtmlCharacters: true,
			onClear: () => this.clearBio(),
			onErrors: () => this.send(),
			onSubmit: (output) => this.setBio(output),
			readonly: this.readonly,
			reRender: () => this.send(),
		});

		this.headerColorPicker = new ColorPicker(this.room, this.commandPrefix, setHeaderColorCommand, {
			currentPick: trainerCard ? trainerCard.header : undefined,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickHeaderHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickHeaderLightness(dontRender),
			onClear: (index, dontRender) => this.clearHeaderColor(dontRender),
			onPick: (index, color, dontRender) => this.setHeaderColor(color, dontRender),
			readonly: this.readonly,
			reRender: () => this.send(),
		});

		this.tableColorPicker = new ColorPicker(this.room, this.commandPrefix, setTableColorCommand, {
			currentPick: trainerCard ? trainerCard.table : undefined,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickTableHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickTableLightness(dontRender),
			onClear: (index, dontRender) => this.clearTableColor(dontRender),
			onPick: (index, color, dontRender) => this.setTableColor(color, dontRender),
			readonly: this.readonly,
			reRender: () => this.send(),
		});

		this.footerColorPicker = new ColorPicker(this.room, this.commandPrefix, setFooterColorCommand, {
			currentPick: trainerCard ? trainerCard.footer : undefined,
			onPickHueVariation: (index, hueVariation, dontRender) => this.pickFooterHueVariation(dontRender),
			onPickLightness: (index, lightness, dontRender) => this.pickFooterLightness(dontRender),
			onClear: (index, dontRender) => this.clearFooterColor(dontRender),
			onPick: (index, color, dontRender) => this.setFooterColor(color, dontRender),
			readonly: this.readonly,
			reRender: () => this.send(),
		});

		PokemonPickerBase.loadData();

		this.pokemonPicker = new PokemonTextInput(this.room, this.commandPrefix, setPokemonCommand, {
			gif: false,
			currentInput: trainerCard && trainerCard.pokemon ? trainerCard.pokemon.join(", ") : "",
			pokemonList: PokemonPickerBase.pokemonGens[Dex.getModelGenerations().slice().pop()!],
			inputWidth: Tools.minRoomWidth,
			minPokemon: 1,
			maxPokemon: 6,
			placeholder: "Enter all Pokemon",
			clearText: "Clear all",
			submitText: "Update all",
			onClear: () => this.clearPokemonInput(),
			onErrors: () => this.send(),
			onSubmit: (output) => this.submitAllPokemonInput(output),
			readonly: this.readonly,
			reRender: () => this.send(),
		});

		this.toggleActivePicker();

		this.components = [this.trainerCardUserIdPicker, this.trainerPicker, this.formatPicker, this.trainerCardBadgePicker,
			this.bioInput, this.headerColorPicker, this.tableColorPicker, this.footerColorPicker, this.pokemonPicker];
	}

	clearTargetUserId(dontRender?: boolean): void {
		if (!this.viewAllMode || !this.targetUserId) return;

		this.targetUserId = "";

		if (!dontRender) this.send();
	}

	selectTargetUserId(userId: string, dontRender?: boolean): void {
		if (!this.viewAllMode || userId === this.targetUserId) return;

		this.targetUserId = userId;
		this.loadTournamentTrainerCard();

		if (!dontRender) this.send();
	}

	setTrainerGen(dontRender?: boolean): void {
		if (!dontRender) this.send();
	}

	clearTrainer(dontRender?: boolean): void {
		const database = this.getDatabase();
		delete database.tournamentTrainerCards![this.targetUserId!].avatar;
		delete database.tournamentTrainerCards![this.targetUserId!].customAvatar;

		if (!dontRender) this.send();
	}

	selectTrainer(trainer: ITrainerPick, dontRender?: boolean): void {
		const database = this.getDatabase();
		database.tournamentTrainerCards![this.targetUserId!].avatar = trainer.trainer;
		database.tournamentTrainerCards![this.targetUserId!].customAvatar = !!trainer.customAvatar;

		if (!dontRender) this.send();
	}

	clearFormatInput(): void {
		const database = this.getDatabase();
		delete database.tournamentTrainerCards![this.targetUserId!].favoriteFormat;

		this.send();
	}

	submitFormatInput(output: string): void {
		const database = this.getDatabase();
		database.tournamentTrainerCards![this.targetUserId!].favoriteFormat = output;

		this.send();
	}

	clearBadges(dontRender?: boolean): void {
		const database = this.getDatabase();
		delete database.tournamentTrainerCards![this.targetUserId!].badges;

		if (!dontRender) this.send();
	}

	addBadge(badge: string, dontRender?: boolean): void {
		const database = this.getDatabase();
		if (!database.tournamentTrainerCards![this.targetUserId!].badges) database.tournamentTrainerCards![this.targetUserId!].badges = [];
		if (!database.tournamentTrainerCards![this.targetUserId!].badges!.includes(badge)) {
			database.tournamentTrainerCards![this.targetUserId!].badges!.push(badge);
		}

		if (!dontRender) this.send();
	}

	removeBadge(badge: string, dontRender?: boolean): void {
		const database = this.getDatabase();
		if (database.tournamentTrainerCards![this.targetUserId!].badges) {
			const index = database.tournamentTrainerCards![this.targetUserId!].badges!.indexOf(badge);
			if (index !== -1) database.tournamentTrainerCards![this.targetUserId!].badges!.splice(index, 1);
		}

		if (!dontRender) this.send();
	}

	clearBio(): void {
		const database = this.getDatabase();
		delete database.tournamentTrainerCards![this.targetUserId!].bio;

		this.send();
	}

	setBio(bio: string): void {
		const database = this.getDatabase();
		database.tournamentTrainerCards![this.targetUserId!].bio = bio;

		this.room.modnote(this.userName + " set " + (this.userId === this.targetUserId ? "their" : this.targetUserId + "'s") +
			" tournament trainer card bio to '" + bio + "'");

		this.send();
	}

	pickHeaderHueVariation(dontRender?: boolean): void {
		if (!dontRender) this.send();
	}

	pickHeaderLightness(dontRender?: boolean): void {
		if (!dontRender) this.send();
	}

	clearHeaderColor(dontRender?: boolean): void {
		const database = this.getDatabase();
		delete database.tournamentTrainerCards![this.targetUserId!].header;

		if (!dontRender) this.send();
	}

	setHeaderColor(color: IColorPick, dontRender?: boolean): void {
		const database = this.getDatabase();
		database.tournamentTrainerCards![this.targetUserId!].header = color.hexCode;

		if (!dontRender) this.send();
	}

	pickTableHueVariation(dontRender?: boolean): void {
		if (!dontRender) this.send();
	}

	pickTableLightness(dontRender?: boolean): void {
		if (!dontRender) this.send();
	}

	clearTableColor(dontRender?: boolean): void {
		const database = this.getDatabase();
		delete database.tournamentTrainerCards![this.targetUserId!].table;

		if (!dontRender) this.send();
	}

	setTableColor(color: IColorPick, dontRender?: boolean): void {
		const database = this.getDatabase();
		database.tournamentTrainerCards![this.targetUserId!].table = color.hexCode;

		if (!dontRender) this.send();
	}

	pickFooterHueVariation(dontRender?: boolean): void {
		if (!dontRender) this.send();
	}

	pickFooterLightness(dontRender?: boolean): void {
		if (!dontRender) this.send();
	}

	clearFooterColor(dontRender?: boolean): void {
		const database = this.getDatabase();
		delete database.tournamentTrainerCards![this.targetUserId!].footer;

		if (!dontRender) this.send();
	}

	setFooterColor(color: IColorPick, dontRender?: boolean): void {
		const database = this.getDatabase();
		database.tournamentTrainerCards![this.targetUserId!].footer = color.hexCode;

		if (!dontRender) this.send();
	}

	clearPokemonInput(): void {
		const database = this.getDatabase();
		delete database.tournamentTrainerCards![this.targetUserId!].pokemon;

		this.send();
	}

	submitAllPokemonInput(output: PokemonChoices): void {
		const database = this.getDatabase();
		database.tournamentTrainerCards![this.targetUserId!].pokemon = output.filter(x => x !== undefined).map(x => x!.pokemon);

		this.send();
	}

	render(): string {
		let name = this.targetUserId ? this.trainerCardUserIdNames[this.targetUserId] : "";
		const user = name ? Users.get(name) : undefined;
		if (user) name = user.name;

		let html = "<div class='chat' style='margin-top: 4px;margin-left: 4px'><center><b>" + this.room.title + ": Tournament Trainer " +
			"Card</b>";
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + closeCommand, "Close", {enabledReadonly: true});

		html += "<br />";
		const currentCard = name ? Tournaments.getTrainerCardHtml(this.room, name) : "";
		if (currentCard) {
			html += currentCard;
		} else {
			html += "<br />";
			if (this.viewAllMode) {
				html += "<b>Select a user to see their trainer card!</b>!";
			} else {
				html += "<b>Select a format or trainer to see your preview</b>!";
			}
		}
		html += "<br />";
		html += "</center>";

		if (this.viewAllMode) {
			html += this.trainerCardUserIdPicker.render();
			html += "<br /><br />";
		}

		const trainer = this.currentPicker === 'trainer';
		const header = this.currentPicker === 'header';
		const table = this.currentPicker === 'table';
		const footer = this.currentPicker === 'footer';
		const format = this.currentPicker === 'format';
		const pokemon = this.currentPicker === 'pokemon';
		const badges = this.currentPicker === 'badges';
		const bio = this.currentPicker === 'bio';

		html += "<b>Options</b>:<br />";
		html += this.getQuietPmButton(this.commandPrefix + ", " + chooseTrainerPicker, "Trainer",
			{selectedAndDisabled: trainer, enabledReadonly: true});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseHeaderView, "Header",
			{selectedAndDisabled: header, enabledReadonly: true});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseTableView, "Table",
			{selectedAndDisabled: table, enabledReadonly: true});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseFooterView, "Footer",
			{selectedAndDisabled: footer, enabledReadonly: true});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseFormatPicker, "Format",
			{selectedAndDisabled: format, enabledReadonly: true});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + choosePokemonView, "Pokemon",
			{selectedAndDisabled: pokemon, enabledReadonly: true});
		if (this.isRoomStaff) {
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseBadgesView, "Badges",
				{selectedAndDisabled: badges, enabledReadonly: true});
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseBioView, "Bio",
				{selectedAndDisabled: bio, enabledReadonly: true});
		}
		html += "<br /><br />";

		if (trainer) {
			html += this.trainerPicker.render();
		} else if (format) {
			html += this.formatPicker.render();
		} else if (header) {
			html += this.headerColorPicker.render();
		} else if (table) {
			html += this.tableColorPicker.render();
		} else if (footer) {
			html += this.footerColorPicker.render();
		} else if (pokemon) {
			html += this.pokemonPicker.render();
		} else if (badges) {
			html += this.trainerCardBadgePicker.render();
		} else if (bio) {
			html += this.bioInput.render();
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

			if (!Config.showTournamentTrainerCards || !Config.showTournamentTrainerCards.includes(targetRoom.id)) {
				return this.say("Tournament trainer cards are not enabled for " + targetRoom.title + ".");
			}

			if (Config.sharedTournamentTrainerCards && targetRoom.id in Config.sharedTournamentTrainerCards &&
				!Rooms.get(Config.sharedTournamentTrainerCards[targetRoom.id])) {
				return this.say("Tournament trainer cards cannot currently be viewed for " + targetRoom.title + ".");
			}

			const cmd = Tools.toId(targets[0]);
			targets.shift();

			if (!cmd) {
				new TournamentTrainerCard(targetRoom, user).open();
				return;
			}

			if (!(user.id in pages) && cmd !== closeCommand && cmd !== viewAllCommand && cmd !== staffEditCommand) {
				new TournamentTrainerCard(targetRoom, user);
			}

			if (cmd === chooseTrainerPicker) {
				pages[user.id].chooseTrainerPicker();
			} else if (cmd === chooseHeaderView) {
				pages[user.id].chooseHeaderView();
			} else if (cmd === chooseTableView) {
				pages[user.id].chooseTableView();
			} else if (cmd === chooseFooterView) {
				pages[user.id].chooseFooterView();
			} else if (cmd === choosePokemonView) {
				pages[user.id].choosePokemonView();
			} else if (cmd === chooseFormatPicker) {
				pages[user.id].chooseFormatPicker();
			} else if (cmd === chooseBadgesView) {
				if (!user.hasRank(targetRoom, 'driver') && !user.isDeveloper()) return;
				pages[user.id].chooseBadgesView();
			} else if (cmd === chooseBioView) {
				if (!user.hasRank(targetRoom, 'driver') && !user.isDeveloper()) return;
				pages[user.id].chooseBioView();
			} else if (cmd === closeCommand) {
				if (user.id in pages) pages[user.id].close();
			} else if (cmd === viewAllCommand) {
				let targetUserId;
				const possibleUserId = Tools.toId(targets[0]);
				if (Tools.isUsernameLength(possibleUserId)) {
					targetUserId = possibleUserId;
				}

				new TournamentTrainerCard(targetRoom, user, {targetUserId, viewAllMode: true}).open();
			} else if (cmd === staffEditCommand) {
				if (!user.hasRank(targetRoom, 'driver') && !user.isDeveloper()) return;

				const targetUserId = Tools.toId(targets[0]);
				if (!Tools.isUsernameLength(targetUserId)) return this.say(CommandParser.getErrorText(['invalidUsernameLength']));
				new TournamentTrainerCard(targetRoom, user, {targetUserId}).open();
			} else {
				const error = pages[user.id].checkComponentCommands(cmd, targets);
				if (error) this.say(error);
			}
		},
		aliases: [baseCommandAlias],
	},
};
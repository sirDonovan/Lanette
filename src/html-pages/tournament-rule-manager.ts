import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { IFormat } from "../types/pokemon-showdown";
import type { User } from "../users";
import { CustomRuleTextInput } from "./components/custom-rule-text-input";
import { FormatTextInput } from "./components/format-text-input";
import { type IPageElement, Pagination } from "./components/pagination";
import { TypePicker } from "./components/type-picker";
import { HtmlPageBase } from "./html-page-base";

const baseCommand = 'tournamentrulemanager';
const baseCommandAlias = 'trm';
const chooseFormatView = 'chooseformatview';
const chooseUsableView = 'chooseusableview';
const chooseBannedView = 'choosebannedview';
const chooseForceMonotypeView = 'chooseforcemonotypeview';
const chooseAbilitiesView = 'chooseabilitiesview';
const chooseItemsView = 'chooseitemsview';
const chooseMovesView = 'choosemovesview';
const choosePokemonView = 'choosepokemonview';
const chooseRulesetsView = 'chooserulesetsview';
const chooseTiersView = 'choosetiersview';
const formatsInputCommand = 'selectformats';
const customRulesInputCommand = 'selectcustomrules';
const addCustomRuleCommand = 'addcustomrule';
const removeCustomRuleCommand = 'removecustomrule';
const banPageCommand = 'selectbanpage';
const unbanPageCommand = 'selectunbanpage';
const setForceMonotypeCommand = 'setforcemonotype';
const setNextTournamentCommand = 'setnexttournament';
const loadNextTournamentCommand = 'loadnexttournament';
const closeCommand = 'close';

const pageId = 'tournament-rule-manager';

export const id = pageId;
export const pages: Dict<TournamentRuleManager> = {};

class TournamentRuleManager extends HtmlPageBase {
	pageId = pageId;

	currentView: 'format' | 'usable' | 'banned' | 'force-monotype' = 'format';
	currentBansUnbansView: 'abilities' | 'items' | 'moves' | 'pokemon' | 'rulesets' | 'tiers' = 'pokemon';
	customRules: string[] = [];
	redundantCustomRules: string[] = [];
	format: IFormat | null = null;
	forceMonotype: string | null = null;

	abilitiesToBan: string[] = [];
	abilitiesToUnban: string[] = [];
	itemsToBan: string[] = [];
	itemsToUnban: string[] = [];
	movesToBan: string[] = [];
	movesToUnban: string[] = [];
	pokemonToBan: string[] = [];
	pokemonToUnban: string[] = [];
	rulesetsToAdd: string[] = [];
	rulesetsToRemove: string[] = [];
	tiersToBan: string[] = [];
	tiersToUnban: string[] = [];

	formatInput: FormatTextInput;
	customRulesInput: CustomRuleTextInput;
	banPagination: Pagination;
	unbanPagination: Pagination;
	forceMonotypePicker: TypePicker;

	constructor(room: Room, user: User) {
		super(room, user, baseCommandAlias, pages);

		this.formatInput = new FormatTextInput(room, this.commandPrefix, formatsInputCommand, {
			label: "",
			submitText: "Set format",
			maxFormats: 1,
			hideClearButton: true,
			onClear: () => this.send(),
			onErrors: () => this.send(),
			onSubmit: (output) => this.setFormat(output),
			reRender: () => this.send(),
		});

		this.customRulesInput = new CustomRuleTextInput(room, this.commandPrefix, customRulesInputCommand, {
			label: "",
			submitText: "Add rules",
			hideClearButton: true,
			textArea: true,
			textAreaConfiguration: {rows: 3, cols: 60},
			onClear: () => this.send(),
			onErrors: () => this.send(),
			onSubmit: (output) => this.addCustomRules(output),
			reRender: () => this.send(),
		});

		this.banPagination = new Pagination(this.room, this.commandPrefix, banPageCommand, {
			elements: [],
			elementsPerRow: 5,
			rowsPerPage: 20,
			pagesLabel: "Usable",
			onSelectPage: () => this.send(),
			reRender: () => this.send(),
		});

		this.unbanPagination = new Pagination(this.room, this.commandPrefix, unbanPageCommand, {
			elements: [],
			elementsPerRow: 5,
			rowsPerPage: 20,
			pagesLabel: "Banned",
			onSelectPage: () => this.send(),
			reRender: () => this.send(),
		});

		this.forceMonotypePicker = new TypePicker(this.room, this.commandPrefix, setForceMonotypeCommand, {
			onClear: () => this.clearForceMonotype(),
			onPick: (index, type) => this.pickForceMonotype(type),
			reRender: () => this.send(),
		});

		this.components = [this.formatInput, this.customRulesInput, this.banPagination, this.unbanPagination, this.forceMonotypePicker];
	}

	chooseFormatView(): void {
		if (this.currentView === 'format') return;

		this.currentView = 'format';

		this.toggleActiveComponent();
		this.send();
	}

	chooseUsableView(): void {
		if (this.currentView === 'usable') return;

		this.currentView = 'usable';

		this.toggleActiveComponent();
		this.send();
	}

	chooseBannedView(): void {
		if (this.currentView === 'banned') return;

		this.currentView = 'banned';

		this.toggleActiveComponent();
		this.send();
	}

	chooseForceMonotypeView(): void {
		if (this.currentView === 'force-monotype') return;

		this.currentView = 'force-monotype';

		this.toggleActiveComponent();
		this.send();
	}

	chooseRulesetsView(): void {
		if (this.currentBansUnbansView === 'rulesets') return;

		this.currentBansUnbansView = 'rulesets';

		this.setBanUnbanPaginationElements();
		this.send();
	}

	chooseTiersView(): void {
		if (this.currentBansUnbansView === 'tiers') return;

		this.currentBansUnbansView = 'tiers';

		this.setBanUnbanPaginationElements();
		this.send();
	}

	chooseAbilitiesView(): void {
		if (this.currentBansUnbansView === 'abilities') return;

		this.currentBansUnbansView = 'abilities';

		this.setBanUnbanPaginationElements();
		this.send();
	}

	chooseItemsView(): void {
		if (this.currentBansUnbansView === 'items') return;

		this.currentBansUnbansView = 'items';

		this.setBanUnbanPaginationElements();
		this.send();
	}

	chooseMovesView(): void {
		if (this.currentBansUnbansView === 'moves') return;

		this.currentBansUnbansView = 'moves';

		this.setBanUnbanPaginationElements();
		this.send();
	}

	choosePokemonView(): void {
		if (this.currentBansUnbansView === 'pokemon') return;

		this.currentBansUnbansView = 'pokemon';

		this.setBanUnbanPaginationElements();
		this.send();
	}

	toggleActiveComponent(): void {
		this.formatInput.active = this.currentView === 'format';
		this.banPagination.active = this.currentView === 'usable';
		this.unbanPagination.active = this.currentView === 'banned';
		this.forceMonotypePicker.active = this.currentView === 'force-monotype';
	}

	clearForceMonotype(dontRender?: boolean): void {
		if (this.forceMonotype) {
			const newCustomRules = this.customRules.slice();
			const index = newCustomRules.indexOf(this.forceMonotype);
			if (index !== -1) {
				newCustomRules.splice(index, 1);
				this.updateCustomRules(newCustomRules);
			}

			this.forceMonotype = null;
		}

		if (!dontRender) {
			if (this.format) this.format.usablePokemon = undefined;
			this.updateAvailablePokemon();
			this.setBanUnbanPaginationElements();

			this.send();
		}
	}

	pickForceMonotype(type: string): void {
		if (this.forceMonotype) this.clearForceMonotype(true);

		this.forceMonotype = "forcemonotype=" + type;

		const newCustomRules = this.customRules.slice();
		newCustomRules.push(this.forceMonotype);
		this.updateCustomRules(newCustomRules);

		if (this.format) this.format.usablePokemon = undefined;
		this.updateAvailablePokemon();
		this.setBanUnbanPaginationElements();

		this.send();
	}

	renderAddCustomRuleButton(rule: string, displayName: string): string {
		return "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + addCustomRuleCommand + ", " + rule, displayName);
	}

	setBanUnbanPaginationElements(): void {
		let banElements: IPageElement[] = [];
		let unbanElements: IPageElement[] = [];
		if (this.currentBansUnbansView === 'abilities') {
			banElements = this.abilitiesToBan.slice().sort().map(x => {
				return {html: this.renderAddCustomRuleButton('-ability:' + x, x)};
			});
			unbanElements = this.abilitiesToUnban.slice().sort().map(x => {
				return {html: this.renderAddCustomRuleButton('+ability:' + x, x)};
			});
		} else if (this.currentBansUnbansView === 'items') {
			banElements = this.itemsToBan.slice().sort().map(x => {
				return {html: this.renderAddCustomRuleButton('-item:' + x, x)};
			});
			unbanElements = this.itemsToUnban.slice().sort().map(x => {
				return {html: this.renderAddCustomRuleButton('+item:' + x, x)};
			});
		} else if (this.currentBansUnbansView === 'moves') {
			banElements = this.movesToBan.slice().sort().map(x => {
				return {html: this.renderAddCustomRuleButton('-move:' + x, x)};
			});
			unbanElements = this.movesToUnban.slice().sort().map(x => {
				return {html: this.renderAddCustomRuleButton('+move:' + x, x)};
			});
		} else if (this.currentBansUnbansView === 'pokemon') {
			banElements = this.pokemonToBan.slice().sort().map(x => {
				return {html: this.renderAddCustomRuleButton('-pokemon:' + x, x)};
			});
			unbanElements = this.pokemonToUnban.slice().sort().map(x => {
				return {html: this.renderAddCustomRuleButton('+pokemon:' + x, x)};
			});
		} else if (this.currentBansUnbansView === 'rulesets') {
			banElements = this.rulesetsToAdd.slice().sort().map(x => {
				return {html: this.renderAddCustomRuleButton(x, x)};
			});
			unbanElements = this.rulesetsToRemove.slice().sort().map(x => {
				return {html: this.renderAddCustomRuleButton('!' + x, x)};
			});
		} else if (this.currentBansUnbansView === 'tiers') { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			banElements = this.tiersToBan.slice().sort().map(x => {
				return {html: this.renderAddCustomRuleButton('-pokemontag:' + x, x)};
			});
			unbanElements = this.tiersToUnban.slice().sort().map(x => {
				return {html: this.renderAddCustomRuleButton('+pokemontag:' + x, x)};
			});
		}

		this.banPagination.updateElements(banElements);
		this.unbanPagination.updateElements(unbanElements);
	}

	setFormat(format: string): void {
		this.format = Dex.getExistingFormat(format);
		this.redundantCustomRules = [];

		if (this.customRules.length) {
			this.updateCustomRules(this.removeRedundantRules(this.customRules));
		} else {
			this.updateCustomRules(this.format.customRules || []);
		}

		this.format.usableAbilities = undefined;
		this.format.usableItems = undefined;
		this.format.usableMoves = undefined;
		this.format.usablePokemon = undefined;
		this.format.usablePokemonTags = undefined;

		this.updateAvailableAbilities();
		this.updateAvailableItems();
		this.updateAvailableMoves();
		this.updateAvailablePokemon();
		this.updateRulesList();
		this.updateTiersList();

		this.setBanUnbanPaginationElements();

		this.send();
	}

	removeRedundantRules(customRules: string[]): string[] {
		if (!this.format) return [];

		// check rulesets and tiers first for already included bans/unbans
		this.format.ruleTable = undefined;
		let ruleTable = Dex.getRuleTable(this.format);
		const pokemonTags = Dex.getPokemonTagsList();

		const filteredCustomRules: string[] = [];
		const nonRulesetRules: string[] = [];
		for (const rule of customRules) {
			const type = rule.charAt(0);
			if (type === '-' || type === '+' || type === '*') {
				if (pokemonTags.includes(rule.slice(1))) {
					filteredCustomRules.push(rule);
				} else {
					nonRulesetRules.push(rule);
				}
			} else {
				if (!ruleTable.has(rule)) filteredCustomRules.push(rule);
			}
		}

		this.format.customRules = filteredCustomRules;
		this.format.ruleTable = undefined;
		ruleTable = Dex.getRuleTable(this.format);

		for (const rule of nonRulesetRules) {
			const pokemon = Dex.getPokemon(rule);
			if (ruleTable.has(rule) || ruleTable.getReason(rule) ||
				(pokemon && ruleTable.check("pokemontag:" + Tools.toId(pokemon.tier)))) {
				if (!this.redundantCustomRules.includes(rule)) this.redundantCustomRules.push(rule);
			} else {
				filteredCustomRules.push(rule);
			}
		}

		return filteredCustomRules;
	}

	updateCustomRules(customRules: string[]): void {
		if (!this.format) return;

		this.customRules = customRules;

		if (customRules.length) {
			this.format.customRules = this.customRules;
		} else {
			this.format.customRules = null;
		}

		this.format.separatedCustomRules = undefined;
	}

	addCustomRules(output: string): void {
		if (!this.format) {
			this.send();
			return;
		}

		let changedAbilities = false;
		let changedItems = false;
		let changedMoves = false;
		let changedPokemon = false;
		let changedRules = false;
		let changedTiers = false;

		const pokemonTags = Dex.getPokemonTagsList();
		const pokemonTagsById: Dict<string> = {};
		for (const tag of pokemonTags) {
			pokemonTagsById[Tools.toId(tag)] = tag;
		}

		const newCustomRules = this.customRules.slice();
		const rules = output.trim().split(',');
		for (const rule of rules) {
			let name = rule;
			let type = rule.charAt(0);
			if (type === '+' || type === '-' || type === '*' || type === '!') {
				name = rule.slice(1);
			} else {
				type = "";
			}

			if (name.startsWith('ability:')) {
				const ability = Dex.getAbility(name.split(":")[1]);
				if (!ability) continue;

				name = ability.name;
				changedAbilities = true;
			} else if (name.startsWith('item:')) {
				const item = Dex.getItem(name.split(":")[1]);
				if (!item) continue;

				name = item.name;
				changedItems = true;
			} else if (name.startsWith('move:')) {
				const move = Dex.getMove(name.split(":")[1]);
				if (!move) continue;

				name = move.name;
				changedMoves = true;
			} else if (name.startsWith('pokemon:') || name.startsWith('basepokemon:')) {
				const pokemon = Dex.getPokemon(name.split(":")[1]);
				if (!pokemon) continue;

				name = pokemon.name;
				changedPokemon = true;
			} else if (name.startsWith('pokemontag:')) {
				const tag = Tools.toId(name.split(":")[1]);
				if (!(tag in pokemonTagsById)) continue;

				name = pokemonTagsById[tag];
				changedTiers = true;
			} else {
				if (name.startsWith('forcemonotype=')) {
					this.forceMonotype = name;
					changedPokemon = true;
				} else {
					const format = Dex.getFormat(name);
					if (!format || format.effectType === 'Format') continue;
					name = format.name;
				}

				changedRules = true;
			}

			const formattedRule = type + name;
			if (!newCustomRules.includes(formattedRule)) {
				newCustomRules.push(formattedRule);
			}
		}

		if (newCustomRules.length === this.customRules.length) {
			this.send();
			return;
		}

		this.updateCustomRules(this.removeRedundantRules(newCustomRules));

		if (changedAbilities) this.format.usableAbilities = undefined;
		if (changedItems) this.format.usableItems = undefined;
		if (changedMoves) this.format.usableMoves = undefined;
		if (changedPokemon || changedTiers) this.format.usablePokemon = undefined;
		if (changedTiers) this.format.usablePokemonTags = undefined;

		if (changedAbilities) this.updateAvailableAbilities();
		if (changedItems) this.updateAvailableItems();
		if (changedMoves) this.updateAvailableMoves();
		if (changedPokemon || changedTiers) this.updateAvailablePokemon();
		if (changedRules) this.updateRulesList();
		if (changedTiers) this.updateTiersList();

		this.setBanUnbanPaginationElements();
		this.send();
	}

	removeCustomRule(rule: string): void {
		if (!this.format) return;

		rule = rule.trim();
		const index = this.customRules.indexOf(rule);
		if (index === -1) return;

		const newCustomRules = this.customRules.slice();
		newCustomRules.splice(index, 1);

		this.updateCustomRules(newCustomRules);

		const pokemonTags = Dex.getPokemonTagsList();

		const name = rule.slice(1);
		if (rule.startsWith('forcemonotype=')) {
			this.forceMonotype = null;

			this.format.usablePokemon = undefined;
			this.updateAvailablePokemon();
		} else if (Dex.getPokemon(name)) {
			this.format.usablePokemon = undefined;
			this.updateAvailablePokemon();
		} else if (Dex.getMove(name)) {
			this.format.usableMoves = undefined;
			this.updateAvailableMoves();
		} else if (Dex.getItem(name)) {
			this.format.usableItems = undefined;
			this.updateAvailableItems();
		} else if (Dex.getAbility(name)) {
			this.format.usableAbilities = undefined;
			this.updateAvailableAbilities();
		} else if (pokemonTags.includes(name)) {
			this.format.usablePokemonTags = undefined;
			this.updateTiersList();
		} else if (Dex.getFormat(rule) || Dex.getFormat(name)) {
			this.updateRulesList();
		}

		this.setBanUnbanPaginationElements();
		this.send();
	}

	updateAvailableAbilities(): void {
		if (!this.format) return;

		this.abilitiesToBan = [];
		this.abilitiesToUnban = [];

		this.format.ruleTable = undefined;
		const usableAbilities = Dex.getUsableAbilities(this.format);
		for (const ability of Dex.getAbilitiesList()) {
			if (usableAbilities.includes(ability.name)) {
				this.abilitiesToBan.push(ability.name);
			} else {
				this.abilitiesToUnban.push(ability.name);
			}
		}
	}

	updateAvailableItems(): void {
		if (!this.format) return;

		this.itemsToBan = [];
		this.itemsToUnban = [];

		this.format.ruleTable = undefined;
		const usableItems = Dex.getUsableItems(this.format);
		for (const item of Dex.getItemsList()) {
			if (usableItems.includes(item.name)) {
				this.itemsToBan.push(item.name);
			} else {
				this.itemsToUnban.push(item.name);
			}
		}
	}

	updateAvailableMoves(): void {
		if (!this.format) return;

		this.movesToBan = [];
		this.movesToUnban = [];

		this.format.ruleTable = undefined;
		const usableMoves = Dex.getUsableMoves(this.format);
		for (const move of Dex.getMovesList()) {
			if (usableMoves.includes(move.name)) {
				this.movesToBan.push(move.name);
			} else {
				this.movesToUnban.push(move.name);
			}
		}
	}

	updateAvailablePokemon(): void {
		if (!this.format) return;

		this.pokemonToBan = [];
		this.pokemonToUnban = [];

		this.format.ruleTable = undefined;
		const usablePokemon = Dex.getUsablePokemon(this.format);
		for (const pokemon of Dex.getPokemonList()) {
			if (usablePokemon.includes(pokemon.name)) {
				this.pokemonToBan.push(pokemon.name);
				if (pokemon.otherFormes || pokemon.cosmeticFormes) this.pokemonToBan.push(pokemon.name + '-Base');
			} else {
				this.pokemonToUnban.push(pokemon.name);
				if (pokemon.otherFormes || pokemon.cosmeticFormes) this.pokemonToUnban.push(pokemon.name + '-Base');
			}
		}
	}

	updateRulesList(): void {
		if (!this.format) return;

		this.rulesetsToAdd = [];
		this.rulesetsToRemove = [];

		this.format.ruleTable = undefined;
		const ruleTable = Dex.getRuleTable(this.format);
		for (const rule of Dex.getRulesList()) {
			if (rule.hasValue) continue;

			if (ruleTable.has(rule.id)) {
				this.rulesetsToRemove.push(rule.name);
			} else {
				this.rulesetsToAdd.push(rule.name);
			}
		}
	}

	updateTiersList(): void {
		if (!this.format) return;

		this.tiersToBan = [];
		this.tiersToUnban = [];

		this.format.ruleTable = undefined;
		const usablePokemonTags = Dex.getUsablePokemonTags(this.format);
		for (const tag of Dex.getPokemonTagsList()) {
			if (usablePokemonTags.includes(tag)) {
				this.tiersToBan.push(tag);
			} else {
				this.tiersToUnban.push(tag);
			}
		}
	}

	setNextTournamentCommand(): void {
		if (!this.format || !this.isRoomStaff) return;

		const user = Users.get(this.userName);
		if (user) {
			CommandParser.parse(this.room, user,
				Config.commandCharacter + "forcenexttour " + this.format.name + ", " + this.customRules.join(", "), Date.now());
		}
	}

	loadNextTournamentCommand(): void {
		const database = Storage.getDatabase(this.room);
		if (database.queuedTournament) {
			const format = Dex.getFormat(database.queuedTournament.formatid);
			if (format) {
				this.customRules = [];
				this.setFormat(database.queuedTournament.formatid);
			}
		}
	}

	render(): string {
		let html = "<div class='chat' style='margin-top: 4px;margin-left: 4px'><center><b>Tournament Rule Manager</b>";
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + closeCommand, "Close");
		html += "</center><br />";

		if (this.format) {
			html += "<b>Format name</b>:&nbsp;" + Dex.getCustomFormatName(this.format, true);
			html += "<br /><br />";

			if (this.customRules.length) {
				html += "<b>Current rules</b>:";
				html += "<br />";
				html += Dex.getCustomRulesHtml(this.format);
				html += "<br /><br />";

				if (this.isRoomStaff) {
					html += "<code>/tour rules " + this.customRules.join(", ") + "</code>";
					html += "<br /><br />";
					html += "<code>" + this.format.id + "@@@" + this.customRules.join(", ") + "</code>";
					html += "<br /><br />";
					html += this.getQuietPmButton(this.commandPrefix + ", " + setNextTournamentCommand,
						"Set as " + Config.commandCharacter + "nexttour", {disabled: !this.format});
					html += "<br /><br />";
				}

				html += "<b>Remove custom rules</b>:";
				html += "<br />";
				for (const rule of this.customRules) {
					html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + removeCustomRuleCommand + ", " + rule,
						rule);
				}
			} else if (!this.redundantCustomRules.length) {
				html += "You have not specified any custom rules! Use the bans view, unbans view, or enter rules manually below.";
			}

			if (this.redundantCustomRules.length) {
				html += "<br /><br />";
				html += "The following rules were removed as they are already included in the format or other rules:";
				html += "<br />";
				for (const rule of this.redundantCustomRules) {
					html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + removeCustomRuleCommand + ", " + rule,
						rule, {disabled: true});
				}
			}

			html += "<br /><br />";
			html += this.customRulesInput.render();
			html += "<br /><br />";
		}

		const formatView = this.currentView === 'format';
		const usableView = this.currentView === 'usable';
		const bannedView = this.currentView === 'banned';
		const forceMonotypeView = this.currentView === 'force-monotype';

		html += "<b>Options</b>:";
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseFormatView, "Format",
			{selectedAndDisabled: formatView});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseUsableView, "Usable",
			{selectedAndDisabled: usableView, disabled: !this.format});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseBannedView, "Banned",
			{selectedAndDisabled: bannedView, disabled: !this.format});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseForceMonotypeView, "Force Monotype",
			{selectedAndDisabled: forceMonotypeView, disabled: !this.format});

		html += "<br /><br />";

		if (formatView) {
			const database = Storage.getDatabase(this.room);
			if (database.queuedTournament && !database.queuedTournament.official && Dex.getFormat(database.queuedTournament.formatid)) {
				html += this.getQuietPmButton(this.commandPrefix + ", " + loadNextTournamentCommand,
					"Load from " + Config.commandCharacter + "nexttour");
				html += "<br /><br />";
			}

			html += "Enter the name of a format to begin customizing rules:";
			html += "<br /><br />";
			html += this.formatInput.render();
		} else if (usableView || bannedView) {
			const abilities = this.currentBansUnbansView === 'abilities';
			const items = this.currentBansUnbansView === 'items';
			const moves = this.currentBansUnbansView === 'moves';
			const pokemon = this.currentBansUnbansView === 'pokemon';
			const rules = this.currentBansUnbansView === 'rulesets';
			const tiers = this.currentBansUnbansView === 'tiers';

			html += "<b>Categories</b>:";
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseAbilitiesView, "Abilities",
				{selectedAndDisabled: abilities});
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseItemsView, "Items",
				{selectedAndDisabled: items});
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseMovesView, "Moves",
				{selectedAndDisabled: moves});
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + choosePokemonView, "Pokemon",
				{selectedAndDisabled: pokemon});
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseRulesetsView, "Rulesets",
				{selectedAndDisabled: rules});
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseTiersView, "Tiers",
				{selectedAndDisabled: tiers});

			html += "<br /><br />";

			if (rules) {
				html += "Click a rule below to " + (usableView ? "add it to" : "remove it from") + " your custom rules!";
			} else {
				html += "Click a " + (usableView ? "usable" : "banned") + " ";
				if (abilities) {
					html += "ability";
				} else if (items) {
					html += "item";
				} else if (moves) {
					html += "move";
				} else if (pokemon) {
					html += "Pokemon";
				} else if (tiers) {
					html += "tier";
				}

				html += " below to " + (usableView ? "ban" : "unban") + " it in your custom rules!";
			}

			html += "<br /><br />";
			if (usableView) {
				html += this.banPagination.render();
			} else {
				html += this.unbanPagination.render();
			}
		} else if (forceMonotypeView) {
			html += "Choose a forced type for every Pokemon";
			html += "<br /><br />";
			html += this.forceMonotypePicker.render();
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
				new TournamentRuleManager(targetRoom, user).open();
				return;
			}

			if (!(user.id in pages) && cmd !== closeCommand) new TournamentRuleManager(targetRoom, user);

			if (cmd === closeCommand) {
				if (user.id in pages) pages[user.id].close();
			} else if (cmd === chooseFormatView) {
				pages[user.id].chooseFormatView();
			} else if (cmd === chooseUsableView) {
				pages[user.id].chooseUsableView();
			} else if (cmd === chooseBannedView) {
				pages[user.id].chooseBannedView();
			} else if (cmd === chooseForceMonotypeView) {
				pages[user.id].chooseForceMonotypeView();
			} else if (cmd === chooseAbilitiesView) {
				pages[user.id].chooseAbilitiesView();
			} else if (cmd === chooseItemsView) {
				pages[user.id].chooseItemsView();
			} else if (cmd === chooseMovesView) {
				pages[user.id].chooseMovesView();
			} else if (cmd === choosePokemonView) {
				pages[user.id].choosePokemonView();
			} else if (cmd === chooseRulesetsView) {
				pages[user.id].chooseRulesetsView();
			} else if (cmd === chooseTiersView) {
				pages[user.id].chooseTiersView();
			} else if (cmd === addCustomRuleCommand) {
				pages[user.id].addCustomRules(targets[0]);
			} else if (cmd === removeCustomRuleCommand) {
				pages[user.id].removeCustomRule(targets[0]);
			} else if (cmd === setNextTournamentCommand) {
				pages[user.id].setNextTournamentCommand();
			} else if (cmd === loadNextTournamentCommand) {
				pages[user.id].loadNextTournamentCommand();
			} else {
				const error = pages[user.id].checkComponentCommands(cmd, targets);
				if (error) this.say(error);
			}
		},
		aliases: [baseCommandAlias],
	},
};
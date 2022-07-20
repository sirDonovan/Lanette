import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { IFormat } from "../types/pokemon-showdown";
import type { User } from "../users";
import { CustomRuleTextInput } from "./components/custom-rule-text-input";
import { FormatTextInput } from "./components/format-text-input";
import { type IPageElement, Pagination } from "./components/pagination";
import { type ITextInputValidation, TextInput } from "./components/text-input";
import { TypePicker } from "./components/type-picker";
import { HtmlPageBase } from "./html-page-base";

const baseCommand = 'tournamentrulemanager';
const baseCommandAlias = 'trm';
const chooseFormatView = 'chooseformatview';
const chooseAddableView = 'chooseaddableview';
const chooseRemovableView = 'chooseremovableview';
const chooseValueRulesView = 'choosevaluerulesview';
const chooseAbilitiesView = 'chooseabilitiesview';
const chooseItemsView = 'chooseitemsview';
const chooseMovesView = 'choosemovesview';
const choosePokemonView = 'choosepokemonview';
const chooseRulesetsView = 'chooserulesetsview';
const chooseTiersView = 'choosetiersview';
const formatsInputCommand = 'selectformats';
const customRulesInputCommand = 'selectcustomrules';
const valueRulesInputCommand = 'selectvaluerules';
const addCustomRuleCommand = 'addcustomrule';
const removeCustomRuleCommand = 'removecustomrule';
const banPageCommand = 'selectbanpage';
const unbanPageCommand = 'selectunbanpage';
const addRulePageCommand = 'selectaddrulepage';
const removeRulePageCommand = 'selectremoverulepage';
const setForceMonotypeCommand = 'setforcemonotype';
const setNextTournamentCommand = 'setnexttournament';
const loadNextTournamentCommand = 'loadnexttournament';
const loadPastTournamentCommand = 'loadpasttournament';
const closeCommand = 'close';

const forceMonotype = 'forcemonotype';

const pageId = 'tournament-rule-manager';

export const id = pageId;
export const pages: Dict<TournamentRuleManager> = {};

class TournamentRuleManager extends HtmlPageBase {
	pageId = pageId;

	currentView: 'format' | 'addable' | 'removable' | 'value-rules' = 'format';
	currentBansUnbansView: 'abilities' | 'items' | 'moves' | 'pokemon' | 'rulesets' | 'tiers' = 'pokemon';
	/**Includes both non-value and any input value rules */
	customRules: readonly string[] = [];
	/**Only includes non-value rules */
	nonValueCustomRules: readonly string[] = [];
	redundantCustomRules: string[] = [];
	format: IFormat | null = null;
	forceMonotype: string | null = null;
	valueRulesTextInputs: Dict<TextInput> = {};
	valueRulesOutputs: Dict<string> = {};

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

	canCreateTournament: boolean;

	formatInput: FormatTextInput;
	customRulesInput: CustomRuleTextInput;
	banPagination: Pagination;
	unbanPagination: Pagination;
	addRulePagination: Pagination;
	removeRulePagination: Pagination;
	forceMonotypePicker: TypePicker;

	constructor(room: Room, user: User) {
		super(room, user, baseCommandAlias, pages);

		this.canCreateTournament = Tournaments.canCreateTournament(room, user);

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
			rowsPerPage: 8,
			pagesLabel: "Usable",
			onSelectPage: () => this.send(),
			reRender: () => this.send(),
		});

		this.unbanPagination = new Pagination(this.room, this.commandPrefix, unbanPageCommand, {
			elements: [],
			elementsPerRow: 5,
			rowsPerPage: 8,
			pagesLabel: "Banned",
			onSelectPage: () => this.send(),
			reRender: () => this.send(),
		});

		this.addRulePagination = new Pagination(this.room, this.commandPrefix, addRulePageCommand, {
			elements: [],
			elementsPerRow: 1,
			rowsPerPage: 7,
			pagesLabel: "Addable",
			onSelectPage: () => this.send(),
			reRender: () => this.send(),
		});

		this.removeRulePagination = new Pagination(this.room, this.commandPrefix, removeRulePageCommand, {
			elements: [],
			elementsPerRow: 1,
			rowsPerPage: 7,
			pagesLabel: "Removable",
			onSelectPage: () => this.send(),
			reRender: () => this.send(),
		});

		this.forceMonotypePicker = new TypePicker(this.room, this.commandPrefix, setForceMonotypeCommand, {
			hideLabel: true,
			onClear: () => this.clearForceMonotype(),
			onPick: (index, type) => this.pickForceMonotype(type),
			reRender: () => this.send(),
		});

		this.components = [this.formatInput, this.customRulesInput, this.banPagination, this.unbanPagination, this.addRulePagination,
			this.removeRulePagination, this.forceMonotypePicker];

		for (const rule of Dex.getRulesList()) {
			if (!rule.hasValue || rule.id === forceMonotype) continue;

			this.valueRulesTextInputs[rule.id] = new TextInput(room, this.commandPrefix, valueRulesInputCommand + rule.id, {
				label: "<b>" + rule.name + "</b>",
				validateSubmission: (input): ITextInputValidation => {
					try {
						input = rule.id + "=" + input.trim();
						const validatedRule = Dex.validateRule(input);
						if (typeof validatedRule !== 'string') throw new Error("Complex rules are not currently supported");

						return {currentOutput: validatedRule};
					} catch (e) {
						return {errors: [input + ": " + (e as Error).message]};
					}
				},
				onClear: () => this.clearValueRule(rule.id),
				onErrors: () => this.send(),
				onSubmit: (output) => this.setValueRule(rule.id, output),
				reRender: () => this.send(),
			});

			this.components.push(this.valueRulesTextInputs[rule.id]);
		}
	}

	chooseFormatView(): void {
		if (this.currentView === 'format') return;

		this.currentView = 'format';

		this.toggleActiveComponent();
		this.send();
	}

	chooseAddableView(): void {
		if (this.currentView === 'addable') return;

		this.currentView = 'addable';

		this.toggleActiveComponent();
		this.send();
	}

	chooseRemovableView(): void {
		if (this.currentView === 'removable') return;

		this.currentView = 'removable';

		this.toggleActiveComponent();
		this.send();
	}

	chooseValueRulesView(): void {
		if (this.currentView === 'value-rules') return;

		this.currentView = 'value-rules';

		this.toggleActiveComponent();
		this.send();
	}

	chooseRulesetsView(): void {
		if (this.currentBansUnbansView === 'rulesets') return;

		this.currentBansUnbansView = 'rulesets';

		this.toggleActiveComponent();
		this.setBanUnbanPaginationElements();
		this.send();
	}

	chooseTiersView(): void {
		if (this.currentBansUnbansView === 'tiers') return;

		this.currentBansUnbansView = 'tiers';

		this.toggleActiveComponent();
		this.setBanUnbanPaginationElements();
		this.send();
	}

	chooseAbilitiesView(): void {
		if (this.currentBansUnbansView === 'abilities') return;

		this.currentBansUnbansView = 'abilities';

		this.toggleActiveComponent();
		this.setBanUnbanPaginationElements();
		this.send();
	}

	chooseItemsView(): void {
		if (this.currentBansUnbansView === 'items') return;

		this.currentBansUnbansView = 'items';

		this.toggleActiveComponent();
		this.setBanUnbanPaginationElements();
		this.send();
	}

	chooseMovesView(): void {
		if (this.currentBansUnbansView === 'moves') return;

		this.currentBansUnbansView = 'moves';

		this.toggleActiveComponent();
		this.setBanUnbanPaginationElements();
		this.send();
	}

	choosePokemonView(): void {
		if (this.currentBansUnbansView === 'pokemon') return;

		this.currentBansUnbansView = 'pokemon';

		this.toggleActiveComponent();
		this.setBanUnbanPaginationElements();
		this.send();
	}

	toggleActiveComponent(): void {
		this.formatInput.active = this.currentView === 'format';

		const rulesets = this.currentBansUnbansView === 'rulesets';
		const addable = this.currentView === 'addable';
		const removable = this.currentView === 'removable';
		this.banPagination.active = !rulesets && addable;
		this.unbanPagination.active = !rulesets && removable;
		this.addRulePagination.active = rulesets && addable;
		this.removeRulePagination.active = rulesets && removable;

		const valueRules = this.currentView === 'value-rules';
		this.forceMonotypePicker.active = valueRules;
		for (const i in this.valueRulesTextInputs) {
			this.valueRulesTextInputs[i].active = valueRules;
		}
	}

	clearForceMonotype(): void {
		if (this.forceMonotype) {
			this.forceMonotype = null;
			this.updateCustomRules();
		}

		if (this.format) this.format.usablePokemon = undefined;
		this.updateAvailablePokemon();
		this.setBanUnbanPaginationElements();

		this.send();
	}

	pickForceMonotype(type: string): void {
		this.forceMonotype = forceMonotype + "=" + type;
		this.updateCustomRules();

		if (this.format) this.format.usablePokemon = undefined;
		this.updateAvailablePokemon();
		this.setBanUnbanPaginationElements();

		this.send();
	}

	clearValueRule(ruleId: string): void {
		if (!this.valueRulesOutputs[ruleId]) return;

		delete this.valueRulesOutputs[ruleId];
		this.updateCustomRules();

		this.send();
	}

	setValueRule(ruleId: string, output: string): void {
		output = output.trim();
		if (this.valueRulesOutputs[ruleId] === output) return;

		this.valueRulesOutputs[ruleId] = output;
		this.updateCustomRules();

		this.send();
	}

	renderAddCustomRuleButton(rule: string, displayName: string, description?: string): string {
		let html = "&nbsp;";
		if (description) {
			html += this.getQuietPmButton(this.commandPrefix + ", " + addCustomRuleCommand + ", " + rule, displayName) + " - " +
				description;
		} else {
			html += this.getQuietPmButton(this.commandPrefix + ", " + addCustomRuleCommand + ", " + rule, displayName);
		}

		return html;
	}

	setBanUnbanPaginationElements(): void {
		if (this.currentBansUnbansView === 'rulesets') {
			this.addRulePagination.updateElements(this.rulesetsToAdd.slice().sort().map(x => {
				const rule = Dex.getExistingFormat(x);
				return {html: this.renderAddCustomRuleButton(x, x, rule.desc)};
			}));

			this.removeRulePagination.updateElements(this.rulesetsToRemove.slice().sort().map(x => {
				const rule = Dex.getExistingFormat(x);
				return {html: this.renderAddCustomRuleButton('!' + x, x, rule.desc)};
			}));

			return;
		}

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

		if (this.nonValueCustomRules.length) {
			this.updateCustomRules(this.removeRedundantRules(this.nonValueCustomRules));
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

	removeRedundantRules(customRules: readonly string[]): string[] {
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

	updateCustomRules(nonValueCustomRules?: readonly string[]): void {
		if (!this.format) return;

		if (nonValueCustomRules) this.nonValueCustomRules = nonValueCustomRules;

		const customRules: string[] = this.nonValueCustomRules.slice();

		if (this.forceMonotype) customRules.push(this.forceMonotype);
		for (const i in this.valueRulesOutputs) {
			if (this.valueRulesOutputs[i]) customRules.push(this.valueRulesOutputs[i]);
		}

		this.customRules = customRules;
		if (customRules.length) {
			this.format.customRules = customRules.slice();
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

		const newCustomRules = this.nonValueCustomRules.slice();
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
				const parts = name.split("=");
				if (parts.length === 2) {
					const ruleId = Tools.toId(parts[0]);
					if (ruleId === forceMonotype) {
						const pokemonType = Dex.getType(parts[1]);
						if (pokemonType) {
							this.forceMonotype = ruleId + "=" + pokemonType.name;
							changedPokemon = true;
						}
					} else if (ruleId in this.valueRulesTextInputs) {
						const validatedRule = Dex.validateRule(name);
						if (typeof validatedRule === 'string') {
							this.valueRulesOutputs[ruleId] = validatedRule;
							changedPokemon = true;
						}
					}

					continue;
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

		if (!changedAbilities && !changedItems && !changedMoves && !changedPokemon && !changedTiers && !changedRules) {
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
		const parts = rule.split("=");
		if (parts.length === 2) {
			const ruleId = Tools.toId(parts[0]);
			if (ruleId === forceMonotype) {
				this.forceMonotype = null;
			} else if (ruleId in this.valueRulesOutputs) {
				delete this.valueRulesOutputs[ruleId];
			} else {
				return;
			}

			this.format.usablePokemon = undefined;
			this.updateCustomRules();
			this.updateAvailablePokemon();
		} else {
			const index = this.nonValueCustomRules.indexOf(rule);
			if (index === -1) return;

			const newCustomRules = this.nonValueCustomRules.slice();
			newCustomRules.splice(index, 1);

			this.updateCustomRules(newCustomRules);

			const pokemonTags = Dex.getPokemonTagsList();

			const name = rule.slice(1);
			if (Dex.getPokemon(name)) {
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
				this.nonValueCustomRules = [];
				this.setFormat(database.queuedTournament.formatid);
			}
		}
	}

	loadPastTournamentCommand(formatid: string): void {
		const format = Dex.getFormat(formatid);
		if (format) {
			this.forceMonotype = null;
			this.valueRulesOutputs = {};
			this.nonValueCustomRules = [];

			this.setFormat(formatid);
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

				html += "<b>Challenge</b>: <code>" + this.format.id + "@@@" + this.customRules.join(", ") + "</code>";
				if (this.canCreateTournament) {
					html += " | <b>Tournament</b>: <code>/tour rules " + this.customRules.join(", ") + "</code> | " +
						this.getQuietPmButton(this.commandPrefix + ", " + setNextTournamentCommand, "Set as " + Config.commandCharacter +
						"nexttour", {disabled: !this.format});
				}

				html += "<br /><br />";
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
			html += "<br />";
		}

		const formatView = this.currentView === 'format';
		const addableView = this.currentView === 'addable';
		const removableView = this.currentView === 'removable';
		const valueRulesView = this.currentView === 'value-rules';

		html += "<b>Options</b>:";
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseFormatView, "Format",
			{selectedAndDisabled: formatView});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseAddableView, "Addable",
			{selectedAndDisabled: addableView, disabled: !this.format});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseRemovableView, "Removable",
			{selectedAndDisabled: removableView, disabled: !this.format});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseValueRulesView, "Value Rules",
			{selectedAndDisabled: valueRulesView, disabled: !this.format});

		html += "<br /><br />";

		if (formatView) {
			html += "Enter the name of a format to begin customizing rules:";
			html += "<br /><br />";
			html += this.formatInput.render();

			const database = Storage.getDatabase(this.room);
			if (database.queuedTournament && !database.queuedTournament.official && Dex.getFormat(database.queuedTournament.formatid)) {
				html += "<br /><br />";
				html += this.getQuietPmButton(this.commandPrefix + ", " + loadNextTournamentCommand,
					"Load from " + Config.commandCharacter + "nexttour");
			}

			if (database.pastTournaments && database.pastTournaments.length) {
				html += "<br /><br />";
				html += "<b>Load a past tournament</b>:";
				html += "<br /><br />";
				for (const pastTournament of database.pastTournaments) {
					const format = Dex.getFormat(pastTournament.inputTarget);
					if (format) {
						html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + loadPastTournamentCommand + ", " +
							pastTournament.inputTarget, Dex.getCustomFormatName(format),
							{selectedAndDisabled: this.format && this.format.inputTarget === pastTournament.inputTarget ? true : false});
					}
				}
			}
		} else if (addableView || removableView) {
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
				html += "Click a rule below to " + (addableView ? "add it to" : "remove it from") + " your custom rules!";
			} else {
				html += "Click a " + (addableView ? "usable" : "banned") + " ";
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

				html += " below to " + (addableView ? "ban" : "unban") + " it in your custom rules!";
			}

			html += "<br /><br />";
			if (addableView) {
				if (rules) {
					html += this.addRulePagination.render();
				} else {
					html += this.banPagination.render();
				}
			} else {
				if (rules) {
					html += this.removeRulePagination.render();
				} else {
					html += this.unbanPagination.render();
				}
			}
		} else if (valueRulesView) {
			html += "<b>Force Monotype</b>:";
			html += "<br />";
			html += this.forceMonotypePicker.render();
			html += "<br /><br />";

			for (const i in this.valueRulesTextInputs) {
				html += this.valueRulesTextInputs[i].render();
				html += "<br />";
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
				new TournamentRuleManager(targetRoom, user).open();
				return;
			}

			if (!(user.id in pages) && cmd !== closeCommand) new TournamentRuleManager(targetRoom, user);

			if (cmd === closeCommand) {
				if (user.id in pages) pages[user.id].close();
			} else if (cmd === chooseFormatView) {
				pages[user.id].chooseFormatView();
			} else if (cmd === chooseAddableView) {
				pages[user.id].chooseAddableView();
			} else if (cmd === chooseRemovableView) {
				pages[user.id].chooseRemovableView();
			} else if (cmd === chooseValueRulesView) {
				pages[user.id].chooseValueRulesView();
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
			} else if (cmd === loadPastTournamentCommand) {
				pages[user.id].loadPastTournamentCommand(targets.join(","));
			} else {
				const error = pages[user.id].checkComponentCommands(cmd, targets);
				if (error) this.say(error);
			}
		},
		aliases: [baseCommandAlias],
	},
};
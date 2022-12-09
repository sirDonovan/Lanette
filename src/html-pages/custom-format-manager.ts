import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import type { IFormat } from "../types/pokemon-showdown";
import type { User } from "../users";
import { CustomRuleTextInput } from "./components/custom-rule-text-input";
import { FormatTextInput } from "./components/format-text-input";
import { type IPageElement, Pagination } from "./components/pagination";
import { type ITextInputValidation, TextInput } from "./components/text-input";
import { TypePicker } from "./components/type-picker";
import { CLOSE_COMMAND, HtmlPageBase } from "./html-page-base";

const baseCommand = 'customformatmanager';
const baseCommandAlias = 'cfm';
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
const customFormatNameInputCommand = 'selectcustomformatname';
const customRulesInputCommand = 'selectcustomrules';
const valueRulesInputCommand = 'selectvaluerules';
const addCustomRuleCommand = 'addcustomrule';
const removeCustomRuleCommand = 'removecustomrule';
const customFormatPageCommand = 'selectcustomformatpage';
const banPageCommand = 'selectbanpage';
const unbanPageCommand = 'selectunbanpage';
const addRulePageCommand = 'selectaddrulepage';
const removeRulePageCommand = 'selectremoverulepage';
const setForceMonotypeCommand = 'setforcemonotype';
const setNextTournamentCommand = 'setnexttournament';
const createTournamentCommand = 'createtournament';
const saveCustomFormatCommand = 'saveroomcustomformat';
const deleteCustomFormatCommand = 'deleteroomcustomformat';
const loadNextTournamentCommand = 'loadnexttournament';
const loadPastTournamentCommand = 'loadpasttournament';
const loadCustomFormatCommand = 'loadcustomformat';

const abilityTag = "ability:";
const itemTag = "item:";
const moveTag = "move:";
const pokemonTag = "pokemon:";
const basePokemonTag = "basepokemon:";
const tierTag = "pokemontag:";
const forceMonotype = 'forcemonotype';

export const pageId = 'custom-format-manager';
export const pages: Dict<CustomFormatManager> = {};

class CustomFormatManager extends HtmlPageBase {
	pageId = pageId;

	currentView: 'format' | 'addable' | 'removable' | 'value-rules' = 'format';
	currentBansUnbansView: 'abilities' | 'items' | 'moves' | 'pokemon' | 'rulesets' | 'tiers' = 'pokemon';
	customFormatName: string = "";
	/**Includes both non-value and any input value rules */
	customRules: readonly string[] = [];
	/**Only includes non-value rules */
	nonValueCustomRules: readonly string[] = [];
	nonValueCustomRuleTags: Dict<string> = {};
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
	customFormatNameInput: TextInput;
	customFormatsPagination: Pagination;
	customRulesInput: CustomRuleTextInput;
	banPagination: Pagination;
	unbanPagination: Pagination;
	addRulePagination: Pagination;
	removeRulePagination: Pagination;
	forceMonotypePicker: TypePicker;

	constructor(room: Room, user: User) {
		super(room, user, baseCommandAlias, pages);

		this.canCreateTournament = Tournaments.canCreateTournament(room, user);
		this.setCloseButton();

		this.formatInput = new FormatTextInput(this, this.commandPrefix, formatsInputCommand, {
			label: "",
			submitText: "Set format",
			maxFormats: 1,
			hideClearButton: true,
			onClear: () => this.send(),
			onErrors: () => this.send(),
			onSubmit: (output) => this.setFormat(output),
			reRender: () => this.send(),
		});

		this.customFormatsPagination = new Pagination(this, this.commandPrefix, customFormatPageCommand, {
			elements: this.getCustomFormatPageElements(),
			elementsPerRow: 5,
			rowsPerPage: 8,
			pagesLabel: "Saved formats",
			onSelectPage: () => this.send(),
			reRender: () => this.send(),
		});

		this.customFormatNameInput = new TextInput(this, this.commandPrefix, customFormatNameInputCommand, {
			label: "Custom format name",
			validateSubmission: (input): ITextInputValidation => {
				if (Dex.getFormat(input)) {
					return {errors: ["'" + input + "' is already the name or alias of an existing format. Please choose something else!"]};
				}
				return {currentOutput: input};
			},
			onClear: () => this.clearCustomFormatName(),
			onErrors: () => this.send(),
			onSubmit: (output) => this.setCustomFormatName(output),
			reRender: () => this.send(),
		});

		this.customRulesInput = new CustomRuleTextInput(this, this.commandPrefix, customRulesInputCommand, {
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

		this.banPagination = new Pagination(this, this.commandPrefix, banPageCommand, {
			elements: [],
			elementsPerRow: 5,
			rowsPerPage: 8,
			pagesLabel: "Usable",
			onSelectPage: () => this.send(),
			reRender: () => this.send(),
		});

		this.unbanPagination = new Pagination(this, this.commandPrefix, unbanPageCommand, {
			elements: [],
			elementsPerRow: 5,
			rowsPerPage: 8,
			pagesLabel: "Banned",
			onSelectPage: () => this.send(),
			reRender: () => this.send(),
		});

		this.addRulePagination = new Pagination(this, this.commandPrefix, addRulePageCommand, {
			elements: [],
			elementsPerRow: 1,
			rowsPerPage: 7,
			pagesLabel: "Addable",
			onSelectPage: () => this.send(),
			reRender: () => this.send(),
		});

		this.removeRulePagination = new Pagination(this, this.commandPrefix, removeRulePageCommand, {
			elements: [],
			elementsPerRow: 1,
			rowsPerPage: 7,
			pagesLabel: "Removable",
			onSelectPage: () => this.send(),
			reRender: () => this.send(),
		});

		this.forceMonotypePicker = new TypePicker(this, this.commandPrefix, setForceMonotypeCommand, {
			hideLabel: true,
			onClear: () => this.clearForceMonotype(),
			onPick: (index, type) => this.pickForceMonotype(type),
			reRender: () => this.send(),
		});

		this.components = [this.formatInput, this.customFormatNameInput, this.customRulesInput, this.customFormatsPagination,
			this.banPagination, this.unbanPagination, this.addRulePagination, this.removeRulePagination, this.forceMonotypePicker];

		for (const rule of Dex.getRulesList()) {
			if (!rule.hasValue || rule.id === forceMonotype) continue;

			this.valueRulesTextInputs[rule.id] = new TextInput(this, this.commandPrefix, valueRulesInputCommand + rule.id, {
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
		const format = this.currentView === 'format';
		this.formatInput.active = format;
		this.customFormatsPagination.active = format;

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

	clearCustomFormatName(): void {
		if (!this.customFormatName) return;

		this.customFormatName = "";

		this.send();
	}

	setCustomFormatName(name: string): void {
		if (this.customFormatName === name) return;

		this.customFormatName = name;

		this.send();
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

		this.banPagination.updateElements(banElements, true);
		this.unbanPagination.updateElements(unbanElements, true);
	}

	setFormat(formatId: string): void {
		const format = Tournaments.getFormat(formatId, this.room);
		if (!format) return;

		this.format = format;
		this.redundantCustomRules = [];
		this.nonValueCustomRuleTags = {};

		const nonValueCustomRules = this.nonValueCustomRules.slice();
		this.nonValueCustomRules = [];

		let updatedCustomRules = false;
		if (this.format.customRules) {
			// make sure present rules are in the same format as any added rules
			const formatRules = this.format.customRules.slice();
			this.format.customRules = null;
			this.addUnvalidatedCustomRules(formatRules);
			updatedCustomRules = true;
		}

		if (nonValueCustomRules.length) {
			this.addUnvalidatedCustomRules(nonValueCustomRules);
			updatedCustomRules = true;
		}

		if (!updatedCustomRules) this.updateCustomRules();

		this.format.usableAbilities = undefined;
		this.format.usableItems = undefined;
		this.format.usableMoves = undefined;
		this.format.usablePokemon = undefined;
		this.format.usablePokemonTags = undefined;
		this.format.ruleTable = undefined;
		this.format.separatedCustomRules = undefined;

		this.updateAvailableAbilities();
		this.updateAvailableItems();
		this.updateAvailableMoves();
		this.updateAvailablePokemon();
		this.updateRulesList();
		this.updateTiersList();

		this.setBanUnbanPaginationElements();

		this.send();
	}

	removeRedundantRules(customRules: readonly string[], customRuleTags: Dict<string>): readonly string[] {
		if (!this.format) return [];

		// check rulesets and tiers first for already included bans/unbans
		this.format.customRules = null;
		this.format.ruleTable = undefined;
		let ruleTable = Dex.getRuleTable(this.format);
		const pokemonTags = Dex.getPokemonTagsList();

		const filteredCustomRules: string[] = [];
		const nonRulesetRules: string[] = [];
		for (const rule of customRules) {
			if (filteredCustomRules.includes(rule) || nonRulesetRules.includes(rule)) continue;

			const type = rule.charAt(0);
			if (type === '-' || type === '+' || type === '*') {
				if (pokemonTags.includes(rule.slice(1))) {
					if (customRuleTags[rule] && ruleTable.has(customRuleTags[rule])) {
						if (!this.redundantCustomRules.includes(rule)) this.redundantCustomRules.push(rule);
						continue;
					}

					filteredCustomRules.push(rule);
				} else {
					nonRulesetRules.push(rule);
				}
			} else {
				if (type === '!') {
					if (this.format.ruleset.includes(rule)) {
						if (!this.redundantCustomRules.includes(rule)) this.redundantCustomRules.push(rule);
						continue;
					}
				} else {
					const id = Tools.toId(rule);
					if (id && ruleTable.has(id)) {
						if (!this.redundantCustomRules.includes(rule)) this.redundantCustomRules.push(rule);
						continue;
					}
				}

				filteredCustomRules.push(rule);
			}
		}

		this.format.customRules = filteredCustomRules.slice();
		this.format.ruleTable = undefined;
		ruleTable = Dex.getRuleTable(this.format);

		for (const rule of nonRulesetRules) {
			const ban = rule.charAt(0) === '-';
			const pokemon = ban ? Dex.getPokemon(rule) : undefined;
			if ((customRuleTags[rule] && ruleTable.has(customRuleTags[rule])) ||
				(pokemon && ruleTable.has("-pokemontag:" + Tools.toId(pokemon.tier)))) {
				if (!this.redundantCustomRules.includes(rule)) this.redundantCustomRules.push(rule);
			} else {
				filteredCustomRules.push(rule);
			}
		}

		this.format.customRules = null;
		this.format.ruleTable = undefined;
		return filteredCustomRules;
	}

	addUnvalidatedCustomRules(rules: readonly string[]): void {
		const validatedCustomRules: string[] = [];
		for (const rule of rules) {
			try {
				const validated = Dex.validateRule(rule);
				if (typeof validated === 'string') validatedCustomRules.push(validated);
			} catch (e) {} // eslint-disable-line no-empty
		}

		if (validatedCustomRules.length) {
			this.addCustomRules(validatedCustomRules.join(','));
		}
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
		const pokemonTagsById: Dict<string> = {
			'allabilities': 'All Abilities',
			'allitems': 'All Items',
			'allmoves': 'All Moves',
			'allpokemon': 'All Pokemon',
		};

		for (const tag of pokemonTags) {
			pokemonTagsById[Tools.toId(tag)] = tag;
		}

		const newCustomRules = this.nonValueCustomRules.slice();
		const newCustomRuleTags = Object.assign({}, this.nonValueCustomRuleTags);
		const rules = output.split(',');
		for (const rule of rules) {
			let name = rule.trim();
			let type = name.charAt(0);
			if (type === '+' || type === '-' || type === '*' || type === '!') {
				name = name.slice(1);
			} else {
				type = "";
			}

			let limit = "";
			const limitIndex = name.indexOf(" > ");
			if (limitIndex !== -1) {
				limit = name.slice(limitIndex);
				name = name.slice(0, limitIndex);
			}

			let complexBanSymbol = "";
			let parts: string[];
			if (name.includes("++")) {
				complexBanSymbol = "++";
				parts = name.split("++").map(x => x.trim());
			} else if (name.includes("+")) {
				complexBanSymbol = "+";
				parts = name.split("+").map(x => x.trim());
			} else {
				parts = [name];
			}

			let formattedName = "";
			let tag = "";
			for (const part of parts) {
				if (part.startsWith(abilityTag)) {
					let abilityName = part.split(":")[1];
					let abilityId = Tools.toId(abilityName);
					if (abilityId === 'noability') {
						abilityName = "No Ability";
					} else {
						const ability = Dex.getAbility(abilityName);
						if (!ability) continue;

						abilityName = ability.name;
						abilityId = ability.id;
					}

					if (complexBanSymbol) {
						if (formattedName) formattedName += " " + complexBanSymbol + " ";
					} else {
						tag = abilityTag + abilityId;
					}

					formattedName += abilityName;
					changedAbilities = true;
				} else if (part.startsWith(itemTag)) {
					let itemName = part.split(":")[1];
					let itemId = Tools.toId(itemName);
					if (itemId === 'noitem') {
						itemName = "No Item";
					} else {
						const item = Dex.getItem(itemName);
						if (!item) continue;

						itemName = item.name;
						itemId = item.id;
					}

					if (complexBanSymbol) {
						if (formattedName) formattedName += " " + complexBanSymbol + " ";
					} else {
						tag = itemTag + itemId;
					}

					formattedName += itemName;
					changedItems = true;
				} else if (part.startsWith(moveTag)) {
					const move = Dex.getMove(part.split(":")[1]);
					if (!move) continue;

					if (complexBanSymbol) {
						if (formattedName) formattedName += " " + complexBanSymbol + " ";
					} else {
						tag = moveTag + move.id;
					}

					formattedName += move.name;
					changedMoves = true;
				} else if (part.startsWith(pokemonTag) || part.startsWith(basePokemonTag)) {
					const pokemon = Dex.getPokemon(part.split(":")[1]);
					if (!pokemon) continue;

					if (complexBanSymbol) {
						if (formattedName) formattedName += " " + complexBanSymbol + " ";
					} else {
						tag = (part.startsWith(pokemonTag) ? pokemonTag : basePokemonTag) + pokemon.id;
					}

					formattedName += pokemon.name;
					changedPokemon = true;
				} else if (part.startsWith(tierTag)) {
					const id = Tools.toId(part.split(":")[1]);
					if (!(id in pokemonTagsById)) continue;

					if (complexBanSymbol) {
						if (formattedName) formattedName += " " + complexBanSymbol + " ";
					} else {
						tag = tierTag + id;
					}

					formattedName += pokemonTagsById[id];
					changedTiers = true;
				} else {
					const valueParts = part.split("=");
					if (valueParts.length === 2) {
						const id = Tools.toId(valueParts[0]);
						if (id === forceMonotype) {
							const pokemonType = Dex.getType(valueParts[1]);
							if (pokemonType) {
								this.forceMonotype = id + "=" + pokemonType.name;
								changedPokemon = true;
							}
						} else if (id in this.valueRulesTextInputs) {
							const validatedRule = Dex.validateRule(part);
							if (typeof validatedRule === 'string') {
								this.valueRulesOutputs[id] = validatedRule;
								changedPokemon = true;
							}
						}

						continue;
					} else {
						const format = Dex.getFormat(part);
						if (!format) continue;

						if (complexBanSymbol && formattedName) formattedName += " " + complexBanSymbol + " ";
						formattedName += format.name;
					}

					changedRules = true;
				}
			}

			if (!formattedName) continue;

			const formattedRule = type + formattedName + limit;
			if (formattedRule && !newCustomRules.includes(formattedRule)) {
				newCustomRules.push(formattedRule);
				if (tag) newCustomRuleTags[formattedRule] = type + tag;
			}
		}

		if (!changedAbilities && !changedItems && !changedMoves && !changedPokemon && !changedTiers && !changedRules) {
			this.send();
			return;
		}

		this.redundantCustomRules = [];
		this.updateCustomRules(this.removeRedundantRules(newCustomRules, newCustomRuleTags), newCustomRuleTags);

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
			const id = Tools.toId(parts[0]);
			if (id === forceMonotype) {
				this.forceMonotype = null;
			} else if (id in this.valueRulesOutputs) {
				delete this.valueRulesOutputs[id];
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
			delete this.nonValueCustomRuleTags[rule];

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

	updateCustomRules(nonValueCustomRules?: readonly string[], nonValueCustomRuleTags?: Dict<string>): void {
		if (!this.format) return;

		if (nonValueCustomRules) this.nonValueCustomRules = nonValueCustomRules;
		if (nonValueCustomRuleTags) this.nonValueCustomRuleTags = nonValueCustomRuleTags;

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

		this.format.ruleTable = undefined;
		this.format.separatedCustomRules = undefined;
	}

	updateAvailableAbilities(): void {
		if (!this.format) return;

		this.abilitiesToBan = [];
		this.abilitiesToUnban = [];

		try {
			const usableAbilities = Dex.getUsableAbilities(this.format);
			for (const ability of Dex.getAbilitiesList()) {
				if (usableAbilities.includes(ability.name)) {
					this.abilitiesToBan.push(ability.name);
				} else {
					this.abilitiesToUnban.push(ability.name);
				}
			}
		} catch (e) {
			Tools.logError(e as Error, "Error getting usable abilities in format " + this.format.id +
				(this.format.customRules ? " with custom rules: [" + this.format.customRules.join(", ") + "]" : ""));
		}
	}

	updateAvailableItems(): void {
		if (!this.format) return;

		this.itemsToBan = [];
		this.itemsToUnban = [];

		try {
			const usableItems = Dex.getUsableItems(this.format);
			for (const item of Dex.getItemsList()) {
				if (usableItems.includes(item.name)) {
					this.itemsToBan.push(item.name);
				} else {
					this.itemsToUnban.push(item.name);
				}
			}
		} catch (e) {
			Tools.logError(e as Error, "Error getting usable items in format " + this.format.id +
				(this.format.customRules ? " with custom rules: [" + this.format.customRules.join(", ") + "]" : ""));
		}
	}

	updateAvailableMoves(): void {
		if (!this.format) return;

		this.movesToBan = [];
		this.movesToUnban = [];

		try {
			const usableMoves = Dex.getUsableMoves(this.format);
			for (const move of Dex.getMovesList()) {
				if (usableMoves.includes(move.name)) {
					this.movesToBan.push(move.name);
				} else {
					this.movesToUnban.push(move.name);
				}
			}
		} catch (e) {
			Tools.logError(e as Error, "Error getting usable moves in format " + this.format.id +
				(this.format.customRules ? " with custom rules: [" + this.format.customRules.join(", ") + "]" : ""));
		}
	}

	updateAvailablePokemon(): void {
		if (!this.format) return;

		this.pokemonToBan = [];
		this.pokemonToUnban = [];

		try {
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
		} catch (e) {
			Tools.logError(e as Error, "Error getting usable Pokemon in format " + this.format.id +
				(this.format.customRules ? " with custom rules: [" + this.format.customRules.join(", ") + "]" : ""));
		}
	}

	updateRulesList(): void {
		if (!this.format) return;

		this.rulesetsToAdd = [];
		this.rulesetsToRemove = [];

		try {
			const ruleTable = Dex.getRuleTable(this.format);
			for (const rule of Dex.getRulesList()) {
				if (rule.hasValue) continue;

				if (ruleTable.has(rule.id)) {
					this.rulesetsToRemove.push(rule.name);
				} else {
					this.rulesetsToAdd.push(rule.name);
				}
			}
		} catch (e) {
			Tools.logError(e as Error, "Error getting rule table in format " + this.format.id +
				(this.format.customRules ? " with custom rules: [" + this.format.customRules.join(", ") + "]" : ""));
		}
	}

	updateTiersList(): void {
		if (!this.format) return;

		this.tiersToBan = [];
		this.tiersToUnban = [];

		try {
			const usablePokemonTags = Dex.getUsablePokemonTags(this.format);
			const pokemonTagsList = Dex.getPokemonTagsList().slice().sort();
			for (const tag of pokemonTagsList) {
				if (usablePokemonTags.includes(tag)) {
					this.tiersToBan.push(tag);
				} else {
					this.tiersToUnban.push(tag);
				}
			}
		} catch (e) {
			Tools.logError(e as Error, "Error getting usable Pokemon tags in format " + this.format.id +
				(this.format.customRules ? " with custom rules: [" + this.format.customRules.join(", ") + "]" : ""));
		}
	}

	getCustomFormatId(nextTournamentCommand?: boolean): string {
		if (!this.format) return "";
		let formatId = this.format.id;
		if (this.customRules.length) {
			formatId += (nextTournamentCommand ? ", " : "@@@") + this.customRules.join(nextTournamentCommand ? ", " : ",");
		}

		return formatId;
	}

	getCommandFormatId(): string | undefined {
		if (!this.format || !this.canCreateTournament) return;

		let formatId: string | undefined;
		if (this.isUnchangedCustomFormat() && Tournaments.getFormat(this.customFormatName, this.room)) {
			formatId = this.customFormatName;
		} else {
			formatId = this.getCustomFormatId(true);
		}

		return formatId;
	}

	setNextTournament(): void {
		const formatId = this.getCommandFormatId();
		if (!formatId) return;

		const user = Users.get(this.userName);
		if (user) {
			CommandParser.parse(this.room, user, Config.commandCharacter + "forcenexttour " + formatId, Date.now());
		}
	}

	createTournament(): void {
		const formatId = this.getCommandFormatId();
		if (!formatId) return;

		const user = Users.get(this.userName);
		if (user) {
			CommandParser.parse(this.room, user, Config.commandCharacter + "createtour " + formatId, Date.now());
		}
	}

	isUnchangedCustomFormat(): boolean {
		const customFormatId = Tools.toId(this.customFormatName);
		const database = Storage.getDatabase(this.room);
		return customFormatId && database.customFormats && customFormatId in database.customFormats &&
			database.customFormats[customFormatId].formatId === this.getCustomFormatId() ? true : false;
	}

	getCustomFormatPageElements(): IPageElement[] {
		const elements: IPageElement[] = [];
		const database = Storage.getDatabase(this.room);
		if (database.customFormats) {
			for (const i in database.customFormats) {
				const format = Tournaments.getFormat(database.customFormats[i].name, this.room);
				if (!format) continue;

				elements.push({html: "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + loadCustomFormatCommand + ", " + i,
					database.customFormats[i].name)});
			}
		}

		return elements;
	}

	loadCustomFormat(customId: string): void {
		customId = customId.trim();
		const database = Storage.getDatabase(this.room);
		if (!database.customFormats || !(customId in database.customFormats)) return;

		const format = Tournaments.getFormat(database.customFormats[customId].name, this.room);
		if (!format) return;

		this.customFormatName = database.customFormats[customId].name;
		this.customFormatNameInput.parentSetInput(this.customFormatName);
		this.formatInput.parentSetInput(format.id);

		this.loadFormat(database.customFormats[customId].name);
	}

	saveCustomFormat(): void {
		if (!this.customFormatName || !this.format || !this.canCreateTournament) return;

		const formatId = this.getCustomFormatId();
		if (!formatId) return;

		const database = Storage.getDatabase(this.room);
		if (!database.customFormats) database.customFormats = {};

		const id = Tools.toId(this.customFormatName);
		database.customFormats[id] = {
			formatId,
			name: this.customFormatName,
		};

		this.customFormatsPagination.updateElements(this.getCustomFormatPageElements());
		this.setFormat(this.customFormatName);

		this.room.modnote(this.userName + " saved the custom format " + this.customFormatName + " to the database");

		void Storage.exportDatabase(this.room.id);
	}

	deleteCustomFormat(): void {
		if (!this.customFormatName || !this.canCreateTournament) return;

		const database = Storage.getDatabase(this.room);
		if (!database.customFormats) return;

		const id = Tools.toId(this.customFormatName);
		if (!(id in database.customFormats)) return;

		delete database.customFormats[id];
		this.customFormatsPagination.updateElements(this.getCustomFormatPageElements());
		this.send();
		this.room.modnote(this.userName + " deleted the custom format " + this.customFormatName + " from the database");

		void Storage.exportDatabase(this.room.id);
	}

	loadFormat(formatId: string): void {
		const format = Tournaments.getFormat(formatId, this.room);
		if (format) {
			this.forceMonotype = null;
			this.valueRulesOutputs = {};
			this.nonValueCustomRules = [];
			this.customRules = [];
			this.formatInput.parentSetInput(format.id);

			this.customFormatName = format.customFormatName || "";
			this.customFormatNameInput.parentSetInput(this.customFormatName);

			this.setFormat(formatId);
		}
	}

	loadNextTournament(): void {
		const database = Storage.getDatabase(this.room);
		if (database.queuedTournament) {
			this.loadFormat(database.queuedTournament.formatid);
		}
	}

	loadPastTournament(formatid: string): void {
		this.loadFormat(formatid);
	}

	render(): string {
		const database = Storage.getDatabase(this.room);

		let html = "<div class='chat' style='margin-top: 4px;margin-left: 4px'><center><b>Custom Format Manager</b>";
		html += "&nbsp;" + this.closeButtonHtml;
		html += "</center><br />";

		if (this.format) {
			html += "<b>Format name</b>:&nbsp;" + Dex.getCustomFormatName(this.format) +
				(this.format.tournamentName ? " (Base format: " + this.format.name + ")" : "");
			html += "<br /><br />";

			const hasCustomRules = this.customRules.length > 0;
			const challengeId = this.format.id + (hasCustomRules ? "@@@" + this.customRules.join(", ") : "");
			let validatedFormat = false;
			if (hasCustomRules) {
				html += "<b>Current rules</b>:";
				html += "<br />";
				html += Dex.getCustomRulesHtml(this.format);

				html += "<br /><br />";
				html += "<b>Remove custom rules</b>:";
				html += "<br />";
				for (const rule of this.customRules) {
					html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + removeCustomRuleCommand + ", " + rule,
						rule);
				}

				try {
					Dex.validateFormat(challengeId);
					validatedFormat = true;
				} catch (e) {
					html += "<br /><br />";
					html += "<div style='color:red'><b>ERROR</b>: " + (e as Error).message + "</div>";
				}
			} else if (!this.redundantCustomRules.length) {
				html += "You have not specified any custom rules! Use the bans view, unbans view, or enter rules manually below.";
				validatedFormat = true;
			}

			html += "<br /><br />";
			html += "<b>Challenge</b>: <code>" + challengeId + "</code>";
			if (this.canCreateTournament) {
				if (hasCustomRules) {
					html += " | <b>Tournament</b>: <code>/tour rules " + this.customRules.join(", ") + "</code>";
				}

				html += " | " + this.getQuietPmButton(this.commandPrefix + ", " + setNextTournamentCommand,
					"Set as " + Config.commandCharacter + "nexttour", {disabled: !validatedFormat});
				html += " | " + this.getQuietPmButton(this.commandPrefix + ", " + createTournamentCommand,
					"Create tournament", {disabled: !validatedFormat});
				html += "<br /><br />";
				html += this.customFormatNameInput.render();

				const customFormatId = Tools.toId(this.customFormatName);
				html += this.getQuietPmButton(this.commandPrefix + ", " + saveCustomFormatCommand, "Save to database",
					{disabled: !validatedFormat || !customFormatId || this.isUnchangedCustomFormat()});
				if (database.customFormats && customFormatId in database.customFormats) {
					html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + deleteCustomFormatCommand, "Remove from database");
				}
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

			if (database.customFormats) {
				html += "<br /><br />";
				html += "<b>Load from the database</b>:";
				html += "<br /><br />";
				html += this.customFormatsPagination.render();
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
				new CustomFormatManager(targetRoom, user).open();
				return;
			}

			if (!(user.id in pages) && cmd !== CLOSE_COMMAND) new CustomFormatManager(targetRoom, user);

			if (cmd === CLOSE_COMMAND) {
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
				pages[user.id].setNextTournament();
			} else if (cmd === createTournamentCommand) {
				pages[user.id].createTournament();
			} else if (cmd === loadNextTournamentCommand) {
				pages[user.id].loadNextTournament();
			} else if (cmd === loadPastTournamentCommand) {
				pages[user.id].loadPastTournament(targets.join(","));
			} else if (cmd === loadCustomFormatCommand) {
				pages[user.id].loadCustomFormat(targets[0]);
			} else if (cmd === saveCustomFormatCommand) {
				pages[user.id].saveCustomFormat();
			} else if (cmd === deleteCustomFormatCommand) {
				pages[user.id].deleteCustomFormat();
			} else {
				const error = pages[user.id].checkComponentCommands(cmd, targets);
				if (error) this.say(error);
			}
		},
		aliases: [baseCommandAlias, 'tournamentrulemanager', 'trm'],
	},
};
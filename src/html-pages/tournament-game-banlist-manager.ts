import type { Room } from "../rooms";
import type { BaseCommandDefinitions } from "../types/command-parser";
import { IDatabase } from "../types/storage";
import type { User } from "../users";
import { AbilityChoices, AbilityTextInput } from "./components/ability-text-input";
import { ItemChoices, ItemTextInput } from "./components/item-text-input";
import { MoveChoices, MoveTextInput } from "./components/move-text-input";
import { PokemonChoices } from "./components/pokemon-picker-base";
import { PokemonTextInput } from "./components/pokemon-text-input";
import { RuleChoices, RuleTextInput } from "./components/rule-text-input";
import { CLOSE_COMMAND, HtmlPageBase } from "./html-page-base";

const baseCommand = 'tournamentgamebanlistmanager';
const baseCommandAlias = 'tgbm';
const chooseFormatCommand = 'chooseformat';
const chooseAbilitesViewCommand = 'chooseabilities';
const chooseItemsViewCommand = 'chooseitems';
const chooseMovesViewCommand = 'choosemoves';
const choosePokemonViewCommand = 'choosepokemon';
const chooseRulesViewCommand = 'chooserules';
const abilityInputCommand = 'abilityinput';
const removeAbilityCommand = 'removeability';
const itemInputCommand = 'iteminput';
const removeItemCommand = 'removeitem';
const moveInputCommand = 'moveinput';
const removeMoveCommand = 'removemove';
const pokemonInputCommand = 'pokemoninput';
const removePokemonCommand = 'removepokemon';
const ruleInputCommand = 'ruleinput';
const removeRuleCommand = 'removepokemon';

export const pageId = 'tournament-game-banlist-manager';
export const pages: Dict<TournamentGameBanlistManager> = {};

class TournamentGameBanlistManager extends HtmlPageBase {
	pageId = pageId;

	currentView: 'abilities' | 'items' | 'moves' | 'pokemon' | 'rules' = 'pokemon';
	currentFormatId: string = "";
	currentFormatName: string = "";
	formatIds: string[] = [];
	formatNames: Dict<string> = {};

	abilityInput: AbilityTextInput;
	itemInput: ItemTextInput;
	moveInput: MoveTextInput;
	pokemonInput: PokemonTextInput;
	ruleInput: RuleTextInput;

	constructor(room: Room, user: User) {
		super(room, user, baseCommandAlias, pages);

		this.setCloseButtonHtml();

		const formatList = Games.getTournamentFormatList();
		for (const format of formatList) {
			this.formatIds.push(format.id);
			this.formatNames[format.id] = format.name;
		}

		this.abilityInput = new AbilityTextInput(this, this.commandPrefix, abilityInputCommand, {
			name: "Abilties",
			submitText: "Add ability(ies)",
			hideClearButton: true,
			textArea: true,
			textAreaConfiguration: {rows: 3, cols: 60},
			onSubmit: (output) => this.addAbilities(output),
			reRender: () => this.send(),
		});

		this.itemInput = new ItemTextInput(this, this.commandPrefix, itemInputCommand, {
			name: "Items",
			submitText: "Add item(s)",
			hideClearButton: true,
			textArea: true,
			textAreaConfiguration: {rows: 3, cols: 60},
			onSubmit: (output) => this.addItems(output),
			reRender: () => this.send(),
		});

		this.moveInput = new MoveTextInput(this, this.commandPrefix, moveInputCommand, {
			name: "Moves",
			submitText: "Add move(s)",
			hideClearButton: true,
			textArea: true,
			textAreaConfiguration: {rows: 3, cols: 60},
			onSubmit: (output) => this.addMoves(output),
			reRender: () => this.send(),
		});

		this.pokemonInput = new PokemonTextInput(this, this.commandPrefix, pokemonInputCommand, {
			name: "Pokemon",
			submitText: "Add Pokemon(s)",
			hideClearButton: true,
			textArea: true,
			textAreaConfiguration: {rows: 3, cols: 60},
			onSubmit: (output) => this.addPokemon(output),
			reRender: () => this.send(),
		});

		this.ruleInput = new RuleTextInput(this, this.commandPrefix, ruleInputCommand, {
			name: "Rules",
			submitText: "Add rule(s)",
			hideClearButton: true,
			textArea: true,
			textAreaConfiguration: {rows: 3, cols: 60},
			onSubmit: (output) => this.addRules(output),
			reRender: () => this.send(),
		});

		this.components = [this.abilityInput, this.itemInput, this.moveInput, this.pokemonInput, this.ruleInput];
	}

	chooseFormat(id: string): void {
		if (id === this.currentFormatId || !this.formatIds.includes(id)) return;

		this.currentFormatId = id;
		this.currentFormatName = this.formatNames[id];

		this.send();
	}

	chooseAbilitiesView(): void {
		if (this.currentView === 'abilities') return;

		this.currentView = 'abilities';
		this.send();
	}

	chooseItemsView(): void {
		if (this.currentView === 'items') return;

		this.currentView = 'items';
		this.send();
	}

	chooseMovesView(): void {
		if (this.currentView === 'moves') return;

		this.currentView = 'moves';
		this.send();
	}

	choosePokemonView(): void {
		if (this.currentView === 'pokemon') return;

		this.currentView = 'pokemon';
		this.send();
	}

	chooseRulesView(): void {
		if (this.currentView === 'rules') return;

		this.currentView = 'rules';
		this.send();
	}

	getDatabase(): IDatabase {
		const database = Storage.getDatabase(this.room);
		if (!database.tournamentGameFormatBanlists) database.tournamentGameFormatBanlists = {};
		if (!(this.currentFormatId in database.tournamentGameFormatBanlists)) {
			database.tournamentGameFormatBanlists[this.currentFormatId] = {
				abilities: [],
				items: [],
				moves: [],
				pokemon: [],
				rules: [],
			}
		}

		return database;
	}

	addAbilities(choices: AbilityChoices): void {
		if (!this.currentFormatId) return;

		const database = this.getDatabase();

		for (const choice of choices) {
			if (!choice) continue;

			const id = Tools.toId(choice.ability);
			if (id && !database.tournamentGameFormatBanlists![this.currentFormatId].abilities.includes(id)) {
				database.tournamentGameFormatBanlists![this.currentFormatId].abilities.push(id);
			}
		}

		this.send();
	}

	removeAbility(ability: string): void {
		if (!this.currentFormatId) return;

		const database = Storage.getDatabase(this.room);
		if (!database.tournamentGameFormatBanlists || !(this.currentFormatId in database.tournamentGameFormatBanlists)) return;

		const id = Tools.toId(ability);
		const index = database.tournamentGameFormatBanlists[this.currentFormatId].abilities.indexOf(id);
		if (index !== -1) database.tournamentGameFormatBanlists[this.currentFormatId].abilities.splice(index, 1);

		this.send();
	}

	addItems(choices: ItemChoices): void {
		if (!this.currentFormatId) return;

		const database = this.getDatabase();

		for (const choice of choices) {
			if (!choice) continue;

			const id = Tools.toId(choice.item);
			if (id && !database.tournamentGameFormatBanlists![this.currentFormatId].items.includes(id)) {
				database.tournamentGameFormatBanlists![this.currentFormatId].items.push(id);
			}
		}

		this.send();
	}

	removeItem(item: string): void {
		if (!this.currentFormatId) return;

		const database = Storage.getDatabase(this.room);
		if (!database.tournamentGameFormatBanlists || !(this.currentFormatId in database.tournamentGameFormatBanlists)) return;

		const id = Tools.toId(item);
		const index = database.tournamentGameFormatBanlists[this.currentFormatId].items.indexOf(id);
		if (index !== -1) database.tournamentGameFormatBanlists[this.currentFormatId].items.splice(index, 1);

		this.send();
	}

	addMoves(choices: MoveChoices): void {
		if (!this.currentFormatId) return;

		const database = this.getDatabase();

		for (const choice of choices) {
			if (!choice) continue;

			const id = Tools.toId(choice.move);
			if (id && !database.tournamentGameFormatBanlists![this.currentFormatId].moves.includes(id)) {
				database.tournamentGameFormatBanlists![this.currentFormatId].moves.push(id);
			}
		}

		this.send();
	}

	removeMove(move: string): void {
		if (!this.currentFormatId) return;

		const database = Storage.getDatabase(this.room);
		if (!database.tournamentGameFormatBanlists || !(this.currentFormatId in database.tournamentGameFormatBanlists)) return;

		const id = Tools.toId(move);
		const index = database.tournamentGameFormatBanlists[this.currentFormatId].moves.indexOf(id);
		if (index !== -1) database.tournamentGameFormatBanlists[this.currentFormatId].moves.splice(index, 1);

		this.send();
	}

	addPokemon(choices: PokemonChoices): void {
		if (!this.currentFormatId) return;

		const database = this.getDatabase();

		for (const choice of choices) {
			if (!choice) continue;

			const id = Tools.toId(choice.pokemon);
			if (id && !database.tournamentGameFormatBanlists![this.currentFormatId].pokemon.includes(id)) {
				database.tournamentGameFormatBanlists![this.currentFormatId].pokemon.push(id);
			}
		}

		this.send();
	}

	removePokemon(pokemon: string): void {
		if (!this.currentFormatId) return;

		const database = Storage.getDatabase(this.room);
		if (!database.tournamentGameFormatBanlists || !(this.currentFormatId in database.tournamentGameFormatBanlists)) return;

		const id = Tools.toId(pokemon);
		const index = database.tournamentGameFormatBanlists[this.currentFormatId].pokemon.indexOf(id);
		if (index !== -1) database.tournamentGameFormatBanlists[this.currentFormatId].pokemon.splice(index, 1);

		this.send();
	}

	addRules(choices: RuleChoices): void {
		if (!this.currentFormatId) return;

		const database = this.getDatabase();

		for (const choice of choices) {
			if (!choice) continue;

			const id = Tools.toId(choice.rule);
			if (id && !database.tournamentGameFormatBanlists![this.currentFormatId].rules.includes(id)) {
				database.tournamentGameFormatBanlists![this.currentFormatId].rules.push(id);
			}
		}

		this.send();
	}

	removeRule(rule: string): void {
		if (!this.currentFormatId) return;

		const database = Storage.getDatabase(this.room);
		if (!database.tournamentGameFormatBanlists || !(this.currentFormatId in database.tournamentGameFormatBanlists)) return;

		const id = Tools.toId(rule);
		const index = database.tournamentGameFormatBanlists[this.currentFormatId].rules.indexOf(id);
		if (index !== -1) database.tournamentGameFormatBanlists[this.currentFormatId].rules.splice(index, 1);

		this.send();
	}

	render(): string {
		let html = "<div class='chat' style='margin-top: 4px;margin-left: 4px'><center><b>" +
			this.room.title + " Tournament Game Banlists</b>";
		html += "&nbsp;" + this.closeButtonHtml;
		html += "</center>";
		html += "<br /><br />";

		html += "<b>Choose a game format</b>:<br />";
		for (let i = 0; i < this.formatIds.length; i++) {
			if (i > 0) html += "&nbsp;";

			const id = this.formatIds[i];
			html += this.getQuietPmButton(this.commandPrefix + ", " + chooseFormatCommand + ", " + id, this.formatNames[id],
				{selectedAndDisabled: this.currentFormatId === id});
		}

		if (this.currentFormatId) {
			html += "<br /><br />";
			html += "Add or remove Pokemon below to control the base banlist that " + this.formatNames[this.currentFormatId] + " uses " +
				"when assigning starting teams!";
			html += "<br /><br />";

			const database = Storage.getDatabase(this.room);
			if (!database.tournamentGameFormatBanlists) database.tournamentGameFormatBanlists = {};

			const abilitiesView = this.currentView === 'abilities';
			const itemsView = this.currentView === 'items';
			const movesView = this.currentView === 'moves';
			const pokemonView = this.currentView === 'pokemon';
			const rulesView = this.currentView === 'rules';

			html += "<b>Current banlist</b>:";
			html += this.getQuietPmButton(this.commandPrefix + ", " + chooseAbilitesViewCommand, "Abilities",
				{selectedAndDisabled: abilitiesView});
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseItemsViewCommand, "Items",
				{selectedAndDisabled: itemsView});
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseMovesViewCommand, "Moves",
				{selectedAndDisabled: movesView});
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + choosePokemonViewCommand, "Pokemon",
				{selectedAndDisabled: pokemonView});
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + chooseRulesViewCommand, "Rules",
				{selectedAndDisabled: rulesView});
			html += "<br />";

			if (abilitiesView) {
				const abilityList: string[] = [];
				if (this.currentFormatId in database.tournamentGameFormatBanlists) {
					for (const id of database.tournamentGameFormatBanlists[this.currentFormatId].abilities) {
						abilityList.push(id);
					}
				}

				if (abilityList.length) {
					html += "<ul>";
					for (const id of abilityList) {
						const ability = Dex.getExistingAbility(id);
						html += "<li>" + ability.name + "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " +
							removeAbilityCommand + ", " + id, "remove") + "</li>";
					}
					html += "</ul>";
				} else {
					html += "No abilities have been added.";
				}

				html += "<br /><br />";
				html += this.abilityInput.render();
			} else if (itemsView) {
				const itemList: string[] = [];
				if (this.currentFormatId in database.tournamentGameFormatBanlists) {
					for (const id of database.tournamentGameFormatBanlists[this.currentFormatId].items) {
						itemList.push(id);
					}
				}

				if (itemList.length) {
					html += "<ul>";
					for (const id of itemList) {
						const item = Dex.getExistingItem(id);
						html += "<li>" + item.name + "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " +
							removeItemCommand + ", " + id, "remove") + "</li>";
					}
					html += "</ul>";
				} else {
					html += "No items have been added.";
				}

				html += "<br /><br />";
				html += this.itemInput.render();
			} else if (movesView) {
				const moveList: string[] = [];
				if (this.currentFormatId in database.tournamentGameFormatBanlists) {
					for (const id of database.tournamentGameFormatBanlists[this.currentFormatId].moves) {
						moveList.push(id);
					}
				}

				if (moveList.length) {
					html += "<ul>";
					for (const id of moveList) {
						const move = Dex.getExistingMove(id);
						html += "<li>" + move.name + "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " +
							removeMoveCommand + ", " + id, "remove") + "</li>";
					}
					html += "</ul>";
				} else {
					html += "No moves have been added.";
				}

				html += "<br /><br />";
				html += this.moveInput.render();
			} else if (pokemonView) {
				const pokemonList: string[] = [];
				if (this.currentFormatId in database.tournamentGameFormatBanlists) {
					for (const id of database.tournamentGameFormatBanlists[this.currentFormatId].pokemon) {
						pokemonList.push(id);
					}
				}

				if (pokemonList.length) {
					html += "<ul>";
					for (const id of pokemonList) {
						const pokemon = Dex.getExistingPokemon(id);
						html += "<li>" + pokemon.name + "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + removePokemonCommand +
							", " + id, "remove") + "</li>";
					}
					html += "</ul>";
				} else {
					html += "No Pokemon have been added.";
				}

				html += "<br /><br />";
				html += this.pokemonInput.render();
			} else {
				const rulesList: string[] = [];
				if (this.currentFormatId in database.tournamentGameFormatBanlists) {
					for (const id of database.tournamentGameFormatBanlists[this.currentFormatId].rules) {
						rulesList.push(id);
					}
				}

				if (rulesList.length) {
					html += "<ul>";
					for (const id of rulesList) {
						const rule = Dex.getExistingFormat(id);
						html += "<li>" + rule.name + "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + removeRuleCommand +
							", " + id, "remove") + "</li>";
					}
					html += "</ul>";
				} else {
					html += "No rules have been added.";
				}

				html += "<br /><br />";
				html += this.ruleInput.render();
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

			if (!user.hasRank(targetRoom, 'driver')) return;

			const cmd = Tools.toId(targets[0]);
			targets.shift();

			if (!cmd) {
				new TournamentGameBanlistManager(targetRoom, user).open();
				return;
			}

			if (!(user.id in pages) && cmd !== CLOSE_COMMAND) new TournamentGameBanlistManager(targetRoom, user);

			if (cmd === chooseFormatCommand) {
				pages[user.id].chooseFormat(targets[0].trim());
			} else if (cmd === chooseAbilitesViewCommand) {
				pages[user.id].chooseAbilitiesView();
			} else if (cmd === chooseItemsViewCommand) {
				pages[user.id].chooseItemsView();
			} else if (cmd === chooseMovesViewCommand) {
				pages[user.id].chooseMovesView();
			} else if (cmd === choosePokemonViewCommand) {
				pages[user.id].choosePokemonView();
			} else if (cmd === chooseRulesViewCommand) {
				pages[user.id].chooseRulesView();
			} else if (cmd === removeAbilityCommand) {
				pages[user.id].removeAbility(targets[0].trim());
			} else if (cmd === removeItemCommand) {
				pages[user.id].removeItem(targets[0].trim());
			} else if (cmd === removeMoveCommand) {
				pages[user.id].removeMove(targets[0].trim());
			} else if (cmd === removePokemonCommand) {
				pages[user.id].removePokemon(targets[0].trim());
			} else if (cmd === removeRuleCommand) {
				pages[user.id].removeRule(targets[0].trim());
			} else if (cmd === CLOSE_COMMAND) {
				if (user.id in pages) pages[user.id].close();
			} else {
				const error = pages[user.id].checkComponentCommands(cmd, targets);
				if (error) this.say(error);
			}
		},
		aliases: [baseCommandAlias],
	},
};
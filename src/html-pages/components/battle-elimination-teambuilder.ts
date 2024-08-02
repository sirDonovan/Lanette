import type { BattleElimination, IRoundTeamRequirements, ITeamChange } from "../../games/templates/battle-elimination";
import type { Player } from "../../room-activity";
import type { ModelGeneration } from "../../types/dex";
import type { HtmlPageBase, HtmlSelector } from "../html-page-base";
import { ComponentBase, type IComponentProps } from "./component-base";

export interface IBattleEliminationTeambuilderProps extends IComponentProps {
	game: BattleElimination;
	gen: number;
	player: Player;
	rerollCommand: string;
	modelGeneration: ModelGeneration;
}

const addPokemonCommand = 'addpokemon';
const dropPokemonCommand = 'droppokemon';
const evolvePokemonCommand = 'evolvepokemon';
const devolvePokemonCommand = 'devolvepokemon';
const changeRoundCommand = 'changeround';

export class BattleEliminationTeambuilder extends ComponentBase {

	componentId: string = 'battle-elimination-teambuilder';
	declare props: IBattleEliminationTeambuilderProps;

	availableEvolutionSlots: number[] = [];
	currentRound: number = 1;
	moreRoundsAvailableMessage: string = "";
	remainingRoundAdditions: number = 0;
	remainingRoundDrops: number = 0;
	remainingRoundEvolutions: number = 0;
	roundDropChoices: string[] = [];
	roundEvolvedSlots: number[] = [];
	roundTeamChange: DeepMutable<ITeamChange> | undefined = undefined;
	roundSlots: Dict<string[] | undefined> = {};
	slots: string[] = [];
	teamBuilderImport: string = "";
	usesHtmlSelectors: boolean = true;

	battleFormatMod: string;
	roundRequirements: IRoundTeamRequirements;
	roundSelector: HtmlSelector;
	teamHeaderSelector: HtmlSelector;
	teamSelector: HtmlSelector;

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: IBattleEliminationTeambuilderProps) {
		super(htmlPage, parentCommandPrefix, componentCommand, props);

		this.battleFormatMod = props.game.battleFormat.mod;

		this.roundRequirements = {
			additionsThisRound: 0,
			currentTeamLength: 0,
			dropsThisRound: 0,
			evolutionsThisRound: 0,
		};

		this.roundSelector = this.newSelector("round");
		this.teamHeaderSelector = this.newSelector("teamheader");
		this.teamSelector = this.newSelector("team");

		this.addSelector(this.teamHeaderSelector);
		this.addSelector(this.roundSelector);
		this.addSelector(this.teamSelector);
	}

	getDex(): typeof Dex {
		return Dex.getDex(this.battleFormatMod);
	}

	tryCommand(originalTargets: readonly string[]): string | undefined {
		const targets = originalTargets.slice();
		const cmd = Tools.toId(targets[0]);
		targets.shift();

		if (cmd === addPokemonCommand) {
			this.addPokemon(targets[0].trim());
		} else if (cmd === dropPokemonCommand) {
			this.dropPokemon(targets[0].trim());
		} else if (cmd === evolvePokemonCommand) {
			this.evolvePokemon(targets[0].trim(), targets[1].trim());
		} else if (cmd === devolvePokemonCommand) {
			this.devolvePokemon(targets[0].trim(), targets[1].trim());
		} else if (cmd === changeRoundCommand) {
			const round = parseInt(targets[0].trim());
			if (!isNaN(round) && round > 1) {
				this.changeRound(round);
				this.send();
			}
		} else {
			return this.checkComponentCommands(cmd, targets);
		}
	}

	giveStartingTeam(): void {
		const starterPokemon = this.props.game.starterPokemon.get(this.props.player);
		if (!starterPokemon) return;

		this.slots = [];
		for (const name of starterPokemon) {
			const pokemon = this.getDex().getExistingPokemon(name);
			this.slots.push(pokemon.name);
		}

		this.setTeamBuilderImport();

		this.roundSlots[1] = this.slots.slice();
		if (this.currentRound > 1) this.setRound(this.currentRound);
	}

	syncRound(): void {
		this.props.game.debugLog(this.props.player.name + " syncRound() at " + this.props.player.round);

		// ensure initial add/drop/evolve buttons are shown when the player is advanced from round 1 to >2 at once
		if (this.currentRound === 1 && this.props.player.round! > 2) {
			this.moreRoundsAvailableMessage = "";
			this.setRound(2);
		} else {
			const nextRound = this.currentRound + 1;
			if (this.props.player.round! > nextRound || this.remainingRoundAdditions || this.remainingRoundDrops ||
				this.remainingRoundEvolutions) {
				this.moreRoundsAvailableMessage = "<b>Finish making changes to unlock round " + this.props.player.round + "</b>!";
			} else {
				this.moreRoundsAvailableMessage = "";
				this.setRound(this.props.player.round!);
			}
		}
	}

	nextRound(): void {
		if (this.currentRound === this.props.player.round || this.remainingRoundAdditions || this.remainingRoundDrops ||
			this.remainingRoundEvolutions) return;

		this.currentRound++;

		this.props.game.debugLog(this.props.player.name + " nextRound() going to " + this.currentRound);

		this.setRound(this.currentRound);
	}

	changeRound(round: number): void {
		this.props.game.debugLog(this.props.player.name + " changeRound() to " + round);

		const teamChangesRound = round - 1;
		if (!this.roundSlots[teamChangesRound]) return;

		this.slots = this.roundSlots[teamChangesRound].slice();

		for (let i = round; i <= this.props.player.round!; i++) {
			delete this.roundSlots[i];
		}

		this.setTeamBuilderImport();
		this.setRound(round);
	}

	setRound(round: number): void {
		this.currentRound = round;

		const teamChangesRound = this.currentRound - 1;
		if (!this.roundSlots[teamChangesRound]) this.roundSlots[teamChangesRound] = this.slots.slice();

		this.roundRequirements = this.props.game.getRoundTeamRequirements(teamChangesRound);
		this.remainingRoundAdditions = this.roundRequirements.additionsThisRound;
		this.remainingRoundDrops = this.roundRequirements.dropsThisRound;
		this.remainingRoundEvolutions = this.roundRequirements.evolutionsThisRound;

		this.roundDropChoices = this.slots.slice();

		const teamChanges = this.props.game.teamChanges.get(this.props.player) || [];
		const baseTeamChange = teamChanges[teamChangesRound - 1] as ITeamChange | undefined;
		this.roundTeamChange = baseTeamChange ? Tools.deepClone(baseTeamChange) : undefined;

		if (this.roundTeamChange && this.roundTeamChange.choices) {
			const choices = this.roundTeamChange.choices.slice();
			for (const choice of this.roundTeamChange.choices) {
				const pokemon = this.getDex().getExistingPokemon(choice);
				const formes = this.getDex().getFormes(pokemon);
				for (const forme of formes) {
					if (!choices.includes(forme) && this.props.game.battleFormat.usablePokemon!.includes(forme)) choices.push(forme);
				}
			}

			this.roundTeamChange.choices = choices;
		}

		this.roundEvolvedSlots = [];

		this.setAvailableEvolutionSlots();

		if (this.currentRound === this.props.player.round || (!this.remainingRoundAdditions && !this.remainingRoundDrops &&
			!this.remainingRoundEvolutions)) {
			this.moreRoundsAvailableMessage = "";
		}
	}

	addPokemon(name: string): void {
		if (!this.roundTeamChange || !this.roundTeamChange.choices || !this.roundTeamChange.choices.includes(name) ||
			!this.remainingRoundAdditions || this.slots.length === 6) return;

		const pokemon = this.getDex().getPokemon(name);
		if (!pokemon || this.slots.includes(pokemon.name)) return;

		this.slots.push(pokemon.name);
		this.setTeamBuilderImport();

		this.remainingRoundAdditions--;
		if (!this.remainingRoundAdditions && !this.remainingRoundDrops) {
			this.setAvailableEvolutionSlots();

			if (!this.remainingRoundEvolutions) this.nextRound();
		}

		this.send();
	}

	dropPokemon(name: string): void {
		if (!this.remainingRoundDrops || this.slots.length === 1 || !this.roundDropChoices.includes(name)) return;

		const index = this.slots.indexOf(name);
		if (index === -1) return;

		this.slots.splice(index, 1);
		this.setTeamBuilderImport();

		this.remainingRoundDrops--;
		if (!this.remainingRoundAdditions && !this.remainingRoundDrops) {
			this.setAvailableEvolutionSlots();

			if (!this.remainingRoundEvolutions) this.nextRound();
		}

		this.send();
	}

	setAvailableEvolutionSlots(): void {
		if (!this.roundRequirements.evolutionsThisRound) return;

		this.availableEvolutionSlots = [];

		const devolve = this.roundRequirements.evolutionsThisRound < 0;
		for (let i = 0; i < this.slots.length; i++) {
			const pokemon = this.getDex().getExistingPokemon(this.slots[i]);
			if (devolve) {
				const prevo = this.getDex().getPokemon(pokemon.prevo);
				if (prevo && this.props.game.battleFormat.usablePokemon!.includes(prevo.name)) this.availableEvolutionSlots.push(i);
			} else {
				for (const name of pokemon.evos) {
					const evo = this.getDex().getPokemon(name);
					if (evo && this.props.game.battleFormat.usablePokemon!.includes(evo.name)) {
						this.availableEvolutionSlots.push(i);
						break;
					}
				}
			}
		}

		const availableEvolutionSlots = this.availableEvolutionSlots.length;
		if (availableEvolutionSlots < Math.abs(this.roundRequirements.evolutionsThisRound)) {
			this.remainingRoundEvolutions = devolve ? -1 * availableEvolutionSlots : availableEvolutionSlots;
		} else if (!this.remainingRoundEvolutions) {
			this.remainingRoundEvolutions = this.roundRequirements.evolutionsThisRound;
		}
	}

	evolvePokemon(from: string, to: string): void {
		if (!this.remainingRoundEvolutions || this.roundRequirements.evolutionsThisRound < 0) return;

		const index = this.slots.indexOf(from);
		if (index === -1 || this.roundEvolvedSlots.includes(index)) return;

		const pokemon = this.getDex().getPokemon(from);
		if (!pokemon) return;

		for (const name of pokemon.evos) {
			const evo = this.getDex().getPokemon(name);
			if (!evo) continue;

			const formes = this.getDex().getFormes(evo);
			if (formes.includes(to) && this.props.game.battleFormat.usablePokemon!.includes(to)) {
				this.slots.splice(index, 1, to);
				this.roundEvolvedSlots.push(index);

				this.setTeamBuilderImport();

				this.remainingRoundEvolutions--;
				if (!this.remainingRoundEvolutions) this.nextRound();

				this.send();
				return;
			}
		}
	}

	devolvePokemon(from: string, to: string): void {
		if (!this.remainingRoundEvolutions || this.roundRequirements.evolutionsThisRound > 0) return;

		const index = this.slots.indexOf(from);
		if (index === -1 || this.roundEvolvedSlots.includes(index)) return;

		const pokemon = this.getDex().getPokemon(from);
		if (!pokemon) return;

		const prevo = this.getDex().getPokemon(pokemon.prevo);
		if (!prevo) return;

		const formes = this.getDex().getFormes(prevo);
		if (formes.includes(to) && this.props.game.battleFormat.usablePokemon!.includes(to)) {
			this.slots.splice(index, 1, to);
			this.roundEvolvedSlots.push(index);

			this.setTeamBuilderImport();

			this.remainingRoundEvolutions++;
			if (!this.remainingRoundEvolutions) this.nextRound();

			this.send();
		}
	}

	setTeamBuilderImport(): void {
		const teambuilderImports: string[] = [];

		const includeAbilities = this.getDex().getGen() >= 3;
		for (const slot of this.slots) {
			const pokemon = this.getDex().getPokemon(slot);
			if (!pokemon) continue;

			const ability = includeAbilities ? this.getDex().getPokemonUsableAbility(pokemon, this.props.game.battleFormat) : undefined;
			teambuilderImports.push("<br /><code>" + pokemon.name + "<br />Ability: " + (ability || "No Ability") + "</code>");
		}

		this.teamBuilderImport = teambuilderImports.join("<br />");
	}

	renderPokemon(name: string, slot: number): string {
		const pokemon = this.getDex().getPokemon(name);
		if (!pokemon) return "";

		let html = "";
		if (this.props.gen < Dex.getGen()) {
			html += Dex.getPokemonModel(pokemon, this.props.modelGeneration) + "&nbsp;";
		} else {
			html += Dex.getPokemonIcon(pokemon);
		}

		html += "<b>" + pokemon.name + "</b> | " +
			"<a href='" + this.getDex().getPokemonAnalysisLink(pokemon, this.props.game.battleFormat) + "'>Smogon analysis</a>";

		const additionsOrDrops = this.remainingRoundAdditions || this.remainingRoundDrops ? true : false;
		if (additionsOrDrops) {
			if (this.remainingRoundDrops && this.roundDropChoices.includes(name)) {
				html += "<br />";
				html += this.getQuietPmButton(this.commandPrefix + ", " + dropPokemonCommand + ", " + name, "Release");
			}
		}

		if (this.remainingRoundEvolutions && !this.roundEvolvedSlots.includes(slot)) {
			const evolutions: string[] = [];
			if (this.remainingRoundEvolutions > 0 && pokemon.evos.length) {
				html += additionsOrDrops ? "&nbsp;" : "<br />";

				for (const evoName of pokemon.evos) {
					const evo = this.getDex().getPokemon(evoName);
					if (!evo) continue;

					const formes = this.getDex().getFormes(evo, true);
					for (const forme of formes) {
						if (!evolutions.includes(forme) && this.props.game.battleFormat.usablePokemon!.includes(forme)) {
							html += (evolutions.length ? "&nbsp;" : "") + this.getQuietPmButton(this.commandPrefix + ", " +
								evolvePokemonCommand + ", " + name + ", " + forme, "Evolve into " + forme, {disabled: additionsOrDrops});
							evolutions.push(forme);
						}
					}
				}
			} else if (this.remainingRoundEvolutions < 0 && pokemon.prevo) {
				html += additionsOrDrops ? "&nbsp;" : "<br />";

				const prevo = this.getDex().getPokemon(pokemon.prevo);
				if (prevo) {
					const formes = this.getDex().getFormes(prevo, true);
					for (const forme of formes) {
						if (!evolutions.includes(forme) && this.props.game.battleFormat.usablePokemon!.includes(forme)) {
							html += (evolutions.length ? "&nbsp;" : "") + this.getQuietPmButton(this.commandPrefix + ", " +
								devolvePokemonCommand + ", " + name + ", " + forme, "De-volve into " + forme, {disabled: additionsOrDrops});
							evolutions.push(forme);
						}
					}
				}
			}
		}

		return html;
	}

	renderSelector(selector: HtmlSelector): string {
		const starterPokemon = this.props.game.starterPokemon.get(this.props.player);
		if (!starterPokemon || !this.slots.length) return "";

		let html = "";
		if (selector === this.teamHeaderSelector) {
			if (this.props.game.usesCloakedPokemon) {
				html += "<h3>Your Pokemon to protect in battle</h3>";
				if (!this.props.game.eliminationEnded && starterPokemon.length < 6) {
					html += "You may add any Pokemon to fill your team as long as they are usable in " +
						this.props.game.battleFormat.name + ".";
				}
			} else {
				const changesPerRound = this.props.game.additionsPerRound || this.props.game.dropsPerRound ||
					this.props.game.evolutionsPerRound;
				html += "<h3>Your team" + (changesPerRound ? " and options" : "") + "</h3>";
				if (this.props.game.canReroll && this.props.game.playerCanReroll(this.props.player)) {
					html += "If you are not satisfied with your starting team, you have 1 chance to reroll but you must keep " +
						"whatever you receive! " + Client.getPmSelfButton(Config.commandCharacter + this.props.rerollCommand,
						"Reroll Pokemon");
				}
			}

			if (!this.props.player.eliminated && !this.props.game.eliminationEnded && this.props.player.round === 2 &&
				this.props.game.firstRoundByes.has(this.props.player)) {
				html += "<br /><br /><b>NOTE</b>: you were given a first round bye so you must follow any team changes below " +
					"for your first battle!";
			}
		} else if (selector === this.roundSelector) {
			const roundRequirements: string[] = [];
			if (this.remainingRoundAdditions && this.slots.length < 6 && this.roundTeamChange &&
				this.roundTeamChange.choices && this.roundTeamChange.choices.length) {
				const multiple = this.roundRequirements.additionsThisRound > 1;
				let changeHtml = "<li>choose " + this.remainingRoundAdditions + (multiple ? " more" : "") + " Pokemon to " +
					"add to your team!<br />";
				for (const choice of this.roundTeamChange.choices) {
					const pokemon = this.getDex().getExistingPokemon(choice);
					if (this.slots.includes(pokemon.name)) continue;

					changeHtml += this.getQuietPmButton(this.commandPrefix + ", " + addPokemonCommand + ", " + choice,
						Dex.getPokemonIcon(pokemon) + pokemon.name);
				}

				changeHtml += "</li>";
				roundRequirements.push(changeHtml);
			}

			if (this.remainingRoundDrops && this.slots.length > 1) {
				const multiple = this.roundRequirements.dropsThisRound > 1;
				roundRequirements.push("<li>choose " + this.remainingRoundDrops + (multiple ? " more" : "") + " Pokemon " +
					"below to release from your team!</li>");
			}

			if (this.remainingRoundEvolutions && this.availableEvolutionSlots.length) {
				const multiple = this.roundRequirements.evolutionsThisRound > 1 || this.roundRequirements.evolutionsThisRound < -1;
				roundRequirements.push("<li>choose " + Math.abs(this.remainingRoundEvolutions) + (multiple ? " more" : "") +
					" Pokemon on your team below to " + (this.remainingRoundEvolutions > 0 ? "evolve" : "de-volve") + "!</li>");
			}

			if (this.currentRound > 1) {
				for (let i = this.currentRound; i > 1; i--) {
					if (!this.roundSlots[i - 1]) continue;

					html += this.getQuietPmButton(this.commandPrefix + ", " + changeRoundCommand + ", " + i, "Change round " + i,
						{disabled: i === this.currentRound && ((this.remainingRoundAdditions ||
						this.remainingRoundDrops || this.remainingRoundEvolutions) || (!this.roundRequirements.additionsThisRound &&
						!this.roundRequirements.dropsThisRound && !this.roundRequirements.evolutionsThisRound)) ? true : false}) + "&nbsp;";
				}
			}

			if (this.moreRoundsAvailableMessage) {
				html += "<br /><br />" + this.moreRoundsAvailableMessage;
			}

			if (roundRequirements.length) {
				html += "<br /><br />Round " + this.currentRound + " requirements:<br /><ul>" + roundRequirements.join("") + "</ul>";
			}
		} else if (selector === this.teamSelector) {
			const slotsHtml: string[] = [];
			for (let i = 0; i < this.slots.length; i++) {
				slotsHtml.push(this.renderPokemon(this.slots[i], i));
			}

			html += slotsHtml.join("<br /><br />");

			if (this.teamBuilderImport) {
				html += "<br /><br /><b>Teambuilder import</b> (you may change abilities):<br />";
				html += this.teamBuilderImport;
			}
		}

		return html;
	}

}
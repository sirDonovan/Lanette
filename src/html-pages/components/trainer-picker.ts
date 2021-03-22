import type { TrainerSpriteId } from "../../types/dex";
import type { ITrainerChoice } from "../game-host-control-panel";
import { ComponentBase } from "./component-base";
import type { IPageElement } from "./pagination";
import { Pagination } from "./pagination";

interface ITrainerPickerProps {
	currentTrainer: TrainerSpriteId | undefined;
	random?: boolean;
	pickerIndex?: number;
	onSetTrainerGen: (trainerGen: TrainerGen) => void;
	onClearTrainer: (index: number, dontRender?: boolean) => void;
	onSelectTrainer: (index: number, selectedTrainer: ITrainerChoice, dontRender?: boolean) => void;
	onUpdateView: () => void;
}

export type TrainerGen = 'newer' | 'gen1' | 'gen2' | 'gen3' | 'gen4';

const genOneSuffixes: string[] = ['gen1', 'gen1rb', 'gen1two', 'gen1rbtwo', 'gen1champion', 'gen1rbchampion', 'gen1main', 'gen1title'];
const genTwoSuffixes: string[] = ['gen2', 'gen2jp', 'gen2kanto', 'gen2c'];
const genThreeSuffixes: string[] = ['gen3', 'gen3jp', 'gen3rs', 'gen3frlg', 'gen3two', 'gen3champion'];
const genFourSuffixes: string[] = ['gen4', 'gen4dp', 'gen4pt'];

const pagesLabel = "Trainers";

const setTrainerCommand = 'settrainer';
const newerTrainersCommand = 'newertrainers';
const genOneTrainersCommand = 'gen1';
const genTwoTrainersCommand = 'gen2';
const genThreeTrainersCommand = 'gen3';
const genFourTrainersCommand = 'gen4';
const randomTrainerCommand = 'randomtrainer';
const trainersListCommand = 'trainerslist';
const noTrainer = "None";

export class TrainerPicker extends ComponentBase {
	static trainerSprites: Dict<string> = {};
	static trainerNames: Dict<string> = {};
	static newerTrainerIds: TrainerSpriteId[] = [];
	static genOneTrainerIds: TrainerSpriteId[] = [];
	static genTwoTrainerIds: TrainerSpriteId[] = [];
	static genThreeTrainerIds: TrainerSpriteId[] = [];
	static genFourTrainerIds: TrainerSpriteId[] = [];
	static TrainerPickerLoaded: boolean = false;

	trainerGen: TrainerGen = 'newer';

	currentTrainerId: TrainerSpriteId | undefined;
	newerTrainersPagination: Pagination;
	genOneTrainersPagination: Pagination;
	genTwoTrainersPagination: Pagination;
	genThreeTrainersPagination: Pagination;
	genFourTrainersPagination: Pagination;
	pickerIndex: number;
	trainerElements: Dict<IPageElement> = {};
	noTrainerElement: IPageElement = {html: ""};

	paginations: Pagination[] = [];

	props: ITrainerPickerProps;

	constructor(parentCommandPrefix: string, componentCommand: string, props: ITrainerPickerProps) {
		super(parentCommandPrefix, componentCommand);

		TrainerPicker.loadData();

		this.currentTrainerId = props.currentTrainer;
		this.pickerIndex = props.pickerIndex || 0;

		if (this.currentTrainerId) {
			if (TrainerPicker.genOneTrainerIds.includes(this.currentTrainerId)) {
				this.trainerGen = 'gen1';
			} else if (TrainerPicker.genTwoTrainerIds.includes(this.currentTrainerId)) {
				this.trainerGen = 'gen2';
			} else if (TrainerPicker.genThreeTrainerIds.includes(this.currentTrainerId)) {
				this.trainerGen = 'gen3';
			} else if (TrainerPicker.genFourTrainerIds.includes(this.currentTrainerId)) {
				this.trainerGen = 'gen4';
			}
		}
		this.noTrainerElement.selected = !this.currentTrainerId;
		this.noTrainerElement.html = this.renderNoTrainerElement();

		for (const i in TrainerPicker.trainerNames) {
			this.trainerElements[i] = {html: this.renderTrainerElement(i), selected: i === this.currentTrainerId};
		}

		this.newerTrainersPagination = new Pagination(this.commandPrefix, trainersListCommand, {
			elements: [this.noTrainerElement].concat(TrainerPicker.newerTrainerIds.map(x => this.trainerElements[x])),
			elementsPerRow: 5,
			rowsPerPage: 3,
			pagesLabel,
			onSelectPage: () => this.props.onUpdateView(),
		});
		this.newerTrainersPagination.active = this.trainerGen === 'newer';

		this.genOneTrainersPagination = new Pagination(this.commandPrefix, trainersListCommand, {
			elements: [this.noTrainerElement].concat(TrainerPicker.genOneTrainerIds.map(x => this.trainerElements[x])),
			elementsPerRow: 4,
			rowsPerPage: 3,
			pagesLabel,
			onSelectPage: () => this.props.onUpdateView(),
		});
		this.genOneTrainersPagination.active = this.trainerGen === 'gen1';

		this.genTwoTrainersPagination = new Pagination(this.commandPrefix, trainersListCommand, {
			elements: [this.noTrainerElement].concat(TrainerPicker.genTwoTrainerIds.map(x => this.trainerElements[x])),
			elementsPerRow: 4,
			rowsPerPage: 3,
			pagesLabel,
			onSelectPage: () => this.props.onUpdateView(),
		});
		this.genTwoTrainersPagination.active = this.trainerGen === 'gen2';

		this.genThreeTrainersPagination = new Pagination(this.commandPrefix, trainersListCommand, {
			elements: [this.noTrainerElement].concat(TrainerPicker.genThreeTrainerIds.map(x => this.trainerElements[x])),
			elementsPerRow: 4,
			rowsPerPage: 3,
			pagesLabel,
			onSelectPage: () => this.props.onUpdateView(),
		});
		this.genThreeTrainersPagination.active = this.trainerGen === 'gen3';

		this.genFourTrainersPagination = new Pagination(this.commandPrefix, trainersListCommand, {
			elements: [this.noTrainerElement].concat(TrainerPicker.genFourTrainerIds.map(x => this.trainerElements[x])),
			elementsPerRow: 4,
			rowsPerPage: 3,
			pagesLabel,
			onSelectPage: () => this.props.onUpdateView(),
		});
		this.genFourTrainersPagination.active = this.trainerGen === 'gen4';

		this.toggleActivePagination();

		this.components = [this.newerTrainersPagination, this.genOneTrainersPagination, this.genTwoTrainersPagination,
			this.genThreeTrainersPagination, this.genFourTrainersPagination];

		this.paginations = this.components.slice() as Pagination[];

		this.props = props;
	}

	static loadData(): void {
		if (this.TrainerPickerLoaded) return;

		const trainerSprites = Dex.getData().trainerSprites;
		for (const i in trainerSprites) {
			const trainerId = i as TrainerSpriteId;
			this.trainerSprites[trainerId] = Dex.getTrainerSprite(trainerSprites[trainerId]);
			this.trainerNames[trainerId] = trainerSprites[trainerId];
			if (trainerSprites[trainerId].includes("-gen")) {
				const gen = trainerSprites[trainerId].substr(trainerSprites[trainerId].lastIndexOf("-") + 1);
				if (genOneSuffixes.includes(gen)) {
					this.genOneTrainerIds.push(trainerId);
				} else if (genTwoSuffixes.includes(gen)) {
					this.genTwoTrainerIds.push(trainerId);
				} else if (genThreeSuffixes.includes(gen)) {
					this.genThreeTrainerIds.push(trainerId);
				} else if (genFourSuffixes.includes(gen)) {
					this.genFourTrainerIds.push(trainerId);
				}
			} else {
				this.newerTrainerIds.push(trainerId);
			}
		}

		this.TrainerPickerLoaded = true;
	}

	renderTrainerElement(trainerId: string): string {
		const currentTrainer = this.currentTrainerId === trainerId;
		const trainer = TrainerPicker.trainerSprites[trainerId] + "<br />" + TrainerPicker.trainerNames[trainerId];
		return Client.getPmSelfButton(this.commandPrefix + ", " + setTrainerCommand + "," + trainerId, trainer,
			currentTrainer);
	}

	renderNoTrainerElement(): string {
		return Client.getPmSelfButton(this.commandPrefix + ", " + setTrainerCommand + ", " + noTrainer, "None",
			!this.currentTrainerId);
	}

	setTrainerGen(trainerGen: TrainerGen, dontRender?: boolean): void {
		if (this.trainerGen === trainerGen) return;

		this.trainerGen = trainerGen;
		this.toggleActivePagination();

		if (!dontRender) this.props.onSetTrainerGen(trainerGen);
	}

	setTrainerGenParent(trainerGen: TrainerGen): void {
		this.setTrainerGen(trainerGen, true);
	}

	toggleActivePagination(autoSelectPage?: boolean): void {
		this.newerTrainersPagination.active = this.trainerGen === 'newer';
		this.genOneTrainersPagination.active = this.trainerGen === 'gen1';
		this.genTwoTrainersPagination.active = this.trainerGen === 'gen2';
		this.genThreeTrainersPagination.active = this.trainerGen === 'gen3';
		this.genFourTrainersPagination.active = this.trainerGen === 'gen4';

		if (autoSelectPage) {
			for (const pagination of this.paginations) {
				if (pagination.active) {
					pagination.autoSelectPage();
					break;
				}
			}
		}
	}

	reset(): void {
		this.setTrainerGen('newer', true);
		this.clearTrainer(true);
	}

	clearTrainer(dontRender?: boolean): void {
		if (this.currentTrainerId === undefined) return;

		const previousTrainerId = this.currentTrainerId;
		this.currentTrainerId = undefined;

		this.trainerElements[previousTrainerId].html = this.renderTrainerElement(previousTrainerId);
		this.trainerElements[previousTrainerId].selected = false;
		this.noTrainerElement.html = this.renderNoTrainerElement();
		this.noTrainerElement.selected = true;

		this.props.onClearTrainer(this.pickerIndex, dontRender);
	}

	selectTrainer(trainerGen: TrainerGen, trainer: TrainerSpriteId, dontRender?: boolean): void {
		if (this.currentTrainerId === trainer) return;

		const previousTrainerId = this.currentTrainerId;
		this.currentTrainerId = trainer;
		if (previousTrainerId) {
			this.trainerElements[previousTrainerId].html = this.renderTrainerElement(previousTrainerId);
			this.trainerElements[previousTrainerId].selected = false;
		} else {
			this.noTrainerElement.html = this.renderNoTrainerElement();
			this.noTrainerElement.selected = false;
		}
		this.trainerElements[this.currentTrainerId].html = this.renderTrainerElement(this.currentTrainerId);
		this.trainerElements[this.currentTrainerId].selected = true;

		this.props.onSelectTrainer(this.pickerIndex, {trainer, gen: trainerGen}, dontRender);
	}

	selectRandomTrainer(trainerGen?: TrainerGen, parentTrainers?: string[]): boolean {
		if (!trainerGen) trainerGen = this.trainerGen;

		let trainers: TrainerSpriteId[];
		if (trainerGen === 'newer') {
			trainers = TrainerPicker.newerTrainerIds;
		} else if (trainerGen === 'gen1') {
			trainers = TrainerPicker.genOneTrainerIds;
		} else if (trainerGen === 'gen2') {
			trainers = TrainerPicker.genTwoTrainerIds;
		} else if (trainerGen === 'gen3') {
			trainers = TrainerPicker.genThreeTrainerIds;
		} else {
			trainers = TrainerPicker.genFourTrainerIds;
		}

		const list = Tools.shuffle(trainers);
		let trainer = list.shift()!;
		while (trainer === this.currentTrainerId || (parentTrainers && parentTrainers.includes(trainer))) {
			if (!list.length) return false;
			trainer = list.shift()!;
		}

		this.selectTrainer(trainerGen, trainer, true);
		return true;
	}

	setRandomizedTrainer(trainer: ITrainerChoice): void {
		this.setTrainerGen(trainer.gen, true);
		this.selectTrainer(trainer.gen, trainer.trainer, true);
		this.toggleActivePagination(true);
	}

	tryCommand(originalTargets: readonly string[]): string | undefined {
		const targets = originalTargets.slice();
		const cmd = Tools.toId(targets[0]);
		targets.shift();

		if (cmd === newerTrainersCommand) {
			this.setTrainerGen('newer');
		} else if (cmd === genOneTrainersCommand) {
			this.setTrainerGen('gen1');
		} else if (cmd === genTwoTrainersCommand) {
			this.setTrainerGen('gen2');
		} else if (cmd === genThreeTrainersCommand) {
			this.setTrainerGen('gen3');
		} else if (cmd === genFourTrainersCommand) {
			this.setTrainerGen('gen4');
		} else if (cmd === setTrainerCommand) {
			const trainer = targets[0].trim();
			const cleared = trainer === noTrainer;
			if (!cleared && !(trainer in Dex.getData().trainerSprites)) {
				return "'" + trainer + "' is not a valid trainer sprite.";
			}

			if (cleared) {
				this.clearTrainer();
			} else {
				this.selectTrainer(this.trainerGen, trainer as TrainerSpriteId);
			}
		} else if (cmd === randomTrainerCommand) {
			this.selectRandomTrainer();
		} else {
			return this.checkComponentCommands(cmd, targets);
		}
	}

	render(): string {
		const newerTrainers = this.trainerGen === 'newer';
		const genOneTrainers = this.trainerGen === 'gen1';
		const genTwoTrainers = this.trainerGen === 'gen2';
		const genThreeTrainers = this.trainerGen === 'gen3';
		const genFourTrainers = this.trainerGen === 'gen4';

		let html = "<b>Trainer sprite</b><br />";
		html += "Type:&nbsp;";
		html += "&nbsp;";
		html += Client.getPmSelfButton(this.commandPrefix + ", " + newerTrainersCommand, "Newer gens", newerTrainers);
		html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + genOneTrainersCommand, "Gen 1", genOneTrainers);
		html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + genTwoTrainersCommand, "Gen 2", genTwoTrainers);
		html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + genThreeTrainersCommand, "Gen 3", genThreeTrainers);
		html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + genFourTrainersCommand, "Gen 4", genFourTrainers);

		html += "<br /><br />";
		if (this.props.random) {
			html += this.renderNoTrainerElement();
			html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + randomTrainerCommand, "Random Trainer");
		} else {
			if (newerTrainers) {
				html += this.newerTrainersPagination.render();
			} else if (genOneTrainers) {
				html += this.genOneTrainersPagination.render();
			} else if (genTwoTrainers) {
				html += this.genTwoTrainersPagination.render();
			} else if (genThreeTrainers) {
				html += this.genThreeTrainersPagination.render();
			} else {
				html += this.genFourTrainersPagination.render();
			}
		}

		return html;
	}
}
import type { TrainerSpriteId } from "../../types/dex";
import { Pagination } from "./pagination";
import type { IPickerProps } from "./picker-base";
import { PickerBase } from "./picker-base";

export interface ITrainerPick {
	trainer: TrainerSpriteId;
	gen: TrainerGeneration;
}

interface ITrainerPickerProps extends IPickerProps<ITrainerPick> {
	random?: boolean;
	onSetTrainerGen: (index: number, trainerGen: TrainerGeneration, dontRender: boolean | undefined) => void;
}

export type TrainerGeneration = 'newer' | 'gen1' | 'gen2' | 'gen3' | 'gen4';

const genOneSuffixes: string[] = ['gen1', 'gen1rb', 'gen1two', 'gen1rbtwo', 'gen1champion', 'gen1rbchampion', 'gen1main', 'gen1title'];
const genTwoSuffixes: string[] = ['gen2', 'gen2jp', 'gen2kanto', 'gen2c'];
const genThreeSuffixes: string[] = ['gen3', 'gen3jp', 'gen3rs', 'gen3frlg', 'gen3two', 'gen3champion'];
const genFourSuffixes: string[] = ['gen4', 'gen4dp', 'gen4pt'];

const pagesLabel = "Trainers";

const newerTrainersCommand = 'newertrainers';
const genOneTrainersCommand = 'gen1';
const genTwoTrainersCommand = 'gen2';
const genThreeTrainersCommand = 'gen3';
const genFourTrainersCommand = 'gen4';
const trainersListCommand = 'trainerslist';

const newerTrainersPerRow = 5;
const olderTrainersPerRow = 4;
const rowsPerPage = 3;

export class TrainerPicker extends PickerBase<ITrainerPick, ITrainerPickerProps> {
	static trainerSprites: Dict<string> = {};
	static allTrainerNames: Dict<string> = {};
	static newerTrainerIds: TrainerSpriteId[] = [];
	static newerTrainerNames: Dict<string> = {};
	static genOneTrainerIds: TrainerSpriteId[] = [];
	static genOneTrainerNames: Dict<string> = {};
	static genTwoTrainerIds: TrainerSpriteId[] = [];
	static genTwoTrainerNames: Dict<string> = {};
	static genThreeTrainerIds: TrainerSpriteId[] = [];
	static genThreeTrainerNames: Dict<string> = {};
	static genFourTrainerIds: TrainerSpriteId[] = [];
	static genFourTrainerNames: Dict<string> = {};
	static TrainerPickerLoaded: boolean = false;

	componentId: string = 'trainer-picker';
	trainerGen: TrainerGeneration = 'newer';

	newerTrainersPagination: Pagination;
	genOneTrainersPagination: Pagination;
	genTwoTrainersPagination: Pagination;
	genThreeTrainersPagination: Pagination;
	genFourTrainersPagination: Pagination;

	paginations: Pagination[] = [];

	constructor(parentCommandPrefix: string, componentCommand: string, props: ITrainerPickerProps) {
		super(parentCommandPrefix, componentCommand, props);

		TrainerPicker.loadData();

		if (this.currentPick) {
			const id = this.currentPick as TrainerSpriteId;
			if (TrainerPicker.genOneTrainerIds.includes(id)) {
				this.trainerGen = 'gen1';
			} else if (TrainerPicker.genTwoTrainerIds.includes(id)) {
				this.trainerGen = 'gen2';
			} else if (TrainerPicker.genThreeTrainerIds.includes(id)) {
				this.trainerGen = 'gen3';
			} else if (TrainerPicker.genFourTrainerIds.includes(id)) {
				this.trainerGen = 'gen4';
			}
		}

		for (const i in TrainerPicker.newerTrainerNames) {
			this.choices[i] = {trainer: i as TrainerSpriteId, gen: 'newer'};
		}

		for (const i in TrainerPicker.genOneTrainerNames) {
			this.choices[i] = {trainer: i as TrainerSpriteId, gen: 'gen1'};
		}

		for (const i in TrainerPicker.genTwoTrainerNames) {
			this.choices[i] = {trainer: i as TrainerSpriteId, gen: 'gen2'};
		}

		for (const i in TrainerPicker.genThreeTrainerNames) {
			this.choices[i] = {trainer: i as TrainerSpriteId, gen: 'gen3'};
		}

		for (const i in TrainerPicker.genFourTrainerNames) {
			this.choices[i] = {trainer: i as TrainerSpriteId, gen: 'gen4'};
		}

		this.renderChoices();

		this.newerTrainersPagination = new Pagination(this.commandPrefix, trainersListCommand, {
			elements: [this.noPickElement].concat(TrainerPicker.newerTrainerIds.map(x => this.choiceElements[x])),
			elementsPerRow: newerTrainersPerRow,
			rowsPerPage,
			pagesLabel,
			onSelectPage: () => this.props.reRender(),
			reRender: () => this.props.reRender(),
		});
		this.newerTrainersPagination.active = this.trainerGen === 'newer';

		this.genOneTrainersPagination = new Pagination(this.commandPrefix, trainersListCommand, {
			elements: [this.noPickElement].concat(TrainerPicker.genOneTrainerIds.map(x => this.choiceElements[x])),
			elementsPerRow: olderTrainersPerRow,
			rowsPerPage,
			pagesLabel,
			onSelectPage: () => this.props.reRender(),
			reRender: () => this.props.reRender(),
		});
		this.genOneTrainersPagination.active = this.trainerGen === 'gen1';

		this.genTwoTrainersPagination = new Pagination(this.commandPrefix, trainersListCommand, {
			elements: [this.noPickElement].concat(TrainerPicker.genTwoTrainerIds.map(x => this.choiceElements[x])),
			elementsPerRow: olderTrainersPerRow,
			rowsPerPage,
			pagesLabel,
			onSelectPage: () => this.props.reRender(),
			reRender: () => this.props.reRender(),
		});
		this.genTwoTrainersPagination.active = this.trainerGen === 'gen2';

		this.genThreeTrainersPagination = new Pagination(this.commandPrefix, trainersListCommand, {
			elements: [this.noPickElement].concat(TrainerPicker.genThreeTrainerIds.map(x => this.choiceElements[x])),
			elementsPerRow: olderTrainersPerRow,
			rowsPerPage,
			pagesLabel,
			onSelectPage: () => this.props.reRender(),
			reRender: () => this.props.reRender(),
		});
		this.genThreeTrainersPagination.active = this.trainerGen === 'gen3';

		this.genFourTrainersPagination = new Pagination(this.commandPrefix, trainersListCommand, {
			elements: [this.noPickElement].concat(TrainerPicker.genFourTrainerIds.map(x => this.choiceElements[x])),
			elementsPerRow: olderTrainersPerRow,
			rowsPerPage,
			pagesLabel,
			onSelectPage: () => this.props.reRender(),
			reRender: () => this.props.reRender(),
		});
		this.genFourTrainersPagination.active = this.trainerGen === 'gen4';

		this.toggleActivePagination();

		this.components = [this.newerTrainersPagination, this.genOneTrainersPagination, this.genTwoTrainersPagination,
			this.genThreeTrainersPagination, this.genFourTrainersPagination];

		this.paginations = this.components.slice() as Pagination[];
	}

	static loadData(): void {
		if (this.TrainerPickerLoaded) return;

		const trainerSprites = Dex.getData().trainerSprites;
		for (const i in trainerSprites) {
			const trainerId = i as TrainerSpriteId;
			this.trainerSprites[trainerId] = Dex.getTrainerSprite(trainerSprites[trainerId]);
			this.allTrainerNames[trainerId] = trainerSprites[trainerId];

			if (trainerSprites[trainerId].includes("-gen")) {
				const gen = trainerSprites[trainerId].substr(trainerSprites[trainerId].lastIndexOf("-") + 1);
				if (genOneSuffixes.includes(gen)) {
					this.genOneTrainerIds.push(trainerId);
					this.genOneTrainerNames[trainerId] = trainerSprites[trainerId];
				} else if (genTwoSuffixes.includes(gen)) {
					this.genTwoTrainerIds.push(trainerId);
					this.genTwoTrainerNames[trainerId] = trainerSprites[trainerId];
				} else if (genThreeSuffixes.includes(gen)) {
					this.genThreeTrainerIds.push(trainerId);
					this.genThreeTrainerNames[trainerId] = trainerSprites[trainerId];
				} else if (genFourSuffixes.includes(gen)) {
					this.genFourTrainerIds.push(trainerId);
					this.genFourTrainerNames[trainerId] = trainerSprites[trainerId];
				}
			} else {
				this.newerTrainerIds.push(trainerId);
				this.newerTrainerNames[trainerId] = trainerSprites[trainerId];
			}
		}

		this.TrainerPickerLoaded = true;
	}

	getChoiceButtonHtml(choice: ITrainerPick): string {
		return TrainerPicker.trainerSprites[choice.trainer] + "<br />" + TrainerPicker.allTrainerNames[choice.trainer];
	}

	pickTrainerGen(trainerGen: TrainerGeneration, dontRender?: boolean): void {
		if (this.trainerGen === trainerGen) return;

		this.trainerGen = trainerGen;
		this.toggleActivePagination();

		this.props.onSetTrainerGen(this.pickerIndex, trainerGen, dontRender);
	}

	parentPickTrainerGen(trainerGen: TrainerGeneration): void {
		this.pickTrainerGen(trainerGen, true);
	}

	parentClearTrainerGen(): void {
		this.pickTrainerGen('newer', true);
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
		this.pickTrainerGen('newer', true);
		this.clear(true);
	}

	pickRandom(dontRender?: boolean, trainerGen?: TrainerGeneration, parentTrainers?: string[]): boolean {
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
		while (trainer === this.currentPick || (parentTrainers && parentTrainers.includes(trainer))) {
			if (!list.length) return false;
			trainer = list.shift()!;
		}

		this.pick(trainer, dontRender);
		return true;
	}

	setRandomizedTrainer(pick: ITrainerPick): void {
		if (!this.isValidChoice(pick.trainer)) return;

		this.parentPickTrainerGen(pick.gen);
		this.parentPick(pick.trainer);

		this.toggleActivePagination(true);
	}

	tryCommand(originalTargets: readonly string[]): string | undefined {
		const targets = originalTargets.slice();
		const cmd = Tools.toId(targets[0]);
		targets.shift();

		if (cmd === newerTrainersCommand) {
			this.pickTrainerGen('newer');
		} else if (cmd === genOneTrainersCommand) {
			this.pickTrainerGen('gen1');
		} else if (cmd === genTwoTrainersCommand) {
			this.pickTrainerGen('gen2');
		} else if (cmd === genThreeTrainersCommand) {
			this.pickTrainerGen('gen3');
		} else if (cmd === genFourTrainersCommand) {
			this.pickTrainerGen('gen4');
		} else {
			return super.tryCommand(originalTargets);
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
			html += this.renderNoPickElement();
			html += "&nbsp;" + Client.getPmSelfButton(this.commandPrefix + ", " + this.randomPickCommand, "Random Trainer");
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
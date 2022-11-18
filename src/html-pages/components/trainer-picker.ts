import type { TrainerSpriteId } from "../../types/dex";
import type { HtmlPageBase } from "../html-page-base";
import { type IPageElement, Pagination } from "./pagination";
import type { IPickerProps } from "./picker-base";
import { PickerBase } from "./picker-base";

export interface ITrainerPick {
	trainer: TrainerSpriteId;
	gen: TrainerGeneration;
	customAvatar?: boolean;
}

interface ITrainerPickerProps extends IPickerProps<ITrainerPick> {
	userId?: string;
	random?: boolean;
	onSetTrainerGen: (index: number, trainerGen: TrainerGeneration, dontRender: boolean | undefined) => void;
}

export type TrainerGeneration = 'default' | 'gen1' | 'gen2' | 'gen3' | 'gen4' | 'gen5' | 'gen6' | 'gen7' | 'gen8' | 'gen9' | 'masters';

const genOneSuffixes: string[] = ['gen1', 'gen1rb', 'gen1two', 'gen1rbtwo', 'gen1champion', 'gen1rbchampion', 'gen1main', 'gen1title'];
const genTwoSuffixes: string[] = ['gen2', 'gen2jp', 'gen2kanto', 'gen2c', 'gen2alt'];
const genThreeSuffixes: string[] = ['gen3', 'gen3jp', 'gen3rs', 'gen3frlg', 'gen3two', 'gen3champion'];
const genFourSuffixes: string[] = ['gen4', 'gen4dp', 'gen4pt', 'gen4jp'];
const genFiveSuffixes: string[] = ['gen5', 'gen5bw', 'gen5bw2'];
const genSixSuffixes: string[] = ['gen6', 'gen6xy', 'gen6oras'];
const genSevenSuffixes: string[] = ['gen7'];
const genEightSuffixes: string[] = ['gen8'];
const genNineSuffixes: string[] = ['gen9'];

const pagesLabel = "Trainers";

export const defaultTrainers = 'default';
export const genOneTrainers = 'gen1';
export const genTwoTrainers = 'gen2';
export const genThreeTrainers = 'gen3';
export const genFourTrainers = 'gen4';
export const genFiveTrainers = 'gen5';
export const genSixTrainers = 'gen6';
export const genSevenTrainers = 'gen7';
export const genEightTrainers = 'gen8';
export const genNineTrainers = 'gen9';
export const mastersTrainers = 'masters';

export const trainerGens: TrainerGeneration[] = [defaultTrainers, genOneTrainers, genTwoTrainers, genThreeTrainers, genFourTrainers,
	genFiveTrainers, genSixTrainers, genSevenTrainers, genEightTrainers, genNineTrainers, mastersTrainers];

const trainersListCommand = 'trainerslist';
const refreshCustomAvatarCommand = 'refreshcommandavatar';

const defaultTrainersPerRow = 5;
const olderTrainersPerRow = 4;
const rowsPerPage = 3;

export class TrainerPicker extends PickerBase<ITrainerPick, ITrainerPickerProps> {
	static trainerSprites: Dict<string> = {};
	static allTrainerNames: Dict<string> = {};
	static defaultTrainerIds: TrainerSpriteId[] = [];
	static defaultTrainerNames: Dict<string> = {};
	static genOneTrainerIds: TrainerSpriteId[] = [];
	static genOneTrainerNames: Dict<string> = {};
	static genTwoTrainerIds: TrainerSpriteId[] = [];
	static genTwoTrainerNames: Dict<string> = {};
	static genThreeTrainerIds: TrainerSpriteId[] = [];
	static genThreeTrainerNames: Dict<string> = {};
	static genFourTrainerIds: TrainerSpriteId[] = [];
	static genFourTrainerNames: Dict<string> = {};
	static genFiveTrainerIds: TrainerSpriteId[] = [];
	static genFiveTrainerNames: Dict<string> = {};
	static genSixTrainerIds: TrainerSpriteId[] = [];
	static genSixTrainerNames: Dict<string> = {};
	static genSevenTrainerIds: TrainerSpriteId[] = [];
	static genSevenTrainerNames: Dict<string> = {};
	static genEightTrainerIds: TrainerSpriteId[] = [];
	static genEightTrainerNames: Dict<string> = {};
	static genNineTrainerIds: TrainerSpriteId[] = [];
	static genNineTrainerNames: Dict<string> = {};
	static mastersTrainerIds: TrainerSpriteId[] = [];
	static mastersTrainerNames: Dict<string> = {};
	static TrainerPickerLoaded: boolean = false;

	componentId: string = 'trainer-picker';
	customAvatarId: string = '';
	refreshingCustomAvatar: boolean = false;
	trainerGen: TrainerGeneration = 'default';

	defaultTrainersPagination: Pagination;
	genOneTrainersPagination: Pagination;
	genTwoTrainersPagination: Pagination;
	genThreeTrainersPagination: Pagination;
	genFourTrainersPagination: Pagination;
	genFiveTrainersPagination: Pagination;
	genSixTrainersPagination: Pagination;
	genSevenTrainersPagination: Pagination;
	genEightTrainersPagination: Pagination;
	genNineTrainersPagination: Pagination;
	mastersTrainersPagination: Pagination;

	paginations: Pagination[] = [];

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: ITrainerPickerProps) {
		super(htmlPage, parentCommandPrefix, componentCommand, props);

		TrainerPicker.loadData();

		if (this.currentPicks.length) {
			const id = this.currentPicks[0] as TrainerSpriteId;
			if (TrainerPicker.genOneTrainerIds.includes(id)) {
				this.trainerGen = genOneTrainers;
			} else if (TrainerPicker.genTwoTrainerIds.includes(id)) {
				this.trainerGen = genTwoTrainers;
			} else if (TrainerPicker.genThreeTrainerIds.includes(id)) {
				this.trainerGen = genThreeTrainers;
			} else if (TrainerPicker.genFourTrainerIds.includes(id)) {
				this.trainerGen = genFourTrainers;
			} else if (TrainerPicker.genFiveTrainerIds.includes(id)) {
				this.trainerGen = genFiveTrainers;
			} else if (TrainerPicker.genSixTrainerIds.includes(id)) {
				this.trainerGen = genSixTrainers;
			} else if (TrainerPicker.genSevenTrainerIds.includes(id)) {
				this.trainerGen = genSevenTrainers;
			} else if (TrainerPicker.genEightTrainerIds.includes(id)) {
				this.trainerGen = genEightTrainers;
			} else if (TrainerPicker.genNineTrainerIds.includes(id)) {
				this.trainerGen = genNineTrainers;
			} else if (TrainerPicker.mastersTrainerIds.includes(id)) {
				this.trainerGen = mastersTrainers;
			}
		}

		for (const i in TrainerPicker.defaultTrainerNames) {
			this.choices[i] = {trainer: i as TrainerSpriteId, gen: defaultTrainers};
		}

		for (const i in TrainerPicker.genOneTrainerNames) {
			this.choices[i] = {trainer: i as TrainerSpriteId, gen: genOneTrainers};
		}

		for (const i in TrainerPicker.genTwoTrainerNames) {
			this.choices[i] = {trainer: i as TrainerSpriteId, gen: genTwoTrainers};
		}

		for (const i in TrainerPicker.genThreeTrainerNames) {
			this.choices[i] = {trainer: i as TrainerSpriteId, gen: genThreeTrainers};
		}

		for (const i in TrainerPicker.genFourTrainerNames) {
			this.choices[i] = {trainer: i as TrainerSpriteId, gen: genFourTrainers};
		}

		for (const i in TrainerPicker.genFiveTrainerNames) {
			this.choices[i] = {trainer: i as TrainerSpriteId, gen: genFiveTrainers};
		}

		for (const i in TrainerPicker.genSixTrainerNames) {
			this.choices[i] = {trainer: i as TrainerSpriteId, gen: genSixTrainers};
		}

		for (const i in TrainerPicker.genSevenTrainerNames) {
			this.choices[i] = {trainer: i as TrainerSpriteId, gen: genSevenTrainers};
		}

		for (const i in TrainerPicker.genEightTrainerNames) {
			this.choices[i] = {trainer: i as TrainerSpriteId, gen: genEightTrainers};
		}

		for (const i in TrainerPicker.genNineTrainerNames) {
			this.choices[i] = {trainer: i as TrainerSpriteId, gen: genNineTrainers};
		}

		for (const i in TrainerPicker.mastersTrainerNames) {
			this.choices[i] = {trainer: i as TrainerSpriteId, gen: mastersTrainers};
		}

		this.renderChoices();

		this.defaultTrainersPagination = new Pagination(htmlPage, this.commandPrefix, trainersListCommand, {
			elements: [this.noPickElement].concat(TrainerPicker.defaultTrainerIds.map(x => this.choiceElements[x])),
			elementsPerRow: defaultTrainersPerRow,
			rowsPerPage,
			pagesLabel,
			noPickElement: true,
			onSelectPage: () => this.props.reRender(),
			readonly: this.props.readonly,
			reRender: () => this.props.reRender(),
		});
		this.defaultTrainersPagination.active = this.trainerGen === defaultTrainers;

		this.genOneTrainersPagination = new Pagination(htmlPage, this.commandPrefix, trainersListCommand, {
			elements: [this.noPickElement].concat(TrainerPicker.genOneTrainerIds.map(x => this.choiceElements[x])),
			elementsPerRow: olderTrainersPerRow,
			rowsPerPage,
			pagesLabel,
			noPickElement: true,
			onSelectPage: () => this.props.reRender(),
			readonly: this.props.readonly,
			reRender: () => this.props.reRender(),
		});
		this.genOneTrainersPagination.active = this.trainerGen === genOneTrainers;

		this.genTwoTrainersPagination = new Pagination(htmlPage, this.commandPrefix, trainersListCommand, {
			elements: [this.noPickElement].concat(TrainerPicker.genTwoTrainerIds.map(x => this.choiceElements[x])),
			elementsPerRow: olderTrainersPerRow,
			rowsPerPage,
			pagesLabel,
			noPickElement: true,
			onSelectPage: () => this.props.reRender(),
			readonly: this.props.readonly,
			reRender: () => this.props.reRender(),
		});
		this.genTwoTrainersPagination.active = this.trainerGen === genTwoTrainers;

		this.genThreeTrainersPagination = new Pagination(htmlPage, this.commandPrefix, trainersListCommand, {
			elements: [this.noPickElement].concat(TrainerPicker.genThreeTrainerIds.map(x => this.choiceElements[x])),
			elementsPerRow: olderTrainersPerRow,
			rowsPerPage,
			pagesLabel,
			noPickElement: true,
			onSelectPage: () => this.props.reRender(),
			readonly: this.props.readonly,
			reRender: () => this.props.reRender(),
		});
		this.genThreeTrainersPagination.active = this.trainerGen === genThreeTrainers;

		this.genFourTrainersPagination = new Pagination(htmlPage, this.commandPrefix, trainersListCommand, {
			elements: [this.noPickElement].concat(TrainerPicker.genFourTrainerIds.map(x => this.choiceElements[x])),
			elementsPerRow: olderTrainersPerRow,
			rowsPerPage,
			pagesLabel,
			noPickElement: true,
			onSelectPage: () => this.props.reRender(),
			readonly: this.props.readonly,
			reRender: () => this.props.reRender(),
		});
		this.genFourTrainersPagination.active = this.trainerGen === genFourTrainers;

		this.genFiveTrainersPagination = new Pagination(htmlPage, this.commandPrefix, trainersListCommand, {
			elements: [this.noPickElement].concat(TrainerPicker.genFiveTrainerIds.map(x => this.choiceElements[x])),
			elementsPerRow: olderTrainersPerRow,
			rowsPerPage,
			pagesLabel,
			noPickElement: true,
			onSelectPage: () => this.props.reRender(),
			readonly: this.props.readonly,
			reRender: () => this.props.reRender(),
		});
		this.genFiveTrainersPagination.active = this.trainerGen === genFiveTrainers;

		this.genSixTrainersPagination = new Pagination(htmlPage, this.commandPrefix, trainersListCommand, {
			elements: [this.noPickElement].concat(TrainerPicker.genSixTrainerIds.map(x => this.choiceElements[x])),
			elementsPerRow: olderTrainersPerRow,
			rowsPerPage,
			pagesLabel,
			noPickElement: true,
			onSelectPage: () => this.props.reRender(),
			readonly: this.props.readonly,
			reRender: () => this.props.reRender(),
		});
		this.genSixTrainersPagination.active = this.trainerGen === genSixTrainers;

		this.genSevenTrainersPagination = new Pagination(htmlPage, this.commandPrefix, trainersListCommand, {
			elements: [this.noPickElement].concat(TrainerPicker.genSevenTrainerIds.map(x => this.choiceElements[x])),
			elementsPerRow: olderTrainersPerRow,
			rowsPerPage,
			pagesLabel,
			noPickElement: true,
			onSelectPage: () => this.props.reRender(),
			readonly: this.props.readonly,
			reRender: () => this.props.reRender(),
		});
		this.genSevenTrainersPagination.active = this.trainerGen === genSevenTrainers;

		this.genEightTrainersPagination = new Pagination(htmlPage, this.commandPrefix, trainersListCommand, {
			elements: [this.noPickElement].concat(TrainerPicker.genEightTrainerIds.map(x => this.choiceElements[x])),
			elementsPerRow: olderTrainersPerRow,
			rowsPerPage,
			pagesLabel,
			noPickElement: true,
			onSelectPage: () => this.props.reRender(),
			readonly: this.props.readonly,
			reRender: () => this.props.reRender(),
		});
		this.genEightTrainersPagination.active = this.trainerGen === genEightTrainers;

		this.genNineTrainersPagination = new Pagination(htmlPage, this.commandPrefix, trainersListCommand, {
			elements: [this.noPickElement].concat(TrainerPicker.genNineTrainerIds.map(x => this.choiceElements[x])),
			elementsPerRow: olderTrainersPerRow,
			rowsPerPage,
			pagesLabel,
			noPickElement: true,
			onSelectPage: () => this.props.reRender(),
			readonly: this.props.readonly,
			reRender: () => this.props.reRender(),
		});
		this.genNineTrainersPagination.active = this.trainerGen === genNineTrainers;

		this.mastersTrainersPagination = new Pagination(htmlPage, this.commandPrefix, trainersListCommand, {
			elements: [this.noPickElement].concat(TrainerPicker.mastersTrainerIds.map(x => this.choiceElements[x])),
			elementsPerRow: olderTrainersPerRow,
			rowsPerPage,
			pagesLabel,
			noPickElement: true,
			onSelectPage: () => this.props.reRender(),
			readonly: this.props.readonly,
			reRender: () => this.props.reRender(),
		});
		this.mastersTrainersPagination.active = this.trainerGen === mastersTrainers;

		this.toggleActivePagination();

		this.components = [this.defaultTrainersPagination, this.genOneTrainersPagination, this.genTwoTrainersPagination,
			this.genThreeTrainersPagination, this.genFourTrainersPagination, this.genFiveTrainersPagination, this.genSixTrainersPagination,
			this.genSevenTrainersPagination, this.genEightTrainersPagination, this.genNineTrainersPagination,
			this.mastersTrainersPagination];

		this.paginations = this.components.slice() as Pagination[];

		if (this.props.userId) {
			const user = Users.get(this.props.userId);
			if (user && user.avatar && user.customAvatar) {
				this.updateCustomAvatar(user.avatar, true);
			}
		}
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
				} else if (genFiveSuffixes.includes(gen)) {
					this.genFiveTrainerIds.push(trainerId);
					this.genFiveTrainerNames[trainerId] = trainerSprites[trainerId];
				} else if (genSixSuffixes.includes(gen)) {
					this.genSixTrainerIds.push(trainerId);
					this.genSixTrainerNames[trainerId] = trainerSprites[trainerId];
				} else if (genSevenSuffixes.includes(gen)) {
					this.genSevenTrainerIds.push(trainerId);
					this.genSevenTrainerNames[trainerId] = trainerSprites[trainerId];
				} else if (genEightSuffixes.includes(gen)) {
					this.genEightTrainerIds.push(trainerId);
					this.genEightTrainerNames[trainerId] = trainerSprites[trainerId];
				} else if (genNineSuffixes.includes(gen)) {
					this.genNineTrainerIds.push(trainerId);
					this.genNineTrainerNames[trainerId] = trainerSprites[trainerId];
				} else {
					throw new Error("Unsupported trainer gen: " + gen);
				}
			} else if (trainerSprites[trainerId].endsWith("-masters") || trainerSprites[trainerId].endsWith("-masters2") ||
				trainerSprites[trainerId].endsWith("-masters3")) {
				this.mastersTrainerIds.push(trainerId);
				this.mastersTrainerNames[trainerId] = trainerSprites[trainerId];
			} else if (trainerSprites[trainerId].endsWith("-usum") || trainerSprites[trainerId].endsWith("-lgpe")) {
				this.genSevenTrainerIds.push(trainerId);
				this.genSevenTrainerNames[trainerId] = trainerSprites[trainerId];
			} else if (trainerSprites[trainerId].endsWith("-dojo")) {
				this.genEightTrainerIds.push(trainerId);
				this.genEightTrainerNames[trainerId] = trainerSprites[trainerId];
			} else {
				this.defaultTrainerIds.push(trainerId);
				this.defaultTrainerNames[trainerId] = trainerSprites[trainerId];
			}
		}

		this.TrainerPickerLoaded = true;
	}

	getChoiceButtonHtml(choice: ITrainerPick): string {
		if (choice.customAvatar) {
			return Dex.getCustomTrainerSprite(choice.trainer) + "<br />" + choice.trainer;
		} else {
			return TrainerPicker.trainerSprites[choice.trainer] + "<br />" + TrainerPicker.allTrainerNames[choice.trainer];
		}
	}

	updateCustomAvatar(customAvatar: string, onOpen?: boolean): void {
		let previousCustomAvatarId = '';
		if (this.customAvatarId) {
			previousCustomAvatarId = this.customAvatarId;

			delete this.choices[this.customAvatarId];
			delete this.choiceElements[this.customAvatarId];
		}

		this.customAvatarId = customAvatar;
		this.choices[customAvatar] = {trainer: customAvatar as TrainerSpriteId, gen: defaultTrainers, customAvatar: true};

		this.renderChoices();

		const customAvatarElement: IPageElement[] = [];
		if (customAvatar in this.choiceElements) {
			customAvatarElement.push(this.choiceElements[customAvatar]);
		}

		this.defaultTrainersPagination.updateElements([this.noPickElement].concat(customAvatarElement,
			TrainerPicker.defaultTrainerIds.map(x => this.choiceElements[x])), true);

		if (this.currentPicks.length === 1 && this.currentPicks[0] === previousCustomAvatarId) this.pick(customAvatar, true);

		if (!onOpen) this.props.reRender();
	}

	removeCustomAvatar(): void {
		if (!this.customAvatarId) return;

		let selectedCustomAvatar = false;
		if (this.currentPicks.length === 1 && this.currentPicks[0] === this.customAvatarId) {
			selectedCustomAvatar = true;
			this.clear(true);
		}

		delete this.choices[this.customAvatarId];
		delete this.choiceElements[this.customAvatarId];

		this.customAvatarId = '';

		this.renderChoices();

		this.defaultTrainersPagination.updateElements([this.noPickElement]
			.concat(TrainerPicker.defaultTrainerIds.map(x => this.choiceElements[x])), true);

		if (selectedCustomAvatar) {
			this.pick(TrainerPicker.defaultTrainerIds[0]);
		} else {
			this.props.reRender();
		}
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
		this.pickTrainerGen(defaultTrainers, true);
	}

	toggleActivePagination(autoSelectPage?: boolean): void {
		this.defaultTrainersPagination.active = this.trainerGen === defaultTrainers;
		this.genOneTrainersPagination.active = this.trainerGen === genOneTrainers;
		this.genTwoTrainersPagination.active = this.trainerGen === genTwoTrainers;
		this.genThreeTrainersPagination.active = this.trainerGen === genThreeTrainers;
		this.genFourTrainersPagination.active = this.trainerGen === genFourTrainers;
		this.genFiveTrainersPagination.active = this.trainerGen === genFiveTrainers;
		this.genSixTrainersPagination.active = this.trainerGen === genSixTrainers;
		this.genSevenTrainersPagination.active = this.trainerGen === genSevenTrainers;
		this.genEightTrainersPagination.active = this.trainerGen === genEightTrainers;
		this.genNineTrainersPagination.active = this.trainerGen === genNineTrainers;
		this.mastersTrainersPagination.active = this.trainerGen === mastersTrainers;

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
		this.pickTrainerGen(defaultTrainers, true);
		this.clear(true);
	}

	pickRandom(dontRender?: boolean, trainerGen?: TrainerGeneration, parentTrainers?: string[]): boolean {
		if (!trainerGen) trainerGen = this.trainerGen;

		let trainers: TrainerSpriteId[];
		if (trainerGen === defaultTrainers) {
			trainers = TrainerPicker.defaultTrainerIds;
		} else if (trainerGen === genOneTrainers) {
			trainers = TrainerPicker.genOneTrainerIds;
		} else if (trainerGen === genTwoTrainers) {
			trainers = TrainerPicker.genTwoTrainerIds;
		} else if (trainerGen === genThreeTrainers) {
			trainers = TrainerPicker.genThreeTrainerIds;
		} else if (trainerGen === genFourTrainers) {
			trainers = TrainerPicker.genFourTrainerIds;
		} else if (trainerGen === genFiveTrainers) {
			trainers = TrainerPicker.genFiveTrainerIds;
		} else if (trainerGen === genSixTrainers) {
			trainers = TrainerPicker.genSixTrainerIds;
		} else if (trainerGen === genSevenTrainers) {
			trainers = TrainerPicker.genSevenTrainerIds;
		} else if (trainerGen === genEightTrainers) {
			trainers = TrainerPicker.genEightTrainerIds;
		} else if (trainerGen === genNineTrainers) {
			trainers = TrainerPicker.genNineTrainerIds;
		} else {
			trainers = TrainerPicker.mastersTrainerIds;
		}

		const list = Tools.shuffle(trainers);
		let trainer = list.shift()!;
		while (trainer === this.currentPicks[0] || (parentTrainers && parentTrainers.includes(trainer))) {
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

		if (cmd === defaultTrainers || cmd === genOneTrainers || cmd === genTwoTrainers || cmd === genThreeTrainers ||
			cmd === genFourTrainers || cmd === genFiveTrainers || cmd === genSixTrainers || cmd === genSevenTrainers ||
			cmd === genEightTrainers || cmd === genNineTrainers || cmd === mastersTrainers) {
			this.pickTrainerGen(cmd);
		} else if (cmd === refreshCustomAvatarCommand) {
			if (!this.props.userId || this.refreshingCustomAvatar) return;
			const user = Users.get(this.props.userId);
			if (!user) return;

			this.refreshingCustomAvatar = true;
			this.props.reRender();

			Client.getUserDetails(user, updatedUser => {
				if (this.destroyed) return;

				if (updatedUser.avatar && updatedUser.customAvatar) {
					this.updateCustomAvatar(updatedUser.avatar);
				} else {
					this.removeCustomAvatar();
				}

				if (this.timeout) clearTimeout(this.timeout);
				this.timeout = setTimeout(() => {
					this.refreshingCustomAvatar = false;
					this.props.reRender();
				}, 2 * 1000);
			});
		} else {
			return super.tryCommand(originalTargets);
		}
	}

	render(): string {
		const currentDefaultTrainers = this.trainerGen === defaultTrainers;
		const currentGenOneTrainers = this.trainerGen === genOneTrainers;
		const currentGenTwoTrainers = this.trainerGen === genTwoTrainers;
		const currentGenThreeTrainers = this.trainerGen === genThreeTrainers;
		const currentGenFourTrainers = this.trainerGen === genFourTrainers;
		const currentGenFiveTrainers = this.trainerGen === genFiveTrainers;
		const currentGenSixTrainers = this.trainerGen === genSixTrainers;
		const currentGenSevenTrainers = this.trainerGen === genSevenTrainers;
		const currentGenEightTrainers = this.trainerGen === genEightTrainers;
		const currentGenNineTrainers = this.trainerGen === genNineTrainers;
		const currentMastersTrainers = this.trainerGen === mastersTrainers;

		let html = "<b>Trainer sprite</b><br />";
		html += "Type:&nbsp;";
		html += "&nbsp;";
		html += this.getQuietPmButton(this.commandPrefix + ", " + defaultTrainers, "Default",
			{selectedAndDisabled: currentDefaultTrainers});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + genOneTrainers, "Gen 1",
			{selectedAndDisabled: currentGenOneTrainers});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + genTwoTrainers, "Gen 2",
			{selectedAndDisabled: currentGenTwoTrainers});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + genThreeTrainers, "Gen 3",
			{selectedAndDisabled: currentGenThreeTrainers});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + genFourTrainers, "Gen 4",
			{selectedAndDisabled: currentGenFourTrainers});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + genFiveTrainers, "Gen 5",
			{selectedAndDisabled: currentGenFiveTrainers});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + genSixTrainers, "Gen 6",
			{selectedAndDisabled: currentGenSixTrainers});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + genSevenTrainers, "Gen 7",
			{selectedAndDisabled: currentGenSevenTrainers});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + genEightTrainers, "Gen 8",
			{selectedAndDisabled: currentGenEightTrainers});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + genNineTrainers, "Gen 9",
			{selectedAndDisabled: currentGenNineTrainers});
		html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + mastersTrainers, "Masters",
			{selectedAndDisabled: currentMastersTrainers});

		html += "<br /><br />";
		if (this.props.random) {
			html += this.renderNoPickElement();
			html += "&nbsp;" + this.getQuietPmButton(this.commandPrefix + ", " + this.randomPickCommand, "Random Trainer");
		} else {
			if (currentDefaultTrainers) {
				if (this.props.userId && Users.get(this.props.userId)) {
					html += this.getQuietPmButton(this.commandPrefix + ", " + refreshCustomAvatarCommand, "Refresh custom avatar",
						{disabled: this.refreshingCustomAvatar});
					html += "<br /><br />";
				}

				html += this.defaultTrainersPagination.render();
			} else if (currentGenOneTrainers) {
				html += this.genOneTrainersPagination.render();
			} else if (currentGenTwoTrainers) {
				html += this.genTwoTrainersPagination.render();
			} else if (currentGenThreeTrainers) {
				html += this.genThreeTrainersPagination.render();
			} else if (currentGenFourTrainers) {
				html += this.genFourTrainersPagination.render();
			} else if (currentGenFiveTrainers) {
				html += this.genFiveTrainersPagination.render();
			} else if (currentGenSixTrainers) {
				html += this.genSixTrainersPagination.render();
			} else if (currentGenSevenTrainers) {
				html += this.genSevenTrainersPagination.render();
			} else if (currentGenEightTrainers) {
				html += this.genEightTrainersPagination.render();
			} else if (currentGenNineTrainers) {
				html += this.genNineTrainersPagination.render();
			} else {
				html += this.mastersTrainersPagination.render();
			}
		}

		return html;
	}
}
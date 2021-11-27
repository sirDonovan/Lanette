import type { Room } from "../../rooms";
import type { IComponentProps } from "./component-base";
import { ComponentBase } from "./component-base";
import type { ICachedLeaderboardEntry, ILeaderboard, IPreviousCycle, LeaderboardType } from "../../types/storage";
import { Pagination } from "./pagination";
import type { IPageElement } from "./pagination";
import type { TextInput } from "./text-input";

export interface ILeaderboardProps extends IComponentProps {
	showPreviousCycles: boolean;
	leaderboardType?: LeaderboardType;
	pointsName?: string;
}

export abstract class LeaderboardBase extends ComponentBase<ILeaderboardProps> {
	cachedLeaderboardEntries: ICachedLeaderboardEntry[] = [];
	cycleCommand: string = 'selectcycle';
	displayedPercentagePlaces: number = 2;
	formatsInputCommand: string = 'selectformats';
	formatsInput: TextInput | null = null;
	leaderboardPageCommand: string = 'leaderboardpage';
	rowsPerPage: number = 20;
	selectedCycle: string = Storage.currentCycle;
	selectedFormats: string[] = [];

	cycleLeaderboard: ILeaderboard | undefined;
	cycleOptions: string[];
	leaderboardType: LeaderboardType;
	pointsName: string;

	leaderboardPagination!: Pagination;

	constructor(room: Room, parentCommandPrefix: string, componentCommand: string, props: ILeaderboardProps) {
		super(room, parentCommandPrefix, componentCommand, props);

		this.leaderboardType = props.leaderboardType || 'unsortedLeaderboard';
		this.pointsName = props.pointsName || 'point';

		const database = Storage.getDatabase(this.room);
		this.cycleLeaderboard = database[this.leaderboardType];
		this.cycleOptions = [Storage.currentCycle];
		if (database.previousCycles) {
			for (const previousCycle of database.previousCycles) {
				if (!previousCycle[this.leaderboardType]) continue;
				this.cycleOptions.push(this.getCycleId(previousCycle));
			}
		}

		this.leaderboardPagination = new Pagination(this.room, this.commandPrefix, this.leaderboardPageCommand, {
			elements: [],
			elementsPerRow: 1,
			rowsPerPage: this.rowsPerPage,
			pagesLabel: "Users",
			noElementsLabel: "The leaderboard is empty",
			onSelectPage: () => this.props.reRender(),
			reRender: () => this.props.reRender(),
		});

		this.components = [this.leaderboardPagination];

		this.onUpdateLeaderboardParameters(undefined, true);
	}

	setCycle(cycle: string): boolean {
		if (!this.cycleOptions.includes(cycle)) return false;

		if (this.selectedCycle !== cycle) {
			const database = Storage.getDatabase(this.room);
			if (cycle === Storage.currentCycle) {
				this.cycleLeaderboard = database[this.leaderboardType];
			} else {
				const parts = cycle.split(" - ");
				for (const previousCycle of database.previousCycles!) {
					if (previousCycle.cycleStartDate === parts[0] && previousCycle.cycleEndDate === parts[1]) {
						this.cycleLeaderboard = previousCycle[this.leaderboardType];
					}
				}
			}

			this.selectedCycle = cycle;
			this.onUpdateLeaderboardParameters(undefined, true);

			this.leaderboardPagination.parentSelectPage(0);
			this.props.reRender();
		}

		return true;
	}

	getFormatId(input: string): string {
		return input;
	}

	getMaxPercentageLength(): number {
		return 3 + this.displayedPercentagePlaces;
	}

	setFormats(input: string): void {
		const names: string[] = input.split(',');
		if (names.length && !Tools.compareArrays(this.selectedFormats, names)) {
			this.selectedFormats = names;

			const ids: string[] = [];
			for (const name of names) {
				ids.push(this.getFormatId(name));
			}

			this.onUpdateLeaderboardParameters(ids);
			this.props.reRender();
		}
	}

	clearFormats(): void {
		if (!this.selectedFormats.length) return;

		this.selectedFormats = [];
		this.onUpdateLeaderboardParameters();
		this.props.reRender();
	}

    getCycleId(previousCycle: IPreviousCycle): string {
        return previousCycle.cycleStartDate + " - " + previousCycle.cycleEndDate;
    }

	onUpdateLeaderboardParameters(sources?: string[], noPageUpdate?: boolean): void {
		this.updateCachedLeaderboardEntries(sources);
		this.updateLeaderboardPagination(noPageUpdate);
	}

	updateCachedLeaderboardEntries(sources?: string[]): void {
		if (this.selectedCycle === Storage.currentCycle) {
			if (sources) {
				this.cachedLeaderboardEntries = Storage.getSourcePointsCache(this.room, this.leaderboardType, sources);
			} else {
				this.cachedLeaderboardEntries = Storage.getPointsCache(this.room, this.leaderboardType);
			}
		} else {
			if (this.cycleLeaderboard) {
				if (sources) {
					this.cachedLeaderboardEntries = Storage.getPreviousCycleSourcePointsCache(this.room, this.cycleLeaderboard, sources,
						this.selectedCycle);
				} else {
					this.cachedLeaderboardEntries = Storage.getPreviousCyclePointsCache(this.room, this.cycleLeaderboard,
						this.selectedCycle);
				}
			} else {
				this.cachedLeaderboardEntries = [];
			}
		}
	}

	getLeaderboardPaginationElements(): IPageElement[] {
		const elements: IPageElement[] = [];

		for (let i = 0; i < this.cachedLeaderboardEntries.length; i++) {
			elements.push({html: "&nbsp;&nbsp;&nbsp;<b>" + Tools.toNumberOrderString(i + 1) + "</b>: <username>" +
				this.cachedLeaderboardEntries[i].name + "</username> - " + this.cachedLeaderboardEntries[i].points + " " +
				this.pointsName + (this.cachedLeaderboardEntries[i].points > 1 ? "s" : "")});
		}

		return elements;
	}

	updateLeaderboardPagination(noPageUpdate?: boolean): void {
		this.leaderboardPagination.updateElements(this.getLeaderboardPaginationElements(), noPageUpdate);
	}

	tryCommand(originalTargets: readonly string[]): string | undefined {
		const targets = originalTargets.slice();
		const cmd = Tools.toId(targets[0]);
		targets.shift();

		if (cmd === this.cycleCommand) {
			if (!targets.length) return "You must specify a cycle.";

			this.setCycle(targets[0].trim());
		} else {
			return this.checkComponentCommands(cmd, targets);
		}
	}

	renderCycleOptions(): string {
		let html = "<b>Cycles</b>: ";
        for (const option of this.cycleOptions) {
            html += this.getQuietPmButton(this.commandPrefix + ", " + this.cycleCommand + ", " + option, option,
				this.selectedCycle === option) + "&nbsp;";
        }
		return html;
	}

	renderLeaderboardName(): string {
		let html = "<h3>";
		if (this.selectedCycle !== Storage.currentCycle) {
			html += this.selectedCycle + " ";
		}

		if (this.selectedFormats.length) {
			html += "Sub-leaderboard (" + Tools.joinList(this.selectedFormats) + ")";
		} else {
			html += "Leaderboard";
		}

		html += "</h3>";
		return html;
	}

	render(): string {
		let html = "<center>" + this.renderCycleOptions() + "</center>";
		html += "<br />";

		if (this.formatsInput) {
			html += this.formatsInput.render() + "<br />";
		}

		html += this.renderLeaderboardName();

		html += this.leaderboardPagination.render();

		return html;
	}
}
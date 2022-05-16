import type { Room } from "../../rooms";
import { FormatTextInput } from "./format-text-input";
import { LeaderboardBase } from "./leaderboard-base";
import type { ILeaderboardProps } from "./leaderboard-base";

export class TournamentLeaderboard extends LeaderboardBase {
	componentId = 'tournament-leaderboard';

	formatsInput: FormatTextInput;

	constructor(room: Room, parentCommandPrefix: string, componentCommand: string, props: ILeaderboardProps) {
		super(room, parentCommandPrefix, componentCommand, Object.assign({}, props, {
			leaderboardType: 'tournamentLeaderboard',
			pointsName: 'point',
		}));

		this.formatsInput = new FormatTextInput(room, this.commandPrefix, this.formatsInputCommand, {
			label: "Filter by format(s)",
			textArea: true,
			textAreaConfiguration: {rows: 3, cols: 60},
			onClear: () => this.clearFormats(),
			onErrors: () => this.props.reRender(),
			onSubmit: (output) => this.setFormats(output),
			readonly: this.props.readonly,
			reRender: () => this.props.reRender(),
		});

		this.components.push(this.formatsInput);
	}

	getFormatId(input: string): string {
		return Dex.getExistingFormat(input).id;
	}
}
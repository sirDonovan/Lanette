import { GameTextInput } from "./game-text-input";
import { LeaderboardBase } from "./leaderboard-base";
import type { ILeaderboardProps } from "./leaderboard-base";
import type { HtmlPageBase } from "../html-page-base";

export class GameLeaderboard extends LeaderboardBase {
	componentId = 'game-leaderboard';

	formatsInput: GameTextInput;

	constructor(htmlPage: HtmlPageBase, parentCommandPrefix: string, componentCommand: string, props: ILeaderboardProps) {
		super(htmlPage, parentCommandPrefix, componentCommand, Object.assign({}, props, {
			leaderboardType: 'gameLeaderboard',
			pointsName: 'bit',
		}));

		this.formatsInput = new GameTextInput(htmlPage, this.commandPrefix, this.formatsInputCommand, {
			label: "Filter by game(s)",
			textArea: true,
			textAreaConfiguration: {rows: 3, cols: 60},
			allowModes: true,
			allowVariants: true,
			onClear: () => this.clearFormats(),
			onErrors: () => this.props.reRender(),
			onSubmit: (output) => this.setFormats(output),
			readonly: this.props.readonly,
			reRender: () => this.props.reRender(),
		});

		this.components.push(this.formatsInput);
	}

	getFormatId(input: string): string {
		return Games.getExistingFormat(input).id;
	}
}
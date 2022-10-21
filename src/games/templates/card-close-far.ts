import type { IGameTemplateFile } from '../../types/games';
import type { ICard } from './card';
import { CardHighLow, game as cardGame, type IRoundCardInfo } from './card-high-low';

export abstract class CardCloseFar extends CardHighLow {
	abstract categoryMaxDetails: Dict<number>;
	abstract categoryMinDetails: Dict<number>;
	abstract closeOrFar: 'close' | 'far';

	targetDetail: number = 0;

	sortCardInfoForRound(cardInfo: IRoundCardInfo[]): IRoundCardInfo[] {
		const sortClose = this.closeOrFar === 'close';

		return cardInfo.slice().sort((a, b) => {
			const differenceA = Math.abs(this.targetDetail - a.detail);
			const differenceB = Math.abs(this.targetDetail - b.detail);
			if (sortClose) return differenceA - differenceB;
			return differenceB - differenceA;
		});
	}

	scoreRound(): void {
		this.canPlay = false;

		let hands: IRoundCardInfo[] = [];
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			const card = this.roundPlays.get(player);
			if (!card) continue;
			hands.push({player, detail: this.getCardDetail(card, this.currentCategory), card});
		}

		let html = '<center>';
		let len = hands.length;
		let ended = false;
		if (!len) {
			html += "No cards were played! Moving to the next round.";
		} else {
			hands = this.sortCardInfoForRound(hands);
			const winners = [];
			for (let i = 0; i < len; i++) {
				if (i === 0) {
					winners.push(hands[i]);
				} else {
					if (Math.abs(this.targetDetail - hands[i].detail) !== Math.abs(this.targetDetail - hands[0].detail)) break;
					winners.push(hands[i]);
				}
			}

			len = winners.length;
			const cards: ICard[] = [];
			const winnersNames: string[] = [];
			for (let i = 0; i < len; i++) {
				cards.push(winners[i].card);
				winnersNames.push(winners[i].player!.name);
				let points = this.points.get(winners[i].player!) || 0;
				points++;
				this.points.set(winners[i].player!, points);
				if (!ended && points >= this.options.points!) ended = true;
			}

			html += '<center>' + this.getCardChatHtml(cards) + '</center>';
			html += "<br /><b>" + Tools.joinList(winnersNames) + " had the closest card" + (len > 1 ? "s" : "") + "</b>!";
		}
		html += "</center>";

		const uhtmlName = this.uhtmlBaseName + '-round-score';
		this.onUhtml(uhtmlName, html, () => {
			if (ended) {
				this.setTimeout(() => this.end(), 5000);
			} else {
				this.setTimeout(() => this.nextRound(), 5000);
			}
		});
		this.sayUhtml(uhtmlName, html);
	}

	onNextRound(): void {
		const remainingPlayers = this.getRemainingPlayerCount();
		if (!remainingPlayers) {
			this.end();
			return;
		}
		if (remainingPlayers === 1) return this.end();

		if (!this.categoryList.length) this.categoryList = this.shuffle(this.detailCategories);
		const category = this.categoryList[0];
		this.categoryList.shift();
		this.currentCategory = category;
		this.roundPlays.clear();

		let targetDetail = -1;
		while (targetDetail < this.categoryMinDetails[category]) {
			targetDetail = this.random(this.categoryMaxDetails[category]) + 1;
		}
		this.targetDetail = targetDetail;

		const html = this.getRoundHtml(players => this.getPlayerPoints(players));
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			const text = "The randomly chosen number and category are **" + this.targetDetail + " " +
				this.categoryAbbreviations[category] + (this.categoryAbbreviations[category] !== this.categoryNames[category] ?
				" (" + this.categoryNames[category] + ")" : "") + "**!";
			this.on(text, () => {
				this.canPlay = true;
				this.setTimeout(() => {
					this.scoreRound();
				}, this.sampleOne(this.roundTimes));
			});
			this.say(text);
			for (const i in this.players) {
				if (!this.players[i].eliminated) {
					const htmlPage = this.getHtmlPage(this.players[i]);
					htmlPage.renderHandHtml();
					htmlPage.renderPlayedCardsHtml();
					htmlPage.renderDrawnCardsHtml();
					htmlPage.send();
				}
			}
		});
		this.sayUhtml(uhtmlName, html);
	}
}

export const game: IGameTemplateFile<CardCloseFar> = Object.assign(Tools.deepClone(cardGame), {
	modeProperties: undefined,
	tests: undefined,
	variants: undefined,
});

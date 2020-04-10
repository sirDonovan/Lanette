import { ICommandDefinition } from '../../command-parser';
import { Player } from '../../room-activity';
import { GameCategory, IGameTemplateFile, GameCommandReturnType } from '../../types/games';
import { Card, CardType, game as cardGame } from './card';

type HighLow = 'high' | 'low';

export abstract class CardHighLow extends Card {
	autoFillHands: boolean = true;
	bitsPerRound: number = 100;
	canPlay: boolean = false;
	categoryList: string[] = [];
	categoriesNames: Dict<string> = {hp: 'HP', atk: 'Atk', attack: 'Atk', def: 'Def', defense: 'Def', spa: 'SpA', specialattack: 'SpA', spd: 'SpD', specialdefense: 'SpD', spe: 'Spe',
		speed: 'Spe', bst: 'BST', basestattotal: 'BST'};
	currentCategory: string = '';
	detailCategories: string[] = [];
	highOrLow: HighLow = 'high';
	maxPlayers: number = 20;
	points = new Map<Player, number>();
	roundDrawAmount: number = 1;
	roundPlays = new Map<Player, CardType>();
	roundTimes: number[] = [15000, 16000, 17000, 18000, 19000, 20000, 21000, 22000, 23000, 24000, 25000];

	abstract getCardDetail(card: CardType, detail: string): number;

	createDeck(): void {
		if (!this.deckPool.length) this.createDeckPool();
		this.deck = this.shuffle(this.deckPool);
	}

	onSignups(): void {
		this.createDeck();
		if (!this.format.inputOptions.points) this.format.options.points = 5;
	}

	onStart(): void {
		this.createDeck();
		this.say("Now PMing cards!");
		for (const i in this.players) {
			this.playerCards.set(this.players[i], this.dealHand(this.players[i]));
		}
		this.nextRound();
	}

	getCardChatDetails(card: CardType): string {
		return '<div style="display:inline-block;background-color:' + Tools.hexColorCodes['Black']['background-color'] + ';background:' + Tools.hexColorCodes['Black']['background'] + ';border-color:' + Tools.hexColorCodes['Black']['border-color'] + ';border: 1px solid #a99890;border-radius:3px;width:auto;padding:1px;color:#fff;text-shadow:1px 1px 1px #333;text-transform: uppercase;text-align:center;font-size:8pt">' + this.getCardDetail(card, this.currentCategory) + ' ' + this.categoriesNames[this.currentCategory] + '</div>';
	}

	getCardsPmHtml(cards: CardType[], player: Player): string {
		let html = '';
		const cardInfo: {card: CardType; detail: number}[] = [];
		for (const card of cards) {
			cardInfo.push({card: card, detail: this.getCardDetail(card, this.currentCategory)});
		}
		const sorted = cardInfo.slice().sort((a, b) => b.detail - a.detail);
		let bestDetail = -1;
		if (this.highOrLow && !this.roundPlays.has(player)) {
			bestDetail = (this.highOrLow === 'high' ? sorted[0].detail : sorted[sorted.length - 1].detail);
		}
		const cardsHtml: string[] = [];
		const notPlayed = !this.roundPlays.has(player);
		for (const info of cardInfo) {
			const card = info.card;
			let cardHtml = '<div style="height:auto">';
			const bolded = notPlayed && info.detail === bestDetail;
			if (bolded) {
				cardHtml += '<b>' + card.name + '</b>';
			} else {
				cardHtml += card.name + '';
			}
			if (this.currentCategory) {
				cardHtml += ':&nbsp;<div style="display:inline-block;background-color:' + Tools.hexColorCodes['Black']['background-color'] + ';background:' + Tools.hexColorCodes['Black']['background'] + ';border-color:' + Tools.hexColorCodes['Black']['border-color'] + ';border: 1px solid #a99890;border-radius:3px;width:auto;padding:1px;color:#fff;text-shadow:1px 1px 1px #333;text-transform: uppercase;text-align:center;font-size:8pt">';
				if (bolded) {
					cardHtml += '<b>' + info.detail + ' ' + this.categoriesNames[this.currentCategory] + '</b>';
				} else {
					cardHtml += info.detail + ' ' + this.categoriesNames[this.currentCategory];
				}
				cardHtml += '</div>';

				cardHtml += '<div>';
				for (let i = 0; i < this.detailCategories.length; i++) {
					if (this.detailCategories[i] === this.currentCategory) continue;
					const detail = '' + this.getCardDetail(card, this.detailCategories[i]);
					if (i !== 0) cardHtml += '&nbsp;';
					cardHtml += '<div style="display:inline-block;background-color:' + Tools.hexColorCodes['Black']['background-color'] + ';background:' + Tools.hexColorCodes['Black']['background'] + ';border-color:' + Tools.hexColorCodes['Black']['border-color'] + ';border: 1px solid #a99890;border-radius:3px;width:auto;padding:1px;color:#fff;text-shadow:1px 1px 1px #333;text-transform: uppercase;text-align:center;font-size:6pt">';
					cardHtml += detail + '&nbsp;<span style="font-size:6pt">' + this.categoriesNames[this.detailCategories[i]] + "</span>";
					cardHtml += '</div>';
				}
				cardHtml += '</div>';
			}
			cardHtml += '</div>';
			cardsHtml.push(cardHtml);
		}
		html += cardsHtml.join("<br />");
		return html;
	}

	scoreRound(): void {
		this.canPlay = false;
		const hands: {player: Player; detail: number; card: CardType}[] = [];
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
			if (this.highOrLow === 'high') {
				hands.sort((a, b) => b.detail - a.detail);
			} else {
				hands.sort((a, b) => a.detail - b.detail);
			}
			const winners = [];
			for (let i = 0; i < len; i++) {
				if (i === 0) {
					winners.push(hands[i]);
				} else {
					if (hands[i].detail !== hands[0].detail) break;
					winners.push(hands[i]);
				}
			}
			len = winners.length;
			const cards: CardType[] = [];
			const winnersNames: string[] = [];
			for (let i = 0; i < len; i++) {
				cards.push(winners[i].card);
				winnersNames.push(winners[i].player.name);
				let points = this.points.get(winners[i].player) || 0;
				points++;
				this.points.set(winners[i].player, points);
				if (!ended && points >= this.format.options.points) ended = true;
			}
			html += '<center>' + this.getCardChatHtml(cards) + '</center>';
			html += "<br><b>" + Tools.joinList(winnersNames) + " had the " + (this.highOrLow === 'low' ? "lowest" : "highest") + " card" + (len > 1 ? "s" : "") + "</b>!";
		}
		html += "</center>";
		const uhtmlName = this.uhtmlBaseName + '-round-score';
		this.onUhtml(uhtmlName, html, () => {
			if (ended) {
				this.timeout = setTimeout(() => this.end(), 5000);
			} else {
				this.timeout = setTimeout(() => this.nextRound(), 5000);
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
		this.highOrLow = this.random(2) ? 'high' : 'low';
		if (!this.categoryList.length) this.categoryList = this.shuffle(this.detailCategories);
		const category = this.categoryList[0];
		this.categoryList.shift();
		this.currentCategory = category;
		this.roundPlays.clear();
		const html = this.getRoundHtml(this.getPlayerPoints);
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			const text = "The randomly chosen category is **" + this.categoriesNames[category] + "** (" + this.highOrLow + ")!";
			this.on(text, () => {
				this.canPlay = true;
				this.timeout = setTimeout(() => {
					this.scoreRound();
				}, this.sampleOne(this.roundTimes));
			});
			this.say(text);
			for (const i in this.players) {
				if (!this.players[i].eliminated) this.dealHand(this.players[i]);
			}
		});
		this.sayUhtml(uhtmlName, html);
	}

	onEnd(): void {
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			const points = this.points.get(player);
			if (!points) continue;
			/*
			if (points === this.format.options.cards) {
				if (this.id === 'cacturnespokemoncards') {
					Games.unlockAchievement(this.room, player, 'Prickly Perfection', this);
				} else if (this.id === 'mewsmovecards') {
					Games.unlockAchievement(this.room, player, 'Move it or Lose it', this);
				}
			}
			*/
			let bits = this.bitsPerRound * points;
			if (bits > this.maxBits) bits = this.maxBits;
			this.addBits(player, bits);
			this.winners.set(player, 1);
		}

		this.announceWinners();
	}

	getPlayerSummary(player: Player): void {
		if (player.eliminated) return;
		this.dealHand(player);
	}
}

const commands: Dict<ICommandDefinition<CardHighLow>> = {
	play: {
		command(target, room, user): GameCommandReturnType {
			if (!this.canPlay || !(user.id in this.players) || this.players[user.id].eliminated || this.roundPlays.has(this.players[user.id])) return false;
			const player = this.players[user.id];
			const targets = target.split(",");
			const id = Tools.toId(targets[0]);
			if (!id) return false;
			const cards = this.playerCards.get(player);
			if (!cards || !cards.length) return false;
			const index = this.getCardIndex(id, cards);
			if (index < 0) {
				if (Dex.data.pokedex[id]) {
					user.say("You do not have [ " + Dex.getExistingPokemon(id).name + " ].");
				} else if (Dex.data.moves[id]) {
					user.say("You do not have [ " + Dex.getExistingMove(id).name + " ].");
				} else {
					user.say("'" + targets[0] + "' is not a valid Pokemon or move.");
				}
				return false;
			}
			this.roundPlays.set(player, cards[index]);
			cards.splice(index, 1);
			this.drawCard(player, this.roundDrawAmount);
			return true;
		},
	},
};

export const game: IGameTemplateFile<CardHighLow> = Object.assign(Tools.deepClone(cardGame), {
	category: 'card-high-low' as GameCategory,
	commands: Object.assign(Tools.deepClone(cardGame.commands), commands),
});

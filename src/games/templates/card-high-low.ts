import type { Player } from '../../room-activity';
import type { GameCategory, GameCommandDefinitions, IGameTemplateFile } from '../../types/games';
import type { ICard } from './card';
import { Card, game as cardGame } from './card';

export abstract class CardHighLow extends Card {
	abstract categoryAbbreviations: Dict<string>;
	abstract categoryNames: Dict<string>;
	abstract detailCategories: string[];

	actionCards = {};
	bitsPerRound: number = 100;
	canPlay: boolean = false;
	categoryList: string[] = [];
	currentCategory: string = '';
	highOrLow: 'High' | 'Low' = 'High';
	maxPlayers: number = 20;
	points = new Map<Player, number>();
	roundDrawAmount: number = 1;
	roundPlays = new Map<Player, ICard>();
	roundTimes: number[] = [15000, 16000, 17000, 18000, 19000, 20000, 21000, 22000, 23000, 24000, 25000];

	abstract getCardDetail(card: ICard, detail: string): number;

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
		this.say("Now sending out cards!");
		for (const i in this.players) {
			this.giveStartingCards(this.players[i]);
			this.updatePlayerHtmlPage(this.players[i]);
		}
		this.nextRound();
	}

	getCardChatDetails(card: ICard): string {
		const blackHex = Tools.getNamedHexCode('Black');

		return '<div style="display:inline-block;background-color:' + blackHex.color + ';background:' + blackHex.gradient + ';' +
			'border:1px solid #a99890;border-radius:3px;width:auto;padding:1px;color:#fff;text-shadow:1px 1px 1px #333;' +
			'text-align:center;font-size:8pt">' + this.getCardDetail(card, this.currentCategory) + ' ' +
			this.categoryAbbreviations[this.currentCategory] + '</div>';
	}

	getCardsPmHtml(cards: ICard[], player?: Player): string {
		const borderSize = 1;
		const paddingSize = 1;
		const categoryWidth = 64;
		const totalCategories = this.detailCategories.length;
		const currentCategoryWidth = (categoryWidth * (totalCategories - 1)) +
			(((borderSize * 2) + (paddingSize * 2)) * (totalCategories - 2));
		const cardWidth = categoryWidth * (totalCategories + 1);
		const cardInfo: {card: ICard; detail: number}[] = [];
		for (const card of cards) {
			cardInfo.push({card: card, detail: this.getCardDetail(card, this.currentCategory)});
		}

		const sortHigh = this.highOrLow === 'High';
		const sorted = cardInfo.slice().sort((a, b) => {
			if (sortHigh) return b.detail - a.detail;
			return a.detail - b.detail;
		});

		const canPlay = this.currentCategory && player && !this.roundPlays.has(player);
		let bestDetail = -1;
		if (canPlay) {
			bestDetail = sorted[0].detail;
		}

		const cardsHtml: string[] = [];
		for (const info of sorted) {
			const card = info.card;
			let cardHtml = '<div class="infobox" style="width:' + cardWidth + 'px">';
			if (Dex.data.pokemonKeys.includes(card.id)) {
				cardHtml += Dex.getPokemonIcon(Dex.getExistingPokemon(card.id));
			}

			const bolded = canPlay && info.detail === bestDetail;
			if (bolded) {
				cardHtml += '<b>' + card.name + '</b>';
			} else {
				cardHtml += card.name + '';
			}

			if (canPlay) {
				cardHtml += '&nbsp;' + Client.getPmSelfButton(Config.commandCharacter + "play " + card.name, "Play!");
			}
			cardHtml += '<br />';

			cardHtml += "<center>";

			const blackHex = Tools.getNamedHexCode('Black');
			if (this.currentCategory) {
				cardHtml += '<div style="background-color:' + blackHex.color + ';background:' + blackHex.gradient + ';' +
					'border:' + borderSize + 'px solid #a99890;border-radius:3px;padding:' + paddingSize + 'px;color:#fff;' +
					'text-shadow:1px 1px 1px #333;width:' + currentCategoryWidth + 'px">';
				if (bolded) {
					cardHtml += '<b>' + info.detail + ' <span title="' + this.categoryNames[this.currentCategory] + '">' +
						this.categoryAbbreviations[this.currentCategory] + '</span></b>';
				} else {
					cardHtml += info.detail + ' <span title="' + this.categoryNames[this.currentCategory] + '">' +
						this.categoryAbbreviations[this.currentCategory] + '</span>';
				}
				cardHtml += '</div>';

				cardHtml += '<div>';
				for (const category of this.detailCategories) {
					if (category === this.currentCategory) continue;
					const detail = '' + this.getCardDetail(card, category);
					cardHtml += '<div style="display:inline-block;background-color:' + blackHex.color +
						';background:' + blackHex.gradient + ';border:' + borderSize + 'px solid #a99890;' +
						'border-radius:3px;padding:' + paddingSize + 'px;color:#fff;text-shadow:1px 1px 1px #333;text-align:center;width:' +
						categoryWidth + 'px">' + detail + ' <span title="' + this.categoryNames[category] + '">' +
						this.categoryAbbreviations[category] + "</span></div>";
				}
				cardHtml += '</div>';
			}

			cardHtml += '</center></div>';

			cardsHtml.push(cardHtml);
		}

		return cardsHtml.join("<br />");
	}

	scoreRound(): void {
		this.canPlay = false;
		const hands: {player: Player; detail: number; card: ICard}[] = [];
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
			if (this.highOrLow === 'High') {
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
			const cards: ICard[] = [];
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
			html += "<br /><b>" + Tools.joinList(winnersNames) + " had the " + (this.highOrLow === 'High' ? "highest" : "lowest") + " " +
				"card" + (len > 1 ? "s" : "") + "</b>!";
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

		this.highOrLow = this.random(2) ? 'High' : 'Low';
		if (!this.categoryList.length) this.categoryList = this.shuffle(this.detailCategories);
		const category = this.categoryList[0];
		this.categoryList.shift();
		this.currentCategory = category;
		this.roundPlays.clear();

		const html = this.getRoundHtml(players => this.getPlayerPoints(players));
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			const text = "The randomly chosen category is **" + this.highOrLow + " " + this.categoryAbbreviations[category] + " (" +
				this.categoryNames[category] + ")**!";
			this.on(text, () => {
				this.canPlay = true;
				this.timeout = setTimeout(() => {
					this.scoreRound();
				}, this.sampleOne(this.roundTimes));
			});
			this.say(text);
			for (const i in this.players) {
				if (!this.players[i].eliminated) this.updatePlayerHtmlPage(this.players[i]);
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
			this.addBits(player, this.bitsPerRound * points);
			this.winners.set(player, 1);
		}

		this.announceWinners();
	}

	getPlayerSummary(player: Player): void {
		if (player.eliminated) return;
		this.updatePlayerHtmlPage(player);
	}
}

const commands: GameCommandDefinitions<CardHighLow> = {
	play: {
		// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
		command(target, room, user) {
			if (!this.canPlay || this.roundPlays.has(this.players[user.id])) return false;
			const player = this.players[user.id];
			const targets = target.split(",");
			const cardName = targets[0].trim();
			const id = Tools.toId(cardName);
			if (!id) return false;
			const cards = this.playerCards.get(player);
			if (!cards || !cards.length) return false;
			const index = this.getCardIndex(id, cards);
			if (index < 0) {
				const pokemon = Dex.data.pokemonKeys.includes(id);
				const move = Dex.data.moveKeys.includes(id);
				if (pokemon) {
					user.say("You do not have [ " + Dex.getExistingPokemon(cardName).name + " ].");
				} else if (move) {
					user.say("You do not have [ " + Dex.getExistingMove(cardName).name + " ].");
				} else {
					user.say("'" + cardName + "' is not a valid Pokemon or move.");
				}
				return false;
			}
			this.roundPlays.set(player, cards[index]);
			cards.splice(index, 1);
			const drawnCards = this.drawCard(player, this.roundDrawAmount);
			this.updatePlayerHtmlPage(player, drawnCards);
			return true;
		},
		aliases: ['pmplay'],
		pmGameCommand: true,
	},
};

export const game: IGameTemplateFile<CardHighLow> = Object.assign(Tools.deepClone(cardGame), {
	category: 'card-high-low' as GameCategory,
	commands: Object.assign(Tools.deepClone(cardGame.commands), commands),
	modeProperties: undefined,
	tests: undefined,
	variants: undefined,
});

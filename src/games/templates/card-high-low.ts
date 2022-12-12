import type { Player } from '../../room-activity';
import type { GameCommandDefinitions, IGameTemplateFile } from '../../types/games';
import type { ICard } from './card';
import { CardGame, game as cardGame } from './card';
import type { IPokemon } from '../../types/pokemon-showdown';
import type { CardHighLowPage } from '../../html-pages/activity-pages/card-high-low';

export interface IRoundCardInfo {
	card: ICard;
	detail: number;
	player?: Player;
}

const PLAY_COMMAND = "play";

export abstract class CardHighLow extends CardGame {
	abstract categoryAbbreviations: Dict<string>;
	abstract categoryNames: Dict<string>;
	abstract detailCategories: string[];

	actionCards = {};
	bitsPerRound: number = 100;
	canPlay: boolean = false;
	categoryList: string[] = [];
	currentCategory: string = '';
	detailLabelWidth: number = 50;
	highOrLow: 'High' | 'Low' = 'High';
	htmlPages = new Map<Player, CardHighLowPage>();
	maxPlayers: number = 20;
	playCommand: string = PLAY_COMMAND;
	points = new Map<Player, number>();
	roundDrawAmount: number = 1;
	roundPlays = new Map<Player, ICard>();
	roundTimes: number[] = [15000, 16000, 17000, 18000, 19000, 20000, 21000, 22000, 23000, 24000, 25000];

	abstract getCardDetail(card: ICard, detail: string): number;

	filterForme(dex: typeof Dex, forme: IPokemon): boolean {
		const baseSpecies = dex.getExistingPokemon(forme.baseSpecies);
		if (forme.isMega || forme.isPrimal ||
			(baseSpecies.name === 'Calyrex' || baseSpecies.name === 'Deoxys' || baseSpecies.name === 'Kyurem' ||
			baseSpecies.name === 'Necrozma' || baseSpecies.name === 'Zacian' || baseSpecies.name === 'Zamazenta' ||
			baseSpecies.name === 'Zygarde')) return true;
		return false;
	}

	createDeck(): void {
		this.deck = this.shuffle(this.deckPool.map(x => Tools.deepClone(x)));
	}

	onSignups(): void {
		if (!this.format.inputOptions.points) this.options.points = 5;
	}

	onStart(): void {
		this.createDeckPool();
		this.createDeck();

		this.say("Now sending out cards!");
		for (const i in this.players) {
			this.giveStartingCards(this.players[i]);
			this.sendHtmlPage(this.players[i]);
		}

		this.nextRound();
	}

	getCardChatDetails(card: ICard): string {
		return Tools.getTypeOrColorLabel(Tools.getNamedHexCode('Black'), this.getCardDetail(card, this.currentCategory) + '<br />' +
			this.categoryAbbreviations[this.currentCategory], this.detailLabelWidth);
	}

	createHtmlPage(player: Player): CardHighLowPage {
		if (this.htmlPages.has(player)) return this.htmlPages.get(player)!;

		const gameActionLocation = this.getGameActionLocation(player);
		const page = new (CommandParser.getGameHtmlPages().cardHighLow)(this, player, this.htmlPageCommand, {
			customBox: this.getPlayerOrPickedCustomBox(player),
			detailLabelWidth: this.detailLabelWidth,
			sendToChat: gameActionLocation === 'chat',
			showColors: false,
			showEggGroups: false,
			showTypings: false,
		});

		this.htmlPages.set(player, page);

		return page;
	}

	sortCardInfoForRound(cardInfo: IRoundCardInfo[]): IRoundCardInfo[] {
		const sortHigh = this.highOrLow === 'High';
		return cardInfo.slice().sort((a, b) => {
			if (sortHigh) return b.detail - a.detail;
			return a.detail - b.detail;
		});
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
				if (!ended && points >= this.options.points!) ended = true;
			}
			html += '<center>' + this.getCardChatHtml(cards) + '</center>';
			html += "<br /><b>" + Tools.joinList(winnersNames) + " had the " + (this.highOrLow === 'High' ? "highest" : "lowest") + " " +
				"card" + (len > 1 ? "s" : "") + "</b>!";
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

		this.highOrLow = this.random(2) ? 'High' : 'Low';
		if (!this.categoryList.length) this.categoryList = this.shuffle(this.detailCategories);
		const category = this.categoryList[0];
		this.categoryList.shift();
		this.currentCategory = category;
		this.roundPlays.clear();

		const html = this.getRoundHtml(players => this.getPlayerPoints(players));
		const uhtmlName = this.uhtmlBaseName + '-round-html';
		this.onUhtml(uhtmlName, html, () => {
			const text = "The randomly chosen category is **" + this.highOrLow + " " + this.categoryAbbreviations[category] +
				(this.categoryAbbreviations[category] !== this.categoryNames[category] ? " (" + this.categoryNames[category] + ")" : "") +
				"**!";
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

	destroyPlayers(): void {
		super.destroyPlayers();

		this.roundPlays.clear();
	}

	onEnd(): void {
		for (const i in this.players) {
			if (this.players[i].eliminated) continue;
			const player = this.players[i];
			const points = this.points.get(player);
			if (!points) continue;
			/*
			if (points === this.options.cards) {
				if (this.id === 'cacturnespokemoncards') {
					Games.unlockAchievement(this.room, player, 'Prickly Perfection', this);
				} else if (this.id === 'mewsmovecards') {
					Games.unlockAchievement(this.room, player, 'Move it or Lose it', this);
				}
			}
			*/
			this.addBits(player, this.bitsPerRound * points);
			this.winners.set(player, points);
		}

		this.announceWinners();
	}
}

const commands: GameCommandDefinitions<CardHighLow> = {
	[PLAY_COMMAND]: {
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
				const pokemon = Dex.getData().pokemonKeys.includes(id);
				const move = Dex.getData().moveKeys.includes(id);
				if (pokemon) {
					user.say("You do not have [ " + Dex.getExistingPokemon(cardName).name + " ].");
				} else if (move) {
					user.say("You do not have [ " + Dex.getExistingMove(cardName).name + " ].");
				} else {
					user.say("'" + cardName + "' is not a valid Pokemon or move.");
				}
				return false;
			}

			const playedCards = [cards[index]];
			this.roundPlays.set(player, cards[index]);
			cards.splice(index, 1);

			const drawnCards = this.drawCard(player, this.roundDrawAmount);
			const htmlPage = this.getHtmlPage(player);
			htmlPage.renderCardActionsHtml();
			htmlPage.renderPlayedCardsHtml(playedCards);
			htmlPage.renderDrawnCardsHtml(drawnCards);
			htmlPage.renderHandHtml();
			htmlPage.send();

			return true;
		},
		aliases: ['pmplay'],
		pmGameCommand: true,
	},
};

export const game: IGameTemplateFile<CardHighLow> = Object.assign(Tools.deepClone(cardGame), {
	commands: Object.assign((Tools.deepClone(cardGame.commands) as unknown) as GameCommandDefinitions<CardHighLow>, commands),
	modeProperties: undefined,
	tests: undefined,
	variants: undefined,
});

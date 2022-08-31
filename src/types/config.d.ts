export interface IGameTrainerCardPokemon {
	one: number;
	two: number;
	three: number;
	four: number;
	five: number;
	six: number;
}

export interface IGameHostBoxPokemon {
	one: number;
	two: number;
	three: number;
}

export interface ITournamentPointsShopItem {
	name: string;
	points: number;
	bits: number;
	source: string;
	width: number;
	height: number;
	pointsOverride?: Dict<number>;
	bitsOverride?: Dict<number>;
}
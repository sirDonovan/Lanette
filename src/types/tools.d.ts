export type HexColor = 'Red' | 'Red-Orange' | 'Orange' | 'Yellow-Orange' | 'Yellow' | 'Yellow-Green' | 'Green' | 'Cyan' |
	'Blue' | 'Blue-Violet' | 'Violet' | 'Pink' | 'Red-Violet' | 'Brown' | 'Gray' | 'White' | 'Black' |
	'Light-Red' | 'Light-Red-Orange' | 'Light-Orange' | 'Light-Yellow-Orange' | 'Light-Yellow' | 'Light-Yellow-Green' | 'Light-Green' |
	'Light-Cyan' | 'Light-Blue' | 'Light-Blue-Violet' | 'Light-Violet' | 'Light-Pink' | 'Light-Red-Violet' |
	'Light-Brown' | 'Light-Gray' |
	'Dark-Red' | 'Dark-Red-Orange' | 'Dark-Yellow' | 'Dark-Yellow-Green' | 'Dark-Green' | 'Dark-Cyan' | 'Dark-Blue' |
	'Dark-Blue-Violet' | 'Dark-Violet' | 'Dark-Pink' | 'Dark-Red-Violet' | 'Dark-Brown' | 'Dark-Gray';

export interface IParsedSmogonLink {
	description: string;
	link: string;
	dexPage?: string;
	postId?: string;
	threadId?: string;
}

export interface IExtractedBattleId {
	format: string;
	fullId: string;
	publicId: string;
	password: string;
}
export type HexColor = 'White' | 'Black' | 'Dark Yellow' | 'Orange' | 'Blue' | 'Yellow' | 'Light Pink' | 'Green' | 'Light Blue' | 'Red' |
	'Dark Pink' | 'Light Brown' | 'Light Purple' | 'Pink' | 'Light Green' | 'Brown' | 'Dark Purple' | 'Purple' | 'Light Gray' |
	'Dark Brown';

export interface IParsedSmogonLink {
	description: string;
	link: string;
	dexPage?: string;
	postId?: string;
	threadId?: string;
}

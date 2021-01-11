export type HexCode = '#262626' | '#999999' | '#db7070' | '#db8b70' | '#dba670' | '#dbc170' | '#dbdb70' | '#c1db70' | '#a6db70' |
	'#8bdb70' | '#70db70' | '#70db8b' | '#70dba6' | '#70dbc1' | '#70dbdb' | '#70c1db' | '#70a6db' | '#708bdb' | '#7070db' | '#8b70db' |
	'#a670db' | '#c170db' | '#db70db' | '#db70c1' | '#db70a6' | '#db708b' | '#e6e6e6' | '#c68353' | '#ec9393' | '#eca993' | '#ecbf93' |
	'#ecd693' | '#ecec93' | '#d6ec93' | '#bfec93' | '#a9ec93' | '#93ec93' | '#93eca9' | '#93ecbf' | '#93ecd6' | '#93ecec' | '#93d6ec' |
	'#93bfec' | '#93a9ec' | '#9393ec' | '#a993ec' | '#bf93ec' | '#d693ec' | '#ec93ec' | '#ec93d6' | '#ec93bf' | '#ec93a9' | '#bfbfbf' |
	'#e6c8b3' | '#595959' | '#ac3939' | '#ac5639' | '#ac7339' | '#ac8f39' | '#acac39' | '#8fac39' | '#73ac39' | '#56ac39' | '#39ac39' |
	'#39ac56' | '#39ac73' | '#39ac8f' | '#39acac' | '#398fac' | '#3973ac' | '#3956ac' | '#3939ac' | '#5639ac' | '#7339ac' | '#8f39ac' |
	'#ac39ac' | '#ac398f' | '#ac3973' | '#ac3956' | '#995c33';

export type NamedHexCode = 'Red' | 'Dark-Red' | 'Light-Red' | 'Red-Orange' | 'Dark-Red-Orange' | 'Light-Red-Orange' | 'Orange' |
	'Dark-Orange' | 'Light-Orange' | 'Yellow-Orange' | 'Dark-Yellow-Orange' | 'Light-Yellow-Orange' | 'Yellow' | 'Dark-Yellow' |
	'Light-Yellow' | 'Yellow-Green' | 'Dark-Yellow-Green' | 'Light-Yellow-Green' | 'Green' | 'Dark-Green' | 'Light-Green' | 'Cyan' |
	'Dark-Cyan' | 'Light-Cyan' | 'Blue' | 'Dark-Blue' | 'Light-Blue' | 'Blue-Violet' | 'Dark-Blue-Violet' | 'Light-Blue-Violet' | 'Violet' |
	'Dark-Violet' | 'Light-Violet' | 'Pink' | 'Dark-Pink' | 'Light-Pink' | 'Red-Violet' | 'Dark-Red-Violet' | 'Light-Red-Violet' |
	'White' | 'Gray' | 'Dark-Gray' | 'Light-Gray' | 'Black' | 'Brown' | 'Dark-Brown' | 'Light-Brown';

export interface IHexCodeData {
	color: string;
	gradient: string;
	category?: 'light' | 'dark';
	textColor?: '#000000' | '#ffffff';
}

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
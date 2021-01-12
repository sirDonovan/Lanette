export type HexCode = '#db7070' | '#db7970' | '#db8270' | '#db8b70' | '#db9470' | '#db9d70' | '#dba670' | '#dbaf70' | '#dbb870' |
	'#dbc170' | '#dbc970' | '#dbd270' | '#dbdb70' | '#d2db70' | '#c9db70' | '#c1db70' | '#b8db70' | '#afdb70' | '#a6db70' | '#9ddb70' |
	'#94db70' | '#8bdb70' | '#82db70' | '#79db70' | '#70db70' | '#70db79' | '#70db82' | '#70db8b' | '#70db94' | '#70db9d' | '#70dba6' |
	'#70dbaf' | '#70dbb8' | '#70dbc1' | '#70dbc9' | '#70dbd2' | '#70dbdb' | '#70d2db' | '#70c9db' | '#70c1db' | '#70b8db' | '#70afdb' |
	'#70a6db' | '#709ddb' | '#7094db' | '#708bdb' | '#7082db' | '#7079db' | '#7070db' | '#7970db' | '#8270db' | '#8b70db' | '#9470db' |
	'#9d70db' | '#a670db' | '#af70db' | '#b870db' | '#c170db' | '#c970db' | '#d270db' | '#db70db' | '#db70d2' | '#db70c9' | '#db70c1' |
	'#db70b8' | '#db70af' | '#db70a6' | '#db709d' | '#db7094' | '#db708b' | '#db7082' | '#db7079' | '#c68353' | '#e6e6e6' | '#999999' |
	'#262626' | '#ec9393' | '#ec9a93' | '#eca293' | '#eca993' | '#ecb093' | '#ecb893' | '#ecbf93' | '#ecc793' | '#ecce93' | '#ecd693' |
	'#ecdd93' | '#ece493' | '#ecec93' | '#e4ec93' | '#ddec93' | '#d6ec93' | '#ceec93' | '#c7ec93' | '#bfec93' | '#b8ec93' | '#b0ec93' |
	'#a9ec93' | '#a2ec93' | '#9aec93' | '#93ec93' | '#93ec9a' | '#93eca1' | '#93eca9' | '#93ecb0' | '#93ecb8' | '#93ecbf' | '#93ecc7' |
	'#93ecce' | '#93ecd6' | '#93ecdd' | '#93ece4' | '#93ecec' | '#93e4ec' | '#93ddec' | '#93d6ec' | '#93ceec' | '#93c7ec' | '#93bfec' |
	'#93b8ec' | '#93b0ec' | '#93a9ec' | '#93a1ec' | '#939aec' | '#9393ec' | '#9a93ec' | '#a293ec' | '#a993ec' | '#b093ec' | '#b893ec' |
	'#bf93ec' | '#c793ec' | '#ce93ec' | '#d693ec' | '#dd93ec' | '#e493ec' | '#ec93ec' | '#ec93e4' | '#ec93dd' | '#ec93d6' | '#ec93ce' |
	'#ec93c7' | '#ec93bf' | '#ec93b8' | '#ec93b0' | '#ec93a9' | '#ec93a2' | '#ec939a' | '#e6c8b3' | '#bfbfbf' | '#ac3939' | '#ac4339' |
	'#ac4d39' | '#ac5639' | '#ac6039' | '#ac6939' | '#ac7339' | '#ac7c39' | '#ac8639' | '#ac8f39' | '#ac9939' | '#aca339' | '#acac39' |
	'#a3ac39' | '#99ac39' | '#8fac39' | '#86ac39' | '#7cac39' | '#73ac39' | '#69ac39' | '#60ac39' | '#56ac39' | '#4dac39' | '#43ac39' |
	'#39ac39' | '#39ac43' | '#39ac4c' | '#39ac56' | '#39ac60' | '#39ac69' | '#39ac73' | '#39ac7c' | '#39ac86' | '#39ac8f' | '#39ac99' |
	'#39aca3' | '#39acac' | '#39a3ac' | '#3999ac' | '#398fac' | '#3986ac' | '#397cac' | '#3973ac' | '#3969ac' | '#3960ac' | '#3956ac' |
	'#394cac' | '#3943ac' | '#3939ac' | '#4339ac' | '#4d39ac' | '#5639ac' | '#6039ac' | '#6939ac' | '#7339ac' | '#7c39ac' | '#8639ac' |
	'#8f39ac' | '#9939ac' | '#a339ac' | '#ac39ac' | '#ac39a3' | '#ac3999' | '#ac398f' | '#ac3986' | '#ac397c' | '#ac3973' | '#ac3969' |
	'#ac3960' | '#ac3956' | '#ac394d' | '#ac3943' | '#995c33' | '#595959';

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
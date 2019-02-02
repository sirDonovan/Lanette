/**
 * Hours are in the same timezone as wherever Lanette is running
 */
const schedules: Dict<{months: Dict<Dict<string>>, times: [number, number][]}> = {
	'toursplaza': {
		months: {
			'2': {
				'1': 'gen7stabmons@@@-ou,-uubl,-uu,-rubl,-ru,-nubl,-nu,-publ',
				'2': 'gen7randombattle',
				'3': 'gen7ou@@@+ho-oh,+darkrai',
				'4': 'gen7lc',
				'5': 'gen7almostanyability@@@+Huge Power,+Fur Coat',
				'6': 'gen7battlefactory',
				'7': 'gen71v1@@@+Mimikyu,-Charizard',
				'8': 'gen7doublesuu',
				'9': 'gen7nu@@@+Snorlax,+Porygon2,-Malamar,-Steelix',
				'10': 'gen7metronomebattle',
				'11': 'gen7camomons@@@+Kartana,+KyuremBlack,-Buzzwole',
				'12': 'gen7mixandmega',
				'13': 'gen7balancedhackmons@@@-Uber,-OU,-UUBL,-UU,-RUBL,-RU,-NUBL,-NU',
				'14': 'gen4randombattle',
				'15': 'gen7nu@@@Inverse Mod,-Scyther,+Drapion',
				'16': 'gen7battlespotsingles@@@!Species Clause',
				'17': 'gen7bssfactory',
				'18': 'gen7ubers@@@-Xerneas,!Mega Rayquaza Clause',
				'19': 'gen7balancedhackmons',
				'20': 'gen7zu@@@Same Type Clause,-Dugtrio,+RotomFrost',
				'21': 'gen7bssfactory',
				'22': 'gen7ru@@@+Doublade,+Primarina,-Blastoise',
				'23': 'gen7partnersincrime',
				'24': 'gen7uu@@@Same Type Clause',
				'25': 'gen7monotype',
				'26': 'gen7doublesou@@@+Marshadow,+Gengarmega',
				'27': 'gen7anythinggoes',
				'28': 'gen7ou@@@Inverse Mod,-LandorusTherian,-PinsirMega,+Zygarde',
			},
		},
		times: [[5, 30], [12, 30], [18, 30], [23, 30]],
	},
};

export = schedules;

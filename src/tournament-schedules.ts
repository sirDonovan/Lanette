export interface IMonthlyTournamentSchedule {
	formats: Dict<string>;
	times: [number, number][];
}

export interface IRoomTournamentSchedule {
	months: Dict<IMonthlyTournamentSchedule>;
}

/**
 * Hours are in the same timezone as wherever Lanette is running
 */
export const tournamentSchedules: Dict<IRoomTournamentSchedule> = {
	'tournaments': {
		months: {
			'7': {
				formats: {
					'1': 'ou',
					'2': 'zu',
					'3': 'uu',
					'4': 'pu',
					'5': 'ru',
					'6': 'monotype',
					'7': 'nu',
					'8': 'ubers',
					'9': 'doublesou',
					'10': 'lc',
					'11': 'ou',
					'12': 'zu',
					'13': 'uu',
					'14': 'pu',
					'15': 'ru',
					'16': 'monotype',
					'17': 'nu',
					'18': 'ubers',
					'19': 'doublesou',
					'20': 'lc',
					'21': 'ou',
					'22': 'zu',
					'23': 'uu',
					'24': 'pu',
					'25': 'ru',
					'26': 'monotype',
					'27': 'nu',
					'28': 'ubers',
					'29': 'doublesou',
					'30': 'lc',
					'31': 'ou',
				},
				times: [[20, 30], [2, 30], [9, 30], [15, 30]],
			},
		},
	},
	'toursplaza': {
		months: {
			'7': {
				formats: {
					'1': 'LC,sametypeclause',
					'2': 'Gen7 OU,+Groudon, +Solgaleo, -Groudon+Red orb',
					'3': 'Gen6 Battle Factory, Inverse Mod',
					'4': 'Gen4 UU',
					'5': 'Gen8 Stabmons, +Cap, +Cap nfe, +Cap LC, +Paleo wave, +shadow strike, -pajantom',
					'6': 'Gen5 OU, -Baton Pass, -Volt Switch, -U-Turn',
					'7': 'National Dex AG',
					'8': 'Gen7 Lets Go OU',
					'9': '2v2 Doubles',
					'10': 'Gen7 RU,+RUBL',
					'11': 'Mix and Mega',
					'12': 'Gen1 Random battle',
					'13': 'Gen3 OU',
					'14': 'Ubers',
					'15': 'Gen7 Doubles OU',
					'16': 'PU',
					'17': 'Gen7 AG',
					'18': 'Gen6 OU',
					'19': 'Gen5 Ubers',
					'20': 'UU',
					'21': 'OU,inverse mod,-Frosmoth,-diggersby,-alakazam,+melmetal,-indeedee',
					'22': 'Gen7 Balanced Hackmons, -AG, -Uber, -OU, -UUBL, -UU, -RUBL, -RU, -NUBL, -NU, -PUBL',
					'23': 'Pure Hackmons, -Neutralizing Gas, -Eternatus-Eternamax',
					'24': 'Gen2 Random Battle, Blitz',
					'25': 'National Dex',
					'26': 'Gen7 ZU',
					'27': 'VGC2020',
					'28': 'Gen4 OU',
					'29': 'Almost Any Ability',
					'30': 'Gen3 Random Battle',
					'31': 'Tier Shift',
				},
				times: [[5, 30], [12, 30], [18, 30], [23, 30]],
			},
		},
	},
};

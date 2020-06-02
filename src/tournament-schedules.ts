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
			'6': {
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
				},
				times: [[20, 30], [2, 30], [9, 30], [15, 30]],
			},
		},
	},
	'toursplaza': {
		months: {
			'6': {
				formats: {
					'1': 'Gen 8 NFE, +Doublade, +Rhydon, +Type:Null, +Mr. Mime-Galar, +Ivysaur, +Sneasel, +Gurdurr, +Rufflet, +Pawniard',
					'2': 'gen7monotype',
					'3': 'pu',
					'4': 'Gen 4 Random Battle, Scalemons Mod',
					'5': 'Gen 3 Ubers, -Groudon, -Kyogre, -Soul Dew',
					'6': 'ou',
					'7': 'omotm',
					'8': 'ubers, Blitz',
					'9': 'Gen 5 Monotype, -OU, -UUBL, -UU, -RUBL',
					'10': 'vgc2020',
					'11': 'Gen 6 UU, +UUBL, Item Clause',
					'12': 'Mix and Mega',
					'13': 'Gen 2 OU, +Celebi, +Mew, Inverse Mod',
					'14': 'National Dex AG, Scalemons Mod, -Gastly, -Abra, -Eevium Z, -Deep Sea Tooth, -Deep Sea Scale, -Gengar-Mega, ' +
						'-Gengarite, -Eviolite, -Light Ball, -Thick Club, -Baton Pass, -Carvanha, -Shedinja, -Darmanitan, ' +
						'-Darmanitan-Galar, -Mawile-Mega, -Mawilite, -Medicham-Mega, -Medichamite, -Arena Trap, -Huge Power, -Pure Power',
					'15': ' Doubles OU, Gen 8 Camomons',
					'16': 'NU, Gen 8 STABmons',
					'17': 'RU, +RUBL, -Choice Band, -Choice Scarf, -Choice Specs, Item Clause',
					'18': 'Battle Stadium Singles, Blitz',
					'19': 'ZU, !Team Preview',
					'20': 'gen 6 battle factory',
					'21': 'Almost Any Ability, -OU, -UUBL',
					'22': 'omotm2',
					'23': 'Gen 7 LC, Item Clause',
					'24': 'VGC 2020, -Fake Out, -Protect, -Follow Me, -Eviolite, -Focus Sash',
					'25': 'Gen 7 Anything Goes',
					'26': 'National Dex, gen 8 almost any ability',
					'27': 'PU, +PUBL',
					'28': 'randombattle',
					'29': 'OU, -Aegislash, -Bisharp, -Corviknight, -Excadrill, -Ferrothorn, -Jirachi, -Dracovish, -Clefable',
					'30': 'Gen 4 OU, Inverse Mod, Team Preview',
				},
				times: [[5, 30], [12, 30], [18, 30], [23, 30]],
			},
		},
	},
};

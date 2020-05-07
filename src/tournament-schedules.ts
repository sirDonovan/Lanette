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
			'4': {
				formats: {
					'1': 'ou',
					'2': 'monotype',
					'3': 'uu',
					'4': 'doublesou',
					'5': 'ru',
					'6': 'lc',
					'7': 'nu',
					'8': 'monotype',
					'9': 'uu',
					'10': 'doublesou',
					'11': 'ru',
					'12': 'lc',
					'13': 'nu',
					'14': 'ou',
					'15': 'uu',
					'16': 'doublesou',
					'17': 'ru',
					'18': 'lc',
					'19': 'nu',
					'20': 'ou',
					'21': 'monotype',
					'22': 'doublesou',
					'23': 'ru',
					'24': 'lc',
					'25': 'nu',
					'26': 'ou',
					'27': 'monotype',
					'28': 'uu',
					'29': 'ru',
					'30': 'lc',
				},
				times: [[20, 30], [2, 30], [9, 30], [15, 30]],
			},
			'5': {
				formats: {
					'1': 'nu',
					'2': 'ou',
					'3': 'monotype',
					'4': 'uu',
					'5': 'doublesou',
					'6': 'lc',
					'7': 'nu',
					'8': 'ou',
					'9': 'monotype',
					'10': 'uu',
					'11': 'doublesou',
					'12': 'ru',
					'13': 'nu',
					'14': 'ou',
					'15': 'monotype',
					'16': 'uu',
					'17': 'doublesou',
					'18': 'ru',
					'19': 'lc',
					'20': 'ou',
					'21': 'monotype',
					'22': 'uu',
					'23': 'doublesou',
					'24': 'ru',
					'25': 'lc',
					'26': 'nu',
					'27': 'monotype',
					'28': 'uu',
					'29': 'doublesou',
					'30': 'ru',
					'31': 'lc',
				},
				times: [[20, 30], [2, 30], [9, 30], [15, 30]],
			},
		},
	},
	'toursplaza': {
		months: {
			'5': {
				formats: {
					'1': 'Doubles OU, +Salamence',
					'2': 'gen4ou',
					'3': 'LC, +Cutiefly, +Drifloon, +Gastly, +Gothita, +Rufflet, +Swirlix, +Vulpix, +Vulpix-Alola',
					'4': 'Gen 1 Random Battle',
					'5': 'almost any ability, Same Type Clause',
					'6': 'nfe',
					'7': 'random battle',
					'8': 'mixandmega',
					'9': 'ou, -Clefable, -Ferrothorn, -Seismitoad, -Dracovish',
					'10': 'Camomons, Same Type Clause',
					'11': 'OMOTM, Inverse mod',
					'12': 'gen7letsgoou',
					'13': 'Gen 6 Battle Spot Triples, Inverse mod',
					'14': 'Gen 8 National Dex',
					'15': 'VGC2020, Same Type Clause, -Togekiss',
					'16': 'STABmons, Obtainable Abilities, -Arena Trap, -Comatose, -Contrary, -Fluffy, -Fur Coat, -Gorilla Tactics, ' +
						'-Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword, -Libero, -Moody, ' +
						'-Neutralizing Gas, -Parental Bond, -Protean, -Pure Power, -Shadow Tag, -Simple, -Stakeout, -Speed Boost, ' +
						'-Water Bubble, -Wonder Guard, -Shedinja, 2 Ability Clause, -V-Create, -Keldeo, -Terrakion, -Chandelure, -Zeraora',
					'17': 'RU, Same Type Clause',
					'18': 'gen7anythinggoes',
					'19': 'omotm2, inverse mod',
					'20': 'LC, +CAP LC',
					'21': 'gen7ZU, !obtainable abilities',
					'22': 'ubers',
					'23': 'Gen 6 Battle Factory, Inverse Mod, !Team Preview',
					'24': 'gen7ou',
					'25': 'UU, +UUBL, +Hawlucha',
					'26': 'Gen 2 random battle',
					'27': 'RU, +Chandelure',
					'28': 'Gen 6 Monotype',
					'29': 'Tier Shift, -OU, -UUBL',
					'30': 'gen1ou',
					'31': 'OU, Inverse Mod, -Frosmoth, -Diggersby',
				},
				times: [[5, 30], [12, 30], [18, 30], [23, 30]],
			},
		},
	},
};

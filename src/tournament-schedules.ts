import type { IRoomTournamentSchedule } from "./types/tournaments";

/**
 * Hours are in the same timezone as wherever Lanette is running
 */
export const tournamentSchedules: Dict<IRoomTournamentSchedule> = {
	'tournaments': {
		months: {
			'12': {
				formats: {
					'1': 'ubers',
					'2': 'lc',
					'3': 'ou',
					'4': 'zu',
					'5': 'uu',
					'6': 'pu',
					'7': 'ru',
					'8': 'nu',
					'9': 'monotype',
					'10': 'randombattle',
					'11': 'doublesou',
					'12': 'ubers',
					'13': 'lc',
					'14': 'ou',
					'15': 'zu',
					'16': 'uu',
					'17': 'pu',
					'18': 'ru',
					'19': 'nu',
					'20': 'monotype',
					'21': 'randombattle',
					'22': 'doublesou',
					'23': 'ubers',
					'24': 'lc',
					'25': 'ou',
					'26': 'zu',
					'27': 'uu',
					'28': 'pu',
					'29': 'ru',
					'30': 'nu',
					'31': 'monotype',
				},
				times: [[20, 30], [2, 30], [9, 30], [15, 30]],
			},
		},
	},
	'toursplaza': {
		months: {
			'12': {
				formats: {
					'1': 'gen 8 monotype,gen8camomons',
					'2': 'gen3randombattle',
					'3': 'gen 7 ou,+genesect,+aegislash,+deoxys-s',
					'4': 'gen 8 lc,inverse mod',
					'5': 'bss',
					'6': 'ru,!Obtainable abilities,-comatose,-fluffy,-fur coat,-huge power,-illusion,-imposter,-innards out,' +
						'-parental bond,-protean,-pure power,-simple,- stakeout,-speedboost,-water bubble,-wonder guard,-archeops,' +
						'-regigigas,-shedinja,-terrakion',
					'7': 'battlefactory',
					'8': 'balancedhackmons',
					'9': 'gen 8 uu,STABmons Move Legality,*Astral Barrage,*Belly Drum,*Bolt Beak,*Double Iron Bash,*Electrify,' +
						'*Extreme Speed,*Fishious Rend,*Geomancy,*Lovely Kiss,*Shell Smash,*Shift Gear,*Spore,*Thousand Arrows,' +
						'*V-create,*Wicked Blow,-Porygon-Z,-Silvally,-Kings Rock',
					'10': 'nfe',
					'11': 'gen7cap',
					'12': 'gen 7 nu,same type clause',
					'13': '1v1',
					'14': 'gen4ubers',
					'15': 'gen 8 pu,gen8camomons',
					'16': 'ubers',
					'17': 'gen 8 uu,inverse mod',
					'18': 'gen1ou',
					'19': 'gen 8 monotype,STABmons Move Legality,*Astral Barrage,*Belly Drum,*Bolt Beak,' +
						'*Double Iron Bash,*Electrify,*Extreme Speed,*Fishious Rend,*Geomancy,*Lovely Kiss,*Shell Smash,*Shift Gear,' +
						'*Spore,*Thousand Arrows,*V-create,*Wicked Blow,-Porygon-Z,-Silvally,-Kings Rock,!Obtainable abilities,' +
						'-comatose,-fluffy,-fur coat,-huge power,-illusion,-imposter,-innards out,-parental bond,-protean,-pure power,' +
						'-simple,- stakeout,-speedboost,-water bubble,-wonder guard,-archeops,-dragonite,-hoopa-unbound,-kartana,' +
						'-keldeo,-regigigas,-slaking,-shedinja,-terrakion,-weavile',
					'20': 'zu',
					'21': 'gen7randombattle',
					'22': 'purehackmons',
					'23': 'anythinggoes',
					'24': 'gen5uu',
					'25': 'mixandmega',
					'26': 'doublesou',
					'27': 'nationaldex',
					'28': 'inheritance',
					'29': 'vgc2020',
					'30': 'gen3ou,-metagross,-celebi,-tyranitar',
					'31': 'randombattle',
				},
				times: [[5, 30], [12, 30], [18, 30], [23, 30]],
			},
		},
	},
};

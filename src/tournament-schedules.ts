import type { IRoomTournamentSchedule } from "./types/tournaments";

/**
 * Hours are in the same timezone as wherever Lanette is running
 */
export const tournamentSchedules: Dict<IRoomTournamentSchedule> = {
	'tournaments': {
		months: {
			'9': {
				formats: {
					'1': 'uu',
					'2': 'pu',
					'3': 'ru',
					'4': 'monotype',
					'5': 'nu',
					'6': 'ubers',
					'7': 'doublesou',
					'8': 'lc',
					'9': 'ou',
					'10': 'zu',
					'11': 'uu',
					'12': 'pu',
					'13': 'ru',
					'14': 'monotype',
					'15': 'nu',
					'16': 'ubers',
					'17': 'doublesou',
					'18': 'lc',
					'19': 'ou',
					'20': 'zu',
					'21': 'uu',
					'22': 'pu',
					'23': 'ru',
					'24': 'monotype',
					'25': 'nu',
					'26': 'ubers',
					'27': 'doublesou',
					'28': 'lc',
					'29': 'ou',
					'30': 'zu'
				},
				times: [[20, 30], [2, 30], [9, 30], [15, 30]],
			},
		},
	},
	'toursplaza': {
		months: {
			'9': {
				formats: {
					'1': 'gen6randombattle@@@inversemod',
					'2': 'Doubles OU@@@-Trick Room,-Tailwind,+Magearna,+Melmetal',
					'3': 'OU@@@-Clefable,-Toxapex',
					'4': '2v2doubles@@@gen8camomons',
					'5': 'gen7pu@@@+PUBL',
					'6': 'gen5ou@@@Not Fully Evolved,-Chansey,-Dusclops,-Fraxure,-Gligar,-Golbat,-Gurdurr,-Haunter,-Machoke,' +
						'-Magmar,-Magneton,-Riolu,-Rhydon,-Piloswine,-Porygon2,-Scyther,-Vigoroth',
					'7': 'gen7uu@@@-Reflect,-Light Screen,-Barrier',
					'8': 'gen4ou@@@Sinnoh Pokedex,+Arceus,+Dialga,+Palkia,+Giratina,-Dragon Dance',
					'9': 'gen3ou@@@Little Cup,-Chansey,-Meditite,-Omanyte,-Scyther,-Wynaut,-Zigzagoon,-Dragon Rage,-Sonic Boom,' +
						'-Agility + Baton Pass',
					'10': 'gen7bssfactory@@@!Team Preview,!Cancel Mod',
					'11': 'ou@@@inverse mod',
					'12': 'gen2ou@@@Inverse Mod,-Chansey,-Tauros,-Snorlax,-Porygon2,-Blissey',
					'13': 'purehackmons@@@-Neutralizing Gas',
					'14': 'stabmons@@@!Obtainable Abilities,-Arena Trap,-Comatose,-Contrary,-Fluffy,-Fur Coat,-Gorilla Tactics,' +
						'-Huge Power,-Ice Scales,-Illusion,-Imposter,-Innards Out,-Intrepid Sword,-Libero,-Moody,-Neutralizing Gas,' +
						'-Parental Bond,-Protean,-Pure Power,-Shadow Tag,-Simple,-Stakeout,-Speed Boost,-Water Bubble,-Wonder Guard,' +
						'-Shedinja,2 Ability Clause,*Transform,*No Retreat,*V-create,-Hypnosis,-Sing,-Sleep Powder,+Darmanitan,' +
						'+Darmanitan-Galar,+Dracovish,+Gengar,+Porygon-Z,-Keldeo,-Terrakion,-Wicked Blow,-Chandelure,-Magearna,' +
						'-Melmetal,-Zeraora',
					'15': 'uu@@@+UUBL',
					'16': 'ou@@@+Mega,+Abomasite,+Absolite,+Charizardite X,+Charizardite Y,+Galladite,+Gardevoirite,+Glalitite,' +
						'+Gyaradosite,+Heracronite,+Lopunnite,+Manectite,+Mawilite,+Medichamite,+Pinsirite,+Sablenite,+Scizorite,' +
						'+Sharpedonite,+Slowbronite,+Steelixite,+Swampertite,+Tyranitarite,+Venusaurite,+Abomasnow-Mega,+Absol-Mega,' +
						'+Charizard-Mega-X,+Charizard-Mega-Y,+Gallade-Mega,+Gardevoir-Mega,+Glalie-Mega,+Gyarados-Mega,+Heracross-Mega,' +
						'+Lopunny-Mega,+Manectric-Mega,+Mawile-Mega,+Medicham-Mega,+Pinsir-Mega,+Sableye-Mega,+Scizor-Mega,' +
						'+Sharpedo-Mega,+Slowbro-Mega,+Steelix-Mega,+Tyranitar-Mega,+Venusaur-Mega',
					'17': 'ubers@@@350cupmod,-Eviolite,-Light Ball,-Pawniard,-Abra',
					'18': 'gen7lc@@@STABmons move legality,-gastly,*acupressure,*belly drum,*extreme speed,*shell smash,*shift gear,' +
						'*spore',
					'19': 'gen5ubers@@@-Drought,-Drizzle,-Dark Void',
					'20': 'gen3uu@@@-Spikes',
					'21': 'gen2ou@@@Same Type Clause,-Snorlax',
					'22': 'cap@@@-U-turn,-Volt Switch,-Teleport,-Flip Turn',
					'23': 'vgc2020@@@-Intimidate',
					'24': 'ru@@@+RUBL',
					'25': 'monotype@@@Inverse Mod',
					'26': 'gen7lc@@@Item Clause',
					'27': 'randombattle@@@Team Preview',
					'28': 'gen4uu@@@+UUBL',
					'29': 'ru@@@Same Type Clause',
					'30': 'ubers@@@!Team Preview',
				},
				times: [[5, 30], [12, 30], [18, 30], [23, 30]],
			},
		},
	},
};

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
					'17': 'pu',
					'18': 'lc',
					'19': 'ou',
					'20': 'nu',
					'21': 'uu',
					'22': 'pu',
					'23': 'ru',
					'24': 'lc',
					'25': 'nu',
					'26': 'ubers',
					'27': 'uu',
					'28': 'lc',
					'29': 'ou',
					'30': 'pu'
				},
				times: [[20, 30], [2, 30], [9, 30], [15, 30]],
			},
			'10': {
				formats: {
					'1': 'ubers',
					'2': 'lc',
					'3': 'ou',
					'4': 'pu',
					'5': 'uu',
					'6': 'nu',
					'7': 'ru',
					'8': 'ubers',
					'9': 'lc',
					'10': 'ou',
					'11': 'pu',
					'12': 'uu',
					'13': 'nu',
					'14': 'ru',
					'15': 'ubers',
					'16': 'lc',
					'17': 'ou',
					'18': 'pu',
					'19': 'uu',
					'20': 'nu',
					'21': 'ru',
					'22': 'ubers',
					'23': 'lc',
					'24': 'ou',
					'25': 'pu',
					'26': 'uu',
					'27': 'nu',
					'28': 'ru',
					'29': 'ubers',
					'30': 'lc',
					'31': 'ou',
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
			'10': {
				formats: {
					'1': 'randombattle@@@gen8camomons,Scalemons Mod,Inverse Mod,gen8sharedpower',
					'2': 'stabmons@@@!obtainable abilities,-Arena Trap,-Comatose,-Contrary,-Fluffy,-Fur Coat,-Gorilla Tactics,' +
						'-Huge Power,-Ice Scales,-Illusion,-Imposter,-Innards Out,-Intrepid Sword,-Libero,-Moody,-Neutralizing Gas,' +
						'-Parental Bond,-Protean,-Pure Power,-Shadow Tag,-Simple,-Stakeout,-Speed Boost,-Water Bubble,-Wonder Guard,' +
						'-Shedinja,2 Ability Clause,*Transform,*No Retreat,*V-create,-Hypnosis,-Sing,-Sleep Powder,+Darmanitan,' +
						'+Darmanitan-Galar,+Dracovish,+Gengar,+Porygon-Z,-Keldeo,-Terrakion,-Wicked Blow,-zeraora,-chandelure,-melmetal,' +
						'-magearna,-volcarona,-electrify',
					'3': 'gen2ou@@@Same Type Clause,Blitz',
					'4': 'gen4ubers@@@-Choice Band,-Choice Scarf,-Choice Specs',
					'5': 'nationaldex@@@gen8sharedpower',
					'6': 'gen3uu@@@+UUBL,-Alakazam,-Choice Band',
					'7': 'gen7ou@@@Z-Move Clause,-Mega',
					'8': 'gen5ou@@@-Sand Stream,-Sandstorm,-Snow Warning,-Hail,-Sunny Day,-Drought,-Drizzle,-Rain Dance',
					'9': 'gen1ou@@@-Uber,-OU,-UU,-NFE,-Dragon Rage,-Sonic Boom,-Clefairy,-Wrap,Allow Tradeback,Little Cup',
					'10': 'gen7ou@@@-Chansey,-Doublade,-Gligar,-Golbat,-Gurdurr,-Magneton,-Piloswine,-Porygon2,-Rhydon,-Scyther,' +
						'-Sneasel,-Type: Null,-Vigoroth,-Arena Trap,-Drought,-Moody,-Shadow Tag,-Aurora Veil,-Baton Pass,' +
						'Not Fully Evolved',
					'11': '2v2doubles@@@+Reshiram,+Zekrom,+Kyurem-Black,+Kyurem-White',
					'12': 'mixandmega@@@+Eternatus,*Eternatus,+Zacian,*Zacian,+Marshadow,+Mewtwo,+Reshiram,+Zekrom,+Kyurem,' +
						'+Kyurem-White,+Kyurem-Black,+Necrozma-Dusk-Mane,+Lunala,+Melmetal,+Darmanitan-Galar,+Solgaleo,' +
						'+Necrozma-Dawn-Wings,-Arctovish,-Arctozolt,+Damp Rock,+Heat Rock,-Zacian-Crowned,-Zacian + Rusted Sword',
					'13': 'monotype@@@gen8camomons',
					'14': 'gen6randombattle@@@Inverse Mod',
					'15': 'gen7uu@@@-Avalugg,-Beedrillite',
					'16': 'camomons@@@!Obtainable Abilities,-Arena Trap,-Comatose,-Contrary,-Fluffy,-Fur Coat,-Gorilla Tactics,' +
						'-Huge Power,-Ice Scales,-Illusion,-Imposter,-Innards Out,-Intrepid Sword,-Libero,-Moody,-Neutralizing Gas,' +
						'-Parental Bond,-Protean,-Pure Power,-Shadow Tag,-Simple,-Stakeout,-Speed Boost,-Water Bubble,-Wonder Guard,' +
						'-Shedinja,2 Ability Clause,+Darmanitan-Galar',
					'17': 'ubers@@@+Chansey,+Doublade,+Gurdurr,+Haunter,+Ivysaur,+Magneton,+Mr. Mime-Galar,+Pawniard,+Pikachu,' +
						'+Porygon2,+Rhydon,+Rufflet,+Scyther,+Sneasel,+Type: Null,+Arena Trap,+Shadow Tag',
					'18': 'nu@@@Same Type Clause',
					'19': 'gen6ou@@@-OU,+Heracross-mega,+Dugtrio',
					'20': 'crossevolution@@@-Life Orb,-Heavy Duty Boots,-Leftovers',
					'21': 'vgc2020@@@!Species Clause,-Trick Room,-Tailwind,-Protect,-Detect',
					'22': 'gen7battlefactory@@@Scalemons Mod',
					'23': 'nationaldexag@@@-Baton Pass,-Smeargle',
					'24': 'gen6ou@@@STABmons Move Legality,-All Items',
					'25': 'gen41v1@@@',
					'26': 'gen7letsgoou@@@!Team Preview',
					'27': 'inheritance@@@Two Vs Two',
					'28': 'gen4lc@@@Sinnoh Pokedex',
					'29': 'tiershift@@@+Eviolite',
					'30': 'gen3uu@@@Same Type Clause',
					'31': 'gen2nu@@@Item Clause',
				},
				times: [[5, 30], [12, 30], [18, 30], [23, 30]],
			},
		},
	},
};

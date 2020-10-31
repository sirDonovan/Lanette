import type { IRoomTournamentSchedule } from "./types/tournaments";

/**
 * Hours are in the same timezone as wherever Lanette is running
 */
export const tournamentSchedules: Dict<IRoomTournamentSchedule> = {
	'tournaments': {
		months: {
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
			'11': {
				formats: {
					'1': 'pu',
					'2': 'uu',
					'3': 'nu',
					'4': 'ru',
					'5': 'ubers',
					'6': 'lc',
					'7': 'ou',
					'8': 'pu',
					'9': 'uu',
					'10': 'nu',
					'11': 'ru',
					'12': 'ubers',
					'13': 'lc',
					'14': 'ou',
					'15': 'pu',
					'16': 'uu',
					'17': 'nu',
					'18': 'ru',
					'19': 'ubers',
					'20': 'lc',
					'21': 'ou',
					'22': 'pu',
					'23': 'uu',
					'24': 'nu',
					'25': 'ru',
					'26': 'ubers',
					'27': 'lc',
					'28': 'ou',
					'29': 'pu',
					'30': 'uu',
				},
				times: [[20, 30], [2, 30], [9, 30], [15, 30]],
			},
		},
	},
	'toursplaza': {
		months: {
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
			'11': {
				formats: {
					'1': '[Gen 8] STABmons @@@!Obtainable Abilities,-Arena Trap,-Comatose,-Contrary,-Fluffy,-Fur Coat,' +
						'-Gorilla Tactics,-Huge Power,-Ice Scales,-Illusion,-Imposter,-Innards Out,-Intrepid Sword,-Libero,' +
						'-Moody,-Neutralizing Gas,-Parental Bond,-Protean,-Pure Power,-Shadow Tag,-Simple,-Stakeout,-Speed Boost,' +
						'-Water Bubble,-Wonder Guard,-Shedinja,2 Ability Clause,*Transform,*No Retreat,*V-create,-Hypnosis,-Sing,' +
						'-Sleep Powder,+Darmanitan,+Darmanitan-Galar,+Dracovish,+Gengar,+Porygon-Z,-Keldeo,-Terrakion,-Wicked Blow,' +
						'-Zeraora,-Chandelure,-Melmetal,-Electrify,-Volcarona,-Blacephalon,-dragonite,-tapu koko,-thundurus,' +
						'-thundurus-therian,-archeops,-zygarde,-regigigas',
					'2': '[Gen 4] UU @@@+UUBL',
					'3': 'gen7balancedhackmons',
					'4': '[Gen 8] LC @@@Same type clause',
					'5': 'gen8purehackmons',
					'6': '[Gen 7] RU @@@+RUBL',
					'7': '[Gen 8] Doubles OU @@@!Dynamax Clause',
					'8': '[Gen 7] OU @@@+Aegislash, +zygarde 50%, +blaziken, +darkrai, +genesect, +kangaskhan mega,' +
						'+landorus incarnate, +solgaleo, +pheromosa, +shaymin sky, +metagross mega, +arena trap, +deoxys defense,' +
						'+deoxys normal, -deoxys speed, -deoxys attack',
					'9': '[Gen 6] OU @@@!Team preview',
					'10': 'gen8ou@@@blitz',
					'11': '[Gen 3] OU @@@+Choice scarf, +Choice Specs',
					'12': '[Gen 8] Camomons @@@!Obtainable Abilities,-Arena Trap,-Comatose,-Contrary,-Fluffy,-Fur Coat,' +
						'-Gorilla Tactics,-Huge Power,-Ice Scales,-Illusion,-Imposter,-Innards Out,-Intrepid Sword,-Libero,-Moody,' +
						'-Neutralizing Gas,-Parental Bond,-Protean,-Pure Power,-Shadow Tag,-Simple,-Stakeout,-Speed Boost,-Water Bubble,' +
						'-Wonder Guard,-Shedinja,2 Ability Clause,+Darmanitan-Galar',
					'13': 'gen7battlefactory',
					'14': 'gen8nationaldexmonotype',
					'15': '[Gen 8] Mix And Mega @@@+Gengar,+Zeraora,+Arena Trap,+Shadow Tag,+Moody,+Darmanitan-Galar,+Dracovish,' +
						'+Eternatus,+Kyurem-Black,+Kyurem-White,+Lunala,+Marshadow,+Melmetal,+Mewtwo,+Necrozma-Dawn-Wings,' +
						'+Necrozma-Dusk-Mane,+Reshiram,+Solgaleo,+Zacian,+Zacian-Crowned,+Zamazenta,+Zamazenta-Crowned,+Zekrom,' +
						'+calyrex ice,+calyrex shadow,+kyogre,+Ho-Oh,+dialga,+giratina,+giratina origin,+lugia,+palkia,+rayquaza,' +
						'+xerneas,+yveltal',
					'16': '[Gen 8] Random Battle @@@Inverse Mod, Gen8camomons',
					'17': '[Gen 6] UU@@@+UUBL, +Heracross Mega, +Dugtrio',
					'18': 'gen7superstaffbrosbrawl',
					'19': 'gen4ubers',
					'20': '[Gen 8] Ubers @@@-Calyrex Shadow',
					'21': '[Gen 8] Camomons @@@-OU, -Heracross, -drought',
					'22': '[Gen 6] OU @@@stabmonsmovelegality,-Aerodactyl-Mega,-Altaria-Mega,-Diggersby,-Kyurem-Black,-Metagross-Mega,' +
						'-Porygon-Z,-Thundurus-Base,-Razor Fang,-King\'s Rock,*Acupressure,*Belly Drum,*Chatter,*Extreme Speed,*Geomancy,' +
						'*Lovely Kiss,*Shell Smash,*Shift Gear,*Spore,*Thousand Arrows',
					'23': '[Gen 8] Mix and mega @@@+zamazenta crowned,-zacian + rusted sword,*eternatus,*lunala,+damp rock,+heat rock,' +
						'gen8 tier shift,+uber,*zacian',
					'24': '[Gen 7] UU @@@+UUBL',
					'25': '[Gen 5] OU @@@-Drizzle, -Drought, -Snow Warning, -Sand Stream',
					'26': '[Gen 8] 1v1 @@@Blitz',
					'27': '[Gen 7] Doubles OU @@@-Trickroom, -Tail wind',
					'28': '[Gen 8] Inheritance @@@-Chansey,-Doublade,-Magneton,-Porygon2,-Rhydon,-Scyther,-Sneasel,-Type: Null',
					'29': '[Gen 7] UU @@@same type clause',
					'30': 'gen8cap',
				},
				times: [[5, 30], [12, 30], [18, 30], [23, 30]],
			},
		},
	},
};

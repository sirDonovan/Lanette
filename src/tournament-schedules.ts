import type { IRoomTournamentSchedule } from "./types/tournaments";

/* eslint-disable max-len */

/**
 * Hours are in the same timezone as wherever Lanette is running
 */
export const tournamentSchedules: Dict<Dict<IRoomTournamentSchedule>> = {
	'showdown': {
		'tournaments': {
			months: {
				'1': {
					formats: {
						'1': 'monotype',
						'2': 'randombattle',
						'3': 'doublesou',
						'4': 'ubers',
						'5': 'lc',
						'6': 'ou',
						'7': 'zu',
						'8': 'uu',
						'9': 'pu',
						'10': 'ru',
						'11': 'nu',
						'12': 'monotype',
						'13': 'randombattle',
						'14': 'doublesou',
						'15': 'ubers',
						'16': 'lc',
						'17': 'ou',
						'18': 'zu',
						'19': 'uu',
						'20': 'pu',
						'21': 'ru',
						'22': 'nu',
						'23': 'monotype',
						'24': 'randombattle',
						'25': 'doublesou',
						'26': 'ubers',
						'27': 'lc',
						'28': 'ou',
						'29': 'zu',
						'30': 'uu',
						'31': 'pu',
					},
					times: [[2, 30], [9, 30], [15, 30], [20, 30]],
					year: 2022,
				},
			},
		},
		'toursplaza': {
			months: {
				'1': {
					formats: {
						'1': 'natdexag, -all pokemon, +Aerodactyl, +Alcremie, +Blastoise, +Blissey, +Bulbasaur, +Chansey, +Charizard, +Charmander, +Charmeleon, +Comfey, +Eevee, +Espeon, +Exeggutor-Alola, +Flareon, +Glaceon, +Gyarados, +Ho-Oh, +Ivysaur, +Jolteon, +Leafeon, +Magikarp, +Meloetta, +Milcery, +Ninetales-Alola, +Pikachu, +Raichu, +Raichu-Alola, +Rayquaza, +Shaymin, +Smeargle, +Snorlax, +Squirtle, +Sylveon, +Umbreon, +Vaporeon, +Venusaur, +Victini, +Vulpix-Alola, +Wartortle, Species Clause, Dynamax Clause, Mega Rayquaza Clause, Sleep Clause Mod, Baton Pass Clause, Moody Clause, Evasion Moves Clause, OHKO Clause',
						'2': 'Gen 7 UU, forcemonotype=water ',
						'3': 'ag, bonus type rule',
						'4': 'ru, -all pokemon, +celebi, +incineroar, +suicune, +toxtricity, +nidoqueen, +cloyster',
						'5': 'omotm1',
						'6': 'gen 7 random battle, maxteamsize = 10, pickedteamsize = 6, teampreview',
						'7': 'roas1',
						'8': 'doublesubers, !Obtainable Abilities, !Obtainable Moves, !Obtainable Misc, !EV Limit, Forme Clause, !Species Clause, -Shedinja, -Comatose + Sleep Talk, -Double Iron Bash, -Octolock, -Arena Trap, -Contrary, -Gorilla Tactics, -Huge Power, -Illusion, -Innards Out, -Libero, -Moody, -Neutralizing Gas, -Parental Bond, -Protean, -Pure Power, -Shadow Tag, -Stakeout, -Water Bubble, -Wonder Guard, -Justified, -Anger Point, -Steam Engine, -Stamina, -Rattled, -Wandering Spirit, -Soul-Heart',
						'9': 'Gen 8 mix and mega, Tier Shift Mod, [Gen 8] Camomons, -Archeops, -Cresselia, -Damp Rock, -Eviolite, -Heat Rock',
						'10': 'LC, !Obtainable Abilities, -Arena Trap, -Comatose, -Contrary, -Fluffy, -Fur Coat, -Gorilla Tactics, -Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword, -Libero, -Moody, -Neutralizing Gas, -Parental Bond, -Protean, -Pure Power, -Shadow Tag, -Simple, -Stakeout, -Speed Boost, -Water Bubble, -Wonder Guard, +Cherubi, +Gothita, +Woobat',
						'11': 'doubles ou, +shadow tag',
						'12': 'camomons, inversemod',
						'13': 'pu',
						'14': 'ubers, !Obtainable Abilities, -Arena Trap, -Comatose, -Contrary, -Fluffy, -Fur Coat, -Gorilla Tactics, -Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword, -Libero, -Moody, -Neutralizing Gas, -Parental Bond, -Protean, -Pure Power, -Shadow Tag, -Simple, -Stakeout, -Speed Boost, -Water Bubble, -Wonder Guard, -Calyrex-Shadow, -Marshadow, -Shedinja, -Urshifu-Single-Strike, 2 Ability Clause, Dynamax Clause',
						'15': 'gen 5 random battle, !Team Preview',
						'16': 'ou, +kyurem',
						'17': 'omotm2',
						'18': 'gen7mono, maxteamsize = 6, pickedteamsize = 3',
						'19': 'uubl',
						'20': 'BDSP random battle, inversemod',
						'21': 'dou, -kyurem-black',
						'22': 'roas2',
						'23': '1v1, !Dynamax Clause, !OHKO Clause, !Evasion Moves Clause, !Accuracy Moves Clause, +Calyrex-Ice, +Calyrex-Shadow, +Cinderace, +Dialga, +Dragonite, +Eternatus, +Giratina, +Giratina-Origin, +Groudon, +Ho-Oh, +Kyogre, +Kyurem-Black, +Kyurem-White, +Lugia, +Lunala, +Magearna, +Marshadow, +Melmetal, +Mew,+ Mewtwo, +Mimikyu, +Necrozma-Dawn-Wings, +Necrozma-Dusk-Mane, +Palkia, +Rayquaza, +Reshiram, +Sableye, +Solgaleo, +Victini, +Xerneas, +Yveltal, +Zacian, +Zacian-Crowned, +Zamazenta, +Zamazenta-Crowned, +Zekrom, +Moody, +Focus Sash, +Perish Song, Standard NatDex, !Species Clause',
						'24': 'ZU, !Obtainable Abilities, -Arena Trap, -Comatose, -Contrary, -Fluffy, -Fur Coat, -Gorilla Tactics, -Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword, -Libero, -Moody, -Neutralizing Gas, -Parental Bond, -Protean, -Pure Power, -Shadow Tag, -Simple, -Stakeout, -Speed Boost, -Tinted Lens, -Water Bubble, -Wonder Guard, -Regigigas, -Rotom-Fan, -Rotom-Frost, -Shedinja, -Type: Null, 2 Ability Clause, *Glacial Lance, *No Retreat, *Oblivion Wing, *Surging Strikes, *Transform, *V-create, *Wicked Blow, -Electrify, -Hypnosis, -Sing, -Sleep Powder, *Boomburst, -Triage, +Precipice Blades',
						'25': 'lc, gen8camomons, +arena trap, +shadow tag',
						'26': 'stabmons, !Obtainable Abilities, -Arena Trap, -Comatose, -Contrary, -Fluffy, -Fur Coat, -Gorilla Tactics, -Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword, -Libero, -Moody, -Neutralizing Gas, -Parental Bond, -Protean, -Pure Power, -Shadow Tag, -Simple, -Stakeout, -Speed Boost, -Water Bubble, -Wonder Guard, 2 Ability Clause, *Transform, *No Retreat, *V-create, -Hypnosis, -Sing, -Sleep Powder, *Wicked Blow, -Electrify, -Tinted Lens, *Glacial Lance, -All Pokemon, +Simipour, +Simisage, +Infernape, +Oranguru, +Zarude, +Primeape',
						'27': 'bdspmonotype, -latios, -blaziken, -drizzle',
						'28': 'duu, -duu',
						'29': 'cap1v1, Shared Power, Camomons, Inverse Mod, Scalemons Mod, !! Max Team Size = 6, !! Picked Team Size = 6',
						'30': "[Gen 8 BDSP] Ubers, !Obtainable Abilities, 2 Ability Clause, Sleep Moves Clause, !Sleep Clause Mod, -Arena Trap, -Comatose, -Contrary, -Fluffy, -Fur Coat, -Gorilla Tactics, -Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword, -Libero, -Magnet Pull, -Moody, -Neutralizing Gas, -Parental Bond, -Protean, -Pure Power, -Shadow Tag, -Speed Boost, -Simple, -Stakeout, -Water Bubble, -Wonder Guard, -Baton Pass, -King's Rock, -Razor Fang, -Dialga, -Giratina, -Giratina-Origin, -Groudon, -Ho-Oh, -Kyogre, -Lugia, -Mewtwo, -Palkia, -Rayquaza, -Regigigas, -Shedinja, -Slaking",
						'31': 'nubl',
					},
					times: [[5, 30], [12, 30], [18, 30], [23, 30]],
					year: 2022,
				},
			},
		},
	},
};

/* eslint-enable max-len */
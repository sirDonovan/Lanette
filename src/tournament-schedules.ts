import type { IRoomTournamentSchedule } from "./types/tournaments";

/* eslint-disable max-len */

/**
 * Hours are in the same timezone as wherever Lanette is running
 */
export const tournamentSchedules: Dict<Dict<IRoomTournamentSchedule>> = {
	'showdown': {
		'tournaments': {
			months: {
				'2': {
					formats: {
						'1': 'ru',
						'2': 'nu',
						'3': 'monotype',
						'4': 'randombattle',
						'5': 'doublesou',
						'6': 'ubers',
						'7': 'lc',
						'8': 'ou',
						'9': 'zu',
						'10': 'uu',
						'11': 'pu',
						'12': 'ru',
						'13': 'nu',
						'14': 'monotype',
						'15': 'randombattle',
						'16': 'doublesou',
						'17': 'ubers',
						'18': 'lc',
						'19': 'ou',
						'20': 'zu',
						'21': 'uu',
						'22': 'pu',
						'23': 'ru',
						'24': 'nu',
						'25': 'monotype',
						'26': 'randombattle',
						'27': 'doublesou',
						'28': 'ubers',
					},
					times: [[2, 30], [9, 30], [15, 30], [20, 30]],
					year: 2022,
				},
				'3': {
					formats: {
						'1': 'lc',
						'2': 'ou',
						'3': 'doublesou',
						'4': 'uu',
						'5': 'pu',
						'6': 'ru',
						'7': 'nu',
						'8': 'monotype',
						'9': 'ubers',
						'10': 'lc',
						'11': 'ou',
						'12': 'doublesou',
						'13': 'uu',
						'14': 'pu',
						'15': 'ru',
						'16': 'nu',
						'17': 'monotype',
						'18': 'ubers',
						'19': 'lc',
						'20': 'ou',
						'21': 'doublesou',
						'22': 'uu',
						'23': 'pu',
						'24': 'ru',
						'25': 'nu',
						'26': 'monotype',
						'27': 'ubers',
						'28': 'lc',
						'29': 'ou',
						'30': 'doublesou',
						'31': 'uu',
					},
					times: [[2, 30], [9, 30], [15, 30], [20, 30]],
					year: 2022,
				},
				'4': {
					formats: {
						'1': 'pu',
						'2': 'ru',
						'3': 'nu',
						'4': 'monotype',
						'5': 'ubers',
						'6': 'lc',
						'7': 'ou',
						'8': 'doublesou',
						'9': 'uu',
						'10': 'pu',
						'11': 'ru',
						'12': 'nu',
						'13': 'monotype',
						'14': 'ubers',
						'15': 'lc',
						'16': 'ou',
						'17': 'doublesou',
						'18': 'uu',
						'19': 'pu',
						'20': 'ru',
						'21': 'nu',
						'22': 'monotype',
						'23': 'ubers',
						'24': 'lc',
						'25': 'ou',
						'26': 'doublesou',
						'27': 'uu',
						'28': 'pu',
						'29': 'ru',
						'30': 'nu',
					},
					times: [[2, 30], [9, 30], [15, 30], [20, 30]],
					year: 2022,
				},
				'5': {
					formats: {
						'1': 'monotype',
						'2': 'ubers',
						'3': 'lc',
						'4': 'ou',
						'5': 'doublesou',
						'6': 'uu',
						'7': 'pu',
						'8': 'ru',
						'9': 'nu',
						'10': 'monotype',
						'11': 'ubers',
						'12': 'lc',
						'13': 'ou',
						'14': 'doublesou',
						'15': 'uu',
						'16': 'pu',
						'17': 'ru',
						'18': 'nu',
						'19': 'monotype',
						'20': 'ubers',
						'21': 'lc',
						'22': 'ou',
						'23': 'doublesou',
						'24': 'uu',
						'25': 'pu',
						'26': 'ru',
						'27': 'nu',
						'28': 'monotype',
						'29': 'ubers',
						'30': 'lc',
						'31': 'ou',
					},
					times: [[2, 30], [9, 30], [15, 30], [20, 30]],
					year: 2022,
				},
			},
		},
		'toursplaza': {
			months: {
				'2': {
					formats: {
						'1': 'lc, STABmons Move Legality, *Acupressure, *Belly Drum, *Bolt Beak, *Double Iron Bash, *Electrify, *Extreme Speed, *Fishious Rend, *Geomancy, *Glacial Lance, *Lovely Kiss, *Shell Smash, *Shift Gear, *Spore, *Thousand Arrows, *V-create, *Wicked Blow, -Porygon',
						'2': 'Gen 8 OU, forcemonotype=Fire',
						'3': 'dou, STABmons Move Legality, -Blissey, -Chansey, -Shedinja, -Silvally, -Snorlax, *Acupressure, *Astral Barrage, *Belly Drum, *Bolt Beak, *Clangorous Soul, *Decorate, *Diamond Storm, *Double Iron Bash, *Fishious Rend, *Follow Me, *Geomancy, *Glacial Lance, *Lovely Kiss, *Oblivion Wing, *Shift Gear, *Shell Smash, *Sleep Powder, *Spore, *Thousand Arrows, -Swift Swim',
						'4': 'ru, pickedteamsize = 4',
						'5': 'omotm1',
						'6': 'gen 7 random battle, maxteamsize = 24, pickedteamsize = 6, teampreview, Gen 8 Shared Power, Gen 8 Camomons, Inverse Mod, Scalemons Mod, !Moody Clause',
						'7': 'roas1',
						'8': 'dou, +kartana, +shadow tag',
						'9': 'Mix and mega, Picked Team Size = 1, Max Team Size = 3, -Focus Sash, -Bright Powder, -Focus Band, -Lax Incense, -Quick Claw, -Perish Song',
						'10': 'monotype, inverse',
						'11': 'nu, First Blood Rule',
						'12': 'camomons, !Obtainable Abilities, -Arena Trap, -Comatose, -Contrary, -Fluffy, -Fur Coat, -Gorilla Tactics, -Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword, -Libero, -Moody, -Neutralizing Gas, -Parental Bond, -Poison Heal, -Power Construct, -Protean, -Pure Power, -Shadow Tag, -Simple, -Stakeout, -Speed Boost, -Water Bubble, -Wonder Guard, -Archeops, -Blacephalon, -Cresselia, -Dragapult, -Regigigas, -Spectrier, -Urshifu, +Darmanitan-Galar, +Hydreigon, +Latias, +Latios, +Slowking-Galar, 2 Ability Clause',
						'13': 'publ',
						'14': 'gen 7 ubers, -all pokemon, +Mewtwo, +Rayquaza, +Groudon, +Kyogre, +Giratina, +Arceus, +Giratina-Origin',
						'15': 'gen 5 random battle, Team Preview',
						'16': 'ou, -toxapex, -Blissey, -Slowbro',
						'17': 'omotm2',
						'18': 'bdsp random battle, team preview,  maxteamsize = 24, pickedteamsize = 6',
						'19': 'lc, !Obtainable Abilities, -Arena Trap, -Comatose, -Contrary, -Fluffy, -Fur Coat, -Gorilla Tactics, -Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword, -Libero, -Moody, -Neutralizing Gas, -Parental Bond, -Protean, -Pure Power, -Shadow Tag, -Simple, -Stakeout, -Speed Boost, -Water Bubble, -Wonder Guard, +Cherubi, +Gothita, +Woobat',
						'20': 'ubers, -Uber ++ OU ++ UUBL > 1, -UU ++ RUBL > 1, -RU ++ NUBL > 1, -NU ++ PUBL > 1, -PU > 1',
						'21': 'national dex, !Obtainable Abilities, -Arena Trap, -Comatose, -Contrary, -Fluffy, -Fur Coat, -Gorilla Tactics, -Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword, -Libero, -Moody, -Neutralizing Gas, -Parental Bond, -Protean, -Pure Power, -Shadow Tag, -Simple, -Stakeout, -Speed Boost, -Water Bubble, -Wonder Guard, -Shedinja, 2 Ability Clause, -Dracovish, -Dragapult, -Zeraora, -Keldeo, -Slaking, -Regigigas, +Greninja-Ash, -Urshifu-Rapid-Strike, +Tornadus-Therian, +Metagrossite, +Naganadel, +Genesect, -Hoopa-Unbound, -Kartana, -Dragonite, +Darmanitan-Galar, +Metagross-Mega, -Victini, -Melmetal, -Archeops',
						'22': 'roas2',
						'23': 'Mix and mega, Tier Shift Mod, +Uber, +Damp Rock, +Heat Rock, -Arctovish, -Eviolite',
						'24': 'doubles uu',
						'25': 'gen 5 ou, -drizzle, -drought, -sand stream, -snow warning',
						'26': 'Shared power,  Obtainable, !Obtainable Abilities, Species Clause, Nickname Clause, 2 Ability Clause, OHKO Clause, Evasion Moves Clause, Team Preview, HP Percentage Mod, Cancel Mod, Dynamax Clause, Sleep Clause Mod, Endless Battle Clause, -Leppa Berry, +Darmanitan-Galar, -Dracovish, -Dragapult, -Eternatus, -Keldeo, -Kyurem-Black, -Kyurem-White, -Lunala, -Marshadow, -Melmetal, -Mewtwo, -Necrozma-Dawn-Wings, -Necrozma-Dusk-Mane, -Reshiram, -Shedinja, -Solgaleo, -Zacian, -Zamazenta, -Zekrom, -Zeraora, -Arena Trap, -Comatose, -Contrary, -Flare Boost, -Fluffy, -Fur Coat, -Gorilla Tactics, -Guts, -Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword, -Libero, -Moody, -Neutralizing Gas, -Parental Bond, -Protean, -Pure Power, -Shadow Tag, -Simple, -Stakeout, -Speed Boost, -Teravolt, -Tinted Lens, -Turboblaze, -Unaware, -Unburden, -Water Bubble, -Wonder Guard, -Baton Pass, +Swift Swim, +Chlorophyll, +Surge Surfer, +Slush Rush, +Sand Rush, -Drizzle ++ Swift Swim, -Primordial Sea ++ Swift Swim, -Drought ++ Chlorophyll, -Desolate Land ++ Chlorophyll, -Electric Surge ++ Surge Surfer, -Snow Warning ++ Slush Rush, -Sand Stream ++ Sand Rush, -Steelworker ++ Steely Spirit, -Regenerator ++ Emergency Exit, -Regenerator ++ Wimp Out, -Mirror Armor, -Trace, -Shadow Shield++Multiscale, -Poison Heal, -Regigigas',
						'27': 'godly gift, Same Type Clause, +Blissey, +Chansey, -Bright Powder, -Damp Rock, -Focus Band, -King\'s Rock, -Lax Incense, -Quick Claw, -Terrain Extender, -AG ++ Uber ++ Blaziken ++ Kartana ++ Power Construct > 1',
						'28': 'zu, !Obtainable Abilities, -Arena Trap, -Comatose, -Contrary, -Fluffy, -Fur Coat, -Gorilla Tactics, -Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword, -Libero, -Moody, -Neutralizing Gas, -Parental Bond, -Protean, -Pure Power, -Shadow Tag, -Simple, -Speed Boost, -Stakeout, -Tinted Lens, -Water Bubble, -Wonder Guard, 2 Ability Clause, -Exeggutor, -Regigigas, -Shedinja, +Drampa, +Exeggutor-Alola, +Gallade, +Haunter, +Magmortar, +Omastar, +Scrafty, +Toxicroak, +Turtonator, +Vikavolt, +Silvally-Dragon, +Sneasel',
					},
					times: [[5, 30], [12, 30], [18, 30], [23, 30]],
					year: 2022,
				},
				'3': {
					formats: {
						'1': 'ubers, !Obtainable Abilities, -Arena Trap, -Comatose, -Contrary, -Fluffy, -Fur Coat, -Gorilla Tactics, -Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword, -Libero, -Moody, -Neutralizing Gas, -Parental Bond, -Protean, -Pure Power, -Shadow Tag, -Simple, -Stakeout, -Speed Boost, -Water Bubble, -Wonder Guard, -Calyrex-Shadow, -Marshadow, -Shedinja, -Urshifu-Single-Strike, 2 Ability Clause, Dynamax Clause',
						'2': 'Gen 8 OU, Bonus Type Rule, Tier Shift Mod, !Nickname Clause, -Damp Rock, -Eviolite, -Heat Rock',
						'3': 'lc, !Obtainable, -Nonexistent, -Past, -Comatose + Sleep Talk, -Arena Trap, -Contrary, -Gorilla Tactics, -Huge Power, -Illusion, -Innards Out, -Intrepid Sword, -Libero, -Magnet Pull, -Moody, -Neutralizing Gas, -Parental Bond, -Protean, -Pure Power, -Shadow Tag, -Stakeout, -Water Bubble, -Wonder Guard, +Chlorophyll, -Bolt Beak, -Double Iron Bash, -Shell Smash, +Sticky Web, +Cherubi, +Corsola-Galar, +Cutiefly, +Drifloon, +Gastly, +Gothita, +Rufflet, +Scraggy, +Swirlix, +Tangela, +Vullaby, +Vulpix-Alola, +Woobat, -Type: Null',
						'4': 'NU, maxteamsize=10, pickedteamsize=8',
						'5': 'omotm1',
						'6': 'gen 5 random battle, maxteamsize = 24, pickedteamsize = 6, teampreview, Gen 8 Shared Power, Gen 8 Camomons, Inverse Mod, Scalemons Mod, !Moody Clause',
						'7': 'roas1',
						'8': 'dou, -protect, -detect, -fake out',
						'9': 'camomons, aaa, !Obtainable Abilities, -Arena Trap, -Comatose, -Contrary, -Fluffy, -Fur Coat, -Gorilla Tactics, -Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword, -Libero, -Moody, -Neutralizing Gas, -Parental Bond, -Poison Heal, -Power Construct, -Protean, -Pure Power, -Shadow Tag, -Simple, -Stakeout, -Speed Boost, -Water Bubble, -Wonder Guard, -Archeops, -Blacephalon, -Cresselia, -Dragapult, -Regigigas, -Spectrier, -Urshifu, +Darmanitan-Galar, +Hydreigon, +Latias, +Latios, +Slowking-Galar, 2 Ability Clause',
						'10': 'ru, forcemonotype=psychic',
						'11': 'gen 5 OU, First Blood Rule',
						'12': 'BH, [Gen 8] Camomons, -Nonexistent, !Obtainable, +Calyrex-Ice, +Darmanitan-Galar, +Dialga, +Dracovish, +Dragonite, +Eternatus, +Genesect, +Giratina, +Giratina-Origin, +Groudon, +Ho-Oh, +Hydreigon, +Kartana, +Kyogre, +Kyurem, +Kyurem-Black, +Kyurem-White, +Landorus-Base, +Latias, +Latios, +Lugia, +Lunala, +Marshadow, +Mew, +Mewtwo, +Naganadel, +Necrozma-Dawn-Wings, +Necrozma-Dusk-Mane, +Palkia, +Pheromosa, +Rayquaza, +Reshiram, +Reuniclus, +Slowking-Galar, +Solgaleo, +Spectrier, +Tornadus-Therian, +Xerneas, +Yveltal, +Zacian, +Zacian-Crowned, *Zacian-Crowned, +Zamazenta, +Zamazenta-Crowned, +Zekrom, +Zeraora, +Zygarde-Base',
						'13': 'natdex, !Obtainable Abilities, -Arena Trap, -Comatose, -Contrary, -Fluffy, -Fur Coat, -Gorilla Tactics, -Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword, -Libero, -Moody, -Neutralizing Gas, -Parental Bond, -Protean, -Pure Power, -Shadow Tag, -Simple, -Stakeout, -Speed Boost, -Water Bubble, -Wonder Guard, -Shedinja, 2 Ability Clause, -Dracovish, -Dragapult, -Zeraora, -Keldeo, -Slaking, -Regigigas, +Greninja-Ash, -Urshifu-Rapid-Strike, +Tornadus-Therian, +Metagrossite, +Naganadel, +Genesect, -Hoopa-Unbound, -Kartana, -Dragonite, +Darmanitan-Galar, +Metagross-Mega, -Victini, -Melmetal, -Archeops',
						'14': 'gen 7 battle factory, !Team Preview',
						'15': 'camomons, Bonus Type Rule, !Nickname Clause, +Dragonite, +Hydreigon, +Kyurem, +Landorus-Base, +Latias, +Latios, +Magearna, +Mew, +Pheromosa, +Reuniclus, +Slowking-Galar, +Spectrier, +Tornadus-Therian, +Zeraora',
						'16': 'stabmons, +Aegislash, +Blacephalon, +Calyrex-Ice, +Calyrex-Shadow, +Darmanitan-Galar, +Dialga, +Dracovish, +Dragapult, +Dragonite, +Eternatus, +Genesect, +Garchomp, +Giratina, +Giratina-Origin, +Groudon, +Ho-Oh, +Kartana, +Kyogre, +Kyurem-Black, +Kyurem-White, +Landorus, +Landorus-Therian, +Lugia, +Lunala, +Magearna, +Marshadow, +Mewtwo, +Naganadel, +Necrozma-Dawn-Wings, +Necrozma-Dusk-Mane, +Palkia, +Pheromosa, +Porygon-Z, +Rayquaza, +Reshiram, +Silvally, +Solgaleo, +Spectrier, +Tapu Bulu, +Tapu Koko, +Tapu Lele, +Thundurus-Base, +Urshifu-Base, +Xerneas, +Yveltal, +Zacian, +Zacian-Crowned, +Zamazenta, +Zamazenta-Crowned, +Zapdos-Galar, +Zekrom, +Zygarde-Base, -Uber ++ OU ++ UUBL > 1, -UU ++ RUBL > 1, -RU ++ NUBL > 1, -NU ++ PUBL > 1, -pu>1',
						'17': 'omotm2',
						'18': 'random battle, team preview,  maxteamsize = 24, pickedteamsize = 8',
						'19': 'ubers, STABmons Move Legality, -King\'s Rock, *Acupressure, *Belly Drum, *Bolt Beak, *Double Iron Bash, *Extreme Speed, *Electrify, *Fishious Rend, *Geomancy, *Lovely Kiss, *Shell Smash, *Shift Gear, *Spore, *Thousand Arrows, *V-create, *Wicked Blow, Dynamax Clause, -Calyrex-Shadow',
						'20': 'gen 6 monotype, inverse',
						'21': 'mix and mega, Picked Team Size = 1, Max Team Size = 3, -Focus Sash, -Bright Powder, -Focus Band, -Lax Incense, -Quick Claw, -Perish Song',
						'22': 'roas2',
						'23': 'Mix and mega, Tier Shift Mod, +Uber, +Damp Rock, +Heat Rock, -Arctovish, -Eviolite',
						'24': 'godly gift, Standard NatDex, -AG ++ Uber ++ Alakazam-Mega ++ Arceus ++ Blastoise-Mega ++ Blaziken-Mega ++ Darkrai ++ Deoxys-Attack ++ Deoxys-Base ++ Deoxys-Speed ++ Dragapult ++ Gengar-Mega ++ Giratina ++ Kangaskhan-Mega ++ Lucario-Mega ++ Metagross-Mega ++ Salamence-Mega ++ Shaymin-Sky ++ Tornadus-Therian ++ Power Construct > 1, -Rayquaza-Mega, Mega Rayquaza Clause',
						'25': 'inheritance, Tier Shift Mod, +Damp Rock, -Eviolite, -Heat Rock',
						'26': 'pu, +PUBL, maxteamsize=10, pickedteamsize=4',
						'27': 'NU, +Flygon',
						'28': 'zu, -all pokemon, +Avalugg, +Basculin, +Coalossal, +Drifblim, +Electivire, +Liepard',
						'29': 'doubles uu, +pelipper',
						'30': 'ou, maxteamsize=8, pickedteamsize=4, -all items, +Choice scarf',
						'31': '2v2 doubles, inverse',
					},
					times: [[5, 30], [12, 30], [18, 30], [23, 30]],
					year: 2022,
				},
				'4': {
					formats: {
						'1': 'stabmons, bonus type rule, !nickname clause',
						'2': 'balanced hackmons, Same Type Clause, -Drizzle, -Eternatus, -Normalize',
						'3': 'ubers, +Zacian-Crowned',
						'4': 'gen 5 random battle, Shared Power, !Moody Clause, Camomons Mod, Inverse Mod, Scalemons Mod',
						'5': 'omotm1',
						'6': 'nature swap, STABmons Move Legality, *Acupressure, *Belly Drum, *Bolt Beak, *Boomburst, *Double Iron Bash, *Extreme Speed, *Fishious Rend, *Geomancy, *Lovely Kiss, *Shell Smash, *Shift Gear, *Spore, *Thousand Arrows, *Transform, *V-create, *Wicked Blow, *Astral Barrage, -Regieleki, -Kartana, -Regigigas',
						'7': 'roas1',
						'8': 'duu, inverse',
						'9': 'mix and mega, Bonus Type Rule, !Nickname Clause, *Zygarde, *Dragonite',
						'10': 'the loser’s game, Standard NatDex, -Steel Beam, +Sandshrew-Alola',
						'11': 'gen 7 RU, +ruBL, first blood rule',
						'12': 'lc, aaa, -Arena Trap, -Comatose, -Contrary, -Fluffy, -Fur Coat, -Gorilla Tactics, -Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword, -Libero, -Moody, -Neutralizing Gas, -Parental Bond, -Protean, -Pure Power, -Shadow Tag, -Simple, -Stakeout, -Speed Boost, -Water Bubble, -Wonder Guard, +Cherubi, +Gothita, +Woobat',
						'13': 'ag, camomons mod',
						'14': 'gen 8 random battle, inverse, bring 10, pick 7',
						'15': 'mix and mega, Picked Team Size = 1, Max Team Size = 3, -Focus Sash, -Bright Powder, -Focus Band, -Lax Incense, -Quick Claw, -Perish Song',
						'16': 'OU, !Dynamax clause',
						'17': 'omotm2',
						'18': 'NU, +NUBL',
						'19': 'CAP, -all pokemon, +Cyclohm, +Jumbao, +Krilowatt, +Mollux, +Pajantom, +Plasmanta',
						'20': "BDSP ubers, aaa, !Obtainable Abilities, 2 Ability Clause, Sleep Moves Clause, !Sleep Clause Mod, -Arena Trap, -Comatose, -Contrary, -Fluffy, -Fur Coat, -Gorilla Tactics, -Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword, -Libero, -Magnet Pull, -Moody, -Neutralizing Gas, -Parental Bond, -Protean, -Pure Power, -Shadow Tag, -Speed Boost, -Simple, -Stakeout, -Water Bubble, -Wonder Guard, -Baton Pass, -King's Rock, -Razor Fang, -Dialga, -Giratina, -Giratina-Origin, -Groudon, -Ho-Oh, -Kyogre, -Lugia, -Mewtwo, -Palkia, -Rayquaza, -Regigigas, -Shedinja, -Slaking",
						'21': '1v1, -protect, -detect, -obstruct, inverse',
						'22': 'roas2',
						'23': 'shared power, Godly Gift, +Calyrex-Ice, +Darmanitan-Galar, +Dialga, +Dracovish, +Genesect, +Giratina, +Giratina-Origin, +Groudon, +Hawlucha, +Ho-Oh, +Kyogre, +Kyurem, +Kyurem-Black, +Kyurem-White, +Lugia, +Lunala, +Magearna, +Marshadow, +Mewtwo, +Naganadel, +Necrozma-Dawn-Wings, +Necrozma-Dusk-Mane, +Palkia, +Pheromosa, +Power Construct, +Rayquaza, +Reshiram, +Solgaleo, +Urshifu-Base, +Urshifu-Rapid-Strike, +Yveltal, +Zamazenta-Crowned, +Zekrom, +Swift Swim, -Heatran, -Kartana, -Acupressure, -Leppa Berry, -Flare Boost, -Fluffy, -Hustle, -Ice Scales, -Prankster, -Serene Grace, -Skill Link, -Stamina, -Sturdy, -Teravolt, -Turboblaze',
						'24': 'inheritance, Tier Shift Mod, +Damp Rock, -Eviolite, -Heat Rock',
						'25': 'random doubles battle, dynamax clause',
						'26': 'national dex, bring 12, pick 8',
						'27': '2v2, -all pokemon, + scrafty, !species clause, !obtainable abilities, camomons mod',
						'28': 'aaa, alphabet cup, Alphabet Cup Move Legality, -Cinderace, -Acupressure, *Astral Barrage, *Bolt Beak, -Double Iron Bash, *Fishious Rend, *Geomancy, *Glacial Lance, *Lovely Kiss, *Shell Smash, *Shift Gear, *Sleep Powder, *Spore, *Surging Strikes, -Thousand Arrows',
						'29': 'Mix and mega, NFE, Not Fully Evolved, *Doublade, *Dragonair, *Haunter, *Magneton, *Pawniard, *Porygon2, *Rhydon, *Scyther, *Sneasel, *Type: Null, -Arena Trap, -Shadow Tag, -Chansey',
						'30': 'bdsp 3v3 singles, -all items, +choice band, +choice specs',
					},
					times: [[5, 30], [12, 30], [18, 30], [23, 30]],
					year: 2022,
				},
				'5': {
					formats: {
						'1': 'NU, +NUBL, +bonus type rule',
						'2': 'LC, camomons',
						'3': 'doubles ou, [Gen 8] STABmons, -Blissey, -Chansey, -Shedinja, -Silvally, -Snorlax, *Acupressure, *Astral Barrage, *Belly Drum, *Bolt Beak, *Clangorous Soul, *Decorate, *Diamond Storm, *Double Iron Bash, *Fishious Rend, *Follow Me, *Geomancy, *Glacial Lance, *Lovely Kiss, *Oblivion Wing, *Shift Gear, *Shell Smash, *Sleep Powder, *Spore, *Thousand Arrows, -Swift Swim',
						'4': 'gen 6 random battle, [Gen 8] Shared Power, !Moody Clause, Camomons Mod, Inverse Mod, Scalemons Mod',
						'5': 'omotm1',
					},
					times: [[5, 30], [12, 30], [18, 30], [23, 30]],
					year: 2022,
				},
			},
		},
	},
};

/* eslint-enable max-len */

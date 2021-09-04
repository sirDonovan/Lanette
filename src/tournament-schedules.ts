import type { IRoomTournamentSchedule } from "./types/tournaments";

/* eslint-disable max-len */

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
					'4': 'nu',
					'5': 'monotype',
					'6': 'randombattle',
					'7': 'doublesou',
					'8': 'ubers',
					'9': 'lc',
					'10': 'ou',
					'11': 'zu',
					'12': 'uu',
					'13': 'pu',
					'14': 'ru',
					'15': 'nu',
					'16': 'monotype',
					'17': 'randombattle',
					'18': 'doublesou',
					'19': 'ubers',
					'20': 'lc',
					'21': 'ou',
					'22': 'zu',
					'23': 'uu',
					'24': 'pu',
					'25': 'ru',
					'26': 'nu',
					'27': 'monotype',
					'28': 'randombattle',
					'29': 'doublesou',
					'30': 'ubers',
				},
				times: [[2, 30], [9, 30], [15, 30], [20, 30]],
			},
		},
	},
	'toursplaza': {
		months: {
			'9': {
				formats: {
					'1': 'Stabmons, !Obtainable Abilities, -Arena Trap, -Comatose, -Contrary, -Fluffy, -Fur Coat, -Gorilla Tactics, -Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword, -Libero, -Moody, -Neutralizing Gas, -Parental Bond, -Protean, -Pure Power, -Shadow Tag, -Simple, -Stakeout, -Speed Boost, -Water Bubble, -Wonder Guard, -Shedinja, 2 Ability Clause, *Transform, *No Retreat, *V-create, -Hypnosis, -Sing, -Sleep Powder, +Darmanitan, +porygon-z, -Keldeo, -Terrakion, *Wicked Blow, -Zeraora, -Chandelure, -Melmetal, -Electrify, -Volcarona, -Blacephalon, -Dragonite, -Tapu Koko, -Thundurus, -Archeops, -Zygarde, -Regigigas, +Zygarde-10%, -Tinted Lens, *Glacial Lance, -Urshifu, -OU, -UUBL, -UU, -RUBL, -Togekiss, *Boomburst, *Dragon Energy, *Water Spout, *Eruption',
					'2': 'LC, STABmons Move Legality, *Acupressure, *Belly Drum, *Bolt Beak, *Double Iron Bash, *Electrify, *Extreme Speed, *Fishious Rend, *Geomancy, *Glacial Lance, *Lovely Kiss, *Shell Smash, *Shift Gear, *Spore, *Thousand Arrows, *V-create, *Wicked Blow, -Porygon',
					'3': 'tier shift, !Obtainable Abilities, -Arena Trap, -Comatose, -Contrary, -Fluffy, -Fur Coat, -Gorilla Tactics, -Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword, -Libero, -Moody, -Neutralizing Gas, -Parental Bond, -Poison Heal, -Protean, -Pure Power, -Shadow Tag, -Simple, -Speed Boost, -Stakeout, -Tinted Lens, -Water Bubble, -Wonder Guard, 2 Ability Clause, -Light Ball, -Absol, -Archeops, -Arctovish, -Bellossom, -Guzzlord, -Shedinja, -Regigigas, +Cinderace, +Darmanitan-Galar, +Dracovish, +Genesect, +Landorus, +Magearna, +Spectrier',
					'4': 'gen 5 ou, -Drizzle, - Drought, -Sand stream, -Snow warning',
					'5': 'doubles ou, [Gen 8] Camomons, !Sleep Clause Mod, +Darmanitan-Galar, +Heracross, +Hydreigon, +Kyurem, +Zeraora, +Arena Trap',
					'6': 'gen 7 random battle, max team size = 10',
					'7': 'OMOTM',
					'8': 'CAP, Scalemons Mod, +Mewtwo, +Lugia, +Ho-Oh, +Kyogre, +Groudon, +Rayquaza, +Dialga, +Palkia, +Giratina, +Giratina-Origin, +Reshiram, +Zekrom, +Landorus, +Kyurem-Black, +Kyurem-White, +Genesect, +Genesect-Burn, +Genesect-Douse, +Genesect-Shock, +Genesect-Chill, +Xerneas, +Yveltal, +Zygarde, +Zygarde-Complete, +Solgaleo, +Lunala, +Necrozma-Dusk-Mane, +Necrozma-Dawn-Wings, +Marshadow, +Naganadel, +Dracovish, +Zacian, +Zacian-Crowned, +Zamazenta, +Zamazenta-Crowned, +Eternatus, +Urshifu, +Spectrier, +Calyrex-Shadow, +Calyrex-Ice, -Eviolite, -Light Ball, -Gastly, -Darmanitan, -Darumaka, -Darumaka-Galar, -Crawdaunt, -Arena Trap, -Drizzle, -Drought, -Huge power, -Moody, -Shadow Tag, -Rain Dance, -Sunny Day, +Pheromosa',
					'9': 'gen 7 ou, -all pokemon, +Azumarill, +Ferrothorn, +Charizard, +Kommo-o, +Magnezone, +Tapu Lele',
					'10': 'PU, +PUBL',
					'11': 'mix and mega, Little Cup, +Shadow Tag, -Chlorophyll, -Scyther, *Corsola-Galar, *Cutiefly, *Drifloon, *Gastly, *Gothita, *Rufflet, *Sneasel, *Swirlix, *Tangela',
					'12': 'tier shift, shared power',
					'13': 'gen 5 random battle, [Gen 8] Shared Power, !Moody Clause, [Gen 8] Camomons, Inverse Mod, Scalemons Mod',
					'14': 'monotype, inverse mod',
					'15': 'doubles ou, -Gothitelle',
					'16': 'The loser’s game',
					'17': 'National dex, gen8shared power, -medichamite, -mawilite, -pure power, -beedrillite',
					'18': 'Mix and mega, +Uber, +Calyrex-Ice, +Calyrex-Shadow, +Dialga, +Eternatus, +Giratina, +Giratina-Origin, +Groudon, +Ho-oh, +Kyogre, +Kyurem-Black, +Kyurem-White, +Lugia, +Lunala, +Marshadow, +Melmetal, +Mewtwo, +Naganadel, +Necrozma-Dawn-Wings, +Necrozma-Dusk-Mane, +Palkia, +Rayquaza, +Regigigas, +Reshiram, +Solgaleo, +Urshifu-Base, +Xerneas, +Yveltal, +Zacian, +Zacian-Crowned, +Zamazenta, +Zamazenta-Crowned, +Zekrom, +Zygarde-Complete',
					'19': 'camomons, !Obtainable Abilities, -Arena Trap, -Comatose, -Contrary, -Fluffy, -Fur Coat, -Gorilla Tactics, -Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword, -Libero, -Moody, -Neutralizing Gas, -Parental Bond, -Poison Heal, -Power Construct, -Protean, -Pure Power, -Shadow Tag, -Simple, -Stakeout, -Speed Boost, -Water Bubble, -Wonder Guard, -Archeops, -Blacephalon, -Cresselia, -Dragapult, -Regigigas, -Spectrier, -Urshifu, +Darmanitan-Galar, +Hydreigon, +Latias, +Latios, +Slowking-Galar, 2 Ability Clause',
					'20': 'shared power, Standard NatDex, +Calyrex-Ice, +Calyrex-Shadow, +Darmanitan-Galar, +Dialga, +Dracovish, +Eternatus, +Genesect, +Giratina, +Giratina-Origin, +Groudon, +Ho-Oh, +Kyogre, +Kyurem-Black, +Kyurem-White, +Lugia, +Lunala, +Magearna, +Marshadow, +Melmetal, +Mewtwo, +Naganadel, +Necrozma-Dawn-Wings, +Necrozma-Dusk-Mane, +Palkia, +Pheromosa, +Rayquaza, +Reshiram, +Shedinja, +Solgaleo, +Urshifu-Base, +Urshifu-Rapid-Strike, +Xerneas, +Yveltal, +Zacian, +Zacian-Crowned, +Zamazenta, +Zamazenta-Crowned, +Zekrom, +Arena Trap, +Contrary, +Drizzle ++ Swift Swim, +Drought ++ Chlorophyll, +Electric Surge ++ Surge Surfer, +Fur Coat, +Guts, +Harvest, +Huge Power, +Imposter, +Innards Out, +Libero, +Magic Bounce, +Magic Guard, +Magnet Pull, +Mold Breaker, +Moody, +Neutralizing Gas, +Power Construct, +Queenly Majesty, +Quick Draw, +Regenerator, +Sand Rush, +Sand Veil, +Shadow Tag, +Simple, +Snow Cloak, +Snow Warning ++ Slush Rush, +Speed Boost, +Stakeout, +Steelworker ++ Steely Spirit, +Tinted Lens, +Triage, +Unaware, +Unburden, +Water Bubble, +Baton Pass, -Regenerator ++ Wimp Out, -Regenerator ++ Emergency Exit, !OHKO Clause, !Dynamax Clause, !Species Clause, !Evasion Moves Clause, !Sleep Clause Mod',
					'21': 'VGC 2021 Series 10, -Incineroar, -urshifu-rapid-strike',
					'22': 'Bss factory, inverse mod',
					'23': '2v2 doubles, -all pokemon, +Incineroar, +Tapu Lele, +Kyurem-Black, +Metagross',
					'24': 'Stabmons, mix and mega',
					'25': 'Pure Hackmons, -Eternatus-Eternamax',
					'26': 'nu, +nubl',
					'27': 'aaa, Alphabet Cup Move Legality, -Cinderace, -Acupressure, *Astral Barrage, *Bolt Beak, -Double Iron Bash, *Fishious Rend, *Geomancy, *Glacial Lance, *Lovely Kiss, *Shell Smash, *Shift Gear, *Sleep Powder, *Spore, *Surging Strikes, -Thousand Arrows',
					'28': 'Godly gift,  Standard NatDex, -AG ++ Uber ++ Alakazam-Mega ++ Arceus ++ Blastoise-Mega ++ Blaziken-Mega ++ Darkrai ++ Deoxys-Attack ++ Deoxys-Base ++ Deoxys-Speed ++ Dragapult ++ Gengar-Mega ++ Giratina ++ Kangaskhan-Mega ++ Lucario-Mega ++ Metagross-Mega ++ Salamence-Mega ++ Shaymin-Sky ++ Tornadus-Therian ++ Power Construct > 1, -Rayquaza-Mega, Mega Rayquaza Clause',
					'29': 'NFE, item clause',
					'30': 'Gen 4 OU, + Salamence, + Garchomp, + Manaphy',
				},
				times: [[5, 30], [12, 30], [18, 30], [23, 30]],
			},
		},
	},
};

/* eslint-enable max-len */
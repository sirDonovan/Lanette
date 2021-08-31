import type { IRoomTournamentSchedule } from "./types/tournaments";

/* eslint-disable max-len */

/**
 * Hours are in the same timezone as wherever Lanette is running
 */
export const tournamentSchedules: Dict<IRoomTournamentSchedule> = {
	'tournaments': {
		months: {
			'8': {
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
					'29': 'lc',
					'30': 'ou',
					'31': 'zu',
				},
				times: [[2, 30], [9, 30], [15, 30], [20, 30]],
			},
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
			'8': {
				formats: {
					'1': 'omotm',
					'2': 'Stabmons, !Obtainable Abilities, -Arena Trap, -Comatose, -Contrary, -Fluffy, -Fur Coat, -Gorilla Tactics,' +
						'-Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword, -Libero, -Moody,' +
						'-Neutralizing Gas, -Parental Bond, -Protean, -Pure Power, -Shadow Tag, -Simple, -Stakeout, -Speed Boost,' +
						'-Water Bubble, -Wonder Guard, -Shedinja, 2 Ability Clause, *Transform, *No Retreat, *V-create, -Hypnosis,' +
						'-Sing, -Sleep Powder, +Darmanitan, +Darmanitan-Galar, +Dracovish, +Gengar, +Porygon-Z, -Keldeo, -Terrakion,' +
						'*Wicked Blow, -Zeraora, -Chandelure, -Melmetal, -Electrify, -Volcarona, -Blacephalon, -Tapu Koko, -Thundurus,' +
						'-Archeops, -Zygarde, -Regigigas, +Zygarde-10%, -Tinted Lens, *Glacial Lance, +Landorus-Base, -Urshifu,' +
						'+Mamoswine, +Urshifu-Rapid-Strike, -Landorus-Therian, -Latios, -Magearna, *Oblivion Wing, +Clangorous Soul,' +
						'+Precipice Blades, *Dragon Ascent, -Poison Heal',
					'3': 'alphabet cup, Gen 8 Camomons, !Team Preview, Team Type Preview',
					'4': 'Random Battle, Team Preview, Maxteamsize = 10, Pickedteamsize = 6',
					'5': 'Gen 5 RU, -Moltres, -Durant',
					'6': 'OU, -Dragapult, -Kyurem, -Tapu Lele',
					'7': 'Mix and Mega, STABmons Move Legality,*Acupressure,*Belly Drum,*Bolt Beak,*Boomburst,*Double Iron Bash,' +
						'*Extreme Speed,*Fishious Rend,*Geomancy,*Lovely Kiss,*Shell Smash,*Shift Gear,*Spore,*Thousand Arrows,' +
						'*Transform,*V-create,*Wicked Blow,*Astral Barrage,*Glacial Lance,*Dragapult,*Dragonite,*Kartana,' +
						'*Landorus-Therian,*Tapu Koko,*Zygarde-Base,*Spectrier,*Precipice Blades,*Urshifu-Rapid-Strike, *Genesect',
					'8': 'Doubles OU, STABmons Move Legality, -Blissey, -Chansey, -Shedinja, -Silvally, -Snorlax, *Acupressure,' +
						'*Astral Barrage, *Belly Drum, *Bolt Beak, *Decorate, *Diamond Storm, *Double Iron Bash, *Fishious Rend,' +
						'*Geomancy, *Glacial Lance, *Lovely Kiss, *Shift Gear, *Shell Smash, *Spore, *Thousand Arrows, -Swift Swim',
					'9': 'Gen 8 Tier Shift, !Obtainable Abilities, -Arena Trap, -Comatose, -Contrary, -Fluffy, -Fur Coat,' +
						'-Gorilla Tactics, -Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword, -Libero,' +
						'-Moody, -Neutralizing Gas, -Parental Bond, -Poison Heal, -Protean, -Pure Power, -Shadow Tag, -Simple,' +
						'-Speed Boost, -Stakeout, -Tinted Lens, -Water Bubble, -Wonder Guard, 2 Ability Clause, -Light Ball, -Absol,' +
						'-Archeops, -Arctovish, -Bellossom, -Guzzlord, -Shedinja, -Regigigas, +Cinderace, +Darmanitan-Galar,' +
						'+Dracovish, +Genesect, +Landorus, +Magearna, +Spectrier',
					'10': 'Gen 7 RU, +RUBL, Inverse Mod, -Linoone, -Snorlax',
					'11': 'Camomons, Gen 8 Monotype',
					'12': 'Almost Any Ability, -Weavile',
					'13': 'Gen 6 Random Battle, Gen 8 Shared Power, Gen 8 Camomons, Inverse Mod, Scalemons Mod, !Moody Clause',
					'14': 'Balanced Hackmons, Little Cup, -Comatose + Sleep Talk, -Arena Trap, -Contrary, -Gorilla Tactics, -Huge Power,' +
						'-Illusion, -Innards Out, -Libero, -Magnet Pull, -Moody, -Neutralizing Gas, -Parental Bond, -Protean,' +
						'-Pure Power, -Shadow Tag, -Imposter, -Stakeout, -Water Bubble, -Wonder Guard, OHKO Clause,' +
						'Evasion Moves Clause, Sleep Clause Mod, Endless Battle Clause',
					'15': 'Gen 7 OU, Gen 8 Camomons, -Latias Mega, +Kommonium Z, +Zeraora, + Kommo-o, +Hydreigon, !Team Preview,' +
						'Team Type Preview, Z-Move Clause',
					'16': 'National Dex AG, !Obtainable Formes, OHKO Clause, Evasion Moves Clause, Species Clause, Dynamax Clause,' +
						'Sleep Clause Mod, -Zacian-Crowned, -Gengar-Mega, -Baton Pass',
					'17': 'PU, Gen 8 Shared Power, -Charizard, -Passimian',
					'18': 'Gen 5 OU, -Drizzle, -Drought, -Sand Stream, -Snow Warning',
					'19': 'Stabmons, +CAP, +Arghonaut, +Argalis, +Aurumoth, +Brattler, +Breezi, +Cawdet, +Colossoil, +Cupra, +Cyclohm,' +
						'+Embirch, +Fidgit, +Flarelm, +Kitsunoh, +Krilowatt, +Malaconda, +Mollux, +Mountaineer, +Necturine, +Necturna,' +
						'+Persistent, +Privatyke, +Pyroak, +Rebble, +Rebound, +Revenankh, +Scratchet, +Shadow Strike, +Stratagem,' +
						'+Syclant, +Syclar, +Tactite, +Tomohawk, +Voodoll, +Voodoom, +Paleo Wave, +Cawmodore, +Volkraken, +Volkritter,' +
						'+Plasmanta, +Snugglow, +Naviathan, +Floatoy, +Caimanoe, +Crucibelle, +Kerfluffle, +Pluffle, +Pajantom,' +
						'+Jumbao, +Mumbao, +Caribolt, +Fawnifer, +Electrelk, +Smokomodo, +Smogecko, +Smoguana, +Snaelstrom,' +
						'+Swirlpool, +Coribalis, +Equilibra, +Justyke, +Astrolotl, +Solotl, +Miasmaw, +Miasmite, +Chromera',
					'20': 'Ubers, Tier Shift, ![Gen 8] OU',
					'21': 'Gen 7 Balanced Hackmons, -Imposter, -Poison Heal',
					'22': 'Doubles UU, -DUU',
					'23': 'UU, !Dynamax Clause, Maxteamsize = 6, Pickedteamsize = 3',
					'24': 'LCUU, -Scorbunny, +Wingull, +Frillish',
					'25': 'Gen 7 OU, Not Fully Evolved, -Chansey, -Doublade, -Gligar, -Golbat, -Gurdurr, -Magneton, -Piloswine,' +
						'-Porygon2, -Rhydon, -Scyther, -Sneasel, -Type: Null, -Vigoroth, -Arena Trap, -Drought, -Moody, -Shadow Tag,' +
						'-Aurora Veil, -Baton Pass',
					'26': 'Pure Hackmons, -Eternatus-Eternamax, -Neutralizing Gas',
					'27': 'Anything Goes, !Obtainable Abilities',
					'28': 'Random Doubles Battle, Scalemons Mod',
					'29': 'Gen 2 OU, -Snorlax, Item Clause',
					'30': 'Gen 6 1v1, !Obtainable abilities, -Arena Trap, -Contrary, -Fur Coat, -Huge Power, -Illusion, -Imposter,' +
						'-Parental Bond, -Protean, -Pure Power, -Simple, -Speed Boost, -Wonder Guard, -Archeops, -Bisharp, -Chatot,' +
						'-Dragonite, -Keldeo, -Kyurem-black, -Mamoswine, -Regigigas, -Shedinja, -Slaking, -Smeargle, -Snorlax,' +
						'-Suicune, -Terrakion, -Weavile, -Dynamic Punch, -Zap Cannon, +Aegislash, +Blaziken, +Deoxys-Defense,' +
						'+Deoxys-Speed, +Genesect, +Greninja, +Landorus',
					'31': 'VGC 2021 Series 10',
				},
				times: [[5, 30], [12, 30], [18, 30], [23, 30]],
			},
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
import type { IRoomTournamentSchedule } from "./types/tournaments";

/* eslint-disable max-len */

/**
 * Hours are in the same timezone as wherever Lanette is running
 */
export const tournamentSchedules: Dict<Dict<IRoomTournamentSchedule>> = {
	'showdown': {
		'tournaments': {
			months: {
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
				'5': {
					formats: {
						'1': 'NU, +NUBL, bonus type rule',
						'2': 'LC, camomons',
						'3': 'doubles ou, [Gen 8] STABmons, -Blissey, -Chansey, -Shedinja, -Snorlax, *Decorate, *Diamond Storm, *Follow Me, *Lovely Kiss, *Sleep Powder, *Spore, -Swift Swim',
						'4': 'gen 6 random battle, [Gen 8] Shared Power, !Moody Clause, Camomons Mod, Inverse Mod, Scalemons Mod',
						'5': 'omotm1',
						'6': 'The loser’s game, Inverse Mod',
						'7': 'roas1',
						'8': 'godly gift, Same Type Clause, +Blissey, +Chansey, -Bright Powder, -Damp Rock, -Focus Band, -King\'s Rock, -Lax Incense, -Quick Claw, -Terrain Extender, -AG ++ Uber ++ Blaziken ++ Kartana ++ Power Construct > 1',
						'9': 'mix and mega, !Species Clause, !Nickname Clause, !OHKO Clause, !Evasion Moves Clause, !Dynamax Clause, !Sleep Clause Mod, +Uber, +Beedrillite, +Blazikenite, +Gengarite, +Kangaskhanite, +Mawilite, +Medichamite, +Pidgeotite, +Moody, +Shadow Tag, +Baton Pass, +Electrify, +Calyrex-Ice, +Calyrex-Shadow, +Dialga, +Eternatus, +Giratina, +Giratina-Origin, +Groudon, +Ho-oh, +Kyogre, +Kyurem-Black, +Kyurem-White, +Lugia, +Lunala, +Marshadow, +Melmetal, +Mewtwo, +Naganadel, +Necrozma-Dawn-Wings, +Necrozma-Dusk-Mane, +Palkia, +Rayquaza, +Regigigas, +Reshiram, +Solgaleo, +Urshifu-Base, +Xerneas, +Yveltal, +Zacian, +Zacian-Crowned, +Zamazenta, +Zamazenta-Crowned, +Zekrom, +Zygarde-Complete',
						'10': 'stabmons, !Obtainable Abilities,-Comatose,-Contrary,-Fluffy,-Fur Coat,-Gorilla Tactics,-Huge Power,-Ice Scales,-Illusion,-Imposter,-Innards Out,-Intrepid Sword,-Libero,-Neutralizing Gas,-Parental Bond,-Protean,-Pure Power,-Simple,-Stakeout,-Speed Boost,-Water Bubble,-Wonder Guard,2 Ability Clause,*Transform,*No Retreat,-Hypnosis,-Sing,-Sleep Powder,-Electrify,-Tinted Lens,*Glacial Lance,-All Pokemon,+Simipour,+Simisage,+Infernape,+Oranguru,+Zarude,+Primeape,+Simisear,+Rillaboom,+Darmanitan,+Darmanitan-Galar,+Vigoroth,+Ambipom, +passimian',
						'11': 'gen 7 PU, first blood rule',
						'12': 'dou, !Obtainable Abilities, 2 Ability Clause, Sleep Clause Mod, -Anger Point, -Arena Trap, -Comatose, -Contrary, -Dancer, -Desolate Land, -Fluffy, -Fur Coat, -Gorilla Tactics, -Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword, -Libero, -Moody, -Neutralizing Gas, -Parental Bond, -Prankster, -Primordial Sea, -Protean, -Pure Power, -Rattled, -Serene Grace, -Shadow Tag, -Simple, -Soul-Heart, -Stakeout, -Steam Engine, -Speed Boost, -Water Bubble, -Water Compaction, -Wonder Guard, -Dragonite, -Kyurem-Black, -Regigigas, -Shedinja, -Zygarde-Base, -Beat Up, -Stored Power, -King\'s Rock, -Weakness Policy',
						'13': 'gen 7 OU, bring 10, pick 7',
						'14': 'gen 7 battle factory, shared power, !Moody Clause',
						'15': 'NU, +Aloraichium Z, +Buginium Z, +Darkinium Z, +Decidium Z, +Dragonium Z, +Eevium Z, +Electrium Z, +Fairium Z, +Fightinium Z, +Firium Z, +Flyinium Z, +Ghostium Z, +Grassium Z, +Groundium Z, +Incinium Z, +Icium Z, +Kommonium Z, +Lunalium Z, +Lycanium Z, +Marshadium Z, +Mewnium Z, +Mimikium Z, +Normalium Z, +Pikanium Z, +Pikashunium Z, +Primarium Z, +Poisonium Z, +Psychium Z, +Rockium Z, +Snorlium Z, +Steelium Z, +Tapunium Z, +Waterium Z',
						'16': 'shared power, Standard NatDex, +Calyrex-Ice, +Calyrex-Shadow, +Darmanitan-Galar, +Dialga, +Dracovish, +Eternatus, +Genesect, +Giratina, +Giratina-Origin, +Groudon, +Ho-Oh, +Kyogre, +Kyurem-Black, +Kyurem-White, +Lugia, +Lunala, +Magearna, +Marshadow, +Melmetal, +Mewtwo, +Naganadel, +Necrozma-Dawn-Wings, +Necrozma-Dusk-Mane, +Palkia, +Pheromosa, +Rayquaza, +Reshiram, +Shedinja, +Solgaleo, +Urshifu-Base, +Urshifu-Rapid-Strike, +Xerneas, +Yveltal, +Zacian, +Zacian-Crowned, +Zamazenta, +Zamazenta-Crowned, +Zekrom, +Arena Trap, +Contrary, +Drizzle ++ Swift Swim, +Drought ++ Chlorophyll, +Electric Surge ++ Surge Surfer, +Fur Coat, +Guts, +Harvest, +Huge Power, +Imposter, +Innards Out, +Libero, +Magic Bounce, +Magic Guard, +Magnet Pull, +Mold Breaker, +Moody, +Power Construct, +Queenly Majesty, +Quick Draw, +Regenerator, +Sand Rush, +Sand Veil, +Shadow Tag, +Simple, +Snow Cloak, +Snow Warning ++ Slush Rush, +Speed Boost, +Stakeout, +Steelworker ++ Steely Spirit, +Tinted Lens, +Triage, +Unaware, +Unburden, +Water Bubble, +Baton Pass, -Regenerator ++ Wimp Out, -Regenerator ++ Emergency Exit, !OHKO Clause, !Dynamax Clause, !Species Clause, !Evasion Moves Clause, !Sleep Clause Mod, -Teravolt, -Turboblaze, -Ampharosite, -Gyaradosite',
						'17': 'omotm2',
						'18': 'ubers, -Uber ++ OU ++ UUBL > 1, -UU ++ RUBL > 1, -RU ++ NUBL > 1, -NU ++ PUBL > 1, -PU > 1',
						'19': 'CAP, Inverse Mod',
						'20': 'gen 5 ou, -drizzle, -drought, -sand stream, -snow warning',
						'21': 'ru, -all pokemon, +Celebi, +Crobat, +Klefki, +Nidoqueen, +Steelix, +Weezing-Galar',
						'22': 'roas2',
						'23': 'national dex monotype, forcemonotype=fighting',
						'24': 'doublesubers, !Obtainable Abilities, !Obtainable Moves, !Obtainable Misc, !EV Limit, Forme Clause, !Species Clause, -Shedinja, -Comatose + Sleep Talk, -Double Iron Bash, -Octolock, -Arena Trap, -Contrary, -Gorilla Tactics, -Huge Power, -Illusion, -Innards Out, -Libero, -Moody, -Neutralizing Gas, -Parental Bond, -Protean, -Pure Power, -Shadow Tag, -Stakeout, -Water Bubble, -Wonder Guard, -Justified, -Anger Point, -Steam Engine, -Stamina, -Rattled, -Wandering Spirit, -Soul-Heart',
						'25': 'BDSP random battle, inversemod',
						'26': 'ZU, aaa',
						'27': 'PU, !species clause, -all pokemon, +Silvally',
						'28': '1v1, !Dynamax Clause, !OHKO Clause, !Evasion Moves Clause, !Accuracy Moves Clause, +Calyrex-Ice, +Calyrex-Shadow, +Cinderace, +Dialga, +Dragonite, +Eternatus, +Giratina, +Giratina-Origin, +Groudon, +Ho-Oh, +Kyogre, +Kyurem-Black, +Kyurem-White, +Lugia, +Lunala, +Magearna, +Marshadow, +Melmetal, +Mew,+ Mewtwo, +Mimikyu, +Necrozma-Dawn-Wings, +Necrozma-Dusk-Mane, +Palkia, +Rayquaza, +Reshiram, +Sableye, +Solgaleo, +Victini, +Xerneas, +Yveltal, +Zacian, +Zacian-Crowned, +Zamazenta, +Zamazenta-Crowned, +Zekrom, +Moody, +Focus Sash, +Perish Song, Standard NatDex, !Species Clause',
						'29': 'RU, !dynamax clause, maxteamsize = 6, pickedteamsize = 3, adjustlevel = 50',
						'30': 'inheritance, !Dynamax Clause, !Sleep Clause Mod, !Species Clause, !Nickname Clause, !OHKO Clause, !Evasion Moves Clause, +AG, +Uber, +Blacephalon, +Blaziken, +Blissey, +Butterfree, +Calyrex-Ice, +Calyrex-Shadow, +Chansey, +Combusken, +Cresselia, +Dialga, +Darmanitan-Galar, +Dracovish, +Eternatus, +Giratina, +Giratina-Origin, +Groudon, +Ho-Oh, +Kartana, +Kyogre, +Kyurem-Black, +Kyurem-White, +Landorus-Base, +Lugia, +Lunala, +Marshadow, +Melmetal, +Mewtwo, +Naganadel, +Natu, +Necrozma-Dawn-Wings, +Necrozma-Dusk-Mane, +Palkia, +Pheromosa, +Rayquaza, +Regieleki, +Regigigas, +Reshiram, +Sableye, +Shedinja, +Solgaleo, +Spectrier, +Tapu Koko, +Toxtricity, +Torkoal, +Urshifu-Base, +Xatu, +Xerneas, +Yveltal, +Zacian, +Zacian-Crowned, +Zamazenta, +Zamazenta-Crowned, +Zeraora, +Zekrom, +Zygarde-Complete, +Arena Trap, +Contrary, +Drizzle, +Huge Power, +Imposter, +Innards Out, +Libero, +Moody, +Power Construct, +Pure Power, +Shadow Tag, +Simple, +Unaware, +Unburden, +Water Bubble, +Baton Pass, +Bolt Beak, +Fishious Rend, +Shell Smash',
						'31': 'VGC 2022, inverse mod',
					},
					times: [[5, 30], [12, 30], [18, 30], [23, 30]],
					year: 2022,
				},
				'6': {
					formats: {
						'1': 'OU, +Cinderace, +Genesect, +Kyurem, +Kyurem-Black, +Kyurem-White, +Lugia, +Necrozma-Dawn-Wings, +Spectrier, +Zamazenta-Hero',
						'2': 'Gen 2 OU, Stabmons Move Legality, -snorlax, *bellydrum, *extremespeed, *lovelykiss, *spore',
						'3': 'OMOTM1',
						'4': 'Doubles OU, Inverse Mod',
						'5': 'RU, + RUBL',
						'6': '[Gen 8] Mix and Mega, STABmons Move Legality,*Acupressure,*Belly Drum,*Bolt Beak,*Boomburst,*Clangorous Soul,*Double Iron Bash,*Extreme Speed,*Fishious Rend,*Geomancy,*Lovely Kiss,*Shell Smash,*Shift Gear,*Spore,*Thousand Arrows,*Transform,*V-create,*Wicked Blow,*Astral Barrage,*Glacial Lance,*Dragapult,*Dragonite,*Kartana,*Landorus-Therian,*Tapu Koko,*Zygarde-Base,*Precipice Blades,+Urshifu-Rapid-Strike, *Genesect, *Sleep Powder,*Keldeo, -Kings Rock,*Thundurus,*Thundurus-Therian,*Zeraora,*Eternatus',
						'7': 'roas1',
						'8': 'Gen 7 Battle Factory, Scalemons Mod',
						'9': 'LC, first blood rule',
						'10': 'stabmons, !Obtainable Abilities,-Comatose,-Contrary,-Fluffy,-Fur Coat,-Gorilla Tactics,-Huge Power,-Ice Scales,-Illusion,-Imposter,-Innards Out,-Intrepid Sword,-Libero,-Neutralizing Gas,-Parental Bond,-Protean,-Pure Power,-Simple,-Stakeout,-Speed Boost,-Water Bubble,-Wonder Guard,2 Ability Clause,*Transform,*No Retreat,-Hypnosis,-Sing,-Sleep Powder,-Electrify,-Tinted Lens,*Glacial Lance,-All Pokemon,+Simipour,+Simisage,+Infernape,+Oranguru,+Zarude,+Primeape,+Simisear,+Rillaboom,+Darmanitan,+Darmanitan-Galar,+Vigoroth,+Ambipom, +passimian',
						'11': 'Pokeabilities, !Obtainable Abilities, AAA Restricted Abilities, 2 Ability Clause, !Sleep Clause Mod, Sleep Moves Clause, -Arena Trap, *Comatose, *Contrary, *Fluffy, *Fur Coat, *Gorilla Tactics, *Huge Power, *Ice Scales, *Illusion, *Imposter, *Innards Out, *Intrepid Sword, *Libero, -Moody, *Neutralizing Gas, *Parental Bond, *Poison Heal, *Prankster, *Protean, *Pure Power, -Shadow Tag, *Simple, *Stakeout, *Speed Boost, *Tinted Lens, *Water Bubble, -Wonder Guard, -Blacephalon, -Buzzwole, -Clefable, -Dragapult, -Dragonite, -Kartana, -Kyurem-Base, -Melmetal, -Mienshao, -Noivern, -Obstagoon, -Pangoro, -Perrserker, -Pheromosa, -Rillaboom, -Shedinja, -Tapu Bulu, -Tapu Lele, -Urshifu, -Victini, -Weavile, -Zamazenta-Crowned, -Desolate Land + Chlorophyll, -Drought + Chlorophyll, -Drizzle + Swift Swim, -Electric Surge + Surge Surfer, -Primordial Sea + Swift Swim, -Regenerator + Emergency Exit, -Regenerator + Multiscale, -Regenerator + Shadow Shield, -Regenerator + Wimp Out, -Sand Stream + Sand Rush, -Snow Warning + Slush Rush, -Regenerator > 2',
						'12': 'gen 7 random battle, [Gen 8] Shared Power, !Moody Clause, Camomons Mod, Inverse Mod, Scalemons Mod',
						'13': 'ubers, -Uber ++ OU ++ UUBL > 1, -UU ++ RUBL > 1, -RU ++ NUBL > 1, -NU ++ PUBL > 1, -PU > 1',
						'14': 'Almost Any Ability, +Aloraichium Z, +Buginium Z, +Darkinium Z, +Decidium Z, +Dragonium Z, +Eevium Z, +Electrium Z, +Fairium Z, +Fightinium Z, +Firium Z, +Flyinium Z, +Ghostium Z, +Grassium Z, +Groundium Z, +Incinium Z, +Icium Z, +Kommonium Z, +Lunalium Z, +Lycanium Z, +Marshadium Z, +Mewnium Z, +Mimikium Z, +Normalium Z, +Pikanium Z, +Pikashunium Z, +Primarium Z, +Poisonium Z, +Psychium Z, +Rockium Z, +Snorlium Z, +Steelium Z, +Tapunium Z, +Waterium Z',
						'15': 'ROAS2',
						'16': 'inheritance, !Dynamax Clause, !Sleep Clause Mod, !Species Clause, !Nickname Clause, !OHKO Clause, !Evasion Moves Clause, +AG, +Uber, +Blacephalon, +Blaziken, +Blissey, +Butterfree, +Calyrex-Ice, +Calyrex-Shadow, +Chansey, +Combusken, +Cresselia, +Dialga, +Darmanitan-Galar, +Dracovish, +Eternatus, +Giratina, +Giratina-Origin, +Groudon, +Ho-Oh, +Kartana, +Kyogre, +Kyurem-Black, +Kyurem-White, +Landorus-Base, +Lugia, +Lunala, +Marshadow, +Melmetal, +Mewtwo, +Naganadel, +Natu, +Necrozma-Dawn-Wings, +Necrozma-Dusk-Mane, +Palkia, +Pheromosa, +Rayquaza, +Regieleki, +Regigigas, +Reshiram, +Sableye, +Shedinja, +Solgaleo, +Spectrier, +Tapu Koko, +Toxtricity, +Torkoal, +Urshifu-Base, +Xatu, +Xerneas, +Yveltal, +Zacian, +Zacian-Crowned, +Zamazenta, +Zamazenta-Crowned, +Zeraora, +Zekrom, +Zygarde-Complete, +Arena Trap, +Contrary, +Drizzle, +Huge Power, +Imposter, +Innards Out, +Libero, +Moody, +Power Construct, +Pure Power, +Shadow Tag, +Simple, +Unaware, +Unburden, +Water Bubble, +Baton Pass, +Bolt Beak, +Fishious Rend, +Shell Smash,
						'17': 'gen 7 lc, 1v1',
						'18': '2v2, flipped mod',
						'19': 'OMOTM2',
						'20': 'OU, -all pokemon, +Pikachu, +Plusle, +Minun, +Pachirisu, +Emolga, +Dedenne, +Togedemaru, +Mimikyu, +Morpeko',
						'21': 'ZU, AAA',
						'22': 'Gen 4 OU, +Salamence, +Garchomp, +Sand Veil',
						'23': 'VGC 2022, Inverse Mod',
						'24': 'Gen 8 NU, Gen 8 Camomons, +Entei',
						'25': 'Godly Gift, NFE',
						'26': 'ZU, aaa',
						'27': 'Gen 7 Ubers, !species clause, -all pokemon, +Arceus',
						'28': 'Metronome Battle, adjustlevel = 50',
						'29': 'ROAS3',
						'30': 'cap, scalemons mod',
					},
					times: [[5, 30], [12, 30], [18, 30], [23, 30]],
					year: 2022,
				},
			},
		},
	},
};

/* eslint-enable max-len */

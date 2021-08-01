import type { IRoomTournamentSchedule } from "./types/tournaments";

/**
 * Hours are in the same timezone as wherever Lanette is running
 */
export const tournamentSchedules: Dict<IRoomTournamentSchedule> = {
	'tournaments': {
		months: {
			'7': {
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
			},
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
		},
	},
	'toursplaza': {
		months: {
			'7': {
				formats: {
					'1': 'mix and mega, STABmons Move Legality,*Acupressure,*Belly Drum,*Bolt Beak,*Boomburst,*Double Iron Bash,' +
						'*Extreme Speed,*Fishious Rend,*Geomancy,*Lovely Kiss,*Shell Smash,*Shift Gear,*Spore,*Thousand Arrows,' +
						'*Transform,*V-create,*Wicked Blow,*Astral Barrage,*Glacial Lance,*Dragapult,*Dragonite,*Kartana,' +
						'*Landorus-Therian,*Tapu Koko,*Zygarde-Base,*Spectrier,*Precipice Blades,*Urshifu-Rapid-Strike',
					'2': 'gen 8 random battle, Gen 8 Shared Power, Gen 8 Camomons, Inverse Mod, Scalemons Mod',
					'3': 'gen 8 tier shift, STABmons Move Legality, *Acupressure, *Astral Barrage, *Belly Drum, *Bolt Beak,' +
						'*Clangorous Soul, *Double Iron Bash, *Electrify, *Extreme Speed, *Fishious Rend, *Geomancy, ' +
						'*Glacial Lance, *Lovely Kiss, *Shell Smash, *Shift Gear, *Spore, *Thousand Arrows, *V-Create,' +
						'*Wicked Blow, -Dragapult, -Drakloak, -Kartana, -Landorus-Therian, -Pheromosa, -Silvally, -Spectrier, -Thundurus',
					'4': 'gen 8 balanced hackmons, [Gen 8] Camomons, -Nonexistent, !Obtainable, +Calyrex-Ice, +Darmanitan-Galar,' +
						'+Dialga, +Dracovish, +Dragonite, +Eternatus, +Genesect, +Giratina, +Giratina-Origin, +Groudon, +Ho-Oh,' +
						'+Kartana, +Kyogre, +Kyurem, +Kyurem-Black, +Kyurem-White, +Landorus-Base, +Lugia, +Lunala, +Marshadow,' +
						'+Mewtwo, +Necrozma-Dawn-Wings, +Necrozma-Dusk-Mane, +Palkia, +Rayquaza, +Reshiram, +Solgaleo, +Xerneas,' +
						'+Yveltal, +Zacian, +Zacian-Crowned, *Zacian-Crowned, +Zamazenta, +Zamazenta-Crowned, +Zekrom, +Zygarde-Base',
					'5': 'lc, [Gen 8] Camomons, +Arena Trap, +Shadow Tag',
					'6': 'mix and mega, +Uber, +Calyrex-Ice, +Calyrex-Shadow, +Dialga, +Eternatus, +Giratina, +Giratina-Origin,' +
						'+Groudon, +Ho-oh, +Kyogre, +Kyurem-Black, +Kyurem-White, +Lugia, +Lunala, +Marshadow, +Melmetal, +Mewtwo,' +
						'+Naganadel, +Necrozma-Dawn-Wings, +Necrozma-Dusk-Mane, +Palkia, +Rayquaza, +Regigigas, +Reshiram,' +
						'+Solgaleo, +Urshifu-Base, +Xerneas, +Yveltal, +Zacian, +Zacian-Crowned, +Zamazenta, +Zamazenta-Crowned,' +
						'+Zekrom, +Zygarde-Complete',
					'7': 'national dex, !Obtainable Abilities, -Arena Trap, -Comatose, -Contrary, -Fluffy, -Fur Coat,' +
						'-Gorilla Tactics, -Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword, -Libero,' +
						'-Moody, -Neutralizing Gas, -Parental Bond, -Protean, -Pure Power, -Shadow Tag, -Simple, -Stakeout,' +
						'-Speed Boost, -Water Bubble, -Wonder Guard, -Shedinja, 2 Ability Clause, -Dracovish, -Dragapult,' +
						'-Zeraora, -Keldeo, -Slaking, -Regigigas, +Greninja-Ash, -Urshifu-Rapid-Strike, +Tornadus-Therian,' +
						'+Metagrossite, +Naganadel, +Genesect, -Hoopa-Unbound, -Kartana, -Dragonite, +Darmanitan-Galar,' +
						'+Metagross-Mega, -Victini, -Melmetal, -Archeops',
					'8': 'ubers, Dynamax Clause, !Obtainable Abilities, 2 Ability Clause, -Arena Trap, -Comatose, -Contrary, -Fluffy,' +
						'-Fur Coat, -Gorilla Tactics, -Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword,' +
						'-Libero, -Moody, -Neutralizing Gas, -Parental Bond, -Protean, -Pure Power, -Shadow Tag, -Simple, -Stakeout,' +
						'-Speed Boost, -Water Bubble, -Wonder Guard, -Calyrex-Shadow, -Marshadow, -Shedinja, -Urshifu-Single-Strike,' +
						'+Cinderace, +Darmanitan-Galar, +Magearna, +Naganadel, +Zacian, +Zacian-Crowned',
					'9': 'national dex, gen8shared power, -medichamite, -mawilite, -pure power, -beedrillite',
					'10': 'gen 8 doubles ou, STABmons Move Legality, -Blissey, -Chansey, -Shedinja, -Silvally, -Snorlax,' +
						'*Acupressure, *Astral Barrage, *Belly Drum, *Bolt Beak, *Decorate, *Diamond Storm, *Double Iron Bash,' +
						'*Fishious Rend, *Geomancy, *Glacial Lance, *Lovely Kiss, *Shift Gear, *Shell Smash, *Spore,' +
						'*Thousand Arrows, -Swift Swim',
					'11': 'gen 7 ubers, !Obtainable Abilities, -Arena Trap, -Comatose, -Contrary, -Fluffy, -Fur Coat,' +
						'-Gorilla Tactics, -Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword,' +
						'-Libero, -Moody, -Neutralizing Gas, -Parental Bond, -Protean, -Pure Power, -Shadow Tag, -Simple,' +
						'-Stakeout, -Speed Boost, -Water Bubble, -Wonder Guard, -Shedinja, 2 Ability Clause, -necrozma-dusk-mane',
					'12': 'gen 8 lc, !Obtainable Abilities, -Arena Trap, -Comatose, -Contrary, -Fluffy, -Fur Coat,' +
						'-Gorilla Tactics, -Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword,' +
						'-Libero, -Moody, -Neutralizing Gas, -Parental Bond, -Protean, -Pure Power, -Shadow Tag, -Simple,' +
						'-Stakeout, -Speed Boost, -Water Bubble, -Wonder Guard, +Cherubi +Gothita, +Woobat',
					'13': 'gen 8 tier shift, !Obtainable Abilities, -Arena Trap, -Comatose, -Contrary, -Fluffy, -Fur Coat,' +
						'-Gorilla Tactics, -Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword,' +
						'-Libero, -Moody, -Neutralizing Gas, -Parental Bond, -Poison Heal, -Protean, -Pure Power,' +
						'-Shadow Tag, -Simple, -Speed Boost, -Stakeout, -Tinted Lens, -Water Bubble, -Wonder Guard,' +
						'2 Ability Clause, -Light Ball, -Absol, -Archeops, -Arctovish, -Bellossom, -Guzzlord, -Shedinja,' +
						'-Regigigas, +Cinderace, +Darmanitan-Galar, +Dracovish, +Genesect, +Landorus, +Magearna, +Spectrier',
					'14': 'sharedpower, !Obtainable Abilities, Species Clause, Nickname Clause, 2 Ability Clause, OHKO Clause,' +
						'Evasion Moves Clause, Team Preview, HP Percentage Mod, Cancel Mod, Dynamax Clause, Sleep Clause Mod,' +
						'Endless Battle Clause, -Leppa Berry, +Darmanitan-Galar, -Dracovish, -Dragapult, -Eternatus, -Keldeo,' +
						'-Kyurem-Black, -Kyurem-White, -Lunala, -Marshadow, -Melmetal, -Mewtwo, -Necrozma-Dawn-Wings,' +
						'-Necrozma-Dusk-Mane, -Reshiram, -Shedinja, -Solgaleo, -Zacian, -Zamazenta, -Zekrom, -Zeraora,' +
						'-Arena Trap, -Comatose, -Contrary, -Flare Boost, -Fluffy, -Fur Coat, -Gorilla Tactics, -Guts,' +
						'-Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword, -Libero, -Moody,' +
						'-Neutralizing Gas, -Parental Bond, -Protean, -Pure Power, -Shadow Tag, -Simple, -Stakeout,' +
						'-Speed Boost, -Teravolt, -Tinted Lens, -Turboblaze, -Unaware, -Unburden, -Water Bubble, -Wonder Guard,' +
						'-Baton Pass, +Swift Swim, +Chlorophyll, +Surge Surfer, +Slush Rush, +Sand Rush, -Drizzle ++ Swift Swim,' +
						'-Primordial Sea ++ Swift Swim, -Drought ++ Chlorophyll, -Desolate Land ++ Chlorophyll,' +
						'-Electric Surge ++ Surge Surfer, -Snow Warning ++ Slush Rush, -Sand Stream ++ Sand Rush,' +
						'-Steelworker ++ Steely Spirit, -Regenerator ++ Emergency Exit, -Regenerator ++ Wimp Out, -Mirror Armor,' +
						'-Trace, -Shadow Shield++Multiscale, -Poison Heal, -Regigigas',
					'15': "ubers, STABmons Move Legality, -King's Rock, *Acupressure, *Belly Drum, *Bolt Beak," +
						"*Double Iron Bash, *Extreme Speed, *Electrify, *Fishious Rend, *Geomancy, *Lovely Kiss, *Shell Smash," +
						"*Shift Gear, *Spore, *Thousand Arrows, *V-create, *Wicked Blow, Dynamax Clause, -Calyrex-Shadow",
					'16': 'stabmons, !Obtainable Abilities, -Arena Trap, -Comatose, -Contrary, -Fluffy, -Fur Coat,' +
						'-Gorilla Tactics, -Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword,' +
						'-Libero, -Moody, -Neutralizing Gas, -Parental Bond, -Protean, -Pure Power, -Shadow Tag, -Simple,' +
						'-Stakeout, -Speed Boost, -Water Bubble, -Wonder Guard, -Shedinja, 2 Ability Clause, *Transform,' +
						'*No Retreat, *V-create, -Hypnosis, -Sing, -Sleep Powder, +Darmanitan, +Darmanitan-Galar, +Dracovish,' +
						'+Gengar, +Porygon-Z, -Keldeo, -Terrakion, *Wicked Blow, -Zeraora, -Chandelure, -Melmetal,' +
						'-Electrify, -Volcarona, -Blacephalon, -Tapu Koko, -Thundurus, -Archeops, -Zygarde, -Regigigas,' +
						'+Zygarde-10%, -Tinted Lens, *Glacial Lance, +Landorus-Base, -Urshifu, +Mamoswine,' +
						'+Urshifu-Rapid-Strike, -Landorus-Therian, -Latios, -Magearna, *Oblivion Wing, +Clangorous Soul,' +
						'+Precipice Blades, *Dragon Ascent, -Poison Heal',
					'17': 'gen 8 national dex, -allpokemon, -Past, +Venusaur, +Charizard, +Blastoise, +Typhlosion, +Meganium, +Feraligatr',
					'18': 'gen 8 national dex, -allpokemon, -Past, +Sceptile, +Blaziken, +Swampert, +Torterra, +Infernape, +Empoleon',
					'19': 'gen 8 national dex, -allpokemon, -Past, +Serperior, +Emboar, +Samurott, +Delphox, +Greninja, +Chesnaught',
					'20': 'gen 8 national dex, -allpokemon, -Past, +Primarina, +Incineroar, +Decidueye, +Rillaboom, +Cinderace, +Inteleon',
					'21': 'gen 8 national dex, -allpokemon, -Past, +Dialga, +Palkia, +Giratina, +Heatran, +Darkrai, +Cresselia',
					'22': 'gen 8 national dex, -allpokemon, -Past, +Articuno, +Zapdos, +Moltres, +Ho-Oh, +Lugia, +Mewtwo',
					'23': 'gen 8 national dex, -allpokemon, -Past, +Regirock, +Regice, +Registeel, +Azelf, +Uxie, +Mesprit',
					'24': 'gen 8 national dex, -allpokemon, -Past, +Thundurus, +Tornadus, +Landorus, +Cobalion, +Terrakion, +Virizion',
					'25': 'gen 8 national dex, -allpokemon, -Past, +Mew, +Jirachi, +Celebi, +Victini, +Shaymin, +Manaphy',
					'26': 'gen 8 national dex, -allpokemon, -Past, +Genesect, +Marshadow, +Zarude, +Hoopa, +Volcanion, +Magearna',
					'27': 'gen 8 national dex, -allpokemon, -Past, +Diancie, +Melmetal, +Zeraora, +Meloetta, +Keldeo, +Phione',
					'28': 'gen 8 national dex, -allpokemon, -Past, +Simipour, +Simisear, +Simisage, +Ambipom, +Primeape, +Oranguru',
					'29': 'gen 8 national dex, -allpokemon, -Past, +Raikou, +Entei, +Suicune, +Reshiram, +Zekrom, +Kyurem',
					'30': 'gen 8 national dex, -allpokemon, -Past, +Nihilego, +Buzzwole, +Pheromosa, +Xurkitree, +Celesteela, +Guzzlord',
					'31': 'gen 8 national dex, -allpokemon, -Past, +Blacephalon, +Naganadel, +Stakataka, +Necrozma, +Kartana, +Lunala',
				},
				times: [[5, 30], [12, 30], [18, 30], [23, 30]],
			},
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
		},
	},
};

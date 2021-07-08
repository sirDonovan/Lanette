import type { IRoomTournamentSchedule } from "./types/tournaments";

/**
 * Hours are in the same timezone as wherever Lanette is running
 */
export const tournamentSchedules: Dict<IRoomTournamentSchedule> = {
	'tournaments': {
		months: {
			'6': {
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
				},
				times: [[2, 30], [9, 30], [15, 30], [20, 30]],
			},
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
		},
	},
	'toursplaza': {
		months: {
			'6': {
				formats: {
					'1': 'randombattle',
					'2': 'gen1randombattle',
					'3': 'gen2randombattle',
					'4': 'gen3randombattle',
					'5': 'gen4randombattle',
					'6': 'gen5randombattle',
					'7': 'gen6randombattle',
					'8': 'gen7randombattle',
					'9': 'gen7letsgorandombattle',
					'10': 'gen6battlefactory',
					'11': 'gen7battlefactory',
					'12': 'gen7randomdoublesbattle',
					'13': 'bssfactory',
					'14': 'gen7bssfactory',
					'15': 'randombattle@@@gen8camomons, gen8sharedpower, scalemons mod, inverse mod, !teampreview, !dynamax clause',
					'16': 'gen4doublesou',
					'17': 'gen5doublesou',
					'18': 'gen5gbudoubles',
					'19': 'gen6doublesou',
					'20': 'gen6vgc2016',
					'21': 'gen6battlespotdoubles',
					'22': 'gen7doublesou',
					'23': 'gen7doublesuu',
					'24': 'gen7vgc2017',
					'25': 'gen7vgc2018',
					'26': 'gen7vgc2019',
					'27': 'doublesubers',
					'28': 'doubleslc',
					'29': 'vgc2021series9',
					'30': 'doublesou',
				},
				times: [[5, 30], [12, 30], [18, 30], [23, 30]],
			},
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
					'17': 'gen 8 national dex, -allpokemon, +Venusaur, +Charizard, +Blastoise, +Typhlosion, +Meganium, +Feraligatr',
					'18': 'gen 8 national dex, -allpokemon, +Sceptile, +Blaziken, +Swampert, +Torterra, +Infernape, +Empoleon',
					'19': 'gen 8 national dex, -allpokemon, +Serperior, +Emboar, +Samurott, +Delphox, +Greninja, +Chesnaught',
					'20': 'gen 8 national dex, -allpokemon, +Primarina, +Incineroar, +Decidueye, +Rillaboom, +Cinderace, +Inteleon',
					'21': 'gen 8 national dex, -allpokemon, +Dialga, +Palkia, +Giratina, +Heatran, +Darkrai, +Cresselia',
					'22': 'gen 8 national dex, -allpokemon, +Articuno, +Zapdos, +Moltres, +Ho-Oh, +Lugia, +Mewtwo',
					'23': 'gen 8 national dex, -allpokemon, +Regirock, +Regice, +Registeel, +Azelf, +Uxie, +Mesprit',
					'24': 'gen 8 national dex, -allpokemon, +Thundurus, +Tornadus, +Landorus, +Cobalion, +Terrakion, +Virizion',
					'25': 'gen 8 national dex, -allpokemon, +Mew, +Jirachi, +Celebi, +Victini, +Shaymin, +Manaphy',
					'26': 'gen 8 national dex, -allpokemon, +Genesect, +Marshadow, +Zarude, +Hoopa, +Volcanion, +Magearna',
					'27': 'gen 8 national dex, -allpokemon, +Diancie, +Melmetal, +Zeraora, +Meloetta, +Keldeo, +Phione',
					'28': 'gen 8 national dex, -allpokemon, +Simipour, +Simisear, +Simisage, +Ambipom, +Primeape, +Oranguru',
					'29': 'gen 8 national dex, -allpokemon, +Raikou, +Entei, +Suicune, +Reshiram, +Zekrom, +Kyurem',
					'30': 'gen 8 national dex, -allpokemon, +Nihilego, +Buzzwole, +Pheromosa, +Xurkitree, +Celesteela, +Guzzlord',
					'31': 'gen 8 national dex, -allpokemon, +Blacephalon, +Naganadel, +Stakataka, +Necrozma, +Kartana, +Lunala',
				},
				times: [[5, 30], [12, 30], [18, 30], [23, 30]],
			},
		},
	},
};

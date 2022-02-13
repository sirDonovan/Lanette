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
						'27': 'monotype, Same Type Clause, +Blissey, +Chansey, -Bright Powder, -Damp Rock, -Focus Band, -King\'s Rock, -Lax Incense, -Quick Claw, -Terrain Extender, -AG ++ Uber ++ Blaziken ++ Kartana ++ Power Construct > 1',
						'28': 'zu, !Obtainable Abilities, -Arena Trap, -Comatose, -Contrary, -Fluffy, -Fur Coat, -Gorilla Tactics, -Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword, -Libero, -Moody, -Neutralizing Gas, -Parental Bond, -Protean, -Pure Power, -Shadow Tag, -Simple, -Speed Boost, -Stakeout, -Tinted Lens, -Water Bubble, -Wonder Guard, 2 Ability Clause, -Exeggutor, -Regigigas, -Shedinja, +Drampa, +Exeggutor-Alola, +Gallade, +Haunter, +Magmortar, +Omastar, +Scrafty, +Toxicroak, +Turtonator, +Vikavolt, +Silvally-Dragon, +Sneasel',
					},
					times: [[5, 30], [12, 30], [18, 30], [23, 30]],
					year: 2022,
				},
			},
		},
	},
};

/* eslint-enable max-len */
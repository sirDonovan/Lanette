import type { IRoomTournamentSchedule } from "./types/tournaments";

/* eslint-disable max-len */

/**
 * Hours are in the same timezone as wherever Lanette is running
 */
export const tournamentSchedules: Dict<IRoomTournamentSchedule> = {
	'tournaments': {
		months: {
			'10': {
				formats: {
					'1': 'pu',
					'2': 'uu',
					'3': 'nu',
					'4': 'monotype',
					'5': 'ru',
					'6': 'doublesou',
					'7': 'ubers',
					'8': 'lc',
					'9': 'ou',
					'10': 'pu',
					'11': 'uu',
					'12': 'nu',
					'13': 'monotype',
					'14': 'ru',
					'15': 'doublesou',
					'16': 'ubers',
					'17': 'lc',
					'18': 'ou',
					'19': 'pu',
					'20': 'uu',
					'21': 'nu',
					'22': 'monotype',
					'23': 'ru',
					'24': 'doublesou',
					'25': 'ubers',
					'26': 'lc',
					'27': 'ou',
					'28': 'pu',
					'29': 'uu',
					'30': 'nu',
					'31': 'monotype',
				},
				times: [[2, 30], [9, 30], [15, 30], [20, 30]],
			},
			'11': {
				formats: {
					'1': 'ru',
					'2': 'doublesou',
					'3': 'ubers',
					'4': 'lc',
					'5': 'ou',
					'6': 'pu',
					'7': 'uu',
					'8': 'nu',
					'9': 'monotype',
					'10': 'ru',
					'11': 'doublesou',
					'12': 'ubers',
					'13': 'lc',
					'14': 'ou',
					'15': 'pu',
					'16': 'ru',
					'17': 'nu',
					'18': 'monotype',
					'19': 'randombattle',
					'20': 'doublesou',
					'21': 'ubers',
					'22': 'lc',
					'23': 'ou',
					'24': 'zu',
					'25': 'uu',
					'26': 'pu',
					'27': 'ru',
					'28': 'nu',
					'29': 'monotype',
					'30': 'randombattle',
				},
				times: [[2, 30], [9, 30], [15, 30], [20, 30]],
			},
		},
	},
	'toursplaza': {
		months: {
			'10': {
				formats: {
					'1': 'LC, sametypeclause',
					'2': 'Shared Power, maxteamsize = 9',
					'3': 'CAP, Stabmons move legality',
					'4': 'BH, -Imposter',
					'5': 'gen 3 ou, gen8Camomons',
					'6': 'omotm',
					'7': 'ZU, Inverse Mod',
					'8': 'Ubers, !Obtainable Abilities, -Arena Trap, -Comatose, -Contrary, -Fluffy, -Fur Coat, -Gorilla Tactics, -Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword, -Libero, -Moody, -Neutralizing Gas, -Parental Bond, -Protean, -Pure Power, -Shadow Tag, -Simple, -Stakeout, -Speed Boost, -Water Bubble, -Wonder Guard, -Calyrex-Shadow, -Marshadow, -Shedinja, -Urshifu-Single-Strike, 2 Ability Clause, Dynamax Clause',
					'9': 'gen 7 Doubles OU, -protect, -detect, -trick room',
					'10': 'uu, +UUBL',
					'11': 'Stabmons, !Obtainable Abilities, 2 Ability Clause, -Arena Trap, -Comatose, -Contrary, -Fluffy, -Fur Coat, -Gorilla Tactics, -Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword, -Libero, -Moody, -Neutralizing Gas, -Parental Bond, -Poison Heal, -Protean, -Pure Power, -Shadow Tag, -Simple, -Stakeout, -Speed Boost, -Tinted Lens, -Water Bubble, -Wonder Guard, *Dragon Ascent, *Glacial Lance, *No Retreat, *Transform, *V-create, *Wicked Blow, -Electrify, +Precipice Blades, -Archeops, -Blacephalon, -Chandelure, -Keldeo, -Landorus-Therian, -Latios, -Magearna, -Melmetal, -Regigigas, -Shedinja, -Terrakion, -Thundurus, -Victini, -Volcarona, -Zeraora, +Darmanitan, +Darmanitan-Galar, +Dracovish, +Gengar, +Landorus-Base, +Mamoswine, +Porygon-Z, +Zapdos-Galar',
					'12': 'Mix and Mega, gen8 Tier Shift, +Uber, +Damp Rock, +Heat Rock, -Arctovish, -Arctozolt',
					'13': 'random battle, team preview, maxteamsize = 10, pickedteamsize = 6, Dynamax Clause',
					'14': 'gen 3 ou, -sandstorm',
					'15': 'NFE, - Eviolite, item clause',
					'16': 'gen 6 UU, inverse mod, gen8camomons',
					'17': 'National dex, -all pokemon, +Cursola, +Grapploct, +Perrserker, +Plusle, +Carracosta, +Ditto',
					'18': 'random doubles battle',
					'19': 'Stabmons, gen 8mix and mega',
					'20': 'PU, +PUBL, +Light Screen',
					'21': 'gen7LC, -Eviolite',
					'22': 'doubles ou, scalemonsmod',
					'23': 'pure hackmons, -Regieleki',
					'24': 'randombattle, inversemod, gen8camomons, gen8sharedpower, scalemonsmod, moody clause',
					'25': 'RU, sametypeclause',
					'26': 'omotm',
					'27': 'gen 7 ubers, -Groudon-Primal',
					'28': 'Trademarked',
					'29': 'Gen 5 OU, -Sand Stream, -Drizzle, -Drought, -Snow Warning',
					'30': 'Natdex UU, gen8camomons',
					'31': 'ag, blitz',
				},
				times: [[5, 30], [12, 30], [18, 30], [23, 30]],
			},
			'11': {
				formats: {
					'1': 'randombattle, maxteamsize = 10, pickedteamsize  = 6, teampreview',
					'2': 'omotm',
					'3': 'Stabmons, !Obtainable Abilities, -Arena Trap, -Comatose, -Contrary, -Fluffy, -Fur Coat, -Gorilla Tactics,' +
						'-Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword, -Libero, -Moody,' +
						'-Neutralizing Gas, -Parental Bond, -Protean, -Pure Power, -Shadow Tag, -Simple, -Stakeout, -Speed Boost,' +
						'-Water Bubble, -Wonder Guard, -Shedinja, 2 Ability Clause, *Transform, *No Retreat, *V-create, -Hypnosis,' +
						'-Sing, -Sleep Powder, +Darmanitan, +Darmanitan-Galar, +Dracovish, +Gengar, +Porygon-Z, -Keldeo, -Terrakion,' +
						'*Wicked Blow, -Zeraora, -Chandelure, -Melmetal, -Electrify, -Volcarona, -Blacephalon, -Tapu Koko,' +
						'-Thundurus, -Archeops, -Zygarde, -Regigigas, +Zygarde-10%, -Tinted Lens, *Glacial Lance, +Landorus-Base,' +
						'-Urshifu, +Mamoswine, +Urshifu-Rapid-Strike, -Landorus-Therian, -Latios, -Magearna, *Oblivion Wing,' +
						'+Clangorous Soul, +Precipice Blades, *Dragon Ascent, -Poison Heal',
					'4': 'gen7battlefactory, inversemod, gen8sharedpower, !moody clause',
					'5': 'lc, camomons, +arena trap, +shadow tag',
					'6': 'uu, firstbloodrule, -heavy-duty boots',
					'7': 'doublesou, +jirachi, +melmetal, +marshadow',
					'8': 'gen5ubers',
					'9': 'camomons, !teampreview, teamtypepreview',
					'10': 'uu, !dynamax clause, maxteamsize = 6, pickedteamsize = 3',
					'11': 'gen7ou',
					'12': 'sharedpower, maxteamsize = 9',
					'13': 'nationaldexmonotype, -tapu lele',
					'14': 'doublesuu, -DUU',
					'15': 'omotm',
					'16': 'nintendocup1997, inverse',
					'17': 'Mix and Mega, STABmons Move Legality,*Acupressure,*Belly Drum,*Bolt Beak,*Boomburst,*Double Iron Bash,' +
						'*Extreme Speed,*Fishious Rend,*Geomancy,*Lovely Kiss,*Shell Smash,*Shift Gear,*Spore,*Thousand Arrows,' +
						'*Transform,*V-create,*Wicked Blow,*Astral Barrage,*Glacial Lance,*Dragapult,*Dragonite,*Kartana,' +
						'*Landorus-Therian,*Tapu Koko,*Zygarde-Base,*Spectrier,*Precipice Blades,*Urshifu-Rapid-Strike, *Genesect',
					'18': 'rubl, +light clay',
					'19': 'gen7pu',
					'20': 'National Dex AG, !Obtainable Formes, OHKO Clause, Evasion Moves Clause, Species Clause, Dynamax Clause,' +
						'Sleep Clause Mod, -Zacian-Crowned, -Gengar-Mega, -Baton Pass',
					'21': 'doublesubers, !Obtainable Abilities, !Obtainable Moves, !Obtainable Misc, !EV Limit, Forme Clause,' +
						'!Species Clause, -Shedinja, -Comatose + Sleep Talk, -Double Iron Bash, -Octolock, -Arena Trap, -Contrary,' +
						'-Gorilla Tactics, -Huge Power, -Illusion, -Innards Out, -Libero, -Moody, -Neutralizing Gas, -Parental Bond,' +
						'-Protean, -Pure Power, -Shadow Tag, -Stakeout, -Water Bubble, -Wonder Guard, -Justified, -Anger Point,' +
						'-Steam Engine, -Stamina, -Rattled, -Wandering Spirit, -Soul-Heart',
					'22': 'monotype, -melmetal, -moltres-galar',
					'23': 'gen3ou, -tauros, -snorlax, -chansey',
					'24': 'pu, -volt switch, -u-turn, -flip turn, -teleport, -parting shot',
					'25': 'zu',
					'26': 'Ubers, Tier Shift, ![Gen 8] OU',
					'27': 'gen4randombattle, inversemod, gen8camomons, gen8sharedpower, scalemonsmod',
					'28': 'nationaldexag',
					'29': 'LC, STABmons Move Legality, *Acupressure, *Belly Drum, *Bolt Beak, *Double Iron Bash, *Electrify,' +
						'*Extreme Speed, *Fishious Rend, *Geomancy, *Glacial Lance, *Lovely Kiss, *Shell Smash, *Shift Gear,' +
						'*Spore, *Thousand Arrows, *V-create, *Wicked Blow, -Porygon',
					'30': 'gen7pu, +publ',
				},
				times: [[5, 30], [12, 30], [18, 30], [23, 30]],
			},
		},
	},
};

/* eslint-enable max-len */
import type { IRoomTournamentSchedule } from "./types/tournaments";

/* eslint-disable max-len */

/**
 * Hours are in the same timezone as wherever Lanette is running
 */
export const tournamentSchedules: Dict<IRoomTournamentSchedule> = {
	'tournaments': {
		months: {
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
			'12': {
				formats: {
					'1': 'doublesou',
					'2': 'ubers',
					'3': 'lc',
					'4': 'ou',
					'5': 'zu',
					'6': 'uu',
					'7': 'pu',
					'8': 'ru',
					'9': 'nu',
					'10': 'monotype',
					'11': 'randombattle',
					'12': 'doublesou',
					'13': 'ubers',
					'14': 'lc',
					'15': 'ou',
					'16': 'zu',
					'17': 'uu',
					'18': 'pu',
					'19': 'ru',
					'20': 'nu',
					'21': 'monotype',
					'22': 'randombattle',
					'23': 'doublesou',
					'24': 'ubers',
					'25': 'lc',
					'26': 'ou',
					'27': 'zu',
					'28': 'uu',
					'29': 'pu',
					'30': 'ru',
					'31': 'nu',
				},
				times: [[2, 30], [9, 30], [15, 30], [20, 30]],
			},
		},
	},
	'toursplaza': {
		months: {
			'11': {
				formats: {
					'1': 'randombattle, maxteamsize = 10, pickedteamsize  = 6, teampreview',
					'2': 'sketchmons',
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
					'8': 'gen6ubers',
					'9': 'camomons, !teampreview, teamtypepreview',
					'10': 'uu, !dynamax clause, maxteamsize = 6, pickedteamsize = 3',
					'11': 'gen7ou',
					'12': 'sharedpower, maxteamsize = 9',
					'13': 'nationaldexmonotype, -tapu lele',
					'14': 'doublesuu, -DUU',
					'15': 'aaa doubles',
					'16': 'nintendocup1997, inversemod',
					'17': 'Mix and Mega, STABmons Move Legality,*Acupressure,*Belly Drum,*Bolt Beak,*Boomburst,*Double Iron Bash,' +
						'*Extreme Speed,*Fishious Rend,*Geomancy,*Lovely Kiss,*Shell Smash,*Shift Gear,*Spore,*Thousand Arrows,' +
						'*Transform,*V-create,*Wicked Blow,*Astral Barrage,*Glacial Lance,*Dragapult,*Dragonite,*Kartana,' +
						'*Landorus-Therian,*Tapu Koko,*Zygarde-Base,*Spectrier,*Precipice Blades,*Urshifu-Rapid-Strike, *Genesect',
					'18': 'rubl, +light clay',
					'19': 'gen4uu',
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
					'26': 'Ubers, Tier Shift Mod',
					'27': 'gen4randombattle, inversemod, gen8camomons, gen8sharedpower, scalemonsmod',
					'28': 'nationaldexag',
					'29': 'LC, STABmons Move Legality, *Acupressure, *Belly Drum, *Bolt Beak, *Double Iron Bash, *Electrify,' +
						'*Extreme Speed, *Fishious Rend, *Geomancy, *Glacial Lance, *Lovely Kiss, *Shell Smash, *Shift Gear,' +
						'*Spore, *Thousand Arrows, *V-create, *Wicked Blow, -Porygon',
					'30': 'gen7pu, +publ',
				},
				times: [[5, 30], [12, 30], [18, 30], [23, 30]],
			},
			'12': {
				formats: {
					'1': 'randombattle, flippedmod',
					'2': 'aaa, Tier Shift Mod, -Tinted Lens, -Damp Rock, -Eviolite, -Heat Rock, -Light Ball, -Absol, -Arctovish, -Bellossom, -Guzzlord, -Marowak-Base, -Sneasel, -Talonflame, +Cinderace, +Darmanitan-Galar, +Dracovish, +Genesect, +Landorus, +Magearna, +Palkia, +Solgaleo, +Spectrier, +Yveltal',
					'3': 'lc, STABmons Move Legality, *Acupressure, *Belly Drum, *Bolt Beak, *Double Iron Bash, *Electrify, *Extreme Speed, *Fishious Rend, *Geomancy, *Glacial Lance, *Lovely Kiss, *Shell Smash, *Shift Gear, *Spore, *Thousand Arrows, *V-create, *Wicked Blow, -Porygon',
					'4': 'monotype, -moltres-galar, -kyurem',
					'5': 'roas',
					'6': 'pu, -heavy-duty boots',
					'7': 'dou, Camomons, !Sleep Clause Mod, +Darmanitan-Galar, +Heracross, +Hydreigon, +Kyurem, +Zeraora, +Arena Trap',
					'8': 'omotm',
					'9': 'gen4ou',
					'10': 'sharedpower, Tier Shift Mod, -Damp Rock, -Eviolite, -Heat Rock',
					'11': 'stabmons, !Obtainable Abilities, 2 Ability Clause, -Arena Trap, -Comatose, -Contrary, -Fluffy, -Fur Coat, -Gorilla Tactics, -Huge Power, -Ice Scales, -Illusion, -Imposter, -Innards Out, -Intrepid Sword, -Libero, -Moody, -Neutralizing Gas, -Parental Bond, -Poison Heal, -Protean, -Pure Power, -Shadow Tag, -Simple, -Stakeout, -Speed Boost, -Tinted Lens, -Water Bubble, -Wonder Guard, *Dragon Ascent, *Glacial Lance, *No Retreat, *Transform, *V-create, *Wicked Blow, -Electrify, +Precipice Blades, -Archeops, -Blacephalon, -Chandelure, -Keldeo, -Landorus-Therian, -Latios, -Magearna, -Melmetal, -Regigigas, -Shedinja, -Terrakion, -Thundurus, -Victini, -Volcarona, -Zeraora, +Darmanitan, +Darmanitan-Galar, +Dracovish, +Garchomp, +Gengar, +Landorus-Base, +Mamoswine, +Porygon-Z, +Tapu Bulu, +Zapdos-Galar',
					'12': 'gen6battlefactory, inversemod, gen8camomons',
					'13': 'rubl',
					'14': 'mnm, Picked Team Size = 1, Max Team Size = 3, -Focus Sash, -Bright Powder, -Focus Band, -Lax Incense, -Quick Claw, -Perish Song',
					'15': 'duu, -duu',
					'16': 'gen5randombattle, inversemod, gen8camomons, scalemonsmod, gen8sharedpower, !moody clause',
					'17': 'nationaldexag, !dynamax clause, !sleep clause mod, !species clause',
					'18': 'roas2',
					'19': 'lc, gen8camomons, +arena trap, +shadow tag',
					'20': 'randombattle, maxteamsize = 10, pickedteamsize = 6, team preview',
					'21': 'omotm2',
					'22': 'zu',
					'23': "godlygift, Same Type Clause, +Blissey, +Chansey, -Bright Powder, -Damp Rock, -Focus Band, -King's Rock, -Lax Incense, -Quick Claw, -Terrain Extender, -AG ++ Uber ++ Blaziken ++ Kartana ++ Power Construct > 1",
					'24': "mnm, STABmons Move Legality,*Acupressure,*Astral Barrage,*Belly Drum,*Bolt Beak,*Boomburst,*Clangorous Soul,*Double Iron Bash,*Extreme Speed,*Fishious Rend,*Geomancy,*Glacial Lance,*Lovely Kiss,*Precipice Blades,*Shell Smash,*Shift Gear,*Sleep Powder,*Spore,*Thousand Arrows,*Transform,*V-create,*Wicked Blow,*Dragapult,*Dragonite,*Genesect,*Kartana,*Keldeo,*Landorus-Therian,*Tapu Koko,*Thundurus,*Thundurus-Therian,*Zeraora,*Zygarde-Base,-King's Rock",
					'25': 'roas3',
					'26': 'nu, !dynamax clause, maxteamsize = 6, pickedteamsize = 3, adjustlevel = 50',
					'27': 'cap1v1, Shared Power, Camomons, Inverse Mod, Scalemons Mod, !! Max Team Size = 6, !! Picked Team Size = 6',
					'28': 'doublesubers, !Obtainable Abilities, !Obtainable Moves, !Obtainable Misc, !EV Limit, Forme Clause, !Species Clause, -Shedinja, -Comatose + Sleep Talk, -Double Iron Bash, -Octolock, -Arena Trap, -Contrary, -Gorilla Tactics, -Huge Power, -Illusion, -Innards Out, -Libero, -Moody, -Neutralizing Gas, -Parental Bond, -Protean, -Pure Power, -Shadow Tag, -Stakeout, -Water Bubble, -Wonder Guard, -Justified, -Anger Point, -Steam Engine, -Stamina, -Rattled, -Wandering Spirit, -Soul-Heart',
					'29': 'bdspou',
					'30': 'gen7ubers',
					'31': 'vgc2021series11',
				},
				times: [[5, 30], [12, 30], [18, 30], [23, 30]],
			},
		},
	},
};

/* eslint-enable max-len */
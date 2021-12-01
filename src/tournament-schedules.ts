import type { IRoomTournamentSchedule } from "./types/tournaments";

/* eslint-disable max-len */

/**
 * Hours are in the same timezone as wherever Lanette is running
 */
export const tournamentSchedules: Dict<IRoomTournamentSchedule> = {
	'tournaments': {
		months: {
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
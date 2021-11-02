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
		},
	},
};

/* eslint-enable max-len */
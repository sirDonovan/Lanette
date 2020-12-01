import type { IRoomTournamentSchedule } from "./types/tournaments";

/**
 * Hours are in the same timezone as wherever Lanette is running
 */
export const tournamentSchedules: Dict<IRoomTournamentSchedule> = {
	'tournaments': {
		months: {
			'11': {
				formats: {
					'1': 'pu',
					'2': 'uu',
					'3': 'nu',
					'4': 'ru',
					'5': 'ubers',
					'6': 'lc',
					'7': 'ou',
					'8': 'pu',
					'9': 'uu',
					'10': 'nu',
					'11': 'ru',
					'12': 'ubers',
					'13': 'lc',
					'14': 'ou',
					'15': 'pu',
					'16': 'uu',
					'17': 'nu',
					'18': 'ru',
					'19': 'ubers',
					'20': 'lc',
					'21': 'ou',
					'22': 'pu',
					'23': 'uu',
					'24': 'nu',
					'25': 'ru',
					'26': 'ubers',
					'27': 'lc',
					'28': 'ou',
					'29': 'pu',
					'30': 'uu',
				},
				times: [[20, 30], [2, 30], [9, 30], [15, 30]],
			},
			'12': {
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
					'31': 'monotype',
				},
				times: [[20, 30], [2, 30], [9, 30], [15, 30]],
			},
		},
	},
	'toursplaza': {
		months: {
			'11': {
				formats: {
					'1': '[Gen 8] STABmons @@@!Obtainable Abilities,-Arena Trap,-Comatose,-Contrary,-Fluffy,-Fur Coat,' +
						'-Gorilla Tactics,-Huge Power,-Ice Scales,-Illusion,-Imposter,-Innards Out,-Intrepid Sword,-Libero,' +
						'-Moody,-Neutralizing Gas,-Parental Bond,-Protean,-Pure Power,-Shadow Tag,-Simple,-Stakeout,-Speed Boost,' +
						'-Water Bubble,-Wonder Guard,-Shedinja,2 Ability Clause,*Transform,*No Retreat,*V-create,-Hypnosis,-Sing,' +
						'-Sleep Powder,+Darmanitan,+Darmanitan-Galar,+Dracovish,+Gengar,+Porygon-Z,-Keldeo,-Terrakion,-Wicked Blow,' +
						'-Zeraora,-Chandelure,-Melmetal,-Electrify,-Volcarona,-Blacephalon,-dragonite,-tapu koko,-thundurus,' +
						'-thundurus-therian,-archeops,-zygarde,-regigigas',
					'2': '[Gen 4] UU @@@+UUBL',
					'3': 'gen7balancedhackmons',
					'4': '[Gen 8] LC @@@Same type clause',
					'5': 'gen8purehackmons',
					'6': '[Gen 7] RU @@@+RUBL',
					'7': '[Gen 8] Doubles OU @@@!Dynamax Clause',
					'8': '[Gen 7] OU @@@+Aegislash, +zygarde 50%, +blaziken, +darkrai, +genesect, +kangaskhan mega,' +
						'+landorus incarnate, +solgaleo, +pheromosa, +shaymin sky, +metagross mega, +arena trap, +deoxys defense,' +
						'+deoxys normal, -deoxys speed, -deoxys attack',
					'9': '[Gen 6] OU @@@!Team preview',
					'10': 'gen8ou@@@blitz',
					'11': '[Gen 3] OU @@@+Choice scarf, +Choice Specs',
					'12': '[Gen 8] Camomons @@@!Obtainable Abilities,-Arena Trap,-Comatose,-Contrary,-Fluffy,-Fur Coat,' +
						'-Gorilla Tactics,-Huge Power,-Ice Scales,-Illusion,-Imposter,-Innards Out,-Intrepid Sword,-Libero,-Moody,' +
						'-Neutralizing Gas,-Parental Bond,-Protean,-Pure Power,-Shadow Tag,-Simple,-Stakeout,-Speed Boost,-Water Bubble,' +
						'-Wonder Guard,-Shedinja,2 Ability Clause,+Darmanitan-Galar',
					'13': 'gen7battlefactory',
					'14': 'gen8nationaldexmonotype',
					'15': '[Gen 8] Mix And Mega @@@+Gengar,+Zeraora,+Arena Trap,+Shadow Tag,+Moody,+Darmanitan-Galar,+Dracovish,' +
						'+Eternatus,+Kyurem-Black,+Kyurem-White,+Lunala,+Marshadow,+Melmetal,+Mewtwo,+Necrozma-Dawn-Wings,' +
						'+Necrozma-Dusk-Mane,+Reshiram,+Solgaleo,+Zacian,+Zacian-Crowned,+Zamazenta,+Zamazenta-Crowned,+Zekrom,' +
						'+calyrex ice,+calyrex shadow,+kyogre,+Ho-Oh,+dialga,+giratina,+giratina origin,+lugia,+palkia,+rayquaza,' +
						'+xerneas,+yveltal',
					'16': '[Gen 8] Random Battle @@@Inverse Mod, Gen8camomons',
					'17': '[Gen 6] UU@@@+UUBL, +Heracross Mega, +Dugtrio',
					'18': 'gen7superstaffbrosbrawl',
					'19': 'gen4ubers',
					'20': '[Gen 8] Ubers @@@-Calyrex Shadow',
					'21': '[Gen 8] Camomons @@@-OU, -Heracross, -drought',
					'22': '[Gen 6] OU @@@stabmonsmovelegality,-Aerodactyl-Mega,-Altaria-Mega,-Diggersby,-Kyurem-Black,-Metagross-Mega,' +
						'-Porygon-Z,-Thundurus-Base,-Razor Fang,-King\'s Rock,*Acupressure,*Belly Drum,*Chatter,*Extreme Speed,*Geomancy,' +
						'*Lovely Kiss,*Shell Smash,*Shift Gear,*Spore,*Thousand Arrows',
					'23': '[Gen 8] Mix and mega @@@+zamazenta crowned,-zacian + rusted sword,*eternatus,*lunala,+damp rock,+heat rock,' +
						'gen8 tier shift,+uber,*zacian',
					'24': '[Gen 7] UU @@@+UUBL',
					'25': '[Gen 5] OU @@@-Drizzle, -Drought, -Snow Warning, -Sand Stream',
					'26': '[Gen 8] 1v1 @@@Blitz',
					'27': '[Gen 7] Doubles OU @@@-Trickroom, -Tail wind',
					'28': '[Gen 8] Inheritance @@@-Chansey,-Doublade,-Magneton,-Porygon2,-Rhydon,-Scyther,-Sneasel,-Type: Null',
					'29': '[Gen 7] UU @@@same type clause',
					'30': 'gen8cap',
				},
				times: [[5, 30], [12, 30], [18, 30], [23, 30]],
			},
			'12': {
				formats: {
					'1': 'gen 8 monotype,gen8camomons',
					'2': 'gen3randombattle',
					'3': 'gen 7 ou,+genesect,+aegislash,+deoxys-s',
					'4': 'gen 8 lc,inverse mod',
					'5': 'bss',
					'6': 'ru,!Obtainable abilities,-comatose,-fluffy,-fur coat,-huge power,-illusion,-imposter,-innards out,' +
						'-parental bond,-protean,-pure power,-simple,- stakeout,-speedboost,-water bubble,-wonder guard,-archeops,' +
						'-regigigas,-shedinja,-terrakion',
					'7': 'battlefactory',
					'8': 'balancedhackmons',
					'9': 'gen 8 uu,STABmons Move Legality,*Astral Barrage,*Belly Drum,*Bolt Beak,*Double Iron Bash,*Electrify,' +
						'*Extreme Speed,*Fishious Rend,*Geomancy,*Lovely Kiss,*Shell Smash,*Shift Gear,*Spore,*Thousand Arrows,' +
						'*V-create,*Wicked Blow,-Porygon-Z,-Silvally,-Kings Rock',
					'10': 'nfe',
					'11': 'gen7cap',
					'12': 'gen 7 nu,same type clause',
					'13': '1v1',
					'14': 'gen4ubers',
					'15': 'gen 8 pu,gen8camomons',
					'16': 'ubers',
					'17': 'gen 8 uu,inverse mod',
					'18': 'gen1ou',
					'19': 'gen 8 monotype,STABmons Move Legality,*Astral Barrage,*Belly Drum,*Bolt Beak,' +
						'*Double Iron Bash,*Electrify,*Extreme Speed,*Fishious Rend,*Geomancy,*Lovely Kiss,*Shell Smash,*Shift Gear,' +
						'*Spore,*Thousand Arrows,*V-create,*Wicked Blow,-Porygon-Z,-Silvally,-Kings Rock,!Obtainable abilities,' +
						'-comatose,-fluffy,-fur coat,-huge power,-illusion,-imposter,-innards out,-parental bond,-protean,-pure power,' +
						'-simple,- stakeout,-speedboost,-water bubble,-wonder guard,-archeops,-dragonite,-hoopa-unbound,-kartana,' +
						'-keldeo,-regigigas,-slaking,-shedinja,-terrakion,-weavile',
					'20': 'zu',
					'21': 'gen7randombattle',
					'22': 'purehackmons',
					'23': 'anythinggoes',
					'24': 'gen5uu',
					'25': 'mixandmega',
					'26': 'doublesou',
					'27': 'nationaldex',
					'28': 'inheritance',
					'29': 'vgc2020',
					'30': 'gen3ou,-metagross,-celebi,-tyranitar',
					'31': 'randombattle',
				},
				times: [[5, 30], [12, 30], [18, 30], [23, 30]],
			},
		},
	},
};

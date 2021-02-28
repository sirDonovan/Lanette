import type { IRoomTournamentSchedule } from "./types/tournaments";

/**
 * Hours are in the same timezone as wherever Lanette is running
 */
export const tournamentSchedules: Dict<IRoomTournamentSchedule> = {
	'tournaments': {
		months: {
			'2': {
				formats: {
					'1': 'nu',
					'2': 'monotype',
					'3': 'randombattle',
					'4': 'doublesou',
					'5': 'ubers',
					'6': 'lc',
					'7': 'ou',
					'8': 'zu',
					'9': 'uu',
					'10': 'pu',
					'11': 'ru',
					'12': 'nu',
					'13': 'monotype',
					'14': 'randombattle',
					'15': 'doublesou',
					'16': 'ubers',
					'17': 'lc',
					'18': 'ou',
					'19': 'zu',
					'20': 'uu',
					'21': 'pu',
					'22': 'ru',
					'23': 'nu',
					'24': 'monotype',
					'25': 'randombattle',
					'26': 'doublesou',
					'27': 'ubers',
					'28': 'lc',
				},
				times: [[2, 30], [9, 30], [15, 30], [20, 30]],
			},
			'3': {
				formats: {
					'1': 'ou',
					'2': 'zu',
					'3': 'uu',
					'4': 'pu',
					'5': 'ru',
					'6': 'nu',
					'7': 'monotype',
					'8': 'randombattle',
					'9': 'doublesou',
					'10': 'ubers',
					'11': 'lc',
					'12': 'ou',
					'13': 'zu',
					'14': 'uu',
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
					'31': 'doublesou',
				},
				times: [[2, 30], [9, 30], [15, 30], [20, 30]],
			},
		},
	},
	'toursplaza': {
		months: {
			'2': {
				formats: {
					'1': 'gen 7 uu,+uubl,-mega',
					'2': 'tier shift,inverse mod',
					'3': 'doubles ou,!dynamax clause',
					'4': 'gen 5 random battle',
					'5': 'stabmons, !Obtainable Abilities,-Arena Trap,-Comatose,-Contrary,-Fluffy,-Fur Coat,-Gorilla Tactics,' +
						'-Huge Power,-Ice Scales,-Illusion,-Imposter,-Innards Out,-Intrepid Sword,-Libero,-Moody,' +
						'-Neutralizing Gas,-Parental Bond,-Protean,-Pure Power,-Shadow Tag,-Simple,-Stakeout,-Speed Boost,' +
						'-Water Bubble,-Wonder Guard,-Shedinja,2 Ability Clause,*Transform,*No Retreat,*V-create,-Hypnosis,' +
						'-Sing,-Sleep Powder,+Darmanitan,+Darmanitan-Galar,+Dracovish,+Gengar,+Porygon-Z,-Keldeo,-Terrakion,' +
						'*Wicked Blow,-Zeraora,-Chandelure,-Melmetal,-Electrify,-Volcarona,-Blacephalon,-Dragonite,-Tapu Koko,' +
						'-Thundurus,-Archeops,-Zygarde,-Regigigas,+Zygarde-10%,-Tinted Lens,*Glacial Lance,+Landorus-Base,' +
						'-Urshifu,+Mamoswine,+Urshifu-Rapid-Strike',
					'6': 'national dex,-allpokemon,+Blacephalon,+Celesteela,+Kartana,+Buzzwole,+Guzzlord,+Stakataka',
					'7': 'gen 6 lc,same type clause',
					'8': 'random battle,gen 8 shared power,inverse mod',
					'9': 'nfe,!species clause,gen 8 camomons',
					'10': 'gen 3 ou,Little Cup,-Chansey,-Meditite,-Omanyte,-Scyther,-Wynaut,-Zigzagoon,-Dragon Rage,' +
						'-Sonic Boom,-Agility + Baton Pass',
					'11': 'gen 7 Let’s Go OU',
					'12': 'gen 1 random battle,blitz',
					'13': 'pure hackmons,item clause',
					'14': 'gen 4 ou,sinnoh pokedex',
					'15': 'anything goes,!teampreview',
					'16': 'bss factory,!cancel mod',
					'17': 'lc,!dynamax clause',
					'18': 'ou',
					'19': 'gen 7 VGC 2018',
					'20': 'almost any ability,same type clause',
					'21': 'mix and mega,inverse mod',
					'22': 'balanced hackmons,blitz',
					'23': 'gen 3 ou,hoenn pokedex',
					'24': 'gen 4 ubers,-dialga,-palkia',
					'25': 'pu,+publ',
					'26': 'gen 7 ou',
					'27': 'gen 2 ou,+mewtwo',
					'28': 'random battle,gen 8 shared power,inverse mod,gen 8 camomons,scalemons mod,!teampreview',
				},
				times: [[5, 30], [12, 30], [18, 30], [23, 30]],
			},
			'3': {
				formats: {
					'1': 'gen 7 anything goes,same type clause,!team preview',
					'2': 'nu,+nubl',
					'3': 'gen 1 ou,-blizzard,-amnesia',
					'4': 'gen 4 lc,!species clause',
					'5': 'random battle,!cancel mod,gen 8 shared power,scalemons mod,inverse mod',
					'6': 'tier shift,+eviolite',
					'7': 'national dex ag,-allpokemon,+Arceus,+Dialga,+Palkia,+Giratina,+Cresselia,+Darkrai',
					'8': 'gen 5 ou,+heavy duty boots,+utility umbrella',
					'9': 'gen 8 zu,+ Exeggutor-Alola,+Gallade,+Haunter,+Scrafty,+Toxicroak,+Turtonator,+Vikavolt,+Sneasel',
					'10': 'gen 7 vgc 2018,inverse mod',
					'11': 'stabmons,!Obtainable Abilities,-Arena Trap,-Comatose,-Contrary,-Fluffy,-Fur Coat,-Gorilla Tactics,' +
						'-Huge Power,-Ice Scales,-Illusion,-Imposter,-Innards Out,-Intrepid Sword,-Libero,-Moody,-Neutralizing Gas,' +
						'-Parental Bond,-Protean,-Pure Power,-Shadow Tag,-Simple,-Stakeout,-Speed Boost,-Water Bubble,-Wonder Guard,' +
						'-Shedinja,2 Ability Clause,*Transform,*No Retreat,*V-create,-Hypnosis,-Sing,-Sleep Powder,+Darmanitan,' +
						'+Darmanitan-Galar,+Dracovish,+Gengar,+Porygon-Z,-Keldeo,-Terrakion,*Wicked Blow,-Zeraora,-Chandelure,' +
						'-Melmetal,-Electrify,-Volcarona,-Blacephalon,-Dragonite,-Tapu Koko,-Thundurus,-Archeops,-Zygarde,-Regigigas,' +
						'+Zygarde-10%,-Tinted Lens,*Glacial Lance,+Landorus-Base,-Urshifu,+Mamoswine,+Urshifu-Rapid-Strike',
					'12': 'gen 3 ubers,hoenn pokedex',
					'13': 'gen 8 pu,scalemons mod',
					'14': 'gen 6 ru,-all items,+life orb',
					'15': 'monotype,gen 8 camomons',
					'16': 'gen 7 ubers,-red orb,-blue orb',
					'17': 'gen 6 pure hackmons,-wonder guard,-mold breaker,-teravolt,-turboblaze',
					'18': 'nfe,!dynamax clause',
					'19': 'cap,!obtainable abilities,-Beat Up,-Anger Point,-Arena Trap,-Comatose,-Contrary,-Fluffy,-Fur Coat,' +
						'-Gorilla Tactics,-Huge Power,-Ice Scales,-Illusion,-Imposter,-Innards Out,-Intrepid Sword,-Libero,-Moody,' +
						'-Neutralizing Gas,-Parental Bond,-Protean,-Pure Power,-Rattled,-Serene Grace,-Shadow Tag,-Simple,-Soul-Heart,' +
						'-Stakeout,-Steam Engine,-Speed Boost,-Water Bubble,-Wonder Guard,-Kartana,-Kyurem-Black,-Regigigas,-Shedinja,' +
						'-Weakness Policy,2 Ability Clause',
					'20': 'lc,+Corsola-Galar,+Cutiefly,+Drifloon,+Gastly,+Gothita,+Rufflet,+Scyther,+Sneasel,+Swirlix,+Tangela,' +
						'+Vulpix-Alola',
					'21': 'bss factory,!team preview',
					'22': 'dou,!Obtainable Abilities,-Beat Up,-Anger Point,-Arena Trap,-Comatose,-Contrary,-Fluffy,-Fur Coat,' +
						'-Gorilla Tactics,-Huge Power,-Ice Scales,-Illusion,-Imposter,-Innards Out,-Intrepid Sword,-Libero,-Moody,' +
						'-Neutralizing Gas,-Parental Bond,-Protean,-Pure Power,-Rattled,-Serene Grace,-Shadow Tag,-Simple,-Soul-Heart,' +
						'-Stakeout,-Steam Engine,-Speed Boost,-Water Bubble,-Wonder Guard,-Kartana,-Kyurem-Black,-Regigigas,-Shedinja,' +
						'-Weakness Policy,2 Ability Clause',
					'23': 'gen 1 ou,onevsone,Teampreview,-uber ++ ou ++ uu ++ nfe ++ lc > 3,-Hypnosis,-Lovely Kiss,-Sing,-Sleep Powder,' +
						'-Spore,-Bind,-Clamp,-Fire Spin,-Wrap,-Flash,-Kinesis,-Sand Attack,-Smokescreen,-Explosion,-Self-Destruct',
					'24': 'gen 4 ubers,same type clause',
					'25': 'tier shift,!Obtainable Abilities,-Arena Trap,-Comatose,-Contrary,-Fluffy,-Fur Coat,-Gorilla Tactics,' +
						'-Huge Power,-Ice Scales,-Illusion,-Imposter,-Innards Out,-Intrepid Sword,-Libero,-Moody,-Neutralizing Gas,' +
						'-Parental Bond,-Protean,-Pure Power,-Shadow Tag,-Simple,-Speed Boost,-Stakeout,-Tinted Lens,-Water Bubble,' +
						'-Wonder Guard,2 Ability Clause,-Light Ball,-Absol,-Archeops,-Arctovish,-Bellossom,-Shedinja,-Regigigas',
					'26': 'gen 5 ou,sinnoh pokedex,-drought,-drizzle,-snow warning,-sandstream,-hail,-sunny day,-sandstorm,-rain dance',
					'27': 'national dex,-allpokemon,+samurott,+serperior,+emboar,+infernape,+torterra,+empoleon',
					'28': 'gen 7 ru,Z Move Clause',
					'29': 'random doubles battle',
					'30': 'gen 4 uu,+uubl',
					'31': 'ou',
				},
				times: [[5, 30], [12, 30], [18, 30], [23, 30]],
			},
		},
	},
};

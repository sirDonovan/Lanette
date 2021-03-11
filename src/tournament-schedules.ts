import type { IRoomTournamentSchedule } from "./types/tournaments";

/**
 * Hours are in the same timezone as wherever Lanette is running
 */
export const tournamentSchedules: Dict<IRoomTournamentSchedule> = {
	'tournaments': {
		months: {
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
					'16': 'doublesou',
					'17': 'ubers',
					'18': 'monotype',
					'19': 'ou',
					'20': 'lc',
					'21': 'uu',
					'22': 'pu',
					'23': 'ru',
					'24': 'nu',
					'25': 'doublesou',
					'26': 'ubers',
					'27': 'monotype',
					'28': 'ou',
					'29': 'lc',
					'30': 'uu',
					'31': 'pu',
				},
				times: [[2, 30], [9, 30], [15, 30], [20, 30]],
			},
			'4': {
				formats: {
					'1': 'ru',
					'2': 'nu',
					'3': 'doublesou',
					'4': 'ubers',
					'5': 'monotype',
					'6': 'ou',
					'7': 'lc',
					'8': 'uu',
					'9': 'pu',
					'10': 'ru',
					'11': 'nu',
					'12': 'doublesou',
					'13': 'ubers',
					'14': 'monotype',
					'15': 'ou',
					'16': 'lc',
					'17': 'uu',
					'18': 'pu',
					'19': 'ru',
					'20': 'nu',
					'21': 'doublesou',
					'22': 'ubers',
					'23': 'monotype',
					'24': 'ou',
					'25': 'lc',
					'26': 'uu',
					'27': 'pu',
					'28': 'ru',
					'29': 'nu',
					'30': 'doublesou',
				},
				times: [[2, 30], [9, 30], [15, 30], [20, 30]],
			},
			'5': {
				formats: {
					'1': 'ubers',
					'2': 'monotype',
					'3': 'ou',
					'4': 'lc',
					'5': 'uu',
					'6': 'pu',
					'7': 'ru',
					'8': 'nu',
					'9': 'doublesou',
					'10': 'ubers',
					'11': 'monotype',
					'12': 'ou',
					'13': 'lc',
					'14': 'uu',
					'15': 'pu',
					'16': 'ru',
					'17': 'nu',
					'18': 'doublesou',
					'19': 'ubers',
					'20': 'monotype',
					'21': 'ou',
					'22': 'lc',
					'23': 'uu',
					'24': 'pu',
					'25': 'ru',
					'26': 'nu',
					'27': 'doublesou',
					'28': 'ubers',
					'29': 'monotype',
					'30': 'ou',
					'31': 'lc',
				},
				times: [[2, 30], [9, 30], [15, 30], [20, 30]],
			},
		},
	},
	'toursplaza': {
		months: {
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
					'11': 'stabmons,!Obtainable Abilities,-Arena Trap,-Comatose,-Contrary,-Fluffy,-Fur Coat,-Gorilla Tactics,-Huge Power,' +
						'-Ice Scales,-Illusion,-Imposter,-Innards Out,-Intrepid Sword,-Libero,-Moody,-Neutralizing Gas,-Parental Bond,' +
						'-Protean,-Pure Power,-Shadow Tag,-Simple,-Stakeout,-Speed Boost,-Water Bubble,-Wonder Guard,-Shedinja,' +
						'2 Ability Clause,*Transform,*No Retreat,*V-create,-Hypnosis,-Sing,-Sleep Powder,+Darmanitan,+Darmanitan-Galar,' +
						'+Dracovish,+Gengar,+Porygon-Z,-Keldeo,-Terrakion,*Wicked Blow,-Zeraora,-Chandelure,-Melmetal,-Electrify,' +
						'-Volcarona,-Blacephalon,-Tapu Koko,-Thundurus,-Archeops,-Zygarde,-Regigigas,+Zygarde-10%,-Tinted Lens,' +
						'*Glacial Lance,+Landorus-Base,-Urshifu,+Mamoswine,+Urshifu-Rapid-Strike,-Landorus-Therian,-Latios,*Oblivion Wing',
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

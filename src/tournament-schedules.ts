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
					'9': 'gen 8 zu,+Exeggutor-Alola,+Gallade,+Haunter,+Scrafty,+Toxicroak,+Turtonator,+Vikavolt,+Sneasel',
					'10': 'gen 7 vgc 2018,inverse mod',
					'11': 'stabmons,!Obtainable Abilities,-Arena Trap,-Comatose,-Contrary,-Fluffy,-Fur Coat,-Gorilla Tactics,-Huge Power,' +
						'-Ice Scales,-Illusion,-Imposter,-Innards Out,-Intrepid Sword,-Libero,-Moody,-Neutralizing Gas,-Parental Bond,' +
						'-Protean,-Pure Power,-Shadow Tag,-Simple,-Stakeout,-Speed Boost,-Water Bubble,-Wonder Guard,-Shedinja,' +
						'2 Ability Clause,*Transform,*No Retreat,*V-create,-Hypnosis,-Sing,-Sleep Powder,+Darmanitan,+Darmanitan-Galar,' +
						'+Dracovish,+Gengar,+Porygon-Z,-Keldeo,-Terrakion,*Wicked Blow,-Zeraora,-Chandelure,-Melmetal,-Electrify,' +
						'-Volcarona,-Blacephalon,-Tapu Koko,-Thundurus,-Archeops,-Zygarde,-Regigigas,+Zygarde-10%,-Tinted Lens,' +
						'*Glacial Lance,+Landorus-Base,-Urshifu,+Mamoswine,+Urshifu-Rapid-Strike,-Landorus-Therian,-Latios,*Oblivion Wing',
					'12': 'gen 3 ubers,hoenn pokedex',
					'13': 'gen 8 pu,Scalemons Mod,-Eviolite,-Light Ball,-Rain Dance,-Sunny Day,-Darumaka,-Darumaka-Galar,-Gastly,' +
						'-Arena Trap,-Huge Power,-Moody,-Shadow Tag,Overflow Stat Mod',
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
			'4': {
				formats: {
					'1': 'randombattle,[Gen 8] Shared Power,[Gen 8] Camomons,Flipped Mod,350 Cup Mod,Inverse Mod,Scalemons Mod,' +
						'gen8tiershift,Blitz,!Dynamax Clause,!Team Preview,!Cancel Mod',
					'2': 'ou,Alphabet Cup Move Legality,*Acupressure,*Baton Pass,-Astral Barrage,-Bolt Beak,-Double Iron Bash,-Electrify,' +
						'-Geomancy,-Glacial Lance,-Lovely Kiss,-Shell Smash,-Shift Gear,-Sleep Powder,-Spore,-Surging Strikes,' +
						'-Thousand Arrows,+Magearna,+Zamazenta,+Zamazenta-Crowned',
					'3': 'ag,gen8sharedpower,+Calyrex-Ice,+Calyrex-Shadow,+Darmanitan-Galar,+Dialga,+Dracovish,+Eternatus,+Genesect,' +
						'+Giratina,+Giratina-Origin,+Groudon,+Ho-Oh,+Kyogre,+Kyurem-Black,+Kyurem-White,+Lugia,+Lunala,+Magearna,' +
						'+Marshadow,+Melmetal,+Mewtwo,+Naganadel,+Necrozma-Dawn-Wings,+Necrozma-Dusk-Mane,+Palkia,+Pheromosa,+Rayquaza,' +
						'+Reshiram,+Shedinja,+Solgaleo,+Urshifu-Base,+Urshifu-Rapid-Strike,+Xerneas,+Yveltal,+Zacian,+Zacian-Crowned,' +
						'+Zamazenta,+Zamazenta-Crowned,+Zekrom,+Arena Trap,+Contrary,+Drizzle ++ Swift Swim,+Drought ++ Chlorophyll,' +
						'+Electric Surge ++ Surge Surfer,+Fur Coat,+Guts,+Harvest,+Huge Power,+Imposter,+Innards Out,+Libero,' +
						'+Magic Bounce,+Magic Guard,+Magnet Pull,+Mold Breaker,+Moody,+Neutralizing Gas,+Power Construct,' +
						'+Queenly Majesty,+Quick Draw,+Regenerator,+Sand Rush,+Sand Veil,+Shadow Tag,+Simple,+Slush Rush,+Snow Cloak,' +
						'+Speed Boost,+Stakeout,+Steelworker ++ Steely Spirit,+Tinted Lens,+Unaware,+Unburden,+Water Bubble,' +
						'+Baton Pass,-Regenerator ++Wimp Out,-Regenerator ++ Emergency Exit,+Triage,!OHKO Clause,!Dynamax Clause,' +
						'!Species Clause,!Evasion Moves Clause',
					'4': 'camomons,!Obtainable Abilities,-Arena Trap,-Comatose,-Contrary,-Fluffy,-Fur Coat,-Gorilla Tactics,' +
						'-Huge Power,-Ice Scales,-Illusion,-Imposter,-Innards Out,-Intrepid Sword,-Libero,-Moody,-Neutralizing Gas,' +
						'-Parental Bond,-Power Construct,-Protean,-Pure Power,-Shadow Tag,-Simple,-Stakeout,-Speed Boost,' +
						'-Water Bubble,-Wonder Guard,-Archeops,-Regigigas,+Darmanitan-Galar,2 Ability Clause',
					'5': 'ou,+Aloraichium Z,+Buginium Z,+Darkinium Z,+Decidium Z,+Dragonium Z,+Eevium Z,+Electrium Z,+Fairium Z,' +
						'+Fightinium Z,+Firium Z,+Flyinium Z,+Ghostium Z,+Grassium Z,+Groundium Z,+Incinium Z,+Icium Z,+Kommonium Z,' +
						'+Lunalium Z,+Lycanium Z,+Marshadium Z,+Mewnium Z,+Mimikium Z,+Normalium Z,+Pikanium Z,+Pikashunium Z,' +
						'+Primarium Z,+Poisonium Z,+Psychium Z,+Rockium Z,+Snorlium Z,+Solganium Z,+Steelium Z,+Tapunium Z,' +
						'+Ultranecrozium Z,+Waterium Z',
					'6': 'doublesou,STABmons Move Legality,-Blissey,-Chansey,-Shedinja,-Silvally,-Snorlax,*Acupressure,' +
						'*Astral Barrage,*Belly Drum,*Bolt Beak,*Decorate,*Diamond Storm,*Double Iron Bash,*Fishious Rend,*Geomancy,' +
						'*Glacial Lance,*Lovely Kiss,*Shift Gear,*Shell Smash,*Spore,*Thousand Arrows,-Swift Swim',
					'7': 'gen1outradeback',
					'8': 'natdex,!Cancel Mod,VGC Timer',
					'9': 'gen5ou,+Drizzle ++ Swift Swim,+Drought ++ Chlorophyll,+Sand Rush',
					'10': 'purehackmons,-Eternatus-Eternamax',
					'11': 'uu,-All Abilities,!Obtainable Abilities,+No Ability',
					'12': 'tiershift,Same Type Clause',
					'13': '1v1,!Dynamax Clause,!OHKO Clause,!Evasion Moves Clause,!Accuracy Moves Clause,+Calyrex-Ice,+Calyrex-Shadow,' +
						'+Cinderace,+Dialga,+Dragonite,+Eternatus,+Giratina,+Giratina-Origin,+Groudon,+Ho-Oh,+Kyogre,+Kyurem-Black,' +
						'+Kyurem-White,+Lugia,+Lunala,+Magearna,+Marshadow,+Melmetal,+Mew,+Mewtwo,+Mimikyu,+Necrozma-Dawn-Wings,' +
						'+Necrozma-Dusk-Mane,+Palkia,+Rayquaza,+Reshiram,+Sableye,+Solgaleo,+Victini,+Xerneas,+Yveltal,+Zacian,' +
						'+Zacian-Crowned,+Zamazenta,+Zamazenta-Crowned,+Zekrom,+Moody,+Focus Sash,+Perish Song,Standard NatDex,' +
						'!Species Clause',
					'14': 'mixandmega,!Species Clause,!Nickname Clause,!OHKO Clause,!Evasion Moves Clause,!Dynamax Clause,' +
						'!Sleep Clause Mod,+Uber,+Beedrillite,+Blazikenite,+Gengarite,+Kangaskhanite,+Mawilite,+Medichamite,' +
						'+Pidgeotite,+Moody,+Shadow Tag,+Baton Pass,+Electrify,+Calyrex-Ice,+Calyrex-Shadow,+Dialga,+Eternatus,' +
						'+Giratina,+Giratina-Origin,+Groudon,+Ho-oh,+Kyogre,+Kyurem-Black,+Kyurem-White,+Lugia,+Lunala,+Marshadow,' +
						'+Melmetal,+Mewtwo,+Naganadel,+Necrozma-Dawn-Wings,+Necrozma-Dusk-Mane,+Palkia,+Rayquaza,+Regigigas,' +
						'+Reshiram,+Solgaleo,+Urshifu-Base,+Xerneas,+Yveltal,+Zacian,+Zacian-Crowned,+Zamazenta,+Zamazenta-Crowned,' +
						'+Zekrom,+Zygarde-Complete',
					'15': 'trademarked,+Calyrex-Ice, +Darmanitan-Galar,+Dialga,+Dracovish,+Dragapult,+Eternatus,+Kyurem-Black,' +
						'+Kyurem-White,+Giratina,+Giratina-Origin,+Genesect,+Groudon,+Ho-Oh,+Kartana,+Kyogre,+Lugia,+Lunala,+Magearna,' +
						'+Marshadow,+Melmetal,+Mewtwo,+Naganadel,+Necrozma-Dawn-Wings,+Necrozma-Dusk-Mane,+Palkia,+Pheromosa,' +
						'+Rayquaza,+Reshiram,+Solgaleo,+Urshifu-Base,+Xerneas,+Yveltal,+Zacian,+Zacian-Crowned,+Zamazenta,' +
						'+Zamazenta-Crowned,+Zekrom,+Zygarde-Base,+Arena Trap,+Moody,+Power Construct,+Shadow Tag',
					'16': 'pu,350cupmod',
					'17': 'ubers,-allpokemon,+pikachu,+dragonite,+gengar,+lucario,+farfetch\'d-galar,+dracovish',
					'18': 'letsgoou,!teampreview',
					'19': 'doublesubers,!Obtainable Abilities,!Obtainable Moves,!Obtainable Formes,!Obtainable Misc,Forme Clause,' +
						'!Species Clause,-Shedinja,-Comatose +Sleep Talk,-Double Iron Bash,-Octolock,-Arena Trap,-Contrary,' +
						'-Gorilla Tactics,-Huge Power,-Illusion,-Innards Out,-Libero,-Moody,-Neutralizing Gas,-Parental Bond,' +
						'-Protean,-Pure Power,-Shadow Tag,-Stakeout,-Water Bubble,-Wonder Guard,-Justified,-Anger Point,' +
						'-Steam Engine,-Stamina,-Rattled,-Wandering Spirit,-Soul-Heart',
					'20': 'godlygift',
					'21': 'gen6ag,STABmons Move Legality',
					'22': 'cap,-All Pokemon,Scalemons Mod,+CAP LC,+CAP NFE',
					'23': 'natureswap,inversemod',
					'24': 'nationaldexag,!Obtainable Formes',
					'25': '2v2,!Species Clause,-All Pokemon,-All Moves,+Arceus,-Arceus > 2,!Obtainable Abilities,!Obtainable Moves,' +
						'!Obtainable Misc,+move: Metronome,-Cheek Pouch,-Cursed Body,-Dry Skin,-Fluffy,-Fur Coat,-Gorilla Tactics,' +
						'-Grassy Surge,-Huge Power,-Ice Body,-Iron Barbs,-Libero,-Moody,-Neutralizing Gas,-Parental Bond,' +
						'-Perish Body,-Poison Heal,-Power Construct,-Pressure,-Protean,-Pure Power,-Rain Dish,-Rough Skin,' +
						'-Sand Spit,-Sand Stream,-Snow Warning,-Stamina,-Volt Absorb,-Water Absorb,-Wonder Guard,-Aguav Berry,' +
						'-Assault Vest,-Berry,-Berry Juice,-Berserk Gene,-Black Sludge,-Enigma Berry,-Figy Berry,-Gold Berry,' +
						'-Iapapa Berry,-Leftovers,-Mago Berry,-Steel Memory,-Oran Berry,-Rocky Helmet,-Shell Bell,-Sitrus Berry,' +
						'-Wiki Berry,-Harvest +Jaboca Berry,-Harvest +Rowap Berry,+Judgment,+Draco Plate,+Dread Plate,' +
						'+Earth Plate,+Fist Plate,+Flame Plate,+Icicle Plate,+Insect Plate,+Iron Plate,+Meadow Plate,+Mind Plate,' +
						'+Pixie Plate,+Sky Plate,+Splash Plate,+Spooky Plate,+Stone Plate,+Toxic Plate,+Zap Plate',
					'26': 'lc, [Gen 8] Camomons,+Arena Trap,+Shadow Tag',
					'27': 'gen7battlefactory,[Gen 8] Shared Power,!Moody Clause',
					'28': 'nu,Flipped Mod',
					'29': 'gen6battlespottriples,-All Items,+item: Choice Scarf,+item: Choice Band,+item: Choice Specs,!Item Clause',
					'30': 'ubers,!Obtainable Abilities,-Arena Trap,-Comatose,-Contrary,-Fluffy,-Fur Coat,-Gorilla Tactics,-Huge Power,' +
						'-Ice Scales,-Illusion,-Imposter,-Innards Out,-Intrepid Sword,-Libero,-Moody,-Neutralizing Gas,-Parental Bond,' +
						'-Protean,-Pure Power,-Shadow Tag,-Simple,-Stakeout,-Speed Boost,-Water Bubble,-Wonder Guard,-Calyrex-Shadow,' +
						'-Shedinja,-Urshifu-Single-Strike,2 Ability Clause,Dynamax Clause',
				},
				times: [[5, 30], [12, 30], [18, 30], [23, 30]],
			},
		},
	},
};

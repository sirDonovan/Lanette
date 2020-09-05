import type { IRoomTournamentSchedule } from "./types/tournaments";

/**
 * Hours are in the same timezone as wherever Lanette is running
 */
export const tournamentSchedules: Dict<IRoomTournamentSchedule> = {
	'tournaments': {
		months: {
			'8': {
				formats: {
					'1': 'zu',
					'2': 'uu',
					'3': 'pu',
					'4': 'ru',
					'5': 'monotype',
					'6': 'nu',
					'7': 'ubers',
					'8': 'doublesou',
					'9': 'lc',
					'10': 'ou',
					'11': 'zu',
					'12': 'uu',
					'13': 'pu',
					'14': 'ru',
					'15': 'monotype',
					'16': 'nu',
					'17': 'ubers',
					'18': 'doublesou',
					'19': 'lc',
					'20': 'ou',
					'21': 'zu',
					'22': 'uu',
					'23': 'pu',
					'24': 'ru',
					'25': 'monotype',
					'26': 'nu',
					'27': 'ubers',
					'28': 'doublesou',
					'29': 'lc',
					'30': 'ou',
					'31': 'zu'
				},
				times: [[20, 30], [2, 30], [9, 30], [15, 30]],
			},
			'9': {
				formats: {
					'1': 'uu',
					'2': 'pu',
					'3': 'ru',
					'4': 'monotype',
					'5': 'nu',
					'6': 'ubers',
					'7': 'doublesou',
					'8': 'lc',
					'9': 'ou',
					'10': 'zu',
					'11': 'uu',
					'12': 'pu',
					'13': 'ru',
					'14': 'monotype',
					'15': 'nu',
					'16': 'ubers',
					'17': 'doublesou',
					'18': 'lc',
					'19': 'ou',
					'20': 'zu',
					'21': 'uu',
					'22': 'pu',
					'23': 'ru',
					'24': 'monotype',
					'25': 'nu',
					'26': 'ubers',
					'27': 'doublesou',
					'28': 'lc',
					'29': 'ou',
					'30': 'zu'
				},
				times: [[20, 30], [2, 30], [9, 30], [15, 30]],
			},
		},
	},
	'toursplaza': {
		months: {
			'8': {
				formats: {
					'1': 'lc@@@same type clause',
					'2': 'camomons',
					'3': 'ru@@@+rubl',
					'4': 'ou@@@-Aguav Berry,-Assault Vest,-Choice Band,-Choice Scarf,-Choice Specs,-Eviolite,-Expert Belt,' +
						'-Figy Berry,-Focus Sash,-Heavy Duty Boots,-Iapapa Berry,-Leftovers,-Life Orb,-Mago Berry,-Mental Herb,' +
						'-Power Herb,-Rocky Helmet,-Wiki Berry',
					'5': 'nfe@@@!obtainable abilities,-Comatose,-Contrary,-Drought,-Ice Scales,-Fluffy,-Fur Coat,-Gorilla Tactics,' +
						'-Huge Power,-Illusion,-Imposter,-Innards Out,-Intrepid Sword,-Libero,-Neutralizing Gas,-Parental Bond,' +
						'-Protean,-Pure Power,-Shadow Tag,-Simple,-Stakeout,-Speed Boost,-Water Bubble,-Wonder Guard,+Ivysaur,' +
						'+Rufflet,-Corsola-Galar,-Kadabra',
					'6': 'gen7ou@@@!team preview',
					'7': 'gen7uu@@@+uubl',
					'8': 'gen7pu@@@same type clause',
					'9': 'gen5ou@@@stabmons move legality,+Darkrai,+Deoxys-d,+Deoxys-s,+Excadrill,+Thundurus,+Tornadus-t,+Landorus',
					'10': 'purehackmons@@@-neutralizing gas',
					'11': 'ou@@@inverse mod',
					'12': 'gen4randombattle',
					'13': 'gen3ubers@@@-Leftovers',
					'14': 'nationaldexag@@@-Choice Band,-Choice Specs,-Choice Scarf',
					'15': 'lc@@@inverse mod,-Munchlax,-Abra',
					'16': '1v1@@@same type clause',
					'17': 'cap@@@stabmons move legality',
					'18': 'doublesou@@@!Dynamax Clause,+Alcremie-Gmax,+Appletun-Gmax,+Butterfree-Gmax,+Centiskorch-Gmax,+Charizard-Gmax,' +
						'+Coalossal-Gmax,+Copperajah-Gmax,+Corviknight-Gmax,+Drednaw-Gmax,+Duraludon-Gmax,+Eevee-Gmax,+Flapple-Gmax,' +
						'+Garbodor-Gmax,+Gengar-Gmax,+Grimmsnarl-Gmax,+Hatterene-Gmax,+Kingler-Gmax,+Lapras-Gmax,+Machamp-Gmax,' +
						'+Meowth-Gmax,+Orbeetle-Gmax,+Pikachu-Gmax,+Sandaconda-Gmax,+Snorlax-Gmax,+Toxtricity-Gmax,' +
						'+Toxtricity-Low-Key-Gmax',
					'19': 'gen6ou@@@inverse mod,-serperior,-diggersby,-Kyurem-black,-snorlax',
					'20': 'nationaldex@@@little cup,-Aipom,-Cutiefly,-Drifloon,-Gothita,-Meditite,-Misdreavus,-Murkrow,' +
						'-Porygon,-Swirlix,-Trapinch,-Vulpix,-Wingull,-Yanma',
					'21': 'gen4ou@@@!obtainable abilities,2 ability clause,-Slaking,-Regigigas,+Mew,+Manaphy,-Adaptability,' +
						'-Arena Trap,-Huge Power,-Pure Power,-Simple,-Shadow Tag,-Speed Boost,-Tinted Lens,-Wonder Guard,' +
						'-Drizzle,-Drought,-Poison Heal',
					'22': 'nu@@@+Dracovish,-Dracovish + Fishious rend',
					'23': 'randombattle@@@gen8camomons,inverse mod',
					'24': 'gen7nu@@@+nubl',
					'25': 'almostanyability@@@gen8camomons,-Zeraora,-Melmetal',
					'26': 'ou',
					'27': 'uu@@@+uubl',
					'28': 'gen7ou@@@+Groudon,+Solgaleo,-Groudon+Red Orb',
					'29': 'balancedhackmons@@@-All pokemon,+LC,+LC Uber,+NFE,+ZU,+PU,-Regigigas,-Slaking',
					'30': 'purehackmons@@@-Neutralizing Gas,-Eternatus Eternamax',
					'31': 'gen5ou@@@-Volt Switch,-Baton Pass,-U-turn',
				},
				times: [[5, 30], [12, 30], [18, 30], [23, 30]],
			},
			'9': {
				formats: {
					'1': 'gen6randombattle@@@inversemod',
					'2': 'Doubles OU@@@-Trick Room,-Tailwind,+Magearna,+Melmetal',
					'3': 'OU@@@-Clefable,-Toxapex',
					'4': '2v2doubles@@@gen8camomons',
					'5': 'gen7pu@@@+PUBL',
					'6': 'gen5ou@@@Not Fully Evolved,-Chansey,-Dusclops,-Fraxure,-Gligar,-Golbat,-Gurdurr,-Haunter,-Machoke,' +
						'-Magmar,-Magneton,-Riolu,-Rhydon,-Piloswine,-Porygon2,-Scyther,-Vigoroth',
					'7': 'gen7uu@@@-Reflect,-Light Screen,-Barrier',
					'8': 'gen4ou@@@Sinnoh Pokedex,+Arceus,+Dialga,+Palkia,+Giratina,-Dragon Dance',
					'9': 'gen3ou@@@Little Cup,-Chansey,-Meditite,-Omanyte,-Scyther,-Wynaut,-Zigzagoon,-Dragon Rage,-Sonic Boom,' +
						'-Agility + Baton Pass',
					'10': 'gen7bssfactory@@@!Team Preview,!Cancel Mod',
					'11': 'ou@@@inverse mod',
					'12': 'gen2ou@@@Inverse Mod,-Chansey,-Tauros,-Snorlax,-Porygon2,-Blissey',
					'13': 'purehackmons@@@-Neutralizing Gas',
					'14': 'stabmons@@@!Obtainable Abilities,-Arena Trap,-Comatose,-Contrary,-Fluffy,-Fur Coat,-Gorilla Tactics,' +
						'-Huge Power,-Ice Scales,-Illusion,-Imposter,-Innards Out,-Intrepid Sword,-Libero,-Moody,-Neutralizing Gas,' +
						'-Parental Bond,-Protean,-Pure Power,-Shadow Tag,-Simple,-Stakeout,-Speed Boost,-Water Bubble,-Wonder Guard,' +
						'-Shedinja,2 Ability Clause,*Transform,*No Retreat,*V-create,-Hypnosis,-Sing,-Sleep Powder,+Darmanitan,' +
						'+Darmanitan-Galar,+Dracovish,+Gengar,+Porygon-Z,-Keldeo,-Terrakion,-Wicked Blow,-Chandelure,-Magearna,' +
						'-Melmetal,-Zeraora',
					'15': 'uu@@@+UUBL',
					'16': 'ou@@@+Mega,+Abomasite,+Absolite,+Charizardite X,+Charizardite Y,+Galladite,+Gardevoirite,+Glalitite,' +
						'+Gyaradosite,+Heracronite,+Lopunnite,+Manectite,+Mawilite,+Medichamite,+Pinsirite,+Sablenite,+Scizorite,' +
						'+Sharpedonite,+Slowbronite,+Steelixite,+Swampertite,+Tyranitarite,+Venusaurite,+Abomasnow-Mega,+Absol-Mega,' +
						'+Charizard-Mega-X,+Charizard-Mega-Y,+Gallade-Mega,+Gardevoir-Mega,+Glalie-Mega,+Gyarados-Mega,+Heracross-Mega,' +
						'+Lopunny-Mega,+Manectric-Mega,+Mawile-Mega,+Medicham-Mega,+Pinsir-Mega,+Sableye-Mega,+Scizor-Mega,' +
						'+Sharpedo-Mega,+Slowbro-Mega,+Steelix-Mega,+Tyranitar-Mega,+Venusaur-Mega',
					'17': 'ubers@@@350cupmod,-Eviolite,-Light Ball,-Pawniard,-Abra',
					'18': 'gen7lc@@@STABmons move legality,-gastly,*acupressure,*belly drum,*extreme speed,*shell smash,*shift gear,' +
						'*spore',
					'19': 'gen5ubers@@@-Drought,-Drizzle,-Dark Void',
					'20': 'gen3uu@@@-Spikes',
					'21': 'gen2ou@@@Same Type Clause,-Snorlax',
					'22': 'cap@@@-U-turn,-Volt Switch,-Teleport,-Flip Turn',
					'23': 'vgc2020@@@-Intimidate',
					'24': 'ru@@@+RUBL',
					'25': 'monotype@@@Inverse Mod',
					'26': 'gen7lc@@@Item Clause',
					'27': 'randombattle@@@Team Preview',
					'28': 'gen4uu@@@+UUBL',
					'29': 'ru@@@Same Type Clause',
					'30': 'ubers@@@!Team Preview',
				},
				times: [[5, 30], [12, 30], [18, 30], [23, 30]],
			},
		},
	},
};

import type { IFormatDataLinks } from "../types/dex";

export const formatLinks: Dict<IFormatDataLinks> = {
	// Gen 8
	'gen8anythinggoes': {
		name: '[Gen 8] Anything Goes',
		info: 'https://www.smogon.com/dex/ss/formats/ag/',
	},
	'gen8ubers': {
		name: '[Gen 8] Ubers',
		info: 'https://www.smogon.com/dex/ss/formats/uber/',
	},
	'gen8ou': {
		name: '[Gen 8] OU',
		info: 'https://www.smogon.com/dex/ss/formats/ou/',
	},
	'gen8uu': {
		name: '[Gen 8] UU',
		info: 'https://www.smogon.com/dex/ss/formats/uu/',
	},
	'gen8ru': {
		name: '[Gen 8] RU',
		info: 'https://www.smogon.com/dex/ss/formats/ru/',
	},
	'gen8nu': {
		name: '[Gen 8] NU',
		info: 'https://www.smogon.com/dex/ss/formats/nu/',
	},
	'gen8pu': {
		name: '[Gen 8] PU',
		info: 'https://www.smogon.com/dex/ss/formats/pu/',
	},
	'gen8lc': {
		name: '[Gen 8] LC',
		info: 'https://www.smogon.com/dex/ss/formats/lc/',
		teams: '3661419',
		viability: '3657374',
	},
	'gen8cap': {
		name: '[Gen 8] CAP',
		info: 'https://www.smogon.com/dex/ss/formats/cap/',
		teams: '3662655',
		viability: '3658514',
	},

	// Gen 7
	'gen7letsgoou': {
		name: "[Gen 7 Let's Go] OU",
		info: '3644015',
		teams: '3645829',
		viability: '3645828',
	},
	'gen7anythinggoes': {
		name: '[Gen 7] Anything Goes',
		info: 'https://www.smogon.com/dex/sm/formats/ag/',
		teams: '3646736',
		viability: '3591711/#post-7171201',
	},
	'gen7ubers': {
		name: '[Gen 7] Ubers',
		info: 'https://www.smogon.com/dex/sm/formats/uber/',
		teams: '3639330',
		viability: '3623296',
		roleCompendium: '3589086',
	},
	'gen7ou': {
		name: '[Gen 7] OU',
		info: 'https://www.smogon.com/dex/sm/formats/ou/',
		teams: '3638845',
		viability: '3621329',
		roleCompendium: '3591882',
	},
	'gen7uu': {
		name: '[Gen 7] UU',
		info: 'https://www.smogon.com/dex/sm/formats/uu/',
		teams: '3621217',
		viability: '3641346',
		roleCompendium: '3640481',
	},
	'gen7ru': {
		name: '[Gen 7] RU',
		info: 'https://www.smogon.com/dex/sm/formats/ru/',
		teams: '3645338',
		viability: '3645873',
		roleCompendium: '3606748',
	},
	'gen7nu': {
		name: '[Gen 7] NU',
		info: 'https://www.smogon.com/dex/sm/formats/nu/',
		teams: '3641525',
		viability: '3645166',
		roleCompendium: '3606163',
	},
	'gen7pu': {
		name: '[Gen 7] PU',
		info: 'https://www.smogon.com/dex/sm/formats/pu/',
		teams: '3611496/#post-7503186',
		viability: '3614892',
		roleCompendium: '3587369/page-10#post-7391532',
	},
	'gen7lc': {
		name: '[Gen 7] LC',
		info: 'https://www.smogon.com/dex/sm/formats/lc/',
		teams: '3639319',
		viability: '3621440',
		roleCompendium: '3591265',
	},
	'gen7doublesou': {
		name: '[Gen 7] Doubles OU',
		info: 'https://www.smogon.com/dex/sm/formats/doubles/',
		teams: '3645990',
		viability: '3623347',
		roleCompendium: '3596782',
	},
	'gen7doublesubers': {
		name: '[Gen 7] Doubles Ubers',
		teams: '3635755/#post-7800799',
	},
	'gen7battlespotsingles': {
		name: '[Gen 7] Battle Spot Singles',
		info: 'https://www.smogon.com/dex/sm/formats/battle_spot_singles/',
		teams: '3619162',
		viability: '3605970',
		roleCompendium: '3601658',
	},
	'gen7battlespotdoubles': {
		name: '[Gen 7] Battle Spot Doubles',
		teams: '3595859',
		viability: '3593890',
	},
	'gen7monotype': {
		name: '[Gen 7] Monotype',
		info: 'https://www.smogon.com/dex/sm/formats/monotype/',
		teams: '3599682',
		viability: '3622349',
	},
	'gen7challengecup1v1': {
		name: '[Gen 7] Challenge Cup 1v1',
		desc: 'Randomized teams of level-balanced Pokémon with randomized sets where you choose only 1 to battle',
	},
	'gen7hackmonscup': {
		name: '[Gen 7] Hackmons Cup',
		desc: 'Randomized teams of level-balanced Pokémon with absolutely any ability, moves, and item.',
	},
	'gen7doubleshackmonscup': {
		name: '[Gen 7] Doubles Hackmons Cup',
		desc: 'Randomized teams of level-balanced Pokémon with absolutely any ability, moves, and item. Played in doubles.',
	},
	'gen7battlefactory': {
		name: '[Gen 7] Battle Factory',
		desc: 'Randomized teams of level-balanced Pokémon with sets that are generated to be competitively viable. Each battle is set ' +
			'in a different tier.',
	},
	'gen7vgc2017': {
		name: '[Gen 7] VGC 2017',
		info: 'https://www.smogon.com/dex/sm/formats/vgc17/',
		teams: '3590391',
		desc: "The Video Game Championship (2017 rules) - Nintendo's official doubles format where you bring 6 pokemon and pick 4 to use.",
	},
	'gen7vgc2018': {
		name: '[Gen 7] VGC 2018',
		viability: '3622041',
		teams: '3628885',
		desc: "The Video Game Championship (2018 rules) - Nintendo's official doubles format where you bring 6 pokemon and pick 4 to use.",
	},
	'gen7vgc2019ultraseries': {
		name: '[Gen 7] VGC 2019 Ultra Series',
		viability: '3648031',
	},
	'gen7cap': {
		name: '[Gen 7] Cap',
		info: 'https://www.smogon.com/dex/sm/formats/cap/',
		teams: '3648521',
		viability: '3654035',
	},
	'gen7mixandmega': {
		name: '[Gen 7] Mix and Mega',
		teams: '3587740/#post-7099555',
		viability: '3591580/#post-7168836',
	},
	'gen7almostanyability': {
		name: '[Gen 7] Almost Any Ability',
		teams: '3587901/#post-7103429',
		viability: '3595753',
	},
	'gen7doublesuu': {
		name: '[Gen 7] Doubles UU',
		teams: '3598014',
	},
	'gen7sketchmons': {
		name: '[Gen 7] Sketchmons',
		teams: '3587743/#post-7099675',
		viability: '3606633/#post-7392050',
	},
	'gen71v1': {
		name: '[Gen 7] 1v1',
		info: '3646757',
		teams: '3646826',
		viability: '3646758',
	},
	'gen7godlygift': {
		name: '[Gen 7] Godly Gift',
		teams: '3597618/#post-7259719',
		viability: '3597618/#post-7259721',
	},
	'gen7balancedhackmons': {
		name: '[Gen 7] Balanced Hackmons',
		teams: '3587475/#post-7094085',
	},
	'gen7stabmons': {
		name: '[Gen 7] STABmons',
		teams: '3587949',
		viability: '3587949/#post-7104490',
	},
	'gen7cammomons': {
		name: '[Gen 7] Cammomons',
		teams: '3598418/#post-7272395',
	},
	'gen7middlecup': {
		name: '[Gen 7] Middle Cup',
		teams: '3588047/#post-7106554',
	},
	'gen7zu': {
		name: '[Gen 7] ZU',
		teams: '3646739',
		viability: '3643412',
	},
	'gen72v2doubles': {
		name: '[Gen 7] 2v2 Doubles',
		teams: '3606989/#post-7397203',
	},
	'gen7partnersincrime': {
		name: '[Gen 7] Partners in Crime',
		info: '3618488',
		teams: '3618488/#post-7553309',
	},

	// Gen 6
	'gen6anythinggoes': {
		name: '[Gen 6] Anything Goes',
		info: 'https://www.smogon.com/dex/xy/formats/ag',
		viability: '3548945/#post-6412092',
		teams: '3548945/#post-6412093',
	},
	'gen6ubers': {
		name: '[Gen 6] Ubers',
		info: 'https://www.smogon.com/dex/xy/formats/uber',
		viability: '3535106',
		teams: '3580622',
	},
	'gen6ou': {
		name: '[Gen 6] OU',
		info: 'https://www.smogon.com/dex/xy/formats/ou',
		viability: '3596900',
		teams: '3571343',
	},
	'gen6ounomega': {
		name: '[Gen 6] OU (no Mega)',
		info: '3532505',
		viability: '3536150',
		teams: '3521695',
	},
	'gen6uu': {
		name: '[Gen 6] UU',
		info: 'https://www.smogon.com/dex/xy/formats/uu',
		viability: '3580117',
		teams: '3562531',
	},
	'gen6ru': {
		name: '[Gen 6] RU',
		info: 'https://www.smogon.com/dex/xy/formats/ru',
		viability: '3574583',
		teams: '3551316',
	},
	'gen6nu': {
		name: '[Gen 6] NU',
		info: 'https://www.smogon.com/dex/xy/formats/nu',
		viability: '3553680',
		teams: '3563961',
	},
	'gen6pu': {
		name: '[Gen 6] PU',
		info: 'https://www.smogon.com/dex/xy/formats/pu',
		viability: '3528743',
		teams: '3540949',
	},
	'gen6lc': {
		name: '[Gen 6] LC',
		info: 'https://www.smogon.com/dex/xy/formats/lc',
		viability: '3547566',
		teams: '3554452',
	},
	'gen6doublesou': {
		name: '[Gen 6] Doubles OU',
		info: 'https://www.smogon.com/dex/xy/formats/doubles',
		viability: '3535930',
		teams: '3571389',
	},
	'gen6doublesuu': {
		name: '[Gen 6] Doubles UU',
		info: '3542755',
		teams: '3542755/#post-6305047',
		viability: '3542755/#post-6305048',
	},
	'gen6doublesubers': {
		name: '[Gen 6] Doubles Ubers',
		info: '3542746',
	},
	'gen6smogontriples': {
		name: '[Gen 6] Smogon Triples',
		info: 'https://www.smogon.com/dex/xy/formats/smogon_triples',
		viability: '3540390',
		teams: '3539715/#post-6247734',
	},
	'gen6battlespotsingles': {
		name: '[Gen 6] Battle Spot Singles',
		info: 'https://www.smogon.com/dex/xy/formats/battle_spot_singles',
		viability: '3514689',
		teams: '3582502',
	},
	'gen6battlespotdoubles': {
		name: '[Gen 6] Battle Spot Doubles',
		viability: '3560824',
		teams: '3560836',
	},
	'gen6battlespottriples': {
		name: '[Gen 6] Battle Spot Triples',
		info: 'https://www.smogon.com/dex/xy/formats/battle_spot_triples',
		teams: '3520502',
	},
	'gen6battlespotspecial10': {
		name: '[Gen 6] Battle Spot Special 10',
		info: '3537420',
	},
	'gen6monotype': {
		name: '[Gen 6] Monotype',
		info: 'https://www.smogon.com/dex/xy/formats/monotype',
		viability: '3575778',
		teams: '3565507',
	},
	'gen6vgc2016': {
		name: '[Gen 6] VGC 2016',
		info: '3558332',
		teams: '3561279',
	},

	// Gen 5
	'gen5ubers': {
		name: '[Gen 5] Ubers',
		info: 'https://www.smogon.com/dex/bw/tags/uber',
		teams: '3549991/post-6431094',
		viability: '3507551',
	},
	'gen5ou': {
		name: '[Gen 5] OU',
		info: 'https://www.smogon.com/dex/bw/tags/ou',
		teams: '3549991/post-6431094',
		viability: '3599678',
	},
	'gen5uu': {
		name: '[Gen 5] UU',
		info: 'https://www.smogon.com/dex/bw/tags/uu',
		teams: '3576780/#post-6891697',
	},
	'gen5ru': {
		name: '[Gen 5] RU',
		info: 'https://www.smogon.com/dex/bw/tags/ru',
		teams: '3549991/post-6431094',
		viability: '3473124',
	},
	'gen5nu': {
		name: '[Gen 5] NU',
		info: 'https://www.smogon.com/dex/bw/tags/nu',
		viability: '3484121',
	},
	'gen5lc': {
		name: '[Gen 5] LC',
		viability: '3485860',
		teams: '3577850',
	},
	'gen5gbusingles': {
		name: '[Gen 5] GBU Singles',
	},
	'gen5doublesou': {
		name: '[Gen 5] Doubles OU',
		teams: '3533424',
		viability: '3485044',
	},
	'gen5gbudoubles': {
		name: '[Gen 5] GBU Doubles',
	},

	// Gen 4
	'gen4ubers': {
		name: '[Gen 4] Ubers',
		genGuide: '3531283',
		info: 'https://www.smogon.com/dex/dp/formats/uber',
		teams: '3549991/post-6431088',
	},
	'gen4ou': {
		name: '[Gen 4] OU',
		genGuide: '3531283',
		info: 'https://www.smogon.com/dex/dp/formats/ou',
		teams: '3549991/post-6431088',
		viability: '3652538/#post-8186495',
	},
	'gen4uu': {
		name: '[Gen 4] UU',
		genGuide: '3531283',
		info: 'https://www.smogon.com/dex/dp/formats/uu',
		teams: '3549991/post-6431088',
	},
	'gen4nu': {
		name: '[Gen 4] NU',
		genGuide: '3531283',
		info: 'https://www.smogon.com/dex/dp/formats/nu',
		teams: '3549991/post-6431088',
	},
	'gen4pu': {
		name: '[Gen 4] PU',
		genGuide: '3531283',
		teams: '3597643/#post-7260264',
	},
	'gen4lc': {
		name: '[Gen 4] LC',
		genGuide: '3531283',
		info: 'https://www.smogon.com/dex/dp/formats/lc',
		teams: '3549991/post-6431088',
	},

	// Gens 1-3
	'gen1ou': {
		name: '[Gen 1] OU',
		genGuide: 'https://www.smogon.com/articles/understanding-rby-mechanics',
		info: 'https://www.smogon.com/rb',
		teams: '3549991/#post-6431045',
		viability: '3486845',
	},
	'gen1randombattle': {
		name: '[Gen 1] Random Battle',
		genGuide: 'https://www.smogon.com/articles/understanding-rby-mechanics',
	},
	'gen1outradeback': {
		name: '[Gen 1] OU (tradeback)',
		genGuide: 'https://www.smogon.com/articles/understanding-rby-mechanics',
		viability: '3486845',
	},
	'gen1stadium': {
		name: '[Gen 1] Stadium',
		genGuide: 'https://www.smogon.com/articles/understanding-rby-mechanics',
	},
	'gen1challengecup': {
		name: '[Gen 1] Challenge Cup',
		genGuide: 'https://www.smogon.com/articles/understanding-rby-mechanics',
	},
	'gen2ubers': {
		name: '[Gen 2] Ubers',
		genGuide: 'https://www.smogon.com/smog/issue28/gsc',
		info: 'https://www.smogon.com/gs',
		teams: '3549991/#post-6431086',
	},
	'gen2ou': {
		name: '[Gen 2] OU',
		genGuide: 'https://www.smogon.com/smog/issue28/gsc',
		info: 'https://www.smogon.com/gs',
		teams: '3549991/#post-6431086',
		viability: '3503082',
	},
	'gen2uu': {
		name: '[Gen 2] UU',
		genGuide: 'https://www.smogon.com/smog/issue28/gsc',
		info: 'https://www.smogon.com/gs',
		teams: '3549991/#post-6431086',
	},
	'gen2lc': {
		name: '[Gen 2] LC',
		genGuide: 'https://www.smogon.com/smog/issue28/gsc',
		info: 'https://www.smogon.com/gs',
		teams: '3549991/#post-6431086',
	},
	'gen2randombattle': {
		name: '[Gen 2] Random Battle',
		genGuide: 'https://www.smogon.com/smog/issue28/gsc',
	},
	'gen3ubers': {
		name: '[Gen 3] Ubers',
		genGuide: 'https://www.smogon.com/smog/issue10/adv',
		teams: '3549991/post-6431087',
		viability: '3536426',
	},
	'gen3ou': {
		name: '[Gen 3] OU',
		genGuide: 'https://www.smogon.com/smog/issue10/adv',
		info: 'https://www.smogon.com/rs',
		teams: '3549991/post-6431087',
		viability: '3503019',
	},
	'gen3uu': {
		name: '[Gen 3] UU',
		genGuide: 'https://www.smogon.com/smog/issue10/adv',
		teams: '3549991/post-6431087',
	},
	'gen3nu': {
		name: '[Gen 3] NU',
		genGuide: 'https://www.smogon.com/smog/issue10/adv',
		teams: '3549991/post-6431087',
	},

	// Gen 6 Other Metagames
	'gen61v1': {
		name: '[Gen 6] 1v1',
		info: 'https://www.smogon.com/dex/xy/formats/1v1',
		viability: '3536109',
		teams: '3539715/#post-6247734',
	},
	'gen62v2doubles': {
		name: '[Gen 6] 2v2 Doubles',
		info: 'https://www.smogon.com/dex/xy/formats/2v2_doubles',
		teams: '3539715/#post-6247734',
	},
	'gen6challengecup1v1': {
		desc: 'Randomized teams of level-balanced Pokémon with randomized sets where you choose only 1 to battle',
		name: '[Gen 6] Challenge Cup 1v1',
		info: 'https://www.smogon.com/dex/xy/formats/cc_1v1',
	},
	'gen6challengecup': {
		name: '[Gen 6] Challenge Cup',
		info: 'https://www.smogon.com/dex/xy/formats/cc',
	},
	'gen6doubleschallengecup': {
		name: '[Gen 6] Doubles Challenge Cup',
		info: 'https://www.smogon.com/dex/xy/formats/doubles_cc',
	},
	'gen6tripleschallengecup': {
		name: '[Gen 6] Triples Challenge Cup',
		info: 'https://www.smogon.com/dex/xy/formats/triples_cc',
	},
	'gen6hackmonscup': {
		desc: 'Randomized teams of level-balanced Pokémon with absolutely any ability, moves, and item.',
		name: '[Gen 6] Hackmons Cup',
	},
	'gen6doubleshackmonscup': {
		desc: 'Randomized teams of level-balanced Pokémon with absolutely any ability, moves, and item. Played in doubles.',
		name: '[Gen 6] Doubles Hackmons Cup',
	},
	'gen6tripleshackmonscup': {
		desc: 'Randomized teams of level-balanced Pokémon with absolutely any ability, moves, and item. Played in triples.',
		name: '[Gen 6] Triples Hackmons Cup',
	},
	'gen6cap': {
		name: '[Gen 6] CAP',
		info: 'https://www.smogon.com/dex/xy/formats/cap',
		viability: '3512508',
		teams: '3512318',
	},
	'gen6balancedhackmons': {
		name: '[Gen 6] Balanced Hackmons',
		info: 'https://www.smogon.com/dex/xy/formats/bh',
		viability: '3525676',
		teams: '3539715/#post-6247734',
	},
	'gen6tiershift': {
		name: '[Gen 6] Tier Shift',
		info: 'https://www.smogon.com/dex/xy/formats/tier_shift',
		viability: '3536719',
		teams: '3539715/#post-6247734',
	},
	'gen6middlecup': {
		name: '[Gen 6] Middle Cup',
		info: 'https://www.smogon.com/dex/xy/formats/middle_cup',
	},
	'gen6stabmons': {
		name: '[Gen 6] STABmons',
		info: 'https://www.smogon.com/dex/xy/formats/stabmons',
		viability: '3512215',
		teams: '3539715/#post-6247734',
	},
	'gen6almostanyability': {
		name: '[Gen 6] Almost Any Ability',
		info: 'https://www.smogon.com/dex/xy/formats/almost_any_ability',
		viability: '3551063',
		teams: '3539715/#post-6247734',
	},
	'gen6skybattle': {
		name: '[Gen 6] Sky Battle',
		info: '3493601',
	},
	'gen6inversebattle': {
		name: '[Gen 6] Inverse Battle',
		info: 'https://www.smogon.com/dex/xy/formats/inverse_battle',
		viability: '3526371',
		teams: '3539715/#post-6247734',
	},
	'gen6mediocremons': {
		name: '[Gen 6] Mediocremons',
		info: '3507608',
	},
	'gen6averagemons': {
		name: '[Gen 6] Averagemons',
		info: 'https://www.smogon.com/dex/xy/formats/averagemons',
		teams: '3539715/#post-6247734',
	},
	'gennextou': {
		name: '[Gen 6] Gen-NEXT OU',
		info: 'https://github.com/Zarel/Pokemon-Showdown/blob/master/mods/gennext/README.md',
	},
	'gen6ommashup': {
		name: '[Gen 6] OM Mashup',
		info: '3515232',
	},
	'gen6350cup': {
		name: '[Gen 6] 350 Cup',
		info: '3512945',
		viability: '3512945/page-7#post-5741305',
	},
	'gen6lcuu': {
		name: '[Gen 6] LC UU',
		info: '3523929',
		viability: '3529239',
		teams: '3532510/#post-6433710',
	},
	'gen6battlefactory': {
		desc: 'Randomized teams of level-balanced Pokémon with sets that are generated to be competitively viable. Each battle is set ' +
			'in a different tier.',
		name: '[Gen 6] Battle Factory',
	},
	'gen6classichackmons': {
		name: '[Gen 6] Classic Hackmons',
		info: 'https://www.smogon.com/dex/xy/formats/classic_hackmons',
		teams: '3539715/#post-6247734',
	},
	'gen6statswitch': {
		name: '[Gen 6] Stat Switch',
		info: '3518568',
	},
	'gen6fu': {
		name: '[Gen 6] FU',
		info: '3519286',
	},
	'gen6skillmons': {
		name: '[Gen 6] Skillmons',
		info: '3524601',
	},
	'gen6linked': {
		name: '[Gen 6] Linked',
		info: '3524254',
	},
	'gen6outheorymon': {
		name: '[Gen 6] OU Theorymon',
		info: '3532902',
	},
	'gen6inheritance': {
		name: '[Gen 6] Inheritance',
		info: '3529252',
		teams: '3539715/#post-6247734',
	},
	'gen6hiddentype': {
		name: '[Gen 6] Hidden Type',
		info: 'https://www.smogon.com/dex/xy/formats/hidden_type',
		teams: '3539715/#post-6247734',
	},
	'gen6mixandmega': {
		name: '[Gen 6] Mix and Mega',
		info: '3540979',
		teams: '3539715/#post-6247734',
	},
	'gen6proteanpalace': {
		name: '[Gen 6] Protean Palace',
		info: '3496299',
	},
	'gen6pikachucup': {
		name: '[Gen 6] Pikachu Cup',
		info: '3545810',
	},
	'gen6nostatus': {
		name: '[Gen 6] No Status',
		info: '3542555',
	},
	'gen6monsjustmons': {
		name: '[Gen 6] MonsJustMons',
		info: '3514696',
	},
	'gen6primalbattle': {
		name: '[Gen 6] Primal Battle',
		info: '3548886',
	},
	'gen6sketchmons': {
		name: '[Gen 6] Sketchmons',
		info: '3545826',
	},
	'gen6hackmons1v1': {
		name: '[Gen 6] Hackmons 1v1',
		info: '3496773/#post-5121864',
	},
	'gen6scrappyskirmish': {
		name: '[Gen 6] Scrappy Skirmish',
		info: '3552712',
	},
	'gen6higheststatmeta': {
		name: '[Gen 6] Highest Stat Meta',
		info: '3509940',
	},
	'gen6noguardgalaxy': {
		name: '[Gen 6] No Guard Galaxy',
		info: '3514582',
	},
	'gen6sametypestealthrock': {
		name: '[Gen 6] Same Type Stealth Rock',
		info: '3511171',
	},
	'gen6seasonalsupersquadsmackdown': {
		name: '[Gen 6] [Seasonal] Super Squad Smackdown',
		info: '3491902',
	},
};

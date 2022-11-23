import type { BoardData } from "../../templates/board";

export const ACTION_COLOR = "Light-Pink";
export const LAKE_COLOR = "Violet";
export const MOUNTAIN_COLOR = "Dark-Brown";
export const BATTLE_COLOR = "Blue-Violet";
export const STARTER_TOWN_COLOR = "Red";
export const DIGLETT_COLOR = "Red-Violet";
export const FOREST_COLOR = "Green";
export const BLACK_WHITE_COLOR = "Yellow";
export const CITY_COLOR = "Orange";
export const MAX_COLOR = "Red-Orange";

export const LAKE_COST = 200;
export const MOUNTAIN_COST = 200;
export const BATTLE_COST = 250;
export const STARTER_TOWN_COST = 100;
export const DIGLETT_COST = 150;
export const FOREST_COST = 300;
export const BLACK_WHITE_COST = 350;
export const CITY_COST = 400;
export const MAX_COST = 500;

export const LAKE_CHANCE = 10;
export const MOUNTAIN_CHANCE = 10;
export const BATTLE_CHANCE = 25;
export const STARTER_TOWN_CHANCE = 5;
export const DIGLETT_CHANCE = 15;
export const FOREST_CHANCE = 15;
export const BLACK_WHITE_CHANCE = 20;
export const CITY_CHANCE = 30;
export const MAX_CHANCE = 35;

export const OAKS_LAB_ICON = "🏠";
export const ACTION_ICON = "❔";
export const MOUNTAIN_ICON = "🏔️";

export const MOUNTAIN_PREFIX = "Mt.";

export const data: BoardData[] = [
    {row: 1},
    {name: "Pyrite Town Jail", color: "Gray", effect: 'jail', backwardDirection: 'down', forwardDirection: 'right'},
    {name: "Lake Acuity", color: LAKE_COLOR, cost: LAKE_COST, chance: LAKE_CHANCE, backwardDirection: 'left', forwardDirection: 'right'},
    {name: "Lake Verity", color: LAKE_COLOR, cost: LAKE_COST, chance: LAKE_CHANCE, backwardDirection: 'left', forwardDirection: 'right'},
    {name: "Action", color: ACTION_COLOR, icon: ACTION_ICON, effect: 'action', backwardDirection: 'left', forwardDirection: 'right'},
    {name: "Lake Valor", color: LAKE_COLOR, cost: LAKE_COST, chance: LAKE_CHANCE, backwardDirection: 'left', forwardDirection: 'right'},
    {name: MOUNTAIN_PREFIX + " Silver", color: MOUNTAIN_COLOR, icon: MOUNTAIN_ICON, cost: MOUNTAIN_COST, chance: MOUNTAIN_CHANCE,
        backwardDirection: 'left', forwardDirection: 'right'},
    {name: "Action", color: ACTION_COLOR, icon: ACTION_ICON, effect: 'action', backwardDirection: 'left', forwardDirection: 'right'},
    {name: "Battle Factory", color: BATTLE_COLOR, cost: BATTLE_COST, chance: BATTLE_CHANCE, backwardDirection: 'left',
        forwardDirection: 'right'},
    {name: "Battle Maison", color: BATTLE_COLOR, cost: BATTLE_COST, chance: BATTLE_CHANCE, backwardDirection: 'left',
        forwardDirection: 'right'},
    {name: "Pokemon Center", color: "Blue", backwardDirection: 'left', forwardDirection: 'down'},

    {row: 2},
    {name: "Diglett's Tunnel", color: DIGLETT_COLOR, cost: DIGLETT_COST, chance: DIGLETT_CHANCE, backwardDirection: 'down',
        forwardDirection: 'up'},
    null, null, null, null, null, null, null, null,
    {name: "Viridian Forest", color: FOREST_COLOR, cost: FOREST_COST, chance: FOREST_CHANCE, backwardDirection: 'up',
        forwardDirection: 'down'},

    {row: 3},
    {name: "Diglett's Cave", color: DIGLETT_COLOR, cost: DIGLETT_COST, chance: DIGLETT_CHANCE, backwardDirection: 'down',
        forwardDirection: 'up'},
    null, null, null, null, null, null, null, null,
    {name: "Eterna Forest", color: FOREST_COLOR, cost: FOREST_COST, chance: FOREST_CHANCE, backwardDirection: 'up',
        forwardDirection: 'down'},

    {row: 4},
    {name: "Action", color: ACTION_COLOR, icon: ACTION_ICON, effect: 'action', backwardDirection: 'down', forwardDirection: 'up'},
    null, null, null, null, null, null, null, null,
    {name: "Action", color: ACTION_COLOR, icon: ACTION_ICON, effect: 'action', backwardDirection: 'up', forwardDirection: 'down'},

    {row: 5},
    {name: MOUNTAIN_PREFIX + " Moon", color: MOUNTAIN_COLOR, icon: MOUNTAIN_ICON, cost: MOUNTAIN_COST, chance: MOUNTAIN_CHANCE,
        backwardDirection: 'down', forwardDirection: 'up'},
    null, null, null, null, null, null, null, null,
    {name: "Pinwheel Forest", color: FOREST_COLOR, cost: FOREST_COST, chance: FOREST_CHANCE, backwardDirection: 'up',
        forwardDirection: 'down'},

    {row: 6},
    {name: "Twinleaf", color: STARTER_TOWN_COLOR, cost: STARTER_TOWN_COST, chance: STARTER_TOWN_CHANCE, backwardDirection: 'down',
        forwardDirection: 'up'},
    null, null, null, null, null, null, null, null,
    {name: MOUNTAIN_PREFIX + " Pyre", color: MOUNTAIN_COLOR, icon: MOUNTAIN_ICON, cost: MOUNTAIN_COST, chance: MOUNTAIN_CHANCE,
        backwardDirection: 'up', forwardDirection: 'down'},

    {row: 7},
    {name: "Action", color: ACTION_COLOR, icon: ACTION_ICON, effect: 'action', backwardDirection: 'down', forwardDirection: 'up'},
    null, null, null, null, null, null, null, null,
    {name: "Action", color: ACTION_COLOR, icon: ACTION_ICON, effect: 'action', backwardDirection: 'up', forwardDirection: 'down'},

    {row: 8},
    {name: "Littleroot", color: STARTER_TOWN_COLOR, cost: STARTER_TOWN_COST, chance: STARTER_TOWN_CHANCE, backwardDirection: 'down',
        forwardDirection: 'up'},
    null, null, null, null, null, null, null, null,
    {name: "White Treehollow", color: BLACK_WHITE_COLOR, cost: BLACK_WHITE_COST, chance: BLACK_WHITE_CHANCE, backwardDirection: 'up',
        forwardDirection: 'down'},

    {row: 9},
    {name: "Pallet", color: STARTER_TOWN_COLOR, cost: STARTER_TOWN_COST, chance: STARTER_TOWN_CHANCE, backwardDirection: 'down',
        forwardDirection: 'up'},
    null, null, null, null, null, null, null, null,
    {name: "Black City", color: BLACK_WHITE_COLOR, cost: BLACK_WHITE_COST, chance: BLACK_WHITE_CHANCE, backwardDirection: 'up',
        forwardDirection: 'down'},

    {row: 10},
    {name: "Oak's Lab", color: "White", icon: OAKS_LAB_ICON, backwardDirection: 'right', forwardDirection: 'up', startSpace: true},
    {name: "Distortion World", color: MAX_COLOR, cost: MAX_COST, chance: MAX_CHANCE, backwardDirection: 'right', forwardDirection: 'left'},
    {name: "Ultra Space", color: MAX_COLOR, cost: MAX_COST, chance: MAX_CHANCE, backwardDirection: 'right', forwardDirection: 'left'},
    {name: "Action", color: ACTION_COLOR, icon: ACTION_ICON, effect: 'action', backwardDirection: 'right', forwardDirection: 'left'},
    {name: MOUNTAIN_PREFIX + " Coronet", color: MOUNTAIN_COLOR, icon: MOUNTAIN_ICON, cost: MOUNTAIN_COST, chance: MOUNTAIN_CHANCE,
        backwardDirection: 'right', forwardDirection: 'left'},
    {name: "Lumiose", color: CITY_COLOR, cost: CITY_COST, chance: CITY_CHANCE, backwardDirection: 'right', forwardDirection: 'left'},
    {name: "Action", color: ACTION_COLOR, icon: ACTION_ICON, effect: 'action', backwardDirection: 'right', forwardDirection: 'left'},
    {name: "Castelia", color: CITY_COLOR, cost: CITY_COST, chance: CITY_CHANCE, backwardDirection: 'right', forwardDirection: 'left'},
    {name: "Jubilife", color: CITY_COLOR, cost: CITY_COST, chance: CITY_CHANCE, backwardDirection: 'right', forwardDirection: 'left'},
    {name: "Poke Mart", color: "Blue", effect: 'random', backwardDirection: 'up', forwardDirection: 'left'},
];
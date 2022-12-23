import type { IRoomGameSchedule } from "./types/games";

/**
 * Hours are in the same timezone as wherever Lanette is running
 */
export const gameSchedules: Dict<Dict<IRoomGameSchedule>> = {};

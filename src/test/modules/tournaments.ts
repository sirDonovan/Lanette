import { Player } from "../../room-activity";
import { Tournament } from "../../room-tournament";
import type { IPastTournament } from "../../types/storage";
import type { IClientTournamentData, ITournamentEndJson } from "../../types/tournaments";
import { assert, assertStrictEqual, createTestRoom } from "../test-tools";

/* eslint-env mocha */

// eslint-disable-next-line max-len
const tournamentEndJson = '{"results":[["<Player 1>"]],"format":"gen8randombattle","generator":"Single Elimination","bracketData":{"type":"tree","rootNode":{"children":[{"children":[{"team":"<Player 2>"},{"team":"<Player 1>"}],"state":"finished","team":"<Player 1>","result":"loss","score":[0,1]},{"children":[{"team":"<Player 3>"},{"team":"<Player 4>"}],"state":"finished","team":"<Player 4>","result":"loss","score":[0,1]}],"state":"finished","team":"<Player 1>","result":"win","score":[1,0]}}}';

describe("Tournaments", () => {
	it('should return proper values from isInPastTournaments()', () => {
		const room = createTestRoom();
		const now = Date.now();
		const pastTournaments: IPastTournament[] = [
			{inputTarget: 'gen8ou', name: '[Gen 8] OU', time: now},
			{inputTarget: 'mocha', name: 'Mocha', time: now},
		];

		assert(Tournaments.isInPastTournaments(room, 'gen8ou', pastTournaments));
		assert(!Tournaments.isInPastTournaments(room, 'gen7ou', pastTournaments));
		assert(!Tournaments.isInPastTournaments(room, 'gen8randombattle', pastTournaments));
		assert(Tournaments.isInPastTournaments(room, 'mocha', pastTournaments));
		assert(!Tournaments.isInPastTournaments(room, 'gen8mocha', pastTournaments));

		Rooms.remove(room);
	});
	it('should properly set scheduled formats according to configured times', () => {
		const room = createTestRoom();
		const database = Storage.getDatabase(room);
		database.officialTournamentSchedule = {years: {}};

		const year = 2022;
		const date = new Date();
		date.setFullYear(year);

		const month = 0;
		date.setMonth(month);
		const scheduleMonth = month + 1;
		const lastDayOfMonth = Tools.getLastDayOfMonth(date);

		const formats: Dict<string> = {1: "gen8ou", 2: "gen8uu", 3: "gen8ru"};
		database.officialTournamentSchedule.years[year] = {months: {}};
		const schedule = database.officialTournamentSchedule.years[year];

		// 4 officials on 1 day
		let times: [number, number][] = [[2, 30], [9, 30], [15, 30], [20, 30]];
		schedule.months[scheduleMonth] = {days: {}};
		schedule.months[scheduleMonth].days['1'] = {format: formats['1'], times};
		for (let i = 2; i <= lastDayOfMonth; i++) {
			schedule.months[scheduleMonth].days[i] = {format: formats['2'], times};
		}

		Tournaments.loadRoomSchedule(room.id, true);

		// @ts-expect-error
		let officialTournaments = Tournaments.officialTournaments[room.id];
		assertStrictEqual(officialTournaments.length, lastDayOfMonth * times.length);

		let day = 1;
		date.setDate(day);
		for (let i = 0; i < times.length; i++) {
			date.setHours(times[i][0], times[i][1], 0, 0);
			assertStrictEqual(officialTournaments[i].format, formats[day]);
			assertStrictEqual(officialTournaments[i].time, date.getTime());
		}

		// 1 official on day 1, 3 officials on day 2
		times = [[20, 30], [2, 30], [9, 30], [15, 30]];
		schedule.months[scheduleMonth] = {days: {}};
		schedule.months[scheduleMonth].days['1'] = {format: formats['1'], times};
		schedule.months[scheduleMonth].days['2'] = {format: formats['2'], times};
		for (let i = 3; i <= lastDayOfMonth; i++) {
			schedule.months[scheduleMonth].days[i] = {format: formats['3'], times};
		}

		Tournaments.loadRoomSchedule(room.id, true);
		// @ts-expect-error
		officialTournaments = Tournaments.officialTournaments[room.id];
		assertStrictEqual(officialTournaments.length, lastDayOfMonth * times.length);

		day = 1;
		date.setDate(day);
		for (let i = 0; i < times.length; i++) {
			if (i > 0 && times[i][0] < times[i - 1][0]) {
				day++;
				date.setDate(day);
			}
			date.setHours(times[i][0], times[i][1], 0, 0);
			assertStrictEqual(officialTournaments[i].format, formats['2']);
			assertStrictEqual(officialTournaments[i].time, date.getTime());
		}

		day = lastDayOfMonth;
		date.setDate(day);
		let startIndex = times.length * (day - 1);
		let endIndex = startIndex + times.length;
		let timesIndex = 0;
		for (let i = startIndex; i < endIndex; i++) {
			if (timesIndex > 0 && times[timesIndex][0] < times[timesIndex - 1][0]) {
				date.setMonth(month + 1, 1);
			}
			date.setHours(times[timesIndex][0], times[timesIndex][1], 0, 0);
			timesIndex++;
			assertStrictEqual(officialTournaments[i].format, formats['3']);
			assertStrictEqual(officialTournaments[i].time, date.getTime());
		}

		// 2 officials on day 1, 2 officials on day 2
		times = [[15, 30], [20, 30], [2, 30], [9, 30]];
		schedule.months[scheduleMonth] = {days: {}};
		schedule.months[scheduleMonth].days['1'] = {format: formats['1'], times};
		for (let i = 2; i <= lastDayOfMonth; i++) {
			schedule.months[scheduleMonth].days[i] = {format: formats['2'], times};
		}

		Tournaments.loadRoomSchedule(room.id, true);
		// @ts-expect-error
		officialTournaments = Tournaments.officialTournaments[room.id];
		assertStrictEqual(officialTournaments.length, lastDayOfMonth * times.length);

		date.setMonth(month, 1);
		day = 1;
		for (let i = 0; i < times.length; i++) {
			if (i > 0 && times[i][0] < times[i - 1][0]) {
				day++;
				date.setDate(day);
			}
			date.setHours(times[i][0], times[i][1], 0, 0);
			assertStrictEqual(officialTournaments[i].format, formats['1']);
			assertStrictEqual(officialTournaments[i].time, date.getTime());
		}

		day = lastDayOfMonth;
		date.setDate(day);
		startIndex = (times.length * day) - times.length;
		endIndex = startIndex + times.length;
		timesIndex = 0;
		for (let i = startIndex; i < endIndex; i++) {
			if (timesIndex > 0 && times[timesIndex][0] < times[timesIndex - 1][0]) {
				date.setMonth(month + 1, 1);
			}
			date.setHours(times[timesIndex][0], times[timesIndex][1], 0, 0);
			timesIndex++;
			assertStrictEqual(officialTournaments[i].format, formats['2']);
			assertStrictEqual(officialTournaments[i].time, date.getTime());
		}

		// 3 officials on day 1, 1 official on day 2
		times = [[9, 30], [15, 30], [20, 30], [2, 30]];
		schedule.months[scheduleMonth] = {days: {}};
		schedule.months[scheduleMonth].days['1'] = {format: formats['1'], times};
		for (let i = 2; i <= lastDayOfMonth; i++) {
			schedule.months[scheduleMonth].days[i] = {format: formats['2'], times};
		}

		Tournaments.loadRoomSchedule(room.id, true);
		// @ts-expect-error
		officialTournaments = Tournaments.officialTournaments[room.id];
		assertStrictEqual(officialTournaments.length, lastDayOfMonth * times.length);

		date.setMonth(month, 1);
		day = 1;
		for (let i = 0; i < times.length; i++) {
			if (i > 0 && times[i][0] < times[i - 1][0]) {
				day++;
				date.setDate(day);
			}
			date.setHours(times[i][0], times[i][1], 0, 0);
			assertStrictEqual(officialTournaments[i].format, formats['1']);
			assertStrictEqual(officialTournaments[i].time, date.getTime());
		}

		day = lastDayOfMonth;
		date.setDate(day);
		startIndex = (times.length * day) - times.length;
		endIndex = startIndex + times.length;
		timesIndex = 0;
		for (let i = startIndex; i < endIndex; i++) {
			if (timesIndex > 0 && times[timesIndex][0] < times[timesIndex - 1][0]) {
				date.setMonth(month + 1, 1);
			}
			date.setHours(times[timesIndex][0], times[timesIndex][1], 0, 0);
			timesIndex++;
			assertStrictEqual(officialTournaments[i].format, formats['2']);
			assertStrictEqual(officialTournaments[i].time, date.getTime());
		}

		Rooms.remove(room);
	});

	it('should properly calculate all point multiplers', () => {
		assertStrictEqual(Tournaments.getPlayersPointMultiplier(16), 1);
		assertStrictEqual(Tournaments.getPlayersPointMultiplier(32), 1.5);
		assertStrictEqual(Tournaments.getPlayersPointMultiplier(48), 1.5);
		assertStrictEqual(Tournaments.getPlayersPointMultiplier(64), 2);
	});

	it('should properly convert client nodes to elimination nodes', () => {
		const tournamentEnd = JSON.parse(tournamentEndJson) as ITournamentEndJson;
		const eliminationNode = Tournaments.resultsToEliminationNode(tournamentEnd.bracketData.rootNode!);
		assertStrictEqual(eliminationNode.user, "Player 1");
		assert(eliminationNode.children);

		const childA = eliminationNode.children[0];
		const childB = eliminationNode.children[1];
		assert(childA);
		assertStrictEqual(childA.user, "Player 1");
		assert(childA.children);

		assert(childB);
		assertStrictEqual(childB.user, "Player 4");
		assert(childB.children);

		const grandchildA = childA.children[0];
		const grandchildB = childA.children[1];
		assert(grandchildA);
		assert(!grandchildA.children);
		assertStrictEqual(grandchildA.user, "Player 2");
		assert(grandchildB);
		assert(!grandchildB.children);
		assertStrictEqual(grandchildB.user, "Player 1");

		const grandchildC = childB.children[0];
		const grandchildD = childB.children[1];
		assert(grandchildC);
		assert(!grandchildC.children);
		assertStrictEqual(grandchildC.user, "Player 3");
		assert(grandchildD);
		assert(!grandchildD.children);
		assertStrictEqual(grandchildD.user, "Player 4");
	});

	it('should properly determine places from EliminationNode', () => {
		const tournamentEnd = JSON.parse(tournamentEndJson) as ITournamentEndJson;
		const eliminationNode = Tournaments.resultsToEliminationNode(tournamentEnd.bracketData.rootNode!);
		const places = Tournaments.getPlacesFromTree(eliminationNode);
		assert(places.winner);
		assertStrictEqual(places.winner, "Player 1");

		assert(places.runnerup);
		assertStrictEqual(places.runnerup, "Player 4");

		assert(places.semifinalists);
		assertStrictEqual(places.semifinalists.length, 2);
		assertStrictEqual(places.semifinalists[0], "Player 2");
		assertStrictEqual(places.semifinalists[1], "Player 3");
	});

	it('should properly update based on bracket data - 4 players', () => {
		// eslint-disable-next-line max-len
		const bracketData = JSON.parse('{"type":"tree","rootNode":{"children":[{"children":[{"team":"Mocha Player 1"},{"team":"Mocha Player 2"}],"state":"available"},{"children":[{"team":"Mocha Player 3"},{"team":"Mocha Player 4"}],"state":"available"}],"state":"unavailable"}}') as IClientTournamentData;

		const room = createTestRoom();
		const tournament = new Tournament(room);
		const ids: string[] = [];
		for (let i = 1; i <= 4; i++) {
			const name = "Mocha Player " + i;
			ids.push(Tools.toId(name));
			tournament.addPlayer(name);
		}

		tournament.info.bracketData = bracketData;
		tournament.updateBracket();

		const playerKeys = Object.keys(tournament.players);
		assertStrictEqual(playerKeys.length, ids.length);
		for (const id of ids) {
			assert(playerKeys.includes(id));
		}

		tournament.deallocate();
		Rooms.remove(room);
	});

	it('should properly update based on bracket data - 5 players', () => {
		// eslint-disable-next-line max-len
		const bracketData = JSON.parse('{"type":"tree","rootNode":{"children":[{"children":[{"children":[{"team":"Mocha Player 1"},{"team":"Mocha Player 2"}],"state":"available"},{"team":"Mocha Player 3"}],"state":"unavailable"},{"children":[{"team":"Mocha Player 4"},{"team":"Mocha Player 5"}],"state":"available"}],"state":"unavailable"}}') as IClientTournamentData;

		const room = createTestRoom();
		const tournament = new Tournament(room);
		const ids: string[] = [];
		for (let i = 1; i <= 5; i++) {
			const name = "Mocha Player " + i;
			ids.push(Tools.toId(name));
			tournament.addPlayer(name);
		}

		tournament.info.bracketData = bracketData;
		tournament.updateBracket();

		const playerKeys = Object.keys(tournament.players);
		assertStrictEqual(playerKeys.length, ids.length);
		for (const id of ids) {
			assert(playerKeys.includes(id));
		}

		tournament.deallocate();
		Rooms.remove(room);
	});

	it('should properly update based on bracket data - 6 players', () => {
		// eslint-disable-next-line max-len
		const bracketData = JSON.parse('{"type":"tree","rootNode":{"children":[{"children":[{"children":[{"team":"Mocha Player 1"},{"team":"Mocha Player 2"}],"state":"available"},{"children":[{"team":"Mocha Player 3"},{"team":"Mocha Player 4"}],"state":"available"}],"state":"unavailable"},{"children":[{"team":"Mocha Player 5"},{"team":"Mocha Player 6"}],"state":"available"}],"state":"unavailable"}}') as IClientTournamentData;

		const room = createTestRoom();
		const tournament = new Tournament(room);
		const ids: string[] = [];
		for (let i = 1; i <= 6; i++) {
			const name = "Mocha Player " + i;
			ids.push(Tools.toId(name));
			tournament.addPlayer(name);
		}

		tournament.info.bracketData = bracketData;
		tournament.updateBracket();

		const playerKeys = Object.keys(tournament.players);
		assertStrictEqual(playerKeys.length, ids.length);
		for (const id of ids) {
			assert(playerKeys.includes(id));
		}

		tournament.deallocate();
		Rooms.remove(room);
	});

	it('should properly update based on bracket data - 7 players', () => {
		// eslint-disable-next-line max-len
		const bracketData = JSON.parse('{"type":"tree","rootNode":{"children":[{"children":[{"children":[{"team":"Mocha Player 1"},{"team":"Mocha Player 2"}],"state":"available"},{"children":[{"team":"Mocha Player 3"},{"team":"Mocha Player 4"}],"state":"available"}],"state":"unavailable"},{"children":[{"children":[{"team":"Mocha Player 5"},{"team":"Mocha Player 6"}],"state":"available"},{"team":"Mocha Player 7"}],"state":"unavailable"}],"state":"unavailable"}}') as IClientTournamentData;

		const room = createTestRoom();
		const tournament = new Tournament(room);
		const ids: string[] = [];
		for (let i = 1; i <= 7; i++) {
			const name = "Mocha Player " + i;
			ids.push(Tools.toId(name));
			tournament.addPlayer(name);
		}

		tournament.info.bracketData = bracketData;
		tournament.updateBracket();

		const playerKeys = Object.keys(tournament.players);
		assertStrictEqual(playerKeys.length, ids.length);
		for (const id of ids) {
			assert(playerKeys.includes(id));
		}

		tournament.deallocate();
		Rooms.remove(room);
	});

	it('should properly update based on bracket data - 8 players', () => {
		// eslint-disable-next-line max-len
		const bracketData = JSON.parse('{"type":"tree","rootNode":{"children":[{"children":[{"children":[{"team":"Mocha Player 1"},{"team":"Mocha Player 2"}],"state":"available"},{"children":[{"team":"Mocha Player 3"},{"team":"Mocha Player 4"}],"state":"available"}],"state":"unavailable"},{"children":[{"children":[{"team":"Mocha Player 5"},{"team":"Mocha Player 6"}],"state":"available"},{"children":[{"team":"Mocha Player 7"},{"team":"Mocha Player 8"}],"state":"available"}],"state":"unavailable"}],"state":"unavailable"}}') as IClientTournamentData;

		const room = createTestRoom();
		const tournament = new Tournament(room);
		const ids: string[] = [];
		for (let i = 1; i <= 8; i++) {
			const name = "Mocha Player " + i;
			ids.push(Tools.toId(name));
			tournament.addPlayer(name);
		}

		tournament.info.bracketData = bracketData;
		tournament.updateBracket();

		const playerKeys = Object.keys(tournament.players);
		assertStrictEqual(playerKeys.length, ids.length);
		for (const id of ids) {
			assert(playerKeys.includes(id));
		}

		tournament.deallocate();
		Rooms.remove(room);
	});

	it('should properly convert a bracket to EliminationNode - 4 players', () => {
		// eslint-disable-next-line max-len
		const bracketData = JSON.parse('{"type":"tree","rootNode":{"children":[{"children":[{"team":"Mocha Player 1"},{"team":"Mocha Player 2"}],"state":"available"},{"children":[{"team":"Mocha Player 3"},{"team":"Mocha Player 4"}],"state":"available"}],"state":"unavailable"}}') as IClientTournamentData;

		const room = createTestRoom();
		const tournament = new Tournament(room);
		const players: Dict<Player> = {};
		for (let i = 1; i <= 4; i++) {
			const name = "Mocha Player " + i;
			const id = Tools.toId(name);
			players[id] = new Player(name, tournament);
		}

		const root = Tournaments.bracketToEliminationNode(bracketData.rootNode!, players);
		assertStrictEqual(root.user, null);
		assert(root.children);
		assert(root.children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
		assertStrictEqual(root.children[0].user, null);
		assertStrictEqual(root.children[1].user, null);
		assert(root.children[0].children);
		assert(root.children[0].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
		assertStrictEqual(root.children[0].children[0].user!.name, "Mocha Player 1");
		assertStrictEqual(root.children[0].children[1].user!.name, "Mocha Player 2");
		assert(root.children[1].children);
		assert(root.children[1].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
		assertStrictEqual(root.children[1].children[0].user!.name, "Mocha Player 3");
		assertStrictEqual(root.children[1].children[1].user!.name, "Mocha Player 4");
		assert(!root.children[0].children[0].children);
		assert(!root.children[0].children[1].children);
		assert(!root.children[1].children[0].children);
		assert(!root.children[1].children[1].children);

		tournament.deallocate();
		Rooms.remove(room);
	});

	it('should properly convert a bracket to EliminationNode - 5 players', () => {
		// eslint-disable-next-line max-len
		const bracketData = JSON.parse('{"type":"tree","rootNode":{"children":[{"children":[{"children":[{"team":"Mocha Player 1"},{"team":"Mocha Player 2"}],"state":"available"},{"team":"Mocha Player 3"}],"state":"unavailable"},{"children":[{"team":"Mocha Player 4"},{"team":"Mocha Player 5"}],"state":"available"}],"state":"unavailable"}}') as IClientTournamentData;

		const room = createTestRoom();
		const tournament = new Tournament(room);
		const players: Dict<Player> = {};
		for (let i = 1; i <= 5; i++) {
			const name = "Mocha Player " + i;
			const id = Tools.toId(name);
			players[id] = new Player(name, tournament);
		}

		const root = Tournaments.bracketToEliminationNode(bracketData.rootNode!, players);
		assertStrictEqual(root.user, null);
		assert(root.children);
		assert(root.children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
		assertStrictEqual(root.children[0].user, null);
		assertStrictEqual(root.children[1].user, null);
		assert(root.children[0].children);
		assert(root.children[0].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
		assertStrictEqual(root.children[0].children[0].user, null);
		assertStrictEqual(root.children[0].children[1].user!.name, "Mocha Player 3");
		assert(root.children[1].children);
		assert(root.children[1].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
		assertStrictEqual(root.children[1].children[0].user!.name, "Mocha Player 4");
		assertStrictEqual(root.children[1].children[1].user!.name, "Mocha Player 5");
		assert(root.children[0].children[0].children);
		assert(root.children[0].children[0].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
		assertStrictEqual(root.children[0].children[0].children[0].user!.name, "Mocha Player 1");
		assertStrictEqual(root.children[0].children[0].children[1].user!.name, "Mocha Player 2");
		assert(!root.children[0].children[1].children);
		assert(!root.children[1].children[0].children);
		assert(!root.children[1].children[1].children);

		tournament.deallocate();
		Rooms.remove(room);
	});

	it('should properly convert a bracket to EliminationNode - 6 players', () => {
		// eslint-disable-next-line max-len
		const bracketData = JSON.parse('{"type":"tree","rootNode":{"children":[{"children":[{"children":[{"team":"Mocha Player 1"},{"team":"Mocha Player 2"}],"state":"available"},{"children":[{"team":"Mocha Player 3"},{"team":"Mocha Player 4"}],"state":"available"}],"state":"unavailable"},{"children":[{"team":"Mocha Player 5"},{"team":"Mocha Player 6"}],"state":"available"}],"state":"unavailable"}}') as IClientTournamentData;

		const room = createTestRoom();
		const tournament = new Tournament(room);
		const players: Dict<Player> = {};
		for (let i = 1; i <= 6; i++) {
			const name = "Mocha Player " + i;
			const id = Tools.toId(name);
			players[id] = new Player(name, tournament);
		}

		const root = Tournaments.bracketToEliminationNode(bracketData.rootNode!, players);
		assertStrictEqual(root.user, null);
		assert(root.children);
		assert(root.children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
		assertStrictEqual(root.children[0].user, null);
		assertStrictEqual(root.children[1].user, null);
		assert(root.children[0].children);
		assert(root.children[0].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
		assertStrictEqual(root.children[0].children[0].user, null);
		assertStrictEqual(root.children[0].children[1].user, null);
		assert(root.children[1].children);
		assert(root.children[1].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
		assertStrictEqual(root.children[1].children[0].user!.name, "Mocha Player 5");
		assertStrictEqual(root.children[1].children[1].user!.name, "Mocha Player 6");
		assert(root.children[0].children[0].children);
		assert(root.children[0].children[0].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
		assertStrictEqual(root.children[0].children[0].children[0].user!.name, "Mocha Player 1");
		assertStrictEqual(root.children[0].children[0].children[1].user!.name, "Mocha Player 2");
		assert(root.children[0].children[1].children);
		assert(root.children[0].children[1].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
		assertStrictEqual(root.children[0].children[1].children[0].user!.name, "Mocha Player 3");
		assertStrictEqual(root.children[0].children[1].children[1].user!.name, "Mocha Player 4");
		assert(!root.children[1].children[0].children);
		assert(!root.children[1].children[1].children);

		tournament.deallocate();
		Rooms.remove(room);
	});

	it('should properly convert a bracket to EliminationNode - 7 players', () => {
		// eslint-disable-next-line max-len
		const bracketData = JSON.parse('{"type":"tree","rootNode":{"children":[{"children":[{"children":[{"team":"Mocha Player 1"},{"team":"Mocha Player 2"}],"state":"available"},{"children":[{"team":"Mocha Player 3"},{"team":"Mocha Player 4"}],"state":"available"}],"state":"unavailable"},{"children":[{"children":[{"team":"Mocha Player 5"},{"team":"Mocha Player 6"}],"state":"available"},{"team":"Mocha Player 7"}],"state":"unavailable"}],"state":"unavailable"}}') as IClientTournamentData;

		const room = createTestRoom();
		const tournament = new Tournament(room);
		const players: Dict<Player> = {};
		for (let i = 1; i <= 7; i++) {
			const name = "Mocha Player " + i;
			const id = Tools.toId(name);
			players[id] = new Player(name, tournament);
		}

		const root = Tournaments.bracketToEliminationNode(bracketData.rootNode!, players);
		assertStrictEqual(root.user, null);
		assert(root.children);
		assert(root.children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
		assertStrictEqual(root.children[0].user, null);
		assertStrictEqual(root.children[1].user, null);
		assert(root.children[0].children);
		assert(root.children[0].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
		assertStrictEqual(root.children[0].children[0].user, null);
		assertStrictEqual(root.children[0].children[1].user, null);
		assert(root.children[1].children);
		assert(root.children[1].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
		assertStrictEqual(root.children[1].children[0].user, null);
		assertStrictEqual(root.children[1].children[1].user!.name, "Mocha Player 7");
		assert(root.children[0].children[0].children);
		assert(root.children[0].children[0].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
		assertStrictEqual(root.children[0].children[0].children[0].user!.name, "Mocha Player 1");
		assertStrictEqual(root.children[0].children[0].children[1].user!.name, "Mocha Player 2");
		assert(root.children[0].children[1].children);
		assert(root.children[0].children[1].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
		assertStrictEqual(root.children[0].children[1].children[0].user!.name, "Mocha Player 3");
		assertStrictEqual(root.children[0].children[1].children[1].user!.name, "Mocha Player 4");
		assert(root.children[1].children[0].children);
		assert(root.children[1].children[0].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
		assertStrictEqual(root.children[1].children[0].children[0].user!.name, "Mocha Player 5");
		assertStrictEqual(root.children[1].children[0].children[1].user!.name, "Mocha Player 6");
		assert(!root.children[1].children[1].children);

		tournament.deallocate();
		Rooms.remove(room);
	});

	it('should properly convert a bracket to EliminationNode - 8 players', () => {
		// eslint-disable-next-line max-len
		const bracketData = JSON.parse('{"type":"tree","rootNode":{"children":[{"children":[{"children":[{"team":"Mocha Player 1"},{"team":"Mocha Player 2"}],"state":"available"},{"children":[{"team":"Mocha Player 3"},{"team":"Mocha Player 4"}],"state":"available"}],"state":"unavailable"},{"children":[{"children":[{"team":"Mocha Player 5"},{"team":"Mocha Player 6"}],"state":"available"},{"children":[{"team":"Mocha Player 7"},{"team":"Mocha Player 8"}],"state":"available"}],"state":"unavailable"}],"state":"unavailable"}}') as IClientTournamentData;

		const room = createTestRoom();
		const tournament = new Tournament(room);
		const players: Dict<Player> = {};
		for (let i = 1; i <= 8; i++) {
			const name = "Mocha Player " + i;
			const id = Tools.toId(name);
			players[id] = new Player(name, tournament);
		}

		const root = Tournaments.bracketToEliminationNode(bracketData.rootNode!, players);
		assertStrictEqual(root.user, null);
		assert(root.children);
		assert(root.children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
		assertStrictEqual(root.children[0].user, null);
		assertStrictEqual(root.children[1].user, null);
		assert(root.children[0].children);
		assert(root.children[0].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
		assertStrictEqual(root.children[0].children[0].user, null);
		assertStrictEqual(root.children[0].children[1].user, null);
		assert(root.children[1].children);
		assert(root.children[1].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
		assertStrictEqual(root.children[1].children[0].user, null);
		assertStrictEqual(root.children[1].children[1].user, null);
		assert(root.children[0].children[0].children);
		assert(root.children[0].children[0].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
		assertStrictEqual(root.children[0].children[0].children[0].user!.name, "Mocha Player 1");
		assertStrictEqual(root.children[0].children[0].children[1].user!.name, "Mocha Player 2");
		assert(root.children[0].children[1].children);
		assert(root.children[0].children[1].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
		assertStrictEqual(root.children[0].children[1].children[0].user!.name, "Mocha Player 3");
		assertStrictEqual(root.children[0].children[1].children[1].user!.name, "Mocha Player 4");
		assert(root.children[1].children[0].children);
		assert(root.children[1].children[0].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
		assertStrictEqual(root.children[1].children[0].children[0].user!.name, "Mocha Player 5");
		assertStrictEqual(root.children[1].children[0].children[1].user!.name, "Mocha Player 6");
		assert(root.children[1].children[1].children);
		assert(root.children[1].children[1].children.length === 2); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
		assertStrictEqual(root.children[1].children[1].children[0].user!.name, "Mocha Player 7");
		assertStrictEqual(root.children[1].children[1].children[1].user!.name, "Mocha Player 8");

		tournament.deallocate();
		Rooms.remove(room);
	});
});

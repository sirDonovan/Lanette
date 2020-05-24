import fs = require('fs');
import path = require('path');
// eslint-disable-next-line @typescript-eslint/naming-convention
import worker_threads = require('worker_threads');

import * as tools from '../../tools';
import type { ILogsResponse, ILogsSearchMessage, ILogsSearchOptions, ILogsWorkerData, LogsId } from '../logs';

// eslint-disable-next-line @typescript-eslint/naming-convention
const Tools = new tools.Tools();
// eslint-disable-next-line @typescript-eslint/naming-convention
const data = worker_threads.workerData as ILogsWorkerData;

function search(options: ILogsSearchOptions): ILogsResponse {
	const lines: string[] = [];
	let totalLines = 0;
	let targetUser = '';
	if (options.userids && options.userids.length === 1) targetUser = options.userids[0];
	let phrasesLen = 0;
	let targetPhrase = '';
	if (options.phrases) {
		phrasesLen = options.phrases.length;
		if (phrasesLen === 1) targetPhrase = options.phrases[0];
	}
	const startYear = options.startDate[0];
	const endYear = options.endDate[0];
	const separatedLogs: Dict<Dict<Dict<{regular: number; commands: number}>>> = {};
	const roomDirectory = path.join(data.roomLogsFolder, options.roomid);
	const userIds: Dict<string> = {};
	for (let i = startYear; i <= endYear; i++) {
		const year = '' + i;
		const firstYear = i === startYear;
		const lastYear = i === endYear;
		const yearDirectory = path.join(roomDirectory, year);
		const dayFiles = fs.readdirSync(yearDirectory).sort();
		for (const file of dayFiles) {
			if (!file.endsWith('.txt')) continue;
			let date = file.substr(0, file.indexOf('.txt'));
			let hyphenIndex = date.indexOf("-");

			// skip year
			date = date.substr(hyphenIndex + 1);
			hyphenIndex = date.indexOf("-");

			const month = date.substr(0, hyphenIndex);
			const day = date.substr(hyphenIndex + 1);
			const monthNumber = parseInt(month);
			if (firstYear) {
				if (monthNumber < options.startDate[1] || (monthNumber === options.startDate[1] &&
					parseInt(day) < options.startDate[2])) continue;
			}
			if (lastYear) {
				if (monthNumber > options.endDate[1] || (monthNumber === options.endDate[1] &&
					parseInt(day) > options.endDate[2])) continue;
			}
			const logs = fs.readFileSync(path.join(yearDirectory, file)).toString().split("\n");
			const dayLines: string[] = [];
			for (const log of logs) {
				if (log.substr(9, 3) !== '|c|') continue;
				const line = log.substr(12);
				const pipeIndex = line.indexOf("|");
				const name = line.substr(1, pipeIndex - 1);
				if (!(name in userIds)) userIds[name] = Tools.toId(name);
				if (targetUser) {
					if (userIds[name] !== targetUser) continue;
				} else if (options.userids) {
					if (!options.userids.includes(userIds[name])) continue;
				}
				const message = line.substr(pipeIndex + 1);
				if (targetPhrase) {
					if (!message.toLowerCase().includes(targetPhrase)) continue;
				} else if (options.phrases) {
					let containsPhrase = false;
					const lower = message.toLowerCase();
					for (let i = 0; i < phrasesLen; i++) {
						if (lower.includes(options.phrases[i])) {
							containsPhrase = true;
							break;
						}
					}
					if (!containsPhrase) continue;
				}
				dayLines.push(message);
			}

			const dayLinesLen = dayLines.length;
			if (dayLinesLen) {
				let regular = 0;
				let commands = 0;
				if (options.showCommands) {
					for (let i = 0; i < dayLinesLen; i++) {
						const firstCharacter = dayLines[i].charAt(0);
						if ((data.commandCharacter && firstCharacter === data.commandCharacter) || firstCharacter === '!') {
							commands++;
						} else {
							regular++;
						}
					}
				} else {
					regular = dayLinesLen;
				}
				if (!(year in separatedLogs)) separatedLogs[year] = {};
				if (!(month in separatedLogs[year])) separatedLogs[year][month] = {};
				separatedLogs[year][month][day] = {regular, commands};
				totalLines += dayLinesLen;
			}
		}

		// no matches
		if (!(year in separatedLogs)) continue;

		const monthsOrder = Object.keys(separatedLogs[year]).sort((a, b) => parseInt(a) - parseInt(b));
		for (const month of monthsOrder) {
			const monthLen = month.length;
			const daysOrder = Object.keys(separatedLogs[year][month]).sort((a, b) => parseInt(a) - parseInt(b));
			for (const day of daysOrder) {
				let line = "";
				if (data.serverLogsViewer) {
					line += "<a href='" + data.serverLogsViewer + options.roomid + "/" + year + "-" + (monthLen > 1 ? month : '0' +
						month) + "-" + (day.length > 1 ? day : '0' + day) + ".html'>" + month + "/" + day + "/" + year + "</a>:";
				} else {
					line += month + "/" + day + "/" + year + ":";
				}
				if (separatedLogs[year][month][day].regular) line += " <b>" + separatedLogs[year][month][day].regular + "</b> line" +
					(separatedLogs[year][month][day].regular !== 1 ? "s" : "");
				if (separatedLogs[year][month][day].commands) {
					if (separatedLogs[year][month][day].regular) line += ",";
					line += " <b>" + separatedLogs[year][month][day].commands + "</b> command" +
						(separatedLogs[year][month][day].commands !== 1 ? "s" : "");
				}
				lines.push(line);
			}
		}
	}

	return {lines, totalLines};
}

// eslint-disable-next-line @typescript-eslint/naming-convention
worker_threads.parentPort!.on('message', (incommingMessage: string) => {
	const parts = incommingMessage.split("|");
	const messageNumber = parts[0];
	const id = parts[1] as LogsId;
	const message = parts.slice(2).join("|");
	let response: ILogsResponse;
	if (id === 'search') {
		const options = JSON.parse(message) as ILogsSearchMessage;
		response = search(options);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	worker_threads.parentPort!.postMessage(messageNumber + "|" + id + "|" + JSON.stringify(response!));
});

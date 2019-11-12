import assert = require('assert');

function checkClientSendQueue(startingSendQueueIndex: number, input: readonly string[]): string[] {
	const expected = input.slice();
	for (let i = startingSendQueueIndex; i < Client.sendQueue.length; i++) {
		if (Client.sendQueue[i] === expected[0]) {
			expected.shift();
		}
	}

	return expected;
}

export function assertClientSendQueue(startingSendQueueIndex: number, input: readonly string[]) {
	const expected = checkClientSendQueue(startingSendQueueIndex, input);
	assert(expected.length === 0, "Not found in Client's send queue:\n\n" + expected.join("\n"));
}

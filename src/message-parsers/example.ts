import type { Room } from "../rooms";
import type { IClientMessageTypes, IMessageParserFunction } from "../types/client";

export const parseMessage: IMessageParserFunction = function(room: Room, messageType: keyof IClientMessageTypes,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	messageParts: readonly string[], now: number) {

	// return `true` in a case to prevent that `messageType` from being parsed by other parsers and Client
	switch (messageType) {
	case 'init': {
		room.say("Hello!");
		break;
	}
	}
};

// message parsers are run in order of priority (defaults to 0)
export const priority = 0;
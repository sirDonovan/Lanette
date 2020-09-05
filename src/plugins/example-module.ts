import type { Room } from "../rooms";
import type { IClientMessageTypes } from "../types/client";
import type { IPluginInterface } from "../types/plugins";

// Note: plugin modules can also export commands

// the plugin module's class must be named 'Module'
export class Module implements IPluginInterface {
	name: string = "PluginTest";

	// return 'true' from a plugin's parseMessage method to prevent the default parsing behavior in Client for that messageType
	parseMessage(room: Room, messageType: keyof IClientMessageTypes, messageParts: string[]): true | undefined {
		switch (messageType) {
			case 'pm': {
				const messageArguments: IClientMessageTypes['pm'] = {
					rank: messageParts[0].charAt(0),
					username: messageParts[0].substr(1),
					recipientRank: messageParts[1].charAt(0),
					recipientUsername: messageParts[1].substr(1),
					message: messageParts.slice(2).join("|"),
				};

				const id = Tools.toId(messageArguments.username);
				if (!id) return;

				const user = Users.add(messageArguments.username, id);
				if (user !== Users.self && user.isDeveloper()) {
					if (!CommandParser.isCommandMessage(messageArguments.message)) {
						user.say("This is a parsed message in a plugin module.");
					}
				}
			}
		}
	}

	async loadData(): Promise<void> {
		// load all data required by the module

		return Promise.resolve();
	}
}

export class Tools {
	toId(input: string | number | {id: string}): string {
		if (typeof input !== 'string') {
			if (typeof input === 'number') {
				input = '' + input;
			} else {
				input = input.id;
			}
		}
		return input.toLowerCase().replace(/[^a-z0-9]/g, '');
	}
}

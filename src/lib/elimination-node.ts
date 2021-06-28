/**
 * There are two types of elim nodes, player nodes
 * and match nodes.
 *
 * Player nodes are leaf nodes: .children = none
 *
 * Match nodes are non-leaf nodes, and will always have two children.
 */
export class EliminationNode<T> {
	children: [EliminationNode<T>, EliminationNode<T>] | null;
	/**
	 * In a player node, the player (null if it's an unfilled loser's bracket node).
	 *
	 * In a match node, the winner if it exists, otherwise null.
	 */
	user: T | null;
	/**
	 * Only relevant to match nodes. (Player nodes are always '')
	 *
	 * 'available' = ready for battles - will have two children, both with users; this.user is null
	 *
	 * 'finished' = battle already over - will have two children, both with users; this.user is winner
	 *
	 * '' = unavailable
	 */
	state: 'available' | 'finished' | '';
	result: 'win' | 'loss' | '';
	score: number[] | null;
	parent: EliminationNode<T> | null;

	constructor(options: Partial<EliminationNode<T>>) {
		this.children = null;
		this.user = options.user || null;
		this.state = options.state || '';
		this.result = options.result || '';
		this.score = options.score || null;
		this.parent = options.parent || null;
	}

	setChildren(children: [EliminationNode<T>, EliminationNode<T>] | null): void {
		if (this.children) {
			for (const child of this.children) child.parent = null;
		}
		if (children) {
			for (const child of children) child.parent = this;
		}
		this.children = children;
	}

	traverse(callback: (node: EliminationNode<T>) => void): void {
		const queue: EliminationNode<T>[] = [this];
		let node = queue.shift();
		while (node) {
			callback(node);
			if (node.children) queue.push(...node.children);
			node = queue.shift();
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
	find<U>(callback: (node: EliminationNode<T>) => (U | void)): U | undefined {
		const queue: EliminationNode<T>[] = [this];
		let node = queue.shift();
		while (node) {
			const value = callback(node);
			if (value) {
				return value;
			}
			if (node.children) queue.push(...node.children);
			node = queue.shift();
		}
		return undefined;
	}
	[Symbol.iterator](): IterableIterator<EliminationNode<T>> {
		const results: EliminationNode<T>[] = [this];
		for (const result of results) {
			if (result.children) results.push(...result.children);
		}
		return results[Symbol.iterator]();
	}
}
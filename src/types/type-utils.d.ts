// tslint:disable-next-line interface-over-type-literal
type Dict<T> = {[k: string]: T};

// from https://github.com/Microsoft/TypeScript
type DeepReadonly<T> = {
	readonly [P in keyof T]: DeepReadonly<T[P]>;
};

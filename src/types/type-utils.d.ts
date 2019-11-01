// tslint:disable-next-line interface-over-type-literal
type Dict<T> = {[k: string]: T};

type KeyedDict<T, U> = {[K in keyof T]: U};

type PartialKeyedDict<T, U> = {[K in keyof T]?: U};

type Mutable<T> = {
	-readonly [P in keyof T]: T[P];
};

// from https://github.com/Microsoft/TypeScript
type DeepReadonly<T> = {
	readonly [P in keyof T]: DeepReadonly<T[P]>;
};

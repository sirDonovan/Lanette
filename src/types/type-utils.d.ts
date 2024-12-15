// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style, @typescript-eslint/consistent-type-definitions
type Dict<T> = {[k: string]: T};

// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
type KeyedDict<T extends string | number | symbol, U> = {[K in T]: U };

// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
type PartialKeyedDict<T extends string | number | symbol, U> = {[K in T]?: U };

type FilterByType<T, U> = { [P in keyof T as T[P] extends U ? P : never]: T[P] };

type PromiseResolve<T> = (value: T | PromiseLike<T>) => void;

type PromiseReject<T> = (reason: T) => void;

// Credit to @ahejlsberg - https://github.com/microsoft/TypeScript/issues/42939#issuecomment-785316256
type Branded<T, A> = A & { __brand: T };
type BrandOf<A> = [A] extends [Branded<infer R, unknown>] ? R : never;
type BrandedValue<A> = A extends Branded<BrandOf<A>, infer R> ? R : never;

// Credit to @nieltg for the original Immutable and DeepImmutable* types - https://github.com/microsoft/TypeScript/issues/13923#issuecomment-402901005

/* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unsafe-function-type, @typescript-eslint/array-type*/
type PrimitiveTypes = undefined | null | boolean | string | number | Function;

type Immutable<T> =
	T extends PrimitiveTypes ? T :
	T extends Array<infer U> ? ReadonlyArray<U> :
	T extends Map<infer K, infer V> ? ReadonlyMap<K, V> :
	T extends Set<infer U> ? ReadonlySet<U> :
	Readonly<T>;

type DeepImmutable<T> =
	T extends PrimitiveTypes ? T :
	T extends Array<infer U> ? DeepImmutableArray<U> :
	T extends Map<infer K, infer V> ? DeepImmutableMap<K, V> :
	T extends Set<infer U> ? DeepImmutableSet<U> :
	DeepImmutableObject<T>;

interface DeepImmutableArray<T> extends ReadonlyArray<DeepImmutable<T>> {}
interface DeepImmutableMap<K, V> extends ReadonlyMap<DeepImmutable<K>, DeepImmutable<V>> {}
interface DeepImmutableSet<U> extends ReadonlySet<DeepImmutable<U>> {}
type DeepImmutableObject<T> = {
	readonly [K in keyof T]: DeepImmutable<T[K]>
};

type Mutable<T> =
	T extends PrimitiveTypes ? T :
	T extends Immutable<infer U> ? U :
	T extends ReadonlyArray<infer U> ? Array<U> :
	T extends ReadonlyMap<infer K, infer V> ? Map<K, V> :
	T extends ReadonlySet<infer U> ? Set<U> :
	T;

type DeepMutable<T> =
	T extends PrimitiveTypes ? T :
	T extends DeepImmutableArray<infer U> ? Array<U> :
	T extends DeepImmutableMap<infer K, infer V> ? Map<K, V> :
	T extends DeepImmutableSet<infer U> ? Set<U> :
	T extends ReadonlyArray<infer U> ? DeepMutableArray<U> :
	T extends ReadonlyMap<infer K, infer V> ? DeepMutableMap<K, V> :
	T extends ReadonlySet<infer U> ? DeepMutableSet<U> :
	T extends Array<infer U> ? DeepMutableArray<U> :
	T extends Map<infer K, infer V> ? DeepMutableMap<K, V> :
	T extends Set<infer U> ? DeepMutableSet<U> :
	DeepMutableObject<T>;

interface DeepMutableArray<T> extends Array<DeepMutable<T>> {}
interface DeepMutableMap<K, V> extends Map<DeepMutable<K>, DeepMutable<V>> {}
interface DeepMutableSet<U> extends Set<DeepMutable<U>> {}
type DeepMutableObject<T> =
	T extends DeepImmutableObject<infer U> ?
		{ -readonly [K in keyof U]: DeepMutable<U[K]> }
	:
		{ -readonly [K in keyof T]: DeepMutable<T[K]> };
/* eslint-enable */

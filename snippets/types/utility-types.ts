/**
 * utility-types.ts — 20+ custom TypeScript utility types
 *
 * These extend TypeScript's built-in utility types with patterns
 * you'll reach for constantly in real-world React/Node apps.
 *
 * No imports needed — paste directly into your types directory.
 */

// ─── Object Manipulation ──────────────────────────────────────────────────────

/**
 * RequiredFields — Make specific fields required (others stay as-is)
 *
 * @example
 * type UserWithId = RequiredFields<User, 'id'>;
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * OptionalFields — Make specific fields optional (others stay as-is)
 *
 * @example
 * type CreateUserDto = OptionalFields<User, 'id' | 'createdAt'>;
 */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * DeepPartial — Recursively make all properties optional
 *
 * @example
 * type PartialConfig = DeepPartial<AppConfig>;
 */
export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

/**
 * DeepRequired — Recursively make all properties required
 */
export type DeepRequired<T> = T extends object
  ? { [P in keyof T]-?: DeepRequired<T[P]> }
  : T;

/**
 * DeepReadonly — Recursively make all properties readonly
 *
 * @example
 * const config: DeepReadonly<Config> = { ... };
 */
export type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
  ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
  : T;

/**
 * Mutable — Remove readonly from all properties
 */
export type Mutable<T> = { -readonly [P in keyof T]: T[P] };

// ─── Function Types ───────────────────────────────────────────────────────────

/**
 * AsyncReturnType — Extract the resolved type of an async function
 *
 * @example
 * async function fetchUser() { return { id: '1', name: 'Alice' }; }
 * type User = AsyncReturnType<typeof fetchUser>; // { id: string; name: string }
 */
export type AsyncReturnType<T extends (...args: any) => Promise<any>> =
  T extends (...args: any) => Promise<infer R> ? R : never;

/**
 * PromiseValue — Extract the value type from a Promise
 *
 * @example
 * type UserPromise = Promise<User>;
 * type User2 = PromiseValue<UserPromise>; // User
 */
export type PromiseValue<T extends Promise<unknown>> =
  T extends Promise<infer V> ? V : never;

/**
 * Awaited is built-in since TS 4.5, but this is a compatible polyfill:
 */
export type Resolved<T> = T extends Promise<infer U> ? Resolved<U> : T;

// ─── API & Data Types ─────────────────────────────────────────────────────────

/**
 * ApiResponse — Standard API response wrapper
 *
 * @example
 * type UsersResponse = ApiResponse<User[]>;
 * // { data: User[]; message: string; success: true; timestamp: string }
 */
export type ApiResponse<T> = {
  data: T;
  message: string;
  success: boolean;
  timestamp: string;
};

/**
 * PaginatedResponse — Paginated list response
 *
 * @example
 * type UsersPage = PaginatedResponse<User>;
 */
export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

/**
 * ApiError — Standard API error shape
 */
export type ApiErrorResponse = {
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, string[]>;
};

// ─── State Types ──────────────────────────────────────────────────────────────

/**
 * LoadingState — Discriminated union for async state
 *
 * @example
 * const [state, setState] = useState<LoadingState<User[]>>({ status: 'idle' });
 *
 * if (state.status === 'success') {
 *   state.data; // TypeScript knows data is User[]
 * }
 */
export type LoadingState<T, E = Error> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: E };

/**
 * AsyncAction — Union type for reducer async actions
 *
 * @example
 * type UserActions =
 *   | AsyncAction<'FETCH_USER', User>
 *   | AsyncAction<'UPDATE_USER', User>;
 */
export type AsyncAction<Type extends string, Payload = void> =
  | { type: `${Type}_REQUEST` }
  | { type: `${Type}_SUCCESS`; payload: Payload }
  | { type: `${Type}_FAILURE`; error: Error };

// ─── Narrowing Helpers ────────────────────────────────────────────────────────

/**
 * Nullable — Add null to a type
 */
export type Nullable<T> = T | null;

/**
 * Maybe — Add null and undefined to a type
 */
export type Maybe<T> = T | null | undefined;

/**
 * NonEmptyArray — Array guaranteed to have at least one element
 *
 * @example
 * function first<T>(arr: NonEmptyArray<T>): T { return arr[0]; }
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * ValueOf — Extract all value types from an object
 *
 * @example
 * const ROUTES = { home: '/', about: '/about' } as const;
 * type Route = ValueOf<typeof ROUTES>; // '/' | '/about'
 */
export type ValueOf<T> = T[keyof T];

/**
 * KeysOfType — Extract keys whose values match a specific type
 *
 * @example
 * type StringKeys = KeysOfType<User, string>; // 'name' | 'email' | ...
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

// ─── React-Specific ───────────────────────────────────────────────────────────

/**
 * PropsWithClassName — Add className to any props type
 */
export type PropsWithClassName<T = {}> = T & { className?: string };

/**
 * PropsWithChildren — Add children (with type safety)
 */
export type PropsWithChildren<T = {}> = T & { children: React.ReactNode };

/**
 * ComponentProps — Extract props from any component
 *
 * @example
 * type ButtonProps = ComponentProps<typeof Button>;
 */
export type ComponentProps<T extends React.ComponentType<any>> =
  T extends React.ComponentType<infer P> ? P : never;

/**
 * StrictOmit — Omit with key check (TypeScript 4.9+ has this built-in as Omit)
 */
export type StrictOmit<T, K extends keyof T> = Omit<T, K>;

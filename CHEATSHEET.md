# TypeScript React Snippets Pro — Quick Reference Cheatsheet

## Hooks

### useLocalStorage
```typescript
const [theme, setTheme, clearTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');
```

### useDebounce / useThrottle
```typescript
const debouncedSearch = useDebounce(searchTerm, 300);
const throttledScroll = useThrottle(scrollY, 100);
const debouncedSave = useDebouncedCallback((text: string) => saveToAPI(text), 500);
```

### useFetch
```typescript
const { data, loading, error, refetch } = useFetch<User[]>('/api/users');
const { mutate, loading } = usePost<User, CreateUserDto>('/api/users');
```

### useAsync
```typescript
const { execute: login, loading, error, data } = useAsync(
  (email: string, pw: string) => authService.login(email, pw)
);
const user = await login(email, password);
```

### useForm
```typescript
const { values, errors, handleChange, handleSubmit, loading } = useForm({
  initialValues: { email: '', password: '' },
  validate: { email: validateEmail, password: validatePassword },
  onSubmit: async (values) => await authAPI.login(values),
});
```

### useAuth
```typescript
// Setup (in layout/provider):
const auth = useAuthState();
<AuthContext.Provider value={auth}>{children}</AuthContext.Provider>

// In any component:
const { user, isAuthenticated, login, logout, hasRole } = useAuth();
if (hasRole('admin')) { /* show admin UI */ }
```

### Misc Hooks
```typescript
const prevCount = usePrevious(count);
const [isOpen, toggle, open, close] = useToggle(false);
const { count, increment, decrement, reset } = useCounter(0, { min: 0, max: 10 });
const ref = useClickOutside<HTMLDivElement>(() => setIsOpen(false));
const isMobile = useMediaQuery('(max-width: 768px)');
const { width, height } = useWindowSize();
const isOnline = useOnlineStatus();
const { copy, copied } = useCopyToClipboard();
useKeyPress('Escape', () => setIsOpen(false));
useKeyPress('s', save, { ctrlKey: true });
useInterval(() => poll(), 5000);
```

---

## Utilities

### api-client
```typescript
const api = createApiClient({ baseUrl: '/api', retries: 3, timeout: 15000 });
api.setToken(accessToken);

const users = await api.get<User[]>('/users', { params: { page: 1 } });
const user  = await api.post<User, CreateUserDto>('/users', { name: 'Alice' });
await api.put<User>('/users/1', { name: 'Alice Updated' });
await api.delete('/users/1');
```

### error-handler
```typescript
// Go-style error handling
const [data, error] = await tryCatch(fetchUser(id));
if (error) return <ErrorState message={getUserFriendlyMessage(error)} />;

// Sync
const [parsed, err] = tryCatchSync(() => JSON.parse(raw));

// Retry
const data = await withRetry(() => unstableApiCall(), { retries: 3, backoff: 'exponential' });

// Typed errors
throw new ValidationError('email', 'Invalid email format');
throw new NotFoundError('User', id);
throw new AuthenticationError();
```

### type-guards
```typescript
if (isString(value)) { value.toUpperCase(); }
if (isNonNullable(data)) { use(data); }
if (hasKey(obj, 'message')) { console.log(obj.message); }
if (isArrayOf(data, isString)) { data.join(', '); }
const nonNulls = array.filter(isNonNullable);

// Enum check
const isStatus = isEnumValue(Status);
if (isStatus(raw)) { setStatus(raw); }

// Assertions
assert(isString(value), 'Expected string');
assertNonNullable(el, 'Element not found');
```

### validation
```typescript
// Individual validators
validateEmail('test@example.com')    // undefined (valid)
validateEmail('not-an-email')        // 'Please enter a valid email address'
validatePassword('weak', { minLength: 10, requireSpecial: true })
validatePhone('+1 (555) 123-4567')

// Composed
const validateUsername = compose(
  required('Username required'),
  minLength(3),
  maxLength(20),
);

// Schema
const errors = validateSchema(formValues, {
  email: validateEmail,
  password: validatePassword,
  username: validateUsername,
});
```

---

## Utility Types

```typescript
RequiredFields<User, 'id'>           // id is required, rest unchanged
OptionalFields<User, 'id' | 'createdAt'>  // id + createdAt become optional
DeepPartial<AppConfig>               // all nested properties optional
DeepReadonly<Config>                 // all nested properties readonly

AsyncReturnType<typeof fetchUser>    // Extract Promise<T> → T from async fn
LoadingState<User[]>                 // 'idle' | 'loading' | 'success' | 'error'
ApiResponse<User[]>                  // { data, message, success, timestamp }
PaginatedResponse<User>              // { data, pagination: { page, total, ... } }

Maybe<User>                          // User | null | undefined
NonEmptyArray<string>                // [string, ...string[]]
ValueOf<typeof ROUTES>               // Union of all object values
KeysOfType<User, string>             // Keys whose values are strings
```

---

## Patterns

### ErrorBoundary
```tsx
<ErrorBoundary
  fallback={(error, reset) => (
    <div>
      <p>{error.message}</p>
      <button onClick={reset}>Retry</button>
    </div>
  )}
  onError={(error) => logToSentry(error)}
  resetKeys={[userId]}
>
  <UserProfile />
</ErrorBoundary>

// HOC style
const SafeProfile = withErrorBoundary(UserProfile, {
  fallback: <p>Failed to load</p>,
});
```

### ProtectedRoute
```tsx
<ProtectedRoute
  user={currentUser}
  isLoading={authLoading}
  requiredRoles={['admin']}
  onUnauthenticated={() => router.push('/login')}
  unauthorizedFallback={<ForbiddenPage />}
>
  <AdminPanel />
</ProtectedRoute>
```

### useProtectedAction
```tsx
const protectedLike = useProtectedAction(
  () => likePost(postId),
  { user, onUnauthenticated: () => setShowLoginModal(true) }
);
<button onClick={protectedLike}>Like</button>
```

---

*TypeScript React Snippets Pro — 50+ snippets, zero dependencies*

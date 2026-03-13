/**
 * validation.ts — Common field validators for forms and APIs
 *
 * Pure functions — no dependencies. Return error string or undefined.
 * Compatible with useForm hook in this pack, Formik, React Hook Form, etc.
 *
 * @example
 * // With useForm:
 * const { values, errors } = useForm({
 *   initialValues: { email: '', password: '', phone: '' },
 *   validate: {
 *     email: validateEmail,
 *     password: (v) => validatePassword(String(v), { minLength: 10 }),
 *     phone: validatePhone,
 *   },
 *   onSubmit: handleSubmit,
 * });
 */

type Validator = (value: unknown) => string | undefined;

// ─── Required ─────────────────────────────────────────────────────────────────

export const required =
  (message: string = 'This field is required'): Validator =>
  (value) => {
    if (value === null || value === undefined || value === '') return message;
    if (typeof value === 'string' && value.trim() === '') return message;
    return undefined;
  };

// ─── String validators ────────────────────────────────────────────────────────

export const validateEmail: Validator = (value) => {
  if (!value) return 'Email is required';
  const email = String(value).trim();
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) return 'Please enter a valid email address';
  if (email.length > 254) return 'Email address is too long';
  return undefined;
};

export const validateUrl: Validator = (value) => {
  if (!value) return 'URL is required';
  try {
    new URL(String(value));
    return undefined;
  } catch {
    return 'Please enter a valid URL (include https://)';
  }
};

export const validatePhone: Validator = (value) => {
  if (!value) return 'Phone number is required';
  // Allows: +1 (555) 123-4567, 5551234567, +44 20 7946 0958, etc.
  const phoneRegex = /^\+?[\d\s\-().]{7,20}$/;
  const digitsOnly = String(value).replace(/\D/g, '');
  if (!phoneRegex.test(String(value))) return 'Please enter a valid phone number';
  if (digitsOnly.length < 7 || digitsOnly.length > 15) return 'Please enter a valid phone number';
  return undefined;
};

interface PasswordOptions {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumber?: boolean;
  requireSpecial?: boolean;
}

export const validatePassword = (
  value: unknown,
  options: PasswordOptions = {}
): string | undefined => {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumber = true,
    requireSpecial = false,
  } = options;

  if (!value) return 'Password is required';
  const password = String(value);

  if (password.length < minLength) return `Password must be at least ${minLength} characters`;
  if (requireUppercase && !/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
  if (requireLowercase && !/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
  if (requireNumber && !/\d/.test(password)) return 'Password must contain a number';
  if (requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return 'Password must contain a special character';
  }
  return undefined;
};

export const validatePasswordMatch = (
  password: unknown,
  confirmPassword: unknown
): string | undefined => {
  if (password !== confirmPassword) return 'Passwords do not match';
  return undefined;
};

// ─── Length validators ────────────────────────────────────────────────────────

export const minLength =
  (min: number, message?: string): Validator =>
  (value) => {
    const str = String(value ?? '');
    if (str.length < min) return message ?? `Must be at least ${min} characters`;
    return undefined;
  };

export const maxLength =
  (max: number, message?: string): Validator =>
  (value) => {
    const str = String(value ?? '');
    if (str.length > max) return message ?? `Must be at most ${max} characters`;
    return undefined;
  };

// ─── Number validators ────────────────────────────────────────────────────────

export const validateNumber: Validator = (value) => {
  if (value === '' || value === null || value === undefined) return 'Number is required';
  if (isNaN(Number(value))) return 'Please enter a valid number';
  return undefined;
};

export const min =
  (minimum: number, message?: string): Validator =>
  (value) => {
    if (Number(value) < minimum) return message ?? `Must be at least ${minimum}`;
    return undefined;
  };

export const max =
  (maximum: number, message?: string): Validator =>
  (value) => {
    if (Number(value) > maximum) return message ?? `Must be at most ${maximum}`;
    return undefined;
  };

// ─── Compose validators ───────────────────────────────────────────────────────

/**
 * compose — Combine multiple validators (runs all, returns first error)
 *
 * @example
 * const validateUsername = compose(
 *   required('Username is required'),
 *   minLength(3),
 *   maxLength(20),
 *   (v) => /\s/.test(String(v)) ? 'No spaces allowed' : undefined,
 * );
 */
export const compose =
  (...validators: Validator[]): Validator =>
  (value) => {
    for (const validator of validators) {
      const error = validator(value);
      if (error) return error;
    }
    return undefined;
  };

// ─── Schema-style validation ──────────────────────────────────────────────────

type Schema<T> = { [K in keyof T]?: Validator };

/**
 * validateSchema — Validate an entire object against a schema
 *
 * @example
 * const errors = validateSchema(formValues, {
 *   email: validateEmail,
 *   password: (v) => validatePassword(v, { minLength: 10 }),
 *   username: compose(required(), minLength(3), maxLength(20)),
 * });
 * // errors: { email?: string; password?: string; username?: string }
 */
export function validateSchema<T extends Record<string, unknown>>(
  values: T,
  schema: Schema<T>
): Partial<Record<keyof T, string>> {
  const errors: Partial<Record<keyof T, string>> = {};
  for (const field in schema) {
    const validator = schema[field];
    if (validator) {
      const error = validator(values[field]);
      if (error) errors[field] = error;
    }
  }
  return errors;
}

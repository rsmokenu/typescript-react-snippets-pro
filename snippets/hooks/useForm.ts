import { useState, useCallback, ChangeEvent } from 'react';

type FieldValue = string | number | boolean;
type FormValues = Record<string, FieldValue>;
type FormErrors<T extends FormValues> = Partial<Record<keyof T, string>>;
type Validators<T extends FormValues> = Partial<Record<keyof T, (value: FieldValue) => string | undefined>>;

interface UseFormOptions<T extends FormValues> {
  initialValues: T;
  validate?: Validators<T>;
  onSubmit: (values: T) => Promise<void> | void;
}

interface UseFormReturn<T extends FormValues> {
  values: T;
  errors: FormErrors<T>;
  touched: Partial<Record<keyof T, boolean>>;
  loading: boolean;
  submitError: string | null;
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleBlur: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  setFieldValue: (field: keyof T, value: FieldValue) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  reset: () => void;
  isValid: boolean;
}

/**
 * useForm — Full-featured form state management with validation
 *
 * Handles values, validation, touched state, loading, and errors.
 * No external dependencies — pure React hooks.
 *
 * @example
 * const { values, errors, handleChange, handleSubmit, loading } = useForm({
 *   initialValues: { email: '', password: '' },
 *   validate: {
 *     email: (v) => !String(v).includes('@') ? 'Invalid email' : undefined,
 *     password: (v) => String(v).length < 8 ? 'Min 8 characters' : undefined,
 *   },
 *   onSubmit: async (values) => {
 *     await authAPI.login(values);
 *   },
 * });
 *
 * // In JSX:
 * <input name="email" value={values.email} onChange={handleChange} onBlur={handleBlur} />
 * {errors.email && touched.email && <span>{errors.email}</span>}
 * <button onClick={handleSubmit} disabled={loading}>
 *   {loading ? 'Signing in...' : 'Sign In'}
 * </button>
 */
export function useForm<T extends FormValues>({
  initialValues,
  validate,
  onSubmit,
}: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Run validators and return errors object
  const runValidation = useCallback(
    (vals: T): FormErrors<T> => {
      if (!validate) return {};
      const newErrors: FormErrors<T> = {};
      for (const field in validate) {
        const validator = validate[field];
        if (validator) {
          const error = validator(vals[field]);
          if (error) newErrors[field as keyof T] = error;
        }
      }
      return newErrors;
    },
    [validate]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      const fieldValue =
        type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

      setValues((prev) => ({ ...prev, [name]: fieldValue }));
      // Re-validate on change if field was already touched
      setErrors((prev) => {
        if (!touched[name as keyof T]) return prev;
        const newErrors = runValidation({ ...values, [name]: fieldValue });
        return newErrors;
      });
    },
    [values, touched, runValidation]
  );

  const handleBlur = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name } = e.target;
      setTouched((prev) => ({ ...prev, [name]: true }));
      const newErrors = runValidation(values);
      setErrors(newErrors);
    },
    [values, runValidation]
  );

  const setFieldValue = useCallback((field: keyof T, value: FieldValue) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      // Mark all fields as touched
      const allTouched = Object.keys(values).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {} as Record<keyof T, boolean>
      );
      setTouched(allTouched);

      const validationErrors = runValidation(values);
      setErrors(validationErrors);

      if (Object.keys(validationErrors).length > 0) return;

      setLoading(true);
      setSubmitError(null);
      try {
        await onSubmit(values);
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    },
    [values, runValidation, onSubmit]
  );

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setLoading(false);
    setSubmitError(null);
  }, [initialValues]);

  const currentErrors = runValidation(values);
  const isValid = Object.keys(currentErrors).length === 0;

  return {
    values,
    errors,
    touched,
    loading,
    submitError,
    handleChange,
    handleBlur,
    setFieldValue,
    handleSubmit,
    reset,
    isValid,
  };
}

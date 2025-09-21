// lib/hooks/useForm.ts
import { useState, useCallback } from 'react';
import { validate, ValidationSchema } from '../validation';

interface UseFormOptions<T> {
  initialValues: T;
  validationSchema?: ValidationSchema;
  onSubmit: (values: T) => Promise<void> | void;
}

interface UseFormReturn<T> {
  values: T;
  errors: Record<string, string>;
  loading: boolean;
  setValue: (name: keyof T, value: any) => void;
  setValues: (values: Partial<T>) => void;
  setErrors: (errors: Record<string, string>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  resetForm: () => void;
  isValid: boolean;
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  validationSchema,
  onSubmit
}: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const setValue = useCallback((name: keyof T, value: any) => {
    setValuesState(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[name as string]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as string];
        return newErrors;
      });
    }
  }, [errors]);

  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState(prev => ({ ...prev, ...newValues }));
  }, []);

  const resetForm = useCallback(() => {
    setValuesState(initialValues);
    setErrors({});
    setLoading(false);
  }, [initialValues]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate if schema is provided
    if (validationSchema) {
      const validation = validate(values, validationSchema);
      if (!validation.isValid) {
        setErrors(validation.errors);
        return;
      }
    }

    setLoading(true);
    setErrors({});

    try {
      await onSubmit(values);
    } catch (error) {
      if (error && typeof error === 'object' && 'errors' in error) {
        setErrors(error.errors as Record<string, string>);
      } else {
        setErrors({ 
          general: error instanceof Error ? error.message : 'Error inesperado' 
        });
      }
    } finally {
      setLoading(false);
    }
  }, [values, validationSchema, onSubmit]);

  const isValid = validationSchema 
    ? validate(values, validationSchema).isValid 
    : Object.keys(errors).length === 0;

  return {
    values,
    errors,
    loading,
    setValue,
    setValues,
    setErrors,
    handleSubmit,
    resetForm,
    isValid
  };
}
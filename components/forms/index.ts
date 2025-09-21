// components/forms/index.ts
export { BaseForm } from './BaseForm';
export type { FormFieldConfig } from './BaseForm';

export {
  ClienteFormFields,
  ChoferFormFields,
  CamionFormFields,
  AcopladoFormFields
} from './configs';

// Re-export validation utilities
export * from '../../lib/validation';
export { useForm } from '../../lib/hooks/useForm';
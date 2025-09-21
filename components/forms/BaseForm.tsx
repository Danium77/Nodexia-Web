// components/forms/BaseForm.tsx
import React from 'react';
import { FormCard } from '../ui/FormCard';

export interface FormFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'select' | 'textarea' | 'date' | 'number';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  validation?: {
    pattern?: RegExp;
    message?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
}

interface BaseFormProps {
  title: string;
  fields: FormFieldConfig[];
  values: Record<string, any>;
  errors: Record<string, string>;
  loading?: boolean;
  submitText?: string;
  cancelText?: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
  onChange: (name: string, value: any) => void;
  children?: React.ReactNode;
}

export const BaseForm: React.FC<BaseFormProps> = ({
  title,
  fields,
  values,
  errors,
  loading = false,
  submitText = 'Guardar',
  cancelText = 'Cancelar',
  onSubmit,
  onCancel,
  onChange,
  children
}) => {
  const renderField = (field: FormFieldConfig) => {
    const commonProps = {
      id: field.name,
      name: field.name,
      value: values[field.name] || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => 
        onChange(field.name, e.target.value),
      className: `w-full px-4 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${
        errors[field.name] ? 'border-red-500' : 'border-gray-600'
      }`,
      placeholder: field.placeholder,
      required: field.required,
      disabled: loading
    };

    switch (field.type) {
      case 'select':
        return (
          <select {...commonProps}>
            <option value="">{field.placeholder || `Seleccionar ${field.label.toLowerCase()}`}</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={4}
            onChange={(e) => onChange(field.name, e.target.value)}
          />
        );
      
      case 'number':
        return (
          <input
            {...commonProps}
            type="number"
            min={field.validation?.min}
            max={field.validation?.max}
            onChange={(e) => onChange(field.name, e.target.value)}
          />
        );
      
      default:
        return (
          <input
            {...commonProps}
            type={field.type}
            minLength={field.validation?.minLength}
            maxLength={field.validation?.maxLength}
            pattern={field.validation?.pattern?.source}
            onChange={(e) => onChange(field.name, e.target.value)}
          />
        );
    }
  };

  return (
    <FormCard title={title}>
      <form onSubmit={onSubmit} className="space-y-6">
        {fields.map((field) => (
          <div key={field.name} className="space-y-2">
            <label htmlFor={field.name} className="block text-sm font-medium text-gray-300">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </label>
            {renderField(field)}
            {errors[field.name] && (
              <p className="text-red-400 text-sm">{errors[field.name]}</p>
            )}
          </div>
        ))}

        {children}

        <div className="flex gap-4 pt-6">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-cyan-600 text-white py-2 px-4 rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Guardando...' : submitText}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {cancelText}
            </button>
          )}
        </div>
      </form>
    </FormCard>
  );
};
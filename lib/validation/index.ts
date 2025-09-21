// lib/validation/index.ts

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  message?: string;
}

export interface ValidationSchema {
  [fieldName: string]: ValidationRule;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validate a single field value against its rule
 */
export function validateField(value: any, rule: ValidationRule, fieldName: string): string | null {
  // Required validation
  if (rule.required && (!value || value.toString().trim() === '')) {
    return rule.message || `${fieldName} es requerido`;
  }

  // Skip other validations if value is empty and not required
  if (!value || value.toString().trim() === '') {
    return null;
  }

  const strValue = value.toString();

  // Min length validation
  if (rule.minLength && strValue.length < rule.minLength) {
    return rule.message || `${fieldName} debe tener al menos ${rule.minLength} caracteres`;
  }

  // Max length validation
  if (rule.maxLength && strValue.length > rule.maxLength) {
    return rule.message || `${fieldName} no puede tener más de ${rule.maxLength} caracteres`;
  }

  // Pattern validation
  if (rule.pattern && !rule.pattern.test(strValue)) {
    return rule.message || `${fieldName} tiene un formato inválido`;
  }

  // Custom validation
  if (rule.custom) {
    return rule.custom(value);
  }

  return null;
}

/**
 * Validate an object against a schema
 */
export function validate(data: Record<string, any>, schema: ValidationSchema): ValidationResult {
  const errors: Record<string, string> = {};

  for (const [fieldName, rule] of Object.entries(schema)) {
    const error = validateField(data[fieldName], rule, fieldName);
    if (error) {
      errors[fieldName] = error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Common validation patterns
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[+]?[\d\s\-()]+$/,
  cuit: /^\d{2}-\d{8}-\d{1}$|^\d{11}$/,
  dni: /^\d{7,8}$/,
  patente: /^[A-Z]{3}\d{3}$|^[A-Z]{2}\d{3}[A-Z]{2}$/,
  numeroMovil: /^\d+$/
};

// Common validation messages
export const ValidationMessages = {
  required: (field: string) => `${field} es requerido`,
  email: 'El email debe tener un formato válido',
  phone: 'El teléfono debe tener un formato válido',
  cuit: 'El CUIT debe tener el formato XX-XXXXXXXX-X o 11 dígitos',
  dni: 'El DNI debe tener 7 u 8 dígitos',
  patente: 'La patente debe tener el formato ABC123 o AB123CD',
  minLength: (field: string, min: number) => `${field} debe tener al menos ${min} caracteres`,
  maxLength: (field: string, max: number) => `${field} no puede tener más de ${max} caracteres`
};

// Predefined validation schemas
export const ValidationSchemas = {
  cliente: {
    razon_social: {
      required: true,
      minLength: 2,
      maxLength: 255,
      message: ValidationMessages.required('Razón Social')
    },
    cuit: {
      required: true,
      pattern: ValidationPatterns.cuit,
      message: ValidationMessages.cuit
    },
    email: {
      pattern: ValidationPatterns.email,
      message: ValidationMessages.email
    },
    telefono: {
      pattern: ValidationPatterns.phone,
      message: ValidationMessages.phone
    },
    direccion: {
      required: true,
      minLength: 5,
      maxLength: 255,
      message: ValidationMessages.required('Dirección')
    },
    localidad: {
      required: true,
      minLength: 2,
      maxLength: 100,
      message: ValidationMessages.required('Localidad')
    },
    provincia: {
      required: true,
      minLength: 2,
      maxLength: 100,
      message: ValidationMessages.required('Provincia')
    }
  },

  chofer: {
    nombre: {
      required: true,
      minLength: 2,
      maxLength: 100,
      message: ValidationMessages.required('Nombre')
    },
    apellido: {
      required: true,
      minLength: 2,
      maxLength: 100,
      message: ValidationMessages.required('Apellido')
    },
    dni: {
      required: true,
      pattern: ValidationPatterns.dni,
      message: ValidationMessages.dni
    },
    telefono: {
      required: true,
      pattern: ValidationPatterns.phone,
      message: ValidationMessages.phone
    },
    email: {
      pattern: ValidationPatterns.email,
      message: ValidationMessages.email
    },
    licencia_numero: {
      required: true,
      minLength: 8,
      maxLength: 20,
      message: ValidationMessages.required('Número de Licencia')
    },
    licencia_vencimiento: {
      required: true,
      message: ValidationMessages.required('Vencimiento de Licencia')
    }
  },

  camion: {
    numero_movil: {
      required: true,
      pattern: ValidationPatterns.numeroMovil,
      message: 'El número de móvil debe ser numérico'
    },
    patente: {
      required: true,
      pattern: ValidationPatterns.patente,
      message: ValidationMessages.patente
    },
    marca: {
      required: true,
      minLength: 2,
      maxLength: 50,
      message: ValidationMessages.required('Marca')
    },
    modelo: {
      required: true,
      minLength: 2,
      maxLength: 50,
      message: ValidationMessages.required('Modelo')
    },
    año: {
      required: true,
      custom: (value: any) => {
        const year = parseInt(value);
        const currentYear = new Date().getFullYear();
        if (isNaN(year) || year < 1980 || year > currentYear + 2) {
          return `El año debe estar entre 1980 y ${currentYear + 2}`;
        }
        return null;
      }
    }
  },

  acoplado: {
    numero_acoplado: {
      required: true,
      pattern: ValidationPatterns.numeroMovil,
      message: 'El número de acoplado debe ser numérico'
    },
    patente: {
      required: true,
      pattern: ValidationPatterns.patente,
      message: ValidationMessages.patente
    },
    marca: {
      required: true,
      minLength: 2,
      maxLength: 50,
      message: ValidationMessages.required('Marca')
    },
    modelo: {
      required: true,
      minLength: 2,
      maxLength: 50,
      message: ValidationMessages.required('Modelo')
    }
  }
};
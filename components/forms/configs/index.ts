// components/forms/configs/index.ts
import type { FormFieldConfig } from '../BaseForm';

export const ClienteFormFields: FormFieldConfig[] = [
  {
    name: 'razon_social',
    label: 'Razón Social',
    type: 'text',
    placeholder: 'Ingrese la razón social',
    required: true,
    validation: {
      minLength: 2,
      maxLength: 255
    }
  },
  {
    name: 'cuit',
    label: 'CUIT',
    type: 'text',
    placeholder: 'XX-XXXXXXXX-X',
    required: true,
    validation: {
      pattern: /^\d{2}-\d{8}-\d{1}$|^\d{11}$/,
      message: 'El CUIT debe tener el formato XX-XXXXXXXX-X o 11 dígitos'
    }
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    placeholder: 'cliente@ejemplo.com',
    validation: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'El email debe tener un formato válido'
    }
  },
  {
    name: 'telefono',
    label: 'Teléfono',
    type: 'tel',
    placeholder: '+54 11 1234-5678',
    validation: {
      pattern: /^[+]?[\d\s\-()]+$/,
      message: 'El teléfono debe tener un formato válido'
    }
  },
  {
    name: 'direccion',
    label: 'Dirección',
    type: 'text',
    placeholder: 'Av. Ejemplo 1234',
    required: true,
    validation: {
      minLength: 5,
      maxLength: 255
    }
  },
  {
    name: 'localidad',
    label: 'Localidad',
    type: 'text',
    placeholder: 'Ciudad',
    required: true,
    validation: {
      minLength: 2,
      maxLength: 100
    }
  },
  {
    name: 'provincia',
    label: 'Provincia',
    type: 'text',
    placeholder: 'Provincia',
    required: true,
    validation: {
      minLength: 2,
      maxLength: 100
    }
  },
  {
    name: 'codigo_postal',
    label: 'Código Postal',
    type: 'text',
    placeholder: '1234',
    validation: {
      pattern: /^\d{4}$/,
      message: 'El código postal debe tener 4 dígitos'
    }
  }
];

export const ChoferFormFields: FormFieldConfig[] = [
  {
    name: 'nombre',
    label: 'Nombre',
    type: 'text',
    placeholder: 'Nombre del chofer',
    required: true,
    validation: {
      minLength: 2,
      maxLength: 100
    }
  },
  {
    name: 'apellido',
    label: 'Apellido',
    type: 'text',
    placeholder: 'Apellido del chofer',
    required: true,
    validation: {
      minLength: 2,
      maxLength: 100
    }
  },
  {
    name: 'dni',
    label: 'DNI',
    type: 'text',
    placeholder: '12345678',
    required: true,
    validation: {
      pattern: /^\d{7,8}$/,
      message: 'El DNI debe tener 7 u 8 dígitos'
    }
  },
  {
    name: 'telefono',
    label: 'Teléfono',
    type: 'tel',
    placeholder: '+54 11 1234-5678',
    required: true,
    validation: {
      pattern: /^[+]?[\d\s\-()]+$/,
      message: 'El teléfono debe tener un formato válido'
    }
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    placeholder: 'chofer@ejemplo.com',
    validation: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'El email debe tener un formato válido'
    }
  },
  {
    name: 'direccion',
    label: 'Dirección',
    type: 'text',
    placeholder: 'Av. Ejemplo 1234',
    validation: {
      minLength: 5,
      maxLength: 255
    }
  },
  {
    name: 'fecha_nacimiento',
    label: 'Fecha de Nacimiento',
    type: 'date',
    required: true
  },
  {
    name: 'licencia_numero',
    label: 'Número de Licencia',
    type: 'text',
    placeholder: 'Número de licencia de conducir',
    required: true,
    validation: {
      minLength: 8,
      maxLength: 20
    }
  },
  {
    name: 'licencia_tipo',
    label: 'Tipo de Licencia',
    type: 'select',
    required: true,
    options: [
      { value: 'A', label: 'Clase A' },
      { value: 'B', label: 'Clase B' },
      { value: 'C', label: 'Clase C' },
      { value: 'D', label: 'Clase D' },
      { value: 'E', label: 'Clase E' }
    ]
  },
  {
    name: 'licencia_vencimiento',
    label: 'Vencimiento de Licencia',
    type: 'date',
    required: true
  },
  {
    name: 'estado',
    label: 'Estado',
    type: 'select',
    required: true,
    options: [
      { value: 'disponible', label: 'Disponible' },
      { value: 'ocupado', label: 'Ocupado' },
      { value: 'descanso', label: 'En Descanso' },
      { value: 'vacaciones', label: 'De Vacaciones' },
      { value: 'inactivo', label: 'Inactivo' }
    ]
  }
];

export const CamionFormFields: FormFieldConfig[] = [
  {
    name: 'numero_movil',
    label: 'Número de Móvil',
    type: 'number',
    placeholder: '001',
    required: true,
    validation: {
      min: 1,
      max: 9999
    }
  },
  {
    name: 'patente',
    label: 'Patente',
    type: 'text',
    placeholder: 'ABC123 o AB123CD',
    required: true,
    validation: {
      pattern: /^[A-Z]{3}\d{3}$|^[A-Z]{2}\d{3}[A-Z]{2}$/,
      message: 'La patente debe tener el formato ABC123 o AB123CD'
    }
  },
  {
    name: 'marca',
    label: 'Marca',
    type: 'text',
    placeholder: 'Mercedes Benz, Scania, etc.',
    required: true,
    validation: {
      minLength: 2,
      maxLength: 50
    }
  },
  {
    name: 'modelo',
    label: 'Modelo',
    type: 'text',
    placeholder: 'Actros, R440, etc.',
    required: true,
    validation: {
      minLength: 2,
      maxLength: 50
    }
  },
  {
    name: 'año',
    label: 'Año',
    type: 'number',
    placeholder: '2020',
    required: true,
    validation: {
      min: 1980,
      max: new Date().getFullYear() + 2
    }
  },
  {
    name: 'kilometraje',
    label: 'Kilometraje',
    type: 'number',
    placeholder: '100000',
    validation: {
      min: 0,
      max: 9999999
    }
  },
  {
    name: 'combustible',
    label: 'Tipo de Combustible',
    type: 'select',
    required: true,
    options: [
      { value: 'diesel', label: 'Diesel' },
      { value: 'gasolina', label: 'Gasolina' },
      { value: 'gnc', label: 'GNC' },
      { value: 'electrico', label: 'Eléctrico' }
    ]
  },
  {
    name: 'estado',
    label: 'Estado',
    type: 'select',
    required: true,
    options: [
      { value: 'disponible', label: 'Disponible' },
      { value: 'en_uso', label: 'En Uso' },
      { value: 'mantenimiento', label: 'En Mantenimiento' },
      { value: 'reparacion', label: 'En Reparación' },
      { value: 'inactivo', label: 'Inactivo' }
    ]
  }
];

export const AcopladoFormFields: FormFieldConfig[] = [
  {
    name: 'numero_acoplado',
    label: 'Número de Acoplado',
    type: 'number',
    placeholder: '001',
    required: true,
    validation: {
      min: 1,
      max: 9999
    }
  },
  {
    name: 'patente',
    label: 'Patente',
    type: 'text',
    placeholder: 'ABC123 o AB123CD',
    required: true,
    validation: {
      pattern: /^[A-Z]{3}\d{3}$|^[A-Z]{2}\d{3}[A-Z]{2}$/,
      message: 'La patente debe tener el formato ABC123 o AB123CD'
    }
  },
  {
    name: 'marca',
    label: 'Marca',
    type: 'text',
    placeholder: 'Helvetica, Acoplados del Norte, etc.',
    required: true,
    validation: {
      minLength: 2,
      maxLength: 50
    }
  },
  {
    name: 'modelo',
    label: 'Modelo',
    type: 'text',
    placeholder: 'Cisterna, Silo, etc.',
    required: true,
    validation: {
      minLength: 2,
      maxLength: 50
    }
  },
  {
    name: 'año',
    label: 'Año',
    type: 'number',
    placeholder: '2020',
    required: true,
    validation: {
      min: 1980,
      max: new Date().getFullYear() + 2
    }
  },
  {
    name: 'capacidad',
    label: 'Capacidad (toneladas)',
    type: 'number',
    placeholder: '30',
    validation: {
      min: 1,
      max: 100
    }
  },
  {
    name: 'tipo',
    label: 'Tipo de Acoplado',
    type: 'select',
    required: true,
    options: [
      { value: 'cisterna', label: 'Cisterna' },
      { value: 'silo', label: 'Silo' },
      { value: 'plataforma', label: 'Plataforma' },
      { value: 'furgon', label: 'Furgón' },
      { value: 'jaula', label: 'Jaula' }
    ]
  },
  {
    name: 'estado',
    label: 'Estado',
    type: 'select',
    required: true,
    options: [
      { value: 'disponible', label: 'Disponible' },
      { value: 'en_uso', label: 'En Uso' },
      { value: 'mantenimiento', label: 'En Mantenimiento' },
      { value: 'reparacion', label: 'En Reparación' },
      { value: 'inactivo', label: 'Inactivo' }
    ]
  }
];
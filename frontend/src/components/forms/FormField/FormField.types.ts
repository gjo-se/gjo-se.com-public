export type FormFieldLayout = 'row' | 'column' | 'floating';

export type FormFieldType = 'text' | 'textarea' | 'email' | 'url' | 'number' | 'password' | 'date';

export interface FormFieldVariants {
  type?: FormFieldType;
}

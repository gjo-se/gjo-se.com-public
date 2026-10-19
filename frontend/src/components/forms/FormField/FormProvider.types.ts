import type { ComponentType } from 'react';
import type { ZodObject, ZodTypeAny } from 'zod';

/** Value carried by the form context: the TanStack form instance + optional schema. */
export interface FormContextValue {
  form: FormInstance
  schema: FormSchema | null
}

/** Minimal TanStack form instance surface consumed via the form context. */
export interface FormInstance {
  Field: ComponentType<any>
  handleSubmit: Function
  setFieldValue: Function
}

/** Zod object schema shape used for field-level validation in FormField. */
export type FormSchema = ZodObject<Record<string, ZodTypeAny>>;

/** Minimal interface for a TanStack Form FieldApi render argument. */
export interface TanField {
  state: { meta: { errors: unknown[] }; value: unknown }
  handleChange: (value: unknown) => void
  handleBlur: () => void
  name: string
}

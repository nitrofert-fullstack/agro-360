"use client"

import * as React from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  children?: React.ReactNode
  className?: string
  /** id del control; si se omite se genera y se asocia al Label automáticamente */
  htmlFor?: string
}

export function FormField({ label, required, error, children, className, htmlFor }: FormFieldProps) {
  const autoId = React.useId()
  const fieldId = htmlFor ?? autoId
  const errorId = `${fieldId}-error`

  // Inyecta id + aria en el control hijo (si es un único elemento) para asociar
  // Label↔control y anunciar el error en lectores de pantalla.
  const control = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        id: (children as React.ReactElement<Record<string, unknown>>).props.id ?? fieldId,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? errorId : undefined,
        "aria-required": required || undefined,
      })
    : children

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={fieldId} className="flex items-center gap-1">
        {label}
        {required && <span className="text-red-500" aria-hidden="true">*</span>}
        {required && <span className="sr-only">(obligatorio)</span>}
      </Label>
      {control}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-500 flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  required?: boolean
  error?: string
}

export function FormInput({ label, required, error, className, id, ...props }: FormInputProps) {
  const autoId = React.useId()
  const fieldId = id ?? autoId
  return (
    <FormField label={label} required={required} error={error} htmlFor={fieldId}>
      <Input
        id={fieldId}
        className={cn(
          error && "border-red-500 focus-visible:ring-red-500",
          className
        )}
        {...props}
      />
    </FormField>
  )
}

"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/types/identity";

export interface FormField {
  autoComplete?: string;
  defaultValue?: string;
  label: string;
  name: string;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  required?: boolean;
  type?: "checkbox" | "email" | "hidden" | "password" | "select" | "text";
}

export function ServerActionForm({
  action,
  fields,
  submitLabel
}: {
  action: (data: FormData) => Promise<ActionResult>;
  fields: FormField[];
  submitLabel: string;
}) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const { handleSubmit, register } = useForm<Record<string, string | boolean>>();

  return (
    <form
      className="identity-form"
      noValidate
      onSubmit={handleSubmit((values) => {
        const data = new FormData();
        for (const field of fields) {
          const value = values[field.name] ?? field.defaultValue ?? "";
          data.set(field.name, typeof value === "boolean" ? (value ? "true" : "") : value);
        }
        startTransition(async () => setResult(await action(data)));
      })}
    >
      {fields.map((field) => {
        if (field.type === "hidden")
          return (
            <input
              key={field.name}
              type="hidden"
              value={field.defaultValue}
              {...register(field.name)}
            />
          );
        if (field.type === "checkbox") {
          return (
            <label className="identity-check" key={field.name}>
              <input
                defaultChecked={field.defaultValue === "true"}
                type="checkbox"
                {...register(field.name)}
              />
              <span>{field.label}</span>
            </label>
          );
        }
        const fieldError = result?.fieldErrors?.[field.name]?.[0];
        if (field.type === "select") {
          return (
            <label className="identity-field" key={field.name}>
              <span>{field.label}</span>
              <select
                className="identity-select"
                defaultValue={field.defaultValue}
                {...register(field.name)}
              >
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          );
        }
        return (
          <label className="identity-field" key={field.name}>
            <span>{field.label}</span>
            <Input
              aria-describedby={fieldError ? `${field.name}-error` : undefined}
              aria-invalid={Boolean(fieldError)}
              autoComplete={field.autoComplete}
              defaultValue={field.defaultValue}
              placeholder={field.placeholder}
              required={field.required}
              type={field.type ?? "text"}
              {...register(field.name)}
            />
            {fieldError ? (
              <span className="identity-field-error" id={`${field.name}-error`}>
                {fieldError}
              </span>
            ) : null}
          </label>
        );
      })}
      <div
        aria-live="polite"
        className={result?.success ? "identity-success" : "identity-error"}
        role="status"
      >
        {result?.message ?? result?.error}
      </div>
      <Button disabled={pending} type="submit">
        {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
        {pending ? "Please wait" : submitLabel}
      </Button>
    </form>
  );
}

"use client";
import { Search } from "lucide-react";
import {
  forwardRef,
  useId,
  useMemo,
  useState,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes
} from "react";
import { cn } from "@/lib/utils/cn";
import { Input } from "@/shared/ui/input";
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn("ui-input ui-textarea", className)} {...props} />;
});
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn("ui-input ui-select", className)} {...props}>
        {children}
      </select>
    );
  }
);
export function Checkbox({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="ui-choice">
      <input type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
}
export function Radio({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="ui-choice">
      <input type="radio" {...props} />
      <span>{label}</span>
    </label>
  );
}
export function Switch({
  checked,
  label,
  onCheckedChange
}: {
  checked: boolean;
  label: string;
  onCheckedChange(value: boolean): void;
}) {
  return (
    <button
      aria-checked={checked}
      className="ui-switch"
      onClick={() => onCheckedChange(!checked)}
      role="switch"
      type="button"
    >
      <span className="ui-switch-thumb" />
      <span>{label}</span>
    </button>
  );
}
export function SearchInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="ui-search">
      <Search aria-hidden="true" className="size-4" />
      <Input type="search" {...props} />
    </div>
  );
}
export function Combobox({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange(value: string): void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase())),
    [options, query]
  );
  return (
    <div className="ui-combobox">
      <label htmlFor={id}>{label}</label>
      <Input
        aria-autocomplete="list"
        aria-controls={`${id}-list`}
        id={id}
        onChange={(event) => setQuery(event.target.value)}
        value={query}
      />
      <ul id={`${id}-list`} role="listbox">
        {filtered.map((option) => (
          <li
            aria-selected={option.value === value}
            key={option.value}
            onMouseDown={() => {
              onChange(option.value);
              setQuery(option.label);
            }}
            role="option"
          >
            {option.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
export function Autocomplete(props: Parameters<typeof Combobox>[0]) {
  return <Combobox {...props} />;
}
export function OtpInput({
  length = 6,
  onChange,
  value
}: {
  length?: number;
  onChange(value: string): void;
  value: string;
}) {
  return (
    <div aria-label="One-time code" className="ui-otp" role="group">
      {Array.from({ length }, (_, index) => (
        <Input
          aria-label={`Digit ${index + 1}`}
          inputMode="numeric"
          key={index}
          maxLength={1}
          onChange={(event) => {
            const next = value.split("");
            next[index] = event.target.value.replace(/\D/g, "");
            onChange(next.join(""));
          }}
          value={value[index] ?? ""}
        />
      ))}
    </div>
  );
}
export function DatePicker(props: InputHTMLAttributes<HTMLInputElement>) {
  return <Input type="date" {...props} />;
}
export function TimePicker(props: InputHTMLAttributes<HTMLInputElement>) {
  return <Input type="time" {...props} />;
}
export function Calendar({
  label = "Calendar",
  onChange,
  value
}: {
  label?: string;
  onChange(value: string): void;
  value: string;
}) {
  return (
    <label className="ui-field">
      <span>{label}</span>
      <DatePicker onChange={(event) => onChange(event.target.value)} value={value} />
    </label>
  );
}

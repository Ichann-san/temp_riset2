"use client";

// Form building blocks of the wireframe grammar. Client-only because ids come from useId().
import { type ReactElement, type ReactNode, type SelectHTMLAttributes, cloneElement, isValidElement, useId } from "react";
import { Icon } from "@/components/icon";

type ControlProps = { id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean | "true" | "false" };

/** Styled native form select; retains browser keyboard, validation and mobile picker behavior. */
export function SelectField({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <span className="select-field"><select {...props} className={`field ${className}`}>{children}</select><Icon name="chevron" size={16} /></span>;
}

/**
 * Field group: consistent label, optional hint or validation text, then ONE control (input/select/textarea).
 * The control gets an id, aria-describedby (error, hint) and aria-invalid when there is an error, so the hint and error
 * are announced as descriptions instead of becoming part of the accessible name.
 */
export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  const base = useId();
  const control = isValidElement<ControlProps>(children) ? children as ReactElement<ControlProps> : null;
  const id = control?.props.id ?? `${base}-control`;
  const hintId = hint ? `${base}-hint` : undefined;
  const errorId = error ? `${base}-error` : undefined;
  const describedBy = [errorId, hintId, control?.props["aria-describedby"]].filter(Boolean).join(" ") || undefined;
  return <div className="field-group">
    <label className="field-label" htmlFor={control ? id : undefined}>{label}</label>
    {hint && <small id={hintId}>{hint}</small>}
    {error && <span id={errorId} className="field-error">{error}</span>}
    {control ? cloneElement(control, { id, "aria-describedby": describedBy, "aria-invalid": error ? true : control.props["aria-invalid"] }) : children}
  </div>;
}

/** Five radio stars ("Nilai Pelayanan"). Controlled: pass value and onChange. */
export function StarRating({ legend, name, value, onChange, error }: { legend: string; name: string; value: number; onChange: (value: number) => void; error?: string }) {
  const errorId = `${useId()}-error`;
  return <fieldset className="star-rating" aria-describedby={error ? errorId : undefined} aria-invalid={error ? true : undefined}>
    <legend className="field-label">{legend}</legend>
    {error && <span id={errorId} className="field-error">{error}</span>}
    <div className="stars">{[1, 2, 3, 4, 5].map((n) => <label key={n} className="star" data-on={n <= value || undefined}>
      <input type="radio" name={name} value={n} checked={value === n} onChange={() => onChange(n)} />
      <Icon name="star" size={34} filled={n <= value} /><span className="sr-only">{n} dari 5</span>
    </label>)}</div>
  </fieldset>;
}

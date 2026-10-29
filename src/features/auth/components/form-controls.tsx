"use client";

import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useId, useState, type ComponentProps, type ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Form building blocks for the auth and onboarding screens: labelled inputs with an inline
 * error, a show/hide password input, banners and buttons. Styled with the
 * brand tokens (Stitch auth designs).
 */

const inputClass = cn(
  "h-12 w-full rounded-xl border border-sand bg-white px-4 text-body-lg text-graphite shadow-[0_1px_2px_rgba(43,35,38,0.04)] transition-[border-color,box-shadow] outline-none sm:text-body-md",
  "placeholder:text-plum/70 focus-visible:border-burgundy focus-visible:ring-[3px] focus-visible:ring-burgundy/10",
  "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/10",
  "disabled:cursor-not-allowed disabled:opacity-60",
);

interface FieldProps {
  label: string;
  error?: string;
  /** Leading icon inside the input. */
  icon?: ReactNode;
  /** Right side of the label row, e.g. "Forgot password?". */
  labelAside?: ReactNode;
  /** Shown under the input when there is no error. */
  hint?: ReactNode;
}

function FieldShell({
  id,
  label,
  error,
  labelAside,
  hint,
  children,
}: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-label-md text-graphite">
          {label}
        </label>
        {labelAside}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-center gap-1.5 text-body-sm text-destructive">
          <AlertCircle aria-hidden className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : (
        hint
      )}
    </div>
  );
}

function IconSlot({ children }: Readonly<{ children?: ReactNode }>) {
  if (!children) return null;
  return (
    <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-plum [&_svg]:size-[18px]">
      {children}
    </span>
  );
}

export function TextField({
  label,
  error,
  icon,
  labelAside,
  hint,
  className,
  ...input
}: FieldProps & ComponentProps<"input">) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} labelAside={labelAside} hint={hint}>
      <div className="relative">
        <IconSlot>{icon}</IconSlot>
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(inputClass, icon && "pl-11", className)}
          {...input}
        />
      </div>
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  error,
  labelAside,
  hint,
  className,
  ...textarea
}: Omit<FieldProps, "icon"> & ComponentProps<"textarea">) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} labelAside={labelAside} hint={hint}>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(inputClass, "h-auto min-h-24 resize-y py-3", className)}
        {...textarea}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  error,
  labelAside,
  hint,
  className,
  children,
  ...select
}: Omit<FieldProps, "icon"> & ComponentProps<"select">) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} labelAside={labelAside} hint={hint}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(inputClass, "appearance-auto pr-3", className)}
        {...select}
      >
        {children}
      </select>
    </FieldShell>
  );
}

/** "Optional" marker for the right side of a label row. */
export function OptionalTag() {
  return <span className="text-body-sm text-plum">Optional</span>;
}

export function PasswordField({
  label,
  error,
  icon,
  labelAside,
  hint,
  className,
  ...input
}: FieldProps & Omit<ComponentProps<"input">, "type">) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell id={id} label={label} error={error} labelAside={labelAside} hint={hint}>
      <div className="relative">
        <IconSlot>{icon}</IconSlot>
        <input
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(inputClass, "pr-12", icon && "pl-11", className)}
          {...input}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-plum transition-colors hover:text-burgundy focus-visible:outline-2 focus-visible:outline-burgundy"
        >
          {visible ? (
            <EyeOff aria-hidden className="size-[18px]" />
          ) : (
            <Eye aria-hidden className="size-[18px]" />
          )}
        </button>
      </div>
    </FieldShell>
  );
}

/** Error banner: white, red left border (Stitch "Sign In — Error State"). */
export function FormAlert({ title, children }: Readonly<{ title: string; children?: ReactNode }>) {
  return (
    <div
      role="alert"
      className="mb-6 flex gap-3 rounded-xl border border-sand border-l-4 border-l-destructive bg-white p-4 shadow-[0_1px_3px_rgba(43,35,38,0.04)]"
    >
      <AlertCircle aria-hidden className="mt-0.5 size-5 shrink-0 text-destructive" />
      <div className="text-body-md">
        <p className="font-semibold text-graphite">{title}</p>
        {children && <div className="mt-0.5 text-body-sm text-plum">{children}</div>}
      </div>
    </div>
  );
}

const buttonBase =
  "inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-full text-title-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy disabled:cursor-not-allowed [&_svg]:size-[18px]";

export const primaryButtonClass = cn(
  buttonBase,
  "bg-burgundy text-ivory shadow-sm hover:bg-burgundy-deep disabled:opacity-70 disabled:hover:bg-burgundy",
);

export const secondaryButtonClass = cn(
  buttonBase,
  "border border-sand bg-white text-graphite hover:bg-ivory",
);

/** Primary submit button with a spinner while the request is in flight. */
export function SubmitButton({
  pending,
  pendingLabel,
  icon,
  children,
  disabled,
}: Readonly<{
  pending: boolean;
  pendingLabel: string;
  icon?: ReactNode;
  children: ReactNode;
  disabled?: boolean;
}>) {
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending || undefined}
      className={primaryButtonClass}
    >
      {pending ? (
        <>
          <Loader2 aria-hidden className="animate-spin" />
          {pendingLabel}
        </>
      ) : (
        <>
          {children}
          {icon}
        </>
      )}
    </button>
  );
}

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "tonal" | "text" | "danger";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-fern text-on-fern",
  tonal: "bg-surface-2 text-ink",
  text: "bg-transparent text-fern",
  danger: "bg-transparent text-danger",
};

export function Button({
  variant = "primary",
  block = false,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; block?: boolean }) {
  const size = variant === "text" || variant === "danger" ? "min-h-11 px-3" : "h-[52px] px-6";
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-field font-medium transition-[opacity,transform] active:scale-[0.98] active:opacity-90 disabled:opacity-40 disabled:active:scale-100 ${size} ${block ? "w-full" : ""} ${BUTTON_STYLES[variant]} ${className}`}
    />
  );
}

/** Cifra grande + unidad pequeña + etiqueta. La pieza básica de toda la app. */
export function StatBlock({
  value,
  unit,
  label,
  size = "l",
  align = "left",
  color,
}: {
  value: string;
  unit?: string;
  label?: string;
  size?: "xl" | "l" | "m";
  align?: "left" | "right";
  color?: string;
}) {
  const cls = size === "xl" ? "display-xl" : size === "l" ? "display-l" : "title-l";
  const unitCls = size === "xl" ? "text-[1.75rem]" : size === "l" ? "text-xl" : "text-base";
  return (
    <div className={align === "right" ? "text-right" : ""}>
      {label && <div className="label text-ink-2">{label}</div>}
      <div className="flex items-baseline gap-1.5" style={align === "right" ? { justifyContent: "flex-end" } : undefined}>
        <span className={`${cls} tnum`} style={color ? { color } : undefined}>
          {value}
        </span>
        {unit && <span className={`${unitCls} font-medium text-ink-3`}>{unit}</span>}
      </div>
    </div>
  );
}

export function Chip({
  selected,
  children,
  onClick,
  ...rest
}: { selected: boolean; children: ReactNode; onClick: () => void } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick">) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      {...rest}
      className={`min-h-11 rounded-full px-4 text-[0.9375rem] font-medium transition-colors ${
        selected ? "bg-ink text-canvas" : "bg-surface-2 text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function ChipGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {children}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 py-1">
      <span>
        <span className="block">{label}</span>
        {hint && <span className="body-s block text-ink-2">{hint}</span>}
      </span>
      <span className="relative inline-block h-[31px] w-[51px] shrink-0">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0"
        />
        <span className="absolute inset-0 rounded-full bg-surface-2 transition-colors peer-checked:bg-fern peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-fern" />
        <span className="absolute top-[2px] left-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.3)] transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="rounded-card bg-surface px-5 py-8">
      <p className="title-m">{title}</p>
      {body && <p className="mt-1.5 text-ink-2">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="title-m">{children}</h2>
      {action}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="label mb-1.5 block text-ink-2">{label}</span>
      {children}
      {hint && <span className="body-s mt-1.5 block text-ink-3">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "h-[52px] w-full rounded-field bg-surface-2 px-4 text-base text-ink outline-none placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fern";

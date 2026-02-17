"use client";

import { theme } from "@/app/ui/theme";

export function Container({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 ${className}`}
      style={{ maxWidth: theme.containerMax }}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  rightSlot,
}: {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A]">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-[#64748B]">{subtitle}</p>
        ) : null}
      </div>
      {rightSlot ? <div className="flex shrink-0">{rightSlot}</div> : null}
    </header>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[1rem] border bg-[#FFFFFF] p-5 shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] transition-shadow hover:shadow-[0_4px_6px_-1px_rgb(0_0_0/0.07),0_2px_4px_-2px_rgb(0_0_0/0.05)] ${className}`}
      style={{ borderColor: theme.colors.border }}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-base font-semibold text-[#0F172A] ${className}`}>{children}</h2>;
}

export function CardSubtitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`mt-0.5 text-sm text-[#64748B] ${className}`}>{children}</p>;
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const buttonBase =
  "inline-flex items-center justify-center font-medium transition-all rounded-[0.75rem] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C0841A]/40";
const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-[#111827] text-white hover:bg-[#1f2937] focus:ring-[#111827] active:scale-[0.98]",
  secondary:
    "border border-[rgba(15,23,42,0.10)] bg-white text-[#0F172A] hover:bg-[#F8FAFC] focus:ring-[#64748B]",
  ghost:
    "text-[#0F172A] hover:bg-[#F1F5F9] focus:ring-[#64748B]",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 active:scale-[0.98]",
};
const buttonSizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...rest
}: {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`${buttonBase} ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

type BadgeVariant = "brand" | "accent" | "success" | "warning" | "neutral";

const badgeVariants: Record<BadgeVariant, string> = {
  brand: "bg-[#111827]/10 text-[#111827] border-[#111827]/20",
  accent: "bg-[#C0841A]/12 text-[#B45309] border-[#C0841A]/25",
  success: "bg-[#16A34A]/10 text-[#15803D] border-[#16A34A]/25",
  warning: "bg-[#F59E0B]/12 text-[#D97706] border-[#F59E0B]/25",
  neutral: "bg-[#64748B]/10 text-[#64748B] border-[#64748B]/20",
};

export function Badge({
  children,
  variant = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeVariants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex rounded-[0.75rem] border p-0.5 ${className}`}
      style={{ borderColor: theme.colors.border }}
      role="tablist"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            value === opt.value
              ? "bg-[#111827] text-white shadow-sm"
              : "text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

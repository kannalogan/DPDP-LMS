import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";
const buttonVariants = cva("ui-button", {
  variants: {
    size: { sm: "ui-button-sm", md: "ui-button-md", lg: "ui-button-lg", icon: "ui-button-icon" },
    variant: {
      primary: "ui-button-primary",
      secondary: "ui-button-secondary",
      ghost: "ui-button-ghost",
      danger: "ui-button-danger"
    }
  },
  defaultVariants: { size: "md", variant: "primary" }
});
export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}
export function Button({
  asChild,
  children,
  className,
  loading,
  size,
  type = "button",
  variant,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ size, variant }), className);

  if (asChild) {
    return (
      <Slot aria-busy={loading || undefined} className={classes} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button aria-busy={loading || undefined} className={classes} type={type} {...props}>
      {loading ? <span aria-hidden="true" className="ui-spinner" /> : null}
      {children}
    </button>
  );
}
export { buttonVariants };

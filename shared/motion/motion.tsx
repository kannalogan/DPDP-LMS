"use client";
import { motion as fm, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { motion as tokens } from "@/shared/tokens";
export function MotionSurface({
  children,
  ...props
}: HTMLMotionProps<"div"> & { children: ReactNode }) {
  const reduce = useReducedMotion();
  const exit = reduce ? {} : { exit: { opacity: 0, y: 6 } };
  return (
    <fm.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : tokens.normal, ease: tokens.ease }}
      {...exit}
      {...props}
    >
      {children}
    </fm.div>
  );
}
export const motionVariants = {
  fade: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
  slide: { hidden: { opacity: 0, x: -12 }, visible: { opacity: 1, x: 0 } },
  scale: { hidden: { opacity: 0, scale: 0.98 }, visible: { opacity: 1, scale: 1 } }
} as const;

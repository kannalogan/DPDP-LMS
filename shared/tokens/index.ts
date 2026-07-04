export const spacing = {
  0: "0",
  1: "8px",
  2: "16px",
  3: "24px",
  4: "32px",
  5: "40px",
  6: "48px",
  8: "64px"
} as const;
export const radii = { xs: "4px", sm: "6px", md: "8px", lg: "12px" } as const;
export const motion = {
  fast: 0.12,
  normal: 0.2,
  slow: 0.32,
  ease: [0.2, 0, 0, 1] as const
} as const;
export const typography = {
  display: "clamp(2.25rem, 5vw, 4.5rem)",
  title: "2rem",
  heading: "1.25rem",
  body: "1rem",
  label: "0.875rem",
  caption: "0.75rem"
} as const;

"use client";
import { useCallback, useState } from "react";
export function useDisclosure(initial = false) {
  const [open, setOpen] = useState(initial);
  return {
    close: useCallback(() => setOpen(false), []),
    open,
    setOpen,
    toggle: useCallback(() => setOpen((value) => !value), [])
  };
}

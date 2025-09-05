import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// This is the utility function that allows you to conditionally merge Tailwind classes.
// It uses `clsx` and `tailwind-merge` to ensure there are no class conflicts.
// This file is typically located at `src/lib/utils.ts` as referenced by the shadcn/ui Button component.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

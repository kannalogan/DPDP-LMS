# Enterprise UI Platform

Prompt #009 establishes the permanent SYRA visual language. It adds reusable presentation infrastructure only; no student, mentor, administrator, learning-management, or business dashboard is introduced.

## Architecture

- `shared/tokens/` owns primitive and semantic design tokens. Components consume semantic tokens, never feature-specific colors.
- `shared/theme/` owns light, dark, and system theme resolution plus component styling.
- `shared/ui/` contains business-agnostic primitives and state boundaries.
- `shared/components/` contains reusable AI, learning-content, and enterprise presentation components without data access or business rules.
- `shared/layouts/` contains compositional page templates.
- `app-shell/` owns global navigation composition and shell interaction state.
- `design-system/index.ts` is the public server-safe export surface. Client-only providers and hooks should be imported directly from their modules.

Existing `components/ui` imports remain compatibility re-exports. New code should import from `@/shared/ui` modules or the public design-system barrel. Storybook was not present and was therefore not added.

## Tokens And Themes

The token layer defines neutral and semantic colors, typography, an 8px spacing scale, compact radii, borders, elevation, shadows, duration and easing, opacity, blur, glass, focus, and status colors. Theme selection supports `light`, `dark`, and `system`, persists locally, follows operating-system changes, and initializes before hydration to avoid a theme flash.

Components must use semantic variables such as `--color-surface`, `--color-foreground`, `--color-border`, and `--color-brand`. Feature code must not introduce a competing token set.

## Component Contract

Every data-bearing screen composes its normal content with the shared `AsyncBoundary`, `LoadingState`, `SkeletonState`, `EmptyState`, `ErrorState`, `SuccessState`, or `OfflineState` primitives as applicable. Reusable components accept content and callbacks through typed props and do not fetch data, resolve permissions, or mutate domain state.

Controls expose labels, native semantics, keyboard behavior, visible focus, disabled states, and assistive text. Icon-only commands require an accessible name. Destructive AI or enterprise actions use `ApprovalDialog` or `AiActionApprovalDialog`.

## Application Shell

`ApplicationShell` provides a collapsible desktop sidebar, responsive mobile navigation, sticky top navigation, breadcrumb, command/search slots, workspace switching, notifications, user controls, optional AI dock, and footer. The existing protected account routes now use this shell without changing their URLs, authentication, RBAC, organization, or server-action boundaries.

The shell supports desktop, tablet, mobile, and ultra-wide layouts. Page templates constrain content rather than scaling typography with viewport width.

## Motion And Accessibility

Framer Motion is isolated in `shared/motion`. Durations and easing come from shared tokens. CSS handles sidebar, toast, loading, skeleton, hover, and streaming transitions. `prefers-reduced-motion` disables nonessential transitions, and `MotionSurface` suppresses entrance/exit displacement when reduced motion is requested.

The foundation targets WCAG AA through semantic HTML, contrast-aware theme tokens, persistent focus rings, ARIA state, keyboard-operable controls, screen-reader labels, and reduced-motion support. Product screens remain responsible for meaningful labels, heading order, error association, and content-specific accessibility tests.

## Usage

```tsx
import { AsyncBoundary, Button, Card } from "@/design-system";

<AsyncBoundary empty={!items.length} loading={pending}>
  <Card>
    <Button onClick={onContinue}>Continue</Button>
  </Card>
</AsyncBoundary>;
```

## Validation

```bash
npm run lint
npm run typecheck
npm run format
npm test
npm run build
```

Browser verification covers the public identity experience at desktop and mobile widths. Protected shell verification requires a valid local test identity and configured local Supabase environment; no real credentials are committed or assumed.

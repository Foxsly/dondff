/**
 * DEPRECATED — re-export shim.
 *
 * The real implementation now lives in `ui/Breadcrumbs`. This file stays only
 * so the pages already importing `./breadcrumbs` pick up the new component
 * without an edit; the old one rendered `className="breadcrumbs"`, a class that
 * was never defined in any stylesheet, so it had no styling at all.
 *
 * Removed once those pages are rebuilt (Phases 3–6) and import from `ui`.
 */
export { Breadcrumbs as default } from './ui/Breadcrumbs';
export type { BreadcrumbsProps } from './ui/Breadcrumbs';

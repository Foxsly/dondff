/**
 * UI primitives.
 *
 * Import from the barrel rather than the individual files:
 *   import { Button, Card, Field, Input } from '../components/ui';
 *
 * Everything here is presentational and free of app knowledge — no API calls,
 * no routing decisions, no game state. Anything that needs those belongs in a
 * feature component instead.
 */

export { Accordion } from './Accordion';
export type { AccordionProps } from './Accordion';

export { Alert } from './Alert';
export type { AlertProps, AlertVariant } from './Alert';

export { Badge } from './Badge';
export type { BadgeProps, BadgeSize, BadgeVariant } from './Badge';

export { Breadcrumbs } from './Breadcrumbs';
export type { BreadcrumbsProps } from './Breadcrumbs';

export { Button, buttonVariants } from './Button';
export type { ButtonProps, ButtonSize, ButtonVariant } from './Button';

export { Card, CardBody, CardFooter, CardHeader, CardTitle } from './Card';
export type { CardHeaderProps, CardProps, CardTitleProps } from './Card';

export { Checkbox } from './Checkbox';
export type { CheckboxProps } from './Checkbox';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { ErrorDisplay } from './ErrorDisplay';
export type { ErrorDisplayProps } from './ErrorDisplay';

export { Field } from './Field';
export type { FieldProps, FieldRenderProps } from './Field';

export { Input } from './Input';
export type { InputProps } from './Input';

export { LoadingSpinner } from './LoadingSpinner';
export type { LoadingSpinnerProps } from './LoadingSpinner';

export { Logo } from './Logo';
export type { LogoProps } from './Logo';

export { Menu, MenuDivider, MenuItem, MenuLabel } from './Menu';
export type { MenuItemProps, MenuProps } from './Menu';

export { Modal } from './Modal';
export type { ModalProps, ModalSize } from './Modal';

export { PageContainer, PageHeader } from './Page';
export type { PageContainerProps, PageHeaderProps, PageWidth } from './Page';

export { SegmentedControl } from './SegmentedControl';
export type { SegmentedControlProps, SegmentedOption } from './SegmentedControl';

export { Select } from './Select';
export type { SelectProps } from './Select';

export { Skeleton } from './Skeleton';
export type { SkeletonProps } from './Skeleton';

export { Spinner } from './Spinner';
export type { SpinnerProps, SpinnerSize } from './Spinner';

export { StatTile } from './StatTile';
export type { StatSize, StatTileProps, StatTone } from './StatTile';

export { TabPanel, Tabs } from './Tabs';
export type { TabItem, TabPanelProps, TabsProps } from './Tabs';

export { ToastProvider, useToast } from './Toast';
export type { ToastOptions, ToastVariant } from './Toast';

export * from './icons';

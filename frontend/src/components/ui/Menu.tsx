import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';

export interface MenuProps {
  /** The control that opens the menu. Gets the trigger props applied to it. */
  trigger: (props: {
    ref: React.Ref<HTMLButtonElement>;
    onClick: () => void;
    onKeyDown: (event: React.KeyboardEvent) => void;
    'aria-expanded': boolean;
    'aria-haspopup': 'menu';
  }) => React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
  children?: React.ReactNode;
}

/**
 * Dropdown menu — the navbar account menu, and later the per-member role
 * actions on the league admin screen.
 *
 * Closes on outside click, on Escape, and on selecting an item. Arrow keys move
 * between items; focus returns to the trigger on close so keyboard users are
 * not dropped back at the top of the page.
 *
 * Deliberately not portaled: unlike Modal this anchors to its trigger, and
 * positioning a portaled element against a moving trigger needs measurement on
 * scroll and resize. The navbar has no clipping ancestor, so absolute
 * positioning inside a relative wrapper is correct and much simpler.
 */
export const Menu: React.FC<MenuProps> = ({ trigger, align = 'right', className, children }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  // Pointer down rather than click: closing on mousedown matches how native
  // menus feel, and avoids the menu staying open through a drag.
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  const items = () =>
    Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  const handleTriggerKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen(true);
      // Wait for the list to mount before reaching into it.
      window.setTimeout(() => items()[0]?.focus(), 0);
    }
  };

  // Escape is handled on the container, not the list: opening with a mouse
  // leaves focus on the trigger, so a handler scoped to the list would never
  // see the keystroke and the menu would be stuck open for that path.
  const handleContainerKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      close();
    }
  };

  const handleListKeyDown = (event: React.KeyboardEvent) => {
    const all = items();
    const index = all.indexOf(document.activeElement as HTMLElement);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      all[(index + 1) % all.length]?.focus();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      all[(index - 1 + all.length) % all.length]?.focus();
      return;
    }

    if (event.key === 'Tab') {
      // Tabbing out of a menu dismisses it rather than trapping focus.
      close(false);
    }
  };

  return (
    <div ref={containerRef} onKeyDown={handleContainerKeyDown} className={cn('relative', className)}>
      {trigger({
        ref: triggerRef,
        onClick: () => setOpen((current) => !current),
        onKeyDown: handleTriggerKeyDown,
        'aria-expanded': open,
        'aria-haspopup': 'menu',
      })}

      {open && (
        <div
          ref={listRef}
          role="menu"
          onKeyDown={handleListKeyDown}
          onClick={() => close(false)}
          className={cn(
            'absolute top-full z-40 mt-2 min-w-[12rem] animate-slide-up overflow-hidden rounded-lg border border-border bg-surface-overlay py-1 shadow-overlay',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export interface MenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  destructive?: boolean;
}

export const MenuItem: React.FC<MenuItemProps> = ({
  destructive,
  className,
  children,
  ...rest
}) => (
  <button
    type="button"
    role="menuitem"
    className={cn(
      'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors',
      destructive
        ? 'text-danger hover:bg-danger/10'
        : 'text-text hover:bg-surface-raised hover:text-text-strong',
      className,
    )}
    {...rest}
  >
    {children}
  </button>
);

export const MenuDivider: React.FC = () => (
  <div className="my-1 h-px bg-border" role="separator" />
);

export const MenuLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-3.5 py-2 text-label uppercase text-text-subtle">{children}</div>
);

export default Menu;

import React, { createContext, useContext, useId, useRef, useState } from 'react';
import { cn } from '../../lib/cn';

export interface TabItem {
  value: string;
  label: string;
  /** Optional trailing count/badge, e.g. member totals. */
  badge?: React.ReactNode;
  disabled?: boolean;
}

interface TabsContextValue {
  baseId: string;
  selected: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabsProps {
  items: TabItem[];
  /** Controlled selection. Omit to let Tabs manage it. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Tab bar following the ARIA tabs pattern.
 *
 * Roving tabindex: only the selected tab is in the tab order, and Left/Right
 * (plus Home/End) move between them. That is what the pattern requires — a row
 * of individually tabbable buttons is the usual mistake, and it forces keyboard
 * users to tab through every tab to reach the panel.
 *
 * Selection and the generated id prefix go through context so TabPanel can wire
 * `aria-controls`/`aria-labelledby` to the matching tab without the caller
 * having to thread either one down by hand.
 *
 * Works controlled (`value` + `onChange`) or uncontrolled (`defaultValue`).
 */
export const Tabs: React.FC<TabsProps> = ({
  items,
  value,
  defaultValue,
  onChange,
  className,
  children,
}) => {
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.value);

  const selected = value ?? internal;

  const selectTab = (next: string) => {
    if (value === undefined) setInternal(next);
    onChange?.(next);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const enabled = items.filter((item) => !item.disabled);
    const currentIndex = enabled.findIndex((item) => item.value === selected);
    if (currentIndex === -1) return;

    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % enabled.length;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + enabled.length) % enabled.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = enabled.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const nextValue = enabled[nextIndex].value;
    selectTab(nextValue);
    // Move focus with the selection so the two never drift apart.
    tabRefs.current[items.findIndex((item) => item.value === nextValue)]?.focus();
  };

  return (
    <TabsContext.Provider value={{ baseId, selected }}>
      <div className={className}>
        <div
          role="tablist"
          onKeyDown={handleKeyDown}
          className="flex gap-1 overflow-x-auto border-b border-border"
        >
          {items.map((item, index) => {
            const isSelected = item.value === selected;
            return (
              <button
                key={item.value}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                role="tab"
                type="button"
                id={`${baseId}-tab-${item.value}`}
                aria-selected={isSelected}
                aria-controls={`${baseId}-panel-${item.value}`}
                tabIndex={isSelected ? 0 : -1}
                disabled={item.disabled}
                onClick={() => selectTab(item.value)}
                className={cn(
                  'flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-medium',
                  '-mb-px border-b-2 transition-colors duration-150',
                  'disabled:cursor-not-allowed disabled:opacity-40',
                  isSelected
                    ? 'border-brand text-brand'
                    : 'border-transparent text-text-muted hover:border-border-strong hover:text-text',
                )}
              >
                {item.label}
                {item.badge}
              </button>
            );
          })}
        </div>

        {children}
      </div>
    </TabsContext.Provider>
  );
};

export interface TabPanelProps {
  /** Must match the value of the TabItem this panel belongs to. */
  value: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Panel for a tab. Unmounts when not selected, so each page's data-fetching
 * effects only run for the tab actually being looked at.
 */
export const TabPanel: React.FC<TabPanelProps> = ({ value, children, className }) => {
  const context = useContext(TabsContext);

  if (!context) {
    throw new Error('TabPanel must be rendered inside a Tabs component');
  }

  if (context.selected !== value) return null;

  return (
    <div
      role="tabpanel"
      id={`${context.baseId}-panel-${value}`}
      aria-labelledby={`${context.baseId}-tab-${value}`}
      tabIndex={0}
      className={cn('pt-5', className)}
    >
      {children}
    </div>
  );
};

export default Tabs;

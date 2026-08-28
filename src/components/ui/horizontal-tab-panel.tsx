import { clsx } from 'clsx';
import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface HorizontalTabItem {
  key: string;
  label: string;
  content: ReactNode;
}

interface HorizontalTabPanelProps {
  tabs: HorizontalTabItem[];
  /** Verilirse aktif tab `?tab=<key>` sorgu parametresinde tutulur, geri/ileri
   * tusuyla hatirlanir. Verilmezse bilesen kendi ic state'ini kullanir. */
  queryParam?: string;
  defaultTabKey?: string;
}

/**
 * Genel amacli, tekrar kullanilabilir yatay tab bileseni - sadece /settings icin degil,
 * tab gerektiren her ekranda kullanilmak uzere tasarlandi (bkz. docs/PLAN_ROL_YONETIMI.md SS8).
 */
export function HorizontalTabPanel({ tabs, queryParam, defaultTabKey }: HorizontalTabPanelProps) {
  const baseId = useId();
  const [searchParams, setSearchParams] = useSearchParams();
  const [internalActiveKey, setInternalActiveKey] = useState(defaultTabKey ?? tabs[0]?.key);

  const activeKey = queryParam
    ? (searchParams.get(queryParam) ?? defaultTabKey ?? tabs[0]?.key)
    : internalActiveKey;

  function setActiveKey(key: string) {
    if (queryParam) {
      const next = new URLSearchParams(searchParams);
      next.set(queryParam, key);
      setSearchParams(next, { replace: true });
    } else {
      setInternalActiveKey(key);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (index + direction + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    setActiveKey(nextTab.key);
    document.getElementById(`${baseId}-tab-${nextTab.key}`)?.focus();
  }

  const activeTab = tabs.find((tab) => tab.key === activeKey) ?? tabs[0];

  return (
    <div>
      <div role="tablist" className="flex gap-1 border-b border-app-border">
        {tabs.map((tab, index) => {
          const selected = tab.key === activeTab?.key;
          return (
            <button
              key={tab.key}
              id={`${baseId}-tab-${tab.key}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveKey(tab.key)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={clsx(
                'border-b-2 px-4 py-2 text-sm font-semibold transition-colors',
                selected
                  ? 'border-app-brand text-app-brand'
                  : 'border-transparent text-app-muted hover:text-app-text',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {activeTab && (
        <div
          id={`${baseId}-panel-${activeTab.key}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${activeTab.key}`}
          className="pt-4"
        >
          {activeTab.content}
        </div>
      )}
    </div>
  );
}

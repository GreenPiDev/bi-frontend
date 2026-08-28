import { X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { useToast } from '../../components/ui/toast-context';
import { ApiError } from '../../lib/api';
import { tr } from '../../i18n/tr';
import {
  useCreateSectorOptionMutation,
  useDeleteSectorOptionMutation,
  useSectorOptionsQuery,
} from './use-sector-options';
import { useTenantSettingsQuery, useUpdateTenantSettingMutation } from './use-tenant-settings';

const THRESHOLD_KEY = 'crm.contactInactivityThresholdDays';

function SectorOptionsManager() {
  const toast = useToast();
  const sectorOptionsQuery = useSectorOptionsQuery();
  const createMutation = useCreateSectorOptionMutation();
  const deleteMutation = useDeleteSectorOptionMutation();
  const [label, setLabel] = useState('');

  function handleAdd() {
    const trimmed = label.trim();
    if (!trimmed) {
      return;
    }
    createMutation.mutate(trimmed, {
      onSuccess: () => {
        toast.success(tr.settings.crm.sectorOptions.addSuccess);
        setLabel('');
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success(tr.settings.crm.sectorOptions.deleteSuccess),
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  return (
    <div>
      <h3 className="text-sm font-bold text-app-text">{tr.settings.crm.sectorOptions.title}</h3>
      <p className="text-sm text-app-muted">{tr.settings.crm.sectorOptions.subtitle}</p>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && handleAdd()}
          placeholder={tr.settings.crm.sectorOptions.addPlaceholder}
          className="flex-1 rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
        />
        <Button type="button" disabled={createMutation.isPending} onClick={handleAdd}>
          {tr.settings.crm.sectorOptions.addButton}
        </Button>
      </div>

      {sectorOptionsQuery.data && sectorOptionsQuery.data.length === 0 && (
        <p className="mt-3 text-sm text-app-muted">{tr.settings.crm.sectorOptions.empty}</p>
      )}

      {sectorOptionsQuery.data && sectorOptionsQuery.data.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {sectorOptionsQuery.data.map((option) => (
            <li
              key={option.id}
              className="flex items-center gap-1.5 rounded-full bg-app-bg-muted py-1 pr-1.5 pl-3 text-sm text-app-text"
            >
              {option.label}
              <button
                type="button"
                onClick={() => handleDelete(option.id)}
                aria-label={tr.settings.crm.sectorOptions.deleteButton}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-app-muted hover:bg-app-danger/10 hover:text-app-danger"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InactivityThresholdSetting() {
  const toast = useToast();
  const settingsQuery = useTenantSettingsQuery();
  const updateMutation = useUpdateTenantSettingMutation();
  const [value, setValue] = useState('');

  const currentSetting = settingsQuery.data?.find((setting) => setting.key === THRESHOLD_KEY);

  const [prevSettingValue, setPrevSettingValue] = useState<unknown>(undefined);
  if (currentSetting && currentSetting.value !== prevSettingValue) {
    setPrevSettingValue(currentSetting.value);
    setValue(String(currentSetting.value));
  }

  function handleSave() {
    const days = Number(value);
    if (!Number.isInteger(days) || days < 1) {
      return;
    }
    updateMutation.mutate(
      { key: THRESHOLD_KEY, value: days },
      {
        onSuccess: () => toast.success(tr.settings.crm.inactivityThreshold.saveSuccess),
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  }

  return (
    <div className="mt-6 border-t border-app-border pt-6">
      <h3 className="text-sm font-bold text-app-text">
        {tr.settings.crm.inactivityThreshold.title}
      </h3>
      <p className="text-sm text-app-muted">{tr.settings.crm.inactivityThreshold.subtitle}</p>

      <div className="mt-3 flex items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="inactivity-threshold" className="text-sm font-semibold text-app-muted">
            {tr.settings.crm.inactivityThreshold.label}
          </label>
          <input
            id="inactivity-threshold"
            type="number"
            min={1}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="w-32 rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
          />
        </div>
        <Button type="button" disabled={updateMutation.isPending} onClick={handleSave}>
          {tr.settings.crm.inactivityThreshold.saveButton}
        </Button>
      </div>
    </div>
  );
}

export function CrmSettingsSection() {
  return (
    <section className="mt-6 rounded-xl border border-app-border bg-app-surface p-4">
      <h2 className="mb-1 text-base font-bold text-app-text">{tr.settings.crm.title}</h2>
      <p className="mb-4 text-sm text-app-muted">{tr.settings.crm.subtitle}</p>

      <SectorOptionsManager />
      <InactivityThresholdSetting />
    </section>
  );
}

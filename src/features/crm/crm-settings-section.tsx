import { Check, Pencil, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { useToast } from '../../components/ui/toast-context';
import { ApiError } from '../../lib/api';
import { tr } from '../../i18n/tr';
import {
  useCreateDepartmentOptionMutation,
  useDeleteDepartmentOptionMutation,
  useDepartmentOptionsQuery,
  useUpdateDepartmentOptionMutation,
} from './use-department-options';
import {
  useCreateProductCategoryOptionMutation,
  useDeleteProductCategoryOptionMutation,
  useProductCategoryOptionsQuery,
  useUpdateProductCategoryOptionMutation,
} from './use-product-categories';
import {
  useCreateSectorOptionMutation,
  useDeleteSectorOptionMutation,
  useSectorOptionsQuery,
  useUpdateSectorOptionMutation,
} from './use-sector-options';
import { useTenantSettingsQuery, useUpdateTenantSettingMutation } from './use-tenant-settings';
import {
  useCreateTitleOptionMutation,
  useDeleteTitleOptionMutation,
  useTitleOptionsQuery,
  useUpdateTitleOptionMutation,
} from './use-title-options';

const THRESHOLD_KEY = 'crm.contactInactivityThresholdDays';
const POST_SALE_FOLLOW_UP_DAYS_KEY = 'crm.postSaleFollowUpDays';

interface NamedOption {
  id: string;
  label: string;
}

interface MutationLike<T> {
  mutate: (
    input: T,
    callbacks: { onSuccess: () => void; onError: (error: unknown) => void },
  ) => void;
  isPending: boolean;
}

/** Sektör (A2) ile ayni "tenant listeye ekler / listede yoksa serbest metin"
 * desenini paylasan Departman, Unvan ve Urun Kategorisi yonetim panelleri de
 * bu bilesenle kurulur - ucu ayni sekilde bir NamedOption[] listesi +
 * ekle/duzenle/sil mutasyonu bekler, sadece i18n metinleri ve sorgu/mutasyon
 * hook'lari degisir. */
function OptionListManager({
  title,
  subtitle,
  addPlaceholder,
  addButtonLabel,
  emptyText,
  editButtonLabel,
  saveButtonLabel,
  cancelButtonLabel,
  deleteButtonLabel,
  addSuccessMessage,
  editSuccessMessage,
  deleteSuccessMessage,
  optionsQuery,
  createMutation,
  updateMutation,
  deleteMutation,
}: {
  title: string;
  subtitle: string;
  addPlaceholder: string;
  addButtonLabel: string;
  emptyText: string;
  editButtonLabel: string;
  saveButtonLabel: string;
  cancelButtonLabel: string;
  deleteButtonLabel: string;
  addSuccessMessage: string;
  editSuccessMessage: string;
  deleteSuccessMessage: string;
  optionsQuery: { data?: NamedOption[] };
  createMutation: MutationLike<string>;
  updateMutation: MutationLike<{ id: string; label: string }>;
  deleteMutation: MutationLike<string>;
}) {
  const toast = useToast();
  const [label, setLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  function handleAdd() {
    const trimmed = label.trim();
    if (!trimmed) {
      return;
    }
    createMutation.mutate(trimmed, {
      onSuccess: () => {
        toast.success(addSuccessMessage);
        setLabel('');
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  function startEdit(option: NamedOption) {
    setEditingId(option.id);
    setEditingLabel(option.label);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingLabel('');
  }

  function handleSaveEdit() {
    const trimmed = editingLabel.trim();
    if (!editingId || !trimmed) {
      return;
    }
    updateMutation.mutate(
      { id: editingId, label: trimmed },
      {
        onSuccess: () => {
          toast.success(editSuccessMessage);
          cancelEdit();
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success(deleteSuccessMessage),
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  return (
    <div>
      <h3 className="text-sm font-bold text-app-text">{title}</h3>
      <p className="text-sm text-app-muted">{subtitle}</p>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && handleAdd()}
          placeholder={addPlaceholder}
          className="flex-1 rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
        />
        <Button type="button" disabled={createMutation.isPending} onClick={handleAdd}>
          {addButtonLabel}
        </Button>
      </div>

      {optionsQuery.data && optionsQuery.data.length === 0 && (
        <p className="mt-3 text-sm text-app-muted">{emptyText}</p>
      )}

      {optionsQuery.data && optionsQuery.data.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {optionsQuery.data.map((option) =>
            editingId === option.id ? (
              <li key={option.id} className="flex items-center gap-1.5">
                <input
                  type="text"
                  autoFocus
                  value={editingLabel}
                  onChange={(event) => setEditingLabel(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleSaveEdit();
                    } else if (event.key === 'Escape') {
                      cancelEdit();
                    }
                  }}
                  className="rounded-lg border border-app-border bg-app-surface px-3 py-1.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
                />
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={updateMutation.isPending}
                  aria-label={saveButtonLabel}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-app-muted hover:bg-app-primary/10 hover:text-app-primary"
                >
                  <Check size={14} />
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  aria-label={cancelButtonLabel}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-app-muted hover:bg-app-danger/10 hover:text-app-danger"
                >
                  <X size={14} />
                </button>
              </li>
            ) : (
              <li
                key={option.id}
                className="flex items-center gap-1.5 rounded-full bg-app-bg-muted py-1 pr-1.5 pl-3 text-sm text-app-text"
              >
                {option.label}
                <button
                  type="button"
                  onClick={() => startEdit(option)}
                  aria-label={editButtonLabel}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-app-muted hover:bg-app-primary/10 hover:text-app-primary"
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(option.id)}
                  aria-label={deleteButtonLabel}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-app-muted hover:bg-app-danger/10 hover:text-app-danger"
                >
                  <X size={12} />
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function SectorOptionsManager() {
  return (
    <OptionListManager
      title={tr.settings.crm.sectorOptions.title}
      subtitle={tr.settings.crm.sectorOptions.subtitle}
      addPlaceholder={tr.settings.crm.sectorOptions.addPlaceholder}
      addButtonLabel={tr.settings.crm.sectorOptions.addButton}
      emptyText={tr.settings.crm.sectorOptions.empty}
      editButtonLabel={tr.settings.crm.sectorOptions.editButton}
      saveButtonLabel={tr.settings.crm.sectorOptions.saveButton}
      cancelButtonLabel={tr.settings.crm.sectorOptions.cancelButton}
      deleteButtonLabel={tr.settings.crm.sectorOptions.deleteButton}
      addSuccessMessage={tr.settings.crm.sectorOptions.addSuccess}
      editSuccessMessage={tr.settings.crm.sectorOptions.editSuccess}
      deleteSuccessMessage={tr.settings.crm.sectorOptions.deleteSuccess}
      optionsQuery={useSectorOptionsQuery()}
      createMutation={useCreateSectorOptionMutation()}
      updateMutation={useUpdateSectorOptionMutation()}
      deleteMutation={useDeleteSectorOptionMutation()}
    />
  );
}

function DepartmentOptionsManager() {
  return (
    <OptionListManager
      title={tr.settings.crm.departmentOptions.title}
      subtitle={tr.settings.crm.departmentOptions.subtitle}
      addPlaceholder={tr.settings.crm.departmentOptions.addPlaceholder}
      addButtonLabel={tr.settings.crm.departmentOptions.addButton}
      emptyText={tr.settings.crm.departmentOptions.empty}
      editButtonLabel={tr.settings.crm.departmentOptions.editButton}
      saveButtonLabel={tr.settings.crm.departmentOptions.saveButton}
      cancelButtonLabel={tr.settings.crm.departmentOptions.cancelButton}
      deleteButtonLabel={tr.settings.crm.departmentOptions.deleteButton}
      addSuccessMessage={tr.settings.crm.departmentOptions.addSuccess}
      editSuccessMessage={tr.settings.crm.departmentOptions.editSuccess}
      deleteSuccessMessage={tr.settings.crm.departmentOptions.deleteSuccess}
      optionsQuery={useDepartmentOptionsQuery()}
      createMutation={useCreateDepartmentOptionMutation()}
      updateMutation={useUpdateDepartmentOptionMutation()}
      deleteMutation={useDeleteDepartmentOptionMutation()}
    />
  );
}

function TitleOptionsManager() {
  return (
    <OptionListManager
      title={tr.settings.crm.titleOptions.title}
      subtitle={tr.settings.crm.titleOptions.subtitle}
      addPlaceholder={tr.settings.crm.titleOptions.addPlaceholder}
      addButtonLabel={tr.settings.crm.titleOptions.addButton}
      emptyText={tr.settings.crm.titleOptions.empty}
      editButtonLabel={tr.settings.crm.titleOptions.editButton}
      saveButtonLabel={tr.settings.crm.titleOptions.saveButton}
      cancelButtonLabel={tr.settings.crm.titleOptions.cancelButton}
      deleteButtonLabel={tr.settings.crm.titleOptions.deleteButton}
      addSuccessMessage={tr.settings.crm.titleOptions.addSuccess}
      editSuccessMessage={tr.settings.crm.titleOptions.editSuccess}
      deleteSuccessMessage={tr.settings.crm.titleOptions.deleteSuccess}
      optionsQuery={useTitleOptionsQuery()}
      createMutation={useCreateTitleOptionMutation()}
      updateMutation={useUpdateTitleOptionMutation()}
      deleteMutation={useDeleteTitleOptionMutation()}
    />
  );
}

function ProductCategoryOptionsManager() {
  return (
    <OptionListManager
      title={tr.settings.crm.productCategoryOptions.title}
      subtitle={tr.settings.crm.productCategoryOptions.subtitle}
      addPlaceholder={tr.settings.crm.productCategoryOptions.addPlaceholder}
      addButtonLabel={tr.settings.crm.productCategoryOptions.addButton}
      emptyText={tr.settings.crm.productCategoryOptions.empty}
      editButtonLabel={tr.settings.crm.productCategoryOptions.editButton}
      saveButtonLabel={tr.settings.crm.productCategoryOptions.saveButton}
      cancelButtonLabel={tr.settings.crm.productCategoryOptions.cancelButton}
      deleteButtonLabel={tr.settings.crm.productCategoryOptions.deleteButton}
      addSuccessMessage={tr.settings.crm.productCategoryOptions.addSuccess}
      editSuccessMessage={tr.settings.crm.productCategoryOptions.editSuccess}
      deleteSuccessMessage={tr.settings.crm.productCategoryOptions.deleteSuccess}
      optionsQuery={useProductCategoryOptionsQuery()}
      createMutation={useCreateProductCategoryOptionMutation()}
      updateMutation={useUpdateProductCategoryOptionMutation()}
      deleteMutation={useDeleteProductCategoryOptionMutation()}
    />
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

function PostSaleFollowUpDaysSetting() {
  const toast = useToast();
  const settingsQuery = useTenantSettingsQuery();
  const updateMutation = useUpdateTenantSettingMutation();
  const [value, setValue] = useState('');

  const currentSetting = settingsQuery.data?.find(
    (setting) => setting.key === POST_SALE_FOLLOW_UP_DAYS_KEY,
  );

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
      { key: POST_SALE_FOLLOW_UP_DAYS_KEY, value: days },
      {
        onSuccess: () => toast.success(tr.settings.crm.postSaleFollowUpDays.saveSuccess),
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  }

  return (
    <div className="mt-6 border-t border-app-border pt-6">
      <h3 className="text-sm font-bold text-app-text">
        {tr.settings.crm.postSaleFollowUpDays.title}
      </h3>
      <p className="text-sm text-app-muted">{tr.settings.crm.postSaleFollowUpDays.subtitle}</p>

      <div className="mt-3 flex items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="post-sale-follow-up-days"
            className="text-sm font-semibold text-app-muted"
          >
            {tr.settings.crm.postSaleFollowUpDays.label}
          </label>
          <input
            id="post-sale-follow-up-days"
            type="number"
            min={1}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="w-32 rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
          />
        </div>
        <Button type="button" disabled={updateMutation.isPending} onClick={handleSave}>
          {tr.settings.crm.postSaleFollowUpDays.saveButton}
        </Button>
      </div>
    </div>
  );
}

export function CrmSettingsSection() {
  return (
    <section className="mt-6 border-t border-app-border p-4">
      <h2 className="mb-1 text-base font-bold text-app-text">{tr.settings.crm.title}</h2>
      <p className="mb-4 text-sm text-app-muted">{tr.settings.crm.subtitle}</p>

      <SectorOptionsManager />
      <div className="mt-6 border-t border-app-border pt-6">
        <DepartmentOptionsManager />
      </div>
      <div className="mt-6 border-t border-app-border pt-6">
        <TitleOptionsManager />
      </div>
      <div className="mt-6 border-t border-app-border pt-6">
        <ProductCategoryOptionsManager />
      </div>
      <InactivityThresholdSetting />
      <PostSaleFollowUpDaysSetting />
    </section>
  );
}

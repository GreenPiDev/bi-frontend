import { Check, Pencil, X } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import { Button } from '../../components/ui/button';
import { CollapsibleSection } from '../../components/ui/collapsible-section';
import { ConfirmModal } from '../../components/ui/confirm-modal';
import { Table, type TableColumn } from '../../components/ui/table';
import { TextField } from '../../components/ui/text-field';
import { Tooltip } from '../../components/ui/tooltip';
import { useToast } from '../../components/ui/toast-context';
import { ApiError, type IbanOption } from '../../lib/api';
import { formatIbanInput, normalizeIban, validateIban } from '../../lib/iban-validation';
import { tr } from '../../i18n/tr';
import {
  useCreateDepartmentOptionMutation,
  useDeleteDepartmentOptionMutation,
  useDepartmentOptionsQuery,
  useUpdateDepartmentOptionMutation,
} from './use-department-options';
import {
  useCreateIbanOptionMutation,
  useDeleteIbanOptionMutation,
  useIbanOptionsQuery,
  useUpdateIbanOptionMutation,
} from './use-iban-options';
import {
  useCreatePaymentMethodOptionMutation,
  useDeletePaymentMethodOptionMutation,
  usePaymentMethodOptionsQuery,
  useUpdatePaymentMethodOptionMutation,
} from './use-payment-method-options';
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
import {
  useDeleteTenantLogoMutation,
  useTenantProfileQuery,
  useUploadTenantLogoMutation,
} from './use-tenant-logo';
import { useTenantSettingsQuery, useUpdateTenantSettingMutation } from './use-tenant-settings';
import {
  useCreateTitleOptionMutation,
  useDeleteTitleOptionMutation,
  useTitleOptionsQuery,
  useUpdateTitleOptionMutation,
} from './use-title-options';

const THRESHOLD_KEY = 'crm.contactInactivityThresholdDays';
const POST_SALE_FOLLOW_UP_DAYS_KEY = 'crm.postSaleFollowUpDays';

const MAX_LOGO_SIZE_BYTES = 1.5 * 1024 * 1024;
const ACCEPTED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Sirket logosu - kullanici avatariyla ayni desen (bkz. app/profile-page.tsx
 * AvatarSection): secilince aninda yuklenir, "Kaydet" adimi yok. */
function CompanyLogoSection() {
  const toast = useToast();
  const strings = tr.settings.crm.companyLogo;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [removing, setRemoving] = useState(false);
  const profileQuery = useTenantProfileQuery();
  const uploadMutation = useUploadTenantLogoMutation();
  const deleteMutation = useDeleteTenantLogoMutation();
  const logoUrl = profileQuery.data?.logoUrl ?? null;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      toast.error(strings.unsupportedType);
      return;
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      toast.error(strings.tooLarge);
      return;
    }
    uploadMutation.mutate(file, {
      onSuccess: () => toast.success(strings.uploadSuccess),
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  }

  function handleConfirmRemove() {
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(strings.removeSuccess);
        setRemoving(false);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        setRemoving(false);
      },
    });
  }

  return (
    <CollapsibleSection title={strings.title} subtitle={strings.subtitle}>
      <div className="flex items-center gap-4">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={strings.alt}
            className="h-20 w-20 rounded-lg border border-app-border object-contain bg-app-surface"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-app-border text-xs text-app-muted">
            {strings.noLogo}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={uploadMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadMutation.isPending
                ? strings.uploading
                : logoUrl
                  ? strings.replaceButton
                  : strings.uploadButton}
            </Button>
            {logoUrl && (
              <Button type="button" variant="danger" onClick={() => setRemoving(true)}>
                {strings.removeButton}
              </Button>
            )}
          </div>
        </div>
      </div>

      {removing && (
        <ConfirmModal
          title={strings.removeConfirmTitle}
          message={strings.removeConfirmMessage}
          confirmLabel={strings.removeButton}
          isPending={deleteMutation.isPending}
          onConfirm={handleConfirmRemove}
          onCancel={() => setRemoving(false)}
        />
      )}
    </CollapsibleSection>
  );
}

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
    <CollapsibleSection title={title} subtitle={subtitle}>
      <div className="flex gap-2">
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
                className="flex items-center gap-1.5 rounded-md bg-app-primary py-1 pr-1.5 pl-2.5 text-sm font-medium text-white"
              >
                {option.label}
                <Tooltip content={editButtonLabel}>
                  <button
                    type="button"
                    onClick={() => startEdit(option)}
                    aria-label={editButtonLabel}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-white/80 hover:bg-white/15 hover:text-white"
                  >
                    <Pencil size={12} />
                  </button>
                </Tooltip>
                <Tooltip content={deleteButtonLabel}>
                  <button
                    type="button"
                    onClick={() => handleDelete(option.id)}
                    aria-label={deleteButtonLabel}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-white/80 hover:bg-white/15 hover:text-white"
                  >
                    <X size={12} />
                  </button>
                </Tooltip>
              </li>
            ),
          )}
        </ul>
      )}
    </CollapsibleSection>
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

function PaymentMethodOptionsManager() {
  return (
    <OptionListManager
      title={tr.settings.crm.paymentMethodOptions.title}
      subtitle={tr.settings.crm.paymentMethodOptions.subtitle}
      addPlaceholder={tr.settings.crm.paymentMethodOptions.addPlaceholder}
      addButtonLabel={tr.settings.crm.paymentMethodOptions.addButton}
      emptyText={tr.settings.crm.paymentMethodOptions.empty}
      editButtonLabel={tr.settings.crm.paymentMethodOptions.editButton}
      saveButtonLabel={tr.settings.crm.paymentMethodOptions.saveButton}
      cancelButtonLabel={tr.settings.crm.paymentMethodOptions.cancelButton}
      deleteButtonLabel={tr.settings.crm.paymentMethodOptions.deleteButton}
      addSuccessMessage={tr.settings.crm.paymentMethodOptions.addSuccess}
      editSuccessMessage={tr.settings.crm.paymentMethodOptions.editSuccess}
      deleteSuccessMessage={tr.settings.crm.paymentMethodOptions.deleteSuccess}
      optionsQuery={usePaymentMethodOptionsQuery()}
      createMutation={useCreatePaymentMethodOptionMutation()}
      updateMutation={useUpdatePaymentMethodOptionMutation()}
      deleteMutation={useDeletePaymentMethodOptionMutation()}
    />
  );
}

interface IbanFormState {
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  iban: string;
}

const EMPTY_IBAN_FORM: IbanFormState = {
  bankName: '',
  accountHolderName: '',
  accountNumber: '',
  iban: '',
};

function IbanOptionsManager() {
  const toast = useToast();
  const optionsQuery = useIbanOptionsQuery();
  const createMutation = useCreateIbanOptionMutation();
  const updateMutation = useUpdateIbanOptionMutation();
  const deleteMutation = useDeleteIbanOptionMutation();

  const [form, setForm] = useState<IbanFormState>(EMPTY_IBAN_FORM);
  const [ibanTouched, setIbanTouched] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<IbanFormState>(EMPTY_IBAN_FORM);
  const [editIbanTouched, setEditIbanTouched] = useState(false);

  const ibanValidation = validateIban(form.iban);
  const editIbanValidation = validateIban(editForm.iban);

  function handleApiError(error: unknown) {
    toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
  }

  function handleAdd() {
    setIbanTouched(true);
    if (!form.bankName.trim() || !form.accountHolderName.trim() || !ibanValidation.isValid) {
      return;
    }
    createMutation.mutate(
      {
        bankName: form.bankName.trim(),
        accountHolderName: form.accountHolderName.trim(),
        accountNumber: form.accountNumber.trim() || undefined,
        iban: normalizeIban(form.iban),
      },
      {
        onSuccess: () => {
          toast.success(tr.settings.crm.ibanOptions.addSuccess);
          setForm(EMPTY_IBAN_FORM);
          setIbanTouched(false);
        },
        onError: handleApiError,
      },
    );
  }

  function startEdit(option: IbanOption) {
    setEditingId(option.id);
    setEditForm({
      bankName: option.bankName,
      accountHolderName: option.accountHolderName,
      accountNumber: option.accountNumber ?? '',
      iban: formatIbanInput(option.iban),
    });
    setEditIbanTouched(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(EMPTY_IBAN_FORM);
    setEditIbanTouched(false);
  }

  function handleSaveEdit() {
    setEditIbanTouched(true);
    if (
      !editingId ||
      !editForm.bankName.trim() ||
      !editForm.accountHolderName.trim() ||
      !editIbanValidation.isValid
    ) {
      return;
    }
    updateMutation.mutate(
      {
        id: editingId,
        input: {
          bankName: editForm.bankName.trim(),
          accountHolderName: editForm.accountHolderName.trim(),
          accountNumber: editForm.accountNumber.trim() || undefined,
          iban: normalizeIban(editForm.iban),
        },
      },
      {
        onSuccess: () => {
          toast.success(tr.settings.crm.ibanOptions.editSuccess);
          cancelEdit();
        },
        onError: handleApiError,
      },
    );
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success(tr.settings.crm.ibanOptions.deleteSuccess),
      onError: handleApiError,
    });
  }

  const columns: TableColumn<IbanOption>[] = [
    { key: 'bankName', header: tr.settings.crm.ibanOptions.bankColumn, render: (o) => o.bankName },
    {
      key: 'accountHolderName',
      header: tr.settings.crm.ibanOptions.accountHolderColumn,
      render: (o) => o.accountHolderName,
    },
    {
      key: 'accountNumber',
      header: tr.settings.crm.ibanOptions.accountNumberColumn,
      render: (o) => o.accountNumber ?? '—',
    },
    { key: 'iban', header: tr.settings.crm.ibanOptions.ibanColumn, render: (o) => o.iban },
    {
      key: 'actions',
      header: '',
      className: 'w-16',
      render: (o) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              startEdit(o);
            }}
            aria-label={tr.settings.crm.ibanOptions.editButton}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-app-muted hover:bg-app-primary/10 hover:text-app-primary"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleDelete(o.id);
            }}
            aria-label={tr.settings.crm.ibanOptions.deleteButton}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-app-muted hover:bg-app-danger/10 hover:text-app-danger"
          >
            <X size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <CollapsibleSection
      title={tr.settings.crm.ibanOptions.title}
      subtitle={tr.settings.crm.ibanOptions.subtitle}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <TextField
          label={tr.settings.crm.ibanOptions.bankNameLabel}
          placeholder={tr.settings.crm.ibanOptions.bankNamePlaceholder}
          value={form.bankName}
          onChange={(event) => setForm((prev) => ({ ...prev, bankName: event.target.value }))}
        />
        <TextField
          label={tr.settings.crm.ibanOptions.accountHolderNameLabel}
          placeholder={tr.settings.crm.ibanOptions.accountHolderNamePlaceholder}
          value={form.accountHolderName}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, accountHolderName: event.target.value }))
          }
        />
        <TextField
          label={tr.settings.crm.ibanOptions.accountNumberLabel}
          placeholder={tr.settings.crm.ibanOptions.accountNumberPlaceholder}
          value={form.accountNumber}
          onChange={(event) => setForm((prev) => ({ ...prev, accountNumber: event.target.value }))}
        />
        <TextField
          label={tr.settings.crm.ibanOptions.ibanLabel}
          placeholder={tr.settings.crm.ibanOptions.ibanPlaceholder}
          value={form.iban}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, iban: formatIbanInput(event.target.value) }))
          }
          onBlur={() => setIbanTouched(true)}
          error={ibanTouched ? ibanValidation.error : undefined}
        />
      </div>
      <Button
        type="button"
        className="mt-3"
        disabled={createMutation.isPending}
        onClick={handleAdd}
      >
        {tr.settings.crm.ibanOptions.addButton}
      </Button>

      {optionsQuery.data && optionsQuery.data.length === 0 && (
        <p className="mt-3 text-sm text-app-muted">{tr.settings.crm.ibanOptions.empty}</p>
      )}

      {optionsQuery.data && optionsQuery.data.length > 0 && (
        <Table
          columns={columns}
          data={optionsQuery.data}
          keyField={(option) => option.id}
          onRowClick={startEdit}
          isRowExpanded={(option) => editingId === option.id}
          rowClassName={(option) => (editingId === option.id ? 'bg-blue-50' : undefined)}
          renderExpandedRow={() => (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:items-end">
              <TextField
                label={tr.settings.crm.ibanOptions.bankNameLabel}
                value={editForm.bankName}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, bankName: event.target.value }))
                }
              />
              <TextField
                label={tr.settings.crm.ibanOptions.accountHolderNameLabel}
                value={editForm.accountHolderName}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, accountHolderName: event.target.value }))
                }
              />
              <TextField
                label={tr.settings.crm.ibanOptions.accountNumberLabel}
                value={editForm.accountNumber}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, accountNumber: event.target.value }))
                }
              />
              <TextField
                label={tr.settings.crm.ibanOptions.ibanLabel}
                value={editForm.iban}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, iban: formatIbanInput(event.target.value) }))
                }
                onBlur={() => setEditIbanTouched(true)}
                error={editIbanTouched ? editIbanValidation.error : undefined}
              />
              <div className="col-span-2 flex gap-2 sm:col-span-4">
                <Button type="button" disabled={updateMutation.isPending} onClick={handleSaveEdit}>
                  {tr.settings.crm.ibanOptions.saveButton}
                </Button>
                <Button type="button" variant="secondary" onClick={cancelEdit}>
                  {tr.settings.crm.ibanOptions.cancelButton}
                </Button>
              </div>
            </div>
          )}
        />
      )}
    </CollapsibleSection>
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
    <div className="mt-3 border-t border-app-border">
      <CollapsibleSection
        title={tr.settings.crm.inactivityThreshold.title}
        subtitle={tr.settings.crm.inactivityThreshold.subtitle}
      >
        <div className="flex items-end gap-2">
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
      </CollapsibleSection>
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
    <div className="mt-3 border-t border-app-border">
      <CollapsibleSection
        title={tr.settings.crm.postSaleFollowUpDays.title}
        subtitle={tr.settings.crm.postSaleFollowUpDays.subtitle}
      >
        <div className="flex items-end gap-2">
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
      </CollapsibleSection>
    </div>
  );
}

export function CrmSettingsSection() {
  return (
    <section>
      <h2 className="mb-1 text-base font-bold text-app-text">{tr.settings.crm.title}</h2>
      <p className="mb-4 text-sm text-app-muted">{tr.settings.crm.subtitle}</p>

      <h2 className="mb-1 text-base font-bold text-app-text">
        {tr.settings.crm.accountCreationGroupLabel}
      </h2>
      <div className="border-t border-app-border">
        <SectorOptionsManager />
      </div>

      <h2 className="mt-6 mb-1 text-base font-bold text-app-text">
        {tr.settings.crm.contactCreationGroupLabel}
      </h2>
      <div className="border-t border-app-border">
        <DepartmentOptionsManager />
      </div>
      <div className="mt-3 border-t border-app-border">
        <TitleOptionsManager />
      </div>

      <h2 className="mt-6 mb-1 text-base font-bold text-app-text">
        {tr.settings.crm.productCreationGroupLabel}
      </h2>
      <div className="border-t border-app-border">
        <ProductCategoryOptionsManager />
      </div>

      <h2 className="mt-6 mb-1 text-base font-bold text-app-text">
        {tr.settings.crm.quoteCreationGroupLabel}
      </h2>
      <div className="border-t border-app-border">
        <CompanyLogoSection />
      </div>
      <div className="mt-3 border-t border-app-border">
        <PaymentMethodOptionsManager />
      </div>
      <div className="mt-3 border-t border-app-border">
        <IbanOptionsManager />
      </div>

      <h2 className="mt-6 mb-1 text-base font-bold text-app-text">
        {tr.settings.crm.otherGroupLabel}
      </h2>
      <InactivityThresholdSetting />
      <PostSaleFollowUpDaysSetting />
    </section>
  );
}

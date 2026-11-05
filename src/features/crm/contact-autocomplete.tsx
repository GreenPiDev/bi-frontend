import { useState, type ReactNode } from 'react';
import { AsyncAutocomplete } from '../../components/ui/async-autocomplete';
import { useContactQuery, useContactsBrowseQuery, useContactsQuery } from './use-contacts';
import { useDebouncedValue } from '../../lib/use-debounced-value';

interface ContactAutocompleteProps {
  label: string;
  value: string | undefined;
  onChange: (contactId: string | undefined) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  /** Filtre alanlarinda opt-in tekil sifirlama butonu. */
  clearable?: boolean;
  /** Verilirse arama ve listeleme yalnizca bu firmanin kisileriyle sinirlanir. */
  accountId?: string;
  /** Kutunun yanina, ayni satira yerlestirilecek bir aksiyon (or. "+ Yeni Kisi"). */
  trailingAction?: ReactNode;
  /** true ise arama metni bosken kutu acilinca kisiler sayfa sayfa yuklenir
   * (AccountAutocomplete.loadAllWhenEmpty ile ayni davranis). */
  loadAllWhenEmpty?: boolean;
}

const PAGE_SIZE = 20;

/**
 * Kisi secimi icin `AsyncAutocomplete`'in veri-cekme sarmalayicisi -
 * `account-autocomplete.tsx` ile ayni desen (bkz. o dosyadaki yorum).
 */
export function ContactAutocomplete({
  label,
  value,
  onChange,
  placeholder,
  error,
  required,
  hint,
  clearable,
  accountId,
  trailingAction,
  loadAllWhenEmpty,
}: ContactAutocompleteProps) {
  const [typedQuery, setTypedQuery] = useState<string | null>(null);
  const debouncedQuery = useDebouncedValue(typedQuery ?? '');
  const searchQuery = useContactsQuery(
    { q: debouncedQuery || undefined, pageSize: PAGE_SIZE, accountId },
    { enabled: Boolean(debouncedQuery) },
  );
  const browsingAll = Boolean(loadAllWhenEmpty) && !debouncedQuery;
  const browseQuery = useContactsBrowseQuery(browsingAll, PAGE_SIZE, accountId);
  const selectedContactQuery = useContactQuery(value ?? '');
  const selectedContact = selectedContactQuery.data;

  const displayValue =
    typedQuery ??
    (selectedContact ? `${selectedContact.firstName} ${selectedContact.lastName}` : '');
  const options = debouncedQuery
    ? (searchQuery.data?.data ?? []).map((contact) => ({
        id: contact.id,
        label: `${contact.firstName} ${contact.lastName}`,
      }))
    : browsingAll
      ? (browseQuery.data?.pages ?? [])
          .flatMap((page) => page.data)
          .map((contact) => ({
            id: contact.id,
            label: `${contact.firstName} ${contact.lastName}`,
          }))
      : [];

  return (
    <AsyncAutocomplete
      label={label}
      value={displayValue}
      onInputChange={(text) => {
        setTypedQuery(text);
        if (value) {
          onChange(undefined);
        }
      }}
      options={options}
      onSelectOption={(option) => {
        onChange(option.id);
        setTypedQuery(option.label);
      }}
      placeholder={placeholder}
      error={error}
      required={required}
      hint={hint}
      clearable={clearable}
      trailingAction={trailingAction}
      isLoadingOptions={browsingAll && browseQuery.isLoading}
      onMenuScrollEnd={
        browsingAll && browseQuery.hasNextPage && !browseQuery.isFetchingNextPage
          ? () => void browseQuery.fetchNextPage()
          : undefined
      }
      isLoadingMore={browsingAll && browseQuery.isFetchingNextPage}
      onClear={
        clearable
          ? () => {
              setTypedQuery(null);
              onChange(undefined);
            }
          : undefined
      }
    />
  );
}

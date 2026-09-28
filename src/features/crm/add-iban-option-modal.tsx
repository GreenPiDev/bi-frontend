import { useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/button';
import { FormError } from '../../components/ui/form-error';
import { Modal } from '../../components/ui/modal';
import { TextField } from '../../components/ui/text-field';
import { useToast } from '../../components/ui/toast-context';
import { ApiError, type IbanOption } from '../../lib/api';
import { formatIbanInput, normalizeIban, validateIban } from '../../lib/iban-validation';
import { tr } from '../../i18n/tr';
import { useCreateIbanOptionMutation } from './use-iban-options';

interface AddIbanOptionModalProps {
  onClose: () => void;
  onCreated: (option: IbanOption) => void;
}

/** IBAN/banka hesabı `Select`'inin yanındaki "+ Yeni ..." butonuyla açılan,
 * kullanıcının Ayarlar → Tanımlamalar'a gitmeden tek bir banka hesabı eklemesini
 * sağlayan modal - Birim/Kategori/Marka'daki genel `AddOptionModal`'dan farklı
 * olarak IBAN birden fazla alan (banka/hesap sahibi/hesap no/IBAN) + format/checksum
 * doğrulaması gerektirdiği için ayrı bir bileşen; form/doğrulama mantığı
 * `crm-settings-section.tsx`'teki `IbanOptionsManager`'ın ekleme formuyla birebir
 * aynı. Sadece en az 1 tanımlı değer varken gösterilir. */
export function AddIbanOptionModal({ onClose, onCreated }: AddIbanOptionModalProps) {
  const toast = useToast();
  const createMutation = useCreateIbanOptionMutation();

  const [bankName, setBankName] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');
  const [ibanTouched, setIbanTouched] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | undefined>();

  const ibanValidation = validateIban(iban);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIbanTouched(true);
    if (!bankName.trim() || !accountHolderName.trim() || !ibanValidation.isValid) {
      return;
    }
    createMutation.mutate(
      {
        bankName: bankName.trim(),
        accountHolderName: accountHolderName.trim(),
        accountNumber: accountNumber.trim() || undefined,
        iban: normalizeIban(iban),
      },
      {
        onSuccess: (option) => {
          toast.success(tr.crm.quotes.form.ibanNewSuccess);
          onCreated(option);
        },
        onError: (error) => {
          setApiErrorMessage(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  }

  return (
    <Modal title={tr.crm.quotes.form.ibanNewModalTitle} onClose={onClose} width="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <FormError message={apiErrorMessage} />
        <TextField
          label={tr.settings.crm.ibanOptions.bankNameLabel}
          autoFocus
          placeholder={tr.settings.crm.ibanOptions.bankNamePlaceholder}
          value={bankName}
          onChange={(event) => setBankName(event.target.value)}
        />
        <TextField
          label={tr.settings.crm.ibanOptions.accountHolderNameLabel}
          placeholder={tr.settings.crm.ibanOptions.accountHolderNamePlaceholder}
          value={accountHolderName}
          onChange={(event) => setAccountHolderName(event.target.value)}
        />
        <TextField
          label={tr.settings.crm.ibanOptions.accountNumberLabel}
          placeholder={tr.settings.crm.ibanOptions.accountNumberPlaceholder}
          value={accountNumber}
          onChange={(event) => setAccountNumber(event.target.value)}
        />
        <TextField
          label={tr.settings.crm.ibanOptions.ibanLabel}
          placeholder={tr.settings.crm.ibanOptions.ibanPlaceholder}
          value={iban}
          onChange={(event) => setIban(formatIbanInput(event.target.value))}
          onBlur={() => setIbanTouched(true)}
          error={ibanTouched ? ibanValidation.error : undefined}
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={createMutation.isPending}>
            {tr.common.save}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            {tr.common.cancel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

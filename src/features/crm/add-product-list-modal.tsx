import { useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/button';
import { FormError } from '../../components/ui/form-error';
import { Modal } from '../../components/ui/modal';
import { TextField } from '../../components/ui/text-field';
import { useToast } from '../../components/ui/toast-context';
import { useCreateProductListMutation } from './use-product-lists';
import { ApiError, type ProductList } from '../../lib/api';
import { tr } from '../../i18n/tr';

interface AddProductListModalProps {
  onClose: () => void;
  onCreated: (productList: ProductList) => void;
}

/** `AddOptionModal` ile aynı amaç (select'in yanındaki "+ Yeni ..." ile tek bir değeri
 * hemen eklemek) ama ayrı bir bileşen: `AddOptionModal`'daki değer==label eşitliği
 * (birim/kategori/marka serbest metin) ürün listesinde geçerli değil - `productListId`
 * forma bir `id` olarak yazılır, kullanıcıya görünen `name` değil. */
export function AddProductListModal({ onClose, onCreated }: AddProductListModalProps) {
  const toast = useToast();
  const createMutation = useCreateProductListMutation();
  const [name, setName] = useState('');
  const [apiErrorMessage, setApiErrorMessage] = useState<string | undefined>();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    createMutation.mutate(
      { name: trimmed },
      {
        onSuccess: (productList) => {
          toast.success(tr.crm.products.form.productListNewSuccess);
          onCreated(productList);
        },
        onError: (error) => {
          setApiErrorMessage(error instanceof ApiError ? error.message : tr.common.unexpectedError);
        },
      },
    );
  }

  return (
    <Modal title={tr.crm.products.form.productListNewModalTitle} onClose={onClose} width="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <FormError message={apiErrorMessage} />
        <TextField
          label={tr.crm.products.form.productListNewFieldLabel}
          autoFocus
          placeholder={tr.crm.products.form.productListNewPlaceholder}
          value={name}
          onChange={(event) => setName(event.target.value)}
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

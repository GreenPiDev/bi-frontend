import { Controller, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { Select } from '../../components/ui/select';
import { TextField } from '../../components/ui/text-field';
import { TextareaField } from '../../components/ui/textarea-field';
import { BrandSelect } from './brand-select';
import { CategorySelect } from './category-select';
import { ProductListSelect } from './product-list-select';
import { UnitSelect } from './unit-select';
import type { ProductFormValues } from './schemas';
import { tr } from '../../i18n/tr';

interface ProductFormFieldsProps {
  register: UseFormRegister<ProductFormValues>;
  control: Control<ProductFormValues>;
  errors: FieldErrors<ProductFormValues>;
  onRequestAddUnit: () => void;
  onRequestAddCategory: () => void;
  onRequestAddBrand: () => void;
}

/** `product-form-page.tsx` ile `new-product-modal.tsx` arasında paylaşılan alan seti -
 * `ContactFormFields` ile aynı desen. Birim/Kategori/Marka "+ Yeni ..." modalları bu
 * bileşenin DIŞINDA, çağıranın kendi `<form>`'unun dışında render edilmelidir (bkz.
 * `UnitSelect`'teki yorum) - bu yüzden sadece `onRequestAdd*` callback'leri alınır. */
export function ProductFormFields({
  register,
  control,
  errors,
  onRequestAddUnit,
  onRequestAddCategory,
  onRequestAddBrand,
}: ProductFormFieldsProps) {
  const priceField = register('price');
  const costPriceField = register('costPrice');
  const minStockLevelField = register('minStockLevel');
  const maxDiscountPctField = register('maxDiscountPct');

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      <Controller
        name="productListId"
        control={control}
        render={({ field }) => (
          <ProductListSelect
            value={field.value ?? ''}
            onChange={field.onChange}
            error={errors.productListId?.message}
          />
        )}
      />
      <TextField
        label={tr.crm.products.form.nameLabel}
        required
        hint={tr.crm.products.form.nameHint}
        error={errors.name?.message}
        {...register('name')}
      />
      <TextField
        label={tr.crm.products.form.skuLabel}
        hint={tr.crm.products.form.skuHint}
        error={errors.sku?.message}
        {...register('sku')}
      />
      <Controller
        name="unit"
        control={control}
        render={({ field }) => (
          <UnitSelect
            value={field.value ?? ''}
            onChange={field.onChange}
            error={errors.unit?.message}
            onRequestAddNew={onRequestAddUnit}
          />
        )}
      />
      <Controller
        name="category"
        control={control}
        render={({ field }) => (
          <CategorySelect
            value={field.value ?? ''}
            onChange={field.onChange}
            error={errors.category?.message}
            onRequestAddNew={onRequestAddCategory}
          />
        )}
      />
      <Controller
        name="brand"
        control={control}
        render={({ field }) => (
          <BrandSelect
            value={field.value ?? ''}
            onChange={field.onChange}
            error={errors.brand?.message}
            onRequestAddNew={onRequestAddBrand}
          />
        )}
      />
      <div className="sm:col-span-2">
        <TextareaField
          label={tr.crm.products.form.descriptionLabel}
          hint={tr.crm.products.form.descriptionHint}
          error={errors.description?.message}
          {...register('description')}
        />
      </div>
      <TextField
        type="text"
        inputMode="decimal"
        label={tr.crm.products.form.priceLabel}
        hint={tr.crm.products.form.priceHint}
        error={errors.price?.message}
        {...priceField}
        onChange={(event) => {
          event.target.value = event.target.value.replace(/[^0-9.]/g, '');
          priceField.onChange(event);
        }}
      />
      <Select
        label={tr.crm.products.form.currencyLabel}
        required
        error={errors.currency?.message}
        options={[
          { value: 'TRY', label: 'TRY' },
          { value: 'EUR', label: 'EUR' },
          { value: 'USD', label: 'USD' },
        ]}
        {...register('currency')}
      />
      <TextField
        type="text"
        inputMode="decimal"
        label={tr.crm.products.form.costPriceLabel}
        hint={tr.crm.products.form.costPriceHint}
        error={errors.costPrice?.message}
        {...costPriceField}
        onChange={(event) => {
          event.target.value = event.target.value.replace(/[^0-9.]/g, '');
          costPriceField.onChange(event);
        }}
      />
      <TextField
        type="text"
        inputMode="numeric"
        label={tr.crm.products.form.minStockLevelLabel}
        hint={tr.crm.products.form.minStockLevelHint}
        error={errors.minStockLevel?.message}
        {...minStockLevelField}
        onChange={(event) => {
          event.target.value = event.target.value.replace(/[^0-9]/g, '');
          minStockLevelField.onChange(event);
        }}
      />
      <TextField
        type="text"
        inputMode="decimal"
        label={tr.crm.products.form.maxDiscountPctLabel}
        hint={tr.crm.products.form.maxDiscountPctHint}
        error={errors.maxDiscountPct?.message}
        {...maxDiscountPctField}
        onChange={(event) => {
          event.target.value = event.target.value.replace(/[^0-9.]/g, '');
          maxDiscountPctField.onChange(event);
        }}
      />
    </div>
  );
}

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { useToast } from '../components/ui/toast-context';
import { AddOptionModal } from '../features/crm/add-option-modal';
import { ContactFormFields } from '../features/crm/contact-form-fields';
import {
  cleanEmptyStrings,
  contactFormSchema,
  type ContactFormValues,
} from '../features/crm/schemas';
import {
  useContactQuery,
  useCreateContactMutation,
  useUpdateContactMutation,
} from '../features/crm/use-contacts';
import { useCreateDepartmentOptionMutation } from '../features/crm/use-department-options';
import { useCreateTitleOptionMutation } from '../features/crm/use-title-options';
import { ApiError } from '../lib/api';
import { tr } from '../i18n/tr';

type OptionFieldKind = 'department' | 'title';

export function ContactFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const contactQuery = useContactQuery(id ?? '');
  const createMutation = useCreateContactMutation();
  const updateMutation = useUpdateContactMutation(id ?? '');
  const mutation = isEdit ? updateMutation : createMutation;
  const createDepartmentOptionMutation = useCreateDepartmentOptionMutation();
  const createTitleOptionMutation = useCreateTitleOptionMutation();
  // Urun formundaki "+ Yeni Kategori" ile ayni desen (bkz. product-form-page.tsx) -
  // modal <form>'un disinda render edilir.
  const [activeOptionModal, setActiveOptionModal] = useState<OptionFieldKind | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { status: 'ACTIVE' },
  });

  useEffect(() => {
    if (contactQuery.data) {
      reset({
        firstName: contactQuery.data.firstName,
        lastName: contactQuery.data.lastName,
        accountId: contactQuery.data.accountId ?? undefined,
        department: contactQuery.data.department ?? undefined,
        title: contactQuery.data.title ?? undefined,
        email: contactQuery.data.email ?? undefined,
        phone: contactQuery.data.phone ?? undefined,
        extension: contactQuery.data.extension ?? undefined,
        status: contactQuery.data.status,
        lastContactedAt: contactQuery.data.lastContactedAt?.slice(0, 10) ?? undefined,
      });
    }
  }, [contactQuery.data, reset]);

  if (isEdit && contactQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(cleanEmptyStrings(values), {
      onSuccess: (contact) => {
        toast.success(
          isEdit ? tr.crm.contacts.form.updateSuccess : tr.crm.contacts.form.createSuccess,
        );
        navigate(`/kisiler/${contact.id}`);
      },
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
      },
    });
  });

  const apiErrorMessage = mutation.error instanceof ApiError ? mutation.error.message : undefined;

  return (
    <AppShell>
      <BackLink to={'/kisiler'} label={tr.crm.contacts.back} />

      <div className="mt-6">
        <h1 className="text-lg font-bold text-app-text">
          {isEdit ? tr.crm.contacts.form.editTitle : tr.crm.contacts.form.newTitle}
        </h1>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          <FormError message={apiErrorMessage} />
          <ContactFormFields
            register={register}
            control={control}
            errors={errors}
            onRequestAddDepartment={() => setActiveOptionModal('department')}
            onRequestAddTitle={() => setActiveOptionModal('title')}
          />
          <div className="mt-1 flex gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? tr.crm.contacts.form.submitting : tr.crm.contacts.form.submit}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/kisiler')}>
              {tr.crm.contacts.form.cancel}
            </Button>
          </div>
        </form>
      </div>

      {activeOptionModal === 'department' && (
        <AddOptionModal
          title={tr.crm.contacts.form.departmentNewModalTitle}
          fieldLabel={tr.crm.contacts.form.departmentNewFieldLabel}
          placeholder={tr.crm.contacts.form.departmentNewPlaceholder}
          successMessage={tr.crm.contacts.form.departmentNewSuccess}
          createMutation={createDepartmentOptionMutation}
          onClose={() => setActiveOptionModal(null)}
          onCreated={(label) => {
            setValue('department', label, { shouldValidate: true });
            setActiveOptionModal(null);
          }}
        />
      )}
      {activeOptionModal === 'title' && (
        <AddOptionModal
          title={tr.crm.contacts.form.titleNewModalTitle}
          fieldLabel={tr.crm.contacts.form.titleNewFieldLabel}
          placeholder={tr.crm.contacts.form.titleNewPlaceholder}
          successMessage={tr.crm.contacts.form.titleNewSuccess}
          createMutation={createTitleOptionMutation}
          onClose={() => setActiveOptionModal(null)}
          onCreated={(label) => {
            setValue('title', label, { shouldValidate: true });
            setActiveOptionModal(null);
          }}
        />
      )}
    </AppShell>
  );
}

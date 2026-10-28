import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../../components/ui/button';
import { FormError } from '../../components/ui/form-error';
import { TextareaField } from '../../components/ui/textarea-field';
import { TextField } from '../../components/ui/text-field';
import { tr } from '../../i18n/tr';
import { demoRequestFormSchema, type DemoRequestFormValues } from './schemas';
import { useDemoRequestMutation } from './use-demo-request';

export function DemoRequestForm() {
  const demoRequestMutation = useDemoRequestMutation();
  const [submitted, setSubmitted] = useState(false);
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<DemoRequestFormValues>({ resolver: zodResolver(demoRequestFormSchema) });

  const onSubmit = handleSubmit((values) => {
    demoRequestMutation.mutate(values, {
      onSuccess: () => setSubmitted(true),
    });
  });

  if (submitted) {
    return (
      <div className="flex flex-col items-center rounded-2xl bg-emerald-50 p-10 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        <h3 className="mt-4 text-lg font-bold text-slate-900">
          {tr.landing.demoForm.successTitle}
        </h3>
        <p className="mt-2 max-w-sm text-sm text-slate-600">{tr.landing.demoForm.successMessage}</p>
      </div>
    );
  }

  const apiErrorMessage = demoRequestMutation.isError ? tr.landing.demoForm.errorToast : undefined;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <FormError message={apiErrorMessage} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={tr.landing.demoForm.fields.name}
          required
          error={errors.name?.message}
          {...registerField('name')}
        />
        <TextField
          label={tr.landing.demoForm.fields.company}
          required
          error={errors.company?.message}
          {...registerField('company')}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={tr.landing.demoForm.fields.email}
          type="email"
          required
          error={errors.email?.message}
          {...registerField('email')}
        />
        <TextField
          label={tr.landing.demoForm.fields.phone}
          error={errors.phone?.message}
          {...registerField('phone')}
        />
      </div>
      <TextareaField
        label={tr.landing.demoForm.fields.message}
        rows={3}
        error={errors.message?.message}
        {...registerField('message')}
      />
      <Button
        type="submit"
        disabled={demoRequestMutation.isPending}
        className="mt-1 w-full py-3 text-base"
      >
        {demoRequestMutation.isPending
          ? tr.landing.demoForm.submitting
          : tr.landing.demoForm.submit}
      </Button>
    </form>
  );
}

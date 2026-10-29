import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../../components/ui/button';
import { tr } from '../../i18n/tr';
import { DarkTextareaField, DarkTextField } from './dark-field';
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
      <div className="flex flex-col items-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-10 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-400" />
        <h3 className="mt-4 text-lg font-bold text-white">{tr.landing.demoForm.successTitle}</h3>
        <p className="mt-2 max-w-sm text-sm text-slate-300">{tr.landing.demoForm.successMessage}</p>
      </div>
    );
  }

  const apiErrorMessage = demoRequestMutation.isError ? tr.landing.demoForm.errorToast : undefined;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {apiErrorMessage && (
        <p className="rounded-lg border border-red-400/20 bg-red-400/10 px-3.5 py-2.5 text-sm font-medium text-red-400">
          {apiErrorMessage}
        </p>
      )}
      <DarkTextField
        label={tr.landing.demoForm.fields.name}
        required
        error={errors.name?.message}
        {...registerField('name')}
      />
      <DarkTextField
        label={tr.landing.demoForm.fields.email}
        type="email"
        required
        error={errors.email?.message}
        {...registerField('email')}
      />
      <DarkTextField
        label={tr.landing.demoForm.fields.company}
        error={errors.company?.message}
        {...registerField('company')}
      />
      <DarkTextField
        label={tr.landing.demoForm.fields.phone}
        error={errors.phone?.message}
        {...registerField('phone')}
      />
      <DarkTextareaField
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

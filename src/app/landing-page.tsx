import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { TextareaField } from '../components/ui/textarea-field';
import { TextField } from '../components/ui/text-field';
import { useDemoRequestMutation } from '../features/landing/use-demo-request';
import { demoRequestFormSchema, type DemoRequestFormValues } from '../features/landing/schemas';
import { tr } from '../i18n/tr';

function DemoRequestForm() {
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
      <div className="rounded-2xl bg-app-brand/10 p-8 text-center">
        <h3 className="text-lg font-semibold text-app-text">{tr.landing.demoForm.successTitle}</h3>
        <p className="mt-2 text-sm text-app-muted">{tr.landing.demoForm.successMessage}</p>
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
          error={errors.name?.message}
          {...registerField('name')}
        />
        <TextField
          label={tr.landing.demoForm.fields.company}
          error={errors.company?.message}
          {...registerField('company')}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={tr.landing.demoForm.fields.email}
          type="email"
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
      <Button type="submit" disabled={demoRequestMutation.isPending} className="mt-1 self-start">
        {demoRequestMutation.isPending
          ? tr.landing.demoForm.submitting
          : tr.landing.demoForm.submit}
      </Button>
    </form>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-app-surface text-app-text">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <img src="/pilens-logo.png" alt="PiLens" className="h-9 w-auto" />
        <nav className="flex items-center gap-3">
          <a
            href="#demo"
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-app-brand hover:bg-app-brand/10"
          >
            {tr.landing.nav.demoCta}
          </a>
          <Link to="/login">
            <Button variant="secondary">{tr.landing.nav.login}</Button>
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <p className="text-sm font-semibold tracking-wide text-app-brand uppercase">
          {tr.landing.hero.eyebrow}
        </p>
        <h1 className="mt-4 text-3xl font-bold text-balance text-app-text sm:text-4xl">
          {tr.landing.hero.title}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-app-muted">
          {tr.landing.hero.subtitle}
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <a href="#demo">
            <Button variant="primary">{tr.landing.hero.primaryCta}</Button>
          </a>
          <Link to="/login">
            <Button variant="secondary">{tr.landing.hero.secondaryCta}</Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-center text-2xl font-bold text-app-text">
          {tr.landing.features.title}
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tr.landing.features.items.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-app-border bg-white p-6">
              <h3 className="text-base font-semibold text-app-text">{feature.title}</h3>
              <p className="mt-2 text-sm text-app-muted">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="demo" className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-2xl border border-app-border bg-white p-8">
          <h2 className="text-xl font-bold text-app-text">{tr.landing.demoForm.title}</h2>
          <p className="mt-1 text-sm text-app-muted">{tr.landing.demoForm.subtitle}</p>
          <div className="mt-6">
            <DemoRequestForm />
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-8 text-center text-xs text-app-muted">
        {tr.landing.footer.rights(new Date().getFullYear())}
      </footer>
    </div>
  );
}

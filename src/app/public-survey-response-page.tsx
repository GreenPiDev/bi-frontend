import { useQuery } from '@tanstack/react-query';
import { CircleAlert, CircleCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { TextareaField } from '../components/ui/textarea-field';
import {
  ApiError,
  getPublicSurvey,
  submitPublicSurveyResponse,
  type PublicSurveyAnswerInput,
  type PublicSurveyQuestion,
} from '../lib/api';
import { tr } from '../i18n/tr';

const LIKERT_SCALE = [1, 2, 3, 4, 5] as const;

/** Musterinin kimlik dogrulamasiz girdigi public yanit sayfasi icin bagimsiz,
 * markasiz bir kabuk - AuthLayout'un login ekranina ait pazarlama gorseli burada
 * uygun degil (bkz. kullanici geri bildirimi). Ust kisimda, veri geldiyse (tenant
 * logo setlediyse) sirket logosu, yoksa "PiLens" yazisi gosterilir. */
function PublicSurveyShell({
  children,
  logoUrl,
  tenantName,
}: {
  children: ReactNode;
  logoUrl?: string | null;
  tenantName?: string | null;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-app-bg-muted px-4 py-10 sm:py-16">
      <div className="mb-6 flex items-center justify-center">
        {logoUrl ? (
          <img src={logoUrl} alt={tenantName ?? ''} className="h-10 max-w-[220px] object-contain" />
        ) : (
          <span className="text-lg font-bold tracking-tight text-app-brand">PiLens</span>
        )}
      </div>
      <div className="w-full max-w-xl rounded-2xl border border-app-border bg-app-surface p-6 shadow-sm sm:p-10">
        {children}
      </div>
      <p className="mt-6 text-center text-xs text-app-muted">
        {tr.publicSurvey.poweredByFooter}{' '}
        <a
          href="https://www.pilens.com.tr"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-app-brand"
        >
          www.pilens.com.tr
        </a>
      </p>
    </div>
  );
}

type AnswerState = {
  answerText?: string;
  answerOptionId?: string;
  answerLikertValue?: number;
};

function QuestionField({
  question,
  value,
  error,
  onChange,
}: {
  question: PublicSurveyQuestion;
  value: AnswerState | undefined;
  error?: string;
  onChange: (next: AnswerState) => void;
}) {
  if (question.type === 'OPEN_ENDED') {
    return (
      <div className="flex flex-col gap-2">
        <TextareaField
          label={question.text}
          required={question.required}
          value={value?.answerText ?? ''}
          onChange={(event) => onChange({ answerText: event.target.value })}
        />
        <FormError message={error} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-app-text">
        {question.text}
        {question.required && (
          <span className="ml-0.5 text-app-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {question.type === 'LIKERT' && (
        <div className="flex items-center gap-2">
          {LIKERT_SCALE.map((point) => (
            <button
              key={point}
              type="button"
              onClick={() => onChange({ answerLikertValue: point })}
              className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${
                value?.answerLikertValue === point
                  ? 'border-app-brand bg-app-brand text-white'
                  : 'border-app-border text-app-text hover:border-app-brand'
              }`}
            >
              {point}
            </button>
          ))}
        </div>
      )}

      {question.type === 'MULTIPLE_CHOICE' && (
        <div className="flex flex-col gap-2">
          {question.options.map((option) => (
            <label key={option.id} className="flex items-center gap-2 text-sm text-app-text">
              <input
                type="radio"
                name={question.id}
                checked={value?.answerOptionId === option.id}
                onChange={() => onChange({ answerOptionId: option.id })}
              />
              {option.label}
            </label>
          ))}
        </div>
      )}

      <FormError message={error} />
    </div>
  );
}

export function PublicSurveyResponsePage() {
  const { token = '' } = useParams();
  const surveyQuery = useQuery({
    queryKey: ['public-survey', token],
    queryFn: () => getPublicSurvey(token),
    enabled: Boolean(token),
    retry: false,
  });

  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>(undefined);

  if (surveyQuery.isPending) {
    return (
      <PublicSurveyShell>
        <p className="text-center text-sm text-app-muted">{tr.common.loading}</p>
      </PublicSurveyShell>
    );
  }

  if (surveyQuery.isError) {
    return (
      <PublicSurveyShell>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CircleAlert className="h-10 w-10 text-app-danger" />
          <p className="text-sm text-app-muted">{tr.publicSurvey.invalidTokenMessage}</p>
        </div>
      </PublicSurveyShell>
    );
  }

  const survey = surveyQuery.data;
  if (!survey) return null;

  if (survey.alreadyResponded || submitted) {
    return (
      <PublicSurveyShell logoUrl={survey.tenantLogoDataUrl} tenantName={survey.tenantName}>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CircleCheck className="h-10 w-10 text-app-success" />
          <h1 className="text-lg font-bold text-app-text">{survey.surveyName}</h1>
          <p className="text-sm text-app-muted">
            {submitted ? tr.publicSurvey.submittedMessage : tr.publicSurvey.alreadyRespondedMessage}
          </p>
        </div>
      </PublicSurveyShell>
    );
  }

  async function handleSubmit() {
    const nextErrors: Record<string, string> = {};
    for (const question of survey!.questions) {
      if (!question.required) continue;
      const answer = answers[question.id];
      const isAnswered =
        (question.type === 'OPEN_ENDED' && Boolean(answer?.answerText?.trim())) ||
        (question.type === 'LIKERT' && answer?.answerLikertValue != null) ||
        (question.type === 'MULTIPLE_CHOICE' && Boolean(answer?.answerOptionId));
      if (!isAnswered) {
        nextErrors[question.id] = tr.publicSurvey.requiredQuestionError;
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload: PublicSurveyAnswerInput[] = Object.entries(answers).map(
      ([questionId, answer]) => ({ questionId, ...answer }),
    );

    setIsSubmitting(true);
    setSubmitError(undefined);
    try {
      await submitPublicSurveyResponse(token, payload);
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : tr.common.unexpectedError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PublicSurveyShell logoUrl={survey.tenantLogoDataUrl} tenantName={survey.tenantName}>
      <div className="mb-6 border-b border-app-border pb-6 text-center">
        <h1 className="text-xl font-bold text-app-text">{survey.surveyName}</h1>
        {survey.surveyDescription && (
          <p className="mt-2 text-sm text-app-muted">{survey.surveyDescription}</p>
        )}
      </div>

      <div className="flex flex-col gap-6">
        <FormError message={submitError} />
        {survey.questions.map((question) => (
          <QuestionField
            key={question.id}
            question={question}
            value={answers[question.id]}
            error={errors[question.id]}
            onChange={(next) => setAnswers((prev) => ({ ...prev, [question.id]: next }))}
          />
        ))}
        <Button type="button" disabled={isSubmitting} onClick={() => void handleSubmit()}>
          {tr.publicSurvey.submitButton}
        </Button>
      </div>
    </PublicSurveyShell>
  );
}

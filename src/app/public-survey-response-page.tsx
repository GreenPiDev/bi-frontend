import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AuthLayout } from '../components/ui/auth-layout';
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
      <AuthLayout>
        <p className="text-center text-sm text-app-muted">{tr.common.loading}</p>
      </AuthLayout>
    );
  }

  if (surveyQuery.isError) {
    return (
      <AuthLayout>
        <p className="text-center text-sm text-app-danger">{tr.publicSurvey.invalidTokenMessage}</p>
      </AuthLayout>
    );
  }

  const survey = surveyQuery.data;
  if (!survey) return null;

  if (survey.alreadyResponded || submitted) {
    return (
      <AuthLayout>
        <h1 className="mb-3 text-center text-xl font-bold text-app-text">{survey.surveyName}</h1>
        <p className="text-center text-sm text-app-muted">
          {tr.publicSurvey.alreadyRespondedMessage}
        </p>
      </AuthLayout>
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
    <AuthLayout>
      <h1 className="mb-1 text-center text-xl font-bold text-app-text">{survey.surveyName}</h1>
      {survey.surveyDescription && (
        <p className="mb-5 text-center text-sm text-app-muted">{survey.surveyDescription}</p>
      )}

      <div className="flex flex-col gap-5">
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
    </AuthLayout>
  );
}

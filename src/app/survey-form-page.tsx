import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import {
  Controller,
  useFieldArray,
  useForm,
  type Control,
  type UseFormRegister,
} from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { AppShell } from './app-shell';
import { BackLink } from '../components/ui/back-link';
import { Button } from '../components/ui/button';
import { FormError } from '../components/ui/form-error';
import { IconActionButton } from '../components/ui/icon-action-button';
import { PageHelp } from '../components/ui/page-help';
import { Select } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { TextareaField } from '../components/ui/textarea-field';
import { TextField } from '../components/ui/text-field';
import { useToast } from '../components/ui/toast-context';
import {
  useCreateSurveyMutation,
  useSurveyQuery,
  useUpdateSurveyMutation,
} from '../features/crm/use-surveys';
import { ApiError, type SurveyInput, type SurveyQuestionType } from '../lib/api';
import { tr } from '../i18n/tr';

const QuestionSchema = z
  .object({
    type: z.enum(['MULTIPLE_CHOICE', 'OPEN_ENDED', 'LIKERT']),
    text: z.string().trim().min(2, tr.crm.surveys.form.questionTextError),
    required: z.boolean(),
    options: z.array(
      z.object({ label: z.string().trim().min(1, tr.crm.surveys.form.optionLabelError) }),
    ),
  })
  .refine((q) => q.type !== 'MULTIPLE_CHOICE' || q.options.length >= 2, {
    message: tr.crm.surveys.form.minOptionsError,
    path: ['options'],
  });

const SurveyFormSchema = z.object({
  name: z.string().trim().min(2, tr.crm.surveys.form.nameError),
  description: z.string().trim().optional(),
  isActive: z.boolean(),
  questions: z.array(QuestionSchema).min(1, tr.crm.surveys.form.minQuestionsError),
});
type SurveyFormValues = z.infer<typeof SurveyFormSchema>;

const QUESTION_TYPE_OPTIONS: { value: SurveyQuestionType; label: string }[] = [
  { value: 'MULTIPLE_CHOICE', label: tr.crm.surveys.form.typeMultipleChoice },
  { value: 'OPEN_ENDED', label: tr.crm.surveys.form.typeOpenEnded },
  { value: 'LIKERT', label: tr.crm.surveys.form.typeLikert },
];

const EMPTY_QUESTION: SurveyFormValues['questions'][number] = {
  type: 'OPEN_ENDED',
  text: '',
  required: true,
  options: [],
};

function SurveyQuestionRow({
  control,
  register,
  index,
  type,
  onRemove,
  errors,
}: {
  control: Control<SurveyFormValues>;
  register: UseFormRegister<SurveyFormValues>;
  index: number;
  type: SurveyQuestionType;
  onRemove: () => void;
  errors: ReturnType<typeof useForm<SurveyFormValues>>['formState']['errors'];
}) {
  const optionsArray = useFieldArray({ control, name: `questions.${index}.options` });

  return (
    <div className="rounded-lg border border-app-border bg-app-bg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-app-brand/10 text-xs font-bold text-app-brand">
            {index + 1}
          </span>
          <span className="text-sm font-semibold text-app-text">
            {tr.crm.surveys.form.questionLabel}
          </span>
        </div>
        <IconActionButton
          icon={Trash2}
          tooltip={tr.crm.surveys.form.removeQuestion}
          variant="danger"
          onClick={onRemove}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[auto_1fr]">
        <div className="sm:w-48">
          <Select
            label={tr.crm.surveys.form.typeLabel}
            options={QUESTION_TYPE_OPTIONS}
            {...register(`questions.${index}.type`)}
          />
        </div>
        <TextField
          label={tr.crm.surveys.form.questionTextLabel}
          required
          error={errors.questions?.[index]?.text?.message}
          {...register(`questions.${index}.text`)}
        />
      </div>

      <Controller
        control={control}
        name={`questions.${index}.required`}
        render={({ field }) => (
          <div className="mt-4 flex items-center gap-2">
            <Switch checked={field.value} onChange={field.onChange} />
            <span className="text-sm text-app-muted">{tr.crm.surveys.form.requiredLabel}</span>
          </div>
        )}
      />

      {type === 'MULTIPLE_CHOICE' && (
        <div className="mt-4 space-y-2 border-t border-app-border pt-4">
          <span className="text-sm font-semibold text-app-text">
            {tr.crm.surveys.form.optionsLabel}
          </span>
          {optionsArray.fields.map((option, optionIndex) => (
            <div key={option.id} className="flex items-center gap-2">
              <TextField
                label=""
                hideLabel
                placeholder={tr.crm.surveys.form.optionPlaceholder}
                error={errors.questions?.[index]?.options?.[optionIndex]?.label?.message}
                {...register(`questions.${index}.options.${optionIndex}.label`)}
              />
              <IconActionButton
                icon={Trash2}
                tooltip={tr.crm.surveys.form.removeOption}
                variant="danger"
                onClick={() => optionsArray.remove(optionIndex)}
              />
            </div>
          ))}
          {typeof errors.questions?.[index]?.options?.message === 'string' && (
            <FormError message={errors.questions[index]?.options?.message} />
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={() => optionsArray.append({ label: '' })}
          >
            {tr.crm.surveys.form.addOption}
          </Button>
        </div>
      )}
    </div>
  );
}

export function SurveyFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const surveyQuery = useSurveyQuery(id ?? '');
  const createMutation = useCreateSurveyMutation();
  const updateMutation = useUpdateSurveyMutation(id ?? '');

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SurveyFormValues>({
    resolver: zodResolver(SurveyFormSchema),
    defaultValues: {
      name: '',
      description: '',
      isActive: true,
      questions: [EMPTY_QUESTION],
    },
  });
  const questionsArray = useFieldArray({ control, name: 'questions' });
  const questionTypes = watch('questions');

  useEffect(() => {
    if (!surveyQuery.data) return;
    reset({
      name: surveyQuery.data.name,
      description: surveyQuery.data.description ?? '',
      isActive: surveyQuery.data.isActive,
      questions: surveyQuery.data.questions.map((question) => ({
        type: question.type,
        text: question.text,
        required: question.required,
        options: question.options.map((option) => ({ label: option.label })),
      })),
    });
  }, [surveyQuery.data, reset]);

  function onSubmit(values: SurveyFormValues) {
    const input: SurveyInput = {
      name: values.name,
      description: values.description || undefined,
      isActive: values.isActive,
      questions: values.questions.map((question) => ({
        type: question.type,
        text: question.text,
        required: question.required,
        options: question.type === 'MULTIPLE_CHOICE' ? question.options : undefined,
      })),
    };

    const onSuccess = () => {
      toast.success(isEdit ? tr.crm.surveys.form.updateSuccess : tr.crm.surveys.form.createSuccess);
      navigate('/satis-sonrasi?tab=surveys');
    };
    const onError = (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError);
    };

    if (isEdit) {
      updateMutation.mutate(input, { onSuccess, onError });
    } else {
      createMutation.mutate(input, { onSuccess, onError });
    }
  }

  if (isEdit && surveyQuery.isPending) {
    return (
      <AppShell>
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <BackLink to="/satis-sonrasi?tab=surveys" label={tr.crm.surveys.form.back} />
      <div className="mt-4 flex items-center gap-2">
        <h1 className="text-xl font-bold text-app-text">
          {isEdit ? tr.crm.surveys.form.editTitle : tr.crm.surveys.form.createTitle}
        </h1>
        <PageHelp text={tr.help.surveys} />
      </div>

      <form className="mt-6 space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="rounded-lg border border-app-border bg-app-surface p-5">
          <h2 className="text-sm font-bold text-app-text">
            {tr.crm.surveys.form.generalInfoTitle}
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label={tr.crm.surveys.form.nameLabel}
              required
              error={errors.name?.message}
              {...register('name')}
            />
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <div className="flex items-center gap-2 self-end rounded-lg border border-app-border bg-app-bg px-3.5 py-2.5">
                  <Switch checked={field.value} onChange={field.onChange} />
                  <span className="text-sm font-semibold text-app-text">
                    {tr.crm.surveys.form.activeLabel}
                  </span>
                </div>
              )}
            />
            <div className="sm:col-span-2">
              <TextareaField
                label={tr.crm.surveys.form.descriptionLabel}
                error={errors.description?.message}
                {...register('description')}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-app-border bg-app-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-app-text">
              {tr.crm.surveys.form.questionsTitle}
            </h2>
            <span className="inline-flex items-center rounded-full bg-app-brand/10 px-2.5 py-1 text-xs font-semibold text-app-brand">
              {tr.crm.surveys.form.questionCount(questionsArray.fields.length)}
            </span>
          </div>
          {typeof errors.questions?.message === 'string' && (
            <FormError message={errors.questions.message} />
          )}
          <div className="flex flex-col gap-4">
            {questionsArray.fields.map((question, index) => (
              <SurveyQuestionRow
                key={question.id}
                control={control}
                register={register}
                index={index}
                type={questionTypes?.[index]?.type ?? 'OPEN_ENDED'}
                onRemove={() => questionsArray.remove(index)}
                errors={errors}
              />
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => questionsArray.append(EMPTY_QUESTION)}
          >
            <Plus size={16} className="mr-1 inline" />
            {tr.crm.surveys.form.addQuestion}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isEdit ? tr.crm.surveys.form.saveButton : tr.crm.surveys.form.createButton}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => navigate('/satis-sonrasi?tab=surveys')}
          >
            {tr.common.cancel}
          </Button>
        </div>
      </form>
    </AppShell>
  );
}

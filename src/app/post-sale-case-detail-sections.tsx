import { clsx } from 'clsx';
import {
  Bell,
  BellRing,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquareText,
  Send,
  ShoppingCart,
  Star,
  User,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { formatPostSaleDate } from '../features/crm/format-post-sale-date';
import type { PostSaleCase } from '../lib/api';
import { tr } from '../i18n/tr';

const t = tr.crm.postSaleCases.detail;

export function SectionCard({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx('rounded-xl border border-app-border bg-app-surface shadow-sm', className)}
    >
      <header className="flex items-center gap-3 border-b border-app-border px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center text-app-primary">
          <Icon className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-app-text">{title}</h2>
          {description && <div className="mt-0.5 text-xs text-app-muted">{description}</div>}
        </div>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
  to,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  to?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-app-border bg-app-surface px-4 py-3 shadow-sm">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center text-app-muted">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-app-muted">{label}</p>
        {to ? (
          <Link
            to={to}
            className="block truncate text-sm font-semibold text-app-primary hover:underline"
          >
            {value}
          </Link>
        ) : (
          <p className="truncate text-sm font-semibold text-app-text">{value}</p>
        )}
      </div>
    </div>
  );
}

export function PostSaleOverview({ postSaleCase }: { postSaleCase: PostSaleCase }) {
  const contactName = postSaleCase.contact
    ? `${postSaleCase.contact.firstName} ${postSaleCase.contact.lastName}`
    : t.noContact;
  return (
    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <InfoTile
        icon={ShoppingCart}
        label={t.orderLabel}
        value={postSaleCase.salesOrder.orderNumber}
        to={`/satis-siparisleri/${postSaleCase.salesOrderId}`}
      />
      <InfoTile
        icon={Building2}
        label={t.accountLabel}
        value={postSaleCase.account.name}
        to={`/firmalar/${postSaleCase.accountId}`}
      />
      <InfoTile
        icon={User}
        label={t.contactLabel}
        value={contactName}
        to={postSaleCase.contactId ? `/kisiler/${postSaleCase.contactId}` : undefined}
      />
      <InfoTile
        icon={FileText}
        label={t.quoteLabel}
        value={postSaleCase.quote?.quoteNumber ?? t.noQuote}
        to={postSaleCase.quoteId ? `/teklifler/${postSaleCase.quoteId}` : undefined}
      />
    </div>
  );
}

function TimelineStep({
  icon: Icon,
  title,
  subtitle,
  done,
  isLast,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  done: boolean;
  isLast?: boolean;
}) {
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {!isLast && (
        <span
          className={clsx(
            'absolute left-4 top-9 -ml-px h-[calc(100%-2.25rem)] w-0.5',
            done ? 'bg-app-success/40' : 'bg-app-border',
          )}
          aria-hidden="true"
        />
      )}
      <span
        className={clsx(
          'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
          done ? 'border-app-success/40 text-app-success' : 'border-app-border text-app-muted',
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 pt-1">
        <p className={clsx('text-sm font-semibold', done ? 'text-app-text' : 'text-app-muted')}>
          {title}
        </p>
        <p className="mt-0.5 text-xs text-app-muted">{subtitle}</p>
      </div>
    </li>
  );
}

export function PostSaleTimeline({ postSaleCase }: { postSaleCase: PostSaleCase }) {
  const survey = postSaleCase.feedbackSurvey;
  return (
    <SectionCard icon={Clock} title={t.timelineTitle}>
      <ol>
        <TimelineStep
          icon={Bell}
          title={t.reminderAtLabel}
          subtitle={formatPostSaleDate(postSaleCase.reminderAt)}
          done
        />
        <TimelineStep
          icon={BellRing}
          title={postSaleCase.reminderSentAt ? t.reminderSentLabel : t.reminderPendingLabel}
          subtitle={formatPostSaleDate(postSaleCase.reminderSentAt)}
          done={Boolean(postSaleCase.reminderSentAt)}
        />
        <TimelineStep
          icon={Send}
          title={survey ? t.surveySentAt : t.surveyNotSent}
          subtitle={formatPostSaleDate(survey?.sentAt ?? null)}
          done={Boolean(survey)}
        />
        <TimelineStep
          icon={MessageSquareText}
          title={survey?.respondedAt ? t.surveyRespondedAt : t.surveyAwaitingResponse}
          subtitle={formatPostSaleDate(survey?.respondedAt ?? null)}
          done={Boolean(survey?.respondedAt)}
        />
        <TimelineStep
          icon={CheckCircle2}
          title={postSaleCase.feedbackReceivedAt ? t.alreadyReceivedLabel : t.feedbackPending}
          subtitle={formatPostSaleDate(postSaleCase.feedbackReceivedAt)}
          done={Boolean(postSaleCase.feedbackReceivedAt)}
          isLast
        />
      </ol>
    </SectionCard>
  );
}

function LikertValue({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((step) => (
        <Star
          key={step}
          className={clsx(
            'h-4 w-4',
            step <= value ? 'fill-amber-400 text-amber-400' : 'text-app-border',
          )}
          aria-hidden="true"
        />
      ))}
      <span className="ml-1.5 text-xs font-semibold text-app-muted">{value} / 5</span>
    </div>
  );
}

export function PostSaleSurveyResponses({ postSaleCase }: { postSaleCase: PostSaleCase }) {
  const responses = postSaleCase.feedbackSurvey?.responses ?? [];
  if (responses.length === 0) return null;
  return (
    <SectionCard icon={MessageSquareText} title={t.surveyResponsesTitle}>
      <ol className="flex flex-col divide-y divide-app-border">
        {responses.map((response, index) => (
          <li key={response.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-app-bg-muted text-xs font-bold text-app-muted">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-app-text">{response.question.text}</p>
              <div className="mt-1.5 text-sm text-app-muted">
                {response.question.type === 'LIKERT' &&
                  (response.answerLikertValue != null ? (
                    <LikertValue value={response.answerLikertValue} />
                  ) : (
                    '—'
                  ))}
                {response.question.type === 'MULTIPLE_CHOICE' &&
                  (response.answerOption ? (
                    <span className="inline-flex rounded-md bg-app-primary/10 px-2 py-0.5 text-xs font-semibold text-app-primary">
                      {response.answerOption.label}
                    </span>
                  ) : (
                    '—'
                  ))}
                {response.question.type === 'OPEN_ENDED' && (
                  <p className="whitespace-pre-wrap rounded-lg bg-app-bg-muted px-3 py-2 text-app-text">
                    {response.answerText || '—'}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}

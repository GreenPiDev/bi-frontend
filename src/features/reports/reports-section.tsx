import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { useDashboardsQuery } from '../dashboards/use-dashboards';
import { ApiError } from '../../lib/api';
import { tr } from '../../i18n/tr';
import { buildCron, describeCron, type ReportFrequency } from './report-schedule';
import {
  useCreateReportMutation,
  useDeleteReportMutation,
  useReportsQuery,
  useUpdateReportMutation,
} from './use-reports';

const WEEKDAYS = [
  { value: 1, label: 'Pazartesi' },
  { value: 2, label: 'Salı' },
  { value: 3, label: 'Çarşamba' },
  { value: 4, label: 'Perşembe' },
  { value: 5, label: 'Cuma' },
  { value: 6, label: 'Cumartesi' },
  { value: 0, label: 'Pazar' },
];

function ReportForm({ onCancel }: { onCancel: () => void }) {
  const dashboardsQuery = useDashboardsQuery();
  const createMutation = useCreateReportMutation();
  const [dashboardId, setDashboardId] = useState('');
  const [frequency, setFrequency] = useState<ReportFrequency>('daily');
  const [time, setTime] = useState('08:00');
  const [weekday, setWeekday] = useState(1);
  const [recipients, setRecipients] = useState('');

  function handleSubmit() {
    const emails = recipients
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
    createMutation.mutate(
      {
        dashboardId,
        cron: buildCron(frequency, time, weekday),
        recipients: emails,
      },
      { onSuccess: onCancel },
    );
  }

  const canSubmit = Boolean(dashboardId) && recipients.trim().length > 0;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-app-border bg-app-bg p-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="report-dashboard" className="text-sm font-semibold text-app-muted">
          {tr.settings.reports.dashboardLabel}
        </label>
        <select
          id="report-dashboard"
          value={dashboardId}
          onChange={(event) => setDashboardId(event.target.value)}
          className="rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
        >
          <option value="">{tr.settings.reports.dashboardPlaceholder}</option>
          {dashboardsQuery.data?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="report-frequency" className="text-sm font-semibold text-app-muted">
            {tr.settings.reports.frequencyLabel}
          </label>
          <select
            id="report-frequency"
            value={frequency}
            onChange={(event) => setFrequency(event.target.value as ReportFrequency)}
            className="rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
          >
            <option value="daily">{tr.settings.reports.daily}</option>
            <option value="weekly">{tr.settings.reports.weekly}</option>
          </select>
        </div>

        {frequency === 'weekly' && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="report-weekday" className="text-sm font-semibold text-app-muted">
              {tr.settings.reports.weekdayLabel}
            </label>
            <select
              id="report-weekday"
              value={weekday}
              onChange={(event) => setWeekday(Number(event.target.value))}
              className="rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
            >
              {WEEKDAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="report-time" className="text-sm font-semibold text-app-muted">
            {tr.settings.reports.timeLabel}
          </label>
          <input
            id="report-time"
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="report-recipients" className="text-sm font-semibold text-app-muted">
          {tr.settings.reports.recipientsLabel}
        </label>
        <input
          id="report-recipients"
          type="text"
          value={recipients}
          onChange={(event) => setRecipients(event.target.value)}
          placeholder={tr.settings.reports.recipientsPlaceholder}
          className="rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
        />
      </div>

      {createMutation.error && (
        <p className="text-sm text-app-danger">
          {createMutation.error instanceof ApiError
            ? createMutation.error.message
            : tr.settings.reports.createError}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          disabled={!canSubmit || createMutation.isPending}
          onClick={handleSubmit}
        >
          {createMutation.isPending ? tr.settings.reports.creating : tr.settings.reports.create}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {tr.common.cancel}
        </Button>
      </div>
    </div>
  );
}

export function ReportsSection() {
  const reportsQuery = useReportsQuery();
  const dashboardsQuery = useDashboardsQuery();
  const updateMutation = useUpdateReportMutation();
  const deleteMutation = useDeleteReportMutation();
  const [isAdding, setIsAdding] = useState(false);

  const dashboardNameById = new Map(dashboardsQuery.data?.map((d) => [d.id, d.name]) ?? []);

  return (
    <section className="mt-6 rounded-xl border border-app-border bg-app-surface p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-app-text">{tr.settings.reports.title}</h2>
          <p className="text-sm text-app-muted">{tr.settings.reports.subtitle}</p>
        </div>
        {!isAdding && (
          <Button type="button" onClick={() => setIsAdding(true)}>
            {tr.settings.reports.addButton}
          </Button>
        )}
      </div>

      {isAdding && <ReportForm onCancel={() => setIsAdding(false)} />}

      {reportsQuery.isPending && (
        <p className="mt-4 text-sm text-app-muted">{tr.settings.reports.loading}</p>
      )}
      {reportsQuery.data && reportsQuery.data.length === 0 && !isAdding && (
        <p className="mt-4 text-sm text-app-muted">{tr.settings.reports.empty}</p>
      )}

      {reportsQuery.data && reportsQuery.data.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {reportsQuery.data.map((report) => (
            <li
              key={report.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-app-border px-3 py-2.5"
            >
              <div>
                <p className="text-sm font-semibold text-app-text">
                  {dashboardNameById.get(report.dashboardId) ?? report.dashboardId}
                </p>
                <p className="text-sm text-app-muted">
                  {describeCron(report.cron)} · {report.recipients.join(', ')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-sm text-app-muted">
                  <input
                    type="checkbox"
                    checked={report.isActive}
                    onChange={(event) =>
                      updateMutation.mutate({
                        id: report.id,
                        input: { isActive: event.target.checked },
                      })
                    }
                  />
                  {tr.settings.reports.activeLabel}
                </label>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => deleteMutation.mutate(report.id)}
                >
                  {tr.settings.reports.deleteButton}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

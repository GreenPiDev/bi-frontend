import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { useDashboardQuery, useDashboardsQuery } from '../dashboards/use-dashboards';
import { ApiError, type AlertOperator } from '../../lib/api';
import { tr } from '../../i18n/tr';
import { useCreateAlertMutation, useAlertsQuery, useDeleteAlertMutation } from './use-alerts';
import { useWidgetLookup } from './use-widget-lookup';

const OPERATORS: { value: AlertOperator; label: string }[] = [
  { value: 'lt', label: tr.settings.alerts.operators.lt },
  { value: 'lte', label: tr.settings.alerts.operators.lte },
  { value: 'gt', label: tr.settings.alerts.operators.gt },
  { value: 'gte', label: tr.settings.alerts.operators.gte },
];

function AlertForm({ onCancel }: { onCancel: () => void }) {
  const dashboardsQuery = useDashboardsQuery();
  const createMutation = useCreateAlertMutation();
  const [dashboardId, setDashboardId] = useState('');
  const dashboardQuery = useDashboardQuery(dashboardId);
  const [widgetId, setWidgetId] = useState('');
  const [operator, setOperator] = useState<AlertOperator>('lt');
  const [threshold, setThreshold] = useState('');
  const [recipients, setRecipients] = useState('');

  function selectDashboard(nextDashboardId: string) {
    setDashboardId(nextDashboardId);
    setWidgetId('');
  }

  function handleSubmit() {
    const emails = recipients
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
    createMutation.mutate(
      { widgetId, operator, threshold: Number(threshold), recipients: emails },
      { onSuccess: onCancel },
    );
  }

  const canSubmit = Boolean(widgetId) && threshold.trim() !== '' && recipients.trim().length > 0;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-app-border bg-app-bg p-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="alert-dashboard" className="text-sm font-semibold text-app-muted">
          {tr.settings.alerts.dashboardLabel}
        </label>
        <select
          id="alert-dashboard"
          value={dashboardId}
          onChange={(event) => selectDashboard(event.target.value)}
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

      {dashboardId && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="alert-widget" className="text-sm font-semibold text-app-muted">
            {tr.settings.alerts.widgetLabel}
          </label>
          <select
            id="alert-widget"
            value={widgetId}
            onChange={(event) => setWidgetId(event.target.value)}
            className="rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
          >
            <option value="">{tr.settings.alerts.widgetPlaceholder}</option>
            {dashboardQuery.data?.widgets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="alert-operator" className="text-sm font-semibold text-app-muted">
            {tr.settings.alerts.operatorLabel}
          </label>
          <select
            id="alert-operator"
            value={operator}
            onChange={(event) => setOperator(event.target.value as AlertOperator)}
            className="rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
          >
            {OPERATORS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="alert-threshold" className="text-sm font-semibold text-app-muted">
            {tr.settings.alerts.thresholdLabel}
          </label>
          <input
            id="alert-threshold"
            type="number"
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
            className="rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-sm text-app-text outline-none focus:ring-2 focus:ring-app-primary"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="alert-recipients" className="text-sm font-semibold text-app-muted">
          {tr.settings.reports.recipientsLabel}
        </label>
        <input
          id="alert-recipients"
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
            : tr.settings.alerts.createError}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          disabled={!canSubmit || createMutation.isPending}
          onClick={handleSubmit}
        >
          {createMutation.isPending ? tr.settings.reports.creating : tr.settings.alerts.create}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {tr.common.cancel}
        </Button>
      </div>
    </div>
  );
}

export function AlertsSection() {
  const alertsQuery = useAlertsQuery();
  const widgetLookup = useWidgetLookup();
  const deleteMutation = useDeleteAlertMutation();
  const [isAdding, setIsAdding] = useState(false);

  return (
    <section className="mt-6 rounded-xl border border-app-border bg-app-surface p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-app-text">{tr.settings.alerts.title}</h2>
          <p className="text-sm text-app-muted">{tr.settings.alerts.subtitle}</p>
        </div>
        {!isAdding && (
          <Button type="button" onClick={() => setIsAdding(true)}>
            {tr.settings.alerts.addButton}
          </Button>
        )}
      </div>

      {isAdding && <AlertForm onCancel={() => setIsAdding(false)} />}

      {alertsQuery.isPending && (
        <p className="mt-4 text-sm text-app-muted">{tr.settings.alerts.loading}</p>
      )}
      {alertsQuery.data && alertsQuery.data.length === 0 && !isAdding && (
        <p className="mt-4 text-sm text-app-muted">{tr.settings.alerts.empty}</p>
      )}

      {alertsQuery.data && alertsQuery.data.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {alertsQuery.data.map((alert) => {
            const widget = widgetLookup.get(alert.widgetId);
            return (
              <li
                key={alert.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-app-border px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-semibold text-app-text">
                    {widget ? `${widget.dashboardName} · ${widget.widgetTitle}` : alert.widgetId}
                  </p>
                  <p className="text-sm text-app-muted">
                    {tr.settings.alerts.operators[alert.operator]} {alert.threshold} ·{' '}
                    {alert.recipients.join(', ')}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => deleteMutation.mutate(alert.id)}
                >
                  {tr.settings.reports.deleteButton}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

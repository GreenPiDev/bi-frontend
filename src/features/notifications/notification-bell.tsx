import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { resolveNotificationRoute } from './notification-routes';
import { useMarkNotificationReadMutation, useUnreadNotificationsQuery } from './use-notifications';
import type { Notification } from '../../lib/api';
import { tr } from '../../i18n/tr';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/**
 * Header'daki zil ikonu: okunmamis bildirim sayisini kirmizi rozet olarak gosterir,
 * tiklaninca en yeni en ustte olacak sekilde okunmamislarin dropdown'ini acar (Drawer
 * gibi tam ekran bir cekmece degil - mesajlarin sag-alt widget'inin aksine burasi
 * header'a gomulu, kucuk bir dropdown, bu yuzden generic Drawer bilesenini degil
 * kendi anchor'li panelini kullaniyor). Panelin altindaki "Tum Bildirimleri Goster",
 * hem okunmus hem okunmamis TUM bildirimlerin sayfalanmis listesini gosteren
 * /profile?tab=notifications'a yonlendirir.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const unreadQuery = useUnreadNotificationsQuery();
  const markReadMutation = useMarkNotificationReadMutation();
  const unread = unreadQuery.data ?? [];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleShowAll() {
    setOpen(false);
    navigate('/profile?tab=notifications');
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-app-muted hover:bg-app-bg-muted hover:text-app-text"
        aria-label={tr.notifications.bellAriaLabel}
      >
        <Bell size={20} />
        {unread.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-app-danger px-1 text-[10px] font-bold text-white">
            {unread.length > 99 ? '99+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[110] mt-2 w-80 rounded-lg border border-app-border bg-app-surface shadow-xl">
          <div className="border-b border-app-border p-3">
            <h3 className="text-sm font-bold text-app-text">{tr.notifications.panelTitle}</h3>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {unread.length === 0 && (
              <p className="p-4 text-sm text-app-muted">{tr.notifications.empty}</p>
            )}
            {unread.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onMarkRead={() => markReadMutation.mutate(notification.id)}
                isMarking={
                  markReadMutation.isPending && markReadMutation.variables === notification.id
                }
                onNavigate={() => setOpen(false)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleShowAll}
            className="w-full border-t border-app-border p-3 text-center text-sm font-semibold text-app-primary hover:bg-app-bg-muted"
          >
            {tr.notifications.showAll}
          </button>
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  notification,
  onMarkRead,
  isMarking,
  onNavigate,
}: {
  notification: Notification;
  onMarkRead: () => void;
  isMarking: boolean;
  onNavigate: () => void;
}) {
  const navigate = useNavigate();
  const route = resolveNotificationRoute(notification);

  function handleRowClick() {
    if (!route) return;
    onNavigate();
    navigate(route);
  }

  return (
    <div
      onClick={handleRowClick}
      className={`border-b border-app-border p-3 last:border-b-0 ${route ? 'cursor-pointer hover:bg-app-bg-muted' : ''}`}
    >
      <p className="text-sm text-app-text">{notification.title}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="text-xs text-app-muted">
          {dateFormatter.format(new Date(notification.createdAt))}
        </span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onMarkRead();
          }}
          disabled={isMarking}
          className="text-xs font-semibold text-app-primary hover:underline disabled:opacity-50"
        >
          {tr.notifications.markAsRead}
        </button>
      </div>
    </div>
  );
}

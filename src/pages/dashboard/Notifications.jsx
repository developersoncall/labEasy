import { useState } from 'react';
import { FaRegBell, FaCalendarCheck, FaFlask, FaFileMedical, FaCheckDouble } from 'react-icons/fa';
import PageTransition from '../../components/common/PageTransition.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { SkeletonCard } from '../../components/common/Skeleton.jsx';
import useAuth from '../../hooks/useAuth.js';
import useFetch from '../../hooks/useFetch.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { notificationService } from '../../services/notificationService.js';
import { formatDate } from '../../utils/helpers.js';

/** Pick an icon + accent colour based on the notification type. */
const typeStyle = (type = '') => {
  if (type.includes('appointment')) {
    return { Icon: FaCalendarCheck, className: 'bg-primary-50 text-primary-600' };
  }
  if (type.includes('booking')) {
    return { Icon: FaFlask, className: 'bg-secondary-50 text-secondary-600' };
  }
  if (type.includes('report')) {
    return { Icon: FaFileMedical, className: 'bg-teal-50 text-teal-600' };
  }
  return { Icon: FaRegBell, className: 'bg-gray-100 text-gray-500' };
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

/** In-app notification centre with read/unread handling. */
export default function Notifications() {
  useDocumentTitle('Notifications');
  const { user } = useAuth();
  const [markingAll, setMarkingAll] = useState(false);

  const { data: notifications, loading, refetch } = useFetch(
    () => notificationService.getMyNotifications(user.id),
    [user.id],
  );

  const sorted = [...(notifications || [])].sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
  );
  const unreadCount = sorted.filter((n) => !n.is_read).length;

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await notificationService.markAllAsRead(user.id);
      await refetch();
    } finally {
      setMarkingAll(false);
    }
  };

  const handleItemClick = async (n) => {
    if (n.is_read) return;
    await notificationService.markAsRead(n.id);
    await refetch();
  };

  return (
    <PageTransition>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-1 text-sm text-gray-500">
            {unreadCount > 0
              ? `You have ${unreadCount} unread ${unreadCount === 1 ? 'notification' : 'notifications'}.`
              : 'You are all caught up.'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAll}
            className="btn-outline text-xs"
            disabled={markingAll}
          >
            {markingAll ? (
              <>
                <Spinner size="sm" /> Marking…
              </>
            ) : (
              <>
                <FaCheckDouble aria-hidden="true" /> Mark all read
              </>
            )}
          </button>
        )}
      </header>

      {loading ? (
        <div className="space-y-4">
          <SkeletonCard lines={1} />
          <SkeletonCard lines={1} />
          <SkeletonCard lines={1} />
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={FaRegBell}
          title="No notifications yet"
          message="Booking confirmations, report alerts and appointment reminders will show up here."
          actionLabel="Explore LabEasy"
          actionTo="/"
        />
      ) : (
        <ul className="space-y-3">
          {sorted.map((n) => {
            const { Icon, className } = typeStyle(n.type);
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => handleItemClick(n)}
                  aria-label={`${n.is_read ? '' : 'Unread: '}${n.title}. ${n.message}`}
                  className={`card flex w-full items-start gap-4 p-4 text-left transition hover:shadow-card-hover ${
                    n.is_read ? '' : 'border-primary-100 bg-primary-50'
                  }`}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${className}`}>
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold text-gray-900">{n.title}</span>
                      {!n.is_read && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary-500" aria-hidden="true" />
                      )}
                    </span>
                    <span className="mt-0.5 block text-sm text-gray-600">{n.message}</span>
                    <span className="mt-1.5 block text-xs text-gray-400">
                      {formatDate(n.created_at)} · {formatTime(n.created_at)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </PageTransition>
  );
}

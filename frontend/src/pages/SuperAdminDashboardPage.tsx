import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { DataTable } from '../components/DataTable';
import { useSuperAdminAuth } from '../superAdminAuth';
import type { TenantListItem } from '../types';
import { errorMessage, formatDate } from '../utils';

export function SuperAdminDashboardPage() {
  const { logout } = useSuperAdminAuth();
  const [tenants, setTenants] = useState<TenantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTenants(await api.listTenants());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const recordOffline = async (tenant: TenantListItem) => {
    setBusyId(tenant.id);
    try {
      await api.recordOfflinePayment(tenant.id, 1);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="content-inner">
      <header className="page-header">
        <div>
          <h1>Super Admin dashboard</h1>
          <p className="muted">Manage college tenants and subscription lifecycles.</p>
        </div>
        <button type="button" className="btn btn-small btn-logout" onClick={logout}>
          Log out
        </button>
      </header>

      <section className="card table-card">
        <DataTable
          loading={loading}
          error={error}
          rows={tenants}
          rowKey={(row) => row.id}
          emptyMessage="No tenants yet. Colleges appear here after Stripe checkout or manual provisioning."
          columns={[
            { key: 'name', header: 'College', render: (row) => row.name },
            { key: 'slug', header: 'Slug', render: (row) => row.slug },
            {
              key: 'status',
              header: 'Status',
              render: (row) => <span className={`badge badge-${row.subscriptionStatus}`}>{row.subscriptionStatus}</span>,
            },
            {
              key: 'expires',
              header: 'Expires',
              render: (row) => (row.subscriptionExpiresAt ? formatDate(row.subscriptionExpiresAt) : '—'),
            },
            {
              key: 'actions',
              header: 'Offline payment',
              render: (row) => (
                <button
                  type="button"
                  className="btn btn-small"
                  disabled={busyId === row.id}
                  onClick={() => void recordOffline(row)}
                >
                  {busyId === row.id ? 'Saving…' : 'Record 1 year'}
                </button>
              ),
            },
          ]}
        />
      </section>
    </div>
  );
}

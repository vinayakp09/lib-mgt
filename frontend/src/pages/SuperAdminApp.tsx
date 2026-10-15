import { SuperAdminAuthProvider, useSuperAdminAuth } from '../superAdminAuth';
import { SuperAdminDashboardPage } from './SuperAdminDashboardPage';
import { SuperAdminLoginPage } from './SuperAdminLoginPage';

function SuperAdminShell() {
  const { session } = useSuperAdminAuth();
  if (!session) {
    return <SuperAdminLoginPage />;
  }
  return <SuperAdminDashboardPage />;
}

export function SuperAdminApp() {
  return (
    <SuperAdminAuthProvider>
      <SuperAdminShell />
    </SuperAdminAuthProvider>
  );
}

import { getUser } from '../api/auth';
import DashboardLayout from '../components/DashboardLayout';

function SuperAdminDashboard() {
  const user = getUser();

  return <DashboardLayout userRole={user?.role || 'SuperAdmin'} />;
}

export default SuperAdminDashboard;
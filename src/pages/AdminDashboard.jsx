import { getUser } from '../api/auth';
import DashboardLayout from '../components/DashboardLayout';

function AdminDashboard() {
  const user = getUser();

  return <DashboardLayout userRole={user?.role || 'Admin'} />;
}

export default AdminDashboard;
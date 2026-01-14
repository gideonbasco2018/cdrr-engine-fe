import { getUser } from '../api/auth';
import DashboardLayout from '../components/DashboardLayout';

function UserDashboard() {
  const user = getUser();

  return <DashboardLayout userRole={user?.role || 'User'} />;
}

export default UserDashboard;
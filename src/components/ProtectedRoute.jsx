import { Navigate } from 'react-router-dom';
import { isLoggedIn, getUserRole } from '../api/auth';

function ProtectedRoute({ children, allowedRoles }) {
  // Check if user is logged in
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has required role
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = getUserRole();
    
    if (!allowedRoles.includes(userRole)) {
      // Redirect based on their actual role
      switch(userRole) {
        case 'SuperAdmin':
          return <Navigate to="/superadmin/dashboard" replace />;
        case 'Admin':
          return <Navigate to="/admin/dashboard" replace />;
        case 'User':
        default:
          return <Navigate to="/dashboard" replace />;
      }
    }
  }

  return children;
}

export default ProtectedRoute;
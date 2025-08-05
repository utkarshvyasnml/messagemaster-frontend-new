import React, { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import "./Layout.css";
import NotificationBell from "./NotificationBell";
import axios from "axios";

const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [branding, setBranding] = useState({
    companyName: 'MessageMaster',
    companyLogo: ''
  });
  const [brandingLoading, setBrandingLoading] = useState(true);

  useEffect(() => {
    const userFromStorage = JSON.parse(localStorage.getItem("user") || "null");
    setUser(userFromStorage);

    const fetchBranding = async () => {
        setBrandingLoading(true);
        try {
            const config = getAuthHeaders();
            if (config.headers) {
                const { data } = await axios.get('http://localhost:5001/api/whitelabel/my-branding', config);
                setBranding(data);
            }
        } catch (error) {
            console.error("Could not fetch branding, using default.");
            setBranding({ companyName: 'MessageMaster', companyLogo: '' });
        } finally {
            setBrandingLoading(false);
        }
    };
    
    fetchBranding();
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const navLinks = {
    Admin: [
      { path: "/admin", label: "Dashboard", icon: "🏠" },
      { path: user ? `/profile/${user.id}` : "#", label: "My Profile", icon: "👤" },
      { path: "/users", label: "Users", icon: "👥" },
      { path: "/campaigns", label: "Campaigns", icon: "📤" },
      { path: "/credits", label: "Credits", icon: "💳" },
      { path: "/reports", label: "Reports", icon: "📊" },
      { path: "/history", label: "History", icon: "📋" },
      { path: "/analytics", label: "Analytics", icon: "📈" },
      { path: "/tickets", label: "Support Tickets", icon: "🎫" },
      { path: "/admin-announcements", label: "Manage Announcements", icon: "⚙️" },
      { path: "/announcements-history", label: "View Announcements", icon: "📢" },
      { path: "/backup", label: "Backup", icon: "🗄️" },
      { path: "/storage", label: "Storage", icon: "💾" },
    ],
    Reseller: [
      { path: "/reseller-dashboard", label: "Dashboard", icon: "🏠" },
      { path: user ? `/profile/${user.id}` : "#", label: "My Profile", icon: "👤" },
      { path: "/users", label: "My Users", icon: "👥" },
      { path: "/campaigns", label: "Campaigns", icon: "📤" },
      { path: "/history", label: "History", icon: "📋" },
      { path: "/analytics", label: "Analytics", icon: "📈" },
      { path: "/tickets", label: "Support Tickets", icon: "🎫" },
      { path: "/announcements-history", label: "Announcements", icon: "📢" },
      { path: "/whitelabel-settings", label: "Whitelabel", icon: "🎨" },
    ],
    "Sub-Reseller": [
      { path: "/subreseller-dashboard", label: "Dashboard", icon: "🏠" },
      { path: user ? `/profile/${user.id}` : "#", label: "My Profile", icon: "👤" },
      { path: "/users", label: "My Users", icon: "👥" },
      { path: "/campaigns", label: "Campaigns", icon: "📤" },
      { path: "/tickets", label: "Support Tickets", icon: "🎫" },
      { path: "/announcements-history", label: "Announcements", icon: "📢" },
      { path: "/whitelabel-settings", label: "Whitelabel", icon: "🎨" },
    ],
    User: [
      { path: "/user-dashboard", label: "Dashboard", icon: "🏠" },
      { path: user ? `/profile/${user.id}` : "#", label: "My Profile", icon: "👤" },
      { path: "/campaigns", label: "My Campaigns", icon: "📤" },
      { path: "/tickets", label: "Support Tickets", icon: "🎫" },
      { path: "/announcements-history", label: "Announcements", icon: "📢" },
    ],
  };

  const accessibleLinks = user ? navLinks[user.role] || [] : [];

  return (
    <div className="layout-container">
      <aside style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        
        <div>
            {brandingLoading ? (
                <div className="mb-4" style={{ height: '50px', backgroundColor: '#3a3f44', borderRadius: '5px' }}></div>
            ) : branding.companyLogo ? (
                <img 
                    src={`http://localhost:5001${branding.companyLogo}`} 
                    alt={branding.companyName} 
                    className="mb-4" 
                    style={{ maxHeight: '50px', width: 'auto' }} 
                    onError={(e) => { e.target.style.display = 'none'; e.target.onerror = null; }} // Hide broken image
                />
            ) : (
                <h2 className="mb-4">{branding.companyName}</h2>
            )}
            <p style={{ fontSize: "14px", color: "#bbb", marginBottom: "0.5rem" }}>
              Welcome, <strong>{user?.name || "User"}</strong>
            </p>
            
            {user?.createdAt && (
                <p style={{ fontSize: "12px", color: "#888", marginTop: "0", marginBottom: "2rem" }}>
                    Member since: {new Date(user.createdAt).toLocaleDateString()}
                </p>
            )}
        </div>
        
        <nav style={{ flexGrow: 1, overflowY: 'auto' }}>
          <ul>
            {accessibleLinks.map((link) => (
              <li key={link.path}>
                <Link
                  to={link.path.includes(':userId') ? `/profile/${user.id}` : link.path}
                  className={location.pathname === (link.path.includes(':userId') ? `/profile/${user.id}` : link.path) ? "active-link" : ""}
                  aria-label={link.label}
                >
                  {`${link.icon} ${link.label}`}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
            <button
              onClick={handleLogout}
              className="logout-button"
              style={{
                width: "100%",
                backgroundColor: "#d9534f",
                border: "none",
                color: "white",
                padding: "10px",
                borderRadius: "5px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              🚪 Logout
            </button>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <header style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              padding: '0.5rem 2rem',
              background: '#ffffff',
              borderBottom: '1px solid #dee2e6',
              height: '60px'
          }}>
              <NotificationBell />
          </header>

          <main style={{ flex: 1, overflowY: 'auto' }}>
            <Outlet />
          </main>
      </div>
    </div>
  );
};

export default Layout;

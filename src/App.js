import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Import Layout and Auth Components
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";

// Import All Page Components
import AdminDashboard from "./pages/AdminDashboard";
import ResellerDashboard from "./pages/ResellerDashboard";
import SubResellerDashboard from "./pages/SubResellerDashboard";
import UserDashboard from "./pages/UserDashboard";
import UsersPage from "./pages/UsersPage";
import CreditsPage from "./pages/CreditsPage";
import CampaignsPage from "./pages/CampaignsPage";
import ReportsPage from "./pages/ReportsPage";
import TransactionHistory from "./pages/TransactionHistory";
import AdvancedAnalytics from "./pages/AdvancedAnalytics";
import ProfilePage from "./pages/ProfilePage";
import TicketsPage from "./pages/TicketsPage";
import AdminAnnouncementsPage from "./pages/AdminAnnouncementsPage";
import AnnouncementsHistoryPage from "./pages/AnnouncementsHistoryPage";
import WhitelabelPage from "./pages/WhitelabelPage";
import BackupPage from "./pages/BackupPage";
import StoragePage from "./pages/StoragePage"; // ✅ Import the new page

/**
 * A helper component to redirect the user to their correct dashboard
 * after they log in. It reads the user's role from localStorage.
 */
const DashboardRedirect = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  switch (user.role) {
    case "Admin":
      return <Navigate to="/admin" replace />;
    case "Reseller":
      return <Navigate to="/reseller-dashboard" replace />;
    case "Sub-Reseller":
      return <Navigate to="/subreseller-dashboard" replace />;
    case "User":
      return <Navigate to="/user-dashboard" replace />;
    default:
      // If no role is found, redirect to login
      return <Navigate to="/login" replace />;
  }
};

function App() {
  const getCurrentUser = () => JSON.parse(localStorage.getItem("user") || null);

  return (
    <Router>
      <Routes>
        {/* =================================
            PUBLIC ROUTES
        ================================= */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<h2 className="text-center mt-5">Unauthorized Access</h2>} />

        {/* =================================
            PROTECTED ROUTES (for all logged-in users)
        ================================= */}
        <Route
          path="/"
          element={
            <ProtectedRoute allowedRoles={["Admin", "Reseller", "Sub-Reseller", "User"]}>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* The default route after login, redirects to the correct dashboard */}
          <Route index element={<DashboardRedirect />} />

          {/* --- DASHBOARDS --- */}
          <Route path="admin" element={<ProtectedRoute allowedRoles={["Admin"]}><AdminDashboard currentUser={getCurrentUser()} /></ProtectedRoute>} />
          <Route path="reseller-dashboard" element={<ProtectedRoute allowedRoles={["Reseller"]}><ResellerDashboard currentUser={getCurrentUser()} /></ProtectedRoute>} />
          <Route path="subreseller-dashboard" element={<ProtectedRoute allowedRoles={["Sub-Reseller"]}><SubResellerDashboard currentUser={getCurrentUser()} /></ProtectedRoute>} />
          <Route path="user-dashboard" element={<ProtectedRoute allowedRoles={["User"]}><UserDashboard currentUser={getCurrentUser()} /></ProtectedRoute>} />

          {/* --- SHARED PAGES --- */}
          <Route path="users" element={<ProtectedRoute allowedRoles={["Admin", "Reseller", "Sub-Reseller"]}><UsersPage currentUser={getCurrentUser()} /></ProtectedRoute>} />
          <Route path="campaigns" element={<ProtectedRoute allowedRoles={["Admin", "Reseller", "Sub-Reseller", "User"]}><CampaignsPage currentUser={getCurrentUser()} /></ProtectedRoute>} />
          <Route path="profile/:userId" element={<ProfilePage currentUser={getCurrentUser()} />} />
          <Route path="tickets" element={<ProtectedRoute allowedRoles={["Admin", "Reseller", "Sub-Reseller", "User"]}><TicketsPage /></ProtectedRoute>} />
          <Route path="announcements-history" element={<AnnouncementsHistoryPage />} />

          {/* --- RESELLER & SUB-RESELLER PAGES --- */}
          <Route path="whitelabel-settings" element={<ProtectedRoute allowedRoles={["Reseller", "Sub-Reseller"]}><WhitelabelPage /></ProtectedRoute>} />
          
          {/* --- ADMIN & RESELLER PAGES --- */}
          <Route path="history" element={<ProtectedRoute allowedRoles={["Admin", "Reseller"]}><TransactionHistory currentUser={getCurrentUser()} /></ProtectedRoute>} />
          <Route path="analytics" element={<ProtectedRoute allowedRoles={["Admin", "Reseller"]}><AdvancedAnalytics currentUser={getCurrentUser()} /></ProtectedRoute>} />

          {/* --- ADMIN-ONLY PAGES --- */}
          <Route path="credits" element={<ProtectedRoute allowedRoles={["Admin"]}><CreditsPage currentUser={getCurrentUser()} /></ProtectedRoute>} />
          <Route path="reports" element={<ProtectedRoute allowedRoles={["Admin"]}><ReportsPage currentUser={getCurrentUser()} /></ProtectedRoute>} />
          <Route path="admin-announcements" element={<ProtectedRoute allowedRoles={["Admin"]}><AdminAnnouncementsPage /></ProtectedRoute>} />
          <Route path="backup" element={<ProtectedRoute allowedRoles={["Admin"]}><BackupPage /></ProtectedRoute>} />
          <Route path="storage" element={<ProtectedRoute allowedRoles={["Admin"]}><StoragePage /></ProtectedRoute>} /> {/* ✅ NEW */}
        </Route>

        {/* Fallback route for any other path */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;

import { Routes, Route } from "react-router-dom";
import HomePage from "@/pages/HomePage";
import RegisterUserPage from "@/pages/RegisterUserPage";
import LoginUser from "@/pages/LoginUser";
import ApplyForMembershipPage from "./pages/ApplyForMembershipPage";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminRoute from "@/components/AdminRoute";
import MembershipApplicationStatusPage from "@/pages/MembershipApplicationStatusPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<RegisterUserPage />} />
      <Route path="/login" element={<LoginUser />} />
      <Route path="/admin/login" element={<LoginUser adminLogin />} />
      <Route
        path="/admin/dashboard/*"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
      <Route path="/applyformembership" element={<ApplyForMembershipPage />} />
      <Route path="/application-status" element={<MembershipApplicationStatusPage />} />
    </Routes>
  );
}

export default App;

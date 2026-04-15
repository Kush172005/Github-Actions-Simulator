import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import AnalyzePage from "./pages/AnalyzePage.jsx";
import GitHubCallbackPage from "./pages/GitHubCallbackPage.jsx";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback/github" element={<GitHubCallbackPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/analyze" element={<AnalyzePage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

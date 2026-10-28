import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { AnalystLayout } from "./components/AnalystLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Dashboard } from "./pages/Dashboard";
import { ClientClaimForm } from "./pages/ClientClaimForm";
import { AnalystDashboard } from "./pages/AnalystDashboard";
import { AnalystReview } from "./pages/AnalystReview";
import { EmptyState } from "./pages/EmptyState";
import { Guide } from "./pages/Guide";
import { Profile } from "./pages/Profile";
import { Settings } from "./pages/Settings";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { UnassignedClaims } from "./pages/UnassignedClaims";
import { MyAssignments } from "./pages/MyAssignments";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Login,
  },
  {
    path: "/register",
    Component: Register,
  },
  {
    path: "/client",
    element: <ProtectedRoute role="client" />,
    children: [
      { Component: Layout, children: [
        { index: true, Component: Dashboard },
        { path: "guide", Component: Guide },
        { path: "submit", Component: ClientClaimForm },
        { path: "profile", Component: Profile },
      ]},
    ],
  },
  {
    path: "/analyst",
    element: <ProtectedRoute role="analyst" />,
    children: [
      { Component: AnalystLayout, children: [
        { index: true, Component: AnalystDashboard },
        { path: "review/:id", Component: AnalystReview },
        { path: "unassigned", Component: UnassignedClaims },
        { path: "assignments", Component: MyAssignments },
        { path: "settings", Component: Settings },
      ]},
    ],
  },
  { path: "*", element: <EmptyState title="Not Found" /> },
]);
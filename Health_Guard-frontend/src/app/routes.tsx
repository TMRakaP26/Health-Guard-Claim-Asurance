import { createBrowserRouter, Link, Navigate, useParams } from "react-router";
import { AuthPage } from "./portal/AuthPage";
import { Shell, Guide, Notifications } from "./portal/Shell";
import { ClaimList } from "./portal/ClaimList";
import { ClaimDetail } from "./portal/ClaimDetail";
import { ClaimForm, Drafts } from "./portal/ClaimForm";
import { Profile, VerifyEmail } from "./portal/Profile";
import { Admin, Analytics } from "./portal/Admin";
function LegacyReview() {
  const { id } = useParams();
  return <Navigate to={"/claims/" + id} replace />;
}
export const router = createBrowserRouter([
  ...[
    "/",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/accept-invitation",
  ].map((path) => ({ path, Component: AuthPage })),
  {
    Component: Shell,
    children: [
      { path: "/claims", Component: ClaimList },
      { path: "/claims/new", Component: ClaimForm },
      { path: "/claims/:id", Component: ClaimDetail },
      { path: "/claims/:id/edit", Component: ClaimForm },
      { path: "/drafts", Component: Drafts },
      { path: "/notifications", Component: Notifications },
      { path: "/profile", Component: Profile },
      { path: "/guide", Component: Guide },
      { path: "/analytics", Component: Analytics },
      { path: "/admin", Component: Admin },
      { path: "/verify-email", Component: VerifyEmail },
      { path: "/client", element: <Navigate to="/claims" replace /> },
      {
        path: "/client/submit",
        element: <Navigate to="/claims/new" replace />,
      },
      { path: "/client/profile", element: <Navigate to="/profile" replace /> },
      { path: "/client/guide", element: <Navigate to="/guide" replace /> },
      { path: "/analyst", element: <Navigate to="/claims" replace /> },
      { path: "/analyst/review/:id", Component: LegacyReview },
      {
        path: "/analyst/settings",
        element: <Navigate to="/profile" replace />,
      },
      {
        path: "/analyst/unassigned",
        element: <Navigate to="/claims?scope=unassigned" replace />,
      },
      {
        path: "/analyst/assignments",
        element: <Navigate to="/claims?scope=assigned" replace />,
      },
    ],
  },
  {
    path: "*",
    element: (
      <main className="main">
        <h1>404</h1>
        <Link to="/claims">HealthGuard</Link>
      </main>
    ),
  },
]);

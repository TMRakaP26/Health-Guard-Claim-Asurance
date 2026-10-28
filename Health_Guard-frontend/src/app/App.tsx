import { RouterProvider } from "react-router";
import { router } from "./routes";
import { ClaimProvider } from "./state/ClaimContext";
import { AuthProvider } from "./state/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <ClaimProvider>
        <RouterProvider router={router} />
      </ClaimProvider>
    </AuthProvider>
  );
}
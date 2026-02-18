import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";
import { AuthGuard, AdminGuard } from "./components/AuthGuard";

export const routers = [
  {
    path: "/",
    name: "login",
    element: <LoginPage />,
  },
  {
    path: "/dashboard",
    name: "dashboard",
    element: (
      <AuthGuard>
        <DashboardPage />
      </AuthGuard>
    ),
  },
  {
    path: "/admin",
    name: "admin",
    element: (
      <AdminGuard>
        <AdminPage />
      </AdminGuard>
    ),
  },
  /* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */
  {
    path: "*",
    name: "404",
    element: <NotFound />,
  },
];

declare global {
  interface Window {
    __routers__: typeof routers;
  }
}

window.__routers__ = routers;

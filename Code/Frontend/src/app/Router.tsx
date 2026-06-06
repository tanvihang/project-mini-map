import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { Layout } from "./Layout";
import { BookScreen } from "@/screens/BookScreen";
import { SignInScreen } from "@/screens/SignInScreen";
import { SignUpScreen } from "@/screens/SignUpScreen";
import { PassportScreen } from "@/screens/PassportScreen";
import { AuthGuard } from "./AuthGuard";

const router = createBrowserRouter([
  {
    path: ROUTES.SIGN_IN,
    element: <SignInScreen />,
  },
  {
    path: ROUTES.SIGN_UP,
    element: <SignUpScreen />,
  },
  {
    element: (
      <AuthGuard>
        <Layout />
      </AuthGuard>
    ),
    children: [
      {
        path: ROUTES.BOOK,
        element: <BookScreen />,
      },
      {
        path: ROUTES.PASSPORT,
        element: <PassportScreen />,
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to={ROUTES.BOOK} replace />,
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}

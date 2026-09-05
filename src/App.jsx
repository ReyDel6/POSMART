import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import CatalogPage from './pages/CatalogPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import OrderSuccess from './pages/OrderSuccess';
import { CartProvider } from "./context/CartProvider"
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import AdminProductsPage from './pages/admin/AdminProductsPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';

const router = createBrowserRouter([
  { path: '/', element: <CatalogPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/OrderSuccess', element: <OrderSuccess /> },
  {
    path: '/admin',
    element: <AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>,
    children: [
      { path: '', element: <AdminDashboardPage /> },
      { path: 'products', element: <AdminProductsPage /> },
      { path: 'categories', element: <AdminCategoriesPage /> },
      { path: 'orders', element: <AdminOrdersPage /> },
      { path: 'reports', element: <AdminReportsPage /> },
      { path: 'users', element: <AdminUsersPage /> },
      { path: 'settings', element: <AdminSettingsPage /> }
    ]
  },
]);


export default function App() {
  return (
    <CartProvider>
    <RouterProvider router={router} />
    </CartProvider>
  )
}
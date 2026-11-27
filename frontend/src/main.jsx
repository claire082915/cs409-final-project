import './styles/global.css'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { Toaster } from 'sonner'
import {
  Outlet,
  Route,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  useHref,
  useNavigate,
} from 'react-router-dom'
import { RouterProvider as AriaRouterProvider } from 'react-aria-components'
import LandingPage from './pages/LandingPage.jsx'
import SignUpLoginPage from './pages/SignUpLoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import InventoryPage from './pages/InventoryPage.jsx'
import BrowseBorrowPage from './pages/BrowseBorrowPage.jsx'
import BorrowRequestPage from './pages/BorrowRequestPage.jsx'
import LendingApprovalPage from './pages/LendingApprovalPage.jsx'
import LoanDetailsPage from './pages/LoanDetailsPage.jsx'
import ReminderEmailPage from './pages/ReminderEmailPage.jsx'
import ReturnConfirmationPage from './pages/ReturnConfirmationPage.jsx'
import MobileResponsivePage from './pages/MobileResponsivePage.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import RequireAuth from './auth/RequireAuth.jsx'
import LogOutRoute from './auth/LogOutRoute.jsx'
import AccountPage from './pages/AccountPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import SearchPage from './pages/SearchPage.jsx'
import ErrorPage from './pages/ErrorPage.jsx'
import { warmApi } from './lib/api.js'

warmApi()

// Lets React Aria links like the search results move within the app instead of reloading it
function AriaLinks() {
  const navigate = useNavigate()
  return (
    <AriaRouterProvider navigate={navigate} useHref={useHref}>
      <Outlet />
    </AriaRouterProvider>
  )
}

// A data router so pages like Account can block navigation with useBlocker
const router = createBrowserRouter(
  createRoutesFromElements(
    // Pathless so one error page and the React Aria link setup cover every route
    <Route element={<AriaLinks />} errorElement={<ErrorPage />}>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<SignUpLoginPage />} />
      <Route path="/signup" element={<SignUpLoginPage />} />
      <Route path="/logout" element={<LogOutRoute />} />
      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/browse" element={<BrowseBorrowPage />} />
        <Route path="/borrow-request" element={<BorrowRequestPage />} />
        <Route path="/lending-approval" element={<LendingApprovalPage />} />
        <Route path="/loan-details" element={<LoanDetailsPage />} />
        <Route path="/reminder-email" element={<ReminderEmailPage />} />
        <Route path="/return-confirmation" element={<ReturnConfirmationPage />} />
        <Route path="/mobile" element={<MobileResponsivePage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/profile/:username" element={<ProfilePage />} />
        <Route path="/search" element={<SearchPage />} />
      </Route>
      <Route path="*" element={<LandingPage />} />
    </Route>,
  ),
  // GitHub Pages serves the app from the repository's path
  { basename: import.meta.env.BASE_URL },
)

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster
        position="bottom-right"
        expand
        icons={{ success: <CircleCheck size={18} />, error: <CircleAlert size={18} /> }}
      />
    </AuthProvider>
  </React.StrictMode>,
)

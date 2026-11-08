import './styles/global.css'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router-dom'
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
import ReputationPage from './pages/ReputationPage.jsx'
import MobileResponsivePage from './pages/MobileResponsivePage.jsx'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<SignUpLoginPage />} />
        <Route path="/signup" element={<SignUpLoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/browse" element={<BrowseBorrowPage />} />
        <Route path="/borrow-request" element={<BorrowRequestPage />} />
        <Route path="/lending-approval" element={<LendingApprovalPage />} />
        <Route path="/loan-details" element={<LoanDetailsPage />} />
        <Route path="/reminder-email" element={<ReminderEmailPage />} />
        <Route path="/return-confirmation" element={<ReturnConfirmationPage />} />
        <Route path="/reputation" element={<ReputationPage />} />
        <Route path="/mobile" element={<MobileResponsivePage />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </HashRouter>
  )
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

import { Suspense, lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import Layout from '@/components/Layout'
import ConnectionStatus from '@/components/ConnectionStatus'
import PaymentNotificationSound from '@/components/PaymentNotificationSound'
import AIChatWidget from '@/components/AIChatWidget'
import { AuthProvider } from '@/lib/AuthContext'
import PageNotFound from '@/lib/PageNotFound'
import { RecipientsProvider } from '@/lib/RecipientsContext'
import { queryClient } from '@/lib/query-client'

const Home = lazy(() => import('@/pages/Home'))
const Products = lazy(() => import('@/pages/Products'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const CreatePayment = lazy(() => import('@/pages/CreatePayment'))
const Payment = lazy(() => import('@/pages/Payment'))
const Transactions = lazy(() => import('@/pages/Transactions'))
const Analytics = lazy(() => import('@/pages/Analytics'))
const Recipients = lazy(() => import('@/pages/Recipients'))
const QRGenerator = lazy(() => import('@/pages/QRGenerator'))
const PaymentLink = lazy(() => import('@/pages/PaymentLink'))
const Subscriptions = lazy(() => import('@/pages/Subscriptions'))
const Developer = lazy(() => import('@/pages/Developer'))
const PayPage = lazy(() => import('@/pages/PayPage'))
const QrPayPage = lazy(() => import('@/pages/QrPayPage'))
const AIFormGenerator = lazy(() => import('@/components/AIFormGenerator'))

const fallback = (
  <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
    Loading…
  </div>
)

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RecipientsProvider>
            <BrowserRouter>
              <Suspense fallback={fallback}>
                <Routes>
                  <Route path="/pay/:slug" element={<PayPage />} />
                  <Route path="/qr/:ref" element={<QrPayPage />} />
                  <Route element={<Layout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/create-payment" element={<CreatePayment />} />
                    <Route path="/payment" element={<Payment />} />
                    <Route path="/transactions" element={<Transactions />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/recipients" element={<Recipients />} />
                    <Route path="/qr-generator" element={<QRGenerator />} />
                    <Route path="/payment-link" element={<PaymentLink />} />
                    <Route path="/subscriptions" element={<Subscriptions />} />
                    <Route path="/developer" element={<Developer />} />
                    <Route path="/ai-form-generator" element={<AIFormGenerator />} />
                    <Route path="*" element={<PageNotFound />} />
                  </Route>
                </Routes>
              </Suspense>
              <ConnectionStatus />
              <PaymentNotificationSound />
              <AIChatWidget />
            </BrowserRouter>
          </RecipientsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LogOut, User, Menu, X, LayoutDashboard, ArrowUpRight, History, QrCode, Link2, Repeat, Code2, CreditCard, Home, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/useAuth'

const NAV_LINKS = [
  { to: '/', label: 'Home', icon: Home, isImage: true, imageSrc: '/upiflow-logo.png' },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/create-payment', label: 'Collect', icon: CreditCard },
  { to: '/payment', label: 'Pay', icon: ArrowUpRight },
  { to: '/transactions', label: 'History', icon: History },
  { to: '/qr-generator', label: 'QR', icon: QrCode },
  { to: '/payment-link', label: 'Links', icon: Link2 },
  { to: '/subscriptions', label: 'Recurring', icon: Repeat },
  { to: '/ai-form-generator', label: 'AI Forms', icon: Wand2 },
  { to: '/developer', label: 'Dev', icon: Code2 },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur-sm dark:bg-gray-900/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-blue-600">
          <img
            src="/upiflow-logo.png"
            alt="UPIFlow"
            className="h-8 w-auto"
          />
        </Link>

        {/* Desktop Nav */}
        <ul className="hidden lg:flex gap-0.5">
          {NAV_LINKS.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  pathname === item.to
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                )}
              >
                {item.isImage ? (
                  <img
                    src={item.imageSrc}
                    alt={item.label}
                    className="h-4 w-4"
                  />
                ) : (
                  <item.icon className="h-3.5 w-3.5" />
                )}
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* User + Mobile toggle */}
        <div className="flex items-center gap-2">
          {user && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                <User className="h-4 w-4" />
                <span className="hidden md:inline max-w-[120px] truncate">{user.name || user.email}</span>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
          <button
            className="lg:hidden rounded-md p-1.5 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t bg-white dark:bg-gray-900 px-4 py-3">
          <ul className="flex flex-col gap-1">
            {NAV_LINKS.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    pathname === item.to
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  )}
                >
                  {item.isImage ? (
                    <img
                      src={item.imageSrc}
                      alt={item.label}
                      className="h-4 w-4"
                    />
                  ) : (
                    <item.icon className="h-4 w-4" />
                  )}
                  {item.label}
                </Link>
              </li>
            ))}
            {user && (
              <li>
                <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
                  <LogOut className="h-4 w-4" /> Logout ({user.name || user.email})
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </nav>
  )
}

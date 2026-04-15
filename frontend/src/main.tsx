import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google';
import '@/styles/global.scss'

import { AuthProvider } from '@/hooks/useAuth'
import { ThemeProvider } from '@/hooks/useTheme'
import { ToastProvider } from '@/components/ui/Toast/Toast'
import { AppLayout } from '@/components/layout/AppLayout/AppLayout'

import { LoginPage } from '@/pages/LoginPage/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage/DashboardPage'
import { SitesPage } from '@/pages/SitesPage/SitesPage'
import { NewSitePage } from '@/pages/NewSitePage/NewSitePage'
import { SiteDetailPage } from '@/pages/SiteDetailPage/SiteDetailPage'
import { DeployPage } from '@/pages/DeployPage/DeployPage'

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<GoogleOAuthProvider clientId='567959885029-ueq2o37gr1fv4ibdie7bhvu4m7pm4k6a.apps.googleusercontent.com'>
			<ThemeProvider>
				<AuthProvider>
					<ToastProvider>
						<BrowserRouter>
							<Routes>
								{/* Public */}
								<Route path="/login" element={<LoginPage />} />

								{/* Protected — all inside AppLayout */}
								<Route element={<AppLayout />}>
									<Route index element={<Navigate to="/dashboard" replace />} />
									<Route path="/dashboard" element={<DashboardPage />} />
									<Route path="/sites" element={<SitesPage />} />
									<Route path="/sites/new" element={<NewSitePage />} />
									<Route path="/sites/:id" element={<SiteDetailPage />} />
									<Route path="/sites/:siteId/deploy" element={<DeployPage />} />
								</Route>

								{/* Fallback */}
								<Route path="*" element={<Navigate to="/dashboard" replace />} />
							</Routes>
						</BrowserRouter>
					</ToastProvider>
				</AuthProvider>
			</ThemeProvider>
		</GoogleOAuthProvider>
	</StrictMode>,
)

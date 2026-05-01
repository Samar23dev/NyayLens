import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { DashboardPage } from './pages/DashboardPage'
import { DocumentViewerPage } from './pages/DocumentViewerPage'
import { ClauseAnalysisPage } from './pages/ClauseAnalysisPage'
import { RegulationsPage } from './pages/RegulationsPage'
import { ConflictsPage } from './pages/ConflictsPage'
import { HistoryPage } from './pages/HistoryPage'
import { AnalysisProvider } from './lib/AnalysisContext'
import { ThemeProvider } from './lib/ThemeContext'

export default function App() {
  return (
    <ThemeProvider>
      <AnalysisProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/document" element={<DocumentViewerPage />} />
              <Route path="/clauses" element={<ClauseAnalysisPage />} />
              <Route path="/regulations" element={<RegulationsPage />} />
              <Route path="/conflicts" element={<ConflictsPage />} />
              <Route path="/history" element={<HistoryPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AnalysisProvider>
    </ThemeProvider>
  )
}

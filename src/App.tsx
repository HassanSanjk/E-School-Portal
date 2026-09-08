import { Routes, Route } from 'react-router'
import { useAuth } from './hooks/useAuth'
import { ProtectedRoute, PublicOnlyRoute } from './routes/ProtectedRoute'
import { RoleRedirect } from './routes/RoleRedirect'
import { LoginPage } from './pages/LoginPage'
import { SplashScreen } from './pages/SplashScreen'
import { StudentHome } from './pages/StudentHome'
import { TeacherHome } from './pages/TeacherHome'
import { AdminHome } from './pages/AdminHome'
import { AdminPinReset } from './pages/AdminPinReset'
import { AdminExcelImport } from './pages/AdminExcelImport'
import { AdminFeeSchedule } from './pages/AdminFeeSchedule'
import { AdminFeesDueSoon } from './pages/AdminFeesDueSoon'

function App() {
  const { isInitializing } = useAuth()

  // While the very first session check resolves. Real branded splash now
  // that B5's built it — this used to be a plain-text placeholder.
  if (isInitializing) {
    return <SplashScreen />
  }

  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['student']} />}>
        <Route path="/student" element={<StudentHome />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
        <Route path="/teacher" element={<TeacherHome />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin" element={<AdminHome />} />
        <Route path="/admin/pin-reset" element={<AdminPinReset />} />
        <Route path="/admin/excel-import" element={<AdminExcelImport />} />
        <Route path="/admin/fee-schedule" element={<AdminFeeSchedule />} />
        <Route path="/admin/fees-due-soon" element={<AdminFeesDueSoon />} />
      </Route>

      <Route path="/" element={<RoleRedirect />} />
      <Route path="*" element={<RoleRedirect />} />
    </Routes>
  )
}

export default App

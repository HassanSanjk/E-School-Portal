import { Routes, Route } from 'react-router'
import { useAuth } from './hooks/useAuth'
import { ProtectedRoute, PublicOnlyRoute } from './routes/ProtectedRoute'
import { RoleRedirect } from './routes/RoleRedirect'
import { LoginPage } from './pages/LoginPage'
import { StudentHome } from './pages/StudentHome'
import { TeacherHome } from './pages/TeacherHome'
import { AdminHome } from './pages/AdminHome'

function App() {
  const { isInitializing } = useAuth()

  // Global splash placeholder while the very first session check resolves.
  // The real splash screen (branded, Arabic) is B5 — this just avoids a
  // route-guard flicker/decision on incomplete data before that exists.
  if (isInitializing) {
    return (
      <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
        <p>...جارٍ التحميل</p>
      </div>
    )
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
      </Route>

      <Route path="/" element={<RoleRedirect />} />
      <Route path="*" element={<RoleRedirect />} />
    </Routes>
  )
}

export default App

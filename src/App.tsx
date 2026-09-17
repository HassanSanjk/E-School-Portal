import { Routes, Route } from 'react-router'
import { useAuth } from './hooks/useAuth'
import { ProtectedRoute, PublicOnlyRoute } from './routes/ProtectedRoute'
import { RoleRedirect } from './routes/RoleRedirect'
import { LoginPage } from './pages/LoginPage'
import { SplashScreen } from './pages/SplashScreen'
import { StudentHome } from './pages/StudentHome'
import { StudentMarks } from './pages/StudentMarks'
import { StudentTutorialPapers } from './pages/StudentTutorialPapers'
import { StudentFees } from './pages/StudentFees'
import { StudentSubmitPayment } from './pages/StudentSubmitPayment'
import { StudentPaymentHistory } from './pages/StudentPaymentHistory'
import { TeacherHome } from './pages/TeacherHome'
import { TeacherTimetable } from './pages/TeacherTimetable'
import { TeacherSalary } from './pages/TeacherSalary'
import { AdminHome } from './pages/AdminHome'
import { AdminPinReset } from './pages/AdminPinReset'
import { AdminExcelImport } from './pages/AdminExcelImport'
import { AdminFeeSchedule } from './pages/AdminFeeSchedule'
import { AdminFeesDueSoon } from './pages/AdminFeesDueSoon'
import { AdminPaymentReview } from './pages/AdminPaymentReview'
import { AdminStudentManagement } from './pages/AdminStudentManagement'
import { AdminStudentForm } from './pages/AdminStudentForm'
import { AdminTeacherManagement } from './pages/AdminTeacherManagement'
import { AdminTeacherForm } from './pages/AdminTeacherForm'
import { AdminMarksEntry } from './pages/AdminMarksEntry'
import { AdminTimetableEntry } from './pages/AdminTimetableEntry'
import { AdminSalaryEntry } from './pages/AdminSalaryEntry'
import { AdminSubjectsAndPapers } from './pages/AdminSubjectsAndPapers'

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
        <Route path="/student/marks" element={<StudentMarks />} />
        <Route path="/student/papers" element={<StudentTutorialPapers />} />
        <Route path="/student/fees" element={<StudentFees />} />
        <Route path="/student/pay" element={<StudentSubmitPayment />} />
        <Route path="/student/payments" element={<StudentPaymentHistory />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
        <Route path="/teacher" element={<TeacherHome />} />
        <Route path="/teacher/timetable" element={<TeacherTimetable />} />
        <Route path="/teacher/salary" element={<TeacherSalary />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin" element={<AdminHome />} />
        <Route path="/admin/pin-reset" element={<AdminPinReset />} />
        <Route path="/admin/excel-import" element={<AdminExcelImport />} />
        <Route path="/admin/fee-schedule" element={<AdminFeeSchedule />} />
        <Route path="/admin/fees-due-soon" element={<AdminFeesDueSoon />} />
        <Route path="/admin/payment-review" element={<AdminPaymentReview />} />
        <Route path="/admin/students" element={<AdminStudentManagement />} />
        <Route path="/admin/students/new" element={<AdminStudentForm />} />
        <Route path="/admin/students/:id/edit" element={<AdminStudentForm />} />
        <Route path="/admin/teachers" element={<AdminTeacherManagement />} />
        <Route path="/admin/teachers/new" element={<AdminTeacherForm />} />
        <Route path="/admin/teachers/:id/edit" element={<AdminTeacherForm />} />
        <Route path="/admin/marks-entry" element={<AdminMarksEntry />} />
        <Route path="/admin/timetable-entry" element={<AdminTimetableEntry />} />
        <Route path="/admin/salary-entry" element={<AdminSalaryEntry />} />
        <Route path="/admin/subjects" element={<AdminSubjectsAndPapers />} />
      </Route>

      <Route path="/" element={<RoleRedirect />} />
      <Route path="*" element={<RoleRedirect />} />
    </Routes>
  )
}

export default App

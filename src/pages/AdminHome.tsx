import { Link } from 'react-router'
import { PortalPlaceholder } from './PortalPlaceholder'

export function AdminHome() {
  return (
    <>
      <PortalPlaceholder title="لوحة الإدارة" />
      <div style={{ padding: '0 24px', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Link to="/admin/pin-reset" style={{ color: '#441967', textDecoration: 'underline' }}>
          إعادة تعيين رمز سري لمستخدم →
        </Link>
        <Link to="/admin/excel-import" style={{ color: '#441967', textDecoration: 'underline' }}>
          استيراد بيانات الطالبات من إكسل →
        </Link>
        <Link to="/admin/fee-schedule" style={{ color: '#441967', textDecoration: 'underline' }}>
          جدول الرسوم الدراسية →
        </Link>
        <Link to="/admin/fees-due-soon" style={{ color: '#441967', textDecoration: 'underline' }}>
          الرسوم المستحقة قريبًا →
        </Link>
        <Link to="/admin/payment-review" style={{ color: '#441967', textDecoration: 'underline' }}>
          مراجعة طلبات الدفع →
        </Link>
        <Link to="/admin/students" style={{ color: '#441967', textDecoration: 'underline' }}>
          إدارة الطالبات →
        </Link>
        <Link to="/admin/teachers" style={{ color: '#441967', textDecoration: 'underline' }}>
          إدارة المعلمات →
        </Link>
        <Link to="/admin/marks-entry" style={{ color: '#441967', textDecoration: 'underline' }}>
          إدخال الدرجات →
        </Link>
        <Link to="/admin/timetable-entry" style={{ color: '#441967', textDecoration: 'underline' }}>
          إدخال الجدول الدراسي →
        </Link>
      </div>
    </>
  )
}

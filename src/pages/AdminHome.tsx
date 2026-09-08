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
      </div>
    </>
  )
}

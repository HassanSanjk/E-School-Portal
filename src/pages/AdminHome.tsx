import { Link } from 'react-router'
import { PortalPlaceholder } from './PortalPlaceholder'

export function AdminHome() {
  return (
    <>
      <PortalPlaceholder title="لوحة الإدارة" />
      <div style={{ padding: '0 24px', maxWidth: 480 }}>
        <Link to="/admin/pin-reset" style={{ color: '#441967', textDecoration: 'underline' }}>
          إعادة تعيين رمز سري لمستخدم →
        </Link>
      </div>
    </>
  )
}

import { redirect } from 'next/navigation';
/** Legacy URL: password forms are no longer served inside the storefront. */
export default function AdminLoginPage() {
  redirect('/admin/request-access');
}

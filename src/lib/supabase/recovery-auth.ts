import 'server-only';

import { getAdminAuthorization, type AdminAuthorization } from './admin-auth';
import { hasValidRecoveryGrant } from './recovery';

export async function getRecoveryAuthorization(): Promise<AdminAuthorization> {
  const authorization = await getAdminAuthorization();
  if (authorization.status !== 'authorized') return authorization;
  return await hasValidRecoveryGrant(authorization.userId)
    ? authorization
    : { status: 'unauthorized' };
}

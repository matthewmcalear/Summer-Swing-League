import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth';

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('unauthorized');
  }
} 
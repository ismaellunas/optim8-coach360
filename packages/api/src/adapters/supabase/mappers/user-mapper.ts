import type { User } from '@coach360/domain';
import { userSchema } from '@coach360/domain';

type ProfileRow = {
  id: string;
  role: string;
  display_name: string | null;
  is_suspended: boolean;
};

export function mapProfileToUser(profile: ProfileRow, email: string): User {
  return userSchema.parse({
    id: profile.id,
    email,
    role: profile.role,
    displayName: profile.display_name,
    isSuspended: profile.is_suspended,
  });
}

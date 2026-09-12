import { z } from 'zod';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

export const profileSchema = z.object({
  fullName: z.string().trim().min(1, 'Escribe tu nombre.').max(80, 'Usa hasta 80 caracteres.'),
  email: z.string().trim().toLowerCase().pipe(z.email('Escribe un correo electrónico válido.')),
});

export type UserProfile = z.infer<typeof profileSchema>;

export const emptyProfile: UserProfile = { fullName: '', email: '' };
export const GUEST_PROFILE_STORAGE_KEY = 'hackmty2026:guest-profile:v1';

type ProfileStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

type ProfileServices = {
  client: SupabaseClient | null;
  session: Session | null;
  storage: ProfileStorage;
};

export type SaveProfileResult = {
  profile: UserProfile;
  emailConfirmationRequired: boolean;
  savedLocally: boolean;
};

export function profileFromUser(user: User): UserProfile {
  return {
    fullName: typeof user.user_metadata.full_name === 'string' ? user.user_metadata.full_name : '',
    email: user.email ?? '',
  };
}

export async function loadGuestProfile(storage: ProfileStorage): Promise<UserProfile> {
  const stored = await storage.getItem(GUEST_PROFILE_STORAGE_KEY);
  if (!stored) return emptyProfile;
  const parsed = profileSchema.safeParse(JSON.parse(stored));
  return parsed.success ? parsed.data : emptyProfile;
}

export async function saveUserProfile(
  input: UserProfile,
  { client, session, storage }: ProfileServices,
): Promise<SaveProfileResult> {
  const profile = profileSchema.parse(input);
  if (!session) {
    await storage.setItem(GUEST_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    return { profile, emailConfirmationRequired: false, savedLocally: true };
  }
  if (!client) throw new Error('La configuración de la cuenta no está disponible.');
  const emailChanged = profile.email !== session.user.email;
  // Account metadata belongs to Supabase Auth. Do not write to MCP's read-only tables.
  const { data, error } = await client.auth.updateUser({
    data: { full_name: profile.fullName },
    ...(emailChanged ? { email: profile.email } : {}),
  });
  if (error) throw error;
  return {
    profile,
    emailConfirmationRequired: emailChanged && data.user.email !== profile.email,
    savedLocally: false,
  };
}

export async function clearUserSession({ client, session, storage }: ProfileServices): Promise<void> {
  // Remove demo data first, so a storage failure cannot leave it visible after logout.
  await storage.removeItem(GUEST_PROFILE_STORAGE_KEY);
  if (session) {
    if (!client) throw new Error('La configuración de la cuenta no está disponible.');
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) throw error;
  }
}

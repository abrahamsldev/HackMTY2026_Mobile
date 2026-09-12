import { z } from 'zod';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

export const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email('Escribe un correo válido.'));
export const passwordSchema = z.string().min(8, 'Usa al menos 8 caracteres.').max(128, 'Usa hasta 128 caracteres.');
export const signInSchema = z.object({ email: emailSchema, password: z.string().min(1, 'Escribe tu contraseña.').max(128) });
export const signUpSchema = signInSchema.extend({ password: passwordSchema, fullName: z.string().trim().min(1, 'Escribe tu nombre.').max(80) });

export function isRealUser(user: User | null | undefined): user is User {
  return Boolean(user?.id && user.email && !user.is_anonymous);
}
export async function verifySession(client: SupabaseClient, candidate: Session | null): Promise<Session | null> {
  if (!candidate) return null;
  const { data, error } = await client.auth.getUser(candidate.access_token);
  if (error) throw error;
  if (!isRealUser(data.user) || data.user.id !== candidate.user.id) throw new Error('account_required');
  return { ...candidate, user: data.user };
}
export async function signInWithAccount(client: SupabaseClient, input: z.input<typeof signInSchema>) {
  const { data, error } = await client.auth.signInWithPassword(signInSchema.parse(input));
  if (error) throw error;
  const session = await verifySession(client, data.session);
  if (!session) throw new Error('account_required');
  return session;
}
export async function registerAccount(client: SupabaseClient, input: z.input<typeof signUpSchema>) {
  const { email, password, fullName } = signUpSchema.parse(input);
  const { data, error } = await client.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
  if (error) throw error;
  return data.session ? verifySession(client, data.session) : null;
}
export function authErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? 'Revisa tus datos.';
  const code = typeof error === 'object' && error && 'code' in error ? error.code : undefined;
  switch (code) {
    case 'invalid_credentials': return 'El correo o la contraseña no son correctos.';
    case 'email_not_confirmed': return 'No se pudo iniciar sesión. Revisa la configuración de acceso en Supabase.';
    case 'user_already_exists': case 'email_exists': return 'No se pudo crear la cuenta. Intenta iniciar sesión o recuperar tu contraseña.';
    case 'weak_password': return 'Elige una contraseña más segura.';
    case 'same_password': return 'Elige una contraseña diferente de la anterior.';
    case 'over_email_send_rate_limit': case 'over_request_rate_limit': return 'Espera unos minutos antes de intentarlo de nuevo.';
    case 'otp_expired': case 'flow_state_expired': case 'flow_state_not_found': return 'El enlace expiró o se abrió en otro dispositivo. Solicita uno nuevo desde esta app.';
    case 'signup_disabled': return 'El registro no está disponible. Inicia sesión con una cuenta existente.';
    default: return 'No se pudo completar la operación. Comprueba tu conexión e inténtalo de nuevo.';
  }
}

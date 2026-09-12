import { z } from 'zod';

export const DEMO_USERS = [
  {
    email: 'ana.demo@fluidbank.test',
    userId: '68dc4d66-07b8-5893-95f1-07f06989a552',
  },
  {
    email: 'luis.demo@fluidbank.test',
    userId: 'c1a3797d-b335-5a9d-98a1-402311f82c7a',
  },
  {
    email: 'sofia.demo@fluidbank.test',
    userId: '4a1cca3a-485e-5706-8c92-43a3bf78bc3b',
  },
] as const;

export const demoUserIdSchema = z.enum(DEMO_USERS.map((user) => user.userId) as [
  (typeof DEMO_USERS)[number]['userId'],
  ...(typeof DEMO_USERS)[number]['userId'][],
]);

export type DemoUserId = z.infer<typeof demoUserIdSchema>;

export function demoUserIdForEmail(email: string): DemoUserId | null {
  const normalized = email.trim().toLowerCase();
  return DEMO_USERS.find((user) => user.email === normalized)?.userId ?? null;
}

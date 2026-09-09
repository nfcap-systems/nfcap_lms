import { redirect } from 'next/navigation';

// middleware.ts handles the normal cases (unauthenticated -> /login, authenticated -> role
// home). This only fires for the edge case of a signed-in user with no role stamped yet.
export default function RootPage() {
  redirect('/login');
}

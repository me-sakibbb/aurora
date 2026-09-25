// Web: auth emails and Google send the browser back to this origin.
// Every URL used here must be listed in Supabase → Auth → URL Configuration → Redirect URLs.
export function authRedirectUrl(path: string): string {
  return new URL(path, window.location.origin).toString();
}

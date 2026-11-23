// Sign-up settings (environment variables).
//  • SIGNUP_ENABLED=false            → public sign-up closed (only the admin creates accounts)
//  • SIGNUP_REQUIRES_APPROVAL=false  → new sign-ups are active immediately
//    Default: new sign-ups are "pending" until the admin approves them.
export function signupEnabled() {
  return process.env.SIGNUP_ENABLED !== 'false';
}
export function signupNeedsApproval() {
  return process.env.SIGNUP_REQUIRES_APPROVAL !== 'false';
}

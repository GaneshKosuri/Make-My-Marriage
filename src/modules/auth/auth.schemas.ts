/**
 * Auth request schemas (Zod, `.strict()`). Isomorphic: the login/signup forms
 * reuse them with React Hook Form.
 *
 * TODO(Phase 1: Foundation) — define with `.strict()`:
 *   - signupSchema          API_DESIGN §11  { name, email, password }
 *   - loginSchema           API_DESIGN §12  { email, password }
 *   - forgotPasswordSchema  API_DESIGN §15  { email }
 *   - resetPasswordSchema   API_DESIGN §16  { token, password }
 * Limits live in ./auth.constants.ts.
 */
export {};

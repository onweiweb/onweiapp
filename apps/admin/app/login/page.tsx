// Static shell only — not wired to @onwei/auth yet. Real session/password
// verification is Phase 1 feature work, out of scope for this scaffold.
export default function LoginPage() {
  return (
    <main>
      <h1>Sign in</h1>
      <form>
        <label htmlFor="email">Work email</label>
        <input id="email" name="email" type="email" autoComplete="username" />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
        />

        <button type="submit">Sign in</button>
      </form>
      <p>
        Use the email and password your manager set up for you. Trouble signing
        in? Contact your admin.
      </p>
    </main>
  );
}

// Runs before any test module is imported.
// Sets env vars that are validated at module load time.
process.env.JWT_SECRET = 'test-jwt-secret-long-enough-for-hs256-signing!!';
process.env.CREDENTIALS_SECRET = 'test-credential-secret-long-enough-for-hkdf-32b!!';

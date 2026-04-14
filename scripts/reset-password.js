/**
 * Reset a user's master password directly in the database.
 * Usage: node scripts/reset-password.js <username> <newPassword>
 *
 * Example: node scripts/reset-password.js husniddinprogrammer NewPass123
 */

const bcrypt = require('bcryptjs');
const { Client } = require('pg');

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:husniddin@localhost:5432/password_manager';

async function main() {
  const [, , username, newPassword] = process.argv;

  if (!username || !newPassword) {
    console.error('Usage: node scripts/reset-password.js <username> <newPassword>');
    console.error('Example: node scripts/reset-password.js javlon MyNewPass1');
    process.exit(1);
  }

  if (newPassword.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const checkRes = await client.query('SELECT id, username FROM "User" WHERE username = $1', [username]);
  if (checkRes.rows.length === 0) {
    console.error(`User "${username}" not found.`);
    await client.end();
    process.exit(1);
  }

  const user = checkRes.rows[0];
  console.log(`Found user: ${user.username} (id: ${user.id})`);

  console.log('Hashing new password...');
  const masterHash = await bcrypt.hash(newPassword, 12);

  await client.query('UPDATE "User" SET "masterHash" = $1 WHERE id = $2', [masterHash, user.id]);
  await client.end();

  console.log(`Password reset successfully for "${username}".`);
  console.log(`You can now log in with: ${newPassword}`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

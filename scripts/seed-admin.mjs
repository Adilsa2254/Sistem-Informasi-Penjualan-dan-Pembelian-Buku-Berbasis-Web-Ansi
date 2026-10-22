import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const { DATABASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;

if (!DATABASE_URL || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error('Set DATABASE_URL, ADMIN_USERNAME, dan ADMIN_PASSWORD di .env.local');
  process.exit(1);
}
if (ADMIN_PASSWORD.length < 8) {
  console.error('ADMIN_PASSWORD minimal 8 karakter');
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

await sql`
  INSERT INTO admin (nama, username, password_hash, role)
  VALUES ('Administrator', ${ADMIN_USERNAME}, ${hash}, 'admin')
  ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash
`;

console.log(`Admin "${ADMIN_USERNAME}" siap dipakai.`);

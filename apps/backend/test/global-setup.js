const { execSync } = require('node:child_process');
const path = require('node:path');

module.exports = async () => {
  require('./env');
  if (!/_test(\?|$)/.test(process.env.DATABASE_URL)) throw new Error('Refusing to reset a database whose name does not end in _test');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  await prisma.$executeRawUnsafe('DROP SCHEMA IF EXISTS public CASCADE');
  await prisma.$executeRawUnsafe('CREATE SCHEMA public');
  await prisma.$disconnect();
  execSync('npx prisma migrate deploy --schema prisma/schema.prisma', { cwd: path.resolve(__dirname, '../../..'), stdio: 'pipe', env: process.env });
};

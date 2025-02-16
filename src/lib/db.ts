import { PrismaClient } from '@prisma/client';

const db = new PrismaClient({
  log: ['info', 'error', 'query', 'warn'],
  errorFormat: 'pretty',
});

export default db;

import { PrismaClient } from '@prisma/client';

// export const prisma = new PrismaClient();
import "dotenv/config";
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = `${process.env.DATABASE_URL}`

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

export { prisma }

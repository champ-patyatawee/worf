import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const corsOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://web:5173',
  'http://traefik',
  clientUrl,
].filter((v, i, a) => v && a.indexOf(v) === i);

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/workspace',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  client: {
    url: clientUrl,
  },
  
  cors: {
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  
  kubernetes: {
    namespace: process.env.KUBERNETES_NAMESPACE || 'workspace',
  },
} as const;

export type Config = typeof config;

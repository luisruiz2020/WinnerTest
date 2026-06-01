import { Pool } from "pg";
import dotenv from "dotenv";

// Carga variables de entorno desde un archivo .env si estás en local
dotenv.config();

const isProduction = process.env.NODE_ENV === "prod";

const pool = new Pool({
  // Si está en producción, usa la URL larga de Render. Si no, usa tu configuración local.
  connectionString: isProduction ? process.env.DATABASE_URL : undefined,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  
  // Tu configuración local por si acaso:
  user: process.env.DB_USER || "admin",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "postgres",
  password: process.env.DB_PASSWORD || "password",
  port: process.env.DB_PORT || 5432,
});

export default pool;
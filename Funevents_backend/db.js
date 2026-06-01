import dotenv from "dotenv";
dotenv.config();

import { Pool } from "pg";

const isProduction = process.env.NODE_ENV === "production";

let poolConfig;

if (isProduction) {
  // Leemos TODAS las credenciales desde variables de entorno.
  // Ya no hay contraseñas ni hosts expuestos en el código.
  poolConfig = {
    user: process.env.DB_USER || "admin",
    password: process.env.DB_PASSWORD, 
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || "5432", 10),
    ssl: { rejectUnauthorized: false }, // Obligatorio para la nube de Render
  };
} else {
  // Configuración por defecto para tu entorno de desarrollo local tradicional
  poolConfig = {
    user: process.env.DB_USER || "admin",
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "postgres",
    password: process.env.DB_PASSWORD || "password",
    port: parseInt(process.env.DB_PORT || "5432", 10),
  };
}

const pool = new Pool(poolConfig);

export default pool;
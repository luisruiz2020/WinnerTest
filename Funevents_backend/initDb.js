import pool from "./db.js";

const createTablesQuery = `
  CREATE TABLE IF NOT EXISTS eventos (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      capacidad_total INT NOT NULL,
      entradas_vendidas INT DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reservas (
      id SERIAL PRIMARY KEY,
      evento_id INT REFERENCES eventos(id) ON DELETE CASCADE,
      usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
      fecha_reserva TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

const insertTestDataQuery = `
  INSERT INTO eventos (nombre, capacidad_total) 
  SELECT 'Concierto de Rock', 100 
  WHERE NOT EXISTS (SELECT 1 FROM eventos WHERE nombre = 'Concierto de Rock');

  INSERT INTO usuarios (nombre, email) 
  SELECT 'Juan Perez', 'juan@mail.com'
  WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'juan@mail.com');
`;

async function initializeDatabase() {
  try {
    console.log("Conectando a PostgreSQL y creando tablas...");
    await pool.query(createTablesQuery);
    console.log("Tablas verificadas/creadas con éxito.");
    
    await pool.query(insertTestDataQuery);
    console.log("Datos de prueba insertados con éxito.");
  } catch (error) {
    console.error("Error inicializando la base de datos:", error);
  }
}

initializeDatabase();
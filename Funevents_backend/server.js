import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import pool from "./db.js";

const app = express();

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "clave_secreta_desarrollo_local";

// ==========================================
// MIDDLEWARE DE AUTENTICACIÓN (JWT)
// ==========================================
const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // El token suele venir como: "Bearer TOKEN_AQUÍ"
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token.' });
    }

    try {
        const verificado = jwt.verify(token, JWT_SECRET);
        req.usuarioToken = verificado; // Guardamos los datos del payload decodificados
        next(); // Continuar al endpoint
    } catch (error) {
        res.status(403).json({ error: 'Token inválido o expirado.' });
    }
};

// ==========================================
// 4. ENDPOINT PARA GENERAR JWT (LOGIN SIMULADO)
// ==========================================
app.post('/api/auth/login', async (req, res) => {
    const { email } = req.body;
    try {
        // Buscamos si el usuario existe en la BD
        const userRes = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no registrado en el sistema.' });
        }

        const usuario = userRes.rows[0];

        // Generamos el token empaquetando el ID y Email (Expira en 2 horas)
        const token = jwt.sign(
            { id: usuario.id, email: usuario.email }, 
            JWT_SECRET, 
            { expiresIn: '2h' }
        );

        res.json({ 
            mensaje: 'Autenticación exitosa', 
            token: token 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el proceso de autenticación.' });
    }
});

// ==========================================
// 2. ENDPOINT PARA CREAR UN EVENTO (Protegido)
// ==========================================
app.post('/api/eventos', verificarToken, async (req, res) => {
    const { nombre, capacidad_total } = req.body;
    if (!nombre || !capacidad_total) {
        return res.status(400).json({ error: 'Nombre y capacidad_total son requeridos.' });
    }
    try {
        const nuevoEvento = await pool.query(
            'INSERT INTO eventos (nombre, capacidad_total) VALUES ($1, $2) RETURNING *',
            [nombre, capacidad_total]
        );
        res.status(201).json({ mensaje: 'Evento creado', evento: nuevoEvento.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear el evento.' });
    }
});

// ==========================================
// 3. ENDPOINT PARA CREAR UN USUARIO (Protegido: Solo Admin)
// ==========================================
app.post('/api/usuarios', verificarToken, async (req, res) => {
    // req.usuarioToken contiene los datos del usuario que inició sesión
    const usuarioQueSolicita = req.usuarioToken; 

    // RESTRICCIÓN: Validamos si el correo es estrictamente el del administrador
    if (usuarioQueSolicita.email !== 'admin@email.com') {
        return res.status(403).json({ 
            error: 'Permiso denegado. Solo el usuario administrador puede registrar nuevos usuarios.' 
        });
    }

    const { nombre, email } = req.body;
    if (!nombre || !email) {
        return res.status(400).json({ error: 'Nombre y email son requeridos.' });
    }
    try {
        const nuevoUsuario = await pool.query(
            'INSERT INTO usuarios (nombre, email) VALUES ($1, $2) RETURNING *',
            [nombre, email]
        );
        res.status(201).json({ mensaje: 'Usuario registrado con éxito', usuario: nuevoUsuario.rows[0] });
    } catch (error) {
        console.error(error);
        if (error.code === '23505') {
            return res.status(400).json({ error: 'El email ya se encuentra registrado.' });
        }
        res.status(500).json({ error: 'Error al registrar el usuario.' });
    }
});

// ==========================================
// 1. ENDPOINT PARA CONSULTAR RESERVAS POR EVENTO (Protegido)
// ==========================================
app.get('/api/eventos/:id/reservas', verificarToken, async (req, res) => {
    const eventoId = req.params.id;
    try {
        // Traemos las reservas haciendo un JOIN con usuarios para saber quién compró
        const reservas = await pool.query(`
            SELECT r.id AS reserva_id, r.fecha_reserva, u.nombre AS usuario_nombre, u.email
            FROM reservas r
            JOIN usuarios u ON r.usuario_id = u.id
            WHERE r.evento_id = $1
            ORDER BY r.fecha_reserva DESC
        `, [eventoId]);

        res.json({
            eventoId: parseInt(eventoId),
            total_reservas: reservas.rowCount,
            asistentes: reservas.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las reservas del evento.' });
    }
});

// ==========================================
// ENDPOINT DE RESERVA EXISTENTE (Protegido con Concurrencia)
// ==========================================
app.post('/api/reservas', verificarToken, async (req, res) => {
    const { eventoId, usuarioId } = req.body;
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const queryEvento = `
            SELECT capacidad_total, entradas_vendidas 
            FROM eventos 
            WHERE id = $1 
            FOR UPDATE
        `;
        const resEvento = await client.query(queryEvento, [eventoId]);
        
        if (resEvento.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'El evento no existe.' });
        }
        
        const { capacidad_total, entradas_vendidas } = resEvento.rows[0];
        
        if (entradas_vendidas >= capacidad_total) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Lo sentimos, las entradas para este evento se han agotado.' });
        }
        
        await client.query(
            'INSERT INTO reservas (evento_id, usuario_id) VALUES ($1, $2)',
            [eventoId, usuarioId]
        );
        
        await client.query(
            'UPDATE eventos SET entradas_vendidas = entradas_vendidas + 1 WHERE id = $1',
            [eventoId]
        );
        
        await client.query('COMMIT');
        res.status(201).json({ mensaje: 'Reserva confirmada con éxito garantizado.' });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: 'Error interno al procesar la reserva.' });
    } finally {
        client.release();
    }
});

// Endpoint auxiliar público para listar eventos
app.get('/api/eventos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM eventos');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener eventos.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo de forma segura en el puerto ${PORT}`);
});
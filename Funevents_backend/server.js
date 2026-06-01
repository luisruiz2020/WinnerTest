import express from "express";
import cors from "cors";
import db from "./db.js"; // Importa el pool que configuramos arriba

const app = express();

// Permitir que tu frontend de AngularJS (u otros orígenes) se conecte a la API
app.use(cors());
app.use(express.json());

// Tu endpoint conceptual POST /api/reservas...
app.post('/api/reservas', async (req, res) => {
    const { eventoId, usuarioId } = req.body;
    try {
        // Tu lógica de verificación de aforo...
        const evento = await db.query('SELECT * FROM eventos WHERE id = $1', [eventoId]);
        
        if (evento.rows.length === 0) {
            return res.status(404).json({ error: 'Evento no encontrado.' });
        }

        if (evento.rows[0].entradas_vendidas >= evento.rows[0].capacidad_total) {
            return res.status(400).json({ error: 'Lo sentimos, entradas agotadas.' });
        }
        
        // Registrar reserva y actualizar
        await db.query('INSERT INTO reservas (evento_id, usuario_id) VALUES ($1, $2)', [eventoId, usuarioId]);
        await db.query('UPDATE eventos SET entradas_vendidas = entradas_vendidas + 1 WHERE id = $1', [eventoId]);
        
        res.status(201).json({ mensaje: 'Reserva realizada con éxito.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// ESCUCHAR EN EL PUERTO DINÁMICO DE RENDER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
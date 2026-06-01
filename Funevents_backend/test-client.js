// test-client.js
// Ejecutar usando: node test-client.js

const API_URL = "https://winnertest.onrender.com/api"; // O cambia a http://localhost:3000 si pruebas en local

async function ejecutarPruebasCompletas() {
    console.log("=== INICIANDO PRUEBA COMPLETA DE FLUJO REST + JWT (MODO ADMIN) ===");
    let tokenAdmin = "";
    let nuevoUsuarioId;
    let nuevoEventoId;

    try {
        // 1. INICIAR SESIÓN COMO ADMINISTRADOR (ADQUIRIR API KEY PRINCIPAL)
        console.log("\n[Paso 1] Autenticando usuario Administrador por defecto...");
        const resAuth = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: "admin@email.com" }) // El correo admin sembrado por initDb.js
        });
        const authJson = await resAuth.json();
        tokenAdmin = authJson.token;
        
        if (!tokenAdmin) {
            throw new Error("No se pudo obtener el Token del Administrador. ¿Ejecutaste initDb.js primero?");
        }
        console.log("JWT de Administrador generado exitosamente:", `${tokenAdmin.substring(0, 25)}...`);

        // Cabecera común de autorización con el token del Admin
        const headersConToken = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenAdmin}`
        };

        // 2. CREAR UN NUEVO USUARIO DESDE LA CUENTA ADMIN
        console.log("\n[Paso 2] Registrando un nuevo usuario (Autorizado por el Admin)...");
        const emailRandom = `test_${Math.floor(Math.random() * 10000)}@funevents.com`;
        const resUser = await fetch(`${API_URL}/usuarios`, {
            method: 'POST',
            headers: headersConToken, // Usamos las cabeceras seguras del Admin
            body: JSON.stringify({ nombre: "Carlos Ruiz", email: emailRandom })
        });
        const userJson = await resUser.json();
        console.log("Respuesta del Servidor:", userJson);
        nuevoUsuarioId = userJson.usuario?.id;

        // 3. CREAR NUEVO EVENTO (PROTEGIDO)
        console.log("\n[Paso 3] Creando un nuevo evento con aforo...");
        const resEvento = await fetch(`${API_URL}/eventos`, {
            method: 'POST',
            headers: headersConToken,
            body: JSON.stringify({ nombre: "Festival Estéreo Picnic 2026", capacidad_total: 3 })
        });
        const eventoJson = await resEvento.json();
        console.log("Respuesta del Servidor:", eventoJson);
        nuevoEventoId = eventoJson.evento?.id;

        // 4. REALIZAR RESERVA CONCURRENTE (PROTEGIDO)
        if (nuevoEventoId && nuevoUsuarioId) {
            console.log("\n[Paso 4] Generando reserva protegida contra overbooking...");
            const resReserva = await fetch(`${API_URL}/reservas`, {
                method: 'POST',
                headers: headersConToken,
                body: JSON.stringify({ eventoId: nuevoEventoId, usuarioId: nuevoUsuarioId })
            });
            console.log("Respuesta del Servidor:", await resReserva.json());

            // 5. CONSULTAR RESERVAS POR EVENTO (PROTEGIDO)
            console.log(`\n[Paso 5] Consultando la lista de reservas registradas para el evento ID: [${nuevoEventoId}]...`);
            const resConsulta = await fetch(`${API_URL}/eventos/${nuevoEventoId}/reservas`, {
                method: 'GET',
                headers: headersConToken
            });
            const consultaJson = await resConsulta.json();
            console.log("Resultado de la consulta por Evento:");
            console.dir(consultaJson, { depth: null });
        } else {
            console.log("\n⚠️ No se pudo continuar con la reserva porque falló la creación del usuario o del evento.");
        }

    } catch (error) {
        console.error("❌ Error durante la ejecución de las pruebas:", error.message);
    }
}

ejecutarPruebasCompletas();
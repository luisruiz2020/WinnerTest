// test-client.js

const API_URL = "https://winnertest.onrender.com/api"; 

async function ejecutarPruebasCompletas() {
    console.log("=== INICIANDO PRUEBA COMPLETA DE FLUJO REST + JWT ===");
    let token = "";
    let nuevoUsuarioId;
    let nuevoEventoId;

    try {
        // 1. CREAR USUARIO DE PRUEBA
        console.log("\n[Paso 1] Registrando un nuevo usuario...");
        const emailRandom = `test_${Math.floor(Math.random() * 10000)}@funevents.com`;
        const resUser = await fetch(`${API_URL}/usuarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: "Carlos Ruiz", email: emailRandom })
        });
        const userJson = await resUser.json();
        console.log("Respuesta:", userJson);
        nuevoUsuarioId = userJson.usuario?.id || 1;

        // 2. GENERAR Y ADQUIRIR API KEY (JWT)
        console.log("\n[Paso 2] Solicitando JWT mediante Login...");
        const resAuth = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailRandom })
        });
        const authJson = await resAuth.json();
        token = authJson.token;
        console.log("JWT Generado Exitosamente:", token ? `${token.substring(0, 25)}...` : "FALLÓ");

        // Cabecera de autorización para los siguientes endpoints protegidos
        const headersConToken = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        // 3. CREAR NUEVO EVENTO (PROTEGIDO)
        console.log("\n[Paso 3] Creando un nuevo evento con aforo...");
        const resEvento = await fetch(`${API_URL}/eventos`, {
            method: 'POST',
            headers: headersConToken,
            body: JSON.stringify({ nombre: "Festival Estéreo Picnic 2026", capacidad_total: 3 })
        });
        const eventoJson = await resEvento.json();
        console.log("Respuesta:", eventoJson);
        nuevoEventoId = eventoJson.evento?.id;

        // 4. REALIZAR RESERVA CONCURRENTE (PROTEGIDO)
        if (nuevoEventoId) {
            console.log("\n[Paso 4] Generando reserva protegida contra overbooking...");
            const resReserva = await fetch(`${API_URL}/reservas`, {
                method: 'POST',
                headers: headersConToken,
                body: JSON.stringify({ eventoId: nuevoEventoId, usuarioId: nuevoUsuarioId })
            });
            console.log("Respuesta:", await resReserva.json());

            // 5. CONSULTAR RESERVAS POR EVENTO (PROTEGIDO)
            console.log(`\n[Paso 5] Consultando la lista de reservas registradas para el evento ID: [${nuevoEventoId}]...`);
            const resConsulta = await fetch(`${API_URL}/eventos/${nuevoEventoId}/reservas`, {
                method: 'GET',
                headers: headersConToken
            });
            const consultaJson = await resConsulta.json();
            console.log("Resultado de la consulta por Evento:");
            console.dir(consultaJson, { depth: null });
        }

    } catch (error) {
        console.error("❌ Error durante la ejecución de las pruebas:", error.message);
    }
}

ejecutarPruebasCompletas();
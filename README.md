# FunEvents API — Sistema de Reserva de Entradas Concurrentes
> **Prueba Técnica:** Prototipo funcional de una API Web robusta diseñada para gestionar la venta de entradas a eventos masivos, evitando el *overbooking* (sobreventa de aforo).

La infraestructura de la base de datos se encuentra alojada en **Render.com**.

---

## 🚀 Arquitectura y Estrategia Técnica

* **Control de Concurrencia (Anti-Overbooking):** Para mitigar el riesgo de que múltiples usuarios adquieran la última entrada disponible en entornos de alta demanda, la API implementa **Transacciones SQL con Bloqueo Exclusivo (`FOR UPDATE`)** directamente en el motor de persistencia PostgreSQL. Al procesar una reserva, la fila del evento se bloquea temporalmente para la lectura de stock de otras peticiones concurrentes hasta que la transacción actual finalice con un `COMMIT` o `ROLLBACK`.
* **Estrategia Multicanal e Integración:** Diseñada bajo una arquitectura **RESTful**, la API desacopla completamente la lógica de negocio de la capa de presentación. Esto permite que múltiples canales independientes (páginas web, aplicaciones móviles, tótems de autoservicio o taquillas físicas) consuman los mismos endpoints de manera unificada. La seguridad entre canales se homogeniza mediante el uso de cabeceras HTTP estándar `Authorization: Bearer <JWT>`.

---

## 🛠️ Requisitos e Instalación Local

### 1. Clonar el repositorio e instalar dependencias
Acede a la carpeta del backend e instala los paquetes necesarios:
```bash
cd funevents_backend
npm install


2. Configurar Variables de Entorno
Crea un archivo .env en la raíz de la carpeta del backend con la siguiente estructura (las credenciales reales de Render se administran de forma aislada):



Fragmento de código
NODE_ENV=production
DB_USER=admin
DB_PASSWORD=tu_password_de_render
DB_HOST=tu_host_de_render.postgres.render.com
DB_NAME=prueba_tecnica_zi6d
DB_PORT=5432
JWT_SECRET=clave_secreta_para_firmas


3. Inicializar la Base de Datos
Ejecuta el script de siembra para construir las tablas e insertar el usuario administrador por defecto (admin@email.com):



Bash
node initDb.js


📑 Documentación de Endpoints (API Reference)
🔑 Autenticación
1. Generar API Key (JWT)
Permite a un usuario registrado obtener un token de acceso firmado digitalmente para consumir los endpoints protegidos.
URL: /api/auth/login
Método: POST
Acceso: Público
Cuerpo de la Petición (JSON):
JSON
{
  "email": "admin@email.com"
}


Respuesta Exitosa (200 OK):
JSON
{
  "mensaje": "Autenticación exitosa",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}


👥 Usuarios
2. Crear un Usuario
Registra una nueva cuenta en el sistema.
⚠️ Restricción: Solo el usuario administrador por defecto (admin@email.com) posee privilegios elevados para ejecutar esta acción.
URL: /api/usuarios
Método: POST
Cabecera: Authorization: Bearer <TOKEN_JWT_ADMIN>
Cuerpo de la Petición (JSON):
JSON
{
  "nombre": "Carlos Ruiz",
  "email": "carlos@email.com"
}


Respuestas:
201 Created: Usuario registrado con éxito.
403 Forbidden: Permiso denegado si el token no pertenece al admin.
📅 Eventos
3. Crear un Evento
Registra un nuevo evento masivo definiendo su aforo límite.
URL: /api/eventos
Método: POST
Cabecera: Authorization: Bearer <TOKEN_JWT>
Cuerpo de la Petición (JSON):
JSON
{
  "nombre": "Festival Estéreo Picnic 2026",
  "capacidad_total": 50000
}


4. Listar Eventos
Retorna todos los eventos cargados en el sistema junto con su estado actual de aforo.
URL: /api/eventos
Método: GET
Acceso: Público (No requiere token).
🎟️ Reservas
5. Realizar Reserva Concurrente
Crea una reserva segura vinculando un usuario con un evento. Valida el aforo en tiempo real aplicando bloqueos exclusivos de persistencia para evitar sobreventa.
URL: /api/reservas
Método: POST
Cabecera: Authorization: Bearer <TOKEN_JWT>
Cuerpo de la Petición (JSON):
JSON
{
  "eventoId": 1,
  "usuarioId": 2
}


Respuestas:
201 Created: {"mensaje": "Reserva confirmada con éxito garantizado."}
400 Bad Request: {"error": "Lo sentimos, las entradas para este evento se han agotado."}
6. Consultar Reservas por Evento
Obtiene la lista detallada con nombre y correo de los asistentes inscritos a un evento específico.
URL: /api/eventos/:id/reservas
Método: GET
Cabecera: Authorization: Bearer <TOKEN_JWT>
Respuesta Exitosa (200 OK):
JSON
{
  "eventoId": 1,
  "total_reservas": 1,
  "asistentes": [
    {
      "reserva_id": 5,
      "fecha_reserva": "2026-05-31T20:00:00.000Z",
      "usuario_nombre": "Carlos Ruiz",
      "email": "carlos@email.com"
    }
  ]
}


💻 Uso del Cliente de Pruebas Automáticas (test-client.js)
Para comprobar el correcto funcionamiento del ecosistema completo de la API sin necesidad de desplegar interfaces gráficas complejas (Frontend), se ha desarrollado un cliente de simulación por consola automatizado en test-client.js.
Ciclo Completo de Interacción (Secuencial)
Paso
Operación
Endpoint Relacionado
Paso 1
Genera un usuario aleatorio
/api/usuarios
Paso 2
Consume la autenticación enviando el nuevo email para adquirir la API Key (JWT) de manera dinámica
/api/auth/login
Paso 3
Utiliza el token adquirido para solicitar la creación protegida de un nuevo evento
/api/eventos
Paso 4
Genera una reserva utilizando la inyección de cabeceras seguras contra transacciones masivas
/api/reservas
Paso 5
Realiza la consulta cruzada (JOIN) para auditar las reservas generadas en el evento
/api/eventos/:id/reservas

Instrucciones de Ejecución
Abre tu terminal e ingresa a la raíz del proyecto backend.
Asegúrate de configurar la constante API_URL dentro del archivo test-client.js apuntando al dominio de producción en Render o a tu entorno local (http://localhost:3000).
Ejecuta el script con Node.js:
Bash
node test-client.js


El resultado imprimirá de manera ordenada y estructurada en tu consola los logs transaccionales, códigos de respuesta HTTP y las tablas resultantes del motor de la base de datos.

# MEMORIA A LARGO PLAZO: ASISTDENTAL (NUBE DENTAL CLINIC)
> **Ubicación:** `c:\Users\RO106536\Documents\Perso\Proy_Gemini\AsistDental`  
> **Estado Operativo:** 🟢 Activo en Producción / Desplegado en Vercel  
> **Identificador:** `minubeassistant` (Asistente Virtual Dra. Rosa Ávila)

---

## 📌 1. PROPÓSITO DEL PROYECTO
Asistente virtual conversacional para la recepción y agendamiento automático de pacientes en la clínica dental "Nube" de la Dra. Rosa Ávila. Conecta con pacientes vía web o WhatsApp, califica el motivo de consulta y reserva turnos en la agenda del especialista correspondiente.

---

## 🏗️ 2. ARQUITECTURA TÉCNICA
* **Frontend:** Interfaz de chat moderna y responsiva (`index.html`, `index.css`, `app.js`).
* **Base de Especialistas:** `doctors_db.json` (contiene información de doctores, especialidades, días de atención, duración de citas y calendarios).
* **Integración de Agenda:** Google Calendar API (`googleapis`) para verificar disponibilidad en tiempo real e insertar eventos confirmados.
* **Despliegue:** Optimizado para Vercel (`vercel.json`, `build.js`).
* **Configuración:** `config.js` gestiona URLs de API, endpoints y variables de entorno del bot.

---

## 🤖 3. FLUJO CONVERSACIONAL DE CITAS
1. **Bienvenida & Triaje:** Identifica si el paciente es nuevo o recurrente y el tipo de molestia o tratamiento solicitado (limpieza, dolor agudo, ortodoncia, valoración general).
2. **Asignación de Doctor:** Cruza la necesidad clínica con la base de `doctors_db.json`.
3. **Selección de Horario:** Consulta la disponibilidad real en Google Calendar sin empalmes.
4. **Confirmación:** Registra los datos del paciente (nombre, teléfono) y emite el recordatorio.

---

## 🔒 4. REGLAS INVARIANTES
* **RESPETAR `doctors_db.json`:** Cualquier adición o baja de médico debe mantener la estructura de campos requerida por el agendador.
* **TOKEN DE GOOGLE CALENDAR:** No exponer credenciales de servicio o refresh tokens en el repositorio público.
* **PRESERVAR ESTÉTICA DE CHAT:** Mantener la experiencia conversacional fluida sin bloqueos de red.
* **NO MODIFICAR `AsistDental_Respaldo`:** Esa carpeta es un respaldo estático de seguridad.

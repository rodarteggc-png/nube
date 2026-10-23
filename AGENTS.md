# MEMORIA A LARGO PLAZO: ASISTDENTAL (NUBE DENTAL CLINIC)
> **Ubicación:** `c:\Users\RO106536\Documents\Perso\Proy_Gemini\AsistDental`  
> **Estado Operativo:** 🟢 Activo en Producción / Desplegado en Vercel  
> **Identificador:** `minubeassistant` (Asistente Virtual Dra. Rosa Avila)

---

## 📌 1. PROPÓSITO DEL PROYECTO
Asistente virtual conversacional para la recepción y agendamiento automático de pacientes en la clínica dental "Nube" de la Dra. Rosa Avila. Conecta con pacientes vía web o WhatsApp, califica el motivo de consulta y reserva turnos en la agenda del especialista correspondiente.

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

---

## 📌 5. ESTADO OPERATIVO DEL PILOTO (DRA. ROSA AVILA) & ROADMAP
* **Preferencia Operativa del Piloto:** La Dra. Rosa Avila gestiona sus recordatorios de forma manual y personalizada directamente con sus pacientes. Se respeta este flujo y el asistente se mantiene estable sin automatizaciones intrusivas.
* **Webhook CareDent Activo (`4048841`):** Al reservar una cita en el bot, se dispara `POST https://dentadmin.vercel.app/api/bot-cita` para alimentar el calendario y expediente de DentaAdmin en tiempo real.
* **Roadmap Versión Comercial Multidoctor:** Los recordatorios automatizados de WhatsApp vía Meta Cloud API y el triaje conversacional con Gemini Flash quedan documentados para la versión SaaS comercial (`CareDent SaaS Standard`) para nuevos doctores.


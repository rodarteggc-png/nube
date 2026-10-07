import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // 1. Rate Limiting por IP
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  if (!global.rateLimitCache) {
    global.rateLimitCache = new Map();
  }
  const now = Date.now();
  const cooldown = 12 * 60 * 60 * 1000; // 12 horas

  if (global.rateLimitCache.has(ip)) {
    const lastRequest = global.rateLimitCache.get(ip);
    if (now - lastRequest < cooldown) {
      return res.status(429).json({ error: 'Demasiadas solicitudes. Por favor, intenta más tarde.' });
    }
  }
  global.rateLimitCache.set(ip, now);

  const { templateParams } = req.body;
  if (!templateParams || !templateParams.paciente_nombre) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  let calendarError = 'No se intentó';

  // ==========================================
  // 2. CREAR EL EVENTO EN GOOGLE CALENDAR
  // ==========================================
  const credentialsStr = process.env.GOOGLE_CREDENTIALS;
  if (credentialsStr) {
    try {
      const credentials = JSON.parse(credentialsStr);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/calendar.events'], // Scope necesario para crear eventos
      });
      const calendar = google.calendar({ version: 'v3', auth });

      // Parsing de Fecha y Hora
      // fecha_iso es YYYY-MM-DD
      // hora es "10:00 AM", "2:00 PM", etc.
      const dateStr = templateParams.fecha_iso;
      const timeParts = templateParams.hora.match(/(\d+):(\d+)\s+(AM|PM)/i);
      let hours = parseInt(timeParts[1], 10);
      const minutes = parseInt(timeParts[2], 10);
      
      if (timeParts[3].toUpperCase() === 'PM' && hours !== 12) hours += 12;
      if (timeParts[3].toUpperCase() === 'AM' && hours === 12) hours = 0;

      // Asumimos zona horaria de Monterrey, NL (siempre GMT-6)
      const startDate = new Date(`${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00-06:00`);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hora de consulta

      const event = {
        summary: `Cita: ${templateParams.paciente_nombre} - ${templateParams.servicio}`,
        description: `Paciente: ${templateParams.paciente_nombre}\nTeléfono: ${templateParams.paciente_telefono}\nServicio: ${templateParams.servicio}`,
        start: {
          dateTime: startDate.toISOString(),
          timeZone: 'America/Monterrey',
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: 'America/Monterrey',
        },
      };

      await calendar.events.insert({
        calendarId: 'dra.avilaodontologia@gmail.com',
        resource: event,
      });

      console.log('Evento de cita creado en Google Calendar exitosamente.');
      calendarError = null;
    } catch (err) {
      console.error('Error al insertar cita en Google Calendar:', err);
      calendarError = err.message || JSON.stringify(err);
    }
  }

  // ==========================================
  // 3. ENVIAR EMAIL DE RESPALDO (EmailJS)
  // ==========================================
  const SERVICE_ID = process.env.EMAILJS_SERVICE_ID || 'service_qzya5no';
  const TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || 'template_3p6ndam'; 
  const PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || 'p458PyAh6Pvxlzmh_';
  const PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY;

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        service_id: SERVICE_ID,
        template_id: TEMPLATE_ID,
        user_id: PUBLIC_KEY,
        accessToken: PRIVATE_KEY,
        template_params: templateParams
      })
    });

    if (response.ok) {
      return res.status(200).json({ success: true, message: 'Cita enviada y agendada correctamente', calendarError });
    } else {
      const errorText = await response.text();
      console.error('Error de EmailJS:', errorText);
      // Aún si el correo falla, lo marcamos exitoso para el cliente si llegó hasta aquí.
      return res.status(200).json({ success: true, message: 'Agendado con advertencia de email', calendarError, emailError: errorText });
    }
  } catch (error) {
    console.error('Excepción al conectar con EmailJS:', error);
    return res.status(200).json({ success: true, message: 'Agendado con excepción de email', calendarError, emailError: error.message });
  }
}

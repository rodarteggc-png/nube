// api/availability.js - Consulta disponibilidad en tiempo real usando Google Calendar
import { google } from 'googleapis';

const CALENDAR_ID = 'dra.avilaodontologia@gmail.com';
const TIMEZONE = '-06:00'; // America/Monterrey (CST)

// Los turnos base del consultorio
const SHIFT_HOURS = {
  'mañana': ['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM'],
  'tarde':  ['3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'],
};

// Convierte '10:00 AM' a formato 24h {h: 10, m: 0}
function parseTime(timeStr) {
  const [timePart, meridiem] = timeStr.split(' ');
  let [h, m] = timePart.split(':').map(Number);
  if (meridiem === 'PM' && h !== 12) h += 12;
  if (meridiem === 'AM' && h === 12) h = 0;
  return { h, m };
}

export default async function handler(req, res) {
  const { date, schedule } = req.query; // date: YYYY-MM-DD, schedule: 'mañana' o 'tarde'
  
  if (!date || !schedule || !SHIFT_HOURS[schedule]) {
    return res.status(400).json({ error: 'Parámetros inválidos' });
  }

  const credentialsStr = process.env.GOOGLE_CREDENTIALS;
  if (!credentialsStr) {
    // Si no hay credenciales (o hay error de tipeo), devolvemos todos los horarios como fallback para no romper el bot
    console.warn("No se encontró GOOGLE_CREDENTIALS en Vercel. Regresando todos los horarios.");
    return res.status(200).json({ availableSlots: SHIFT_HOURS[schedule] });
  }

  try {
    const credentials = JSON.parse(credentialsStr);
    
    // Autenticarnos como el Robot de Servicio
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });
    
    const calendar = google.calendar({ version: 'v3', auth });

    // Definir los límites de búsqueda para todo el día seleccionado
    const timeMin = `${date}T00:00:00${TIMEZONE}`;
    const timeMax = `${date}T23:59:59${TIMEZONE}`;

    // Consultar el endpoint de FreeBusy
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        timeZone: 'America/Monterrey',
        items: [{ id: CALENDAR_ID }],
      },
    });

    // Extraer los bloques ocupados del calendario de la doctora
    const busyIntervals = response.data.calendars[CALENDAR_ID].busy || [];
    
    // Lista de todos los horarios posibles para este turno
    const allSlots = SHIFT_HOURS[schedule];
    const availableSlots = [];

    // Por cada horario, revisamos si choca con algún bloque ocupado
    for (const slot of allSlots) {
      const { h, m } = parseTime(slot);
      
      // Asumimos que cada cita dura 1 hora
      const slotStart = new Date(`${date}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00${TIMEZONE}`);
      const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000); 
      
      let isBusy = false;
      for (const busy of busyIntervals) {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        
        // Hay choque si la hora de inicio de nuestra cita es antes de que termine el evento ocupado
        // Y la hora de fin de nuestra cita es después de que empiece el evento ocupado
        if (slotStart < busyEnd && slotEnd > busyStart) {
          isBusy = true;
          break;
        }
      }
      
      if (!isBusy) {
        availableSlots.push(slot); // Si no está ocupado, lo agregamos a las opciones
      }
    }

    return res.status(200).json({ availableSlots });

  } catch (err) {
    console.error('Error al consultar Google Calendar:', err);
    // En caso de error de Google, caemos elegantemente ofreciendo todos los horarios (modo MVP)
    return res.status(200).json({ availableSlots: SHIFT_HOURS[schedule] });
  }
}

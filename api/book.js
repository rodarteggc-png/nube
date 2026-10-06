// api/book.js - Backend para AsistDental
// Envía correos de forma segura y aplica Rate Limiting por IP

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // 1. Rate Limiting por IP (Básico en memoria)
  // En un entorno serverless como Vercel, la memoria se reinicia frecuentemente, 
  // pero es suficiente para detener ataques masivos (ráfagas) de bots.
  // Para un límite estricto de 12 horas, lo ideal sería usar Vercel KV, pero esto añade una excelente capa inicial.
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  
  if (!global.rateLimitCache) {
    global.rateLimitCache = new Map();
  }
  
  const now = Date.now();
  const cooldown = 12 * 60 * 60 * 1000; // 12 horas en milisegundos

  if (global.rateLimitCache.has(ip)) {
    const lastRequest = global.rateLimitCache.get(ip);
    if (now - lastRequest < cooldown) {
      console.warn(`Rate limit excedido para IP: ${ip}`);
      return res.status(429).json({ error: 'Demasiadas solicitudes. Por favor, intenta más tarde.' });
    }
  }

  // Registrar la nueva petición para esta IP
  global.rateLimitCache.set(ip, now);

  // 2. Extraer los datos de la cita
  const { templateParams } = req.body;

  if (!templateParams || !templateParams.paciente_nombre) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  // 3. Variables de Entorno (Seguridad)
  // Estas deben configurarse en el panel de Vercel
  const SERVICE_ID = process.env.EMAILJS_SERVICE_ID || 'service_qzya5no'; // Fallback a tu servicio actual
  const TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || 'template_3p6ndam'; 
  const PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || 'p458PyAh6Pvxlzmh_';
  const PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY;

  if (!PRIVATE_KEY) {
    console.error('FALTA EMAILJS_PRIVATE_KEY EN VERCEL ENVIRONMENT VARIABLES');
    // Para no romper el flujo hoy si no la pones de inmediato, intentará enviarlo solo con la pública
    // pero EmailJS podría rechazarlo dependiendo de la configuración de seguridad de tu cuenta.
  }

  // 4. Enviar a EmailJS vía API REST
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
        accessToken: PRIVATE_KEY, // La llave secreta que valida que somos nosotros
        template_params: templateParams
      })
    });

    if (response.ok) {
      return res.status(200).json({ success: true, message: 'Cita enviada correctamente' });
    } else {
      const errorText = await response.text();
      console.error('Error de EmailJS:', errorText);
      // Revertir el rate limit si falló el envío para que el paciente pueda reintentar
      global.rateLimitCache.delete(ip);
      return res.status(500).json({ error: 'Error al enviar el correo a la doctora.' });
    }
  } catch (error) {
    console.error('Excepción al conectar con EmailJS:', error);
    global.rateLimitCache.delete(ip);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

// ============================================
//  Nube Dental Clinic — Conversation Engine
// ============================================

(function () {
  'use strict';

  // ---- Config Loading (from config.js or fallback) ----
  const CFG = (typeof window !== 'undefined' && window.ASIST_DENTAL_CONFIG) ? window.ASIST_DENTAL_CONFIG : {};

  // ---- EmailJS Config (REMOVED) ----
  // La configuración y envío de correos ahora se maneja de forma segura en el backend (/api/book.js)

  // ---- Office Data ----
  const OFFICE = {
    name: CFG.clinicName || 'Nube Dental Clinic',
    doctor: CFG.doctorName || 'Dra. Rosa Ávila | Cirujano Dentista',
    slogan: CFG.slogan || 'Tu sonrisa, nuestra prioridad ♡',
    location: CFG.location || 'Av. Manuel Ordoñez 801 Local 11, Santa Catarina, N.L.',
    mapsUrl: CFG.mapsUrl || 'https://maps.app.goo.gl/e43jZg8zW8yDDQ6S6',
    whatsapp: CFG.whatsapp || '528112219911',
    emergencyPhone: CFG.emergencyPhone || '81 1221 9911',
    email: CFG.email || 'dra.avilaodontologia@gmail.com',
    hours: CFG.hours || {
      weekdays: 'Lunes a Viernes (Solo bajo cita previa)',
      saturday: 'Sábados (Solo bajo cita previa)',
      sunday: 'Domingos (Solo bajo cita previa)',
      label: 'Atención de Lunes a Domingo — Solo bajo citas',
    },
    services: CFG.services || [
      'Consulta y Valoración',
      'Limpieza Dental',
      'Resinas Dentales',
      'Blanqueamiento Dental',
      'Carillas Dentales',
      'Endodoncia',
      'Periodoncia',
      'Extracciones Dentales',
      'Odontología General',
    ],
  };

  // ---- Service Descriptions ----
  const SERVICE_DESCRIPTIONS = CFG.serviceDescriptions || {
    'Consulta y Valoración': {
      emoji: '🔎',
      desc: 'Revisión experta de tu salud bucal. Diagnosticamos tu estado actual, resolvemos tus dudas y creamos un plan de tratamiento ideal para tu sonrisa.',
    },
    'Limpieza Dental': {
      emoji: '🪥',
      desc: 'Previene y cuida tu sonrisa. Limpieza profunda y profesional con tecnología moderna que remueve sarro, placa bacteriana y manchas, protegiendo tu salud bucal.',
    },
    'Resinas Dentales': {
      emoji: '✨',
      desc: 'Repara y devuelve la forma natural de tus dientes con resinas estéticas de alta calidad y máxima durabilidad, logrando un acabado invisible y resistente.',
    },
    'Blanqueamiento Dental': {
      emoji: '🌟',
      desc: 'Una sonrisa más brillante y luminosa. Tratamiento de alta estética con tecnología diseñada para proteger tu esmalte y lograr resultados visibles desde la primera sesión.',
    },
    'Carillas Dentales': {
      emoji: '💎',
      desc: 'Mejora la estética de tu sonrisa perfeccionando forma, color y armonía dental con materiales de alta calidad y un acabado 100% natural.',
    },
    'Endodoncia': {
      emoji: '🦷',
      desc: 'Salva tus dientes naturales eliminando infecciones y dolor de raíz. Tratamientos precisos, seguros y con la máxima comodidad.',
    },
    'Periodoncia': {
      emoji: '🌿',
      desc: 'Encías sanas, dientes fuertes. Diagnóstico y tratamiento especializado para prevenir, desinflamar y recuperar la salud de tus encías.',
    },
    'Extracciones Dentales': {
      emoji: '🩹',
      desc: 'Sin dolor, con la mejor atención. Procedimientos cuidadosos realizados con anestesia efectiva, alta bioseguridad y calidez humana.',
    },
    'Odontología General': {
      emoji: '🩺',
      desc: 'Para toda la familia. Diagnóstico integral, prevención, revisiones periódicas y planes de tratamiento personalizados para cuidar la sonrisa de grandes y chicos.',
    },
  };

  // ---- Dynamic Calendar Days & Shift Hours ----
  function getBaseSlots(fechaIso, schedule) {
    const [y, m, d] = fechaIso.split('-');
    const dow = new Date(y, m - 1, d).getDay();
    if (dow === 0) return []; // Domingo
    if (dow === 6) { // Sábado
      return schedule === 'mañana' ? ['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM'] : ['2:00 PM', '3:00 PM'];
    }
    // L-V
    return schedule === 'mañana' ? ['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM'] : ['2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM'];
  }

  function getUpcomingDays(schedule, maxDays = 6) {
    const days = [];
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');

    for (let offset = 1; offset <= 14 && days.length < maxDays; offset++) {
      const d = new Date(now);
      d.setDate(now.getDate() + offset);
      const dow = d.getDay();
      
      if (dow === 0) continue; // Domingos no online

      const dayName = DAY_NAMES[dow];
      const dateLabel = `${dayName} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
      const fechaIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      days.push({ label: dateLabel, dayName, fechaIso });
    }
    return days;
  }

  // ---- State Machine ----
  const State = {
    IDLE: 'IDLE',
    COLLECTING_SERVICE: 'COLLECTING_SERVICE',
    COLLECTING_SCHEDULE: 'COLLECTING_SCHEDULE',
    COLLECTING_DAY: 'COLLECTING_DAY',
    OFFERING_SLOTS: 'OFFERING_SLOTS',
    COLLECTING_NAME: 'COLLECTING_NAME',
    COLLECTING_PHONE: 'COLLECTING_PHONE',
    CONFIRMING: 'CONFIRMING',
  };

  let currentState = State.IDLE;
  let appointmentData = {};

  // ---- DOM Elements ----
  const messagesArea = document.getElementById('messages-area');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const quickRepliesContainer = document.getElementById('quick-replies');
  const infoToggle = document.getElementById('info-toggle');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  // ---- Intent Detection ----
  function detectIntent(text) {
    const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Emergency keywords (highest priority)
    const emergencyPatterns = [
      'dolor insoportable', 'sangrado constante', 'sangrado que no para',
      'traumatismo', 'infeccion severa',
      'me golpee', 'se me cayo un diente',
      'sangrado excesivo', 'hinchazon severa',
    ];
    if (emergencyPatterns.some(p => lower.includes(p))) return 'emergency';

    // Diagnosis attempt
    const diagnosisPatterns = [
      'crees que necesit', 'crees que teng', 'me recomiendas',
      'que tengo', 'sera que necesito',
      'necesito endodoncia', 'tengo caries', 'es una infeccion',
      'que me recomienda', 'que tratamiento', 'necesitare',
      'diagnostico',
    ];
    if (diagnosisPatterns.some(p => lower.includes(p))) return 'diagnosis';

    // Appointment
    if (['cita', 'agendar', 'reservar', 'consulta', 'quiero agendar', 'sacar cita', 'hacer una cita', 'programar', 'apartar'].some(p => lower.includes(p))) return 'appointment';

    // Cancel
    if (['cancelar cita', 'cancelar mi cita', 'cancelacion', 'no puedo ir'].some(p => lower.includes(p))) return 'cancel';

    // Reschedule
    if (['reprogramar', 'cambiar cita', 'reagendar', 'cambiar mi cita', 'mover mi cita'].some(p => lower.includes(p))) return 'reschedule';

    // Hours
    if (['horario', 'que dias', 'abren', 'cierran', 'a que hora', 'hora de atencion'].some(p => lower.includes(p))) return 'hours';

    // Location
    if (['donde', 'ubicacion', 'direccion', 'como llego', 'donde estan', 'domicilio', 'mapa'].some(p => lower.includes(p))) return 'location';

    // Services
    if (['servicios', 'que hacen', 'tratamientos', 'que ofrecen', 'cuanto cuesta', 'precios'].some(p => lower.includes(p))) return 'services';

    // Contact
    if (['telefono', 'contacto', 'whatsapp', 'correo', 'email', 'llamar', 'comunicarme', 'numero'].some(p => lower.includes(p))) return 'contact';

    // Greeting
    if (['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'hey', 'que tal', 'buen dia', 'saludos'].some(p => lower.includes(p) || lower === p)) return 'greeting';

    // Thanks
    if (['gracias', 'muchas gracias', 'thanks', 'agradezco'].some(p => lower.includes(p))) return 'thanks';

    // Positive confirmation
    if (['si', 'confirmo', 'correcto', 'esta bien', 'de acuerdo', 'perfecto', 'dale', 'ok', 'okey', 'claro', 'afirmativo', 'adelante'].some(p => lower === p || lower.includes(p))) return 'confirm';

    // Negative
    if (['no', 'incorrecto', 'no esta bien', 'negativo', 'nel', 'nop'].some(p => lower === p || lower.includes(p))) return 'deny';

    return 'unknown';
  }

  // ---- Match service from text ----
  function matchService(text) {
    const lower = text.toLowerCase();
    const serviceMap = {
      'limpieza': 'Limpieza Dental',
      'resina': 'Resinas Dentales',
      'blanqueamiento': 'Blanqueamiento Dental',
      'carilla': 'Carillas Dentales',
      'endodoncia': 'Endodoncia',
      'periodoncia': 'Periodoncia',
      'extraccion': 'Extracciones Dentales',
      'extraer': 'Extracciones Dentales',
      'sacar muela': 'Extracciones Dentales',
      'muela': 'Extracciones Dentales',
      'consulta': 'Consulta y Valoración',
      'valoracion': 'Consulta y Valoración',
      'revision': 'Consulta y Valoración',
      'chequeo': 'Consulta y Valoración',
      'general': 'Odontología General',
      'familiar': 'Odontología General',
      'familia': 'Odontología General',
      'ortodoncia': 'Odontología General',
      'implante': 'Odontología General',
    };
    for (const [keyword, service] of Object.entries(serviceMap)) {
      if (lower.includes(keyword)) return service;
    }
    return null;
  }

  // ---- Match schedule preference ----
  function matchSchedule(text) {
    const lower = text.toLowerCase();
    if (['mañana', 'manana', 'am', 'temprano', 'por la mañana'].some(p => lower.includes(p))) return 'mañana';
    if (['tarde', 'pm', 'por la tarde'].some(p => lower.includes(p))) return 'tarde';
    return null;
  }

  // ---- Match day & time selection ----
  function matchDay(text, days) {
    const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    for (let i = 0; i < days.length; i++) {
      const d = days[i];
      const normLabel = d.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const normDayName = d.dayName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (lower === String(i + 1) || lower === normLabel || lower.includes(normLabel)) return d;
      if (lower === normDayName) return d;
    }
    return null;
  }

  function matchTime(text, hoursList) {
    const lower = text.toLowerCase().trim();
    for (let i = 0; i < hoursList.length; i++) {
      const h = hoursList[i];
      if (lower === String(i + 1) || lower === h.toLowerCase()) return h;
      const numPart = h.split(':')[0];
      if (lower === numPart || lower.startsWith(`${numPart}:`)) return h;
    }
    return null;
  }

  // ---- Security, Sanitization & Validation ----
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizeText(str) {
    return String(str).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  function extractCleanPhone10(text) {
    let digits = String(text).replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('52')) {
      digits = digits.slice(2);
    } else if (digits.length === 13 && digits.startsWith('521')) {
      digits = digits.slice(3);
    }
    return digits;
  }

  function isValidPhone(text) {
    const digits = extractCleanPhone10(text);
    if (digits.length !== 10) return false;
    // En México los códigos de área siempre inician entre 2 y 9 (nunca 0 ni 1)
    if (digits[0] === '0' || digits[0] === '1') return false;
    // Bloquear números con el mismo dígito repetido (ej. 8111111111, 9999999999)
    if (/(\d)\1{6,}/.test(digits)) return false;
    // Bloquear secuencias falsas obvias
    const fakeSequences = ['1234567890', '0123456789', '9876543210', '8112345678', '5512345678'];
    if (fakeSequences.includes(digits)) return false;
    return true;
  }

  function formatPhone10(text) {
    const d = extractCleanPhone10(text);
    return `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6, 10)}`;
  }

  function isValidName(text) {
    const clean = sanitizeText(text);
    if (clean.length < 5 || clean.length > 60) return false;
    // Solo letras (con acentos/ñ), espacios, apóstrofes o guiones
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/.test(clean)) return false;
    // Rechazar letras repetidas 4+ veces seguidas (ej. "aaaa bbbb")
    if (/([a-zA-ZáéíóúÁÉÍÓÚñÑ])\1{3,}/i.test(clean)) return false;
    const words = clean.split(/\s+/);
    return words.length >= 2 && words.every(w => w.length >= 2);
  }

  // ---- Anti-Spam Rate Limiting (1 cita cada 12h por dispositivo) ----
  const BOOKING_COOLDOWN_MS = 1000; // 1 segundo (Modificado temporalmente para pruebas)
  const BOOKING_STORAGE_KEY = 'nube_last_booking_ts';

  function canBookAppointment() {
    try {
      const lastTs = Number(localStorage.getItem(BOOKING_STORAGE_KEY) || 0);
      if (!lastTs) return true;
      return (Date.now() - lastTs) > BOOKING_COOLDOWN_MS;
    } catch (_) {
      return true;
    }
  }

  function recordBookedAppointment() {
    try {
      localStorage.setItem(BOOKING_STORAGE_KEY, String(Date.now()));
    } catch (_) {}
  }

  // ---- UI Functions ----

  function addMessage(text, sender, options = {}) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.textContent = sender === 'bot' ? '🦷' : '👤';

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';
    if (options.emergency) bubbleDiv.classList.add('emergency');

    if (options.html) {
      bubbleDiv.innerHTML = text;
    } else {
      const p = document.createElement('p');
      p.textContent = text;
      bubbleDiv.appendChild(p);
    }

    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(bubbleDiv);
    messagesArea.appendChild(messageDiv);
    scrollToBottom();
  }

  function showTyping() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot typing-message';
    typingDiv.id = 'typing-indicator';

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.textContent = '🦷';

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble typing-bubble';

    const dotsDiv = document.createElement('div');
    dotsDiv.className = 'typing-indicator';
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.className = 'dot';
      dotsDiv.appendChild(dot);
    }

    bubbleDiv.appendChild(dotsDiv);
    typingDiv.appendChild(avatarDiv);
    typingDiv.appendChild(bubbleDiv);
    messagesArea.appendChild(typingDiv);
    scrollToBottom();
  }

  function hideTyping() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
  }

  function showQuickReplies(options) {
    quickRepliesContainer.innerHTML = '';
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'quick-reply-btn';
      btn.textContent = opt.label;
      btn.dataset.value = opt.value;
      btn.addEventListener('click', () => handleQuickReply(opt.value));
      quickRepliesContainer.appendChild(btn);
    });
  }

  function clearQuickReplies() {
    quickRepliesContainer.innerHTML = '';
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      messagesArea.scrollTop = messagesArea.scrollHeight;
    });
  }

  function botReply(text, options = {}) {
    const delay = options.delay || (600 + Math.random() * 600);
    showTyping();
    chatInput.disabled = true;

    return new Promise(resolve => {
      setTimeout(() => {
        hideTyping();
        addMessage(text, 'bot', options);
        chatInput.disabled = false;
        chatInput.focus();
        if (options.quickReplies) {
          showQuickReplies(options.quickReplies);
        }
        resolve();
      }, delay);
    });
  }

  // ---- Conversation Handlers ----

  async function handleUserMessage(text) {
    if (!text.trim()) return;
    addMessage(text, 'user');
    clearQuickReplies();
    const intent = detectIntent(text);

    // Emergency always takes priority
    if (intent === 'emergency') {
      currentState = State.IDLE;
      appointmentData = {};
      await botReply(
        `<p><strong>⚠️ Situación de Urgencia Detectada</strong></p>
        <p>Tu seguridad es nuestra prioridad. Por favor:</p>
        <ul>
          <li>Llama inmediatamente a servicios de emergencia o acude al centro médico más cercano.</li>
          <li>Línea de emergencia del consultorio: ${OFFICE.emergencyPhone}</li>
        </ul>
        <p>No demores en buscar atención médica presencial.</p>`,
        { html: true, emergency: true }
      );
      return;
    }

    // Diagnosis attempt always redirect
    if (intent === 'diagnosis') {
      await botReply(
        'Lamento mucho que estés pasando por eso. Como asistente virtual, no estoy autorizado para realizar diagnósticos médicos ni sugerir tratamientos. Lo más recomendable es que uno de nuestros dentistas te evalúe personalmente. ¿Te gustaría que revise los horarios disponibles para una consulta de valoración?',
        {
          quickReplies: [
            { label: 'Sí, agendar valoración', value: 'agendar_valoracion' },
            { label: 'No por ahora, gracias', value: 'no_gracias' },
          ],
        }
      );
      return;
    }

    // Allow escaping/canceling the booking flow at any step
    if (currentState !== State.IDLE) {
      const norm = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      if (['cancelar', 'salir', 'menu', 'menu principal', 'inicio', 'volver'].includes(norm)) {
        currentState = State.IDLE;
        appointmentData = {};
        await botReply(
          'He cancelado el proceso de registro. ¿En qué más puedo ayudarte?',
          {
            quickReplies: [
              { label: '📅 Agendar cita', value: 'agendar' },
              { label: '🕐 Horarios', value: 'horarios' },
              { label: '📍 Ubicación', value: 'ubicacion' },
              { label: '🦷 Servicios', value: 'servicios' },
            ],
          }
        );
        return;
      }
      // If user asks for location, hours, or contact mid-flow, exit flow and answer
      if (['location', 'hours', 'contact'].includes(intent)) {
        currentState = State.IDLE;
        appointmentData = {};
        await handleIdleState(text, intent);
        return;
      }
    }

    // State-based handling
    switch (currentState) {
      case State.IDLE: await handleIdleState(text, intent); break;
      case State.COLLECTING_SERVICE: await handleCollectingService(text); break;
      case State.COLLECTING_SCHEDULE: await handleCollectingSchedule(text); break;
      case State.COLLECTING_DAY: await handleCollectingDay(text); break;
      case State.OFFERING_SLOTS: await handleOfferingSlots(text); break;
      case State.COLLECTING_NAME: await handleCollectingName(text); break;
      case State.COLLECTING_PHONE: await handleCollectingPhone(text); break;
      case State.CONFIRMING: await handleConfirming(text, intent); break;
      default: await handleIdleState(text, intent);
    }
  }

  async function handleIdleState(text, intent) {
    switch (intent) {
      case 'greeting':
        await botReply(
          '¡Hola! 👋 Bienvenido(a) a Nube Dental Clinic. Soy tu coordinador virtual y estoy aquí para ayudarte. ¿En qué puedo asistirte hoy?',
          {
            quickReplies: [
              { label: '📅 Agendar cita', value: 'agendar' },
              { label: '🕐 Horarios', value: 'horarios' },
              { label: '📍 Ubicación', value: 'ubicacion' },
              { label: '🦷 Servicios', value: 'servicios' },
            ],
          }
        );
        break;
      case 'appointment':
        await startAppointmentFlow(text);
        break;
      case 'cancel':
        await botReply(
          `<p>Para cancelar tu cita, por favor comunícate directamente con nosotros para verificar tu reservación:</p>
          <ul>
            <li>📱 <strong>Tel / WhatsApp:</strong> <a href="https://wa.me/${OFFICE.whatsapp}" target="_blank" rel="noopener noreferrer">${OFFICE.emergencyPhone}</a></li>
            <li>✉️ <strong>Correo:</strong> <a href="mailto:${OFFICE.email}">${OFFICE.email}</a></li>
          </ul>
          <p>¿Hay algo más en lo que pueda ayudarte?</p>`,
          { html: true, quickReplies: [{ label: '📅 Agendar nueva cita', value: 'agendar' }, { label: 'No, gracias', value: 'no_gracias' }] }
        );
        break;
      case 'reschedule':
        await botReply(
          `<p>Para reprogramar tu cita existente, por favor contáctanos directamente:</p>
          <ul>
            <li>📱 <strong>Tel / WhatsApp:</strong> <a href="https://wa.me/${OFFICE.whatsapp}" target="_blank" rel="noopener noreferrer">${OFFICE.emergencyPhone}</a></li>
            <li>✉️ <strong>Correo:</strong> <a href="mailto:${OFFICE.email}">${OFFICE.email}</a></li>
          </ul>
          <p>¿O prefieres agendar una cita completamente nueva?</p>`,
          { html: true, quickReplies: [{ label: '📅 Agendar nueva cita', value: 'agendar' }, { label: 'No, gracias', value: 'no_gracias' }] }
        );
        break;
      case 'contact':
        await botReply(
          `<p>📞 <strong>Datos de contacto de Nube Dental Clinic:</strong></p>
          <ul>
            <li>📱 <strong>Tel / WhatsApp:</strong> <a href="https://wa.me/${OFFICE.whatsapp}" target="_blank" rel="noopener noreferrer">${OFFICE.emergencyPhone}</a></li>
            <li>✉️ <strong>Correo:</strong> <a href="mailto:${OFFICE.email}">${OFFICE.email}</a></li>
            <li>📍 <strong>Ubicación:</strong> <a href="https://maps.app.goo.gl/e43jZg8zW8yDDQ6S6" target="_blank" rel="noopener noreferrer">${OFFICE.location}</a></li>
          </ul>
          <p>¿Te gustaría agendar una cita?</p>`,
          { html: true, quickReplies: [{ label: '📅 Agendar cita', value: 'agendar' }, { label: '🕐 Ver horarios', value: 'horarios' }] }
        );
        break;
      case 'hours':
        await botReply(
          `<p>Nuestros horarios de atención son:</p>
          <ul>
            <li><strong>Lunes a Viernes:</strong> 10:00 AM – 1:00 PM y 2:00 PM – 7:00 PM</li>
            <li><strong>Sábados:</strong> 10:00 AM – 3:00 PM</li>
            <li><strong>Domingos:</strong> Solo con previa cita</li>
          </ul>
          <p>¿Te gustaría agendar una cita?</p>`,
          { html: true, quickReplies: [{ label: '📅 Sí, agendar cita', value: 'agendar' }, { label: 'No, gracias', value: 'no_gracias' }] }
        );
        break;
      case 'location':
        await botReply(
          `<p>📍 Nos encontramos en <strong>${OFFICE.location}</strong>.</p><p><a href="https://maps.app.goo.gl/e43jZg8zW8yDDQ6S6" target="_blank" rel="noopener noreferrer">📌 Ver ubicación exacta en Google Maps</a></p><p>¿Necesitas algo más?</p>`,
          { html: true, quickReplies: [{ label: '📅 Agendar cita', value: 'agendar' }, { label: '🕐 Ver horarios', value: 'horarios' }] }
        );
        break;
      case 'services': {
        const servicesList = OFFICE.services.map(s => `<li>${s}</li>`).join('');
        await botReply(
          `<p>En Nube Dental Clinic ofrecemos los siguientes servicios (selecciona uno para ver más detalles):</p><ul>${servicesList}</ul>`,
          { html: true, quickReplies: OFFICE.services.map(s => ({ label: s, value: s.toLowerCase() })) }
        );
        break;
      }
      case 'thanks':
        await botReply(
          '¡Con mucho gusto! 😊 Si necesitas algo más, no dudes en escribirme. ¡Que tengas un excelente día!',
          { quickReplies: [{ label: '📅 Agendar cita', value: 'agendar' }, { label: '🕐 Horarios', value: 'horarios' }] }
        );
        break;
      default: {
        const typedService = OFFICE.services.find(s =>
          s.toLowerCase() === text.toLowerCase().trim() ||
          text.toLowerCase().includes(s.toLowerCase())
        );
        if (typedService) {
          const info = SERVICE_DESCRIPTIONS[typedService];
          await botReply(
            `<p>${info.emoji} <strong>${typedService}</strong></p>
            <p>${info.desc}</p>
            <p>¿Te gustaría agendar una cita para este servicio?</p>`,
            {
              html: true,
              quickReplies: [
                { label: '📅 Sí, agendar cita', value: `agendar_servicio:${typedService}` },
                { label: '↩️ Ver otros servicios', value: 'servicios' },
                { label: '🏠 Menú principal', value: 'no_gracias' },
              ],
            }
          );
        } else {
          await botReply(
            'Disculpa, no logré entender tu solicitud. ¿Puedo ayudarte con alguna de estas opciones?',
            {
              quickReplies: [
                { label: '📅 Agendar cita', value: 'agendar' },
                { label: '🕐 Horarios', value: 'horarios' },
                { label: '📍 Ubicación', value: 'ubicacion' },
                { label: '🦷 Servicios', value: 'servicios' },
              ],
            }
          );
        }
        break;
      }
    }
  }

  async function checkRateLimitOrWarn() {
    if (!canBookAppointment()) {
      currentState = State.IDLE;
      appointmentData = {};
      await botReply(
        `<p>📌 <strong>Ya registramos una cita reciente desde este dispositivo.</strong></p>
        <p>Por seguridad y para evitar duplicados, el sistema permite agendar una cita cada 12 horas por dispositivo. Si necesitas modificar tu cita o agendar para un familiar, escríbenos directamente:</p>
        <ul>
          <li>📱 <strong>WhatsApp:</strong> <a href="https://wa.me/${OFFICE.whatsapp}" target="_blank" rel="noopener noreferrer">${OFFICE.emergencyPhone}</a></li>
        </ul>`,
        { html: true, quickReplies: [{ label: '🕐 Horarios', value: 'horarios' }, { label: '📍 Ubicación', value: 'ubicacion' }] }
      );
      return false;
    }
    return true;
  }

  async function startAppointmentFlow(text) {
    if (!(await checkRateLimitOrWarn())) return;
    appointmentData = {};
    const service = matchService(text);
    if (service) {
      appointmentData.service = service;
      currentState = State.COLLECTING_SCHEDULE;
      await botReply(
        `¡Perfecto! Agendaremos una cita para <strong>${service}</strong>. ¿Prefieres un horario por la mañana o por la tarde?`,
        {
          html: true,
          quickReplies: [
            { label: '🌅 Mañana (Lun–Sáb)', value: 'mañana' },
            { label: '🌆 Tarde (Lun–Vie)', value: 'tarde' },
            { label: '🏠 Cancelar', value: 'cancelar_flujo' },
          ],
        }
      );
    } else {
      currentState = State.COLLECTING_SERVICE;
      const serviceButtons = OFFICE.services.map(s => ({ label: s, value: s.toLowerCase() }));
      serviceButtons.push({ label: '🏠 Cancelar', value: 'cancelar_flujo' });
      await botReply(
        'Con mucho gusto te ayudaré a agendar tu cita. ¿Qué servicio necesitas?',
        { quickReplies: serviceButtons }
      );
    }
  }

  async function handleCollectingService(text) {
    const service = matchService(text);
    const directMatch = OFFICE.services.find(s => s.toLowerCase() === text.toLowerCase().trim());
    if (service || directMatch) {
      appointmentData.service = service || directMatch;
      currentState = State.COLLECTING_SCHEDULE;
      await botReply(
        `Excelente elección (<strong>${appointmentData.service}</strong>). ¿Prefieres un horario por la <strong>mañana</strong> o por la <strong>tarde</strong>?`,
        {
          html: true,
          quickReplies: [
            { label: '🌅 Mañana (10:00 AM – 1:00 PM)', value: 'mañana' },
            { label: '🌆 Tarde (3:00 PM – 6:00 PM)', value: 'tarde' },
            { label: '🏠 Cancelar', value: 'cancelar_flujo' },
          ],
        }
      );
    } else {
      const serviceButtons = OFFICE.services.map(s => ({ label: s, value: s.toLowerCase() }));
      serviceButtons.push({ label: '🏠 Cancelar', value: 'cancelar_flujo' });
      await botReply(
        'No pude identificar el servicio. Por favor selecciona uno de los siguientes:',
        { quickReplies: serviceButtons }
      );
    }
  }

  async function handleCollectingSchedule(text) {
    const schedule = matchSchedule(text);
    if (schedule) {
      appointmentData.schedule = schedule;
      appointmentData.availableDays = getUpcomingDays(schedule, 6);
      currentState = State.COLLECTING_DAY;

      const daysListHtml = appointmentData.availableDays
        .map((d, i) => `<li><strong>${i + 1}.</strong> ${d.label}</li>`)
        .join('');
      const dayButtons = appointmentData.availableDays.map(d => ({ label: `📅 ${d.label}`, value: d.label }));
      dayButtons.push({ label: '🏠 Cancelar', value: 'cancelar_flujo' });

      await botReply(
        `<p>Estos son los próximos días disponibles por la <strong>${schedule}</strong>:</p><ul>${daysListHtml}</ul><p>¿Qué día te queda mejor?</p>`,
        { html: true, quickReplies: dayButtons }
      );
    } else {
      await botReply(
        'Por favor indica si prefieres un horario por la mañana o por la tarde.',
        {
          quickReplies: [
            { label: '🌅 Mañana', value: 'mañana' },
            { label: '🌆 Tarde', value: 'tarde' },
            { label: '🏠 Cancelar', value: 'cancelar_flujo' },
          ],
        }
      );
    }
  }

  async function handleCollectingDay(text) {
    const chosenDay = matchDay(text, appointmentData.availableDays || []);
    if (chosenDay) {
      appointmentData.selectedDay = chosenDay;
      
      // Notificar al paciente que estamos leyendo el calendario real
      await botReply(`Revisando la agenda de la doctora para el <strong>${chosenDay.label}</strong>... 📅`, { html: true, delay: 500 });
      showTyping();
      chatInput.disabled = true;

      try {
        const res = await fetch(`/api/availability?date=${chosenDay.fechaIso}&schedule=${appointmentData.schedule}`);
        if (!res.ok) throw new Error('API request failed');
        const data = await res.json();
        appointmentData.availableHours = data.availableSlots || [];
      } catch (e) {
        console.error("Error al obtener disponibilidad:", e);
        appointmentData.availableHours = getBaseSlots(chosenDay.fechaIso, appointmentData.schedule); // Fallback
      }

      hideTyping();
      chatInput.disabled = false;
      currentState = State.OFFERING_SLOTS;

      // Si no quedan horarios disponibles para ese día
      if (appointmentData.availableHours.length === 0) {
        currentState = State.COLLECTING_SCHEDULE;
        await botReply(
          `<p>Lo siento mucho, la agenda ya está <strong>totalmente llena</strong> para el <strong>${chosenDay.label}</strong> por la ${appointmentData.schedule}. 😔</p>
           <p>Por favor elige otro turno para buscar más opciones:</p>`,
          {
            html: true,
            quickReplies: [
              { label: '🌅 Buscar por la Mañana', value: 'mañana' },
              { label: '🌆 Buscar por la Tarde', value: 'tarde' },
              { label: '🏠 Cancelar', value: 'cancelar_flujo' },
            ]
          }
        );
        return;
      }

      // Si hay horarios, se los ofrecemos
      const hoursHtml = appointmentData.availableHours
        .map((h, i) => `<li><strong>${i + 1}.</strong> ${h}</li>`)
        .join('');
      const hourButtons = appointmentData.availableHours.map(h => ({ label: `🕐 ${h}`, value: h }));
      hourButtons.push({ label: '↩️ Cambiar día', value: 'cambiar_dia' });
      hourButtons.push({ label: '🏠 Cancelar', value: 'cancelar_flujo' });

      await botReply(
        `<p>¡Encontré espacios libres! Horarios disponibles para el <strong>${chosenDay.label}</strong>:</p><ul>${hoursHtml}</ul><p>¿A qué hora prefieres tu cita?</p>`,
        { html: true, quickReplies: hourButtons }
      );
    } else {
      const dayButtons = (appointmentData.availableDays || []).map(d => ({ label: `📅 ${d.label}`, value: d.label }));
      dayButtons.push({ label: '🏠 Cancelar', value: 'cancelar_flujo' });
      await botReply(
        'Por favor selecciona uno de los días disponibles de la lista:',
        { quickReplies: dayButtons }
      );
    }
  }

  async function handleOfferingSlots(text) {
    const chosenTime = matchTime(text, appointmentData.availableHours || []);
    if (chosenTime) {
      appointmentData.selectedSlot = {
        day: appointmentData.selectedDay.label,
        dayName: appointmentData.selectedDay.dayName,
        fechaIso: appointmentData.selectedDay.fechaIso,
        time: chosenTime,
      };
      currentState = State.COLLECTING_NAME;
      await botReply(
        `Perfecto, reservaremos el <strong>${appointmentData.selectedSlot.day}</strong> a las <strong>${chosenTime}</strong>. Ahora necesito tus datos. ¿Cuál es tu <strong>nombre completo</strong> (nombre y apellido)?`,
        { html: true, quickReplies: [{ label: '🏠 Cancelar', value: 'cancelar_flujo' }] }
      );
    } else {
      const hourButtons = (appointmentData.availableHours || []).map(h => ({ label: `🕐 ${h}`, value: h }));
      hourButtons.push({ label: '↩️ Cambiar día', value: 'cambiar_dia' });
      hourButtons.push({ label: '🏠 Cancelar', value: 'cancelar_flujo' });
      await botReply(
        'No pude identificar la hora. Por favor elige una de las opciones disponibles:',
        { quickReplies: hourButtons }
      );
    }
  }

  async function handleCollectingName(text) {
    if (isValidName(text)) {
      appointmentData.name = escapeHtml(sanitizeText(text));
      currentState = State.COLLECTING_PHONE;
      await botReply(
        `Gracias, <strong>${appointmentData.name}</strong>. ¿Cuál es tu número de teléfono celular a <strong>10 dígitos</strong>?`,
        { html: true, quickReplies: [{ label: '🏠 Cancelar', value: 'cancelar_flujo' }] }
      );
    } else {
      await botReply(
        'Por favor ingresa tu nombre y apellido reales (únicamente letras, sin números ni símbolos). Ejemplo: María García López.',
        { quickReplies: [{ label: '🏠 Cancelar', value: 'cancelar_flujo' }] }
      );
    }
  }

  async function handleCollectingPhone(text) {
    if (isValidPhone(text)) {
      appointmentData.phone = formatPhone10(text);
      currentState = State.CONFIRMING;
      const summaryHtml = `
        <p>Estos son los datos de tu cita. Por favor confirma que todo esté correcto:</p>
        <div class="summary-card">
          <h4>📋 Resumen de Cita</h4>
          <p>🦷 <strong>Servicio:</strong> ${escapeHtml(appointmentData.service)}</p>
          <p>📅 <strong>Fecha:</strong> ${escapeHtml(appointmentData.selectedSlot.day)}</p>
          <p>🕐 <strong>Hora:</strong> ${escapeHtml(appointmentData.selectedSlot.time)}</p>
          <p>👤 <strong>Paciente:</strong> ${appointmentData.name}</p>
          <p>📞 <strong>Teléfono:</strong> ${escapeHtml(appointmentData.phone)}</p>
        </div>
        <p>¿Es correcta esta información?</p>`;
      await botReply(summaryHtml, {
        html: true,
        quickReplies: [
          { label: '✅ Sí, confirmar cita', value: 'confirmar' },
          { label: '❌ No, corregir datos', value: 'corregir' },
          { label: '🏠 Cancelar', value: 'cancelar_flujo' },
        ],
      });
    } else {
      await botReply(
        'Por favor ingresa un número celular válido de 10 dígitos (sin secuencias repetidas). Ejemplo: 81 1221 9911',
        { quickReplies: [{ label: '🏠 Cancelar', value: 'cancelar_flujo' }] }
      );
    }
  }

  // ---- Helper: Exact Date & 24h Time ----
  function getAppointmentDateTime(data) {
    const timeStr = data.selectedSlot.time;
    const [timePart, meridiem] = timeStr.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    const pad = (n) => String(n).padStart(2, '0');
    const fechaIso = data.selectedSlot.fechaIso;
    const [year, month, day] = fechaIso.split('-').map(Number);
    const eventDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
    const hora24 = `${pad(hours)}:${pad(minutes)}`;

    return { eventDate, fechaIso, hora24 };
  }

  // ---- Google Calendar URL Generator ----
  function generateCalendarUrl(data) {
    const { eventDate } = getAppointmentDateTime(data);
    const endDate = new Date(eventDate.getTime() + 60 * 60 * 1000);
    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0];

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `Cita Dental - ${data.service} (${data.name})`,
      dates: `${fmt(eventDate)}/${fmt(endDate)}`,
      details: `Paciente: ${data.name}\nTeléfono: ${data.phone}\nServicio: ${data.service}\n\nNube Dental Clinic - Dra. Rosa Avila`,
      location: OFFICE.location,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  // ---- WhatsApp URL to Contact Patient ----
  function generatePatientWhatsAppUrl(data) {
    const cleanPhone = data.phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.length === 10 ? `52${cleanPhone}` : cleanPhone;
    const msg = `Hola ${data.name}, te escribimos del consultorio de la Dra. Rosa Avila (Nube Dental Clinic) para confirmar tu cita de *${data.service}* el *${data.selectedSlot.day}* a las *${data.selectedSlot.time}*. 🦷`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
  }

  // ---- DentAdmin 1-Click Registration URL & Auto-Sync ----
  function generateDentAdminUrl(data) {
    const { fechaIso, hora24 } = getAppointmentDateTime(data);
    const params = new URLSearchParams({
      nombre: data.name,
      telefono: data.phone,
      fecha: fechaIso,
      hora: hora24,
      motivo: data.service,
    });
    return `http://localhost:3000/api/bot-cita?${params.toString()}`;
  }

  // ---- Email Notification (Backend Seguro) ----
  async function sendEmailNotification(data) {
    const { fechaIso } = getAppointmentDateTime(data);
    const templateParams = {
      paciente_nombre:       data.name,
      paciente_telefono:     data.phone,
      servicio:              data.service,
      dia:                   `${data.selectedSlot.day} (${fechaIso})`,
      hora:                  data.selectedSlot.time,
      calendar_url:          generateCalendarUrl(data),
      whatsapp_paciente_url: generatePatientWhatsAppUrl(data),
      dentadmin_url:         generateDentAdminUrl(data),
    };

    try {
      // Llamamos a nuestro nuevo servidor en Vercel de forma segura
      const response = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateParams })
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert('Detalle del error (Toma captura de esto): ' + (errorData.details || errorData.error));
        console.warn('Error al procesar la cita en el servidor', errorData);
        return false;
      }
      return true;
    } catch (err) {
      alert('Error de red: ' + err.message);
      console.error('Error de red:', err);
      return false;
    }
  }

  async function handleConfirming(text, intent) {
    if (intent === 'confirm' || text.toLowerCase().includes('confirmar') || text.toLowerCase().includes('si') || text.toLowerCase().includes('sí')) {
      if (!(await checkRateLimitOrWarn())) return;
      currentState = State.IDLE;
      const snapshot = { ...appointmentData };
      appointmentData = {};

      // Registrar candado anti-spam local y enviar notificación al servidor
      recordBookedAppointment();
      sendEmailNotification(snapshot);
      // (La sincronización automática de DentAdmin fue removida del frontend para evitar errores de red. 
      // La doctora utilizará el enlace mágico incluido en el correo cuando instale DentAdmin).

      await botReply(
        `<p>🎉 <strong>¡Tu solicitud de cita ha sido registrada exitosamente!</strong></p>
        <div class="summary-card">
          <h4>✅ Cita Registrada</h4>
          <p>🦷 ${escapeHtml(snapshot.service)}</p>
          <p>📅 ${escapeHtml(snapshot.selectedSlot.day)} a las ${escapeHtml(snapshot.selectedSlot.time)}</p>
          <p>📍 <a href="https://maps.app.goo.gl/e43jZg8zW8yDDQ6S6" target="_blank" rel="noopener noreferrer">${OFFICE.location}</a></p>
        </div>
        <p>📧 Hemos notificado automáticamente a la <strong>Dra. Rosa Avila</strong>, quien te contactará por WhatsApp para confirmar tu espacio. ¡Te esperamos en <strong>Nube Dental Clinic</strong>! 😊</p>`,
        { html: true }
      );
    } else if (intent === 'deny' || text.toLowerCase().includes('corregir') || text.toLowerCase().includes('no')) {
      currentState = State.COLLECTING_SERVICE;
      appointmentData = {};
      const serviceButtons = OFFICE.services.map(s => ({ label: s, value: s.toLowerCase() }));
      serviceButtons.push({ label: '🏠 Cancelar', value: 'cancelar_flujo' });
      await botReply(
        'Sin problema. Comencemos de nuevo. ¿Qué servicio te gustaría agendar?',
        { quickReplies: serviceButtons }
      );
    } else {
      await botReply(
        'Por favor confirma si los datos son correctos o si deseas corregir algo.',
        {
          quickReplies: [
            { label: '✅ Sí, confirmar', value: 'confirmar' },
            { label: '❌ No, corregir', value: 'corregir' },
            { label: '🏠 Cancelar', value: 'cancelar_flujo' },
          ],
        }
      );
    }
  }

  // ---- Quick Reply Handler ----
  async function handleQuickReply(value) {
    const lower = value.toLowerCase();

    if (lower === 'cancelar_flujo') {
      addMessage('Cancelar', 'user');
      clearQuickReplies();
      currentState = State.IDLE;
      appointmentData = {};
      await botReply(
        'Proceso cancelado. ¿En qué más puedo ayudarte hoy?',
        {
          quickReplies: [
            { label: '📅 Agendar cita', value: 'agendar' },
            { label: '🕐 Horarios', value: 'horarios' },
            { label: '📍 Ubicación', value: 'ubicacion' },
            { label: '🦷 Servicios', value: 'servicios' },
          ],
        }
      );
      return;
    }

    if (lower === 'cambiar_dia' && appointmentData.schedule) {
      addMessage('Cambiar día', 'user');
      clearQuickReplies();
      currentState = State.COLLECTING_SCHEDULE;
      await handleCollectingSchedule(appointmentData.schedule);
      return;
    }

    if (lower === 'agendar' || lower === 'agendar_valoracion') {
      addMessage(value === 'agendar_valoracion' ? 'Sí, agendar valoración' : 'Agendar cita', 'user');
      clearQuickReplies();
      if (!(await checkRateLimitOrWarn())) return;
      if (value === 'agendar_valoracion') {
        appointmentData = { service: 'Consulta y Valoración' };
        currentState = State.COLLECTING_SCHEDULE;
        await botReply(
          'Agendaremos una <strong>Consulta y Valoración</strong> para que nuestra doctora pueda evaluarte de forma integral. ¿Prefieres un horario por la mañana o por la tarde?',
          {
            html: true,
            quickReplies: [
              { label: '🌅 Mañana', value: 'mañana' },
              { label: '🌆 Tarde', value: 'tarde' },
              { label: '🏠 Cancelar', value: 'cancelar_flujo' },
            ],
          }
        );
      } else {
        await startAppointmentFlow('');
      }
      return;
    }

    if (lower === 'horarios') {
      addMessage('Horarios', 'user');
      clearQuickReplies();
      currentState = State.IDLE;
      appointmentData = {};
      await handleIdleState('', 'hours');
      return;
    }

    if (lower === 'ubicacion') {
      addMessage('Ubicación', 'user');
      clearQuickReplies();
      currentState = State.IDLE;
      appointmentData = {};
      await handleIdleState('', 'location');
      return;
    }

    if (lower === 'servicios') {
      addMessage('Servicios', 'user');
      clearQuickReplies();
      currentState = State.IDLE;
      appointmentData = {};
      await handleIdleState('', 'services');
      return;
    }

    if (lower === 'no_gracias' || lower === 'no gracias') {
      addMessage('No, gracias', 'user');
      clearQuickReplies();
      currentState = State.IDLE;
      appointmentData = {};
      await botReply(
        '¡Perfecto! Si necesitas algo en el futuro, aquí estaré para ayudarte. ¡Que tengas un excelente día! 😊',
        {
          quickReplies: [
            { label: '📅 Agendar cita', value: 'agendar' },
            { label: '🕐 Horarios', value: 'horarios' },
            { label: '📍 Ubicación', value: 'ubicacion' },
            { label: '🦷 Servicios', value: 'servicios' },
          ],
        }
      );
      return;
    }

    if (lower === 'confirmar') { handleUserMessage('Sí, confirmar'); return; }
    if (lower === 'corregir') { handleUserMessage('No, corregir'); return; }

    // Service selection from quick reply buttons or sidebar tags
    const matchedService = OFFICE.services.find(s => s.toLowerCase() === lower);
    if (matchedService) {
      // If user is already inside COLLECTING_SERVICE state, advance directly to schedule
      if (currentState === State.COLLECTING_SERVICE) {
        handleUserMessage(matchedService);
        return;
      }
      addMessage(matchedService, 'user');
      clearQuickReplies();
      const info = SERVICE_DESCRIPTIONS[matchedService];
      await botReply(
        `<p>${info.emoji} <strong>${matchedService}</strong></p>
        <p>${info.desc}</p>
        <p>¿Te gustaría agendar una cita para este servicio?</p>`,
        {
          html: true,
          quickReplies: [
            { label: '📅 Sí, agendar cita', value: `agendar_servicio:${matchedService}` },
            { label: '↩️ Ver otros servicios', value: 'servicios' },
            { label: '🏠 Menú principal', value: 'no_gracias' },
          ],
        }
      );
      return;
    }

    // Booking a specific service from description card
    if (lower.startsWith('agendar_servicio:')) {
      const serviceName = value.split(':')[1];
      addMessage(`Agendar ${serviceName}`, 'user');
      clearQuickReplies();
      if (!(await checkRateLimitOrWarn())) return;
      appointmentData = { service: serviceName };
      currentState = State.COLLECTING_SCHEDULE;
      await botReply(
        `Perfecto, agendaremos una cita para <strong>${escapeHtml(serviceName)}</strong>. ¿Prefieres un horario por la mañana o por la tarde?`,
        {
          html: true,
          quickReplies: [
            { label: '🌅 Mañana (Lun–Sáb)', value: 'mañana' },
            { label: '🌆 Tarde (Lun–Vie)', value: 'tarde' },
            { label: '🏠 Cancelar', value: 'cancelar_flujo' },
          ],
        }
      );
      return;
    }

    // For all other quick replies, treat as regular message
    handleUserMessage(value);
  }

  // ---- Event Listeners ----

  function sendMessage() {
    const text = chatInput.value.trim();
    if (text) {
      chatInput.value = '';
      handleUserMessage(text);
    }
  }

  sendBtn.addEventListener('click', sendMessage);

  chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Sidebar service tags click handler
  document.querySelectorAll('.service-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      if (sidebar) sidebar.classList.remove('open');
      if (sidebarOverlay) sidebarOverlay.classList.remove('active');
      handleQuickReply(tag.textContent.trim());
    });
  });

  // Sidebar toggle (mobile)
  if (infoToggle) {
    infoToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      sidebarOverlay.classList.toggle('active');
    });
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('active');
    });
  }

  // ---- Welcome Message on Load ----
  async function init() {
    await botReply(
      `¡Hola! 👋 Bienvenido(a) a <strong>${escapeHtml(OFFICE.name)}</strong>. Soy el asistente virtual de la <strong>${escapeHtml(OFFICE.doctor)}</strong>, tu coordinador virtual y estoy aquí para ayudarte.`,
      { html: true, delay: 800 }
    );
    await botReply(
      '¿En qué puedo asistirte hoy?',
      {
        delay: 500,
        quickReplies: [
          { label: '📅 Agendar cita', value: 'agendar' },
          { label: '🕐 Horarios', value: 'horarios' },
          { label: '📍 Ubicación', value: 'ubicacion' },
          { label: '🦷 Servicios', value: 'servicios' },
        ],
      }
    );
  }

  init();
})();

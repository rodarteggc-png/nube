// ============================================
//  Nube Dental Clinic — Conversation Engine
// ============================================

(function () {
  'use strict';

  // ---- Office Data ----
  const OFFICE = {
    name: 'Nube Dental Clinic',
    doctor: 'Dra. Rosa Avila',
    location: 'Distrito Domo, Santa Catarina',
    emergencyPhone: '[Línea de emergencia no disponible aún]',
    hours: {
      weekdays: 'Lunes a Viernes de 10:00 AM a 7:00 PM',
      saturday: 'Sábados de 10:00 AM a 2:00 PM',
      sunday: 'Domingos solo con cita previa',
    },
    services: [
      'Limpieza dental', 'Blanqueamiento', 'Ortodoncia',
      'Endodoncia', 'Implantes', 'Valoración General',
    ],
  };

  // ---- Service Descriptions ----
  const SERVICE_DESCRIPTIONS = {
    'Limpieza dental': {
      emoji: '🪥',
      desc: 'Una experiencia de limpieza profunda que devuelve el brillo natural a tu sonrisa. Utilizamos tecnología de última generación para remover depósitos y dejar tus dientes impecables, protegiendo tu salud bucal a largo plazo.',
    },
    'Blanqueamiento': {
      emoji: '✨',
      desc: 'Transforma tu sonrisa con nuestro blanqueamiento de alta estética. Logramos resultados visibles y naturales desde la primera sesión, usando los mejores materiales del mercado para que tu sonrisa luzca luminosa y radiante sin comprometer la salud de tu esmalte.',
    },
    'Ortodoncia': {
      emoji: '😁',
      desc: 'Alineamos tu sonrisa con soluciones modernas y estéticas — desde brackets de última generación hasta alineadores casi invisibles. El resultado: dientes perfectamente alineados, una mordida funcional y una imagen que refleja confianza.',
    },
    'Endodoncia': {
      emoji: '🦷',
      desc: 'Salvamos tu diente con técnicas avanzadas y mínimamente invasivas. Nuestro enfoque prioriza tu comodidad y la preservación de tu pieza dental natural, utilizando materiales biocompatibles de alta calidad para resultados duraderos.',
    },
    'Implantes': {
      emoji: '🌟',
      desc: 'Restauramos tu sonrisa con implantes de aspecto completamente natural, fabricados con los mejores materiales de la odontología moderna. Integran a la perfección con tus dientes naturales en color, forma y textura — una solución definitiva, estética y de alta durabilidad.',
    },
    'Valoración General': {
      emoji: '🩺',
      desc: 'Tu punto de partida hacia una sonrisa saludable y estética. La Dra. Rosa Avila realiza un diagnóstico integral personalizado, identificando oportunidades de mejora y diseñando un plan de tratamiento a tu medida con los estándares más altos de la odontología actual.',
    },
  };

  // Simulated available time slots
  const AVAILABLE_SLOTS = {
    'mañana': [
      { day: 'Lunes', time: '10:00 AM' },
      { day: 'Lunes', time: '11:30 AM' },
      { day: 'Martes', time: '10:00 AM' },
      { day: 'Miércoles', time: '11:00 AM' },
      { day: 'Jueves', time: '10:30 AM' },
    ],
    'tarde': [
      { day: 'Lunes', time: '3:00 PM' },
      { day: 'Martes', time: '4:30 PM' },
      { day: 'Miércoles', time: '2:00 PM' },
      { day: 'Jueves', time: '5:00 PM' },
      { day: 'Viernes', time: '3:30 PM' },
    ],
  };

  // ---- State Machine ----
  const State = {
    IDLE: 'IDLE',
    COLLECTING_SERVICE: 'COLLECTING_SERVICE',
    COLLECTING_SCHEDULE: 'COLLECTING_SCHEDULE',
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
      'limpieza': 'Limpieza dental',
      'blanqueamiento': 'Blanqueamiento',
      'ortodoncia': 'Ortodoncia',
      'endodoncia': 'Endodoncia',
      'implante': 'Implantes',
      'valoracion': 'Valoración General',
      'general': 'Valoración General',
      'revision': 'Valoración General',
      'chequeo': 'Valoración General',
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

  // ---- Match slot selection ----
  function matchSlot(text, slots) {
    const lower = text.toLowerCase();
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (lower.trim() === String(i + 1)) return slot;
      if (lower.includes(slot.day.toLowerCase()) && lower.includes(slot.time.toLowerCase())) return slot;
      if (lower === `${slot.day} - ${slot.time}`.toLowerCase()) return slot;
    }
    return null;
  }

  // ---- Validation ----
  function isValidPhone(text) {
    const digits = text.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
  }

  function isValidName(text) {
    const words = text.trim().split(/\s+/);
    return words.length >= 2 && words.every(w => w.length >= 2);
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

    // State-based handling
    switch (currentState) {
      case State.IDLE: await handleIdleState(text, intent); break;
      case State.COLLECTING_SERVICE: await handleCollectingService(text); break;
      case State.COLLECTING_SCHEDULE: await handleCollectingSchedule(text); break;
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
          'Para cancelar tu cita, por favor comunícate directamente con nosotros por teléfono para que podamos verificar tu reservación y procesarla correctamente. ¿Hay algo más en lo que pueda ayudarte?',
          { quickReplies: [{ label: '📅 Agendar nueva cita', value: 'agendar' }, { label: 'No, gracias', value: 'no_gracias' }] }
        );
        break;
      case 'reschedule':
        await botReply(
          'Para reprogramar tu cita existente, necesitamos verificar tu reservación. Por favor comunícate por teléfono para que podamos ayudarte con el cambio. ¿O prefieres agendar una cita completamente nueva?',
          { quickReplies: [{ label: '📅 Agendar nueva cita', value: 'agendar' }, { label: 'No, gracias', value: 'no_gracias' }] }
        );
        break;
      case 'hours':
        await botReply(
          `<p>Nuestros horarios de atención son:</p>
          <ul>
            <li><strong>Lunes a Viernes:</strong> 10:00 AM – 7:00 PM</li>
            <li><strong>Sábados:</strong> 10:00 AM – 2:00 PM</li>
            <li><strong>Domingos:</strong> Solo con cita previa</li>
          </ul>
          <p>¿Te gustaría agendar una cita?</p>`,
          { html: true, quickReplies: [{ label: '📅 Sí, agendar cita', value: 'agendar' }, { label: 'No, gracias', value: 'no_gracias' }] }
        );
        break;
      case 'location':
        await botReply(
          `<p>📍 Nos encontramos en <strong>Distrito Domo, Santa Catarina</strong>.</p><p><a href="https://maps.app.goo.gl/e43jZg8zW8yDDQ6S6" target="_blank" rel="noopener noreferrer">📌 Ver ubicación en Google Maps</a></p><p>¿Necesitas algo más?</p>`,
          { html: true, quickReplies: [{ label: '📅 Agendar cita', value: 'agendar' }, { label: '🕐 Ver horarios', value: 'horarios' }] }
        );
        break;
      case 'services': {
        const servicesList = OFFICE.services.map(s => `<li>${s}</li>`).join('');
        await botReply(
          `<p>En Nube Dental Clinic ofrecemos los siguientes servicios:</p><ul>${servicesList}</ul><p>¿Te gustaría agendar una cita para alguno de estos servicios?</p>`,
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
        // Check if user typed a service name directly
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

  async function startAppointmentFlow(text) {
    appointmentData = {};
    const service = matchService(text);
    if (service) {
      appointmentData.service = service;
      currentState = State.COLLECTING_SCHEDULE;
      await botReply(
        `¡Perfecto! Agendaremos una cita para <strong>${service}</strong>. ¿Prefieres un horario por la mañana o por la tarde?`,
        { html: true, quickReplies: [{ label: '🌅 Mañana', value: 'mañana' }, { label: '🌆 Tarde', value: 'tarde' }] }
      );
    } else {
      currentState = State.COLLECTING_SERVICE;
      await botReply(
        'Con mucho gusto te ayudaré a agendar tu cita. ¿Qué servicio necesitas?',
        { quickReplies: OFFICE.services.map(s => ({ label: s, value: s.toLowerCase() })) }
      );
    }
  }

  async function handleCollectingService(text) {
    const service = matchService(text);
    const directMatch = OFFICE.services.find(s => s.toLowerCase() === text.toLowerCase());
    if (service || directMatch) {
      appointmentData.service = service || directMatch;
      currentState = State.COLLECTING_SCHEDULE;
      await botReply(
        'Excelente elección. ¿Prefieres un horario por la <strong>mañana</strong> o por la <strong>tarde</strong>?',
        { html: true, quickReplies: [{ label: '🌅 Mañana (10:00 AM – 1:00 PM)', value: 'mañana' }, { label: '🌆 Tarde (2:00 PM – 7:00 PM)', value: 'tarde' }] }
      );
    } else {
      await botReply(
        'No pude identificar el servicio. Por favor selecciona uno de los siguientes:',
        { quickReplies: OFFICE.services.map(s => ({ label: s, value: s.toLowerCase() })) }
      );
    }
  }

  async function handleCollectingSchedule(text) {
    const schedule = matchSchedule(text);
    if (schedule) {
      appointmentData.schedule = schedule;
      appointmentData.availableSlots = AVAILABLE_SLOTS[schedule];
      currentState = State.OFFERING_SLOTS;
      const slotsHtml = appointmentData.availableSlots
        .map((slot, i) => `<li><strong>${i + 1}.</strong> ${slot.day} – ${slot.time}</li>`)
        .join('');
      await botReply(
        `<p>Estos son los horarios disponibles por la <strong>${schedule}</strong>:</p><ul>${slotsHtml}</ul><p>¿Cuál prefieres?</p>`,
        { html: true, quickReplies: appointmentData.availableSlots.map(s => ({ label: `${s.day} - ${s.time}`, value: `${s.day} - ${s.time}` })) }
      );
    } else {
      await botReply(
        'Por favor indica si prefieres un horario por la mañana o por la tarde.',
        { quickReplies: [{ label: '🌅 Mañana', value: 'mañana' }, { label: '🌆 Tarde', value: 'tarde' }] }
      );
    }
  }

  async function handleOfferingSlots(text) {
    const slot = matchSlot(text, appointmentData.availableSlots);
    if (slot) {
      appointmentData.selectedSlot = slot;
      currentState = State.COLLECTING_NAME;
      await botReply(
        `Perfecto, reservaremos el <strong>${slot.day}</strong> a las <strong>${slot.time}</strong>. Ahora necesito algunos datos. ¿Cuál es tu nombre completo?`,
        { html: true }
      );
    } else {
      await botReply(
        'No pude identificar el horario seleccionado. Por favor elige uno de la lista o escribe el número correspondiente.',
        { quickReplies: appointmentData.availableSlots.map(s => ({ label: `${s.day} - ${s.time}`, value: `${s.day} - ${s.time}` })) }
      );
    }
  }

  async function handleCollectingName(text) {
    if (isValidName(text)) {
      appointmentData.name = text.trim();
      currentState = State.COLLECTING_PHONE;
      await botReply(
        `Gracias, <strong>${appointmentData.name}</strong>. ¿Cuál es tu número de teléfono de contacto?`,
        { html: true }
      );
    } else {
      await botReply('Por favor proporciona tu nombre completo (nombre y apellido). Por ejemplo: María García López.');
    }
  }

  async function handleCollectingPhone(text) {
    if (isValidPhone(text)) {
      appointmentData.phone = text.trim();
      currentState = State.CONFIRMING;
      const summaryHtml = `
        <p>Estos son los datos de tu cita. Por favor confirma que todo esté correcto:</p>
        <div class="summary-card">
          <h4>📋 Resumen de Cita</h4>
          <p>🦷 <strong>Servicio:</strong> ${appointmentData.service}</p>
          <p>📅 <strong>Día:</strong> ${appointmentData.selectedSlot.day}</p>
          <p>🕐 <strong>Hora:</strong> ${appointmentData.selectedSlot.time}</p>
          <p>👤 <strong>Paciente:</strong> ${appointmentData.name}</p>
          <p>📞 <strong>Teléfono:</strong> ${appointmentData.phone}</p>
        </div>
        <p>¿Es correcta esta información?</p>`;
      await botReply(summaryHtml, {
        html: true,
        quickReplies: [
          { label: '✅ Sí, confirmar cita', value: 'confirmar' },
          { label: '❌ No, corregir datos', value: 'corregir' },
        ],
      });
    } else {
      await botReply('El número de teléfono no parece válido. Por favor ingresa un número con al menos 7 dígitos. Ejemplo: 81 1234 5678');
    }
  }

  // ---- Google Calendar URL Generator ----
  function generateCalendarUrl(data) {
    const dayMap = {
      'Lunes': 1, 'Martes': 2, 'Mi\u00e9rcoles': 3,
      'Jueves': 4, 'Viernes': 5, 'S\u00e1bado': 6, 'Domingo': 0,
    };

    // Parse time (e.g. "5:00 PM" or "10:30 AM")
    const timeStr = data.selectedSlot.time;
    const [timePart, meridiem] = timeStr.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    // Find next occurrence of the target weekday
    const targetDay = dayMap[data.selectedSlot.day];
    const now = new Date();
    const todayDay = now.getDay();
    let daysAhead = targetDay - todayDay;
    if (daysAhead <= 0) daysAhead += 7;
    const eventDate = new Date(now);
    eventDate.setDate(now.getDate() + daysAhead);
    eventDate.setHours(hours, minutes, 0, 0);

    // End time: 1 hour after start
    const endDate = new Date(eventDate.getTime() + 60 * 60 * 1000);

    // Format: YYYYMMDDTHHmmss
    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0];

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `Cita Dental - ${data.service} | Nube Dental Clinic`,
      dates: `${fmt(eventDate)}/${fmt(endDate)}`,
      details: `Paciente: ${data.name}\nTel\u00e9fono: ${data.phone}\nServicio: ${data.service}\n\nNube Dental Clinic - Dra. Rosa Avila`,
      location: 'Distrito Domo, Santa Catarina',
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  async function handleConfirming(text, intent) {
    if (intent === 'confirm' || text.toLowerCase().includes('confirmar') || text.toLowerCase().includes('si') || text.toLowerCase().includes('sí')) {
      currentState = State.IDLE;
      const calendarUrl = generateCalendarUrl(appointmentData);
      await botReply(
        `<p>🎉 <strong>¡Tu cita ha sido agendada exitosamente!</strong></p>
        <div class="summary-card">
          <h4>✅ Cita Confirmada</h4>
          <p>🦷 ${appointmentData.service}</p>
          <p>📅 ${appointmentData.selectedSlot.day} a las ${appointmentData.selectedSlot.time}</p>
          <p>📍 <a href="https://maps.app.goo.gl/e43jZg8zW8yDDQ6S6" target="_blank" rel="noopener noreferrer">Distrito Domo, Santa Catarina</a></p>
        </div>
        <p>📅 <a href="${calendarUrl}" target="_blank" rel="noopener noreferrer" class="gcal-btn">Agregar a Google Calendar</a></p>
        <p>Te esperamos en <strong>Nube Dental Clinic</strong>. Si necesitas cancelar o reprogramar, no dudes en contactarnos. ¡Que tengas un excelente día! 😊</p>`,
        { html: true }
      );
      appointmentData = {};
    } else if (intent === 'deny' || text.toLowerCase().includes('corregir') || text.toLowerCase().includes('no')) {
      currentState = State.COLLECTING_SERVICE;
      appointmentData = {};
      await botReply(
        'Sin problema. Comencemos de nuevo. ¿Qué servicio te gustaría agendar?',
        { quickReplies: OFFICE.services.map(s => ({ label: s, value: s.toLowerCase() })) }
      );
    } else {
      await botReply(
        'Por favor confirma si los datos son correctos o si deseas corregir algo.',
        { quickReplies: [{ label: '✅ Sí, confirmar', value: 'confirmar' }, { label: '❌ No, corregir', value: 'corregir' }] }
      );
    }
  }

  // ---- Quick Reply Handler ----
  async function handleQuickReply(value) {
    const lower = value.toLowerCase();

    if (lower === 'agendar' || lower === 'agendar_valoracion') {
      addMessage(value === 'agendar_valoracion' ? 'Sí, agendar valoración' : 'Agendar cita', 'user');
      clearQuickReplies();
      if (value === 'agendar_valoracion') {
        appointmentData = { service: 'Valoración General' };
        currentState = State.COLLECTING_SCHEDULE;
        await botReply(
          'Agendaremos una <strong>Valoración General</strong> para que nuestro dentista pueda evaluarte. ¿Prefieres un horario por la mañana o por la tarde?',
          { html: true, quickReplies: [{ label: '🌅 Mañana', value: 'mañana' }, { label: '🌆 Tarde', value: 'tarde' }] }
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
      await handleIdleState('', 'hours');
      return;
    }

    if (lower === 'ubicacion') {
      addMessage('Ubicación', 'user');
      clearQuickReplies();
      currentState = State.IDLE;
      await handleIdleState('', 'location');
      return;
    }

    if (lower === 'servicios') {
      addMessage('Servicios', 'user');
      clearQuickReplies();
      currentState = State.IDLE;
      await handleIdleState('', 'services');
      return;
    }

    if (lower === 'no_gracias' || lower === 'no gracias') {
      addMessage('No, gracias', 'user');
      clearQuickReplies();
      await botReply('¡Perfecto! Si necesitas algo en el futuro, no dudes en escribirnos. ¡Que tengas un excelente día! 😊');
      return;
    }

    if (lower === 'confirmar') { handleUserMessage('Sí, confirmar'); return; }
    if (lower === 'corregir') { handleUserMessage('No, corregir'); return; }

    // Service selection from quick reply buttons
    const matchedService = OFFICE.services.find(s => s.toLowerCase() === lower);
    if (matchedService) {
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
      appointmentData = { service: serviceName };
      currentState = State.COLLECTING_SCHEDULE;
      await botReply(
        `Perfecto, agendaremos una cita para <strong>${serviceName}</strong>. ¿Prefieres un horario por la mañana o por la tarde?`,
        { html: true, quickReplies: [{ label: '🌅 Mañana', value: 'mañana' }, { label: '🌆 Tarde', value: 'tarde' }] }
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
      '¡Hola! 👋 Bienvenido(a) a <strong>Nube Dental Clinic</strong>. Soy el asistente virtual de la <strong>Dra. Rosa Avila</strong>, tu coordinador virtual y estoy aquí para ayudarte.',
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

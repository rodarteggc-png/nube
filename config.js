/**
 * =====================================================================
 *  AsistDental — Configuración Modular de Clínicas y Doctores
 * =====================================================================
 *  Este archivo desacopla la lógica del asistente del consultorio o doctor.
 *  Para agregar o cambiar de doctor en el futuro, solo edita este archivo.
 */

(function () {
  'use strict';

  // Perfil oficial de la Dra. Rosa Ávila (Predeterminado)
  const PROFILE_DRA_ROSA = {
    id: 'rosa_avila',
    clinicName: 'Nube Dental Clinic',
    doctorName: 'Dra. Rosa Ávila | Cirujano Dentista',
    slogan: 'Tu sonrisa, nuestra prioridad ♡',
    location: 'Av. Manuel Ordoñez 801 Local 11, Santa Catarina, N.L.',
    mapsUrl: 'https://maps.app.goo.gl/e43jZg8zW8yDDQ6S6',
    whatsapp: '528112219911',
    emergencyPhone: '81 1221 9911',
    email: 'dra.avilaodontologia@gmail.com',
    hours: {
      weekdays: 'Lunes a Viernes (Solo bajo cita previa)',
      saturday: 'Sábados (Solo bajo cita previa)',
      sunday: 'Domingos (Solo bajo cita previa)',
      label: 'Atención de Lunes a Domingo — Solo bajo citas',
    },
    services: [
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
    serviceDescriptions: {
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
    },
    shiftHours: {
      'mañana': ['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM'],
      'tarde': ['3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'],
    },
  };

  // Directorio de perfiles (preparado para multi-doctor en el futuro)
  const DOCTOR_PROFILES = {
    'rosa': PROFILE_DRA_ROSA,
    'rosa_avila': PROFILE_DRA_ROSA,
    'default': PROFILE_DRA_ROSA,
  };

  // Detección automática por URL (?doc=rosa o ?doctor=...)
  const params = new URLSearchParams(window.location.search);
  const docKey = (params.get('doc') || params.get('doctor') || 'default').toLowerCase();
  const selectedConfig = DOCTOR_PROFILES[docKey] || DOCTOR_PROFILES['default'];

  // Exponer globalmente para la aplicación
  window.ASIST_DENTAL_CONFIG = selectedConfig;
})();

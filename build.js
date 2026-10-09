import fs from 'fs';
import path from 'path';

const docId = process.env.DOCTOR_ID || 'rosy';
console.log(`[Build] Construyendo página para el Doctor ID: ${docId}`);

const dbPath = path.resolve('./doctors_db.json');
const rawData = fs.readFileSync(dbPath, 'utf8');
const doctorsDB = JSON.parse(rawData);

// 3. Extraer SOLAMENTE la configuración del doctor seleccionado
const selectedConfig = doctorsDB[docId];

if (!selectedConfig) {
  console.error(`[Error] No se encontró el doctor con ID "${docId}" en doctors_db.json`);
  process.exit(1); // Detener el despliegue si el ID es incorrecto
}

// 4. Sobrescribir el archivo config.js con ÚNICAMENTE los datos de este doctor
const finalConfigContent = `
/**
 * ARCHIVO GENERADO AUTOMÁTICAMENTE EN VERCEL
 * Contiene únicamente los datos del doctor: ${docId}
 * Privacidad asegurada: No incluye datos de otros doctores.
 */
window.ASIST_DENTAL_CONFIG = ${JSON.stringify(selectedConfig, null, 2)};
`;

fs.writeFileSync(path.resolve('./config.js'), finalConfigContent.trim());

console.log(`[Build] config.js generado exitosamente. Privacidad protegida.`);

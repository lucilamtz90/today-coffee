// ── Today Coffee · Color Library · Apps Script ──
// Pega este código en script.google.com y despliega como Web App.
// Instrucciones al final del archivo.

const SPREADSHEET_ID = '1urE3mAzqIy7yquAEn0yyPjywPSWR9UpD5QVVDIMg4s8';
const SHEET_NAME     = 'Respuestas';

function doPost(e) {
  try {
    const data  = JSON.parse(e.postData.contents);
    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    let   sheet = ss.getSheetByName(SHEET_NAME);

    // Crear hoja y encabezados si no existe
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      const headers = [
        'Fecha', 'Hora', 'Session ID', 'Paleta',
        'Nombre', 'Comentario', 'Estrellas',
        'Colores favoritos', 'Colores no favoritos'
      ];
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setValues([headers]);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#F5F0E8');
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(6, 320); // Comentario más ancho
    }

    const now = new Date();
    const tz  = 'America/Mexico_City';

    sheet.appendRow([
      Utilities.formatDate(now, tz, 'dd/MM/yyyy'),
      Utilities.formatDate(now, tz, 'HH:mm:ss'),
      data.sessionId  || '',
      data.palette    || '',
      data.name       || 'Anónimo',
      data.comment    || '',
      data.rating     ? `${data.rating}/5` : '',
      data.votesUp    || '',
      data.votesDown  || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Necesario para que CORS funcione correctamente
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/*
── INSTRUCCIONES DE DESPLIEGUE ──────────────────────────────────

1. Ve a https://script.google.com
2. Clic en "Nuevo proyecto"
3. Borra el código de ejemplo y pega TODO este archivo
4. Guarda (Cmd+S) con el nombre "Today Coffee – Sheets"
5. Clic en "Implementar" → "Nueva implementación"
6. Tipo: "Aplicación web"
7. Configuración:
     Ejecutar como:        Yo (tu cuenta de Google)
     Quién tiene acceso:   Cualquier persona
8. Clic en "Implementar"
9. Autoriza los permisos cuando te lo pida
10. Copia la URL que aparece ("URL de la aplicación web")
11. Mándame esa URL y yo la conecto al HTML

──────────────────────────────────────────────────────────────── */

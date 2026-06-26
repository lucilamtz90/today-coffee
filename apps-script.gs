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
        'Fecha', 'Hora', 'Session ID', 'Envío #',
        'Paleta', 'Estrellas', 'Colores favoritos',
        'Colores no favoritos', 'Comentarios'
      ];
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setValues([headers]);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#F5F0E8');
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(5, 160); // Paleta
      sheet.setColumnWidth(7, 200); // Colores favoritos
      sheet.setColumnWidth(8, 200); // Colores no favoritos
      sheet.setColumnWidth(9, 360); // Comentarios
    }

    if (data.type === 'full_evaluation' && Array.isArray(data.palettes)) {
      const now = new Date();
      const tz  = 'America/Mexico_City';
      const fecha = Utilities.formatDate(now, tz, 'dd/MM/yyyy');
      const hora  = Utilities.formatDate(now, tz, 'HH:mm:ss');

      data.palettes.forEach(p => {
        sheet.appendRow([
          fecha,
          hora,
          data.sessionId        || '',
          data.submissionNumber || 1,
          p.name                || '',
          p.rating              ? `${p.rating}/5` : '',
          p.votesUp             || '',
          p.votesDown           || '',
          p.comments            || ''
        ]);
      });
    }

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

1. Ve a https://script.google.com y abre el proyecto existente
   (o crea uno nuevo y pega todo este código)
2. Guarda con Cmd+S
3. Clic en "Implementar" → "Administrar implementaciones"
4. En tu implementación activa, clic en el lápiz (editar)
5. Cambia la versión a "Nueva versión"
6. Clic en "Implementar"
   (La URL del endpoint NO cambia — no necesitas actualizar el HTML)

──────────────────────────────────────────────────────────────── */

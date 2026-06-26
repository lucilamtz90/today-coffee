// ── Today Coffee · Color Library · Apps Script ──
// Pega este código en script.google.com y despliega como Web App.
// Instrucciones al final del archivo.

const SPREADSHEET_ID = '1urE3mAzqIy7yquAEn0yyPjywPSWR9UpD5QVVDIMg4s8';
const SHEET_NAME     = 'Respuestas';
const HEADERS        = ['Fecha','Hora','Session ID','Envío #','Paleta','Estrellas','Me gusta','No me gusta','Comentarios'];

// ── Verifica y corrige encabezados ──
// Si la hoja tiene encabezados incorrectos (ej. sin "Envío #" en columna 4),
// limpia todo y recrea los encabezados correctos.
function ensureHeaders(sheet) {
  const lastRow = sheet.getLastRow();
  const col4Val = lastRow > 0 ? sheet.getRange(1, 4).getValue() : '';

  if (col4Val !== 'Envío #') {
    sheet.clearContents();
    writeHeaders(sheet);
  }
}

function writeHeaders(sheet) {
  const range = sheet.getRange(1, 1, 1, HEADERS.length);
  range.setValues([HEADERS]);
  range.setFontWeight('bold');
  range.setBackground('#F5F0E8');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(3, 170); // Session ID
  sheet.setColumnWidth(5, 170); // Paleta
  sheet.setColumnWidth(7, 210); // Me gusta
  sheet.setColumnWidth(8, 210); // No me gusta
  sheet.setColumnWidth(9, 380); // Comentarios
}

function doPost(e) {
  try {
    const data  = JSON.parse(e.postData.contents);
    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    let   sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      writeHeaders(sheet);
    } else {
      ensureHeaders(sheet);
    }

    if (data.type === 'full_evaluation' && Array.isArray(data.palettes) && data.palettes.length > 0) {
      const now   = new Date();
      const tz    = 'America/Mexico_City';
      const fecha = Utilities.formatDate(now, tz, 'dd/MM/yyyy');
      const hora  = Utilities.formatDate(now, tz, 'HH:mm:ss');

      data.palettes.forEach(p => {
        sheet.appendRow([
          fecha,
          hora,
          data.sessionId        || '',
          data.submissionNumber || '',
          p.paletteName         || '',
          p.rating              || '',  // e.g. "4.0"
          p.votesUp             || '',
          p.votesDown           || '',
          p.comments            || ''
        ]);
      });

      // Fila en blanco como separador entre sesiones
      sheet.appendRow(new Array(HEADERS.length).fill(''));
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

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/*
── INSTRUCCIONES DE DESPLIEGUE ──────────────────────────────────

1. Ve a https://script.google.com y abre el proyecto existente
2. Reemplaza TODO el código con este archivo
3. Guarda con Cmd+S
4. Clic en "Implementar" → "Administrar implementaciones"
5. En tu implementación activa, clic en el lápiz (editar)
6. Cambia la versión a "Nueva versión"
7. Clic en "Implementar"
   (La URL del endpoint NO cambia — no necesitas actualizar el HTML)

NOTA: Al recibir el próximo envío, el script detectará que la hoja tiene
encabezados incorrectos y la limpiará automáticamente para empezar limpio.

──────────────────────────────────────────────────────────────── */

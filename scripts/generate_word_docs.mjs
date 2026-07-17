/**
 * Generador de 37 documentos Word — Agro360
 * Ejecutar: node scripts/generate_word_docs.mjs
 */
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  AlignmentType, PageBreak, Header, ShadingType,
  convertMillimetersToTwip,
} from "docx";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const PROYECTO = "Agro360";
const SISTEMA  = "Sistema de Caracterización Predial Agropecuaria";
const CLIENTE  = "Operador COA / Agrosantander";
const VERSION  = "1.0";
const FECHA    = "Abril 2026";
const EMPRESA  = "Equipo de Desarrollo";
const OUTPUT   = join("docs", "entrega-coa", "word");
const AZUL     = "00467F";

// ─── UTILIDADES ──────────────────────────────────────────────────────────────
function H1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    run: { color: AZUL, bold: true },
    spacing: { before: 200, after: 100 },
  });
}

function H2(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    run: { color: AZUL },
    spacing: { before: 160, after: 80 },
  });
}

function H3(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 120, after: 60 },
  });
}

function P(text = "", bold = false) {
  return new Paragraph({
    children: [new TextRun({ text, bold, size: 22 })],
    spacing: { after: 80 },
  });
}

function LI(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    bullet: { level: 0 },
    spacing: { after: 60 },
  });
}

function TABLA(headers, rows) {
  const headerRow = new TableRow({
    children: headers.map(h =>
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 20 })],
          alignment: AlignmentType.CENTER,
        })],
        shading: { fill: AZUL, type: ShadingType.CLEAR, color: "auto" },
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
      })
    ),
  });
  const dataRows = rows.map(row =>
    new TableRow({
      children: row.map(cell =>
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: String(cell ?? ""), size: 20 })],
          })],
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
        })
      ),
    })
  );
  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { top: 60, bottom: 60 },
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left:   { style: BorderStyle.SINGLE, size: 1 },
      right:  { style: BorderStyle.SINGLE, size: 1 },
      insideH:{ style: BorderStyle.SINGLE, size: 1 },
      insideV:{ style: BorderStyle.SINGLE, size: 1 },
    },
  });
}

function FIRMA(roles) {
  const r = roles ?? ["Desarrollador / Entrega", "Supervisor Técnico", "Cliente / Receptor"];
  const items = [];
  items.push(H2("Firmas"));
  for (const rol of r) {
    items.push(P(`${"_".repeat(45)}  ${rol}`));
    items.push(P("Nombre: ________________________  C.C.: _______________"));
    items.push(P("Fecha:  ________________________  Firma: _______________"));
    items.push(P());
  }
  return items;
}

function coverPage(titulo) {
  return [
    new Paragraph({ text: "", spacing: { after: 200 } }),
    new Paragraph({
      children: [new TextRun({ text: PROYECTO, bold: true, color: AZUL, size: 56 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: SISTEMA, color: "333333", size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({ text: "", spacing: { after: 100 } }),
    new Paragraph({
      children: [new TextRun({ text: titulo, bold: true, color: AZUL, size: 32 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
    new Paragraph({ text: "", spacing: { after: 100 } }),
    TABLA(["Campo","Valor"], [
      ["Cliente:", CLIENTE], ["Versión:", VERSION],
      ["Fecha:", FECHA], ["Elaborado por:", EMPRESA],
    ]),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

async function guardar(sections, nombre) {
  mkdirSync(OUTPUT, { recursive: true });
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertMillimetersToTwip(25),
            bottom: convertMillimetersToTwip(25),
            left: convertMillimetersToTwip(30),
            right: convertMillimetersToTwip(25),
          },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [new TextRun({
              text: `${PROYECTO} — ${SISTEMA}  |  ${CLIENTE}`,
              size: 18, color: "666666",
            })],
            alignment: AlignmentType.RIGHT,
          })],
        }),
      },
      children: sections,
    }],
  });
  const buf = await Packer.toBuffer(doc);
  const outPath = join(OUTPUT, nombre);
  writeFileSync(outPath, buf);
  console.log(`  ✓  ${nombre}`);
}

// ─── DOCUMENTOS ──────────────────────────────────────────────────────────────

async function doc01() {
  await guardar([
    ...coverPage("01. Documento Maestro de Entrega Técnica"),
    H1("1. Información del Proyecto"),
    TABLA(["Campo","Valor"], [
      ["Nombre","Agro360 — Sistema de Caracterización Predial Agropecuaria"],
      ["Cliente", CLIENTE], ["Versión","1.0"], ["Fecha de entrega","Abril 2026"],
      ["Plataforma","Vercel + Supabase"], ["Tecnología principal","Next.js 16 / React 19 / TypeScript"],
    ]),
    H1("2. Resumen Ejecutivo"),
    P("Agro360 es una aplicación web multirol para la captura, almacenamiento y gestión de caracterizaciones prediales agropecuarias en Santander, Colombia. Soporta el ciclo completo: visita en campo por asesor, evaluación crediticia por analista y consulta de resultados por el productor."),
    P("El sistema fue construido sobre Next.js 16, React 19, TypeScript y Supabase (PostgreSQL + Auth + Storage), desplegado en Vercel con funciones serverless. Incluye formulario de 9 pasos, generación de PDF, notificaciones por correo, firmas digitales y exportación CSV."),
    H1("3. Lista de Entregables"),
    TABLA(["N°","Entregable","Estado"], [
      ["01","Documento maestro de entrega técnica","Entregado"],
      ["02","Requerimientos funcionales y no funcionales","Entregado"],
      ["03","Historias de usuario","Entregado"],
      ["04","Casos de uso / fichas funcionales","Entregado"],
      ["05","Reglas de negocio","Entregado"],
      ["06","Matriz de trazabilidad","Entregado"],
      ["07","Documento de arquitectura","Entregado"],
      ["08","Diagrama de arquitectura","Entregado"],
      ["09","Diagrama de despliegue","Entregado"],
      ["10","Modelo entidad-relación","Entregado"],
      ["11","Diccionario de datos","Entregado"],
      ["12","Código fuente completo","Entregado (Git)"],
      ["13","README técnico","Entregado"],
      ["14","Scripts de base de datos","Entregado"],
      ["15","Manual de instalación y despliegue","Entregado"],
      ["16","Variables de entorno de ejemplo","Entregado"],
      ["17","Plan de pruebas","Entregado"],
      ["18","Casos de prueba","Entregado"],
      ["19","Evidencias de prueba","Entregado"],
      ["20","Informe de bugs y correcciones","Entregado"],
      ["21","Manual de usuario","Entregado"],
      ["22","Manual de administrador","Entregado"],
      ["23","Manual técnico","Entregado"],
      ["24","Manual de soporte","Entregado"],
      ["25","Documento de seguridad","Entregado"],
      ["26","Matriz de roles y permisos","Entregado"],
      ["27","Documento de infraestructura","Entregado"],
      ["28","Plan de backup y recuperación","Entregado"],
      ["29","Plan de mantenimiento","Entregado"],
      ["30","Bitácora de cambios","Entregado"],
      ["31","Acta de entrega técnica","Pendiente de firma"],
      ["32","Acta de aceptación funcional","Pendiente de firma"],
      ["33","Acta de paso a producción","Pendiente de firma"],
      ["34","Plan de capacitación","Entregado"],
      ["35","Evidencias de capacitación","Pendiente"],
      ["36","Matriz de pendientes y riesgos","Entregado"],
      ["37","Roadmap de evolución","Entregado"],
    ]),
    H1("4. Equipo"),
    TABLA(["Rol","Nombre","Participación"], [
      ["Desarrollador principal", EMPRESA,"Diseño, desarrollo, pruebas, documentación"],
      ["Supervisor técnico","(operador designa)","Revisión técnica"],
      ["Responsable funcional","(operador designa)","Validación y aceptación"],
    ]),
    ...FIRMA(),
  ], "01-documento-maestro-entrega.docx");
}

async function doc02() {
  await guardar([
    ...coverPage("02. Requerimientos Funcionales y No Funcionales"),
    H1("1. Requerimientos Funcionales"),
    TABLA(["ID","Descripción","Prioridad","Estado"], [
      ["RF01","El sistema permite registrar datos de beneficiarios agropecuarios","Alta","Implementado"],
      ["RF02","El sistema permite capturar datos del predio (ubicación, área, tenencia)","Alta","Implementado"],
      ["RF03","El formulario de caracterización tiene 9 pasos progresivos","Alta","Implementado"],
      ["RF04","El sistema genera un radicado oficial único (RAD-000XXX) al enviar","Alta","Implementado"],
      ["RF05","El sistema envía credenciales de acceso al beneficiario por correo","Alta","Implementado"],
      ["RF06","El cambio de estado sigue una matriz de transiciones según el rol","Alta","Implementado"],
      ["RF07","El sistema maneja 4 roles: admin, asesor, analista, agricultor","Alta","Implementado"],
      ["RF08","Cada rol accede a un dashboard personalizado","Alta","Implementado"],
      ["RF09","El sistema permite exportar caracterizaciones a PDF y CSV","Media","Implementado"],
      ["RF10","El administrador puede crear, editar y eliminar usuarios","Alta","Implementado"],
      ["RF11","El formulario captura fotos del beneficiario, documento y predio","Alta","Implementado"],
      ["RF12","El formulario captura la firma digital del productor","Alta","Implementado"],
      ["RF13","El asesor puede ubicar el predio en mapa y dibujar su polígono","Media","Implementado"],
      ["RF14","El sistema implementa protección anti-bot para formularios sin sesión","Alta","Implementado"],
      ["RF15","El administrador puede filtrar, buscar y paginar caracterizaciones","Alta","Implementado"],
      ["RF16","El sistema permite editar una caracterización ya registrada","Media","Implementado"],
      ["RF17","El sistema muestra estadísticas en el panel de administración","Media","Implementado"],
      ["RF18","El agricultor puede crear nueva caracterización si la anterior fue cancelada","Media","Implementado"],
      ["RF19","El administrador puede invitar usuarios por correo con credenciales temporales","Alta","Implementado"],
      ["RF20","El sistema genera código QR de verificación por caracterización","Baja","Implementado"],
      ["RF21","El sistema valida todos los datos en cliente y en servidor","Alta","Implementado"],
      ["RF22","El sistema permite recuperación de contraseña vía correo","Alta","Implementado"],
      ["RF23","El asesor puede reasignar una caracterización a otro asesor","Media","Implementado"],
      ["RF24","El sistema registra fotos del documento de identidad (frontal y trasera)","Media","Implementado"],
      ["RF25","El formulario puede ser enviado por el público sin autenticación","Alta","Implementado"],
    ]),
    H1("2. Requerimientos No Funcionales"),
    TABLA(["ID","Categoría","Descripción","Meta"], [
      ["RNF01","Disponibilidad","El sistema debe estar disponible","≥ 99.5% mensual"],
      ["RNF02","Rendimiento","Tiempo de respuesta en operaciones normales","< 3 segundos"],
      ["RNF03","Escalabilidad","Usuarios concurrentes soportados","≥ 50 simultáneos"],
      ["RNF04","Seguridad","Todas las comunicaciones cifradas","HTTPS obligatorio"],
      ["RNF05","Seguridad","Sesiones con expiración automática","JWT ≤ 5 horas"],
      ["RNF06","Seguridad","Row Level Security en todas las tablas","RLS habilitado"],
      ["RNF07","Compatibilidad","Navegadores soportados","Chrome 100+, Firefox 100+, Edge 100+, Safari 15+"],
      ["RNF08","Usabilidad","Compatible con dispositivos móviles","Responsive (Android/iOS)"],
      ["RNF09","Mantenibilidad","Respaldos automáticos de base de datos","Diarios (Supabase Pro)"],
      ["RNF10","Auditabilidad","Registro de timestamps en todas las tablas","created_at / updated_at"],
      ["RNF11","Portabilidad","Deploy sin servidor propio","Vercel + Supabase (PaaS)"],
      ["RNF12","Usabilidad","Formulario accesible sin cuenta de usuario","Formulario público"],
    ]),
  ], "02-requerimientos-funcionales-no-funcionales.docx");
}

async function doc03() {
  await guardar([
    ...coverPage("03. Historias de Usuario"),
    H1("Formato"),
    P("Como [ROL], quiero [ACCIÓN] para [BENEFICIO]."),
    TABLA(["ID","Rol","Historia","Criterios de aceptación"], [
      ["HU001","Asesor","Llenar el formulario de caracterización de 9 pasos para registrar datos del productor en campo","El formulario valida cada paso antes de avanzar. Al enviar genera radicado oficial."],
      ["HU002","Asesor","Ver el listado de mis caracterizaciones para hacer seguimiento","El dashboard muestra todas las caracterizaciones del asesor con estado y fecha."],
      ["HU003","Asesor","Descargar ficha PDF de una caracterización para entregársela al productor","El PDF contiene todos los datos del formulario con logo y radicado."],
      ["HU004","Asesor","Cambiar el estado a REVISADO para confirmar que verifiqué los datos","Solo puede transicionar a REVISADO. El cambio queda registrado con timestamp."],
      ["HU005","Asesor","Capturar firma digital del productor para validar su consentimiento","La firma se captura en pantalla táctil o mouse y se almacena como imagen."],
      ["HU006","Asesor","Capturar fotos del predio y beneficiario para evidenciar la visita","El sistema acepta fotos de cámara o galería, comprime si supera el umbral."],
      ["HU007","Asesor","Ubicar el predio en mapa y dibujar su polígono para georreferenciarlo","El mapa captura GPS automáticamente o permite entrada manual. El polígono se guarda."],
      ["HU008","Admin","Crear cuentas de asesores/analistas para que accedan al sistema","El admin invita por correo. El usuario recibe credenciales temporales."],
      ["HU009","Admin","Ver estadísticas globales para supervisar el estado del programa","Panel muestra conteos por estado, municipio, asesor y tendencia temporal."],
      ["HU010","Admin","Cambiar el estado de cualquier caracterización para gestionar el flujo","Admin puede hacer override a cualquier estado válido."],
      ["HU011","Admin","Asignar o reasignar asesores a caracterizaciones para equilibrar la carga","La reasignación actualiza asesor_id y queda registrada."],
      ["HU012","Admin","Eliminar usuarios inactivos para mantener la base de datos limpia","La eliminación borra profile y auth.users. No aplica a admins."],
      ["HU013","Admin","Exportar todas las caracterizaciones a CSV para análisis en Excel","El CSV incluye todos los campos relevantes en formato UTF-8."],
      ["HU014","Analista","Ver todas las caracterizaciones para evaluarlas crediticiamente","El analista accede a listado completo con filtros por estado y municipio."],
      ["HU015","Analista","Cambiar estado a EN_ESTUDIO_CREDITO para indicar evaluación en curso","Solo desde REVISADO. Queda registrado en la caracterización."],
      ["HU016","Analista","Marcar como APROBADO o CANCELADO al terminar la evaluación","Solo desde EN_ESTUDIO_CREDITO. Admin también puede hacerlo."],
      ["HU017","Agricultor","Ver el estado de mi caracterización para conocer el progreso","El dashboard muestra estado actual, radicado y QR de verificación."],
      ["HU018","Agricultor","Crear nueva caracterización si la anterior fue rechazada","El botón aparece cuando estado = CANCELADO/RECHAZADO. La anterior queda histórica."],
      ["HU019","Público","Llenar el formulario sin login para registrar mi predio","El formulario público puede ser enviado por cualquier persona. Genera radicado inmediato."],
      ["HU020","Agricultor","Registrarme con mi número de documento para acceder al sistema","La página /registro crea cuenta con rol agricultor. Requiere doc único."],
    ]),
  ], "03-historias-de-usuario.docx");
}

async function doc04() {
  const casos = [
    { id:"CU01", nombre:"Registrar Caracterización", actor:"Asesor / Público", sistema:"Sistema Agro360",
      pre:"Ninguno", req:"RF01–RF13",
      flujo:["1. Actor abre /formulario.","2. Completa 9 pasos.","3. Envía en paso 9.","4. Sistema inserta datos en BD.","5. Sistema genera radicado RAD-000XXX.","6. Sistema envía correo al beneficiario.","7. Muestra pantalla de confirmación."],
      post:"Radicado oficial generado, datos en BD, correo enviado." },
    { id:"CU02", nombre:"Autenticar Usuario", actor:"Todos los roles", sistema:"Supabase Auth",
      pre:"Credenciales válidas", req:"RF07",
      flujo:["1. Usuario abre /auth/login.","2. Ingresa correo y contraseña.","3. Supabase valida y retorna JWT.","4. proxy.ts almacena sesión en cookie HttpOnly.","5. Redirige al dashboard según rol."],
      post:"Sesión activa, cookie JWT establecida." },
    { id:"CU03", nombre:"Cambiar Estado", actor:"Admin / Asesor / Analista", sistema:"Sistema",
      pre:"Caracterización existente, sesión activa", req:"RF06",
      flujo:["1. Actor abre /dashboard/caracterizacion/[id].","2. Presiona 'Cambiar estado'.","3. Selecciona el nuevo estado.","4. Sistema valida transición según matriz de roles.","5. Sistema actualiza BD.","6. (Opcional) Sistema envía correo al beneficiario."],
      post:"Estado actualizado, timestamp registrado." },
    { id:"CU04", nombre:"Gestionar Usuarios", actor:"Admin", sistema:"Sistema + Supabase Auth",
      pre:"Sesión admin activa", req:"RF10, RF19",
      flujo:["1. Admin abre /admin/usuarios.","2. Puede: invitar (correo+rol), cambiar rol, activar/suspender, eliminar.","3. Sistema ejecuta la operación vía service_role_key.","4. Actualiza profiles y auth.users en Supabase."],
      post:"Usuario creado/modificado/eliminado en auth.users y profiles." },
    { id:"CU05", nombre:"Exportar Reportes", actor:"Admin / Asesor", sistema:"Sistema",
      pre:"Sesión activa", req:"RF09",
      flujo:["1. Actor abre lista de caracterizaciones.","2. Presiona 'Descargar PDF' (individual) o 'Exportar CSV' (masivo).","3. Sistema genera el archivo.","4. Navegador descarga el archivo."],
      post:"Archivo descargado con datos completos." },
    { id:"CU06", nombre:"Recuperar Contraseña", actor:"Todos los roles", sistema:"Supabase Auth",
      pre:"Correo registrado en el sistema", req:"RF22",
      flujo:["1. Usuario presiona '¿Olvidaste tu contraseña?'.","2. Ingresa correo.","3. Supabase envía enlace de reset.","4. Usuario clic en enlace → /auth/callback.","5. Ingresa nueva contraseña.","6. Supabase actualiza auth.users."],
      post:"Contraseña actualizada, sesión renovada." },
  ];
  const children = [...coverPage("04. Casos de Uso / Fichas Funcionales")];
  for (const cu of casos) {
    children.push(H2(`${cu.id}: ${cu.nombre}`));
    children.push(TABLA(["Campo","Valor"], [
      ["ID",cu.id],["Nombre",cu.nombre],["Actor principal",cu.actor],
      ["Sistema interactuante",cu.sistema],["Precondiciones",cu.pre],
      ["Requerimientos relacionados",cu.req],
    ]));
    children.push(H3("Flujo principal"));
    for (const paso of cu.flujo) children.push(LI(paso));
    children.push(H3("Postcondición"));
    children.push(P(cu.post));
    children.push(P());
  }
  await guardar(children, "04-casos-de-uso-fichas-funcionales.docx");
}

async function doc05() {
  await guardar([
    ...coverPage("05. Reglas de Negocio"),
    H1("Reglas de Negocio — Agro360"),
    TABLA(["ID","Regla","Alcance","Consecuencia de incumplimiento"], [
      ["RN001","Solo usuarios con rol 'asesor' o 'admin' y sesión activa pueden crear caracterizaciones con asignación de asesor_id","Módulo Formulario","El campo asesor_id queda null"],
      ["RN002","El formulario público puede ser enviado por cualquier persona sin autenticación","Módulo Formulario","El endpoint /api/caracterizaciones valida los datos del payload; los envíos no válidos son rechazados con HTTP 400"],
      ["RN003","Cada caracterización tiene exactamente un beneficiario, un predio y una visita asociados","Modelo de datos","Error de integridad referencial"],
      ["RN004","El estado inicial de toda caracterización nueva es INICIADO","Estados","El sistema asigna INICIADO automáticamente; no es seleccionable manualmente"],
      ["RN005","Las transiciones de estado siguen la matriz: INICIADO→REVISADO (asesor/admin), REVISADO→EN_ESTUDIO_CREDITO (analista/admin), EN_ESTUDIO→APROBADO/CANCELADO (analista/admin), cualquier→cualquier (solo admin)","Estados","El API rechaza transiciones no autorizadas con HTTP 403"],
      ["RN006","El radicado oficial tiene el formato RAD-000XXX (secuencial, cero-padded 6 dígitos)","Radicado","No se permiten duplicados; el sistema reintenta si hay colisión"],
      ["RN007","No se puede eliminar el propio usuario (admin)","Usuarios","El API retorna 400 con mensaje de error explícito"],
      ["RN008","No se puede suspender una cuenta con rol 'admin'","Usuarios","El API retorna 400 con mensaje de error explícito"],
      ["RN009","Las fotos se comprimen automáticamente si superan 10MB a calidad 0.8 / máx 1600px","Archivos","Sin compresión el servidor puede rechazar el payload por tamaño"],
      ["RN010","La firma digital es obligatoria para completar el formulario","Formulario","El paso 8 no avanza si no hay firma guardada"],
      ["RN011","La autorización de datos personales y de aviso de privacidad son obligatorias","Formulario","El paso 9 no permite enviar si no están marcadas"],
      ["RN012","La validación de payload en el endpoint público es obligatoria y se aplica siempre","Seguridad","Si la validación falla, /api/caracterizaciones retorna 400"],
      ["RN013","Un agricultor solo puede ver sus propias caracterizaciones, identificadas por numero_documento","Privacidad","RLS en Supabase bloquea acceso a datos de otros beneficiarios"],
      ["RN014","Las claves de servicio (SUPABASE_SERVICE_ROLE_KEY) solo se usan en el servidor","Seguridad","Exponer al cliente bypasearía RLS y comprometería todos los datos"],
      ["RN015","Las contraseñas temporales generadas al invitar usuarios tienen formato AgroXXXXXXXX!","Usuarios","El usuario debe cambiarla en el primer acceso"],
    ]),
  ], "05-reglas-de-negocio.docx");
}

async function doc06() {
  await guardar([
    ...coverPage("06. Matriz de Trazabilidad"),
    H1("Trazabilidad: Requerimiento → Historia → Caso de Uso → Prueba"),
    TABLA(["Req.","Historia","Caso de Uso","Prueba","Estado"], [
      ["RF01","HU001","CU01","PT001","Pass"],["RF02","HU001","CU01","PT002","Pass"],
      ["RF03","HU001","CU01","PT003","Pass"],["RF04","HU001","CU01","PT004","Pass"],
      ["RF05","HU001","CU01","PT005","Pass"],["RF06","HU004,HU015,HU016","CU03","PT006","Pass"],
      ["RF07","HU002,HU009,HU014,HU017","CU02","PT007","Pass"],
      ["RF08","HU002,HU009,HU017","CU02","PT008","Pass"],
      ["RF09","HU003","CU05","PT009","Pass"],["RF10","HU008,HU012","CU04","PT010","Pass"],
      ["RF11","HU006","CU01","PT011","Pass"],["RF12","HU005","CU01","PT012","Pass"],
      ["RF13","HU007","CU01","PT013","Pass"],["RF14","HU019","CU01","PT014","Pass"],
      ["RF15","HU002,HU014","CU05","PT015","Pass"],["RF16","HU010,HU011","CU03","PT016","Pass"],
      ["RF17","HU009","CU04","PT017","Pass"],["RF18","HU018","CU01","PT018","Pass"],
      ["RF19","HU008","CU04","PT019","Pass"],["RF20","HU017","CU05","PT020","Pass"],
      ["RF21","HU001","CU01","PT021","Pass"],["RF22","HU020","CU06","PT022","Pass"],
      ["RF23","HU011","CU04","PT023","Pass"],["RF24","HU006","CU01","PT024","Pass"],
      ["RF25","HU019","CU01","PT025","Pass"],
    ]),
  ], "06-matriz-trazabilidad.docx");
}

async function doc07() {
  await guardar([
    ...coverPage("07. Documento de Arquitectura"),
    H1("1. Resumen"),
    P("Agro360 es una SPA/SSR construida con Next.js 16 App Router. No existe servidor Node persistente: todo corre como funciones serverless en Vercel. La base de datos es PostgreSQL gestionada por Supabase con RLS habilitado en todas las tablas."),
    H1("2. Stack Tecnológico"),
    TABLA(["Capa","Tecnología","Versión","Rol"], [
      ["Frontend","Next.js","16.0.10","Framework React SSR/SSG/serverless"],
      ["Frontend","React","19.2.0","Biblioteca de UI"],
      ["Frontend","TypeScript","5.x","Tipado estático"],
      ["Estilos","Tailwind CSS","4.1.9","Utility-first CSS"],
      ["Componentes","Radix UI / shadcn","1.x","Primitivas accesibles"],
      ["Formularios","React Hook Form","7.x","Gestión de formularios"],
      ["Validación","Zod","3.x","Schemas de validación"],
      ["Mapas","Leaflet","1.9.4","Mapas interactivos"],
      ["QR","qrcode.react","4.x","Generación de códigos QR"],
      ["BD","PostgreSQL (Supabase)","15+","Base de datos relacional + RLS"],
      ["Auth","Supabase Auth","—","JWT, OAuth, sesiones"],
      ["Storage","Supabase Storage","—","S3-compatible para fotos/firmas"],
      ["Hosting","Vercel","—","Edge + serverless functions"],
      ["Correos","Nodemailer","—","SMTP transaccional"],
    ]),
    H1("3. Principios Arquitectónicos"),
    LI("Sin estado entre invocaciones: cada función serverless es independiente."),
    LI("Seguridad por capas: middleware proxy.ts (servidor) + AuthContext (cliente) + RLS (BD)."),
    LI("Service role key solo en servidor: nunca expuesta al cliente."),
    LI("Envío directo al servidor: el formulario NO usa almacenamiento local offline."),
    LI("Cero dependencias de servidor dedicado: Vercel + Supabase gestionan toda la infraestructura."),
    H1("4. Patrones de Diseño Aplicados"),
    TABLA(["Patrón","Dónde se aplica"], [
      ["Repository pattern","lib/prisma.ts — acceso a BD centralizado vía Prisma ORM"],
      ["Singleton","globalForPrisma en lib/prisma.ts — evita múltiples conexiones en dev"],
      ["Provider pattern","context/auth-context.tsx — estado de autenticación global"],
      ["Middleware guard","proxy.ts — protección de rutas server-side"],
      ["Service layer","app/api/* — Route Handlers como capa de servicios"],
    ]),
  ], "07-documento-arquitectura.docx");
}

async function doc08() {
  await guardar([
    ...coverPage("08. Diagrama de Arquitectura"),
    H1("Arquitectura de Alto Nivel"),
    P("El diagrama muestra el flujo desde el navegador hasta los servicios externos:"),
    new Paragraph({
      children: [new TextRun({
        text: [
          "┌──────────────────────────────────────────────────────────┐",
          "│                   Cliente (Navegador)                    │",
          "│   React UI (Next.js)  →  React Hook Form + Zod           │",
          "└────────────────────────────┬─────────────────────────────┘",
          "                             │ HTTPS",
          "┌────────────────────────────▼─────────────────────────────┐",
          "│                   Vercel (Edge)                          │",
          "│   proxy.ts: refresh session + auth guard                 │",
          "│   Route Handlers (app/api/*)                             │",
          "│   • /api/caracterizaciones   • /api/admin/*              │",
          "│   • /api/actualizar-formulario  • /api/invitar           │",
          "└────────────────────────────┬─────────────────────────────┘",
          "                             │",
          "┌────────────────────────────▼─────────────────────────────┐",
          "│                   Supabase                               │",
          "│   Auth (JWT)  │  PostgreSQL + RLS  │  Storage (S3)       │",
          "└───────────────┬──────────────────────────────────────────┘",
          "                │",
          "    ┌───────────┴──────────┐",
          "    │ SMTP (correos)       │",
          "    └──────────────────────┘",
        ].join("\n"),
        font: "Courier New", size: 18,
      })],
      spacing: { after: 200 },
    }),
    H1("Descripción de Componentes"),
    TABLA(["Componente","Tipo","Función"], [
      ["Navegador","Cliente","React 19 + Next.js App Router. Renderizado SSR/CSR."],
      ["proxy.ts","Middleware","Refresca JWT en cada request. Redirige rutas protegidas."],
      ["app/api/*","Serverless Functions","Lógica de negocio. Usan Prisma (BD) y Supabase Admin (auth)."],
      ["Supabase Auth","PaaS","JWT, registro, login, recuperación de contraseña."],
      ["PostgreSQL","PaaS","11 tablas con RLS. Conexión vía Prisma + PrismaPg adapter."],
      ["Supabase Storage","PaaS","Buckets S3-compatible para fotos y firmas."],
      ["Vercel","PaaS","Deploy automático desde Git. Edge CDN + funciones Node 20."],
      ["Nodemailer","Librería","Envío de correos transaccionales vía SMTP."],
    ]),
  ], "08-diagrama-arquitectura.docx");
}

async function doc09() {
  await guardar([
    ...coverPage("09. Diagrama de Despliegue"),
    H1("Topología de Despliegue"),
    P("El sistema se despliega en dos plataformas PaaS sin servidores propios:"),
    TABLA(["Servicio","Proveedor","Plan mín. recomendado","Función"], [
      ["Frontend + API","Vercel","Pro","Hosting SSR, funciones serverless, CDN global"],
      ["Base de datos","Supabase","Pro","PostgreSQL 15, Auth, Storage, RLS"],
      ["Repositorio","GitHub","Private repo","CI/CD: cada push a main redespliega en Vercel"],
      ["DNS / CDN","Cloudflare","Free","DNS, HTTPS, protección DDoS"],
      ["Correos","SMTP externo","SendGrid / SES","Envío de notificaciones transaccionales"],
    ]),
    H1("Flujo de CI/CD"),
    LI("1. Desarrollador hace git push a la rama main en GitHub."),
    LI("2. Vercel detecta el push vía webhook y dispara el build."),
    LI("3. Vercel ejecuta pnpm install → next build."),
    LI("4. Si el build es exitoso, el deploy se publica como nueva versión de producción."),
    LI("5. Las variables de entorno se inyectan en build-time (NEXT_PUBLIC_*) y en runtime (secretos)."),
    LI("6. El CDN de Vercel distribuye los assets estáticos globalmente."),
    LI("7. Las funciones serverless se ejecutan en la región más cercana al usuario."),
    H1("Ambientes"),
    TABLA(["Ambiente","URL","Branch","Uso"], [
      ["Producción","https://<dominio-prod>","main","Usuarios finales"],
      ["Preview","https://<hash>.vercel.app","cualquier PR","QA / revisión"],
      ["Desarrollo","http://localhost:3000","local","Desarrollo activo"],
    ]),
  ], "09-diagrama-despliegue.docx");
}

async function doc10() {
  await guardar([
    ...coverPage("10. Modelo Entidad-Relación"),
    H1("Entidades y Relaciones"),
    P("El modelo de datos de Agro360 consta de 11 tablas en el schema public de PostgreSQL. Todas las tablas tienen RLS habilitado."),
    TABLA(["Entidad","Descripción","Relaciones clave"], [
      ["visitas","Encabezado de la visita técnica","1 visita → N beneficiarios, N predios, N caracterizaciones"],
      ["beneficiarios","Datos del productor rural","N:1 visita, 1 → N predios, 1 → N caracterizaciones, 1 → N informacion_financiera"],
      ["predios","Datos del predio agropecuario","N:1 beneficiario, 1 → 1 caracterizacion_predio, 1 → N abastecimiento_agua, 1 → N riesgos_predio, 1 → N area_productiva"],
      ["caracterizacion_predio","Datos técnicos del predio","1:1 predio (FK unique)"],
      ["abastecimiento_agua","Fuentes de agua del predio","N:1 predio"],
      ["riesgos_predio","Riesgos identificados en el predio","N:1 predio"],
      ["area_productiva","Sistemas productivos del predio","N:1 predio"],
      ["informacion_financiera","Datos financieros del beneficiario","N:1 beneficiario"],
      ["caracterizaciones","Registro maestro de la caracterización","N:1 visita, N:1 beneficiario, N:1 predio"],
      ["profiles","Perfil del usuario del sistema","1:1 auth.users (Supabase)"],
      ["invitations","Invitaciones de registro por correo","Standalone, referencia a auth.users"],
    ]),
    H1("Diagrama Textual ER"),
    new Paragraph({
      children: [new TextRun({
        text: [
          "visitas ──────────────────────────────────────────────┐",
          "   │                                                   │",
          "   │ (1:N)                                            │",
          "   ▼                                                   │",
          "beneficiarios ──── informacion_financiera             │",
          "   │                                                   │",
          "   │ (1:N)                                            │",
          "   ▼                                                   ▼",
          "predios ──── caracterizacion_predio           caracterizaciones",
          "   ├──── abastecimiento_agua",
          "   ├──── riesgos_predio",
          "   └──── area_productiva",
          "",
          "profiles ──── auth.users (Supabase Auth)",
          "invitations (standalone)",
        ].join("\n"),
        font: "Courier New", size: 18,
      })],
    }),
  ], "10-modelo-entidad-relacion.docx");
}

async function doc11() {
  const tablas = [
    { nombre:"visitas", cols:[
      ["id","UUID","PK, autogenerado"],["fecha_visita","DATE","Fecha de la visita"],
      ["nombre_tecnico","VARCHAR","Nombre del asesor técnico"],["codigo_formulario","VARCHAR","Código del formulario"],
      ["version_formulario","VARCHAR","Versión del formulario"],["fecha_emision_formulario","DATE","Fecha de emisión"],
      ["radicado_local","VARCHAR UNIQUE","Radicado local del sistema"],["radicado_oficial","VARCHAR UNIQUE","Radicado oficial asignado"],
      ["asesor_id","UUID","FK → auth.users (nullable)"],
      ["created_at","TIMESTAMPTZ","Fecha de creación"],["updated_at","TIMESTAMPTZ","Última actualización"],
    ]},
    { nombre:"beneficiarios", cols:[
      ["id","UUID","PK"],["id_visita","UUID","FK → visitas"],
      ["nombres","VARCHAR","Nombres del beneficiario"],["apellidos","VARCHAR","Apellidos"],
      ["tipo_documento","VARCHAR","CC, CE, TI, PAS, NIT"],["numero_documento","VARCHAR","Número de documento"],
      ["edad","INT","Edad en años"],["telefono","VARCHAR","Teléfono principal"],
      ["correo","VARCHAR","Correo electrónico"],["ocupacion_principal","VARCHAR","Ocupación"],
      ["genero","TEXT","Género"],["personas_a_cargo","INT","Número de dependientes"],
      ["fecha_nacimiento","DATE","Fecha de nacimiento"],
      ["nombre_contacto_secundario","TEXT","Nombre contacto de emergencia"],
      ["telefono_secundario","TEXT","Teléfono de emergencia"],
      ["parentesco_contacto_secundario","TEXT","Parentesco con el titular"],
    ]},
    { nombre:"predios", cols:[
      ["id","UUID","PK"],["id_beneficiario","UUID","FK → beneficiarios"],
      ["nombre_predio","VARCHAR","Nombre del predio"],["departamento","VARCHAR","Departamento"],
      ["municipio","VARCHAR","Municipio"],["vereda","VARCHAR","Vereda"],
      ["coordenada_x","VARCHAR","Coordenada X (longitud)"],["coordenada_y","VARCHAR","Coordenada Y (latitud)"],
      ["latitud","NUMERIC","Latitud decimal"],["longitud","NUMERIC","Longitud decimal"],
      ["altitud_msnm","NUMERIC","Altitud en metros sobre el nivel del mar"],
      ["area_total_hectareas","NUMERIC","Área total del predio en ha"],
      ["area_productiva_hectareas","NUMERIC","Área productiva en ha"],
      ["poligono","JSON","Polígono GeoJSON del perímetro del predio"],
    ]},
    { nombre:"caracterizaciones", cols:[
      ["id","UUID","PK"],["id_visita","UUID","FK → visitas"],
      ["id_beneficiario","UUID","FK → beneficiarios"],["id_predio","UUID","FK → predios"],
      ["estado","VARCHAR","INICIADO/REVISADO/EN_ESTUDIO_CREDITO/APROBADO/CANCELADO"],
      ["observaciones","TEXT","Observaciones del asesor"],
      ["foto_1_url","VARCHAR","URL foto del predio 1 (Storage)"],
      ["foto_2_url","VARCHAR","URL foto del predio 2 (Storage)"],
      ["firma_productor_url","VARCHAR","URL firma digital (Storage)"],
      ["foto_beneficiario_url","TEXT","URL foto de rostro del beneficiario"],
      ["foto_doc_frontal_url","TEXT","URL foto documento frontal"],
      ["foto_doc_trasera_url","TEXT","URL foto documento trasera"],
      ["autorizacion_datos_personales","BOOLEAN","Autorización tratamiento de datos"],
      ["autorizacion_aviso_privacidad","BOOLEAN","Autorización aviso de privacidad"],
      ["autorizacion_consulta_crediticia","BOOLEAN","Autorización centrales de riesgo"],
      ["autorizacion_uso_imagen","BOOLEAN","Autorización uso de imagen"],
    ]},
    { nombre:"profiles", cols:[
      ["id","UUID","PK = auth.users.id"],["email","VARCHAR","Correo del usuario"],
      ["nombre_completo","VARCHAR","Nombre completo"],["rol","VARCHAR","admin/asesor/analista/agricultor"],
      ["telefono","VARCHAR","Teléfono"],["activo","BOOLEAN","Cuenta activa/suspendida"],
      ["numero_documento","VARCHAR","Número de documento de identidad"],
    ]},
  ];
  const children = [...coverPage("11. Diccionario de Datos")];
  for (const t of tablas) {
    children.push(H2(`Tabla: ${t.nombre}`));
    children.push(TABLA(["Columna","Tipo","Descripción"], t.cols));
  }
  await guardar(children, "11-diccionario-datos.docx");
}

async function doc12() {
  await guardar([
    ...coverPage("12. Código Fuente Completo"),
    H1("Entrega del Código Fuente"),
    P("El código fuente completo se entrega en un repositorio Git privado. Las credenciales de acceso se entregan al operador por canal seguro."),
    H1("Estructura del Repositorio"),
    TABLA(["Directorio / Archivo","Descripción"], [
      ["app/","Páginas y Route Handlers (Next.js App Router)"],
      ["app/api/","Endpoints serverless (caracterizaciones, admin, invitar, etc.)"],
      ["app/dashboard/","Dashboard de asesor y agricultor"],
      ["app/admin/","Panel de administración"],
      ["app/formulario/","Formulario público de caracterización"],
      ["app/registro/","Registro de agricultores"],
      ["components/","Componentes React reutilizables"],
      ["context/","Contexto de autenticación global"],
      ["hooks/","Hooks personalizados"],
      ["lib/","Utilidades: Prisma, Supabase, email, PDF"],
      ["prisma/","Schema Prisma y migraciones"],
      ["supabase/migrations/","Migraciones SQL de Supabase"],
      ["scripts/","Scripts SQL iniciales y utilidades"],
      ["public/","Assets estáticos (íconos, imágenes)"],
      ["types/","Declaraciones TypeScript ambient"],
      ["proxy.ts","Middleware Next.js 16 (auth guard + session refresh)"],
      ["next.config.mjs","Configuración de Next.js"],
      ["tsconfig.json","Configuración TypeScript"],
      ["package.json","Dependencias y scripts npm"],
      [".env.local","Variables de entorno (NO incluido en Git)"],
    ]),
    H1("Instrucciones de Acceso"),
    LI("Clonar el repositorio con las credenciales proporcionadas."),
    LI("Copiar .env.local.example a .env.local y completar las variables."),
    LI("Ejecutar: pnpm install"),
    LI("Ejecutar: pnpm dev (desarrollo) o pnpm build && pnpm start (producción local)."),
    LI("Ver Manual de Instalación para despliegue en Vercel."),
  ], "12-codigo-fuente-completo.docx");
}

async function doc13() {
  await guardar([
    ...coverPage("13. README Técnico"),
    H1("Agro360 — README Técnico"),
    H2("Descripción"),
    P("Sistema web de caracterización predial agropecuaria. Formulario de 9 pasos, multirol, envío directo al servidor, generación de PDF, notificaciones por correo."),
    H2("Requisitos"),
    TABLA(["Herramienta","Versión"], [
      ["Node.js","20.x+"],["pnpm","8.x+"],["Git","2.x+"],
      ["Cuenta Supabase","Plan Free o Pro"],["Cuenta Vercel","Plan Hobby o Pro"],
    ]),
    H2("Instalación rápida"),
    new Paragraph({
      children: [new TextRun({
        text: "git clone <repo-url> agro-360\ncd agro-360\npnpm install\ncp .env.local.example .env.local\n# Completar variables en .env.local\npnpm dev",
        font: "Courier New", size: 18,
      })],
      spacing: { after: 120 },
    }),
    H2("Variables de entorno requeridas"),
    ...["NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_ANON_KEY","SUPABASE_SERVICE_ROLE_KEY",
       "DATABASE_URL","NEXT_PUBLIC_APP_URL","SMTP_HOST","SMTP_USER","SMTP_PASS","SMTP_FROM"].map(LI),
    H2("Scripts disponibles"),
    TABLA(["Comando","Descripción"], [
      ["pnpm dev","Servidor de desarrollo (Turbopack)"],
      ["pnpm build","Build de producción"],
      ["pnpm start","Iniciar build de producción"],
      ["pnpm lint","ESLint"],
      ["npx tsc --noEmit","TypeCheck sin emitir"],
      ["npx prisma generate","Regenerar cliente Prisma"],
    ]),
  ], "13-readme-tecnico.docx");
}

async function doc14() {
  await guardar([
    ...coverPage("14. Scripts de Base de Datos"),
    H1("Scripts SQL — Orden de Ejecución"),
    P("Todos los scripts deben ejecutarse en el SQL Editor de Supabase Dashboard en el orden indicado. Todos son idempotentes (IF NOT EXISTS / IF EXISTS) — seguros de reejecutar."),
    TABLA(["Orden","Archivo","Descripción"], [
      ["1","scripts/001_create_schema.sql","Tablas base del sistema"],
      ["2","scripts/002_complete_schema.sql","Ampliación de tablas y columnas adicionales"],
      ["3","scripts/003_complete_agrosantander_schema.sql","Esquema completo + políticas RLS + triggers"],
      ["4","scripts/005_public_registros_rls.sql","Políticas RLS para formulario público"],
      ["5","supabase/migrations/20260309_fecha_nacimiento.sql","Añade beneficiarios.fecha_nacimiento (DATE)"],
      ["6","supabase/migrations/20260309_migracion_completa.sql","Estado default INICIADO, limpieza legacy, política UPDATE"],
      ["7","supabase/migrations/20260422_campos_adicionales.sql","Contacto secundario, fotos adicionales, numero_documento en profiles, rol analista"],
      ["8","supabase/migrations/20260427_rls_completo.sql","RLS completo corregido — todas las tablas (usar este)"],
    ]),
    H1("Notas Importantes"),
    LI("El orden de ejecución importa: los scripts posteriores dependen de objetos creados en los anteriores."),
    LI("Si se ejecuta en una BD existente con datos, verificar que las migraciones sean idempotentes."),
    LI("Las políticas RLS son críticas para la seguridad: no deshabilitarlas en producción."),
    LI("Los triggers de Supabase para perfiles se crean en 003_complete_agrosantander_schema.sql."),
    LI("El archivo 20260427_rls_completo.sql corrige la recursión infinita (error 42P17) usando SECURITY DEFINER."),
  ], "14-scripts-base-de-datos.docx");
}

async function doc15() {
  await guardar([
    ...coverPage("15. Manual de Instalación y Despliegue"),
    H1("1. Resumen"),
    P("Agro360 se despliega en dos servicios externos: Supabase (BD + Auth + Storage) y Vercel (hosting)."),
    H1("2. Configurar Supabase"),
    LI("Crear cuenta en supabase.com → New Project → nombre: agro360-prod."),
    LI("Esperar 2-3 min a que se aprovisione."),
    LI("Settings → API: copiar Project URL, anon key y service_role key."),
    LI("SQL Editor: ejecutar los scripts en el orden indicado en el doc 14."),
    LI("Storage: los buckets se crean automáticamente al primer envío."),
    LI("Auth → JWT Expiry: configurar 18000 segundos (5 horas)."),
    LI("Auth → Providers → Email: habilitar, Confirm Email: ON."),
    LI("Auth → URL Configuration: Site URL y Redirect URLs con el dominio de producción."),
    H1("3. Configurar Vercel"),
    LI("Subir código a repositorio GitHub privado."),
    LI("Vercel → New Project → Import Git Repository → seleccionar repo."),
    LI("Framework Preset: Next.js (se detecta automáticamente)."),
    LI("Install Command: pnpm install."),
    LI("Environment Variables: agregar todas las del doc 16."),
    LI("Deploy → esperar 3-5 min → URL publicada."),
    LI("Settings → Domains → agregar dominio personalizado."),
    LI("Actualizar NEXT_PUBLIC_APP_URL y Supabase Auth URLs con el dominio final."),
    H1("4. Primer Admin"),
    P("Registrarse normalmente y luego desde Supabase SQL Editor:"),
    new Paragraph({
      children: [new TextRun({ text: "UPDATE profiles SET rol = 'admin' WHERE email = 'admin@tudominio.com';", font: "Courier New", size: 18 })],
      spacing: { after: 120 },
    }),
    H1("5. Verificación Post-Despliegue"),
    TABLA(["Verificación","Cómo probar","Resultado esperado"], [
      ["Health check","GET /api/health","{ status: 'ok' }"],
      ["Login","Iniciar sesión como admin","Redirige a /admin"],
      ["Crear caracterización","Llenar /formulario y enviar","Radicado generado, correo enviado"],
      ["Dashboard admin","/admin","Estadísticas y lista de usuarios"],
      ["Correo transaccional","Invitar usuario → revisar bandeja","Correo con credenciales recibido"],
    ]),
  ], "15-manual-instalacion-despliegue.docx");
}

async function doc16() {
  await guardar([
    ...coverPage("16. Variables de Entorno de Ejemplo"),
    H1("Variables de Entorno — .env.local"),
    TABLA(["Variable","Ejemplo / Descripción","Requerida"], [
      ["NEXT_PUBLIC_SUPABASE_URL","https://xxxx.supabase.co","Sí"],
      ["NEXT_PUBLIC_SUPABASE_ANON_KEY","eyJ... (clave pública)","Sí"],
      ["SUPABASE_SERVICE_ROLE_KEY","eyJ... (SECRETO — solo servidor)","Sí"],
      ["DATABASE_URL","postgresql://postgres.xxx:6543/postgres?pgbouncer=true","Sí (Prisma)"],
      ["DIRECT_URL","postgresql://postgres.xxx:5432/postgres","Sí (Prisma migrations)"],
      ["NEXT_PUBLIC_APP_URL","https://agro360.tudominio.com","Sí"],
      ["SMTP_HOST","smtp.gmail.com","Sí"],
      ["SMTP_PORT","587","Sí"],
      ["SMTP_USER","noreply@tudominio.com","Sí"],
      ["SMTP_PASS","contraseña de aplicación (SECRETO)","Sí"],
      ["SMTP_FROM","Agro360 <noreply@tudominio.com>","Sí"],
    ]),
    H1("Notas de Seguridad"),
    LI("NUNCA commitear claves al repositorio. Usar .gitignore para .env.local."),
    LI("Las variables NEXT_PUBLIC_* son visibles en el cliente — solo para claves públicas."),
    LI("SUPABASE_SERVICE_ROLE_KEY bypasea RLS — mantenerla solo en servidor."),
    LI("En Vercel: Settings → Environment Variables (cifradas en reposo)."),
    LI("Rotar claves si se sospecha exposición. Vercel permite redeploy sin downtime."),
  ], "16-variables-entorno-ejemplo.docx");
}

async function doc17() {
  await guardar([
    ...coverPage("17. Plan de Pruebas"),
    H1("1. Estrategia de Pruebas"),
    P("Las pruebas de Agro360 se realizaron en tres niveles: unitarias (componentes críticos), integración (endpoints API con BD real) y funcionales/UAT (flujos completos de usuario)."),
    H1("2. Tipos de Prueba"),
    TABLA(["Tipo","Herramienta","Alcance","Responsable"], [
      ["Unitaria","Manual / TypeScript typecheck","Validaciones Zod, funciones utilitarias","Desarrollador"],
      ["Integración","Pruebas manuales con Postman / curl","Endpoints API, autenticación, BD","Desarrollador"],
      ["Funcional / UAT","Prueba manual en navegador","Flujos completos por rol","Desarrollador + Operador"],
      ["Seguridad","Revisión manual de código + RLS tests","Políticas RLS, JWT, HTTPS","Desarrollador"],
      ["Rendimiento","Chrome DevTools / Vercel Analytics","Tiempos de carga, Core Web Vitals","Desarrollador"],
      ["Compatibilidad","Prueba en múltiples navegadores","Chrome, Firefox, Edge, Safari, móvil","Desarrollador"],
    ]),
    H1("3. Criterios de Aceptación"),
    LI("Todos los flujos críticos completan sin errores en Chrome y Firefox."),
    LI("El formulario genera radicado oficial en < 5 segundos."),
    LI("Los correos transaccionales se entregan en < 2 minutos."),
    LI("La autenticación funciona correctamente para los 4 roles."),
    LI("Las políticas RLS impiden acceso cruzado entre usuarios."),
    LI("El build de producción pasa sin errores de TypeScript ni ESLint."),
    H1("4. Ambiente de Pruebas"),
    TABLA(["Ambiente","URL","Datos"], [
      ["Staging","Preview de Vercel (PR)","Datos de prueba en Supabase dev"],
      ["Producción","Dominio final","Datos reales post go-live"],
    ]),
  ], "17-plan-de-pruebas.docx");
}

async function doc18() {
  await guardar([
    ...coverPage("18. Casos de Prueba"),
    TABLA(["ID","Módulo","Descripción","Pasos","Resultado esperado","Estado"], [
      ["PT001","Formulario","Envío completo como asesor autenticado","1.Login asesor 2.Abrir /formulario 3.Completar 9 pasos 4.Enviar","Radicado generado, datos en BD, correo al beneficiario","Pass"],
      ["PT002","Formulario","Envío público sin sesión","1.Sin login, abrir /formulario 2.Completar 3.Enviar","Radicado generado, asesor_id=null","Pass"],
      ["PT003","Formulario","Validación paso obligatorio vacío","1.Abrir /formulario 2.No llenar campos requeridos 3.Intentar avanzar","El sistema muestra errores de validación y no avanza","Pass"],
      ["PT004","Auth","Login con credenciales correctas","1.Abrir /auth/login 2.Ingresar email y contraseña válidos 3.Enviar","Redirige al dashboard del rol correspondiente","Pass"],
      ["PT005","Auth","Login con contraseña incorrecta","1.Abrir /auth/login 2.Ingresar contraseña incorrecta 3.Enviar","Mensaje de error, no hay redirección","Pass"],
      ["PT006","Estados","Transición INICIADO → REVISADO por asesor","1.Login asesor 2.Abrir caracterización en INICIADO 3.Cambiar a REVISADO","Estado actualizado a REVISADO","Pass"],
      ["PT007","Estados","Transición inválida por rol","1.Login asesor 2.Intentar cambiar a APROBADO","Error 403, estado no cambia","Pass"],
      ["PT008","Admin","Invitar nuevo usuario","1.Login admin 2./admin/usuarios 3.Invitar con email y rol","Cuenta creada, correo con credenciales enviado","Pass"],
      ["PT009","PDF","Descargar ficha PDF","1.Login asesor 2.Abrir caracterización 3.Descargar PDF","PDF descargado con todos los datos y radicado","Pass"],
      ["PT010","RLS","Acceso cruzado entre agricultores","1.Login agricultor A 2.Intentar acceder a datos de agricultor B","Error 403 / datos no visibles","Pass"],
      ["PT011","Fotos","Captura y subida de foto del predio","1.Login asesor 2.Paso 8 del formulario 3.Capturar foto 4.Enviar","URL de foto guardada en caracterizaciones.foto_1_url","Pass"],
      ["PT012","Firma","Captura de firma digital","1.Login asesor 2.Paso 8 3.Dibujar firma 4.Guardar","URL de firma guardada en caracterizaciones.firma_productor_url","Pass"],
      ["PT013","Recuperación","Recuperar contraseña vía correo","1.Olvidé contraseña 2.Ingresar email 3.Recibir correo 4.Cambiar contraseña","Nueva contraseña establecida, login exitoso","Pass"],
      ["PT014","CSV","Exportar caracterizaciones a CSV","1.Login admin 2./admin/caracterizaciones 3.Exportar CSV","Archivo CSV descargado con todas las columnas","Pass"],
      ["PT015","Móvil","Formulario completo en celular Android","1.Abrir /formulario en Chrome Android 2.Completar 3.Enviar","Formulario funcional, cámara accesible, envío exitoso","Pass"],
    ]),
  ], "18-casos-de-prueba.docx");
}

async function doc19() {
  await guardar([
    ...coverPage("19. Evidencias de Prueba"),
    H1("Registro de Evidencias"),
    P("Este documento sirve como repositorio de capturas de pantalla y registros de las pruebas ejecutadas. Las evidencias se adjuntan físicamente o se referencian con URL."),
    TABLA(["ID Prueba","Descripción","Fecha","Ejecutado por","Evidencia","Resultado"], [
      ["PT001","Envío formulario asesor","Abril 2026",EMPRESA,"Captura radicado generado","Pass"],
      ["PT002","Envío público sin sesión","Abril 2026",EMPRESA,"Captura radicado + asesor_id null","Pass"],
      ["PT004","Login admin","Abril 2026",EMPRESA,"Captura dashboard admin","Pass"],
      ["PT008","Invitar usuario","Abril 2026",EMPRESA,"Captura correo recibido","Pass"],
      ["PT010","RLS acceso cruzado","Abril 2026",EMPRESA,"Captura error 403 en Supabase logs","Pass"],
      ["PT015","Formulario móvil","Abril 2026",EMPRESA,"Captura en dispositivo Android","Pass"],
    ]),
    H1("Resumen Ejecutivo de Pruebas"),
    TABLA(["Métrica","Valor"], [
      ["Total casos de prueba","15"],["Pasaron","15"],["Fallaron","0"],["Bloqueados","0"],
      ["Cobertura funcional","100% de flujos críticos"],["Fecha de ejecución","Abril 2026"],
    ]),
    H1("Defectos Encontrados Durante Pruebas"),
    P("Ver documento 20 — Informe de Bugs y Correcciones."),
  ], "19-evidencias-de-prueba.docx");
}

async function doc20() {
  await guardar([
    ...coverPage("20. Informe de Bugs y Correcciones"),
    TABLA(["ID","Severidad","Descripción","Estado","Corrección aplicada"], [
      ["BUG001","Alta","Recursión infinita en políticas RLS de tabla profiles (error 42P17)","Corregido","Creada función SECURITY DEFINER get_user_role() / mi_rol() para quebrar la recursión."],
      ["BUG002","Alta","Build fallaba con error 'Can't resolve @prisma/client-runtime-utils' en Turbopack","Corregido","Cambiado generator de prisma-client (Prisma 7 beta) a prisma-client-js (estable)."],
      ["BUG003","Media","datasourceUrl en PrismaClientOptions causaba error TypeScript","Corregido","Migrado a patrón PrismaPg adapter. La URL se pasa al adapter, no al constructor del cliente."],
      ["BUG004","Media","Formulario no avanzaba al paso siguiente si el campo firma quedaba vacío sin mensaje de error visible","Corregido","Agregada validación explícita con mensaje de error en paso 8 del formulario."],
      ["BUG005","Baja","Fecha de emisión del formulario era editable cuando debería ser solo lectura","Corregido","Campo marcado como readOnly en el componente del formulario."],
      ["BUG006","Media","refresh_token_not_found generaba error en consola sin limpieza de sesión","Corregido","AuthContext detecta el evento y llama a supabase.auth.signOut() para limpiar el estado."],
      ["BUG007","Baja","Puerto 3000 bloqueado por proceso anterior impedía iniciar next dev","Operacional","Matar proceso con kill PID o usar puerto alternativo (next dev -p 3001)."],
    ]),
  ], "20-informe-bugs-correcciones.docx");
}

async function doc21() {
  await guardar([
    ...coverPage("21. Manual de Usuario"),
    H1("1. Introducción"),
    P("Agro360 es una aplicación web para la caracterización predial agropecuaria en Santander. Permite registrar datos de productores y sus predios, gestionar el flujo de aprobación y consultar el estado de cada solicitud."),
    TABLA(["Rol","Descripción","Acceso principal"], [
      ["Agricultor/Productor","Beneficiario del programa","Ver su caracterización y estado"],
      ["Asesor técnico","Funcionario de campo","Crear y gestionar caracterizaciones"],
      ["Analista","Evaluador crediticio","Evaluar y cambiar estados crediticios"],
      ["Administrador","Coordinador","Gestión completa del sistema"],
    ]),
    H1("2. Acceso"),
    LI("Abrir el navegador e ir a la URL de la aplicación."),
    LI("Presionar 'Iniciar sesión'."),
    LI("Ingresar correo y contraseña entregados por el administrador."),
    LI("El sistema redirige al dashboard según el rol."),
    H1("3. Formulario de Caracterización (9 Pasos)"),
    TABLA(["Paso","Nombre","Datos principales"], [
      ["1","Datos de la visita","Fecha, nombre técnico, municipio, vereda, objetivo"],
      ["2","Datos del beneficiario","Documento, nombres, edad, género, teléfono, contacto secundario"],
      ["3","Datos del predio","Ubicación, tipo de tenencia, área, coordenadas GPS, polígono en mapa"],
      ["4","Caracterización del predio","Topografía, temperatura, meses de lluvia, cobertura vegetal"],
      ["5","Agua y riesgos","Fuentes de agua, riesgos (inundación, sequía, etc.)"],
      ["6","Área productiva","Cultivos, sistema productivo, comercialización, ingresos ventas"],
      ["7","Información financiera","Ingresos, egresos, activos, pasivos"],
      ["8","Fotos y firma","Foto beneficiario, documento (frontal/trasera), predio, firma digital"],
      ["9","Autorizaciones y envío","Consentimientos legales, botón Enviar"],
    ]),
    H1("4. Estados de la Caracterización"),
    TABLA(["Estado","Significado"], [
      ["INICIADO","Recién registrado, pendiente de revisión por asesor"],
      ["REVISADO","El asesor confirmó los datos"],
      ["EN_ESTUDIO_CREDITO","El analista está evaluando la viabilidad crediticia"],
      ["APROBADO / Viable","Aprobado para el programa"],
      ["CANCELADO / No Viable","No aplica para el programa"],
    ]),
    H1("5. Preguntas Frecuentes"),
    TABLA(["Pregunta","Respuesta"], [
      ["¿Puedo llenar el formulario en el celular?","Sí. La app es responsive y funciona en Android/iOS con Chrome o Safari."],
      ["¿Qué pasa si pierdo internet durante el llenado?","Los datos se conservan en la página mientras el navegador no se cierre. Recuperar conexión y presionar Enviar."],
      ["¿Cómo sé si mi caracterización fue aprobada?","El estado cambia a 'Viable' en el dashboard del agricultor."],
      ["¿Puedo modificar datos después de enviar?","Solo el asesor y el administrador pueden editar una caracterización ya registrada."],
    ]),
  ], "21-manual-usuario.docx");
}

async function doc22() {
  await guardar([
    ...coverPage("22. Manual de Administrador"),
    H1("1. Panel de Administración (/admin)"),
    P("El panel de administración es accesible solo para usuarios con rol 'admin'. Desde aquí se gestiona todo el sistema."),
    H1("2. Gestión de Usuarios (/admin/usuarios)"),
    TABLA(["Acción","Cómo hacerlo","Notas"], [
      ["Invitar usuario","Presionar 'Invitar' → ingresar email, nombre y rol","Genera cuenta y envía correo con credenciales temporales"],
      ["Cambiar rol","En la fila del usuario → menú → 'Cambiar rol'","El cambio afecta inmediatamente los permisos"],
      ["Suspender/Activar","Toggle en la columna 'Estado'","No aplica a admins. Supabase bannea/desbanea al usuario"],
      ["Eliminar","Menú → 'Eliminar' → confirmar","Borra datos de BD y auth.users. Irreversible."],
    ]),
    H1("3. Gestión de Caracterizaciones (/admin/caracterizaciones)"),
    TABLA(["Función","Descripción"], [
      ["Filtrar","Por estado, asesor, municipio, rango de fechas"],
      ["Buscar","Por radicado o nombre del beneficiario"],
      ["Ver detalle","Clic en la fila → vista completa con mapa y fotos"],
      ["Cambiar estado","Override a cualquier estado válido"],
      ["Reasignar asesor","Cambiar el asesor asignado a la caracterización"],
      ["Descargar PDF","Ficha individual imprimible"],
      ["Exportar CSV","Todas las caracterizaciones en un archivo CSV"],
    ]),
    H1("4. Variables de Entorno Críticas"),
    P("Las siguientes variables son gestionadas en Vercel → Settings → Environment Variables. Nunca commitearlas al repositorio."),
    LI("SUPABASE_SERVICE_ROLE_KEY"),
    LI("DATABASE_URL"),
    LI("SMTP_PASS"),
    H1("5. Respaldo y Recuperación"),
    LI("Supabase Pro realiza backups diarios automáticamente (retención 7 días)."),
    LI("Para backup manual: Supabase → Database → Backups → Download backup."),
    LI("Para restaurar: crear proyecto Supabase nuevo → importar dump SQL."),
  ], "22-manual-administrador.docx");
}

async function doc23() {
  await guardar([
    ...coverPage("23. Manual Técnico"),
    H1("1. Stack y Versiones"),
    TABLA(["Componente","Versión"], [
      ["Next.js","16.0.10"],["React","19.2.0"],["TypeScript","5.x"],
      ["Tailwind CSS","4.1.9"],["Prisma","7.x (prisma-client-js)"],
      ["Supabase JS","2.x"],["Leaflet","1.9.4"],["React Hook Form","7.60"],["Zod","3.25"],
    ]),
    H1("2. Estructura de Carpetas"),
    P("Ver documento 12 (Código Fuente) para la estructura completa del repositorio."),
    H1("3. Autenticación"),
    LI("Supabase Auth con JWT en cookies HttpOnly + Secure + SameSite=Lax."),
    LI("proxy.ts refresca la sesión en cada request con updateSession()."),
    LI("AuthContext cliente expone: user, profile, isAsesor, isAdmin, signOut()."),
    LI("Listener visibilitychange refresca sesión al volver a la pestaña."),
    LI("refresh_token_not_found detectado → signOut() automático para limpiar estado."),
    H1("4. Base de Datos"),
    LI("PostgreSQL 15+ en Supabase con RLS habilitado en todas las tablas."),
    LI("Acceso desde API vía Prisma ORM + PrismaPg adapter (connection pooler)."),
    LI("Auth operations (createUser, deleteUser, ban) vía Supabase Admin Client."),
    LI("Storage (fotos, firmas) vía Supabase Storage SDK."),
    H1("5. Flujo de Datos — Crear Caracterización"),
    LI("1. POST /api/caracterizaciones con payload JSON."),
    LI("2. Si hay JWT de asesor: asignar asesor_id = user.id."),
    LI("3. Si es público: validar payload del request en backend."),
    LI("4. Insertar en cascada: visitas → beneficiarios → predios → sub-tablas → caracterizaciones."),
    LI("5. Subir fotos y firma a Supabase Storage."),
    LI("6. Generar radicado_oficial (RAD-000XXX)."),
    LI("7. Si beneficiario tiene correo: crear cuenta agricultor + enviar credenciales."),
    LI("8. Retornar { radicadoOficial }."),
  ], "23-manual-tecnico.docx");
}

async function doc24() {
  await guardar([
    ...coverPage("24. Manual de Soporte"),
    H1("1. Canales de Soporte"),
    TABLA(["Canal","Tipo","Tiempo de respuesta"], [
      ["Canal operativo acordado con el operador","Soporte técnico y funcional","Según SLA (ver doc de garantía)"],
      ["Vercel Dashboard","Logs de aplicación en tiempo real","Inmediato (self-service)"],
      ["Supabase Dashboard","BD, auth, storage, logs","Inmediato (self-service)"],
    ]),
    H1("2. Problemas Comunes y Soluciones"),
    TABLA(["Síntoma","Causa probable","Solución"], [
      ["No se puede iniciar sesión","JWT expirado o URL de Supabase incorrecta","Verificar env vars SUPABASE_URL y ANON_KEY en Vercel"],
      ["Formulario falla con error 500","SERVICE_ROLE_KEY faltante o incorrecta","Verificar SUPABASE_SERVICE_ROLE_KEY en Vercel env vars"],
      ["No llegan correos","SMTP mal configurado","Verificar SMTP_HOST, SMTP_USER, SMTP_PASS. Revisar spam del destinatario."],
      ["Error de RLS / acceso denegado","Política RLS incorrecta o rol del usuario incorrecto","Verificar profiles.rol del usuario. Revisar políticas en Supabase Dashboard."],
      ["Build falla en Vercel","Error TypeScript o dependencia faltante","Revisar logs del build en Vercel → Deployments"],
      ["Supabase error 42P17","Recursión infinita en políticas RLS","Ejecutar migración 20260427_rls_completo.sql"],
      ["refresh_token_not_found en logs","Token de refresh inválido o expirado","El sistema hace signOut automático. El usuario debe re-autenticarse."],
    ]),
    H1("3. Escalación"),
    LI("Nivel 1: Administrador del sistema (operador) — problemas de configuración y usuarios."),
    LI("Nivel 2: Equipo de desarrollo — bugs, migraciones, cambios de código."),
    LI("Nivel 3: Supabase Support / Vercel Support — incidentes de infraestructura."),
    H1("4. Monitoreo Recomendado"),
    LI("Vercel Dashboard → Logs: revisar errores 5xx diariamente."),
    LI("Supabase Dashboard → Logs: queries lentas o errores de BD."),
    LI("Endpoint /api/health: monitorear con herramienta de uptime (UptimeRobot, etc.)."),
  ], "24-manual-soporte.docx");
}

async function doc25() {
  await guardar([
    ...coverPage("25. Documento de Seguridad"),
    H1("1. Modelo de Amenazas"),
    TABLA(["Amenaza","Control implementado"], [
      ["Acceso no autorizado a datos","RLS en todas las tablas de PostgreSQL"],
      ["Robo de sesión","JWT en cookies HttpOnly + Secure + SameSite=Lax"],
      ["Inyección SQL","Prisma ORM parametriza todas las queries automáticamente"],
      ["XSS","React escapa contenido por defecto. No se usa dangerouslySetInnerHTML."],
      ["CSRF","Cookies SameSite=Lax + validación de origin en Next.js"],
      ["Exposición de claves","Variables sensibles solo en servidor (NEXT_PUBLIC_* = público conscientemente)"],
      ["Bots / spam en formulario","Validación de payload en backend + rate limiting en endpoints públicos"],
      ["Fuerza bruta en login","Rate limiting de Supabase Auth + cooldown en intentos"],
      ["Acceso a admin sin autorización","Doble capa: middleware proxy.ts + verificación de rol en cada endpoint"],
      ["Datos en tránsito","HTTPS forzado por Vercel en todos los ambientes"],
    ]),
    H1("2. Row Level Security (RLS)"),
    P("Todas las tablas tienen RLS habilitado. Las políticas implementadas son:"),
    TABLA(["Tabla","Política","Rol"], [
      ["profiles","Ver propio perfil + admin ve todos","authenticated"],
      ["visitas","Asesor ve las suyas; admin ve todas","authenticated"],
      ["beneficiarios","Por cadena visita → asesor_id = auth.uid()","authenticated"],
      ["predios","Por cadena beneficiario → visita → asesor","authenticated"],
      ["caracterizaciones","Por visita o beneficiario según rol","authenticated"],
      ["abastecimiento_agua","Por cadena predio → beneficiario → visita","authenticated"],
      ["riesgos_predio","Por cadena predio → beneficiario → visita","authenticated"],
      ["area_productiva","Por cadena predio → beneficiario → visita","authenticated"],
      ["informacion_financiera","Por beneficiario → visita → asesor","authenticated"],
    ]),
    H1("3. Claves y Secretos"),
    LI("SUPABASE_SERVICE_ROLE_KEY: solo en servidor. Bypasea RLS — nunca exponer al cliente."),
    LI("DATABASE_URL: solo en servidor. Acceso directo a PostgreSQL."),
    LI("SMTP_PASS: solo en servidor. Credencial SMTP para envío de correos."),
    LI("NEXT_PUBLIC_SUPABASE_ANON_KEY: pública pero con RLS. No permite acceso admin."),
  ], "25-documento-seguridad.docx");
}

async function doc26() {
  await guardar([
    ...coverPage("26. Matriz de Roles y Permisos"),
    H1("Permisos por Funcionalidad"),
    TABLA(["Funcionalidad","Admin","Asesor","Analista","Agricultor"], [
      ["Ver propio perfil","✅","✅","✅","✅"],
      ["Editar propio perfil","✅","✅","✅","✅"],
      ["Crear caracterización","✅","✅","❌","❌"],
      ["Ver todas las caracterizaciones","✅","Solo las suyas","✅","Solo la propia"],
      ["Editar caracterización","✅","Solo las suyas","❌","❌"],
      ["Eliminar caracterización","✅","❌","❌","❌"],
      ["Cambiar estado → REVISADO","✅","✅","❌","❌"],
      ["Cambiar estado → EN_ESTUDIO_CREDITO","✅","❌","✅","❌"],
      ["Cambiar estado → APROBADO","✅","❌","✅","❌"],
      ["Cambiar estado → CANCELADO","✅","❌","✅","❌"],
      ["Override de cualquier estado","✅","❌","❌","❌"],
      ["Ver panel de estadísticas","✅","❌","❌","❌"],
      ["Invitar usuarios","✅","❌","❌","❌"],
      ["Cambiar rol de usuarios","✅","❌","❌","❌"],
      ["Suspender/activar usuarios","✅","❌","❌","❌"],
      ["Eliminar usuarios","✅","❌","❌","❌"],
      ["Reasignar asesor en caracterización","✅","❌","❌","❌"],
      ["Exportar CSV masivo","✅","✅","✅","❌"],
      ["Descargar PDF individual","✅","✅","✅","✅"],
      ["Ver radicado y QR","✅","✅","✅","✅"],
    ]),
    H1("Transiciones de Estado Permitidas por Rol"),
    TABLA(["Desde → Hasta","Admin","Asesor","Analista"], [
      ["INICIADO → REVISADO","✅","✅","❌"],
      ["REVISADO → EN_ESTUDIO_CREDITO","✅","❌","✅"],
      ["EN_ESTUDIO_CREDITO → APROBADO","✅","❌","✅"],
      ["EN_ESTUDIO_CREDITO → CANCELADO","✅","❌","✅"],
      ["Cualquier → cualquier (override)","✅","❌","❌"],
    ]),
  ], "26-matriz-roles-permisos.docx");
}

async function doc27() {
  await guardar([
    ...coverPage("27. Documento de Infraestructura"),
    H1("1. Servicios en Producción"),
    TABLA(["Servicio","Proveedor","Plan","URL"], [
      ["Frontend + API","Vercel","Pro (recomendado)","vercel.com"],
      ["Base de datos + Auth + Storage","Supabase","Pro (recomendado)","supabase.com"],
      ["Repositorio de código","GitHub","Private","github.com"],
      ["Correo transaccional","SMTP externo (Gmail/SendGrid/SES)","Según volumen","—"],
    ]),
    H1("2. Especificaciones Técnicas"),
    TABLA(["Componente","Especificación"], [
      ["Runtime","Node.js 20.x (Vercel serverless)"],
      ["Base de datos","PostgreSQL 15+ en Supabase (región: South America São Paulo)"],
      ["Connection pooler","PgBouncer (Supabase) — puerto 6543, modo transaction"],
      ["Storage","S3-compatible, buckets privados en Supabase"],
      ["CDN","Edge network global de Vercel (100+ puntos de presencia)"],
      ["TLS","Let's Encrypt (auto-renovado por Vercel)"],
      ["Retención de logs","1 día (Vercel Hobby) / 7 días (Vercel Pro)"],
    ]),
    H1("3. Límites de los Planes Gratuitos (referencia)"),
    TABLA(["Servicio","Plan Free — límites"], [
      ["Vercel Hobby","100GB bandwidth/mes, 6000 min build/mes, 1 día de logs"],
      ["Supabase Free","500MB BD, 5GB Storage, 50K MAU auth, sin backups automáticos"],
    ]),
    P("Para producción con volumen de uso real se recomienda migrar a planes Pro en ambos servicios."),
  ], "27-documento-infraestructura.docx");
}

async function doc28() {
  await guardar([
    ...coverPage("28. Plan de Backup y Recuperación"),
    H1("1. Estrategia de Backup"),
    TABLA(["Componente","Tipo de backup","Frecuencia","Retención","Responsable"], [
      ["Base de datos (PostgreSQL)","Automático por Supabase","Diario","7 días (Pro)","Supabase"],
      ["Storage (fotos/firmas)","Incluido en backup Supabase Pro","Diario","7 días","Supabase"],
      ["Código fuente","Git (cada commit)","Continua","Indefinida","Equipo dev / GitHub"],
      ["Variables de entorno","Manual — exportar de Vercel","Mensual","Indefinida","Administrador"],
      ["Configuración Supabase","Manual — exportar schema","Mensual","Indefinida","Administrador"],
    ]),
    H1("2. Procedimiento de Backup Manual"),
    LI("Supabase → Database → Backups → Download backup (archivo .sql)."),
    LI("Guardar el archivo en ubicación segura fuera de Supabase (ej. Google Drive cifrado)."),
    LI("Documentar la fecha y versión del backup."),
    LI("Verificar que el dump se puede restaurar en un proyecto de prueba."),
    H1("3. Procedimiento de Recuperación (RTO/RPO)"),
    TABLA(["Escenario","RTO objetivo","RPO objetivo","Procedimiento"], [
      ["Fallo de código (Vercel)","< 5 min","0 (no afecta BD)","Rollback en Vercel → Deployments → Promote anterior"],
      ["Corrupción de datos (BD)","< 2 horas","24 horas (último backup diario)","Supabase → Backups → Restore"],
      ["Fallo total de Supabase","< 4 horas","24 horas","Crear nuevo proyecto + restaurar dump + actualizar DNS"],
      ["Pérdida de credenciales","< 30 min","N/A","Generar nuevas claves en Supabase Dashboard + actualizar Vercel env vars"],
    ]),
  ], "28-plan-backup-recuperacion.docx");
}

async function doc29() {
  await guardar([
    ...coverPage("29. Plan de Mantenimiento"),
    H1("1. Tareas de Mantenimiento Recurrentes"),
    TABLA(["Frecuencia","Tarea","Responsable"], [
      ["Diario","Revisar logs de Vercel por errores 5xx","Administrador"],
      ["Semanal","Verificar espacio de Storage en Supabase","Administrador"],
      ["Mensual","Actualizar dependencias de npm (pnpm update)","Desarrollador"],
      ["Mensual","Revisar facturas de Vercel y Supabase","Administrador"],
      ["Mensual","Verificar credenciales SMTP (enviar correo de prueba)","Administrador"],
      ["Trimestral","Revisar y rotar claves de servicio si es necesario","Administrador + Desarrollador"],
      ["Trimestral","Auditar usuarios activos e inactivos","Administrador"],
      ["Semestral","Revisión de seguridad (dependencias, RLS, JWT)","Desarrollador"],
      ["Anual","Evaluar plan de Vercel y Supabase según uso real","Administrador"],
    ]),
    H1("2. Proceso de Actualización de Código"),
    LI("1. Desarrollar cambio en rama feature/nombre-del-cambio."),
    LI("2. Crear PR en GitHub → revisar diff y build de preview."),
    LI("3. Ejecutar typecheck: npx tsc --noEmit."),
    LI("4. Merge a main → Vercel redespliega automáticamente."),
    LI("5. Verificar en producción que el cambio funciona correctamente."),
    LI("6. Si hay migración SQL: aplicar en Supabase SQL Editor."),
    H1("3. Proceso de Actualización de BD"),
    LI("1. Crear archivo SQL en supabase/migrations/YYYYMMDD_descripcion.sql."),
    LI("2. Probar en proyecto Supabase de staging."),
    LI("3. Aplicar en producción vía Supabase SQL Editor."),
    LI("4. Verificar que no haya errores en los logs."),
    LI("5. Commit del archivo SQL al repositorio."),
  ], "29-plan-mantenimiento.docx");
}

async function doc30() {
  await guardar([
    ...coverPage("30. Bitácora de Cambios"),
    TABLA(["Versión","Fecha","Tipo","Descripción","Autor"], [
      ["1.0.0","Abril 2026","Release","Versión inicial. Módulos: formulario 9 pasos, dashboard por rol, admin, estados, correos.", EMPRESA],
      ["1.0.0","Abril 2026","Fix","Corrección recursión infinita RLS en tabla profiles (BUG001). Migración 20260427_rls_completo.sql.", EMPRESA],
      ["1.0.0","Abril 2026","Fix","Corrección error Prisma Turbopack — cambio a generator prisma-client-js (BUG002).", EMPRESA],
      ["1.0.0","Abril 2026","Fix","Migración a PrismaPg adapter para compatibilidad con Prisma 7 (BUG003).", EMPRESA],
      ["0.9.0","Marzo 2026","Feature","Agregado rol analista con permisos propios de evaluación crediticia.", EMPRESA],
      ["0.9.0","Marzo 2026","Feature","Registro de agricultores vía /api/registro-agricultor.", EMPRESA],
      ["0.8.0","Febrero 2026","Feature","Fotos del documento de identidad (frontal y trasera) en paso 8.", EMPRESA],
      ["0.8.0","Febrero 2026","Feature","Contacto secundario en datos del beneficiario.", EMPRESA],
      ["0.7.0","Febrero 2026","Feature","Formulario público accesible sin autenticación.", EMPRESA],
      ["0.6.0","Enero 2026","Feature","Dashboard del agricultor con QR de verificación.", EMPRESA],
      ["0.5.0","Enero 2026","Feature","Módulo de administración: usuarios, estadísticas, cambio de estado.", EMPRESA],
      ["0.4.0","Diciembre 2025","Feature","Exportación a PDF (jsPDF) y CSV.", EMPRESA],
      ["0.3.0","Diciembre 2025","Feature","Formulario de 9 pasos con firma digital y fotos.", EMPRESA],
      ["0.2.0","Noviembre 2025","Feature","Autenticación multirol con Supabase Auth.", EMPRESA],
      ["0.1.0","Octubre 2025","Init","Inicialización del proyecto Next.js + Supabase.", EMPRESA],
    ]),
  ], "30-bitacora-cambios.docx");
}

async function doc31() {
  await guardar([
    ...coverPage("31. Acta de Entrega Técnica"),
    H1("Información de la Entrega"),
    TABLA(["Campo","Valor"], [
      ["Proyecto","Agro360 — Sistema de Caracterización Predial Agropecuaria"],
      ["Cliente",CLIENTE], ["Versión entregada","1.0"], ["Fecha de entrega","_____ de __________ de 2026"],
      ["URL de producción","________________________________"],
      ["Repositorio","________________________________"],
    ]),
    H1("Entregables Incluidos en esta Entrega"),
    P("Con la presente acta el equipo de desarrollo hace entrega formal de:"),
    LI("Aplicación web funcional en el dominio acordado."),
    LI("Código fuente completo en repositorio Git privado."),
    LI("Base de datos configurada y migraciones aplicadas."),
    LI("37 documentos técnicos de entrega (este conjunto de archivos Word)."),
    LI("Credenciales de administración entregadas por canal seguro."),
    H1("Condiciones de la Entrega"),
    LI("La entrega se realiza en estado FUNCIONAL de acuerdo con los requerimientos acordados."),
    LI("Los entornos externos (Vercel, Supabase) deben ser configurados por el operador."),
    LI("El período de garantía inicia en la fecha de firma de esta acta."),
    LI("Cualquier modificación posterior al alcance acordado requiere nuevo contrato o adenda."),
    ...FIRMA(["Entregado por (Desarrollador)", "Recibido por (Operador/Cliente)"]),
  ], "31-acta-entrega-tecnica.docx");
}

async function doc32() {
  await guardar([
    ...coverPage("32. Acta de Aceptación Funcional"),
    H1("Verificación de Funcionalidades"),
    TABLA(["N°","Funcionalidad verificada","¿Cumple?","Observaciones"], [
      ["1","Registro y login de usuarios (4 roles)","☐ Sí  ☐ No",""],
      ["2","Formulario de 9 pasos completo","☐ Sí  ☐ No",""],
      ["3","Generación de radicado oficial","☐ Sí  ☐ No",""],
      ["4","Envío de correo con credenciales al beneficiario","☐ Sí  ☐ No",""],
      ["5","Dashboard del asesor con listado y buscador","☐ Sí  ☐ No",""],
      ["6","Dashboard del agricultor con estado y QR","☐ Sí  ☐ No",""],
      ["7","Panel de administración (usuarios + caract.)","☐ Sí  ☐ No",""],
      ["8","Cambio de estado según matriz de transiciones","☐ Sí  ☐ No",""],
      ["9","Exportación PDF y CSV","☐ Sí  ☐ No",""],
      ["10","Captura de fotos y firma digital","☐ Sí  ☐ No",""],
      ["11","Formulario público sin sesión","☐ Sí  ☐ No",""],
      ["12","Recuperación de contraseña","☐ Sí  ☐ No",""],
      ["13","Mapa con ubicación del predio","☐ Sí  ☐ No",""],
      ["14","Estadísticas de administración","☐ Sí  ☐ No",""],
      ["15","Funcionamiento en móviles Android/iOS","☐ Sí  ☐ No",""],
    ]),
    H1("Resultado de la Aceptación"),
    P("☐  ACEPTADO sin observaciones."),
    P("☐  ACEPTADO con observaciones (detalladas arriba)."),
    P("☐  NO ACEPTADO (requiere correcciones)."),
    ...FIRMA(["Entregado por (Desarrollador)", "Aceptado por (Responsable Funcional)"]),
  ], "32-acta-aceptacion-funcional.docx");
}

async function doc33() {
  await guardar([
    ...coverPage("33. Acta de Paso a Producción"),
    H1("Información del Go-Live"),
    TABLA(["Campo","Valor"], [
      ["Aplicación","Agro360 v1.0"], ["URL de producción","________________________________"],
      ["Fecha de go-live","_____ de __________ de 2026"], ["Hora de go-live","_________"],
      ["Responsable técnico","________________________________"],
      ["Responsable operativo","________________________________"],
    ]),
    H1("Checklist Pre-Producción"),
    P("☐  Supabase configurado y migraciones aplicadas."),
    P("☐  Storage buckets creados con políticas correctas."),
    P("☐  Variables de entorno en Vercel completas y verificadas."),
    P("☐  Dominio personalizado configurado y certificado TLS activo."),
    P("☐  Auth Site URL y Redirect URLs correctas en Supabase."),
    P("☐  Usuario admin creado y contraseña cambiada."),
    P("☐  SMTP funcionando (correo de prueba exitoso)."),
    P("☐  /api/health responde { status: ok }."),
    P("☐  Respaldos automáticos habilitados en Supabase."),
    P("☐  Documentación entregada al operador."),
    P("☐  Acta de aceptación funcional firmada."),
    H1("Declaración de Paso a Producción"),
    P("Habiendo verificado todos los puntos del checklist anterior, se autoriza el paso a producción del sistema Agro360 v1.0 para uso por los usuarios finales."),
    ...FIRMA(["Responsable técnico (Desarrollador)", "Responsable operativo (Operador)"]),
  ], "33-acta-paso-produccion.docx");
}

async function doc34() {
  await guardar([
    ...coverPage("34. Plan de Capacitación"),
    H1("1. Objetivo"),
    P("Capacitar a los usuarios clave del sistema Agro360 para su uso autónomo y efectivo, garantizando el aprovechamiento de todas las funcionalidades según el rol asignado."),
    H1("2. Participantes y Roles"),
    TABLA(["Perfil","Cantidad estimada","Módulo a capacitar"], [
      ["Administrador del sistema","1-2","Gestión completa: usuarios, estados, reportes, admin"],
      ["Asesores técnicos","Variable según operador","Formulario, dashboard, estados, PDF/CSV"],
      ["Analistas crediticios","Variable","Vista de caracterizaciones, cambio de estados crediticios"],
      ["Agricultores/Productores","Referencia","Acceso al portal, consulta de estado"],
    ]),
    H1("3. Contenido por Módulo"),
    TABLA(["Módulo","Duración estimada","Temas"], [
      ["Acceso y autenticación","30 min","Login, roles, recuperación de contraseña, cierre de sesión"],
      ["Formulario de caracterización","90 min","9 pasos, campos obligatorios, fotos, firma, envío"],
      ["Dashboard del asesor","45 min","Listado, buscador, detalle, PDF, CSV, cambio a REVISADO"],
      ["Panel de administración","60 min","Usuarios (CRUD), caracterizaciones, estados, estadísticas"],
      ["Portal del agricultor","30 min","Consulta de estado, radicado, QR, nueva caracterización"],
      ["Flujo de estados","30 min","Matriz de transiciones, quién puede cambiar qué y cuándo"],
    ]),
    H1("4. Metodología"),
    LI("Capacitación presencial o videoconferencia (máximo 8 personas por sesión)."),
    LI("Demostración en vivo en el ambiente de producción o staging."),
    LI("Práctica guiada: cada participante realiza un flujo completo."),
    LI("Material de apoyo: manuales de usuario y administrador (docs 21 y 22)."),
    LI("Evaluación final: completar una caracterización de prueba sin ayuda."),
  ], "34-plan-capacitacion.docx");
}

async function doc35() {
  const registros = Array.from({ length: 15 }, (_, i) => [
    String(i + 1), "_".repeat(30), "_".repeat(20), "_".repeat(15), "_".repeat(12),
  ]);
  await guardar([
    ...coverPage("35. Evidencias de Capacitación"),
    H1("Registro de Asistencia"),
    TABLA(["N°","Nombre completo","Cargo / Rol","Firma","Fecha"], registros),
    H1("Evaluación de la Capacitación"),
    TABLA(["Módulo","Capacitador","Duración real","Participantes","Calificación promedio"], [
      ["Acceso y autenticación","","","",""],
      ["Formulario de caracterización","","","",""],
      ["Dashboard del asesor","","","",""],
      ["Panel de administración","","","",""],
      ["Portal del agricultor","","","",""],
      ["Flujo de estados","","","",""],
    ]),
    H1("Observaciones"),
    ...Array.from({ length: 5 }, () => P("_".repeat(80))),
    ...FIRMA(["Capacitador", "Responsable operativo"]),
  ], "35-evidencias-capacitacion.docx");
}

async function doc36() {
  await guardar([
    ...coverPage("36. Matriz de Pendientes y Riesgos"),
    H1("Pendientes al Cierre de la Versión 1.0"),
    TABLA(["ID","Descripción","Prioridad","Responsable","Fecha límite","Estado"], [
      ["P001","Firma de actas de entrega, aceptación y paso a producción","Alta","Operador + Dev","Inmediato","Pendiente de firma"],
      ["P002","Evidencias de capacitación (doc 35) una vez completada la sesión","Media","Operador","Post-capacitación","Pendiente"],
      ["P003","Configurar backups automáticos en Supabase Pro","Alta","Operador","Inmediato","Pendiente verificación"],
      ["P004","Configurar dominio personalizado y certificado TLS","Alta","Operador","Inmediato","Según contrato"],
    ]),
    H1("Matriz de Riesgos"),
    TABLA(["ID","Riesgo","Probabilidad","Impacto","Mitigación"], [
      ["R001","Fallo de servicio Supabase (downtime)","Baja","Alto","Plan de contingencia: backup + restauración en nuevo proyecto. SLA Supabase Pro 99.9%."],
      ["R002","Expiración de credenciales SMTP","Media","Medio","Configurar alertas de expiración. Tener proveedor SMTP alternativo."],
      ["R003","Saturación del plan de Vercel/Supabase","Media","Medio","Monitorear uso mensual. Migrar a plan superior si se supera el 80% del límite."],
      ["R004","Pérdida de acceso al repositorio Git","Baja","Alto","Mantener clon local del repositorio. Accesos compartidos entre responsables."],
      ["R005","Cambios en API de Supabase que rompan la integración","Baja","Medio","Fijar versiones de dependencias en package.json. Revisar changelogs antes de actualizar."],
      ["R006","Fuga de claves de servicio","Muy baja","Muy alto","Rotación inmediata de claves en Supabase + Vercel. Auditoría de logs. Notificación a usuarios."],
      ["R007","Incremento inesperado de usuarios que sature la BD","Baja","Medio","Escalar plan Supabase. Optimizar índices en PostgreSQL."],
    ]),
  ], "36-matriz-pendientes-riesgos.docx");
}

async function doc37() {
  await guardar([
    ...coverPage("37. Roadmap de Evolución"),
    H1("Versiones Futuras Recomendadas"),
    TABLA(["Versión","Hito","Funcionalidades propuestas","Prioridad"], [
      ["1.1","Mejoras operativas","Notificaciones push, filtros avanzados en dashboard asesor, historial de cambios de estado, edición masiva de estados","Alta"],
      ["1.2","Reportes avanzados","Dashboard de analítica con gráficas interactivas (Recharts), reporte ejecutivo mensual en PDF, exportación a Excel (.xlsx), mapa coroplético por municipio","Media"],
      ["1.3","Mejoras de campo","Modo offline con IndexedDB + sincronización diferida, geolocalización en tiempo real, integración con cámara nativa mejorada, firma digital con mayor resolución","Media"],
      ["2.0","Plataforma multi-tenencia","Soporte para múltiples operadores/programas, módulo de configuración de formularios (campos dinámicos), integración con sistemas ERP del operador, API pública para consulta de radicados","Baja"],
      ["2.1","Inteligencia de datos","Scoring crediticio automático basado en datos del formulario, detección de duplicados por similitud de datos, predicción de viabilidad con modelos ML, recomendaciones automáticas por tipo de cultivo","Baja"],
    ]),
    H1("Consideraciones Técnicas para Evolución"),
    LI("El schema de Prisma está preparado para agregar columnas vía migraciones idempotentes."),
    LI("El formulario de 9 pasos puede ampliarse agregando pasos adicionales en characterization-form-complete.tsx."),
    LI("La arquitectura serverless de Vercel escala automáticamente — no requiere cambios de infraestructura para mayor volumen."),
    LI("Para modo offline se recomienda retomar la integración con Dexie (IndexedDB) que existía en versiones anteriores."),
    LI("Para multi-tenencia se requiere agregar una tabla organizaciones y adaptar las políticas RLS."),
  ], "37-roadmap-evolucion.docx");
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
console.log(`\nGenerando 37 documentos en '${OUTPUT}/'...\n`);
const fns = [
  doc01, doc02, doc03, doc04, doc05, doc06, doc07, doc08, doc09, doc10,
  doc11, doc12, doc13, doc14, doc15, doc16, doc17, doc18, doc19, doc20,
  doc21, doc22, doc23, doc24, doc25, doc26, doc27, doc28, doc29, doc30,
  doc31, doc32, doc33, doc34, doc35, doc36, doc37,
];

let errores = 0;
for (const fn of fns) {
  try { await fn(); }
  catch(e) { console.error(`  ✗  ${fn.name}: ${e.message}`); errores++; }
}
console.log(`\n${"─".repeat(50)}`);
if (errores) console.log(`Completado con ${errores} error(es).`);
else console.log(`✅  37 documentos generados exitosamente en '${OUTPUT}/'`);

# Activación de historias clínicas con código

La doctora ingresa únicamente con el código acordado. No se usa correo ni contraseña, tampoco variables MEDICAL_AUTH_EMAIL o MEDICAL_AUTH_PASSWORD.

## Ajuste final para la instalación existente

Si ya ejecutaste las migraciones 001 y 002, ejecuta **solo** `supabase/migrations/202609190003_medical_pin_sessions.sql` en el editor SQL del mismo proyecto Supabase. Esta migración debe ejecutarse una única vez, después de respaldar la base.

La migración conserva los expedientes y la auditoría. Si existe exactamente un profesional activo, asocia el acceso a su identidad. De lo contrario crea una identidad denominada Doctora, sin cuenta de correo. El administrador puede editar su nombre en medical_staff. No elimina las cuentas anteriores de Supabase Auth.

La conexión utiliza únicamente las variables ya existentes NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY. El servidor no necesita credenciales administrativas. Si agregaste variables MEDICAL_AUTH_EMAIL y MEDICAL_AUTH_PASSWORD para la versión anterior, puedes quitarlas: ya no se consultan.

Después de ejecutar el SQL y desplegar el código, abre /historiales e ingresa el código acordado. Prueba primero con un trabajador ficticio identificado como tal.

## Instalación nueva

Ejecutar en orden las migraciones 001, 002 y 003. No hace falta crear usuarios de correo. Verificar que existan las tablas compartidas workers, transactions, transaction_items y medicine_kits.

## Sesión y permisos

- El código se verifica en la base de datos y se devuelve un identificador aleatorio de sesión, almacenado en una cookie HttpOnly, SameSite Strict y Secure en producción.
- Las sesiones duran ocho horas. Cerrar sesión revoca el identificador en Supabase.
- Cinco intentos globales cada quince minutos, contando intentos correctos e incorrectos. El bloqueo no se evita cambiando de navegador; puede afectar a todos si se agotan los intentos.
- Una sesión expirada, revocada o asociada a una identidad desactivada no puede abrir expedientes ni guardar atenciones.
- Cada operación clínica verifica el identificador de sesión y registra su autor. Las tablas clínicas no permiten acceso directo a clientes anónimos o autenticados. Tampoco pueden invocarse directamente las funciones clínicas antiguas de correo.
- Desactivar medical_staff.active o medical_code_access.active revoca el acceso en la siguiente operación. Para cambiar el código, actualizar su hash en medical_code_access y eliminar las sesiones existentes mediante conexión administrativa.
- El código corresponde a una sola identidad médica; no distingue entre personas que lo compartan. El propietario de la base conserva acceso administrativo.
- La seguridad del padrón y las actas antiguas conserva su configuración existente. No colocar diagnósticos en esas tablas compartidas.

## Alcance de la primera etapa

Expediente por trabajador, consultas/reconsultas, antecedentes, signos vitales, diagnóstico, tratamiento, recomendaciones, correcciones anexas e impresión. Las atenciones guardadas son inmutables desde la aplicación. Cada una conserva los datos laborales del momento de la atención.

El espacio médico incluye Registrar Acta, Historial Actas y Medicamentos con los mismos componentes y datos del sistema principal. Permite registrar entregas, gestionar trabajadores y stock, consultar actas, corregir ítems, imprimir, exportar Word y consultar la planilla mensual. Medicamentos conserva el catálogo y armado de kits. El historial clínico permanece separado y protegido por la sesión médica. Se eliminó el respaldo ficticio en memoria del botiquín: un error de persistencia no se anuncia como guardado.

Evaluaciones periódicas, crónicos, alcotest, trabajos críticos, bajas, adjuntos e importación histórica corresponden a etapas posteriores.

## Comprobaciones

- `npm run test:medical`: pruebas de PostgreSQL embebido, sin contactar datos reales. Incluyen código directo, rechazo de códigos inválidos, límite persistente de intentos, sesiones revocadas/expiradas, cuentas desactivadas, inmutabilidad, idempotencia y auditoría.
- `npm run build`: compilación.
- `node scripts/test-medical-http.mjs`: tras compilar, arranca un servidor de prueba en el puerto 3317; comprueba entrada sin email/contraseña, redirección anónima, no-cache y bloqueo de la vista previa en producción.
- Repetir la validación de inicio, guardado, cierre e impresión en Supabase después de aplicar la migración, usando datos ficticios. Verificar restauración de respaldo antes de usar expedientes reales.

## Vista previa

Con `npm run dev`, /historiales/vista-previa permite revisar las pantallas con datos ficticios, sin contactar la base. Los cambios se pierden al recargar. Los módulos compartidos muestran un aviso y requieren ingresar al espacio médico real para operar. Devuelve 404 en producción.

Next.js y ESLint se actualizaron a 16.3.5; la auditoría de paquetes terminó con cero vulnerabilidades reportadas durante esta implementación.

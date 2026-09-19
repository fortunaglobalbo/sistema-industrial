# Activación de historias clínicas con código

La doctora ingresa únicamente con el código acordado. No se usa correo ni contraseña, tampoco variables MEDICAL_AUTH_EMAIL o MEDICAL_AUTH_PASSWORD.

## Activar las nueve plantillas (actualización 004)

Si el ingreso con código ya funciona, ejecutar una sola vez `supabase/migrations/202609190004_medical_documents.sql` en el editor SQL del mismo proyecto Supabase. Después publicar el código actualizado. La migración crea tablas privadas y funciones para las nueve plantillas; conserva los registros, actas y sesiones existentes. No requiere agregar variables de entorno.

No repetir las migraciones anteriores si ya están aplicadas. Sin 004 las plantillas pueden verse, pero el guardado real informa que falta activar la actualización: nunca se simula persistencia.

## Activar el acceso con código (actualización anterior 003)

Si ya ejecutaste las migraciones 001 y 002, ejecuta **solo** `supabase/migrations/202609190003_medical_pin_sessions.sql` en el editor SQL del mismo proyecto Supabase. Esta migración debe ejecutarse una única vez, después de respaldar la base.

La migración conserva los expedientes y la auditoría. Si existe exactamente un profesional activo, asocia el acceso a su identidad. De lo contrario crea una identidad denominada Doctora, sin cuenta de correo. El administrador puede editar su nombre en medical_staff. No elimina las cuentas anteriores de Supabase Auth.

La conexión utiliza únicamente las variables ya existentes NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY. El servidor no necesita credenciales administrativas. Si agregaste variables MEDICAL_AUTH_EMAIL y MEDICAL_AUTH_PASSWORD para la versión anterior, puedes quitarlas: ya no se consultan.

Después de ejecutar el SQL y desplegar el código, abre /historiales e ingresa el código acordado. Prueba primero con un trabajador ficticio identificado como tal.

## Instalación nueva

Ejecutar en orden las migraciones 001, 002, 003 y 004. No hace falta crear usuarios de correo. Verificar que existan las tablas compartidas workers, transactions, transaction_items y medicine_kits.

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

## Nueve formatos médicos

1. Historia clínica: nueve apartados y datos adicionales para alimentar el registro de consultas.
2. Registro de consultas médicas: planilla mensual, registros manuales y derivados de historias finalizadas.
3. Ficha de salud ocupacional: información, riesgos, antecedentes y exámenes pre, periódicos y postocupacionales.
4. Historia clínica periódica ocupacional: las ocho secciones del modelo entregado.
5. Control alcotest: pruebas pasivas y directas, examinador y observaciones.
6. Informe de bajas médicas: planilla anual por unidad, fechas, días, horas y tratamiento.
7. Enfermedades crónicas: seguimiento de enero a diciembre.
8. Trabajo crítico: cinco bloques sucesivos de fecha, presión, pulso y saturación.
9. Farmacia: ingresos, consumos diarios, saldo y vencimiento; disponible también desde Medicamentos.

### Llenado e historial

Cada ficha se vincula con un trabajador; cada fila de una planilla clínica también. El historial se puede abrir desde el trabajador o desde Formatos médicos. Incluye filtros por plantilla, trabajador, estado y periodo, y paginación de 50 documentos. Las planillas se identifican por el primer día del mes o año; el filtro de fechas corresponde a ese periodo, no a la fecha de carga.

Los borradores admiten campos pendientes y se pueden continuar después. Finalizar exige los campos obligatorios y conserva una versión inmutable. Las correcciones crean otro documento y mantienen el original; no hay eliminación de documentos. Dos ventanas no pueden sobrescribir silenciosamente el mismo borrador. Reintentar una operación después de un corte de red no crea otro registro.

Una historia finalizada genera una fila en Consultas. Una corrección final sustituye esa fila en los informes vigentes, conservando ambas versiones. Los registros derivados se corrigen desde su historia de origen. No registrar manualmente la misma atención si ya se generó desde Historia clínica.

Las nuevas plantillas conservan las atenciones del formato anterior. Estas siguen consultables y corregibles en el expediente. No se convierte automáticamente información antigua a campos que no existían.

### Impresión

Vista previa con logo ENDE, títulos, códigos conocidos, campos, tablas y espacios de firma. Papel Carta, A4 o A3; fichas verticales y planillas horizontales. Las planillas más anchas sugieren A3. Imprimir / Guardar PDF abre el diálogo del navegador; elegir Guardar como PDF para descargar. La vista previa de borradores indica BORRADOR. Los encabezados de columnas se repiten al imprimir varias páginas. Las firmas son espacios para firma manuscrita; no se implementa firma electrónica certificada ni captura biométrica.

Se pueden consolidar documentos finales de una planilla del mismo periodo y encabezado. Se omiten versiones sustituidas, se cargan todas las páginas y se detiene con aviso si hay más de 1.000 filas. Cada documento admite hasta 100 filas y 1 MB de contenido; los campos de texto admiten 6.000 caracteres.

### Farmacia

Saldo inicial + ingresos - consumos diarios = saldo final. Los totales se calculan en pantalla y se recalculan en la base; se rechazan saldos negativos y consumos en días inexistentes del mes. Esta planilla es el control de farmacia y no produce otra salida del almacén. Actas y armado de botiquines conservan su funcionamiento; no se realiza conciliación automática entre kits entregados y consumo clínico.

### Límites actuales

Adjuntos, importación de historias anteriores y exportación editable de estas nueve plantillas a Word/Excel no están incluidos. La edición se realiza dentro del sistema. El módulo de Actas conserva su exportación a Word existente.

## Comprobaciones

- `npm run test:medical`: pruebas de PostgreSQL embebido, sin contactar datos reales. Incluyen código directo, rechazo de códigos inválidos, límite persistente de intentos, sesiones revocadas/expiradas, cuentas desactivadas, inmutabilidad, idempotencia y auditoría. También prueban las nueve plantillas, coincidencia de campos entre pantalla y SQL, borradores, concurrencia, correcciones y consultas derivadas, filtros por trabajador y farmacia.
- `npm run build`: compilación.
- `node scripts/test-medical-http.mjs`: tras compilar, arranca un servidor de prueba en el puerto 3317; comprueba entrada sin email/contraseña, redirección anónima, no-cache y bloqueo de la vista previa en producción.
- Repetir la validación de inicio, guardado, cierre e impresión en Supabase después de aplicar la migración, usando datos ficticios. Verificar restauración de respaldo antes de usar expedientes reales.

## Vista previa

Con `npm run dev`, /historiales/vista-previa permite revisar las pantallas con datos ficticios, sin contactar la base. Los cambios se pierden al recargar. Los módulos compartidos muestran un aviso y requieren ingresar al espacio médico real para operar. Devuelve 404 en producción.

Next.js y ESLint se actualizaron a 16.3.5; la auditoría de paquetes terminó con cero vulnerabilidades reportadas durante esta implementación.

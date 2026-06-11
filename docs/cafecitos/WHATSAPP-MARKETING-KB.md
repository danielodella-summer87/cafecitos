# Cafecitos — Base de conocimiento WhatsApp, opt-in y promociones

## 1. Contexto del proyecto

Cafecitos es una app conectada a Supabase y desplegada en Vercel bajo el dominio:

https://cafecitos.shop

La app está vinculada a Amor Perfecto y permite que usuarios consumidores se registren, accedan con cédula + PIN, vean beneficios, promociones, niveles y acciones relacionadas con cafés, regalos y experiencias.

Actualmente el flujo de regalo de bienvenida fue ajustado para no depender de un PIN automático enviado por WhatsApp. En su lugar, el usuario inicia el contacto con Cafecitos desde la app mediante un botón:

“Solicitar regalo por WhatsApp”

Ese botón abre WhatsApp con un mensaje prearmado:

“Hola Cafecitos, quiero activar mi regalo de bienvenida.”

El link se genera con:

https://wa.me/{NUMERO_CAFECITOS}?text={MENSAJE_ENCODED}

El número se configura mediante variable pública de entorno:

NEXT_PUBLIC_CAFECITOS_WHATSAPP_NUMBER=598XXXXXXXX

Formato requerido:

598 + número móvil uruguayo sin 0 inicial, sin +, sin espacios ni guiones.

Ejemplo:

098 260 258 → 59898260258

---

## 2. Principio central del flujo WhatsApp

La estrategia actual es que el cliente inicie la conversación con Cafecitos.

Esto tiene una ventaja operativa importante:

- Cafecitos no invade al usuario inicialmente.
- El usuario demuestra intención.
- Se abre una ventana conversacional de atención.
- Cafecitos puede responder al mensaje del usuario.
- Se puede usar ese contacto para validar el teléfono real del usuario.

Flujo actual:

Usuario se registra en Cafecitos
↓
Usuario entra al dashboard o bienvenida
↓
Toca “Solicitar regalo por WhatsApp”
↓
Se abre WhatsApp con mensaje prearmado
↓
Usuario envía mensaje a Cafecitos
↓
Cafecitos recibe el mensaje en su WhatsApp oficial
↓
Luego se puede automatizar la activación del regalo

---

## 3. Restricción importante: WhatsApp Web común no alcanza para automatizar

WhatsApp Web o la app común de WhatsApp Business sirven para operar manualmente, pero no son suficientes para automatizar de forma robusta:

- Registrar automáticamente el número del usuario.
- Buscar el usuario en Supabase.
- Activar el regalo de bienvenida.
- Responder automáticamente.
- Enviar promociones segmentadas.
- Registrar opt-in y opt-out.

Para automatización real se necesita conectar el número oficial de Cafecitos a una API o proveedor:

- Twilio WhatsApp
- Meta WhatsApp Cloud API
- 360dialog
- Make/Zapier conectado a proveedor oficial

No se debe automatizar con scraping, bots no oficiales ni manipulación de WhatsApp Web.

---

## 4. Flujo futuro recomendado para activar regalo automáticamente

Objetivo:

Cuando un usuario escriba al WhatsApp oficial de Cafecitos solicitando el regalo, el sistema debería registrar el número desde donde escribió, buscarlo en Supabase y activar el regalo si coincide con un usuario registrado.

Flujo propuesto:

Usuario envía WhatsApp a Cafecitos:
“Hola Cafecitos, quiero activar mi regalo de bienvenida.”
↓
Proveedor WhatsApp envía webhook a la app
↓
Endpoint Next.js recibe el mensaje entrante
↓
Se extrae:
- teléfono del remitente
- mensaje recibido
- nombre de WhatsApp si está disponible
- fecha/hora
↓
Se normaliza el teléfono
↓
Se busca usuario en Supabase por teléfono normalizado
↓
Si coincide:
   - activar regalo de bienvenida
   - registrar trazabilidad
   - responder confirmación por WhatsApp
↓
Si no coincide:
   - responder que no se encontró la cuenta
   - pedir verificar número registrado

Endpoint sugerido:

POST /api/whatsapp/inbound

---

## 5. Reglas de seguridad para activación automática

No activar regalos solo porque alguien escribe por WhatsApp.

Antes de activar:

1. Normalizar el teléfono recibido.
2. Buscar ese teléfono en usuarios registrados.
3. Confirmar que existe un único usuario asociado.
4. Verificar que el regalo no esté ya activado.
5. Registrar el evento entrante.
6. Activar el regalo.
7. Responder confirmación.

No activar si:

- el teléfono no existe en la base
- hay más de un usuario con el mismo teléfono
- el mensaje no está relacionado con regalo/bienvenida
- el usuario ya tiene el regalo activado
- falta trazabilidad mínima

---

## 6. Datos mínimos a registrar del WhatsApp entrante

Para trazabilidad, crear o usar una tabla que registre mensajes entrantes.

Campos sugeridos:

- id
- whatsapp_from
- whatsapp_from_normalized
- whatsapp_profile_name
- whatsapp_message_body
- whatsapp_received_at
- matched_user_id
- matched_consumer_id
- action_taken
- status
- provider
- provider_message_id
- raw_payload_json
- created_at

Valores posibles de action_taken:

- welcome_gift_activated
- already_redeemed
- user_not_found
- ambiguous_phone
- ignored_message
- error

---

## 7. Normalización de teléfonos Uruguay

Los usuarios pueden cargar teléfonos de distintas formas:

- 098260258
- 98260258
- +59898260258
- 59898260258
- 098 260 258

La app debe normalizarlos a:

59898260258

Regla sugerida:

1. Quitar espacios, guiones, paréntesis y símbolos.
2. Quitar +.
3. Si empieza con 0 y tiene formato móvil uruguayo, quitar el 0 y anteponer 598.
4. Si empieza con 598, conservar.
5. Validar longitud esperada.
6. Guardar teléfono normalizado en la base si todavía no existe.

---

## 8. Opt-in para promociones

Para enviar promociones por WhatsApp, Cafecitos debe guardar consentimiento del usuario.

En el registro o perfil del usuario debería existir un checkbox:

“Acepto recibir por WhatsApp códigos, beneficios, promociones, invitaciones y novedades de Cafecitos / Amor Perfecto.”

Ese consentimiento debe guardarse en Supabase.

Campos sugeridos:

- whatsapp_opt_in boolean
- whatsapp_opt_in_at timestamp
- whatsapp_opt_in_source text
- whatsapp_phone text
- whatsapp_phone_normalized text
- whatsapp_opt_in_text text
- whatsapp_opt_out_at timestamp
- whatsapp_opt_out_source text

Ejemplo de valores:

whatsapp_opt_in: true
whatsapp_opt_in_at: 2026-06-11T10:00:00Z
whatsapp_opt_in_source: register
whatsapp_phone_normalized: 59898260258
whatsapp_opt_in_text: “Acepto recibir por WhatsApp códigos, beneficios, promociones, invitaciones y novedades de Cafecitos / Amor Perfecto.”

---

## 9. Opt-out / baja

Todo mensaje promocional debería incluir una salida clara.

Ejemplo:

“Respondé BAJA si no querés recibir más mensajes.”

Si el usuario responde:

BAJA

el sistema debe:

1. Marcar whatsapp_opt_in = false.
2. Guardar whatsapp_opt_out_at.
3. Guardar whatsapp_opt_out_source = whatsapp.
4. Responder confirmación.

Respuesta sugerida:

“Listo, dejamos de enviarte promociones por WhatsApp. Podés seguir usando tu app Cafecitos normalmente.”

---

## 10. Diferencia entre ventana de atención y promociones futuras

Si el usuario inicia la conversación escribiendo a Cafecitos, Cafecitos puede responder dentro de la ventana conversacional habilitada por WhatsApp.

Ejemplo:

Usuario: Hola Cafecitos, quiero activar mi regalo de bienvenida.
Cafecitos: Hola Nadia, tu regalo de bienvenida quedó activo ✅

Dentro de esa conversación se puede ofrecer algo relacionado:

“Además, esta semana tenemos una degustación especial de café en Amor Perfecto. Si querés, te paso los detalles.”

Pero esa conversación no habilita campañas libres indefinidamente.

Para enviar mensajes después, especialmente promociones, Cafecitos debe:

- tener opt-in guardado
- usar templates aprobados si corresponde
- respetar bajas
- registrar trazabilidad

---

## 11. Templates promocionales sugeridos para Cafecitos

Los templates usan variables tipo:

{{1}}, {{2}}, {{3}}, {{4}}

Estas variables se reemplazan al enviar.

### Template 1 — Regalo de bienvenida activado

Uso: confirmar que el regalo quedó activo.

Categoría sugerida: Utility o Marketing, según clasificación del proveedor.

Template:

Hola {{1}}, tu regalo de bienvenida de Cafecitos ya está activo ✅

Podés canjearlo en {{2}} hasta el {{3}}.

Mostrá tu app Cafecitos en el local para validarlo.

Ejemplo real:

Hola Nadia, tu regalo de bienvenida de Cafecitos ya está activo ✅

Podés canjearlo en Amor Perfecto hasta el 18/06.

Mostrá tu app Cafecitos en el local para validarlo.

---

### Template 2 — Invitación a degustación

Uso: invitar a usuarios con opt-in a una experiencia de café.

Categoría sugerida: Marketing.

Template:

Hola {{1}}, tenemos una degustación especial de café en {{2}} ☕

Día: {{3}}
Horario: {{4}}

Cupos limitados. Respondé QUIERO para reservar tu lugar.

Respondé BAJA si no querés recibir más mensajes.

Ejemplo real:

Hola Nadia, tenemos una degustación especial de café en Amor Perfecto ☕

Día: sábado 15/06
Horario: 17:00

Cupos limitados. Respondé QUIERO para reservar tu lugar.

Respondé BAJA si no querés recibir más mensajes.

---

### Template 3 — Beneficio semanal

Uso: promoción simple para estimular recurrencia.

Categoría sugerida: Marketing.

Template:

Hola {{1}}, esta semana tenés un beneficio Cafecitos en {{2}} ☕

Beneficio: {{3}}
Válido hasta: {{4}}

Mostrá tu app Cafecitos para usarlo.

Respondé BAJA si no querés recibir más mensajes.

Ejemplo real:

Hola Nadia, esta semana tenés un beneficio Cafecitos en Amor Perfecto ☕

Beneficio: 2x1 en espresso
Válido hasta: domingo 16/06

Mostrá tu app Cafecitos para usarlo.

Respondé BAJA si no querés recibir más mensajes.

---

### Template 4 — Cliente frecuente / falta poco para subir de nivel

Uso: motivar nueva visita y progreso en niveles.

Categoría sugerida: Marketing.

Template:

Hola {{1}}, te falta poco para subir a {{2}} en Cafecitos ☕

Te faltan {{3}} compras para desbloquear nuevos beneficios.

Pasá por {{4}} y seguí sumando cafecitos.

Respondé BAJA si no querés recibir más mensajes.

Ejemplo real:

Hola Nadia, te falta poco para subir a Cliente Plata en Cafecitos ☕

Te faltan 2 compras para desbloquear nuevos beneficios.

Pasá por Amor Perfecto y seguí sumando cafecitos.

Respondé BAJA si no querés recibir más mensajes.

---

### Template 5 — Beneficio por cumpleaños

Uso: enviar beneficio asociado a cumpleaños si la app guarda fecha de nacimiento.

Categoría sugerida: Marketing.

Template:

Hola {{1}}, Cafecitos quiere acompañarte en tu cumpleaños 🎉

Tenés un beneficio especial: {{2}}

Válido en {{3}} hasta el {{4}}.

Mostrá tu app Cafecitos para canjearlo.

Respondé BAJA si no querés recibir más mensajes.

Ejemplo real:

Hola Nadia, Cafecitos quiere acompañarte en tu cumpleaños 🎉

Tenés un beneficio especial: café de cortesía.

Válido en Amor Perfecto hasta el 30/06.

Mostrá tu app Cafecitos para canjearlo.

Respondé BAJA si no querés recibir más mensajes.

---

### Template 6 — Reactivación de usuario inactivo

Uso: usuarios que no volvieron hace determinada cantidad de días.

Categoría sugerida: Marketing.

Template:

Hola {{1}}, hace un tiempo no pasás por {{2}} ☕

Te dejamos un beneficio para tu próxima visita: {{3}}

Válido hasta el {{4}}.

Mostrá tu app Cafecitos para usarlo.

Respondé BAJA si no querés recibir más mensajes.

Ejemplo real:

Hola Nadia, hace un tiempo no pasás por Amor Perfecto ☕

Te dejamos un beneficio para tu próxima visita: 20% en tu café favorito.

Válido hasta el viernes 21/06.

Mostrá tu app Cafecitos para usarlo.

Respondé BAJA si no querés recibir más mensajes.

---

### Template 7 — Nuevo producto / café destacado

Uso: comunicar lanzamientos o café destacado de la semana.

Categoría sugerida: Marketing.

Template:

Hola {{1}}, llegó un nuevo café destacado a {{2}} ☕

Origen: {{3}}
Notas: {{4}}

Disponible esta semana para usuarios Cafecitos.

Respondé BAJA si no querés recibir más mensajes.

Ejemplo real:

Hola Nadia, llegó un nuevo café destacado a Amor Perfecto ☕

Origen: Colombia
Notas: chocolate, naranja y caramelo.

Disponible esta semana para usuarios Cafecitos.

Respondé BAJA si no querés recibir más mensajes.

---

### Template 8 — Recordatorio de beneficio disponible

Uso: recordar un beneficio ya disponible para el usuario.

Categoría sugerida: Utility o Marketing, según contexto.

Template:

Hola {{1}}, recordatorio Cafecitos ☕

Tenés disponible: {{2}}
Válido hasta: {{3}}

Podés verlo en tu app y canjearlo en {{4}}.

Ejemplo real:

Hola Nadia, recordatorio Cafecitos ☕

Tenés disponible: regalo de bienvenida
Válido hasta: 18/06

Podés verlo en tu app y canjearlo en Amor Perfecto.

---

## 12. Templates prioritarios para primera etapa

No conviene arrancar con demasiados templates. Para la primera etapa se recomiendan tres.

### Prioridad 1 — Regalo de bienvenida

Hola {{1}}, tu regalo de bienvenida de Cafecitos ya está activo ✅

Podés canjearlo en {{2}} hasta el {{3}}.

Mostrá tu app Cafecitos en el local para validarlo.

### Prioridad 2 — Beneficio semanal

Hola {{1}}, esta semana tenés un beneficio Cafecitos en {{2}} ☕

Beneficio: {{3}}
Válido hasta: {{4}}

Mostrá tu app Cafecitos para usarlo.

Respondé BAJA si no querés recibir más mensajes.

### Prioridad 3 — Invitación a degustación

Hola {{1}}, tenemos una degustación especial de café en {{2}} ☕

Día: {{3}}
Horario: {{4}}

Cupos limitados. Respondé QUIERO para reservar tu lugar.

Respondé BAJA si no querés recibir más mensajes.

---

## 13. Recomendación de implementación por etapas

### Etapa 1 — Auditoría

Antes de implementar, Cursor debe auditar:

- tablas actuales de usuarios/consumidores
- campo de teléfono actual
- función actual de activación de regalo
- tabla welcome_gifts o equivalente
- cómo se calcula welcomeGiftRedeemed
- rutas actuales de dashboard y bienvenida
- posibles tablas de movimientos/rewards/promociones

No ejecutar SQL sin confirmación manual.

### Etapa 2 — Webhook inbound

Crear endpoint:

POST /api/whatsapp/inbound

Responsabilidades:

- recibir mensaje entrante
- validar firma/secreto del proveedor
- extraer teléfono del remitente
- normalizar teléfono
- registrar evento inbound
- buscar usuario registrado
- activar regalo si corresponde
- responder por WhatsApp

### Etapa 3 — Consentimiento

Agregar opt-in en registro o perfil.

Campos mínimos:

- whatsapp_opt_in
- whatsapp_opt_in_at
- whatsapp_opt_in_source
- whatsapp_phone_normalized
- whatsapp_opt_in_text

Cualquier cambio de estructura debe proponerse como SQL/migración manual.

### Etapa 4 — Templates

Crear tabla o configuración para templates:

- id
- name
- provider_template_id
- category
- language
- body
- variables_schema
- status
- created_at
- updated_at

Estados posibles:

- draft
- submitted
- approved
- rejected
- active
- archived

### Etapa 5 — Envío de promociones

Enviar únicamente a usuarios que cumplan:

- whatsapp_opt_in = true
- whatsapp_phone_normalized not null
- whatsapp_opt_out_at is null

Registrar cada envío:

- id
- user_id
- template_id
- phone
- payload_json
- provider_message_id
- status
- sent_at
- delivered_at
- read_at
- failed_at
- error_message

---

## 14. Prompt base para Cursor cuando se comience implementación

Rol:
Actuá como Senior Next.js + Supabase Engineer + WhatsApp Automation Architect.

Contexto/Entorno:
Estamos trabajando en la app Cafecitos en:
/Users/danielodella/proyectos/cafecitos/web

Existe una base de conocimiento en:
docs/cafecitos/WHATSAPP-MARKETING-KB.md

El flujo actual permite que el usuario toque “Solicitar regalo por WhatsApp” y envíe:
“Hola Cafecitos, quiero activar mi regalo de bienvenida.”

Queremos preparar la automatización para:
1. recibir mensajes entrantes de WhatsApp,
2. identificar el teléfono,
3. buscar al usuario en Supabase,
4. activar el regalo de bienvenida,
5. guardar trazabilidad,
6. y más adelante enviar promociones solo con opt-in guardado.

Restricciones:
- No tocar DNS.
- No tocar Vercel.
- No tocar correo.
- No tocar datos productivos.
- No ejecutar SQL automáticamente.
- No crear integración Twilio/Meta sin confirmación.
- No enviar mensajes reales en esta fase.
- No activar regalos si el teléfono no coincide con un usuario registrado.
- No enviar promociones sin opt-in.
- No ignorar opt-out.
- Mantener cambios mínimos, auditables y seguros.

Objetivo inicial:
Auditar estructura actual y proponer implementación mínima.

Formato de salida:
- Archivos relevantes.
- Tablas detectadas.
- Flujo actual del regalo.
- Brechas.
- SQL necesario, solo como propuesta.
- Plan de implementación paso a paso.

---

## 15. Reglas no negociables para futuras fases

1. No usar WhatsApp Web scraping.
2. No enviar promociones sin opt-in.
3. No guardar secretos en frontend.
4. No commitear tokens ni claves.
5. No ejecutar SQL sin validación humana.
6. No activar regalos sin coincidencia clara de teléfono.
7. No usar número placeholder en producción.
8. No romper login/registro/dashboard.
9. No tocar DNS/correo/Vercel salvo que la tarea lo pida explícitamente.
10. Todo envío o activación debe dejar trazabilidad.

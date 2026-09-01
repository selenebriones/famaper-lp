import type { APIRoute } from 'astro';

export const prerender = false;

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const SENDER_EMAIL = 'noreply@futurite.info';
const RECIPIENT_EMAILS = ['ventas@famaper.com'];

// En copia oculta: reciben el aviso sin que sus direcciones queden a la vista.
const BCC_EMAILS = [
	'ifernandez@fmpracks.com',
	'asena@fmpracks.com',
	'Carlos.trevino@nordelt.com',
];

const MIN_FILL_TIME_MS = 3000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ\s.'-]{3,60}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9()+\-\s]{10,20}$/;
const CITY_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s.,'-]{3,60}$/;

const PRODUCTOS = new Set([
	'Menorack',
	'Selectivo',
	'Drive-In',
	'Push-Back',
	'Cantilever',
	'Entrepiso',
	'Mezzanine',
	'Dinámico',
	'Carton Flow',
	'Autoportante',
	'Consultoría / Diseño',
	'Instalación o reubicación',
	'Otro',
]);

const UTM_KEYS = [
	'utm_source',
	'utm_medium',
	'utm_campaign',
	'utm_term',
	'utm_content',
	'gclid',
	'fbclid',
	'msclkid',
] as const;

const UTM_LABELS: Record<(typeof UTM_KEYS)[number], string> = {
	utm_source: 'UTM Source',
	utm_medium: 'UTM Medium',
	utm_campaign: 'UTM Campaign',
	utm_term: 'UTM Term',
	utm_content: 'UTM Content',
	gclid: 'Google Click ID',
	fbclid: 'Facebook Click ID',
	msclkid: 'Microsoft Click ID',
};

const UTM_VALUE_REGEX = /^[A-Za-z0-9._\-|%{}()+:/ ]{1,200}$/;

interface FieldRule {
	regex: RegExp;
	label: string;
}

const FIELD_RULES: Record<string, FieldRule> = {
	nombre: { regex: NAME_REGEX, label: 'Nombre' },
	email: { regex: EMAIL_REGEX, label: 'Correo' },
	telefono: { regex: PHONE_REGEX, label: 'Teléfono' },
	ciudad: { regex: CITY_REGEX, label: 'Ciudad' },
};

const requestLog = new Map<string, number[]>();

// import.meta.env se resuelve al compilar; process.env se lee en ejecución.
// Consultar ambos permite cambiar variables en Vercel sin volver a desplegar.
function env(nombre: string): string | undefined {
	return (
		(import.meta.env as Record<string, string | undefined>)[nombre] ||
		(typeof process !== 'undefined' ? process.env?.[nombre] : undefined) ||
		undefined
	);
}

function isRateLimited(ip: string): boolean {
	const now = Date.now();
	const timestamps = (requestLog.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

	if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
		requestLog.set(ip, timestamps);
		return true;
	}

	timestamps.push(now);
	requestLog.set(ip, timestamps);
	return false;
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
	let body: Record<string, unknown>;

	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'Solicitud inválida.' }), { status: 400 });
	}

	// Honeypot: los bots llenan todo campo que parezca visible, incluido este.
	// Respondemos éxito para no revelarles que fueron detectados.
	if (typeof body.sitio_web === 'string' && body.sitio_web.trim() !== '') {
		return new Response(JSON.stringify({ success: true }), { status: 200 });
	}

	// Trampa de tiempo: una persona tarda más de unos segundos en llenar el formulario.
	const formLoadedAt = Number(body.form_ts);
	if (!formLoadedAt || Date.now() - formLoadedAt < MIN_FILL_TIME_MS) {
		return new Response(JSON.stringify({ error: 'Solicitud inválida.' }), { status: 400 });
	}

	const ip = clientAddress || request.headers.get('x-forwarded-for') || 'unknown';
	if (isRateLimited(ip)) {
		return new Response(
			JSON.stringify({ error: 'Demasiadas solicitudes. Intenta más tarde.' }),
			{ status: 429 }
		);
	}

	const errors: Record<string, string> = {};
	const clean: Record<string, string> = {};

	for (const [field, rule] of Object.entries(FIELD_RULES)) {
		const raw = body[field];
		const value = typeof raw === 'string' ? raw.trim() : '';

		if (!value) {
			errors[field] = `${rule.label} es obligatorio.`;
		} else if (!rule.regex.test(value)) {
			errors[field] = `${rule.label} no tiene un formato válido.`;
		} else {
			clean[field] = value;
		}
	}

	// El patrón admite espacios y paréntesis; aquí exigimos 10 dígitos reales.
	if (clean.telefono) {
		const digitos = clean.telefono.replace(/\D/g, '').replace(/^52/, '');
		if (digitos.length !== 10) {
			errors.telefono = 'Escribe un teléfono válido a 10 dígitos.';
			delete clean.telefono;
		}
	}

	const producto = typeof body.producto === 'string' ? body.producto.trim() : '';
	if (!producto) {
		errors.producto = 'Selecciona un producto o servicio.';
	} else if (!PRODUCTOS.has(producto)) {
		errors.producto = 'Selecciona una opción válida.';
	} else {
		clean.producto = producto;
	}

	if (body.no_robot !== true && body.no_robot !== 'on') {
		errors.no_robot = 'Confirma que no eres un robot para continuar.';
	}

	const mensaje = typeof body.mensaje === 'string' ? body.mensaje.trim().slice(0, 800) : '';
	if (mensaje) clean.mensaje = mensaje;

	if (Object.keys(errors).length > 0) {
		return new Response(JSON.stringify({ errors }), { status: 422 });
	}

	// Los UTM son opcionales (el tráfico orgánico no los trae), pero se sanitizan.
	const utmData: Partial<Record<(typeof UTM_KEYS)[number], string>> = {};
	for (const key of UTM_KEYS) {
		const raw = body[key];
		const value = typeof raw === 'string' ? raw.trim() : '';
		if (value && UTM_VALUE_REGEX.test(value)) {
			utmData[key] = value;
		}
	}

	const landingPageUrl =
		(typeof body.landing_url === 'string' && body.landing_url.slice(0, 300)) ||
		request.headers.get('referer') ||
		new URL(request.url).origin + '/';

	// Origen: página desde la que se envió el formulario. Puede diferir del landing
	// si la persona navegó antes de convertir.
	const origen =
		(typeof body.origen === 'string' && body.origen.trim().slice(0, 300)) ||
		request.headers.get('referer') ||
		landingPageUrl;

	const utmRows = UTM_KEYS.filter((key) => utmData[key]).map(
		(key) => `<p><strong>${UTM_LABELS[key]}:</strong> ${escapeHtml(utmData[key]!)}</p>`
	);
	const utmSection = utmRows.length
		? `<hr />\n\t\t<p><strong>Datos de campaña</strong></p>\n\t\t${utmRows.join('\n\t\t')}`
		: '<hr />\n\t\t<p><strong>Datos de campaña:</strong> tráfico directo u orgánico (sin UTM).</p>';

	const htmlContent = `
		<h2>Nueva solicitud de cotización</h2>
		<p>Recibida desde la landing page de racks industriales Famaper.</p>
		<p><strong>Nombre:</strong> ${escapeHtml(clean.nombre)}</p>
		<p><strong>Correo:</strong> ${escapeHtml(clean.email)}</p>
		<p><strong>Teléfono:</strong> ${escapeHtml(clean.telefono)}</p>
		<p><strong>Ciudad:</strong> ${escapeHtml(clean.ciudad)}</p>
		<p><strong>Producto o servicio:</strong> ${escapeHtml(clean.producto)}</p>
		${clean.mensaje ? `<p><strong>Mensaje:</strong> ${escapeHtml(clean.mensaje)}</p>` : ''}
		${utmSection}
		<p><strong>Origen (página del formulario):</strong> ${escapeHtml(origen)}</p>
		<hr />
		<p>Enviado automáticamente desde: ${escapeHtml(landingPageUrl)}</p>
	`;

	const payload = {
		...clean,
		...utmData,
		origen,
		landingPageUrl,
		submittedAt: new Date().toISOString(),
	};

	// Dos destinos independientes. Basta con que uno acepte el lead para darlo por
	// recibido: si n8n está caído, el correo salva la solicitud, y viceversa.
	const destinos: Promise<{ nombre: string; ok: boolean }>[] = [];

	const webhookUrl = env('N8N_WEBHOOK_URL');
	if (webhookUrl) {
		destinos.push(
			fetch(webhookUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})
				.then(async (res) => {
					if (!res.ok) console.error('n8n webhook error:', res.status, await res.text());
					return { nombre: 'n8n', ok: res.ok };
				})
				.catch((err) => {
					console.error('n8n webhook request failed:', err);
					return { nombre: 'n8n', ok: false };
				})
		);
	} else {
		console.error('N8N_WEBHOOK_URL no está configurada.');
	}

	const brevoKey = env('BREVO_API_KEY');
	if (brevoKey) {
		destinos.push(
			fetch(BREVO_API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					'api-key': brevoKey,
				},
				body: JSON.stringify({
					sender: { email: SENDER_EMAIL, name: 'Famaper - Racks Industriales' },
					to: RECIPIENT_EMAILS.map((email) => ({ email })),
					bcc: BCC_EMAILS.map((email) => ({ email })),
					replyTo: { email: clean.email, name: clean.nombre },
					subject: `Nueva solicitud de cotización - ${clean.nombre}`,
					htmlContent,
				}),
			})
				.then(async (res) => {
					if (!res.ok) console.error('Brevo API error:', res.status, await res.text());
					return { nombre: 'brevo', ok: res.ok };
				})
				.catch((err) => {
					console.error('Brevo request failed:', err);
					return { nombre: 'brevo', ok: false };
				})
		);
	} else {
		console.error('BREVO_API_KEY no está configurada.');
	}

	const resultados = await Promise.all(destinos);
	const entregado = resultados.some((r) => r.ok);

	if (!entregado) {
		console.error('Ningún destino aceptó el lead:', JSON.stringify(clean));
		return new Response(
			JSON.stringify({ error: 'No se pudo enviar la solicitud. Intenta de nuevo.' }),
			{ status: 502 }
		);
	}

	return new Response(JSON.stringify({ success: true }), { status: 200 });
};

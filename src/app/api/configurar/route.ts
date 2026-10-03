import { Client } from 'pg';
import { esAdmin, iniciarAdmin } from '@/lib/auth';
import { claveServicio, config, estadoInstalacion, guardarConfig, hashClave, urlPostgres, type Smtp } from '@/lib/config';
import { appUrl, ESQUEMA } from '@/lib/db';
import { crearBucket, probarCorreo, probarGemini } from '@/lib/pruebas';
import { sqlInstalacion } from '@/lib/esquema-sql';
import { fallo, json } from '@/lib/api';

export const maxDuration = 60;

function origen(req: Request) {
  // En Vercel se usa la dirección de producción; en local, la que se está usando
  return process.env.APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL ? appUrl() : new URL(req.url).origin;
}

// Mientras la app no esté configurada, cualquiera que abra la página puede usar este asistente
// (igual que al instalar WordPress). Una vez creada la contraseña, solo el operador.
export async function POST(req: Request) {
  const estado = await estadoInstalacion();
  if (estado.configurado && !(await esAdmin())) return fallo('La app ya está configurada. Entra como operador.', 401);
  const b = await req.json().catch(() => ({}));
  const sql = () => sqlInstalacion({ esquema: ESQUEMA, appUrl: origen(req), claveServicio: claveServicio() });

  try {
    switch (b.accion) {
      case 'estado':
        return json({ ...estado, esquema: ESQUEMA, sql: estado.variables ? sql() : null });

      case 'instalar_bd': {
        const url = urlPostgres();
        if (!url) return fallo('No hay cadena de conexión Postgres; ejecuta el SQL a mano en Supabase.');
        const cliente = new Client({ connectionString: url.replace(/[?&]sslmode=[^&]+/, ''), ssl: { rejectUnauthorized: false } });
        await cliente.connect();
        try {
          await cliente.query(sql());
          await cliente.query(`notify pgrst, 'reload schema'`);
        } finally {
          await cliente.end();
        }
        await crearBucket();
        return json({ ok: true });
      }

      case 'verificar_bd': {
        // Supabase tarda unos segundos en ver las tablas recién creadas
        let e = await estadoInstalacion();
        for (let i = 0; i < 5 && !e.tablas; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          e = await estadoInstalacion();
        }
        if (!e.tablas) return fallo(`Todavía no se ven las tablas. ${e.error ?? ''}`.trim());
        await crearBucket();
        return json({ ok: true });
      }

      case 'probar_gemini':
        return json({ ok: true, modelos: await probarGemini(String(b.clave ?? '').trim()) });

      case 'probar_correo': {
        const s: Smtp = { usuario: String(b.usuario ?? '').trim(), clave: String(b.clave ?? '').replace(/\s+/g, ''), host: b.host || undefined, puerto: b.puerto ? Number(b.puerto) : undefined };
        await probarCorreo(s, String(b.para || s.usuario), String(b.empresa ?? ''));
        return json({ ok: true });
      }

      case 'guardar': {
        if (estado.configurado) return fallo('Ya está configurada; usa la página Ajustes.');
        if (!estado.tablas) return fallo('Primero instala la base de datos.');
        const clave = String(b.clave_operador ?? '');
        if (clave.length < 8) return fallo('La contraseña del operador debe tener al menos 8 caracteres.');
        if (!b.gemini_key) return fallo('Falta la clave de Gemini.');
        await probarGemini(String(b.gemini_key).trim());
        await guardarConfig({
          empresa: String(b.empresa ?? '').trim().slice(0, 80),
          admin_hash: hashClave(clave),
          gemini_key: String(b.gemini_key).trim(),
          smtp: b.smtp_usuario && b.smtp_clave ? { usuario: String(b.smtp_usuario).trim(), clave: String(b.smtp_clave).replace(/\s+/g, '') } : null,
        });
        await crearBucket();
        await iniciarAdmin();
        return json({ ok: true });
      }

      case 'ajustes': {
        // Cambios posteriores desde la página Ajustes (solo operador)
        if (!(await esAdmin())) return fallo('Necesitas entrar como operador.', 401);
        const cambios: Parameters<typeof guardarConfig>[0] = {};
        if (b.empresa !== undefined) cambios.empresa = String(b.empresa).trim().slice(0, 80);
        if (b.gemini_key) {
          await probarGemini(String(b.gemini_key).trim());
          cambios.gemini_key = String(b.gemini_key).trim();
        }
        if (b.smtp_borrar) cambios.smtp = null;
        else if (b.smtp_usuario && b.smtp_clave) cambios.smtp = { usuario: String(b.smtp_usuario).trim(), clave: String(b.smtp_clave).replace(/\s+/g, '') };
        if (b.clave_operador) {
          if (String(b.clave_operador).length < 8) return fallo('La contraseña debe tener al menos 8 caracteres.');
          cambios.admin_hash = hashClave(String(b.clave_operador));
        }
        await guardarConfig(cambios);
        const c = await config();
        return json({ ok: true, empresa: c.empresa });
      }
    }
    return fallo('Acción desconocida.');
  } catch (e) {
    return fallo((e as Error).message, 500);
  }
}

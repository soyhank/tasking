// Prueba la extracción con la transcripción de una reunión guardada: npx tsx --env-file=.env.local scripts/probar-gemini.mts <id>
import { actaDesdeTexto } from '../src/lib/gemini.ts';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { db: { schema: process.env.SUPABASE_SCHEMA || 'public' } });
const { data: r } = await sb.from('reuniones').select('*').eq('id', process.argv[2]).single();
const { data: ps } = await sb.from('personas').select('*').eq('activo', true);
const t0 = Date.now();
const res = await actaDesdeTexto({ transcripcion: r.transcripcion, participantes: ps ?? [], inicio: new Date(r.inicio), fin: new Date(r.fin), titulo: r.titulo });
console.log(res.modelo, `${Date.now() - t0} ms`, JSON.stringify(res.acta, null, 1).slice(0, 1500));

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { message, role = 'admin', history = [], context = '' } = req.body;

  const PROMPTS: Record<string, string> = {
    admin:     'Eres Hugo en modo ADMINISTRADOR SOBERANO de U.GO — marketplace on-demand LATAM. Acceso total a métricas, usuarios y bóveda. Respondé en español, conciso y ejecutivo. Máximo 4 frases. Si proponés una acción ejecutable terminá con [ACCION: descripción].',
    cliente:   'Eres Hugo, el Núcleo de Inteligencia de U.GO. Guiás al cliente para contratar servicios del hogar. Respondé en el idioma del usuario. Máximo 2 frases.',
    proveedor: 'Eres Hugo, socio estratégico de U.GO para proveedores. Gestionás pedidos y ganancias. Tono profesional. Máximo 3 frases.',
  };

  const system = (PROMPTS[role] ?? PROMPTS.admin) +
    (context ? `\n\nESTADO ACTUAL:\n${context}` : '');

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 400,
        system,
        messages: [...history.slice(-6), { role: 'user', content: message }],
      }),
    });

    const data = await r.json();
    if (data.error) throw new Error(data.error.message);

    const texto = data.content?.[0]?.text ?? 'Sin respuesta.';
    const m = texto.match(/\[ACCION:\s*([^\]]+)\]/i);

    return res.json({
      hugo_mensaje: texto.replace(/\[ACCION:[^\]]+\]/gi, '').trim(),
      accion: m?.[1]?.trim() ?? null,
    });
  } catch (err: any) {
    return res.status(500).json({ hugo_mensaje: `Error Hugo: ${err.message}`, accion: null });
  }
}

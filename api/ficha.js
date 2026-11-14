import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

// Ajudante para escrever os elementos sem precisar de JSX
const h = (type, style, children) => ({ type, props: { style, children } });
const img = (src, style) => ({ type: 'img', props: { src, style } });

const COR = { escuro: '#3e220c', medio: '#4d2d12', vida: '#7a2e14', san: '#2f5c4a' };

// Pega o texto da URL e limita o tamanho (evita abuso)
const txt = (v, d = '', max = 40) => (v ?? d).toString().slice(0, max);
const lista = (v, max, tam) =>
  (v ?? '').split('|').map((s) => s.trim()).filter(Boolean).slice(0, max).map((s) => s.slice(0, tam));

export async function GET(request) {
  const url = new URL(request.url);
  const q = url.searchParams;
  const origem = url.origin;

  // baixa os arquivos da pasta public e já converte as imagens para "data:" (evita bloqueios)
  const baixa = (caminho) => fetch(`${origem}/${caminho}`).then((r) => r.arrayBuffer());
  const dataUri = async (caminho, tipo) =>
    `data:${tipo};base64,${Buffer.from(await baixa(caminho)).toString('base64')}`;

  const [fonte, fonteBold, fundo, imgAcerto, imgFalha] = await Promise.all([
    baixa('fonte.ttf'),
    baixa('fonte-bold.ttf'),
    dataUri('fundo.jpg', 'image/jpeg'),
    dataUri('acerto.png', 'image/png'),
    dataUri('falha.png', 'image/png'),
  ]);

  const nome = txt(q.get('nome'), 'Sem nome', 22);
  const jogador = txt(q.get('jogador'), '', 16);
  const vida = txt(q.get('vida'), '—', 14);
  const san = txt(q.get('san'), '—', 14);
  const moedas = Math.max(1, Math.min(6, parseInt(q.get('moedas') ?? '3', 10) || 3));
  const frus = Math.max(0, Math.min(6, parseInt(q.get('frus') ?? '0', 10) || 0));
  const verba = txt(q.get('verba'), '0', 4);
  const pericias = lista(q.get('pericias'), 4, 28);
  const sequelas = lista(q.get('sequelas'), 3, 62);
  const inv = lista(q.get('inv'), 4, 56);

  // posiciona um texto em coordenadas fixas (mesmas do fundo)
  const t = (x, y, w, texto, estilo) =>
    h('div', { position: 'absolute', left: x, top: y, width: w, display: 'flex', ...estilo }, texto);

  const filhos = [
    img(fundo, { position: 'absolute', left: 0, top: 0, width: 1200, height: 1700 }),

    t(150, 345, 640, nome, { fontSize: 52, fontWeight: 700, color: COR.escuro }),
    t(800, 395, 260, jogador, { fontSize: 30, fontWeight: 700, color: COR.escuro }),

    t(120, 525, 465, vida, { fontSize: 56, fontWeight: 700, color: COR.vida, justifyContent: 'center' }),
    t(615, 525, 465, san, { fontSize: 56, fontWeight: 700, color: COR.san, justifyContent: 'center' }),
    t(120, 625, 465, 'você só vê o estado, não o número', { fontSize: 21, color: '#8a6a2c', justifyContent: 'center' }),
    t(615, 625, 465, 'quem sabe o número é o mestre', { fontSize: 21, color: '#8a6a2c', justifyContent: 'center' }),

    t(800, 880, 260, `${moedas} moedas`, { fontSize: 30, fontWeight: 700, color: COR.escuro }),
  ];

  // as 6 moedas: acesas até o total atual, o resto apagado
  for (let i = 0; i < 6; i++) {
    filhos.push(
      img(i < moedas ? imgAcerto : imgFalha, {
        position: 'absolute',
        left: 215 + i * 105 - 42,
        top: 810,
        width: 84,
        height: 84,
        opacity: i < moedas ? 1 : 0.45,
      })
    );
  }

  // frustração: bolinhas preenchidas por cima das vazias do fundo
  for (let i = 0; i < frus; i++) {
    filhos.push(
      h('div', {
        position: 'absolute',
        left: 170 + i * 62 - 22,
        top: 1080 - 22,
        width: 44,
        height: 44,
        borderRadius: 22,
        background: COR.vida,
      })
    );
  }

  pericias.forEach((p, i) => filhos.push(t(645, 1060 + i * 30, 410, `◆ ${p}`, { fontSize: 21, color: COR.medio })));
  sequelas.forEach((s, i) => filhos.push(t(150, 1270 + i * 38, 900, s, { fontSize: 21, color: COR.medio })));
  inv.forEach((s, i) => filhos.push(t(150, 1460 + i * 38, 900, s, { fontSize: 21, color: COR.medio })));
  filhos.push(t(900, 1572, 160, `Verba: ${verba}`, { fontSize: 21, fontWeight: 700, color: '#8a6a2c', justifyContent: 'flex-end' }));

  const svg = await satori(
    h('div', { display: 'flex', position: 'relative', width: 1200, height: 1700, fontFamily: 'Fonte' }, filhos),
    {
      width: 1200,
      height: 1700,
      fonts: [
        { name: 'Fonte', data: fonte, weight: 400, style: 'normal' },
        { name: 'Fonte', data: fonteBold, weight: 700, style: 'normal' },
      ],
    }
  );
  const png = new Resvg(svg).render().asPng();
  return new Response(png, {
    headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=60' },
  });
      }

/* Design note: Arquivo de Bancada — guia assimétrico, materialidade técnica e dados em primeiro plano. */
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpRight,
  Bolt,
  CircuitBoard,
  Fan,
  Gauge,
  Menu,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";

const navItems = [
  ["01", "Visão geral", "#visao"],
  ["02", "Diagrama", "#diagrama"],
  ["03", "Compensação C6", "#c6"],
  ["04", "Proteção & VU", "#protecao"],
  ["05", "BOM adicional", "#bom"],
  ["06", "Bancada", "#bancada"],
];

const bom = [
  ["TMAIN", "Transformador principal", "48-0-48 VAC · 8–10 A · ≈800–1000 VA"],
  ["C+ / C−", "Filtragem principal", "4× 10.000 µF / 100 V · baixa ESR"],
  ["U3", "Proteção estéreo", "uPC1237 · atraso + DC + AC-off"],
  ["K1 / K2", "Relés de saída", "12/24 V · contatos ≥10 A"],
  ["C6A / C6B", "Compensação fixa", "22 pF C0G/NP0 · tensão elevada"],
  ["CT1A / CT1B", "Trimmer de compensação", "5–82 pF cerâmico · alta tensão"],
  ["U2 / U5", "Driver de barra VU", "LM3916 · 10 LEDs por canal"],
  ["NTC_T", "Sensor térmico", "NTC 10 kΩ no dissipador"],
];

const validationSteps = [
  ["01", "Sem alto-falante", "Confirme polaridade, bleeders e trilhos auxiliares com limitador de corrente."],
  ["02", "Um canal por vez", "Use carga resistiva, verifique offset, repouso, forma de onda e aquecimento."],
  ["03", "Ajuste C6", "Suba o trimmer somente até a resposta ficar estável em onda quadrada."],
  ["04", "Proteja antes de ouvir", "Simule atraso, DC e queda de rede com fonte limitada antes de conectar caixas."],
];

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`font-mono text-[10px] font-semibold uppercase tracking-[0.18em] ${className}`}>{children}</span>;
}

function SectionHeading({ index, eyebrow, title, copy }: { index: string; eyebrow: string; title: string; copy: string }) {
  return (
    <div className="mb-9 grid gap-4 border-b border-[var(--rule)] pb-6 md:grid-cols-[84px_1fr]">
      <Label className="text-[var(--copper-dark)]">{index}</Label>
      <div>
        <Label className="text-[var(--muted-ink)]">{eyebrow}</Label>
        <h2 className="mt-2 font-serif text-4xl leading-[0.95] text-[var(--ink)] sm:text-5xl">{title}</h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted-ink)] sm:text-base">{copy}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const [trimC, setTrimC] = useState(60);
  const [menuOpen, setMenuOpen] = useState(false);
  const totalC = 22 + trimC;
  const cutoff = useMemo(() => Math.round(1 / (2 * Math.PI * 33_000 * totalC * 1e-12)), [totalC]);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[rgba(29,33,31,0.96)] text-[#efe7d6] backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-[1500px] items-center justify-between px-5 sm:px-8">
          <a href="#top" className="flex items-center gap-3" aria-label="Ir ao início">
            <img src="/media/nashville-channel-mark.png" className="h-10 w-10 object-contain" alt="Símbolo de dois canais" />
            <div className="leading-none"><span className="block font-serif text-xl tracking-tight">NA / 2200</span><Label className="text-[#b6d1a2]">Nashville · guia de bancada</Label></div>
          </a>
          <nav className="hidden items-center gap-5 lg:flex" aria-label="Navegação principal">
            {navItems.slice(1, 5).map(([, title, href]) => <a key={href} href={href} className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#c5c1b4] transition-colors hover:text-[#b6d1a2]">{title}</a>)}
            <a href="#bancada" className="border border-[rgba(184,94,61,0.9)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f4c7b7] transition-colors hover:bg-[var(--copper)] hover:text-white">Protocolo de teste</a>
          </nav>
          <button className="grid h-10 w-10 place-items-center border border-white/20 lg:hidden" onClick={() => setMenuOpen((value) => !value)} aria-label="Abrir menu" aria-expanded={menuOpen}>{menuOpen ? <X size={19} /> : <Menu size={19} />}</button>
        </div>
        {menuOpen && <nav className="border-t border-white/10 bg-[#242925] px-5 py-5 lg:hidden" aria-label="Navegação móvel"><div className="grid gap-3">{navItems.map(([index, title, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 text-sm text-[#e7dfce]"><Label className="text-[#b6d1a2]">{index}</Label>{title}</a>)}</div></nav>}
      </header>

      <main id="top">
        <section className="relative isolate min-h-[640px] overflow-hidden bg-[var(--graphite)] text-[#f3eddf]">
          <img src="/media/nashville-hero-vintage.jpg" alt="Amplificador profissional vintage em uma bancada de manutenção" className="absolute inset-0 h-full w-full object-cover object-center opacity-85" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(20,24,22,0.97)_0%,rgba(20,24,22,0.89)_42%,rgba(20,24,22,0.30)_78%,rgba(20,24,22,0.52)_100%)]" />
          <div className="relative mx-auto grid min-h-[640px] max-w-[1500px] content-center gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_360px] lg:gap-16">
            <div className="max-w-3xl">
              <div className="rise-in flex flex-wrap items-center gap-x-4 gap-y-2"><Label className="border border-[#b85e3d] px-2 py-1 text-[#f2b39e]">Rev. 02 · proposta de engenharia</Label><Label className="text-[#b6d1a2]">arquivo técnico brasileiro</Label></div>
              <h1 className="rise-in delay-1 mt-7 font-serif text-[clamp(3.5rem,9vw,7.8rem)] leading-[0.82] tracking-[-0.055em]">Nashville<br /><em className="text-[#b6d1a2]">NA 2200 PRO</em></h1>
              <p className="rise-in delay-2 mt-8 max-w-2xl text-base leading-8 text-[#ddd5c5] sm:text-lg">Um guia de bancada para expandir o circuito original em dois canais, fonte simétrica, proteção de alto-falantes, VU LED e ajuste calculado de compensação.</p>
              <div className="rise-in delay-2 mt-9 flex flex-wrap gap-3"><a href="#diagrama" className="inline-flex items-center gap-2 bg-[#b85e3d] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition-transform duration-150 hover:bg-[#cd6b47] active:scale-[0.97]">Abrir diagrama <ArrowDownToLine size={15} /></a><a href="#c6" className="inline-flex items-center gap-2 border border-white/30 px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#e9e0d1] transition-colors hover:border-[#b6d1a2] hover:text-[#b6d1a2]">Conferir C6 <ArrowUpRight size={15} /></a></div>
            </div>
            <aside className="rise-in delay-2 self-end border border-white/15 bg-[rgba(27,31,29,0.73)] p-5 backdrop-blur-sm sm:p-6"><Label className="text-[#b6d1a2]">status de projeto</Label><div className="mt-6 grid grid-cols-3 divide-x divide-white/15 border-y border-white/15 py-5 text-center"><div><strong className="block font-serif text-3xl">02</strong><Label className="text-[#bcb6a8]">canais</Label></div><div><strong className="block font-serif text-3xl">±65</strong><Label className="text-[#bcb6a8]">V rails</Label></div><div><strong className="block font-serif text-3xl">82</strong><Label className="text-[#bcb6a8]">pF alvo</Label></div></div><p className="mt-5 text-sm leading-6 text-[#cbc4b5]">Documento funcional. Exige validação de layout, lote de transistores e segurança elétrica antes de energizar.</p></aside>
          </div>
          <svg className="absolute bottom-0 left-0 h-20 w-full" viewBox="0 0 1200 90" preserveAspectRatio="none" aria-hidden="true"><path className="signal-path" d="M0 54 C150 12 260 92 430 50 S730 12 900 50 S1080 80 1200 35" fill="none" stroke="#b85e3d" strokeWidth="2" strokeDasharray="6 8" /></svg>
        </section>

        <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="hidden border-r border-[var(--rule)] px-8 py-14 lg:block"><div className="sticky top-28"><Label className="text-[var(--copper-dark)]">índice da revisão</Label><nav className="mt-5 grid gap-1" aria-label="Índice do guia">{navItems.map(([index, title, href]) => <a key={href} href={href} className="group flex items-center gap-3 border-b border-[var(--rule)] py-3 text-sm text-[var(--muted-ink)] transition-colors hover:text-[var(--ink)]"><Label className="text-[var(--copper)]">{index}</Label><span>{title}</span></a>)}</nav><div className="mt-10 border-l-2 border-[var(--danger)] pl-4"><Label className="text-[var(--danger)]">alta tensão</Label><p className="mt-2 text-xs leading-5 text-[var(--muted-ink)]">O chassi combina rede AC e trilhos de potência. Não teste com caixas conectadas.</p></div></div></aside>
          <div className="px-5 py-14 sm:px-8 lg:px-14 lg:py-20">
            <section id="visao"><SectionHeading index="01" eyebrow="Leitura de partida" title="O original é o núcleo. A bancada é o sistema." copy="A atualização parte do par de placas DP-2200A/P2200C, mas trata a alimentação, a proteção e a medição como subsistemas independentes. A página marca o que veio do desenho e o que foi adicionado como proposta de engenharia." /><div className="grid gap-px bg-[var(--rule)] md:grid-cols-3">{[[CircuitBoard, "Preservado", "Entrada, VAS, drivers e banco de saída do circuito de referência."], [ShieldCheck, "Acrescentado", "Atraso, DC, AC-off, relés, controle térmico e ventilação."], [Gauge, "Calibrável", "C6, limiares, VU e comportamento em carga resistiva são ajustados em bancada."]].map(([Icon, title, copy]) => { const FeatureIcon = Icon as typeof CircuitBoard; return <article key={String(title)} className="bg-[rgba(246,240,226,0.84)] p-6"><FeatureIcon className="text-[var(--copper)]" size={22} /><h3 className="mt-5 font-serif text-2xl">{title as string}</h3><p className="mt-3 text-sm leading-6 text-[var(--muted-ink)]">{copy as string}</p></article>; })}</div></section>

            <section id="diagrama" className="mt-24 scroll-mt-28"><SectionHeading index="02" eyebrow="Topologia atualizada" title="Dois canais, um ponto de referência." copy="O diagrama separa o caminho de potência da alimentação auxiliar. Relés e VU amostram a saída antes do contato de alto-falante; a estrela de 0 V permanece como referência de retorno." /><figure className="border border-[var(--ink)] bg-[#f8f3e9] p-2 shadow-[7px_7px_0_rgba(32,37,32,0.16)] sm:p-4"><img src="/media/na2200_atualizado_diagrama.png" alt="Diagrama funcional atualizado do Nashville NA 2200 PRO com dois canais, fonte, proteção e VU" className="w-full border border-[var(--rule)]" /><figcaption className="flex flex-wrap items-center justify-between gap-3 px-2 pb-1 pt-4 text-xs text-[var(--muted-ink)]"><span><Label className="text-[var(--copper-dark)]">fig. 01</Label> · esquema funcional, não é arquivo de PCB.</span><span className="font-mono">DP-2200A / P2200C · REVISÃO PROPOSTA</span></figcaption></figure></section>

            <section id="c6" className="mt-24 scroll-mt-28"><SectionHeading index="03" eyebrow="Compensação de produção" title="C6 deixa de ser um mistério e vira uma faixa de teste." copy="No desenho original, C6 está em paralelo com R23 de 33 kΩ e recebe a marca de ajuste em produção. Aqui, o valor é documentado como uma combinação fixa mais um trimmer cerâmico." /><div className="grid border border-[var(--ink)] bg-[#222623] text-[#f1ebde] lg:grid-cols-[minmax(0,1fr)_280px]"><div className="p-6 sm:p-9"><Label className="text-[#b6d1a2]">simulador de primeira ordem</Label><div className="mt-7 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end"><div><div className="flex items-end justify-between gap-3"><span className="font-serif text-4xl">{totalC} <small className="font-mono text-sm text-[#b6d1a2]">pF total</small></span><span className="font-mono text-xs text-[#c2beb1]">22 pF fixo + {trimC} pF variável</span></div><input aria-label="Ajuste do trimmer C6" type="range" min="5" max="82" value={trimC} onChange={(event) => setTrimC(Number(event.target.value))} className="mt-6 w-full accent-[#b85e3d]" /><div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-[#a8a395]"><span>CT mínimo 5 pF</span><span>CT máximo 82 pF</span></div></div><div className="border-l border-white/15 pl-5"><Label className="text-[#c7c0b2]">fc aproximada</Label><strong className="mt-2 block font-serif text-4xl text-[#b6d1a2]">{(cutoff / 1000).toFixed(1)} <small className="font-mono text-sm">kHz</small></strong></div></div><p className="mt-7 max-w-2xl text-sm leading-6 text-[#cec7b9]">A curva usa <span className="font-mono text-[#f0c5b6]">fc ≈ 1 / (2π · 33 kΩ · Ctotal)</span>. O valor inicial de 82 pF aproxima 59 kHz; o resultado real depende de layout, transistores, carga e capacitâncias parasitas.</p></div><div className="border-t border-white/15 bg-[#2b302b] p-6 lg:border-l lg:border-t-0"><Label className="text-[#f0b39e]">decisão de componente</Label><dl className="mt-6 grid gap-5 text-sm"><div><dt className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#9aa895]">C6A / C6B</dt><dd className="mt-1 text-[#f0ece2]">22 pF C0G/NP0 fixo</dd></div><div><dt className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#9aa895]">CT1A / CT1B</dt><dd className="mt-1 text-[#f0ece2]">5–82 pF cerâmico HV</dd></div><div><dt className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#9aa895]">Método</dt><dd className="mt-1 text-[#f0ece2]">Carga resistiva + osciloscópio</dd></div></dl></div></div></section>

            <section id="protecao" className="mt-24 scroll-mt-28"><SectionHeading index="04" eyebrow="Camadas de defesa" title="A fonte alimenta. A proteção decide." copy="A proposta separa a energia dos canais, a lógica de alto-falantes, o controle térmico e a leitura visual do sinal. Cada módulo ganha uma fonte auxiliar compatível com seu próprio CI." /><div className="grid gap-8 lg:grid-cols-2"><article className="border-t-2 border-[var(--copper)] bg-[rgba(246,240,226,0.84)] p-6 sm:p-8"><div className="flex items-center justify-between"><ShieldCheck className="text-[var(--copper)]" size={28} /><Label className="text-[var(--copper-dark)]">uPC1237</Label></div><h3 className="mt-8 font-serif text-4xl leading-none">Proteção estéreo</h3><p className="mt-4 text-sm leading-7 text-[var(--muted-ink)]">Amostra cada saída antes dos relés. O caminho proposto prevê offset DC, atraso de 1–3 s, desligamento em AC-off e bobinas com flyback.</p><div className="mt-7 grid grid-cols-3 gap-2 border-t border-[var(--rule)] pt-5 text-center"><div><Bolt className="mx-auto text-[var(--danger)]" size={17}/><Label className="mt-2 block text-[var(--muted-ink)]">DC</Label></div><div><Activity className="mx-auto text-[var(--signal)]" size={17}/><Label className="mt-2 block text-[var(--muted-ink)]">Delay</Label></div><div><Fan className="mx-auto text-[var(--copper)]" size={17}/><Label className="mt-2 block text-[var(--muted-ink)]">AC-off</Label></div></div></article><article className="border-t-2 border-[var(--signal)] bg-[rgba(246,240,226,0.84)] p-6 sm:p-8"><div className="flex items-center justify-between"><Gauge className="text-[var(--signal)]" size={28} /><Label className="text-[var(--copper-dark)]">LM3916 × 2</Label></div><h3 className="mt-8 font-serif text-4xl leading-none">VU LED de dois canais</h3><p className="mt-4 text-sm leading-7 text-[var(--muted-ink)]">Divisor de alta impedância, retificação ativa e uma barra de dez LEDs por canal. O painel lê nível; não substitui medição de potência calibrada.</p><div className="mt-8 flex h-10 items-end gap-1" aria-label="Representação de barra VU"><span className="h-2 flex-1 bg-[#5f8160]"/><span className="h-3 flex-1 bg-[#5f8160]"/><span className="h-4 flex-1 bg-[#5f8160]"/><span className="h-5 flex-1 bg-[#5f8160]"/><span className="h-6 flex-1 bg-[#7e9d75]"/><span className="h-7 flex-1 bg-[#c79b45]"/><span className="h-8 flex-1 bg-[#c79b45]"/><span className="h-9 flex-1 bg-[#c79b45]"/><span className="h-10 flex-1 bg-[#b85e3d]"/><span className="h-10 flex-1 bg-[#a84436]"/></div></article></div><div className="mt-8 grid gap-4 border-l-2 border-[var(--danger)] bg-[rgba(168,68,54,0.08)] p-5 sm:grid-cols-[auto_1fr] sm:p-6"><TriangleAlert className="text-[var(--danger)]" size={23}/><p className="text-sm leading-6 text-[var(--muted-ink)]"><strong className="text-[var(--ink)]">Atenção de bancada.</strong> Não conecte comparadores, VU ou microcontroladores diretamente aos trilhos ±65 V. A lógica opera na fonte auxiliar e observa o estágio de potência por divisores e filtros.</p></div></section>

            <section id="bom" className="mt-24 scroll-mt-28"><SectionHeading index="05" eyebrow="Componentes adicionados" title="BOM de atualização, não lista de compra cega." copy="Os itens abaixo complementam a lista extraída do diagrama histórico. Especificações de tensão, corrente, ripple e isolação precisam ser confirmadas para o transformador e o layout finais." /><div className="overflow-x-auto border border-[var(--ink)] bg-[rgba(248,243,233,0.88)]"><table className="w-full min-w-[670px] text-left text-sm"><thead className="border-b border-[var(--ink)] bg-[#dcd0ba] font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink)]"><tr><th className="px-5 py-4">Ref.</th><th className="px-5 py-4">Função</th><th className="px-5 py-4">Especificação inicial</th></tr></thead><tbody>{bom.map(([ref, purpose, spec]) => <tr key={ref} className="border-b border-[var(--rule)] last:border-0"><td className="px-5 py-4 font-mono text-xs text-[var(--copper-dark)]">{ref}</td><td className="px-5 py-4 font-medium">{purpose}</td><td className="px-5 py-4 text-[var(--muted-ink)]">{spec}</td></tr>)}</tbody></table></div></section>

            <section id="bancada" className="mt-24 scroll-mt-28"><SectionHeading index="06" eyebrow="Antes de ouvir" title="Protocolo de bancada em quatro passagens." copy="A sequência reduz a chance de que uma falha de alimentação, compensação ou proteção alcance os alto-falantes. Os passos exigem limitador de corrente, carga resistiva e instrumento de medição adequado." /><div className="grid gap-px bg-[var(--rule)] md:grid-cols-2">{validationSteps.map(([step, title, copy]) => <article key={step} className="group bg-[rgba(246,240,226,0.88)] p-6 transition-colors hover:bg-[#f9f4e9]"><Label className="text-[var(--copper)]">Passagem {step}</Label><h3 className="mt-6 font-serif text-3xl">{title}</h3><p className="mt-3 max-w-sm text-sm leading-6 text-[var(--muted-ink)]">{copy}</p></article>)}</div><div className="mt-10 flex flex-col justify-between gap-6 border-y border-[var(--ink)] py-7 sm:flex-row sm:items-center"><div><Label className="text-[var(--copper-dark)]">encerramento do guia</Label><p className="mt-2 max-w-2xl font-serif text-2xl leading-tight">O objetivo não é acelerar a energização; é tornar cada decisão rastreável.</p></div><a href="#top" className="inline-flex shrink-0 items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-[var(--copper-dark)] hover:text-[var(--danger)]">Voltar ao topo <ArrowUpRight size={15}/></a></div></section>
          </div>
        </div>
      </main>

      <footer className="bg-[#1d211f] text-[#d6cdbc]"><div className="mx-auto grid max-w-[1500px] gap-8 px-5 py-10 sm:px-8 md:grid-cols-[1.2fr_1fr]"><div><Label className="text-[#b6d1a2]">NA / 2200 · guia de bancada</Label><p className="mt-4 max-w-xl text-sm leading-6 text-[#aaa89d]">Baseado no esquema histórico do Nashville NA 2200 e em uma proposta de atualização documentada. Use como referência de estudo e prototipagem, não como certificação de segurança.</p></div><div className="border-l border-white/10 pl-5 text-sm leading-6 text-[#aaa89d]"><span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#f0b39e]">Referências de consulta</span><p className="mt-3">RC Audio · Electronica-PT · Texas Instruments · NEC/uPC1237 · análise Antenna.</p></div></div></footer>
    </div>
  );
}

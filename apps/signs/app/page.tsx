'use client';

// This component is shared with a standalone Vite SPA; use portable HTML links and images.
/* oxlint-disable next/no-html-link-for-pages, next/no-img-element */

import { useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowRight,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Copy,
  Check,
  Code2,
  Feather,
  BookOpen,
  RotateCcw,
  ChevronDown,
  Home,
  Package,
  Compass,
  Skull,
  Sun,
  Moon,
  Info,
  MoveVertical,
  Wand2,
} from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { languages } from '@/lib/i18n';
import { DirectionProvider } from '@/components/ui/direction';
import { Slider } from '@/components/ui/slider';
import { useSignFontSize } from '@/hooks/use-sign-font-size';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  defaults,
  compileSign,
  countText,
  parseRichText,
  templates,
  tagGroups,
  type SignSettings,
} from '@/lib/rich-text';

const palette = [
  '#EBC789',
  '#FFFFFF',
  '#EB8D77',
  '#E5BA58',
  '#A9C89F',
  '#90C9E3',
  '#C4A4DE',
  '#000000',
];
const signSymbols = [
  '←',
  '→',
  '↑',
  '↓',
  '★',
  '◆',
  '⚔',
  'ᚱ',
  'ᚦ',
  '♠',
  '♣',
  '♥',
  '♦',
  '☀',
  '☁',
  '☂',
  '☃',
  '☄',
  '☆',
  '☎',
  '☏',
  '☢',
  '☣',
  '☸',
  '☹',
  '☺',
  '♀',
  '♁',
  '♂',
  '♈',
  '♟',
  '♡',
  '♢',
  '♤',
  '♹',
  '♺',
  '♻',
  '♼',
  '♽',
  '♾',
  '♿',
  '⚛',
  '⚜',
  '⚠',
  '⚡',
  '⚧',
  '⚪',
  '⚫',
  '✂',
  '⛎',
  '⛏',
  '⛑',
  '⛓',
  '⛔',
];
const templateIcons = [Home, Package, Compass, Skull];
const sources = [
  [
    'TextMesh Pro · přehled značek',
    'https://docs.unity3d.com/Packages/com.unity.textmeshpro@4.0/manual/RichTextSupportedTags.html',
  ],
  [
    'TextMesh Pro · pravidla zápisu',
    'https://docs.unity3d.com/Packages/com.unity.textmeshpro@4.0/manual/RichText.html',
  ],
  ['Valheim Wiki · cedule a limit', 'https://valheim.fandom.com/wiki/Sign'],
  [
    'Herní reference · běžný a tučný nápis',
    'https://steamcommunity.com/sharedfiles/filedetails/?id=3030696826',
  ],
  [
    'ComfySigns · rozdíly při použití modu',
    'https://github.com/redseiko/ComfyMods/tree/main/ComfySigns',
  ],
];
function RangeControl({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="range-control">
      <div className="label-row">
        <label>{label}</label>
        <output>
          {value}
          {suffix}
        </output>
      </div>
      <Slider
        aria-label={label}
        value={[value]}
        min={min}
        max={max}
        step={1}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      />
    </div>
  );
}
export default function Page() {
  const { t, locale, preference, setPreference } = useLanguage();
  const [text, setText] = useState('WELCOME HOME');
  const [settings, setSettings] = useState<SignSettings>(defaults);
  const [compact, setCompact] = useState(true);
  const [raw, setRaw] = useState<string | null>(null);
  const [mode, setMode] = useState('visual');
  const [advanced, setAdvanced] = useState(false);
  const [day, setDay] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [limit, setLimit] = useState('50');
  const [guideOpen, setGuideOpen] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null),
    output = useRef<HTMLTextAreaElement>(null);
  const selection = useRef({ start: -1, end: -1 });
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const code = raw ?? compileSign(text, settings, compact);
  const count = countText(code);
  const preview = useMemo(() => parseRichText(code, t), [code, t]);
  const over = count.units > Number(limit);
  const unicodeRisk = !over && count.bytes > Number(limit);
  const signScene = useRef<HTMLDivElement>(null);
  const signContent = useRef<HTMLDivElement>(null);
  const previewLayout = useSignFontSize(signScene, signContent, preview.runs);
  const set = <K extends keyof SignSettings>(
    key: K,
    value: SignSettings[K],
  ) => {
    setSettings((s) => ({ ...s, [key]: value }));
    setCopied(false);
  };
  const changeMode = (value: string) => {
    if (value === 'code') setRaw(code);
    else if (raw !== null) {
      setText(raw);
      setSettings({ ...defaults, color: '' });
      setRaw(null);
    }
    setMode(value);
    selection.current = { start: -1, end: -1 };
  };
  const wrap = (tag: string, closing?: string) => {
    const name = tag.match(/^<([a-z-]+)/i)?.[1] ?? 'color';
    const close = closing ?? `</${name}>`;
    if (mode === 'code') {
      setRaw((raw ?? code) + tag);
      return;
    }
    const { start, end } = selection.current;
    if (start !== end) {
      setText(
        (t) =>
          t.slice(0, start) + tag + t.slice(start, end) + close + t.slice(end),
      );
      selection.current = { start: -1, end: -1 };
    } else {
      setText((t) => tag + t + close);
    }
    setCopied(false);
  };
  const insert = (value: string) => {
    if (mode === 'code') {
      setRaw((raw ?? code) + value);
      return;
    }
    const { start, end } = selection.current;
    const pos = start < 0 ? text.length : start;
    setText((t) => t.slice(0, pos) + value + t.slice(start < 0 ? pos : end));
    selection.current = { start: pos + value.length, end: pos + value.length };
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.setSelectionRange(pos + value.length, pos + value.length);
    });
  };
  const format = (
    key: 'bold' | 'italic' | 'underline' | 'strike',
    tag: string,
  ) => {
    if (selection.current.start !== selection.current.end) wrap(`<${tag}>`);
    else set(key, !settings[key]);
  };
  const chooseColor = (color: string) => {
    if (selection.current.start !== selection.current.end)
      wrap(`<color=${color}>`);
    else set('color', color);
  };
  const copy = async () => {
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2200);
    } catch {
      output.current?.focus();
      output.current?.select();
      setCopyError(true);
    }
  };
  const reset = () => {
    setText('');
    setSettings(defaults);
    setRaw(null);
    setMode('visual');
    setCopied(false);
    selection.current = { start: -1, end: -1 };
  };
  return (
    <DirectionProvider direction={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="app-shell">
        <header className="site-header">
          <div className="flex flex-col justify-center gap-1">
            <a
              href="/"
              className="text-xs text-[#a5b0a4] hover:text-[#d2d8cb] transition-colors inline-flex items-center gap-1 opacity-80 hover:opacity-100"
            >
              ← Valheim Companion
            </a>
            <a
              href={import.meta.env.BASE_URL}
              className="brand"
              aria-label={t('Runopis – editor cedulí')}
            >
              <span className="brand-mark">
                <Feather size={24} />
              </span>
              <span>
                RUNOPIS<span className="brand-sub">VALHEIM SIGN STUDIO</span>
              </span>
            </a>
          </div>
          <div className="header-right">
            <label className="language-picker">
              <span aria-hidden="true">◎</span>
              <select
                aria-label={t('Jazyk')}
                value={preference}
                onChange={(event) => setPreference(event.target.value)}
              >
                <option value="auto">
                  {t('Automaticky podle prohlížeče')}
                  {preference === 'auto' &&
                    ` (${languages.find((language) => language.code === locale)?.name})`}
                </option>
                {languages.map((language) => (
                  <option
                    key={language.code}
                    value={language.code}
                    lang={language.code}
                  >
                    {language.name}
                  </option>
                ))}
              </select>
            </label>
            <span className="vanilla-label">
              <span /> {t('Pro tvůj svět ve Valheimu')}
            </span>
            <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
              <DialogTrigger className="quiet-button guide-button">
                <BookOpen size={17} /> {t('Průvodce značkami')}
              </DialogTrigger>
              <DialogContent className="guide-dialog" closeLabel={t('Zavřít')}>
                <DialogHeader>
                  <DialogTitle>{t('Malý průvodce velkými nápisy')}</DialogTitle>
                  <DialogDescription>
                    {t(
                      'Rich text pro Valheim. Základní značky i úplný přehled možností TextMesh Pro.',
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="guide-scroll">
                  <div className="guide-intro">
                    <Info size={20} />
                    <p>
                      {t(
                        'Barvy, velikost, tučné písmo a kurzíva se běžně používají bez modů. Ostatní značky vychází z dokumentace enginu; jejich chování závisí na verzi hry a nastavení cedule.',
                      )}
                    </p>
                  </div>
                  {tagGroups.map((group) => (
                    <section className="tag-group" key={group.name}>
                      <h3>{t(group.name)}</h3>
                      <p>{t(group.note)}</p>
                      <div className="tag-grid">
                        {group.tags.map(([name, label, example]) => (
                          <button
                            title={t('Vložit {value}', { value: example })}
                            key={name}
                            onClick={() => {
                              wrap(
                                example,
                                ['br', 'space', 'page', 'sprite'].includes(name)
                                  ? ''
                                  : undefined,
                              );
                              setGuideOpen(false);
                            }}
                          >
                            <span>{t(label)}</span>
                            <code>{example}</code>
                            <span aria-hidden="true">+</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                  <section className="guide-notes">
                    <h3>{t('Co se hodí vědět')}</h3>
                    <p>{t('Pravidla značek')}</p>
                    <p>
                      {t(
                        'Úsporný zápis vynechá koncové uzavírací značky. Značky uprostřed nápisu ponechá, aby se nezměnil význam. Formátování se započítává do limitu.',
                      )}
                    </p>
                    <p>
                      {t(
                        'Výchozí limit je 50. Wiki uvádí také UTF‑8 bajty, zatímco modifikace pracují s limitem vstupního pole. Proto zde vidíš oba údaje. Režim 999 použij jen s odpovídajícím modem.',
                      )}
                    </p>
                    <p>
                      {t(
                        'Náhled je přibližný. Herní atlas znaků, automatické zmenšování, řádkové zarovnání, materiál, svit ani dostupnost Unicode znaků web věrně nereprodukuje. Emoji se ve hře nemusí zobrazit.',
                      )}
                    </p>
                    <h3>{t('Zdroje')}</h3>
                    {sources.map(([label, url]) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer">
                        {t(label)} ↗
                      </a>
                    ))}
                    <small>
                      {t(
                        'Rešerše: 10. září 2026 · Neoficiální fanouškovský nástroj.',
                      )}
                    </small>
                  </section>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>
        <main>
          <section className="workspace-heading">
            <div>
              <p className="eyebrow">
                <span /> {t('PÍSAŘSKÁ DÍLNA')}
              </p>
              <h1>
                {t('Dej svému světu')} <em>{t('jméno.')}</em>
              </h1>
              <p>{t('Napiš. Vylaď. Přenes na ceduli.')}</p>
            </div>
            <span className="chapter">
              01 <span>{t('/ TVOJE CEDULE')}</span>
            </span>
          </section>
          <div className="workspace">
            <section className="editor-panel" aria-label={t('Editor cedule')}>
              <div className="panel-title">
                <h2>
                  <Feather size={19} /> {t('Tvůj nápis')}
                </h2>
                <button
                  className="icon-button"
                  onClick={reset}
                  aria-label={t('Vymazat a obnovit nastavení')}
                  title={t('Nová prázdná cedule')}
                >
                  <RotateCcw size={16} />
                </button>
              </div>
              <Tabs
                value={mode}
                onValueChange={changeMode}
                className="editor-tabs"
              >
                <TabsList className="mode-tabs">
                  <TabsTrigger value="visual">
                    <Wand2 size={15} /> {t('Vizuální editor')}
                  </TabsTrigger>
                  <TabsTrigger value="code">
                    <Code2 size={16} /> {t('Vlastní kód')}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="visual">
                  <label className="field-label" htmlFor="sign-text">
                    {t('TEXT NA CEDULI')}
                  </label>
                  <textarea
                    id="sign-text"
                    dir="auto"
                    ref={input}
                    value={text}
                    spellCheck={false}
                    placeholder={t('Tady začíná tvůj příběh…')}
                    maxLength={5000}
                    onChange={(e) => {
                      setText(e.target.value);
                      setCopied(false);
                    }}
                    onSelect={(e) => {
                      selection.current = {
                        start: e.currentTarget.selectionStart,
                        end: e.currentTarget.selectionEnd,
                      };
                    }}
                  />
                  <div className="text-tools">
                    <span>{t('Vyber část textu pro samostatný styl.')}</span>
                    <button
                      className="text-button"
                      onClick={() => insert('\n')}
                    >
                      {t('↵ Řádek')}
                    </button>
                  </div>
                  <div className="formatting-row">
                    <div className="format-buttons">
                      {(
                        [
                          {
                            key: 'bold',
                            tag: 'b',
                            label: t('Tučné písmo'),
                            Icon: Bold,
                          },
                          {
                            key: 'italic',
                            tag: 'i',
                            label: t('Kurzíva'),
                            Icon: Italic,
                          },
                          {
                            key: 'underline',
                            tag: 'u',
                            label: t('Podtržení'),
                            Icon: Underline,
                          },
                          {
                            key: 'strike',
                            tag: 's',
                            label: t('Přeškrtnutí'),
                            Icon: Strikethrough,
                          },
                        ] as const
                      ).map(({ key, tag, label, Icon }) => (
                        <button
                          key={key}
                          className={`format-button ${settings[key] ? 'selected' : ''}`}
                          aria-label={t(label)}
                          aria-pressed={settings[key]}
                          title={t(label)}
                          onClick={() => format(key, tag)}
                        >
                          <Icon size={18} />
                        </button>
                      ))}
                    </div>
                    <div className="alignment-buttons">
                      {[
                        {
                          value: 'left',
                          Icon: AlignLeft,
                          label: t('Zarovnat vlevo'),
                        },
                        {
                          value: 'center',
                          Icon: AlignCenter,
                          label: t('Zarovnat na střed'),
                        },
                        {
                          value: 'right',
                          Icon: AlignRight,
                          label: t('Zarovnat vpravo'),
                        },
                      ].map(({ value, Icon, label }) => (
                        <button
                          key={value}
                          className={`format-button ${settings.align === value ? 'selected' : ''}`}
                          onClick={() => set('align', value)}
                          aria-label={t(label)}
                          aria-pressed={settings.align === value}
                          title={t(label)}
                        >
                          <Icon size={18} />
                        </button>
                      ))}
                      <button
                        className="format-button"
                        onClick={() => wrap('<sub>')}
                        aria-label={t('Dolní index')}
                        title={t('Dolní index (sub)')}
                      >
                        x₂
                      </button>
                      <button
                        className="format-button"
                        onClick={() => wrap('<sup>')}
                        aria-label={t('Horní index')}
                        title={t('Horní index (sup)')}
                      >
                        x²
                      </button>
                    </div>
                  </div>
                  <div className="color-section">
                    <div className="label-row">
                      <label htmlFor="custom-color">{t('Barva písma')}</label>
                      <span className="color-hex">
                        {settings.color || t('Černá · výchozí')}
                      </span>
                    </div>
                    <div className="palette">
                      {palette.map((color, i) => (
                        <button
                          key={color}
                          aria-label={`${[t('zlatá'), t('bílá'), t('červená'), t('žlutá'), t('zelená'), t('modrá'), t('fialová'), t('černá')][i]}`}
                          aria-pressed={(settings.color || '#000000') === color}
                          className={`swatch ${(settings.color || '#000000') === color ? 'active' : ''}`}
                          style={{ '--swatch': color } as CSSProperties}
                          onClick={() => chooseColor(color)}
                        >
                          {(settings.color || '#000000') === color && (
                            <Check size={16} />
                          )}
                        </button>
                      ))}
                      <label
                        className="custom-color"
                        title={t('Vlastní barva')}
                      >
                        <span>+</span>
                        <input
                          id="custom-color"
                          type="color"
                          value={settings.color || '#000000'}
                          onChange={(e) =>
                            chooseColor(e.target.value.toUpperCase())
                          }
                        />
                      </label>
                    </div>
                  </div>
                  <RangeControl
                    label={t('Velikost písma')}
                    value={settings.size}
                    min={25}
                    max={250}
                    suffix=" %"
                    onChange={(v) => set('size', v)}
                  />
                  <button
                    className="advanced-toggle"
                    aria-expanded={advanced}
                    onClick={() => setAdvanced(!advanced)}
                  >
                    <span>
                      <MoveVertical size={16} /> {t('Pokročilé nastavení')}
                    </span>
                    <ChevronDown
                      size={16}
                      className={advanced ? 'rotated' : ''}
                    />
                  </button>
                  {advanced && (
                    <div className="advanced-settings">
                      <p className="microcopy">
                        {t('Značky TMP · jejich chování ověř ve hře.')}
                      </p>
                      <RangeControl
                        label={t('Výškový posun (desetiny em)')}
                        value={settings.offset}
                        min={-30}
                        max={30}
                        suffix=""
                        onChange={(v) => set('offset', v)}
                      />
                      <RangeControl
                        label={t('Rozestup znaků (desetiny em)')}
                        value={settings.spacing}
                        min={-5}
                        max={10}
                        suffix=""
                        onChange={(v) => set('spacing', v)}
                      />
                      <RangeControl
                        label={t('Krytí')}
                        value={settings.opacity}
                        min={0}
                        max={100}
                        suffix=" %"
                        onChange={(v) => set('opacity', v)}
                      />
                      <div className="insert-tools">
                        <button onClick={() => wrap('<uppercase>')}>ABC</button>
                        <button onClick={() => setGuideOpen(true)}>
                          {t('Další značky')} <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="symbols">
                    <span>{t('VLOŽIT SYMBOL')}</span>
                    {signSymbols.map((symbol) => (
                      <button
                        key={symbol}
                        title={t('Vložit {value}', { value: symbol })}
                        aria-label={t('Vložit {value}', { value: symbol })}
                        onClick={() => insert(symbol)}
                      >
                        {symbol}
                      </button>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="code">
                  <label className="field-label" htmlFor="raw-code">
                    {t('RICH TEXT ZE HRY')}
                  </label>
                  <textarea
                    className="raw-input"
                    dir="ltr"
                    id="raw-code"
                    value={raw ?? code}
                    spellCheck={false}
                    maxLength={5000}
                    onChange={(e) => {
                      setRaw(e.target.value);
                      setCopied(false);
                    }}
                  />
                  <p className="microcopy">
                    {t(
                      'Vlož existující kód nebo napiš vlastní značky. Náhled se mění okamžitě. Při návratu do editoru zůstanou značky součástí textu.',
                    )}
                  </p>
                  <button
                    className="quiet-button full-width"
                    onClick={() => setGuideOpen(true)}
                  >
                    <BookOpen size={16} /> {t('Vložit značku z průvodce')}
                  </button>
                </TabsContent>
              </Tabs>
            </section>
            <div className="result-column">
              <section
                className={`preview-panel ${day ? 'day' : ''}`}
                aria-label={t('Živý náhled cedule')}
              >
                <div className="preview-top">
                  <span className="preview-label">
                    <span /> {t('ŽIVÝ NÁHLED')}
                  </span>
                  <button
                    className="scene-toggle"
                    aria-label={
                      day
                        ? t('Přepnout na noční náhled')
                        : t('Zesvětlit náhled')
                    }
                    title={t('Pouze osvětlení náhledu')}
                    onClick={() => setDay(!day)}
                  >
                    {day ? <Sun size={17} /> : <Moon size={17} />}
                  </button>
                </div>
                <div className="sign-scene" ref={signScene}>
                  <img
                    src={`${import.meta.env.BASE_URL}sign-scene.png`}
                    alt={t('Prázdná dřevěná cedule v severském lese')}
                    width={1536}
                    height={1024}
                  />
                  <div
                    className="sign-text"
                    dir="ltr"
                    style={{
                      textAlign: preview.align,
                      fontSize: previewLayout.fontSize || '14cqw',
                      justifyContent:
                        preview.align === 'left'
                          ? 'flex-start'
                          : preview.align === 'right'
                            ? 'flex-end'
                            : 'center',
                    }}
                  >
                    <div
                      className="sign-text-content"
                      dir="auto"
                      ref={signContent}
                      style={{
                        transform: `scale(${previewLayout.scale})`,
                        transformOrigin: `${preview.align === 'justify' ? 'center' : preview.align} center`,
                      }}
                    >
                      {preview.runs.map((run, i) =>
                        run.style.transform ? (
                          <span key={i}>
                            {Array.from(
                              new Intl.Segmenter('cs', {
                                granularity: 'grapheme',
                              }).segment(run.text),
                              (item) => item.segment,
                            ).map((char, j) =>
                              char === '\n' ? (
                                <br key={j} />
                              ) : (
                                <span
                                  key={j}
                                  style={
                                    {
                                      ...run.style,
                                      display: 'inline-block',
                                    } as CSSProperties
                                  }
                                >
                                  {char}
                                </span>
                              ),
                            )}
                          </span>
                        ) : (
                          <span key={i} style={run.style as CSSProperties}>
                            {run.text}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                </div>
                <div className="preview-bottom">
                  <span>
                    <span className="dimension-line" />{' '}
                    {t('Dřevěná cedule · 1 × 0,5 m')}
                  </span>
                  <span>{t('ORIENTAČNÍ NÁHLED')}</span>
                </div>
              </section>
              <section className="output-panel" aria-label={t('Výsledný text')}>
                <div className="output-header">
                  <h2>
                    <Code2 size={18} /> {t('Připraveno do hry')}
                  </h2>
                  <span className={`count ${over ? 'danger' : ''}`}>
                    {count.units}
                    <span>
                      {' '}
                      / {limit} {t('znaků')}
                    </span>
                  </span>
                </div>
                <textarea
                  aria-label={t('Výsledný rich text ke zkopírování')}
                  ref={output}
                  readOnly
                  value={code}
                  spellCheck={false}
                  className="code-output"
                  dir="ltr"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <div className="meter">
                  <span
                    className={over ? 'over' : ''}
                    style={{
                      width: `${Math.min(100, (count.units / Number(limit)) * 100)}%`,
                    }}
                  />
                </div>
                <div className="output-options">
                  <label className="switch-label" htmlFor="compact-switch">
                    <Switch
                      id="compact-switch"
                      checked={compact}
                      disabled={mode === 'code'}
                      onCheckedChange={setCompact}
                      aria-label={t('Úsporný zápis')}
                    />{' '}
                    {t('Úsporný zápis')}
                  </label>
                  <Select value={limit} onValueChange={(v) => v && setLimit(v)}>
                    <SelectTrigger
                      aria-label={t('Limit cedule')}
                      className="limit-select"
                    >
                      <SelectValue>
                        {limit === '50'
                          ? t('Vanilla · 50')
                          : t('S modem · 999')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">{t('Vanilla · 50')}</SelectItem>
                      <SelectItem value="999">{t('S modem · 999')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p
                  className={`limit-note ${over || unicodeRisk ? 'warning' : ''}`}
                  aria-live="polite"
                >
                  {over
                    ? t(
                        'Nad limitem: {count}. Zkrať text nebo uber formátování.',
                        { count: count.units - Number(limit) },
                      )
                    : unicodeRisk
                      ? t(
                          '{bytes} UTF-8 bajtů: Unicode může překročit limit hry.',
                          { bytes: count.bytes },
                        )
                      : t(
                          '{bytes} UTF-8 bajtů · Zbývá znaků: {count}, včetně značek.',
                          {
                            bytes: count.bytes,
                            count: Number(limit) - count.units,
                          },
                        )}
                </p>
                <button
                  className={`copy-button ${copied ? 'copied' : ''}`}
                  onClick={copy}
                  disabled={!code}
                >
                  {copied ? <Check size={19} /> : <Copy size={19} />}
                  <span>
                    {copied
                      ? t('Zkopírováno. Vzhůru do Valheimu!')
                      : t('Zkopírovat text do hry')}
                  </span>
                  {!copied && <span className="key-hint">{t('COPY')}</span>}
                </button>
                {copyError && (
                  <p role="alert" className="warning">
                    {t(
                      'Prohlížeč nepovolil schránku. Kód je označený — stiskni Ctrl+C nebo ⌘C.',
                    )}
                  </p>
                )}
                <p className="paste-help">
                  {t('Ve hře otevři ceduli klávesou')} <kbd>E</kbd>{' '}
                  {t('a vlož text pomocí')} <kbd>Ctrl</kbd> + <kbd>V</kbd>.
                </p>
              </section>
            </div>
          </div>
          {preview.warnings.length > 0 && (
            <div className="preview-warnings" aria-live="polite">
              <Info size={18} />
              <div>
                {preview.warnings.map((w) => (
                  <p key={w}>{w}</p>
                ))}
              </div>
            </div>
          )}
          <section className="templates-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">{t('TROCHA INSPIRACE')}</span>
                <h2>{t('Začni s hotovým nápisem')}</h2>
              </div>
              <span>{t('Jedno kliknutí. Pak už po svém.')}</span>
            </div>
            <div className="template-grid">
              {templates.map((template, i) => {
                const Icon = templateIcons[i];
                return (
                  <button
                    key={template.name}
                    className="template-card"
                    onClick={() => {
                      setText(t(template.text));
                      setSettings({ ...defaults, color: template.color });
                      setRaw(null);
                      setMode('visual');
                      setCopied(false);
                      selection.current = { start: -1, end: -1 };
                    }}
                    style={
                      { '--template-color': template.color } as CSSProperties
                    }
                  >
                    <div className="template-top">
                      <Icon size={17} />
                      <span>{t(template.name)}</span>
                      <ArrowRight size={16} />
                    </div>
                    <strong>{t(template.text)}</strong>
                    <small>{t(template.eyebrow)}</small>
                  </button>
                );
              })}
            </div>
          </section>
          <div className="bottom-note">
            <Info size={16} />
            <p>
              {t(
                'Náhled přibližuje formátování. Font, velikost a světlo se ve hře mohou lišit.',
              )}
            </p>
            <button onClick={() => setGuideOpen(true)}>
              {t('Co cedule umí')} <ArrowRight size={14} />
            </button>
          </div>
        </main>
        <footer>
          <span className="footer-brand">
            <Feather size={15} /> RUNOPIS
          </span>
          <span>{t('Vyrobeno pro dlouhé večery v desátém světě.')}</span>
          <span>{t('Neoficiální nástroj pro Valheim')}</span>
          <p className="support">
            <span><strong>Free, ad-free and made in my spare time.</strong> If it helped your run, you can buy me a coffee.</span>
            <a href="https://ko-fi.com/N2A528ACE3" target="_blank" rel="noopener noreferrer">
              <img src="/support/kofi.png" alt="Buy Me a Coffee at ko-fi.com" width={143} height={36} loading="lazy" />
            </a>
          </p>
        </footer>
      </div>
    </DirectionProvider>
  );
}

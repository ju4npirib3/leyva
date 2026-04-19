'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, ChevronDown, Mic, MicOff, Store } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn, CATEGORY_COLORS, formatCurrency } from '@/lib/utils';
import { parseSpanishAmount } from '@/lib/parseSpanishAmount';
import type { MovementType } from '@/types';

// ── Date helpers ──────────────────────────────────────────────────────────────
function todayString(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
function formatDisplayDate(s: string): string {
  const [y, m, d] = s.split('-').map(Number);
  return `${d} de ${MONTHS_ES[m - 1]} de ${y}`;
}

/** Convert YYYY-MM-DD → timestamp at noon local time (avoids timezone boundary bugs) */
function dateStringToTs(s: string): number {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).getTime();
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  defaultType?: MovementType;
  defaultCategory?: string;
  defaultAmount?: string;
  defaultDescription?: string;
  defaultAccountId?: string;
  defaultEstablishment?: string;
}

export default function AddMovementModal({
  open, onClose,
  defaultType = 'expense',
  defaultCategory,
  defaultAmount,
  defaultDescription,
  defaultAccountId,
  defaultEstablishment,
}: Props) {
  const { user } = useAuth();
  const { accounts, movements, addMovementFn, addMsiPlanFn, expenseCategories, incomeCategories } = useApp();

  const [type, setType] = useState<MovementType>(defaultType);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(defaultCategory ?? '');
  const [accountId, setAccountId] = useState('');
  const [establishment, setEstablishment] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayString);
  const [saving, setSaving] = useState(false);
  const [isMsi, setIsMsi] = useState(false);
  const [msiMonths, setMsiMonths] = useState(12);
  const dragControls = useDragControls();

  // Voice
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const recognitionRef = useRef<any>(null);

  // Establishment autocomplete
  const [showSuggestions, setShowSuggestions] = useState(false);
  const estabInputRef = useRef<HTMLInputElement>(null);

  // All unique establishments ever used, sorted by frequency
  const allEstablishments = useMemo(() => {
    const freq = new Map<string, number>();
    movements.forEach(m => {
      const e = m.establishment?.trim();
      if (e) freq.set(e, (freq.get(e) ?? 0) + 1);
    });
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  }, [movements]);

  const suggestions = useMemo(() => {
    const q = establishment.trim().toLowerCase();
    if (!q) return [];
    return allEstablishments.filter(e => e.toLowerCase().includes(q)).slice(0, 6);
  }, [allEstablishments, establishment]);

  // Body scroll lock
  useEffect(() => {
    if (open) document.body.classList.add('scroll-locked');
    else document.body.classList.remove('scroll-locked');
    return () => document.body.classList.remove('scroll-locked');
  }, [open]);

  // Sync accountId when accounts load
  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setType(defaultType);
      setCategory(defaultCategory ?? '');
      setAmount(defaultAmount ?? '');
      setDescription(defaultDescription ?? '');
      setAccountId(defaultAccountId ?? accounts[0]?.id ?? '');
      setEstablishment(defaultEstablishment ?? '');
      setSelectedDate(todayString());
      setVoiceError('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function resetAndClose() {
    setAmount('');
    setDescription('');
    setCategory('');
    setType(defaultType);
    setAccountId(accounts[0]?.id ?? '');
    setEstablishment('');
    setSelectedDate(todayString());
    setVoiceError('');
    setIsMsi(false);
    setMsiMonths(12);
    stopListening();
    onClose();
  }

  const categories = type === 'income' ? incomeCategories : expenseCategories;

  function handleAmountChange(val: string) {
    const clean = val.replace(/[^0-9.]/g, '').replace(/^(\d*\.?\d*).*$/, '$1');
    setAmount(clean);
  }

  // ── Voice input ─────────────────────────────────────────────────────────────
  function startListening() {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) {
      setVoiceError('Tu navegador no soporta reconocimiento de voz');
      return;
    }
    setVoiceError('');
    const rec = new SR();
    rec.lang = 'es-MX';
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 3;

    rec.onstart = () => setListening(true);

    rec.onresult = (e: any) => {
      let parsed = '';
      for (let i = 0; i < e.results[0].length; i++) {
        const transcript: string = e.results[0][i].transcript;
        parsed = parseSpanishAmount(transcript);
        if (parsed) break;
      }
      if (parsed) {
        setAmount(parsed);
        setVoiceError('');
      } else {
        const heard = e.results[0][0].transcript;
        setVoiceError(`Escuché: "${heard}" — intenta de nuevo`);
      }
    };

    rec.onerror = (e: any) => {
      setListening(false);
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        setVoiceError(`Error de micrófono: ${e.error}`);
      }
    };
    rec.onend = () => setListening(false);
    rec.start();
    recognitionRef.current = rec;
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  function toggleVoice() {
    if (listening) stopListening();
    else startListening();
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    const aid = accountId || accounts[0]?.id;
    if (!amount || !aid || !category || !user) return;
    const account = accounts.find(a => a.id === aid);
    if (!account) return;
    setSaving(true);
    try {
      const movData = {
        accountId: aid,
        accountName: account.name,
        type,
        amount: parseFloat(amount),
        category,
        description: description.trim() || category,
        establishment: establishment.trim() || undefined,
        date: dateStringToTs(selectedDate),
        createdAt: Date.now(),
      };
      if (isMsi && type === 'expense' && account.type === 'credit') {
        await addMsiPlanFn(movData, msiMonths);
      } else {
        await addMovementFn(movData);
      }
      resetAndClose();
    } finally {
      setSaving(false);
    }
  }

  const effectiveAccountId = accountId || accounts[0]?.id || '';
  const canSubmit = !!amount && !!category && !!effectiveAccountId && !saving;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetAndClose}
          />

          {/* Sheet — full screen */}
          <motion.div
            className="fixed inset-x-0 top-0 bottom-0 max-w-md mx-auto z-50 bg-white dark:bg-neutral-900 rounded-t-3xl safe-top flex flex-col overflow-x-hidden"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0.05, bottom: 0 }}
            dragMomentum={false}
            onDragEnd={(_, info) => {
              if (info.offset.y > 40 || info.velocity.y > 300) resetAndClose();
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle — drag here to close */}
            <div
              className="flex justify-center pt-3 pb-1 flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={e => dragControls.start(e)}
            >
              <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-3 pt-1 flex-shrink-0">
              <h2 className="text-xl font-bold dark:text-white">Nuevo movimiento</h2>
              <button onClick={resetAndClose} className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800">
                <X className="w-4 h-4 dark:text-white" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto overflow-x-hidden px-6 pb-6 flex-1">
              {accounts.length === 0 ? (
                <div className="py-8 flex flex-col items-center gap-3 text-center">
                  <span className="text-5xl">🏦</span>
                  <p className="font-bold text-neutral-800 dark:text-neutral-200">Sin cuentas</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Primero agrega una cuenta para poder registrar movimientos.
                  </p>
                  <button
                    onClick={resetAndClose}
                    className="mt-2 px-6 py-2.5 bg-accent text-white font-semibold rounded-2xl"
                  >
                    Entendido
                  </button>
                </div>
              ) : (
                <>
                  {/* Type toggle */}
                  <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-2xl p-1 mb-4">
                    {(['income', 'expense'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => { setType(t); setCategory(''); }}
                        className={cn(
                          'flex-1 py-2.5 rounded-xl text-sm font-bold transition-all',
                          type === t
                            ? t === 'income' ? 'bg-income text-white shadow-sm' : 'bg-expense text-white shadow-sm'
                            : 'text-neutral-500 dark:text-neutral-400'
                        )}
                      >
                        {t === 'income' ? '↑ Ingreso' : '↓ Gasto'}
                      </button>
                    ))}
                  </div>

                  {/* Amount + voice */}
                  <div className="mb-4">
                    <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1 block">
                      Monto
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-neutral-400 font-bold text-xl z-10">$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={amount}
                        onChange={e => handleAmountChange(e.target.value)}
                        className="flex-1 pl-9 pr-14 py-4 bg-neutral-100 dark:bg-neutral-800 rounded-2xl text-2xl font-black dark:text-white outline-none focus:ring-2 focus:ring-accent/30 w-full"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      />
                      <button
                        type="button"
                        onClick={toggleVoice}
                        className={cn(
                          'absolute right-3 w-9 h-9 rounded-xl flex items-center justify-center transition-all',
                          listening
                            ? 'bg-expense text-white animate-pulse'
                            : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400'
                        )}
                      >
                        {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>
                    </div>

                    {listening && (
                      <p className="text-xs text-expense font-medium mt-1.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-expense animate-ping inline-block" />
                        Escuchando… di el monto en español
                      </p>
                    )}
                    {voiceError && !listening && (
                      <p className="text-xs text-neutral-400 mt-1.5">{voiceError}</p>
                    )}
                  </div>

                  {/* Category */}
                  <div className="mb-4">
                    <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-2 block">
                      Categoría
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(c => {
                        const color = CATEGORY_COLORS[c.name] ?? '#8E8E93';
                        const selected = category === c.name;
                        return (
                          <button
                            key={c.id}
                            onClick={() => setCategory(c.name)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-sm font-semibold transition-all"
                            style={selected
                              ? { backgroundColor: color, color: '#fff' }
                              : { backgroundColor: color + '20' }
                            }
                          >
                            <span>{c.icon}</span>
                            <span className={selected ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'}>
                              {c.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Account */}
                  <div className="mb-4">
                    <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1 block">
                      Cuenta
                    </label>
                    <div className="relative">
                      <select
                        value={effectiveAccountId}
                        onChange={e => setAccountId(e.target.value)}
                        className="w-full appearance-none pl-4 pr-10 py-3.5 bg-neutral-100 dark:bg-neutral-800 rounded-2xl font-semibold dark:text-white outline-none focus:ring-2 focus:ring-accent/30"
                      >
                        {accounts.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.name} — {formatCurrency(a.balance, a.currency)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* MSI toggle — only when selected account is a credit card */}
                  {type === 'expense' && accounts.find(a => a.id === effectiveAccountId)?.type === 'credit' && (
                    <div className="mb-4">
                      <button
                        onClick={() => setIsMsi(v => !v)}
                        className={cn(
                          'w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-semibold transition-all',
                          isMsi ? 'bg-accent text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span>📅</span>
                          <span className="text-sm">Meses sin intereses (MSI)</span>
                        </div>
                        <div className={cn(
                          'w-10 h-6 rounded-full transition-all relative',
                          isMsi ? 'bg-white/30' : 'bg-neutral-300 dark:bg-neutral-600'
                        )}>
                          <div className={cn(
                            'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                            isMsi ? 'left-5' : 'left-1'
                          )} />
                        </div>
                      </button>

                      {isMsi && (
                        <div className="mt-3 bg-accent/5 dark:bg-accent/10 rounded-2xl p-4">
                          <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-2">Número de meses</p>
                          <div className="flex gap-2 flex-wrap">
                            {[3, 6, 9, 12, 18, 24].map(m => (
                              <button
                                key={m}
                                onClick={() => setMsiMonths(m)}
                                className={cn(
                                  'px-4 py-2 rounded-xl text-sm font-bold transition-all',
                                  msiMonths === m ? 'bg-accent text-white' : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                                )}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                          {amount && parseFloat(amount) > 0 && (
                            <div className="mt-3 pt-3 border-t border-accent/20 flex items-center justify-between">
                              <span className="text-xs text-neutral-500">Mensualidad</span>
                              <span className="font-black text-accent text-base">
                                ${(parseFloat(amount) / msiMonths).toFixed(2)}/mes
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Establishment */}
                  <div className="mb-4 relative">
                    <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1 block">
                      Establecimiento (opcional)
                    </label>
                    <div className="relative flex items-center">
                      <Store className="absolute left-4 w-4 h-4 text-neutral-400 pointer-events-none" />
                      <input
                        ref={estabInputRef}
                        type="text"
                        placeholder="Ej: Walmart, Starbucks, Oxxo..."
                        value={establishment}
                        onChange={e => { setEstablishment(e.target.value); setShowSuggestions(true); }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setShowSuggestions(false)}
                        className="w-full pl-10 pr-4 py-3.5 bg-neutral-100 dark:bg-neutral-800 rounded-2xl font-medium dark:text-white outline-none focus:ring-2 focus:ring-accent/30"
                      />
                    </div>

                    {/* Autocomplete dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white dark:bg-neutral-800 rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-700 overflow-hidden">
                        {suggestions.map(s => (
                          <button
                            key={s}
                            onMouseDown={e => {
                              e.preventDefault(); // Prevents blur before click
                              setEstablishment(s);
                              setShowSuggestions(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-neutral-100 dark:active:bg-neutral-700 transition-colors"
                          >
                            <Store className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                            <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{s}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="mb-4">
                    <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1 block">
                      Nota (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Agregar descripción..."
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      className="w-full px-4 py-3.5 bg-neutral-100 dark:bg-neutral-800 rounded-2xl dark:text-white outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  </div>

                  {/* Date */}
                  <div className="mb-5">
                    <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1 block">
                      Fecha
                    </label>
                    <div className="relative rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                      {/* Visible centered display — sits behind the input */}
                      <div className="flex items-center justify-center gap-2 py-3.5 select-none pointer-events-none">
                        <span className="text-base">📅</span>
                        <span className="font-semibold text-neutral-800 dark:text-white">
                          {formatDisplayDate(selectedDate)}
                        </span>
                      </div>
                      {/* Native input overlaid — nearly transparent so text above is visible,
                          but still interactive and opens the native date picker on all browsers */}
                      <input
                        type="date"
                        value={selectedDate}
                        max={todayString()}
                        onChange={e => {
                          if (e.target.value && e.target.value <= todayString()) {
                            setSelectedDate(e.target.value);
                          }
                        }}
                        className="absolute inset-0 w-full h-full rounded-2xl cursor-pointer border-0 outline-none"
                        style={{ opacity: 0.011, background: 'transparent', colorScheme: 'light dark' }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="w-full py-4 bg-accent text-white font-bold text-base rounded-2xl active:scale-[0.98] transition-transform disabled:opacity-40"
                  >
                    {saving ? 'Guardando...' : 'Guardar movimiento'}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

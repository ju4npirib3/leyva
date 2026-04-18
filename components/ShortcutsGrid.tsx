'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, X, Check } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, CATEGORY_ICONS, cn } from '@/lib/utils';
import type { Shortcut, MovementType } from '@/types';

interface Props {
  onShortcut: (type: MovementType, category: string) => void;
}

const ALL_SHORTCUTS = [
  ...EXPENSE_CATEGORIES.map(c => ({ label: c, icon: CATEGORY_ICONS[c] ?? '📦', type: 'expense' as const, category: c })),
  ...INCOME_CATEGORIES.map(c => ({ label: c, icon: CATEGORY_ICONS[c] ?? '📦', type: 'income' as const, category: c })),
];

export default function ShortcutsGrid({ onShortcut }: Props) {
  const { shortcuts, updateShortcutsFn } = useApp();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Omit<Shortcut, 'id'>[]>([]);

  function startEdit() {
    setDraft(shortcuts.map(s => ({ label: s.label, icon: s.icon, type: s.type, category: s.category })));
    setEditing(true);
  }

  async function saveEdit() {
    await updateShortcutsFn(draft);
    setEditing(false);
  }

  function toggleDraft(item: Omit<Shortcut, 'id'>) {
    const idx = draft.findIndex(d => d.category === item.category && d.type === item.type);
    if (idx >= 0) {
      setDraft(draft.filter((_, i) => i !== idx));
    } else if (draft.length < 6) {
      setDraft([...draft, item]);
    }
  }

  return (
    <motion.div
      className="px-5 mb-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-neutral-900 dark:text-white">Accesos rápidos</h3>
        <button onClick={editing ? saveEdit : startEdit} className="text-xs font-medium text-accent flex items-center gap-1">
          {editing ? <><Check className="w-3 h-3" /> Listo</> : <><Settings2 className="w-3 h-3" /> Editar</>}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {editing ? (
          <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">Selecciona hasta 6 accesos rápidos</p>
            <div className="flex flex-wrap gap-2">
              {ALL_SHORTCUTS.map(item => {
                const selected = draft.some(d => d.category === item.category && d.type === item.type);
                return (
                  <button
                    key={`${item.type}-${item.category}`}
                    onClick={() => toggleDraft(item)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border',
                      selected
                        ? 'bg-accent text-white border-accent'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-transparent'
                    )}
                  >
                    <span>{item.icon}</span> {item.label}
                    {item.type === 'income' && <span className="text-[10px] opacity-70">↑</span>}
                  </button>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {shortcuts.map(s => (
                <button
                  key={s.id}
                  onClick={() => onShortcut(s.type, s.category)}
                  className={cn(
                    'flex-shrink-0 flex flex-col items-center gap-1.5 p-3 rounded-2xl min-w-[68px] active:scale-95 transition-transform',
                    s.type === 'income'
                      ? 'bg-income/10 dark:bg-income/15'
                      : 'bg-neutral-100 dark:bg-neutral-800'
                  )}
                >
                  <span className="text-2xl leading-none">{s.icon}</span>
                  <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 whitespace-nowrap">{s.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

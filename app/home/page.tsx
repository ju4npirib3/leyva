'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import Header from '@/components/Header';
import BalanceSection from '@/components/BalanceSection';
import SummaryCards from '@/components/SummaryCards';
import AccountsCarousel from '@/components/AccountsCarousel';
import ShortcutsGrid from '@/components/ShortcutsGrid';
import MovementsList from '@/components/MovementsList';
import AddMovementModal from '@/components/AddMovementModal';
import AddAccountModal from '@/components/AddAccountModal';
import type { MovementType } from '@/types';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showAddMovement, setShowAddMovement] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [defaultType, setDefaultType] = useState<MovementType>('expense');
  const [defaultCategory, setDefaultCategory] = useState<string | undefined>();
  const [defaultAmount, setDefaultAmount] = useState<string | undefined>();
  const [defaultDescription, setDefaultDescription] = useState<string | undefined>();
  const [defaultAccountId, setDefaultAccountId] = useState<string | undefined>();
  const [defaultEstablishment, setDefaultEstablishment] = useState<string | undefined>();
  const [carouselAccountId, setCarouselAccountId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  // Handle "copy movement" redirect — open modal with pre-filled data
  useEffect(() => {
    if (searchParams.get('copy') === '1') {
      setDefaultType((searchParams.get('type') as MovementType) ?? 'expense');
      setDefaultCategory(searchParams.get('category') ?? undefined);
      setDefaultAmount(searchParams.get('amount') ?? undefined);
      setDefaultDescription(searchParams.get('description') ?? undefined);
      setDefaultAccountId(searchParams.get('accountId') ?? undefined);
      setDefaultEstablishment(searchParams.get('establishment') ?? undefined);
      setShowAddMovement(true);
      // Clean URL without reloading
      router.replace('/home', { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-light dark:bg-bg-dark">
        <div className="w-10 h-10 rounded-full border-4 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  function handleShortcut(type: MovementType, category: string) {
    setDefaultType(type);
    setDefaultCategory(category);
    setDefaultAmount(undefined);
    setDefaultDescription(undefined);
    setDefaultAccountId(undefined);
    setDefaultEstablishment(undefined);
    setShowAddMovement(true);
  }

  function handleAddClick() {
    setDefaultType('expense');
    setDefaultCategory(undefined);
    setDefaultAmount(undefined);
    setDefaultDescription(undefined);
    setDefaultAccountId(carouselAccountId ?? undefined);
    setDefaultEstablishment(undefined);
    setShowAddMovement(true);
  }

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark safe-top">
      <div className="pb-28 overflow-y-auto">
        <Header />
        <BalanceSection />
        <SummaryCards />
        <AccountsCarousel
          onAddAccount={() => setShowAddAccount(true)}
          onAccountSelected={setCarouselAccountId}
        />
        <ShortcutsGrid onShortcut={handleShortcut} />
        <MovementsList />
      </div>

      <BottomNav onAddClick={handleAddClick} />

      <AddMovementModal
        open={showAddMovement}
        onClose={() => setShowAddMovement(false)}
        defaultType={defaultType}
        defaultCategory={defaultCategory}
        defaultAmount={defaultAmount}
        defaultDescription={defaultDescription}
        defaultAccountId={defaultAccountId}
        defaultEstablishment={defaultEstablishment}
      />
      <AddAccountModal
        open={showAddAccount}
        onClose={() => setShowAddAccount(false)}
      />
    </div>
  );
}

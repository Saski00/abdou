import { useState } from 'react';
import {
  Archive,
  ArrowLeftRight,
  ArrowUpCircle,
  BarChart3,
  Check,
  CheckCircle2,
  Coins,
  Minus,
  Plus,
  Sparkles,
  Store,
  TriangleAlert,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import {
  SHOP_DECORATIONS,
  SHOP_ITEM_PRICES,
  formatMoney,
  getNextShopLevelConfig,
  getNextStorageUpgradeConfig,
  getShopLevelConfig,
} from '../game/economy';
import { RESOURCE_ORDER, RESOURCE_PURPOSE_HINTS, getTotalInventoryItems } from '../game/resources';
import { PROFESSION_CONFIGS, PROFESSION_ORDER } from '../game/staffSystem';
import { EmployeeProfession, HudSnapshot, ResourceId, ShopModalTab } from '../game/types';

interface ShopModalProps {
  hud: HudSnapshot;
  initialTab: ShopModalTab;
  isTouchMode: boolean;
  onTransferToStock: (resourceId: ResourceId, quantity: number) => void;
  onTransferFromStock: (resourceId: ResourceId, quantity: number) => void;
  onTransferToStorage: (resourceId: ResourceId, quantity: number) => void;
  onTransferFromStorage: (resourceId: ResourceId, quantity: number) => void;
  onTransferStorageToStock: (resourceId: ResourceId, quantity: number) => void;
  onTransferStockToStorage: (resourceId: ResourceId, quantity: number) => void;
  onRestockFromStorage: () => void;
  onSellStock: (resourceId: ResourceId, quantity: number) => void;
  onUpgradeShopLevel: () => void;
  onUpgradeStorageTier: () => void;
  onPurchaseDecoration: (decorationId: string) => void;
  onToggleShopOpen: () => void;
  onSetEmployeeProfession: (employeeId: string, profession: EmployeeProfession) => void;
  onDismissEmployee: (employeeId: string) => void;
  onPayUnpaidWages: () => void;
  onClose: () => void;
}

const DEFAULT_QUANTITIES: Record<ResourceId, number> = {
  canned_food: 1,
  water_bottle: 1,
  scrap_metal: 1,
  wood: 1,
  medical_supplies: 1,
};

export function ShopModal({
  hud,
  initialTab,
  isTouchMode,
  onTransferToStock,
  onTransferFromStock,
  onTransferToStorage,
  onTransferFromStorage,
  onTransferStorageToStock,
  onTransferStockToStorage,
  onRestockFromStorage,
  onSellStock,
  onUpgradeShopLevel,
  onUpgradeStorageTier,
  onPurchaseDecoration,
  onToggleShopOpen,
  onSetEmployeeProfession,
  onDismissEmployee,
  onPayUnpaidWages,
  onClose,
}: ShopModalProps) {
  const [activeTab, setActiveTab] = useState<ShopModalTab>(initialTab);
  const [quantities, setQuantities] = useState<Record<ResourceId, number>>(DEFAULT_QUANTITIES);

  const { inventory, shop, staff } = hud;
  const packTotal = getTotalInventoryItems(inventory);
  const lastTx = shop.lastTransaction;

  const currentLevelCfg = getShopLevelConfig(shop.shopLevel);
  const nextLevelCfg = getNextShopLevelConfig(shop.shopLevel);
  const nextStorageCfg = getNextStorageUpgradeConfig(shop.storageTier);
  const ownedDecoSet = new Set(shop.ownedDecorations);
  const storageFree = Math.max(0, shop.storageCapacity - shop.totalStorageItems);
  const storagePct =
    shop.storageCapacity > 0
      ? Math.min(100, Math.round((shop.totalStorageItems / shop.storageCapacity) * 100))
      : 100;

  const getQty = (id: ResourceId, maxVal: number): number => {
    const raw = quantities[id] ?? 1;
    if (maxVal <= 0) return 1;
    return Math.max(1, Math.min(raw, maxVal));
  };

  const adjustQty = (id: ResourceId, delta: number, maxVal: number) => {
    setQuantities((prev) => {
      const cap = Math.max(1, maxVal);
      const next = Math.max(1, Math.min(cap, (prev[id] ?? 1) + delta));
      return { ...prev, [id]: next };
    });
  };

  const setMaxQty = (id: ResourceId, maxVal: number) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(1, maxVal),
    }));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shop-modal-title"
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#070a0f]/82 px-3 py-3 sm:px-4 sm:py-4"
      style={{
        paddingTop: 'max(14px, env(safe-area-inset-top))',
        paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(12px, env(safe-area-inset-left))',
        paddingRight: 'max(12px, env(safe-area-inset-right))',
      }}
    >
      <div className="w-full max-w-2xl max-h-[92dvh] flex flex-col bg-[#10151f] border border-stone-700/80 rounded-xl shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-stone-800 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
              <h2
                id="shop-modal-title"
                className="font-display text-2xl sm:text-3xl font-bold tracking-wider text-stone-100 leading-none truncate"
              >
                THE LAST SHOP
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-1.5 truncate">
              Safe Haven · Lv {shop.shopLevel} ({shop.shopLevelName}) · {shop.shopStatusReason}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleShopOpen}
              className={`h-10 px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                shop.shopManualOpen
                  ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/25'
                  : 'bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700'
              }`}
            >
              {shop.shopManualOpen ? 'Shop: Open' : 'Shop: Closed'}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close shop counter"
              className="h-11 w-11 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Shop Overview Strip */}
        <div className="px-4 py-3 sm:px-6 bg-[#0b0e15] border-b border-stone-800 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div>
            <div className="text-[11px] text-stone-400">Cash Balance</div>
            <div className="font-mono-tabular text-lg font-bold text-emerald-300">
              {formatMoney(shop.money)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-stone-400">Shop / Foot Traffic</div>
            <div className="font-mono-tabular text-base font-bold text-amber-300">
              Lv {shop.shopLevel} · {shop.activeCustomers.length}/{shop.customerCapacity}
              {shop.trafficBonusPct > 0 ? (
                <span className="text-emerald-300 text-xs font-semibold ml-1.5">
                  +{shop.trafficBonusPct}%
                </span>
              ) : null}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-stone-400">Pack / Storage</div>
            <div className="font-mono-tabular text-base font-bold text-sky-300">
              {packTotal}/{hud.packCapacity}{' '}
              <span className="text-stone-500 font-normal">·</span>{' '}
              <span className="text-stone-200">
                {shop.totalStorageItems}/{shop.storageCapacity}
              </span>
            </div>
          </div>
          <div>
            <div className="text-[11px] text-stone-400">Shelf / Revenue</div>
            <div className="font-mono-tabular text-base font-bold text-stone-100">
              {shop.totalStockItems} · {formatMoney(shop.totalRevenueEarned)}
            </div>
          </div>
        </div>

        {/* Interactive Mode Tabs */}
        <div className="px-4 pt-3 sm:px-6 shrink-0">
          <div
            role="tablist"
            aria-label="Shop management sections"
            className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 p-1 bg-[#0b0e15] border border-stone-800 rounded-lg"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'counter'}
              onClick={() => setActiveTab('counter')}
              className={`h-10 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'counter'
                  ? 'bg-amber-500 text-stone-950'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
              }`}
            >
              <Coins className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Sell</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'transfer'}
              onClick={() => setActiveTab('transfer')}
              className={`h-10 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'transfer'
                  ? 'bg-amber-500 text-stone-950'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>
                Shelves ({packTotal}/{hud.packCapacity})
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'storage'}
              onClick={() => setActiveTab('storage')}
              className={`h-10 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'storage'
                  ? 'bg-amber-500 text-stone-950'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
              }`}
            >
              <Archive className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>
                Storage {shop.totalStorageItems}/{shop.storageCapacity}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'upgrades'}
              onClick={() => setActiveTab('upgrades')}
              className={`h-10 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'upgrades'
                  ? 'bg-amber-500 text-stone-950'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
              }`}
            >
              <ArrowUpCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Upgrades</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'customers'}
              onClick={() => setActiveTab('customers')}
              className={`h-10 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'customers'
                  ? 'bg-amber-500 text-stone-950'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Sales ({shop.activeCustomers.length})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'staff'}
              onClick={() => setActiveTab('staff')}
              className={`h-10 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'staff'
                  ? 'bg-amber-500 text-stone-950'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/60'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>
                Staff ({staff.employees.length}/{staff.employeeCapacity})
              </span>
            </button>
          </div>
        </div>

        {/* Transaction Feedback Bar */}
        {lastTx && (
          <div className="px-4 pt-2.5 sm:px-6 shrink-0">
            <div
              role="status"
              aria-live="polite"
              className={`rounded-lg border px-3 py-2 flex items-center justify-between gap-2 text-xs sm:text-sm ${
                lastTx.kind === 'error'
                  ? 'bg-[#261116] border-rose-500/60 text-rose-200'
                  : lastTx.kind === 'sale'
                    ? 'bg-[#10221a] border-emerald-500/60 text-emerald-200'
                    : lastTx.kind === 'upgrade'
                      ? 'bg-[#1d1829] border-amber-500/60 text-amber-200'
                      : 'bg-[#151b26] border-stone-700 text-stone-200'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {lastTx.kind === 'error' ? (
                  <TriangleAlert className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
                ) : (
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 ${
                      lastTx.kind === 'sale' ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                    aria-hidden="true"
                  />
                )}
                <span className="truncate font-medium">{lastTx.message}</span>
              </div>
              {lastTx.moneyDelta !== 0 && (
                <span
                  className={`font-mono-tabular font-bold shrink-0 ${
                    lastTx.moneyDelta > 0 ? 'text-emerald-300' : 'text-amber-300'
                  }`}
                >
                  {lastTx.moneyDelta > 0 ? `+${formatMoney(lastTx.moneyDelta)}` : formatMoney(lastTx.moneyDelta)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto touch-pan-y px-4 py-3 sm:px-6 space-y-3">
          {activeTab === 'upgrades' && (
            <div className="space-y-4">
              {/* 1. Shop Level Expansion Card */}
              <div className="rounded-lg border border-stone-700/80 bg-[#141b27] p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-amber-400 font-semibold">
                      Shop Expansion · Level {shop.shopLevel} of {shop.maxShopLevel}
                    </div>
                    <h3 className="text-base font-bold text-stone-100 mt-0.5">
                      {currentLevelCfg.name}
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">{currentLevelCfg.description}</p>
                  </div>
                  <div className="font-mono-tabular text-xs text-stone-300 shrink-0">
                    Cap: {shop.customerCapacity} Visitors · {hud.packCapacity} Pack · +{shop.trafficBonusPct}% Traffic
                  </div>
                </div>

                {nextLevelCfg ? (
                  <div className="rounded-lg border border-stone-700/80 bg-[#0b0e15] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="text-sm font-semibold text-stone-100">
                        Next: Level {nextLevelCfg.level} — {nextLevelCfg.name}
                      </div>
                      <div className="text-xs text-stone-400">{nextLevelCfg.description}</div>
                      <ul className="text-xs text-emerald-300/90 space-y-0.5 pt-1">
                        {nextLevelCfg.benefits.map((b) => (
                          <li key={b} className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>{b}</span>
                          </li>
                        ))}
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>+2 Pack carrying slots & +6% customer traffic</span>
                        </li>
                      </ul>
                    </div>
                    <button
                      type="button"
                      disabled={shop.money < nextLevelCfg.upgradeCost}
                      onClick={onUpgradeShopLevel}
                      className={`h-11 px-4 rounded-lg text-xs font-bold font-mono-tabular whitespace-nowrap shrink-0 transition-colors ${
                        shop.money >= nextLevelCfg.upgradeCost
                          ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer'
                          : 'bg-stone-800 text-stone-400 border border-stone-700 cursor-not-allowed'
                      }`}
                    >
                      Upgrade · {formatMoney(nextLevelCfg.upgradeCost)}
                    </button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-emerald-500/40 bg-[#10221a] px-3.5 py-2.5 text-xs font-semibold text-emerald-300">
                    Maximum shop expansion reached — Major Survivor Trading Hub fully operational.
                  </div>
                )}
              </div>

              {/* 2. Storage Capacity Upgrade Card */}
              <div className="rounded-lg border border-stone-700/80 bg-[#141b27] p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-sky-300 font-semibold">
                      Backroom Storage Racks · Tier {shop.storageTier}/{shop.maxStorageTier}
                    </div>
                    <h3 className="text-sm font-bold text-stone-100 mt-0.5">
                      Capacity: {shop.totalStorageItems} / {shop.storageCapacity} items
                    </h3>
                  </div>
                  <span className="font-mono-tabular text-xs text-stone-400">
                    {storageFree} slots free
                  </span>
                </div>

                {nextStorageCfg ? (
                  <div className="rounded-lg border border-stone-700/80 bg-[#0b0e15] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-stone-100">
                        {nextStorageCfg.name}{' '}
                        <span className="font-mono-tabular text-sky-300">
                          (+{nextStorageCfg.capacityBonus} capacity)
                        </span>
                      </div>
                      <div className="text-xs text-stone-400 mt-0.5">{nextStorageCfg.description}</div>
                    </div>
                    <button
                      type="button"
                      disabled={shop.money < nextStorageCfg.cost}
                      onClick={onUpgradeStorageTier}
                      className={`h-11 px-4 rounded-lg text-xs font-bold font-mono-tabular whitespace-nowrap shrink-0 transition-colors ${
                        shop.money >= nextStorageCfg.cost
                          ? 'bg-sky-400 hover:bg-sky-300 text-stone-950 cursor-pointer'
                          : 'bg-stone-800 text-stone-400 border border-stone-700 cursor-not-allowed'
                      }`}
                    >
                      Install · {formatMoney(nextStorageCfg.cost)}
                    </button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-sky-500/40 bg-[#0e1b29] px-3.5 py-2.5 text-xs font-semibold text-sky-300">
                    All storage rack tiers installed in backroom storeroom.
                  </div>
                )}
              </div>

              {/* 3. Shop Decorations */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" aria-hidden="true" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                      Shop Decorations ({shop.ownedDecorations.length}/{SHOP_DECORATIONS.length})
                    </h3>
                  </div>
                  <span className="text-[11px] text-stone-400">
                    Instant 3D build · +3% foot traffic each
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SHOP_DECORATIONS.map((deco) => {
                    const owned = ownedDecoSet.has(deco.id);
                    const canAfford = shop.money >= deco.cost;
                    return (
                      <div
                        key={deco.id}
                        className={`rounded-lg border p-3 flex flex-col justify-between gap-2.5 ${
                          owned
                            ? 'bg-[#101e19] border-emerald-500/45'
                            : 'bg-[#141b27] border-stone-700/80'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-stone-100 truncate">
                              {deco.name}
                            </span>
                            <span className="font-mono-tabular text-[11px] text-stone-400 shrink-0">
                              {deco.category}
                            </span>
                          </div>
                          <p className="text-xs text-stone-400 mt-1">{deco.description}</p>
                        </div>

                        <button
                          type="button"
                          disabled={owned || !canAfford}
                          onClick={() => onPurchaseDecoration(deco.id)}
                          className={`h-10 w-full rounded-lg text-xs font-bold font-mono-tabular transition-colors ${
                            owned
                              ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 cursor-default'
                              : canAfford
                                ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer'
                                : 'bg-stone-800 text-stone-400 border border-stone-700 cursor-not-allowed'
                          }`}
                        >
                          {owned ? 'Installed' : `Buy · ${formatMoney(deco.cost)}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="space-y-4">
              {/* Real Business Statistics Grid */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-300 mb-2">
                  Business Statistics
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-lg border border-stone-800 bg-[#0b0e15] p-3.5">
                  <div>
                    <div className="text-[11px] text-stone-400">Total Revenue</div>
                    <div className="font-mono-tabular text-base font-bold text-emerald-300">
                      {formatMoney(shop.stats.totalRevenue)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-stone-400">Total Items Sold</div>
                    <div className="font-mono-tabular text-base font-bold text-stone-100">
                      {shop.stats.totalItemsSold}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-stone-400">Customers Served</div>
                    <div className="font-mono-tabular text-base font-bold text-amber-300">
                      {shop.stats.customersServed}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-stone-400">Current Shop Level</div>
                    <div className="font-mono-tabular text-sm font-bold text-stone-100 truncate">
                      Lv {shop.stats.currentShopLevel} · {shop.shopLevelName}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-stone-400">Shelf Stock Value</div>
                    <div className="font-mono-tabular text-base font-bold text-sky-300">
                      {formatMoney(shop.stats.currentStockValue)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-stone-400">Available Funds</div>
                    <div className="font-mono-tabular text-base font-bold text-emerald-300">
                      {formatMoney(shop.stats.totalMoneyAvailable)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Visitors Section */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-xs font-semibold text-stone-300">
                    Active Visitors ({shop.activeCustomers.length}/{shop.customerCapacity})
                  </h3>
                  <span className="text-[11px] text-stone-400">{shop.shopStatusReason}</span>
                </div>
                {shop.activeCustomers.length === 0 ? (
                  <div className="rounded-lg border border-stone-800 bg-[#0c1018] px-3.5 py-3 text-xs text-stone-400">
                    {shop.shopAcceptingCustomers
                      ? 'No survivors in the shop right now. Stock your shelves and visitors will arrive from Main Blvd.'
                      : 'No active visitors while the shop is closed.'}
                  </div>
                ) : (
                  <div className="divide-y divide-stone-800 rounded-lg border border-stone-700/80 bg-[#141b27]">
                    {shop.activeCustomers.map((c) => (
                      <div
                        key={c.id}
                        className="px-3.5 py-2.5 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-stone-100 truncate">
                            {c.name}
                          </div>
                          <div className="text-xs text-stone-400 truncate">
                            {c.statusLabel}
                            {c.desiredItemName
                              ? ` · ${c.desiredQuantity} ${c.desiredItemName}`
                              : ''}
                          </div>
                        </div>
                        <div className="font-mono-tabular text-xs font-semibold text-stone-300 shrink-0">
                          Budget {formatMoney(c.budget)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Customer Sales Log */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-xs font-semibold text-stone-300">Recent Customer Sales</h3>
                  <span className="font-mono-tabular text-[11px] text-stone-400">
                    {shop.customerSalesCount} completed
                  </span>
                </div>
                {shop.recentCustomerSales.length === 0 ? (
                  <div className="rounded-lg border border-stone-800 bg-[#0c1018] px-3.5 py-3 text-xs text-stone-400">
                    No customer sales recorded yet. Place items on your shop shelves to attract buyers.
                  </div>
                ) : (
                  <div className="divide-y divide-stone-800 rounded-lg border border-stone-700/80 bg-[#141b27]">
                    {shop.recentCustomerSales.map((sale) => (
                      <div
                        key={sale.id}
                        className="px-3.5 py-2.5 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-stone-100 truncate">
                            {sale.customerName}
                          </div>
                          <div className="text-xs text-stone-400 font-mono-tabular">
                            {sale.quantity}x {sale.itemName} · {sale.timestampLabel || 'Today'}
                          </div>
                        </div>
                        <div className="font-mono-tabular text-sm font-bold text-emerald-300 shrink-0">
                          +{formatMoney(sale.totalRevenue)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'staff' && (
            <div className="space-y-4">
              {/* Payroll & Capacity Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-lg border border-stone-800 bg-[#0b0e15] p-3.5">
                <div>
                  <div className="text-[11px] text-stone-400">Staff Capacity</div>
                  <div className="font-mono-tabular text-base font-bold text-amber-300">
                    {staff.employees.length} / {staff.employeeCapacity} Hired
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-stone-400">Active Guards</div>
                  <div className="font-mono-tabular text-base font-bold text-sky-300">
                    {staff.activeGuardCount} / {staff.maxGuards} Max
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-stone-400">Upcoming Payroll</div>
                  <div className="font-mono-tabular text-base font-bold text-emerald-300">
                    {formatMoney(staff.upcomingSalaryTotal)}{' '}
                    <span className="text-xs text-stone-400 font-normal">
                      {staff.employees.length > 0 ? `in ${staff.nextSalaryInSeconds}s` : 'per cycle'}
                    </span>
                  </div>
                </div>
              </div>

              {staff.unpaidCount > 0 && (
                <div className="rounded-lg border border-rose-500/60 bg-[#261116] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 text-xs text-rose-200">
                    <TriangleAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <div className="font-semibold">
                        {staff.unpaidCount} employee(s) paused due to insufficient funds
                      </div>
                      <div className="text-rose-300/80 mt-0.5">
                        Earn or deposit funds, then pay overdue wages to resume their work.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onPayUnpaidWages}
                    className="h-10 px-3.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold whitespace-nowrap cursor-pointer shrink-0"
                  >
                    Pay Overdue Wages
                  </button>
                </div>
              )}

              {/* Employee Roster */}
              {staff.employees.length === 0 ? (
                <div className="rounded-lg border border-stone-800 bg-[#0c1018] p-4 space-y-2.5">
                  <div className="text-sm font-semibold text-stone-100">
                    No employees hired yet
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    Explore the neighborhood to find friendly survivors in abandoned buildings and safe street spots. Approach and talk to them to recruit staff for your shop.
                  </p>
                  <div className="pt-1 space-y-1 text-xs text-stone-300">
                    {staff.worldSurvivors
                      .filter((s) => !s.recruited)
                      .map((s) => (
                        <div key={s.id} className="flex items-center justify-between gap-2 text-[11px] text-stone-400">
                          <span className="truncate">
                            {s.name} — {s.locationLabel}
                          </span>
                          <span className="font-mono-tabular text-amber-300 shrink-0">
                            {PROFESSION_CONFIGS[s.preferredProfession].shortLabel}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {staff.employees.map((emp) => {
                    const hpPct = Math.max(0, Math.min(100, Math.round((emp.health / emp.maxHealth) * 100)));
                    return (
                      <div
                        key={emp.id}
                        className={`rounded-lg border p-3.5 space-y-3 ${
                          emp.status === 'unpaid'
                            ? 'bg-[#1f1318] border-rose-500/50'
                            : 'bg-[#141b27] border-stone-700/80'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-base font-bold text-stone-100 truncate">
                                {emp.name}
                              </span>
                              <span
                                className={`text-[11px] font-semibold font-mono-tabular ${
                                  emp.status === 'unpaid'
                                    ? 'text-rose-300'
                                    : emp.status === 'engaging'
                                      ? 'text-orange-300'
                                      : 'text-emerald-300'
                                }`}
                              >
                                · {emp.statusLabel}
                              </span>
                            </div>
                            <div className="text-xs text-stone-400 mt-0.5">
                              {emp.taskLabel} · Hired Day {emp.recruitedDay}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right font-mono-tabular">
                              <div className="text-xs font-bold text-amber-300">
                                {formatMoney(emp.salary)}/cycle
                              </div>
                              <div className="text-[11px] text-stone-400">
                                HP {emp.health}/{emp.maxHealth}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onDismissEmployee(emp.id)}
                              aria-label={`Dismiss ${emp.name}`}
                              className="h-9 px-2.5 rounded-lg border border-stone-700 bg-stone-800 hover:bg-rose-950 hover:border-rose-500/60 hover:text-rose-200 text-stone-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <UserMinus className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Dismiss</span>
                            </button>
                          </div>
                        </div>

                        {/* Health bar */}
                        <div className="h-1.5 rounded-full bg-stone-900 overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              hpPct <= 35 ? 'bg-rose-500' : 'bg-emerald-400'
                            }`}
                            style={{ width: `${hpPct}%` }}
                          />
                        </div>

                        {/* Profession Switcher */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {PROFESSION_ORDER.map((profId) => {
                            const pCfg = PROFESSION_CONFIGS[profId];
                            const active = emp.profession === profId;
                            const guardBlocked =
                              profId === 'guard' &&
                              !active &&
                              staff.activeGuardCount >= staff.maxGuards;
                            return (
                              <button
                                key={profId}
                                type="button"
                                disabled={active || guardBlocked}
                                onClick={() => onSetEmployeeProfession(emp.id, profId)}
                                className={`h-9 px-2 rounded-md border text-[11px] font-semibold transition-colors ${
                                  active
                                    ? 'bg-amber-500 border-amber-400 text-stone-950 cursor-default'
                                    : guardBlocked
                                      ? 'bg-[#0b0e15] border-stone-800 text-stone-600 cursor-not-allowed'
                                      : 'bg-[#0b0e15] border-stone-700 text-stone-300 hover:border-stone-500 hover:text-white cursor-pointer'
                                }`}
                              >
                                {pCfg.shortLabel} ({formatMoney(pCfg.salary)})
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {staff.employees.length >= staff.employeeCapacity && nextLevelCfg && (
                <div className="rounded-lg border border-amber-500/40 bg-[#1a1610] px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs text-amber-200">
                  <span>
                    Staff limit reached ({staff.employees.length}/{staff.employeeCapacity}). Upgrade to Lv {nextLevelCfg.level} for {nextLevelCfg.employeeCapacity} slots.
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upgrades')}
                    className="h-8 px-2.5 rounded bg-amber-500 text-stone-950 font-bold whitespace-nowrap cursor-pointer shrink-0"
                  >
                    Upgrades
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'storage' && (
            <div className="rounded-lg border border-stone-800 bg-[#0b0e15] px-3.5 py-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-stone-200">
                  Storage Capacity: {shop.totalStorageItems} / {shop.storageCapacity}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono-tabular text-stone-400">
                    {storageFree > 0 ? `${storageFree} space left` : 'Storage full'}
                  </span>
                  {nextStorageCfg && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('upgrades')}
                      className="h-8 px-2.5 rounded bg-sky-400/15 border border-sky-400/50 text-sky-300 text-[11px] font-semibold cursor-pointer hover:bg-sky-400/25"
                    >
                      Expand
                    </button>
                  )}
                </div>
              </div>
              <div className="h-2 rounded-full bg-stone-800 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    storagePct >= 100
                      ? 'bg-rose-500'
                      : storagePct >= 80
                        ? 'bg-amber-400'
                        : 'bg-sky-400'
                  }`}
                  style={{ width: `${storagePct}%` }}
                />
              </div>
            </div>
          )}

          {activeTab === 'transfer' && (
            <div className="rounded-lg border border-stone-800 bg-[#0b0e15] px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="text-xs text-stone-300">
                Move scavenged supplies from your pack onto display shelves so visiting survivors can buy them.
              </div>
              {shop.totalStorageItems > 0 && (
                <button
                  type="button"
                  onClick={onRestockFromStorage}
                  className="h-10 px-3.5 rounded-lg bg-sky-400 hover:bg-sky-300 text-stone-950 text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                >
                  Restock All from Storage ({shop.totalStorageItems})
                </button>
              )}
            </div>
          )}

          {activeTab === 'counter' && shop.totalStockItems === 0 && (
            <div className="rounded-lg border border-stone-800 bg-[#0c1018] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-stone-200">
                  Shop shelves are empty
                </div>
                <div className="text-xs text-stone-400 mt-0.5">
                  Transfer supplies from your pack or backroom storage onto your shelves before selling.
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {shop.totalStorageItems > 0 && (
                  <button
                    type="button"
                    onClick={onRestockFromStorage}
                    className="h-10 px-3.5 rounded-lg bg-sky-400 hover:bg-sky-300 text-stone-950 text-xs font-semibold cursor-pointer whitespace-nowrap"
                  >
                    Restock from Storage
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveTab('transfer')}
                  className="h-10 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                >
                  Manage Shelves
                </button>
              </div>
            </div>
          )}

          {(activeTab === 'counter' || activeTab === 'transfer' || activeTab === 'storage') &&
            RESOURCE_ORDER.map((id) => {
              const priceDef = SHOP_ITEM_PRICES[id];
              const packQty = Math.max(0, inventory[id] ?? 0);
              const stockQty = Math.max(0, shop.shopStock[id] ?? 0);
              const storageQty = Math.max(0, shop.shopStorage[id] ?? 0);

              const stepperCap =
                activeTab === 'counter'
                  ? stockQty
                  : activeTab === 'transfer'
                    ? Math.max(packQty, stockQty)
                    : Math.max(packQty, storageQty, stockQty);
              const selectedQty = getQty(id, Math.max(1, stepperCap));

              if (activeTab === 'counter') {
                const canSell = stockQty > 0;
                const payout = selectedQty * priceDef.sellPrice;

                return (
                  <div
                    key={id}
                    className={`rounded-lg border px-3.5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      canSell
                        ? 'bg-[#151c29] border-stone-600/80'
                        : 'bg-[#0c1018] border-stone-800/80 opacity-75'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-stone-100 truncate">
                          {priceDef.displayName}
                        </span>
                        <span className="font-mono-tabular text-xs font-bold text-amber-300 whitespace-nowrap">
                          Shelf {stockQty}
                        </span>
                      </div>
                      <div className="text-xs text-stone-400 mt-0.5 font-mono-tabular">
                        {priceDef.category} · {priceDef.rarity} · Sell {formatMoney(priceDef.sellPrice)} ea
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                      <div className="flex items-center gap-1 bg-[#0b0e15] border border-stone-700/80 rounded-lg p-1">
                        <button
                          type="button"
                          disabled={!canSell || selectedQty <= 1}
                          onClick={() => adjustQty(id, -1, stockQty)}
                          aria-label={`Decrease sell quantity for ${priceDef.displayName}`}
                          className="w-8 h-8 rounded flex items-center justify-center text-stone-300 hover:bg-stone-800 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono-tabular text-xs font-bold text-stone-100 min-w-[26px] text-center">
                          {canSell ? selectedQty : 0}
                        </span>
                        <button
                          type="button"
                          disabled={!canSell || selectedQty >= stockQty}
                          onClick={() => adjustQty(id, 1, stockQty)}
                          aria-label={`Increase sell quantity for ${priceDef.displayName}`}
                          className="w-8 h-8 rounded flex items-center justify-center text-stone-300 hover:bg-stone-800 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={!canSell || selectedQty === stockQty}
                          onClick={() => setMaxQty(id, stockQty)}
                          className="h-8 px-2 rounded text-[11px] font-semibold text-stone-300 hover:bg-stone-800 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
                        >
                          Max
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={!canSell}
                        onClick={() => onSellStock(id, selectedQty)}
                        className={`h-10 px-3.5 rounded-lg text-xs font-semibold font-mono-tabular whitespace-nowrap transition-colors ${
                          canSell
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 cursor-pointer'
                            : 'bg-stone-800 text-stone-500 border border-stone-700/70 cursor-not-allowed'
                        }`}
                      >
                        {canSell ? `Sell · +${formatMoney(payout)}` : 'Out of Stock'}
                      </button>
                    </div>
                  </div>
                );
              }

              if (activeTab === 'transfer') {
                const transferToShelfQty = Math.min(selectedQty, packQty);
                const takeToPackQty = Math.min(selectedQty, stockQty);

                return (
                  <div
                    key={id}
                    className="rounded-lg border border-stone-700/75 bg-[#141b27] px-3.5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-stone-100 truncate">
                        {priceDef.displayName}
                      </div>
                      <div className="text-xs text-stone-300 mt-0.5 font-mono-tabular">
                        Pack <span className="text-stone-100 font-bold">{packQty}</span>
                        <span className="text-stone-600 mx-1.5">·</span>
                        Shelf <span className="text-amber-300 font-bold">{stockQty}</span>
                        <span className="text-stone-600 mx-1.5">·</span>
                        Sell {formatMoney(priceDef.sellPrice)}
                      </div>
                      <div className="text-[11px] text-stone-400 mt-0.5 truncate">
                        {RESOURCE_PURPOSE_HINTS[id]}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0">
                      <div className="flex items-center gap-1 bg-[#0b0e15] border border-stone-700/80 rounded-lg p-1">
                        <button
                          type="button"
                          disabled={selectedQty <= 1}
                          onClick={() => adjustQty(id, -1, Math.max(packQty, stockQty, 1))}
                          aria-label={`Decrease transfer quantity for ${priceDef.displayName}`}
                          className="w-8 h-8 rounded flex items-center justify-center text-stone-300 hover:bg-stone-800 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono-tabular text-xs font-bold text-stone-100 min-w-[26px] text-center">
                          {selectedQty}
                        </span>
                        <button
                          type="button"
                          disabled={selectedQty >= Math.max(packQty, stockQty, 1)}
                          onClick={() => adjustQty(id, 1, Math.max(packQty, stockQty, 1))}
                          aria-label={`Increase transfer quantity for ${priceDef.displayName}`}
                          className="w-8 h-8 rounded flex items-center justify-center text-stone-300 hover:bg-stone-800 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={Math.max(packQty, stockQty) <= 0}
                          onClick={() => setMaxQty(id, Math.max(packQty, stockQty))}
                          className="h-8 px-2 rounded text-[11px] font-semibold text-stone-300 hover:bg-stone-800 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
                        >
                          Max
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={packQty <= 0}
                        onClick={() => onTransferToStock(id, transferToShelfQty)}
                        className={`h-10 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                          packQty > 0
                            ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer'
                            : 'bg-stone-800 text-stone-500 border border-stone-700/70 cursor-not-allowed'
                        }`}
                      >
                        Shelf +{packQty > 0 ? transferToShelfQty : 0}
                      </button>

                      <button
                        type="button"
                        disabled={stockQty <= 0}
                        onClick={() => onTransferFromStock(id, takeToPackQty)}
                        className={`h-10 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                          stockQty > 0
                            ? 'bg-stone-700 hover:bg-stone-600 text-stone-100 cursor-pointer'
                            : 'bg-stone-800 text-stone-500 border border-stone-700/70 cursor-not-allowed'
                        }`}
                      >
                        Take {stockQty > 0 ? takeToPackQty : 0}
                      </button>
                    </div>
                  </div>
                );
              }

              // Storage tab
              const storeQty = Math.min(selectedQty, packQty);
              const retrieveQty = Math.min(selectedQty, storageQty);
              const toShelfQty = Math.min(selectedQty, storageQty);
              const canStorePack = packQty > 0 && storageFree > 0;

              return (
                <div
                  key={id}
                  className="rounded-lg border border-stone-700/75 bg-[#141b27] px-3.5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-stone-100 truncate">
                      {priceDef.displayName}
                    </div>
                    <div className="text-xs text-stone-300 mt-0.5 font-mono-tabular">
                      Pack <span className="text-stone-100 font-bold">{packQty}</span>
                      <span className="text-stone-600 mx-1.5">·</span>
                      Stored <span className="text-sky-300 font-bold">{storageQty}</span>
                      <span className="text-stone-600 mx-1.5">·</span>
                      Shelf <span className="text-amber-300 font-bold">{stockQty}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0">
                    <div className="flex items-center gap-1 bg-[#0b0e15] border border-stone-700/80 rounded-lg p-1">
                      <button
                        type="button"
                        disabled={selectedQty <= 1}
                        onClick={() => adjustQty(id, -1, Math.max(packQty, storageQty, stockQty, 1))}
                        aria-label={`Decrease storage quantity for ${priceDef.displayName}`}
                        className="w-8 h-8 rounded flex items-center justify-center text-stone-300 hover:bg-stone-800 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono-tabular text-xs font-bold text-stone-100 min-w-[26px] text-center">
                        {selectedQty}
                      </span>
                      <button
                        type="button"
                        disabled={selectedQty >= Math.max(packQty, storageQty, stockQty, 1)}
                        onClick={() => adjustQty(id, 1, Math.max(packQty, storageQty, stockQty, 1))}
                        aria-label={`Increase storage quantity for ${priceDef.displayName}`}
                        className="w-8 h-8 rounded flex items-center justify-center text-stone-300 hover:bg-stone-800 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={Math.max(packQty, storageQty, stockQty) <= 0}
                        onClick={() => setMaxQty(id, Math.max(packQty, storageQty, stockQty))}
                        className="h-8 px-2 rounded text-[11px] font-semibold text-stone-300 hover:bg-stone-800 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
                      >
                        Max
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={packQty <= 0}
                      onClick={() => onTransferToStorage(id, storeQty)}
                      className={`h-10 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                        canStorePack
                          ? 'bg-sky-400 hover:bg-sky-300 text-stone-950 cursor-pointer'
                          : packQty > 0
                            ? 'bg-stone-800 border border-rose-500/50 text-rose-300 cursor-pointer'
                            : 'bg-stone-800 text-stone-500 border border-stone-700/70 cursor-not-allowed'
                      }`}
                    >
                      Store +{packQty > 0 ? storeQty : 0}
                    </button>

                    <button
                      type="button"
                      disabled={storageQty <= 0}
                      onClick={() => onTransferFromStorage(id, retrieveQty)}
                      className={`h-10 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                        storageQty > 0
                          ? 'bg-stone-700 hover:bg-stone-600 text-stone-100 cursor-pointer'
                          : 'bg-stone-800 text-stone-500 border border-stone-700/70 cursor-not-allowed'
                      }`}
                    >
                      Take {storageQty > 0 ? retrieveQty : 0}
                    </button>

                    <button
                      type="button"
                      disabled={storageQty <= 0}
                      onClick={() => onTransferStorageToStock(id, toShelfQty)}
                      className={`h-10 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                        storageQty > 0
                          ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer'
                          : 'bg-stone-800 text-stone-500 border border-stone-700/70 cursor-not-allowed'
                      }`}
                    >
                      Shelf +{storageQty > 0 ? toShelfQty : 0}
                    </button>

                    {stockQty > 0 && (
                      <button
                        type="button"
                        onClick={() => onTransferStockToStorage(id, Math.min(selectedQty, stockQty))}
                        className="h-10 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 cursor-pointer"
                      >
                        From Shelf
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 sm:px-6 border-t border-stone-800 flex items-center justify-between gap-4 shrink-0">
          <span className="text-xs text-stone-400 font-mono-tabular">
            {isTouchMode ? 'Tap Close to return to shop floor' : 'Esc to close and resume'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-sm transition-colors cursor-pointer shrink-0"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

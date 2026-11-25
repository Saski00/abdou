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
import { useViewportLayout } from '../game/responsiveLayout';
import {
  RESOURCE_ORDER,
  getLocalizedResourcePurposeHint,
  getTotalInventoryItems,
} from '../game/resources';
import { PROFESSION_CONFIGS, PROFESSION_ORDER } from '../game/staffSystem';
import { EmployeeProfession, HudSnapshot, ResourceId, ShopModalTab } from '../game/types';
import {
  formatTpl,
  tCustomerName,
  tDecoration,
  tProfession,
  tResource,
  tResourceName,
  tShopLevel,
  tStorageTier,
  tSurvivor,
  useI18n,
} from '../i18n';

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
  const { dir, t } = useI18n();
  const shopCopy = t.shopModal;
  const viewport = useViewportLayout();
  const isCompactLandscape = viewport.isCompactLandscape;
  const [activeTab, setActiveTab] = useState<ShopModalTab>(initialTab);
  const [quantities, setQuantities] = useState<Record<ResourceId, number>>(DEFAULT_QUANTITIES);

  const { inventory, shop, staff } = hud;
  const packTotal = getTotalInventoryItems(inventory);
  const lastTx = shop.lastTransaction;

  const currentLevelCfg = getShopLevelConfig(shop.shopLevel);
  const currentLevelLoc = tShopLevel(shop.shopLevel);
  const nextLevelCfg = getNextShopLevelConfig(shop.shopLevel);
  const nextLevelLoc = nextLevelCfg ? tShopLevel(nextLevelCfg.level) : null;
  const nextStorageCfg = getNextStorageUpgradeConfig(shop.storageTier);
  const nextStorageLoc = nextStorageCfg ? tStorageTier(nextStorageCfg.tier) : null;
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
      dir={dir}
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
      <div
        className={`w-full max-h-[92dvh] flex flex-col bg-[#10151f] border border-stone-700/80 rounded-xl shadow-2xl overflow-hidden ${
          isCompactLandscape ? 'max-w-3xl' : 'max-w-2xl'
        }`}
      >
        {/* Top Header */}
        <div
          className={`border-b border-stone-800 flex items-start justify-between gap-3 shrink-0 ${
            isCompactLandscape ? 'px-4 py-2' : 'px-4 py-3.5 sm:px-6 sm:py-4'
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
              <h2
                id="shop-modal-title"
                className={`font-display font-bold tracking-wider text-stone-100 leading-none truncate uppercase ${
                  isCompactLandscape ? 'text-xl' : 'text-2xl sm:text-3xl'
                }`}
              >
                {shopCopy.title}
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-1 truncate">
              {formatTpl(shopCopy.subtitleLine, {
                level: shop.shopLevel,
                name: currentLevelLoc.name || shop.shopLevelName,
                status: shop.shopStatusReason,
              })}
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
              {shop.shopManualOpen ? shopCopy.shopOpenToggle : shopCopy.shopClosedToggle}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={shopCopy.closeAria}
              className="h-11 w-11 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Shop Overview Strip */}
        <div
          className={`bg-[#0b0e15] border-b border-stone-800 grid grid-cols-2 sm:grid-cols-4 shrink-0 ${
            isCompactLandscape ? 'px-4 py-1.5 gap-2' : 'px-4 py-3 sm:px-6 gap-3'
          }`}
        >
          <div>
            <div className="text-[11px] text-stone-400">{shopCopy.cashBalanceLabel}</div>
            <div className="font-mono-tabular text-lg font-bold text-emerald-300">
              <bdi dir="ltr">{formatMoney(shop.money)}</bdi>
            </div>
          </div>
          <div>
            <div className="text-[11px] text-stone-400">{shopCopy.shopTrafficLabel}</div>
            <div className="font-mono-tabular text-base font-bold text-amber-300">
              {formatTpl(t.common.lvlShort, { level: shop.shopLevel })} ·{' '}
              <bdi dir="ltr">
                {shop.activeCustomers.length}/{shop.customerCapacity}
              </bdi>
              {shop.trafficBonusPct > 0 ? (
                <span className="text-emerald-300 text-xs font-semibold ms-1.5">
                  <bdi dir="ltr">+{shop.trafficBonusPct}%</bdi>
                </span>
              ) : null}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-stone-400">{shopCopy.packStorageLabel}</div>
            <div className="font-mono-tabular text-base font-bold text-sky-300">
              <bdi dir="ltr">
                {packTotal}/{hud.packCapacity}
              </bdi>{' '}
              <span className="text-stone-500 font-normal">·</span>{' '}
              <bdi dir="ltr" className="text-stone-200">
                {shop.totalStorageItems}/{shop.storageCapacity}
              </bdi>
            </div>
          </div>
          <div>
            <div className="text-[11px] text-stone-400">{shopCopy.shelfRevenueLabel}</div>
            <div className="font-mono-tabular text-base font-bold text-stone-100">
              <bdi dir="ltr">{shop.totalStockItems}</bdi> ·{' '}
              <bdi dir="ltr">{formatMoney(shop.totalRevenueEarned)}</bdi>
            </div>
          </div>
        </div>

        {/* Interactive Mode Tabs */}
        <div className={`${isCompactLandscape ? 'px-4 pt-2' : 'px-4 pt-3 sm:px-6'} shrink-0`}>
          <div
            role="tablist"
            aria-label={shopCopy.tablistAria}
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
              <span>{shopCopy.tabSell}</span>
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
                {formatTpl(shopCopy.tabShelves, { used: packTotal, cap: hud.packCapacity })}
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
                {formatTpl(shopCopy.tabStorage, {
                  used: shop.totalStorageItems,
                  cap: shop.storageCapacity,
                })}
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
              <span>{shopCopy.tabUpgrades}</span>
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
              <span>{formatTpl(shopCopy.tabSales, { count: shop.activeCustomers.length })}</span>
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
                {formatTpl(shopCopy.tabStaff, {
                  count: staff.employees.length,
                  cap: staff.employeeCapacity,
                })}
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
                <bdi
                  dir="ltr"
                  className={`font-mono-tabular font-bold shrink-0 ${
                    lastTx.moneyDelta > 0 ? 'text-emerald-300' : 'text-amber-300'
                  }`}
                >
                  {lastTx.moneyDelta > 0
                    ? `+${formatMoney(lastTx.moneyDelta)}`
                    : formatMoney(lastTx.moneyDelta)}
                </bdi>
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
                      {formatTpl(shopCopy.shopExpansionHeader, {
                        level: shop.shopLevel,
                        max: shop.maxShopLevel,
                      })}
                    </div>
                    <h3 className="text-base font-bold text-stone-100 mt-0.5">
                      {currentLevelLoc.name}
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">{currentLevelLoc.description}</p>
                  </div>
                  <div className="font-mono-tabular text-xs text-stone-300 shrink-0">
                    {formatTpl(shopCopy.capSummary, {
                      customers: shop.customerCapacity,
                      pack: hud.packCapacity,
                      pct: shop.trafficBonusPct,
                    })}
                  </div>
                </div>

                {nextLevelCfg && nextLevelLoc ? (
                  <div className="rounded-lg border border-stone-700/80 bg-[#0b0e15] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="text-sm font-semibold text-stone-100">
                        {formatTpl(shopCopy.nextLevelHeading, {
                          level: nextLevelCfg.level,
                          name: nextLevelLoc.name,
                        })}
                      </div>
                      <div className="text-xs text-stone-400">{nextLevelLoc.description}</div>
                      <ul className="text-xs text-emerald-300/90 space-y-0.5 pt-1">
                        {nextLevelLoc.benefits.map((b) => (
                          <li key={b} className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>{b}</span>
                          </li>
                        ))}
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>
                            {formatTpl(shopCopy.nextLevelPerksExtra, {
                              storage:
                                nextLevelCfg.baseStorageCapacity -
                                currentLevelCfg.baseStorageCapacity,
                              pack: 2,
                            })}
                          </span>
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
                      {formatTpl(shopCopy.upgradeBtn, {
                        cost: formatMoney(nextLevelCfg.upgradeCost),
                      })}
                    </button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-emerald-500/40 bg-[#10221a] px-3.5 py-2.5 text-xs font-semibold text-emerald-300">
                    {shopCopy.maxShopExpansionBanner}
                  </div>
                )}
              </div>

              {/* 2. Storage Capacity Upgrade Card */}
              <div className="rounded-lg border border-stone-700/80 bg-[#141b27] p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-sky-300 font-semibold">
                      {formatTpl(shopCopy.backroomStorageHeader, {
                        tier: shop.storageTier,
                        max: shop.maxStorageTier,
                      })}
                    </div>
                    <h3 className="text-sm font-bold text-stone-100 mt-0.5">
                      {formatTpl(shopCopy.capacityItemsLabel, {
                        used: shop.totalStorageItems,
                        cap: shop.storageCapacity,
                      })}
                    </h3>
                  </div>
                  <span className="font-mono-tabular text-xs text-stone-400">
                    {formatTpl(shopCopy.slotsFreeLabel, { free: storageFree })}
                  </span>
                </div>

                {nextStorageCfg ? (
                  <div className="rounded-lg border border-stone-700/80 bg-[#0b0e15] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-stone-100">
                        {nextStorageLoc?.name ?? nextStorageCfg.name}{' '}
                        <span className="font-mono-tabular text-sky-300">
                          {formatTpl(shopCopy.plusCapacityTag, {
                            bonus: nextStorageCfg.capacityBonus,
                          })}
                        </span>
                      </div>
                      <div className="text-xs text-stone-400 mt-0.5">
                        {nextStorageLoc?.description ?? nextStorageCfg.description}
                      </div>
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
                      {formatTpl(shopCopy.installBtn, { cost: formatMoney(nextStorageCfg.cost) })}
                    </button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-sky-500/40 bg-[#0e1b29] px-3.5 py-2.5 text-xs font-semibold text-sky-300">
                    {shopCopy.maxStorageBanner}
                  </div>
                )}
              </div>

              {/* 3. Shop Decorations */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" aria-hidden="true" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                      {formatTpl(shopCopy.decorationsHeading, {
                        owned: shop.ownedDecorations.length,
                        total: SHOP_DECORATIONS.length,
                      })}
                    </h3>
                  </div>
                  <span className="text-[11px] text-stone-400">{shopCopy.decorationsPerksHint}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SHOP_DECORATIONS.map((deco) => {
                    const owned = ownedDecoSet.has(deco.id);
                    const canAfford = shop.money >= deco.cost;
                    const decoLoc = tDecoration(deco.id, deco.name, deco.description, deco.category);
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
                              {decoLoc.name}
                            </span>
                            <span className="font-mono-tabular text-[11px] text-stone-400 shrink-0">
                              {decoLoc.category}
                            </span>
                          </div>
                          <p className="text-xs text-stone-400 mt-1">{decoLoc.description}</p>
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
                          {owned
                            ? shopCopy.installedBtn
                            : formatTpl(shopCopy.buyBtn, { cost: formatMoney(deco.cost) })}
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
                  {shopCopy.businessStatsHeading}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-lg border border-stone-800 bg-[#0b0e15] p-3.5">
                  <div>
                    <div className="text-[11px] text-stone-400">{shopCopy.statTotalRevenue}</div>
                    <bdi dir="ltr" className="font-mono-tabular text-base font-bold text-emerald-300">
                      {formatMoney(shop.stats.totalRevenue)}
                    </bdi>
                  </div>
                  <div>
                    <div className="text-[11px] text-stone-400">{shopCopy.statTotalItemsSold}</div>
                    <bdi dir="ltr" className="font-mono-tabular text-base font-bold text-stone-100">
                      {shop.stats.totalItemsSold}
                    </bdi>
                  </div>
                  <div>
                    <div className="text-[11px] text-stone-400">{shopCopy.statCustomersServed}</div>
                    <bdi dir="ltr" className="font-mono-tabular text-base font-bold text-amber-300">
                      {shop.stats.customersServed}
                    </bdi>
                  </div>
                  <div>
                    <div className="text-[11px] text-stone-400">{shopCopy.statCurrentShopLevel}</div>
                    <div className="font-mono-tabular text-sm font-bold text-stone-100 truncate">
                      {formatTpl(t.common.lvlShort, { level: shop.stats.currentShopLevel })} ·{' '}
                      {currentLevelLoc.name || shop.shopLevelName}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-stone-400">{shopCopy.statShelfStockValue}</div>
                    <bdi dir="ltr" className="font-mono-tabular text-base font-bold text-sky-300">
                      {formatMoney(shop.stats.currentStockValue)}
                    </bdi>
                  </div>
                  <div>
                    <div className="text-[11px] text-stone-400">{shopCopy.statAvailableFunds}</div>
                    <bdi dir="ltr" className="font-mono-tabular text-base font-bold text-emerald-300">
                      {formatMoney(shop.stats.totalMoneyAvailable)}
                    </bdi>
                  </div>
                </div>
              </div>

              {/* Active Visitors Section */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-xs font-semibold text-stone-300">
                    {formatTpl(shopCopy.activeVisitorsHeading, {
                      count: shop.activeCustomers.length,
                      cap: shop.customerCapacity,
                    })}
                  </h3>
                  <span className="text-[11px] text-stone-400">{shop.shopStatusReason}</span>
                </div>
                {shop.activeCustomers.length === 0 ? (
                  <div className="rounded-lg border border-stone-800 bg-[#0c1018] px-3.5 py-3 text-xs text-stone-400">
                    {shop.shopAcceptingCustomers ? shopCopy.noVisitorsOpen : shopCopy.noVisitorsClosed}
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
                          {formatTpl(shopCopy.budgetLabel, { amount: formatMoney(c.budget) })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Customer Sales Log */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-xs font-semibold text-stone-300">
                    {shopCopy.recentSalesHeading}
                  </h3>
                  <span className="font-mono-tabular text-[11px] text-stone-400">
                    {formatTpl(shopCopy.completedCountLabel, { count: shop.customerSalesCount })}
                  </span>
                </div>
                {shop.recentCustomerSales.length === 0 ? (
                  <div className="rounded-lg border border-stone-800 bg-[#0c1018] px-3.5 py-3 text-xs text-stone-400">
                    {shopCopy.noSalesRecorded}
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
                            {tCustomerName(sale.customerId, sale.customerName)}
                          </div>
                          <div className="text-xs text-stone-400 font-mono-tabular">
                            <bdi dir="ltr">{sale.quantity}×</bdi>{' '}
                            {tResourceName(sale.resourceId, sale.quantity)} ·{' '}
                            {sale.timestampLabel || t.common.today}
                          </div>
                        </div>
                        <bdi
                          dir="ltr"
                          className="font-mono-tabular text-sm font-bold text-emerald-300 shrink-0"
                        >
                          +{formatMoney(sale.totalRevenue)}
                        </bdi>
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
                  <div className="text-[11px] text-stone-400">{shopCopy.staffCapacityLabel}</div>
                  <div className="font-mono-tabular text-base font-bold text-amber-300">
                    {formatTpl(shopCopy.hiredRatio, {
                      count: staff.employees.length,
                      cap: staff.employeeCapacity,
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-stone-400">{shopCopy.activeGuardsLabel}</div>
                  <div className="font-mono-tabular text-base font-bold text-sky-300">
                    {formatTpl(shopCopy.maxRatio, {
                      count: staff.activeGuardCount,
                      max: staff.maxGuards,
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-stone-400">{shopCopy.upcomingPayrollLabel}</div>
                  <div className="font-mono-tabular text-base font-bold text-emerald-300">
                    <bdi dir="ltr">{formatMoney(staff.upcomingSalaryTotal)}</bdi>{' '}
                    <span className="text-xs text-stone-400 font-normal">
                      {staff.employees.length > 0
                        ? formatTpl(shopCopy.payrollInSeconds, { sec: staff.nextSalaryInSeconds })
                        : shopCopy.perCycleText}
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
                        {formatTpl(shopCopy.unpaidPausedHeadline, { count: staff.unpaidCount })}
                      </div>
                      <div className="text-rose-300/80 mt-0.5">{shopCopy.unpaidPausedSubtext}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onPayUnpaidWages}
                    className="h-10 px-3.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold whitespace-nowrap cursor-pointer shrink-0"
                  >
                    {shopCopy.payOverdueWagesBtn}
                  </button>
                </div>
              )}

              {/* Employee Roster */}
              {staff.employees.length === 0 ? (
                <div className="rounded-lg border border-stone-800 bg-[#0c1018] p-4 space-y-2.5">
                  <div className="text-sm font-semibold text-stone-100">
                    {shopCopy.noEmployeesTitle}
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed">{shopCopy.noEmployeesDesc}</p>
                  <div className="pt-1 space-y-1 text-xs text-stone-300">
                    {staff.worldSurvivors
                      .filter((s) => !s.recruited)
                      .map((s) => {
                        const sLoc = tSurvivor(s.id);
                        return (
                          <div
                            key={s.id}
                            className="flex items-center justify-between gap-2 text-[11px] text-stone-400"
                          >
                            <span className="truncate">
                              {sLoc?.name ?? s.name} — {sLoc?.locationLabel ?? s.locationLabel}
                            </span>
                            <span className="font-mono-tabular text-amber-300 shrink-0">
                              {tProfession(s.preferredProfession).shortLabel}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {staff.employees.map((emp) => {
                    const hpPct = Math.max(
                      0,
                      Math.min(100, Math.round((emp.health / emp.maxHealth) * 100))
                    );
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
                              {formatTpl(shopCopy.hiredDayMeta, {
                                task: emp.taskLabel,
                                day: emp.recruitedDay,
                              })}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-end font-mono-tabular">
                              <div className="text-xs font-bold text-amber-300">
                                {formatTpl(shopCopy.salaryCycleMeta, {
                                  salary: formatMoney(emp.salary),
                                })}
                              </div>
                              <div className="text-[11px] text-stone-400">
                                {formatTpl(shopCopy.hpRatioMeta, {
                                  hp: emp.health,
                                  max: emp.maxHealth,
                                })}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onDismissEmployee(emp.id)}
                              aria-label={formatTpl(shopCopy.dismissAria, { name: emp.name })}
                              className="h-9 px-2.5 rounded-lg border border-stone-700 bg-stone-800 hover:bg-rose-950 hover:border-rose-500/60 hover:text-rose-200 text-stone-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <UserMinus className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{shopCopy.dismissBtn}</span>
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
                            const pLoc = tProfession(profId);
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
                                {pLoc.shortLabel} (<bdi dir="ltr">{formatMoney(pCfg.salary)}</bdi>)
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
                    {formatTpl(shopCopy.staffLimitReachedBanner, {
                      count: staff.employees.length,
                      cap: staff.employeeCapacity,
                      nextLevel: nextLevelCfg.level,
                      nextCap: nextLevelCfg.employeeCapacity,
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upgrades')}
                    className="h-8 px-2.5 rounded bg-amber-500 text-stone-950 font-bold whitespace-nowrap cursor-pointer shrink-0"
                  >
                    {shopCopy.upgradesShortcutBtn}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'storage' && (
            <div className="rounded-lg border border-stone-800 bg-[#0b0e15] px-3.5 py-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-stone-200">
                  {formatTpl(shopCopy.storageCapBarLabel, {
                    used: shop.totalStorageItems,
                    cap: shop.storageCapacity,
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono-tabular text-stone-400">
                    {storageFree > 0
                      ? formatTpl(shopCopy.spaceLeftLabel, { free: storageFree })
                      : shopCopy.storageFullShort}
                  </span>
                  {nextStorageCfg && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('upgrades')}
                      className="h-8 px-2.5 rounded bg-sky-400/15 border border-sky-400/50 text-sky-300 text-[11px] font-semibold cursor-pointer hover:bg-sky-400/25"
                    >
                      {shopCopy.expandBtn}
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
              <div className="text-xs text-stone-300">{shopCopy.transferBannerText}</div>
              {shop.totalStorageItems > 0 && (
                <button
                  type="button"
                  onClick={onRestockFromStorage}
                  className="h-10 px-3.5 rounded-lg bg-sky-400 hover:bg-sky-300 text-stone-950 text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                >
                  {formatTpl(shopCopy.restockAllFromStorageBtn, {
                    count: shop.totalStorageItems,
                  })}
                </button>
              )}
            </div>
          )}

          {activeTab === 'counter' && shop.totalStockItems === 0 && (
            <div className="rounded-lg border border-stone-800 bg-[#0c1018] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-stone-200">
                  {shopCopy.emptyShelvesTitle}
                </div>
                <div className="text-xs text-stone-400 mt-0.5">{shopCopy.emptyShelvesDesc}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {shop.totalStorageItems > 0 && (
                  <button
                    type="button"
                    onClick={onRestockFromStorage}
                    className="h-10 px-3.5 rounded-lg bg-sky-400 hover:bg-sky-300 text-stone-950 text-xs font-semibold cursor-pointer whitespace-nowrap"
                  >
                    {shopCopy.restockFromStorageBtn}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveTab('transfer')}
                  className="h-10 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                >
                  {shopCopy.manageShelvesBtn}
                </button>
              </div>
            </div>
          )}

          {(activeTab === 'counter' || activeTab === 'transfer' || activeTab === 'storage') &&
            RESOURCE_ORDER.map((id) => {
              const priceDef = SHOP_ITEM_PRICES[id];
              const resLoc = tResource(id);
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
                          {resLoc.name}
                        </span>
                        <span className="font-mono-tabular text-xs font-bold text-amber-300 whitespace-nowrap">
                          {formatTpl(shopCopy.shelfCountBadge, { count: stockQty })}
                        </span>
                      </div>
                      <div className="text-xs text-stone-400 mt-0.5 font-mono-tabular">
                        {formatTpl(shopCopy.sellItemMeta, {
                          cat: resLoc.categoryLabel,
                          rarity: resLoc.rarityLabel,
                          price: formatMoney(priceDef.sellPrice),
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                      <div
                        dir="ltr"
                        className="flex items-center gap-1 bg-[#0b0e15] border border-stone-700/80 rounded-lg p-1"
                      >
                        <button
                          type="button"
                          disabled={!canSell || selectedQty <= 1}
                          onClick={() => adjustQty(id, -1, stockQty)}
                          aria-label={`- ${resLoc.name}`}
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
                          aria-label={`+ ${resLoc.name}`}
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
                          {t.common.max}
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
                        {canSell
                          ? formatTpl(shopCopy.sellBtnPayout, { amount: formatMoney(payout) })
                          : shopCopy.outOfStockBtn}
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
                        {resLoc.name}
                      </div>
                      <div className="text-xs text-stone-300 mt-0.5 font-mono-tabular">
                        {shopCopy.packWord}{' '}
                        <bdi dir="ltr" className="text-stone-100 font-bold">
                          {packQty}
                        </bdi>
                        <span className="text-stone-600 mx-1.5">·</span>
                        {shopCopy.shelfWord}{' '}
                        <bdi dir="ltr" className="text-amber-300 font-bold">
                          {stockQty}
                        </bdi>
                        <span className="text-stone-600 mx-1.5">·</span>
                        {shopCopy.sellWord} <bdi dir="ltr">{formatMoney(priceDef.sellPrice)}</bdi>
                      </div>
                      <div className="text-[11px] text-stone-400 mt-0.5 truncate">
                        {getLocalizedResourcePurposeHint(id)}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0">
                      <div
                        dir="ltr"
                        className="flex items-center gap-1 bg-[#0b0e15] border border-stone-700/80 rounded-lg p-1"
                      >
                        <button
                          type="button"
                          disabled={selectedQty <= 1}
                          onClick={() => adjustQty(id, -1, Math.max(packQty, stockQty, 1))}
                          aria-label={`- ${resLoc.name}`}
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
                          aria-label={`+ ${resLoc.name}`}
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
                          {t.common.max}
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
                        {formatTpl(shopCopy.shelfAddBtn, {
                          qty: packQty > 0 ? transferToShelfQty : 0,
                        })}
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
                        {formatTpl(shopCopy.takeBtn, {
                          qty: stockQty > 0 ? takeToPackQty : 0,
                        })}
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
                      {resLoc.name}
                    </div>
                    <div className="text-xs text-stone-300 mt-0.5 font-mono-tabular">
                      {shopCopy.packWord}{' '}
                      <bdi dir="ltr" className="text-stone-100 font-bold">
                        {packQty}
                      </bdi>
                      <span className="text-stone-600 mx-1.5">·</span>
                      {shopCopy.storedWord}{' '}
                      <bdi dir="ltr" className="text-sky-300 font-bold">
                        {storageQty}
                      </bdi>
                      <span className="text-stone-600 mx-1.5">·</span>
                      {shopCopy.shelfWord}{' '}
                      <bdi dir="ltr" className="text-amber-300 font-bold">
                        {stockQty}
                      </bdi>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0">
                    <div
                      dir="ltr"
                      className="flex items-center gap-1 bg-[#0b0e15] border border-stone-700/80 rounded-lg p-1"
                    >
                      <button
                        type="button"
                        disabled={selectedQty <= 1}
                        onClick={() =>
                          adjustQty(id, -1, Math.max(packQty, storageQty, stockQty, 1))
                        }
                        aria-label={`- ${resLoc.name}`}
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
                        onClick={() =>
                          adjustQty(id, 1, Math.max(packQty, storageQty, stockQty, 1))
                        }
                        aria-label={`+ ${resLoc.name}`}
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
                        {t.common.max}
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
                      {formatTpl(shopCopy.storeAddBtn, { qty: packQty > 0 ? storeQty : 0 })}
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
                      {formatTpl(shopCopy.takeBtn, { qty: storageQty > 0 ? retrieveQty : 0 })}
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
                      {formatTpl(shopCopy.shelfAddBtn, {
                        qty: storageQty > 0 ? toShelfQty : 0,
                      })}
                    </button>

                    {stockQty > 0 && (
                      <button
                        type="button"
                        onClick={() => onTransferStockToStorage(id, Math.min(selectedQty, stockQty))}
                        className="h-10 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 cursor-pointer"
                      >
                        {shopCopy.fromShelfBtn}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Footer */}
        <div
          className={`border-t border-stone-800 flex items-center justify-between gap-4 shrink-0 ${
            isCompactLandscape ? 'px-4 py-2' : 'px-4 py-3 sm:px-6'
          }`}
        >
          <span className="text-xs text-stone-400 font-mono-tabular truncate">
            {isTouchMode ? shopCopy.footerTouch : shopCopy.footerDesktop}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-sm transition-colors cursor-pointer shrink-0"
          >
            {shopCopy.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
}

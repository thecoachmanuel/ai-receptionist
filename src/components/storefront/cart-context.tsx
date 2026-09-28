"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

export interface CartItem {
  productId: string;
  productName: string;
  variantLabel: string;
  sku: string;
  imageUrl: string;
  unitPriceMinor: number;
  quantity: number;
}

export interface ShippingZoneOption {
  _id: string;
  name: string;
  rateMinor: number;
  estimatedDeliveryDays: string;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  removeItem: (productId: string, variantLabel: string) => void;
  updateQuantity: (productId: string, variantLabel: string, qty: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotalMinor: number;
  selectedShippingZone: ShippingZoneOption | null;
  setSelectedShippingZone: (zone: ShippingZoneOption | null) => void;
  shippingFeeMinor: number;
  totalMinor: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  siteSlug,
  children,
}: {
  siteSlug: string;
  children: ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedShippingZone, setSelectedShippingZone] =
    useState<ShippingZoneOption | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const storageKey = `ar_cart_${siteSlug}`;

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch {
      // Ignore localStorage errors
    } finally {
      setHydrated(true);
    }
  }, [storageKey]);

  // Persist to localStorage
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // Ignore quota errors
    }
  }, [items, hydrated, storageKey]);

  const addItem = useCallback(
    (newItem: Omit<CartItem, "quantity">, qty = 1) => {
      setItems((prev) => {
        const index = prev.findIndex(
          (i) =>
            i.productId === newItem.productId &&
            i.variantLabel === newItem.variantLabel,
        );
        if (index > -1) {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            quantity: updated[index].quantity + qty,
          };
          return updated;
        }
        return [...prev, { ...newItem, quantity: qty }];
      });
      setIsCartOpen(true);
    },
    [],
  );

  const removeItem = useCallback(
    (productId: string, variantLabel: string) => {
      setItems((prev) =>
        prev.filter(
          (i) =>
            !(i.productId === productId && i.variantLabel === variantLabel),
        ),
      );
    },
    [],
  );

  const updateQuantity = useCallback(
    (productId: string, variantLabel: string, qty: number) => {
      if (qty <= 0) {
        removeItem(productId, variantLabel);
        return;
      }
      setItems((prev) =>
        prev.map((i) =>
          i.productId === productId && i.variantLabel === variantLabel
            ? { ...i, quantity: qty }
            : i,
        ),
      );
    },
    [removeItem],
  );

  const clearCart = useCallback(() => {
    setItems([]);
    setSelectedShippingZone(null);
  }, []);

  const itemCount = useMemo(
    () => items.reduce((acc, i) => acc + i.quantity, 0),
    [items],
  );

  const subtotalMinor = useMemo(
    () => items.reduce((acc, i) => acc + i.unitPriceMinor * i.quantity, 0),
    [items],
  );

  const shippingFeeMinor = selectedShippingZone?.rateMinor ?? 0;
  const totalMinor = subtotalMinor + shippingFeeMinor;

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      itemCount,
      subtotalMinor,
      selectedShippingZone,
      setSelectedShippingZone,
      shippingFeeMinor,
      totalMinor,
      isCartOpen,
      setIsCartOpen,
      openCart,
      closeCart,
    }),
    [
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      itemCount,
      subtotalMinor,
      selectedShippingZone,
      shippingFeeMinor,
      totalMinor,
      isCartOpen,
      openCart,
      closeCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

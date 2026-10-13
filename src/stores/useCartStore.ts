import { create } from "zustand";

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface CartState {
  items: CartItem[];
  selectedTable: string | null;
  selectedTableName: string | null;
  existingOrderId: string | null;
  orderType: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  paymentMethod: "CASH" | "CARD" | null;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  discount: number;
  taxRate: number;

  // Actions
  addItem: (item: Omit<CartItem, "id" | "quantity">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateNotes: (id: string, notes: string) => void;
  setTable: (tableId: string | null, tableName: string | null) => void;
  setExistingOrderId: (orderId: string | null) => void;
  setOrderType: (type: "DINE_IN" | "TAKEAWAY" | "DELIVERY") => void;
  setPaymentMethod: (method: "CASH" | "CARD" | null) => void;
  setCustomerDetails: (name: string, phone: string, address: string) => void;
  setDiscount: (discount: number) => void;
  clearCart: () => void;

  // Computed
  getSubtotal: () => number;
  getTax: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  selectedTable: null,
  selectedTableName: null,
  existingOrderId: null,
  orderType: "DINE_IN",
  paymentMethod: null,
  customerName: "",
  customerPhone: "",
  customerAddress: "",
  discount: 0,
  taxRate: 0.16, // Default 16% GST

  addItem: (item) => {
    const { items } = get();
    const existing = items.find((i) => i.menuItemId === item.menuItemId);
    if (existing) {
      set({
        items: items.map((i) =>
          i.menuItemId === item.menuItemId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        ),
      });
    } else {
      set({
        items: [
          ...items,
          { ...item, id: crypto.randomUUID(), quantity: 1 },
        ],
      });
    }
  },

  removeItem: (id) => {
    set({ items: get().items.filter((i) => i.id !== id) });
  },

  updateQuantity: (id, quantity) => {
    if (quantity <= 0) {
      get().removeItem(id);
      return;
    }
    set({
      items: get().items.map((i) => (i.id === id ? { ...i, quantity } : i)),
    });
  },

  updateNotes: (id, notes) => {
    set({
      items: get().items.map((i) => (i.id === id ? { ...i, notes } : i)),
    });
  },

  setTable: (tableId, tableName) =>
    set({ selectedTable: tableId, selectedTableName: tableName }),

  setExistingOrderId: (orderId) => set({ existingOrderId: orderId }),

  setOrderType: (orderType) => set({ orderType }),

  setPaymentMethod: (method) => set({ paymentMethod: method }),

  setCustomerDetails: (name, phone, address) => 
    set({ customerName: name, customerPhone: phone, customerAddress: address }),

  setDiscount: (discount) => set({ discount }),

  clearCart: () =>
    set({
      items: [],
      selectedTable: null,
      selectedTableName: null,
      existingOrderId: null,
      paymentMethod: null,
      customerName: "",
      customerPhone: "",
      customerAddress: "",
      discount: 0,
      orderType: "DINE_IN",
    }),

  getSubtotal: () => get().items.reduce((t, i) => t + i.price * i.quantity, 0),

  getTax: () => {
    const subtotal = get().getSubtotal();
    const discount = get().discount;
    const rate = get().paymentMethod === "CARD" ? 0.05 : 0.16; // 5% for card, 16% default/cash
    return (subtotal - discount) * rate;
  },

  getTotal: () => {
    const subtotal = get().getSubtotal();
    const discount = get().discount;
    const tax = get().getTax();
    return subtotal - discount + tax;
  },

  getItemCount: () => get().items.reduce((t, i) => t + i.quantity, 0),
}));

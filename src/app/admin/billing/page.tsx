"use client";

import { useState, useEffect } from "react";
import { 
  Receipt, 
  Table as TableIcon, 
  User, 
  Clock, 
  Search, 
  CreditCard, 
  Banknote, 
  Printer, 
  Trash2,
  ChevronRight,
  Utensils,
  Tag
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

export default function BillingPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD">("CASH");

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/pos/orders");
      if (res.ok) {
        const json = await res.json();
        setOrders(json.activeOrders || []);
      }
    } catch (error) {
      console.error("Failed to fetch running orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const handleSettle = async () => {
    if (!selectedOrder) return;

    try {
      const res = await fetch("/api/pos/orders/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          orderId: selectedOrder.id, 
          paymentMethod, 
          amountPaid: calculateTotal()
        })
      });

      if (res.ok) {
        handlePrint();
        setSelectedOrder(null);
        fetchOrders();
        alert("Bill Settled Successfully!");
      }
    } catch (error) {
      alert("Settlement failed");
    }
  };

  const handlePrint = () => {
    if (!selectedOrder) return;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      const receiptHtml = `
        <html>
          <head>
            <title>Receipt - ${selectedOrder.orderNumber}</title>
            <style>
              body { font-family: monospace; width: 80mm; margin: 0; padding: 10px; color: black; background: white; }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .line { border-bottom: 1px dashed black; margin: 10px 0; }
              table { width: 100%; border-collapse: collapse; }
              th, td { text-align: left; padding: 2px 0; font-size: 12px; }
              .right { text-align: right; }
              @media print { body { width: 100%; margin: 0; } }
            </style>
          </head>
          <body>
            <div class="center bold" style="font-size: 18px;">RestroERP</div>
            <div class="center" style="font-size: 12px;">Powered by Lincoz Tech</div>
            <div class="line"></div>
            <div style="font-size: 12px;">Order: ${selectedOrder.orderNumber}</div>
            <div style="font-size: 12px;">Table: ${selectedOrder.table?.name || "N/A"}</div>
            <div style="font-size: 12px;">Server: ${selectedOrder.user?.name || "N/A"}</div>
            <div class="line"></div>
            <table>
              ${selectedOrder.items.map((i: any) => `
                <tr>
                  <td>${i.quantity}x ${i.menuItem.name}</td>
                  <td class="right">${formatCurrency(i.price * i.quantity)}</td>
                </tr>
              `).join('')}
            </table>
            <div class="line"></div>
            <table>
              <tr><td class="bold">Subtotal</td><td class="right bold">${formatCurrency(selectedOrder.total - selectedOrder.tax)}</td></tr>
              <tr><td>Tax</td><td class="right">${formatCurrency(selectedOrder.tax)}</td></tr>
              ${discount > 0 ? `<tr><td>Discount</td><td class="right">-${formatCurrency(discount)}</td></tr>` : ""}
              <tr><td class="bold" style="font-size: 14px;">Total</td><td class="right bold" style="font-size: 14px;">${formatCurrency(calculateTotal())}</td></tr>
            </table>
            <div class="line"></div>
            <div class="center" style="font-size: 12px;">Thank you for dining with us!</div>
          </body>
        </html>
      `;
      printWindow.document.write(receiptHtml);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const calculateTotal = () => {
    if (!selectedOrder) return 0;
    return selectedOrder.total - discount;
  };

  const filteredOrders = orders.filter(o => 
    o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.table?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-64px)] flex bg-surface-2 overflow-hidden">
      {/* LEFT: Running Orders List */}
      <div className="w-80 border-r border-border bg-surface flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Clock className="text-primary" size={20} /> Running Orders
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input 
              type="text" 
              placeholder="Table or Order #" 
              className="input pl-9 bg-surface-2 h-10 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-muted text-sm italic">No running orders</div>
          ) : (
            filteredOrders.map(order => (
              <button
                key={order.id}
                onClick={() => {
                  setSelectedOrder(order);
                  setDiscount(0);
                }}
                className={cn(
                  "w-full p-4 border-b border-border flex items-center justify-between transition-colors text-left",
                  selectedOrder?.id === order.id ? "bg-primary/5 border-r-4 border-r-primary" : "hover:bg-surface-2"
                )}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-primary">{order.table?.name || "T-N/A"}</span>
                    <span className="text-[10px] bg-surface-3 px-1.5 py-0.5 rounded font-bold uppercase">{order.status}</span>
                  </div>
                  <p className="text-xs font-semibold text-muted">{order.orderNumber} • {order.items.length} Items</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{formatCurrency(order.total)}</p>
                  <p className="text-[10px] text-muted" suppressHydrationWarning>
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* CENTER: Selected Order Bill */}
      <div className="flex-1 flex flex-col bg-background">
        {selectedOrder ? (
          <>
            <div className="p-6 border-b border-border bg-surface flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <TableIcon size={24} />
                </div>
                <div>
                  <h1 className="font-black text-2xl tracking-tight">Table {selectedOrder.table?.name || "N/A"}</h1>
                  <p className="text-sm text-muted font-medium flex items-center gap-2">
                    <User size={14} /> Server: {selectedOrder.user?.name || "Unknown"} • {selectedOrder.orderNumber}
                  </p>
                </div>
              </div>
              <button onClick={handlePrint} className="btn border border-border bg-surface hover:bg-surface-2 gap-2 text-sm font-bold">
                <Printer size={18} /> Print KOT
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-bold text-muted uppercase tracking-widest border-b border-border pb-4">
                    <th className="pb-4">Description</th>
                    <th className="pb-4 text-center">Qty</th>
                    <th className="pb-4 text-right">Price</th>
                    <th className="pb-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selectedOrder.items.map((item: any) => (
                    <tr key={item.id} className="group">
                      <td className="py-4">
                        <p className="font-bold text-foreground">{item.menuItem.name}</p>
                        {item.notes && <p className="text-xs text-muted italic">Note: {item.notes}</p>}
                      </td>
                      <td className="py-4 text-center font-bold text-muted">{item.quantity}</td>
                      <td className="py-4 text-right font-medium text-muted">{formatCurrency(item.price)}</td>
                      <td className="py-4 text-right font-bold text-foreground">{formatCurrency(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted opacity-40">
            <Receipt size={80} className="mb-4" />
            <p className="text-xl font-bold">Select an order to start billing</p>
          </div>
        )}
      </div>

      {/* RIGHT: Billing Panel */}
      <div className="w-96 border-l border-border bg-surface flex flex-col">
        {selectedOrder ? (
          <>
            <div className="p-6 flex-1 flex flex-col">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                <Tag className="text-primary" size={20} /> Summary
              </h3>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-muted font-medium">
                  <span>Subtotal</span>
                  <span>{formatCurrency(selectedOrder.total - selectedOrder.tax)}</span>
                </div>
                <div className="flex justify-between text-muted font-medium">
                  <span>Tax (Included)</span>
                  <span>{formatCurrency(selectedOrder.tax)}</span>
                </div>
                
                <div className="pt-4 border-t border-border">
                  <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Discount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-bold">$</span>
                    <input 
                      type="number" 
                      className="input bg-surface-2 border-border pl-8 font-bold"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-auto p-4 rounded-2xl bg-primary/5 border border-primary/10">
                <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Amount to Pay</p>
                <p className="text-4xl font-black text-primary tracking-tighter">
                  {formatCurrency(calculateTotal())}
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-border bg-surface-2 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setPaymentMethod("CASH")}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                    paymentMethod === "CASH" ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-muted"
                  )}
                >
                  <Banknote size={24} />
                  <span className="font-bold text-xs uppercase">Cash</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod("CARD")}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                    paymentMethod === "CARD" ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-muted"
                  )}
                >
                  <CreditCard size={24} />
                  <span className="font-bold text-xs uppercase">Card</span>
                </button>
              </div>

              <button 
                onClick={handleSettle}
                className="btn btn-primary w-full py-4 text-base font-black shadow-xl shadow-primary/30 flex items-center justify-center gap-3"
              >
                <Receipt size={20} /> SETTLE & PRINT
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-muted opacity-20">
            <CreditCard size={48} />
          </div>
        )}
      </div>
    </div>
  );
}

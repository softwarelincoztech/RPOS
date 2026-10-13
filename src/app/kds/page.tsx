"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  ChefHat, 
  CheckCircle2, 
  Clock, 
  Utensils,
  RefreshCw,
  Printer
} from "lucide-react";
import { cn, getTimeElapsed } from "@/lib/utils";

export default function KDSPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/kds");
      if (res.ok) {
        const json = await res.json();
        setOrders(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch KDS orders:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update timers every minute and fetch orders every 15 seconds
  useEffect(() => {
    fetchOrders();
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 60000);
    const dataTimer = setInterval(() => fetchOrders(), 15000); // 15 seconds polling for KDS
    return () => {
      clearInterval(clockTimer);
      clearInterval(dataTimer);
    };
  }, [fetchOrders]);

  const handleStatusChange = async (orderId: string, newStatus: "PREPARING" | "READY") => {
    // Optimistic UI Update
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));

    try {
      await fetch("/api/kds", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus })
      });
      // Optionally fetch again to ensure sync
      fetchOrders();
    } catch (error) {
      console.error("Failed to update status", error);
      alert("Failed to update order status. Please check your connection.");
      fetchOrders(); // Revert on failure
    }
  };

  // Group orders by status
  const pendingOrders = orders.filter(o => o.status === "PENDING").sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const preparingOrders = orders.filter(o => o.status === "PREPARING").sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  // We only fetch PENDING and PREPARING in the API, but let's show READY if they happen to exist in local state briefly before refresh
  const readyOrders = orders.filter(o => o.status === "READY").sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-background"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="h-screen w-full bg-background flex flex-col overflow-hidden">
      {/* KDS Header */}
      <header className="h-16 px-6 border-b border-border bg-surface shadow-sm z-10 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <ChefHat size={24} />
          </div>
          <div>
            <h1 className="font-bold text-xl text-foreground tracking-tight">Kitchen Display</h1>
            <p className="text-xs text-muted font-semibold">Live Order Queue</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="text-sm font-semibold">{pendingOrders.length} New</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-warning"></span>
              <span className="text-sm font-semibold">{preparingOrders.length} Cooking</span>
            </div>
          </div>
          
          <button 
            onClick={fetchOrders}
            className="btn bg-surface-2 hover:bg-surface-3 p-2 rounded-lg text-muted transition-colors"
            title="Refresh Orders"
          >
            <RefreshCw size={18} />
          </button>
          
          <div className="h-8 w-px bg-border"></div>
          
          <div className="text-right">
            <p className="font-bold text-lg leading-none" suppressHydrationWarning>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            <p className="text-xs text-muted" suppressHydrationWarning>{currentTime.toLocaleDateString()}</p>
          </div>
        </div>
      </header>

      {/* KDS Columns - Now 2 columns since Ready orders disappear automatically */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-x divide-border bg-surface-2">
        
        {/* NEW ORDERS COLUMN */}
        <div className="flex flex-col h-full bg-surface-2/50">
          <div className="p-3 border-b border-border flex justify-between items-center bg-blue-500/10 border-t-4 border-t-blue-500">
            <h2 className="font-bold text-blue-500 flex items-center gap-2">
              <Utensils size={18} /> New Orders
            </h2>
            <span className="badge border-blue-500 text-blue-500">{pendingOrders.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {pendingOrders.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                type="NEW" 
                onAction={() => handleStatusChange(order.id, "PREPARING")} 
              />
            ))}
            {pendingOrders.length === 0 && <EmptyState text="No new orders" />}
          </div>
        </div>

        {/* PREPARING COLUMN */}
        <div className="flex flex-col h-full bg-surface-2/50">
          <div className="p-3 border-b border-border flex justify-between items-center bg-warning-muted/20 border-t-4 border-t-warning">
            <h2 className="font-bold text-warning flex items-center gap-2">
              <RefreshCw size={18} className="animate-spin-slow" /> Preparing
            </h2>
            <span className="badge border-warning text-warning">{preparingOrders.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {preparingOrders.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                type="COOKING" 
                onAction={() => handleStatusChange(order.id, "READY")} 
              />
            ))}
            {preparingOrders.length === 0 && <EmptyState text="No orders preparing" />}
          </div>
        </div>

      </div>
    </div>
  );
}

function OrderCard({ order, type, onAction }: { order: any, type: "NEW" | "COOKING" | "READY", onAction?: () => void }) {
  const elapsed = getTimeElapsed(order.createdAt);
  const isLate = type !== "READY" && elapsed.includes("h") || parseInt(elapsed) > 20;

  return (
    <div className={cn(
      "bg-surface rounded-xl border shadow-sm flex flex-col animate-slide-left",
      type === "NEW" ? "border-blue-500/30 kds-new" : 
      type === "COOKING" ? "border-warning/30 kds-cooking" : 
      "border-success/30 kds-ready",
      isLate && "bg-danger-muted/10 border-danger/50"
    )}>
      <div className="p-3 border-b border-border flex justify-between items-start bg-surface-2/50 rounded-t-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-foreground text-lg">{order.orderNumber}</span>
            <div className="flex gap-2">
              {order.table?.name && (
                <span className="badge bg-surface-3 border-border text-foreground">Table {order.table.name}</span>
              )}
              {order.orderType === "TAKEAWAY" && (
                <span className="badge bg-accent-muted text-accent border-accent/20">Takeaway</span>
              )}
              <button 
                className="p-1 hover:bg-surface rounded text-muted hover:text-foreground"
                title="Print KOT"
                onClick={() => {
                  const printWindow = window.open("", "_blank");
                  if (printWindow) {
                    const kotHtml = `
                      <html>
                        <head>
                          <title>KOT - ${order.orderNumber}</title>
                          <style>
                            body { font-family: monospace; width: 80mm; margin: 0; padding: 10px; color: black; background: white; }
                            .center { text-align: center; }
                            .bold { font-weight: bold; }
                            .large { font-size: 20px; }
                            .line { border-bottom: 2px dashed black; margin: 10px 0; }
                            table { width: 100%; border-collapse: collapse; }
                            th, td { text-align: left; padding: 4px 0; font-size: 14px; }
                            .notes { font-size: 12px; font-style: italic; display: block; margin-left: 10px; }
                            @media print { body { width: 100%; margin: 0; } }
                          </style>
                        </head>
                        <body>
                          <div class="center bold large">KOT</div>
                          <div class="center">${new Date().toLocaleTimeString()}</div>
                          <div class="line"></div>
                          <div class="bold" style="font-size: 16px;">Order: ${order.orderNumber}</div>
                          <div class="bold" style="font-size: 16px;">Type: ${order.orderType} ${order.table ? `(Table ${order.table.name})` : ""}</div>
                          <div class="line"></div>
                          <table>
                            ${order.items.map((i: any) => `
                              <tr>
                                <td class="bold">${i.quantity}x ${i.menuItem.name}</td>
                              </tr>
                              ${i.notes ? `<tr><td><span class="notes">- ${i.notes}</span></td></tr>` : ''}
                            `).join('')}
                          </table>
                          <div class="line"></div>
                          <div class="center">End of Ticket</div>
                        </body>
                      </html>
                    `;
                    printWindow.document.write(kotHtml);
                    printWindow.document.close();
                    setTimeout(() => {
                      printWindow.print();
                      printWindow.close();
                    }, 250);
                  }
                }}
              >
                <Printer size={16} />
              </button>
            </div>
          </div>
          <div className="text-xs text-muted flex items-center gap-1">
            <ChefHat size={12} /> {order.user?.name || "Server"} • <span suppressHydrationWarning>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
        <div className={cn(
          "flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-md",
          isLate ? "bg-danger text-white animate-pulse" : "bg-surface-3 text-muted"
        )}>
          <Clock size={14} /> {elapsed}
        </div>
      </div>
      
      <div className="p-3 flex-1 flex flex-col gap-2">
        {order.items.map((item: any, idx: number) => (
          <div key={idx} className="flex justify-between items-start py-2 border-b border-border/50 last:border-0 border-dashed">
            <div className="flex gap-2">
              <span className="font-bold text-primary">{item.quantity}x</span>
              <div>
                <p className="font-semibold text-foreground">{item.menuItem?.name || "Unknown Item"}</p>
                {item.notes && <p className="text-xs text-warning mt-1 italic">Note: {item.notes}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {onAction && (
        <div className="p-2 border-t border-border mt-auto">
          <button 
            onClick={onAction}
            className={cn(
              "w-full py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2",
              type === "NEW" 
                ? "bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/20" 
                : "bg-warning text-black hover:bg-yellow-400 shadow-lg shadow-warning/20"
            )}
          >
            {type === "NEW" ? "Start Cooking" : "Mark as Ready"}
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="h-32 flex flex-col items-center justify-center text-muted border-2 border-dashed border-border rounded-xl opacity-50">
      <Utensils size={32} className="mb-2 opacity-50" />
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}

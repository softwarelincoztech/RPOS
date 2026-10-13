"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  ShoppingCart, 
  CreditCard, 
  Banknote,
  UtensilsCrossed,
  LayoutGrid,
  ChevronLeft,
  Trash2,
  Plus,
  Minus,
  Package,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { cn, formatCurrency, stripEmojis } from "@/lib/utils";
import { useCartStore } from "@/stores/useCartStore";

export default function POSPage() {
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"TABLES" | "MENU" | "ACTIVE_BILLS">("TABLES");
  const [isCartOpen, setIsCartOpen] = useState(false); // Mobile cart toggle
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  // Database States
  const [tables, setTables] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { 
    items: cartItems, 
    selectedTable, 
    selectedTableName, 
    orderType,
    addItem, 
    removeItem, 
    updateQuantity,
    setTable,
    setOrderType,
    getSubtotal,
    getTax,
    getTotal,
    clearCart,
    existingOrderId,
    setExistingOrderId,
    paymentMethod,
    setPaymentMethod,
    customerName,
    customerPhone,
    customerAddress,
    setCustomerDetails
  } = useCartStore();

  const fetchInitData = async () => {
    try {
      const res = await fetch("/api/pos/init");
      if (res.ok) {
        const json = await res.json();
        setTables(json.data.tables);
        setCategories(json.data.categories);
        setMenuItems(json.data.menuItems);
      }
      
      const ordersRes = await fetch("/api/pos/orders");
      if (ordersRes.ok) {
        const ordersJson = await ordersRes.json();
        console.log("Fetched active orders:", ordersJson.activeOrders?.length || 0);
        setActiveOrders(ordersJson.activeOrders || []);
      }
    } catch (error) {
      console.error("Failed to fetch POS data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitData();
    const interval = setInterval(fetchInitData, 15000); // Auto refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = activeCategory === "ALL" || item.categoryId === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleTableSelect = async (tableId: string, tableName: string, status: string) => {
    if (status === "OCCUPIED") {
      try {
        const res = await fetch(`/api/pos/orders?tableId=${tableId}`);
        const data = await res.json();
        if (data.success && data.activeOrder) {
          clearCart();
          setTable(tableId, tableName);
          setOrderType("DINE_IN");
          setExistingOrderId(data.activeOrder.id);
          
          data.activeOrder.items.forEach((item: any) => {
            addItem({
              menuItemId: item.menuItemId,
              name: item.menuItem.name,
              price: item.price,
              notes: item.notes
            });
            const stateItems = useCartStore.getState().items;
            useCartStore.getState().updateQuantity(stateItems[stateItems.length - 1].id, item.quantity);
          });
          
          setView("MENU");
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }
    
    setTable(tableId, tableName);
    setOrderType("DINE_IN");
    setExistingOrderId(null);
    clearCart();
    setView("MENU");
  };

  const handleTakeaway = () => {
    setTable(null, null);
    setOrderType("TAKEAWAY");
    setView("MENU");
  };

  const handleDelivery = () => {
    setTable(null, null);
    setOrderType("DELIVERY");
    setShowDeliveryModal(true);
    setView("MENU");
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    setSubmitting(true);

    try {
      const checkoutItems = cartItems.map(item => ({
        id: item.menuItemId,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes || ""
      }));

      // Attach delivery details to the first item if applicable
      if (orderType === "DELIVERY" && customerName && checkoutItems.length > 0) {
        checkoutItems[0].notes = `${checkoutItems[0].notes ? checkoutItems[0].notes + " | " : ""}Delivery To: ${customerName} (${customerPhone}) - Address: ${customerAddress}`;
      }

      const res = await fetch("/api/pos/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: selectedTable,
          orderType,
          items: checkoutItems,
          subtotal: getSubtotal(),
          tax: getTax(),
          total: getTotal(),
          existingOrderId
        })
      });

      if (res.ok) {
        alert("Order processed successfully!");
        clearCart();
        setExistingOrderId(null);
        setShowDeliveryModal(false);
        setCustomerDetails("", "", "");
        fetchInitData(); // Refresh tables and active orders
        setView("TABLES");
        setIsCartOpen(false);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to place order");
      }
    } catch (error) {
      alert("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-background"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;
  }

  // Group tables by floor
  const floors = Array.from(new Set(tables.map(t => t.floor)));

  return (
    <div className="h-screen w-full bg-background flex overflow-hidden relative">
      {/* Left Area - Tables or Menu */}
      <div className="flex-1 flex flex-col h-full bg-surface-2 lg:border-r border-border w-full">
        {/* Header */}
        <header className="h-16 px-4 lg:px-6 border-b border-border flex items-center justify-between bg-surface shadow-sm z-10">
          <div className="flex items-center gap-2 lg:gap-4">
            {view === "MENU" && selectedTable ? (
              <button 
                onClick={() => setView("TABLES")}
                className="btn btn-ghost !p-2"
              >
                <ChevronLeft size={20} />
              </button>
            ) : null}
            <div className="flex items-center gap-2 text-primary">
              <UtensilsCrossed size={24} />
              <h1 className="font-bold text-lg lg:text-xl text-foreground tracking-tight hidden sm:block">RestroPOS</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 lg:gap-2 bg-surface-3 p-1 rounded-lg">
              <button 
                className={cn("px-3 lg:px-4 py-1.5 text-xs lg:text-sm font-semibold rounded-md transition-colors", view === "TABLES" ? "bg-primary text-white" : "text-muted hover:text-foreground")}
                onClick={() => setView("TABLES")}
              >
                Tables
              </button>
              <button 
                className={cn("px-3 lg:px-4 py-1.5 text-xs lg:text-sm font-semibold rounded-md transition-colors relative", view === "ACTIVE_BILLS" ? "bg-primary text-white" : "text-muted hover:text-foreground")}
                onClick={() => setView("ACTIVE_BILLS")}
              >
                Active Bills
                {activeOrders.length > 0 && (
                  <span className="absolute -top-2 -right-1 w-4 h-4 bg-danger text-[10px] text-white flex items-center justify-center rounded-full animate-pulse border border-background">
                    {activeOrders.length}
                  </span>
                )}
              </button>
              <button 
                className={cn("px-3 lg:px-4 py-1.5 text-xs lg:text-sm font-semibold rounded-md transition-colors", view === "MENU" ? "bg-primary text-white" : "text-muted hover:text-foreground")}
                onClick={() => setView("MENU")}
              >
                Menu
              </button>
            </div>
            
            {/* Mobile Cart Button */}
            <button 
              className="lg:hidden relative p-2 ml-2 bg-primary text-white rounded-lg shadow-md"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingCart size={20} />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-danger text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-surface">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </header>

        {view === "TABLES" ? (
           /* Table Selection View */
           <div className="flex-1 overflow-y-auto p-4 lg:p-6">
             <div className="flex items-center justify-between mb-6">
               <h2 className="text-lg lg:text-xl font-bold">Select Table</h2>
               <div className="flex gap-2">
                 <button 
                   onClick={handleTakeaway}
                   className="btn btn-secondary text-xs lg:text-sm border border-border"
                 >
                   <Package className="w-4 h-4 mr-1 lg:mr-2 hidden sm:block" /> Takeaway
                 </button>
                 <button 
                   onClick={handleDelivery}
                   className="btn btn-primary text-xs lg:text-sm"
                 >
                   Delivery
                 </button>
               </div>
             </div>
             
             {floors.map(floor => (
               <div key={floor} className="mb-8">
                 <h3 className="text-xs lg:text-sm font-semibold text-muted uppercase tracking-wider mb-4">{floor} Floor</h3>
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 lg:gap-4">
                   {tables.filter(t => t.floor === floor).map(table => (
                     <button
                       key={table.id}
                       onClick={() => handleTableSelect(table.id, table.name, table.status)}
                       className={cn(
                         "relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center p-2 lg:p-4 transition-all hover:scale-105 active:scale-95",
                         table.status === "AVAILABLE" && "border-success-muted bg-success-muted/20 text-success hover:border-success",
                         table.status === "OCCUPIED" && "border-warning-muted bg-warning-muted/20 text-warning opacity-70",
                         table.status === "RESERVED" && "border-info-muted bg-info-muted/20 text-info opacity-70"
                       )}
                     >
                       <span className="text-xl lg:text-2xl font-bold mb-1">{table.name}</span>
                       <span className="text-[10px] lg:text-xs font-semibold uppercase">{table.status}</span>
                       <div className="absolute top-2 right-2 text-[10px] bg-background/80 px-1.5 py-0.5 rounded-full font-medium">
                         {table.capacity}p
                       </div>
                     </button>
                   ))}
                 </div>
               </div>
             ))}
           </div>
          ) : view === "ACTIVE_BILLS" ? (
            /* Active Bills View */
            <div className="flex-1 overflow-y-auto p-4 lg:p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg lg:text-xl font-bold">Active Bills & Orders</h2>
                <button onClick={fetchInitData} className="btn border border-border bg-surface hover:bg-surface-2 text-xs font-bold gap-2">
                  <RefreshCw size={14} className={cn(loading && "animate-spin")} /> Refresh
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeOrders.map(order => (
                  <div key={order.id} className="glass-card p-4 rounded-xl border border-border flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-lg text-primary">{order.orderNumber}</span>
                        <span className="badge bg-surface-3">{order.orderType}</span>
                      </div>
                      <p className="text-sm font-semibold mb-1">
                        {order.table?.name ? `Table: ${order.table.name}` : order.orderType === "DELIVERY" ? "Delivery Order" : "Takeaway"}
                      </p>
                      <p className="text-xs text-muted mb-4">{order.items.length} items • {formatCurrency(order.total)}</p>
                    </div>
                    
                    <div className="flex gap-2 mt-2">
                      <button 
                        onClick={() => {
                          clearCart();
                          order.items.forEach((item: any) => {
                            addItem({
                              menuItemId: item.menuItemId,
                              name: item.menuItem.name,
                              price: item.price,
                              notes: item.notes || ""
                            });
                          });
                          setExistingOrderId(order.id);
                          setTable(order.tableId, order.table?.name || null);
                          setOrderType(order.orderType);
                          setView("MENU");
                        }}
                        className="btn border border-border bg-surface hover:bg-surface-2 flex-1 py-2 text-xs font-bold"
                      >
                        Edit Items
                      </button>
                      <button 
                        onClick={async () => {
                          try {
                            const res = await fetch("/api/pos/orders/settle", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ orderId: order.id, paymentMethod: "CASH", amountPaid: order.total })
                            });
                            if(res.ok) {
                              // Print handled in Billing screen now, but keeping simple print here too
                              const printWindow = window.open("", "_blank");
                              if (printWindow) {
                                const receiptHtml = `
                                  <html>
                                    <head>
                                      <title>Receipt</title>
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
                                      <div style="font-size: 12px;">Order: ${order.orderNumber}</div>
                                      <div style="font-size: 12px;">Type: ${order.orderType} ${order.table ? `(Table ${order.table.name})` : ""}</div>
                                      <div class="line"></div>
                                      <table>
                                        ${order.items.map((i: any) => `
                                          <tr>
                                            <td>${i.quantity}x ${i.menuItem.name}</td>
                                            <td class="right">${i.price * i.quantity}</td>
                                          </tr>
                                        `).join('')}
                                      </table>
                                      <div class="line"></div>
                                      <table>
                                        <tr><td class="bold">Subtotal</td><td class="right bold">${order.total - order.tax}</td></tr>
                                        <tr><td>Tax</td><td class="right">${order.tax}</td></tr>
                                        <tr><td class="bold" style="font-size: 14px;">Total</td><td class="right bold" style="font-size: 14px;">${order.total}</td></tr>
                                      </table>
                                      <div class="line"></div>
                                      <div class="center" style="font-size: 12px;">Thank you for your visit!</div>
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
                              fetchInitData();
                            }
                          } catch(e) {}
                        }}
                        className="btn btn-success flex-1 py-2 text-xs shadow-md"
                      >
                        Settle
                      </button>
                    </div>
                  </div>
                ))}
                {activeOrders.length === 0 && (
                  <p className="text-muted col-span-full">No active bills found.</p>
                )}
              </div>
            </div>
          ) : (
           /* Menu View */
           <div className="flex-1 flex flex-col overflow-hidden">
             {/* Categories & Search */}
             <div className="p-3 lg:p-4 border-b border-border bg-surface-2 flex flex-col gap-3 lg:gap-4 flex-shrink-0">
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                 <input 
                   type="text" 
                   placeholder="Search menu items..." 
                   className="input pl-10 bg-surface-3 border-none h-10 lg:h-12 text-sm lg:text-base w-full"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                 />
               </div>
               
               <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide flex-nowrap w-full">
                 <button
                   onClick={() => setActiveCategory("ALL")}
                   className={cn(
                     "whitespace-nowrap px-3 lg:px-4 py-1.5 lg:py-2 rounded-xl font-medium transition-all duration-200 text-xs lg:text-sm flex-shrink-0",
                     activeCategory === "ALL" 
                       ? "bg-primary text-white shadow-lg shadow-primary/25" 
                       : "bg-surface-3 text-muted hover:bg-surface hover:text-foreground"
                   )}
                 >
                   <LayoutGrid className="w-3 h-3 lg:w-4 lg:h-4 inline-block mr-1 lg:mr-2" /> All
                 </button>
                 {categories.map(category => (
                   <button
                     key={category.id}
                     onClick={() => setActiveCategory(category.id)}
                     className={cn(
                       "whitespace-nowrap px-3 lg:px-4 py-1.5 lg:py-2 rounded-xl font-medium transition-all duration-200 text-xs lg:text-sm flex-shrink-0",
                       activeCategory === category.id 
                         ? "bg-primary text-white shadow-lg shadow-primary/25" 
                         : "bg-surface-3 text-muted hover:bg-surface hover:text-foreground"
                     )}
                   >
                     {stripEmojis(category.name)}
                   </button>
                 ))}
               </div>
             </div>
 
             {/* Menu Grid */}
             <div className="flex-1 overflow-y-auto p-3 lg:p-4 bg-surface-3/30">
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4 pb-24 lg:pb-20">
                 {filteredItems.map(item => (
                   <button
                     key={item.id}
                     onClick={() => addItem({ menuItemId: item.id, name: item.name, price: item.price })}
                     disabled={!item.isAvailable}
                     className={cn(
                       "flex flex-col text-left p-3 lg:p-4 rounded-2xl glass-card transition-all duration-200 active:scale-95 group",
                       !item.isAvailable && "opacity-50 cursor-not-allowed"
                     )}
                   >
                     <div className="w-full aspect-video bg-surface-3 rounded-lg mb-2 lg:mb-3 flex items-center justify-center overflow-hidden flex-shrink-0">
                       <UtensilsCrossed className="text-muted/30 w-8 h-8 lg:w-12 lg:h-12" />
                     </div>
                     <div className="flex-1">
                       <h3 className="font-bold text-foreground text-sm lg:text-base mb-1 line-clamp-1 group-hover:text-primary transition-colors">{item.name}</h3>
                       <p className="text-[10px] lg:text-xs text-muted line-clamp-2 mb-2 lg:mb-3 h-7 lg:h-8">{item.description}</p>
                     </div>
                     <div className="flex items-center justify-between w-full mt-auto">
                       <span className="font-bold text-base lg:text-lg text-primary">{formatCurrency(item.price)}</span>
                       {!item.isAvailable && <span className="text-[10px] text-danger font-semibold uppercase">Out</span>}
                     </div>
                   </button>
                 ))}
                 
                 {filteredItems.length === 0 && (
                   <div className="col-span-full py-12 text-center text-muted">
                     <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                     <p>No menu items found in this category.</p>
                   </div>
                 )}
               </div>
             </div>
           </div>
         )}
      </div>

      {/* Mobile Cart Overlay Backdrop */}
      {isCartOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsCartOpen(false)}
        />
      )}

      {/* Right Area - Cart / Order Panel */}
      <div className={cn(
        "fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] lg:static lg:w-[400px] flex-shrink-0 bg-surface flex flex-col h-full shadow-2xl transition-transform duration-300 transform",
        isCartOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}>
        <div className="p-4 border-b border-border bg-surface-2 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base lg:text-lg flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 lg:w-5 lg:h-5 text-primary" /> Current Order
            </h2>
            <div className="text-xs lg:text-sm text-muted mt-1 font-medium flex items-center gap-2">
              {orderType === "DINE_IN" ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-success"></span>
                  Dine-in {selectedTableName ? `• Table ${selectedTableName}` : "(No table)"}
                </>
              ) : orderType === "DELIVERY" ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Delivery
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-warning"></span>
                  Takeaway
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={clearCart}
              className="p-2 text-muted hover:text-danger hover:bg-danger-muted rounded-lg transition-colors"
              title="Clear Cart"
            >
              <Trash2 size={18} />
            </button>
            {/* Close button for mobile */}
            <button 
              onClick={() => setIsCartOpen(false)}
              className="lg:hidden p-2 bg-surface-3 rounded-lg text-foreground ml-2"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4 flex flex-col gap-3">
          {cartItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted gap-4 opacity-60">
              <ShoppingCart size={48} className="stroke-1" />
              <p>Your cart is empty</p>
            </div>
          ) : (
            <div className="stagger-children flex flex-col gap-3">
              {cartItems.map((item) => (
                <div key={item.id} className="flex gap-2 lg:gap-3 bg-surface-2 p-2 lg:p-3 rounded-xl border border-border animate-slide-left">
                  <div className="flex-1 flex flex-col justify-between">
                    <h4 className="font-semibold text-xs lg:text-sm line-clamp-1">{item.name}</h4>
                    <span className="text-primary font-semibold text-xs lg:text-sm">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 lg:gap-3 bg-surface-3 rounded-lg px-2 py-1">
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="p-1 lg:p-1 text-muted hover:text-foreground hover:bg-surface rounded-md transition-colors"
                    >
                      <Minus size={12} className="lg:w-3.5 lg:h-3.5" />
                    </button>
                    <span className="font-bold text-xs lg:text-sm w-4 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-1 lg:p-1 text-muted hover:text-foreground hover:bg-surface rounded-md transition-colors"
                    >
                      <Plus size={12} className="lg:w-3.5 lg:h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checkout Section */}
        <div className="bg-surface-2 p-4 lg:p-6 border-t border-border mt-auto rounded-t-2xl lg:rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
          <div className="space-y-2 lg:space-y-3 text-xs lg:text-sm mb-4 lg:mb-6">
            <div className="flex justify-between text-muted font-medium">
              <span>Subtotal</span>
              <span>{formatCurrency(getSubtotal())}</span>
            </div>
            <div className="flex justify-between text-muted font-medium">
              <span>Tax ({paymentMethod === "CARD" ? "5%" : "16%"})</span>
              <span>{formatCurrency(getTax())}</span>
            </div>
            <div className="flex justify-between items-center pt-2 lg:pt-3 border-t border-border border-dashed">
              <span className="text-sm lg:text-base font-bold">Total</span>
              <span className="text-2xl lg:text-3xl font-black text-primary tracking-tight">{formatCurrency(getTotal())}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:gap-3 mb-2 lg:mb-3">
            <button 
              onClick={() => setPaymentMethod("CASH")}
              className={cn(
                "h-10 lg:h-12 text-sm lg:text-base font-bold rounded-xl transition-all border",
                paymentMethod === "CASH" || paymentMethod === null 
                  ? "bg-primary text-white border-primary shadow-md shadow-primary/20" 
                  : "bg-surface-3 text-muted hover:text-foreground border-border"
              )}
            >
              Cash (16% Tax)
            </button>
            <button 
              onClick={() => setPaymentMethod("CARD")}
              className={cn(
                "h-10 lg:h-12 text-sm lg:text-base font-bold rounded-xl transition-all border",
                paymentMethod === "CARD" 
                  ? "bg-primary text-white border-primary shadow-md shadow-primary/20" 
                  : "bg-surface-3 text-muted hover:text-foreground border-border"
              )}
            >
              Card (5% Tax)
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 lg:gap-3">
            <button 
              disabled={cartItems.length === 0 || submitting}
              className="col-span-2 btn btn-primary w-full py-4 text-sm lg:text-base font-bold shadow-lg shadow-primary/30 disabled:opacity-50 disabled:shadow-none relative overflow-hidden group"
              onClick={handleCheckout}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {submitting ? "Processing..." : existingOrderId ? "Update Running Order" : "Send to Kitchen (KDS)"}
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            </button>
          </div>
        </div>
      </div>

      {/* Delivery Details Modal */}
      {showDeliveryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scale-in border border-border">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Bike size={24} className="text-primary"/> Delivery Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-muted mb-1">Customer Name</label>
                <input 
                  type="text" 
                  value={customerName || ""} 
                  onChange={e => setCustomerDetails(e.target.value, customerPhone || "", customerAddress || "")}
                  className="input w-full bg-surface-2" 
                  placeholder="John Doe" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-muted mb-1">Phone Number</label>
                <input 
                  type="tel" 
                  value={customerPhone || ""} 
                  onChange={e => setCustomerDetails(customerName || "", e.target.value, customerAddress || "")}
                  className="input w-full bg-surface-2" 
                  placeholder="0300 1234567" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-muted mb-1">Delivery Address</label>
                <textarea 
                  value={customerAddress || ""} 
                  onChange={e => setCustomerDetails(customerName || "", customerPhone || "", e.target.value)}
                  className="input w-full bg-surface-2 min-h-[80px] resize-none" 
                  placeholder="Street, Area, City" 
                />
              </div>
              <button 
                onClick={() => setShowDeliveryModal(false)}
                className="btn btn-primary w-full h-12 text-base font-bold mt-2"
                disabled={!customerName || !customerPhone || !customerAddress}
              >
                Confirm Delivery Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

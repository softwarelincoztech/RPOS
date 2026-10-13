"use client";

import { useState, useEffect } from "react";
import { Package, Plus, Trash2, Edit2, LayoutGrid, DollarSign } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

export default function InventoryPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  
  const [catName, setCatName] = useState("");

  const [itemName, setItemName] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchMenu = async () => {
    try {
      const res = await fetch("/api/admin/menu");
      if (res.ok) {
        const json = await res.json();
        setCategories(json.data);
        if (json.data.length > 0 && !itemCategory) {
          setItemCategory(json.data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch menu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADD_CATEGORY", name: catName })
      });
      if (res.ok) {
        setCatName("");
        setIsAddingCategory(false);
        fetchMenu();
      }
    } catch (error) {
      alert("Error adding category");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "ADD_ITEM", 
          name: itemName, 
          description: itemDesc, 
          price: itemPrice, 
          categoryId: itemCategory 
        })
      });
      if (res.ok) {
        setItemName("");
        setItemDesc("");
        setItemPrice("");
        setIsAddingItem(false);
        fetchMenu();
      }
    } catch (error) {
      alert("Error adding item");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center gap-3">
            <Package className="text-primary" /> Menu & Inventory
          </h1>
          <p className="text-muted">Manage your categories and menu items.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsAddingCategory(!isAddingCategory)} className="btn btn-secondary border border-border">
            {isAddingCategory ? "Cancel" : <><LayoutGrid size={18} className="mr-2" /> Add Category</>}
          </button>
          <button onClick={() => setIsAddingItem(!isAddingItem)} className="btn btn-primary">
            {isAddingItem ? "Cancel" : <><Plus size={18} className="mr-2" /> Add Item</>}
          </button>
        </div>
      </div>

      {isAddingCategory && (
        <div className="glass-card p-6 mb-8 animate-fade-in border border-secondary/20">
          <h2 className="text-xl font-bold mb-4">Add New Category</h2>
          <form onSubmit={handleAddCategory} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-semibold mb-1">Category Name</label>
              <input type="text" required value={catName} onChange={e => setCatName(e.target.value)} className="input bg-surface border-border w-full" placeholder="e.g. Beverages" />
            </div>
            <button disabled={submitting} type="submit" className="btn btn-secondary h-12 px-8">Save Category</button>
          </form>
        </div>
      )}

      {isAddingItem && (
        <div className="glass-card p-6 mb-8 animate-fade-in border border-primary/20 bg-primary-muted/5">
          <h2 className="text-xl font-bold mb-4">Add Menu Item</h2>
          <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Item Name</label>
              <input type="text" required value={itemName} onChange={e => setItemName(e.target.value)} className="input bg-surface border-border w-full" placeholder="Cheese Burger" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Price</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <input type="number" step="0.01" required value={itemPrice} onChange={e => setItemPrice(e.target.value)} className="input pl-10 bg-surface border-border w-full" placeholder="9.99" />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-1">Description</label>
              <textarea value={itemDesc} onChange={e => setItemDesc(e.target.value)} className="input bg-surface border-border w-full py-2 min-h-[80px]" placeholder="Delicious beef patty with melting cheese..."></textarea>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-1">Category</label>
              <select value={itemCategory} onChange={e => setItemCategory(e.target.value)} className="input bg-surface border-border w-full">
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 mt-2">
              <button disabled={submitting || categories.length === 0} type="submit" className="btn btn-primary w-full md:w-auto px-8">
                {submitting ? "Saving..." : "Save Item"}
              </button>
              {categories.length === 0 && <p className="text-danger text-xs mt-2 font-semibold">Please create a category first.</p>}
            </div>
          </form>
        </div>
      )}

      {/* Menu Categories List */}
      <div className="flex flex-col gap-8">
        {categories.map((category) => (
          <div key={category.id} className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border bg-surface-2 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                {category.name}
              </h3>
              <span className="badge border-border text-muted">{category.items.length} Items</span>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface border-b border-border text-sm">
                  <th className="p-4 font-semibold text-muted uppercase tracking-wider">Item Name</th>
                  <th className="p-4 font-semibold text-muted uppercase tracking-wider">Description</th>
                  <th className="p-4 font-semibold text-muted uppercase tracking-wider">Price</th>
                  <th className="p-4 font-semibold text-muted uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {category.items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-surface-2/50 transition-colors group">
                    <td className="p-4 font-bold text-foreground">{item.name}</td>
                    <td className="p-4 text-sm text-muted max-w-[300px] truncate">{item.description}</td>
                    <td className="p-4 font-bold text-primary">{formatCurrency(item.price)}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 text-muted hover:text-accent bg-surface rounded-lg border border-border shadow-sm">
                          <Edit2 size={14} />
                        </button>
                        <button className="p-2 text-muted hover:text-danger hover:bg-danger-muted bg-surface rounded-lg border border-border shadow-sm">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {category.items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted italic text-sm">No items in this category yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-xl">
            <Package size={48} className="mx-auto text-muted mb-4 opacity-50" />
            <h3 className="text-xl font-bold mb-2">No Menu Found</h3>
            <p className="text-muted">Start by adding a Category, then add Items to it.</p>
          </div>
        )}
      </div>
    </div>
  );
}

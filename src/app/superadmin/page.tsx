"use client";

import { useState, useEffect } from "react";
import { Plus, ShieldCheck, Building2, CalendarDays, ExternalLink, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SuperAdminDashboard() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingFeatures, setEditingFeatures] = useState<any>(null);

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/superadmin/clients");
      if (res.ok) {
        const json = await res.json();
        setClients(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch clients");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateClient = async (id: string, data: any) => {
    try {
      const res = await fetch("/api/superadmin/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...data })
      });
      if (res.ok) {
        setEditingFeatures(null);
        fetchClients();
      }
    } catch (error) {
      alert("Failed to update client");
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/superadmin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, contactEmail: email, password })
      });
      
      const data = await res.json();
      if (res.ok) {
        alert("Client registered successfully!");
        setIsAdding(false);
        setName("");
        setSlug("");
        setEmail("");
        setPassword("");
        fetchClients();
      } else {
        alert(data.error || "Failed to add client");
      }
    } catch (error) {
      alert("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;
  }

  const activeClients = clients.filter(c => c.status === "ACTIVE").length;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center gap-3">
            <ShieldCheck className="text-primary w-8 h-8" /> Lincoz Tech Master Control
          </h1>
          <p className="text-muted">Manage restaurant tenants, branches, and active licenses.</p>
        </div>
        <button onClick={() => setIsAdding(!isAdding)} className="btn btn-primary">
          {isAdding ? "Cancel" : <><Plus size={18} className="mr-2" /> Register New Client</>}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6 border-l-4 border-l-primary">
          <h3 className="text-sm font-semibold text-muted mb-1">Total Active Clients</h3>
          <p className="text-3xl font-bold">{activeClients}</p>
        </div>
        <div className="glass-card p-6 border-l-4 border-l-success">
          <h3 className="text-sm font-semibold text-muted mb-1">Total Sub-Branches</h3>
          <p className="text-3xl font-bold">{clients.reduce((acc, curr) => acc + (curr._count?.branches || 0), 0)}</p>
        </div>
        <div className="glass-card p-6 border-l-4 border-l-warning">
          <h3 className="text-sm font-semibold text-muted mb-1">Est. Monthly Revenue</h3>
          <p className="text-3xl font-bold">${activeClients * 99}</p>
        </div>
      </div>

      {isAdding && (
        <div className="glass-card p-6 mb-8 animate-fade-in border border-primary/20 bg-primary-muted/5 shadow-xl">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Building2 size={20} /> Register New Restaurant</h2>
          <form onSubmit={handleAddClient} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold mb-1">Restaurant Name</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className="input bg-surface border-border w-full" placeholder="e.g. Pizza Palace" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Subdomain / Tenant Code</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <input type="text" required value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} className="input pl-10 bg-surface border-border w-full" placeholder="pizza-palace" />
              </div>
              <p className="text-[10px] text-muted mt-1">This will be used for their login code (e.g. pizza-palace).</p>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Owner Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input bg-surface border-border w-full" placeholder="owner@pizza.com" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Initial Password</label>
              <input type="text" required value={password} onChange={e => setPassword(e.target.value)} className="input bg-surface border-border w-full" placeholder="SecurePass123" />
            </div>
            <div className="md:col-span-2 mt-2 pt-4 border-t border-border">
              <button disabled={submitting} type="submit" className="btn btn-primary w-full md:w-auto px-8 h-12 text-base">
                {submitting ? "Creating Infrastructure..." : "Deploy Restaurant"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border bg-surface-2 flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2"><Building2 size={18} /> Registered Restaurants</h2>
          <div className="text-xs text-muted font-semibold bg-surface px-3 py-1.5 rounded-md border border-border">
            Total Database Tenants: {clients.length}
          </div>
        </div>
        
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface border-b border-border text-xs uppercase text-muted">
            <tr>
              <th className="p-4 font-semibold">Tenant Info</th>
              <th className="p-4 font-semibold">Contact & Users</th>
              <th className="p-4 font-semibold">Infrastructure</th>
              <th className="p-4 font-semibold">Subscription</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-surface-2/50 transition-colors">
                <td className="p-4">
                  <p className="font-bold text-foreground text-sm">{client.name}</p>
                  <p className="text-xs text-primary font-mono mt-0.5 bg-primary-muted/20 w-max px-1.5 py-0.5 rounded flex items-center gap-1">
                    <ExternalLink size={10} /> {client.slug}
                  </p>
                </td>
                <td className="p-4">
                  <p className="font-medium text-sm text-foreground">{client.contactEmail}</p>
                  <p className="text-xs text-muted">{client._count?.users || 0} Staff Accounts</p>
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="bg-surface-3 px-2 py-1 rounded-md text-[10px] font-bold text-foreground border border-border w-max">
                      {client._count?.branches || 0} Branches
                    </span>
                    <div className="flex gap-1">
                      {client.hasHR && <span title="HR Enabled" className="w-4 h-4 rounded-full bg-success/20 text-success flex items-center justify-center text-[8px] font-bold">HR</span>}
                      {client.hasInventory && <span title="Inventory Enabled" className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[8px] font-bold">IV</span>}
                      {client.hasKDS && <span title="KDS Enabled" className="w-4 h-4 rounded-full bg-warning/20 text-warning flex items-center justify-center text-[8px] font-bold">KD</span>}
                      {client.hasDelivery && <span title="Delivery Enabled" className="w-4 h-4 rounded-full bg-info/20 text-info flex items-center justify-center text-[8px] font-bold">DL</span>}
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <p className="text-sm font-bold tracking-tight">{client.subscriptionPlan}</p>
                  <p className="text-[10px] text-muted flex items-center gap-1 mt-0.5 uppercase tracking-wider font-semibold">
                    <CalendarDays size={10} /> <span suppressHydrationWarning>{new Date(client.validUntil).toLocaleDateString()}</span>
                  </p>
                </td>
                <td className="p-4">
                  <span className={cn(
                    "badge",
                    client.status === "ACTIVE" ? "bg-success-muted text-success border-success/20" : "bg-danger-muted text-danger border-danger/20"
                  )}>
                    {client.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button 
                    onClick={() => {
                      const newStatus = client.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
                      handleUpdateClient(client.id, { status: newStatus });
                    }}
                    className={cn(
                      "text-xs font-bold mr-4",
                      client.status === "ACTIVE" ? "text-danger" : "text-success"
                    )}
                  >
                    {client.status === "ACTIVE" ? "Suspend" : "Activate"}
                  </button>
                  <button 
                    onClick={() => setEditingFeatures(client)}
                    className="btn btn-secondary py-1 px-3 text-xs"
                  >
                    Manage Features
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Feature Management Modal */}
      {editingFeatures && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 shadow-2xl animate-scale-in">
            <h2 className="text-xl font-bold mb-1">Manage Features</h2>
            <p className="text-sm text-muted mb-6">{editingFeatures.name}</p>
            
            <div className="space-y-4">
              {[
                { id: "hasHR", label: "HR & Staff Management" },
                { id: "hasInventory", label: "Inventory & Stock" },
                { id: "hasKDS", label: "Kitchen Display (KDS)" },
                { id: "hasDelivery", label: "Delivery Module" },
                { id: "hasTables", label: "Dine-in (Tables)" },
              ].map(feat => (
                <div key={feat.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-2 border border-border">
                  <span className="font-semibold text-sm">{feat.label}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={editingFeatures[feat.id]} 
                      onChange={(e) => {
                        setEditingFeatures({ ...editingFeatures, [feat.id]: e.target.checked });
                      }}
                    />
                    <div className="w-11 h-6 bg-surface-3 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              ))}
            </div>

            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => setEditingFeatures(null)}
                className="btn btn-ghost flex-1"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleUpdateClient(editingFeatures.id, editingFeatures)}
                className="btn btn-primary flex-1"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

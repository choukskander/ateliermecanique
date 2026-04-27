import React, { useState, useEffect } from "react";
import { Package, Search, Plus, AlertTriangle, ArrowUpRight, ArrowDownLeft, Loader2, Trash2, ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";

export default function Inventory({ currentUser }: { currentUser: any }) {
  const [parts, setParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState<any>(null);

  // Add Part Form State
  const [name, setName] = useState("");
  const [ref, setRef] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");

  useEffect(() => {
    fetchParts();
  }, [searchTerm, stockFilter, minPrice, maxPrice]);

  const fetchParts = async () => {
    try {
      const config = { 
        headers: { Authorization: `Bearer ${currentUser.token}` },
        params: {
          search: searchTerm,
          stock: stockFilter,
          minPrice: minPrice || undefined,
          maxPrice: maxPrice || undefined
        }
      };
      const res = await axios.get("/api/parts", config);
      setParts(res.data);
    } catch (err) {
      console.error("Error fetching parts", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      await axios.post("/api/parts", {
        name,
        reference: ref,
        price: parseFloat(price),
        stock: parseInt(stock) || 0
      }, config);
      setShowAddModal(false);
      setName(""); setRef(""); setPrice(""); setStock("");
      fetchParts();
    } catch (err) {
      console.error("Error adding part", err);
    }
  };

  const handleUpdateStock = async (id: string, quantity: number) => {
    try {
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      await axios.patch(`/api/parts/${id}/stock`, { quantity }, config);
      setShowOrderModal(null);
      fetchParts();
    } catch (err) {
      console.error("Error updating stock", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer cette pièce du stock ?")) return;
    try {
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      await axios.delete(`/api/parts/${id}`, config);
      fetchParts();
    } catch (err) {
      console.error("Error deleting part", err);
    }
  };

  const filteredParts = parts;

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'mechanic';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Gestion du Stock</h2>
          <p className="text-sm text-slate-400">Inventaire en temps réel des pièces détachées.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20"
          >
            <Plus size={16} /> Ajouter une pièce
          </button>
        )}
      </div>

      <div className="bg-[#111114] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/5 bg-white/[0.01] flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
              <input 
                type="text" 
                placeholder="Rechercher par nom ou référence..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#16161A] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white outline-none focus:border-blue-500/50 transition-all font-medium"
              />
            </div>
            <div className="flex items-center gap-2">
              <select 
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="bg-[#16161A] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-400 outline-none focus:border-blue-500/50 transition-all"
              >
                <option value="all">Tous les stocks</option>
                <option value="low">Stock faible (Critique)</option>
                <option value="in-stock">En stock uniquement</option>
              </select>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Prix Min</span>
              <input 
                type="number" 
                placeholder="0" 
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-24 bg-[#16161A] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500/50 transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Prix Max</span>
              <input 
                type="number" 
                placeholder="999" 
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-24 bg-[#16161A] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500/50 transition-all"
              />
            </div>
            {(searchTerm || stockFilter !== 'all' || minPrice || maxPrice) && (
              <button 
                onClick={() => {
                  setSearchTerm("");
                  setStockFilter("all");
                  setMinPrice("");
                  setMaxPrice("");
                }}
                className="text-[10px] font-bold text-blue-500 uppercase tracking-widest hover:text-blue-400 transition-colors"
              >
                Réinitialiser
              </button>
            )}
            <div className="h-4 w-[1px] bg-white/10 mx-2 hidden md:block"></div>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div> En Stock</span>
              <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div> Critique</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5">
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-500 font-bold">Pièce</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-500 font-bold">Référence</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-500 font-bold text-center">Prix Unitaire</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-500 font-bold text-center">Quantité</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-500 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="py-10 text-center"><Loader2 className="animate-spin inline text-blue-500" /></td></tr>
              ) : filteredParts.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-slate-600 text-sm italic">Aucune pièce trouvée</td></tr>
              ) : (
                filteredParts.map((part) => (
                  <tr key={part._id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-blue-500">
                          <Package size={16} />
                        </div>
                        <span className="text-sm font-bold text-white uppercase">{part.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 shrink-0">
                      <span className="text-xs font-mono text-slate-400 group-hover:text-blue-400 transition-colors">{part.reference}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-bold text-slate-200">{part.price.toFixed(2)}€</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`text-sm font-bold ${part.stock <= 2 ? 'text-orange-500 animate-pulse' : 'text-white'}`}>
                          {part.stock}
                        </span>
                        {part.stock <= 2 && <AlertTriangle size={12} className="text-orange-500" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         {isAdmin && (
                            <>
                              <button 
                                onClick={() => setShowOrderModal(part)}
                                title="Réapprovisionner" 
                                className="p-2 bg-blue-600/10 text-blue-500 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-blue-600/20 shadow-lg border border-blue-500/20"
                              >
                                <ShoppingCart size={14} />
                              </button>
                              <button 
                                onClick={() => handleDelete(part._id)}
                                title="Supprimer" 
                                className="p-2 bg-red-600/10 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-red-600/20 shadow-lg border border-red-500/20"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                         )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="w-full max-w-md bg-[#111114] border border-white/10 rounded-2xl p-6 shadow-2xl relative z-10">
              <h2 className="text-xl font-bold text-white mb-6">Ajouter une pièce au stock</h2>
              <form onSubmit={handleAddPart} className="space-y-4">
                 <label className="block space-y-1.5">
                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Nom de la pièce</span>
                   <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-[#16161A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50 transition-all font-medium" placeholder="Alternateur Bosch..." />
                 </label>
                 <label className="block space-y-1.5">
                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Référence OEM</span>
                   <input type="text" required value={ref} onChange={(e) => setRef(e.target.value)} className="w-full bg-[#16161A] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white outline-none focus:border-blue-500/50 transition-all uppercase" placeholder="BOS-123456" />
                 </label>
                 <div className="grid grid-cols-2 gap-3">
                   <label className="block space-y-1.5">
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Prix Unitaire (€)</span>
                     <input type="number" step="0.01" required value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-[#16161A] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white outline-none focus:border-blue-500/50 transition-all" placeholder="159.00" />
                   </label>
                   <label className="block space-y-1.5">
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Quantité Initiale</span>
                     <input type="number" required value={stock} onChange={(e) => setStock(e.target.value)} className="w-full bg-[#16161A] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white outline-none focus:border-blue-500/50 transition-all" placeholder="5" />
                   </label>
                 </div>
                 <div className="flex gap-3 pt-6">
                   <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-bold text-slate-400 hover:bg-white/5 transition-all">Annuler</button>
                   <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-600/20">Ajouter</button>
                 </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reorder Modal (Simple Quantity Update) */}
      <AnimatePresence>
        {showOrderModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowOrderModal(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-xs bg-[#111114] border border-white/10 rounded-2xl p-6 shadow-2xl relative z-10 text-center">
              <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-widest">Mise à jour Stock</h3>
              <p className="text-xs text-slate-500 mb-6">{showOrderModal.name}</p>
              
              <div className="flex flex-col gap-2">
                 <button 
                  onClick={() => handleUpdateStock(showOrderModal._id, 1)}
                  className="w-full py-2 bg-green-500/10 text-green-500 border border-green-500/20 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-green-500/20 transition-all"
                 >
                   <ArrowUpRight size={16} /> Entrée (+1)
                 </button>
                 <button 
                  onClick={() => handleUpdateStock(showOrderModal._id, -1)}
                  className="w-full py-2 bg-red-400/10 text-red-400 border border-red-500/10 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-red-500/20 transition-all"
                 >
                   <ArrowDownLeft size={16} /> Sortie (-1)
                 </button>
              </div>
              <button onClick={() => setShowOrderModal(null)} className="mt-4 text-[10px] text-slate-600 uppercase font-bold hover:text-slate-400">Fermer</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

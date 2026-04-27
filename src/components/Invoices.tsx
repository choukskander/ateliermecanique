import React, { useEffect, useState } from "react";
import axios from "axios";
import { FileText, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Invoices({ currentUser }: { currentUser: any }) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      const res = await axios.get("/api/invoices", config);
      setInvoices(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Factures</h2>
          <p className="text-sm text-slate-400">
            {currentUser.role === "client" ? "Consultez vos factures." : "Suivi des factures atelier."}
          </p>
        </div>
        <button
          onClick={fetchInvoices}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/10"
        >
          Rafraîchir
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-10">
          <Loader2 className="animate-spin text-blue-500" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-[#111114] border border-dashed border-white/10 p-10 rounded-2xl flex flex-col items-center gap-3">
          <FileText className="text-slate-700" size={40} />
          <p className="text-slate-500 text-sm font-medium">Aucune facture.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {invoices.map((inv: any) => (
            <button
              key={inv._id}
              onClick={() => setSelected(inv)}
              className="p-4 bg-[#111114] border border-white/5 rounded-xl hover:border-blue-500/30 transition-all text-left flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/5">
                <FileText className="text-slate-400" size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">
                  Facture #{String(inv._id).slice(-8).toUpperCase()}
                </p>
                <p className="text-xs text-slate-500 font-mono">{new Date(inv.createdAt).toLocaleString("fr-FR")}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-200">{Number(inv.totalTTC || 0).toFixed(2)}€</p>
                <p className={`text-[9px] font-bold uppercase ${inv.status === "Payée" ? "text-green-500" : "text-orange-500"}`}>
                  {inv.status}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-xl bg-[#111114] border border-white/10 rounded-2xl p-6 shadow-2xl relative z-10"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Détail facture</h3>
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    #{String(selected._id).slice(-8).toUpperCase()} • {new Date(selected.createdAt).toLocaleString("fr-FR")}
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-slate-400 hover:bg-white/5"
                >
                  Fermer
                </button>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Pièces</span>
                  <span className="text-sm font-bold text-white">{Number(selected.totalParts || 0).toFixed(2)}€</span>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Main d’œuvre</span>
                  <span className="text-sm font-bold text-white">{Number(selected.totalLabor || 0).toFixed(2)}€</span>
                </div>
                <div className="p-4 rounded-xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-between">
                  <span className="text-xs text-blue-300 font-bold uppercase tracking-widest">Total TTC</span>
                  <span className="text-lg font-extrabold text-white">{Number(selected.totalTTC || 0).toFixed(2)}€</span>
                </div>

                {selected.status === "Payée" && (
                  <div className="flex items-center gap-2 text-green-500 text-xs font-bold uppercase tracking-wider">
                    <CheckCircle2 size={14} /> Paiement enregistré
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}


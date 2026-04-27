import React, { useState, useEffect } from "react";
import { 
  Wrench, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Loader2, 
  ExternalLink,
  ChevronRight,
  ClipboardList,
  Euro,
  Package
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";

export default function Workshop({ currentUser }: { currentUser: any }) {
  const [repairs, setRepairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<any>(null);
  const [parts, setParts] = useState<any[]>([]);
  
  // Form State
  const [status, setStatus] = useState("");
  const [worksDone, setWorksDone] = useState("");
  const [laborCost, setLaborCost] = useState<string>("0");
  const [selectedPartId, setSelectedPartId] = useState<string>("");

  useEffect(() => {
    fetchRepairs();
  }, []);

  const fetchRepairs = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      const res = await axios.get("/api/repairs", config);
      setRepairs(res.data);
    } catch (err) {
      console.error("Error fetching repairs", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchParts = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      const res = await axios.get("/api/parts?stock=in-stock", config);
      setParts(Array.isArray(res.data) ? res.data : []);
    } catch {
      setParts([]);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepair) return;
    
    try {
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      await axios.patch(`/api/repairs/${selectedRepair._id}/status`, { 
        status, 
        worksDone,
        laborCost: Number(laborCost || 0),
      }, config);
      setShowModal(false);
      fetchRepairs();
      alert("Fiche d'atelier mise à jour avec succès !");
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Erreur lors de l'enregistrement");
    }
  };

  const adjustPart = async (delta: number) => {
    if (!selectedRepair || !selectedPartId) {
      alert("Veuillez d'abord sélectionner une pièce dans la liste.");
      return;
    }
    console.log(`🚀 [Frontend] Appel adjustPart: Piece=${selectedPartId}, Delta=${delta}`);
    try {
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      const res = await axios.patch(`/api/repairs/${selectedRepair._id}/parts`, {
        partId: selectedPartId,
        quantityDelta: delta,
      }, config);
      
      console.log("✅ [Frontend] Réponse reçue:", res.data);
      setSelectedRepair(res.data);
      fetchRepairs();
      alert(`Stock mis à jour (${delta > 0 ? '+1' : '-1'}) !`);
    } catch (err: any) {
      console.error("❌ [Frontend] Erreur:", err);
      alert(err.response?.data?.message || "Erreur lors de la mise à jour des pièces");
    }
  };

  const openModal = (repair: any) => {
    setSelectedRepair(repair);
    setStatus(repair.status);
    setWorksDone(repair.worksDone || "");
    setLaborCost(String(repair.laborCost ?? 0));
    setShowModal(true);
    fetchParts();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-20"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Suivi d'Atelier</h2>
          <p className="text-sm text-slate-400">Gérez l'avancement des travaux sur les véhicules.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500" /></div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {repairs.length === 0 ? (
            <div className="bg-[#111114] border border-dashed border-white/10 p-12 rounded-2xl flex flex-col items-center gap-3">
              <Wrench className="text-slate-700" size={40} />
              <p className="text-slate-500 text-sm font-medium">Aucun travail en cours dans l'atelier.</p>
            </div>
          ) : (
            repairs.map((repair: any) => {
              const apt = repair.appointmentId || {};
              const vehicle = apt.vehicleId || {};
              const client = apt.clientId || {};
              
              return (
                <div key={repair._id} className="p-5 bg-[#111114] border border-white/5 rounded-2xl hover:border-blue-500/30 transition-all group">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                          repair.status === 'Prêt' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                          repair.status === 'En réparation' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' :
                          repair.status === 'Diagnostic' || repair.status === 'Attente Pièces' ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' :
                          'bg-slate-500/10 border-slate-500/20 text-slate-500'
                        }`}>
                          <Wrench size={14} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white uppercase tracking-tight">
                            {vehicle.brand} {vehicle.model}
                          </h3>
                          <p className="text-[10px] font-mono text-slate-500 uppercase">{vehicle.licensePlate}</p>
                        </div>
                        <span className={`ml-auto md:ml-4 px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                          repair.status === 'Prêt' ? 'text-green-500 border-green-500/30 bg-green-500/10' :
                          repair.status === 'En réparation' ? 'text-blue-500 border-blue-500/30 bg-blue-500/10' :
                          repair.status === 'Diagnostic' || repair.status === 'Attente Pièces' ? 'text-orange-500 border-orange-500/30 bg-orange-500/10' :
                          'text-slate-500 border-slate-500/30 bg-slate-500/10'
                        }`}>
                          {repair.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Propriétaire</p>
                          <p className="text-xs text-white font-medium">{client.name || 'Inconnu'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Dernière Mise à jour</p>
                          <p className="text-xs text-slate-400 font-mono">{new Date(repair.updatedAt).toLocaleString('fr-FR')}</p>
                        </div>
                      </div>
                      
                      {repair.worksDone && (
                        <div className="mt-4 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                           <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Travaux effectués</p>
                           <p className="text-xs text-slate-300 line-clamp-2 italic">"{repair.worksDone}"</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center md:items-end justify-between md:flex-col md:justify-center gap-3 pt-4 md:pt-0 md:pl-6 md:border-l md:border-white/5">
                       {currentUser.role !== 'client' && (
                         <button 
                           onClick={() => openModal(repair)}
                           className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/10"
                         >
                           Mettre à jour <ChevronRight size={14} />
                         </button>
                       )}
                       {repair.status === 'Prêt' && (
                          <div className="flex items-center gap-1.5 text-green-500 text-[10px] font-bold uppercase tracking-wider">
                            <CheckCircle2 size={12} /> Terminé
                          </div>
                       )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Edit Repair Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="w-full max-w-lg bg-[#111114] border border-white/10 rounded-2xl p-6 shadow-2xl relative z-10"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-600/10 rounded-lg text-blue-500"><ClipboardList size={20} /></div>
                <h2 className="text-xl font-bold text-white">Mise à jour Fiche Atelier</h2>
              </div>
              
              <form onSubmit={handleUpdate} className="space-y-4">
                 <label className="block space-y-1.5">
                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Statut des travaux</span>
                   <select 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-[#16161A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                   >
                     <option value="En attente">En attente</option>
                     <option value="Diagnostic">Diagnostic</option>
                     <option value="Attente Pièces">Attente Pièces</option>
                     <option value="En réparation">En réparation</option>
                     <option value="Contrôle">Contrôle Qualité</option>
                     <option value="Prêt">Prêt / Terminé</option>
                   </select>
                 </label>
                 
                 <label className="block space-y-1.5">
                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Détail des opérations effectuées</span>
                   <textarea 
                    rows={5} 
                    value={worksDone} 
                    onChange={(e) => setWorksDone(e.target.value)}
                    className="w-full bg-[#16161A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50 resize-none font-medium"
                    placeholder="Vidange effectuée, changement filtre à huile..."
                   />
                 </label>

                 <div className="grid grid-cols-2 gap-3">
                   <label className="block space-y-1.5">
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-2"><Euro size={12} /> Main d’œuvre (€)</span>
                     <input
                       type="number"
                       min={0}
                       step="0.01"
                       value={laborCost}
                       onChange={(e) => setLaborCost(e.target.value)}
                       className="w-full bg-[#16161A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                     />
                   </label>
                   <label className="block space-y-1.5">
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-2"><Package size={12} /> Pièce</span>
                     <select
                       value={selectedPartId}
                       onChange={(e) => setSelectedPartId(e.target.value)}
                       className="w-full bg-[#16161A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                     >
                       <option value="">Choisir une pièce...</option>
                       {parts.map((p: any) => (
                         <option key={p._id} value={p._id}>
                           {p.name} ({p.reference}) • stock:{p.stock}
                         </option>
                       ))}
                     </select>
                   </label>
                 </div>

                 <div className="flex gap-3">
                   <button
                     type="button"
                     onClick={() => adjustPart(-1)}
                     disabled={!selectedPartId}
                     className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                       selectedPartId ? "border-white/10 text-slate-300 hover:bg-white/5" : "border-white/5 text-slate-600 cursor-not-allowed"
                     }`}
                   >
                     -1 stock
                   </button>
                   <button
                     type="button"
                     onClick={() => adjustPart(1)}
                     disabled={!selectedPartId}
                     className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                       selectedPartId ? "border-blue-600/30 text-blue-300 bg-blue-600/10 hover:bg-blue-600/20" : "border-white/5 text-slate-600 cursor-not-allowed"
                     }`}
                   >
                     +1 stock
                   </button>
                 </div>

                 <div className="flex gap-3 pt-4">
                   <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-bold text-slate-400 hover:bg-white/5 transition-all">Annuler</button>
                   <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-600/20">Enregistrer</button>
                 </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

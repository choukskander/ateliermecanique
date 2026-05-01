import React, { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Settings as SettingsIcon, 
  ChevronRight,
  AlertCircle,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";

export default function Appointments({ currentUser }: { currentUser: any }) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [selectedMechanicId, setSelectedMechanicId] = useState<string>("");
  const [slotDate, setSlotDate] = useState<string>("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsStatus, setSlotsStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState("");
  
  // Form State
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [plate, setPlate] = useState("");
  const [date, setDate] = useState("");
  const [desc, setDesc] = useState("");
  const [availStatus, setAvailStatus] = useState<'idle' | 'loading' | 'available' | 'unavailable'>('idle');
  const [availReason, setAvailReason] = useState("");

  // Availability Settings State
  const [schedules, setSchedules] = useState<any[]>(
     [0,1,2,3,4,5,6].map(d => ({ dayOfWeek: d, startTime: "09:00", endTime: "18:00", isAvailable: d !== 0 && d !== 6 }))
  );

  useEffect(() => {
    fetchAppointments();
    fetchAvailability();
    fetchMechanics();
  }, []);

  const fetchAppointments = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      const res = await axios.get("/api/appointments", config);
      setAppointments(res.data);
    } catch (err) {
      console.error("Error fetching appointments", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async () => {
    try {
      const res = await axios.get("/api/availability");
      if (res.data.length > 0) {
        setSchedules(prev => {
            const newSchedules = [...prev];
            res.data.forEach((item: any) => {
                newSchedules[item.dayOfWeek] = item;
            });
            return newSchedules;
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMechanics = async () => {
    try {
      const res = await axios.get("/api/availability/mechanics");
      setMechanics(res.data || []);
    } catch (err) {
      console.error("Error fetching mechanics", err);
    }
  };

  const fetchSlots = async (dayStr: string, mechanicId?: string) => {
    if (!dayStr) {
      setSlots([]);
      setSlotsStatus('idle');
      return;
    }
    setSlotsStatus('loading');
    try {
      const params = new URLSearchParams();
      params.set("date", dayStr);
      params.set("stepMinutes", "30");
      if (mechanicId) params.set("mechanicId", mechanicId);
      const res = await axios.get(`/api/availability/slots?${params.toString()}`);
      const rawSlots: string[] = res.data.slots || [];
      // Defensive UI filter (avoids timezone / stale-server edge cases):
      // - block past days
      // - if today, block slots <= now
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const selectedDay = new Date(dayStr);
      selectedDay.setHours(0, 0, 0, 0);
      const filtered =
        selectedDay.getTime() < today.getTime()
          ? []
          : rawSlots.filter((s) => {
              const t = new Date(s).getTime();
              if (Number.isNaN(t)) return false;
              if (selectedDay.getTime() === today.getTime()) return t > now.getTime();
              return true;
            });
      setSlots(filtered);
      setSlotsStatus('ready');
    } catch (err) {
      console.error("Error fetching slots", err);
      setSlots([]);
      setSlotsStatus('error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      await axios.post("/api/appointments", {
        vehicleInfo: { brand, model, plate },
        date,
        description: desc,
        mechanicId: selectedMechanicId || undefined,
      }, config);
      setShowModal(false);
      
      // Reset form
      setBrand(""); setModel(""); setPlate(""); setDate(""); setDesc("");
      setSelectedMechanicId("");
      setSlotDate("");
      setSlots([]);
      setSlotsStatus('idle');
      fetchAppointments();
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur de réservation");
    }
  };

  const saveAvailability = async () => {
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      await axios.post("/api/availability", { schedules }, config);
      setShowSettings(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: number) => {
    setSchedules(prev => {
        const next = [...prev];
        next[day].isAvailable = !next[day].isAvailable;
        return next;
    });
  };

  const updateTime = (day: number, field: string, val: string) => {
    setSchedules(prev => {
        const next = [...prev];
        next[day][field] = val;
        return next;
    });
  };

  const checkAvailability = async (selectedDate: string) => {
    if (!selectedDate) {
        setAvailStatus('idle');
        return;
    }
    setAvailStatus('loading');
    try {
      const res = await axios.get(`/api/availability/check?date=${selectedDate}`);
      if (res.data.available) {
        setAvailStatus('available');
        setAvailReason("");
      } else {
        setAvailStatus('unavailable');
        setAvailReason(res.data.reason || "Indisponible");
      }
    } catch (err) {
      setAvailStatus('unavailable');
      setAvailReason("Erreur de vérification");
    }
  };

  const resetBooking = () => {
    setError("");
    setBrand(""); setModel(""); setPlate(""); setDate(""); setDesc("");
    setSelectedMechanicId("");
    setSlotDate("");
    setSlots([]);
    setSlotsStatus('idle');
    setAvailStatus('idle');
    setAvailReason("");
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      await axios.patch(`/api/appointments/${id}/status`, { status }, config);
      fetchAppointments();
    } catch (err) {
      console.error("Error updating status", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer ce rendez-vous définitivement ?")) return;
    try {
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      await axios.delete(`/api/appointments/${id}`, config);
      fetchAppointments();
    } catch (err) {
      console.error("Error deleting appointment", err);
      alert("Erreur lors de la suppression");
    }
  };
 
   const handleStartRepair = async (appointmentId: string) => {
    try {
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      await axios.post(`/api/repairs/from-appointment/${appointmentId}`, {}, config);
      // We could redirect to workshop tab or just show success
      alert("Travaux démarrés ! Retrouvez le véhicule dans l'onglet Atelier.");
      fetchAppointments();
    } catch (err) {
      console.error("Error starting repair", err);
      alert("Erreur lors du démarrage des travaux");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6 pb-20"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Gestion des Rendez-vous</h2>
          <p className="text-sm text-slate-400">
            {currentUser.role === 'client' ? 'Réservez votre prochaine intervention.' : 'Planifiez et gérez les entrées d\'atelier.'}
          </p>
        </div>
        <div className="flex gap-2">
          {(currentUser.role === 'mechanic' || currentUser.role === 'admin') && (
            <button 
              onClick={() => setShowSettings(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm font-bold hover:bg-white/10 transition-colors"
            >
              <SettingsIcon size={16} /> Horaires
            </button>
          )}
          {currentUser.role === 'client' && (
            <button 
              onClick={() => { resetBooking(); setShowModal(true); }}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20"
            >
              <Plus size={16} /> Nouveau Rendez-vous
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500" /></div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {appointments.length === 0 ? (
            <div className="bg-[#111114] border border-dashed border-white/10 p-10 rounded-2xl flex flex-col items-center gap-3">
              <CalendarIcon className="text-slate-700" size={40} />
              <p className="text-slate-500 text-sm font-medium">Aucun rendez-vous trouvé.</p>
            </div>
          ) : (
            appointments.map((apt: any, i) => (
              <div key={i} className="p-4 bg-[#111114] border border-white/5 rounded-xl hover:border-blue-500/30 transition-all flex flex-col md:flex-row md:items-center gap-4">
                <div className="w-12 h-12 bg-white/5 rounded-xl flex flex-col items-center justify-center border border-white/5">
                  <span className="text-[9px] text-blue-500 font-bold uppercase">{new Date(apt.date).toLocaleDateString('fr-FR', { month: 'short' })}</span>
                  <span className="text-sm font-bold text-white">{new Date(apt.date).getDate()}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">
                      {currentUser.role === 'client' ? apt.vehicleId?.model : apt.clientId?.name}
                    </h3>
                    <span className="text-xs font-mono text-slate-500">
                      {new Date(apt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {apt.vehicleId?.brand} {apt.vehicleId?.model} • <span className="text-blue-500/80 uppercase font-mono text-[10px]">{apt.vehicleId?.licensePlate}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1 italic line-clamp-1">"{apt.description || 'Pas de description'}"</p>
                </div>
                <div className="flex items-center gap-3 md:pl-4 md:border-l md:border-white/5">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                    apt.status === 'Confirmé' ? 'text-green-500 border-green-500/30 bg-green-500/10' :
                    apt.status === 'Annulé' ? 'text-red-500 border-red-500/30 bg-red-500/10' :
                    'text-orange-500 border-orange-500/30 bg-orange-500/10'
                  }`}>
                    {apt.status}
                  </span>
                  {(currentUser.role === 'mechanic' || currentUser.role === 'admin') && apt.status === 'En attente' && (
                    <div className="flex gap-2">
                       <button onClick={() => handleStatusUpdate(apt._id, 'Confirmé')} className="p-1.5 bg-green-500/10 text-green-500 rounded-lg border border-green-500/20 hover:bg-green-500/20 transition-all" title="Confirmer"><CheckCircle2 size={14} /></button>
                       <button onClick={() => handleStatusUpdate(apt._id, 'Annulé')} className="p-1.5 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-all" title="Annuler"><XCircle size={14} /></button>
                    </div>
                  )}
                  {(currentUser.role === 'mechanic' || currentUser.role === 'admin') && apt.status === 'Confirmé' && (
                    <button 
                      onClick={() => handleStartRepair(apt._id)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 text-blue-500 rounded-lg border border-blue-500/20 hover:bg-blue-600/20 transition-all text-[10px] font-bold uppercase"
                    >
                      Démarrer les travaux
                    </button>
                  )}
                  {(currentUser.role === 'mechanic' || currentUser.role === 'admin') && (
                    <button 
                      onClick={() => handleDelete(apt._id)} 
                      className="p-1.5 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-all ml-1" 
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Booking Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-[#111114] border border-white/10 rounded-2xl p-6 shadow-2xl relative z-10"
            >
              <h2 className="text-xl font-bold text-white mb-6">Réserver une intervention</h2>
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-xs font-bold uppercase tracking-widest">
                  <AlertCircle size={16} /> {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                 <div className="grid grid-cols-2 gap-3">
                   <label className="block space-y-1.5 col-span-2">
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Mécanicien</span>
                     <select
                       value={selectedMechanicId}
                       onChange={(e) => {
                         const v = e.target.value;
                         setSelectedMechanicId(v);
                         if (slotDate) fetchSlots(slotDate, v || undefined);
                       }}
                       className="w-full bg-[#16161A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                     >
                       <option value="">Auto (le premier disponible)</option>
                       {mechanics.map((m: any) => (
                         <option key={m._id} value={m._id}>{m.name}</option>
                       ))}
                     </select>
                   </label>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                   <label className="block space-y-1.5">
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Marque</span>
                     <input type="text" required value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full bg-[#16161A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50" placeholder="ex: BMW" />
                   </label>
                   <label className="block space-y-1.5">
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Modèle</span>
                     <input type="text" required value={model} onChange={(e) => setModel(e.target.value)} className="w-full bg-[#16161A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50" placeholder="ex: M3 G80" />
                   </label>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                   <label className="block space-y-1.5">
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Immatriculation</span>
                     <input type="text" required value={plate} onChange={(e) => setPlate(e.target.value)} className="w-full bg-[#16161A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50" placeholder="AB-123-CD" />
                   </label>
                   <label className="block space-y-1.5">
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Jour</span>
                     <input
                        type="date"
                        required
                        value={slotDate}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSlotDate(v);
                          fetchSlots(v, selectedMechanicId || undefined);
                        }}
                        className="w-full bg-[#16161A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                      />
                      {slotsStatus === 'loading' && <p className="text-[10px] text-blue-500 animate-pulse mt-1">Chargement des créneaux...</p>}
                      {slotsStatus === 'error' && <p className="text-[10px] text-red-500 mt-1">Erreur de chargement des créneaux</p>}
                   </label>
                 </div>

                 <div className="space-y-2">
                   <div className="flex items-center justify-between">
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Créneau</span>
                     {date && (
                       <span className="text-[10px] font-mono text-slate-500">
                         Sélectionné: {new Date(date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                       </span>
                     )}
                   </div>
                   {slots.length === 0 ? (
                     <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs text-slate-500">
                       {slotDate ? "Aucun créneau disponible pour ce jour." : "Choisis un jour pour afficher les créneaux."}
                     </div>
                   ) : (
                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                       {slots.slice(0, 18).map((s) => {
                         const d = new Date(s);
                         const label = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                         const isSelected = date && new Date(date).toISOString() === d.toISOString();
                         return (
                           <button
                             key={s}
                             type="button"
                             onClick={() => {
                               setDate(d.toISOString());
                               checkAvailability(d.toISOString());
                             }}
                             className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                               isSelected
                                 ? "bg-blue-600/20 text-blue-300 border-blue-600/30"
                                 : "bg-[#16161A] text-slate-200 border-white/10 hover:border-blue-500/30"
                             }`}
                           >
                             {label}
                           </button>
                         );
                       })}
                     </div>
                   )}
                   {slots.length > 18 && (
                     <p className="text-[10px] text-slate-600">Astuce: affine avec un mécanicien pour voir plus de créneaux.</p>
                   )}
                 </div>

                 <label className="block space-y-1.5">
                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Description panne / travaux</span>
                   <textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full bg-[#16161A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50 resize-none" placeholder="Décrivez le problème..."></textarea>
                 </label>
                 <div className="flex gap-3 pt-4">
                   <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-bold text-slate-400 hover:bg-white/5 transition-all">Annuler</button>
                   <button type="submit" disabled={!date} className={`flex-1 py-2.5 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-600/20 ${date ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-600/40 cursor-not-allowed'}`}>Confirmer</button>
                 </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Availability Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettings(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-2xl bg-[#111114] border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600/10 rounded-lg text-blue-500"><Clock size={18} /></div>
                    <h2 className="text-xl font-bold text-white">Horaires d'Ouverture</h2>
                 </div>
                 <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-white"><XCircle size={20} /></button>
              </div>

              <div className="space-y-3">
                {["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"].map((dayName, i) => (
                  <div key={i} className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all ${schedules[i].isAvailable ? 'bg-white/5 border-white/10' : 'bg-transparent border-dashed border-white/5 opacity-50'}`}>
                    <div className="w-full sm:w-12 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400">{dayName}</div>
                    <div className="flex-1 flex items-center gap-2 sm:gap-4">
                      <input 
                        type="time" 
                        value={schedules[i].startTime} 
                        onChange={(e) => updateTime(i, 'startTime', e.target.value)}
                        disabled={!schedules[i].isAvailable}
                        className="flex-1 sm:flex-none bg-[#16161A] border border-white/10 rounded-lg px-3 py-2 sm:py-1.5 text-xs text-white outline-none focus:border-blue-500/50" 
                      />
                      <span className="text-slate-600 text-xs">à</span>
                      <input 
                        type="time" 
                        value={schedules[i].endTime} 
                        onChange={(e) => updateTime(i, 'endTime', e.target.value)}
                        disabled={!schedules[i].isAvailable}
                        className="flex-1 sm:flex-none bg-[#16161A] border border-white/10 rounded-lg px-3 py-2 sm:py-1.5 text-xs text-white outline-none focus:border-blue-500/50" 
                      />
                    </div>
                    <button 
                      onClick={() => toggleDay(i)}
                      className={`w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all ${schedules[i].isAvailable ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}
                    >
                      {schedules[i].isAvailable ? 'Ouvert' : 'Fermé'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex gap-3">
                 <button onClick={() => setShowSettings(false)} className="flex-1 py-3 rounded-2xl border border-white/10 font-bold text-slate-400 hover:bg-white/5 transition-all">Annuler</button>
                 <button onClick={saveAvailability} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20">Enregistrer les horaires</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

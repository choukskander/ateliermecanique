import { useState, useEffect } from "react";
import { Car, Calendar, FileText, Bell, MessageSquare, Clock, CheckCircle2, Loader2, Download } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";
import { getSocket } from "../lib/socket";

export default function ClientDashboard({ changeTab, currentUser }: { changeTab: (tab: string) => void, currentUser: any }) {
  const [repairs, setRepairs] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNotif, setShowNotif] = useState<any>(null);

  useEffect(() => {
    fetchData();

    // Socket.io integration for real-time updates
    const socket = getSocket(currentUser.token);
    socket.emit("join_chat", currentUser._id); // join own room to receive notifs

    socket.on("repair_update", () => {
      fetchData(); // Refresh all data when a repair is updated
    });

    socket.on("notification", (notif) => {
      setShowNotif(notif);
      fetchData();
      setTimeout(() => setShowNotif(null), 5000);
    });

    return () => {
      socket.off("repair_update");
      socket.off("notification");
    };
  }, [currentUser]);

  const fetchData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      const [repairsRes, invoicesRes] = await Promise.all([
        axios.get("/api/repairs", config).catch(() => ({ data: [] })),
        axios.get("/api/stats/invoices", config).catch(() => ({ data: [] }))
      ]);
      setRepairs(Array.isArray(repairsRes.data) ? repairsRes.data : []);
      setInvoices(Array.isArray(invoicesRes.data) ? invoicesRes.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintInvoice = (inv: any) => {
    // Basic simulation of downloading/printing
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(`
        <html>
          <head>
            <title>Facture #${inv._id.substring(inv._id.length-8).toUpperCase()}</title>
            <style>
              body { font-family: sans-serif; padding: 40px; color: #333; }
              .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 40px; }
              .details { margin-bottom: 40px; }
              .total { font-size: 24px; font-weight: bold; border-top: 1px solid #ccc; padding-top: 20px; text-align: right; }
              @media print { .no-print { display: none; } }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>FACTURE - MECA-GESTION</h1>
              <p>Référence: #${inv._id.toUpperCase()}</p>
              <p>Date: ${new Date(inv.createdAt).toLocaleDateString()}</p>
            </div>
            <div class="details">
              <p><strong>Client:</strong> ${currentUser.name}</p>
              <p><strong>Statut:</strong> ${inv.status}</p>
              <hr />
              <p>Pièces: ${inv.totalParts.toFixed(2)} €</p>
              <p>Main d'œuvre: ${inv.totalLabor.toFixed(2)} €</p>
            </div>
            <div class="total">
              TOTAL TTC: ${inv.totalTTC.toFixed(2)} €
            </div>
            <div class="no-print" style="margin-top: 50px;">
              <button onclick="window.print()">Imprimer la facture</button>
            </div>
          </body>
        </html>
      `);
      win.document.close();
    }
  };

  const currentRepair = repairs.length > 0 ? repairs[0] : null;
  const vehicle = currentRepair?.appointmentId?.vehicleId;

  const getStatusInfo = (status: string) => {
    const steps = [
      { id: "En attente", label: "Réception" },
      { id: "Diagnostic", label: "Diagnostic" },
      { id: "En réparation", label: "Réparation" },
      { id: "Contrôle", label: "Contrôle" },
      { id: "Prêt", label: "Prêt" }
    ];

    let displayStatus = status;
    if (status === "Attente Pièces") displayStatus = "Diagnostic";
    const currentIdx = steps.findIndex(s => s.id === displayStatus);
    
    return {
      progress: currentIdx === -1 ? 0 : (currentIdx + 1) * 20,
      steps: steps.map((s, i) => ({
        label: s.label,
        status: i < currentIdx ? "completed" : (i === currentIdx ? "current" : "pending")
      }))
    };
  };

  const statusInfo = getStatusInfo(currentRepair?.status || "En attente");

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <Loader2 className="animate-spin text-blue-500" size={40} />
      <p className="text-slate-500 text-sm font-medium animate-pulse">Chargement de votre espace...</p>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {showNotif && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-20 right-4 z-[100] bg-blue-600 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-sm border border-blue-400"
          >
             <div className="p-2 bg-white/20 rounded-lg"><Bell size={20} /></div>
             <div>
               <p className="text-xs font-bold uppercase tracking-widest">{showNotif.title}</p>
               <p className="text-sm font-medium">{showNotif.message}</p>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Client Stats Quick Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#111114] p-5 rounded-2xl border border-white/5 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600/10 rounded-xl text-blue-500">
              <Car size={24} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Votre Véhicule</p>
              <h3 className="text-lg font-bold text-white">
                {vehicle ? `${vehicle.brand} ${vehicle.model}` : "Aucun véhicule"}
              </h3>
            </div>
          </div>
        </div>
        <div className="bg-[#111114] p-5 rounded-2xl border border-white/5 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-600/10 rounded-xl text-green-500">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Factures</p>
              <h3 className="text-lg font-bold text-white">{invoices.length} Émise(s)</h3>
            </div>
          </div>
        </div>
        <div
          onClick={() => changeTab("invoices")}
          className="bg-[#111114] p-5 rounded-2xl border border-white/5 shadow-xl hover:border-blue-500/30 transition-all cursor-pointer flex items-center justify-between group"
        >
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Factures</p>
            <h3 className="text-lg font-bold text-white">Voir mes factures</h3>
          </div>
          <FileText className="text-slate-500 group-hover:text-blue-400 transition-colors" size={28} />
        </div>
        <div 
          onClick={() => changeTab("appointments")}
          className="bg-blue-600 p-5 rounded-2xl shadow-xl shadow-blue-600/20 flex items-center justify-between group cursor-pointer"
        >
          <div>
            <p className="text-[10px] uppercase tracking-widest text-blue-200 font-bold">Rendez-vous</p>
            <h3 className="text-lg font-bold text-white">Prendre RDV</h3>
          </div>
          <Calendar className="text-white opacity-50 group-hover:opacity-100 transition-opacity" size={28} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Tracking */}
        <section className="lg:col-span-2 space-y-4">
          {currentRepair ? (
            <div className="bg-[#111114] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div>
                  <h2 className="text-lg font-bold text-white">Suivi de Réparation</h2>
                  <p className="text-xs text-slate-500 mt-1">Mise à jour en temps réel par votre mécanicien</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    currentRepair.status === 'Prêt' ? 'bg-green-600/20 text-green-400 border-green-600/30' : 'bg-blue-600/20 text-blue-400 border-blue-600/30'
                  }`}>
                    {currentRepair.status}
                  </span>
                  <span className="text-[10px] text-slate-600 font-mono mt-1">MAJ: {new Date(currentRepair.updatedAt).toLocaleTimeString()}</span>
                </div>
              </div>
              
              <div className="p-6 space-y-8">
                {/* Progress Bar Area */}
                <div className="relative pt-4">
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${statusInfo.progress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]"
                    />
                  </div>
                  
                  <div className="flex justify-between mt-6 relative">
                    {statusInfo.steps.map((step, i) => (
                      <div key={i} className="flex flex-col items-center gap-2 z-10 w-16 text-center">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors duration-500 ${
                          step.status === 'completed' ? 'bg-blue-600 border-blue-600' : 
                          step.status === 'current' ? 'bg-[#111114] border-blue-600 animate-pulse' : 
                          'bg-slate-800 border-slate-700'
                        }`}>
                          {step.status === 'completed' && <CheckCircle2 size={10} className="text-white" />}
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-tighter ${
                          step.status === 'completed' ? 'text-white' : 
                          step.status === 'current' ? 'text-blue-400' : 
                          'text-slate-600'
                        }`}>{step.label}</span>
                      </div>
                    ))}
                    {/* Background line for steps */}
                    <div className="absolute top-2 left-8 right-8 h-[1px] bg-white/5 -z-0"></div>
                  </div>
                </div>

                {/* Maintenance Details */}
                <div className="bg-white/5 rounded-xl border border-white/5 p-4 mt-8">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Travaux {currentRepair.status === 'Prêt' ? 'Effectués' : 'en cours'}</h4>
                  <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {currentRepair.worksDone || "Diagnostic en attente..."}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#111114] rounded-2xl border border-white/10 p-12 text-center shadow-2xl">
              <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/5">
                <Clock className="text-slate-600" size={32} />
              </div>
              <h3 className="text-lg font-bold text-white">Aucune intervention en cours</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">Vos réparations apparaîtront ici dès que votre véhicule sera pris en charge par l'atelier.</p>
              <button 
                onClick={() => changeTab("appointments")}
                className="mt-6 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
              >
                Prendre rendez-vous
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#111114] p-4 rounded-xl border border-white/5">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Expert en charge</h4>
              <p className="text-sm text-white font-medium">{currentRepair?.mechanicId?.name || "Assignation en cours"}</p>
              <p className="text-[10px] text-slate-600 mt-1">Expert technique AutoFlow certified</p>
            </div>
            <div className="bg-[#111114] p-4 rounded-xl border border-white/5">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Estimation Livraison</h4>
              <p className="text-sm text-green-500 font-bold italic">
                {currentRepair?.status === 'Prêt' ? "Prêt à être récupéré !" : "Calcul en cours..."}
              </p>
              <p className="text-[10px] text-slate-600 mt-1 text-right">Basé sur le planning actuel</p>
            </div>
          </div>
        </section>

        {/* Invoices & Support */}
        <section className="space-y-6">
          <div className="bg-[#111114] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-tight">Vos Factures</h2>
              <FileText className="text-slate-600" size={18} />
            </div>
            <div className="p-2">
              {invoices.length === 0 ? (
                <div className="p-8 text-center text-slate-600 text-[10px] uppercase tracking-widest font-bold">Aucune facture</div>
              ) : (
                invoices.map((inv, i) => (
                  <div key={i} className="p-3 hover:bg-white/5 rounded-xl transition-colors group flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white group-hover:text-blue-400">#{inv._id.substring(inv._id.length-8).toUpperCase()}</p>
                      <p className="text-[10px] text-slate-500">{new Date(inv.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-200">{inv.totalTTC.toFixed(2)}€</p>
                        <p className={`text-[9px] font-bold uppercase ${inv.status === 'Payée' ? 'text-green-500' : 'text-orange-500'}`}>{inv.status}</p>
                      </div>
                      <button 
                        onClick={() => handlePrintInvoice(inv)}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div 
            onClick={() => changeTab("chat")}
            className="bg-gradient-to-br from-indigo-900/20 to-blue-900/20 p-5 rounded-2xl border border-white/10 shadow-xl group cursor-pointer hover:from-indigo-900/40 hover:to-blue-900/40 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest">Support Live</span>
                </div>
                <h3 className="text-lg font-bold text-white leading-tight">Besoin de parler <br />à un expert ?</h3>
                <button 
                  className="bg-white text-black px-4 py-2 rounded-lg font-bold text-xs hover:bg-slate-200 transition-colors flex items-center gap-2 mt-4"
                >
                  <MessageSquare size={14} /> Ouvrir le Chat
                </button>
              </div>
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                <MessageSquare className="text-blue-400" size={32} />
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#111114] border border-white/5 rounded-xl">
             <div className="flex items-center gap-3">
               <Bell className="text-orange-400" size={16} />
               <p className="text-xs text-slate-400 font-medium">Votre sécurité est notre priorité absolue.</p>
             </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}

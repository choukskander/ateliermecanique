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
    const workshopInfo = {
      name: "MECA-GESTION ATELIER",
      address: "Route de Gammarth, La Marsa, Tunisie",
      mf: "1452369/G/A/M/000",
      phone: "+216 22 123 456",
      email: "atelier@mecagestion.tn",
      site: "www.mecagestion.tn"
    };

    const clientInfo = {
      name: currentUser.name,
      address: currentUser.address || "Adresse non renseignée",
      mf: currentUser.matriculeFiscale || "N/A"
    };

    const totalHT = inv.totalHT || (inv.totalParts + inv.totalLabor);
    const tvaAmount = inv.tvaAmount || (totalHT * 0.19);
    const timbre = inv.timbreFiscal || 1.000;
    const totalTTC = inv.totalTTC || (totalHT + tvaAmount + timbre);

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Facture #${String(inv._id).slice(-8).toUpperCase()}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
              body { font-family: 'Inter', sans-serif; padding: 40px; color: #1a1a1a; line-height: 1.4; }
              .header-section { display: flex; justify-content: space-between; margin-bottom: 40px; }
              .company-info h1 { margin: 0; color: #2563eb; font-size: 24px; text-transform: uppercase; }
              .company-info p { margin: 2px 0; font-size: 11px; color: #666; }
              
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
              .info-box { border: 2px solid #000; padding: 15px; border-radius: 4px; }
              .info-box-title { font-weight: bold; border-bottom: 1px solid #000; margin-bottom: 10px; padding-bottom: 5px; text-transform: uppercase; font-size: 13px; }
              .info-box p { margin: 4px 0; font-size: 12px; }

              table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              th { background: #f8fafc; border: 1.5px solid #000; padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase; }
              td { border: 1.5px solid #000; padding: 10px; font-size: 12px; }
              .col-desc { width: 50%; }
              .col-price, .col-qty, .col-total { text-align: right; }

              .summary-wrapper { display: flex; justify-content: flex-end; }
              .summary-table { width: 300px; }
              .summary-table div { display: flex; justify-content: space-between; border: 1.5px solid #000; padding: 8px 12px; margin-top: -1.5px; font-size: 12px; }
              .summary-table .total-row { font-weight: bold; background: #f1f5f9; font-size: 14px; }

              @media print { .no-print { display: none; } }
              .print-btn { background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header-section">
              <div class="company-info">
                <h1>${workshopInfo.name}</h1>
                <p>${workshopInfo.address}</p>
                <p><strong>Matricule Fiscale:</strong> ${workshopInfo.mf}</p>
              </div>
              <div class="company-contact" style="text-align: right;">
                <p style="font-size: 11px; margin: 2px 0;"><strong>Tél:</strong> ${workshopInfo.phone}</p>
                <p style="font-size: 11px; margin: 2px 0;"><strong>Email:</strong> ${workshopInfo.email}</p>
                <p style="font-size: 11px; margin: 2px 0;"><strong>Site:</strong> ${workshopInfo.site}</p>
              </div>
            </div>

            <div class="info-grid">
              <div class="info-box">
                <div class="info-box-title">Détails Facture</div>
                <p><strong>Date:</strong> ${new Date(inv.createdAt).toLocaleDateString('fr-FR')}</p>
                <p><strong>Facture N°:</strong> FA${new Date(inv.createdAt).getFullYear().toString().slice(-2)}${String(inv._id).slice(-6).toUpperCase()}</p>
              </div>
              <div class="info-box">
                <div class="info-box-title">Client</div>
                <p><strong>Nom:</strong> ${clientInfo.name}</p>
                <p><strong>Adresse:</strong> ${clientInfo.address}</p>
                <p><strong>Matricule Fiscale:</strong> ${clientInfo.mf}</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th class="col-desc">Désignation</th>
                  <th class="col-price">Prix Unitaire</th>
                  <th class="col-qty">Quantité</th>
                  <th class="col-total">Total</th>
                </tr>
              </thead>
              <tbody>
                ${inv.repairId?.partsUsed ? inv.repairId.partsUsed.map((pu: any) => `
                  <tr>
                    <td>${pu.partId?.name || 'Pièce'} (${pu.partId?.reference || 'N/A'})</td>
                    <td class="col-price">${Number(pu.partId?.price || 0).toFixed(3)} DT</td>
                    <td class="col-qty">${pu.quantity}</td>
                    <td class="col-total">${(Number(pu.partId?.price || 0) * pu.quantity).toFixed(3)} DT</td>
                  </tr>
                `).join('') : ''}
                <tr>
                  <td>Main d'œuvre / Services techniques</td>
                  <td class="col-price">${Number(inv.totalLabor).toFixed(3)} DT</td>
                  <td class="col-qty">1</td>
                  <td class="col-total">${Number(inv.totalLabor).toFixed(3)} DT</td>
                </tr>
                <!-- Empty rows for spacing -->
                ${Array(Math.max(0, 4 - (inv.repairId?.partsUsed?.length || 0))).fill(0).map(() => `
                  <tr style="height: 30px;"><td></td><td></td><td></td><td></td></tr>
                `).join('')}
              </tbody>
            </table>

            <div class="summary-wrapper">
              <div class="summary-table">
                <div>
                  <span>Total HT</span>
                  <span>${totalHT.toFixed(3)} DT</span>
                </div>
                <div>
                  <span>TVA (19%)</span>
                  <span>${tvaAmount.toFixed(3)} DT</span>
                </div>
                <div>
                  <span>Timbre Fiscal</span>
                  <span>${timbre.toFixed(3)} DT</span>
                </div>
                <div class="total-row">
                  <span>TOTAL TTC</span>
                  <span>${totalTTC.toFixed(3)} DT</span>
                </div>
              </div>
            </div>

            <div class="no-print">
              <button class="print-btn" onclick="window.print()">Imprimer la facture (PDF)</button>
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

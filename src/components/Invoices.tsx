import React, { useEffect, useState } from "react";
import axios from "axios";
import { FileText, Loader2, CheckCircle2, Download } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Invoices({ currentUser }: { currentUser: any }) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [paying, setPaying] = useState(false);

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

  const handleMarkPaid = async (id: string) => {
    if (!window.confirm("Marquer cette facture comme payée ?")) return;
    setPaying(true);
    try {
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      await axios.patch(`/api/invoices/${id}/pay`, {}, config);
      fetchInvoices();
      setSelected({ ...selected, status: "Payée" });
    } catch (e) {
      alert("Erreur lors de la mise à jour.");
    } finally {
      setPaying(false);
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

    const client = inv.repairId?.appointmentId?.clientId;
    const clientInfo = {
      name: client?.name || "Client",
      address: client?.address || "Adresse non renseignée",
      mf: client?.matriculeFiscale || "N/A"
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
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Pièces</span>
                    <span className="text-sm font-bold text-white">{Number(selected.totalParts || 0).toFixed(2)}€</span>
                  </div>
                  
                  {selected.repairId?.partsUsed && selected.repairId.partsUsed.length > 0 && (
                    <div className="pt-3 border-t border-white/5 space-y-2">
                      {selected.repairId.partsUsed.map((pu: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-[11px]">
                          <div className="flex flex-col">
                            <span className="text-slate-200 font-medium">{pu.partId?.name || "Pièce inconnue"}</span>
                            <span className="text-slate-500 font-mono text-[9px] uppercase">{pu.partId?.reference || "REF-N/A"}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 mr-2">x{pu.quantity}</span>
                            <span className="text-slate-200 font-bold">{(Number(pu.partId?.price || 0) * pu.quantity).toFixed(2)}€</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Main d’œuvre</span>
                  <span className="text-sm font-bold text-white">{Number(selected.totalLabor || 0).toFixed(2)}€</span>
                </div>
                <div className="p-4 rounded-xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-between">
                  <span className="text-xs text-blue-300 font-bold uppercase tracking-widest">Total TTC</span>
                  <span className="text-lg font-extrabold text-white">{Number(selected.totalTTC || 0).toFixed(2)}€</span>
                </div>

                <div className="flex gap-2">
                   <button
                     onClick={() => handlePrintInvoice(selected)}
                     className="flex-1 py-3 bg-blue-600/10 border border-blue-600/20 rounded-xl text-xs font-bold text-blue-500 hover:bg-blue-600/20 transition-all flex items-center justify-center gap-2"
                   >
                     <Download size={14} /> Télécharger PDF
                   </button>

                   {selected.status !== "Payée" && (currentUser.role === "admin" || currentUser.role === "mechanic") && (
                     <button
                       disabled={paying}
                       onClick={() => handleMarkPaid(selected._id)}
                       className="flex-1 py-3 bg-green-600/10 border border-green-600/20 rounded-xl text-xs font-bold text-green-500 hover:bg-green-600/20 transition-all flex items-center justify-center gap-2"
                     >
                       {paying ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                       Marquer payée
                     </button>
                   )}
                </div>
                {selected.status === "Payée" && (
                  <div className="flex items-center gap-2 text-green-500 text-xs font-bold uppercase tracking-wider justify-center mt-2">
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


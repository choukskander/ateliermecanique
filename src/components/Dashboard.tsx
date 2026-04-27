import React, { useState, useEffect } from "react";
import { Clock, CheckCircle2, AlertCircle, Settings, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import axios from "axios";

export default function Dashboard({ currentUser }: { currentUser: any }) {
  const [stats, setStats] = useState<any>(null);
  const [recentWork, setRecentWork] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      const [statsRes, recentRes] = await Promise.all([
        axios.get("/api/stats/summary", config),
        axios.get("/api/stats/recent", config)
      ]);
      setStats(statsRes.data);
      setRecentWork(recentRes.data);
    } catch (err) {
      console.error("Error fetching dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  const statItems = stats ? [
    { label: "Mes Travaux", val: stats.repairsInProgress.toString().padStart(2, '0'), color: "text-blue-500", icon: Clock },
    { label: "Total Atelier", val: stats.totalActiveRepairs.toString().padStart(2, '0'), color: "text-slate-300", icon: CheckCircle2 },
    { label: "Alerte Stock", val: stats.lowStockParts.toString().padStart(2, '0'), color: "text-orange-500", icon: AlertCircle },
    { label: "Revenu Mensuel", val: stats.monthlyRevenue, color: "text-green-500", icon: Settings },
  ] : [
    { label: "Mes Travaux", val: "--", color: "text-blue-500", icon: Clock },
    { label: "Total Atelier", val: "--", color: "text-slate-300", icon: CheckCircle2 },
    { label: "Alerte Stock", val: "--", color: "text-orange-500", icon: AlertCircle },
    { label: "Revenu Mensuel", val: "--", color: "text-green-500", icon: Settings },
  ];

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statItems.map((stat, i) => (
          <div key={i} className="bg-[#16161A] p-4 rounded-xl border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-500 text-xs font-medium">{stat.label}</p>
              <stat.icon className={`w-4 h-4 ${stat.color} opacity-40`} />
            </div>
            <p className={`text-xl md:text-2xl font-bold ${stat.color}`}>{stat.val}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#111114] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        <div className="px-4 py-3 bg-white/5 border-b border-white/5">
          <h2 className="text-lg font-bold text-white">Atelier : Travaux récents</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5">
              <tr className="text-[10px] md:text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Véhicule</th>
                <th className="px-4 py-3 hidden md:table-cell">Client</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Dernière MAJ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentWork.length === 0 ? (
                <tr>
                   <td colSpan={4} className="px-4 py-8 text-center text-slate-500 italic text-sm">Aucun travail récent enregistré</td>
                </tr>
              ) : (
                recentWork.map((repair, i) => {
                  const apt = repair.appointmentId || {};
                  const vehicle = apt.vehicleId || {};
                  const client = apt.clientId || {};
                  
                  return (
                    <tr key={i} className="hover:bg-white/[0.02] group">
                      <td className="px-4 py-4 min-w-[140px]">
                        <p className="text-sm font-semibold text-white">{vehicle.brand} {vehicle.model}</p>
                        <p className="text-[10px] font-mono text-slate-500 uppercase">{vehicle.licensePlate}</p>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <p className="text-sm text-slate-300">{client.name}</p>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase inline-block w-full max-w-[90px] ${
                          repair.status === 'Prêt' ? 'text-green-400 border-green-600/30 bg-green-600/10' :
                          repair.status === 'En cours' ? 'text-blue-400 border-blue-600/30 bg-blue-600/10' :
                          'text-slate-400 border-slate-600/30 bg-slate-600/10'
                        }`}>
                          {repair.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <p className="text-[10px] text-slate-500 font-mono">
                          {new Date(repair.updatedAt).toLocaleDateString()}
                        </p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

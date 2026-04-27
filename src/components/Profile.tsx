import React, { useState } from "react";
import { User as UserIcon, Mail, Phone, Shield, Lock, Save, Loader2, Key, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";

export default function Profile({ currentUser, setAuthData }: { currentUser: any, setAuthData: (data: any) => void }) {
  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    if (password && password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      setLoading(false);
      return;
    }

    try {
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      const res = await axios.patch("/api/users/profile", { 
        name, 
        phone,
        ...(password ? { password } : {})
      }, config);
      
      setAuthData(res.data);
      localStorage.setItem("meca_auth", JSON.stringify(res.data));
      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur de mise à jour");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div className="flex items-center gap-6 p-8 bg-[#111114] border border-white/5 rounded-3xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-3xl -mr-20 -mt-20 rounded-full group-hover:bg-blue-600/10 transition-all"></div>
        <div className="relative">
          <div className="w-24 h-24 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-4xl font-bold text-blue-500 shadow-xl uppercase">
            {currentUser.name.substring(0, 2)}
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#111114] border border-white/10 rounded-xl flex items-center justify-center text-blue-500 shadow-lg group-hover:scale-110 transition-transform">
             <Shield size={16} />
          </div>
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-white leading-tight">{currentUser.name}</h2>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
              currentUser.role === 'admin' ? 'text-red-400 border-red-500/20 bg-red-500/5' :
              currentUser.role === 'mechanic' ? 'text-blue-400 border-blue-500/20 bg-blue-500/5' :
              'text-green-400 border-green-500/20 bg-green-500/5'
            }`}>
              {currentUser.role} Account
            </span>
            <span className="text-xs text-slate-500">Membre depuis {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-[#111114] border border-white/5 rounded-3xl p-8 shadow-xl">
             <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-blue-600/10 rounded-lg text-blue-500"><UserIcon size={18} /></div>
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Informations Personnelles</h3>
             </div>

             <form onSubmit={handleUpdate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Nom Complet</label>
                    <div className="relative group">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={17} />
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-[#16161A] border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white outline-none focus:border-blue-500/50 transition-all font-medium" 
                        placeholder="Votre nom" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2 opacity-60">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Email (Non modifiable)</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={17} />
                      <input 
                        type="email" 
                        disabled 
                        value={currentUser.email} 
                        className="w-full bg-[#0A0A0B] border border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-slate-500 cursor-not-allowed outline-none font-medium" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Téléphone</label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={17} />
                      <input 
                        type="tel" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-[#16161A] border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white outline-none focus:border-blue-500/50 transition-all font-medium" 
                        placeholder="+216 -- --- ---" 
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-white/5 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500"><Lock size={18} /></div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Sécurité</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Nouveau mot de passe</label>
                      <div className="relative group">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={17} />
                        <input 
                          type="password" 
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-[#16161A] border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white outline-none focus:border-blue-500/50 transition-all font-medium" 
                          placeholder="Laisser vide pour ne pas changer" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Confirmer</label>
                      <div className="relative group">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={17} />
                        <input 
                          type="password" 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full bg-[#16161A] border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white outline-none focus:border-blue-500/50 transition-all font-medium" 
                          placeholder="Répétez le mot de passe" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-8 border-t border-white/5">
                   <div className="flex-1">
                      <AnimatePresence>
                        {success && (
                          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-green-500 text-xs font-bold uppercase tracking-widest">
                            <CheckCircle2 size={14} /> Profil mis à jour avec succès
                          </motion.div>
                        )}
                        {error && (
                          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="text-red-500 text-xs font-bold uppercase tracking-widest">
                            {error}
                          </motion.div>
                        )}
                      </AnimatePresence>
                   </div>
                   <button 
                    type="submit" 
                    disabled={loading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                   >
                     {loading ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Enregistrer les modifications</>}
                   </button>
                </div>
             </form>
          </div>
        </div>

        <div className="space-y-6">
           <div className="bg-[#111114] border border-white/5 rounded-3xl p-6 space-y-4">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Statistiques du compte</h4>
              <div className="flex justify-between items-center py-3 border-b border-white/5">
                 <span className="text-xs text-slate-400">Total Interventions</span>
                 <span className="text-sm font-bold text-white">24</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/5">
                 <span className="text-xs text-slate-400">Dernier rendez-vous</span>
                 <span className="text-xs font-bold text-white">Hier, 14:00</span>
              </div>
              <div className="flex justify-between items-center py-3">
                 <span className="text-xs text-slate-400">Qualité Support</span>
                 <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>)}
                 </div>
              </div>
           </div>

           <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-600/10">
              <h3 className="font-bold text-lg mb-2">AutoFlow Prime</h3>
              <p className="text-xs text-white/70 leading-relaxed mb-4">Support prioritaire et diagnostic gratuit à chaque visite pour les membres Skander Chouk.</p>
              <div className="w-full py-2 bg-white/10 backdrop-blur-md rounded-xl text-center text-[10px] font-bold uppercase tracking-widest border border-white/20">Active Member</div>
           </div>
        </div>
      </div>
    </motion.div>
  );
}

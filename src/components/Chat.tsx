import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Loader2, Users, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";
import { getSocket } from "../lib/socket";

export default function Chat({ currentUser }: { currentUser: any }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingClients, setFetchingClients] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // We will now only use real staff accounts from the database
  const mechanicView = currentUser.role !== 'client';
  const chatSelfId = currentUser._id;
  const socket = getSocket(currentUser.token);

  useEffect(() => {
    if (currentUser) {
      socket.emit("join_chat", chatSelfId);
      
      if (currentUser.role === 'client') {
        fetchStaff();
        fetchClientMechanic();
      } else {
        fetchClients();
      }
    }

    socket.on("receive_message", (message) => {
      // If I am staff and looking at a client
      const staffLookingAtClient = currentUser.role !== 'client' && selectedUser && (
        message.senderId === selectedUser._id || 
        message.receiverId === selectedUser._id
      );

      // If I am a client, ANY message I receive is relevant (as I talk to the workshop/staff team)
      const clientReceiving = currentUser.role === 'client' && message.receiverId === chatSelfId;
      
      if (staffLookingAtClient || clientReceiving) {
        setMessages((prev) => [...prev, message]);
      }
    });

    return () => {
      socket.off("receive_message");
    };
  }, [currentUser, selectedUser?._id]);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages();
    }
  }, [selectedUser?._id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchClients = async () => {
    setFetchingClients(true);
    try {
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      const res = await axios.get("/api/users/clients", config);
      setClients(res.data);
    } catch (err) {
      console.error("Error fetching clients", err);
    } finally {
      setFetchingClients(false);
    }
  };

  const fetchStaff = async () => {
    setFetchingClients(true);
    try {
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      const res = await axios.get("/api/users/staff", config);
      setClients(res.data);
    } catch (err) {
      console.error("Error fetching staff", err);
    } finally {
      setFetchingClients(false);
    }
  };

  const fetchClientMechanic = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      const res = await axios.get("/api/repairs", config);
      const repairs = res.data || [];
      const latest = repairs[0];
      const mech = latest?.mechanicId;
      if (mech && mech._id) setSelectedUser(mech);
    } catch (e) {
      // Keep null or wait for staff list
    }
  };

  const fetchMessages = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      const response = await axios.get(`/api/messages?otherId=${selectedUser._id}`, config);
      setMessages(response.data);
    } catch (err) {
      console.error("Erreur chargement messages", err);
    } finally {
      setLoading(false);
    }
  };

  const handeSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedUser) return;

    const newMessage = {
      receiverId: selectedUser._id,
      content: input,
    };

    try {
      const config = { headers: { Authorization: `Bearer ${currentUser.token}` } };
      const response = await axios.post("/api/messages", newMessage, config);
      
      socket.emit("send_message", response.data);
      setMessages((prev) => [...prev, response.data]);
      setInput("");
    } catch (err) {
      console.error("Erreur envoi message", err);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-[#111114] rounded-2xl border border-white/10 flex flex-col md:flex-row h-[600px] overflow-hidden shadow-2xl overflow-x-hidden"
    >
      {/* Sidebar - Now visible for both roles */}
      <AnimatePresence>
        {(!selectedUser || (selectedUser && window.innerWidth > 768)) && (
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className={`w-full md:w-64 bg-white/[0.02] border-r border-white/5 flex flex-col ${selectedUser ? 'hidden md:flex' : 'flex'}`}
          >
            <div className="p-4 border-b border-white/5 bg-white/[0.02]">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Users size={14} /> {currentUser.role === 'client' ? 'Votre Équipe' : 'Vos Clients'}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {fetchingClients ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-600" size={20} /></div>
              ) : (
                clients.map((user) => (
                  <button 
                    key={user._id}
                    onClick={() => setSelectedUser(user)}
                    className={`w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors border-b border-white/5 text-left ${selectedUser?._id === user._id ? 'bg-blue-600/10 border-r-2 border-r-blue-500' : ''}`}
                  >
                    <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs uppercase text-slate-400">
                      {user.name?.substring(0, 2) || "??"}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-bold text-white truncate">{user.name || "Inconnu"}</p>
                      <p className="text-[10px] text-slate-500 truncate italic">
                        {user.role === 'admin' ? 'Atelier / Support' : user.role === 'mechanic' ? 'Expert Technique' : 'Client'}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-[#111114] ${!selectedUser ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
        {!selectedUser ? (
          <div className="flex flex-col items-center gap-4 text-slate-600">
             <MessageSquare size={48} className="opacity-20" />
             <p className="text-sm font-medium">
               {currentUser.role === 'client' ? 'Sélectionnez un membre de l\'équipe pour discuter' : 'Sélectionnez un client pour démarrer le chat'}
             </p>
          </div>
        ) : (
          <>
            <div className="px-6 py-4 bg-white/5 border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedUser(null)} className="md:hidden text-slate-400 hover:text-white mr-2">
                  <ChevronLeft size={20} />
                </button>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-sm uppercase text-blue-400">
                      {selectedUser.name?.substring(0, 2) || "??"}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-[3px] border-[#111114] rounded-full"></div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-none">{selectedUser.name || "Inconnu"}</h3>
                  <p className="text-[10px] text-green-500 font-medium uppercase mt-1">En ligne</p>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scroll-smooth">
              {loading ? (
                  <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
              ) : (
                  messages.map((m, i) => (
                      <div key={i} className={`flex flex-col gap-1 ${m.senderId === chatSelfId ? 'items-end' : 'items-start'}`}>
                        <div className={`p-3.5 rounded-2xl max-w-[85%] text-sm leading-relaxed ${
                          m.senderId === chatSelfId 
                            ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-600/10' 
                            : 'bg-white/5 text-slate-300 rounded-tl-none border border-white/5'
                        }`}>
                          {m.content}
                        </div>
                        <p className="text-[9px] text-slate-600 px-2">
                          {new Date(m.createdAt || m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                  ))
              )}
              {messages.length === 0 && !loading && (
                <div className="h-full flex flex-col items-center justify-center opacity-30 gap-2">
                   <MessageSquare className="text-slate-400" size={32} />
                   <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Début de la conversation</p>
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            <form onSubmit={handeSendMessage} className="p-4 bg-[#0F0F12] border-t border-white/5 shrink-0">
              <div className="flex gap-2 items-center bg-[#070708] border border-white/10 rounded-xl pl-5 pr-2 py-2 focus-within:border-blue-500/50 transition-all shadow-inner">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Écrire votre message..." 
                  className="bg-transparent border-none outline-none text-sm text-white flex-1 placeholder:text-slate-600 font-medium"
                />
                <button 
                  type="submit"
                  disabled={!input.trim()}
                  className="bg-blue-600 p-2 rounded-lg text-white shadow-lg hover:bg-blue-500 disabled:opacity-50 transition-all active:scale-90"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </motion.div>
  );
}

import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Settings, 
  MessageSquare, 
  Package, 
  FileText,
  Calendar, 
  Menu,
  X,
  User,
  LogOut,
  Bell,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";
import { getSocket, resetSocket } from "./lib/socket";

axios.defaults.baseURL = import.meta.env.VITE_API_URL || "";

// Section Components
import Dashboard from "./components/Dashboard";
import Appointments from "./components/Appointments";
import Inventory from "./components/Inventory";
import Chat from "./components/Chat";
import Profile from "./components/Profile";
import Workshop from "./components/Workshop";
import ClientDashboard from "./components/ClientDashboard";
import Invoices from "./components/Invoices";
import Login from "./components/Login";
import Register from "./components/Register";

export default function App() {
  const [authData, setAuthData] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isScrolled, setIsScrolled] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const savedAuth = localStorage.getItem("meca_auth");
    if (savedAuth) {
      const data = JSON.parse(savedAuth);
      setAuthData(data);
      const socket = getSocket(data.token);
      socket.emit("join_chat", data._id);
    }

    // Axios interceptor for 401s
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          handleLogout();
        }
        return Promise.reject(error);
      }
    );

    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  useEffect(() => {
    if (authData) {
      const socket = getSocket(authData.token);
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
      fetchNotifications();
      socket.on("notification", (notif) => {
        setNotifications(prev => [notif, ...prev]);
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(notif.title, { body: notif.message });
        }
      });
    }
    return () => {
      const socket = getSocket(authData?.token);
      socket.off("notification");
    };
  }, [authData]);

  const fetchNotifications = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${authData.token}` } };
      const res = await axios.get("/api/notifications", config);
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const markNotificationsRead = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${authData.token}` } };
      await axios.patch("/api/notifications/read", {}, config);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("meca_auth");
    resetSocket();
    setAuthData(null);
  };

  if (!authData) {
    return showLogin 
      ? <Login setAuthData={setAuthData} onToggleRegister={() => setShowLogin(false)} />
      : <Register setAuthData={setAuthData} onToggleLogin={() => setShowLogin(true)} />;
  }

  const role = authData.role; // 'mechanic', 'admin', or 'client'

  const menuItems = role === "mechanic" || role === "admin" ? [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "appointments", label: "Rendez-vous", icon: Calendar, badge: 12 },
    { id: "workshop", label: "Atelier", icon: Settings },
    { id: "stock", label: "Stock Pièces", icon: Package },
    { id: "invoices", label: "Factures", icon: FileText },
    { id: "chat", label: "Chat Live", icon: MessageSquare, alert: true },
  ] : [
    { id: "dashboard", label: "Mon Suivi", icon: LayoutDashboard },
    { id: "workshop", label: "Ma Réparation", icon: Settings },
    { id: "appointments", label: "Mes Réser.", icon: Calendar },
    { id: "invoices", label: "Mes Factures", icon: FileText },
    { id: "chat", label: "Message", icon: MessageSquare },
  ];

  const renderContent = () => {
    if (activeTab === "profile") return <Profile currentUser={authData} setAuthData={setAuthData} />;
    
    if (role === "client" && activeTab === "dashboard") return <ClientDashboard changeTab={setActiveTab} currentUser={authData} />;

    switch (activeTab) {
      case "dashboard": return <Dashboard currentUser={authData} />;
      case "workshop": return <Workshop currentUser={authData} />;
      case "appointments": return <Appointments currentUser={authData} />;
      case "stock": return <Inventory currentUser={authData} />;
      case "invoices": return <Invoices currentUser={authData} />;
      case "chat": return <Chat currentUser={authData} />;
      default: return <Dashboard currentUser={authData} />;
    }
  };

  const getTitle = () => {
    if (activeTab === 'profile') return 'Mon Profil';
    if (role === "client" && activeTab === "dashboard") return "Espace Client";
    const item = menuItems.find(i => i.id === activeTab);
    return item ? item.label : "Dashboard";
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-200 font-sans flex flex-col md:flex-row overflow-x-hidden">
      {/* Mobile Header */}
      <header className={`md:hidden fixed top-0 w-full h-16 z-50 transition-all duration-300 border-b border-white/10 ${isScrolled ? "bg-[#111114]/95 backdrop-blur-md" : "bg-[#111114]"}`}>
        <div className="flex items-center justify-between px-4 h-full">
          <div className="flex items-center gap-2" onClick={() => setActiveTab('dashboard')}>
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white italic uppercase">AutoFlow</span>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-400 hover:text-white transition-colors">
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Sidebar (Responsive) */}
      <AnimatePresence>
        {(isSidebarOpen || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
          <motion.nav 
            initial={{ x: -250 }}
            animate={{ x: 0 }}
            exit={{ x: -250 }}
            className={`fixed md:relative z-40 w-64 h-full border-r border-white/10 bg-[#0F0F12] flex flex-col p-4 shrink-0 overflow-y-auto transition-transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
          >
            {/* Desktop Logo */}
            <div className="hidden md:flex items-center gap-3 mb-8 px-2 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-white italic">
                AUTOFLOW
                <span className="text-blue-500 font-normal ml-1 text-sm not-italic uppercase tracking-[0.2em]">Workshop</span>
              </span>
            </div>

            <div className="space-y-1">
              <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Management</div>
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                    activeTab === item.id 
                      ? "bg-blue-600/10 text-blue-400 border border-blue-600/20" 
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto bg-slate-800 text-[10px] px-1.5 py-0.5 rounded text-slate-400 group-hover:text-white">{item.badge}</span>
                  )}
                  {item.alert && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-8 space-y-1">
              <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">User Settings</div>
              <button 
                onClick={() => {
                  setActiveTab('profile');
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                    activeTab === 'profile' 
                      ? "bg-blue-600/10 text-blue-400 border border-blue-600/20" 
                      : "text-slate-400 hover:bg-white/5"
                  }`}
              >
                <User className="w-4 h-4" />
                <span className="text-sm">Mon Profil</span>
              </button>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/5 mt-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Déconnexion</span>
              </button>
            </div>

            <div className="mt-auto pt-8">
                <p className="text-center text-[10px] uppercase tracking-[0.2em] text-slate-700 font-mono">v1.0.4-PROD</p>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${role === 'mechanic' || role === 'admin' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                  <p className="text-[9px] uppercase tracking-wider text-slate-600 font-bold">{role}</p>
                </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 bg-[#0A0A0B] md:h-screen md:overflow-y-auto overflow-x-hidden">
        {/* Top Header Desktop */}
        <header className="hidden md:flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">{getTitle()}</h1>
            <p className="text-sm text-slate-500 font-medium">AutoFlow MERN Workshop System</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) markNotificationsRead();
                }}
                className="p-2.5 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 relative text-slate-400 hover:text-white transition-all"
              >
                <Bell size={18} />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 border-2 border-[#0A0A0B] rounded-full"></span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-80 bg-[#111114] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Notifications</h3>
                      <button onClick={() => setShowNotifications(false)} className="text-slate-600 hover:text-white"><X size={14} /></button>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto divide-y divide-white/5">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-600 text-xs italic">Aucune notification</div>
                      ) : (
                        notifications.map((n: any, i) => (
                          <div key={i} className={`p-4 hover:bg-white/[0.02] transition-colors ${!n.read ? 'bg-blue-500/5' : ''}`}>
                             <p className="text-xs font-bold text-white mb-1">{n.title}</p>
                             <p className="text-[10px] text-slate-400 leading-normal">{n.message}</p>
                             <p className="text-[9px] text-slate-600 mt-2 font-mono">{new Date(n.createdAt).toLocaleString()}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <div className="text-right">
                <p className="text-xs font-bold text-white">{authData.name}</p>
                <p className="text-[10px] text-blue-500 font-bold uppercase tracking-tight">
                  {role === 'admin' ? 'Administrateur' : role === 'mechanic' ? 'Expert Mécanicien' : 'Client Privilège'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center font-bold text-sm text-blue-500 shadow-inner uppercase">
                {authData.name.substring(0, 2)}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="pb-10 md:pb-0">
          {renderContent()}
        </div>
        
        {/* Mobile Spacer */}
        <div className="h-10 md:hidden"></div>
      </main>
    </div>
  );
}

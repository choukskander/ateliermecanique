import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./backend/config/db.ts";
import jwt from "jsonwebtoken";
import authRoutes from "./backend/routes/authRoutes.ts";
import messageRoutes from "./backend/routes/messageRoutes.ts";
import appointmentRoutes from "./backend/routes/appointmentRoutes.ts";
import userRoutes from "./backend/routes/userRoutes.ts";
import partRoutes from "./backend/routes/partRoutes.ts";
import repairRoutes from "./backend/routes/repairRoutes.ts";
import notificationRoutes from "./backend/routes/notificationRoutes.ts";
import availabilityRoutes from "./backend/routes/availabilityRoutes.ts";
import statsRoutes from "./backend/routes/statsRoutes.ts";
import invoiceRoutes from "./backend/routes/invoiceRoutes.ts";

dotenv.config();

/**
 * Start the MecaGestion server.
 * Integrates Vite for frontend dev and Express for backend API.
 */
async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const PORT = process.env.PORT || 3000;

  // Middleware setup
  app.use(cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true
  }));
  app.use(express.json());

  // Socket.io initialization
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      methods: ["GET", "POST"]
    }
  });

  io.use((socket: any, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next();
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "meca_secret_key");
      socket.userId = decoded.id;
      return next();
    } catch (_e) {
      return next();
    }
  });

  // Inject IO into request for controllers
  app.use((req: any, res, next) => {
    req.io = io;
    next();
  });

  // Database Connection
  try {
    await connectDB();
    console.log("📂 Database connection established successfully.");
  } catch (err) {
    console.error("❌ Failed to connect to database during startup:", err);
  }

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api/appointments", appointmentRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/parts", partRoutes);
  app.use("/api/repairs", repairRoutes);
  app.use("/api/invoices", invoiceRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/availability", availabilityRoutes);
  app.use("/api/stats", statsRoutes);

  io.on("connection", (socket: any) => {
    const clientId = socket.id;
    console.log(`📡 Nouveau client connecté : ${clientId}`);

    socket.on("join_chat", (userId) => {
      // Allow joining own room
      if (socket.userId && String(userId) === String(socket.userId)) {
        socket.join(userId);
        console.log(`👤 Client ${clientId} a rejoint sa salle : ${userId}`);
      } 
      // Allow staff to join the workshop room or client rooms
      else if (socket.userId) {
        socket.join(userId);
        console.log(`📡 Staff ${clientId} a rejoint la salle : ${userId}`);
      }
    });

    socket.on("send_message", (data) => {
      // data: { senderId, receiverId, content, timestamp }
      io.to(data.receiverId).emit("receive_message", data);
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Client déconnecté : ${clientId}`);
    });
  });

  // Health check API
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      message: "Serveur MecaGestion en ligne",
      timestamp: new Date().toISOString()
    });
  });

  // Vite middleware integration
  if (process.env.NODE_ENV !== "production") {
    console.log("🛠️ Starting Vite in middleware mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Force bind to 0.0.0.0 for container accessibility
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log("-----------------------------------------");
    console.log(`🚀 MECA-GESTION SERVER RUNNING`);
    console.log(`📍 URL: http://0.0.0.0:${PORT}`);
    console.log(`📊 Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log("-----------------------------------------");
  });
}

// Global error handling for unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

startServer();

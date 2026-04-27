import Repair from "../models/Repair.ts";
import Part from "../models/Part.ts";
import Appointment from "../models/Appointment.ts";
import Invoice from "../models/Invoice.ts";

export const getDashboardStats = async (req: any, res: any) => {
  try {
    // Count repairs that are active and assigned to the current mechanic (if applicable)
    const activeRepairsCount = await Repair.countDocuments({ 
      status: { $nin: ["Prêt"] },
      mechanicId: req.user._id
    });
    
    // Count all active repairs in the workshop
    const totalActiveRepairs = await Repair.countDocuments({ 
      status: { $nin: ["Prêt"] } 
    });
    
    // Count low stock parts (threshold <= 2)
    const lowStockPartsCount = await Part.countDocuments({ stock: { $lte: 2 } });
    
    // Revenue generated this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyInvoices = await Invoice.find({
      createdAt: { $gte: startOfMonth }
    });
    const monthlyRevenueSum = monthlyInvoices.reduce((acc, inv) => acc + (inv.totalTTC || 0), 0);
    
    // Total revenue (optional, keep it)
    const allInvoices = await Invoice.find();
    const totalRevenueSum = allInvoices.reduce((acc, inv) => acc + (inv.totalTTC || 0), 0);
    
    // Custom formatting helper
    const formatCurrency = (val: number) => {
      if (val >= 1000) return (val / 1000).toFixed(1) + "k€";
      return val.toFixed(0) + "€";
    };
    
    res.json({
      repairsInProgress: activeRepairsCount,
      totalActiveRepairs: totalActiveRepairs,
      lowStockParts: lowStockPartsCount,
      monthlyRevenue: formatCurrency(monthlyRevenueSum),
      totalRevenue: formatCurrency(totalRevenueSum)
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des stats" });
  }
};

export const getRecentWork = async (req: any, res: any) => {
  try {
    const repairs = await Repair.find()
      .populate({
        path: "appointmentId",
        populate: [
          { path: "vehicleId" },
          { path: "clientId" }
        ]
      })
      .sort({ updatedAt: -1 })
      .limit(5);
      
    res.json(repairs);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des travaux récents" });
  }
};

export const getUserInvoices = async (req: any, res: any) => {
  try {
    // Find appointments for this user to link to repairs and invoices
    const appointments = await Appointment.find({ clientId: req.user._id });
    const appointmentIds = appointments.map(a => a._id);
    
    const repairs = await Repair.find({ appointmentId: { $in: appointmentIds } });
    const repairIds = repairs.map(r => r._id);
    
    const invoices = await Invoice.find({ repairId: { $in: repairIds } }).sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    console.error("Error fetching user invoices:", error);
    res.status(500).json({ message: "Erreur lors de la récupération de vos factures" });
  }
};

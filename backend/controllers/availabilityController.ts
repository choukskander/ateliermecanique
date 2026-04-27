import Availability from "../models/Availability.ts";
import Appointment from "../models/Appointment.ts";
import User from "../models/User.ts";

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map((x) => Number(x));
  return h * 60 + m;
}

function dateAtMinutes(baseDate: Date, minutesFromMidnight: number) {
  const d = new Date(baseDate);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minutesFromMidnight, 0, 0);
  return d;
}

function isValidObjectId(id: string) {
  // lightweight check without importing mongoose here
  return typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);
}

function parseDateParam(dateStr: string) {
  // If date-only (from <input type="date">), treat as LOCAL date to avoid UTC shift.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    return new Date(y, mo, d);
  }
  // Otherwise fallback (ISO datetime etc.)
  return new Date(dateStr);
}

export const getAvailability = async (req: any, res: any) => {
  try {
    const availability = await Availability.find();
    res.json(availability);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération" });
  }
};

export const updateAvailability = async (req: any, res: any) => {
  const { schedules } = req.body;

  if (!schedules || !Array.isArray(schedules)) {
    return res.status(400).json({ message: "Les horaires sont obligatoires et doivent être un tableau" });
  }

  try {
    const mechanicId = req.user._id;
    
    // Validate each schedule item
    for (const s of schedules) {
      if (s.dayOfWeek === undefined || !s.startTime || !s.endTime) {
         return res.status(400).json({ message: "Chaque horaire doit avoir un jour, une heure de début et une heure de fin" });
      }
      if (Number.isNaN(Number(s.dayOfWeek)) || s.dayOfWeek < 0 || s.dayOfWeek > 6) {
        return res.status(400).json({ message: "Jour de semaine invalide (0-6)" });
      }
      if (timeToMinutes(s.startTime) >= timeToMinutes(s.endTime)) {
        return res.status(400).json({ message: "Heure de début doit être avant heure de fin" });
      }
    }

    await Availability.deleteMany({ mechanicId });
    
    const newSchedules = schedules.map((s: any) => {
      const { _id, ...rest } = s;
      return {
        ...rest,
        mechanicId
      };
    });

    await Availability.insertMany(newSchedules);
    res.json({ message: "Horaires mis à jour" });
  } catch (error: any) {
    console.error("Update availability error:", error);
    res.status(500).json({ 
      message: "Erreur lors de la mise à jour des horaires", 
      details: error.message 
    });
  }
};

export const getMechanics = async (_req: any, res: any) => {
  try {
    const mechanics = await User.find({ role: "mechanic" }).select("_id name email phone role");
    res.json(mechanics);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la récupération des mécaniciens", details: error.message });
  }
};

export const getMechanicSchedules = async (req: any, res: any) => {
  const mechanicId = req.params.mechanicId;
  if (!isValidObjectId(mechanicId)) {
    return res.status(400).json({ message: "ID mécanicien invalide" });
  }

  try {
    const schedules = await Availability.find({ mechanicId }).sort({ dayOfWeek: 1 });
    res.json(schedules);
  } catch (error: any) {
    res.status(500).json({ message: "Erreur lors de la récupération des horaires", details: error.message });
  }
};

/**
 * Returns available slots for a given date and (optional) mechanic.
 * Query:
 * - date: ISO or yyyy-mm-dd string (required)
 * - mechanicId: ObjectId (optional). If omitted, returns slots for any mechanic (workshop-wide).
 * - stepMinutes: default 30
 */
export const getAvailableSlots = async (req: any, res: any) => {
  const { date, mechanicId, stepMinutes } = req.query;
  if (!date) return res.status(400).json({ message: "Date manquante" });

  const baseDate = parseDateParam(String(date));
  if (isNaN(baseDate.getTime())) return res.status(400).json({ message: "Date invalide" });

  const step = Math.max(5, Math.min(120, Number(stepMinutes) || 30));
  const day = baseDate.getDay();
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  try {
    const baseDayStart = new Date(baseDate);
    baseDayStart.setHours(0, 0, 0, 0);
    // Disallow past dates (server-side truth)
    if (baseDayStart.getTime() < todayStart.getTime()) {
      return res.json({ available: false, slots: [], reason: "Date passée" });
    }

    // If mechanic specified -> compute their slots. Otherwise -> compute union of all mechanics slots.
    if (mechanicId) {
      if (!isValidObjectId(mechanicId as string)) {
        return res.status(400).json({ message: "ID mécanicien invalide" });
      }

      const schedule = await Availability.findOne({
        mechanicId,
        dayOfWeek: day,
        isAvailable: true,
      });

      if (!schedule) return res.json({ available: false, slots: [], reason: "Mécanicien indisponible ce jour" });

      const startMin = timeToMinutes(schedule.startTime);
      const endMin = timeToMinutes(schedule.endTime);

      const dayStart = new Date(baseDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const appointments = await Appointment.find({
        mechanicId,
        date: { $gte: dayStart, $lt: dayEnd },
        status: { $ne: "Annulé" },
      }).select("date");

      const busy = new Set(appointments.map((a: any) => new Date(a.date).toISOString()));

      const slots: string[] = [];
      for (let m = startMin; m + step <= endMin; m += step) {
        const slot = dateAtMinutes(baseDate, m);
        // For today: disallow past times (strictly after now)
        if (dayStart.getTime() === todayStart.getTime() && slot.getTime() <= now.getTime()) continue;
        const iso = slot.toISOString();
        if (!busy.has(iso)) slots.push(iso);
      }

      return res.json({ available: slots.length > 0, slots });
    }

    // Workshop-wide: list all schedules that day, subtract mechanic-specific busy slots,
    // then keep slots where at least one mechanic is free.
    const schedules = await Availability.find({ dayOfWeek: day, isAvailable: true });
    if (schedules.length === 0) {
      return res.json({ available: false, slots: [], reason: "Atelier fermé ce jour" });
    }

    const mechanicIds = schedules.map((s: any) => s.mechanicId);
    const dayStart = new Date(baseDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const appointments = await Appointment.find({
      mechanicId: { $in: mechanicIds },
      date: { $gte: dayStart, $lt: dayEnd },
      status: { $ne: "Annulé" },
    }).select("mechanicId date");

    const busyByMechanic = new Map<string, Set<string>>();
    for (const apt of appointments as any[]) {
      const mid = String(apt.mechanicId);
      if (!busyByMechanic.has(mid)) busyByMechanic.set(mid, new Set());
      busyByMechanic.get(mid)!.add(new Date(apt.date).toISOString());
    }

    // Build candidate slots by taking union of schedule windows.
    const slotsSet = new Set<string>();
    for (const s of schedules as any[]) {
      const startMin = timeToMinutes(s.startTime);
      const endMin = timeToMinutes(s.endTime);
      const busy = busyByMechanic.get(String(s.mechanicId)) || new Set<string>();

      for (let m = startMin; m + step <= endMin; m += step) {
        const slot = dateAtMinutes(baseDate, m);
        if (dayStart.getTime() === todayStart.getTime() && slot.getTime() <= now.getTime()) continue;
        const iso = slot.toISOString();
        if (!busy.has(iso)) slotsSet.add(iso);
      }
    }

    const slots = Array.from(slotsSet).sort();
    return res.json({ available: slots.length > 0, slots });
  } catch (error: any) {
    console.error("Get available slots error:", error);
    res.status(500).json({ message: "Erreur lors du calcul des créneaux", details: error.message });
  }
};

export const checkSlotAvailability = async (req: any, res: any) => {
  const { date } = req.query; // Date string
  if (!date) {
    return res.status(400).json({ message: "Date manquante" });
  }

  const checkDate = new Date(date as string);
  if (isNaN(checkDate.getTime())) {
    return res.status(400).json({ message: "Date invalide" });
  }

  const day = checkDate.getDay();
  const checkTime = checkDate.getHours().toString().padStart(2, '0') + ":" + checkDate.getMinutes().toString().padStart(2, '0');
  
  // If no time is set (00:00), we just check if the day is available (at some point)
  // But usually this is used for specific slot checks
  const isSpecificTime = checkDate.getHours() !== 0 || checkDate.getMinutes() !== 0;

  try {
    const query: any = { dayOfWeek: day, isAvailable: true };
    if (isSpecificTime) {
      query.startTime = { $lte: checkTime };
      query.endTime = { $gt: checkTime };
    }

    const availableSchedules = await Availability.find(query);
    if (availableSchedules.length === 0) {
        return res.json({ 
          available: false, 
          reason: isSpecificTime ? "Atelier fermé à cette heure" : "Atelier fermé ce jour" 
        });
    }

    if (isSpecificTime) {
      // Find at least one available mechanic who isn't busy
      let freeMechanicFound = false;
      for (const schedule of availableSchedules) {
        const existing = await Appointment.findOne({ 
          mechanicId: schedule.mechanicId,
          date: checkDate, 
          status: { $ne: "Annulé" } 
        });
        if (!existing) {
          freeMechanicFound = true;
          break;
        }
      }
      
      if (!freeMechanicFound) {
        return res.json({ available: false, reason: "Tous les mécaniciens sont occupés" });
      }
    }

    res.json({ available: true });
  } catch (error) {
    res.status(500).json({ message: "Erreur de vérification" });
  }
};

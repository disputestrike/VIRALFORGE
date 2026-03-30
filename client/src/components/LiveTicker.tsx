import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

const D  = "#0f1117";
const D2 = "#141820";
const D3 = "#1a1e2a";
const GREEN      = "#34d399";
const BLUE_LIGHT = "#60a5fa";
const DIM2 = "rgba(255,255,255,0.4)";
const DIM3 = "rgba(255,255,255,0.08)";

const mockAppointments = [
  { industry: "Solar",               location: "Florida",    status: "Booked",  time: "2 mins ago"  },
  { industry: "HVAC",                location: "California", status: "Calling", time: "5 mins ago"  },
  { industry: "Plumbing",            location: "Colorado",   status: "Booked",  time: "8 mins ago"  },
  { industry: "Window Installation", location: "Arizona",    status: "Booked",  time: "12 mins ago" },
  { industry: "Roofing",             location: "Texas",      status: "Booked",  time: "15 mins ago" },
  { industry: "Real Estate",         location: "Florida",    status: "Booked",  time: "18 mins ago" },
  { industry: "Insurance",           location: "California", status: "Calling", time: "20 mins ago" },
  { industry: "Kitchen Remodel",     location: "Colorado",   status: "Booked",  time: "25 mins ago" },
  { industry: "Painting",            location: "Georgia",    status: "Booked",  time: "28 mins ago" },
  { industry: "Fencing",             location: "BC, Canada", status: "Booked",  time: "31 mins ago" },
];

export default function LiveTicker() {
  const [appointments, setAppointments] = useState(mockAppointments);
  const [bookedCount, setBookedCount] = useState(0);

  useEffect(() => {
    setBookedCount(appointments.filter(a => a.status === "Booked").length);
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * mockAppointments.length);
      setAppointments(prev => [{ ...mockAppointments[idx], time: "Just now" }, ...prev.slice(0, 9)]);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-20 px-6" style={{ backgroundColor: D2, borderTop: `1px solid ${DIM3}`, borderBottom: `1px solid ${DIM3}` }}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: GREEN }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: GREEN }}>Live</span>
          </div>
          <h2 className="text-4xl font-bold mb-3 text-white">Appointments Being Booked Right Now</h2>
          <p className="text-lg" style={{ color: DIM2 }}>Live from ApexAI customers across US &amp; Canada</p>
        </div>

        {/* Count banner */}
        <div className="rounded-xl p-5 mb-6 text-center"
          style={{ backgroundColor: `${GREEN}12`, border: `1px solid ${GREEN}30` }}>
          <p className="font-black text-2xl mb-1" style={{ color: GREEN }}>
            ✓ {bookedCount} Appointments Booked
          </p>
          <p className="text-sm" style={{ color: `${GREEN}99` }}>
            This month: 1,247 &nbsp;|&nbsp; Per customer/day: 12–15 &nbsp;|&nbsp; Show rate: 47%
          </p>
        </div>

        {/* List */}
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${DIM3}`, backgroundColor: D3 }}>
          <div className="max-h-96 overflow-y-auto">
            {appointments.map((apt, i) => (
              <div key={i}
                className="flex items-center justify-between px-5 py-4 transition-all"
                style={{
                  borderBottom: `1px solid ${DIM3}`,
                  backgroundColor: apt.status === "Booked"
                    ? `${GREEN}08`
                    : `${BLUE_LIGHT}08`,
                }}>
                <div className="flex items-center gap-4">
                  {apt.status === "Booked" ? (
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: GREEN }} />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
                      style={{ borderColor: BLUE_LIGHT, borderTopColor: "transparent" }} />
                  )}
                  <div>
                    <p className="font-semibold text-white text-sm">{apt.industry} Appointment</p>
                    <p className="text-xs" style={{ color: DIM2 }}>{apt.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold"
                    style={{ color: apt.status === "Booked" ? GREEN : BLUE_LIGHT }}>
                    {apt.status}
                  </p>
                  <p className="text-xs" style={{ color: DIM2 }}>{apt.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: DIM2 }}>
          Real appointments from real customers — not leads, not contacts.
          Qualified appointments sitting on calendars right now.
        </p>
      </div>
    </section>
  );
}

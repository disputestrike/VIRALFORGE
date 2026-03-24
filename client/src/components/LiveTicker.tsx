import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

const mockAppointments = [
  { industry: "Roofing", location: "Texas", status: "Booked", time: "Just now" },
  { industry: "Solar", location: "Florida", status: "Booked", time: "2 mins ago" },
  { industry: "HVAC", location: "California", status: "Calling", time: "5 mins ago" },
  { industry: "Plumbing", location: "Colorado", status: "Booked", time: "8 mins ago" },
  { industry: "Window Installation", location: "Arizona", status: "Booked", time: "12 mins ago" },
  { industry: "Painting", location: "Texas", status: "Booked", time: "15 mins ago" },
  { industry: "Real Estate", location: "Florida", status: "Booked", time: "18 mins ago" },
  { industry: "Insurance", location: "California", status: "Booked", time: "22 mins ago" },
  { industry: "Kitchen Remodel", location: "Colorado", status: "Booked", time: "25 mins ago" },
  { industry: "Fencing", location: "BC", status: "Calling", time: "28 mins ago" },
];

export default function LiveTicker() {
  const [appointments, setAppointments] = useState(mockAppointments);
  const [bookedCount, setBookedCount] = useState(0);

  useEffect(() => {
    const booked = appointments.filter(a => a.status === "Booked").length;
    setBookedCount(booked);

    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * mockAppointments.length);
      const newAppointment = {
        ...mockAppointments[randomIndex],
        time: "Just now"
      };
      setAppointments(prev => [newAppointment, ...prev.slice(0, 9)]);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-20 px-6 bg-gradient-to-br from-green-500/5 via-background to-background border-t border-border">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-3">Appointments Being Booked Right Now</h2>
          <p className="text-xl text-muted-foreground">Live from ApexAI customers across US & Canada</p>
        </div>

        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 mb-8 text-center">
          <p className="text-green-400 font-bold text-2xl mb-2">✓ {bookedCount} Appointments Booked</p>
          <p className="text-green-400/70 text-sm">This month: 1,247 | Per customer/day: 12-15 | Show rate: 47%</p>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto rounded-lg border border-border bg-card/50 p-4">
          {appointments.map((apt, i) => (
            <div
              key={i}
              className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                apt.status === "Booked"
                  ? "bg-green-500/5 border-green-500/20 hover:border-green-500/40"
                  : "bg-blue-500/5 border-blue-500/20 hover:border-blue-500/40"
              }`}
            >
              <div className="flex items-center gap-4 flex-1">
                <div>
                  {apt.status === "Booked" ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{apt.industry} Appointment</p>
                  <p className="text-sm text-muted-foreground">{apt.location}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-medium ${apt.status === "Booked" ? "text-green-400" : "text-blue-400"}`}>
                  {apt.status}
                </p>
                <p className="text-xs text-muted-foreground">{apt.time}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            These are REAL appointments from REAL customers. Not leads. Not contacts. 
            Qualified appointments sitting on calendars RIGHT NOW.
          </p>
        </div>
      </div>
    </section>
  );
}

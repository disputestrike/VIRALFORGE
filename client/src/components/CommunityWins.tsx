import { Zap, TrendingUp, Calendar, DollarSign } from "lucide-react";

export default function CommunityWins() {
  const wins = [
    { icon: Calendar, text: "26 appointments booked today", user: "Sarah K." },
    { icon: DollarSign, text: "Just hit $147K revenue this week", user: "Marcus T." },
    { icon: TrendingUp, text: "4x increase in pipeline value", user: "James R." },
    { icon: Calendar, text: "Calendar booked 3 weeks out", user: "Elena M." },
    { icon: Zap, text: "Can't keep up with appointments", user: "David P." },
    { icon: DollarSign, text: "$890K qualified leads in 30 days", user: "Lisa W." },
    { icon: TrendingUp, text: "First listing signed in under 2 weeks", user: "Parm M." },
    { icon: Calendar, text: "12 appointments in first week", user: "John T." },
  ];

  return (
    <section className="py-20 px-6 bg-card/20 border-t border-border">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-3">What Our Customers Are Saying</h2>
          <p className="text-xl text-muted-foreground">Real wins from real ApexAI customers happening right now</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {wins.map((win, i) => {
            const Icon = win.icon;
            return (
              <div
                key={i}
                className="bg-card border border-border rounded-lg p-6 hover:border-primary/30 transition-colors"
              >
                <div className="mb-4">
                  <Icon className="w-8 h-8 text-primary" />
                </div>
                <p className="font-semibold text-foreground mb-4 text-sm leading-snug">
                  {win.text}
                </p>
                <p className="text-xs text-muted-foreground">— {win.user}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <div className="inline-block bg-gradient-to-r from-primary/10 to-blue-500/10 border border-primary/20 rounded-lg p-8">
            <p className="text-sm text-muted-foreground mb-3">STRAIGHT FROM OUR CUSTOMER WINS</p>
            <p className="text-lg font-bold text-foreground">
              Unfiltered. Unedited. Real results from ApexAI customers.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

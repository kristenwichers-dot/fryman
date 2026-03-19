import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

const steps = [
  {
    title: "Welcome to Campaign HQ! 🎉",
    description: "Let's take a quick tour so you know where everything is. This will only take a minute.",
    route: "/",
  },
  {
    title: "Your Dashboard",
    description: "This is your home base. You'll see quick stats and links to every tool in your campaign toolkit.",
    route: "/",
  },
  {
    title: "Analytics & Voter Math",
    description: "See how many voters you need to contact to win. Adjust your targets and track your progress here.",
    route: "/analytics",
  },
  {
    title: "Voter Database",
    description: "Import and search your voter list. You can filter by name, address, or city to find anyone fast.",
    route: "/voters",
  },
  {
    title: "Press Releases with AI",
    description: "Type a topic, click Generate, and get a professional press release in seconds. Then email it to your media contacts.",
    route: "/press-release",
  },
  {
    title: "Fundraising Tracker",
    description: "Log donations manually or connect your Anedot account to track them automatically. Every dollar counts!",
    route: "/fundraising",
  },
  {
    title: "You're All Set! 🚀",
    description: "Explore the sidebar to find Door Knocking, Yard Signs, Events, Phone Banking, and more. Look for the chat bubble in the bottom-right corner — that's your AI Campaign Assistant, ready to help anytime.",
    route: "/",
  },
];

export default function OnboardingTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const done = localStorage.getItem("onboarding_complete");
    if (!done && location.pathname === "/") {
      const timer = setTimeout(() => setActive(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const finish = () => {
    setActive(false);
    localStorage.setItem("onboarding_complete", "true");
  };

  const goTo = (idx: number) => {
    setStep(idx);
    if (steps[idx].route !== location.pathname) {
      navigate(steps[idx].route);
    }
  };

  const next = () => {
    if (step < steps.length - 1) goTo(step + 1);
    else finish();
  };

  const prev = () => {
    if (step > 0) goTo(step - 1);
  };

  if (!active) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-300">
      <div className="relative w-[90vw] max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
        {/* Close */}
        <button
          onClick={finish}
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-4">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-primary" : i < step ? "w-3 bg-primary/40" : "w-3 bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold shrink-0" />
            <h3 className="text-lg font-bold">{current.title}</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{current.description}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={finish}
            className="text-muted-foreground"
          >
            Skip Tour
          </Button>
          <div className="flex gap-2">
            {!isFirst && (
              <Button variant="outline" size="sm" onClick={prev}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            <Button variant="gold" size="sm" onClick={next}>
              {isLast ? "Get Started" : "Next"}
              {!isLast && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

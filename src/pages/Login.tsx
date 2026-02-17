import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, ArrowRight } from "lucide-react";
import s91Logo from "@/assets/s91-logo.png";

const HARDCODED_EMAIL = "recovery_admin@sector91.com";
const HARDCODED_PASSWORD = "SECTOR91";

/* ── Floating label input ── */
const FloatingInput = ({ id, type, value, onChange, icon: Icon, label, focused, onFocus, onBlur, suffix }: {
  id: string; type: string; value: string; onChange: (v: string) => void;
  icon: any; label: string; focused: boolean; onFocus: () => void; onBlur: () => void; suffix?: React.ReactNode;
}) => {
  const hasValue = value.length > 0;
  return (
    <div className="relative group">
      <AnimatePresence>
        {focused && (
          <motion.div
            className="absolute -inset-[1px] rounded-xl bg-primary/8 blur-md pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>
      <div className="relative">
        <Icon className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-all duration-400 ${focused ? "text-primary scale-110" : "text-muted-foreground"}`} />
        <motion.label
          htmlFor={id}
          className="absolute left-10 pointer-events-none font-semibold tracking-wider uppercase select-none"
          animate={{
            top: hasValue || focused ? 8 : "50%",
            y: hasValue || focused ? 0 : "-50%",
            fontSize: hasValue || focused ? "9px" : "12px",
            color: focused ? "hsl(43, 74%, 49%)" : "hsl(40, 8%, 45%)",
          }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {label}
        </motion.label>
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          required
          className={`pl-10 ${suffix ? "pr-12" : "pr-4"} h-14 pt-4 bg-secondary/40 border-border/40 rounded-xl font-semibold text-sm transition-all duration-300 focus:bg-secondary/70 focus:border-primary/30 focus:shadow-[0_0_30px_-8px_hsl(43,74%,49%,0.15)] focus-visible:ring-primary/20`}
        />
        <motion.div
          className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-primary origin-left"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: focused ? 1 : 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        />
        {suffix && <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
    </div>
  );
};

/* ── Main ── */
const Login = () => {
  const [email, setEmail] = useState(HARDCODED_EMAIL);
  const [password, setPassword] = useState(HARDCODED_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-300, 300], [2, -2]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-300, 300], [-2, 2]), { stiffness: 150, damping: 20 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // 1. Try to Sign In
    const { data: signInData, error: signInError } = await import("@/integrations/supabase/client").then(m => m.supabase.auth.signInWithPassword({
      email,
      password,
    }));

    if (signInError) {
      // 2. If Sign In fails, check if it's the "Admin" credentials and try to Sign Up (Provisioning)
      if (email === HARDCODED_EMAIL && password === HARDCODED_PASSWORD) {
        console.log("Provisioning Admin Account...");
        const { data: signUpData, error: signUpError } = await import("@/integrations/supabase/client").then(m => m.supabase.auth.signUp({
          email,
          password,
        }));

        if (signUpError) {
          console.error("Provisioning failed:", signUpError);
          handleLoginError(signUpError.message);
          return;
        }

        // Sign Up successful (might need email confirmation depending on settings, but we proceed)
        handleLoginSuccess();
        return;
      }

      handleLoginError(signInError.message);
    } else {
      handleLoginSuccess();
    }
  };

  const handleLoginSuccess = async () => {
    setSuccess(true);
    sessionStorage.setItem("s91_authenticated", "true");
    await new Promise((r) => setTimeout(r, 600));
    navigate("/");
  };

  const handleLoginError = (msg: string) => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
    toast.error("Login Failed", { description: msg });
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-background">
      {/* ── Full-page background logo watermark ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.img
          src={s91Logo}
          alt=""
          className="w-[85vmin] h-[85vmin] max-w-[700px] max-h-[700px] object-contain select-none"
          style={{ opacity: 0.04, filter: "grayscale(30%)" }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.04, scale: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          draggable={false}
        />
      </div>

      {/* Subtle radial glow behind logo */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,hsl(43,74%,49%,0.05)_0%,transparent_55%)]" />

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_30%,hsl(0,0%,5%,0.6)_100%)]" />

      {/* ── Login Card ── */}
      <motion.div
        className="relative z-10 w-full max-w-[400px] mx-4"
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Outer glow */}
        <motion.div
          className="absolute -inset-4 rounded-3xl blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, hsl(43,74%,49%,0.07), transparent 70%)" }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          className="relative rounded-2xl border border-primary/10 overflow-hidden backdrop-blur-xl"
          style={{
            rotateX, rotateY, transformStyle: "preserve-3d",
            background: "linear-gradient(180deg, hsl(0,0%,9%,0.92) 0%, hsl(0,0%,7%,0.95) 100%)",
          }}
          animate={shake ? { x: [-12, 12, -10, 10, -5, 5, 0] } : {}}
          transition={shake ? { duration: 0.5 } : undefined}
        >
          {/* Top accent */}
          <motion.div
            className="h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.6, duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          />

          {/* Success overlay */}
          <AnimatePresence>
            {success && (
              <motion.div
                className="absolute inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              >
                <motion.div className="flex flex-col items-center gap-3"
                  initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  <motion.div className="h-16 w-16 rounded-full bg-primary/15 flex items-center justify-center"
                    animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 0.6 }}>
                    <motion.svg viewBox="0 0 24 24" className="h-8 w-8 text-primary" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <motion.path d="M5 13l4 4L19 7" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.2 }} />
                    </motion.svg>
                  </motion.div>
                  <p className="text-sm font-bold text-foreground tracking-wide">Welcome back</p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="px-7 pt-10 pb-9 sm:px-9">
            {/* ── Branding ── */}
            <motion.div
              className="flex flex-col items-center mb-9"
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
            >
              <h1 className="text-[28px] sm:text-[32px] font-extrabold tracking-tight gradient-text" style={{ fontFamily: "'Playfair Display', serif" }}>
                SECTOR 91
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm mt-1 font-bold tracking-[0.15em] uppercase" style={{ fontFamily: "'Source Sans Pro', sans-serif" }}>
                Trading & Investment Management
              </p>

              <motion.div
                className="mt-4 flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
              >
                <div className="h-px w-10 bg-gradient-to-r from-transparent to-primary/40" />
                <div className="h-1.5 w-1.5 rounded-full bg-primary/50" />
                <div className="h-px w-10 bg-gradient-to-l from-transparent to-primary/40" />
              </motion.div>
            </motion.div>

            {/* ── Form ── */}
            <form onSubmit={handleLogin} className="space-y-5">
              <motion.div initial={{ opacity: 0, x: -25 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
                <FloatingInput id="email" type="email" value={email} onChange={setEmail}
                  icon={Mail} label="Email Address" focused={focusedField === "email"}
                  onFocus={() => setFocusedField("email")} onBlur={() => setFocusedField(null)} />
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -25 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
                <FloatingInput id="password" type={showPassword ? "text" : "password"} value={password} onChange={setPassword}
                  icon={Lock} label="Password" focused={focusedField === "password"}
                  onFocus={() => setFocusedField("password")} onBlur={() => setFocusedField(null)}
                  suffix={
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="text-muted-foreground hover:text-primary transition-colors duration-200 p-1">
                      <motion.div whileTap={{ scale: 0.85 }}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </motion.div>
                    </button>
                  } />
              </motion.div>

              {/* Remember & Forgot */}
              <motion.div className="flex items-center justify-between pt-1"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}>
                <div className="flex items-center gap-2">
                  <Checkbox id="remember" checked={rememberMe} onCheckedChange={(c) => setRememberMe(c === true)}
                    className="border-border/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary h-4 w-4" />
                  <label htmlFor="remember" className="text-[11px] font-semibold text-muted-foreground cursor-pointer select-none tracking-wide">
                    Remember me
                  </label>
                </div>
                <button type="button" className="text-[11px] font-bold text-primary/70 hover:text-primary transition-colors tracking-wide">
                  Forgot password?
                </button>
              </motion.div>

              {/* Submit */}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="pt-1">
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.985 }}>
                  <Button type="submit"
                    className="w-full text-sm font-extrabold uppercase tracking-[0.2em] relative overflow-hidden rounded-xl"
                    disabled={isLoading} style={{ height: 52 }}>
                    <AnimatePresence mode="wait">
                      {isLoading ? (
                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3">
                          <motion.div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                            animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }} />
                          <span className="tracking-[0.15em]">Verifying</span>
                          <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>...</motion.span>
                        </motion.div>
                      ) : (
                        <motion.div key="signin" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex items-center gap-2">
                          <span>Sign In</span>
                          <ArrowRight className="h-4 w-4" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent"
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }} />
                  </Button>
                </motion.div>
              </motion.div>
            </form>

            {/* Footer */}
            <motion.div className="mt-8 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
              <div className="flex items-center justify-center gap-3 text-[10px] font-bold text-muted-foreground/40 tracking-[0.2em] uppercase">
                <Lock className="h-3 w-3" />
                <span>Secured Access</span>
                <span>·</span>
                <span>Encrypted</span>
              </div>
            </motion.div>
          </div>

          {/* Bottom accent */}
          <motion.div className="h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
            transition={{ delay: 1, duration: 1.5, ease: "easeOut" }} />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shield,
  ArrowRight,
  Eye,
  Brain,
  Globe2,
  Zap,
  Radio,
  GitBranch,
  ChevronDown,
} from "lucide-react";
import { ShaderAnimation } from "@/components/ui/shader-animation";
import { InteractiveGlobe } from "@/components/ui/interactive-globe";

// ---------------------------------------------------------------------------
// Animated counter
// ---------------------------------------------------------------------------

function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }

    const timer = setTimeout(() => requestAnimationFrame(tick), 800);
    return () => clearTimeout(timer);
  }, [target]);

  return (
    <span>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Feature card
// ---------------------------------------------------------------------------

interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}

function FeatureCard({ icon, title, description, delay }: FeatureProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className="group relative rounded-3xl p-[1px] overflow-hidden"
    >
      {/* Outer subtle glow/gradient border on hover */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/[0.12] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out" />
      
      {/* Inner hover glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/[0.04] blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out pointer-events-none" />

      <div
        className="relative flex flex-col rounded-[23px] px-7 py-8 h-full transition-all duration-500 group-hover:bg-white/[0.02]"
        style={{
          background: "linear-gradient(180deg, rgba(14, 19, 30, 0.7) 0%, rgba(8, 11, 18, 0.9) 100%)",
          backdropFilter: "blur(20px)",
          boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.04)",
        }}
      >
        <div className="mb-6 flex items-center justify-center w-12 h-12 rounded-[14px] bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)] group-hover:scale-[1.05] transition-transform duration-500 ease-out">
          {icon}
        </div>
        <h3 className="text-[17px] font-semibold text-white tracking-tight mb-2.5">
          {title}
        </h3>
        <p className="text-[14px] text-[#8ba3c2] leading-relaxed font-normal">
          {description}
        </p>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Landing Page
// ---------------------------------------------------------------------------

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: "#030308" }}>
      {/* ================================================================
          NAVIGATION
          ================================================================ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrolled ? "rgba(3, 3, 8, 0.85)" : "transparent",
          backdropFilter: scrolled ? "blur(16px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.04)" : "1px solid transparent",
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Eye className="h-6 w-6 text-white" />
              <div className="absolute inset-0 blur-md bg-white/10 rounded-full" />
            </div>
            <span className="text-[17px] font-bold tracking-tight text-white">
              ARGUS
            </span>
          </div>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[13px] text-[#64748b] hover:text-white transition-colors">
              Features
            </a>
            <a href="#stats" className="text-[13px] text-[#64748b] hover:text-white transition-colors">
              Platform
            </a>
            <a href="#cta" className="text-[13px] text-[#64748b] hover:text-white transition-colors">
              Get Started
            </a>
          </div>

          {/* CTA */}
          <Link
            href="/dashboard"
            className="group flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium text-white transition-all duration-300 hover:shadow-[0_0_24px_rgba(255,255,255,0.08)]"
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            Launch Dashboard
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </nav>

      {/* ================================================================
          HERO SECTION — Full-screen shader background
          ================================================================ */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Shader Background */}
        <div className="absolute inset-0 z-0">
          <ShaderAnimation />
        </div>

        {/* Dark overlay gradient for readability */}
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 70% at 50% 50%, rgba(3,3,8,0.3) 0%, rgba(3,3,8,0.7) 60%, rgba(3,3,8,0.95) 100%)",
          }}
        />

        {/* Bottom fade to black */}
        <div
          className="absolute bottom-0 left-0 right-0 h-48 z-[1] pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, transparent, #030308)",
          }}
        />

        {/* Hero Content */}
        <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8"
            style={{
              background: "rgba(255, 59, 59, 0.08)",
              border: "1px solid rgba(255, 59, 59, 0.15)",
            }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="text-[11px] font-semibold text-red-400/90 tracking-[0.08em] uppercase"
              style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}
            >
              Autonomous Threat Intelligence
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.08] mb-6"
          >
            The All-Seeing Eye
            <br />
            <span className="bg-gradient-to-r from-white via-white/80 to-white/40 bg-clip-text text-transparent">
              of Cyber Defense
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="text-[17px] sm:text-lg text-[#94a3b8] leading-relaxed max-w-2xl mx-auto mb-10"
          >
            ARGUS deploys autonomous AI scouts to continuously monitor, analyze,
            and visualize the global threat landscape — filling the critical gap
            left by CISA workforce reductions.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.8 }}
            className="flex items-center justify-center gap-4"
          >
            <Link
              href="/dashboard"
              className="group flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-[14px] font-semibold text-black transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,255,255,0.15)]"
              style={{
                background: "white",
              }}
            >
              Enter Dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <a
              href="#features"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-[14px] font-medium text-[#94a3b8] hover:text-white transition-all duration-300"
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              Learn More
            </a>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="h-5 w-5 text-white/20" />
          </motion.div>
        </motion.div>
      </section>

      {/* ================================================================
          FEATURES
          ================================================================ */}
      <section id="features" className="relative py-32 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <span
              className="inline-block px-3 py-1.5 rounded-full text-[11px] font-medium tracking-[0.2em] uppercase text-[#94a3b8] mb-6 border border-white/[0.05] bg-white/[0.01]"
              style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}
            >
              Capabilities
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-[-0.02em] mb-5">
              Autonomous by design
            </h2>
            <p className="text-[17px] text-[#8ba3c2] max-w-2xl mx-auto leading-relaxed">
              Six integrated capabilities that work together to provide
              continuous, automated threat intelligence coverage.
            </p>
          </motion.div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <FeatureCard
              icon={<Radio className="h-5 w-5 text-[#2ed573]" />}
              title="Autonomous Scouts"
              description="AI-powered agents continuously monitor NVD, CISA, GitHub, and threat feeds 24/7 — detecting emerging vulnerabilities before they're widely exploited."
              delay={0}
            />
            <FeatureCard
              icon={<GitBranch className="h-5 w-5 text-[#54a0ff]" />}
              title="Knowledge Graph"
              description="Neo4j-powered graph database connects threat actors, CVEs, exploits, malware, and organizations — revealing hidden attack paths and relationships."
              delay={0.1}
            />
            <FeatureCard
              icon={<Globe2 className="h-5 w-5 text-[#ff9f43]" />}
              title="Global Attack Map"
              description="Real-time 3D visualization of active attack arcs across the globe, with heat mapping of threat origin clusters and severity-coded trajectories."
              delay={0.2}
            />
            <FeatureCard
              icon={<Brain className="h-5 w-5 text-[#c56cf0]" />}
              title="AI Threat Briefs"
              description="GPT-4 generates executive-level threat assessments with prioritized risk scores, affected sectors, and actionable remediation recommendations."
              delay={0.3}
            />
            <FeatureCard
              icon={<Eye className="h-5 w-5 text-[#ff4757]" />}
              title="Deep Investigation"
              description="Automated browsing agents investigate IOCs, domains, and IPs — following links, extracting data, and building intelligence trajectories."
              delay={0.4}
            />
            <FeatureCard
              icon={<Zap className="h-5 w-5 text-[#ffd43b]" />}
              title="Real-time Alerts"
              description="Instant push notifications for critical CVEs, active exploitation campaigns, and new attack path discoveries with severity classification."
              delay={0.5}
            />
          </div>
        </div>
      </section>

      {/* ================================================================
          STATS
          ================================================================ */}
      <section id="stats" className="relative py-24 px-6">
        {/* Divider glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
          }}
        />

        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span
              className="inline-block text-[10px] font-semibold tracking-[0.15em] uppercase text-[#64748b] mb-4"
              style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}
            >
              Platform Intelligence
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Always watching, always learning
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: 133, suffix: "+", label: "Threat Entities", sublabel: "Actors, CVEs, malware" },
              { value: 336, suffix: "+", label: "Relationships", sublabel: "Mapped in graph" },
              { value: 4, suffix: "", label: "Active Scouts", sublabel: "Monitoring 24/7" },
              { value: 18, suffix: "", label: "API Endpoints", sublabel: "Intelligence pipeline" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="text-center py-8 px-4 rounded-2xl"
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.04)",
                }}
              >
                <div
                  className="text-4xl font-bold text-white mb-1"
                  style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}
                >
                  <Counter target={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-[13px] font-medium text-[#e2e8f0]">{stat.label}</div>
                <div className="text-[11px] text-[#475569] mt-0.5">{stat.sublabel}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          CISA CONTEXT
          ================================================================ */}
      <section className="relative py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative rounded-2xl p-8 md:p-12 overflow-hidden"
            style={{
              background: "rgba(255, 59, 59, 0.03)",
              border: "1px solid rgba(255, 59, 59, 0.08)",
            }}
          >
            {/* Corner accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-red-500/5 to-transparent rounded-bl-full" />

            <div className="flex items-start gap-4 mb-6">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <Shield className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Why ARGUS Matters</h3>
                <p className="text-[13px] text-[#ff6b6b]/60 font-mono uppercase tracking-wider">Critical Context</p>
              </div>
            </div>

            <p className="text-[15px] text-[#94a3b8] leading-relaxed mb-6">
              With CISA&apos;s workforce reduced by over 50%, the United States faces an
              unprecedented gap in proactive threat monitoring. Nation-state actors
              including Volt Typhoon and APT28 are actively exploiting this vacuum.
            </p>
            <p className="text-[15px] text-[#94a3b8] leading-relaxed">
              ARGUS fills this gap with autonomous AI scouts that never sleep, powered
              by the Yutori agentic platform — providing continuous, automated threat
              intelligence where human monitoring has been disrupted.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ================================================================
          CTA — Globe + Call to Action
          ================================================================ */}
      <section id="cta" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Full-screen background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-blue-500/[0.04] blur-[150px]" />
        </div>

        {/* Top divider glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(100,180,255,0.06), transparent)",
          }}
        />

        {/* Globe as full-screen background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <InteractiveGlobe
            size={900}
            dotColor="rgba(100, 180, 255, ALPHA)"
            arcColor="rgba(100, 180, 255, 0.6)"
            markerColor="rgba(100, 220, 255, 1)"
            autoRotateSpeed={0.002}
            markers={[
              { lat: 55.76, lng: 37.62, label: "APT28" },
              { lat: 39.9, lng: 116.4, label: "Volt Typhoon" },
              { lat: 35.68, lng: 51.39, label: "APT33" },
              { lat: 37.57, lng: 126.98, label: "Lazarus" },
              { lat: 38.9, lng: -77.04, label: "CISA" },
              { lat: 51.51, lng: -0.13, label: "NCSC" },
              { lat: 48.86, lng: 2.35, label: "ANSSI" },
              { lat: 1.35, lng: 103.82, label: "CSA" },
              { lat: -33.87, lng: 151.21, label: "ASD" },
              { lat: 28.61, lng: 77.21, label: "CERT-In" },
            ]}
            connections={[
              { from: [55.76, 37.62], to: [38.9, -77.04] },
              { from: [39.9, 116.4], to: [38.9, -77.04] },
              { from: [39.9, 116.4], to: [1.35, 103.82] },
              { from: [35.68, 51.39], to: [51.51, -0.13] },
              { from: [37.57, 126.98], to: [38.9, -77.04] },
              { from: [55.76, 37.62], to: [51.51, -0.13] },
              { from: [55.76, 37.62], to: [48.86, 2.35] },
              { from: [39.9, 116.4], to: [-33.87, 151.21] },
              { from: [37.57, 126.98], to: [28.61, 77.21] },
            ]}
          />
        </div>

        {/* Content overlay */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase mb-8 mx-auto"
              style={{
                background: "rgba(100, 180, 255, 0.08)",
                border: "1px solid rgba(100, 180, 255, 0.15)",
                color: "rgba(100, 200, 255, 0.9)",
                fontFamily: "var(--font-jetbrains-mono), monospace",
              }}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-400" />
              </span>
              Global Threat Monitoring
            </div>

            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.08] mb-6">
              Worldwide
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                Threat Coverage
              </span>
            </h2>

            <p className="text-[16px] sm:text-[17px] text-[#94a3b8] max-w-2xl mx-auto leading-relaxed mb-10">
              Autonomous scouts deployed across every threat vector.
              Real-time intelligence from APT groups, exploit feeds, and
              dark web monitoring — visualized in your dashboard.
            </p>

            <div className="flex items-center justify-center gap-6 sm:gap-10 mb-12">
              <div>
                <p className="text-3xl font-bold text-white" style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                  <Counter target={24} />/7
                </p>
                <p className="text-[12px] text-[#64748b] mt-1">Monitoring</p>
              </div>
              <div className="w-px h-10 bg-white/[0.06]" />
              <div>
                <p className="text-3xl font-bold text-white" style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                  <Counter target={40} suffix="+" />
                </p>
                <p className="text-[12px] text-[#64748b] mt-1">Countries Tracked</p>
              </div>
              <div className="w-px h-10 bg-white/[0.06]" />
              <div>
                <p className="text-3xl font-bold text-white" style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                  &lt;5min
                </p>
                <p className="text-[12px] text-[#64748b] mt-1">Alert Latency</p>
              </div>
            </div>

            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl text-[15px] font-semibold text-black transition-all duration-300 hover:shadow-[0_0_48px_rgba(100,180,255,0.15)]"
              style={{ background: "white" }}
            >
              Launch ARGUS Dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ================================================================
          FOOTER
          ================================================================ */}
      <footer className="relative py-8 px-6">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)",
          }}
        />
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-[#334155]" />
            <span className="text-[12px] text-[#334155] font-medium">
              ARGUS
            </span>
            <span className="text-[11px] text-[#1e293b]">
              — Autonomous Agents Hackathon 2026
            </span>
          </div>
          <div className="text-[11px] text-[#1e293b]">
            Powered by <span className="text-[#334155]">Yutori</span> · <span className="text-[#334155]">Neo4j</span> · <span className="text-[#334155]">Tavily</span> · <span className="text-[#334155]">OpenAI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

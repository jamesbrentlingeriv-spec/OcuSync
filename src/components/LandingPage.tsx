import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  MessageSquare, 
  Clock, 
  Users, 
  Lock, 
  CheckCircle2, 
  ArrowRight,
  Stethoscope,
  Smartphone,
  Database
} from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <img 
                src="/ocu-sync.png" 
                alt="OCU-SYNC" 
                className="w-10 h-10 object-contain" 
                referrerPolicy="no-referrer"
              />
              <span className="text-2xl font-bold tracking-tight text-slate-900">OCU-SYNC</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Features</a>
              <a href="#security" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Security</a>
              <a href="#about" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">About</a>
              <button 
                onClick={onLogin}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-full transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                Sign In
              </button>
            </div>
            <button onClick={onLogin} className="md:hidden p-2 text-slate-600">
              <Users className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-30 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-400 rounded-full blur-[120px]" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider mb-8">
              <ShieldCheck className="w-4 h-4" />
              HIPAA Compliant Messaging
            </div>
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 leading-[1.1]">
              Bridging the Gap Between <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Care & Communication</span>
            </h1>
            <p className="max-w-2xl mx-auto text-xl text-slate-600 mb-12 leading-relaxed">
              OCU-SYNC is the enterprise-grade secure messaging platform designed specifically for healthcare professionals and their patients. Encrypted, reliable, and effortless.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={onLogin}
                className="w-full sm:w-auto px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-3 group"
              >
                Get Started Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <a 
                href="#features"
                className="w-full sm:w-auto px-10 py-4 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-2xl border border-slate-200 transition-all"
              >
                Learn More
              </a>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mt-20 relative max-w-5xl mx-auto"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200 bg-white">
              <video 
                src="/ocusync.mp4" 
                autoPlay 
                loop 
                muted 
                playsInline
                className="w-full h-auto"
              />
            </div>
            {/* Floating UI Elements */}
            <div className="absolute -top-10 -left-10 hidden lg:block p-6 bg-white rounded-2xl shadow-xl border border-slate-100 max-w-[240px]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-400 uppercase">Status</div>
                  <div className="text-sm font-bold text-slate-900">Patient Verified</div>
                </div>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full w-full bg-green-500" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl lg:text-5xl font-bold text-slate-900 mb-4">Everything You Need for Secure Care</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">Designed by medical professionals, for medical professionals.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Lock className="w-8 h-8" />,
                title: "End-to-End Encryption",
                desc: "Your data is encrypted from the moment it leaves your device until it reaches the recipient."
              },
              {
                icon: <Smartphone className="w-8 h-8" />,
                title: "Patient SMS Integration",
                desc: "SMS is unsecure and should only be used for non-PHI notifications like appointment reminders. All sensitive information is handled through the internal messaging section of the app."
              },
              {
                icon: <Users className="w-8 h-8" />,
                title: "Team Collaboration",
                desc: "Coordinate care seamlessly with your entire staff in a shared, secure environment."
              },
              {
                icon: <Clock className="w-8 h-8" />,
                title: "Real-time Updates",
                desc: "Get instant notifications for new messages, appointment requests, and patient updates."
              },
              {
                icon: <Database className="w-8 h-8" />,
                title: "Secure Records",
                desc: "All conversations are archived and stored in compliance with healthcare data regulations."
              },
              {
                icon: <Stethoscope className="w-8 h-8" />,
                title: "Clinical Workflow",
                desc: "Built-in tools for scheduling, patient intake, and clinical follow-ups."
              }
            ].map((feature, idx) => (
              <div key={idx} className="p-8 bg-white rounded-3xl border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-900 rounded-[3rem] overflow-hidden relative">
            <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500 rounded-full blur-[150px]" />
            </div>
            
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 items-center">
              <div className="p-12 lg:p-20">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-8">
                  Security First
                </div>
                <h2 className="text-4xl lg:text-6xl font-bold text-white mb-8 leading-tight">Your Trust is Our <br /> Highest Priority</h2>
                <p className="text-xl text-slate-400 mb-10 leading-relaxed">
                  We employ military-grade AES-256 encryption and rigorous security protocols to ensure that every byte of data is protected. OCU-SYNC is fully HIPAA and HITECH compliant.
                </p>
                <ul className="space-y-4">
                  {[
                    "SOC 2 Type II Certified Data Centers",
                    "Regular Third-Party Security Audits",
                    "Advanced Threat Detection & Monitoring",
                    "Granular Access Controls & Permissions"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-300">
                      <CheckCircle2 className="w-5 h-5 text-blue-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="hidden lg:block p-20">
                <div className="relative aspect-square bg-slate-800/50 rounded-full border border-slate-700 flex items-center justify-center">
                  <div className="absolute inset-0 border-2 border-dashed border-slate-700 rounded-full animate-[spin_20s_linear_infinite]" />
                  <Lock className="w-32 h-32 text-blue-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-4xl lg:text-6xl font-bold text-slate-900 mb-8">Ready to Transform Your Practice?</h2>
          <p className="text-xl text-slate-600 mb-12">Join hundreds of healthcare providers who trust OCU-SYNC for their daily communication needs.</p>
          <a 
            href="mailto:jamesbrentlingeriv@gmail.com"
            className="inline-block px-12 py-5 bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold rounded-2xl transition-all shadow-2xl shadow-blue-200 active:scale-95"
          >
            Contact Us
          </a>
          <p className="mt-6 text-sm text-slate-500 font-medium uppercase tracking-widest">For a quote or for more information contact us today.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                <img 
                  src="/ocu-sync.png" 
                  alt="OCU-SYNC" 
                  className="w-5 h-5 object-contain" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">OCU-SYNC</span>
            </div>
            <div className="flex gap-8 text-sm font-medium text-slate-500">
              <a href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Contact Support</a>
            </div>
            <div className="text-sm text-slate-400">
              &copy; {new Date().getFullYear()} OCU-SYNC. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

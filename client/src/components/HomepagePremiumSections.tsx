import { useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileLock2,
  HeartPulse,
  Hospital,
  PhoneCall,
  QrCode,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react';

const useCases = [
  {
    title: 'Individuals',
    description: 'Personal emergency profile for daily travel, commute, and outdoor activities.',
    icon: UserCheck,
  },
  {
    title: 'Parents & Children',
    description: 'Quick access to allergy and guardian contact details during school or travel emergencies.',
    icon: Users,
  },
  {
    title: 'Elderly Care',
    description: 'Medication history and emergency contacts available instantly for first responders.',
    icon: HeartPulse,
  },
  {
    title: 'Corporate Teams',
    description: 'Workforce emergency readiness with bulk distribution and central administration.',
    icon: Building2,
  },
];

const testimonials = [
  {
    quote: 'The ambulance team contacted my family in under 2 minutes after scanning my sticker.',
    by: 'Rider, Hyderabad',
  },
  {
    quote: 'Having medical reports attached saved critical time in the ER decision process.',
    by: 'Family Member, Bengaluru',
  },
  {
    quote: 'Our company rolled out INcase stickers to field teams with zero onboarding friction.',
    by: 'Operations Lead, Logistics Firm',
  },
];

const faqs = [
  {
    question: 'Who can see my profile data?',
    answer:
      'Only people who scan your physical QR sticker can access your emergency profile link. Admin access is role-based and authenticated.',
  },
  {
    question: 'Can I update my details later?',
    answer:
      'Yes. You can re-open your activation link and update contacts, blood group, reports, and other medical data any time.',
  },
  {
    question: 'What if I lose one sticker in my 2-sticker pack?',
    answer:
      'Both stickers in a 2-pack now stay linked to the same emergency profile, so either one can still provide life-saving information.',
  },
  {
    question: 'Does it work on mobile without an app?',
    answer:
      'Yes. It opens directly in the browser for first responders and family members after a scan.',
  },
];

function HowItWorks() {
  const steps = [
    {
      title: 'Scan QR',
      description: 'Responder scans your sticker from helmet, vehicle, or ID placement.',
      icon: QrCode,
    },
    {
      title: 'View critical info',
      description: 'Blood group, medical notes, and optional reports are shown immediately.',
      icon: ClipboardList,
    },
    {
      title: 'Reach family + support',
      description: 'Emergency contacts and support links are available in one flow.',
      icon: PhoneCall,
    },
  ];

  return (
    <section id="how-it-works" className="section-compact bg-white">
      <div className="container-fluid">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 p-6 md:p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-2 text-slate-700">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <p className="text-sm font-semibold">How It Works</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="badge-neutral">Step {idx + 1}</span>
                  </div>
                  <p className="font-semibold text-slate-900">{step.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustBar() {
  const trustItems = ['Data Protected', 'Fast Access', 'Responder-Friendly', '24/7 Availability'];
  return (
    <section className="bg-slate-900 py-4">
      <div className="container-fluid">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {trustItems.map((item) => (
            <div key={item} className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LivePreview() {
  return (
    <section id="live-demo" className="section bg-gradient-to-b from-white to-slate-50">
      <div className="container-fluid">
        <div className="grid gap-8 lg:grid-cols-2 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Live QR Response Preview</h2>
            <p className="mt-3 text-slate-600">
              This is what first responders see after scan: critical details first, contacts next, reports when available.
            </p>
            <div className="mt-5 space-y-3 text-sm text-slate-700">
              <p className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Blood group shown at top for immediate triage</p>
              <p className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Emergency contacts one tap away</p>
              <p className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Medical documents attached only if user provides them</p>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mx-auto max-w-xs rounded-[2rem] border-8 border-slate-800 bg-slate-100 p-4 shadow-inner">
              <div className="rounded-xl bg-white p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-500">Emergency Profile</p>
                <p className="text-lg font-bold text-slate-900">Rider Name</p>
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                  <p className="text-xs text-red-700 font-semibold">Blood Group</p>
                  <p className="text-lg font-bold text-red-800">O+</p>
                </div>
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                  <p className="text-xs text-emerald-700 font-semibold">Emergency Contact</p>
                  <p className="text-sm text-emerald-900">+91 98xxxxxx10</p>
                </div>
                <button type="button" className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white">Call Contact</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReadinessScore() {
  const checklist = [
    'Full name and phone number',
    'Blood group selected',
    'At least one emergency contact',
    'Medical conditions added',
    'Reports uploaded (optional)',
  ];
  const [checked, setChecked] = useState<boolean[]>([true, true, true, false, false]);

  const progress = useMemo(() => {
    const completed = checked.filter(Boolean).length;
    return Math.round((completed / checked.length) * 100);
  }, [checked]);

  return (
    <section id="readiness-score" className="section-compact bg-slate-50">
      <div className="container-fluid">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Emergency Readiness Score</h3>
              <p className="mt-1 text-sm text-slate-600">Complete your profile to maximize emergency response speed.</p>
            </div>
            <a href="#emergency-info" className="btn-primary-md">Complete Now</a>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Profile Completion</p>
              <p className="text-sm font-bold text-blue-700">{progress}%</p>
            </div>
            <div className="mt-2 h-3 rounded-full bg-slate-100">
              <div className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="mt-5 grid gap-2 md:grid-cols-2">
            {checklist.map((item, idx) => (
              <label key={item} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={checked[idx]}
                  onChange={() => setChecked((prev) => prev.map((v, i) => (i === idx ? !v : v)))}
                />
                {item}
              </label>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="section bg-white">
      <div className="container-fluid">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900">Real Stories, Real Impact</h2>
          <p className="mt-2 text-slate-600">How instant profile access helps during critical situations.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {testimonials.map((item) => (
            <div key={item.quote} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-700">"{item.quote}"</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">{item.by}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function UseCases() {
  return (
    <section id="use-cases" className="section-compact bg-slate-900">
      <div className="container-fluid">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white">Built For Every Use Case</h2>
          <p className="mt-2 text-slate-300">From personal use to organization-wide deployments.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {useCases.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700 text-cyan-300">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-sm text-slate-300">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CorporateSection() {
  return (
    <section id="corporate" className="section bg-gradient-to-b from-slate-50 to-white">
      <div className="container-fluid">
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-6 md:p-8">
          <div className="grid gap-6 lg:grid-cols-2 items-center">
            <div>
              <p className="badge-primary">For Organizations</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900">Corporate Emergency Readiness Suite</h2>
              <p className="mt-3 text-slate-700">Deploy 2-sticker safety packs to employees, manage bulk QR issuance, and maintain centralized emergency records.</p>
              <a href="/manager" className="mt-5 inline-flex btn-primary-md">Explore Manager Console</a>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-blue-200 bg-white p-4">
                <p className="font-semibold text-slate-900">Bulk QR Issuance</p>
                <p className="mt-1 text-xs text-slate-600">Generate and distribute stickers at scale.</p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-white p-4">
                <p className="font-semibold text-slate-900">Admin Dashboard</p>
                <p className="mt-1 text-xs text-slate-600">Live status, activation, and usage insights.</p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-white p-4">
                <p className="font-semibold text-slate-900">Emergency Registry</p>
                <p className="mt-1 text-xs text-slate-600">Employee profile and responder-ready info.</p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-white p-4">
                <p className="font-semibold text-slate-900">Audit Logs</p>
                <p className="mt-1 text-xs text-slate-600">Traceability for operational compliance.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SecurityPrivacy() {
  return (
    <section id="security" className="section-compact bg-white">
      <div className="container-fluid">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-5">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
            <p className="mt-3 font-semibold text-slate-900">Privacy-First Access</p>
            <p className="mt-1 text-sm text-slate-600">Profile opens from physical QR scan routes designed for emergency context.</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-5">
            <FileLock2 className="h-6 w-6 text-blue-600" />
            <p className="mt-3 font-semibold text-slate-900">Optional Medical Uploads</p>
            <p className="mt-1 text-sm text-slate-600">Users decide what to upload, with reports attached only when needed.</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-5">
            <Hospital className="h-6 w-6 text-purple-600" />
            <p className="mt-3 font-semibold text-slate-900">Responder-Oriented Layout</p>
            <p className="mt-1 text-sm text-slate-600">Critical data appears first to support fast emergency treatment decisions.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <section id="faq" className="section bg-slate-50">
      <div className="container-fluid max-w-4xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900">Frequently Asked Questions</h2>
          <p className="mt-2 text-slate-600">Everything users ask before activation and deployment.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((item, idx) => {
            const isOpen = idx === openIndex;
            return (
              <button
                type="button"
                key={item.question}
                onClick={() => setOpenIndex((prev) => (prev === idx ? -1 : idx))}
                className="w-full rounded-xl border border-slate-200 bg-white p-5 text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{item.question}</p>
                  {isOpen ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
                </div>
                {isOpen ? <p className="mt-3 text-sm text-slate-600">{item.answer}</p> : null}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StickyMobileCTA() {
  return (
    <div className="fixed bottom-4 left-0 right-0 z-40 px-4 md:hidden">
      <a href="#emergency-info" className="block rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-center text-sm font-bold text-white shadow-xl">
        Activate Your QR
      </a>
    </div>
  );
}

export default function HomepagePremiumSections() {
  return (
    <>
      <TrustBar />
      <HowItWorks />
      <LivePreview />
      <ReadinessScore />
      <Testimonials />
      <UseCases />
      <CorporateSection />
      <SecurityPrivacy />
      <FAQSection />
      <StickyMobileCTA />
    </>
  );
}

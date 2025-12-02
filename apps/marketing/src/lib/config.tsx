import { Icons } from "@/components/icons";
import { FaQuestionCircle, FaTiktok, FaTwitter } from "react-icons/fa";
import { FaYoutube } from "react-icons/fa6";
import { RiInstagramFill } from "react-icons/ri";

export const BLUR_FADE_DELAY = 0.15;

const SUPPORT_EMAIL = "info@vertechx-collective.com";

export const siteConfig = {
  name: "IndieSuite",
  description: "Stop doing so much gig admin. You don't have to.",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  keywords: ["SaaS", "Event Management", "Bookings", "Invoices", "Contracts"],
  links: {
    email: SUPPORT_EMAIL,
    twitter: "https://twitter.com/magicuidesign",
    discord: "https://discord.gg/87p2vpsat5",
    github: "https://github.com/magicuidesign/magicui",
    instagram: "https://instagram.com/magicuidesign/",
  },
  header: [
    {
      trigger: "Features",
      content: {
        main: {
          title: "AI-Powered Automation",
          description: "Streamline your workflow with intelligent automation.",
          href: "#",
        },
        items: [
          {
            href: "#",
            title: "Task Automation",
            description: "Automate repetitive tasks and save time.",
          },
          {
            href: "#",
            title: "Workflow Optimization",
            description: "Optimize your processes with AI-driven insights.",
          },
          {
            href: "#",
            title: "Intelligent Scheduling",
            description: "AI-powered scheduling for maximum efficiency.",
          },
        ],
      },
    },
    {
      trigger: "Solutions",
      content: {
        items: [
          {
            title: "For Small Businesses",
            href: "#",
            description: "Tailored automation solutions for growing companies.",
          },
          {
            title: "Enterprise",
            href: "#",
            description: "Scalable AI automation for large organizations.",
          },
          {
            title: "Developers",
            href: "#",
            description: "API access and integration tools for developers.",
          },
          {
            title: "Healthcare",
            href: "#",
            description: "Specialized automation for healthcare workflows.",
          },
          {
            title: "Finance",
            href: "#",
            description: "AI-driven process automation for financial services.",
          },
          {
            title: "Education",
            href: "#",
            description:
              "Streamline administrative tasks in educational institutions.",
          },
        ],
      },
    },
    {
      href: "/blog",
      label: "Blog",
    },
  ],
  pricing: [
    {
      name: "PRO",
      href: "#",
      price: "20",
      period: "month",
      yearlyPrice: "16",
      features: [
        "1 Account",
        "Unlimited CRM & Venue Management",
        "Unlimited Event & Invoice Creation",
        "Up to 10 Contract Signatures per month",
        "Advanced Metrics & Analytics",
        "Email Support",
      ],
      description: "Perfect for single/solo performers",
      buttonText: "Subscribe",
      isPopular: false,
    },
    {
      name: "PRO +",
      href: "#",
      price: "50",
      period: "month",
      yearlyPrice: "40",
      features: [
        "Up to 3 Accounts",
        "Unlimited CRM & Venue Management",
        "Unlimited Event & Invoice Creation",
        "Up to 30 Contract Signatures per month",
        "Advanced Metrics & Analytics",
        "Email Support",
      ],
      description: "Ideal for multiple accounts",
      buttonText: "Subscribe",
      isPopular: true,
    },
    {
      name: "PRO + +",
      href: "#",
      price: "100",
      period: "month",
      yearlyPrice: "80",
      features: [
        "Up to 10 Accounts",
        "Unlimited CRM & Venue Management",
        "Unlimited Event & Invoice Creation",
        "Up to 100 Contract Signatures per month",
        "Advanced Metrics & Analytics",
        "Email & Phone Support",
      ],
      description: "For agencies & multiple businesses",
      buttonText: "Subscribe",
      isPopular: false,
    },
  ],
  faqs: [
    {
      question: "What is IndieSuite?",
      answer: (
        <span>
          IndieSuite is an all‑in‑one workspace for creatives and small event
          businesses. Manage your customers and venues, create events, generate
          invoices and contracts, and track revenue and bookings with built‑in
          analytics.
        </span>
      ),
    },
    {
      question: "Who is IndieSuite for?",
      answer: (
        <span>
          IndieSuite is built for solo performers, small teams and agencies who
          run bookings and events (e.g. DJs, bands, photographers, studios,
          venues and agencies). Plans scale from one account to multi‑account
          setups.
        </span>
      ),
    },
    {
      question: "What can I manage in IndieSuite?",
      answer: (
        <span>
          You can store customer and venue records, create and schedule events,
          automatically generate invoices and downloadable PDF receipts, and
          produce ready‑to‑send contract documents from templates. Dashboards
          and charts give you booking and revenue insights.
        </span>
      ),
    },
    {
      question: "How do invoices, receipts and PDFs work?",
      answer: (
        <span>
          Invoices and receipts are generated server‑side as PDFs and can be
          downloaded or attached to emails. Each invoice also supports a
          printable PDF view and a receipt PDF once payments are marked as
          received.
        </span>
      ),
    },
    {
      question: "Do you support contracts and e‑signing?",
      answer: (
        <span>
          Yes. Contracts are created from templates and can be sent to clients
          for signature. The contract pipeline lives under the{" "}
          <strong>Contracts</strong> section where you can generate and send
          documents from your stored templates.
        </span>
      ),
    },
    {
      question: "How does billing work? Can I cancel anytime?",
      answer: (
        <span>
          Subscriptions are handled by Stripe. You can choose monthly or yearly
          billing and manage your plan, payment method and invoices in the
          Stripe customer portal. You can cancel at any time from the portal.
        </span>
      ),
    },
    {
      question: "What payment methods do you accept?",
      answer: (
        <span>
          All payment methods supported by Stripe in your region (major cards,
          Apple Pay/Google Pay where available). Your subscription invoices are
          issued by Stripe.
        </span>
      ),
    },
    {
      question: "What are the plan limits?",
      answer: (
        <span>
          • <strong>Pro</strong>: 1 account, up to 10 contract signatures, plus
          unlimited CRM, venues, events and invoice creation. <br />•{" "}
          <strong>Pro +</strong>: up to 3 accounts, 30 contract signatures.{" "}
          <br />• <strong>Pro ++</strong>: up to 10 accounts, 100 contract
          signatures. All plans include advanced analytics.
        </span>
      ),
    },
    {
      question: "Is my data secure? Where is it stored?",
      answer: (
        <span>
          IndieSuite uses Firebase Authentication and Firestore on Google Cloud.
          Data is encrypted in transit and stored on Google’s secure
          infrastructure. PDFs are generated on the server and served securely.
        </span>
      ),
    },
    {
      question: "Can I export my data?",
      answer: (
        <span>
          You can download PDF invoices and receipts at any time. CSV exports
          for customers, venues and events are on our roadmap—contact support if
          you need an export sooner.
        </span>
      ),
    },
    {
      question: "Does IndieSuite work on mobile?",
      answer: (
        <span>
          It can, but IndieSsuite is not optimized for mobile. It is designed for 
          desktop usage, which shows the metrics and analystics in a more readable 
          format.
        </span>
      ),
    },
    {
      question: "How do I get help?",
      answer: (
        <span>
          You can reach us at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          . We offer email support on all plans, with phone support on Pro ++.
        </span>
      ),
    },
  ],
  footer: [
    {
      title: "Product",
      links: [
        { href: "#", text: "Features", icon: null },
        { href: "#", text: "Pricing", icon: null },
        { href: "#", text: "Documentation", icon: null },
        { href: "#", text: "API", icon: null },
      ],
    },
    {
      title: "Company",
      links: [
        { href: "#", text: "About Us", icon: null },
        { href: "#", text: "Careers", icon: null },
        { href: "#", text: "Blog", icon: null },
        { href: "#", text: "Contact", icon: null },
      ],
    },
    {
      title: "Social",
      links: [
        {
          href: "#",
          text: "Twitter",
          icon: <FaTwitter />,
        },
        {
          href: "#",
          text: "Instagram",
          icon: <RiInstagramFill />,
        },
        {
          href: "#",
          text: "Youtube",
          icon: <FaYoutube />,
        },
        {
          href: "#",
          text: "TikTok",
          icon: <FaTiktok />,
        },
      ],
    },
  ],
};

export type SiteConfig = typeof siteConfig;

import { Suspense } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import Footer from "@/components/Footer";
import lazyWithRetry from "@/lib/lazyWithRetry";

const ComparisonSection = lazyWithRetry(() => import("@/components/ComparisonSection"));
const ReGraphLLMSection = lazyWithRetry(() => import("@/components/ReGraphLLMSection"));
const HowItWorksSection = lazyWithRetry(() => import("@/components/HowItWorksSection"));
const FeaturesSection = lazyWithRetry(() => import("@/components/FeaturesSection"));
const APISection = lazyWithRetry(() => import("@/components/APISection"));
const SDKSection = lazyWithRetry(() => import("@/components/SDKSection"));
const CTASection = lazyWithRetry(() => import("@/components/CTASection"));

const SectionPlaceholder = () => (
  <section className="py-16">
    <div className="container px-4">
      <div className="flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    </div>
  </section>
);

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Helmet>
        <title>ReGraph — Decentralized AI Compute Marketplace | 80% Cheaper</title>
        <meta name="description" content="Access 50+ AI models at up to 80% lower cost than AWS, Google Cloud & OpenAI. Decentralized GPU network for inference and training with an OpenAI-compatible API." />
        <meta name="keywords" content="AI compute, decentralized AI, GPU marketplace, AI inference, machine learning, LLM API, cheap AI, distributed computing, GPU rental" />
        <link rel="canonical" href="https://regraph.tech/" />
      </Helmet>
      <Navbar />
      <main>
        <HeroSection />

        <Suspense fallback={<SectionPlaceholder />}>
          <ComparisonSection />
        </Suspense>
        <Suspense fallback={<SectionPlaceholder />}>
          <ReGraphLLMSection />
        </Suspense>
        <Suspense fallback={<SectionPlaceholder />}>
          <HowItWorksSection />
        </Suspense>
        <Suspense fallback={<SectionPlaceholder />}>
          <FeaturesSection />
        </Suspense>
        <Suspense fallback={<SectionPlaceholder />}>
          <APISection />
        </Suspense>
        <Suspense fallback={<SectionPlaceholder />}>
          <SDKSection />
        </Suspense>
        <Suspense fallback={<SectionPlaceholder />}>
          <CTASection />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
};

export default Index;

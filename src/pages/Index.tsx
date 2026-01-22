import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import Footer from "@/components/Footer";
import lazyWithRetry from "@/lib/lazyWithRetry";

const ComparisonSection = lazyWithRetry(() => import("@/components/ComparisonSection"));
const HowItWorksSection = lazyWithRetry(() => import("@/components/HowItWorksSection"));
const FeaturesSection = lazyWithRetry(() => import("@/components/FeaturesSection"));
const APISection = lazyWithRetry(() => import("@/components/APISection"));
const SDKSection = lazyWithRetry(() => import("@/components/SDKSection"));
const EcosystemSection = lazyWithRetry(() => import("@/components/EcosystemSection"));
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
      <Navbar />
      <main>
        <HeroSection />

        <Suspense fallback={<SectionPlaceholder />}>
          <ComparisonSection />
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
          <EcosystemSection />
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

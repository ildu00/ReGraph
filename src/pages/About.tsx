import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { 
  Zap, 
  Globe, 
  Cpu, 
  Shield, 
  Users, 
  TrendingUp,
  Smartphone,
  Network,
  Award,
  Building2,
  Rocket,
  Target,
  CheckCircle,
  ArrowRight,
  Linkedin,
  Facebook,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ilyaDushinPhoto from "@/assets/team/ilya-dushin.jpg";
import gabrielMikhaeliPhoto from "@/assets/team/gabriel-mikhaeli.jpg";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

// Event gallery images
import event1 from "@/assets/events/event-1.jpg";
import event2 from "@/assets/events/event-2.jpg";
import event3 from "@/assets/events/event-3.jpg";
import event4 from "@/assets/events/event-4.jpg";
import event5 from "@/assets/events/event-5.jpg";
import event6 from "@/assets/events/event-6.jpg";
import event7 from "@/assets/events/event-7.jpg";

// X (Twitter) icon component
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const About = () => {
  const values = [
    {
      icon: Globe,
      title: "True Decentralization",
      description: "Network participants are users, not miners, ensuring democratic access for everyone."
    },
    {
      icon: Cpu,
      title: "AI Integration",
      description: "Real AI processing via mesh network with distributed intelligence and ONNX runtime."
    },
    {
      icon: TrendingUp,
      title: "Unlimited Scalability",
      description: "Every phone becomes a node, expanding the network organically. Performance increases with every new user."
    },
    {
      icon: Shield,
      title: "Security & Privacy",
      description: "Utilizes containerization and secure runtime environments, avoiding external dependencies."
    }
  ];

  const credentials = [
    {
      type: "Partnership",
      title: "Intel Gold Partners",
      description: "Recognized as Intel Gold Partners with extensive collaboration on AI and hardware solutions."
    },
    {
      type: "Certification",
      title: "Huawei Certified AI/CV Partners",
      description: "Certified partners specializing in AI and Computer Vision solutions."
    },
    {
      type: "Development",
      title: "Neural Network Accelerator",
      description: "Co-developed high-density neural network inference accelerator with Intel Movidius technology."
    },
    {
      type: "Recognition",
      title: "IT Stars Award Winners",
      description: "Winners of the prestigious IT Stars competition recognizing innovation in technology."
    },
    {
      type: "Patents",
      title: "Neural Network Protection",
      description: "Patented technology for neural network protection with hardware security implementations."
    },
    {
      type: "Collaboration",
      title: "AAEON Joint Solutions",
      description: "Collaborative solutions with AAEON for AI and edge computing applications."
    }
  ];

  const useCases = [
    {
      title: "Banking Sector",
      description: "Ultra-fast and low-cost transactions via SWIFT, SEPA, and crypto channels."
    },
    {
      title: "Enterprise Computing",
      description: "Smart building solutions, video surveillance, and analytics systems."
    },
    {
      title: "AI Inference",
      description: "Distributed AI processing for machine learning and neural network tasks."
    },
    {
      title: "Secure Communications",
      description: "End-to-end encrypted messaging and data transfer across the network."
    }
  ];

  const roadmap = [
    {
      phase: "Phase 1",
      period: "Q2 2025 - Q4 2025",
      title: "Optimization and Scaling",
      description: "Enhance platform performance and expand network capabilities for seamless mobile operation.",
      status: "completed"
    },
    {
      phase: "Phase 2",
      period: "Q1 2026 - Q4 2026",
      title: "Integration and Expansion",
      description: "Integrate with major financial systems and drive user adoption through seamless operations.",
      status: "active"
    },
    {
      phase: "Phase 3",
      period: "Q1 2027 - Q4 2027",
      title: "Innovation and Diversification",
      description: "Enhance AI capabilities and introduce new use cases across various sectors.",
      status: "upcoming"
    }
  ];

  const stats = [
    { value: "$300B+", label: "AI Infrastructure Market" },
    { value: "5B+", label: "Potential Device Network" },
    { value: "< 100ms", label: "Transaction Speed" },
    { value: "99.9%", label: "Network Uptime" }
  ];

  const leadership = [
    {
      name: "Ilya Dushin",
      role: "CEO",
      description: "Visionary leader with 15+ years in tech entrepreneurship and AI infrastructure.",
      photo: ilyaDushinPhoto,
      socials: {
        linkedin: "https://ru.linkedin.com/in/idushin",
        x: "https://x.com/i_dushin",
        facebook: "https://www.facebook.com/ildushin/"
      }
    },
    {
      name: "Gabriel Mikhaeli",
      role: "CFO",
      description: "Financial strategist with expertise in crypto markets and venture capital.",
      photo: gabrielMikhaeliPhoto,
      socials: null
    },
    {
      name: "Alexey Ivlev",
      role: "CTO",
      description: "Technical architect specializing in distributed systems and neural networks.",
      photo: null,
      socials: null
    }
  ];

  const teamMembers = [
    { name: "Elena Volkov", role: "Head of Engineering", department: "Engineering" },
    { name: "Marcus Chen", role: "Lead ML Engineer", department: "Engineering" },
    { name: "Sarah Mitchell", role: "Product Manager", department: "Product" },
    { name: "David Kim", role: "DevOps Lead", department: "Engineering" },
    { name: "Anna Petrova", role: "UX Designer", department: "Design" },
    { name: "James Wilson", role: "Security Engineer", department: "Engineering" },
    { name: "Maria Santos", role: "Community Manager", department: "Marketing" },
    { name: "Alex Turner", role: "Backend Developer", department: "Engineering" }
  ];

  const eventGallery = [
    { src: event1, alt: "ReGraph team networking at tech conference" },
    { src: event2, alt: "Product demonstration at ReGraph booth" },
    { src: event3, alt: "ReGraph team presenting enterprise architecture" },
    { src: event4, alt: "ReGraph booth showcasing developer experience" },
    { src: event5, alt: "Interactive demo at ReGraph exhibition" },
    { src: event6, alt: "ReGraph booth at industry event" },
    { src: event7, alt: "ReGraph team at AI economics presentation" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-4 text-primary border-primary/30">
              The Future of Decentralized Networks
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              About <span className="text-primary">ReGraph</span>
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
              A revolutionary decentralized network powered by graph-based technology and AI embeddings. 
              Our platform eliminates the limitations of current blockchain systems and brings the future 
              of computation to every smartphone, turning it into a mini data center.
            </p>
          </motion.div>

          {/* Video Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-16"
          >
            <div className="max-w-4xl mx-auto">
              <div className="aspect-video rounded-xl overflow-hidden border border-border bg-card shadow-lg">
              <video
                  controls
                  preload="metadata"
                  className="w-full h-full object-cover"
                >
                  <source src="/videos/about-video.mov" type="video/quicktime" />
                  <source src="/videos/about-video.mov" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-4">
                Watch our project overview video
              </p>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16"
          >
            {stats.map((stat, index) => (
              <div 
                key={stat.label}
                className="p-6 rounded-xl border border-border bg-card text-center"
              >
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Problem & Solution */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-16"
          >
            <div className="grid md:grid-cols-2 gap-8">
              {/* Problem */}
              <div className="p-8 rounded-xl border border-destructive/20 bg-destructive/5">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <Target className="w-6 h-6 text-destructive" />
                  The Problem We Solve
                </h2>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-1">Slow Transactions</h3>
                      <p className="text-sm text-muted-foreground">Sequential blocks limit processing speed, creating bottlenecks in network performance.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-1">Centralization & Vulnerability</h3>
                      <p className="text-sm text-muted-foreground">Mining is concentrated among large players, creating ecological and security risks.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-1">Scalability Difficulties</h3>
                      <p className="text-sm text-muted-foreground">Growth comes with high costs and infrastructure barriers that limit accessibility.</p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Solution */}
              <div className="p-8 rounded-xl border border-primary/20 bg-primary/5">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <Rocket className="w-6 h-6 text-primary" />
                  Our Solution
                </h2>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-1">Graph Structure & AI Embeddings</h3>
                      <p className="text-sm text-muted-foreground">Performance increases with every new user, creating a self-improving network.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-1">AI Containers & Smart Contracts</h3>
                      <p className="text-sm text-muted-foreground">Execute tasks directly on mobile devices with seamless compatibility.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-1">Energy Efficiency</h3>
                      <p className="text-sm text-muted-foreground">Devices operate without overheating or rapid battery drain.</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </motion.section>

          {/* Core Values */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-16"
          >
            <h2 className="text-3xl font-bold text-center mb-8">Advantages of ReGraph</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="p-6 rounded-xl border border-border bg-card hover:border-primary/50 transition-all group"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <value.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* How It Works */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-16"
          >
            <h2 className="text-3xl font-bold text-center mb-8">How ReGraph Works</h2>
            <div className="grid md:grid-cols-4 gap-10">
              {[
                { step: "01", title: "Connect & Offer", description: "Devices connect and offer their resources to the network." },
                { step: "02", title: "Execute Tasks", description: "Based on demand, AI inference or transactions are executed on user devices." },
                { step: "03", title: "Earn Tokens", description: "Participants receive tokens for their work, managed automatically." },
                { step: "04", title: "Validate & Scale", description: "Transactions are validated by multiple devices in parallel." }
              ].map((item, index) => (
                <div key={item.step} className="relative h-full">
                  <div className="p-6 rounded-xl border border-border bg-card h-full flex flex-col">
                    <div className="text-4xl font-bold text-primary mb-4">{item.step}</div>
                    <h3 className="font-semibold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground flex-1">{item.description}</p>
                  </div>
                  {index < 3 && (
                    <div className="hidden md:flex absolute top-1/2 -translate-y-1/2 -right-7 z-10">
                      <ArrowRight className="h-5 w-5 text-primary" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.section>

          {/* Use Cases */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mb-16"
          >
            <h2 className="text-3xl font-bold text-center mb-8">Use Cases</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {useCases.map((useCase) => (
                <div key={useCase.title} className="p-5 rounded-xl border border-border bg-card">
                  <h3 className="font-semibold mb-2">{useCase.title}</h3>
                  <p className="text-sm text-muted-foreground">{useCase.description}</p>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Credentials */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-16"
          >
            <h2 className="text-3xl font-bold text-center mb-4">Team Credentials & Achievements</h2>
            <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
              Our proven track record of innovation and partnerships with industry leaders
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {credentials.map((cred, index) => (
                <motion.div
                  key={cred.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                  className="p-6 rounded-xl border border-border bg-card"
                >
                  <Badge variant="outline" className="mb-3 text-xs">
                    {cred.type}
                  </Badge>
                  <h3 className="font-semibold mb-2">{cred.title}</h3>
                  <p className="text-sm text-muted-foreground">{cred.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Events & Gallery Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.52 }}
            className="mb-16"
          >
            <h2 className="text-3xl font-bold text-center mb-4">Events & Conferences</h2>
            <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
              Connecting with industry leaders and showcasing our technology at global events
            </p>
            <div className="max-w-5xl mx-auto px-12">
              <Carousel
                opts={{
                  align: "start",
                  loop: true,
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  {eventGallery.map((image, index) => (
                    <CarouselItem key={index} className="pl-2 md:pl-4 basis-full md:basis-1/2 lg:basis-1/3">
                      <div className="aspect-[4/3] rounded-xl overflow-hidden border border-border bg-card">
                        <img
                          src={image.src}
                          alt={image.alt}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden md:flex" />
                <CarouselNext className="hidden md:flex" />
              </Carousel>
            </div>
          </motion.section>

          {/* Team Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="mb-16"
          >
            <h2 className="text-3xl font-bold text-center mb-4">Our Team</h2>
            <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
              Meet the people behind ReGraph's innovation
            </p>
            
            {/* Leadership */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {leadership.map((leader, index) => (
                <motion.div
                  key={leader.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 + index * 0.1 }}
                  className="relative p-6 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent text-center"
                >
                  {/* Social links in top-right corner */}
                  {leader.socials && (
                    <div className="absolute top-3 right-3 flex gap-1.5">
                      {leader.socials.linkedin && (
                        <a
                          href={leader.socials.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground/60 hover:text-primary transition-colors"
                          aria-label={`${leader.name} LinkedIn`}
                        >
                          <Linkedin className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {leader.socials.x && (
                        <a
                          href={leader.socials.x}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground/60 hover:text-primary transition-colors"
                          aria-label={`${leader.name} X`}
                        >
                          <XIcon className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {leader.socials.facebook && (
                        <a
                          href={leader.socials.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground/60 hover:text-primary transition-colors"
                          aria-label={`${leader.name} Facebook`}
                        >
                          <Facebook className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  )}
                  {leader.photo ? (
                    <img 
                      src={leader.photo} 
                      alt={leader.name}
                      className="w-20 h-20 rounded-full object-cover mx-auto mb-4 border-2 border-primary/20"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-primary" />
                    </div>
                  )}
                  <Badge className="bg-primary text-primary-foreground mb-3">{leader.role}</Badge>
                  <h3 className="font-bold text-lg mb-2">{leader.name}</h3>
                  <p className="text-sm text-muted-foreground">{leader.description}</p>
                </motion.div>
              ))}
            </div>

            {/* Team Members */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {teamMembers.map((member, index) => (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + index * 0.05 }}
                  className="p-4 rounded-xl border border-border bg-card text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <span className="text-lg font-semibold text-muted-foreground">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm">{member.name}</h4>
                  <p className="text-xs text-muted-foreground">{member.role}</p>
                  <Badge variant="outline" className="mt-2 text-xs">{member.department}</Badge>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Roadmap */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-16"
          >
            <h2 className="text-3xl font-bold text-center mb-8">ReGraph Roadmap</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {roadmap.map((phase) => (
                <div 
                  key={phase.phase}
                  className={`p-6 rounded-xl border ${
                    phase.status === "active" 
                      ? "border-primary bg-primary/5" 
                      : phase.status === "completed"
                        ? "border-green-500/30 bg-green-500/5"
                        : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Badge 
                      variant="outline" 
                      className={
                        phase.status === "active" 
                          ? "text-primary border-primary/30" 
                          : phase.status === "completed"
                            ? "text-green-400 border-green-500/30"
                            : ""
                      }
                    >
                      {phase.phase}
                    </Badge>
                    {phase.status === "active" && (
                      <Badge className="bg-primary text-primary-foreground text-xs">Current</Badge>
                    )}
                    {phase.status === "completed" && (
                      <Badge className="bg-green-500/20 text-green-400 text-xs border-0">Completed</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{phase.period}</p>
                  <h3 className="font-semibold mb-2">{phase.title}</h3>
                  <p className="text-sm text-muted-foreground">{phase.description}</p>
                </div>
              ))}
            </div>
          </motion.section>

          {/* CTA */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-center p-8 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent"
          >
            <h2 className="text-2xl font-bold mb-4">The Future is Decentralized</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              By focusing on optimization, integration, and diversification, ReGraph aims to become 
              a cornerstone in the future of global technological infrastructure.
            </p>
          </motion.section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default About;

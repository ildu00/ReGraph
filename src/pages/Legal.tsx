import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { 
  Scale, 
  FileText, 
  Shield, 
  Globe, 
  Copyright, 
  AlertTriangle,
  Building,
  Mail,
  ExternalLink
} from "lucide-react";

const Legal = () => {
  const legalDocuments = [
    {
      title: "Privacy Policy",
      description: "How we collect, use, and protect your personal information",
      href: "/privacy",
      icon: Shield,
      updated: "January 2026"
    },
    {
      title: "Terms of Service",
      description: "Rules and conditions for using the ReGraph platform",
      href: "/terms",
      icon: FileText,
      updated: "January 2026"
    },
    {
      title: "Cookie Policy",
      description: "Information about cookies and tracking technologies",
      href: "/cookies",
      icon: Globe,
      updated: "January 2026"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <Scale className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Legal Information
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Legal notices, policies, and regulatory information for ReGraph services.
            </p>
          </motion.div>

          {/* Legal Documents Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid md:grid-cols-3 gap-4 mb-12"
          >
            {legalDocuments.map((doc) => (
              <Link
                key={doc.title}
                to={doc.href}
                className="p-6 rounded-xl border border-border bg-card hover:border-primary/50 transition-all group"
              >
                <doc.icon className="w-8 h-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                  {doc.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">{doc.description}</p>
                <p className="text-xs text-muted-foreground/70">Updated: {doc.updated}</p>
              </Link>
            ))}
          </motion.div>

          {/* Company Information */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-xl border border-border bg-card mb-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <Building className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">Company Information</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-2">Legal Entity</h3>
                <p className="text-muted-foreground text-sm">
                  ReGraph Technologies Inc.<br />
                  A Delaware Corporation
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Registered Address</h3>
                <p className="text-muted-foreground text-sm">
                  251 Little Falls Drive<br />
                  Wilmington, DE 19808<br />
                  United States
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Business Registration</h3>
                <p className="text-muted-foreground text-sm">
                  EIN: XX-XXXXXXX<br />
                  Delaware File Number: XXXXXXX
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Contact</h3>
                <p className="text-muted-foreground text-sm">
                  Email: legal@regraph.tech<br />
                  Support: support@regraph.tech
                </p>
              </div>
            </div>
          </motion.section>

          {/* Intellectual Property */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-xl border border-border bg-card mb-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <Copyright className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">Intellectual Property</h2>
            </div>
            
            <div className="space-y-4 text-muted-foreground">
              <p>
                The ReGraph name, logo, and all related marks are trademarks of ReGraph Technologies Inc. 
                All rights reserved worldwide.
              </p>
              <p>
                The ReGraph platform, including its software, APIs, documentation, and user interfaces, 
                is protected by copyright, trade secret, and other intellectual property laws.
              </p>
              <p>
                Third-party trademarks, service marks, and logos appearing on this website are the 
                property of their respective owners and are used for identification purposes only.
              </p>
              
              <div className="pt-4 border-t border-border">
                <h3 className="font-medium text-foreground mb-2">Open Source Software</h3>
                <p>
                  ReGraph uses various open-source software components. A complete list of open-source 
                  licenses and attributions is available in our documentation. We are committed to 
                  respecting open-source licensing requirements and contributing back to the community.
                </p>
              </div>
            </div>
          </motion.section>

          {/* Disclaimers */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-xl border border-border bg-card mb-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">Disclaimers</h2>
            </div>
            
            <div className="space-y-6 text-muted-foreground">
              <div>
                <h3 className="font-medium text-foreground mb-2">Service Availability</h3>
                <p>
                  ReGraph services are provided on an "as is" and "as available" basis. We do not 
                  guarantee uninterrupted or error-free operation of our services. Scheduled and 
                  unscheduled maintenance may occur from time to time.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-foreground mb-2">AI Model Outputs</h3>
                <p>
                  AI models accessed through our platform may generate content that is inaccurate, 
                  misleading, or inappropriate. Users are responsible for reviewing and validating 
                  all AI-generated outputs before use in production environments.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-foreground mb-2">Financial Information</h3>
                <p>
                  Cryptocurrency transactions involve inherent risks. Wallet balances, transaction 
                  values, and exchange rates displayed on our platform are for informational purposes 
                  only and should not be considered financial advice.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-foreground mb-2">Third-Party Services</h3>
                <p>
                  Our platform integrates with third-party services and providers. We are not 
                  responsible for the availability, accuracy, or security of these third-party 
                  services. Use of third-party services is subject to their respective terms.
                </p>
              </div>
            </div>
          </motion.section>

          {/* Regulatory Compliance */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="p-6 rounded-xl border border-border bg-card mb-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <Globe className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">Regulatory Compliance</h2>
            </div>
            
            <div className="space-y-6 text-muted-foreground">
              <div>
                <h3 className="font-medium text-foreground mb-2">Data Protection</h3>
                <p>
                  We comply with applicable data protection regulations including GDPR (for European 
                  users), CCPA (for California residents), and other regional privacy laws. For 
                  details on how we handle your data, please review our Privacy Policy.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-foreground mb-2">Export Controls</h3>
                <p>
                  Use of ReGraph services may be subject to U.S. export control laws and regulations. 
                  Users are responsible for ensuring their use of our services complies with all 
                  applicable export laws and sanctions.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-foreground mb-2">Accessibility</h3>
                <p>
                  We are committed to making our platform accessible to all users. If you experience 
                  accessibility issues or require accommodations, please contact our support team.
                </p>
              </div>
            </div>
          </motion.section>

          {/* Contact Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="p-6 rounded-xl border border-border bg-card"
          >
            <div className="flex items-center gap-3 mb-6">
              <Mail className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">Legal Inquiries</h2>
            </div>
            
            <p className="text-muted-foreground mb-6">
              For legal inquiries, subpoenas, or other official legal matters, please contact us:
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 rounded-lg bg-muted/30">
                <h3 className="font-medium mb-2">General Legal</h3>
                <a 
                  href="mailto:legal@regraph.tech" 
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  legal@regraph.tech
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="p-4 rounded-lg bg-muted/30">
                <h3 className="font-medium mb-2">Privacy & Data Requests</h3>
                <a 
                  href="mailto:privacy@regraph.tech" 
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  privacy@regraph.tech
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="p-4 rounded-lg bg-muted/30">
                <h3 className="font-medium mb-2">DMCA & Copyright</h3>
                <a 
                  href="mailto:dmca@regraph.tech" 
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  dmca@regraph.tech
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="p-4 rounded-lg bg-muted/30">
                <h3 className="font-medium mb-2">Law Enforcement</h3>
                <a 
                  href="mailto:lawenforcement@regraph.tech" 
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  lawenforcement@regraph.tech
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-6">
              Response times vary based on the nature of the inquiry. Routine matters are typically 
              addressed within 5-10 business days. Urgent legal matters should be clearly marked as such.
            </p>
          </motion.section>

          {/* Last Updated */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center text-sm text-muted-foreground mt-8"
          >
            Last updated: January 11, 2026
          </motion.p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Legal;

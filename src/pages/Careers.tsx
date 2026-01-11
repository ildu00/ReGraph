import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Briefcase, Heart, Rocket, Users, Send, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Careers = () => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: ""
  });

  const benefits = [
    {
      icon: Rocket,
      title: "Cutting-Edge Technology",
      description: "Work on revolutionary decentralized AI infrastructure"
    },
    {
      icon: Users,
      title: "Global Team",
      description: "Collaborate with talented professionals worldwide"
    },
    {
      icon: Heart,
      title: "Work-Life Balance",
      description: "Flexible remote-first culture with async communication"
    },
    {
      icon: Briefcase,
      title: "Growth Opportunities",
      description: "Continuous learning and career development support"
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.from("support_requests").insert({
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: "Career Inquiry",
        message: formData.message.trim(),
        user_id: user?.id || null
      });

      if (error) throw error;

      toast.success("Thank you! We'll be in touch about future opportunities.");
      setFormData({ name: "", email: "", message: "" });
    } catch (error) {
      toast.error("Failed to send. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-4 text-primary border-primary/30">
              Join Our Team
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Careers at <span className="text-primary">ReGraph</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              We're building the future of decentralized AI infrastructure. 
              Join us in revolutionizing how the world processes and shares computational power.
            </p>
          </motion.div>

          {/* Benefits */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-16"
          >
            <h2 className="text-2xl font-bold text-center mb-8">Why Join ReGraph?</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.1 }}
                  className="p-6 rounded-xl border border-border bg-card hover:border-primary/50 transition-all group"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <benefit.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* No Open Positions */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center p-8 rounded-xl border border-border bg-card mb-12"
          >
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <Briefcase className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-4">No Open Positions</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              We don't have any open positions at the moment, but we're always looking for 
              talented individuals. Use the form below to express your interest.
            </p>
          </motion.section>

          {/* Contact Form */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-8 rounded-xl border border-border bg-card"
          >
            <h2 className="text-2xl font-bold mb-6">Express Your Interest</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    maxLength={100}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    maxLength={255}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Tell us about yourself</Label>
                <Textarea
                  id="message"
                  placeholder="Share your background, skills, and what interests you about ReGraph..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={5}
                  maxLength={2000}
                  required
                />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </motion.section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Careers;

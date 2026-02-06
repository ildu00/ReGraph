import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Send, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CompanyInfo from "@/components/CompanyInfo";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Please enter a valid email").max(255),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000),
});

type ContactFormData = z.infer<typeof contactSchema>;

const CookiePolicy = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: user?.email || "",
      message: "",
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("support_requests").insert({
        user_id: user?.id || null,
        name: data.name,
        email: data.email,
        subject: "Cookie Policy Inquiry",
        message: data.message,
      });

      if (error) throw error;

      setIsSuccess(true);
      toast.success("Message sent successfully!");
      reset();

      setTimeout(() => setIsSuccess(false), 5000);
    } catch (error) {
      console.error("Error submitting:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container px-4 pt-24 pb-16">
        <div className="max-w-5xl mx-auto prose prose-invert prose-purple">
          <h1 className="text-4xl font-bold mb-2">Cookie Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 9, 2026</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              This Cookie Policy explains how ReGraph ("we," "our," or "us") uses cookies and similar 
              tracking technologies when you visit our website and use our decentralized AI compute 
              platform. By using our Service, you consent to the use of cookies as described in this policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. What Are Cookies?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cookies are small text files that are stored on your device (computer, tablet, or mobile) 
              when you visit a website. They are widely used to make websites work more efficiently, 
              provide a better user experience, and give website owners information about how their 
              site is being used.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Types of Cookies We Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use the following categories of cookies:
            </p>
            
            <h3 className="text-xl font-semibold mb-2 mt-6">Essential Cookies</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              These cookies are necessary for the website to function properly. They enable core 
              functionality such as security, network management, and account authentication. You 
              cannot opt out of these cookies.
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Authentication cookies to keep you logged in</li>
              <li>Security cookies to protect against fraud</li>
              <li>Session cookies to remember your preferences during a visit</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2 mt-6">Functional Cookies</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              These cookies enable enhanced functionality and personalization, such as remembering 
              your language preference or region.
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Language and region preferences</li>
              <li>Dashboard layout preferences</li>
              <li>Theme settings (dark/light mode)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2 mt-6">Analytics Cookies</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              These cookies help us understand how visitors interact with our website by collecting 
              and reporting information anonymously.
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Pages visited and time spent on each page</li>
              <li>Traffic sources and referral information</li>
              <li>Error reports and performance metrics</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2 mt-6">Marketing Cookies</h3>
            <p className="text-muted-foreground leading-relaxed">
              These cookies may be set by our advertising partners to build a profile of your 
              interests and show you relevant advertisements on other sites. We currently minimize 
              the use of marketing cookies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Third-Party Cookies</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Some cookies are placed by third-party services that appear on our pages. We use 
              the following third-party services:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Analytics providers to understand usage patterns</li>
              <li>Payment processors for secure transactions</li>
              <li>Customer support tools for live chat functionality</li>
              <li>Security services for fraud prevention</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Cookie Duration</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Cookies can be either session cookies or persistent cookies:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Session cookies:</strong> These are temporary and are deleted when you close your browser.</li>
              <li><strong>Persistent cookies:</strong> These remain on your device for a set period or until you delete them manually.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Managing Cookies</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You can control and manage cookies in several ways:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Browser settings:</strong> Most browsers allow you to view, delete, and block cookies. Note that blocking all cookies may impact website functionality.</li>
              <li><strong>Cookie preferences:</strong> Where available, use our cookie consent tool to manage your preferences.</li>
              <li><strong>Third-party opt-outs:</strong> Many advertising networks offer opt-out mechanisms through their websites.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Please note that disabling certain cookies may affect your ability to use some features 
              of our Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Similar Technologies</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              In addition to cookies, we may use similar tracking technologies:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Local storage:</strong> Data stored in your browser that persists even after you close it.</li>
              <li><strong>Session storage:</strong> Similar to local storage but cleared when the browser session ends.</li>
              <li><strong>Web beacons:</strong> Small graphic images used to track user behavior.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Do Not Track Signals</h2>
            <p className="text-muted-foreground leading-relaxed">
              Some browsers have a "Do Not Track" feature that signals to websites that you do not 
              want to have your online activity tracked. We currently do not respond to "Do Not Track" 
              signals because there is no industry standard for how to handle them.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Updates to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Cookie Policy from time to time to reflect changes in our practices 
              or for legal, operational, or regulatory reasons. We will notify you of any material 
              changes by posting the updated policy on this page with a new "Last updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you have any questions about our use of cookies, please use the form below:
            </p>
            
            <div className="mt-6 p-6 bg-secondary/30 rounded-lg border border-border not-prose">
              {isSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Message Sent!</h3>
                  <p className="text-muted-foreground">
                    Thank you for reaching out. We'll respond to your inquiry soon.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Your Name *</Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        {...register("name")}
                        className={errors.name ? "border-destructive" : ""}
                      />
                      {errors.name && (
                        <p className="text-xs text-destructive">{errors.name.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Your Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        {...register("email")}
                        className={errors.email ? "border-destructive" : ""}
                      />
                      {errors.email && (
                        <p className="text-xs text-destructive">{errors.email.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Your Message *</Label>
                    <Textarea
                      id="message"
                      placeholder="Please describe your question or request..."
                      rows={4}
                      {...register("message")}
                      className={errors.message ? "border-destructive" : ""}
                    />
                    {errors.message && (
                      <p className="text-xs text-destructive">{errors.message.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full glow-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CookiePolicy;

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  MessageCircle, 
  Send, 
  FileText, 
  HelpCircle,
  Loader2,
  Bot,
  User,
  ChevronDown,
  Mail,
  Clock,
  Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const faqData = [
  {
    question: "How do I get started with ReGraph API?",
    answer: "To get started, create an account and generate an API key from your dashboard. Then, you can make requests to api.regraph.tech using your API key in the Authorization header. Check our documentation at /docs for detailed examples and endpoint references."
  },
  {
    question: "What payment methods are supported?",
    answer: "We support cryptocurrency payments including USDT, USDC, ETH, and SOL on multiple networks (Ethereum, Polygon, Solana, Base). You can deposit funds to your wallet from the Dashboard and use credits for API calls."
  },
  {
    question: "How does pricing work?",
    answer: "Pricing is based on usage - you pay for the compute resources you consume. This includes tokens processed and compute time used. Different models have different pricing. Check the Models page for specific pricing information."
  },
  {
    question: "How can I become a hardware provider?",
    answer: "Navigate to the Provider section in your Dashboard, register as a provider, and add your devices (GPU, CPU, NPU, TPU, or mobile). Follow the installation instructions to connect your hardware to the network and start earning."
  },
  {
    question: "What models are available for inference?",
    answer: "We support a variety of models including Llama, Mistral, DeepSeek, and more. Check the Models page (/models) for the complete list of available models, their capabilities, and pricing."
  },
  {
    question: "How do I troubleshoot API errors?",
    answer: "Common issues include: invalid API keys (check your key is active), rate limiting (reduce request frequency), insufficient credits (top up your wallet), and malformed requests (validate your JSON payload). Check our documentation for error code references."
  },
  {
    question: "Is there a rate limit on API requests?",
    answer: "Yes, rate limits depend on your plan. Free tier users have lower limits, while paid plans offer higher throughput. If you need higher limits, contact our support team to discuss enterprise options."
  },
  {
    question: "How secure is my data?",
    answer: "We take security seriously. All API communications are encrypted via TLS, API keys are hashed, and we don't store your prompts or outputs beyond the request lifecycle. Provider hardware is verified before joining the network."
  },
  {
    question: "Can I use ReGraph for commercial projects?",
    answer: "Absolutely! ReGraph is designed for both personal and commercial use. Our API is production-ready with high availability and scalable infrastructure to handle enterprise workloads."
  },
  {
    question: "How do I contact support for urgent issues?",
    answer: "For urgent issues, use the contact form below or reach out via email. Our support team typically responds within 24 hours. For critical production issues, include 'URGENT' in your subject line."
  }
];
const CHAT_STORAGE_KEY = "regraph_support_chat";

const Support = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"chat" | "form" | "faq">("faq");
  
  // Chat state - initialize from localStorage
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [chatInput, setChatInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Save messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error("Failed to save chat history:", e);
    }
  }, [messages]);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email || ""
      }));
    }
  }, [user]);

  // Scroll within chat container only, not the whole page
  useEffect(() => {
    if (chatContainerRef.current && messagesEndRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  };

  const streamChat = async (userMessage: string) => {
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setChatInput("");
    setIsStreaming(true);

    let assistantContent = "";

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: newMessages }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get response");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages([...newMessages, { role: "assistant", content: assistantContent }]);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to get response");
      setMessages(newMessages);
    } finally {
      setIsStreaming(false);
      // Restore focus to input after streaming completes
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isStreaming) return;
    streamChat(chatInput.trim());
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("support_requests").insert({
        name: formData.name,
        email: formData.email,
        subject: formData.subject || "Support Request",
        message: formData.message,
        user_id: user?.id || null,
      });

      if (error) throw error;

      toast.success("Your request has been submitted! We'll get back to you soon.");
      setFormData({ name: "", email: user?.email || "", subject: "", message: "" });
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: "faq" as const, label: "FAQ", icon: HelpCircle },
    { id: "chat" as const, label: "AI Assistant", icon: Bot },
    { id: "form" as const, label: "Contact Us", icon: Mail },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Support Center
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Get help with ReGraph. Browse our FAQ, chat with our AI assistant, or contact our support team.
            </p>
          </motion.div>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center gap-2 mb-8"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </motion.div>

          {/* Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* FAQ Section */}
            {activeTab === "faq" && (
              <div className="p-6 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <HelpCircle className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">Frequently Asked Questions</h2>
                </div>
                
                <Accordion type="single" collapsible className="space-y-2">
                  {faqData.map((faq, index) => (
                    <AccordionItem
                      key={index}
                      value={`item-${index}`}
                      className="border border-border rounded-lg px-4 data-[state=open]:bg-muted/30"
                    >
                      <AccordionTrigger className="hover:no-underline py-4">
                        <span className="text-left font-medium">{faq.question}</span>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pb-4">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                <div className="mt-8 p-4 rounded-lg bg-muted/30 border border-border">
                  <p className="text-sm text-muted-foreground">
                    Can't find what you're looking for? Try our{" "}
                    <button
                      onClick={() => setActiveTab("chat")}
                      className="text-primary hover:underline"
                    >
                      AI Assistant
                    </button>{" "}
                    or{" "}
                    <button
                      onClick={() => setActiveTab("form")}
                      className="text-primary hover:underline"
                    >
                      contact our team
                    </button>
                    .
                  </p>
                </div>
              </div>
            )}

            {/* Chat Section */}
            {activeTab === "chat" && (
              <div className="p-6 rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">AI Support Assistant</h2>
                      <p className="text-sm text-muted-foreground">Get instant answers to your questions</p>
                    </div>
                  </div>
                  {messages.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearChat}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>

                {/* Chat Messages */}
                <div ref={chatContainerRef} className="h-96 overflow-y-auto border border-border rounded-lg p-4 mb-4 bg-muted/10">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <Bot className="w-12 h-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground mb-2">
                        Hi! I'm your ReGraph support assistant.
                      </p>
                      <p className="text-sm text-muted-foreground/70">
                        Ask me anything about getting started, pricing, API usage, or troubleshooting.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg, index) => (
                        <div
                          key={index}
                          className={`flex gap-3 ${
                            msg.role === "user" ? "justify-end" : "justify-start"
                          }`}
                        >
                          {msg.role === "assistant" && (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Bot className="w-4 h-4 text-primary" />
                            </div>
                          )}
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            {msg.role === "assistant" ? (
                              <div className="text-sm markdown-response">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {msg.content}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            )}
                          </div>
                          {msg.role === "user" && (
                            <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-secondary" />
                            </div>
                          )}
                        </div>
                      ))}
                      {isStreaming && messages[messages.length - 1]?.role === "user" && (
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="w-4 h-4 text-primary" />
                          </div>
                          <div className="bg-muted rounded-lg p-3">
                            <Loader2 className="w-4 h-4 animate-spin" />
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <form onSubmit={handleChatSubmit} className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type your question..."
                    disabled={isStreaming}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={isStreaming || !chatInput.trim()}>
                    {isStreaming ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>

                <p className="text-xs text-muted-foreground mt-3 text-center">
                  AI responses are generated automatically. For complex issues,{" "}
                  <button
                    onClick={() => setActiveTab("form")}
                    className="text-primary hover:underline"
                  >
                    contact our team
                  </button>
                  .
                </p>
              </div>
            )}

            {/* Contact Form Section */}
            {activeTab === "form" && (
              <div className="p-6 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Contact Support</h2>
                    <p className="text-sm text-muted-foreground">We'll respond within 24 hours</p>
                  </div>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Your name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="Brief description of your issue"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Describe your issue or question in detail..."
                      rows={5}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
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

                <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Typical response time: 24 hours</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Support;

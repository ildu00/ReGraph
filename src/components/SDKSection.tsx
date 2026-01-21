import { ExternalLink, ArrowRight, Terminal } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const sdks = [
  {
    name: "Python",
    command: "pip install regraph",
    href: "https://github.com/ildu00/ReGraph/tree/main/sdk/python",
    available: true,
  },
  {
    name: "JavaScript",
    command: "npm install regraph",
    href: "https://github.com/ildu00/ReGraph/tree/main/sdk/javascript",
    available: true,
  },
  {
    name: "Go",
    command: "go get regraph.tech/sdk",
    href: "https://github.com/ildu00/ReGraph/tree/main/sdk/go",
    available: true,
  },
  {
    name: "Ruby",
    command: "gem install regraph",
    href: "https://github.com/ildu00/ReGraph/tree/main/sdk/ruby",
    available: true,
  },
];

const SDKSection = () => {
  return (
    <section className="py-20 relative">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Official SDKs
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            OpenAI-compatible libraries for quick integration
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-2xl mx-auto space-y-3"
        >
          {sdks.map((sdk) => (
            <div
              key={sdk.name}
              className={`flex items-center justify-between gap-4 p-4 rounded-lg border ${
                sdk.available 
                  ? "border-border bg-card hover:border-primary/50 transition-colors" 
                  : "border-border/50 bg-card/50 opacity-60"
              }`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <span className="font-medium text-sm w-20 shrink-0">{sdk.name}</span>
                <code className="text-xs md:text-sm font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded truncate">
                  {sdk.command}
                </code>
              </div>
              
              {sdk.available && sdk.href ? (
                <a
                  href={sdk.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
                >
                  <span className="hidden sm:inline">View</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <span className="text-xs text-muted-foreground shrink-0">Soon</span>
              )}
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-8"
        >
          <Link
            to="/docs"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Full API documentation
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default SDKSection;

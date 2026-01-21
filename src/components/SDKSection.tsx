import { ExternalLink, ArrowRight, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const sdks = [
  {
    name: "Python",
    description: "pip install regraph",
    color: "#3776AB",
    href: "https://github.com/ildu00/ReGraph/tree/main/sdk/python",
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 256 255" fill="currentColor">
        <path d="M126.916.072c-64.832 0-60.784 28.115-60.784 28.115l.072 29.128h61.868v8.745H41.631S.145 61.355.145 126.77c0 65.417 36.21 63.097 36.21 63.097h21.61v-30.356s-1.165-36.21 35.632-36.21h61.362s34.475.557 34.475-33.319V33.97S194.67.072 126.916.072zM92.802 19.66a11.12 11.12 0 0 1 11.13 11.13 11.12 11.12 0 0 1-11.13 11.13 11.12 11.12 0 0 1-11.13-11.13 11.12 11.12 0 0 1 11.13-11.13z"/>
        <path d="M128.757 254.126c64.832 0 60.784-28.115 60.784-28.115l-.072-29.127H127.6v-8.745h86.441s41.486 4.705 41.486-60.712c0-65.416-36.21-63.096-36.21-63.096h-21.61v30.355s1.165 36.21-35.632 36.21h-61.362s-34.475-.557-34.475 33.32v56.013s-5.235 33.897 62.518 33.897zm34.114-19.586a11.12 11.12 0 0 1-11.13-11.13 11.12 11.12 0 0 1 11.13-11.131 11.12 11.12 0 0 1 11.13 11.13 11.12 11.12 0 0 1-11.13 11.13z"/>
      </svg>
    ),
  },
  {
    name: "JavaScript",
    description: "npm install regraph",
    color: "#F7DF1E",
    href: "https://github.com/ildu00/ReGraph/tree/main/sdk/javascript",
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 256 256" fill="currentColor">
        <path d="M0 0h256v256H0V0zm243.3 189.4c-2-13-9.8-24-33.1-34.2-8.1-3.8-17.1-6.5-19.8-12.6-1-2.3-1.2-3.6-0.5-5.1 1.8-5 7.3-6.5 12.1-5.1 3.1 1 6 3.4 7.8 7.3 8.3-5.4 8.3-5.4 14-9-2.1-3.3-3.2-4.8-4.7-6.2-5-5.8-11.7-8.7-22.6-8.5l-5.6 0.7c-5.4 1.2-10.5 3.9-13.5 7.4-9 10.6-6.4 29.1 4.5 36.8 10.8 8.2 26.6 10 28.6 17.7 1.9 9.2-6.8 12.2-15.4 11.1-6.3-1.4-9.8-4.6-13.6-10.5l-14.6 8.4c1.7 3.9 3.6 5.6 6.5 9 9.8 10 22.9 13.1 38.4 10.6 0.9-0.2 1.9-0.4 2.8-0.7 11.8-4.3 17.6-14 16.7-27.8zm-64.3-43h-18c0 14.9 0 29.9 0 44.9 0 9.4 0.5 18.1-1.1 20.8-2.5 5.3-9 4.7-11.9 3.7-2.9-1.3-4.4-3.2-6.1-5.9-0.5-0.8-0.9-1.4-1-1.4l-14.6 9c2.5 5.1 6.1 9.4 10.7 12.2 6.8 4 15.9 5.3 25.5 3 6.3-1.6 11.7-5.2 14.6-10.4 4-6.3 3.1-14 3.1-22.6 0-17.8 0-35.5 0-53.4z"/>
      </svg>
    ),
  },
  {
    name: "Go",
    description: "go get regraph.tech/sdk",
    color: "#00ADD8",
    href: null, // Coming soon
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 256 348" fill="currentColor">
        <path d="M31.61 128.75c-.56 0-.9-.34-.68-.79l2.46-3.15c.23-.45.79-.79 1.24-.79h41.76c.56 0 .79.45.56.9l-2 3.04c-.22.45-.67.9-1.12.9l-42.22-.11zM.15 148.34c-.56 0-.9-.34-.68-.79l2.46-3.15c.23-.45.79-.79 1.24-.79h53.35c.56 0 .9.45.68.9l-.9 2.81c-.11.56-.68.9-1.12.9L.15 148.34zm49.55 19.48c-.56 0-.9-.45-.68-.9l1.58-2.92c.22-.45.68-.9 1.24-.9h23.44c.56 0 .9.45.9.9l-.34 2.81c0 .56-.56.9-1.01.9l-25.13.11zm95.73-11.66l-17.13 4.5c-1.57.45-1.68.56-3.04-1.12-1.57-1.91-2.81-3.15-5.06-4.27-6.85-3.6-13.48-2.59-19.65 1.68-7.4 5.17-11.22 12.7-11.1 21.78.11 9.08 6.39 16.6 15.36 17.94 7.74 1.12 14.37-1.46 19.65-7.29 1.12-1.24 2.13-2.59 3.37-4.16h-21.33c-2.25 0-2.81-1.35-2.02-3.15 1.35-3.26 3.94-8.77 5.4-11.56.34-.67 1.12-1.8 2.7-1.8h39.96c-.22 3.15-.22 6.29-.68 9.42-.9 6.52-3.15 12.7-6.74 18.32-5.73 9.08-13.59 15.7-23.67 19.2-8.32 2.92-16.76 3.37-25.19.79-8.32-2.59-15.02-7.63-19.76-15.02-4.05-6.52-5.96-13.7-5.84-21.45.22-10.99 3.82-20.86 11-29.27 7.51-8.88 16.98-14.37 28.42-16.15 9.31-1.46 18.32-.56 26.53 4.27 5.51 3.26 9.76 7.74 12.91 13.48.68 1.01.22 1.57-1.01 1.91l-.11.45zm48.09 59.71c-8.88-.22-17.02-2.59-24.09-8.1-5.96-4.72-9.98-10.77-11.56-18.21-2.25-10.43-.34-20.19 5.39-29.04 6.07-9.42 14.48-15.47 25.3-17.94 9.31-2.13 18.32-1.46 26.75 3.26 7.51 4.16 12.69 10.43 15.36 18.55 3.26 10.21 2.47 20.08-2.59 29.38-4.38 8.1-10.77 14.03-19.42 17.72-5.28 2.36-10.77 3.48-15.14 4.38zm18.32-45.01c-.11-1.8-.11-3.15-.45-4.5-2.25-9.87-11.79-14.93-21.11-11.45-9.08 3.37-14.03 10.21-15.14 19.76-.9 7.85 3.6 15.59 10.77 18.44 5.73 2.25 11.33 1.57 16.5-1.8 6.52-4.27 9.54-10.43 9.43-20.45z"/>
      </svg>
    ),
  },
  {
    name: "Ruby",
    description: "gem install regraph",
    color: "#CC342D",
    href: null, // Coming soon
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 256 255" fill="currentColor">
        <path d="M0 167.2L51.5 208 207.6 52.1l47.8 0L0 167.2zm229.3 36.4L179.5 254l75.9-45.4 0-5zM138.7 255.3l116.8-38.7-21.9-26.1L138.7 255.3zM254.7 94.2L226.8 84l-86.6 86.6 114.5-26.9 0-49.5zm-254.7 96.4l42.8 39.5 196.6-134.2-131.2 26.2L0 190.6zM28.5 6.2L0 47.2 53.6 0 28.5 6.2zm72.3-5.7L61.1 10.1 0 66.1 100.8 0.5zM255.4 48.7L230.1 2l-109 29.1 134.3 17.6zM227.5 0.6L119.4 5.3 176.3 0l51.2 0.6z"/>
      </svg>
    ),
  },
];

const SDKSection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      
      <div className="container relative z-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 mb-6">
            <Package className="h-4 w-4 text-primary" />
            <span className="text-sm font-mono text-primary">Developer Tools</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Official SDKs available for
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            OpenAI-compatible libraries to integrate ReGraph into your applications in minutes
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-10">
          {sdks.map((sdk, index) => (
            <motion.div
              key={sdk.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              {sdk.href ? (
                <a
                  href={sdk.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col items-center gap-3 p-6 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
                >
                  <div 
                    className="transition-transform group-hover:scale-110"
                    style={{ color: sdk.color }}
                  >
                    {sdk.icon}
                  </div>
                  <div className="text-center">
                    <div className="font-semibold flex items-center gap-1.5">
                      {sdk.name}
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-xs font-mono text-muted-foreground mt-1">
                      {sdk.description}
                    </div>
                  </div>
                </a>
              ) : (
                <div className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border/50 bg-card/50 opacity-60">
                  <div style={{ color: sdk.color }}>
                    {sdk.icon}
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{sdk.name}</div>
                    <div className="text-xs font-mono text-muted-foreground mt-1">
                      Coming soon
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center"
        >
          <Link
            to="/docs"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            View full API documentation
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default SDKSection;

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
      <svg className="h-8 w-8" viewBox="0 0 128 128">
        <linearGradient id="python-original-a" gradientUnits="userSpaceOnUse" x1="70.252" y1="1237.476" x2="170.659" y2="1151.089" gradientTransform="matrix(.563 0 0 -.568 -29.215 707.817)">
          <stop offset="0" stopColor="#5A9FD4"/>
          <stop offset="1" stopColor="#306998"/>
        </linearGradient>
        <linearGradient id="python-original-b" gradientUnits="userSpaceOnUse" x1="209.474" y1="1098.811" x2="173.62" y2="1149.537" gradientTransform="matrix(.563 0 0 -.568 -29.215 707.817)">
          <stop offset="0" stopColor="#FFD43B"/>
          <stop offset="1" stopColor="#FFE873"/>
        </linearGradient>
        <path fill="url(#python-original-a)" d="M63.391 1.988c-4.222.02-8.252.379-11.8 1.007-10.45 1.846-12.346 5.71-12.346 12.837v9.411h24.693v3.137H29.977c-7.176 0-13.46 4.313-15.426 12.521-2.268 9.405-2.368 15.275 0 25.096 1.755 7.311 5.947 12.519 13.124 12.519h8.491V67.234c0-8.151 7.051-15.34 15.426-15.34h24.665c6.866 0 12.346-5.654 12.346-12.548V15.833c0-6.693-5.646-11.72-12.346-12.837-4.244-.706-8.645-1.027-12.866-1.008zM50.037 9.557c2.55 0 4.634 2.117 4.634 4.721 0 2.593-2.083 4.69-4.634 4.69-2.56 0-4.633-2.097-4.633-4.69-.001-2.604 2.073-4.721 4.633-4.721z"/>
        <path fill="url(#python-original-b)" d="M91.682 28.38v10.966c0 8.5-7.208 15.655-15.426 15.655H51.591c-6.756 0-12.346 5.783-12.346 12.549v23.515c0 6.691 5.818 10.628 12.346 12.547 7.816 2.297 15.312 2.713 24.665 0 6.216-1.801 12.346-5.423 12.346-12.547v-9.412H63.938v-3.138h37.012c7.176 0 9.852-5.005 12.348-12.519 2.578-7.735 2.467-15.174 0-25.096-1.774-7.145-5.161-12.521-12.348-12.521h-9.268zM77.809 87.927c2.561 0 4.634 2.097 4.634 4.692 0 2.602-2.074 4.719-4.634 4.719-2.55 0-4.633-2.117-4.633-4.719 0-2.595 2.083-4.692 4.633-4.692z"/>
      </svg>
    ),
  },
  {
    name: "JavaScript",
    description: "npm install regraph",
    color: "#F7DF1E",
    href: "https://github.com/ildu00/ReGraph/tree/main/sdk/javascript",
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 128 128">
        <path fill="#F0DB4F" d="M1.408 1.408h125.184v125.185H1.408z"/>
        <path fill="#323330" d="M116.347 96.736c-.917-5.711-4.641-10.508-15.672-14.981-3.832-1.761-8.104-3.022-9.377-5.926-.452-1.69-.512-2.642-.226-3.665.821-3.32 4.784-4.355 7.925-3.403 2.023.678 3.938 2.237 5.093 4.724 5.402-3.498 5.391-3.475 9.163-5.879-1.381-2.141-2.118-3.129-3.022-4.045-3.249-3.629-7.676-5.498-14.756-5.355l-3.688.477c-3.534.893-6.902 2.748-8.877 5.235-5.926 6.724-4.236 18.492 2.975 23.335 7.104 5.332 17.54 6.545 18.873 11.531 1.297 6.104-4.486 8.08-10.234 7.378-4.236-.881-6.592-3.034-9.139-6.949-4.688 2.713-4.688 2.713-9.508 5.485 1.143 2.499 2.344 3.63 4.26 5.795 9.068 9.198 31.76 8.746 35.83-5.176.165-.478 1.261-3.666.38-8.581zM69.462 58.943H57.753l-.048 30.272c0 6.438.333 12.34-.714 14.149-1.713 3.558-6.152 3.117-8.175 2.427-2.059-1.012-3.106-2.451-4.319-4.485-.333-.584-.583-1.036-.667-1.071l-9.52 5.83c1.583 3.249 3.915 6.069 6.902 7.901 4.462 2.678 10.459 3.499 16.731 2.059 4.082-1.189 7.604-3.652 9.448-7.401 2.666-4.915 2.094-10.864 2.07-17.444.06-10.735.001-21.468.001-32.237z"/>
      </svg>
    ),
  },
  {
    name: "Go",
    description: "go get regraph.tech/sdk",
    color: "#00ADD8",
    href: null,
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 128 128">
        <path fill="#00acd7" d="M18.8 69.3c-.1 0-.2-.1-.1-.2l.7-1c.1-.1.2-.2.4-.2h12.5c.1 0 .2.1.1.2l-.6.9c-.1.1-.2.2-.4.2l-12.6.1zM7.6 74.6c-.1 0-.2-.1-.1-.2l.7-1c.1-.1.2-.2.4-.2h16c.1 0 .2.1.2.2l-.3.9c0 .1-.2.2-.3.2l-16.6.1zM21.5 80c-.1 0-.2-.1-.1-.2l.4-.9c.1-.1.2-.2.4-.2h7c.1 0 .2.1.2.2l-.1.8c0 .1-.1.2-.2.2l-7.6.1zM78.9 68.9c-2.4.6-4.1 1.1-6.5 1.7-.5.1-.6.2-1-.4-.5-.6-.9-1-1.6-1.4-2.2-1.1-4.4-.8-6.4.5-2.4 1.5-3.6 3.8-3.6 6.7 0 2.8 2 5 4.8 5.4 2.4.3 4.4-.5 6-2.3.3-.4.6-.8 1-1.3h-6.8c-.7 0-.9-.5-.7-1.1.5-1.2 1.3-3.2 1.8-4.2.1-.3.4-.7.9-.7h12.7c-.1 1-.1 2-.2 3-.4 2.4-1.3 4.7-2.7 6.7-2.3 3.2-5.3 5.4-9.2 6.2-3.2.7-6.3.4-9.1-1.3-2.6-1.6-4.2-3.9-4.8-6.9-.7-3.5.1-6.7 1.9-9.7 2-3.2 4.8-5.4 8.4-6.5 3-.9 6-.9 8.8.4 1.9.8 3.3 2.2 4.3 4 .3.3.2.5-.3.6zM105.7 86.5c-2.9-.1-5.5-.8-7.8-2.6-1.9-1.5-3.1-3.5-3.5-5.9-.6-3.6.3-6.9 2.2-9.8 2.1-3.2 5-5.2 8.7-6 3.1-.6 6.1-.4 8.8 1.2 2.4 1.4 3.9 3.5 4.5 6.2.7 4-.1 7.6-2.5 10.8-1.8 2.4-4.2 4-7 5-1.3.4-2.8.2-3.4.1zm7.6-12.6c0-.5 0-.8-.1-1.2-.5-2.7-2.7-4.2-5.4-3.8-2.7.4-4.6 1.9-5.6 4.5-.8 2.2-.5 4.4 1.2 6.1 1.1 1.2 2.6 1.6 4.2 1.4 2.8-.4 4.8-1.9 5.6-4.6.2-.8.1-1.7.1-2.4z"/>
        <path fill="#00acd7" d="M60.1 86.7c-2.8-.1-5.4-.8-7.6-2.5-1.8-1.4-3-3.3-3.4-5.6-.6-3.4.2-6.5 1.9-9.3 2-3.3 4.9-5.5 8.7-6.4 3-.7 5.9-.5 8.6 1 2.5 1.4 4 3.5 4.6 6.3.7 3.9-.1 7.5-2.4 10.6-1.8 2.5-4.2 4.2-7.2 5.1-1.2.5-2.5.7-4.2.8zm7.5-12.4c0-.5 0-.8-.1-1.2-.5-2.6-2.6-4.2-5.3-3.8-2.7.4-4.7 1.9-5.7 4.4-.9 2.3-.6 4.5 1.2 6.3 1.2 1.2 2.6 1.6 4.3 1.4 2.8-.4 4.7-1.9 5.5-4.6.2-.8.1-1.8.1-2.5z"/>
      </svg>
    ),
  },
  {
    name: "Ruby",
    description: "gem install regraph",
    color: "#CC342D",
    href: null,
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 128 128">
        <linearGradient id="ruby-original-a" gradientUnits="userSpaceOnUse" x1="157.08" y1="2382.05" x2="131.682" y2="2426.892" gradientTransform="matrix(1 0 0 -1 -47.5 2517)">
          <stop offset="0" stopColor="#FB7655"/>
          <stop offset="0" stopColor="#FB7655"/>
          <stop offset=".41" stopColor="#E42B1E"/>
          <stop offset=".99" stopColor="#900"/>
          <stop offset="1" stopColor="#900"/>
        </linearGradient>
        <path fill="url(#ruby-original-a)" d="M118.5 97.5L59 124l50-22.5z"/>
        <linearGradient id="ruby-original-b" gradientUnits="userSpaceOnUse" x1="169.731" y1="2419.72" x2="136.998" y2="2441.685" gradientTransform="matrix(1 0 0 -1 -47.5 2517)">
          <stop offset="0" stopColor="#871101"/>
          <stop offset="0" stopColor="#871101"/>
          <stop offset=".99" stopColor="#911209"/>
          <stop offset="1" stopColor="#911209"/>
        </linearGradient>
        <path fill="url(#ruby-original-b)" d="M109 101.5L59 124l18 3z"/>
        <linearGradient id="ruby-original-c" gradientUnits="userSpaceOnUse" x1="143.542" y1="2432.81" x2="110.81" y2="2454.774" gradientTransform="matrix(1 0 0 -1 -47.5 2517)">
          <stop offset="0" stopColor="#871101"/>
          <stop offset="0" stopColor="#871101"/>
          <stop offset=".99" stopColor="#911209"/>
          <stop offset="1" stopColor="#911209"/>
        </linearGradient>
        <path fill="url(#ruby-original-c)" d="M77 127l-18-3 10 4z"/>
        <linearGradient id="ruby-original-d" gradientUnits="userSpaceOnUse" x1="74.817" y1="2435.622" x2="79.891" y2="2402.644" gradientTransform="matrix(1 0 0 -1 -47.5 2517)">
          <stop offset="0" stopColor="#fff"/>
          <stop offset="0" stopColor="#fff"/>
          <stop offset=".23" stopColor="#E57252"/>
          <stop offset=".46" stopColor="#DE3B20"/>
          <stop offset=".99" stopColor="#A60003"/>
          <stop offset="1" stopColor="#A60003"/>
        </linearGradient>
        <path fill="url(#ruby-original-d)" d="M16 102l43 22 8-46z"/>
        <linearGradient id="ruby-original-e" gradientUnits="userSpaceOnUse" x1="109.719" y1="2466.413" x2="111.589" y2="2432.757" gradientTransform="matrix(1 0 0 -1 -47.5 2517)">
          <stop offset="0" stopColor="#fff"/>
          <stop offset="0" stopColor="#fff"/>
          <stop offset=".23" stopColor="#E4714E"/>
          <stop offset=".56" stopColor="#BE1A0D"/>
          <stop offset=".99" stopColor="#A80D00"/>
          <stop offset="1" stopColor="#A80D00"/>
        </linearGradient>
        <path fill="url(#ruby-original-e)" d="M67 78L16 102l51 22z"/>
        <linearGradient id="ruby-original-f" gradientUnits="userSpaceOnUse" x1="140.691" y1="2469.963" x2="146.289" y2="2424.379" gradientTransform="matrix(1 0 0 -1 -47.5 2517)">
          <stop offset="0" stopColor="#fff"/>
          <stop offset="0" stopColor="#fff"/>
          <stop offset=".18" stopColor="#E46342"/>
          <stop offset=".4" stopColor="#C82410"/>
          <stop offset=".99" stopColor="#A80D00"/>
          <stop offset="1" stopColor="#A80D00"/>
        </linearGradient>
        <path fill="url(#ruby-original-f)" d="M109 101.5L67 78l-8 46z"/>
        <linearGradient id="ruby-original-g" gradientUnits="userSpaceOnUse" x1="123.6" y1="2506.018" x2="147.719" y2="2518.789" gradientTransform="matrix(1 0 0 -1 -47.5 2517)">
          <stop offset="0" stopColor="#fff"/>
          <stop offset="0" stopColor="#fff"/>
          <stop offset=".54" stopColor="#C81F11"/>
          <stop offset=".99" stopColor="#BF0905"/>
          <stop offset="1" stopColor="#BF0905"/>
        </linearGradient>
        <path fill="url(#ruby-original-g)" d="M118.5 97.5L109 16.5l-42 61.5z"/>
        <linearGradient id="ruby-original-h" gradientUnits="userSpaceOnUse" x1="66.333" y1="2496.149" x2="81.417" y2="2475.363" gradientTransform="matrix(1 0 0 -1 -47.5 2517)">
          <stop offset="0" stopColor="#fff"/>
          <stop offset="0" stopColor="#fff"/>
          <stop offset=".31" stopColor="#DE4024"/>
          <stop offset=".99" stopColor="#BF190B"/>
          <stop offset="1" stopColor="#BF190B"/>
        </linearGradient>
        <path fill="url(#ruby-original-h)" d="M43 26l24 52 42-61.5z"/>
        <linearGradient id="ruby-original-i" gradientUnits="userSpaceOnUse" x1="67.086" y1="2468.379" x2="53.378" y2="2442.778" gradientTransform="matrix(1 0 0 -1 -47.5 2517)">
          <stop offset="0" stopColor="#BD0012"/>
          <stop offset="0" stopColor="#BD0012"/>
          <stop offset=".07" stopColor="#fff"/>
          <stop offset=".17" stopColor="#fff"/>
          <stop offset=".27" stopColor="#C82F1C"/>
          <stop offset=".33" stopColor="#820C01"/>
          <stop offset=".46" stopColor="#A31601"/>
          <stop offset=".72" stopColor="#B31301"/>
          <stop offset=".99" stopColor="#E82609"/>
          <stop offset="1" stopColor="#E82609"/>
        </linearGradient>
        <path fill="url(#ruby-original-i)" d="M16 102l51-24-24-52z"/>
        <linearGradient id="ruby-original-j" gradientUnits="userSpaceOnUse" x1="109.5" y1="2506.375" x2="109.5" y2="2469.625" gradientTransform="matrix(1 0 0 -1 -47.5 2517)">
          <stop offset="0" stopColor="#8C0C01"/>
          <stop offset="0" stopColor="#8C0C01"/>
          <stop offset=".54" stopColor="#990C00"/>
          <stop offset=".99" stopColor="#A80D0E"/>
          <stop offset="1" stopColor="#A80D0E"/>
        </linearGradient>
        <path fill="url(#ruby-original-j)" d="M109 16.5l-42 61.5-24-52z"/>
        <linearGradient id="ruby-original-k" gradientUnits="userSpaceOnUse" x1="94.5" y1="2512" x2="94.5" y2="2492" gradientTransform="matrix(1 0 0 -1 -47.5 2517)">
          <stop offset="0" stopColor="#7E110B"/>
          <stop offset="0" stopColor="#7E110B"/>
          <stop offset=".99" stopColor="#9E0C00"/>
          <stop offset="1" stopColor="#9E0C00"/>
        </linearGradient>
        <path fill="url(#ruby-original-k)" d="M109 16.5L43 26l-33 3z"/>
        <linearGradient id="ruby-original-l" gradientUnits="userSpaceOnUse" x1="55" y1="2492" x2="55" y2="2432" gradientTransform="matrix(1 0 0 -1 -47.5 2517)">
          <stop offset="0" stopColor="#79130D"/>
          <stop offset="0" stopColor="#79130D"/>
          <stop offset=".99" stopColor="#9E120B"/>
          <stop offset="1" stopColor="#9E120B"/>
        </linearGradient>
        <path fill="url(#ruby-original-l)" d="M10 29l6 73 27-76z"/>
        <path fill="#9E1209" d="M109 16.5L43 26 10 29l6 73z"/>
        <path fill="#fff" fillOpacity=".8" d="M10 29l6 73 51-24 42-61.5L43 26z"/>
        <path fill="#BD0012" d="M10 29l47.6-3H43l-33 3z"/>
        <path fill="#fff" fillOpacity=".2" d="M10 29l6 73 51-24z"/>
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
                  <div className="transition-transform group-hover:scale-110">
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
                  <div>{sdk.icon}</div>
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

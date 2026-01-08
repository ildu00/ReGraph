import { motion } from "framer-motion";
import { Check, X, Minus } from "lucide-react";

const competitors = [
  {
    name: "NeuralGrid",
    highlight: true,
    gpuHour: "$0.15",
    inference: "$0.0001",
    minCommit: "None",
    setupFee: "Free",
    features: {
      smartphones: true,
      customHardware: true,
      payAsYouGo: true,
      noVendorLock: true,
      openApi: true,
    },
  },
  {
    name: "AWS SageMaker",
    gpuHour: "$3.06",
    inference: "$0.0023",
    minCommit: "$100/mo",
    setupFee: "$50",
    features: {
      smartphones: false,
      customHardware: false,
      payAsYouGo: "partial",
      noVendorLock: false,
      openApi: true,
    },
  },
  {
    name: "RunPod",
    gpuHour: "$0.44",
    inference: "$0.0003",
    minCommit: "$10",
    setupFee: "Free",
    features: {
      smartphones: false,
      customHardware: false,
      payAsYouGo: true,
      noVendorLock: true,
      openApi: true,
    },
  },
  {
    name: "HuggingFace",
    gpuHour: "$0.90",
    inference: "$0.0006",
    minCommit: "$9/mo",
    setupFee: "Free",
    features: {
      smartphones: false,
      customHardware: false,
      payAsYouGo: "partial",
      noVendorLock: true,
      openApi: true,
    },
  },
  {
    name: "Google Cloud",
    gpuHour: "$2.48",
    inference: "$0.0020",
    minCommit: "$300",
    setupFee: "$0",
    features: {
      smartphones: false,
      customHardware: false,
      payAsYouGo: true,
      noVendorLock: false,
      openApi: true,
    },
  },
];

const featureLabels = {
  smartphones: "Smartphone Support",
  customHardware: "Bring Your Hardware",
  payAsYouGo: "True Pay-as-you-go",
  noVendorLock: "No Vendor Lock-in",
  openApi: "Open REST API",
};

const FeatureIcon = ({ value }: { value: boolean | string }) => {
  if (value === true) return <Check className="h-5 w-5 text-primary" />;
  if (value === false) return <X className="h-5 w-5 text-muted-foreground/50" />;
  return <Minus className="h-5 w-5 text-muted-foreground" />;
};

const ComparisonSection = () => {
  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/50 to-background" />
      
      <div className="container relative z-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient">Up to 80% cheaper</span> than alternatives
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Compare our pricing with major cloud providers and see why developers choose NeuralGrid
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="overflow-x-auto"
        >
          <table className="w-full min-w-[800px] border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-4 px-4 font-mono text-sm text-muted-foreground">Provider</th>
                <th className="text-center py-4 px-4 font-mono text-sm text-muted-foreground">GPU/hour</th>
                <th className="text-center py-4 px-4 font-mono text-sm text-muted-foreground">Inference/req</th>
                <th className="text-center py-4 px-4 font-mono text-sm text-muted-foreground">Min Commit</th>
                <th className="text-center py-4 px-4 font-mono text-sm text-muted-foreground">Setup</th>
                {Object.keys(featureLabels).map((key) => (
                  <th key={key} className="text-center py-4 px-4 font-mono text-sm text-muted-foreground">
                    {featureLabels[key as keyof typeof featureLabels]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {competitors.map((comp, i) => (
                <motion.tr
                  key={comp.name}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`border-b border-border transition-colors ${
                    comp.highlight 
                      ? "bg-primary/5 border-primary/30" 
                      : "hover:bg-card/50"
                  }`}
                >
                  <td className="py-5 px-4">
                    <span className={`font-semibold ${comp.highlight ? "text-primary" : ""}`}>
                      {comp.name}
                    </span>
                    {comp.highlight && (
                      <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-mono">
                        YOU'RE HERE
                      </span>
                    )}
                  </td>
                  <td className={`text-center py-5 px-4 font-mono ${comp.highlight ? "text-primary font-bold" : ""}`}>
                    {comp.gpuHour}
                  </td>
                  <td className={`text-center py-5 px-4 font-mono ${comp.highlight ? "text-primary font-bold" : ""}`}>
                    {comp.inference}
                  </td>
                  <td className={`text-center py-5 px-4 font-mono ${comp.highlight ? "text-primary font-bold" : ""}`}>
                    {comp.minCommit}
                  </td>
                  <td className={`text-center py-5 px-4 font-mono ${comp.highlight ? "text-primary font-bold" : ""}`}>
                    {comp.setupFee}
                  </td>
                  {Object.keys(comp.features).map((key) => (
                    <td key={key} className="text-center py-5 px-4">
                      <div className="flex justify-center">
                        <FeatureIcon value={comp.features[key as keyof typeof comp.features]} />
                      </div>
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="text-center text-sm text-muted-foreground mt-8"
        >
          * Prices as of January 2026. Actual prices may vary based on region and usage.
        </motion.p>
      </div>
    </section>
  );
};

export default ComparisonSection;

import { Building2, MapPin, Hash, Mail, Globe, Calendar, Briefcase } from "lucide-react";

interface CompanyInfoProps {
  compact?: boolean;
}

const CompanyInfo = ({ compact = false }: CompanyInfoProps) => {
  if (compact) {
    return (
      <div className="p-4 rounded-lg bg-muted/30 border border-border">
        <h4 className="font-semibold mb-2 text-sm">Legal Entity</h4>
        <p className="text-xs text-muted-foreground">
          <strong>Polite Moose Limited</strong><br />
          Rm 7B, One Capital Place 18 Luard Road, Wan Chai, Hong Kong<br />
          Company No: 3179926 | <a href="mailto:info@polite-moose.com" className="text-primary hover:underline">info@polite-moose.com</a>
        </p>
      </div>
    );
  }

  return (
    <section className="p-6 rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-2xl font-semibold">Company Information</h2>
          <p className="text-sm text-muted-foreground">Legal entity operating ReGraph services</p>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium mb-1">Company Name</h3>
              <p className="text-muted-foreground">Polite Moose Limited</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium mb-1">Registered Address</h3>
              <p className="text-muted-foreground">
                Rm 7B, One Capital Place<br />
                18 Luard Road, Wan Chai<br />
                Hong Kong
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Hash className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium mb-1">Registration Number</h3>
              <p className="text-muted-foreground">3179926</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium mb-1">Incorporation Date</h3>
              <p className="text-muted-foreground">09 August 2022</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Briefcase className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium mb-1">Business Activities</h3>
              <p className="text-muted-foreground">Public Relations, Marketing, Brand Consultancy Services</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium mb-1">Contact</h3>
              <p className="text-muted-foreground">
                <a href="mailto:info@polite-moose.com" className="text-primary hover:underline">
                  info@polite-moose.com
                </a>
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Globe className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium mb-1">Website</h3>
              <p className="text-muted-foreground">
                <a 
                  href="https://www.polite-moose.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  www.polite-moose.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CompanyInfo;

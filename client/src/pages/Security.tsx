import { Link } from "wouter";
import { ArrowLeft, Shield, Lock, CheckCircle2, Zap } from "lucide-react";

export default function Security() {
  const features = [
    { icon: Shield, title: "SOC 2 Type II Certified", desc: "Audited and compliant with SOC 2 security standards" },
    { icon: Lock, title: "256-bit AES Encryption", desc: "All data encrypted in transit and at rest" },
    { icon: CheckCircle2, title: "GDPR Compliant", desc: "Full compliance with EU data protection regulations" },
    { icon: Zap, title: "TCPA Compliant", desc: "All calling and messaging follows TCPA guidelines" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-semibold">Back to Home</span>
            </div>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-20">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Security & Compliance</h1>
          <p className="text-muted-foreground">Your data security is our top priority</p>
        </div>

        {/* Security Badges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
              <Icon className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-lg font-bold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">Infrastructure Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              ApexAI is hosted on industry-leading cloud infrastructure with advanced security controls. All servers are 
              protected by multiple layers of firewalls, intrusion detection systems, and continuous monitoring. We maintain 
              99.99% uptime with redundant systems across multiple geographic regions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Data Encryption</h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              Your data is encrypted using industry-standard protocols:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>TLS 1.3 for data in transit</li>
              <li>256-bit AES encryption for data at rest</li>
              <li>End-to-end encryption for sensitive communications</li>
              <li>Regular encryption key rotation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Access Control</h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              We implement strict access controls including:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Multi-factor authentication (MFA) for all accounts</li>
              <li>Role-based access control (RBAC)</li>
              <li>Principle of least privilege</li>
              <li>Regular access reviews and audits</li>
              <li>Session management and timeout policies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">GDPR Compliance</h2>
            <p className="text-muted-foreground leading-relaxed">
              ApexAI is fully compliant with the General Data Protection Regulation (GDPR). We have implemented Data Protection 
              Impact Assessments (DPIA), maintain records of processing activities, and ensure individuals have rights to access, 
              correct, and delete their data. Our Data Processing Agreement (DPA) is available upon request.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">TCPA Compliance</h2>
            <p className="text-muted-foreground leading-relaxed">
              All voice calls and SMS messages sent through ApexAI comply with the Telephone Consumer Protection Act (TCPA). We 
              maintain Do-Not-Call list checks, provide opt-out mechanisms, and ensure all communications include proper 
              identification and callbacks numbers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Disaster Recovery & Backup</h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              We maintain comprehensive disaster recovery procedures:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Daily automated backups with multiple geographic redundancy</li>
              <li>Tested recovery procedures with RTOs of less than 1 hour</li>
              <li>Continuous replication of critical data</li>
              <li>Regular disaster recovery drills and testing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Audit & Monitoring</h2>
            <p className="text-muted-foreground leading-relaxed">
              ApexAI maintains continuous security monitoring with automated threat detection, regular security audits, 
              penetration testing, and vulnerability scanning. We log all access and changes to critical systems, maintaining 
              audit trails for compliance purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Incident Response</h2>
            <p className="text-muted-foreground leading-relaxed">
              In the unlikely event of a security incident, we have documented incident response procedures with designated 
              response teams, clear escalation paths, and notification procedures. We are committed to responding to incidents 
              within 24 hours.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Third-Party Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We carefully vet all third-party service providers and require security agreements, including Data Processing 
              Agreements for vendors who handle personal data. We maintain an inventory of sub-processors and require customer 
              notification for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Security Certifications</h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              ApexAI maintains the following certifications and compliance standards:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>SOC 2 Type II Certification</li>
              <li>GDPR Compliance</li>
              <li>TCPA Compliance</li>
              <li>ISO 27001 (Information Security Management)</li>
              <li>PCI DSS Level 1 (for payment processing)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Report a Vulnerability</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you discover a security vulnerability in ApexAI, please report it responsibly to security@apexai.io. 
              We appreciate your help in keeping our platform secure and will acknowledge receipt within 24 hours.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Contact Security Team</h2>
            <p className="text-muted-foreground leading-relaxed">
              For security-related inquiries or to request our Security Assessment Report, contact:
            </p>
            <p className="text-foreground font-semibold mt-4">
              security@apexai.io
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

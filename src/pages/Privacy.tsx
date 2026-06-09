import { Layout } from '@/components/layout/Layout';
import { Seo } from '@/components/Seo';

const Privacy = () => {
  return (
    <Layout>
      <Seo
        title="Privacy Policy | Intercen Books"
        description="Learn about how InterCEN Books collects, uses, and protects your personal information."
        canonical="https://www.intercenbooks.com/privacy"
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-charcoal to-charcoal/95 py-16 md:py-24">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-20 w-80 h-80 bg-primary/30 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-10 w-64 h-64 bg-secondary/20 rounded-full blur-3xl" />
        </div>

        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="headline-1 text-white mb-6">Privacy Policy</h1>
            <p className="body-1 text-white/80">
              We're committed to protecting your privacy and being transparent about how we handle your data.
            </p>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="max-w-3xl mx-auto prose prose-invert">
            {/* Last Updated */}
            <div className="mb-12 p-4 bg-muted/50 rounded-lg border border-white/10">
              <p className="text-sm text-white/70">
                <strong>Last Updated:</strong> June 2026
              </p>
            </div>

            {/* 1. Introduction */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">1. Introduction</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                InterCEN Books ("we," "us," "our," or "Company") operates the website located at www.intercenbooks.com 
                (the "Website"). This Privacy Policy explains how we collect, use, disclose, and otherwise handle your 
                information when you use our Website, including through our book marketplace, publishing services, content 
                management features, and digital platforms.
              </p>
              <p className="text-white/80 leading-relaxed">
                We are committed to protecting your privacy and ensuring you have a positive experience on our Website. 
                Please read this Privacy Policy carefully. If you do not agree with our policies and practices, please 
                do not use our Website.
              </p>
            </div>

            {/* 2. Information We Collect */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-white/90 mb-3">2.1 Information You Provide Directly</h3>
              <ul className="text-white/80 space-y-2 mb-6 list-disc list-inside">
                <li><strong>Account Registration:</strong> Name, email address, password, phone number, physical address, and payment information</li>
                <li><strong>Profile Information:</strong> Author/publisher profiles including biography, professional credentials, and website links</li>
                <li><strong>Content Submissions:</strong> Manuscripts, book covers, descriptions, and metadata</li>
                <li><strong>Communication:</strong> Messages, inquiries, and customer support requests</li>
                <li><strong>Purchases:</strong> Books purchased, cart items, order history, and transaction details</li>
                <li><strong>Payment Information:</strong> Credit card details, banking information (processed securely by Paystack)</li>
                <li><strong>User-Generated Content:</strong> Book reviews, ratings, comments, and feedback</li>
              </ul>

              <h3 className="text-xl font-semibold text-white/90 mb-3">2.2 Information Collected Automatically</h3>
              <ul className="text-white/80 space-y-2 mb-6 list-disc list-inside">
                <li><strong>Device Information:</strong> Device type, operating system, browser type, and unique device identifiers</li>
                <li><strong>Usage Data:</strong> Pages visited, time spent on pages, links clicked, search queries, and interaction patterns</li>
                <li><strong>Location Data:</strong> IP address, approximate location based on IP, and location preferences</li>
                <li><strong>Cookies & Similar Technologies:</strong> Cookies, web beacons, pixels, and similar tracking technologies</li>
                <li><strong>Analytics:</strong> Engagement metrics, conversion data, and user behavior patterns</li>
              </ul>

              <h3 className="text-xl font-semibold text-white/90 mb-3">2.3 Third-Party Information</h3>
              <p className="text-white/80 leading-relaxed">
                We may receive information from third-party services including:
              </p>
              <ul className="text-white/80 space-y-2 list-disc list-inside">
                <li>Payment processors (Paystack) for transaction verification</li>
                <li>Authentication providers for login services</li>
                <li>Analytics platforms for usage tracking</li>
                <li>Social media platforms if you link your accounts</li>
              </ul>
            </div>

            {/* 3. How We Use Your Information */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">3. How We Use Your Information</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                We use the information we collect for various purposes:
              </p>
              
              <ul className="text-white/80 space-y-2 list-disc list-inside mb-6">
                <li><strong>Account Management:</strong> Creating and maintaining your account, verifying identity, and managing credentials</li>
                <li><strong>Service Delivery:</strong> Processing purchases, managing orders, delivering digital content, and providing customer support</li>
                <li><strong>Publishing Services:</strong> Managing manuscript submissions, editorial review, publishing workflows, and royalty payments</li>
                <li><strong>Communication:</strong> Sending transactional emails, newsletters, updates, and promotional content (with your consent)</li>
                <li><strong>Personalization:</strong> Customizing your experience, recommending books, and showing relevant content</li>
                <li><strong>Analytics & Improvement:</strong> Understanding user behavior, improving our Website, and enhancing services</li>
                <li><strong>Legal Compliance:</strong> Meeting legal obligations, enforcing agreements, and protecting our rights</li>
                <li><strong>Payment Processing:</strong> Facilitating transactions and fraud prevention</li>
                <li><strong>Security:</strong> Protecting against unauthorized access, detecting fraud, and maintaining system integrity</li>
                <li><strong>Marketing:</strong> Conducting campaigns, analyzing effectiveness, and tailoring promotional activities (with consent)</li>
              </ul>
            </div>

            {/* 4. How We Share Your Information */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">4. How We Share Your Information</h2>
              
              <h3 className="text-xl font-semibold text-white/90 mb-3">4.1 Service Providers</h3>
              <p className="text-white/80 leading-relaxed mb-4">
                We share information with trusted service providers who assist us in operating our Website and conducting 
                our business, including:
              </p>
              <ul className="text-white/80 space-y-2 list-disc list-inside mb-6">
                <li><strong>Paystack</strong> - Payment processing and transaction security</li>
                <li><strong>Supabase</strong> - Cloud infrastructure, authentication, and database services</li>
                <li><strong>Email Service Providers</strong> - Newsletter distribution and notifications</li>
                <li><strong>Hosting Providers</strong> - Website infrastructure and maintenance</li>
                <li><strong>Analytics Services</strong> - Usage tracking and performance monitoring</li>
              </ul>

              <h3 className="text-xl font-semibold text-white/90 mb-3">4.2 Business Transactions</h3>
              <p className="text-white/80 leading-relaxed mb-4">
                If InterCEN Books is involved in a merger, acquisition, bankruptcy, dissolution, reorganization, or similar 
                transaction or proceeding, your information may be part of that transaction. We will provide notice before 
                your information becomes subject to a different privacy policy.
              </p>

              <h3 className="text-xl font-semibold text-white/90 mb-3">4.3 Legal Requirements</h3>
              <p className="text-white/80 leading-relaxed mb-4">
                We may disclose your information when required by law or when we believe in good faith that disclosure is 
                necessary to:
              </p>
              <ul className="text-white/80 space-y-2 list-disc list-inside mb-6">
                <li>Comply with legal obligations, court orders, or government requests</li>
                <li>Enforce our agreements and policies</li>
                <li>Protect the security or integrity of our Website</li>
                <li>Protect the rights, privacy, safety, or property of InterCEN Books, our users, or the public</li>
              </ul>

              <h3 className="text-xl font-semibold text-white/90 mb-3">4.4 Aggregated & De-identified Data</h3>
              <p className="text-white/80 leading-relaxed">
                We may share aggregated or de-identified information that cannot reasonably be used to identify you with 
                third parties for marketing, analytics, research, and other purposes.
              </p>
            </div>

            {/* 5. Data Security */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">5. Data Security</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                We implement comprehensive security measures to protect your information against unauthorized access, 
                alteration, disclosure, or destruction, including:
              </p>
              <ul className="text-white/80 space-y-2 list-disc list-inside mb-6">
                <li>SSL/TLS encryption for data transmission</li>
                <li>Secure password storage with industry-standard hashing</li>
                <li>Role-based access controls for sensitive data</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Secure API authentication and authorization</li>
                <li>Data encryption at rest for sensitive information</li>
              </ul>
              <p className="text-white/80 leading-relaxed">
                However, no method of transmission over the Internet or electronic storage is completely secure. While we 
                strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security. 
                You acknowledge that you provide information at your own risk.
              </p>
            </div>

            {/* 6. Cookies & Tracking Technologies */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">6. Cookies & Tracking Technologies</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                We use cookies and similar technologies to enhance your experience, analyze usage, and personalize content:
              </p>
              <ul className="text-white/80 space-y-2 list-disc list-inside mb-6">
                <li><strong>Essential Cookies:</strong> Necessary for Website functionality, authentication, and security</li>
                <li><strong>Performance Cookies:</strong> Track Website performance and user engagement</li>
                <li><strong>Functional Cookies:</strong> Remember your preferences and settings</li>
                <li><strong>Targeting Cookies:</strong> Enable personalized advertising and marketing</li>
              </ul>
              <p className="text-white/80 leading-relaxed">
                Most browsers allow you to refuse cookies or alert you when cookies are being sent. You can manage your 
                cookie preferences through your browser settings. Note that disabling cookies may affect Website functionality.
              </p>
            </div>

            {/* 7. Your Privacy Rights */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">7. Your Privacy Rights</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                Depending on your location, you may have certain rights regarding your personal information:
              </p>
              <ul className="text-white/80 space-y-2 list-disc list-inside mb-6">
                <li><strong>Right to Access:</strong> Request a copy of your personal information</li>
                <li><strong>Right to Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Right to Deletion:</strong> Request deletion of your data (subject to legal requirements)</li>
                <li><strong>Right to Opt-Out:</strong> Unsubscribe from marketing communications</li>
                <li><strong>Right to Data Portability:</strong> Request your data in a portable format</li>
                <li><strong>Right to Object:</strong> Object to certain processing activities</li>
              </ul>
              <p className="text-white/80 leading-relaxed">
                To exercise any of these rights, contact us at info.intercenbooks@gmail.com with "Privacy Request" in the 
                subject line. We will respond within 30 days.
              </p>
            </div>

            {/* 8. Data Retention */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">8. Data Retention</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                We retain your information for as long as necessary to provide services, comply with legal obligations, 
                resolve disputes, and enforce agreements. Retention periods vary by information type:
              </p>
              <ul className="text-white/80 space-y-2 list-disc list-inside mb-6">
                <li><strong>Account Data:</strong> Retained while your account is active and for 2 years after closure</li>
                <li><strong>Transaction Data:</strong> Retained for at least 5 years for legal and tax purposes</li>
                <li><strong>Communications:</strong> Retained for 1-3 years depending on purpose</li>
                <li><strong>Analytics Data:</strong> Retained for 12-24 months</li>
              </ul>
            </div>

            {/* 9. Third-Party Services */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">9. Third-Party Services & Links</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                Our Website may contain links to third-party websites and services not operated by InterCEN Books, including 
                payment processors, social media platforms, and external content providers. This Privacy Policy applies only 
                to our Website. We are not responsible for the privacy practices of third parties.
              </p>
              <p className="text-white/80 leading-relaxed">
                We encourage you to review the privacy policies of any third-party services before providing your information. 
                We specifically note:
              </p>
              <ul className="text-white/80 space-y-2 list-disc list-inside">
                <li><strong>Paystack:</strong> See their privacy policy at paystack.com for payment information handling</li>
                <li><strong>Supabase:</strong> See their privacy policy for cloud services data handling</li>
              </ul>
            </div>

            {/* 10. Children's Privacy */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">10. Children's Privacy</h2>
              <p className="text-white/80 leading-relaxed">
                Our Website is not intended for children under 13 years of age. We do not knowingly collect personal 
                information from children under 13. If we learn that we have collected personal information from a child 
                under 13 without parental consent, we will delete such information promptly. Parents or guardians who believe 
                their child has provided information should contact us immediately at info.intercenbooks@gmail.com.
              </p>
            </div>

            {/* 11. International Transfers */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">11. International Data Transfers</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                Your information may be transferred to, processed, and stored in countries other than your country of residence. 
                These countries may have data protection laws different from your home country. By using our Website, you consent 
                to the transfer of your information to countries outside your country of residence, which may have different data 
                protection rules.
              </p>
              <p className="text-white/80 leading-relaxed">
                Where required by law, we implement appropriate safeguards such as standard contractual clauses or adequacy decisions.
              </p>
            </div>

            {/* 12. California Privacy Rights */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">12. California & Regional Privacy Rights</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                Residents of California, Virginia, Colorado, and other jurisdictions with privacy laws have specific rights:
              </p>
              <ul className="text-white/80 space-y-2 list-disc list-inside mb-6">
                <li>Right to know what personal information is collected, used, and shared</li>
                <li>Right to delete personal information</li>
                <li>Right to correct inaccurate information</li>
                <li>Right to opt-out of the "sale" or sharing of personal information</li>
                <li>Right to limit use of sensitive personal information</li>
              </ul>
              <p className="text-white/80 leading-relaxed">
                To submit a request, contact us at info.intercenbooks@gmail.com with your request details. We will verify your 
                identity and respond within 45 days.
              </p>
            </div>

            {/* 13. Updates to Privacy Policy */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">13. Updates to This Privacy Policy</h2>
              <p className="text-white/80 leading-relaxed">
                We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal 
                requirements, or other factors. We will notify you of material changes by updating the "Last Updated" date and 
                prominently posting the revised policy on our Website. Your continued use of our Website following the posting 
                of changes constitutes your acceptance of those changes.
              </p>
            </div>

            {/* 14. Contact Us */}
            <div className="mb-10 p-6 bg-primary/10 rounded-lg border border-primary/30">
              <h2 className="text-2xl font-forum text-white mb-4">14. Contact Us</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                If you have questions about this Privacy Policy or our privacy practices, please contact us:
              </p>
              <div className="space-y-2 text-white/80">
                <p><strong>Email:</strong> <a href="mailto:info.intercenbooks@gmail.com" className="text-primary hover:underline">info.intercenbooks@gmail.com</a></p>
                <p><strong>Phone:</strong> <a href="tel:+254785174184" className="text-primary hover:underline">+254 785 174 184</a></p>
                <p><strong>Mailing Address:</strong></p>
                <p className="ml-4">
                  InterCEN Books<br />
                  Mumias Road<br />
                  Bungoma, Kenya
                </p>
              </div>
              <p className="text-white/80 leading-relaxed mt-4">
                We aim to resolve any concerns promptly. If you remain unsatisfied, you may have the right to file a complaint 
                with your local data protection authority.
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Privacy;

import { Layout } from '@/components/layout/Layout';
import { Seo } from '@/components/Seo';

const Terms = () => {
  return (
    <Layout>
      <Seo
        title="Terms of Service | Intercen Books"
        description="Read our terms of service to understand the conditions and rules for using InterCEN Books."
        canonical="https://www.intercenbooks.com/terms"
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-charcoal to-charcoal/95 py-16 md:py-24">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-20 w-80 h-80 bg-primary/30 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-10 w-64 h-64 bg-secondary/20 rounded-full blur-3xl" />
        </div>

        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="headline-1 text-white mb-6">Terms of Service</h1>
            <p className="body-1 text-white/80">
              Please read these terms carefully before using our website and services.
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

            {/* 1. Acceptance of Terms */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">1. Acceptance of Terms</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                By accessing and using this website (www.intercenbooks.com) and its associated services ("Website"), 
                you accept and agree to be bound by the terms and provision of this agreement ("Terms of Service"). 
                InterCEN Books ("Company," "we," "us," or "our") operates the Website.
              </p>
              <p className="text-white/80 leading-relaxed mb-4">
                If you do not agree to abide by the above, please do not use this service. We reserve the right to modify 
                these Terms of Service at any time. Your continued use of the Website following any such modifications constitutes 
                your acceptance of the revised Terms of Service.
              </p>
            </div>

            {/* 2. Use License */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">2. Use License</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                Permission is granted to temporarily download one copy of the materials (information or software) on our Website 
                for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and 
                under this license you may not:
              </p>
              <ul className="text-white/80 space-y-2 list-disc list-inside mb-6">
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose or for any public display</li>
                <li>Attempt to decompile or reverse engineer any software contained on the Website</li>
                <li>Remove any copyright or other proprietary notations from the materials</li>
                <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Interfere with or disrupt the Website or servers or networks connected to the Website</li>
              </ul>
            </div>

            {/* 3. User Accounts */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">3. User Accounts & Registration</h2>
              
              <h3 className="text-xl font-semibold text-white/90 mb-3">3.1 Account Creation</h3>
              <p className="text-white/80 leading-relaxed mb-4">
                To access certain features of the Website, you may be required to create an account. You agree to:
              </p>
              <ul className="text-white/80 space-y-2 list-disc list-inside mb-6">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain the confidentiality of your password and account information</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
                <li>Accept responsibility for all activities that occur under your account</li>
                <li>Comply with all applicable laws and regulations</li>
              </ul>

              <h3 className="text-xl font-semibold text-white/90 mb-3">3.2 Account Termination</h3>
              <p className="text-white/80 leading-relaxed">
                We reserve the right to suspend or terminate your account at any time, with or without cause, and with or 
                without notice, if we determine that you have violated these Terms of Service or engaged in inappropriate conduct.
              </p>
            </div>

            {/* 4. User Conduct */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">4. User Conduct & Prohibited Behavior</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                You agree that you will not, under any circumstances:
              </p>
              <ul className="text-white/80 space-y-2 list-disc list-inside mb-6">
                <li>Engage in any conduct that restricts or inhibits anyone's use or enjoyment of the Website</li>
                <li>Post, submit, or transmit any content that is unlawful, threatening, abusive, defamatory, obscene, or otherwise objectionable</li>
                <li>Harass, threaten, or intimidate any other user or staff member</li>
                <li>Use the Website to send unsolicited or commercial messages (spam)</li>
                <li>Impersonate or misrepresent your affiliation with any person or entity</li>
                <li>Upload, download, or transmit viruses, malware, or any other malicious code</li>
                <li>Attempt to gain unauthorized access to the Website, other accounts, or computer systems</li>
                <li>Engage in any form of automated data collection or "scraping"</li>
                <li>Interfere with the proper functioning of the Website through hacking, denial-of-service attacks, or other means</li>
                <li>Violate any applicable laws, regulations, or third-party rights</li>
                <li>Engage in any form of fraud or misrepresentation</li>
              </ul>
            </div>

            {/* 5. Content Ownership & Intellectual Property */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">5. Content Ownership & Intellectual Property</h2>
              
              <h3 className="text-xl font-semibold text-white/90 mb-3">5.1 Company Content</h3>
              <p className="text-white/80 leading-relaxed mb-4">
                All content on the Website, including text, graphics, logos, images, audio, video, software, and design elements, 
                is the property of InterCEN Books or its content suppliers and is protected by international copyright, trademark, 
                and other intellectual property laws. You may not reproduce, distribute, modify, or transmit any Company content 
                without our prior written consent.
              </p>

              <h3 className="text-xl font-semibold text-white/90 mb-3">5.2 User-Submitted Content</h3>
              <p className="text-white/80 leading-relaxed mb-4">
                When you submit content to the Website (manuscripts, reviews, comments, artwork, etc.), you grant InterCEN Books 
                a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, distribute, and display such content 
                in connection with our services. You represent and warrant that:
              </p>
              <ul className="text-white/80 space-y-2 list-disc list-inside mb-6">
                <li>You own or control all rights to the submitted content</li>
                <li>The content does not violate any third-party rights</li>
                <li>The content is not defamatory, obscene, or otherwise unlawful</li>
                <li>You have obtained all necessary permissions and consents</li>
              </ul>

              <h3 className="text-xl font-semibold text-white/90 mb-3">5.3 Book Content & Digital Rights</h3>
              <p className="text-white/80 leading-relaxed mb-4">
                For published books and digital content:
              </p>
              <ul className="text-white/80 space-y-2 list-disc list-inside mb-6">
                <li>Authors retain ownership of their works and intellectual property</li>
                <li>By publishing through InterCEN Books, authors grant us the right to distribute and sell their works</li>
                <li>Readers purchasing content receive a license to read for personal use only</li>
                <li>Digital content cannot be shared, copied, or redistributed without authorization</li>
                <li>InterCEN Books respects all copyright and intellectual property rights</li>
              </ul>
            </div>

            {/* 6. Payment & Billing */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">6. Payment & Billing</h2>
              
              <h3 className="text-xl font-semibold text-white/90 mb-3">6.1 Payment Terms</h3>
              <p className="text-white/80 leading-relaxed mb-4">
                When you make a purchase on our Website:
              </p>
              <ul className="text-white/80 space-y-2 list-disc list-inside mb-6">
                <li>You authorize us to charge your selected payment method</li>
                <li>You agree that all charges are accurate and non-refundable unless otherwise specified</li>
                <li>You are responsible for all taxes, shipping, and handling fees</li>
                <li>Prices may change without notice</li>
              </ul>

              <h3 className="text-xl font-semibold text-white/90 mb-3">6.2 Payment Processing</h3>
              <p className="text-white/80 leading-relaxed mb-4">
                We process payments through Paystack, a secure payment gateway. By making a purchase, you agree to their 
                terms and conditions. We do not store your full credit card information. All payment information is transmitted 
                securely and encrypted.
              </p>

              <h3 className="text-xl font-semibold text-white/90 mb-3">6.3 Refunds & Returns</h3>
              <p className="text-white/80 leading-relaxed mb-4">
                Digital content (e-books) are non-refundable after purchase. Physical books may be returned within 14 days 
                if they are unopened and in original condition, with proof of purchase. Refunds will be issued to the original 
                payment method. Special orders and customized products are non-refundable.
              </p>

              <h3 className="text-xl font-semibold text-white/90 mb-3">6.4 Recurring Charges</h3>
              <p className="text-white/80 leading-relaxed">
                If you have agreed to recurring charges (subscriptions, memberships), you authorize us to charge your payment 
                method at the specified intervals. You can cancel at any time by contacting customer support.
              </p>
            </div>

            {/* 7. Publishing & Author Terms */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">7. Publishing & Author Terms</h2>
              
              <h3 className="text-xl font-semibold text-white/90 mb-3">7.1 Manuscript Submission</h3>
              <p className="text-white/80 leading-relaxed mb-4">
                By submitting a manuscript to InterCEN Books:
              </p>
              <ul className="text-white/80 space-y-2 list-disc list-inside mb-6">
                <li>You confirm that the work is original and not previously published (unless specified)</li>
                <li>You own all rights to the submitted work</li>
                <li>You authorize us to review and provide feedback</li>
                <li>You acknowledge that acceptance is not guaranteed</li>
                <li>Submitted materials may not be returned</li>
              </ul>

              <h3 className="text-xl font-semibold text-white/90 mb-3">7.2 Publishing Agreements</h3>
              <p className="text-white/80 leading-relaxed mb-4">
                For accepted manuscripts, a separate publishing agreement will be negotiated detailing:
              </p>
              <ul className="text-white/80 space-y-2 list-disc list-inside mb-6">
                <li>Rights granted and retained by the author</li>
                <li>Royalty rates and payment schedules</li>
                <li>Distribution territories and formats</li>
                <li>Term and termination conditions</li>
                <li>Author responsibilities and representations</li>
              </ul>

              <h3 className="text-xl font-semibold text-white/90 mb-3">7.3 Content Standards</h3>
              <p className="text-white/80 leading-relaxed">
                We reserve the right to reject any manuscript that we determine to be:
              </p>
              <ul className="text-white/80 space-y-2 list-disc list-inside">
                <li>Defamatory, obscene, or otherwise unlawful</li>
                <li>In violation of third-party intellectual property rights</li>
                <li>Inconsistent with our publishing standards and values</li>
              </ul>
            </div>

            {/* 8. Disclaimer of Warranties */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">8. Disclaimer of Warranties</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                The Website and its materials are provided on an "AS-IS" and "AS AVAILABLE" basis. InterCEN Books makes no 
                warranties, expressed or implied, regarding the Website or materials, including:
              </p>
              <ul className="text-white/80 space-y-2 list-disc list-inside mb-6">
                <li>Implied warranties of merchantability or fitness for a particular purpose</li>
                <li>That the Website will be uninterrupted or error-free</li>
                <li>That defects will be corrected</li>
                <li>That the Website is free from viruses or harmful components</li>
                <li>The accuracy, completeness, or validity of any content</li>
              </ul>
              <p className="text-white/80 leading-relaxed">
                To the fullest extent permitted by law, InterCEN Books disclaims all warranties, representations, and conditions, 
                whether express or implied, statutory or otherwise.
              </p>
            </div>

            {/* 9. Limitation of Liability */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">9. Limitation of Liability</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                To the fullest extent permitted by applicable law:
              </p>
              <ul className="text-white/80 space-y-2 list-disc list-inside mb-6">
                <li>In no event shall InterCEN Books be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Website or materials</li>
                <li>This includes loss of profits, data, goodwill, or other intangible losses</li>
                <li>InterCEN Books' total liability arising out of or related to these Terms shall not exceed the amount you paid to us in the 12 months preceding the claim</li>
                <li>Some jurisdictions do not allow the limitation of liability, so this restriction may not apply to you</li>
              </ul>
            </div>

            {/* 10. Indemnification */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">10. Indemnification</h2>
              <p className="text-white/80 leading-relaxed">
                You agree to indemnify, defend, and hold harmless InterCEN Books, its officers, directors, employees, agents, 
                and affiliates from any claims, damages, losses, liabilities, or expenses (including attorney's fees) arising 
                from: (i) your use of the Website; (ii) your violation of these Terms of Service; (iii) your infringement of 
                any third-party rights; or (iv) any content you submit or transmit through the Website.
              </p>
            </div>

            {/* 11. Third-Party Links & Services */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">11. Third-Party Links & Services</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                Our Website may contain links to third-party websites and services not operated by InterCEN Books. We are not 
                responsible for the content, accuracy, or practices of these external sites. Your use of third-party websites is 
                governed by their terms and conditions.
              </p>
              <p className="text-white/80 leading-relaxed mb-4">
                Payment processing is handled by Paystack. Authentication services are provided by Supabase. We are not responsible 
                for their services or data handling practices. Please review their respective privacy policies and terms of service.
              </p>
            </div>

            {/* 12. Intellectual Property Claims */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">12. Intellectual Property Claims</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                If you believe your intellectual property rights have been infringed, please contact us with:
              </p>
              <ul className="text-white/80 space-y-2 list-disc list-inside mb-6">
                <li>A description of the copyrighted work or intellectual property right</li>
                <li>A description of where the material is located on our Website</li>
                <li>Your contact information</li>
                <li>A statement that you have a good faith belief the use is unlawful</li>
                <li>Your signature (physical or electronic)</li>
              </ul>
              <p className="text-white/80 leading-relaxed">
                Contact us at info.intercenbooks@gmail.com with the subject "DMCA Notice" to file a copyright claim.
              </p>
            </div>

            {/* 13. Dispute Resolution */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">13. Dispute Resolution & Governing Law</h2>
              
              <h3 className="text-xl font-semibold text-white/90 mb-3">13.1 Governing Law</h3>
              <p className="text-white/80 leading-relaxed mb-4">
                These Terms of Service are governed by and construed in accordance with the laws of Kenya, without regard to 
                its conflict of law provisions. Your use of the Website is at your own risk and subject to all applicable laws 
                and regulations.
              </p>

              <h3 className="text-xl font-semibold text-white/90 mb-3">13.2 Dispute Resolution</h3>
              <p className="text-white/80 leading-relaxed mb-4">
                Any disputes arising out of or relating to these Terms or your use of the Website shall be resolved through:
              </p>
              <ul className="text-white/80 space-y-2 list-disc list-inside mb-6">
                <li><strong>Informal Resolution:</strong> We will first attempt to resolve disputes through good-faith negotiation</li>
                <li><strong>Mediation:</strong> If negotiation fails, disputes may be submitted to mediation</li>
                <li><strong>Jurisdiction:</strong> You agree to submit to the exclusive jurisdiction of the courts located in Bungoma, Kenya</li>
              </ul>

              <h3 className="text-xl font-semibold text-white/90 mb-3">13.3 Severability</h3>
              <p className="text-white/80 leading-relaxed">
                If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall continue 
                in full force and effect.
              </p>
            </div>

            {/* 14. Termination */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">14. Termination of Service</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                We may terminate your access to the Website at any time, with or without cause and without notice. Upon termination:
              </p>
              <ul className="text-white/80 space-y-2 list-disc list-inside mb-6">
                <li>Your right to use the Website immediately ceases</li>
                <li>Any outstanding charges become immediately due</li>
                <li>We may delete your account and all associated data</li>
                <li>Provisions that should survive termination (liability, intellectual property, etc.) shall remain in effect</li>
              </ul>
            </div>

            {/* 15. Service Availability */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">15. Service Availability & Modifications</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                InterCEN Books reserves the right to:
              </p>
              <ul className="text-white/80 space-y-2 list-disc list-inside mb-6">
                <li>Modify, suspend, or discontinue the Website or any features at any time</li>
                <li>Perform maintenance or repairs without advance notice</li>
                <li>Remove content that violates these Terms</li>
                <li>Change features, functionality, or pricing</li>
              </ul>
              <p className="text-white/80 leading-relaxed">
                We are not liable for any modification, suspension, or discontinuation of service.
              </p>
            </div>

            {/* 16. User Feedback */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">16. User Feedback & Suggestions</h2>
              <p className="text-white/80 leading-relaxed">
                Any feedback, comments, or suggestions you provide regarding the Website or our services may be used by 
                InterCEN Books without obligation or compensation to you. You grant us a license to use any feedback for any 
                purpose without restriction.
              </p>
            </div>

            {/* 17. Entire Agreement */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">17. Entire Agreement</h2>
              <p className="text-white/80 leading-relaxed">
                These Terms of Service, along with our Privacy Policy and any other policies or agreements referenced herein, 
                constitute the entire agreement between you and InterCEN Books regarding your use of the Website. These Terms 
                supersede all prior agreements, understandings, and negotiations, whether written or oral.
              </p>
            </div>

            {/* 18. Contact Information */}
            <div className="mb-10 p-6 bg-primary/10 rounded-lg border border-primary/30">
              <h2 className="text-2xl font-forum text-white mb-4">18. Questions or Concerns</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                If you have any questions about these Terms of Service, please contact us:
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
                We will respond to inquiries within 5 business days.
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Terms;

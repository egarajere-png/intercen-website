import { Layout } from '@/components/layout/Layout';
import { Seo } from '@/components/Seo';

const Privacy = () => {
  return (
    <Layout>
      {/* <Seo
        title="Privacy Policy | Intercen Books"
        description="Learn about how Intercen Books collects, uses, and protects your personal information."
        canonical="https://www.intercenbooks.co.ke/privacy"
      /> */}

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
      <section className="py-12 md:py-16 bg-charcoal">
        <div className="container">
          <div className="max-w-3xl mx-auto prose prose-invert">
            {/* Effective Date / Last Updated */}
            <div className="mb-12 p-4 bg-muted/50 rounded-lg border border-white/10">
              <p className="text-sm text-white/70">
                <strong>Effective Date:</strong> 3rd May 2026
              </p>
              <p className="text-sm text-white/70">
                <strong>Last Updated:</strong> 9th June 2026
              </p>
            </div>

            {/* Intro */}
            <div className="mb-10">
              <p className="text-white/80 leading-relaxed mb-4">
                Intercen Books ("we," "our," or "us") values your privacy and is committed to protecting your personal
                information. This Privacy Policy explains how we collect, use, disclose, store, and protect information
                when you use the Intercen Books mobile application, website, and related services operated from
                Kakamega, Kenya.
              </p>
              <p className="text-white/80 leading-relaxed">
                By accessing or using Intercen Books, you consent to the practices described in this Privacy Policy.
              </p>
            </div>

            {/* 1. Who We Are */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">1. Who We Are</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                Intercen Books is an online platform for the sale, subscription, and reading of physical and virtual
                books, enabling users to discover, purchase, review, and access literary content.
              </p>
              <p className="text-white/80 leading-relaxed mb-4">
                For privacy-related questions, concerns, or requests, contact:
              </p>
              <p className="text-white/80 leading-relaxed">
                <strong>Intercen Books</strong><br />
                Kakamega, Kenya<br />
                <strong>Email:</strong>{' '}
                <a href="mailto:info.intercenbooks@gmail.com" className="text-primary hover:underline">
                  info.intercenbooks@gmail.com
                </a>
              </p>
            </div>

            {/* 2. Information We Collect */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">2. Information We Collect</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                We may collect personal information necessary to provide and improve our services.
              </p>

              <h3 className="text-xl font-semibold text-white/90 mb-3">a) Account Information</h3>
              <p className="text-white/80 leading-relaxed mb-2">When users create accounts, we may collect:</p>
              <ul className="text-white/80 space-y-2 mb-6 list-disc list-inside">
                <li>Full name</li>
                <li>Email address</li>
                <li>Password credentials (encrypted and protected)</li>
                <li>Account preferences</li>
              </ul>

              <h3 className="text-xl font-semibold text-white/90 mb-3">b) Subscription and Purchase Information</h3>
              <p className="text-white/80 leading-relaxed mb-2">When users make purchases or subscribe, we may collect:</p>
              <ul className="text-white/80 space-y-2 mb-6 list-disc list-inside">
                <li>Transaction details</li>
                <li>Subscription package information</li>
                <li>Payment confirmations</li>
                <li>Order history</li>
              </ul>

              <h3 className="text-xl font-semibold text-white/90 mb-3">c) Payment Information</h3>
              <p className="text-white/80 leading-relaxed mb-2">Payments may be processed through:</p>
              <ul className="text-white/80 space-y-2 mb-4 list-disc list-inside">
                <li>M-Pesa</li>
                <li>Paystack</li>
                <li>Other approved payment providers</li>
              </ul>
              <p className="text-white/80 leading-relaxed mb-4">
                Intercen Books does not directly store confidential financial credentials such as card numbers, PINs,
                or payment passwords.
              </p>
              <p className="text-white/80 leading-relaxed">
                Payment processing is managed by authorized third-party providers subject to their own privacy and
                security standards.
              </p>

              <h3 className="text-xl font-semibold text-white/90 mb-3 mt-6">d) Device and Usage Information</h3>
              <p className="text-white/80 leading-relaxed mb-2">We may automatically collect:</p>
              <ul className="text-white/80 space-y-2 mb-4 list-disc list-inside">
                <li>Device type</li>
                <li>Operating system</li>
                <li>App usage activity</li>
                <li>Reading preferences</li>
                <li>Login activity</li>
                <li>Technical performance data</li>
              </ul>
              <p className="text-white/80 leading-relaxed">
                This information helps improve platform performance and user experience.
              </p>

              <h3 className="text-xl font-semibold text-white/90 mb-3 mt-6">e) Reviews and User Content</h3>
              <p className="text-white/80 leading-relaxed">
                If users post book reviews, comments, ratings, or feedback, such information may become visible to
                other users of the platform.
              </p>
            </div>

            {/* 3. How We Use Your Information */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">3. How We Use Your Information</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                Intercen Books may use collected information to:
              </p>
              <ul className="text-white/80 space-y-2 list-disc list-inside">
                <li>Create and manage user accounts</li>
                <li>Process purchases and subscriptions</li>
                <li>Provide access to virtual books</li>
                <li>Facilitate delivery of physical books</li>
                <li>Process payments and administrative reversals</li>
                <li>Improve platform functionality</li>
                <li>Respond to support requests and tickets</li>
                <li>Send notifications regarding subscriptions, purchases, or updates</li>
                <li>Detect fraud, misuse, or unlawful activity</li>
                <li>Enforce our Terms and Conditions</li>
              </ul>
            </div>

            {/* 4. Subscriptions and Digital Access */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">4. Subscriptions and Digital Access</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                Intercen Books provides access to certain virtual books through subscription packages.
              </p>
              <p className="text-white/80 leading-relaxed mb-2">Users acknowledge that:</p>
              <ul className="text-white/80 space-y-2 mb-4 list-disc list-inside">
                <li>Digital books are read within the app only</li>
                <li>Subscription-based access remains available only during an active subscription period</li>
                <li>Access may terminate automatically upon subscription expiry</li>
              </ul>
              <p className="text-white/80 leading-relaxed">
                No permanent ownership of digital content is transferred through subscription access.
              </p>
            </div>

            {/* 5. How We Share Information */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">5. How We Share Information</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                We do not sell personal information to third parties.
              </p>
              <p className="text-white/80 leading-relaxed mb-4">
                However, we may share limited information where necessary with:
              </p>

              <h3 className="text-xl font-semibold text-white/90 mb-3">a) Payment Providers</h3>
              <p className="text-white/80 leading-relaxed mb-2">Including:</p>
              <ul className="text-white/80 space-y-2 mb-6 list-disc list-inside">
                <li>M-Pesa</li>
                <li>Paystack</li>
                <li>Authorized payment partners</li>
              </ul>

              <h3 className="text-xl font-semibold text-white/90 mb-3">b) Delivery Partners</h3>
              <p className="text-white/80 leading-relaxed mb-2">
                For physical books, limited information necessary for delivery may be shared with:
              </p>
              <ul className="text-white/80 space-y-2 mb-6 list-disc list-inside">
                <li>Couriers</li>
                <li>Riders</li>
                <li>Postal providers</li>
                <li>Pickup agents</li>
              </ul>

              <h3 className="text-xl font-semibold text-white/90 mb-3">c) Legal Compliance</h3>
              <p className="text-white/80 leading-relaxed mb-2">We may disclose information where required by:</p>
              <ul className="text-white/80 space-y-2 list-disc list-inside">
                <li>Law</li>
                <li>Court order</li>
                <li>Government request</li>
                <li>Fraud prevention investigations</li>
              </ul>
            </div>

            {/* 6. Data Security */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">6. Data Security</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                Intercen Books takes reasonable technical and administrative measures to protect personal information.
              </p>
              <p className="text-white/80 leading-relaxed mb-2">We implement safeguards including:</p>
              <ul className="text-white/80 space-y-2 mb-4 list-disc list-inside">
                <li>Password protection</li>
                <li>Restricted account access</li>
                <li>Secure payment integrations</li>
                <li>Administrative access controls</li>
              </ul>
              <p className="text-white/80 leading-relaxed">
                However, no internet-based system is completely secure, and users acknowledge risks associated with
                online platforms.
              </p>
            </div>

            {/* 7. Data Retention */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">7. Data Retention</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                We retain personal information only as long as reasonably necessary to:
              </p>
              <ul className="text-white/80 space-y-2 mb-4 list-disc list-inside">
                <li>Maintain user accounts</li>
                <li>Process purchases and subscriptions</li>
                <li>Resolve disputes</li>
                <li>Comply with legal obligations</li>
                <li>Prevent fraud or misuse</li>
              </ul>
              <p className="text-white/80 leading-relaxed">
                Intercen Books may delete inactive accounts or obsolete data where appropriate.
              </p>
            </div>

            {/* 8. User Rights */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">8. User Rights</h2>
              <p className="text-white/80 leading-relaxed mb-4">Users may request to:</p>
              <ul className="text-white/80 space-y-2 mb-4 list-disc list-inside">
                <li>Access their information</li>
                <li>Correct inaccurate information</li>
                <li>Update account details</li>
                <li>Delete their accounts, subject to legal or operational requirements</li>
              </ul>
              <p className="text-white/80 leading-relaxed mb-4">
                Requests may be submitted via:{' '}
                <a href="mailto:info.intercenbooks@gmail.com" className="text-primary hover:underline">
                  info.intercenbooks@gmail.com
                </a>
              </p>
              <p className="text-white/80 leading-relaxed">
                Intercen Books reserves the right to verify identity before processing requests.
              </p>
            </div>

            {/* 9. Cookies and Analytics */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">9. Cookies and Analytics</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                The website or app may use cookies or analytics technologies to:
              </p>
              <ul className="text-white/80 space-y-2 mb-4 list-disc list-inside">
                <li>Improve user experience</li>
                <li>Understand platform usage</li>
                <li>Enhance functionality</li>
                <li>Monitor technical performance</li>
              </ul>
              <p className="text-white/80 leading-relaxed">
                Users may adjust browser or device settings to limit cookie use where applicable.
              </p>
            </div>

            {/* 10. Children's Privacy */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">10. Children's Privacy</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                Intercen Books is not intended for children under the age of 18 years without supervision of a parent
                or guardian.
              </p>
              <p className="text-white/80 leading-relaxed">
                We do not knowingly collect personal information from minors without appropriate supervision.
              </p>
            </div>

            {/* 11. Third-Party Services */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">11. Third-Party Services</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                The Intercen Books platform may contain integrations or services operated by third parties, including
                payment providers.
              </p>
              <p className="text-white/80 leading-relaxed mb-4">
                Intercen Books is not responsible for the privacy practices of third-party services.
              </p>
              <p className="text-white/80 leading-relaxed">
                Users are encouraged to review relevant third-party policies where applicable.
              </p>
            </div>

            {/* 12. International Access */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">12. International Access</h2>
              <p className="text-white/80 leading-relaxed">
                Users accessing Intercen Books outside Kenya acknowledge that their information may be processed in
                accordance with Kenyan laws and operational requirements.
              </p>
            </div>

            {/* 13. Changes to This Privacy Policy */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">13. Changes to This Privacy Policy</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                Intercen Books reserves the right to update this Privacy Policy from time to time.
              </p>
              <p className="text-white/80 leading-relaxed mb-2">
                Users shall be notified of material updates through:
              </p>
              <ul className="text-white/80 space-y-2 mb-4 list-disc list-inside">
                <li>App notifications</li>
                <li>Website notices</li>
                <li>Email communication where appropriate</li>
              </ul>
              <p className="text-white/80 leading-relaxed">
                Continued use of the platform after updates constitutes acceptance of revised terms.
              </p>
            </div>

            {/* 14. Contact Us */}
            <div className="mb-10 p-6 bg-primary/10 rounded-lg border border-primary/30">
              <h2 className="text-2xl font-forum text-white mb-4">14. Contact Us</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                For questions, complaints, privacy concerns, or requests regarding personal information, contact:
              </p>
              <div className="space-y-2 text-white/80 mb-4">
                <p><strong>Intercen Books</strong></p>
                <p>Kakamega, Kenya</p>
                <p>
                  <strong>Email:</strong>{' '}
                  <a href="mailto:info.intercenbooks@gmail.com" className="text-primary hover:underline">
                    info.intercenbooks@gmail.com
                  </a>
                </p>
              </div>
              <p className="text-white/80 leading-relaxed">
                By using Intercen Books, you acknowledge that you have read, understood, and agreed to this Privacy
                Policy.
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Privacy;
import { Layout } from '@/components/layout/Layout';
import { Seo } from '@/components/Seo';

const Terms = () => {
  return (
    <Layout>
      {/* <Seo
        title="Terms and Conditions | Intercen Books"
        description="Read our terms and conditions to understand the conditions and rules for using Intercen Books."
        canonical="https://www.intercenbooks.co.ke/terms"
      /> */}

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-charcoal to-charcoal/95 py-16 md:py-24">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-20 w-80 h-80 bg-primary/30 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-10 w-64 h-64 bg-secondary/20 rounded-full blur-3xl" />
        </div>

        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="headline-1 text-white mb-6">Terms and Conditions</h1>
            <p className="body-1 text-white/80">
              Please read these terms carefully before using our website and services.
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
                Welcome to Intercen Books, an online platform for the sale, subscription, and reading of physical and
                virtual books. These Terms and Conditions govern the use of the Intercen Books mobile application,
                website, and related services operated from Kakamega, Kenya.
              </p>
              <p className="text-white/80 leading-relaxed">
                By creating an account, accessing, browsing, purchasing, subscribing to, or using Intercen Books, you
                agree to be legally bound by these Terms and Conditions. If you do not agree to these terms, kindly
                discontinue use of the platform.
              </p>
            </div>

            {/* 1. Definitions */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">1. Definitions</h2>
              <p className="text-white/80 leading-relaxed mb-4">For purposes of these Terms:</p>
              <ul className="text-white/80 space-y-2 list-disc list-inside">
                <li><strong>"Intercen Books"</strong> refers to the Intercen Books platform, including its website, mobile application, services, administrators, employees, agents, and affiliates.</li>
                <li><strong>"User"</strong> refers to any individual who accesses or uses the platform.</li>
                <li><strong>"Subscriber"</strong> means a user who has subscribed to a paid or free package offered by Intercen Books.</li>
                <li><strong>"Virtual Books"</strong> means digital books available for reading within the Intercen Books application or platform.</li>
                <li><strong>"Physical Books"</strong> means printed books available for purchase and delivery.</li>
                <li><strong>"Author"</strong> means a creator or rights holder whose books are distributed through Intercen Books.</li>
                <li><strong>"Content"</strong> means books, reviews, images, text, graphics, metadata, and materials displayed through the platform.</li>
              </ul>
            </div>

            {/* 2. Eligibility */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">2. Eligibility</h2>
              <p className="text-white/80 leading-relaxed mb-4">To use Intercen Books, you must:</p>
              <ul className="text-white/80 space-y-2 list-disc list-inside mb-6">
                <li>Be at least 18 years old, or use the platform under supervision of a parent or guardian</li>
                <li>Provide accurate registration information</li>
                <li>Have legal authority to enter into binding agreements</li>
              </ul>
              <p className="text-white/80 leading-relaxed">
                Intercen Books reserves the right to suspend or terminate accounts found to contain false, misleading,
                or fraudulent information.
              </p>
            </div>

            {/* 3. User Accounts */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">3. User Accounts</h2>
              <p className="text-white/80 leading-relaxed mb-4">Users may create accounts using:</p>
              <ul className="text-white/80 space-y-2 list-disc list-inside mb-6">
                <li>Email address</li>
                <li>Password</li>
              </ul>
              <p className="text-white/80 leading-relaxed mb-4">You are responsible for:</p>
              <ul className="text-white/80 space-y-2 list-disc list-inside mb-6">
                <li>Maintaining the confidentiality of your login credentials</li>
                <li>All activities conducted through your account</li>
                <li>Promptly notifying Intercen Books of unauthorized access</li>
              </ul>
              <p className="text-white/80 leading-relaxed mb-4">Users shall not:</p>
              <ul className="text-white/80 space-y-2 list-disc list-inside mb-6">
                <li>Share accounts</li>
                <li>Impersonate another person</li>
                <li>Use misleading or false identities</li>
                <li>Interfere with platform operations</li>
              </ul>
              <p className="text-white/80 leading-relaxed">
                Intercen Books reserves the right to suspend or terminate accounts suspected of misuse, fraud, abuse,
                or unlawful activity.
              </p>
            </div>

            {/* 4. Book Sales and Services */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">4. Book Sales and Services</h2>
              <p className="text-white/80 leading-relaxed mb-4">Intercen Books provides:</p>

              <h3 className="text-xl font-semibold text-white/90 mb-3">a) Physical Books</h3>
              <p className="text-white/80 leading-relaxed mb-2">
                Users may purchase physical books for delivery through available logistics options including:
              </p>
              <ul className="text-white/80 space-y-2 mb-4 list-disc list-inside">
                <li>Courier services</li>
                <li>Riders</li>
                <li>Postal delivery</li>
                <li>Approved pickup arrangements</li>
              </ul>
              <p className="text-white/80 leading-relaxed">
                Delivery charges shall be borne by the buyer unless otherwise stated.
              </p>

              <h3 className="text-xl font-semibold text-white/90 mb-3 mt-6">b) Virtual Books</h3>
              <p className="text-white/80 leading-relaxed mb-4">
                Virtual books are accessible through the Intercen Books platform and are intended for reading within
                the app only.
              </p>
              <p className="text-white/80 leading-relaxed mb-4">
                Users do not acquire ownership of virtual books. Instead, users receive a limited, non-transferable,
                revocable licence to access and read digital content in accordance with subscription terms.
              </p>
              <p className="text-white/80 leading-relaxed">
                Purchase or subscription access to a virtual book does not transfer copyright ownership to the user.
              </p>
            </div>

            {/* 5. Subscriptions */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">5. Subscriptions</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                Intercen Books may offer subscription packages that vary according to features, access levels,
                duration, and pricing.
              </p>

              <h3 className="text-xl font-semibold text-white/90 mb-3">Subscription Access</h3>
              <p className="text-white/80 leading-relaxed mb-4">
                Access to subscription-based virtual books shall remain valid only during an active subscription
                period.
              </p>
              <p className="text-white/80 leading-relaxed mb-2">Upon subscription expiry:</p>
              <ul className="text-white/80 space-y-2 mb-6 list-disc list-inside">
                <li>Access to subscription-based content shall automatically terminate</li>
                <li>Previously accessed digital books may no longer be accessible</li>
                <li>Continued access shall require subscription renewal unless otherwise stated</li>
              </ul>

              <h3 className="text-xl font-semibold text-white/90 mb-3">Subscription Cancellation</h3>
              <p className="text-white/80 leading-relaxed mb-4">
                Users may cancel subscription renewal at any time.
              </p>
              <p className="text-white/80 leading-relaxed mb-2">Cancellation shall:</p>
              <ul className="text-white/80 space-y-2 mb-4 list-disc list-inside">
                <li>Stop future billing</li>
                <li>Not affect access already paid for during an active subscription period</li>
                <li>Not automatically entitle users to refunds for unused subscription time</li>
              </ul>
              <p className="text-white/80 leading-relaxed">
                Intercen Books reserves the right to modify subscription packages, fees, benefits, or access
                privileges upon reasonable notice.
              </p>
            </div>

            {/* 6. Payments */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">6. Payments</h2>
              <p className="text-white/80 leading-relaxed mb-2">
                Payments may be processed through approved payment providers including but not limited to:
              </p>
              <ul className="text-white/80 space-y-2 mb-4 list-disc list-inside">
                <li>M-Pesa</li>
                <li>Paystack</li>
                <li>Other approved payment channels</li>
              </ul>
              <p className="text-white/80 leading-relaxed mb-2">Users agree that:</p>
              <ul className="text-white/80 space-y-2 mb-4 list-disc list-inside">
                <li>All payment information submitted must be lawful and authorized</li>
                <li>Intercen Books does not store confidential financial credentials beyond what is necessary for transaction processing</li>
                <li>Payment failures arising from third-party payment providers shall not constitute liability of Intercen Books</li>
              </ul>
              <p className="text-white/80 leading-relaxed">
                Prices displayed may change without prior notice.
              </p>
            </div>

            {/* 7. Returns, Refunds and Reversals */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">7. Returns, Refunds and Reversals</h2>

              <h3 className="text-xl font-semibold text-white/90 mb-3">Physical Books</h3>
              <p className="text-white/80 leading-relaxed mb-2">Returns may be accepted where:</p>
              <ul className="text-white/80 space-y-2 mb-4 list-disc list-inside">
                <li>A book arrives damaged</li>
                <li>An incorrect item is delivered</li>
                <li>A verified delivery problem exists</li>
              </ul>
              <p className="text-white/80 leading-relaxed mb-4">
                Users must raise a support ticket within a reasonable period after receiving the product.
              </p>
              <p className="text-white/80 leading-relaxed">
                Intercen Books reserves the right to verify complaints before approving replacement, return, or
                reversal.
              </p>

              <h3 className="text-xl font-semibold text-white/90 mb-3 mt-6">Virtual Books</h3>
              <p className="text-white/80 leading-relaxed mb-2">
                Because digital content becomes immediately accessible upon purchase or subscription activation,
                virtual books are generally non-refundable, except where:
              </p>
              <ul className="text-white/80 space-y-2 list-disc list-inside">
                <li>Technical failure prevents access</li>
                <li>Incorrect billing occurs</li>
                <li>Intercen Books determines exceptional circumstances exist</li>
              </ul>

              <h3 className="text-xl font-semibold text-white/90 mb-3 mt-6">Refund Processing</h3>
              <p className="text-white/80 leading-relaxed mb-2">
                Approved refunds or reversals shall be processed administratively and may be issued through:
              </p>
              <ul className="text-white/80 space-y-2 list-disc list-inside">
                <li>M-Pesa reversal mechanisms</li>
                <li>Paystack refund systems</li>
                <li>Other available administrative payment channels</li>
              </ul>
            </div>

            {/* 8. Author Rights and Commissions */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">8. Author Rights and Commissions</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                Authors retain ownership of their intellectual property.
              </p>
              <p className="text-white/80 leading-relaxed mb-2">
                By listing books on Intercen Books, authors grant Intercen Books a non-exclusive licence to:
              </p>
              <ul className="text-white/80 space-y-2 mb-4 list-disc list-inside">
                <li>Display</li>
                <li>Market</li>
                <li>Promote</li>
                <li>Sell</li>
                <li>Distribute content through the platform</li>
              </ul>
              <p className="text-white/80 leading-relaxed mb-4">
                Authors shall receive compensation according to agreed package structures and commission arrangements.
              </p>
              <p className="text-white/80 leading-relaxed mb-4">
                Commission rates may vary depending on package agreements between Intercen Books and authors.
              </p>
              <p className="text-white/80 leading-relaxed mb-4">
                Payments to authors may be made through M-Pesa or other approved channels.
              </p>
              <p className="text-white/80 leading-relaxed mb-2">
                Intercen Books reserves the right to suspend, reject, or remove books that:
              </p>
              <ul className="text-white/80 space-y-2 list-disc list-inside">
                <li>Violate copyright laws</li>
                <li>Promote unlawful conduct</li>
                <li>Contain harmful, misleading, defamatory, offensive, or inappropriate material</li>
              </ul>
            </div>

            {/* 9. User Reviews */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">9. User Reviews</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                Users may post reviews regarding books purchased or accessed through the platform.
              </p>
              <p className="text-white/80 leading-relaxed mb-2">Reviews must:</p>
              <ul className="text-white/80 space-y-2 mb-4 list-disc list-inside">
                <li>Be respectful</li>
                <li>Be truthful</li>
                <li>Avoid abusive, hateful, defamatory, misleading, or offensive language</li>
              </ul>
              <p className="text-white/80 leading-relaxed">
                Intercen Books reserves the right to remove reviews deemed inappropriate or harmful.
              </p>
            </div>

            {/* 10. Digital Content Protection and Prohibited Activities */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">10. Digital Content Protection and Prohibited Activities</h2>
              <p className="text-white/80 leading-relaxed mb-2">
                To protect authors and intellectual property, users shall not:
              </p>
              <ul className="text-white/80 space-y-2 mb-6 list-disc list-inside">
                <li>Copy, reproduce, screenshot, photograph, or record virtual books</li>
                <li>Share, redistribute, print, scrape, transmit, or pirate digital content</li>
                <li>Download or unlawfully extract virtual book materials</li>
                <li>Share subscription access unlawfully</li>
                <li>Use automated tools to copy platform content</li>
                <li>Engage in fraud or payment abuse</li>
                <li>Harass authors, users, or staff</li>
              </ul>
              <p className="text-white/80 leading-relaxed mb-4">
                Users acknowledge that virtual books remain protected intellectual property.
              </p>
              <p className="text-white/80 leading-relaxed mb-2">Violation may result in:</p>
              <ul className="text-white/80 space-y-2 list-disc list-inside">
                <li>Immediate suspension</li>
                <li>Account termination</li>
                <li>Revocation of subscription access</li>
                <li>Legal action where necessary</li>
              </ul>
            </div>

            {/* 11. Intellectual Property */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">11. Intellectual Property</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                All trademarks, branding, logos, software, designs, systems, and proprietary platform materials
                belonging to Intercen Books remain protected intellectual property.
              </p>
              <p className="text-white/80 leading-relaxed">
                Users may not reproduce, distribute, commercially exploit, or misuse platform materials without prior
                written authorization.
              </p>
            </div>

            {/* 12. Delivery Terms */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">12. Delivery Terms</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                Physical books shall be delivered through approved logistics channels.
              </p>
              <p className="text-white/80 leading-relaxed mb-2">Delivery timelines may vary depending on:</p>
              <ul className="text-white/80 space-y-2 mb-4 list-disc list-inside">
                <li>User location</li>
                <li>Courier availability</li>
                <li>Weather conditions</li>
                <li>Operational circumstances beyond reasonable control</li>
              </ul>
              <p className="text-white/80 leading-relaxed">
                Intercen Books shall not be held liable for delays caused by third-party logistics providers.
              </p>
            </div>

            {/* 13. Limitation of Liability */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">13. Limitation of Liability</h2>
              <p className="text-white/80 leading-relaxed mb-2">Intercen Books shall not be liable for:</p>
              <ul className="text-white/80 space-y-2 mb-4 list-disc list-inside">
                <li>Third-party delivery delays</li>
                <li>Payment gateway interruptions</li>
                <li>Device compatibility limitations</li>
                <li>Service interruptions beyond reasonable control</li>
                <li>User-generated reviews or content</li>
                <li>Temporary unavailability of digital services</li>
              </ul>
              <p className="text-white/80 leading-relaxed">
                Use of the platform is at the user's own risk.
              </p>
            </div>

            {/* 14. Account Suspension or Termination */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">14. Account Suspension or Termination</h2>
              <p className="text-white/80 leading-relaxed mb-2">
                Intercen Books reserves the right to suspend or terminate any account that:
              </p>
              <ul className="text-white/80 space-y-2 mb-4 list-disc list-inside">
                <li>Violates these Terms</li>
                <li>Engages in fraud</li>
                <li>Misuses subscriptions</li>
                <li>Violates intellectual property rights</li>
                <li>Endangers platform security</li>
              </ul>
              <p className="text-white/80 leading-relaxed">
                Termination may occur without prior notice in serious cases.
              </p>
            </div>

            {/* 15. Privacy */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">15. Privacy</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                User information shall be handled in accordance with the Intercen Books Privacy Policy.
              </p>
              <p className="text-white/80 leading-relaxed">
                By using the platform, users consent to the collection and processing of information necessary to
                operate the service.
              </p>
            </div>

            {/* 16. Modifications to Terms */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">16. Modifications to Terms</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                Intercen Books reserves the right to update or modify these Terms and Conditions at any time.
              </p>
              <p className="text-white/80 leading-relaxed">
                Continued use of the platform following updates constitutes acceptance of revised Terms.
              </p>
            </div>

            {/* 17. Governing Law */}
            <div className="mb-10">
              <h2 className="text-2xl font-forum text-white mb-4">17. Governing Law</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                These Terms and Conditions shall be governed and interpreted in accordance with the laws of the
                Republic of Kenya.
              </p>
              <p className="text-white/80 leading-relaxed">
                Any disputes arising from use of Intercen Books shall be resolved through Kenyan legal processes and
                competent courts.
              </p>
            </div>

            {/* 18. Contact Information */}
            <div className="mb-10 p-6 bg-primary/10 rounded-lg border border-primary/30">
              <h2 className="text-2xl font-forum text-white mb-4">18. Contact Information</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                For questions, complaints, refunds, copyright concerns, legal notices, or support requests, contact:
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
                By using Intercen Books, you acknowledge that you have read, understood, and agreed to these Terms
                and Conditions.
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Terms;
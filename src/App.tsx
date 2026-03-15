import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { CartProvider } from "@/contexts/CartContext";
import { RoleProvider } from "@/contexts/RoleContext";
import UserContentPage from "./pages/UserContentPage";
import { PageTransition } from "@/components/layout/PageTransition";

import ManuscriptSubmitForm from '@/pages/ManuscriptSubmitFile';
import AuthorSubmissions    from '@/pages/AuthorSubmissions';
import PublicationRequests  from '@/pages/PublicationRequest';

import Index from "./pages/Index";
import Books from "./pages/Books";
import BookDetail from "./pages/BookDetail";
import Cart from "./pages/Cart";
import About from "./pages/About";
import PublishWithUs from "./pages/PublishWithUs";
import ProductsServices from "./pages/ProductsServices";
import Auth from "./pages/Auth";
import ProfileSetup from "./pages/ProfileSetup";
import Profile from "./pages/Profile";
import ContentUpload from "./pages/ContentUpload";
import ContentManagement from "./pages/ContentManagement";
import ContentViewPage from "./pages/ContentViewPage";
import NotFound from "./pages/NotFound";
import CheckoutPayment from "./pages/CheckoutPayment";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentConfirmationPage from "./pages/PaymentConfirmationPage";
import ContentUpdatePage from "./pages/ContentUpdatePage";
import { ContentPublishButton } from "@/components/contents/ContentPublishButton";
import ContentDeletePage from "./pages/ContentDeletePage";
import ContentReviewsPage from "./pages/ContentReviewsPage";
import ContentDeleteConfirmationPage from "./pages/ContentDeleteConfirmationPage";
import ContentSearch from "./pages/ContentSearch";

import React, { Suspense } from "react";

const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));

const queryClient = new QueryClient();

function ContentPublishButtonPage() {
  const { id } = useParams();
  return (
    <div className="container py-12 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Publish Content</h1>
      <ContentPublishButton contentId={id || ''} currentStatus="draft" />
    </div>
  );
}

const App = () => {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <CartProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              {/* RoleProvider must be inside BrowserRouter (needs router context)
                  but wrapping all routes so every page can call useRole() */}
              <RoleProvider>
                <PageTransition>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/books" element={<Books />} />
                    <Route path="/books/:id" element={<BookDetail />} />
                    <Route path="/cart" element={<Cart />} />

                    {/* Payment Routes */}
                    <Route path="/checkout/payment/:orderId" element={<CheckoutPayment />} />
                    <Route path="/checkout/payment-success" element={<PaymentConfirmationPage />} />
                    <Route path="/payment-success" element={<PaymentConfirmationPage />} />
                    <Route path="/payment-failed" element={<PaymentConfirmationPage />} />
                    <Route path="/payment-cancelled" element={<PaymentConfirmationPage />} />
                    <Route path="/payment-pending" element={<PaymentConfirmationPage />} />
                    <Route path="/payment-status" element={<PaymentConfirmationPage />} />

                    {/* Other Pages */}
                    <Route path="/about" element={<About />} />
                    <Route path="/publish" element={<PublishWithUs />} />
                    <Route path="/services" element={<ProductsServices />} />

                    {/* Auth Routes */}
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/signin" element={<Auth />} />
                    <Route path="/login" element={<Auth />} />
                    <Route path="/profile-setup" element={<ProfileSetup />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route
                      path="/reset-password"
                      element={
                        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
                          <ResetPassword />
                        </Suspense>
                      }
                    />

                    {/* Publication Routes */}
                    <Route path="/publish/submit" element={<ManuscriptSubmitForm />} />
                    <Route path="/author/submissions" element={<AuthorSubmissions />} />
                    <Route path="/admin/publications" element={<PublicationRequests />} />

                    {/* Content Management Routes */}
                    <Route path="/upload" element={<ContentUpload />} />
                    <Route path="/content-management" element={<ContentManagement />} />
                    <Route path="/content" element={<UserContentPage />} />
                    <Route path="/content/:id" element={<ContentViewPage />} />
                    <Route path="/content/update/:id" element={<ContentUpdatePage />} />
                    <Route path="/content/publish/:id" element={<ContentPublishButtonPage />} />
                    <Route path="/content/delete/:id" element={<ContentDeletePage />} />
                    <Route path="/content/delete/confirmation" element={<ContentDeleteConfirmationPage />} />
                    <Route path="/content-search" element={<ContentSearch />} />

                    {/* Catch-all */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </PageTransition>
              </RoleProvider>
            </BrowserRouter>
          </CartProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
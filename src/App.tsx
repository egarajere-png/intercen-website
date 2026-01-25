import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";

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
import ContentUpdatePage from "./pages/ContentUpdatePage";
import ContentPublishButton from "./components/contents/ContentPublishButton";
import ContentDeletePage from "./pages/ContentDeletePage";
import ContentDeleteConfirmationPage from "./pages/ContentDeleteConfirmationPage";

import React, { Suspense, useEffect } from "react";
import { supabase } from "@/lib/SupabaseClient";

const PasswordChange = React.lazy(() => import("./pages/PasswordChange"));

const queryClient = new QueryClient();

// Simple wrapper page for ContentPublishButton demo route
function ContentPublishButtonPage() {
  const { id } = useParams();
  // For demo, status is draft
  return (
    <div className="container py-12 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Publish Content</h1>
      <ContentPublishButton contentId={id || ''} currentStatus="draft" />
    </div>
  );
}

const App = () => {
  // Critical: Handle Supabase auth hash parameters on app load (email confirmation, password reset, etc.)
  useEffect(() => {
    // Process any auth tokens in the URL hash (e.g., after clicking confirmation link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        console.log("Session recovered from URL hash:", session.user.email);
        // Optional: You can force redirect to /profile-setup if needed
        // if (window.location.pathname === '/' && window.location.hash.includes('type=signup')) {
        //   window.location.replace('/profile-setup');
        // }
      }
    });

    // Listen for future auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session?.user?.email || "no session");
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/books" element={<Books />} />
              <Route path="/books/:id" element={<BookDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/about" element={<About />} />
              <Route path="/publish" element={<PublishWithUs />} />
              <Route path="/services" element={<ProductsServices />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/signin" element={<Auth />} />
              <Route path="/login" element={<Auth />} />
              <Route path="/upload" element={<ContentUpload />} />
              
              {/* NEW: Profile setup route after email confirmation */}
              <Route path="/profile-setup" element={<ProfileSetup />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/content-management" element={<ContentManagement />} />
              <Route path="/content/:id" element={<ContentViewPage />} />

              <Route
                path="/reset-password"
                element={
                  <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
                    <PasswordChange />
                  </Suspense>
                }
              />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="/content/update/:id" element={<ContentUpdatePage />} />
              <Route path="/content/publish/:id" element={<ContentPublishButtonPage />} />
              <Route path="/content/delete/:id" element={<ContentDeletePage />} />
              <Route path="/content/delete/confirmation" element={<ContentDeleteConfirmationPage />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
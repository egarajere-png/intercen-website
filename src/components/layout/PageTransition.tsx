import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import intercenLogo from '@/assets/intercen-books-logo.png';

export const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showContent, setShowContent] = useState(true);

  useEffect(() => {
    // Show loading on route change
    setIsLoading(true);
    setShowContent(false);

    // After 3 seconds, hide loading and show content
    const timer = setTimeout(() => {
      setIsLoading(false);
      setShowContent(true);
      // Scroll to top after transition
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 1500);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background">
        {/* Spinning Ring */}
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-full border-4 border-muted animate-spin" 
               style={{ 
                 borderTopColor: 'hsl(var(--primary))',
                 animationDuration: '1s'
               }} 
          />
        </div>
        
        {/* Logo below the ring */}
        <img 
          src={intercenLogo} 
          alt="InterCEN Books" 
          className="h-16 w-auto animate-pulse"
        />
        
        {/* Loading text */}
        <p className="mt-4 text-sm text-muted-foreground animate-pulse">
          Loading...
        </p>
      </div>
    );
  }

  return showContent ? <>{children}</> : null;
};

import { ContentDeleteButton } from "@/components/contents/ContentDeleteButton";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/SupabaseClient";

export default function ContentDeletePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login", { replace: true });
      } else {
        setCheckingAuth(false);
      }
    }
    checkAuth();
  }, [navigate]);

  if (!id) return <div>Missing content ID</div>;
  if (checkingAuth) return null;

  return (
    <div className="container max-w-lg mx-auto py-12">
      <h1 className="text-2xl font-bold mb-6">Delete Content</h1>
      <ContentDeleteButton
        contentId={id}
        contentTitle={"Content #" + id}
        redirectOnDelete="/content/delete/confirmation"
      />
    </div>
  );
}

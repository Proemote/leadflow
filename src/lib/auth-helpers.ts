import { createSupabaseBrowser } from "./supabase/browser";

export async function signUp(email: string, password: string, fullName: string, companyName: string) {
  const supabase = createSupabaseBrowser();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        company_name: companyName,
      },
      emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard`,
    },
  });

  return { data, error };
}

export async function signInWithGoogle() {
  const supabase = createSupabaseBrowser();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard`,
    },
  });

  return { data, error };
}

export async function signIn(email: string, password: string) {
  const supabase = createSupabaseBrowser();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
}

export async function resetPasswordForEmail(email: string) {
  const supabase = createSupabaseBrowser();

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password`,
  });

  return { data, error };
}

export async function updatePassword(password: string) {
  const supabase = createSupabaseBrowser();

  const { data, error } = await supabase.auth.updateUser({ password });

  return { data, error };
}

export async function signOut() {
  const supabase = createSupabaseBrowser();
  
  const { error } = await supabase.auth.signOut();
  
  return { error };
}

export async function getCurrentUser() {
  const supabase = createSupabaseBrowser();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

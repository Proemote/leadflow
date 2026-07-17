import { supabaseAdmin } from "./supabase/admin";

export const PROPOSALS_BUCKET = "proposals";
export const MAX_PROPOSAL_FILE_BYTES = 4 * 1024 * 1024; // 4MB — margen seguro bajo el límite de body de Vercel
export const ALLOWED_PROPOSAL_EXTENSIONS = [".pdf", ".md", ".markdown", ".txt"];

export interface ProposalFile {
  id: string;
  opportunity_id: string;
  contact_id: string | null;
  user_id: string | null;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  /** Solo UI: URL firmada temporal para descargar/ver el archivo */
  url?: string;
}

function extOf(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  return i === -1 ? "" : fileName.slice(i).toLowerCase();
}

export function isAllowedProposalFile(fileName: string, sizeBytes: number): string | null {
  if (!ALLOWED_PROPOSAL_EXTENSIONS.includes(extOf(fileName))) {
    return `Formato no permitido. Usa: ${ALLOWED_PROPOSAL_EXTENSIONS.join(", ")}`;
  }
  if (sizeBytes > MAX_PROPOSAL_FILE_BYTES) {
    return `El archivo pesa demasiado (máx. ${Math.round(MAX_PROPOSAL_FILE_BYTES / (1024 * 1024))}MB).`;
  }
  return null;
}

export async function uploadProposalFile(
  userId: string,
  opportunityId: string,
  contactId: string | null,
  file: { name: string; type: string; buffer: Buffer }
): Promise<ProposalFile> {
  const err = isAllowedProposalFile(file.name, file.buffer.byteLength);
  if (err) throw new Error(err);

  const sb = supabaseAdmin();
  const path = `${userId}/${opportunityId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const { error: uploadError } = await sb.storage
    .from(PROPOSALS_BUCKET)
    .upload(path, file.buffer, { contentType: file.type || "application/octet-stream" });
  if (uploadError) throw uploadError;

  const { data, error } = await sb
    .from("proposal_files")
    .insert({
      opportunity_id: opportunityId,
      contact_id: contactId,
      user_id: userId,
      file_name: file.name,
      storage_path: path,
      mime_type: file.type || null,
      size_bytes: file.buffer.byteLength,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as ProposalFile;
}

async function withSignedUrl(sb: ReturnType<typeof supabaseAdmin>, f: ProposalFile): Promise<ProposalFile> {
  const { data } = await sb.storage.from(PROPOSALS_BUCKET).createSignedUrl(f.storage_path, 60 * 10);
  return { ...f, url: data?.signedUrl };
}

export async function getProposalFilesForOpportunity(
  userId: string,
  opportunityId: string
): Promise<ProposalFile[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("proposal_files")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return Promise.all(((data ?? []) as ProposalFile[]).map((f) => withSignedUrl(sb, f)));
}

export async function getProposalFilesForUser(userId: string): Promise<ProposalFile[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("proposal_files")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return Promise.all(((data ?? []) as ProposalFile[]).map((f) => withSignedUrl(sb, f)));
}

export async function deleteProposalFile(userId: string, fileId: string): Promise<void> {
  const sb = supabaseAdmin();
  const { data: file } = await sb
    .from("proposal_files")
    .select("*")
    .eq("id", fileId)
    .eq("user_id", userId)
    .single();
  if (!file) throw new Error("Archivo no encontrado");
  await sb.storage.from(PROPOSALS_BUCKET).remove([(file as ProposalFile).storage_path]);
  await sb.from("proposal_files").delete().eq("id", fileId).eq("user_id", userId);
}

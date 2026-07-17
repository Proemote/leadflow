import { getOpportunities, getOpportunitiesForUser } from "@/lib/opportunities";
import { getProposalFilesForUser, ProposalFile } from "@/lib/proposalFiles";
import { isSupabaseConfigured } from "@/lib/db";
import { getServerUserId } from "@/lib/api-auth";
import { PropuestasList } from "@/components/PropuestasList";

export const dynamic = "force-dynamic";

export default async function PropuestasPage() {
  const userId = await getServerUserId();
  const scoped = isSupabaseConfigured() && userId;

  const [{ opportunities }, files] = await Promise.all([
    scoped ? getOpportunitiesForUser(userId) : getOpportunities(),
    scoped ? getProposalFilesForUser(userId) : Promise.resolve<ProposalFile[]>([]),
  ]);

  const propuestas = opportunities.filter((o) => o.stage === "Propuesta");

  const filesByOpportunity = new Map<string, ProposalFile[]>();
  for (const f of files) {
    const arr = filesByOpportunity.get(f.opportunity_id) ?? [];
    arr.push(f);
    filesByOpportunity.set(f.opportunity_id, arr);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Propuestas</h1>
        <p className="text-violet-300/70 mt-1">
          Oportunidades en fase de propuesta, con sus documentos adjuntos (PDF, Markdown, TXT).
        </p>
      </div>
      <PropuestasList
        opportunities={propuestas}
        filesByOpportunity={Object.fromEntries(filesByOpportunity)}
        demo={!isSupabaseConfigured()}
      />
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search } from "lucide-react";
import { format } from "date-fns";
import AdminPagination from "@/components/admin/AdminPagination";

const PAGE_SIZE = 20;

const AdminLeads = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      setLeads(data ?? []);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = leads.filter(
    (l) => l.name?.toLowerCase().includes(search.toLowerCase()) || l.phone?.includes(search)
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when search changes
  useEffect(() => { setPage(1); }, [search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p className="text-sm text-[hsl(220,10%,50%)]">{leads.length} cadastros</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(220,10%,40%)]" />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9 pr-4 w-full sm:w-72 rounded-lg bg-[hsl(220,20%,12%)] border border-[hsl(220,15%,18%)] text-sm text-white placeholder:text-[hsl(220,10%,35%)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[hsl(220,15%,15%)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[hsl(220,20%,10%)] text-[hsl(220,10%,50%)] text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium">Nome</th>
              <th className="text-left px-4 py-3 font-medium">Telefone</th>
              <th className="text-left px-4 py-3 font-medium">Mensagem</th>
              <th className="text-left px-4 py-3 font-medium">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(220,15%,15%)]">
            {paginated.map((lead) => (
              <tr key={lead.id} className="hover:bg-[hsl(220,20%,11%)] transition-colors">
                <td className="px-4 py-3 text-white font-medium">{lead.name}</td>
                <td className="px-4 py-3 text-[hsl(220,10%,65%)]">{lead.phone}</td>
                <td className="px-4 py-3 text-[hsl(220,10%,55%)] max-w-xs truncate">{lead.message || "—"}</td>
                <td className="px-4 py-3 text-[hsl(220,10%,55%)]">
                  {format(new Date(lead.created_at), "dd/MM/yyyy HH:mm")}
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-[hsl(220,10%,40%)]">
                  Nenhum lead encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />
      </div>
    </div>
  );
};

export default AdminLeads;

import { createClient } from "@/lib/supabase/server";
import { requireSection } from "@/lib/guard";
import { ManageServicesPanel } from "./ManageServicesPanel";
import { NewServiceOrderForm } from "./NewServiceOrderForm";
import { ServiceOrderRow } from "./ServiceOrderRow";

export default async function ServicesPage() {
  const currentStaff = await requireSection("services");
  const supabase = createClient();

  const [{ data: services }, { data: clients }, { data: properties }, { data: orders }] = await Promise.all([
    supabase.from("services").select("key, label, default_price, is_system").order("label", { ascending: true }),
    supabase.from("clients").select("id, name, client_type, company_name").order("name", { ascending: true }),
    supabase.from("properties").select("id, client_id, nickname, address").order("nickname", { ascending: true }),
    supabase
      .from("service_orders")
      .select(
        "id, description, price, quantity, status, fee_invoiced, ordered_at, notes, clients(name, client_type, company_name), properties(nickname, address)"
      )
      .order("ordered_at", { ascending: false })
      .limit(100),
  ]);

  const pending = (orders ?? []).filter((o: any) => o.status === "pending");
  const fulfilled = (orders ?? []).filter((o: any) => o.status === "fulfilled");
  const cancelled = (orders ?? []).filter((o: any) => o.status === "cancelled");

  return (
    <div className="p-8 max-w-5xl">
      <p className="text-[11px] font-semibold tracking-widest uppercase text-gold">Operations</p>
      <h1 className="text-2xl font-serif text-green mt-1 mb-1">Services</h1>
      <p className="text-sm text-ink/60 mb-6">
        The a la carte service menu, and every order allocated to a client. A fulfilled order becomes an unbilled fee
        immediately — it shows in the Client Billing Ledger and folds into that client's invoice the next time
        Generate Monthly Invoices runs.
      </p>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <section>
            <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">
              Pending Fulfillment
            </p>
            <div className="bg-surface border border-line divide-y divide-line">
              {pending.map((o: any) => (
                <ServiceOrderRow key={o.id} order={o} currentStaff={{ id: currentStaff.id, name: currentStaff.name }} />
              ))}
              {!pending.length && <p className="px-4 py-6 text-sm text-ink/50">Nothing pending.</p>}
            </div>
          </section>

          <section>
            <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Fulfilled</p>
            <div className="bg-surface border border-line divide-y divide-line">
              {fulfilled.slice(0, 20).map((o: any) => (
                <ServiceOrderRow key={o.id} order={o} currentStaff={{ id: currentStaff.id, name: currentStaff.name }} />
              ))}
              {!fulfilled.length && <p className="px-4 py-6 text-sm text-ink/50">No fulfilled orders yet.</p>}
            </div>
          </section>

          {cancelled.length > 0 && (
            <section>
              <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Cancelled</p>
              <div className="bg-surface border border-line divide-y divide-line">
                {cancelled.slice(0, 10).map((o: any) => (
                  <ServiceOrderRow
                    key={o.id}
                    order={o}
                    currentStaff={{ id: currentStaff.id, name: currentStaff.name }}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Order Service</p>
            <NewServiceOrderForm
              clients={clients ?? []}
              properties={(properties ?? []) as any}
              services={(services ?? []) as any}
              currentStaff={{ id: currentStaff.id, name: currentStaff.name }}
            />
          </div>

          <div>
            <p className="text-[10.5px] font-semibold tracking-widest uppercase text-gold mb-3">Manage Services</p>
            <ManageServicesPanel
              services={(services ?? []) as any}
              currentStaff={{ id: currentStaff.id, name: currentStaff.name }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { setOrderStatusAction } from "@/features/admin/store-actions";
import { ORDER_ST, ORDER_STATUS, PROVIDER } from "@/components/admin/labels";

export interface OrderRow {
  id: string; number: string; date: string; name: string; phone: string; phoneRaw: string;
  total: string; count: number; status: string; next: string[];
  address: string; comment: string; delivery: string; payment: string;
  items: { name: string; color: string; size: string; qty: number; total: string }[];
  search: string;
}

export function OrdersTable({ rows }: { rows: OrderRow[] }) {
  const [q, setQ] = useState("");
  const [st, setSt] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    const digits = n.replace(/\D/g, "");
    return rows.filter((o) => (st === "all" || o.status === st) && (!n || o.search.includes(n) || (digits.length >= 3 && o.phoneRaw.includes(digits))));
  }, [rows, q, st]);

  return (
    <div className="panel">
      <div className="panel-h">
        <h4>Roʻyxat</h4>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input className="inp inp-sm" style={{ width: 220 }} placeholder="Ism, telefon yoki raqam" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="inp inp-sm" style={{ width: 180 }} value={st} onChange={(e) => setSt(e.target.value)}>
            <option value="all">Barcha holatlar</option>
            {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>
      <div className="atw">
        <table className="atbl">
          <thead><tr><th>Raqam</th><th>Sana</th><th>Mijoz</th><th>Telefon</th><th>Soni</th><th>Summa</th><th>Holat</th></tr></thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 46, color: "var(--mut)" }}>{rows.length ? "Hech narsa topilmadi" : "Hozircha buyurtmalar yoʻq"}</td></tr>
            )}
            {list.map((o) => (
              <Fragment key={o.id}>
                <tr className="row" onClick={() => setOpen(open === o.id ? null : o.id)} aria-expanded={open === o.id}>
                  <td><b>{o.number}</b></td>
                  <td style={{ whiteSpace: "nowrap" }}>{o.date}</td>
                  <td><b>{o.name}</b></td>
                  <td className="pn">{o.phone}</td>
                  <td>{o.count}</td>
                  <td className="pn">{o.total}</td>
                  <td><span className={`st ${ORDER_ST[o.status]}`}>{ORDER_STATUS[o.status]?.label}</span></td>
                </tr>
                {open === o.id && (
                  <tr>
                    <td colSpan={7} className="od">
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 24 }}>
                        <div>
                          <h5>MIJOZ VA MANZIL</h5>
                          <p><b>{o.name}</b></p>
                          <p><a href={`tel:${o.phoneRaw}`} className="pn">{o.phone}</a></p>
                          <p>{o.address}</p>
                          {o.comment && <p style={{ color: "var(--mut)" }}>Izoh: {o.comment}</p>}
                          <p>Yetkazish: <b>{o.delivery}</b></p>
                          {o.payment && <p>Toʻlov: <b>{PROVIDER[o.payment] ?? o.payment}</b></p>}
                        </div>
                        <div>
                          <h5>MAHSULOTLAR</h5>
                          {o.items.map((i, k) => <p key={k}>{i.name} · {i.color} · <b>{i.size}</b> × {i.qty} — {i.total}</p>)}
                          <p><b>Jami: {o.total}</b></p>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "var(--mut)" }}>Holat:</span>
                        <span className="mb on">{ORDER_STATUS[o.status]?.label}</span>
                        {o.next.map((s) => (
                          <form key={s} action={setOrderStatusAction}>
                            <input type="hidden" name="id" value={o.id} />
                            <input type="hidden" name="to" value={s} />
                            <button type="submit" className={`mb ${s === "CANCELLED" || s === "REFUNDED" ? "red" : ""}`}>→ {ORDER_STATUS[s]?.label}</button>
                          </form>
                        ))}
                        <Link href={`/admin/orders/${o.id}`} className="mb" style={{ marginLeft: "auto" }}>Batafsil</Link>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// PostgreSQL executes the production migration and policies. Only the
// platform-owned Auth/Storage schema and JWT subject are provided here.
// This has no network client or connection to production data.
const db = new PGlite();
const business = randomUUID();
const otherBusiness = randomUUID();
const users = Object.fromEntries(["owner", "manager", "staff", "viewer", "outsider"].map(role => [role, randomUUID()]));
let category: string;

async function assume(role: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [users[role] ?? ""]);
  await db.exec(role === "anonymous" ? "set role anon" : "set role authenticated");
}

async function write(action: string, data: object, request = randomUUID(), tenant = business) {
  const { rows } = await db.query<{result: {id: string}}>("select public.tracker_write($1,$2,$3,$4) result",
    [tenant, action, JSON.stringify(data), request]);
  return rows[0].result;
}
function expense(day: string, amount: string, status = "paid", method = "cash") {
  return { business_date: day, category_id: category, amount, payment_method: method, payment_status: status };
}

beforeAll(async () => {
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create schema storage;
    create table auth.users(id uuid primary key,email text unique,email_confirmed_at timestamptz,invited_at timestamptz,
      deleted_at timestamptz,raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as
      $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant usage on schema auth,storage to authenticated;
    grant select on storage.objects to authenticated;
  `);
  const dir = join(process.cwd(), "supabase", "migrations");
  for (const name of readdirSync(dir).filter(name => name.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(dir, name), "utf8"));
  }
  for (const [role, id] of Object.entries(users)) {
    await db.query(`insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data) values
      ($1,$2,now(),'{"staff_provisioned":true}')`, [id, role + "@example.test"]);
  }
  await db.query("select tracker_private.bootstrap_business($1,$2)", [business, users.owner]);
  await db.query("select tracker_private.bootstrap_business($1,$2)", [otherBusiness, users.outsider]);
  await assume("owner");
  for (const role of ["manager", "staff", "viewer"]) {
    await write("member_email", { email: role + "@example.test", role, active: true });
  }
  category = (await db.query<{id: string}>("select id from public.expense_categories order by name limit 1")).rows[0].id;
});
afterAll(() => db.close());

describe("database membership and provisioning", () => {
  it("rejects public signup, including user-editable metadata, and accepts a completed invitation", async () => {
    await db.exec("reset role");
    await expect(db.query(`insert into auth.users(id,email,raw_user_meta_data)
      values ($1,'public@example.test','{"staff_provisioned":true}')`, [randomUUID()])).rejects.toThrow(/invitation/);
    const invited = randomUUID();
    await db.transaction(async tx => {
      await tx.query("insert into auth.users(id,email) values($1,'invited@example.test')", [invited]);
      await tx.query("update auth.users set invited_at=now() where id=$1", [invited]);
    });
    expect((await db.query("select id from public.profiles where id=$1", [invited])).rows).toHaveLength(1);
  });
  it("limits tenants on direct reads, private helpers, public RPCs and raw writes", async () => {
    await assume("outsider");
    expect((await db.query("select id from public.expense_categories where business_id=$1", [business])).rows).toHaveLength(0);
    expect((await db.query("select id from public.profiles where id=$1", [users.owner])).rows).toHaveLength(0);
    await expect(write("categories", {})).rejects.toThrow(/Business access/);
    await assume("viewer");
    expect((await db.query("select id from public.businesses")).rows).toEqual([{ id: business }]);
    await expect(write("expense", expense("2026-06-02", "100"))).rejects.toThrow(/Read-only/);
    await assume("staff");
    await expect(db.query("update public.business_memberships set role='owner' where user_id=$1", [users.staff])).rejects.toThrow(/permission/);
    await expect(write("member", {user_id: users.staff, role: "owner", active: true})).rejects.toThrow(/Owner/);
    await expect(db.query("select tracker_private.bootstrap_business($1,$2)", [randomUUID(), users.staff])).rejects.toThrow(/permission/);
    await expect(db.query("select tracker_private.save_settings($1,'member','{}','owner')", [business])).rejects.toThrow(/permission/);
    expect((await db.query("select * from public.audit_logs")).rows).toHaveLength(0);
    await assume("anonymous");
    await expect(db.query("select id from public.daily_sales")).rejects.toThrow(/permission/);
    await expect(write("sales", {})).rejects.toThrow(/permission/);
  });
  it("enforces owner-only invitations, rate limits and immediate deactivation", async () => {
    await assume("owner");
    const invite = () => db.query<{allowed: boolean}>("select public.tracker_invite_allowed($1) allowed",[business]);
    for (let index = 0; index < 10; index++) expect((await invite()).rows[0].allowed).toBe(true);
    expect((await invite()).rows[0].allowed).toBe(false);
    await expect(write("member_email", {email: "missing@example.test", role: "staff"})).rejects.toThrow("Account not found");
    await expect(write("member", {user_id: users.owner, role: "manager", active: false})).rejects.toThrow(/Ownership/);
    await write("member", {user_id: users.viewer, role: "viewer", active: false});
    await assume("viewer");
    expect((await db.query("select id from public.businesses")).rows).toHaveLength(0);
    await expect(invite()).rejects.toThrow(/Owner/);
    await assume("owner");
    await write("member", {user_id: users.viewer, role: "viewer", active: true});
  });
});

describe("financial writes", () => {
  it("persists exact collections, expenses, cash adjustments and count in one business day", async () => {
    const day = "2026-06-10";
    await assume("staff");
    await write("expense", expense(day,"600"));
    await write("expense", expense(day,"450"));
    await write("expense", expense(day,"200","paid","upi"));
    const sales = {business_date: day, cash_collected:"3000",upi_collected:"1250",opening_float:"500",actual_amount:"2450"};
    await write("sales", sales);
    expect((await db.query(`select (cash_collected+upi_collected)::text sales,
      (cash_collected+upi_collected-(select sum(amount) from public.expenses where business_date=$1))::text surplus
      from public.daily_sales where business_date=$1`, [day])).rows[0]).toEqual({sales:"4250.00",surplus:"3000.00"});
    expect((await db.query("select expected_amount::text, variance::text from public.cash_reconciliations where business_date=$1", [day])).rows[0])
      .toEqual({expected_amount:"2450.00",variance:"0.00"});
    await write("adjustment", { business_date:day,transaction_type:"cash_out",amount:"100.25",notes:"Till withdrawal" });
    await write("sales", {...sales,actual_amount:"2350",version:1,reason:"Fresh count after withdrawal"});
    expect((await db.query("select expected_amount::text, variance::text from public.cash_reconciliations where business_date=$1", [day])).rows[0])
      .toEqual({expected_amount:"2349.75",variance:"0.25"});
    await expect(write("sales", {...sales,version:2})).rejects.toThrow(/reason/);
    await expect(write("sales", {...sales,version:1,reason:"Stale count"})).rejects.toThrow(/changed/);
    await expect(write("sales", {...sales,cash_collected:"1.123",version:2,reason:"Test"})).rejects.toThrow(/decimal/);
    await expect(write("sales", {...sales,actual_amount:"-1",version:2,reason:"Test"})).rejects.toThrow(/non-negative/);
    expect((await db.query("select version from public.daily_sales where business_date=$1", [day])).rows[0]).toEqual({version:2});
  });
  it("handles a retried request exactly once, corrects payment status and audits soft voids", async () => {
    const day = "2026-06-11";
    const pending = expense(day,"59.95","pending");
    const request = randomUUID();
    await assume("staff");
    const {id} = await write("expense", pending, request);
    expect((await write("expense", pending, request)).id).toBe(id);
    await expect(write("expense",{...pending,amount:"60"},request)).rejects.toThrow(/already used/);
    await write("expense",{...pending,id,payment_status:"paid",version:1,reason:"Invoice settled"});
    expect((await db.query("select amount::text, payment_status,version from public.expenses where business_date=$1",[day])).rows)
      .toEqual([{amount:"59.95",payment_status:"paid",version:2}]);
    const voidData = {id,business_date:day,version:2,reason:"Wrong invoice"};
    await expect(write("void_expense",voidData)).rejects.toThrow(/manager/);
    await assume("manager");
    await write("void_expense",voidData);
    expect((await db.query("select id from public.expenses where id=$1 and voided_at is null",[id])).rows).toHaveLength(0);
    await assume("owner");
    expect((await db.query(`select actor_id,reason,before_data->>'version' previous_version,after_data->>'version' next_version
      from public.audit_logs where action='void_expense' and entity_id=$1`,[id])).rows)
      .toEqual([{actor_id:users.manager,reason:"Wrong invoice",previous_version:"2",next_version:"3"}]);
    await assume("outsider");
    expect((await db.query("select id from public.expenses where id=$1",[id])).rows).toHaveLength(0);
  });
  it("guards the source and destination of dated edits and permits an audited owner reopening", async () => {
    const day="2026-06-12";
    const next="2026-06-13";
    await assume("staff");
    const {id}=await write("expense",expense(day,"10"));
    await expect(write("lock",{business_date:day})).rejects.toThrow(/manager/);
    await assume("manager");
    await write("lock",{business_date:day});
    await expect(write("reopen",{business_date:day,reason:"Recount"})).rejects.toThrow(/owner/);
    await assume("staff");
    await expect(write("expense",expense(day,"20"))).rejects.toThrow(/locked/);
    await expect(write("expense",{...expense(next,"10"),id,version:1,reason:"Change date"})).rejects.toThrow(/locked/);
    await assume("owner");
    await expect(write("reopen",{business_date:day})).rejects.toThrow(/reason/);
    await write("reopen",{business_date:day,reason:"Verified receipt date"});
    await write("lock",{business_date:next});
    await expect(write("expense",{...expense(next,"10"),id,version:1,reason:"Change date"})).rejects.toThrow(/locked/);
    await write("expense",{...expense(day,"11"),id,version:1,reason:"Recount"});
    expect((await db.query("select reason,actor_id from public.audit_logs where action='reopen' and after_data->>'business_date'=$1",[day])).rows)
      .toEqual([{reason:"Verified receipt date",actor_id:users.owner}]);
  });
  it("prevents cross-tenant receipts, restricts private objects to linked expenses and checks category membership", async () => {
    const day="2026-06-14";
    const file = business + "/" + users.staff + "/" + randomUUID() + ".jpg";
    await db.exec("reset role");
    await db.query("insert into storage.objects(bucket_id,name) values('receipts',$1)",[file]);
    await assume("outsider");
    const foreignCategory=(await db.query<{id:string}>("select id from public.expense_categories limit 1")).rows[0].id;
    await assume("staff");
    await expect(write("expense",{...expense(day,"4"),category_id:foreignCategory})).rejects.toThrow(/category/);
    await expect(write("expense",{...expense(day,"4"),receipt_path:otherBusiness+"/invalid"})).rejects.toThrow(/receipt/);
    expect((await db.query("select name from storage.objects")).rows).toHaveLength(0);
    await write("expense",{...expense(day,"4"),receipt_path:file});
    expect((await db.query("select name from storage.objects")).rows).toEqual([{name:file}]);
    await assume("outsider");
    expect((await db.query("select name from storage.objects")).rows).toHaveLength(0);
  });
});

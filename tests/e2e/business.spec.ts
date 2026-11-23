import {expect,test,type Page} from "@playwright/test";
import {randomUUID,randomBytes} from "node:crypto";
import {Client} from "pg";
import {createClient} from "@supabase/supabase-js";
const endpoint=process.env.E2E_SUPABASE_URL,secret=process.env.E2E_SUPABASE_SERVICE_KEY,dbUrl=process.env.E2E_DB_URL;
test.skip(!endpoint||!secret||!dbUrl,"Set the three local Supabase fixture variables to run the financial workflow.");
async function signIn(page:Page,email:string,password:string) {
 await page.goto("/login");
 await page.getByLabel("Email address").fill(email);
 await page.getByLabel("Password",{exact:true}).fill(password);
 await page.getByRole("button",{name:"Sign in",exact:true}).click();
 await expect(page).toHaveURL(/\/dashboard/);
}
test("owner, staff and manager complete and reconcile a trading day",async({page,browser})=>{
 test.setTimeout(130000);
 for (const url of [endpoint!,dbUrl!]) if(!["127.0.0.1","localhost","[::1]"].includes(new URL(url).hostname)) throw Error("Financial fixtures require loopback Supabase and PostgreSQL.");
 const admin=createClient(endpoint!,secret!,{auth:{persistSession:false,autoRefreshToken:false}});
 const db=new Client({connectionString:dbUrl});await db.connect();
 const businessId=randomUUID(),pass=randomBytes(24).toString("hex"),run=businessId.slice(0,12);
 const accounts:Record<string,{id:string;email:string}>={};
 const contexts=[await browser.newContext(),await browser.newContext()];
 const [staff,manager]=await Promise.all(contexts.map(c=>c.newPage()));
 if(test.info().project.name==="mobile")await Promise.all([staff,manager].map(p=>p.setViewportSize({width:320,height:720})));
 try{
  for(const role of ["owner","manager","staff"]){
   const email=role+"-"+run+"@example.test";
   const res=await admin.auth.admin.createUser({email,password:pass,email_confirm:true,app_metadata:{staff_provisioned:true},user_metadata:{full_name:"Test "+role}});
   if(res.error || !res.data.user)throw Error("Local Auth fixture failed: "+res.error?.message);
   accounts[role]={id:res.data.user.id,email};
  }
  await db.query("select tracker_private.bootstrap_business($1,$2,$3)",[businessId,accounts.owner.id,"Test kitchen "+run]);
  await db.query("insert into public.business_memberships(business_id,user_id,role) values($1,$2,'manager')",[businessId,accounts.manager.id]);
  await signIn(page,accounts.owner.email,pass);
  await page.goto("/staff");
  await page.getByLabel(/full name/i).fill("Test staff");
  await page.getByLabel(/email/i).fill(accounts.staff.email);
  await page.getByRole("button",{name:/invite staff/i}).click();
  await expect(page.getByText(accounts.staff.email,{exact:true})).toBeVisible();
  await signIn(staff,accounts.staff.email,pass);
  const day="2026-04-12";
  await staff.goto("/sales?date="+day);
  await staff.getByLabel("Opening petty cash",{exact:true}).fill("500");
  await staff.getByLabel("Cash sales",{exact:true}).fill("3000");
  await staff.getByLabel("UPI sales",{exact:true}).fill("1250");
  await staff.getByRole("button",{name:"Save sales",exact:true}).click();
  await expect(staff.getByText("Sales saved.",{exact:true})).toBeVisible();
  await staff.goto("/expenses?date="+day);
  await staff.getByLabel("Category",{exact:true}).first().selectOption({label:"Chicken"});
  await staff.getByLabel("Amount",{exact:true}).fill("600");
  await staff.getByRole("button",{name:"Save expense",exact:true}).click();
  await expect(staff.getByText("Expense saved.",{exact:true})).toBeVisible();
  const range="preset=custom&from="+day+"&to="+day;
  await staff.goto("/data-sheet?"+range);await expect(staff.locator("body")).toContainText("3,000");
  await staff.goto("/dashboard?date="+day);
  await expect(staff.locator(".metric").filter({hasText:"Collected sales"})).toContainText("₹4,250");
  await expect(staff.locator(".metric").filter({hasText:"Operating surplus"})).toContainText("₹3,650");
  expect(await staff.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await signIn(manager,accounts.manager.email,pass);
  await manager.goto("/sales?date="+day);
  await manager.getByRole("button",{name:"Lock entries",exact:true}).click();
  await manager.getByRole("button",{name:"Confirm lock",exact:true}).click();
  await expect(manager.getByText("Day locked",{exact:true})).toBeVisible();
  await staff.goto("/sales?date="+day);await expect(staff.getByLabel("Cash sales",{exact:true})).toBeDisabled();
  await page.goto("/sales?date="+day);
  await page.getByRole("button",{name:"Reopen day",exact:true}).click();
  await page.getByLabel("Reopening reason").fill("Verify cash count");
  await page.getByRole("dialog").getByRole("button",{name:"Reopen day"}).click();
  await expect(page.getByText("Day open",{exact:true})).toBeVisible();
  await page.goto("/reports?report=surplus&"+range);await expect(page.locator("body")).toContainText("3,650");
  for(const format of ["CSV","PDF"]){
   const href=await page.getByRole("link",{name:new RegExp(format)}).first().getAttribute("href");
   const response=await page.request.get(href!);expect(response.status()).toBe(200);
   if(format==="PDF")expect((await response.body()).subarray(0,4).toString()).toBe("%PDF");else expect(await response.text()).toContain("3000");
  }
  await page.goto("/settings");await page.getByRole("button",{name:/sign out/i}).click();
  await expect(page).toHaveURL(/\/login/);
 }finally{await Promise.all(contexts.map(c=>c.close()));await db.end();}
});

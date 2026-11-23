import {test,expect} from "@playwright/test";
test("staff login, recovery controls and mobile layout",async({page})=>{
 await page.goto("/dashboard");await expect(page).toHaveURL(/\/login/);
 await expect(page.getByRole("heading",{name:"Welcome back."})).toBeVisible();
 await expect(page.getByRole("img",{name:/chef tossing noodles/i})).toBeVisible();
 await page.getByLabel("Email address").fill("team@example.test");await page.getByLabel("Password",{exact:true}).fill("testing-password");
 await page.getByRole("button",{name:"Show password"}).click();await expect(page.getByLabel("Password",{exact:true})).toHaveAttribute("type","text");
 await page.getByRole("button",{name:"Forgot password?"}).click();await expect(page.getByRole("heading",{name:"Reset password."})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole("button",{name:"Back to sign in"}).click();await expect(page.getByRole("button",{name:"Sign in",exact:true})).toBeVisible();
});
test("installs a manifest and recovers navigation offline",async({page,context})=>{
 await page.goto("/login");
 const manifest=await (await page.request.get("/manifest.webmanifest")).json();
 expect(manifest.display).toBe("standalone");expect(manifest.icons.map((i:{sizes:string})=>i.sizes)).toContain("512x512");
 await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await context.setOffline(true);
 await page.goto("/dashboard");await expect(page.getByRole("heading",{name:"You’re offline"})).toBeVisible();
 await context.setOffline(false);await page.getByRole("button",{name:"Try again"}).click();await expect(page.getByRole("heading",{name:"Welcome back."})).toBeVisible();
});

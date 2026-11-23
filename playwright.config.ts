import {defineConfig,devices} from "@playwright/test";
const port=Number(process.env.E2E_PORT??3217);
const url="http://127.0.0.1:"+port;
export default defineConfig({
  testDir:"./tests/e2e",timeout:90000,expect:{timeout:12000},workers:1,fullyParallel:false,
  use:{baseURL:url,trace:"retain-on-failure",launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}},
  projects:[{name:"desktop",use:{...devices["Desktop Chrome"]}},{name:"mobile",use:{...devices["Pixel 7"],defaultBrowserType:"chromium",viewport:{width:320,height:720}}}],
  webServer:{command:"node node_modules/next/dist/bin/next start -H 127.0.0.1 -p "+port,url,timeout:90000,reuseExistingServer:false,env:{APP_URL:url,SUPABASE_URL:process.env.E2E_SUPABASE_URL??"http://127.0.0.1:54321",SUPABASE_PUBLISHABLE_KEY:process.env.E2E_SUPABASE_ANON_KEY??"local-test-only",SUPABASE_SECRET_KEY:process.env.E2E_SUPABASE_SERVICE_KEY??""}},
});

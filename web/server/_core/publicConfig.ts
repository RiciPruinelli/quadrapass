// Only these public values may reach the browser. Never serialize process.env.
import { isLocalAdminEnabled } from "./localAdmin";

export function publicPlatformConfig(env: NodeJS.ProcessEnv = process.env, allowLocalAdmin = false) {
  return {
    projectId: env.MANUS_PROJECT_ID ?? "",
    oauthPortalUrl: env.MANUS_OAUTH_PORTAL_URL ?? "",
    apiUrl: env.MANUS_API_URL ?? "",
    apiBrowserKey: env.MANUS_API_BROWSER_KEY ?? "",
    localAdminEnabled: allowLocalAdmin && isLocalAdminEnabled(env),
  };
}

export function publicPlatformScript(env: NodeJS.ProcessEnv = process.env, allowLocalAdmin = false): string {
  const json = JSON.stringify(publicPlatformConfig(env, allowLocalAdmin)).replaceAll("<", "\\u003c");
  return `window.__MANUS_CONFIG__=${json};`;
}

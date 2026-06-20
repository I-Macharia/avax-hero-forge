import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { getThirdweb } from "./integrations/thirdweb/client";

async function handleApiNfts(request: Request): Promise<Response | null> {
  try {
    const url = new URL(request.url);
    if (url.pathname !== "/api/nfts") return null;

    const contract = url.searchParams.get("contract");
    const owner = url.searchParams.get("owner") || undefined;
    if (!contract) return new Response(JSON.stringify({ error: "missing contract" }), { status: 400 });

  const sdk = await getThirdweb();
  const cw = await sdk.getContract(contract);
    const anyContract: any = cw;

    // Prefer ERC721.getAll or owner filter
    try {
      if (owner && anyContract.erc721) {
        const erc = await anyContract.erc721;
        // thirdweb helper might provide getOwned if available
        if (erc.getOwned) {
          const owned = await erc.getOwned(owner);
          return new Response(JSON.stringify({ nfts: owned }), { headers: { "content-type": "application/json" } });
        }
        // fallback to getAll and filter locally
        const all = await erc.getAll();
        const filtered = all.filter((t: any) => (t.owner ?? t.metadata?.owner) === owner);
        return new Response(JSON.stringify({ nfts: filtered }), { headers: { "content-type": "application/json" } });
      }

      if (anyContract.erc721) {
        const erc = await anyContract.erc721;
        const all = await erc.getAll();
        return new Response(JSON.stringify({ nfts: all }), { headers: { "content-type": "application/json" } });
      }

      if (anyContract.erc1155) {
        const erc = await anyContract.erc1155;
        const all = await erc.getAll();
        return new Response(JSON.stringify({ nfts: all }), { headers: { "content-type": "application/json" } });
      }

      // last resort: try totalSupply/tokenURI
      try {
        const total = (await cw.call("totalSupply")).toString();
        const n = parseInt(total, 10) || 0;
        const out: any[] = [];
        for (let i = 1; i <= n; i++) {
          try {
            const uri = await cw.call("tokenURI", [i]);
            out.push({ id: i, metadata: { uri } });
          } catch (e) {
            // ignore
          }
        }
        return new Response(JSON.stringify({ nfts: out }), { headers: { "content-type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ nfts: [] }), { headers: { "content-type": "application/json" } });
      }
    } catch (err) {
      console.error("/api/nfts error", err);
      return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { "content-type": "application/json" } });
    }
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "internal" }), { status: 500 });
  }
}

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
  // Intercept API routes
  const apiResp = await handleApiNfts(request);
  if (apiResp) return apiResp;

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};

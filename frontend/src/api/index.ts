import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../../backend/api.js";

export const api = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api",
    }),
  ],
});

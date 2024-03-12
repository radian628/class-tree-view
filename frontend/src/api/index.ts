import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../../backend/api.js";
import { createTRPCReact } from "@trpc/react-query";

export const api = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api",
    }),
  ],
});

export const trpc = createTRPCReact<AppRouter>();

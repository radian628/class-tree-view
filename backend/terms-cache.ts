import { z } from "zod";
import fetch from "node-fetch";

export const termsParser = z.array(
  z
    .object({
      code: z.string(),
      description: z.string(),
    })
    .required()
);
export type Terms = z.infer<typeof termsParser>;

const oneDay = 1000 * 60 * 60 * 24;

export class TermsCache {
  terms: Terms | undefined;
  lastFetched = Date.now();

  async reloadTerms() {
    const terms = await (
      await fetch(
        "https://prodapps.isadm.oregonstate.edu/StudentRegistrationSsb/ssb/classSearch/getTerms?searchTerm=&offset=1&max=1000"
      )
    ).json();

    const termsParsed = termsParser.parse(terms);

    return termsParsed;
  }

  async getTerms(): Promise<Terms> {
    const now = Date.now();

    if (!this.terms || now - this.lastFetched > oneDay) {
      this.terms = await this.reloadTerms();
    }

    return this.terms;
  }
}

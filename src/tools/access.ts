import { unwrap, type ToolDef } from "./_shared.js";

export const accessTools: ToolDef[] = [
  {
    name: "org_acls",
    description:
      "Fetches the roles and organizations the API caller has access to (UserAcl list). Per Apple: each role has access to all organizations or a subset of them; orgId behaves like a campaign group, and additional campaign groups can be created within an account to manage multiple clients or restrict user access. Does not require X-AP-Context.",
    inputShape: {},
    handler: async (_input, { client }) => {
      const res = await client.request({
        path: "/acls",
        noOrgContext: true,
      });
      return unwrap(res);
    },
  },

  {
    name: "me_user",
    description:
      "Fetches details of the API caller — userId and parentOrgId (MeDetail object).",
    inputShape: {},
    handler: async (_input, { client }) => {
      const res = await client.request({
        path: "/me",
        noOrgContext: true,
      });
      return unwrap(res);
    },
  },
];

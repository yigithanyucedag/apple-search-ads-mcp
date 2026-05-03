import { unwrap, type ToolDef } from "./_shared.js";

export const accessTools: ToolDef[] = [
  {
    name: "org_acls",
    description:
      "List all org-level ACLs (orgs your API user can access, with orgName / currency / " +
      "paymentModel / roleNames). Use this to discover the orgId for ASA_ORG_ID. Does not require X-AP-Context.",
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
      "Return information about the calling API user (userId, parentOrgId).",
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

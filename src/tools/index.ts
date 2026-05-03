import type { ToolDef } from "./_shared.js";
import { campaignTools } from "./campaigns.js";
import { adGroupTools } from "./adgroups.js";
import { adTools } from "./ads.js";
import { keywordTools } from "./keywords.js";
import { reportTools } from "./reports.js";
import { customReportTools } from "./custom_reports.js";
import { searchTools } from "./search.js";
import { appTools } from "./apps.js";
import { creativeTools } from "./creatives.js";
import { budgetOrderTools } from "./budget_orders.js";
import { accessTools } from "./access.js";
import { productPageReasonTools } from "./product_page_reasons.js";
import { rawTools } from "./raw.js";

export const allTools: ToolDef[] = [
  ...accessTools,
  ...searchTools,
  ...appTools,
  ...campaignTools,
  ...adGroupTools,
  ...creativeTools,
  ...adTools,
  ...keywordTools,
  ...reportTools,
  ...customReportTools,
  ...budgetOrderTools,
  ...productPageReasonTools,
  ...rawTools,
];

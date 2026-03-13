import { BlockerReason, Role } from "@prisma/client";

export const APP_NAME = "RO Accountability";

export const EXPECTED_IMPORT_HEADERS = [
  "RO",
  "Tag",
  "Promised",
  "Model",
  "Year",
  "Customer",
  "Flags",
  "Phone",
  "ASM",
  "Tech",
  "Mode",
  "MT",
  "TT",
  "MT Display",
  "TT Display",
] as const;

export const REQUIRED_IMPORT_HEADERS = [
  "RO",
  "ASM",
  "Customer",
  "Model",
  "Year",
  "Promised",
  "Mode",
] as const;

export const blockerReasonLabels: Record<BlockerReason, string> = {
  WAITING_ON_CUSTOMER_APPROVAL: "Waiting on Customer Approval",
  PARTS_BACKORDERED: "Parts Backordered",
  WRONG_OR_DEFECTIVE_PART: "Wrong / Defective Part",
  WAITING_ON_SUBLET_OR_OUTSIDE_VENDOR: "Waiting on Sublet / Outside Vendor",
  WAITING_ON_EXTENDED_WARRANTY_AUTHORIZATION:
    "Waiting on Extended Warranty Authorization",
  QUALITY_CONTROL_REVIEW: "Quality Control Review",
  RECHECK_OR_COMEBACK_IN_PROGRESS: "Recheck / Comeback in Progress",
  TECH_OVERLOADED_TOO_MANY_JOBS_ASSIGNED: "Tech Overloaded - Too Many Jobs Assigned",
  TECH_BEHIND_ON_CURRENT_JOB: "Tech Behind on Current Job",
  TECH_UNAVAILABLE_OUT_BREAK_END_OF_DAY: "Tech Unavailable - Out / Break / End of Day",
  ADVISOR_MUST_CONTACT_CUSTOMER: "Advisor Must Contact Customer",
  WAITING_ON_SPECIAL_ORDER_OR_SPECIALTY_PART:
    "Waiting on Special Order / Specialty Part",
  WAITING_ON_TSB_OR_TECHNICAL_INFORMATION: "Waiting on TSB / Technical Information",
  OTHER_NOTES_REQUIRED: "Other (Notes Required)",
};

export const blockerReasonOptions = Object.entries(blockerReasonLabels).map(
  ([value, label]) => ({
    label,
    value: value as BlockerReason,
  }),
);

export const roleLabels: Record<Role, string> = {
  ADVISOR: "Advisor",
  DISPATCHER: "Dispatcher",
  MANAGER: "Manager",
};

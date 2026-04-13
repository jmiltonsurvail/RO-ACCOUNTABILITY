import { describe, expect, it } from "vitest";
import {
  buildGoToRecordingBucketName,
  buildGoToRecordingIamPolicyDocument,
  buildGoToRecordingIamUserName,
} from "@/lib/aws-recording-provisioning";

describe("AWS recording provisioning helpers", () => {
  it("builds a lowercase bucket name within S3 limits", () => {
    const bucketName = buildGoToRecordingBucketName("JM-ORG-Slug");

    expect(bucketName).toMatch(/^servicesyncnow-goto-/);
    expect(bucketName).toMatch(/^[a-z0-9-]+$/);
    expect(bucketName.length).toBeLessThanOrEqual(63);
  });

  it("builds a safe IAM user name", () => {
    const userName = buildGoToRecordingIamUserName("JM ORG/Slug");

    expect(userName).toMatch(/^servicesyncnow-goto-/);
    expect(userName.length).toBeLessThanOrEqual(64);
  });

  it("creates a root bucket policy without prefix restrictions", () => {
    const document = JSON.parse(
      buildGoToRecordingIamPolicyDocument("servicesyncnow-goto-example"),
    ) as {
      Statement: Array<{ Resource: string | string[] }>;
    };

    const resources = document.Statement.flatMap((statement) =>
      Array.isArray(statement.Resource) ? statement.Resource : [statement.Resource],
    );

    expect(resources).toContain("arn:aws:s3:::servicesyncnow-goto-example");
    expect(resources).toContain("arn:aws:s3:::servicesyncnow-goto-example/*");
    expect(resources.some((resource) => resource.includes("/raw/"))).toBe(false);
  });
});

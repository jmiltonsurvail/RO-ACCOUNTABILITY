import {
  CreateAccessKeyCommand,
  CreateUserCommand,
  IAMClient,
  PutUserPolicyCommand,
} from "@aws-sdk/client-iam";
import { CreateBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { randomBytes } from "node:crypto";

const GOTO_RECORDING_BUCKET_REGION = "us-east-1";

function sanitizeBucketSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function sanitizeIamSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9+=,.@_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function randomSuffix() {
  return randomBytes(4).toString("hex");
}

export function buildGoToRecordingBucketName(organizationSlug: string) {
  const slug = sanitizeBucketSegment(organizationSlug) || "org";
  const suffix = randomSuffix();
  const base = `servicesyncnow-goto-${slug}`;
  const trimmedBase = base.slice(0, Math.max(1, 63 - suffix.length - 1)).replace(/-+$/g, "");
  return `${trimmedBase}-${suffix}`;
}

export function buildGoToRecordingIamUserName(organizationSlug: string) {
  const slug = sanitizeIamSegment(organizationSlug) || "org";
  const suffix = randomSuffix();
  const base = `servicesyncnow-goto-${slug}`;
  const trimmedBase = base.slice(0, Math.max(1, 64 - suffix.length - 1)).replace(/-+$/g, "");
  return `${trimmedBase}-${suffix}`;
}

export function buildGoToRecordingIamPolicyDocument(bucketName: string) {
  return JSON.stringify({
    Statement: [
      {
        Action: ["s3:ListBucket", "s3:GetBucketLocation"],
        Effect: "Allow",
        Resource: `arn:aws:s3:::${bucketName}`,
        Sid: "BucketAccess",
      },
      {
        Action: ["s3:AbortMultipartUpload", "s3:GetObject", "s3:PutObject"],
        Effect: "Allow",
        Resource: `arn:aws:s3:::${bucketName}/*`,
        Sid: "ObjectAccess",
      },
    ],
    Version: "2012-10-17",
  });
}

function getAwsClients(input: {
  accessKeyId: string;
  secretAccessKey: string;
}) {
  const credentials = {
    accessKeyId: input.accessKeyId,
    secretAccessKey: input.secretAccessKey,
  };

  return {
    iam: new IAMClient({
      credentials,
      region: GOTO_RECORDING_BUCKET_REGION,
    }),
    s3: new S3Client({
      credentials,
      region: GOTO_RECORDING_BUCKET_REGION,
    }),
  };
}

export async function provisionGoToRecordingBucket(input: {
  organizationSlug: string;
  provisioningAccessKeyId: string;
  provisioningSecretAccessKey: string;
}) {
  const bucketName = buildGoToRecordingBucketName(input.organizationSlug);
  const iamUserName = buildGoToRecordingIamUserName(input.organizationSlug);
  const policyName = `${iamUserName}-bucket`;
  const { iam, s3 } = getAwsClients({
    accessKeyId: input.provisioningAccessKeyId,
    secretAccessKey: input.provisioningSecretAccessKey,
  });

  await s3.send(
    new CreateBucketCommand({
      Bucket: bucketName,
    }),
  );

  await iam.send(
    new CreateUserCommand({
      UserName: iamUserName,
    }),
  );

  await iam.send(
    new PutUserPolicyCommand({
      PolicyDocument: buildGoToRecordingIamPolicyDocument(bucketName),
      PolicyName: policyName,
      UserName: iamUserName,
    }),
  );

  const accessKey = await iam.send(
    new CreateAccessKeyCommand({
      UserName: iamUserName,
    }),
  );

  if (!accessKey.AccessKey?.AccessKeyId || !accessKey.AccessKey.SecretAccessKey) {
    throw new Error("AWS did not return the IAM access key pair.");
  }

  return {
    accessKeyId: accessKey.AccessKey.AccessKeyId,
    bucketName,
    iamUserName,
    region: GOTO_RECORDING_BUCKET_REGION,
    secretAccessKey: accessKey.AccessKey.SecretAccessKey,
  };
}

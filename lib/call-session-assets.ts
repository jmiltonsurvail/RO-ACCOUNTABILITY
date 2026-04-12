import { GetObjectCommand, S3Client, type GetObjectCommandOutput } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import { getPlatformIntegrationSettings } from "@/lib/platform-integrations";

function getS3Client(region: string) {
  return new S3Client({ region });
}

async function streamToBuffer(body: GetObjectCommandOutput["Body"]) {
  if (!body) {
    return Buffer.alloc(0);
  }

  if (typeof (body as { transformToByteArray?: () => Promise<Uint8Array> }).transformToByteArray === "function") {
    const byteArray = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
    return Buffer.from(byteArray);
  }

  if (body instanceof Readable) {
    const chunks: Buffer[] = [];

    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }

  if (typeof body === "string") {
    return Buffer.from(body);
  }

  return Buffer.alloc(0);
}

export async function getCallSessionS3Object(objectKey: string) {
  const settings = await getPlatformIntegrationSettings();

  if (!settings.awsRegion || !settings.s3Bucket) {
    throw new Error("AWS region and S3 bucket are required before loading call assets.");
  }

  const s3 = getS3Client(settings.awsRegion);
  const object = await s3.send(
    new GetObjectCommand({
      Bucket: settings.s3Bucket,
      Key: objectKey,
    }),
  );

  const buffer = await streamToBuffer(object.Body);

  return {
    body: buffer,
    contentLength: object.ContentLength ?? buffer.byteLength,
    contentType: object.ContentType?.trim() || "application/octet-stream",
  };
}

export async function getCallSessionTextAsset(objectKey: string) {
  const object = await getCallSessionS3Object(objectKey);
  return object.body.toString("utf-8");
}

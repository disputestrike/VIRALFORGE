import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { config } from "./config.mjs";

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export class Storage {
  constructor() {
    this.localDir = path.join(config.app.dataDir, "objects");
    this.s3Ready = Boolean(config.storage.bucketName && config.storage.endpoint && config.storage.accessKeyId && config.storage.secretAccessKey);
    this.client = this.s3Ready
      ? new S3Client({
          endpoint: config.storage.endpoint,
          region: config.storage.region,
          forcePathStyle: true,
          credentials: {
            accessKeyId: config.storage.accessKeyId,
            secretAccessKey: config.storage.secretAccessKey,
          },
        })
      : null;
  }

  async init() {
    await fs.mkdir(this.localDir, { recursive: true });
  }

  async putBuffer(key, buffer, contentType = "application/octet-stream") {
    const cleanKey = key.replace(/^\/+/, "");
    const hash = sha256(buffer);

    if (this.s3Ready) {
      await this.client.send(new PutObjectCommand({
        Bucket: config.storage.bucketName,
        Key: cleanKey,
        Body: buffer,
        ContentType: contentType,
      }));
      const uri = config.storage.publicBaseUrl
        ? `${config.storage.publicBaseUrl.replace(/\/$/, "")}/${cleanKey}`
        : `s3://${config.storage.bucketName}/${cleanKey}`;
      return { uri, hash, storage: "railway_bucket", key: cleanKey };
    }

    const filePath = path.join(this.localDir, cleanKey);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
    return { uri: filePath, hash, storage: "local_file", key: cleanKey };
  }

  async putText(key, text, contentType = "text/plain; charset=utf-8") {
    return this.putBuffer(key, Buffer.from(text, "utf8"), contentType);
  }
}

export async function createStorage() {
  const storage = new Storage();
  await storage.init();
  return storage;
}

export class R2Storage {
  constructor(private readonly bucket: R2Bucket) {}
  async put(key: string, markdown: string) {
    await this.bucket.put(key, markdown, {
      httpMetadata: { contentType: 'text/markdown; charset=utf-8' },
    });
  }
  async get(key: string) {
    const object = await this.bucket.get(key);
    return object ? object.text() : null;
  }
}

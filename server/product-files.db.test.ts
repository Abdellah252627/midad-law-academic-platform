import { beforeEach, describe, expect, it, vi } from "vitest";

const fakeWhere = vi.fn().mockResolvedValue(undefined);
const fakeSet = vi.fn(() => ({ where: fakeWhere }));
const fakeUpdate = vi.fn(() => ({ set: fakeSet }));
const fakeInsertValues = vi.fn().mockResolvedValue([{ insertId: 91 }]);
const fakeInsert = vi.fn(() => ({ values: fakeInsertValues }));
const fakeDb = { update: fakeUpdate, insert: fakeInsert };

vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: vi.fn(() => fakeDb),
}));

process.env.DATABASE_URL = "mysql://test";

import { createProductFile } from "./db";

describe("createProductFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakeInsertValues.mockResolvedValue([{ insertId: 91 }]);
  });

  it("deactivates the previous version for the same product and type before inserting", async () => {
    const id = await createProductFile({
      productCode: "MIDAD-001",
      fileType: "sample",
      fileKey: "new-sample.pdf",
      fileName: "new-sample.pdf",
      contentType: "application/pdf",
      version: 2,
      isActive: 1,
      uploadedByUserId: 1,
    });

    expect(id).toBe(91);
    expect(fakeUpdate).toHaveBeenCalledTimes(1);
    expect(fakeSet).toHaveBeenCalledWith({ isActive: 0 });
    expect(fakeWhere).toHaveBeenCalledTimes(1);
    expect(fakeInsertValues).toHaveBeenCalledWith(expect.objectContaining({ fileType: "sample", version: 2, isActive: 1 }));
  });
});

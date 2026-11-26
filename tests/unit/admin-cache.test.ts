import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchAdminCachedJson,
  getAdminCache,
  invalidateAdminCache,
  isAdminCacheFresh,
  setAdminCache,
} from "@/lib/admin-cache";

describe("admin-cache", () => {
  beforeEach(() => {
    invalidateAdminCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reuses cached data while eventSeq and TTL remain valid", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ callers: [{ id: "1", fullName: "Alice" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = await fetchAdminCachedJson("callers:all", "/api/admin/callers", 5);
    const second = await fetchAdminCachedJson("callers:all", "/api/admin/callers", 5);

    expect(first).toEqual({ callers: [{ id: "1", fullName: "Alice" }] });
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(isAdminCacheFresh(getAdminCache("callers:all"), 5)).toBe(true);
  });

  it("revalidates when eventSeq advances or prefix is invalidated", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ count: 1 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ count: 2 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ count: 3 }) });
    vi.stubGlobal("fetch", fetchMock);

    await fetchAdminCachedJson("campaigns:all", "/api/admin/campaigns", 10);
    const afterEvent = await fetchAdminCachedJson("campaigns:all", "/api/admin/campaigns", 11);
    expect(afterEvent).toEqual({ count: 2 });

    invalidateAdminCache("campaigns");
    expect(getAdminCache("campaigns:all")).toBeNull();

    const afterInvalidate = await fetchAdminCachedJson("campaigns:all", "/api/admin/campaigns", 11);
    expect(afterInvalidate).toEqual({ count: 3 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("deduplicates concurrent requests for the same cache key", async () => {
    let resolveFetch!: (val: unknown) => void;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    setAdminCache("other", { ok: true }, 1);
    const p1 = fetchAdminCachedJson("analytics:daily:2026-11-27", "/api/admin/analytics", 1);
    const p2 = fetchAdminCachedJson("analytics:daily:2026-11-27", "/api/admin/analytics", 1);

    resolveFetch({
      ok: true,
      json: async () => ({ total: 42 }),
    });
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1).toEqual({ total: 42 });
    expect(r2).toEqual({ total: 42 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getAdminCache("other")).not.toBeNull();
  });
});

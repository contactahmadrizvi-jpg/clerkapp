/**
 * Shopify OAuth 2.0 + REST Admin API routes
 *
 * Flow:
 *  1. GET  /api/shopify/auth?shop=my-store.myshopify.com
 *       → redirects user to Shopify consent screen
 *
 *  2. GET  /api/shopify/callback?code=...&shop=...&hmac=...
 *       → exchanges code for access token, stores in DynamoDB,
 *         redirects back to frontend dashboard
 *
 *  3. GET  /api/shopify/products       (requires Clerk JWT)
 *       → fetches products from the user's connected Shopify store
 *
 *  4. DELETE /api/shopify/disconnect   (requires Clerk JWT)
 *       → removes stored access token from DynamoDB
 */
import crypto from "crypto";
import { Router, Request, Response, NextFunction } from "express";
import { requireAuth } from "../middleware/requireAuth";
import {
  saveShopifyToken,
  getShopifyToken,
  deleteShopifyToken,
} from "../db/shopifyTokens";
import { env } from "../config/env";

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Validate that the shop domain is a real myshopify.com host. */
function isValidShopDomain(shop: string): boolean {
  return /^[a-zA-Z0-9-]+\.myshopify\.com$/.test(shop);
}

/**
 * Verify Shopify HMAC signature on the OAuth callback.
 * Shopify docs: https://shopify.dev/docs/apps/build/authentication-authorization/oauth
 */
function verifyHmac(query: Record<string, string>): boolean {
  const { hmac, ...rest } = query;
  if (!hmac) return false;

  const message = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join("&");

  const digest = crypto
    .createHmac("sha256", env.SHOPIFY_API_SECRET)
    .update(message)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
}

// In-memory nonce store (use Redis/DynamoDB in production for multi-instance)
const pendingNonces = new Map<string, { userId: string; expiresAt: number }>();

// ─── GET /api/shopify/auth ────────────────────────────────────────────────────
router.get(
  "/auth",
  requireAuth,
  (req: Request, res: Response): void => {
    const shop = (req.query.shop as string ?? "").trim().toLowerCase();

    if (!shop || !isValidShopDomain(shop)) {
      res.status(400).json({ error: "Invalid shop domain. Use: your-store.myshopify.com" });
      return;
    }

    if (!env.SHOPIFY_API_KEY || !env.SHOPIFY_API_SECRET) {
      res.status(503).json({ error: "Shopify integration is not configured on this server." });
      return;
    }

    // Generate a one-time nonce tied to this user
    const nonce = crypto.randomBytes(16).toString("hex");
    pendingNonces.set(nonce, {
      userId: req.auth!.userId,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 min
    });

    const scopes = [
      "read_products",
      "read_inventory",
    ].join(",");

    const authUrl =
      `https://${shop}/admin/oauth/authorize` +
      `?client_id=${env.SHOPIFY_API_KEY}` +
      `&scope=${scopes}` +
      `&redirect_uri=${encodeURIComponent(env.SHOPIFY_REDIRECT_URI)}` +
      `&state=${nonce}`;

    res.json({ authUrl });
  }
);

// ─── GET /api/shopify/callback ────────────────────────────────────────────────
router.get(
  "/callback",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { code, shop, state, hmac } = req.query as Record<string, string>;

      // 1. Validate shop domain
      if (!shop || !isValidShopDomain(shop)) {
        res.status(400).send("Invalid shop domain.");
        return;
      }

      // 2. Verify HMAC
      if (!verifyHmac(req.query as Record<string, string>)) {
        res.status(403).send("HMAC validation failed.");
        return;
      }

      // 3. Validate nonce
      const nonceData = pendingNonces.get(state);
      if (!nonceData || nonceData.expiresAt < Date.now()) {
        res.status(403).send("Invalid or expired state parameter.");
        return;
      }
      pendingNonces.delete(state);
      const { userId } = nonceData;

      // 4. Exchange code for access token
      const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: env.SHOPIFY_API_KEY,
          client_secret: env.SHOPIFY_API_SECRET,
          code,
        }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        console.error("[Shopify] token exchange failed:", err);
        res.status(502).send("Failed to exchange token with Shopify.");
        return;
      }

      const { access_token, scope } = (await tokenRes.json()) as {
        access_token: string;
        scope: string;
      };

      // 5. Persist token in DynamoDB
      await saveShopifyToken({ userId, shop, accessToken: access_token, scope });

      // 6. Redirect back to frontend dashboard
      res.redirect(`${env.FRONTEND_URL}/dashboard?shopify=connected`);
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/shopify/status ──────────────────────────────────────────────────
router.get(
  "/status",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const record = await getShopifyToken(req.auth!.userId);
      if (!record) {
        res.json({ connected: false });
        return;
      }
      res.json({ connected: true, shop: record.shop, scope: record.scope, installedAt: record.installedAt });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/shopify/products ────────────────────────────────────────────────
router.get(
  "/products",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const record = await getShopifyToken(req.auth!.userId);
      if (!record) {
        res.status(404).json({ error: "No Shopify store connected. Connect one first." });
        return;
      }

      const limit = Math.min(Number(req.query.limit) || 24, 250);
      const page_info = req.query.page_info as string | undefined;

      // Shopify REST Admin API 2024-01
      let url = `https://${record.shop}/admin/api/2024-01/products.json?limit=${limit}&fields=id,title,status,variants,images,vendor,product_type,created_at,updated_at`;
      if (page_info) url += `&page_info=${page_info}`;

      const shopRes = await fetch(url, {
        headers: {
          "X-Shopify-Access-Token": record.accessToken,
          "Content-Type": "application/json",
        },
      });

      if (!shopRes.ok) {
        const errText = await shopRes.text();
        console.error("[Shopify] products fetch failed:", errText);
        res.status(shopRes.status).json({ error: "Failed to fetch products from Shopify." });
        return;
      }

      const data = (await shopRes.json()) as { products: unknown[] };

      // Parse pagination cursor from Link header
      const linkHeader = shopRes.headers.get("Link") ?? "";
      const nextCursor = linkHeader.match(/page_info=([^&>]+)[^>]*>;\s*rel="next"/)?.[1] ?? null;
      const prevCursor = linkHeader.match(/page_info=([^&>]+)[^>]*>;\s*rel="previous"/)?.[1] ?? null;

      res.json({
        products: data.products,
        count: data.products.length,
        shop: record.shop,
        pagination: { nextCursor, prevCursor },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/shopify/products-direct ────────────────────────────────────────
// Uses admin access token from .env — no OAuth, no DynamoDB, works on localhost
router.get(
  "/products-direct",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const shop  = env.SHOPIFY_STORE_DOMAIN;
      const token = env.SHOPIFY_ADMIN_ACCESS_TOKEN;

      if (!shop || !token) {
        res.status(503).json({
          error: "SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN are not set in .env",
        });
        return;
      }

      const limit = Math.min(Number(req.query.limit) || 24, 250);
      const page_info = req.query.page_info as string | undefined;

      let url = `https://${shop}/admin/api/2024-01/products.json?limit=${limit}&fields=id,title,status,variants,images,vendor,product_type,created_at,updated_at`;
      if (page_info) url += `&page_info=${encodeURIComponent(page_info)}`;

      const shopRes = await fetch(url, {
        headers: {
          "X-Shopify-Access-Token": token,
          "Content-Type": "application/json",
        },
      });

      if (!shopRes.ok) {
        const errText = await shopRes.text();
        console.error("[Shopify direct] products fetch failed:", errText);
        res.status(shopRes.status).json({ error: "Failed to fetch products from Shopify." });
        return;
      }

      const data = (await shopRes.json()) as { products: unknown[] };
      const linkHeader = shopRes.headers.get("Link") ?? "";
      const nextCursor = linkHeader.match(/page_info=([^&>]+)[^>]*>;\s*rel="next"/)?.[1] ?? null;
      const prevCursor = linkHeader.match(/page_info=([^&>]+)[^>]*>;\s*rel="previous"/)?.[1] ?? null;

      res.json({
        products: data.products,
        count: data.products.length,
        shop,
        pagination: { nextCursor, prevCursor },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/shopify/status-direct ──────────────────────────────────────────
router.get(
  "/status-direct",
  requireAuth,
  (_req: Request, res: Response): void => {
    const connected = !!(env.SHOPIFY_STORE_DOMAIN && env.SHOPIFY_ADMIN_ACCESS_TOKEN);
    res.json({
      connected,
      shop: env.SHOPIFY_STORE_DOMAIN || null,
      mode: "direct",
    });
  }
);
router.delete(
  "/disconnect",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await deleteShopifyToken(req.auth!.userId);
      res.json({ message: "Shopify store disconnected." });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

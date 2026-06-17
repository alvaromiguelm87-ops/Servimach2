import * as oidc from "openid-client";
import {
  type Request,
  type Response,
  type NextFunction,
} from "express";

import type { AuthUser } from "@workspace/api-zod";

import {
  clearSession,
  getSessionId,
  getSession,
  updateSession,
  getOidcConfig,
  type SessionData,
} from "../lib/auth";

declare global {
  namespace Express {
    interface User extends AuthUser {}

    interface Request {
      isAuthenticated(): this is AuthedRequest;
      user?: User;
    }

    interface AuthedRequest extends Request {
      user: User;
    }
  }
}

async function refreshIfExpired(
  sid: string,
  session: SessionData,
): Promise<SessionData | null> {
  const now = Math.floor(Date.now() / 1000);

  /*
   * Sessão ainda válida
   */
  if (
    session.expires_at &&
    now < session.expires_at
  ) {
    return session;
  }

  /*
   * Sem refresh token
   */
  if (!session.refresh_token) {
    return null;
  }

  try {
    const config = await getOidcConfig();

    const tokens =
      await oidc.refreshTokenGrant(
        config,
        session.refresh_token,
      );

    session.access_token =
      tokens.access_token;

    session.refresh_token =
      tokens.refresh_token ??
      session.refresh_token;

    if (tokens.expiresIn()) {
      session.expires_at =
        now + tokens.expiresIn()!;
    }

    await updateSession(sid, session);

    return session;
  } catch (error) {
    console.error(
      "Erro ao atualizar sessão:",
      error,
    );

    return null;
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.isAuthenticated =
    function (this: Request) {
      return !!this.user;
    };

  const sid = getSessionId(req);

  /*
   * Não autenticado
   */
  if (!sid) {
    return next();
  }

  try {
    const session = await getSession(sid);

    if (!session?.user?.id) {
      await clearSession(res, sid);
      return next();
    }

    const refreshed =
      await refreshIfExpired(
        sid,
        session,
      );

    if (!refreshed) {
      await clearSession(res, sid);
      return next();
    }

    req.user = refreshed.user;

    return next();
  } catch (error) {
    console.error(
      "Erro no authMiddleware:",
      error,
    );

    await clearSession(res, sid);

    return next();
  }
}

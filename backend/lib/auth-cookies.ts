import { cookies } from "next/headers"

export const ACCESS_TOKEN_COOKIE = "scholarxiv_access_token"
export const REFRESH_TOKEN_COOKIE = "scholarxiv_refresh_token"

const ACCESS_MAX_AGE = 60 * 60
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30

const isProduction = process.env.NODE_ENV === "production"

function cookieOptions(maxAge: number) {
  return {
    path: "/",
    maxAge,
    httpOnly: true,
    sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
    secure: isProduction,
  }
}

function serializeCookie(
  name: string,
  value: string,
  maxAge: number
) {
  return [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    isProduction ? "SameSite=None; Secure" : "SameSite=Lax",
  ].join("; ")
}

export function setAuthCookies(
  response: Response,
  accessToken: string,
  refreshToken: string
) {
  response.headers.append(
    "Set-Cookie",
    serializeCookie(
      ACCESS_TOKEN_COOKIE,
      accessToken,
      ACCESS_MAX_AGE
    )
  )

  response.headers.append(
    "Set-Cookie",
    serializeCookie(
      REFRESH_TOKEN_COOKIE,
      refreshToken,
      REFRESH_MAX_AGE
    )
  )
}

/** Attach rotated tokens to the current Route Handler response (Next 15). */
export async function persistAuthCookies(
  accessToken: string,
  refreshToken: string
) {
  const jar = await cookies()
  jar.set(ACCESS_TOKEN_COOKIE, accessToken, cookieOptions(ACCESS_MAX_AGE))
  jar.set(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions(REFRESH_MAX_AGE))
}

export function clearAuthCookies(response: Response) {
  response.headers.append(
    "Set-Cookie",
    serializeCookie(ACCESS_TOKEN_COOKIE, "", 0)
  )

  response.headers.append(
    "Set-Cookie",
    serializeCookie(REFRESH_TOKEN_COOKIE, "", 0)
  )
}

export function getAuthCookies(request: Request) {
  const cookieHeader = request.headers.get("cookie") || ""

  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((cookie) => {
      const [key, ...value] = cookie.trim().split("=")
      return [key, decodeURIComponent(value.join("="))]
    })
  )

  return {
    accessToken: cookies[ACCESS_TOKEN_COOKIE] || null,
    refreshToken: cookies[REFRESH_TOKEN_COOKIE] || null,
  }
}
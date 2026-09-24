const ACCESS_TOKEN_COOKIE = "scholarxiv_access_token"
const REFRESH_TOKEN_COOKIE = "scholarxiv_refresh_token"

const isProduction = process.env.NODE_ENV === "production"

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
      60 * 60
    )
  )

  response.headers.append(
    "Set-Cookie",
    serializeCookie(
      REFRESH_TOKEN_COOKIE,
      refreshToken,
      60 * 60 * 24 * 30
    )
  )
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
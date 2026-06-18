export type CustomFetchOptions = RequestInit & {
  responseType?: "json" | "text" | "blob" | "auto";
};

export type ErrorType<T = unknown> = ApiError<T>;

export type BodyType<T> = T;

export type AuthTokenGetter =
  () => Promise<string | null> | string | null;

const NO_BODY_STATUS = new Set([204, 205, 304]);

const DEFAULT_JSON_ACCEPT =
  "application/json, application/problem+json";

let _baseUrl: string | null = null;

let _authTokenGetter: AuthTokenGetter | null =
  null;

export function setBaseUrl(
  url: string | null,
): void {
  _baseUrl = url
    ? url.replace(/\/+$/, "")
    : null;
}

export function setAuthTokenGetter(
  getter: AuthTokenGetter | null,
): void {
  _authTokenGetter = getter;
}

function isRequest(
  input: RequestInfo | URL,
): input is Request {
  return (
    typeof Request !== "undefined" &&
    input instanceof Request
  );
}

function resolveMethod(
  input: RequestInfo | URL,
  explicitMethod?: string,
): string {
  if (explicitMethod) {
    return explicitMethod.toUpperCase();
  }

  if (isRequest(input)) {
    return input.method.toUpperCase();
  }

  return "GET";
}

function isUrl(
  input: RequestInfo | URL,
): input is URL {
  return (
    typeof URL !== "undefined" &&
    input instanceof URL
  );
}

function resolveUrl(
  input: RequestInfo | URL,
): string {
  if (typeof input === "string") {
    return input;
  }

  if (isUrl(input)) {
    return input.toString();
  }

  return input.url;
}

function applyBaseUrl(
  input: RequestInfo | URL,
): RequestInfo | URL {
  if (!_baseUrl) {
    return input;
  }

  const url = resolveUrl(input);

  if (!url.startsWith("/")) {
    return input;
  }

  const absolute = `${_baseUrl}${url}`;

  if (typeof input === "string") {
    return absolute;
  }

  if (isUrl(input)) {
    return new URL(absolute);
  }

  return new Request(absolute, input);
}

function mergeHeaders(
  ...sources: Array<
    HeadersInit | undefined
  >
): Headers {
  const headers = new Headers();

  for (const source of sources) {
    if (!source) continue;

    new Headers(source).forEach(
      (value, key) => {
        headers.set(key, value);
      },
    );
  }

  return headers;
}

function getMediaType(
  headers: Headers,
): string | null {
  const value =
    headers.get("content-type");

  return value
    ? value
        .split(";", 1)[0]
        .trim()
        .toLowerCase()
    : null;
}

function isJsonMediaType(
  mediaType: string | null,
): boolean {
  return (
    mediaType ===
      "application/json" ||
    Boolean(
      mediaType?.endsWith("+json"),
    )
  );
}

function isTextMediaType(
  mediaType: string | null,
): boolean {
  return Boolean(
    mediaType &&
      (mediaType.startsWith("text/") ||
        mediaType ===
          "application/xml" ||
        mediaType === "text/xml" ||
        mediaType.endsWith("+xml") ||
        mediaType ===
          "application/x-www-form-urlencoded"),
  );
}

function hasNoBody(
  response: Response,
  method: string,
): boolean {
  if (method === "HEAD") {
    return true;
  }

  if (
    NO_BODY_STATUS.has(
      response.status,
    )
  ) {
    return true;
  }

  if (
    response.headers.get(
      "content-length",
    ) === "0"
  ) {
    return true;
  }

  if (response.body === null) {
    return true;
  }

  return false;
}

function stripBom(text: string): string {
  return text.charCodeAt(0) ===
    0xfeff
    ? text.slice(1)
    : text;
}

function looksLikeJson(
  text: string,
): boolean {
  const trimmed =
    text.trimStart();

  return (
    trimmed.startsWith("{") ||
    trimmed.startsWith("[")
  );
}

function truncate(
  text: string,
  maxLength = 300,
): string {
  return text.length > maxLength
    ? `${text.slice(
        0,
        maxLength - 1,
      )}…`
    : text;
}

function getStringField(
  value: unknown,
  key: string,
): string | undefined {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return undefined;
  }

  const candidate = (
    value as Record<
      string,
      unknown
    >
  )[key];

  if (
    typeof candidate !==
    "string"
  ) {
    return undefined;
  }

  const trimmed =
    candidate.trim();

  return trimmed === ""
    ? undefined
    : trimmed;
}

function buildErrorMessage(
  response: Response,
  data: unknown,
): string {
  const prefix = `HTTP ${response.status} ${response.statusText}`;

  if (
    typeof data === "string"
  ) {
    const text = data.trim();

    return text
      ? `${prefix}: ${truncate(
          text,
        )}`
      : prefix;
  }

  const title = getStringField(
    data,
    "title",
  );

  const detail = getStringField(
    data,
    "detail",
  );

  const message =
    getStringField(
      data,
      "message",
    ) ??
    getStringField(
      data,
      "error_description",
    ) ??
    getStringField(
      data,
      "error",
    );

  if (title && detail) {
    return `${prefix}: ${title} — ${detail}`;
  }

  if (detail) {
    return `${prefix}: ${detail}`;
  }

  if (message) {
    return `${prefix}: ${message}`;
  }

  if (title) {
    return `${prefix}: ${title}`;
  }

  return prefix;
}

export class ApiError<
  T = unknown,
> extends Error {
  readonly name = "ApiError";

  readonly status: number;

  readonly statusText: string;

  readonly data: T | null;

  readonly headers: Headers;

  readonly response: Response;

  readonly method: string;

  readonly url: string;

  constructor(
    response: Response,
    data: T | null,
    requestInfo: {
      method: string;
      url: string;
    },
  ) {
    super(
      buildErrorMessage(
        response,
        data,
      ),
    );

    Object.setPrototypeOf(
      this,
      new.target.prototype,
    );

    this.status =
      response.status;

    this.statusText =
      response.statusText;

    this.data = data;

    this.headers =
      response.headers;

    this.response =
      response;

    this.method =
      requestInfo.method;

    this.url =
      response.url ||
      requestInfo.url;
  }
}

export async function customFetch<
  T = unknown,
>(
  input: RequestInfo | URL,
  options: CustomFetchOptions = {},
): Promise<T> {
  input = applyBaseUrl(input);

  const {
    responseType = "auto",
    headers: headersInit,
    ...init
  } = options;

  const method =
    resolveMethod(
      input,
      init.method,
    );

  const headers =
    mergeHeaders(
      isRequest(input)
        ? input.headers
        : undefined,
      headersInit,
    );

  if (
    responseType ===
      "json" &&
    !headers.has("accept")
  ) {
    headers.set(
      "accept",
      DEFAULT_JSON_ACCEPT,
    );
  }

  if (
    _authTokenGetter &&
    !headers.has(
      "authorization",
    )
  ) {
    const token =
      await _authTokenGetter();

    if (token) {
      headers.set(
        "authorization",
        `Bearer ${token}`,
      );
    }
  }

  const response =
    await fetch(input, {
      ...init,
      method,
      headers,

      // IMPORTANTE:
      credentials: "include",
    });

  if (!response.ok) {
    throw new ApiError(
      response,
      null,
      {
        method,
        url: resolveUrl(input),
      },
    );
  }

  if (
    responseType ===
    "text"
  ) {
    return (await response.text()) as T;
  }

  if (
    responseType ===
    "blob"
  ) {
    return (await response.blob()) as T;
  }

  if (
    hasNoBody(
      response,
      method,
    )
  ) {
    return null as T;
  }

  return (await response.json()) as T;
}

/**
 * Request size caps.
 *
 * Zod rejects oversized resume fields with 400. The body limit rejects
 * any larger payload with 413 before it is parsed or stored. The byte
 * cap is above the largest accepted application JSON, including the
 * worst-case `\uXXXX` encoding of every character, and still bounds
 * other JSON routes such as job content.
 */
export const RESUME_URL_MAX_LENGTH = 2048;
export const RESUME_TEXT_MAX_LENGTH = 100_000;

const JSON_ESCAPE_BYTES_PER_CHAR = 6;
const JSON_ENVELOPE_BYTES = 1024;

export const JSON_BODY_MAX_BYTES =
  (RESUME_URL_MAX_LENGTH + RESUME_TEXT_MAX_LENGTH) * JSON_ESCAPE_BYTES_PER_CHAR +
  JSON_ENVELOPE_BYTES;

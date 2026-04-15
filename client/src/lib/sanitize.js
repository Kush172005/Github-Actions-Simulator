import DOMPurify from "dompurify";

/** Strip tags and dangerous URLs from model/user text before React render. */
export function safePlainText(input) {
  return DOMPurify.sanitize(input ?? "", { ALLOWED_TAGS: [], KEEP_CONTENT: true });
}

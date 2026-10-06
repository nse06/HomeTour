import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";

/** URL-safe, lowercase, collision-resistant ids (~72 bits). */
export const newId = customAlphabet(alphabet, 14);

/** Short random suffix used to de-duplicate slugs. */
export const shortId = customAlphabet(alphabet, 5);

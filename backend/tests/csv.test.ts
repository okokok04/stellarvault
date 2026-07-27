import { describe, expect, it } from "vitest";
import { toCsv } from "../src/lib/csv.js";

describe("toCsv", () => {
  it("serializes rows with a header matching the given column order", () => {
    const csv = toCsv(
      [
        { id: "1", rating: 5, message: "great" },
        { id: "2", rating: 3, message: "ok" },
      ],
      ["id", "rating", "message"],
    );

    expect(csv).toBe("id,rating,message\r\n1,5,great\r\n2,3,ok");
  });

  it("quotes fields containing commas, quotes, or newlines", () => {
    const csv = toCsv(
      [{ message: 'has, a comma and a "quote"\nand a newline' }],
      ["message"],
    );

    expect(csv).toBe('message\r\n"has, a comma and a ""quote""\nand a newline"');
  });

  it("renders null/undefined as an empty cell", () => {
    const csv = toCsv([{ contact: undefined }], ["contact"]);
    expect(csv).toBe("contact\r\n");
  });
});

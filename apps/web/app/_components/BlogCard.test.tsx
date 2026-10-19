import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BlogCard } from "./BlogCard";

describe("BlogCard", () => {
  it("links to the post and shows title, summary and date", () => {
    render(
      <BlogCard
        post={{
          slug: "first-post",
          title: "First post",
          excerpt: "A short summary",
          coverImageUrl: null,
          publishedAt: new Date("2026-10-01T00:00:00Z"),
        }}
      />,
    );
    expect(screen.getByText("First post")).toBeTruthy();
    expect(screen.getByText("A short summary")).toBeTruthy();
    const links = screen.getAllByRole("link");
    expect(
      links.every((l) => l.getAttribute("href") === "/journal/first-post"),
    ).toBe(true);
  });

  it("renders without a cover image or summary", () => {
    render(
      <BlogCard
        post={{
          slug: "x",
          title: "Bare",
          excerpt: null,
          coverImageUrl: null,
          publishedAt: null,
        }}
      />,
    );
    expect(screen.getByText("Bare")).toBeTruthy();
  });
});

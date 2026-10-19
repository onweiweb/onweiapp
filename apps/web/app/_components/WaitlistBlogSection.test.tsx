import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WaitlistBlogSection } from "./WaitlistBlogSection";

const post = (n: number) => ({
  slug: `post-${n}`,
  title: `Post ${n}`,
  excerpt: null,
  coverImageUrl: null,
  publishedAt: null,
});

describe("WaitlistBlogSection", () => {
  it("renders nothing when there are no posts", () => {
    const { container } = render(<WaitlistBlogSection articles={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the posts and a link to all blogs", () => {
    render(<WaitlistBlogSection articles={[post(1), post(2)]} />);
    expect(screen.getByText("Post 1")).toBeTruthy();
    expect(screen.getByText("Post 2")).toBeTruthy();
    const all = screen.getByRole("link", { name: /view all blogs/i });
    expect(all.getAttribute("href")).toBe("/journal");
  });
});

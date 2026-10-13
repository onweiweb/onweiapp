import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  CollectionSortProvider,
  SortedItems,
  useCollectionSort,
} from "./CollectionSort";

const items = [
  { id: "a", node: <p>Alpha</p> },
  { id: "b", node: <p>Beta</p> },
  { id: "c", node: <p>Gamma</p> },
];
const orders = {
  featured: ["a", "b", "c"],
  "price-asc": ["c", "a", "b"],
  "price-desc": ["b", "a", "c"],
} as const;

function Picker() {
  const { setSort } = useCollectionSort();
  return <button onClick={() => setSort("price-desc")}>desc</button>;
}

function names() {
  return screen.getAllByText(/Alpha|Beta|Gamma/).map((el) => el.textContent);
}

describe("SortedItems", () => {
  it("starts in the featured order", () => {
    render(
      <CollectionSortProvider>
        <SortedItems items={items} orders={orders} />
      </CollectionSortProvider>,
    );
    expect(names()).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("switches order and mirrors it into the URL without navigating", () => {
    window.history.replaceState(null, "", "/collection/all");
    render(
      <CollectionSortProvider>
        <Picker />
        <SortedItems items={items} orders={orders} />
      </CollectionSortProvider>,
    );
    act(() => screen.getByText("desc").click());
    expect(names()).toEqual(["Beta", "Alpha", "Gamma"]);
    expect(window.location.search).toBe("?sort=price-desc");
  });

  it("opens a shared sorted link in that order", () => {
    window.history.replaceState(null, "", "/collection/all?sort=price-asc");
    render(
      <CollectionSortProvider>
        <SortedItems items={items} orders={orders} />
      </CollectionSortProvider>,
    );
    expect(names()).toEqual(["Gamma", "Alpha", "Beta"]);
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatsBar } from "./StatsBar";

describe("StatsBar", () => {
  it("renders nothing while loading or without data", () => {
    const { container } = render(<StatsBar stats={null} loading={true} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("formats lovelace as ADA and shows a dash with no ratings yet", () => {
    render(
      <StatsBar
        stats={{
          totalEscrows: 3,
          escrowsByStatus: { locked: 2, released: 1 },
          totalLovelaceLocked: 12_500_000,
          totalFeedback: 0,
          averageRating: null,
        }}
        loading={false}
      />,
    );

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("12.5 ADA")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

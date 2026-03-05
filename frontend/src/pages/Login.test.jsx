import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, test, expect } from "vitest";
import Login from "./Login";

describe("Login page", () => {
  test("shows validation error when submitted empty", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    expect(screen.getByText("Please enter username/email and password")).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import App from "./App";

describe("App routes", () => {
  test("renders login page on default route", () => {
    window.history.pushState({}, "", "/");
    render(<App />);

    expect(screen.getByText("Welcome Back")).toBeInTheDocument();
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });
});

import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import Register from "./Register";

vi.mock("axios", () => ({
  default: {
    post: vi.fn()
  }
}));

import axios from "axios";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

function renderRegister() {
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );
}

function fillForm(container, { username = "", email = "", password = "", confirmPassword = "" } = {}) {
  if (username) {
    const input = container.querySelector('input[name="username"]');
    fireEvent.change(input, { target: { value: username, name: "username" } });
  }
  if (email) {
    const input = container.querySelector('input[name="email"]');
    fireEvent.change(input, { target: { value: email, name: "email" } });
  }
  if (password) {
    const input = container.querySelector('input[name="password"]');
    fireEvent.change(input, { target: { value: password, name: "password" } });
  }
  if (confirmPassword) {
    const input = container.querySelector('input[name="confirmPassword"]');
    fireEvent.change(input, { target: { value: confirmPassword, name: "confirmPassword" } });
  }
}

function getSubmitButton() {
  const buttons = screen.getAllByRole("button");
  return buttons.find(b => b.textContent === "Create Account");
}

describe("Register page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test("renders form with all fields", () => {
    const { container } = renderRegister();

    expect(screen.getByRole("heading", { name: "Create Account" })).toBeInTheDocument();
    expect(container.querySelector('input[name="username"]')).toBeInTheDocument();
    expect(container.querySelector('input[name="email"]')).toBeInTheDocument();
    expect(container.querySelector('input[name="password"]')).toBeInTheDocument();
    expect(container.querySelector('input[name="confirmPassword"]')).toBeInTheDocument();
  });

  test("shows error when username is empty", () => {
    renderRegister();

    fireEvent.click(getSubmitButton());

    expect(screen.getByText("Username is required")).toBeInTheDocument();
  });

  test("shows error when email is empty", () => {
    const { container } = renderRegister();

    fillForm(container, { username: "testuser" });
    fireEvent.click(getSubmitButton());

    expect(screen.getByText("Email is required")).toBeInTheDocument();
  });

  test("shows error for invalid email format", () => {
    const { container } = renderRegister();

    fillForm(container, { username: "testuser", email: "invalid-email" });
    fireEvent.click(getSubmitButton());

    expect(screen.getByText("Invalid email")).toBeInTheDocument();
  });

  test("shows error when password is too short", () => {
    const { container } = renderRegister();

    fillForm(container, { username: "testuser", email: "test@example.com", password: "123" });
    fireEvent.click(getSubmitButton());

    expect(screen.getByText("Password must be at least 6 characters")).toBeInTheDocument();
  });

  test("shows error when passwords do not match", () => {
    const { container } = renderRegister();

    fillForm(container, {
      username: "testuser",
      email: "test@example.com",
      password: "password123",
      confirmPassword: "different123"
    });
    fireEvent.click(getSubmitButton());

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
  });

  test("navigates to login on successful registration", async () => {
    axios.post.mockResolvedValue({ data: { id: 1, username: "testuser" } });

    const { container } = renderRegister();

    fillForm(container, {
      username: "testuser",
      email: "test@example.com",
      password: "password123",
      confirmPassword: "password123"
    });

    await act(async () => {
      fireEvent.click(getSubmitButton());
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  test("shows server error message on API failure", async () => {
    axios.post.mockRejectedValue({
      response: { data: { message: "User already exists" } }
    });

    const { container } = renderRegister();

    fillForm(container, {
      username: "testuser",
      email: "test@example.com",
      password: "password123",
      confirmPassword: "password123"
    });

    await act(async () => {
      fireEvent.click(getSubmitButton());
    });

    await waitFor(() => {
      expect(screen.getByText("User already exists")).toBeInTheDocument();
    });
  });

  test("shows network error when server is unreachable", async () => {
    axios.post.mockRejectedValue({ code: "OTHER", response: undefined });

    const { container } = renderRegister();

    fillForm(container, {
      username: "testuser",
      email: "test@example.com",
      password: "password123",
      confirmPassword: "password123"
    });

    await act(async () => {
      fireEvent.click(getSubmitButton());
    });

    await waitFor(() => {
      expect(screen.getByText(/Cannot reach server/)).toBeInTheDocument();
    });
  });

  test("shows timeout error on ECONNABORTED", async () => {
    axios.post.mockRejectedValue({ code: "ECONNABORTED", response: undefined });

    const { container } = renderRegister();

    fillForm(container, {
      username: "testuser",
      email: "test@example.com",
      password: "password123",
      confirmPassword: "password123"
    });

    await act(async () => {
      fireEvent.click(getSubmitButton());
    });

    await waitFor(() => {
      expect(screen.getByText(/Registration timed out/)).toBeInTheDocument();
    });
  });

  test("toggles password visibility", () => {
    const { container } = renderRegister();

    const passwordInput = container.querySelector('input[name="password"]');
    expect(passwordInput).toHaveAttribute("type", "password");

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    expect(passwordInput).toHaveAttribute("type", "text");
  });

  test("Back to Login button navigates to login", () => {
    renderRegister();

    const backButton = screen.getByRole("button", { name: "Back to Login" });
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });
});

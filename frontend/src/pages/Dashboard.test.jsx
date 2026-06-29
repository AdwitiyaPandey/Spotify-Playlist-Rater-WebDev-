import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import Dashboard from "./Dashboard";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
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

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}

async function renderAndSettle() {
  const result = renderDashboard();
  await act(async () => {});
  return result;
}

describe("Dashboard page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("authUser", JSON.stringify({
      id: 1,
      username: "testuser",
      email: "test@example.com"
    }));
    axios.get.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  test("renders dashboard with user info", async () => {
    await renderAndSettle();

    expect(screen.getByText("Playlist Rater")).toBeInTheDocument();
    expect(screen.getByText("testuser")).toBeInTheDocument();
    expect(screen.getByText("Discover, Rate, and Improve Your Playlists")).toBeInTheDocument();
  });

  test("shows error when analyze is clicked with empty URL", async () => {
    await renderAndSettle();

    fireEvent.click(screen.getByText("Rate Playlist"));

    expect(screen.getByText("Please paste a playlist URL")).toBeInTheDocument();
  });

  test("analyzes a playlist successfully", async () => {
    axios.post.mockResolvedValue({
      data: {
        playlistName: "Test Playlist",
        rating: 8,
        topGenre: "pop",
        recommendations: [
          { name: "Song 1", artist: "Artist 1" },
          { name: "Song 2", artist: "Artist 2" }
        ]
      }
    });

    await renderAndSettle();

    const input = screen.getByPlaceholderText("Paste Spotify Playlist URL");
    fireEvent.change(input, { target: { value: "https://open.spotify.com/playlist/abc123" } });
    fireEvent.click(screen.getByText("Rate Playlist"));

    await waitFor(() => {
      expect(screen.getByText("8/10")).toBeInTheDocument();
    });

    expect(screen.getByText("pop")).toBeInTheDocument();
    expect(screen.getByText("Song 1 - Artist 1")).toBeInTheDocument();
    expect(screen.getByText("Song 2 - Artist 2")).toBeInTheDocument();
  });

  test("shows error on failed analysis", async () => {
    axios.post.mockRejectedValue({
      response: { data: { message: "Invalid Spotify playlist URL" } }
    });

    await renderAndSettle();

    const input = screen.getByPlaceholderText("Paste Spotify Playlist URL");
    fireEvent.change(input, { target: { value: "bad-url" } });
    fireEvent.click(screen.getByText("Rate Playlist"));

    await waitFor(() => {
      expect(screen.getByText("Invalid Spotify playlist URL")).toBeInTheDocument();
    });
  });

  test("displays history items", async () => {
    axios.get.mockResolvedValue({
      data: [
        { id: 1, name: "My Playlist", rating: 7, top_genre: "rock", created_at: "2024-01-01" },
        { id: 2, name: "Chill Mix", rating: 9, top_genre: "indie", created_at: "2024-01-02" }
      ]
    });

    await renderAndSettle();

    expect(screen.getByText("My Playlist")).toBeInTheDocument();
    expect(screen.getByText("Chill Mix")).toBeInTheDocument();
  });

  test("switches to My Ratings view", async () => {
    await renderAndSettle();

    fireEvent.click(screen.getByText("My Ratings"));

    await act(async () => {});

    expect(screen.getByText("My Ratings History")).toBeInTheDocument();
  });

  test("logout clears user and navigates to login", async () => {
    await renderAndSettle();

    fireEvent.click(screen.getByText("Logout"));

    expect(localStorage.getItem("authUser")).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  test("shows fallback username when user has no username", async () => {
    localStorage.setItem("authUser", JSON.stringify({ id: 1, email: "user@test.com" }));

    await renderAndSettle();

    expect(screen.getByText("user@test.com")).toBeInTheDocument();
  });

  test("shows 'Listener' when no user data", async () => {
    localStorage.setItem("authUser", JSON.stringify({}));

    await renderAndSettle();

    expect(screen.getByText("Listener")).toBeInTheDocument();
  });

  test("shows Admin Panel button for admin user", async () => {
    localStorage.setItem("authUser", JSON.stringify({
      id: 1,
      username: "admin",
      email: "admin@test.com",
      is_admin: true
    }));

    await renderAndSettle();

    expect(screen.getByText("Admin Panel")).toBeInTheDocument();
  });

  test("does not show Admin Panel for regular user", async () => {
    await renderAndSettle();

    expect(screen.queryByText("Admin Panel")).not.toBeInTheDocument();
  });
});

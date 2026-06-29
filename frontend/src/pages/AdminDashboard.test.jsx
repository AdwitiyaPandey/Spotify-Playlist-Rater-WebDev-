import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import AdminDashboard from "./AdminDashboard";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    delete: vi.fn()
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

function renderAdmin() {
  return render(
    <MemoryRouter>
      <AdminDashboard />
    </MemoryRouter>
  );
}

function setupMockData({ users = [], playlists = [], stats = { usersCount: 0, playlistsCount: 0, avgRating: 0 } } = {}) {
  axios.get.mockImplementation(async (url) => {
    if (url.includes("/stats")) return { data: stats };
    if (url.includes("/playlists")) return { data: playlists };
    if (url.includes("/users")) return { data: users };
    return { data: [] };
  });
}

async function renderAndSettle() {
  const result = renderAdmin();
  await act(async () => {});
  return result;
}

describe("AdminDashboard page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("authUser", JSON.stringify({
      id: 1,
      username: "admin",
      email: "admin@test.com",
      is_admin: true
    }));
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  test("renders admin dashboard header", async () => {
    setupMockData();
    await renderAndSettle();

    expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
    expect(screen.getByText("User View")).toBeInTheDocument();
    expect(screen.getByText("Logout")).toBeInTheDocument();
  });

  test("displays stats from API", async () => {
    setupMockData({
      users: [{ id: 1, username: "alice", email: "alice@test.com" }],
      playlists: [{ id: 1, name: "Playlist", rating: 8, top_genre: "pop" }],
      stats: { usersCount: 5, playlistsCount: 12, avgRating: 7.2 }
    });

    await renderAndSettle();

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("7.2")).toBeInTheDocument();
  });

  test("displays users list", async () => {
    setupMockData({
      users: [
        { id: 1, username: "alice", email: "alice@one.com" },
        { id: 2, username: "bob", email: "bob@two.com" }
      ],
      stats: { usersCount: 2, playlistsCount: 0, avgRating: 0 }
    });

    await renderAndSettle();

    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.getByText("alice@one.com")).toBeInTheDocument();
  });

  test("displays playlists list", async () => {
    setupMockData({
      playlists: [
        { id: 1, name: "Chill Vibes", rating: 8, top_genre: "pop" },
        { id: 2, name: null, rating: null, top_genre: null }
      ],
      stats: { usersCount: 0, playlistsCount: 2, avgRating: 8 }
    });

    await renderAndSettle();

    expect(screen.getByText("Chill Vibes")).toBeInTheDocument();
    expect(screen.getByText("Untitled Playlist")).toBeInTheDocument();
  });

  test("deletes a user and refreshes data", async () => {
    setupMockData({
      users: [{ id: 1, username: "alice", email: "alice@one.com" }],
      stats: { usersCount: 1, playlistsCount: 0, avgRating: 0 }
    });
    axios.delete.mockResolvedValue({ data: { message: "User deleted" } });

    await renderAndSettle();

    const deleteButtons = screen.getAllByText("Delete");
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining("/users/1"));
    });
  });

  test("deletes a playlist and refreshes data", async () => {
    setupMockData({
      playlists: [{ id: 5, name: "My Mix", rating: 6, top_genre: "rock" }],
      stats: { usersCount: 0, playlistsCount: 1, avgRating: 6 }
    });
    axios.delete.mockResolvedValue({ data: { message: "Playlist deleted" } });

    await renderAndSettle();

    const deleteButtons = screen.getAllByText("Delete");
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining("/playlists/5"));
    });
  });

  test("shows error on failed data fetch", async () => {
    axios.get.mockRejectedValue({
      response: { data: { message: "Failed to load admin dashboard" } }
    });

    await renderAndSettle();

    expect(screen.getByText("Failed to load admin dashboard")).toBeInTheDocument();
  });

  test("logout clears storage and navigates to login", async () => {
    setupMockData();
    await renderAndSettle();

    fireEvent.click(screen.getByText("Logout"));

    expect(localStorage.getItem("authUser")).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  test("User View button navigates to dashboard", async () => {
    setupMockData();
    await renderAndSettle();

    fireEvent.click(screen.getByText("User View"));

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  test("shows error when delete user fails", async () => {
    setupMockData({
      users: [{ id: 1, username: "alice", email: "alice@one.com" }],
      stats: { usersCount: 1, playlistsCount: 0, avgRating: 0 }
    });
    axios.delete.mockRejectedValue({
      response: { data: { message: "Failed to delete user" } }
    });

    await renderAndSettle();

    fireEvent.click(screen.getAllByText("Delete")[0]);

    await waitFor(() => {
      expect(screen.getByText("Failed to delete user")).toBeInTheDocument();
    });
  });
});

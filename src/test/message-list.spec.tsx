import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MessageList } from "../components/chat/MessageList";
import type { ChatMessage } from "../stores/chatSessionStore";

// ── Mocks ──

// Mock IntersectionObserver for jsdom (not natively available)
const intersectionObserveMock = vi.fn();
const intersectionDisconnectMock = vi.fn();
class MockIntersectionObserver {
  constructor(public callback: IntersectionObserverCallback, public options?: IntersectionObserverInit) {}
  observe = intersectionObserveMock;
  disconnect = intersectionDisconnectMock;
  unobserve = vi.fn();
  takeRecords = (): IntersectionObserverEntry[] => [];
}
vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

// We don't need the actual AIMessage — it's tested elsewhere.
// The MessageList already imports it directly; we just let it render.
// Mock scrollIntoView on the prototype so we can track calls
const scrollIntoViewMock = vi.fn();

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
  scrollIntoViewMock.mockClear();
  intersectionObserveMock.mockClear();
  intersectionDisconnectMock.mockClear();
});

afterEach(() => {
  cleanup();
});

// ── Helpers ──

function makeMsg(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "msg-1",
    chat_id: "chat-1",
    role: "user",
    content: "Hello",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ── Tests ──

describe("MessageList", () => {
  it("should render loading state when isLoading is true", () => {
    render(
      <MessageList
        messages={[]}
        isLoading={true}
        hasMore={false}
        isLoadingMore={false}
        onLoadOlder={() => {}}
      />
    );

    // Should show a spinner (the animate-spin element)
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeTruthy();
  });

  it("should render empty state when messages are empty", () => {
    render(
      <MessageList
        messages={[]}
        isLoading={false}
        hasMore={false}
        isLoadingMore={false}
        onLoadOlder={() => {}}
      />
    );

    expect(screen.getByText("Start a conversation")).toBeTruthy();
  });

  it("should render 'Load older messages' button when hasMore is true", () => {
    render(
      <MessageList
        messages={[makeMsg()]}
        isLoading={false}
        hasMore={true}
        isLoadingMore={false}
        onLoadOlder={() => {}}
      />
    );

    expect(screen.getByText("Load older messages")).toBeTruthy();
  });

  it("should render spinner when isLoadingMore is true", () => {
    render(
      <MessageList
        messages={[makeMsg()]}
        isLoading={false}
        hasMore={true}
        isLoadingMore={true}
        onLoadOlder={() => {}}
      />
    );

    // Should show a spinner instead of the button
    const spinners = document.querySelectorAll(".animate-spin");
    // One spinner for the scroll-area, none for page-level loading
    expect(spinners.length).toBeGreaterThanOrEqual(1);
  });

  it("should call onLoadOlder when button is clicked", () => {
    const onLoadOlder = vi.fn();
    render(
      <MessageList
        messages={[makeMsg()]}
        isLoading={false}
        hasMore={true}
        isLoadingMore={false}
        onLoadOlder={onLoadOlder}
      />
    );

    fireEvent.click(screen.getByText("Load older messages"));
    expect(onLoadOlder).toHaveBeenCalledOnce();
  });

  it("should scroll into view when messages length increases", () => {
    const messages = [makeMsg()];
    const { rerender } = render(
      <MessageList
        messages={messages}
        isLoading={false}
        hasMore={false}
        isLoadingMore={false}
        onLoadOlder={() => {}}
      />
    );

    // On initial render with 1 message, scrollIntoView should have been called
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);

    // Add a new message (length increases from 1 to 2)
    const newMessages = [...messages, makeMsg({ id: "msg-2", content: "World" })];
    rerender(
      <MessageList
        messages={newMessages}
        isLoading={false}
        hasMore={false}
        isLoadingMore={false}
        onLoadOlder={() => {}}
      />
    );

    // Should scroll again on length change
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(2);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth" });
  });

  it("should NOT scroll into view during streaming (same length, content changes)", () => {
    const messages = [makeMsg({ id: "msg-1", role: "assistant", content: "" })];
    const { rerender } = render(
      <MessageList
        messages={messages}
        isLoading={false}
        hasMore={false}
        isLoadingMore={false}
        onLoadOlder={() => {}}
      />
    );

    // Initial scroll
    const initialCallCount = scrollIntoViewMock.mock.calls.length;

    // Simulate streaming — same messages array length, but content updates
    const streamedMessages = [
      { ...messages[0], content: "Hello" },
    ];
    rerender(
      <MessageList
        messages={streamedMessages}
        isLoading={false}
        hasMore={false}
        isLoadingMore={false}
        onLoadOlder={() => {}}
      />
    );

    // scrollIntoView should NOT have been called again (only the initial call)
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(initialCallCount);
  });
});

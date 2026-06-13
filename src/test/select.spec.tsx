import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Select, type SelectOption } from "../components/ui/select";

afterEach(() => {
  cleanup();
});

const options: SelectOption[] = [
  { value: "option-1", label: "Option 1" },
  { value: "option-2", label: "Option 2" },
  { value: "option-3", label: "Option 3" },
];

describe("Select", () => {
  it("should render trigger button with placeholder when no value is selected", () => {
    render(
      <Select
        value=""
        onChange={() => {}}
        options={options}
        placeholder="Pick an option"
      />
    );

    expect(screen.getByText("Pick an option")).toBeTruthy();
  });

  it("should render default placeholder when no placeholder is provided", () => {
    render(
      <Select
        value=""
        onChange={() => {}}
        options={options}
      />
    );

    expect(screen.getByText("Select...")).toBeTruthy();
  });

  it("should render selected option label in the trigger", () => {
    render(
      <Select
        value="option-2"
        onChange={() => {}}
        options={options}
        placeholder="Pick an option"
      />
    );

    expect(screen.getByText("Option 2")).toBeTruthy();
  });

  it("should render options in popover when trigger is clicked", () => {
    render(
      <Select
        value=""
        onChange={() => {}}
        options={options}
        placeholder="Pick an option"
      />
    );

    // Click the trigger button
    fireEvent.click(screen.getByText("Pick an option"));

    // Option should now appear in the popover
    expect(screen.getByText("Option 1")).toBeTruthy();
    expect(screen.getByText("Option 2")).toBeTruthy();
    expect(screen.getByText("Option 3")).toBeTruthy();
  });

  it("should call onChange with option value when an option is clicked", () => {
    const onChange = vi.fn();

    render(
      <Select
        value=""
        onChange={onChange}
        options={options}
        placeholder="Pick an option"
      />
    );

    // Open the popover
    fireEvent.click(screen.getByText("Pick an option"));

    // Click "Option 2"
    fireEvent.click(screen.getByText("Option 2"));

    expect(onChange).toHaveBeenCalledWith("option-2");
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("should close the popover after selecting an option", () => {
    const onChange = vi.fn();

    render(
      <Select
        value=""
        onChange={onChange}
        options={options}
        placeholder="Pick an option"
      />
    );

    // Open the popover
    fireEvent.click(screen.getByText("Pick an option"));

    // Verify options are visible
    expect(screen.getByText("Option 1")).toBeTruthy();

    // Select an option
    fireEvent.click(screen.getByText("Option 1"));

    // onChange was called
    expect(onChange).toHaveBeenCalledWith("option-1");

    // The popover content should be removed from the DOM after selection
    // (Radix Popover closes — the content is inside a Portal that gets removed)
    // We query by text that was only inside the popover
    expect(screen.queryByText("Option 2")).toBeNull();
  });

  it("should show a checkmark next to the selected option", () => {
    render(
      <Select
        value="option-2"
        onChange={() => {}}
        options={options}
        placeholder="Pick an option"
      />
    );

    // Open the popover
    fireEvent.click(screen.getByText("Option 2"));

    // The checkmark should be visible for the selected option
    const checkmarks = screen.getAllByText("✓");
    expect(checkmarks.length).toBe(1);
  });

  it("should render 'No options' when options array is empty", () => {
    render(
      <Select
        value=""
        onChange={() => {}}
        options={[]}
        placeholder="Pick an option"
      />
    );

    // Open the popover
    fireEvent.click(screen.getByText("Pick an option"));

    expect(screen.getByText("No options")).toBeTruthy();
  });
});

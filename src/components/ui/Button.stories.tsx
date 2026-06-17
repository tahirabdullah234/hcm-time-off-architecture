import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta = {
  title: "UI/Button",
  component: Button,
  parameters: { layout: "centered" },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "danger", "ghost"],
    },
    size: { control: "select", options: ["sm", "md", "lg"] },
    loading: { control: "boolean" },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Button>;

export default meta;

export const Primary: StoryObj<typeof Button> = {
  args: { variant: "primary", children: "Primary" },
};

export const Secondary: StoryObj<typeof Button> = {
  args: { variant: "secondary", children: "Secondary" },
};

export const Danger: StoryObj<typeof Button> = {
  args: { variant: "danger", children: "Danger" },
};

export const Ghost: StoryObj<typeof Button> = {
  args: { variant: "ghost", children: "Ghost" },
};

export const Small: StoryObj<typeof Button> = {
  args: { size: "sm", children: "Small" },
};

export const Large: StoryObj<typeof Button> = {
  args: { size: "lg", children: "Large" },
};

export const Loading: StoryObj<typeof Button> = {
  args: { loading: true, children: "Saving..." },
};

export const Disabled: StoryObj<typeof Button> = {
  args: { disabled: true, children: "Disabled" },
};

export const AllVariants: StoryObj<typeof Button> = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="ghost">Ghost</Button>
    </div>
  ),
};

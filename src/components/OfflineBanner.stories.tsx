import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useState, type ReactNode } from "react";
import { OfflineBanner } from "./OfflineBanner";

function OfflineDecorator({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Object.defineProperty(navigator, "onLine", {
      get: () => false,
      configurable: true,
    });
    window.dispatchEvent(new Event("offline"));
    setReady(true);
    return () => {
      Object.defineProperty(navigator, "onLine", {
        get: () => true,
        configurable: true,
      });
    };
  }, []);
  if (!ready) return <div />;
  return <>{children}</>;
}

const meta = {
  title: "TimeOff/OfflineBanner",
  component: OfflineBanner,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof OfflineBanner>;

export default meta;

export const Online: StoryObj<typeof OfflineBanner> = {
  name: "Online (hidden)",
};

export const Offline: StoryObj<typeof OfflineBanner> = {
  name: "Offline (visible)",
  decorators: [
    (Story) => (
      <OfflineDecorator>
        <Story />
      </OfflineDecorator>
    ),
  ],
};

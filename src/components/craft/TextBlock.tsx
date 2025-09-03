"use client";
import { Element, useNode } from "@craftjs/core";
import React from "react";

interface TextProps {
  text: string;
  fontSize: number;
  color: string;
}

export const TextBlock: React.FC<Partial<TextProps>> = ({ text = "Edit me", fontSize = 16, color = "#000" }) => {
  const {
    connectors: { connect, drag },
    selected,
  } = useNode((state) => ({ selected: state.events.selected }));

  return (
    <p
      ref={(ref) => ref && connect(drag(ref))}
      style={{ fontSize, color, outline: selected ? "2px solid #3b82f6" : "none" }}
    >
      {text}
    </p>
  );
};

TextBlock.craft = {
  displayName: "Text",
  props: {
    text: "Edit me",
    fontSize: 16,
    color: "#000",
  },
  related: {
    settings: () => import("./settings/TextSettings"),
  },
};

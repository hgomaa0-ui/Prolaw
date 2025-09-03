"use client";
import { useNode, Element } from "@craftjs/core";
import React from "react";

interface ContainerProps {
  padding: string;
  background: string;
}

export const ContainerBlock: React.FC<Partial<ContainerProps>> = ({ padding = "20px", background = "#ffffff", children }) => {
  const {
    connectors: { connect, drag },
    selected,
  } = useNode((state) => ({ selected: state.events.selected }));

  return (
    <div
      ref={(ref) => ref && connect(drag(ref))}
      style={{ padding, background, outline: selected ? "2px dashed #3b82f6" : "none" }}
    >
      {children}
    </div>
  );
};

ContainerBlock.craft = {
  displayName: "Container",
  props: {
    padding: "20px",
    background: "#ffffff",
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => true,
  },
  related: {
    settings: () => import("./settings/ContainerSettings"),
  },
};

"use client";
import { useNode } from "@craftjs/core";
import React from "react";

interface ImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export const ImageBlock: React.FC<Partial<ImageProps>> = ({ src = "/placeholder.png", alt = "image", width = 300, height = 200 }) => {
  const {
    connectors: { connect, drag },
    selected,
  } = useNode((state) => ({ selected: state.events.selected }));

  return (
    <img
      ref={(ref) => ref && connect(drag(ref))}
      src={src}
      alt={alt}
      width={width}
      height={height}
      style={{ outline: selected ? "2px solid #3b82f6" : "none" }}
    />
  );
};

ImageBlock.craft = {
  displayName: "Image",
  props: {
    src: "/placeholder.png",
    alt: "image",
    width: 300,
    height: 200,
  },
  related: {
    settings: () => import("./settings/ImageSettings"),
  },
};

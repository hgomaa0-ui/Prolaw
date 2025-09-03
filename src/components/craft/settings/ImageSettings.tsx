"use client";
import { useNode } from "@craftjs/core";
import React from "react";

export const ImageSettings = () => {
  const {
    actions: { setProp },
    src,
    width,
    height,
  } = useNode((node) => ({
    src: node.data.props.src as string,
    width: node.data.props.width as number,
    height: node.data.props.height as number,
  }));

  return (
    <div className="flex flex-col gap-2 text-sm">
      <label>
        Source URL
        <input
          type="text"
          value={src}
          onChange={(e) => setProp((props: any) => (props.src = e.target.value))}
          className="border p-1 w-full"
        />
      </label>
      <label>
        Width
        <input
          type="number"
          value={width}
          onChange={(e) => setProp((props: any) => (props.width = parseInt(e.target.value)))}
          className="border p-1 w-full"
        />
      </label>
      <label>
        Height
        <input
          type="number"
          value={height}
          onChange={(e) => setProp((props: any) => (props.height = parseInt(e.target.value)))}
          className="border p-1 w-full"
        />
      </label>
    </div>
  );
};

export default ImageSettings;

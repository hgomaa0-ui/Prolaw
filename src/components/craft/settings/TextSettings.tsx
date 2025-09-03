"use client";
import { useNode } from "@craftjs/core";
import React from "react";

export const TextSettings = () => {
  const {
    actions: { setProp },
    fontSize,
    color,
    text,
  } = useNode((node) => ({
    fontSize: node.data.props.fontSize as number,
    color: node.data.props.color as string,
    text: node.data.props.text as string,
  }));

  return (
    <div className="flex flex-col gap-2 text-sm">
      <label>
        Text
        <input
          type="text"
          value={text}
          onChange={(e) => setProp((props: any) => (props.text = e.target.value))}
          className="border p-1 w-full"
        />
      </label>
      <label>
        Font size
        <input
          type="number"
          value={fontSize}
          onChange={(e) => setProp((props: any) => (props.fontSize = parseInt(e.target.value)))}
          className="border p-1 w-full"
        />
      </label>
      <label>
        Color
        <input
          type="color"
          value={color}
          onChange={(e) => setProp((props: any) => (props.color = e.target.value))}
          className="border p-1 w-full"
        />
      </label>
    </div>
  );
};

export default TextSettings;

"use client";
import { useEditor, Element } from "@craftjs/core";
import React from "react";
import { TextBlock } from "./TextBlock";
import { ImageBlock } from "./ImageBlock";
import { ContainerBlock } from "./ContainerBlock";

export const Toolbox = () => {
  const { connectors } = useEditor();

  const Item = ({ children }: { children: React.ReactNode }) => (
    <div className="mb-2 cursor-move rounded border bg-gray-100 p-2 text-center text-xs text-gray-700">
      {children}
    </div>
  );

  return (
    <div className="w-32 p-2">
      <Element is={ContainerBlock} canvas>
        {/* Container as root for items to drop */}
      </Element>
      <div
        ref={(ref) => ref && connectors.create(ref, <TextBlock />)}
        className="mb-2 cursor-move rounded border bg-white p-2 text-center text-xs shadow"
      >
        Text
      </div>
      <div
        ref={(ref) => ref && connectors.create(ref, <ImageBlock />)}
        className="mb-2 cursor-move rounded border bg-white p-2 text-center text-xs shadow"
      >
        Image
      </div>
      <div
        ref={(ref) => ref && connectors.create(ref, <ContainerBlock />)}
        className="cursor-move rounded border bg-white p-2 text-center text-xs shadow"
      >
        Container
      </div>
    </div>
  );
};

export default Toolbox;

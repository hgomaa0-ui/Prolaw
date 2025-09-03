"use client";
import React, { useEffect, useState } from "react";
import { Editor, Frame, Element, useEditor } from "@craftjs/core";
import { TextBlock } from "../../../../components/craft/TextBlock";
import { ImageBlock } from "../../../../components/craft/ImageBlock";
import { ContainerBlock } from "../../../../components/craft/ContainerBlock";
import Toolbox from "../../../../components/craft/Toolbox";
import SettingsPanel from "../../../../components/craft/SettingsPanel";

const SaveButton = () => {
  const { query } = useEditor();
  const handleSave = () => {
    const json = query.serialize();
    localStorage.setItem("page_layout", json);
    alert("Saved layout to localStorage");
  };
  return (
    <button
      onClick={handleSave}
      className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
    >
      Save
    </button>
  );
};

export default function PageBuilder() {
  const [initialData, setInitialData] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("page_layout");
    if (stored) setInitialData(stored);
  }, []);

  return (
    <div className="flex h-screen">
      <Toolbox />
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h2 className="text-lg font-semibold">Visual Page Builder</h2>
          <SaveButton />
        </div>
        <div className="flex-1 overflow-auto">
          <Editor resolver={{ TextBlock, ImageBlock, ContainerBlock }} enabled>
            <Frame data={initialData ?? undefined}>
              <Element
                is={ContainerBlock}
                canvas
                padding="40px"
                background="#ffffff"
              />
            </Frame>
          </Editor>
        </div>
      </div>
      <SettingsPanel />
    </div>
  );
}

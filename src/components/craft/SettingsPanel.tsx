"use client";
import { useEditor } from "@craftjs/core";
import React from "react";

export const SettingsPanel = () => {
  const { selected, actions, query } = useEditor((state) => ({
    selected: state.events.selected,
  }));

  const currentNodeId = selected ? Object.keys(selected)[0] : null;
  const Settings = currentNodeId ? query.node(currentNodeId).get().related?.settings : null;

  return (
    <div className="w-64 overflow-y-auto border-l bg-gray-50 p-4 text-sm">
      {Settings ? <Settings /> : <p className="text-gray-400">Select an element</p>}
    </div>
  );
};

export default SettingsPanel;

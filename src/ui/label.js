import React from "react";

export const Label = ({ children, className }) => {
  return <label className={`text-sm ${className}`}>{children}</label>;
};

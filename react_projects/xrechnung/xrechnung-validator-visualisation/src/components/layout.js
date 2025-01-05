import React from "react";
import { GridBackground } from "./gridbackground";

const Layout = ({ children }) => {
  return (
    <div className="relative">
      {/* Background */}
      <GridBackground />
      {/* Page Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default Layout;
